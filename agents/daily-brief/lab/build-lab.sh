#!/usr/bin/env bash
# Build the participant lab repository from this agent, one commit per lesson step.
#
#   agents/daily-brief/lab/build-lab.sh /path/to/aetherlink-daily-brief-lab
#
# Result: a fresh git repository where
#   main            = step 0: templates, package skeleton, nothing else (participants start here)
#   solution        = one linear history, one commit per step, on top of main
#   step-N-<name>   = a tag on each step commit;  steps/N-<name> = the same commit as a branch
#
# The agent under agents/daily-brief is the single source of truth: code, tests,
# sample and filled documents are copied from there; only the empty templates
# (lab/steps/0-start) and the step-4 sample-only CLI (lab/steps/4-build-render)
# live in lab/steps. Re-run the script after any change to the agent and push
# with `git push --force-with-lease --all --tags` to the lab remote.
set -euo pipefail

AGENT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STEPS="$AGENT/lab/steps"
TARGET="${1:?usage: build-lab.sh <target-dir>}"

if [ -e "$TARGET" ]; then
  echo "refusing to build into an existing path: $TARGET" >&2
  exit 1
fi

mkdir -p "$TARGET"
git -C "$TARGET" init -q -b main
git -C "$TARGET" config user.name "AetherLink lab builder"
git -C "$TARGET" config user.email "lab@example.invalid"

copy() { # copy <agent-relative source> [<lab-relative destination>]
  local src="$AGENT/$1" dst="$TARGET/${2:-$1}"
  mkdir -p "$(dirname "$dst")"
  cp -R "$src" "$dst"
}
overlay() { cp -R "$STEPS/$1/." "$TARGET/"; }
commit() { git -C "$TARGET" add -A; git -C "$TARGET" commit -q -m "$1"; }
mark() { # mark <n> <name>: tag step-N-name and branch steps/N-name on HEAD
  git -C "$TARGET" tag "step-$1-$2"
  git -C "$TARGET" branch "steps/$1-$2"
}

# progress.md is generated per step so the board always matches the commit.
progress() { # progress <highest verified step>
  local done="$1"
  {
    echo "# Progress — Daily brief agent lab"
    echo
    echo "Status per step. VERIFIED means the proof command ran and a reviewer reran it; OPEN means not yet."
    echo
    echo "| Step | Artifact | Proof | Status |"
    echo "| --- | --- | --- | --- |"
    local rows=(
      "1|intent.md|facilitator accepts the boundary"
      "2|docs/spec.md, src/brief.ts, sample, test/schema.test.ts|npm test (schema)"
      "3|docs/design.md, docs/decisions/ADR-001, docs/plan.md|plan accepted before build"
      "4|src/render.ts, src/main.ts|npm run brief:sample"
      "5|src/sources.ts, src/agent.ts|npm test, npm run typecheck"
      "6|docs/evidence.md, docs/evidence/*.png|three commands with a reviewer"
      "7|docs/gate.md, gitlab-ci.example.yml|PASS / FAIL / OPEN with a quoted line"
    )
    local row n rest
    for row in "${rows[@]}"; do
      n="${row%%|*}"; rest="${row#*|}"
      if [ "$n" -le "$done" ]; then
        echo "| $n | ${rest%%|*} | ${rest#*|} | VERIFIED in the reference solution; rerun it yourself |"
      else
        echo "| $n | ${rest%%|*} | ${rest#*|} | OPEN |"
      fi
    done
    echo
    echo "Live runs against a real source: OPEN until a token exists. A blocked credential is an access result, not a failure."
  } > "$TARGET/progress.md"
}

# ---- step 0: the empty lab ---------------------------------------------------
overlay 0-start
copy package.json
copy package-lock.json
copy tsconfig.json
copy .gitignore
copy .env.example
copy SOLO.md
progress 0
commit "Step 0 — empty lab: templates and package skeleton"
mark 0 start

git -C "$TARGET" switch -q -c solution

# ---- step 1: plan, intent ----------------------------------------------------
copy intent.md
progress 1
commit "Step 1 — intent.md: outcome, success checks, boundary, OPEN"
mark 1 intent

# ---- step 2: plan, spec + the contract as code ---------------------------------
copy docs/spec.md
copy src/brief.ts
copy sample/brief.sample.json
copy test/helpers.ts
copy test/schema.test.ts
progress 2
commit "Step 2 — spec.md and the contract: brief.ts, the sample, schema tests"
mark 2 spec

# ---- step 3: design + plan ------------------------------------------------------
copy docs/design.md
copy docs/decisions/ADR-001-in-process-tools.md
copy docs/plan.md
progress 3
commit "Step 3 — design.md, ADR-001 and plan.md with proof commands"
mark 3 design

# ---- step 4: build, the renderer (first end-to-end slice) ----------------------
copy src/render.ts
copy src/artwork.ts
copy test/render.test.ts
overlay 4-build-render
progress 4
commit "Step 4 — render.ts and a sample-only CLI: the first artifact"
mark 4 build-render

# ---- step 5: build, the agent --------------------------------------------------
copy src/sources.ts
copy src/agent.ts
copy src/main.ts
copy test/agent.test.ts
progress 5
commit "Step 5 — sources.ts, agent.ts and the full CLI"
mark 5 build-agent

# ---- step 6: test, evidence ------------------------------------------------------
copy docs/evidence.md
copy docs/evidence
progress 6
commit "Step 6 — evidence.md: three commands, one screenshot, one reviewer"
mark 6 evidence

# ---- step 7: deploy, gate + schedule -------------------------------------------
copy docs/gate.md
copy gitlab-ci.example.yml
copy github-actions.example.yml
copy README.md docs/agent-readme.md
progress 7
commit "Step 7 — gate.md and the schedule"
mark 7 gate-deploy

git -C "$TARGET" switch -q main
echo "lab built at $TARGET"
git -C "$TARGET" log --oneline --all --decorate | sed 's/^/  /'
