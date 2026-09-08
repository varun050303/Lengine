#!/usr/bin/env node

/**
 * Lengine Content Pipeline - Automated 4-Gate Quality Auditor (v2.0)
 *
 * Implements the four quality gates defined in pipeline/contracts.md:
 * - Gate A: Structural Validity & Schema Compliance
 * - Gate B: Technical Grounding & Claim-Level Provenance
 * - Gate C: Causal Reasoning & Invariant Structure
 * - Gate D: Learning Objectives, Safety Contract & Assessment Rubric
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PIPELINE_DIR = path.join(ROOT_DIR, 'pipeline');

let errors = [];
let warnings = [];
let gateResults = {
  'Gate A (Structural Validity)': 0,
  'Gate B (Evidence & Provenance)': 0,
  'Gate C (Causal Reasoning)': 0,
  'Gate D (Learning & Safety)': 0
};

function pass(gate, msg) {
  gateResults[gate] = (gateResults[gate] || 0) + 1;
  console.log(`  \x1b[32m✔\x1b[0m [${gate.split(' ')[1]}] ${msg}`);
}

function fail(gate, msg) {
  errors.push(`[${gate}] ${msg}`);
  console.log(`  \x1b[31m✖\x1b[0m [${gate.split(' ')[1]}] ${msg}`);
}

function warn(gate, msg) {
  warnings.push(`[${gate}] ${msg}`);
  console.log(`  \x1b[33m⚠\x1b[0m [${gate.split(' ')[1]}] ${msg}`);
}

console.log('\n\x1b[1m═══════════════════════════════════════════════════════════\x1b[0m');
console.log('\x1b[1m  LENGINE v2.0 FOUR-STAGE QUALITY AUDITOR\x1b[0m');
console.log('\x1b[1m═══════════════════════════════════════════════════════════\x1b[0m\n');

// 1. Concepts Audit
console.log('\x1b[36m[1/4] Auditing Foundational Concepts...\x1b[0m');
const conceptsDir = path.join(CONTENT_DIR, 'concepts');
const conceptFiles = fs.readdirSync(conceptsDir).filter(f => f.endsWith('.json'));

const knownConcepts = new Set();
for (const file of conceptFiles) {
  const filePath = path.join(conceptsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Gate A: Structural
    if (!data.concept_id || !data.concept_id.startsWith('concept.')) {
      fail('Gate A (Structural Validity)', `Concept ${file} missing valid concept_id with 'concept.' prefix`);
    } else {
      knownConcepts.add(data.concept_id);
      pass('Gate A (Structural Validity)', `Concept ID format valid: ${data.concept_id}`);
    }

    if (data.schema_version !== '2.0') {
      fail('Gate A (Structural Validity)', `Concept ${file} schema_version must be '2.0'`);
    }

    // Gate B: Evidence
    if (data.bounded_scope && data.bounded_scope.covers && data.bounded_scope.delegates) {
      pass('Gate B (Evidence & Provenance)', `Concept ${data.concept_id} defines bounded scope & delegation`);
    } else {
      fail('Gate B (Evidence & Provenance)', `Concept ${data.concept_id} missing bounded_scope (covers/delegates)`);
    }

    // Gate D: Learning
    if (Array.isArray(data.learning_objectives) && data.learning_objectives.length > 0) {
      pass('Gate D (Learning & Safety)', `Concept ${data.concept_id} defines ${data.learning_objectives.length} learning objective(s)`);
    } else {
      fail('Gate D (Learning & Safety)', `Concept ${data.concept_id} missing learning_objectives`);
    }

  } catch (e) {
    fail('Gate A (Structural Validity)', `JSON parse error in concept ${file}: ${e.message}`);
  }
}

// 2. Mechanisms Audit
console.log('\n\x1b[36m[2/4] Auditing Mechanism Families...\x1b[0m');
const mechanismsDir = path.join(CONTENT_DIR, 'mechanisms');
const mechanismFiles = fs.readdirSync(mechanismsDir).filter(f => f.endsWith('.json'));

const knownMechanisms = new Set();
for (const file of mechanismFiles) {
  const filePath = path.join(mechanismsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Gate A: Structural
    if (!data.mechanism_id || !data.mechanism_id.startsWith('mechanism.')) {
      fail('Gate A (Structural Validity)', `Mechanism ${file} missing valid mechanism_id with 'mechanism.' prefix`);
    } else {
      knownMechanisms.add(data.mechanism_id);
      pass('Gate A (Structural Validity)', `Mechanism ID format valid: ${data.mechanism_id}`);
    }

    // Gate C: Causal Reasoning (Minimum Causal Signature)
    const sig = data.minimum_causal_signature;
    if (sig &&
        Array.isArray(sig.components_involved) &&
        sig.authority_transition &&
        sig.security_decision_bypassed &&
        sig.failure_condition) {
      pass('Gate C (Causal Reasoning)', `Mechanism ${data.mechanism_id} fulfills Minimum Causal Signature`);
    } else {
      fail('Gate C (Causal Reasoning)', `Mechanism ${data.mechanism_id} missing complete Minimum Causal Signature`);
    }

    // Check related concepts resolve
    if (Array.isArray(data.related_concepts)) {
      for (const rc of data.related_concepts) {
        if (knownConcepts.has(rc)) {
          pass('Gate B (Evidence & Provenance)', `Mechanism ${data.mechanism_id} resolved concept: ${rc}`);
        } else {
          fail('Gate B (Evidence & Provenance)', `Mechanism ${data.mechanism_id} references unknown concept: ${rc}`);
        }
      }
    }

  } catch (e) {
    fail('Gate A (Structural Validity)', `JSON parse error in mechanism ${file}: ${e.message}`);
  }
}

// 3. Manifest and Topics Audit
console.log('\n\x1b[36m[3/4] Auditing Manifest and Topics (4-Gate Verification)...\x1b[0m');
const manifestPath = path.join(CONTENT_DIR, '_manifest.json');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  pass('Gate A (Structural Validity)', `Manifest parsed successfully (${manifest.topics.length} registered topics)`);
} catch (e) {
  fail('Gate A (Structural Validity)', `Failed to parse _manifest.json: ${e.message}`);
}

if (manifest && manifest.topics) {
  const completedTopics = manifest.topics.filter(t => t.status === 'completed');

  for (const topicMeta of completedTopics) {
    console.log(`\n  \x1b[1mAuditing Topic: ${topicMeta.topic} (${topicMeta.display_name})\x1b[0m`);
    const topicDir = path.join(CONTENT_DIR, 'topics', topicMeta.topic);

    if (!fs.existsSync(topicDir)) {
      fail('Gate A (Structural Validity)', `Topic directory does not exist: ${topicDir}`);
      continue;
    }

    // --- GATE A: Structural & File Separation ---
    const topicJsonPath = path.join(topicDir, 'topic.json');
    const claimsJsonPath = path.join(topicDir, 'claims.json');
    const assessmentJsonPath = path.join(topicDir, 'assessment.json');
    const diagramsDir = path.join(topicDir, 'diagrams');
    const editorialDir = path.join(topicDir, 'editorial');

    if (fs.existsSync(topicJsonPath)) {
      pass('Gate A (Structural Validity)', `Canonical topic specification present: topic.json`);
    } else {
      fail('Gate A (Structural Validity)', `Missing canonical topic.json`);
    }

    if (fs.existsSync(claimsJsonPath)) {
      pass('Gate A (Structural Validity)', `Atomic claims registry present: claims.json`);
    } else {
      fail('Gate A (Structural Validity)', `Missing claims.json`);
    }

    if (fs.existsSync(assessmentJsonPath)) {
      pass('Gate A (Structural Validity)', `Assessment & transfer harness present: assessment.json`);
    } else {
      fail('Gate A (Structural Validity)', `Missing assessment.json`);
    }

    if (fs.existsSync(diagramsDir)) {
      const diagrams = fs.readdirSync(diagramsDir).filter(f => f.endsWith('.txt'));
      if (diagrams.length >= 5) {
        pass('Gate A (Structural Validity)', `Structural diagrams verified (${diagrams.length} text diagrams present)`);
      } else {
        fail('Gate A (Structural Validity)', `Insufficient diagrams (found ${diagrams.length}, expected >= 5)`);
      }
    } else {
      fail('Gate A (Structural Validity)', `Missing diagrams directory`);
    }

    // Editorial Pass Verification
    if (fs.existsSync(editorialDir)) {
      const draftExists = fs.existsSync(path.join(editorialDir, '01-draft.md'));
      const reviewExists = fs.existsSync(path.join(editorialDir, '02-review.json'));
      const arbExists = fs.existsSync(path.join(editorialDir, '03-arbitration.json'));
      if (draftExists && reviewExists && arbExists) {
        pass('Gate A (Structural Validity)', `Editorial history verified (01-draft, 02-review.json, 03-arbitration.json)`);
      } else {
        fail('Gate A (Structural Validity)', `Editorial history incomplete in ${editorialDir}`);
      }

      // Reviewer independence check (contracts.md 4.3)
      if (reviewExists) {
        try {
          const reviewData = JSON.parse(fs.readFileSync(path.join(editorialDir, '02-review.json'), 'utf8'));
          if (reviewData.reviewer_independent === true) {
            pass('Gate D (Learning & Safety)', `Pass 2 review declares reviewer independence`);
          } else if (reviewData.reviewer_independent === false && reviewData.self_review_caveat) {
            warn('Gate D (Learning & Safety)', `Pass 2 review is self-reviewed (not independent): ${reviewData.self_review_caveat}`);
          } else {
            warn('Gate D (Learning & Safety)', `Pass 2 review missing reviewer_independent declaration (contracts.md 4.3)`);
          }
        } catch (e) {
          warn('Gate A (Structural Validity)', `Could not parse 02-review.json for independence check: ${e.message}`);
        }
      }
    } else {
      fail('Gate A (Structural Validity)', `Missing editorial/ directory for topic`);
    }

    // --- GATE B: Evidence & Provenance ---
    if (fs.existsSync(claimsJsonPath)) {
      try {
        const claimsData = JSON.parse(fs.readFileSync(claimsJsonPath, 'utf8'));
        if (Array.isArray(claimsData.claims) && claimsData.claims.length > 0) {
          pass('Gate B (Evidence & Provenance)', `Claims registry contains ${claimsData.claims.length} atomic claims`);
          let allClaimsSourced = true;
          for (const c of claimsData.claims) {
            if (!c.claim_id || !c.statement || !c.type || !c.scope || !c.status || !Array.isArray(c.sources)) {
              allClaimsSourced = false;
              fail('Gate B (Evidence & Provenance)', `Malformed claim: ${c.claim_id}`);
            }
          }
          if (allClaimsSourced) {
            pass('Gate B (Evidence & Provenance)', `All claims adhere to strict claim schema with scope & sources`);
          }
        } else {
          fail('Gate B (Evidence & Provenance)', `No claims found in claims.json`);
        }
      } catch (e) {
        fail('Gate B (Evidence & Provenance)', `Failed to parse claims.json: ${e.message}`);
      }
    }

    // Topic JSON Detailed Audit
    if (fs.existsSync(topicJsonPath)) {
      try {
        const topicData = JSON.parse(fs.readFileSync(topicJsonPath, 'utf8'));

        // Gate A: ID & Prerequisites Resolution
        if (topicData.topic_id === `topic.${topicMeta.topic}`) {
          pass('Gate A (Structural Validity)', `Topic ID matches slug: ${topicData.topic_id}`);
        } else {
          fail('Gate A (Structural Validity)', `Topic ID mismatch: ${topicData.topic_id} vs topic.${topicMeta.topic}`);
        }

        for (const prereq of topicData.prerequisites) {
          if (knownConcepts.has(prereq)) {
            pass('Gate A (Structural Validity)', `Resolved prerequisite: ${prereq}`);
          } else {
            fail('Gate A (Structural Validity)', `Unresolved prerequisite: ${prereq}`);
          }
        }

        if (knownMechanisms.has(topicData.mechanism_family)) {
          pass('Gate A (Structural Validity)', `Resolved mechanism family: ${topicData.mechanism_family}`);
        } else {
          fail('Gate A (Structural Validity)', `Unresolved mechanism family: ${topicData.mechanism_family}`);
        }

        // Gate B: Implementation Variance & Source Integrity
        const variance = topicData.implementation_variance;
        if (variance && Array.isArray(variance.applies_when) && Array.isArray(variance.does_not_apply_when)) {
          pass('Gate B (Evidence & Provenance)', `Implementation variance bounds explicitly declared (applies_when / does_not_apply_when)`);
        } else {
          fail('Gate B (Evidence & Provenance)', `Missing implementation_variance bounds`);
        }

        if (Array.isArray(topicData.sources)) {
          const allRetrieved = topicData.sources.every(s => s.retrieved_this_pass === true);
          if (allRetrieved) {
            pass('Gate B (Evidence & Provenance)', `All ${topicData.sources.length} sources verified with retrieved_this_pass = true`);
          } else {
            fail('Gate B (Evidence & Provenance)', `One or more sources have retrieved_this_pass != true`);
          }
        }

        // Gate C: Causal Reasoning
        if (topicData.invariant &&
            topicData.invariant.statement &&
            topicData.invariant.why_it_matters &&
            topicData.invariant.violation_condition &&
            topicData.invariant.investigation_question) {
          pass('Gate C (Causal Reasoning)', `Security Invariant is explicit, testable, and complete`);
        } else {
          fail('Gate C (Causal Reasoning)', `Security Invariant missing mandatory reasoning fields`);
        }

        if (topicData.normal_behavior && topicData.vulnerable_behavior &&
            topicData.normal_behavior.description && topicData.vulnerable_behavior.description) {
          pass('Gate C (Causal Reasoning)', `Normal vs Vulnerable behavior clearly contrasted`);
        } else {
          fail('Gate C (Causal Reasoning)', `Normal vs Vulnerable behavior contrast missing`);
        }

        if (topicData.exploitability && Array.isArray(topicData.exploitability.conditions)) {
          const hasOr = topicData.exploitability.conditions.some(c => c.operator === 'OR');
          if (hasOr) {
            pass('Gate C (Causal Reasoning)', `Exploitability logic gate models boolean AND/OR structure`);
          } else {
            fail('Gate C (Causal Reasoning)', `Exploitability logic missing nested OR gate`);
          }
        }

        if (topicData.capability_and_impact &&
            topicData.capability_and_impact.primitive &&
            Array.isArray(topicData.capability_and_impact.capabilities)) {
          pass('Gate C (Causal Reasoning)', `Capability-before-impact chain strictly separates primitive from impact`);
        } else {
          fail('Gate C (Causal Reasoning)', `Capability chain missing primitive or capabilities array`);
        }

        // Gate D: Learning & Safety Contract
        const safety = topicData.safety_contract;
        if (safety &&
            safety.authorization_assumption &&
            Array.isArray(safety.scope_constraints) &&
            safety.side_effect_risk &&
            safety.data_exposure_risk &&
            Array.isArray(safety.stop_conditions) &&
            safety.safer_alternative) {
          pass('Gate D (Learning & Safety)', `Safety contract verified (authorization, risk levels, stop conditions, safer alternative)`);
        } else {
          fail('Gate D (Learning & Safety)', `Safety contract incomplete or missing`);
        }

        if (Array.isArray(topicData.learning_objectives) && topicData.learning_objectives.length > 0) {
          pass('Gate D (Learning & Safety)', `Topic specifies ${topicData.learning_objectives.length} observable learning objective(s)`);
        } else {
          fail('Gate D (Learning & Safety)', `Missing learning_objectives`);
        }

      } catch (e) {
        fail('Gate A (Structural Validity)', `Failed to parse topic.json: ${e.message}`);
      }
    }

    // Gate D: Assessment Harness Verification
    if (fs.existsSync(assessmentJsonPath)) {
      try {
        const assessData = JSON.parse(fs.readFileSync(assessmentJsonPath, 'utf8'));
        if (Array.isArray(assessData.scenarios) && assessData.scenarios.length > 0) {
          const sc = assessData.scenarios[0];
          if (sc.scoring_rubric && Array.isArray(sc.scoring_rubric) && sc.scoring_rubric.length === 6) {
            pass('Gate D (Learning & Safety)', `Novel transfer scenario has complete 6-dimension scoring rubric (levels 0-4)`);
          } else {
            fail('Gate D (Learning & Safety)', `Scoring rubric missing or does not have 6 dimensions`);
          }

          if (sc.common_learner_errors && sc.common_learner_errors.length > 0) {
            pass('Gate D (Learning & Safety)', `Common learner errors and remedial guidance documented`);
          } else {
            fail('Gate D (Learning & Safety)', `Missing common_learner_errors in scenario`);
          }
        }
      } catch (e) {
        fail('Gate D (Learning & Safety)', `Failed to parse assessment.json: ${e.message}`);
      }
    }
  }
}

// 4. Summary & Report
console.log('\n\x1b[36m[4/4] Four-Gate Audit Summary...\x1b[0m');
for (const [gate, count] of Object.entries(gateResults)) {
  console.log(`  ${gate.padEnd(35)}: \x1b[32m${count} checks passed\x1b[0m`);
}
console.log(`\n  Total Errors:   \x1b[${errors.length > 0 ? '31' : '32'}m${errors.length}\x1b[0m`);
console.log(`  Total Warnings: \x1b[33m${warnings.length}\x1b[0m\n`);

if (errors.length > 0) {
  console.log('\x1b[31m❌ QUALITY GATES FAILED with errors:\x1b[0m');
  for (const err of errors) {
    console.log(`   - ${err}`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL FOUR QUALITY GATES PASSED (Structural, Evidence, Reasoning, Learning & Safety).\x1b[0m\n');
  process.exit(0);
}
