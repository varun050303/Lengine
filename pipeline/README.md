# Lengine Content Pipeline

## The Anti-HackTricks Rule

> **Never introduce a technique before explaining the condition that makes the technique work.**

This is the single most important rule in the entire pipeline.

---

## Four-Pass Process

### Pass 1 — Research + Construct

The writer must follow this ordering:

```
Research (real retrieval calls — not from memory)
        ↓
Establish technical facts (sourced claims)
        ↓
Identify the security invariant
        ↓
Map the trust boundary
        ↓
Construct the causal mechanism
        ↓
Model exploitability conditions
        ↓
Design the investigation model
        ↓
Analyze defenses through their assumptions
        ↓
Write the core topic (10 mandatory sections)
        ↓
Add optional extensions only where they improve understanding
```

Pass 1 is not "write everything you know."

It is "build the smallest complete reasoning model."

### Output

`01-draft.md` + `sources.json`

---

### Pass 2 — Skeptical Review

The reviewer receives the draft **without** the writer's search trail or reasoning.

Review for:

**Accuracy**
- Is the mechanism technically correct?
- Are causal claims supported by sources?
- Are prerequisites correctly identified?

**Reasoning quality**
- Can the learner derive the conclusion from the explanation?
- Are competing hypotheses genuinely distinguishable?
- Are experiments actually informative?

**Boundaries**
- Is the trust boundary correctly identified?
- Is attacker authority overstated?
- Is impact conditionality clear?

**Teaching quality**
- Does the explanation teach mechanism before technique?
- Could a learner mistake the example for the definition?
- Are counterexamples meaningful?

The reviewer should prioritize **substantive problems**, not produce an exhaustive checklist.

### Output

`02-review.md` — numbered list of concrete issues with problem/reason/change-required.

---

### Pass 3 — Arbitration

Every significant review criticism is classified:

```
ACCEPT   — criticism is correct, change required
REJECT   — criticism is invalid or pedantic
MODIFY   — criticism is partially valid, adjusted change
```

For each:

```
Problem:
Reason:
Decision:
Change required (if any):
```

### Output

`03-arbitration.md`

---

### Pass 4 — Revision + Quality Gate

Apply accepted changes. Run quality gate. Produce final JSON.

### Output

`04-final.json` — must satisfy the quality gate.

---

## Source Hierarchy

### Tier 1 — Standards and specifications
RFCs, WHATWG, W3C, official protocol/language specifications.

### Tier 2 — Primary security references
PortSwigger Web Security Academy, OWASP Testing Guide, OWASP Top 10, OWASP Cheat Sheets.

### Tier 3 — Official implementation documentation
Browser docs, framework docs, server/proxy docs, cloud-provider docs.

### Tier 4 — High-quality technical research
Security research papers, conference talks, original disclosures.

### Tier 5 — Secondary sources
Use only when higher tiers lack coverage. Must not override higher-tier sources.

---

## Source Integrity Rules

- Never fabricate a source or URL
- Never invent an RFC section number
- Never claim a source was consulted if it was not actually retrieved this pass
- Every Tier 1-3 claim must have `retrieved_this_pass: true`
- If a claim cannot be verified, qualify it as uncertain or omit it

---

## Session Budget

Hard cap: **1-2 topics** through all four passes per session.

This pipeline is deliberately expensive per topic. That expense is what separates it from a payload dump.

Check `_manifest.json` before starting a session.

---

## Minimum Viable Topic — 10 Mandatory Sections

```
1. Mental Model
2. Security Invariant
3. Normal vs Vulnerable Behavior
4. Causal Mechanism
5. Investigation
6. Exploitability / Preconditions
7. Confirmation
8. Capability / Impact
9. Common Traps
10. Transfer
```

Everything else is conditional — added only when it genuinely improves understanding.

> A section exists because it improves understanding, not because the schema has a field for it.
