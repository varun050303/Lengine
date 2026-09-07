#!/usr/bin/env node

/**
 * Lengine Content Pipeline - Automated Quality Gate Validator
 *
 * Validates:
 * 1. JSON Schemas for topics, concepts, and mechanisms
 * 2. Cross-link referential integrity (prerequisites, mechanism families)
 * 3. 4-Pass pipeline audit trail (01-draft, 02-review, 03-arbitration, 04-final, sources, diagrams)
 * 4. Quality gate constraints (source verification, boolean logic, invariant structure)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PIPELINE_DIR = path.join(ROOT_DIR, 'pipeline');

let errors = [];
let warnings = [];
let passedChecks = 0;

function pass(msg) {
  passedChecks++;
  console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
}

function fail(msg) {
  errors.push(msg);
  console.log(`  \x1b[31m✖\x1b[0m ${msg}`);
}

function warn(msg) {
  warnings.push(msg);
  console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
}

console.log('\n\x1b[1m═══════════════════════════════════════════════════════════\x1b[0m');
console.log('\x1b[1m  LENGINE QUALITY GATE & INTEGRITY AUDITOR\x1b[0m');
console.log('\x1b[1m═══════════════════════════════════════════════════════════\x1b[0m\n');

// 1. Check Concepts
console.log('\x1b[36m[1/4] Auditing Foundational Concepts...\x1b[0m');
const conceptsDir = path.join(CONTENT_DIR, 'concepts');
const conceptFiles = fs.readdirSync(conceptsDir).filter(f => f.endsWith('.json'));

const knownConcepts = new Set();
for (const file of conceptFiles) {
  const filePath = path.join(conceptsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.concept || !data.display_name || !data.summary || !data.mental_model || !data.mechanism) {
      fail(`Concept ${file} missing required fields`);
    } else {
      knownConcepts.add(data.concept);
      pass(`Concept: ${data.concept} (${data.display_name})`);
    }
  } catch (e) {
    fail(`Invalid JSON in concept ${file}: ${e.message}`);
  }
}

// 2. Check Mechanisms
console.log('\n\x1b[36m[2/4] Auditing Mechanism Families...\x1b[0m');
const mechanismsDir = path.join(CONTENT_DIR, 'mechanisms');
const mechanismFiles = fs.readdirSync(mechanismsDir).filter(f => f.endsWith('.json'));

const knownMechanisms = new Set();
for (const file of mechanismFiles) {
  const filePath = path.join(mechanismsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.mechanism || !data.display_name || !data.core_principle || !data.conditions || !data.members || !data.investigation_question || !data.defensive_implication) {
      fail(`Mechanism ${file} missing required fields`);
    } else {
      knownMechanisms.add(data.mechanism);
      pass(`Mechanism: ${data.mechanism} (${data.display_name})`);
    }
  } catch (e) {
    fail(`Invalid JSON in mechanism ${file}: ${e.message}`);
  }
}

// 3. Check Manifest and Completed Topics
console.log('\n\x1b[36m[3/4] Auditing Manifest and Topics...\x1b[0m');
const manifestPath = path.join(CONTENT_DIR, '_manifest.json');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  pass(`Manifest loaded (${manifest.topics.length} registered topics)`);
} catch (e) {
  fail(`Failed to parse _manifest.json: ${e.message}`);
}

if (manifest && manifest.topics) {
  const completedTopics = manifest.topics.filter(t => t.status === 'completed');
  console.log(`  Found ${completedTopics.length} completed topic(s)`);

  for (const topicMeta of completedTopics) {
    console.log(`\n  \x1b[1mAuditing Topic: ${topicMeta.topic} (${topicMeta.display_name})\x1b[0m`);
    const topicDir = path.join(CONTENT_DIR, 'topics', topicMeta.topic);

    if (!fs.existsSync(topicDir)) {
      fail(`Topic directory does not exist: ${topicDir}`);
      continue;
    }

    // Check 4-pass audit trail
    const requiredFiles = [
      '01-draft.md',
      '02-review.md',
      '03-arbitration.md',
      '04-final.json',
      'sources.json'
    ];

    for (const reqFile of requiredFiles) {
      if (fs.existsSync(path.join(topicDir, reqFile))) {
        pass(`Pass artifact present: ${reqFile}`);
      } else {
        fail(`Missing pass artifact: ${reqFile}`);
      }
    }

    // Check diagrams directory
    const diagramsDir = path.join(topicDir, 'diagrams');
    if (fs.existsSync(diagramsDir)) {
      const diagrams = fs.readdirSync(diagramsDir).filter(f => f.endsWith('.txt'));
      if (diagrams.length > 0) {
        pass(`Diagrams directory contains ${diagrams.length} text diagram(s): ${diagrams.join(', ')}`);
      } else {
        fail(`Diagrams directory exists but has no .txt diagrams`);
      }
    } else {
      fail(`Missing diagrams directory: ${diagramsDir}`);
    }

    // Inspect 04-final.json contents
    const finalPath = path.join(topicDir, '04-final.json');
    if (fs.existsSync(finalPath)) {
      try {
        const topicData = JSON.parse(fs.readFileSync(finalPath, 'utf8'));

        // Check prerequisites
        if (Array.isArray(topicData.prerequisites)) {
          for (const prereq of topicData.prerequisites) {
            if (knownConcepts.has(prereq)) {
              pass(`Prerequisite concept resolved: ${prereq}`);
            } else {
              fail(`Unknown prerequisite concept '${prereq}' in topic ${topicMeta.topic}`);
            }
          }
        } else {
          fail(`Topic missing prerequisites array`);
        }

        // Check mechanism family
        if (knownMechanisms.has(topicData.mechanism_family)) {
          pass(`Mechanism family resolved: ${topicData.mechanism_family}`);
        } else {
          fail(`Unknown mechanism family '${topicData.mechanism_family}' in topic ${topicMeta.topic}`);
        }

        // Quality Gate: Invariant Structure
        if (topicData.invariant &&
            topicData.invariant.statement &&
            topicData.invariant.why_it_matters &&
            topicData.invariant.violation_condition &&
            topicData.invariant.investigation_question) {
          pass(`Security Invariant is explicit, testable, and complete`);
        } else {
          fail(`Security Invariant missing mandatory reasoning fields`);
        }

        // Quality Gate: Exploitability Logic Gates
        if (topicData.exploitability && Array.isArray(topicData.exploitability.conditions)) {
          const hasOrGroup = topicData.exploitability.conditions.some(c => c.operator === 'OR');
          if (hasOrGroup) {
            pass(`Exploitability logic gate implements AND/OR structure`);
          } else {
            warn(`Exploitability logic has conditions but no nested OR group`);
          }
        } else {
          fail(`Exploitability conditions missing or not an array`);
        }

        // Quality Gate: Sources Integrity
        if (Array.isArray(topicData.sources)) {
          let sourcesValid = true;
          for (const s of topicData.sources) {
            if (s.retrieved_this_pass !== true) {
              fail(`Source ${s.id} (${s.title}) has retrieved_this_pass != true`);
              sourcesValid = false;
            }
          }
          if (sourcesValid) {
            pass(`All ${topicData.sources.length} sources verified with retrieved_this_pass: true`);
          }
        } else {
          fail(`Topic missing sources array`);
        }

        // Quality Gate: Understanding Test
        if (topicData.understanding_test &&
            topicData.understanding_test.novel_scenario &&
            topicData.understanding_test.explain_without_name) {
          pass(`Understanding test includes novel scenario and name-free explanation`);
        } else {
          fail(`Understanding test incomplete`);
        }

      } catch (e) {
        fail(`Failed to parse 04-final.json: ${e.message}`);
      }
    }
  }
}

// 4. Summary
console.log('\n\x1b[36m[4/4] Quality Gate Summary...\x1b[0m');
console.log(`  Passed Checks: \x1b[32m${passedChecks}\x1b[0m`);
console.log(`  Warnings:      \x1b[33m${warnings.length}\x1b[0m`);
console.log(`  Errors:        \x1b[31m${errors.length}\x1b[0m\n`);

if (errors.length > 0) {
  console.log('\x1b[31m❌ QUALITY GATE FAILED with errors:\x1b[0m');
  for (const err of errors) {
    console.log(`   - ${err}`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32m✔ QUALITY GATE PASSED: All integrity checks, schemas, and reasoning invariants hold.\x1b[0m\n');
  process.exit(0);
}
