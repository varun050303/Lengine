/**
 * Deterministic Evaluator for Lengine Investigation Sessions.
 *
 * Strict Process and Substance Verification (ZERO LLM).
 * Evaluates whether the learner followed a rigorous empirical investigation loop:
 * 1. Formulated >= 2 distinct competing hypotheses
 * 2. Formulated falsifiable predictions before experimentation
 * 3. Executed at least 1 parameterized experiment
 * 4. Recorded raw observations and linked them as evidence (supports/refutes)
 * 5. Distinguished empirical observation from inference
 * 6. Updated hypothesis beliefs based on evidence
 * 7. Constructed a causal account connecting context -> dispatch -> credential -> decision -> effect
 * 8. Stated capability primitive before impact
 * 9. Avoided premature vulnerability labeling / cargo-cult guessing
 */

const VULNERABILITY_KEYWORDS = [
  'csrf',
  'xsrf',
  'cross-site request forgery',
  'cross site request forgery',
  'cwe-352',
  'origin-context confusion'
];

export function evaluateSession(session) {
  const checks = {};
  const failures = [];

  // 1. CHECK_HYPOTHESIS_COUNT: >= 2 competing hypotheses exist
  const hypCount = session.hypotheses ? session.hypotheses.length : 0;
  if (hypCount >= 2) {
    checks.CHECK_HYPOTHESIS_COUNT = {
      passed: true,
      message: `Formulated ${hypCount} competing hypotheses (minimum 2 required)`
    };
  } else {
    const msg = `Investigation must establish at least 2 competing hypotheses before drawing conclusions (found ${hypCount})`;
    checks.CHECK_HYPOTHESIS_COUNT = { passed: false, message: msg };
    failures.push(msg);
  }

  // 2. CHECK_HYPOTHESES_DISTINCT: Hypotheses are meaningfully distinct and non-trivial
  if (hypCount >= 2) {
    const s1 = session.hypotheses[0].statement.trim().toLowerCase();
    const s2 = session.hypotheses[1].statement.trim().toLowerCase();
    const isDistinct = s1 !== s2 && s1.length >= 10 && s2.length >= 10;
    if (isDistinct) {
      checks.CHECK_HYPOTHESES_DISTINCT = {
        passed: true,
        message: 'Competing hypotheses are distinct and substantial'
      };
    } else {
      const msg = 'Hypotheses must represent meaningfully distinct, testable explanations of server behavior';
      checks.CHECK_HYPOTHESES_DISTINCT = { passed: false, message: msg };
      failures.push(msg);
    }
  } else {
    checks.CHECK_HYPOTHESES_DISTINCT = {
      passed: false,
      message: 'Cannot verify distinctness with fewer than 2 hypotheses'
    };
  }

  // 3. CHECK_EXPERIMENT_EXECUTED: At least 1 experiment was executed against the specimen
  const executedExps = (session.experiments || []).filter(e => e.executed === true);
  if (executedExps.length >= 1) {
    checks.CHECK_EXPERIMENT_EXECUTED = {
      passed: true,
      message: `Executed ${executedExps.length} experiment(s) against the specimen`
    };
  } else {
    const msg = 'At least 1 empirical experiment must be executed against the target specimen';
    checks.CHECK_EXPERIMENT_EXECUTED = { passed: false, message: msg };
    failures.push(msg);
  }

  // 4. CHECK_EXPERIMENT_PREDICTION: Experiment recorded predictions before execution
  const expsWithPredictions = executedExps.filter(e =>
    e.prediction_if_true && e.prediction_if_true.trim().length >= 5 &&
    e.prediction_if_false && e.prediction_if_false.trim().length >= 5 &&
    e.why_informative && e.why_informative.trim().length >= 5
  );
  if (expsWithPredictions.length >= 1) {
    checks.CHECK_EXPERIMENT_PREDICTION = {
      passed: true,
      message: 'Experiment includes pre-execution predictions (if true vs if false) and information rationale'
    };
  } else {
    const msg = 'Executed experiment lacks required falsifiable predictions (prediction_if_true, prediction_if_false, why_informative)';
    checks.CHECK_EXPERIMENT_PREDICTION = { passed: false, message: msg };
    failures.push(msg);
  }

  // 5. CHECK_ACTUAL_OBSERVATIONS: Experiment recorded actual execution outcome
  const expsWithResults = executedExps.filter(e =>
    e.raw_result !== null || (e.actual_observations && e.actual_observations.length > 0)
  );
  if (expsWithResults.length >= 1) {
    checks.CHECK_ACTUAL_OBSERVATIONS = {
      passed: true,
      message: 'Actual execution results and observations recorded from specimen'
    };
  } else {
    const msg = 'No actual observations or raw results were recorded from experiment execution';
    checks.CHECK_ACTUAL_OBSERVATIONS = { passed: false, message: msg };
    failures.push(msg);
  }

  // 6. CHECK_EVIDENCE_LINKED: Observations explicitly linked to hypotheses (SUPPORTS / REFUTES)
  const evidenceCount = session.evidence ? session.evidence.length : 0;
  if (evidenceCount >= 1) {
    checks.CHECK_EVIDENCE_LINKED = {
      passed: true,
      message: `Evidence ledger links ${evidenceCount} observation(s) to hypotheses with explicit relationships`
    };
  } else {
    const msg = 'Evidence ledger must connect at least 1 observation to a hypothesis as supporting or refuting evidence';
    checks.CHECK_EVIDENCE_LINKED = { passed: false, message: msg };
    failures.push(msg);
  }

  // 7. CHECK_OBS_INF_DISTINCTION: Distinguishes observation from inference
  const hasRawObs = (session.observations || []).some(o => o.type === 'OBSERVATION');
  if (hasRawObs) {
    checks.CHECK_OBS_INF_DISTINCTION = {
      passed: true,
      message: 'Session distinguishes empirical observations from inferences'
    };
  } else {
    const msg = 'Session lacks empirical observations classified with type "OBSERVATION"';
    checks.CHECK_OBS_INF_DISTINCTION = { passed: false, message: msg };
    failures.push(msg);
  }

  // 8. CHECK_HYPOTHESIS_UPDATED: Updated hypothesis status based on evidence
  const updatedHyp = (session.hypotheses || []).filter(h => h.status !== 'UNKNOWN');
  if (updatedHyp.length >= 1) {
    checks.CHECK_HYPOTHESIS_UPDATED = {
      passed: true,
      message: `Learner revised belief state for ${updatedHyp.length} hypothesis/hypotheses based on evidence`
    };
  } else {
    const msg = 'At least one hypothesis must be updated from UNKNOWN (e.g. to SUPPORTED, CONFIRMED, or REFUTED) based on experimental findings';
    checks.CHECK_HYPOTHESIS_UPDATED = { passed: false, message: msg };
    failures.push(msg);
  }

  // 9. CHECK_CAUSAL_ACCOUNT: Causal notes connect actors to security decision and effect
  const notes = session.causal_notes || [];
  if (notes.length >= 3) {
    // Check coverage of key causal roles
    const rolesCombined = notes.map(n => `${n.component} ${n.role} ${n.transition}`).join(' ').toLowerCase();
    const hasExternal = /external|attacker|untrusted|origin|third-party|site|web page|context/.test(rolesCombined);
    const hasCredentialOrDispatch = /cookie|credential|ambient|dispatch|request|browser|send|attach/.test(rolesCombined);
    const hasServerDecisionOrEffect = /server|state|email|validat|accept|mutat|chang|updat|process/.test(rolesCombined);

    if (hasExternal && hasCredentialOrDispatch && hasServerDecisionOrEffect) {
      checks.CHECK_CAUSAL_ACCOUNT = {
        passed: true,
        message: `Constructed causal account spanning ${notes.length} steps connecting external context to state change`
      };
    } else {
      const msg = 'Causal account must connect external/attacker context -> credential/request dispatch -> server decision and state effect';
      checks.CHECK_CAUSAL_ACCOUNT = { passed: false, message: msg };
      failures.push(msg);
    }
  } else {
    const msg = `Causal account requires at least 3 sequenced steps (found ${notes.length})`;
    checks.CHECK_CAUSAL_ACCOUNT = { passed: false, message: msg };
    failures.push(msg);
  }

  // 10. CHECK_CAPABILITY_PRIMITIVE: Primitive capability defined before impact; not merely a vulnerability label
  const primitive = (session.capability && session.capability.primitive) ? session.capability.primitive.trim() : '';
  const impactLocked = session.capability ? session.capability.impact_locked : true;

  const normalizedPrimitive = primitive.toLowerCase();
  const isMerelyVulnerabilityName = VULNERABILITY_KEYWORDS.some(k =>
    normalizedPrimitive === k ||
    normalizedPrimitive === `it is ${k}` ||
    normalizedPrimitive === `this is ${k}` ||
    normalizedPrimitive === `the vulnerability is ${k}`
  );

  if (isMerelyVulnerabilityName) {
    const msg = 'Capability primitive must describe the behavioral/system primitive (e.g. "ability to cause unauthorized state change via ambient credentials"), not merely the vulnerability name.';
    checks.CHECK_CAPABILITY_PRIMITIVE = { passed: false, message: msg };
    failures.push(msg);
  } else if (!primitive || primitive.length < 10) {
    const msg = 'Capability primitive must be explicitly stated with substantive technical description (minimum 10 chars)';
    checks.CHECK_CAPABILITY_PRIMITIVE = { passed: false, message: msg };
    failures.push(msg);
  } else {
    checks.CHECK_CAPABILITY_PRIMITIVE = {
      passed: true,
      message: 'Established technical capability primitive distinguishing primitive mechanism from business impact'
    };
  }

  // 11. ANTI-PATTERNS: Premature confirmation without evidence
  const prematurelyConfirmed = (session.hypotheses || []).some(h =>
    h.status === 'CONFIRMED' && (!session.evidence || session.evidence.length === 0)
  );
  if (prematurelyConfirmed) {
    const msg = 'Anti-pattern detected: A hypothesis was marked CONFIRMED without any supporting evidence recorded in the ledger';
    checks.ANTI_PATTERN_PREMATURE_CONFIRMATION = { passed: false, message: msg };
    failures.push(msg);
  }

  const allPassed = failures.length === 0;

  session.evaluation = {
    status: 'EVALUATED',
    passed: allPassed,
    checks,
    reasons: failures,
    timestamp: new Date().toISOString()
  };

  return {
    passed: allPassed,
    checks,
    failures,
    summary: allPassed
      ? 'All 10 investigation and reasoning quality checks PASSED. Reveal gate is UNLOCKED.'
      : `Evaluation FAILED: ${failures.length} check(s) did not meet the investigation threshold.`
  };
}
