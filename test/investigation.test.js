import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import path from 'path';

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
  setCapabilityImpact
} from '../investigation/session.js';
import { ProfileUpdateSpecimen } from '../investigation/specimen.js';
import { WebhookSubscriptionSpecimen } from '../investigation/transfer.js';
import { evaluateSession } from '../investigation/evaluator.js';
import { RevealGate } from '../investigation/reveal.js';
import { ContentOracle } from '../investigation/oracle.js';

test('--- SESSION STATE & EVIDENCE LEDGER TESTS ---', async (t) => {
  await t.test('new session initializes correctly with default locked state', () => {
    const session = createSession();
    assert.ok(session.session_id.startsWith('sess_'));
    assert.equal(session.specimen_id, 'specimen.profile_update_01');
    assert.equal(session.oracle_topic_id, 'topic.csrf');
    assert.equal(session.reveal_state, 'LOCKED');
    assert.equal(session.capability.impact_locked, true);
    assert.equal(session.capability.primitive, null);
    assert.equal(session.capability.impact, null);
    assert.equal(session.observations.length, 0);
    assert.equal(session.hypotheses.length, 0);
    assert.equal(session.experiments.length, 0);
    assert.equal(session.evidence.length, 0);
    assert.equal(session.causal_notes.length, 0);
    assert.equal(session.evaluation.passed, false);
  });

  await t.test('observation can be added with explicit type distinction', () => {
    const session = createSession();
    const obs = addObservation(session, {
      content: 'POST /api/profile/email returned 200 OK',
      type: 'OBSERVATION',
      raw_data: { status: 200 }
    });
    assert.equal(obs.id, 'obs_1');
    assert.equal(obs.type, 'OBSERVATION');
    assert.equal(session.observations.length, 1);

    const inf = addObservation(session, {
      content: 'Server relies on ambient cookie for authority',
      type: 'INFERENCE'
    });
    assert.equal(inf.id, 'obs_2');
    assert.equal(inf.type, 'INFERENCE');
    assert.equal(session.observations.length, 2);

    assert.throws(() => {
      addObservation(session, { content: 'test', type: 'INVALID_TYPE' });
    });
  });

  await t.test('hypothesis can be added and status updated through state machine', () => {
    const session = createSession();
    const hyp = addHypothesis(session, 'Endpoint checks request origin');
    assert.equal(hyp.id, 'hyp_1');
    assert.equal(hyp.status, 'UNKNOWN');
    assert.equal(session.hypotheses.length, 1);

    updateHypothesisStatus(session, 'hyp_1', 'REFUTED', 'Cross-origin request succeeded');
    assert.equal(session.hypotheses[0].status, 'REFUTED');
    assert.equal(session.hypotheses[0].status_history.length, 2);

    assert.throws(() => {
      updateHypothesisStatus(session, 'hyp_1', 'NONEXISTENT_STATE');
    });
  });

  await t.test('experiment can be created with mandatory predictions', () => {
    const session = createSession();
    addHypothesis(session, 'Endpoint authenticates solely via cookie');

    const exp = createExperiment(session, {
      target_hypothesis: 'hyp_1',
      action: { method: 'POST', removeHeaders: ['Origin'] },
      prediction_if_true: 'State changes successfully',
      prediction_if_false: 'Request is rejected with 403',
      why_informative: 'Tests if Origin header is validated'
    });

    assert.equal(exp.id, 'exp_1');
    assert.equal(exp.executed, false);
    assert.equal(session.experiments.length, 1);

    // Missing predictions should throw
    assert.throws(() => {
      createExperiment(session, {
        target_hypothesis: 'hyp_1',
        action: {},
        prediction_if_true: '',
        prediction_if_false: '',
        why_informative: ''
      });
    });
  });

  await t.test('experiment result can be recorded and linked to evidence', () => {
    const session = createSession();
    addHypothesis(session, 'Endpoint authenticates solely via cookie');
    createExperiment(session, {
      target_hypothesis: 'hyp_1',
      action: { method: 'POST' },
      prediction_if_true: 'Success',
      prediction_if_false: 'Failure',
      why_informative: 'Test'
    });

    const obs = addObservation(session, { content: '200 OK email updated', type: 'OBSERVATION' });
    recordExperimentResult(session, 'exp_1', {
      raw_result: { status: 200 },
      observation_id: obs.id
    });

    assert.equal(session.experiments[0].executed, true);
    assert.equal(session.experiments[0].actual_observations[0], obs.id);

    const ev = addEvidenceLink(session, {
      observation_id: obs.id,
      hypothesis_id: 'hyp_1',
      relationship: 'SUPPORTS',
      rationale: 'Observed state change matched prediction'
    });

    assert.equal(ev.id, 'ev_1');
    assert.equal(ev.relationship, 'SUPPORTS');
    assert.equal(session.evidence.length, 1);
  });

  await t.test('capability primitive is strictly required before impact can be set', () => {
    const session = createSession();
    assert.equal(session.capability.impact_locked, true);

    // Cannot set impact while locked
    assert.throws(() => {
      setCapabilityImpact(session, 'Account Takeover');
    }, /Capability impact is locked/);

    // Set primitive
    setCapabilityPrimitive(session, 'Cross-origin state modification using ambient credentials');
    assert.equal(session.capability.impact_locked, false);

    // Now impact can be set
    setCapabilityImpact(session, 'Unauthorized account email modification leading to password reset hijacking');
    assert.equal(session.capability.impact, 'Unauthorized account email modification leading to password reset hijacking');
  });
});

test('--- SPECIMEN & PARAMETERIZED ENGINE TESTS ---', async (t) => {
  const specimen = new ProfileUpdateSpecimen();

  await t.test('authenticated baseline execution succeeds and alters state', () => {
    specimen.reset();
    const baseline = specimen.getBaseline();
    assert.equal(baseline.request.method, 'POST');
    assert.equal(baseline.request.url, 'https://app.local/api/profile/email');
    assert.ok(baseline.request.headers.Cookie.includes('session_id=sess_user_9921'));

    const res = specimen.execute({
      body: 'email=new_baseline@app.local'
    });

    assert.equal(res.response.status, 200);
    assert.equal(res.response.statusText, 'OK');
    assert.equal(res.state_delta.state_mutated, true);
    assert.equal(res.state_delta.current_email, 'new_baseline@app.local');
    assert.ok(res.raw_transcript.includes('HTTP/1.1 200 OK'));
    assert.ok(!res.raw_transcript.toLowerCase().includes('csrf'));
  });

  await t.test('unauthenticated request fails with 401 Unauthorized and leaves state unchanged', () => {
    specimen.reset();
    const initialEmail = specimen.getCurrentState().user.email;

    const res = specimen.execute({
      cookie: null, // strip cookie
      body: 'email=hacker@evil.local'
    });

    assert.equal(res.response.status, 401);
    assert.equal(res.response.statusText, 'Unauthorized');
    assert.equal(res.state_delta.state_mutated, false);
    assert.equal(specimen.getCurrentState().user.email, initialEmail);
  });

  await t.test('cross-origin request with untrusted Origin header succeeds due to missing origin verification', () => {
    specimen.reset();
    const res = specimen.execute({
      headers: {
        'Origin': 'https://untrusted-attacker.local',
        'Referer': 'https://untrusted-attacker.local/payload.html'
      },
      body: 'email=hijacked@attacker.local'
    });

    assert.equal(res.response.status, 200);
    assert.equal(res.state_delta.state_mutated, true);
    assert.equal(res.state_delta.current_email, 'hijacked@attacker.local');
  });

  await t.test('request with Origin and Referer completely stripped succeeds', () => {
    specimen.reset();
    const res = specimen.execute({
      removeHeaders: ['Origin', 'Referer'],
      body: 'email=stripped_headers@test.local'
    });

    assert.equal(res.response.status, 200);
    assert.equal(res.state_delta.state_mutated, true);
    assert.equal(res.state_delta.current_email, 'stripped_headers@test.local');
  });

  await t.test('mutated HTTP method (GET) returns 405 Method Not Allowed without mutating state', () => {
    specimen.reset();
    const initialEmail = specimen.getCurrentState().user.email;

    const res = specimen.execute({
      method: 'GET',
      url: 'https://app.local/api/profile/email?email=should_not_apply@test.local'
    });

    assert.equal(res.response.status, 405);
    assert.equal(res.response.statusText, 'Method Not Allowed');
    assert.equal(res.state_delta.state_mutated, false);
    assert.equal(specimen.getCurrentState().user.email, initialEmail);
  });

  await t.test('invalid body without valid email returns 400 Bad Request', () => {
    specimen.reset();
    const initialEmail = specimen.getCurrentState().user.email;

    const res = specimen.execute({
      body: 'malformed_payload'
    });

    assert.equal(res.response.status, 400);
    assert.equal(res.response.statusText, 'Bad Request');
    assert.equal(res.state_delta.state_mutated, false);
    assert.equal(specimen.getCurrentState().user.email, initialEmail);
  });
});

test('--- TRANSFER SPECIMEN TESTS (Phase H) ---', async (t) => {
  const transferSpecimen = new WebhookSubscriptionSpecimen();

  await t.test('transfer specimen baseline creates webhook registration', () => {
    transferSpecimen.reset();
    const baseline = transferSpecimen.getBaseline();
    assert.equal(baseline.request.url, 'https://app.local/api/integrations/webhook');

    const res = transferSpecimen.execute();
    assert.equal(res.response.status, 201);
    assert.equal(res.state_delta.state_mutated, true);
    assert.equal(transferSpecimen.getCurrentState().webhooks_count, 1);
  });

  await t.test('transfer specimen rejects unauthenticated request', () => {
    transferSpecimen.reset();
    const res = transferSpecimen.execute({ cookie: null });
    assert.equal(res.response.status, 401);
    assert.equal(res.state_delta.state_mutated, false);
    assert.equal(transferSpecimen.getCurrentState().webhooks_count, 0);
  });

  await t.test('transfer specimen executes state change across origin boundary without origin check', () => {
    transferSpecimen.reset();
    const res = transferSpecimen.execute({
      headers: { 'Origin': 'https://evil-analytics.local' },
      body: { target_url: 'https://evil-analytics.local/collect', event_types: ['all'] }
    });

    assert.equal(res.response.status, 201);
    assert.equal(res.state_delta.state_mutated, true);
    assert.equal(transferSpecimen.getCurrentState().webhooks_count, 1);
  });
});

test('--- DETERMINISTIC EVALUATION & REVEAL GATE TESTS ---', async (t) => {
  const oracle = new ContentOracle();
  const revealGate = new RevealGate(oracle);

  await t.test('empty session fails evaluation', () => {
    const session = createSession();
    const evalResult = evaluateSession(session);
    assert.equal(evalResult.passed, false);
    assert.ok(evalResult.failures.length >= 5);

    // Reveal gate must be locked
    const revealResult = revealGate.unlock(session);
    assert.equal(revealResult.allowed, false);
    assert.equal(revealResult.reveal_state, 'LOCKED');
  });

  await t.test('single hypothesis fails evaluation (minimum 2 required)', () => {
    const session = createSession();
    addHypothesis(session, 'Endpoint does not check origin headers');
    const evalResult = evaluateSession(session);
    assert.equal(evalResult.checks.CHECK_HYPOTHESIS_COUNT.passed, false);
    assert.equal(evalResult.passed, false);
  });

  await t.test('two hypotheses but no experiment fails evaluation', () => {
    const session = createSession();
    addHypothesis(session, 'Endpoint authenticates solely via ambient session cookie');
    addHypothesis(session, 'Endpoint enforces custom secondary anti-CSRF token');
    const evalResult = evaluateSession(session);
    assert.equal(evalResult.checks.CHECK_HYPOTHESIS_COUNT.passed, true);
    assert.equal(evalResult.checks.CHECK_EXPERIMENT_EXECUTED.passed, false);
    assert.equal(evalResult.passed, false);
  });

  await t.test('experiment without prediction fails evaluation', () => {
    const session = createSession();
    addHypothesis(session, 'Endpoint authenticates solely via ambient session cookie');
    addHypothesis(session, 'Endpoint enforces custom secondary anti-CSRF token');
    const exp = createExperiment(session, {
      target_hypothesis: 'hyp_1',
      action: { method: 'POST' },
      prediction_if_true: 'valid prediction',
      prediction_if_false: 'valid prediction',
      why_informative: 'informative'
    });
    // Manually blank prediction
    exp.prediction_if_true = '';
    exp.executed = true;

    const evalResult = evaluateSession(session);
    assert.equal(evalResult.checks.CHECK_EXPERIMENT_PREDICTION.passed, false);
  });

  await t.test('premature capability naming vulnerability alone fails evaluation', () => {
    const session = createSession();
    addHypothesis(session, 'Endpoint authenticates solely via ambient session cookie');
    addHypothesis(session, 'Endpoint enforces custom secondary anti-CSRF token');
    createExperiment(session, {
      target_hypothesis: 'hyp_1',
      action: { method: 'POST' },
      prediction_if_true: '200 OK',
      prediction_if_false: '403 Forbidden',
      why_informative: 'Discloses origin requirement'
    });
    const obs = addObservation(session, { content: '200 OK email changed', type: 'OBSERVATION' });
    recordExperimentResult(session, 'exp_1', { raw_result: { status: 200 }, observation_id: obs.id });
    addEvidenceLink(session, { observation_id: obs.id, hypothesis_id: 'hyp_1', relationship: 'SUPPORTS' });
    updateHypothesisStatus(session, 'hyp_1', 'SUPPORTED');

    // Anti-pattern: merely names the bug
    setCapabilityPrimitive(session, 'csrf');

    const evalResult = evaluateSession(session);
    assert.equal(evalResult.checks.CHECK_CAPABILITY_PRIMITIVE.passed, false);
    assert.ok(evalResult.checks.CHECK_CAPABILITY_PRIMITIVE.message.includes('not merely the vulnerability name'));
  });

  await t.test('complete, disciplined investigation passes evaluation and unlocks canonical reveal', () => {
    const session = createSession();
    const specimen = new ProfileUpdateSpecimen();

    // 1. Hypotheses (2 competing explanations)
    const h1 = addHypothesis(session, 'Server accepts state-changing requests relying solely on ambient session cookie without origin validation');
    const h2 = addHypothesis(session, 'Server requires explicit request provenance or custom anti-forgery intent token');

    // 2. Experiment with predictions
    const exp = createExperiment(session, {
      target_hypothesis: h1.id,
      action: {
        description: 'Send cross-origin POST request with untrusted Origin header',
        mutation: { headers: { 'Origin': 'https://attacker.local' }, body: 'email=probe@attacker.local' }
      },
      prediction_if_true: 'Request succeeds with 200 OK and email is updated despite external origin',
      prediction_if_false: 'Request is rejected with 403 Forbidden or 400 Bad Request',
      why_informative: 'Differentiates whether endpoint enforces origin isolation'
    });

    // 3. Execute experiment against specimen
    const rawResult = specimen.execute(exp.action.mutation);
    assert.equal(rawResult.response.status, 200);

    // 4. Record observation (Observation != Inference)
    const obs = addObservation(session, {
      content: 'Dispatched cross-origin POST request with Origin: https://attacker.local. Server returned 200 OK and user email updated to probe@attacker.local.',
      type: 'OBSERVATION',
      raw_data: rawResult
    });

    recordExperimentResult(session, exp.id, {
      raw_result: rawResult,
      observation_id: obs.id
    });

    // 5. Link evidence
    addEvidenceLink(session, {
      observation_id: obs.id,
      hypothesis_id: h1.id,
      relationship: 'SUPPORTS',
      rationale: 'Observed that cross-origin request succeeded identically to intra-origin request'
    });
    addEvidenceLink(session, {
      observation_id: obs.id,
      hypothesis_id: h2.id,
      relationship: 'REFUTES',
      rationale: 'No token or origin restriction blocked the request'
    });

    // 6. Update hypothesis status
    updateHypothesisStatus(session, h1.id, 'SUPPORTED', 'Supported by empirical test showing external origin was accepted');
    updateHypothesisStatus(session, h2.id, 'REFUTED', 'Refuted because no secondary token was checked');

    // 7. Causal notes
    addCausalNote(session, { step: 1, component: 'untrusted_origin', role: 'Attacker web page induces user agent to issue state-changing POST' });
    addCausalNote(session, { step: 2, component: 'user_agent_dispatch', role: 'Browser automatically attaches ambient session cookie matching domain' });
    addCausalNote(session, { step: 3, component: 'server_auth_decision', role: 'Server validates session cookie, ignores lack of origin intent verification' });
    addCausalNote(session, { step: 4, component: 'application_state_sink', role: 'Profile email state is mutated without user initiation' });

    // 8. Capability primitive (behavioral, not a label)
    setCapabilityPrimitive(session, 'Induce unauthorized state mutations on authenticated profile via ambient credential transmission');
    setCapabilityImpact(session, 'Account takeover through password reset redirection to attacker-controlled email address');

    // 9. Evaluate
    const evalResult = evaluateSession(session);
    assert.equal(evalResult.passed, true);
    assert.equal(evalResult.failures.length, 0);

    // 10. Reveal Gate
    const revealResult = revealGate.unlock(session);
    assert.equal(revealResult.allowed, true);
    assert.equal(revealResult.reveal_state, 'UNLOCKED');
    assert.equal(revealResult.canonical.topic_id, 'topic.csrf');
    assert.equal(revealResult.canonical.display_name, 'Cross-Site Request Forgery (CSRF)');
    assert.ok(revealResult.canonical.invariant.statement.length > 20);
    assert.ok(revealResult.synthesis.correspondence_mapping.length >= 3);
    assert.ok(Object.keys(revealResult.canonical.diagrams).length >= 5);
  });
});

test('--- CANONICAL CONTENT PIPELINE REGRESSION TEST ---', () => {
  const result = spawnSync('node', [path.resolve(process.cwd(), 'pipeline/validate.js')], {
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, `Validation pipeline failed with status ${result.status}:\n${result.stderr}`);
  assert.ok(result.stdout.includes('ALL FOUR QUALITY GATES PASSED'));
});
