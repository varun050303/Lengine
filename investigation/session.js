import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Valid hypothesis evaluation states.
 */
export const HYPOTHESIS_STATES = [
  'UNKNOWN',
  'SUPPORTED',
  'CONFIRMED',
  'REFUTED',
  'NOT_APPLICABLE'
];

/**
 * Valid evidence link relationships.
 */
export const EVIDENCE_RELATIONSHIPS = [
  'SUPPORTS',
  'REFUTES'
];

/**
 * Valid observation types (enforcing Observation != Inference).
 */
export const OBSERVATION_TYPES = [
  'OBSERVATION',
  'INFERENCE'
];

/**
 * Create a new learner-owned session.
 * Completely decoupled from canonical topic content.
 */
export function createSession({
  specimenId = 'specimen.profile_update_01',
  oracleTopicId = 'topic.csrf',
  sessionId = null
} = {}) {
  const id = sessionId || `sess_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  return {
    session_id: id,
    specimen_id: specimenId,
    oracle_topic_id: oracleTopicId,
    reveal_state: 'LOCKED', // LOCKED | UNLOCKED
    created_at: now,
    updated_at: now,
    observations: [],
    hypotheses: [],
    experiments: [],
    evidence: [],
    causal_notes: [],
    capability: {
      primitive: null,
      impact: null,
      impact_locked: true
    },
    evaluation: {
      status: 'PENDING', // PENDING | EVALUATED
      passed: false,
      checks: {},
      reasons: [],
      timestamp: null
    }
  };
}

/**
 * Add an empirical observation or inference note.
 * Explicitly tracks type: 'OBSERVATION' vs 'INFERENCE'.
 */
export function addObservation(session, { content, type = 'OBSERVATION', raw_data = null }) {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Observation content must be a non-empty string');
  }

  const normalizedType = type.toUpperCase();
  if (!OBSERVATION_TYPES.includes(normalizedType)) {
    throw new Error(`Invalid observation type "${type}". Must be one of: ${OBSERVATION_TYPES.join(', ')}`);
  }

  const id = `obs_${session.observations.length + 1}`;
  const observation = {
    id,
    type: normalizedType,
    content: content.trim(),
    raw_data: raw_data || null,
    created_at: new Date().toISOString()
  };

  session.observations.push(observation);
  session.updated_at = new Date().toISOString();
  return observation;
}

/**
 * Add a competing hypothesis.
 * Starts in UNKNOWN state.
 */
export function addHypothesis(session, statement) {
  if (!statement || typeof statement !== 'string' || statement.trim().length === 0) {
    throw new Error('Hypothesis statement must be a non-empty string');
  }

  const id = `hyp_${session.hypotheses.length + 1}`;
  const hypothesis = {
    id,
    statement: statement.trim(),
    status: 'UNKNOWN',
    status_history: [
      {
        status: 'UNKNOWN',
        timestamp: new Date().toISOString(),
        rationale: 'Initial hypothesis formulation'
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  session.hypotheses.push(hypothesis);
  session.updated_at = new Date().toISOString();
  return hypothesis;
}

/**
 * Update the status of a hypothesis based on investigation findings.
 */
export function updateHypothesisStatus(session, hypothesisId, newStatus, rationale = '') {
  const hyp = session.hypotheses.find(h => h.id === hypothesisId);
  if (!hyp) {
    throw new Error(`Hypothesis "${hypothesisId}" not found in session`);
  }

  const normalizedStatus = newStatus.toUpperCase();
  if (!HYPOTHESIS_STATES.includes(normalizedStatus)) {
    throw new Error(`Invalid status "${newStatus}". Must be one of: ${HYPOTHESIS_STATES.join(', ')}`);
  }

  hyp.status = normalizedStatus;
  hyp.updated_at = new Date().toISOString();
  hyp.status_history.push({
    status: normalizedStatus,
    timestamp: new Date().toISOString(),
    rationale: rationale ? rationale.trim() : 'Learner updated status'
  });

  session.updated_at = new Date().toISOString();
  return hyp;
}

/**
 * Create an experiment with pre-execution predictions.
 */
export function createExperiment(session, {
  target_hypothesis,
  action,
  prediction_if_true,
  prediction_if_false,
  why_informative
}) {
  if (!target_hypothesis) {
    throw new Error('Target hypothesis ID is required for an experiment');
  }
  const hypExists = session.hypotheses.some(h => h.id === target_hypothesis);
  if (!hypExists) {
    throw new Error(`Target hypothesis "${target_hypothesis}" does not exist in session`);
  }

  if (!prediction_if_true || !prediction_if_false || !why_informative) {
    throw new Error('Experiments must define prediction_if_true, prediction_if_false, and why_informative');
  }

  const id = `exp_${session.experiments.length + 1}`;
  const experiment = {
    id,
    target_hypothesis,
    action: action || {},
    prediction_if_true: prediction_if_true.trim(),
    prediction_if_false: prediction_if_false.trim(),
    why_informative: why_informative.trim(),
    executed: false,
    executed_at: null,
    actual_observations: [],
    raw_result: null,
    evidence_links: []
  };

  session.experiments.push(experiment);
  session.updated_at = new Date().toISOString();
  return experiment;
}

/**
 * Record actual execution outcome for an experiment.
 */
export function recordExperimentResult(session, experimentId, { raw_result, observation_id = null }) {
  const exp = session.experiments.find(e => e.id === experimentId);
  if (!exp) {
    throw new Error(`Experiment "${experimentId}" not found in session`);
  }

  exp.executed = true;
  exp.executed_at = new Date().toISOString();
  exp.raw_result = raw_result;

  if (observation_id) {
    if (!exp.actual_observations.includes(observation_id)) {
      exp.actual_observations.push(observation_id);
    }
  }

  session.updated_at = new Date().toISOString();
  return exp;
}

/**
 * Explicitly link an observation to a hypothesis as evidence.
 */
export function addEvidenceLink(session, {
  observation_id,
  hypothesis_id,
  relationship,
  rationale = ''
}) {
  const obsExists = session.observations.some(o => o.id === observation_id);
  if (!obsExists) {
    throw new Error(`Observation "${observation_id}" not found`);
  }

  const hypExists = session.hypotheses.some(h => h.id === hypothesis_id);
  if (!hypExists) {
    throw new Error(`Hypothesis "${hypothesis_id}" not found`);
  }

  const normalizedRel = relationship.toUpperCase();
  if (!EVIDENCE_RELATIONSHIPS.includes(normalizedRel)) {
    throw new Error(`Invalid relationship "${relationship}". Must be one of: ${EVIDENCE_RELATIONSHIPS.join(', ')}`);
  }

  const id = `ev_${session.evidence.length + 1}`;
  const evidenceItem = {
    id,
    observation_id,
    hypothesis_id,
    relationship: normalizedRel,
    rationale: rationale ? rationale.trim() : '',
    created_at: new Date().toISOString()
  };

  session.evidence.push(evidenceItem);

  // Cross-reference in experiment if observation belongs to one
  for (const exp of session.experiments) {
    if (exp.actual_observations.includes(observation_id)) {
      exp.evidence_links.push({
        evidence_id: id,
        observation_id,
        hypothesis_id,
        relationship: normalizedRel
      });
    }
  }

  session.updated_at = new Date().toISOString();
  return evidenceItem;
}

/**
 * Add a step/note to the causal account.
 * Connects external context -> request dispatch -> authority/credential -> server decision -> state effect.
 */
export function addCausalNote(session, { step, component, role, transition = '' }) {
  if (!component || !role) {
    throw new Error('Causal notes must specify component and role');
  }

  const note = {
    id: `causal_${session.causal_notes.length + 1}`,
    step: typeof step === 'number' ? step : session.causal_notes.length + 1,
    component: component.trim(),
    role: role.trim(),
    transition: transition ? transition.trim() : '',
    created_at: new Date().toISOString()
  };

  session.causal_notes.push(note);
  session.causal_notes.sort((a, b) => a.step - b.step);
  session.updated_at = new Date().toISOString();
  return note;
}

/**
 * Set the capability primitive.
 * Unlocks the impact field once primitive is established.
 */
export function setCapabilityPrimitive(session, primitive) {
  if (!primitive || typeof primitive !== 'string' || primitive.trim().length === 0) {
    throw new Error('Capability primitive must be a non-empty string');
  }

  session.capability.primitive = primitive.trim();
  session.capability.impact_locked = false; // Primitive established -> unlock impact
  session.updated_at = new Date().toISOString();
  return session.capability;
}

/**
 * Set the capability impact.
 * Requires primitive to be established first.
 */
export function setCapabilityImpact(session, impact) {
  if (session.capability.impact_locked || !session.capability.primitive) {
    throw new Error('Capability impact is locked! You must first establish the primitive capability.');
  }

  if (!impact || typeof impact !== 'string' || impact.trim().length === 0) {
    throw new Error('Capability impact must be a non-empty string');
  }

  session.capability.impact = impact.trim();
  session.updated_at = new Date().toISOString();
  return session.capability;
}

/**
 * Save session to a JSON file.
 */
export function saveSession(session, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
}

/**
 * Load session from a JSON file.
 */
export function loadSession(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Session file not found: ${filePath}`);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data;
}
