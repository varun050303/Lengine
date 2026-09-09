import { ContentOracle } from './oracle.js';

/**
 * Reveal Gate Controller.
 * Enforces the strict boundary between learner investigation and canonical interpretation.
 *
 * Before reveal:
 * - reveal_state = LOCKED
 * - Canonical topic, CWE, invariant wording, defenses, and diagrams are inaccessible.
 *
 * After passing evaluation:
 * - reveal_state = UNLOCKED
 * - Maps learner's discovered model to the canonical oracle.
 */
export class RevealGate {
  constructor(oracle = null) {
    this.oracle = oracle || new ContentOracle();
  }

  /**
   * Attempt to unlock and retrieve the canonical reveal.
   */
  unlock(session) {
    if (!session.evaluation || session.evaluation.passed !== true) {
      return {
        allowed: false,
        reveal_state: 'LOCKED',
        message: 'Reveal gate is LOCKED. The session must pass the deterministic evaluation threshold before canonical material is revealed.',
        reasons: session.evaluation ? session.evaluation.reasons : ['Session has not been evaluated.']
      };
    }

    session.reveal_state = 'UNLOCKED';
    session.updated_at = new Date().toISOString();

    const topicSlug = session.oracle_topic_id || 'topic.csrf';
    const canonical = this.oracle.getTopicOracle(topicSlug);

    const synthesis = this.generateCorrespondenceSynthesis(session, canonical);

    return {
      allowed: true,
      reveal_state: 'UNLOCKED',
      canonical,
      synthesis
    };
  }

  /**
   * Synthesize correspondence between learner's empirical investigation
   * and the canonical vulnerability model.
   */
  generateCorrespondenceSynthesis(session, canonical) {
    const learnerHypotheses = (session.hypotheses || []).map(h => `- [${h.status}] ${h.statement}`).join('\n');
    const learnerExperiments = (session.experiments || []).map(e => `- ${e.action.description || 'Mutated request'}: Actual result -> ${e.raw_result ? (e.raw_result.response.status + ' ' + e.raw_result.response.statusText) : 'Executed'}`).join('\n');
    const learnerCausal = (session.causal_notes || []).map(c => `${c.step}. ${c.component}: ${c.role}`).join('\n');
    const learnerPrimitive = session.capability ? session.capability.primitive : 'Not defined';

    return {
      title: 'Investigation vs. Canonical Correspondence',
      learner_findings: {
        hypotheses: learnerHypotheses,
        experiments: learnerExperiments,
        causal_account: learnerCausal,
        capability_primitive: learnerPrimitive
      },
      correspondence_mapping: [
        {
          aspect: 'Authority Transmission',
          observed: 'Target endpoint accepted request with session cookie regardless of Origin or Referer.',
          canonical_concept: 'concept.ambient-credentials',
          canonical_explanation: 'Browsers automatically attach ambient credentials to destination-matching requests regardless of originating context.'
        },
        {
          aspect: 'Origin Verification Sink',
          observed: 'No secondary request token, anti-forgery nonce, or origin check was required by the server.',
          canonical_mechanism: canonical.mechanism_family,
          canonical_explanation: 'The server conflated identity (who owns the session) with intent (what context originated the request), resulting in Origin-Context Confusion.'
        },
        {
          aspect: 'Causal Execution',
          observed: session.causal_notes.map(n => n.role).join(' -> '),
          canonical_causal_steps: canonical.causal_mechanism.steps
        },
        {
          aspect: 'Canonical Classification',
          canonical_topic: canonical.display_name,
          canonical_invariant: canonical.invariant.statement,
          why_it_matters: canonical.invariant.why_it_matters
        }
      ]
    };
  }
}
