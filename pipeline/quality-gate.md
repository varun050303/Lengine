# Quality Gate

Before a topic ships as `04-final.json`, it must satisfy all of the following.

## Core Quality

- [ ] Mechanism is technically correct
- [ ] Security invariant is explicit and testable
- [ ] Normal and vulnerable behavior are clearly distinguishable
- [ ] Exploitability conditions are complete and correctly modeled
- [ ] Investigation teaches hypothesis formation, not payload selection
- [ ] Confirmation distinguishes suspicion from evidence
- [ ] Capability is separated from impact (impact is conditional)
- [ ] Important misconceptions and false positives are addressed
- [ ] Transfer to unfamiliar contexts is demonstrated
- [ ] Techniques are explained through the conditions that make them work

## Anti-Pattern Check

- [ ] No payload dump (list of payloads without mechanism explanation)
- [ ] No unexplained bypass catalog
- [ ] No decorative diagrams
- [ ] No padding to satisfy schema fields
- [ ] No exaggerated severity claims
- [ ] No technique introduced before its enabling condition
- [ ] No source with `retrieved_this_pass: false` on a Tier 1-3 claim
- [ ] No fabricated or unverified source

## Reasoning Chain Test

The content must allow the learner to answer all of these:

1. What security property is the system supposed to guarantee?
2. What is trusted and what is untrusted?
3. What attacker-controlled input is involved?
4. Where does that input travel?
5. What transforms or interprets it?
6. What exact behavior causes the failure?
7. What conditions must coexist for exploitability?
8. How would I identify a candidate target?
9. How would I safely confirm the hypothesis?
10. What observations would be misleading?
11. What determines actual impact?
12. How is the underlying problem mitigated?
13. Could I explain the mechanism without memorizing a payload?
14. Where else could this mechanism appear?

## Understanding Test

If the topic includes an understanding test:

- [ ] A learner who understands the mechanism CAN answer the test
- [ ] A learner who only memorized payloads CANNOT answer the test

## Failure Handling

If the topic fails the gate after Pass 4:
1. Loop back to the failing pass
2. Maximum 2 revision loops
3. If still failing after 2 loops, set status to `flagged_for_manual_review`
4. Do not ship degraded content silently
