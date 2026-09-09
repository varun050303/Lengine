#!/usr/bin/env node

import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import {
  createSession,
  addObservation,
  addHypothesis,
  updateHypothesisStatus,
  createExperiment,
  recordExperimentResult,
  addEvidenceLink,
  addCausalNote,
  setCapabilityPrimitive,
  setCapabilityImpact,
  saveSession,
  loadSession,
  HYPOTHESIS_STATES
} from '../investigation/session.js';
import { ProfileUpdateSpecimen } from '../investigation/specimen.js';
import { WebhookSubscriptionSpecimen } from '../investigation/transfer.js';
import { evaluateSession } from '../investigation/evaluator.js';
import { RevealGate } from '../investigation/reveal.js';
import { ContentOracle } from '../investigation/oracle.js';

let specimen = new ProfileUpdateSpecimen();
let session = createSession({
  specimenId: specimen.id,
  oracleTopicId: 'topic.csrf'
});

const oracle = new ContentOracle();
const revealGate = new RevealGate(oracle);

function printHeader() {
  console.log(chalk.bold.cyan('\n======================================================================'));
  console.log(chalk.bold.cyan('             LENGINE v2.0 - FIRST-PRINCIPLES INVESTIGATION            '));
  console.log(chalk.bold.cyan('======================================================================'));
  console.log(chalk.dim(`Specimen: ${chalk.yellow(specimen.id)} | Session: ${chalk.green(session.session_id)} | Reveal Gate: ${session.reveal_state === 'UNLOCKED' ? chalk.bold.green('UNLOCKED') : chalk.bold.red('LOCKED')}\n`));
}

function printPanels() {
  console.log(chalk.bold.white('----------------------------------------------------------------------'));
  console.log(chalk.bold.magenta('┌── [SPECIMEN: What Exists] ──────────────────────────────────────────'));
  console.log(chalk.white(`  Target: ${specimen.displayName}`));
  console.log(chalk.gray(`  Description: ${specimen.description}`));
  const state = specimen.getCurrentState();
  console.log(chalk.white(`  Current State: ${JSON.stringify(state)}`));

  console.log(chalk.bold.blue('├── [SESSION: What I Believe] ────────────────────────────────────────'));
  console.log(chalk.white(`  Hypotheses (${session.hypotheses.length}):`));
  if (session.hypotheses.length === 0) {
    console.log(chalk.gray('    (none formulated yet)'));
  } else {
    session.hypotheses.forEach(h => {
      const color = h.status === 'CONFIRMED' ? chalk.green : h.status === 'REFUTED' ? chalk.red : h.status === 'SUPPORTED' ? chalk.cyan : chalk.yellow;
      console.log(`    [${color(h.status)}] ${chalk.bold(h.id)}: ${h.statement}`);
    });
  }

  console.log(chalk.white(`  Evidence Ledger (${session.evidence.length} links, ${session.observations.length} observations):`));
  if (session.evidence.length === 0) {
    console.log(chalk.gray('    (no observations linked as evidence yet)'));
  } else {
    session.evidence.forEach(ev => {
      const relColor = ev.relationship === 'SUPPORTS' ? chalk.green : chalk.red;
      console.log(`    ${chalk.bold(ev.id)}: ${ev.observation_id} --[${relColor(ev.relationship)}]--> ${ev.hypothesis_id} ${ev.rationale ? chalk.dim(`("${ev.rationale}")`) : ''}`);
    });
  }

  console.log(chalk.white(`  Causal Notes (${session.causal_notes.length} steps):`));
  if (session.causal_notes.length === 0) {
    console.log(chalk.gray('    (causal chain not synthesized yet)'));
  } else {
    session.causal_notes.forEach(c => {
      console.log(`    ${c.step}. ${chalk.yellow(c.component)}: ${c.role}`);
    });
  }

  console.log(chalk.white(`  Capability:`));
  console.log(`    Primitive: ${session.capability.primitive ? chalk.green(session.capability.primitive) : chalk.gray('(not established)')}`);
  console.log(`    Impact:    ${session.capability.impact_locked ? chalk.red('[LOCKED - establish primitive first]') : (session.capability.impact ? chalk.green(session.capability.impact) : chalk.yellow('[UNLOCKED - ready to state impact]'))}`);

  console.log(chalk.bold.yellow('└── [EVALUATION STATUS] ──────────────────────────────────────────────'));
  if (session.evaluation && session.evaluation.status === 'EVALUATED') {
    if (session.evaluation.passed) {
      console.log(chalk.bold.green('  ✔ ALL INVESTIGATION CHECKS PASSED. Ready for canonical reveal!'));
    } else {
      console.log(chalk.bold.red(`  ✖ Evaluation not passed (${session.evaluation.reasons.length} threshold gaps):`));
      session.evaluation.reasons.forEach(r => console.log(chalk.red(`    - ${r}`)));
    }
  } else {
    console.log(chalk.gray('  Evaluation pending. Complete investigation loop before gating.'));
  }
  console.log(chalk.bold.white('----------------------------------------------------------------------\n'));
}

async function viewBaseline() {
  const baseline = specimen.getBaseline();
  console.log(chalk.bold.cyan(`\n=== Baseline Observable Interaction ===`));
  console.log(chalk.bold.yellow(baseline.title));
  console.log(chalk.bold.white('\n[Baseline Request]'));
  console.log(`${baseline.request.method} ${baseline.request.url} HTTP/1.1`);
  for (const [k, v] of Object.entries(baseline.request.headers)) {
    console.log(`${k}: ${v}`);
  }
  if (baseline.request.body) {
    console.log(`\n${baseline.request.body}`);
  }

  console.log(chalk.bold.white('\n[Baseline Response]'));
  console.log(`HTTP/1.1 ${baseline.response.status} ${baseline.response.statusText}`);
  for (const [k, v] of Object.entries(baseline.response.headers)) {
    console.log(`${k}: ${v}`);
  }
  console.log(`\n${baseline.response.body}`);

  console.log(chalk.bold.white('\n[Safety Contract & Scope]'));
  console.log(chalk.dim(`Authorization: ${specimen.safetyContract.authorization_assumption}`));
  console.log(chalk.dim(`Scope: ${specimen.safetyContract.scope_constraints.join(' ')}`));
  console.log(chalk.dim(`Safer Alternative: ${specimen.safetyContract.safer_alternative}`));
  console.log('\n');
}

async function handleAddObservation() {
  const text = await input({ message: 'Enter empirical observation or notes:' });
  if (!text.trim()) return;

  const type = await select({
    message: 'Is this a directly observed empirical fact or an inferred conclusion?',
    choices: [
      { name: 'OBSERVATION (Raw measured fact from network/system state)', value: 'OBSERVATION' },
      { name: 'INFERENCE (Interpretive deduction or assumption)', value: 'INFERENCE' }
    ]
  });

  const obs = addObservation(session, { content: text, type });
  console.log(chalk.green(`\n✔ Added ${type}: ${obs.id}\n`));
}

async function handleAddHypothesis() {
  console.log(chalk.dim('\nFormulate a falsifiable, competing explanation of how this endpoint operates.\n(Do not guess names; describe the technical mechanism.)'));
  const text = await input({ message: 'Hypothesis statement:' });
  if (!text.trim()) return;

  const hyp = addHypothesis(session, text);
  console.log(chalk.green(`\n✔ Added competing hypothesis ${hyp.id} [status: UNKNOWN]\n`));
}

async function handleUpdateHypothesis() {
  if (session.hypotheses.length === 0) {
    console.log(chalk.yellow('\nNo hypotheses exist yet. Formulate one first.\n'));
    return;
  }

  const hypothesisId = await select({
    message: 'Select hypothesis to update:',
    choices: session.hypotheses.map(h => ({
      name: `[${h.status}] ${h.id}: ${h.statement}`,
      value: h.id
    }))
  });

  const newStatus = await select({
    message: 'Select new status based on experimental evidence:',
    choices: HYPOTHESIS_STATES.map(s => ({ name: s, value: s }))
  });

  const rationale = await input({ message: 'Rationale / experimental evidence supporting this update:' });

  updateHypothesisStatus(session, hypothesisId, newStatus, rationale);
  console.log(chalk.green(`\n✔ Updated ${hypothesisId} to [${newStatus}]\n`));
}

async function handleDesignExperiment() {
  if (session.hypotheses.length === 0) {
    console.log(chalk.yellow('\nFormulate at least one hypothesis before designing an experiment.\n'));
    return;
  }

  const targetHyp = await select({
    message: 'Select target hypothesis this experiment will test/discriminate:',
    choices: session.hypotheses.map(h => ({
      name: `${h.id}: ${h.statement}`,
      value: h.id
    }))
  });

  console.log(chalk.bold.yellow('\nChoose Parameterized Request Mutation:'));
  const mutationType = await select({
    message: 'What action will you execute against the specimen?',
    choices: [
      { name: '1. Cross-Origin Dispatch (Simulate request from untrusted origin https://attacker.local)', value: 'cross_origin' },
      { name: '2. Strip Origin and Referer Headers (Test if server requires provenance headers)', value: 'strip_origin' },
      { name: '3. Unauthenticated Request (Strip session cookie)', value: 'strip_cookie' },
      { name: '4. HTTP Method Switching (Change POST to GET)', value: 'method_get' },
      { name: '5. Custom Email Modification (Change email payload)', value: 'custom_email' },
      { name: '6. Custom Raw Mutation (Specify custom headers and body)', value: 'custom_full' }
    ]
  });

  let mutation = {};
  let actionDescription = '';

  if (mutationType === 'cross_origin') {
    mutation = {
      headers: { 'Origin': 'https://attacker.local', 'Referer': 'https://attacker.local/trap.html' },
      body: 'email=attacker_controlled@test.local'
    };
    actionDescription = 'Dispatch POST request with Origin: https://attacker.local and valid session cookie';
  } else if (mutationType === 'strip_origin') {
    mutation = {
      removeHeaders: ['Origin', 'Referer'],
      body: 'email=no_origin@test.local'
    };
    actionDescription = 'Dispatch POST request with Origin and Referer stripped';
  } else if (mutationType === 'strip_cookie') {
    mutation = {
      cookie: null,
      body: 'email=unauthenticated@test.local'
    };
    actionDescription = 'Dispatch POST request without Cookie header';
  } else if (mutationType === 'method_get') {
    mutation = {
      method: 'GET',
      url: 'https://app.local/api/profile/email?email=get_probe@test.local'
    };
    actionDescription = 'Dispatch GET request to state-changing endpoint';
  } else if (mutationType === 'custom_email') {
    const customEmail = await input({ message: 'Enter test email value:', default: 'probe@test.local' });
    mutation = { body: `email=${customEmail}` };
    actionDescription = `Dispatch POST request updating email to ${customEmail}`;
  } else if (mutationType === 'custom_full') {
    const method = await input({ message: 'HTTP Method:', default: 'POST' });
    const origin = await input({ message: 'Origin Header (leave empty to omit):', default: 'https://attacker.local' });
    const cookie = await input({ message: 'Cookie Header (leave empty for baseline session):', default: 'session_id=sess_user_9921' });
    const body = await input({ message: 'Request Body:', default: 'email=probe@test.local' });

    mutation = {
      method,
      headers: origin ? { 'Origin': origin } : {},
      cookie: cookie ? cookie : null,
      body
    };
    actionDescription = `Custom mutation (${method} request)`;
  }

  console.log(chalk.bold.cyan('\n[Falsification & Prediction Discipline]'));
  const predictionIfTrue = await input({ message: 'Prediction if target hypothesis is TRUE:' });
  const predictionIfFalse = await input({ message: 'Prediction if target hypothesis is FALSE:' });
  const whyInformative = await input({ message: 'Why is this experiment informative / discriminating?' });

  if (!predictionIfTrue.trim() || !predictionIfFalse.trim() || !whyInformative.trim()) {
    console.log(chalk.red('\nPredictions and rationale are mandatory before execution.\n'));
    return;
  }

  const exp = createExperiment(session, {
    target_hypothesis: targetHyp,
    action: { description: actionDescription, mutation },
    prediction_if_true: predictionIfTrue,
    prediction_if_false: predictionIfFalse,
    why_informative: whyInformative
  });

  console.log(chalk.bold.blue('\nExecuting experiment against deterministic specimen...\n'));
  const rawResult = specimen.execute(mutation);

  console.log(chalk.bold.white('=== RAW SPECIMEN OUTPUT ==='));
  console.log(rawResult.raw_transcript);
  console.log(chalk.bold.white('===========================\n'));

  // Record raw result
  const obsText = `Executed ${actionDescription}. Result: HTTP ${rawResult.response.status} ${rawResult.response.statusText}. State changed: ${rawResult.state_delta.state_mutated}. (Email: ${rawResult.state_delta.current_email})`;
  const obs = addObservation(session, {
    content: obsText,
    type: 'OBSERVATION',
    raw_data: rawResult
  });

  recordExperimentResult(session, exp.id, {
    raw_result: rawResult,
    observation_id: obs.id
  });

  const shouldLink = await confirm({ message: 'Link this observation directly to a hypothesis in the Evidence Ledger?', default: true });
  if (shouldLink) {
    const rel = await select({
      message: `Does this result support or refute hypothesis ${targetHyp}?`,
      choices: [
        { name: 'SUPPORTS (Evidence confirms or strengthens explanation)', value: 'SUPPORTS' },
        { name: 'REFUTES (Evidence contradicts explanation)', value: 'REFUTES' }
      ]
    });
    const rationale = await input({ message: 'Brief rationale:' });
    addEvidenceLink(session, {
      observation_id: obs.id,
      hypothesis_id: targetHyp,
      relationship: rel,
      rationale
    });
    console.log(chalk.green(`\n✔ Observation ${obs.id} linked as ${rel} to ${targetHyp}\n`));
  }
}

async function handleAddCausalNote() {
  console.log(chalk.dim('\nSynthesize the causal chain: connect external context -> request dispatch -> credentials -> server decision -> state effect.\n'));
  const component = await select({
    message: 'Select component in the chain:',
    choices: [
      { name: '1. Untrusted Origin / Attacker Context', value: 'untrusted_origin' },
      { name: '2. User-Agent / Browser Network Engine', value: 'user_agent_dispatch' },
      { name: '3. Ambient Credential Storage (Cookie Jar)', value: 'cookie_storage' },
      { name: '4. Server Authentication & Session Validator', value: 'server_auth_decision' },
      { name: '5. Application Business Logic & State Sink', value: 'application_state_sink' }
    ]
  });

  const role = await input({ message: `Describe ${component}'s role/behavior in the failure:` });
  const transition = await input({ message: 'Authority or data transition (optional):' });

  const note = addCausalNote(session, {
    component,
    role,
    transition
  });

  console.log(chalk.green(`\n✔ Added step ${note.step}: [${note.component}] ${note.role}\n`));
}

async function handleDefineCapability() {
  console.log(chalk.bold.yellow('\nCapability Modeling: Separate Primitive from Impact'));
  console.log(chalk.dim('First define the behavioral capability primitive (e.g. "ability to execute state-changing requests using ambient credentials from external origin").'));
  console.log(chalk.dim('Do NOT merely type a vulnerability label like "CSRF" or jump to downstream impact.\n'));

  const primitive = await input({
    message: 'Define Capability Primitive:',
    default: session.capability.primitive || ''
  });

  if (!primitive.trim()) return;

  setCapabilityPrimitive(session, primitive);
  console.log(chalk.green('\n✔ Primitive established. Impact field is now UNLOCKED.\n'));

  const shouldSetImpact = await confirm({ message: 'Would you like to specify the downstream business impact now?', default: true });
  if (shouldSetImpact) {
    const impact = await input({
      message: 'Define Downstream Impact (e.g. account takeover via email redirection):',
      default: session.capability.impact || ''
    });
    if (impact.trim()) {
      setCapabilityImpact(session, impact);
      console.log(chalk.green('\n✔ Impact recorded.\n'));
    }
  }
}

async function handleEvaluateSession() {
  console.log(chalk.blue('\nRunning Deterministic Evaluator (10 Rigorous Quality Checks)...\n'));
  const result = evaluateSession(session);

  console.log(chalk.bold.white('=== EVALUATION AUDIT REPORT ==='));
  for (const [checkId, check] of Object.entries(result.checks)) {
    if (check.passed) {
      console.log(`  ${chalk.green('✔')} [${chalk.bold(checkId)}] ${check.message}`);
    } else {
      console.log(`  ${chalk.red('✖')} [${chalk.bold(checkId)}] ${check.message}`);
    }
  }
  console.log(chalk.bold.white('===============================\n'));

  if (result.passed) {
    console.log(chalk.bold.green(`🎉 ${result.summary}\n`));
    const unlockNow = await confirm({ message: 'Would you like to unlock and view the Canonical Topic Reveal now?', default: true });
    if (unlockNow) {
      await handleReveal();
    }
  } else {
    console.log(chalk.bold.red(`⚠️  ${result.summary}\n`));
  }
}

async function handleReveal() {
  const revealResult = revealGate.unlock(session);
  if (!revealResult.allowed) {
    console.log(chalk.bold.red(`\n✖ ${revealResult.message}`));
    if (revealResult.reasons) {
      revealResult.reasons.forEach(r => console.log(chalk.red(`  - ${r}`)));
    }
    console.log('\n');
    return;
  }

  const { canonical, synthesis } = revealResult;

  console.log(chalk.bold.green('\n======================================================================'));
  console.log(chalk.bold.green('                     CANONICAL KNOWLEDGE REVEAL                       '));
  console.log(chalk.bold.green('======================================================================\n'));

  console.log(chalk.bold.yellow(`Canonical Topic: ${canonical.display_name} (${canonical.topic_id})`));
  console.log(chalk.cyan(`Mechanism Family: ${canonical.mechanism_family}`));
  console.log(chalk.white(`Status: ${canonical.status} | Category: ${canonical.category}\n`));

  console.log(chalk.bgRed.white(' 1. Security Invariant '));
  console.log(chalk.yellow(`Statement:`), canonical.invariant.statement);
  console.log(chalk.yellow(`Violation Condition:`), canonical.invariant.violation_condition);
  console.log(chalk.yellow(`Investigation Question:`), canonical.invariant.investigation_question);

  console.log(chalk.bgBlue.white('\n 2. Canonical Causal Mechanism '));
  canonical.causal_mechanism.steps.forEach(step => console.log(`  ${step}`));

  console.log(chalk.bgMagenta.white('\n 3. Exploitability Logic Gates '));
  canonical.exploitability.conditions.forEach((cond, idx) => {
    console.log(`  Gate ${idx + 1}: ${cond.condition}`);
    console.log(chalk.dim(`    Test: ${cond.how_to_test}`));
  });

  console.log(chalk.bgGreen.black('\n 4. Correspondence to Your Empirical Investigation '));
  synthesis.correspondence_mapping.forEach(m => {
    console.log(chalk.bold(`  Aspect: ${m.aspect}`));
    console.log(chalk.dim(`    What You Discovered: ${m.observed}`));
    if (m.canonical_concept) console.log(chalk.cyan(`    Canonical Concept: ${m.canonical_concept}`));
    if (m.canonical_explanation) console.log(`    Explanation: ${m.canonical_explanation}`);
    console.log('');
  });

  const viewDiag = await confirm({ message: 'Would you like to view the ASCII Architecture Diagrams?', default: true });
  if (viewDiag && canonical.diagrams) {
    for (const [name, content] of Object.entries(canonical.diagrams)) {
      console.log(chalk.bold.cyan(`\n--- [Diagram: ${name}] ---`));
      console.log(content);
    }
  }

  console.log('\n');
}

async function handleSwitchSpecimen() {
  const choice = await select({
    message: 'Select specimen to investigate:',
    choices: [
      { name: '1. Primary: Account Profile Email Update (specimen.profile_update_01)', value: 'primary' },
      { name: '2. Transfer: Event Webhook Registration API (specimen.api_webhook_02)', value: 'transfer' }
    ]
  });

  if (choice === 'primary') {
    specimen = new ProfileUpdateSpecimen();
  } else {
    specimen = new WebhookSubscriptionSpecimen();
  }

  session = createSession({
    specimenId: specimen.id,
    oracleTopicId: 'topic.csrf'
  });

  console.log(chalk.green(`\n✔ Switched active specimen to ${specimen.id}. New session initialized.\n`));
}

async function handleSaveSession() {
  const defaultPath = path.join(process.cwd(), 'scratch', `${session.session_id}.json`);
  const filePath = await input({ message: 'Enter file path to save session:', default: defaultPath });
  try {
    saveSession(session, filePath);
    console.log(chalk.green(`\n✔ Session successfully saved to ${filePath}\n`));
  } catch (err) {
    console.log(chalk.red(`\n✖ Error saving session: ${err.message}\n`));
  }
}

async function handleLoadSession() {
  const filePath = await input({ message: 'Enter file path to load session:' });
  try {
    session = loadSession(filePath);
    if (session.specimen_id === 'specimen.api_webhook_02') {
      specimen = new WebhookSubscriptionSpecimen();
    } else {
      specimen = new ProfileUpdateSpecimen();
    }
    console.log(chalk.green(`\n✔ Session ${session.session_id} successfully loaded!\n`));
  } catch (err) {
    console.log(chalk.red(`\n✖ Error loading session: ${err.message}\n`));
  }
}

export async function runInvestigation() {
  let exit = false;

  while (!exit) {
    printHeader();
    printPanels();

    const choice = await select({
      message: 'Choose Investigation Action:',
      choices: [
        { name: '🔍 1. View Baseline Specimen & Raw Request/Response', value: 'baseline' },
        { name: '📝 2. Record Observation / Note (Observation vs Inference)', value: 'obs' },
        { name: '💡 3. Formulate Competing Hypothesis', value: 'hyp' },
        { name: '🔄 4. Update Hypothesis Status (UNKNOWN -> SUPPORTED/REFUTED)', value: 'update_hyp' },
        { name: '🧪 5. Design & Execute Parameterized Experiment', value: 'experiment' },
        { name: '⛓️  6. Add Causal Account Step (External -> Transport -> Server -> State)', value: 'causal' },
        { name: '🎯 7. Define Capability (Primitive & Impact)', value: 'capability' },
        { name: '⚖️  8. Evaluate Investigation (Deterministic Gate)', value: 'evaluate' },
        { name: '🔓 9. View Canonical Reveal (Unlocked after evaluation)', value: 'reveal' },
        { name: '🔀 10. Switch Specimen (Primary vs Transfer)', value: 'switch_specimen' },
        { name: '💾 11. Save Session to File', value: 'save' },
        { name: '📂 12. Load Session from File', value: 'load' },
        { name: '🚪 13. Return to Main Menu', value: 'exit' }
      ]
    });

    switch (choice) {
      case 'baseline':
        await viewBaseline();
        break;
      case 'obs':
        await handleAddObservation();
        break;
      case 'hyp':
        await handleAddHypothesis();
        break;
      case 'update_hyp':
        await handleUpdateHypothesis();
        break;
      case 'experiment':
        await handleDesignExperiment();
        break;
      case 'causal':
        await handleAddCausalNote();
        break;
      case 'capability':
        await handleDefineCapability();
        break;
      case 'evaluate':
        await handleEvaluateSession();
        break;
      case 'reveal':
        await handleReveal();
        break;
      case 'switch_specimen':
        await handleSwitchSpecimen();
        break;
      case 'save':
        await handleSaveSession();
        break;
      case 'load':
        await handleLoadSession();
        break;
      case 'exit':
        exit = true;
        break;
    }

    if (!exit) {
      await input({ message: 'Press Enter to continue...' });
    }
  }
}

// Allow direct execution: node cli/investigate.js
if (process.argv[1] && process.argv[1].endsWith('investigate.js')) {
  runInvestigation().catch(err => {
    console.error(chalk.red('Fatal error:'), err);
    process.exit(1);
  });
}
