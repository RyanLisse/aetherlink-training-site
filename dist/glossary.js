'use strict';
window.GLOSSARY = [
  {term:'Model', definition:'Predicts and generates language. By itself it is not an agent.'},
  {term:'Chat', definition:'A model with a conversation and context, usually waiting for your next message.'},
  {term:'Agent', definition:'A model in a loop with a goal, tools, feedback and a boundary.'},
  {term:'Agentic loop', definition:'Gather context → take action → verify results → repeat or stop at a human gate.'},
  {term:'Tool', definition:'A capability the harness exposes, such as reading a file, calculating or checking.'},
  {term:'Harness', definition:'The system around the model that supplies context, tools, permissions and feedback.'},
  {term:'Human gate', definition:'A deliberate pause where a person accepts, revises, parks or redirects the work.'},
  {term:'Trace', definition:'A record of observed lifecycle and successful tool events; it does not prove correctness.'},
  {term:'Hook', definition:'A deterministic rule at a lifecycle point, for example blocking a Write before it happens.'},
  {term:'Evaluator', definition:'A separate reviewer that checks output against a written contract and returns PASS or REVISE.'},
  {term:'OPEN', definition:'The evidence, access or decision is unavailable or has not been run yet.'},
  {term:'intent.md', definition:'The human starting brief written before design or build: what we want, why it matters, within which boundaries. Unknowns are marked OPEN, not guessed.'},
  {term:'Evidence rule', definition:'A claim counts only with a source (row id or file at the cutoff), a reproduced check (command, calculation or sheet) and a reviewer who reran it. Anything less is a hypothesis.'},
  {term:'MOB programming', definition:'One task, one screen, one human driver. The navigator directs, the skeptic asks for source ids, the scribe records decisions. Rotate every 5–7 minutes; anyone may say "pause".'},
  {term:'Contract', definition:'The shared functional instruction (shared-prompt.md plus the ticket input): what the agent must produce and must not do, identical on every platform.'},
  {term:'Adapter', definition:'The platform-specific way a contract is wired in: system message, model, mode, access and tools in n8n or Claude Code. Recorded per platform, never part of the contract.'},
  {term:'Subagent', definition:'An agent another agent delegates to, with its own context and a narrower task.'},
  {term:'Checkpoint', definition:'The observable condition on a slide that must be true before the group moves on. Marked passed by a human, never assumed.'},
  {term:'Holdout scenario', definition:'An end-to-end user story kept outside the codebase agents work in, never shown to them, scored as the fraction of runs that satisfied the user.'},
  {term:'Constant', definition:'What stays fixed between two runs (prompt, sequence, harness) so that one change can be measured; without it no run is comparable.'}
];
