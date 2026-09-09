# Lengine Investigation Layer MVP Architecture & Specification

## 1. Architectural Philosophy & Overview

The goal of Lengine is **not** to teach learners how to recognize or memorize known vulnerability names or buzzwords. The goal is to teach learners how to reason from an unfamiliar application toward a security failure they have never studied before.

### 1.1 First-Principles Investigation Loop

```text
SPECIMEN
    ↓
OBSERVE (Raw HTTP requests, responses, and state deltas)
    ↓
INVENTORY (Actors, trust boundaries, credentials, authority)
    ↓
HYPOTHESIZE (Formulate ≥2 competing falsifiable explanations)
    ↓
EXPERIMENT (Design parameterized mutation with pre-predictions)
    ↓
OBSERVE RESULT (Raw execution transcript without grading)
    ↓
UPDATE EVIDENCE (Link observations to hypotheses: SUPPORTS / REFUTES)
    ↓
SYNTHESIZE (Construct causal account connecting context to state effect)
    ↓
CAPABILITY (Isolate primitive capability before downstream impact)
    ↓
REVEAL GATE (Deterministic 10-point evaluation unlocks canonical oracle)
    ↓
TRANSFER (Reconstruct causal mechanism on a novel attack surface)
```

### 1.2 The Golden Rule: Hide Interpretations, Not Observations

- **Allowed prior to reveal**: Raw HTTP request targets, methods, headers, cookies, query parameters, bodies, raw HTTP response status codes, headers, response JSON/HTML, and empirical state mutations.
- **Strictly prohibited prior to reveal**: Vulnerability names (e.g. CSRF, XSRF), CWE identifiers (e.g. CWE-352), mechanism family names (`Origin-Context Confusion`), canonical invariant text, canonical causal step formulations, canonical exploitability trees, and defense names as answers.
- All specimens use realistic, opaque identifiers (e.g. `session_id=sess_user_9921`, `email=alex@app.local`, endpoint `POST /api/profile/email`).

---

## 2. File Classification & System Boundaries

```text
                 ┌────────────────────────────────┐
                 │ Canonical Content Oracle       │
                 │ (content/topics/, concepts/,   │
                 │  mechanisms/, _manifest.json)  │
                 └───────────────┬────────────────┘
                                 │
                            Validation
                         (pipeline/validate.js)
                                 │
                       Content Oracle Loader
                     (investigation/oracle.js)
                                 │
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
   Deterministic Evaluator                       Reveal Gate
  (investigation/evaluator.js)              (investigation/reveal.js)
            ▲                                         ▲
            │                                         │
     Learner Session ─────────────────────────────────┘
  (investigation/session.js)
            ▲
            │
  Interactive Shell / CLI
   (cli/investigate.js)
            ▲
            │
  Parameterized Specimen Engine
  (investigation/specimen.js,
   investigation/transfer.js)
```

| Classification | File / Path | Role in MVP |
| :--- | :--- | :--- |
| **KEEP / DO NOT TOUCH** | `pipeline/validate.js` | 4-Stage Quality Gate Auditor. Verifies content schema, evidence, causality, and safety. |
| **KEEP / DO NOT TOUCH** | `pipeline/contracts.md` | v2.0 foundational contracts. |
| **KEEP / DO NOT TOUCH** | `pipeline/*-schema.json` | JSON schemas for topics, concepts, mechanisms, claims, assessments. |
| **KEEP / DO NOT TOUCH** | `content/` | All canonical topics, concepts, mechanisms, claims, and diagrams. Source of truth oracle. |
| **KEEP / DO NOT TOUCH** | `ui/` | Astro-based Knowledge Graph Explorer. |
| **MODIFY** | `package.json` | Added `investigate`, `test`, and `validate` npm scripts. |
| **MODIFY** | `cli/index.js` | Added "🔬 Investigate Specimen" option in main menu. |
| **ADD** | `investigation/session.js` | Learner-owned session state and evidence ledger. |
| **ADD** | `investigation/specimen.js` | Base Specimen contract & `ProfileUpdateSpecimen` (`specimen.profile_update_01`). |
| **ADD** | `investigation/transfer.js` | Transfer specimen `WebhookSubscriptionSpecimen` (`specimen.api_webhook_02`). |
| **ADD** | `investigation/oracle.js` | Safe Content Oracle Loader reading canonical content behind reveal gate. |
| **ADD** | `investigation/evaluator.js` | Pure deterministic evaluator with 10 process and substance checks (zero LLM). |
| **ADD** | `investigation/reveal.js` | Reveal gate controller and empirical-to-canonical correspondence synthesizer. |
| **ADD** | `cli/investigate.js` | Interactive 3-panel terminal UI for investigation. |
| **ADD** | `test/investigation.test.js` | Automated 26-test suite covering session, specimen, evaluator, reveal, transfer, regression. |
| **ADD** | `docs/investigation_mvp.md` | Architecture and design document. |

---

## 3. Component Specifications

### 3.1 Learner Session Schema (`investigation/session.js`)

The session is strictly separate from canonical topic JSON.

```json
{
  "session_id": "sess_38f29a",
  "specimen_id": "specimen.profile_update_01",
  "oracle_topic_id": "topic.csrf",
  "reveal_state": "LOCKED",
  "created_at": "2026-09-09T09:00:00.000Z",
  "updated_at": "2026-09-09T09:05:00.000Z",
  "observations": [
    {
      "id": "obs_1",
      "type": "OBSERVATION",
      "content": "POST /api/profile/email with session cookie returned 200 OK and updated email.",
      "raw_data": { "status": 200 },
      "created_at": "2026-09-09T09:01:00.000Z"
    }
  ],
  "hypotheses": [
    {
      "id": "hyp_1",
      "statement": "The endpoint authenticates solely on ambient session cookie and omits origin provenance checking.",
      "status": "SUPPORTED",
      "status_history": [
        { "status": "UNKNOWN", "timestamp": "...", "rationale": "Initial formulation" },
        { "status": "SUPPORTED", "timestamp": "...", "rationale": "Cross-origin request was accepted with 200 OK" }
      ]
    },
    {
      "id": "hyp_2",
      "statement": "The endpoint validates request origin or expects a secondary anti-forgery token.",
      "status": "REFUTED",
      "status_history": [
        { "status": "UNKNOWN", "timestamp": "...", "rationale": "Initial formulation" },
        { "status": "REFUTED", "timestamp": "...", "rationale": "Cross-origin request without token succeeded" }
      ]
    }
  ],
  "experiments": [
    {
      "id": "exp_1",
      "target_hypothesis": "hyp_1",
      "action": {
        "description": "Send POST request with Origin: https://attacker.local and valid session cookie",
        "mutation": { "headers": { "Origin": "https://attacker.local" }, "body": "email=probe@attacker.local" }
      },
      "prediction_if_true": "Request succeeds with 200 OK and email is updated despite untrusted origin.",
      "prediction_if_false": "Server rejects request with 403 Forbidden.",
      "why_informative": "Distinguishes whether endpoint enforces origin isolation.",
      "executed": true,
      "actual_observations": ["obs_2"],
      "raw_result": { ... },
      "evidence_links": [
        { "evidence_id": "ev_1", "observation_id": "obs_2", "hypothesis_id": "hyp_1", "relationship": "SUPPORTS" }
      ]
    }
  ],
  "evidence": [
    {
      "id": "ev_1",
      "observation_id": "obs_2",
      "hypothesis_id": "hyp_1",
      "relationship": "SUPPORTS",
      "rationale": "Observed that external origin was accepted identically to intra-origin request."
    }
  ],
  "causal_notes": [
    { "step": 1, "component": "untrusted_origin", "role": "Attacker web page triggers state-changing POST request" },
    { "step": 2, "component": "user_agent_dispatch", "role": "Browser automatically attaches ambient session cookie" },
    { "step": 3, "component": "server_auth_decision", "role": "Server validates cookie, neglects origin provenance check" },
    { "step": 4, "component": "application_state_sink", "role": "Profile email state is mutated without user intent" }
  ],
  "capability": {
    "primitive": "Induce unauthorized state mutations on authenticated profile via ambient credential transmission",
    "impact": "Account takeover through password reset redirection to attacker-controlled email address",
    "impact_locked": false
  },
  "evaluation": {
    "status": "EVALUATED",
    "passed": true,
    "checks": { ... },
    "reasons": []
  }
}
```

### 3.2 Specimen Contract & Mutation Engine (`investigation/specimen.js`)

Every specimen satisfies the `Specimen` base class:
- `getBaseline()`: Returns documented normal request, response, and initial state.
- `getCurrentState()`: Returns current state snapshot.
- `reset()`: Deterministically restores initial state.
- `execute(mutation)`: Executes a mutated request bundle (`{ method, url, headers, removeHeaders, cookie, body }`) and returns a raw observation bundle containing `{ request, response, state_delta, raw_transcript }`.

#### Specimen 01: `specimen.profile_update_01`
- **Target**: `POST /api/profile/email`
- **Behavior**:
  - Requires `Cookie: session_id=sess_user_9921` (401 if missing/invalid).
  - Requires `POST` method (405 if GET/PUT/DELETE).
  - Requires valid email body parameter (400 if missing).
  - **Ignores Origin and Referer** headers.
  - Requires **zero** secondary anti-forgery tokens.
  - Mutates user profile email state on success.

#### Specimen 02 (Transfer): `specimen.api_webhook_02`
- **Target**: `POST /api/integrations/webhook`
- **Behavior**:
  - Requires `Cookie: session_id=sess_user_9921`.
  - JSON payload with `target_url` and `event_types`.
  - Accepts cross-origin requests and registers webhooks without anti-forgery validation.

---

## 4. Deterministic Evaluator Rubric (`investigation/evaluator.js`)

Evaluation uses a pure 10-check deterministic rubric with zero LLM dependence:

1. **`CHECK_HYPOTHESIS_COUNT`**: Must formulate $\ge 2$ competing hypotheses.
2. **`CHECK_HYPOTHESES_DISTINCT`**: Hypotheses must be substantively distinct (length $\ge 10$ chars, distinct text).
3. **`CHECK_EXPERIMENT_EXECUTED`**: At least 1 experiment was executed against the specimen.
4. **`CHECK_EXPERIMENT_PREDICTION`**: Falsifiable predictions (`prediction_if_true`, `prediction_if_false`, `why_informative`) recorded before execution.
5. **`CHECK_ACTUAL_OBSERVATIONS`**: Actual specimen response and state delta recorded.
6. **`CHECK_EVIDENCE_LINKED`**: Observations linked in the ledger as `SUPPORTS` or `REFUTES`.
7. **`CHECK_OBS_INF_DISTINCTION`**: Empirical observations tagged as `OBSERVATION` rather than pure inferences.
8. **`CHECK_HYPOTHESIS_UPDATED`**: Learner updated hypothesis status from `UNKNOWN` based on evidence.
9. **`CHECK_CAUSAL_ACCOUNT`**: Sequenced causal notes connecting external context $\to$ browser dispatch/credentials $\to$ server decision $\to$ state effect.
10. **`CHECK_CAPABILITY_PRIMITIVE`**: Behavioral primitive stated (minimum 10 chars); impact cannot be used as a substitute; anti-pattern check fails if learner merely writes the vulnerability name (`csrf`, `cwe-352`).
11. **`ANTI_PATTERN_PREMATURE_CONFIRMATION`**: Fails if any hypothesis was marked `CONFIRMED` with zero supporting evidence.

---

## 5. Reveal Gate & Correspondence Synthesis (`investigation/reveal.js`)

When evaluation passes:
1. `session.reveal_state` transitions from `LOCKED` to `UNLOCKED`.
2. Canonical topic data is loaded from `content/topics/csrf/topic.json`.
3. Synthesis mapping contrasts learner observations against canonical concepts:
   - Authority transmission $\leftrightarrow$ `concept.ambient-credentials`
   - Origin verification sink $\leftrightarrow$ `mechanism.origin-context-confusion`
   - Exploitability gates $\leftrightarrow$ Canonical Exploitability Boolean Gates
   - Causal sequence $\leftrightarrow$ Canonical 6-step causal chain
   - Canonical ASCII architecture diagrams presented.

---

## 6. Deliberately Omitted Features (Known MVP Limitations)

To keep the single investigation loop small, robust, and deterministic, the following were intentionally deferred:
- **No LLM semantic classification or grading**: Replaced with deterministic structural and state-transition rules.
- **No browser simulation / Puppeteer**: Parameterized HTTP mutation engine provides 100% deterministic testability with zero browser overhead.
- **No interactive textbook / multi-choice quizzes**: Preserves pure first-principles discovery.
- **No graph-isomorphism / generalized ontology engines**: Replaced with sequenced causal account nodes.
