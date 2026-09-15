/**
 * Sources: GitLab, Jira, Confluence, Outlook (Microsoft Graph).
 *
 * Each source is an in-process MCP server built with the Agent SDK's
 * `createSdkMcpServer` + `tool`. The tools are small, read-only REST calls with
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
  ];
  const enabled = candidates.filter(([, on]) => on);
  return {
    servers: Object.fromEntries(enabled.map(([name, , make]) => [name, make()])),
    allowedTools: enabled.map(([name]) => `mcp__${name}__*`),
    enabled: enabled.map(([name]) => name),
  };
};
