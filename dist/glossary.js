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
  {term:'OPEN', definition:'The evidence, access or decision is unavailable or has not been run yet.'}
];
