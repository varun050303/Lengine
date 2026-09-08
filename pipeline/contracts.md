# Lengine Architectural Contracts (v2.0)

This document formalizes the four governing contracts that define knowledge modeling, evidence grounding, learner evaluation, and quality assurance across the Lengine knowledge system.

---

## 1. The Knowledge Contract

### 1.1 Artifact Classification Tests

Every knowledge artifact in Lengine belongs to exactly one layer and must satisfy its specific classification test:

| Artifact Type | Primary Role & Core Question | Exclusion Rule (What it MUST NOT become) | Canonical ID Prefix |
| :--- | :--- | :--- | :--- |
| **Concept** | *What bounded technical behavior must the learner understand?*<br>Atomic, protocol-level or system-level building block. | Must NOT become a vulnerability lesson, exploitation guide, or broad textbook chapter. | `concept.<slug>` |
| **Mechanism** | *How can a security property fail through a reusable causal pattern?*<br>Multi-component causal template independent of individual vulnerabilities. | Must NOT become a list of vulnerability names, payload catalog, or loose bag of techniques. | `mechanism.<slug>` |
| **Topic** | *How does one vulnerability class manifest, get investigated, confirmed, and bounded?*<br>Vulnerability-specific reasoning model. | Must NOT duplicate the full explanation of prerequisite concepts; must reference by ID. | `topic.<slug>` |
| **Scenario** | *Can the learner apply the causal model to unfamiliar facts?*<br>Novel context testing analytical transfer without repeating surface keywords. | Must NOT be a disguised repetition of the taught example or a guessing game. | `scenario.<topic>.<slug>` |
| **Claim** | *What atomic proposition does the system assert, and under what conditions?*<br>Testable technical proposition with defined scope and provenance. | Must NOT be a multi-paragraph narrative or vague assertion. | `claim.<topic>.<slug>` |

### 1.2 Typed Reference Syntax

Artifacts reference each other using explicit typed relationships rather than bare strings:

```jsonc
{
  "target": "concept.dns-resolution",
  "relation": "prerequisite" // prerequisite | instantiates | manifests_as | contrasts_with | supports | disputes | transfers_to
}
```

### 1.3 Minimum Causal Signature for Mechanisms

A causal pattern cannot be classified as a **Mechanism** unless it specifies:
1. **Components Involved**: The interacting actors, parsers, layers, or subsystems.
2. **Representation or Authority Transition**: How data changes meaning or how authority crosses boundaries.
3. **Security Decision Bypassed**: What security check or access control logic fails to constrain the operation.
4. **Failure Condition**: The exact technical condition under which the intended invariant breaks.

### 1.4 Multi-Family Mechanism Membership

By default, every topic instantiates a single primary mechanism family (defined via `"mechanism_family"` in its `topic.json`). However, vulnerabilities that fundamentally exhibit multiple failure patterns (e.g., XXE acting as both an interpretation boundary violation and trust-boundary confusion) may optionally declare a `"secondary_mechanisms"` array. This acknowledges cross-cutting concerns while preserving the strict "exactly one primary layer" contract for structural hierarchy.

---

## 2. The Evidence & Provenance Contract

### 2.1 Claim-Level Provenance

All material factual and causal assertions in topics must be grounded in atomic claims:
- **`technical_fact`**: Specification-defined behavior (e.g., RFC 3986 URI parsing rules).
- **`causal_claim`**: Cause-and-effect relationship in software systems (e.g., DNS TOCTOU allows filter bypass).
- **`implementation_variance`**: Behavior that differs across libraries, frameworks, or operating environments.

### 2.2 Claim Statuses
- `supported`: Directly substantiated by Tier 1–3 sources retrieved during the pipeline.
- `derived`: Derived through deductive technical reasoning from verified facts.
- `illustrative`: An idealized model or analogy clarifying a mechanism; not an absolute empirical claim.
- `disputed`: Recognized area of disagreement between specifications or implementations.
- `scope_dependent`: Valid only within explicit boundaries (e.g., "Linux glibc resolver", "AWS IMDSv1").

### 2.3 Evidence Tiers for Investigation Findings

Learners and practitioners must calibrate observations against 4 evidence tiers:

| Tier | Name | Operational Meaning |
| :--- | :--- | :--- |
| **1** | **Observed** | Directly measured on an authorized target or controlled reproduction (e.g., response body contains internal admin panel). |
| **2** | **Strongly Supported** | Multiple consistent observations point to the explanation, but key intermediate state is unobservable (e.g., DNS query arrives at collaborator from target IP with expected prefix). |
| **3** | **Plausible** | Mechanism and conditions fit observed behavior, but competing hypotheses remain uneliminated. |
| **4** | **Unknown** | Necessary evidence has not yet been collected; cannot draw a valid conclusion. |

### 2.4 Implementation Variance Modeling

Topics must state boundary conditions rather than presenting contingent behavior as universal:
- `applies_when`: Preconditions required for the phenomenon to hold.
- `does_not_apply_when`: Environments or configurations where the behavior fails.
- `variance_notes`: Known differences between major libraries or cloud environments.

---

## 3. The Learning & Safety Contract

### 3.1 Learning Objectives as Observable Actions

Objectives must be written as testable actions, never passive understanding:
- *Bad*: "Learner understands SSRF."
- *Good*: "Given a system architecture diagram, the learner can identify where ambient network authority is granted and derive an experiment that determines whether the application server acts as an open proxy."

### 3.2 Safety Contract for Investigations

Every investigation model and scenario must enforce safety boundaries:
```jsonc
{
  "authorization_assumption": "Explicit written permission for target domain and network position.",
  "scope_constraints": ["Do not traverse beyond the designated metadata root or test IP."],
  "side_effect_risk": "low", // none | low | medium | high
  "data_exposure_risk": "medium", // none | low | medium | high
  "stop_conditions": [
    "Stop immediately if customer PII or production database data is returned.",
    "Do not retrieve production IAM credentials if testing confirms metadata service access."
  ],
  "safer_alternative": "Query /latest/meta-data/ (directory listing) instead of /latest/meta-data/iam/security-credentials/<role>."
}
```

### 3.3 Novel Transfer Assessment & Scoring Rubric

Every mature topic must include at least one transfer scenario set in an unfamiliar domain. Performance is scored across 6 dimensions (0–4 scale):
1. **Invariant Identification**: Can the learner state what security guarantee is failing?
2. **Boundary Mapping**: Can the learner locate where untrusted input crosses into trusted territory?
3. **Hypothesis Quality**: Are competing hypotheses mutually exclusive and testable?
4. **Safe Experiment Selection**: Does the proposed experiment maximize information gain while minimizing side-effect risk?
5. **Capability Calibration**: Is primitive clearly separated from downstream impact?
6. **Uncertainty Recognition**: Does the learner identify what remains unproven?

---

## 4. The Pipeline & Quality Gate Contract

### 4.1 Four-Stage Quality Gates

Before any topic is promoted to `approved`, it must pass all 4 gates:

```
[GATE A: Structural Validity]
  ├── JSON Schema validation passes with zero errors
  ├── All ID references resolve (prerequisites, mechanisms, claims, sources)
  └── Required directory structure and file separation verified

[GATE B: Technical & Evidence Validity]
  ├── All material claims link to verified sources with retrieved_this_pass = true
  ├── Implementation variances and scope bounds are explicitly declared
  └── Disputed claims record competing interpretations

[GATE C: Causal Reasoning Validity]
  ├── Security invariant is testable and explicit
  ├── Normal vs. vulnerable behavior shows exact point of divergence
  ├── Exploitability logic enforces correct boolean AND/OR gates
  └── Capability chain cleanly separates primitive from impact

[GATE D: Learning & Safety Validity]
  ├── Observable learning objectives defined
  ├── Formal safety contract and stop conditions present
  └── Novel scenario assessment includes 6-dimension scoring rubric
```

### 4.2 Editorial Issue Taxonomy

Editorial passes (Pass 2 Review and Pass 3 Arbitration) must classify every issue using this taxonomy:

- **Issue Type**: `factual` | `causal` | `scope` | `safety` | `teaching` | `source` | `schema`
- **Severity**: `blocking` (must resolve before approval) | `major` (substantive correction) | `minor` (clarification) | `editorial` (style/wording)
- **Decision**: `accept` | `reject` | `modify` | `defer`
- **Evidence Basis**: `source` | `reproduction` | `expert_judgment` | `learner_test`
- **Resolution**: Exact modification performed or formal rationale for no change.

### 4.3 Reviewer Independence Requirement

Pass 2 (Skeptical Review) is only a meaningful check if it is not simply the drafter re-reading their own work. Every `02-review.json` must declare:

- **`reviewer_independent`**: `true` if Pass 2 was conducted by a distinct reviewer identity (a different person, or a fresh session/context with no visibility into Pass 1's drafting rationale) than the one that produced `01-draft.md`. `false` otherwise.
- If `false`, the review must additionally include `self_review_caveat`: a short note naming the self-review risk this creates (e.g. "drafter and reviewer are the same session; confirmation bias on causal claims is unverified").

A topic may still proceed with `reviewer_independent: false`, but Gate D flags it as a warning rather than silently treating the review as equivalent to an independent one.
