# SSRF — Pass 3: Arbitration

**Pass**: 3 — Arbitration
**Date**: 2026-09-07
**Input**: 01-draft.md + 02-review.md

---

## Issue 1 — IMDSv2 mechanism underspecified

**Decision: ACCEPT**

The reviewer is correct. The draft mentions IMDSv2 but doesn't explain *why* it blocks SSRF credential theft. The capability chain explicitly requires the learner to understand where the chain can break. IMDSv2's PUT-with-header requirement is exactly the kind of "what assumption does this defense make" analysis the project demands.

**Change required:** In the capability chain section, add an explanation of why IMDSv2 breaks the SSRF → credential path: it requires a PUT request with a custom header to get a token, and most SSRF primitives only support GET (or GET-via-redirect). Note that IMDSv2 is not a complete SSRF fix — it protects credentials specifically, not internal network access generally.

---

## Issue 2 — Missing defense analysis through assumptions

**Decision: ACCEPT**

This is a significant gap. The anti-HackTricks rule says "never introduce a technique before explaining the condition that makes it work." The corollary for defenses is "never recommend a defense without explaining the assumption it depends on." The draft has "failed attempts" which are close but don't systematically cover the assumption → failure model.

**Change required:** Add a defense analysis section covering: (1) IP blocklist (assumption: all internal representations are blocked), (2) hostname allowlist (assumption: allowed hostnames cannot be manipulated), (3) DNS validation (assumption: DNS is stable between check and connect), (4) network segmentation (assumption: server cannot reach sensitive services). Each with assumption, failure mode, and investigation question.

---

## Issue 3 — Blind SSRF treatment is shallow

**Decision: ACCEPT**

Blind SSRF is common in practice and materially changes the investigation methodology. The draft's investigation model implicitly assumes the attacker can read the response. Blind SSRF requires distinct experiments (OOB callbacks, timing, error-based inference).

**Change required:** Add blind SSRF as a variant (or integrate into the investigation section) with: (a) how to confirm the primitive exists without response content, (b) how to infer reachability via timing/error, (c) capability limitations of blind vs. full-response SSRF.

---

## Issue 4 — Missing variants section

**Decision: ACCEPT (partially)**

Full-response and blind SSRF are genuinely distinct variants that change investigation methodology. Partial SSRF (partial URL control) is also a meaningful variant. However, "SSRF via data formats" is better addressed through the XXE crosslink and the concept of "hidden attack surface" already in the investigation section.

**Change required:** Add 2 variants: (1) Full-response SSRF, (2) Blind SSRF. Mention partial URL control as a note in the investigation section rather than a full variant. XXE-triggered SSRF should remain a crosslink, not a variant.

---

## Issue 5 — Investigation Experiment 2 could be more cautious

**Decision: ACCEPT**

The reviewer's point about safe methodology is valid. The metadata root path (/latest/meta-data/) returns a directory listing which is sufficient to confirm cloud metadata access. Requesting credential paths should be a deliberate impact-demonstration step.

**Change required:** Modify Experiment 2 to explicitly recommend the metadata root path first and note that credential retrieval is an impact-demonstration step requiring confirmed authorization.

---

## Issue 6 — RFC 3986 claim could be more specific

**Decision: ACCEPT**

Specific section references strengthen source integrity. This is a low-effort improvement.

**Change required:** Add RFC 3986 §3.2 (Authority), §3.2.1 (User Information), §2.1 (Percent-Encoding) references where URL parsing disagreements are discussed.

---

## Issue 7 — Understanding test / novel scenario missing

**Decision: ACCEPT**

The first topic should model best practices. Including at least one novel scenario and understanding test is important for establishing the pattern.

**Change required:** Add one novel scenario (unfamiliar application, requires mechanistic reasoning) and one "explain without using the vulnerability name" prompt.

---

## Issue 8 — Transfer section should link to concepts more explicitly

**Decision: ACCEPT**

The reviewer correctly identifies that the transfer section is currently a list of "places SSRF happens" rather than a reasoning chain. The list should be derivable from the mechanism + concepts, not memorized.

**Change required:** Add a transferable reasoning chain before the list: "Look for any feature where (1) user input influences a destination, (2) a server-side component makes a request, and (3) the request can reach restricted destinations." Then present the specific features as examples of applying that reasoning.

---

## Summary

All 8 issues accepted (1 partially). No criticisms rejected — all were substantive and aligned with project philosophy.

**Priority for Pass 4 revision:**
1. Defense-as-assumption analysis (Issue 2)
2. IMDSv2 mechanism detail (Issue 1)
3. Blind SSRF variant (Issues 3 + 4)
4. Understanding test + novel scenario (Issue 7)
5. Transfer reasoning chain (Issue 8)
6. Experiment 2 caution (Issue 5)
7. RFC specificity (Issue 6)
