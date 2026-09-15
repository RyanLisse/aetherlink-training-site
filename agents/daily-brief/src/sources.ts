/**
 * Sources: GitLab, Jira, Confluence, Outlook (Microsoft Graph).
 *
 * Each source is an in-process MCP server built with the Agent SDK's
 * `createSdkMcpServer` + `tool`. The tools are small, read-only calls with
 * bounded output, so the model can survey everything in a handful of turns and
 * then drill into the two or three items that matter.
 *
 * Why in-process instead of community MCP servers: a daily cron job has no
 * browser for an OAuth dance, and every call here is a plain token-authenticated
 * GET. If you already run an MCP server for one of these systems, drop it into
 * `mcpServers` in agent.ts instead - the tool naming (`mcp__<source>__*`) stays.
 *
 * A source is enabled purely by the presence of its environment variables;
 * see `.env.example`. Missing sources are skipped, never faked.
 */
import { createSdkMcpServer, tool, type McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { SourceName } from "./brief.js";

export type Env = Readonly<Record<string, string | undefined>>;

export type Sources = {
  servers: Record<string, McpServerConfig>;
  allowedTools: string[];
  enabled: SourceName[];
};

/* ---------- small pure helpers ---------- */

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(data, null, 1) }] });
const fail = (e: unknown): ToolResult => ({
  content: [{ type: "text", text: `ERROR: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true,
});
/** Wrap a handler so a failing API becomes a tool error the model can report, not a crashed run. */
const guarded =
  <A>(fn: (args: A) => Promise<unknown>) =>
  async (args: A): Promise<ToolResult> => {
    try {
      return ok(await fn(args));
    } catch (e) {
      return fail(e);
    }
  };

const need = (env: Env, key: string): string => {
  const v = env[key];
  if (!v) throw new Error(`Missing environment variable ${key}`);
  return v;
};

const list = (v: string | undefined): string[] =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const trimSlash = (u: string): string => u.replace(/\/+$/, "");

const qs = (params: Record<string, string | number | boolean | undefined>): string =>
  Object.entries(params)
    .filter((kv): kv is [string, string | number | boolean] => kv[1] !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

const clip = (s: string | undefined | null, max: number): string => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const stripHtml = (html: string | undefined | null): string =>
  (html ?? "")
    .replace(/<(br|\/p|\/li|\/h\d|\/tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/** Atlassian Document Format (Jira Cloud v3 bodies) -> plain text. */
type AdfNode = { type?: string; text?: string; content?: AdfNode[]; attrs?: { text?: string } };
const adfToText = (node: AdfNode | undefined): string => {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "mention") return node.attrs?.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inner = (node.content ?? []).map(adfToText).join("");
  return ["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(node.type ?? "") ? `${inner}\n` : inner;
};
const bodyText = (body: unknown): string =>
  typeof body === "string" ? body : body && typeof body === "object" ? adfToText(body as AdfNode) : "";

const hoursAgoIso = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString();
const dateOnly = (iso: string): string => iso.slice(0, 10);

const http = async <T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> => {
  const { timeoutMs, ...rest } = init;
  const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs ?? 25_000) });
  if (!res.ok) {
    const text = clip(await res.text().catch(() => ""), 300);
    throw new Error(`${res.status} ${res.statusText} from ${url.split("?")[0]} ${text}`);
  }
  return (await res.json()) as T;
};

const SINCE = { since_hours: z.number().int().min(1).max(336).default(24).describe("Look-back window in hours.") };

/* ---------- GitLab ---------- */

type GlUser = { id: number; username: string; name: string };
type GlMr = {
  iid: number;
  project_id: number;
  title: string;
  web_url: string;
  draft?: boolean;
  updated_at: string;
  created_at: string;
  merged_at?: string | null;
  detailed_merge_status?: string;
  has_conflicts?: boolean;
  user_notes_count?: number;
  references?: { full?: string };
  author?: { name?: string };
  reviewers?: Array<{ name?: string }>;
  assignees?: Array<{ name?: string }>;
  labels?: string[];
  source_branch?: string;
  target_branch?: string;
  head_pipeline?: { status?: string; web_url?: string } | null;
  blocking_discussions_resolved?: boolean;
};
type GlTodo = {
  id: number;
  action_name: string;
  target_type?: string;
  target?: { title?: string; web_url?: string; references?: { full?: string } };
  target_url?: string;
  body?: string;
  author?: { name?: string };
  created_at: string;
  project?: { path_with_namespace?: string };
};
type GlPipeline = { id: number; status: string; ref: string; web_url: string; updated_at: string; source?: string };
type GlEvent = {
  created_at: string;
  action_name: string;
  target_type?: string | null;
  target_title?: string | null;
  author?: { name?: string };
  push_data?: { ref?: string; action?: string; commit_title?: string | null };
};
type GlDiscussion = { notes?: Array<{ author?: { name?: string }; body?: string; created_at: string; resolvable?: boolean; resolved?: boolean }> };

const mrView = (m: GlMr) => ({
  ref: m.references?.full ?? `!${m.iid}`,
  project_id: m.project_id,
  iid: m.iid,
  title: m.title,
  url: m.web_url,
  draft: m.draft ?? false,
  merge_status: m.detailed_merge_status,
  conflicts: m.has_conflicts ?? false,
  comments: m.user_notes_count ?? 0,
  author: m.author?.name,
  reviewers: (m.reviewers ?? []).map((r) => r.name),
  assignees: (m.assignees ?? []).map((a) => a.name),
  labels: m.labels ?? [],
  branch: `${m.source_branch ?? "?"} → ${m.target_branch ?? "?"}`,
  created_at: m.created_at,
  updated_at: m.updated_at,
  merged_at: m.merged_at ?? undefined,
});

const gitlabServer = (env: Env): McpServerConfig => {
  const base = `${trimSlash(need(env, "GITLAB_URL"))}/api/v4`;
  const headers = { "PRIVATE-TOKEN": need(env, "GITLAB_TOKEN") };
  const projects = list(env.GITLAB_PROJECTS);
  const gl = <T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> =>
    http<T>(`${base}${path}?${qs({ per_page: 50, ...params })}`, { headers });
  const pid = (p: string): string => encodeURIComponent(p);

  const me = (): Promise<GlUser> => gl<GlUser>("/user");

  return createSdkMcpServer({
    name: "gitlab",
    version: "1.0.0",
    instructions: "Read-only GitLab. Start with gitlab_todos and gitlab_my_merge_requests; drill into one MR with gitlab_merge_request when its state matters.",
    tools: [
      tool(
        "gitlab_todos",
        "Pending GitLab to-dos for the recipient: review requests, mentions, assignments, failed pipelines they own.",
        {},
        guarded(async () =>
          (await gl<GlTodo[]>("/todos", { state: "pending" })).map((t) => ({
            action: t.action_name,
            type: t.target_type,
            target: t.target?.references?.full ?? t.target?.title,
            title: t.target?.title,
            url: t.target_url ?? t.target?.web_url,
            project: t.project?.path_with_namespace,
            by: t.author?.name,
            note: clip(t.body, 240),
            created_at: t.created_at,
          })),
        ),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "gitlab_my_merge_requests",
        "Open merge requests the recipient authored, plus open ones where they are a reviewer.",
        {},
        guarded(async () => {
          const user = await me();
          const [authored, reviewing] = await Promise.all([
            gl<GlMr[]>("/merge_requests", { scope: "created_by_me", state: "opened", order_by: "updated_at" }),
            gl<GlMr[]>("/merge_requests", { scope: "all", state: "opened", reviewer_username: user.username, order_by: "updated_at" }),
          ]);
          return { user: user.name, authored: authored.map(mrView), reviewing: reviewing.map(mrView) };
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "gitlab_merge_request",
        "Detail for one merge request: description, pipeline status, and unresolved review threads.",
        {
          project: z.string().describe("Numeric project id or full path like group/repo."),
          iid: z.number().int().describe("The merge request number (!123 -> 123)."),
        },
        guarded(async ({ project, iid }) => {
          const path = `/projects/${pid(project)}/merge_requests/${iid}`;
          const [mr, discussions] = await Promise.all([
            gl<GlMr & { description?: string }>(path),
            gl<GlDiscussion[]>(`${path}/discussions`, { per_page: 100 }),
          ]);
          const unresolved = discussions
            .flatMap((d) => d.notes ?? [])
            .filter((n) => n.resolvable && !n.resolved)
            .map((n) => ({ by: n.author?.name, at: n.created_at, text: clip(n.body, 400) }));
          return {
            ...mrView(mr),
            description: clip(mr.description, 1500),
            pipeline: mr.head_pipeline ? { status: mr.head_pipeline.status, url: mr.head_pipeline.web_url } : undefined,
            all_threads_resolved: mr.blocking_discussions_resolved,
            unresolved_threads: unresolved.slice(0, 12),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "gitlab_project_activity",
        "What changed in the team's projects since the look-back window: merged MRs, failed pipelines and notable events. Uses GITLAB_PROJECTS when set, otherwise the recipient's most recently active projects.",
        SINCE,
        guarded(async ({ since_hours }) => {
          const since = hoursAgoIso(since_hours);
          const ids = projects.length
            ? projects.map(pid)
            : (
                await gl<Array<{ id: number }>>("/projects", {
                  membership: true,
                  last_activity_after: since,
                  order_by: "last_activity_at",
                  per_page: 12,
                })
              ).map((p) => String(p.id));
          const perProject = await Promise.all(
            ids.slice(0, 12).map(async (id) => {
              const [merged, failed, events, name] = await Promise.all([
                gl<GlMr[]>(`/projects/${id}/merge_requests`, { state: "merged", updated_after: since, per_page: 20 }),
                gl<GlPipeline[]>(`/projects/${id}/pipelines`, { status: "failed", updated_after: since, per_page: 10 }),
                gl<GlEvent[]>(`/projects/${id}/events`, { after: dateOnly(hoursAgoIso(since_hours + 24)), per_page: 40 }),
                gl<{ path_with_namespace: string; web_url: string }>(`/projects/${id}`),
              ]);
              return {
                project: name.path_with_namespace,
                url: name.web_url,
                merged: merged.map(mrView),
                failed_pipelines: failed.map((p) => ({ ref: p.ref, source: p.source, url: p.web_url, at: p.updated_at })),
                events: events
                  .filter((e) => e.created_at >= since)
                  .map((e) => ({
                    at: e.created_at,
                    who: e.author?.name,
                    action: e.action_name,
                    target: e.target_title ?? e.push_data?.commit_title ?? e.push_data?.ref,
                    type: e.target_type ?? e.push_data?.action,
                  })),
              };
            }),
          );
          return { since, projects: perProject };
        }),
        { annotations: { readOnlyHint: true } },
      ),
    ],
  });
};

/* ---------- Atlassian (shared auth) ---------- */

type AtlassianKind = "cloud" | "server";
const atlassianKind = (env: Env): AtlassianKind => (env.ATLASSIAN_KIND === "server" ? "server" : "cloud");
/** Cloud: basic auth with email + API token. Server/Data Center: bearer personal access token. */
const atlassianHeaders = (kind: AtlassianKind, email: string | undefined, token: string): Record<string, string> => ({
  Accept: "application/json",
  Authorization:
    kind === "cloud" || email
      ? `Basic ${Buffer.from(`${email ?? ""}:${token}`).toString("base64")}`
      : `Bearer ${token}`,
});

/* ---------- Jira ---------- */

type JiraIssue = {
  key: string;
  fields: {
    summary?: string;
    status?: { name?: string; statusCategory?: { name?: string } };
    priority?: { name?: string };
    issuetype?: { name?: string };
    assignee?: { displayName?: string } | null;
    reporter?: { displayName?: string } | null;
    updated?: string;
    created?: string;
    duedate?: string | null;
    labels?: string[];
    description?: unknown;
    comment?: { comments?: Array<{ author?: { displayName?: string }; created?: string; body?: unknown }> };
  };
  renderedFields?: { description?: string; comment?: { comments?: Array<{ author?: { displayName?: string }; created?: string; body?: string }> } };
};

const ISSUE_FIELDS = ["summary", "status", "priority", "issuetype", "assignee", "reporter", "updated", "created", "duedate", "labels"];

const jiraServer = (env: Env): McpServerConfig => {
  const kind = atlassianKind(env);
  const base = trimSlash(need(env, "JIRA_URL"));
  const headers = atlassianHeaders(kind, env.JIRA_EMAIL, need(env, "JIRA_TOKEN"));
  const api = kind === "cloud" ? "/rest/api/3" : "/rest/api/2";
  const projects = list(env.JIRA_PROJECTS);
  const scope = env.JIRA_JQL_SCOPE ?? (projects.length ? `project in (${projects.join(",")})` : "(assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser())");

  const issueView = (i: JiraIssue) => {
    const last = i.fields.comment?.comments?.slice(-1)[0];
    return {
      key: i.key,
      url: `${base}/browse/${i.key}`,
      summary: i.fields.summary,
      type: i.fields.issuetype?.name,
      status: i.fields.status?.name,
      status_category: i.fields.status?.statusCategory?.name,
      priority: i.fields.priority?.name,
      assignee: i.fields.assignee?.displayName ?? null,
      reporter: i.fields.reporter?.displayName ?? null,
      labels: i.fields.labels ?? [],
      due: i.fields.duedate ?? undefined,
      created: i.fields.created,
      updated: i.fields.updated,
      last_comment: last ? { by: last.author?.displayName, at: last.created, text: clip(bodyText(last.body), 300) } : undefined,
    };
  };

  const search = async (jql: string, fields: string[], max = 30): Promise<JiraIssue[]> =>
    kind === "cloud"
      ? (
          await http<{ issues?: JiraIssue[] }>(`${base}${api}/search/jql`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ jql, fields, maxResults: max }),
          })
        ).issues ?? []
      : (await http<{ issues?: JiraIssue[] }>(`${base}${api}/search?${qs({ jql, fields: fields.join(","), maxResults: max })}`, { headers })).issues ?? [];

  return createSdkMcpServer({
    name: "jira",
    version: "1.0.0",
    instructions: `Read-only Jira (${kind}). jira_my_open_issues for the recipient's plate, jira_recent_activity for what moved, jira_issue for one ticket's description and comments.`,
    tools: [
      tool(
        "jira_my_open_issues",
        "Open issues assigned to the recipient, highest priority first.",
        {},
        guarded(async () =>
          (await search("assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC, updated DESC", ISSUE_FIELDS)).map(issueView),
        ),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "jira_recent_activity",
        "Issues updated inside the look-back window within the team's scope (JIRA_PROJECTS or the recipient's own tickets), with the latest comment.",
        SINCE,
        guarded(async ({ since_hours }) =>
          (await search(`updated >= -${since_hours}h AND ${scope} ORDER BY updated DESC`, [...ISSUE_FIELDS, "comment"], 40)).map(issueView),
        ),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "jira_issue",
        "One issue in full: description and the last comments.",
        { key: z.string().describe("Issue key like AL-231.") },
        guarded(async ({ key }) => {
          const issue = await http<JiraIssue>(
            `${base}${api}/issue/${encodeURIComponent(key)}?${qs({ expand: "renderedFields", fields: [...ISSUE_FIELDS, "description", "comment"].join(",") })}`,
            { headers },
          );
          const rendered = issue.renderedFields;
          const comments = rendered?.comment?.comments ?? issue.fields.comment?.comments ?? [];
          return {
            ...issueView(issue),
            description: clip(rendered?.description ? stripHtml(rendered.description) : bodyText(issue.fields.description), 2000),
            comments: comments.slice(-5).map((c) => ({
              by: c.author?.displayName,
              at: c.created,
              text: clip(typeof c.body === "string" && rendered ? stripHtml(c.body) : bodyText(c.body), 500),
            })),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
    ],
  });
};

/* ---------- Confluence ---------- */

type CqlResult = {
  results?: Array<{
    content?: {
      id?: string;
      title?: string;
      type?: string;
      _links?: { webui?: string };
      version?: { by?: { displayName?: string }; when?: string; number?: number };
      space?: { key?: string; name?: string };
    };
    excerpt?: string;
    lastModified?: string;
  }>;
};

const confluenceServer = (env: Env): McpServerConfig => {
  const kind = atlassianKind(env);
  const base = trimSlash(need(env, "CONFLUENCE_URL"));
  const token = env.CONFLUENCE_TOKEN ?? need(env, "JIRA_TOKEN");
  const headers = atlassianHeaders(kind, env.CONFLUENCE_EMAIL ?? env.JIRA_EMAIL, token);
  const spaces = list(env.CONFLUENCE_SPACES);
  const scope = spaces.length
    ? `space in (${spaces.map((s) => `"${s}"`).join(",")})`
    : "(contributor = currentUser() OR mention = currentUser() OR watcher = currentUser())";

  return createSdkMcpServer({
    name: "confluence",
    version: "1.0.0",
    instructions: "Read-only Confluence. confluence_recent_pages lists what was written or changed; confluence_page reads one page when its content matters for a decision.",
    tools: [
      tool(
        "confluence_recent_pages",
        "Pages created or edited inside the look-back window, in the team's spaces (CONFLUENCE_SPACES) or touching the recipient.",
        SINCE,
        guarded(async ({ since_hours }) => {
          const cql = `type = page AND lastModified >= now("-${since_hours}h") AND ${scope} ORDER BY lastModified DESC`;
          const data = await http<CqlResult>(`${base}/rest/api/search?${qs({ cql, limit: 25, expand: "content.version,content.space" })}`, { headers });
          return (data.results ?? [])
            .filter((r) => r.content?.id)
            .map((r) => ({
              id: r.content?.id,
              title: r.content?.title,
              space: r.content?.space?.name ?? r.content?.space?.key,
              url: `${base}${r.content?._links?.webui ?? ""}`,
              by: r.content?.version?.by?.displayName,
              at: r.content?.version?.when ?? r.lastModified,
              version: r.content?.version?.number,
              excerpt: clip(stripHtml(r.excerpt), 280),
            }));
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "confluence_page",
        "The text of one page.",
        { id: z.string().describe("Confluence content id.") },
        guarded(async ({ id }) => {
          const page = await http<{
            id: string;
            title?: string;
            _links?: { webui?: string };
            version?: { by?: { displayName?: string }; when?: string };
            body?: { storage?: { value?: string } };
          }>(`${base}/rest/api/content/${encodeURIComponent(id)}?${qs({ expand: "body.storage,version" })}`, { headers });
          return {
            id: page.id,
            title: page.title,
            url: `${base}${page._links?.webui ?? ""}`,
            by: page.version?.by?.displayName,
            at: page.version?.when,
            text: clip(stripHtml(page.body?.storage?.value), 6000),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
    ],
  });
};

/* ---------- Outlook (Microsoft Graph) ---------- */

type GraphEvent = {
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isAllDay?: boolean;
  showAs?: string;
  location?: { displayName?: string };
  organizer?: { emailAddress?: { name?: string; address?: string } };
  attendees?: Array<{ emailAddress?: { name?: string; address?: string }; type?: string }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  bodyPreview?: string;
  webLink?: string;
  responseStatus?: { response?: string };
};
type GraphMail = {
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
  importance?: string;
  webLink?: string;
  hasAttachments?: boolean;
};

/** "+02:00" for a calendar date in a zone, so Graph gets an unambiguous window. */
const zoneOffset = (date: string, timeZone: string): string => {
  const probe = new Date(`${date}T12:00:00Z`);
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-]\d{2}:\d{2})?/.exec(part ?? "");
  return m?.[1] ?? "+00:00";
};

const outlookServer = (env: Env, timeZone: string): McpServerConfig => {
  const user = need(env, "MS_USER");
  const includeMail = env.OUTLOOK_INCLUDE_MAIL === "true";
  const graph = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}`;

  let cached: { token: string; expires: number } | undefined;
  const token = async (): Promise<string> => {
    if (env.MS_ACCESS_TOKEN) return env.MS_ACCESS_TOKEN;
    if (cached && cached.expires > Date.now() + 60_000) return cached.token;
    const res = await http<{ access_token: string; expires_in: number }>(
      `https://login.microsoftonline.com/${need(env, "MS_TENANT_ID")}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: need(env, "MS_CLIENT_ID"),
          client_secret: need(env, "MS_CLIENT_SECRET"),
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }).toString(),
      },
    );
    cached = { token: res.access_token, expires: Date.now() + res.expires_in * 1000 };
    return res.access_token;
  };
  const get = async <T>(path: string): Promise<T> =>
    http<T>(`${graph}${path}`, { headers: { Authorization: `Bearer ${await token()}`, Prefer: `outlook.timezone="${timeZone}"` } });

  const localHm = (dt: string | undefined): string => dt?.slice(11, 16) ?? "";

  const tools = [
    tool(
      "outlook_calendar",
      "The recipient's calendar for a day (local time), including attendees, medium and the invitation preview.",
      {
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Calendar day as YYYY-MM-DD."),
        days: z.number().int().min(1).max(7).default(1).describe("How many days from that date."),
      },
      guarded(async ({ date, days }) => {
        const offset = zoneOffset(date, timeZone);
        const endDate = new Date(`${date}T00:00:00Z`);
        endDate.setUTCDate(endDate.getUTCDate() + days);
        const end = endDate.toISOString().slice(0, 10);
        const params = qs({
          startDateTime: `${date}T00:00:00${offset}`,
          endDateTime: `${end}T00:00:00${offset}`,
          $orderby: "start/dateTime",
          $top: 50,
          $select: "subject,start,end,isAllDay,showAs,location,organizer,attendees,isOnlineMeeting,onlineMeetingProvider,bodyPreview,webLink,responseStatus",
        });
        const data = await get<{ value?: GraphEvent[] }>(`/calendarView?${params}`);
        return {
          date,
          timeZone,
          events: (data.value ?? []).map((e) => ({
            title: e.subject,
            start: localHm(e.start?.dateTime),
            end: localHm(e.end?.dateTime),
            all_day: e.isAllDay ?? false,
            show_as: e.showAs,
            response: e.responseStatus?.response,
            location: e.location?.displayName || undefined,
            online: e.isOnlineMeeting ? (e.onlineMeetingProvider ?? "online") : undefined,
            organizer: e.organizer?.emailAddress?.name,
            attendees: (e.attendees ?? []).slice(0, 10).map((a) => a.emailAddress?.name ?? a.emailAddress?.address),
            preview: clip(e.bodyPreview, 300),
            url: e.webLink,
          })),
        };
      }),
      { annotations: { readOnlyHint: true } },
    ),
    ...(includeMail
      ? [
          tool(
            "outlook_unread_mail",
            "Unread inbox mail inside the look-back window, newest first.",
            SINCE,
            guarded(async ({ since_hours }) => {
              const params = qs({
                $filter: `isRead eq false and receivedDateTime ge ${hoursAgoIso(since_hours)}`,
                $orderby: "receivedDateTime desc",
                $top: 25,
                $select: "subject,from,receivedDateTime,bodyPreview,importance,webLink,hasAttachments",
              });
              const data = await get<{ value?: GraphMail[] }>(`/mailFolders/inbox/messages?${params}`);
              return (data.value ?? []).map((m) => ({
                subject: m.subject,
                from: m.from?.emailAddress?.name ?? m.from?.emailAddress?.address,
                at: m.receivedDateTime,
                importance: m.importance,
                attachments: m.hasAttachments ?? false,
                preview: clip(m.bodyPreview, 240),
                url: m.webLink,
              }));
            }),
            { annotations: { readOnlyHint: true } },
          ),
        ]
      : []),
  ];

  return createSdkMcpServer({
    name: "outlook",
    version: "1.0.0",
    instructions: "Read-only Outlook via Microsoft Graph. Always call outlook_calendar for today before writing the greeting and the 'Your day' section.",
    tools,
  });
};

/* ---------- GitHub ---------- */
/* The personal stack (GitHub, Linear, Notion) mirrors the team stack (GitLab,
   Jira, Confluence): same questions, same read-only shape, so the brief reads
   the same whichever side is connected. */

type GhRepo = { full_name: string; html_url: string; pushed_at?: string };
type GhIssue = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  updated_at: string;
  created_at: string;
  draft?: boolean;
  pull_request?: { url: string; merged_at?: string | null };
  user?: { login?: string };
  labels?: Array<{ name?: string }>;
  repository_url?: string;
  comments?: number;
};
type GhPull = GhIssue & {
  merged_at?: string | null;
  mergeable_state?: string;
  requested_reviewers?: Array<{ login?: string }>;
  review_comments?: number;
  head?: { sha?: string };
  body?: string | null;
};
type GhNotification = {
  reason: string;
  updated_at: string;
  subject?: { title?: string; type?: string; url?: string };
  repository?: { full_name?: string };
};
type GhCheckRuns = { check_runs?: Array<{ name?: string; conclusion?: string | null; status?: string; html_url?: string }> };
type GhReviewComment = { user?: { login?: string }; created_at: string; body?: string; path?: string };

const ghRepoOf = (i: GhIssue): string | undefined => i.repository_url?.split("/repos/")[1];
const ghView = (i: GhIssue) => ({
  ref: `${ghRepoOf(i) ?? ""}#${i.number}`,
  title: i.title,
  url: i.html_url,
  kind: i.pull_request ? "pull request" : "issue",
  draft: i.draft,
  by: i.user?.login,
  labels: (i.labels ?? []).map((l) => l.name).filter(Boolean),
  comments: i.comments,
  updated_at: i.updated_at,
});

const githubServer = (env: Env): McpServerConfig => {
  const base = trimSlash(env.GITHUB_API_URL ?? "https://api.github.com");
  const headers = {
    Authorization: `Bearer ${need(env, "GITHUB_TOKEN")}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const repos = list(env.GITHUB_REPOS);
  const gh = <T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> =>
    http<T>(`${base}${path}?${qs({ per_page: 50, ...params })}`, { headers });
  const me = (): Promise<{ login: string; name?: string }> => gh("/user");
  const repoScope = async (): Promise<string[]> =>
    repos.length ? repos : (await gh<GhRepo[]>("/user/repos", { sort: "pushed", affiliation: "owner,collaborator,organization_member" })).slice(0, 8).map((r) => r.full_name);

  return createSdkMcpServer({
    name: "github",
    version: "1.0.0",
    instructions: "Read-only GitHub. Start with github_notifications and github_my_pull_requests; drill into one PR with github_pull_request when its state matters.",
    tools: [
      tool(
        "github_notifications",
        "Unread GitHub notifications for the recipient: review requests, mentions, assignments, failed workflows.",
        SINCE,
        guarded(async ({ since_hours }) =>
          (await gh<GhNotification[]>("/notifications", { since: hoursAgoIso(since_hours) })).map((n) => ({
            reason: n.reason,
            type: n.subject?.type,
            title: n.subject?.title,
            repo: n.repository?.full_name,
            updated_at: n.updated_at,
          })),
        ),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "github_my_pull_requests",
        "Open pull requests the recipient authored, plus open ones where their review is requested.",
        {},
        guarded(async () => {
          const user = await me();
          const search = (q: string) => gh<{ items: GhIssue[] }>("/search/issues", { q, sort: "updated", order: "desc" });
          const [authored, reviewing] = await Promise.all([
            search(`is:pr is:open author:${user.login}`),
            search(`is:pr is:open review-requested:${user.login}`),
          ]);
          return { user: user.name ?? user.login, authored: authored.items.map(ghView), reviewing: reviewing.items.map(ghView) };
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "github_pull_request",
        "Detail for one pull request: description, check runs on its head, and recent review comments.",
        { repo: z.string().describe("owner/name"), number: z.number().int().describe("The pull request number (#123 -> 123).") },
        guarded(async ({ repo, number }) => {
          const pr = await gh<GhPull>(`/repos/${repo}/pulls/${number}`);
          const [checks, comments] = await Promise.all([
            pr.head?.sha ? gh<GhCheckRuns>(`/repos/${repo}/commits/${pr.head.sha}/check-runs`) : Promise.resolve({ check_runs: [] }),
            gh<GhReviewComment[]>(`/repos/${repo}/pulls/${number}/comments`, { sort: "updated", direction: "desc", per_page: 20 }),
          ]);
          return {
            ...ghView({ ...pr, repository_url: `${base}/repos/${repo}` }),
            description: clip(pr.body, 1500),
            mergeable_state: pr.mergeable_state,
            reviewers_requested: (pr.requested_reviewers ?? []).map((r) => r.login),
            checks: (checks.check_runs ?? []).map((c) => ({ name: c.name, status: c.status, conclusion: c.conclusion, url: c.html_url })),
            review_comments: comments.slice(0, 12).map((c) => ({ by: c.user?.login, at: c.created_at, path: c.path, text: clip(c.body, 400) })),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "github_repo_activity",
        "What changed in the recipient's repositories since the look-back window: merged and closed pull requests and issues. Uses GITHUB_REPOS when set, otherwise the most recently pushed repositories.",
        SINCE,
        guarded(async ({ since_hours }) => {
          const since = hoursAgoIso(since_hours);
          const scope = await repoScope();
          const q = `${scope.map((r) => `repo:${r}`).join(" ")} updated:>=${dateOnly(since)}`;
          const items = (await gh<{ items: GhIssue[] }>("/search/issues", { q, sort: "updated", order: "desc" })).items;
          return {
            repos: scope,
            merged_or_closed: items.filter((i) => i.state === "closed").map(ghView),
            still_open: items.filter((i) => i.state === "open").map(ghView),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
    ],
  });
};

/* ---------- Linear ---------- */
/* Linear speaks GraphQL, so every call is a POST by protocol; every query here
   only reads. The allow-list and the token scope keep it that way. */

type LnIssue = {
  identifier: string;
  title: string;
  url: string;
  updatedAt: string;
  createdAt: string;
  dueDate?: string | null;
  priorityLabel?: string;
  state?: { name?: string; type?: string };
  assignee?: { name?: string };
  project?: { name?: string };
  team?: { key?: string };
};
type LnComment = { createdAt: string; body?: string; user?: { name?: string } };

const lnView = (i: LnIssue) => ({
  ref: i.identifier,
  title: i.title,
  url: i.url,
  state: i.state?.name,
  priority: i.priorityLabel,
  project: i.project?.name,
  team: i.team?.key,
  assignee: i.assignee?.name,
  due: i.dueDate ?? undefined,
  updated_at: i.updatedAt,
});

const LN_FIELDS = "identifier title url updatedAt createdAt dueDate priorityLabel state { name type } assignee { name } project { name } team { key }";

const linearServer = (env: Env): McpServerConfig => {
  const token = need(env, "LINEAR_API_KEY");
  const teams = list(env.LINEAR_TEAMS);
  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const res = await http<{ data?: T; errors?: Array<{ message: string }> }>("https://api.linear.app/graphql", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
    return res.data as T;
  };
  const teamFilter = teams.length ? `team: { key: { in: ${JSON.stringify(teams)} } },` : "";

  return createSdkMcpServer({
    name: "linear",
    version: "1.0.0",
    instructions: "Read-only Linear. Start with linear_my_issues; use linear_recent_activity for what moved; drill into one issue with linear_issue when a comment decides the ranking.",
    tools: [
      tool(
        "linear_my_issues",
        "Open issues assigned to the recipient, most recently updated first, with state, priority and due date.",
        {},
        guarded(async () => {
          const data = await gql<{ viewer: { name: string }; issues: { nodes: LnIssue[] } }>(
            `query { viewer { name } issues(first: 50, orderBy: updatedAt, filter: { ${teamFilter} assignee: { isMe: { eq: true } }, state: { type: { nin: ["completed", "canceled"] } } }) { nodes { ${LN_FIELDS} } } }`,
          );
          return { user: data.viewer.name, issues: data.issues.nodes.map(lnView) };
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "linear_recent_activity",
        "Issues that changed since the look-back window in the recipient's teams (LINEAR_TEAMS when set): completed, started, or newly created.",
        SINCE,
        guarded(async ({ since_hours }) => {
          const data = await gql<{ issues: { nodes: LnIssue[] } }>(
            `query($since: DateTimeOrDuration!) { issues(first: 50, orderBy: updatedAt, filter: { ${teamFilter} updatedAt: { gte: $since } }) { nodes { ${LN_FIELDS} } } }`,
            { since: hoursAgoIso(since_hours) },
          );
          const nodes = data.issues.nodes;
          return {
            completed: nodes.filter((i) => i.state?.type === "completed").map(lnView),
            in_progress: nodes.filter((i) => i.state?.type === "started").map(lnView),
            new_or_moved: nodes.filter((i) => !["completed", "started"].includes(i.state?.type ?? "")).map(lnView),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "linear_issue",
        "Detail for one issue: description and the latest comments.",
        { identifier: z.string().describe("Issue identifier like AL-123.") },
        guarded(async ({ identifier }) => {
          const data = await gql<{ issue: LnIssue & { description?: string | null; comments: { nodes: LnComment[] } } }>(
            `query($id: String!) { issue(id: $id) { ${LN_FIELDS} description comments(last: 10) { nodes { createdAt body user { name } } } } }`,
            { id: identifier },
          );
          return {
            ...lnView(data.issue),
            description: clip(data.issue.description, 1500),
            comments: data.issue.comments.nodes.map((c) => ({ by: c.user?.name, at: c.createdAt, text: clip(c.body, 400) })),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
    ],
  });
};

/* ---------- Notion ---------- */
/* Notion's search is a POST by protocol and reads only; the integration token
   decides which pages exist for the agent at all (share them with it). */

type NtRich = { plain_text?: string };
type NtPage = {
  id: string;
  object: "page" | "database";
  url?: string;
  last_edited_time: string;
  created_time: string;
  last_edited_by?: { id?: string };
  properties?: Record<string, { type?: string; title?: NtRich[] }>;
  title?: NtRich[];
};
type NtBlock = { type: string; has_children?: boolean; [k: string]: unknown };

const ntTitle = (p: NtPage): string => {
  const prop = Object.values(p.properties ?? {}).find((v) => v.type === "title");
  const rich = prop?.title ?? p.title ?? [];
  return rich.map((r) => r.plain_text ?? "").join("") || "(untitled)";
};
const ntView = (p: NtPage) => ({ id: p.id, kind: p.object, title: ntTitle(p), url: p.url, updated_at: p.last_edited_time, created_at: p.created_time });
const ntBlockText = (b: NtBlock): string => {
  const inner = b[b.type] as { rich_text?: NtRich[]; title?: string } | undefined;
  return (inner?.rich_text ?? []).map((r) => r.plain_text ?? "").join("") || inner?.title || "";
};

const notionServer = (env: Env): McpServerConfig => {
  const headers = { Authorization: `Bearer ${need(env, "NOTION_TOKEN")}`, "Notion-Version": env.NOTION_VERSION ?? "2022-06-28", "Content-Type": "application/json" };
  const nt = <T>(path: string, init: RequestInit = {}): Promise<T> => http<T>(`https://api.notion.com/v1${path}`, { ...init, headers });
  const search = (body: Record<string, unknown>) =>
    nt<{ results: NtPage[] }>("/search", { method: "POST", body: JSON.stringify({ sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 30, ...body }) });

  return createSdkMcpServer({
    name: "notion",
    version: "1.0.0",
    instructions: "Read-only Notion. Start with notion_recent_pages; drill into one page with notion_page when its text decides the ranking.",
    tools: [
      tool(
        "notion_recent_pages",
        "Pages and databases shared with the integration that were edited since the look-back window, newest first.",
        SINCE,
        guarded(async ({ since_hours }) => {
          const since = hoursAgoIso(since_hours);
          const { results } = await search({});
          return results.filter((p) => p.last_edited_time >= since).map(ntView);
        }),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "notion_search",
        "Search page titles shared with the integration.",
        { query: z.string().min(1).describe("Words from the page title.") },
        guarded(async ({ query }) => (await search({ query, filter: { property: "object", value: "page" } })).results.map(ntView)),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        "notion_page",
        "The text of one page: its top-level blocks, clipped.",
        { page_id: z.string().describe("The page id from notion_recent_pages or notion_search.") },
        guarded(async ({ page_id }) => {
          const [page, blocks] = await Promise.all([nt<NtPage>(`/pages/${page_id}`), nt<{ results: NtBlock[] }>(`/blocks/${page_id}/children?page_size=60`)]);
          return {
            ...ntView(page),
            text: clip(blocks.results.map(ntBlockText).filter(Boolean).join("\n"), 3000),
          };
        }),
        { annotations: { readOnlyHint: true } },
      ),
    ],
  });
};

/* ---------- assembly ---------- */

const hasAll = (env: Env, keys: string[]): boolean => keys.every((k) => Boolean(env[k]));

/**
 * Decide which sources are configured and build one in-process MCP server each.
 * Returns the `mcpServers` map and the matching `allowedTools` wildcards.
 */
export const buildSources = (env: Env, timeZone: string): Sources => {
  const candidates: ReadonlyArray<readonly [SourceName, boolean, () => McpServerConfig]> = [
    ["gitlab", hasAll(env, ["GITLAB_URL", "GITLAB_TOKEN"]), () => gitlabServer(env)],
    ["jira", hasAll(env, ["JIRA_URL", "JIRA_TOKEN"]), () => jiraServer(env)],
    ["confluence", Boolean(env.CONFLUENCE_URL && (env.CONFLUENCE_TOKEN ?? env.JIRA_TOKEN)), () => confluenceServer(env)],
    [
      "outlook",
      Boolean(env.MS_USER && (env.MS_ACCESS_TOKEN || hasAll(env, ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET"]))),
      () => outlookServer(env, timeZone),
    ],
    ["github", hasAll(env, ["GITHUB_TOKEN"]), () => githubServer(env)],
    ["linear", hasAll(env, ["LINEAR_API_KEY"]), () => linearServer(env)],
    ["notion", hasAll(env, ["NOTION_TOKEN"]), () => notionServer(env)],
  ];
  const enabled = candidates.filter(([, on]) => on);
  return {
    servers: Object.fromEntries(enabled.map(([name, , make]) => [name, make()])),
    allowedTools: enabled.map(([name]) => `mcp__${name}__*`),
    enabled: enabled.map(([name]) => name),
  };
};
