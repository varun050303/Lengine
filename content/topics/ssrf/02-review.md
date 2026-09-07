# SSRF — Pass 2: Skeptical Review

**Pass**: 2 — Skeptical Review
**Reviewer role**: Senior AppSec engineer reviewing a junior pentester's study material
**Date**: 2026-09-07
**Input**: 01-draft.md only (reviewer did not see Pass 1 search trail or reasoning)

---

## Review

### Issue 1 — IMDSv2 mechanism underspecified

**Problem:** The draft mentions IMDSv2 requiring "a PUT request to obtain a session token" [S5] but does not explain *why* this blocks simple SSRF. A learner may not understand what makes IMDSv2 resistant.

**Why it matters:** IMDSv2's defense is the critical mechanism difference between "SSRF = instant credential theft" and "SSRF exists but credentials are protected." This is central to capability-chain reasoning.

**What should change:** Explain that IMDSv2 requires a PUT request with a custom header (X-aws-ec2-metadata-token-ttl-seconds) to obtain a token, and subsequent GET requests must include that token. Most SSRF primitives can only make GET requests (or follow redirects to GETs), and cannot set custom headers. This means IMDSv2 blocks the most common SSRF → credential-theft path. Note that some SSRF primitives (e.g., full HTTP request control) may still be able to make PUT requests with custom headers.

### Issue 2 — Missing defense analysis through assumptions

**Problem:** The draft has "failed attempts explained" (section 9) which covers a few bypass attempts, but lacks the systematic defense-as-assumption analysis specified in the project philosophy. The pipeline README says: "Ask: What assumption does this defense make?"

**Why it matters:** Understanding *why* a defense works (its assumption) is more valuable than knowing *that* it blocks an attempt. Without the assumption analysis, the learner may memorize "use allowlist" without understanding when allowlists themselves can fail.

**What should change:** Add a defense analysis section with at least these defenses: (1) IP blocklist, (2) hostname allowlist, (3) DNS resolution validation, (4) network segmentation. For each, state the defense, its assumption, and how that assumption can fail.

### Issue 3 — Blind SSRF treatment is shallow

**Problem:** The draft mentions blind SSRF in several places but does not explain how to actually investigate or confirm blind SSRF. The investigation experiments assume response content is observable (Experiment 2 says "observe the response"). A large proportion of real-world SSRF findings are blind.

**Why it matters:** In bug bounty and BSCP, blind SSRF is common. The investigation model must handle the case where the response is not visible.

**What should change:** Add a subsection or variant specifically addressing blind SSRF investigation: (a) using OOB callbacks to confirm the primitive exists, (b) using timing/error differences to map internal services, (c) using side-effects on internal services (e.g., deleting resources via SSRF POST to internal admin APIs). Also distinguish the capability chain for blind vs. full-response SSRF.

### Issue 4 — Missing variants section

**Problem:** The draft does not include variants (the schema's optional "variants" extension). While variants are optional per the Minimum Viable Topic spec, SSRF has genuinely distinct variants that affect investigation methodology and impact: full-response SSRF, blind SSRF, partial SSRF (partial URL control), and SSRF via data formats (XXE, SVG).

**Why it matters:** A learner encountering blind SSRF and applying full-response investigation techniques will fail. The variants genuinely change the investigation approach.

**What should change:** Add 2-3 variants: (1) Full-response SSRF, (2) Blind SSRF, (3) Partial URL SSRF (where only hostname or path is attacker-controlled). Each needs mechanism detail and investigation methodology differences.

### Issue 5 — Investigation Experiment 2 could be more cautious

**Problem:** Experiment 2 suggests requesting `http://169.254.169.254/latest/meta-data/` which returns IAM metadata. In a real engagement, immediately requesting credential paths could be considered unnecessarily aggressive before confirming the basic capability.

**Why it matters:** The pipeline emphasizes safe, minimal experiments. Requesting the metadata directory listing is reasonable, but the draft should note that requesting the full credential path (/latest/meta-data/iam/security-credentials/<role>) should only be done after the basic vulnerability is confirmed and you have authorization to demonstrate impact.

**What should change:** Adjust Experiment 2 to recommend the metadata root path first (which returns a directory listing, not credentials), and note that credential retrieval should be a deliberate impact-demonstration step, not a discovery step.

### Issue 6 — RFC 3986 claim could be more specific

**Problem:** Source S1 (RFC 3986) is cited for the concept of URI syntax, but no specific section number is referenced in the draft. The claim is broadly correct but doesn't demonstrate that the draft actually consulted the RFC rather than just listing it.

**Why it matters:** Source integrity rules require specific claims traceable to actual content.

**What should change:** Reference specific RFC 3986 sections: §3.2 (Authority) for the userinfo@host:port decomposition, §3.2.1 (User Information) for the '@' delimiter behavior, §2.1 (Percent-Encoding) for encoding rules. These are directly relevant to the URL parsing disagreements that enable SSRF filter bypasses.

### Issue 7 — Understanding test / novel scenario missing

**Problem:** The draft does not include understanding tests or novel scenarios. While these are optional extensions, the project spec says "Every sufficiently mature topic should have at least one scenario that is not copied from the explanation." The SSRF draft is the first topic and should model best practices.

**Why it matters:** Understanding tests are the strongest protection against memorization. Including one in the first topic establishes the pattern.

**What should change:** Add at least one novel scenario and one understanding-test question that requires mechanistic reasoning, not vulnerability-name recognition.

### Issue 8 — Transfer section should link to concepts more explicitly

**Problem:** The transfer section lists many application features where SSRF could appear (webhooks, PDF generators, etc.) but doesn't explicitly connect back to the prerequisite concepts (URL parsing, DNS resolution, HTTP redirects, network trust boundaries) to show how those concepts predict SSRF in unfamiliar contexts.

**Why it matters:** The transfer should not just be a list of "places SSRF happens" — it should teach the learner to derive those places from the mechanism.

**What should change:** Add a transferable reasoning chain: "Look for any feature where (1) user input influences a destination [url-parsing concept], (2) a server-side component makes a request [network-trust-boundaries concept], and (3) the request can reach restricted destinations." The list of specific features then becomes examples of applying that reasoning.

---

## Summary

8 issues identified. Priorities:

1. **Issue 2** (defense-as-assumption analysis) — High. Core project philosophy gap.
2. **Issue 1** (IMDSv2 mechanism) — High. Critical capability-chain reasoning.
3. **Issue 3** (blind SSRF depth) — High. Common real-world scenario.
4. **Issue 4** (variants) — Medium-high. Genuinely distinct investigation approaches.
5. **Issue 7** (understanding test) — Medium. Sets the template for all future topics.
6. **Issue 5** (experiment caution) — Medium. Safety methodology.
7. **Issue 8** (transfer reasoning) — Medium. Teaching quality.
8. **Issue 6** (RFC specificity) — Low. Source hygiene.
