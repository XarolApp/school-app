#!/usr/bin/env node
// model-gate — UserPromptSubmit hook. Classifies the prompt and, for
// substantial work, injects an instruction to confirm model + effort before
// acting. It cannot see the model picker or effort setting, so it never
// claims to: the confirmation has to come from the user.
//
// Self-check: node model-gate.js --selftest

// ponytail: shape heuristic, not a real classifier. It errs toward gating;
// a false positive costs one confirmation question, a false negative skips the gate.
// A short question is exempt unless it is really a request ("can you fix…?").
// Words like "plan" or "test" inside a question are usually nouns, so they
// don't gate on their own.
// (?<!\p{L}) / (?!\p{L}) instead of \b: JS \b is ASCII-only and breaks on č, š, ž.
const QUESTION = /^(what|why|how|where|when|which|who|is|are|does|do|did|should|co|proč|proc|jak|kde|kdy|který|ktery|je|jsou|má|ma)(?!\p{L})/iu;
const REQUEST = /(?<!\p{L})((can|could|would|will) you|please|prosím|prosim|můžeš|muzes|mohl bys)(?!\p{L})/iu;
const CONFIRM = /\beffort\s*(is|=|:|set to)?\s*(low|medium|high|xhigh|max)\b/i;

function classify(prompt) {
  const p = (prompt || '').trim();
  if (!p) return 'exempt';
  if (CONFIRM.test(p)) return 'confirmed';
  const looksLikeQuestion = p.endsWith('?') || QUESTION.test(p);
  if (looksLikeQuestion && p.length < 300 && !REQUEST.test(p)) return 'exempt';
  return 'gated';
}

const GATE =
  'MODEL GATE (plugin model-gate): this prompt looks like substantial work ' +
  '(code change, plan, review, browser audit or workflow). Before doing it, run the ' +
  'model-gate skill: classify the task with the model table in AGENTS.md/CLAUDE.md, ' +
  'state the recommended model and effort, and ask the user to confirm the active ' +
  'model and effort unless a trustworthy session indicator shows both. This hook ' +
  'cannot read the model picker or effort setting; never claim that it did. If the ' +
  'user already confirmed a matching model and effort earlier in this session for ' +
  'this same task, continue without asking again. Simple factual questions are exempt.';

function contextFor(kind, prompt) {
  if (kind === 'gated') return GATE;
  if (kind === 'confirmed') {
    const effort = prompt.match(CONFIRM)[2].toLowerCase();
    return `MODEL GATE (plugin model-gate): the user states effort is "${effort}". ` +
      'Check it against the model table for the pending task; continue if it matches, ' +
      'otherwise name the required model and effort and wait.';
  }
  return null;
}

if (process.argv[2] === '--selftest') {
  const assert = require('assert');
  assert.strictEqual(classify('what is plan 012?'), 'exempt');
  assert.strictEqual(classify('proč je skóre tak vysoké?'), 'exempt');
  assert.strictEqual(classify('fix the Escape-key issue now'), 'gated');
  assert.strictEqual(classify('can you fix the login bug?'), 'gated');
  assert.strictEqual(classify('how does the test suite work?'), 'exempt');
  assert.strictEqual(classify('okey, wire that in next'), 'gated');
  assert.strictEqual(classify('můžeš opravit ten bug?'), 'gated');
  assert.strictEqual(classify('effort is medium, go ahead'), 'confirmed');
  assert.strictEqual(classify(''), 'exempt');
  console.log('model-gate selftest ok');
  process.exit(0);
}

let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = JSON.parse(input.replace(/^﻿/, '')).prompt || ''; } catch { /* no prompt: stay silent */ }
  const ctx = contextFor(classify(prompt), prompt);
  if (ctx) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx },
    }));
  }
});
