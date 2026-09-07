# Lengine — Security Reasoning Knowledge System

> **The goal is not to teach the learner how to recognize known vulnerabilities.**
>
> The goal is to teach the learner how to reason from an unfamiliar application toward a vulnerability they have never studied before.

Lengine is a content-first security knowledge system for pentesting and bug-bounty learning.

It is deliberately **not** a payload cheat sheet, exploit cookbook, or HackTricks clone.

The primary unit of knowledge is not the vulnerability name.

It is the **mechanism that causes a security property to fail**.

---

## Core Philosophy

Every topic should help the learner answer:

1. **What is the system supposed to guarantee?**
2. **What does the system trust?**
3. **What does the attacker control?**
4. **Where does attacker-controlled data go?**
5. **How is that data interpreted?**
6. **What security decision depends on that interpretation?**
7. **What observation would prove or disprove the hypothesis?**
8. **What capability does the attacker actually gain?**
9. **Where can the attack chain be broken?**
10. **Where else could the same mechanism appear?**

---

## The Anti-HackTricks Rule

> **Never introduce a technique before explaining the condition that makes the technique work.**

The technique is an example derived from the mechanism. The mechanism is the knowledge.

---

## Architecture

```
Lengine_v1/
│
├── content/
│   ├── _manifest.json              # Topic status tracking
│   ├── _mechanism_families.json    # Cross-cutting mechanism index
│   ├── _crosslinks.json            # Topic ↔ topic relationships
│   │
│   ├── concepts/                   # Atomic reusable building blocks
│   ├── mechanisms/                 # Reusable causal pattern families
│   └── topics/                     # Vulnerability-specific reasoning models
│       └── <topic-slug>/
│           ├── 01-draft.md
│           ├── 02-review.md
│           ├── 03-arbitration.md
│           ├── 04-final.json
│           ├── sources.json
│           └── diagrams/
│
└── pipeline/                       # Pipeline documentation and schemas
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

---

## Definition of Done

The project is successful when a learner can take an unfamiliar scenario and reason:

```
What does the application do?
  → What does it trust?
  → What does the attacker control?
  → Where does that input go?
  → How is it interpreted?
  → What security invariant could fail?
  → What hypothesis follows?
  → What is the smallest useful experiment?
  → What capability was established?
  → What remains unproven?
  → Where could the attack chain be broken?
  → Where else could this mechanism appear?
```

The learner should not need the vulnerability's name in order to begin.
