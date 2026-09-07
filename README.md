# Lengine — Security Reasoning Knowledge System (v2.0)

> **The goal is not to teach the learner how to recognize known vulnerabilities.**
>
> The goal is to teach the learner how to reason from an unfamiliar application toward a vulnerability they have never studied before.

Lengine is a content-first security knowledge system for pentesting and bug-bounty learning.

It is deliberately **not** a payload cheat sheet, exploit cookbook, or HackTricks clone.

The primary unit of knowledge is not the vulnerability name.

It is the **mechanism that causes a security property to fail**.

---

## Core Philosophy

Every topic trains the learner to answer:

1. **What is the system supposed to guarantee?** (Security Invariant)
2. **What does the system trust?** (Ambient Positional Trust vs Explicit Auth)
3. **What does the attacker control?** (Input Surface)
4. **Where does attacker-controlled data go?** (Data Flow)
5. **How is that data interpreted?** (Parser / Interpreter Transformation)
6. **What security decision depends on that interpretation?** (Access Control Logic)
7. **What observation would prove or disprove the hypothesis?** (Informative Experiment)
8. **What capability does the attacker actually gain?** (Calibrated Capability Chain)
9. **Where can the attack chain be broken?** (Defense-in-Depth)
10. **Where else could the same mechanism appear?** (Analytical Transfer)

---

## The Anti-HackTricks Rule

> **Never introduce a technique before explaining the condition that makes the technique work.**

The technique is an example derived from the mechanism. The mechanism is the knowledge.

---

## The Four Governing Contracts (v2.0)

Lengine is governed by four explicit, testable contracts (detailed in [pipeline/contracts.md](file:///Users/varunsinghal/Developer/Lengine_v1/pipeline/contracts.md)):

1. **Knowledge Contract**: Strict ontological classification (Concept vs. Mechanism vs. Topic vs. Scenario), versioned schemas (`2.0`), stable typed IDs (`concept.*`, `mechanism.*`, `topic.*`, `claim.*`, `scenario.*`), and explicit lifecycle states (`draft`, `in_review`, `approved`, `deprecated`).
2. **Evidence Contract**: Claim-level provenance (`claims.json`), implementation variance bounds (`applies_when`, `does_not_apply_when`), tier-rated evidence calibration (`observed`, `strongly_supported`, `plausible`, `unknown`), and recorded technical disagreements.
3. **Learning & Safety Contract**: Observable learning objectives, formal safety constraints (`authorization_assumption`, `scope_constraints`, `side_effect_risk`, `stop_conditions`), and novel transfer assessments with 6-dimension scoring rubrics (0–4 scale).
4. **Pipeline Contract**: 4-stage Quality Gates (Gate A: Structural, Gate B: Evidence/Technical, Gate C: Causal Reasoning, Gate D: Learning/Safety) with typed editorial issue taxonomy (`factual`, `causal`, `scope`, `safety`, `teaching`, `source`, `schema`).

---

## Repository Structure

```
Lengine_v1/
│
├── content/
│   ├── _manifest.json              # Topic status and version tracking
│   ├── _mechanism_families.json    # Cross-cutting mechanism index
│   ├── _crosslinks.json            # Topic ↔ topic relationships
│   │
│   ├── concepts/                   # Atomic reusable technical building blocks
│   │   ├── concept.url-parsing.json
│   │   ├── concept.dns-resolution.json
│   │   ├── concept.http-redirects.json
│   │   └── concept.network-trust-boundaries.json
│   │
│   ├── mechanisms/                 # Reusable causal pattern families
│   │   └── mechanism.trust-boundary-confusion.json
│   │
│   └── topics/                     # Vulnerability-specific reasoning models
│       └── <topic-slug>/
│           ├── topic.json          # Canonical published reasoning model (v2.0)
│           ├── claims.json         # Atomic claim-level provenance and scope
│           ├── assessment.json     # Novel transfer scenario and scoring rubric
│           ├── diagrams/           # Text-based structural ASCII diagrams
│           └── editorial/          # Archived 4-pass history and typed reviews
│               ├── 01-draft.md
│               ├── 02-review.json
│               └── 03-arbitration.json
│
└── pipeline/                       # Pipeline contracts, schemas, and test suite
    ├── contracts.md                # The 4 foundational contracts
    ├── topic-schema.json           # JSON Schema for topics
    ├── claim-schema.json           # JSON Schema for atomic claims
    ├── assessment-schema.json      # JSON Schema for assessments & rubrics
    ├── concept-schema.json         # JSON Schema for concepts
    ├── mechanism-schema.json       # JSON Schema for mechanisms
    └── validate.js                 # Automated 4-Gate test suite
```

---

## Verification & Automated Quality Gate

Run the complete 4-gate verification suite:

```bash
node pipeline/validate.js
```

Validate against JSON schemas:

```bash
npx -y ajv-cli validate -s pipeline/topic-schema.json -d content/topics/ssrf/topic.json --strict=false
npx -y ajv-cli validate -s pipeline/claim-schema.json -d content/topics/ssrf/claims.json --strict=false
npx -y ajv-cli validate -s pipeline/assessment-schema.json -d content/topics/ssrf/assessment.json --strict=false
npx -y ajv-cli validate -s pipeline/concept-schema.json -d "content/concepts/*.json" --strict=false
npx -y ajv-cli validate -s pipeline/mechanism-schema.json -d "content/mechanisms/*.json" --strict=false
```

---

## Principles

```
MECHANISM > PAYLOAD
REASONING > RECOGNITION
CAPABILITY > LABEL
EVIDENCE > SUSPICION
TRANSFER > MEMORIZATION
DEPTH > BREADTH
QUALITY > COMPLETENESS
```
