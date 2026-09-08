# Pass 1 — Construct: HTTP Host Header Attacks

## Why this topic was chosen second

Per `pipeline/contracts.md` and the original implementation plan (Section 33), the second
topic's primary purpose is not to add coverage — it is to stress-test whether
`mechanism.trust-boundary-confusion`, defined against SSRF, genuinely transfers to a
structurally different vulnerability class, or whether the mechanism definition was
implicitly SSRF-shaped and needs correction.

Host Header Attacks was selected specifically because it shares the same root cause
(attacker-controlled input trusted without validation for a security-relevant decision)
while manifesting completely differently:

- SSRF: the server performs a **network fetch** to an attacker-chosen destination,
  gaining the attacker access to the server's own network position.
- Host header attacks: the server **generates or caches content** (a URL, a cached
  response) using an attacker-chosen value, and a **third party** (a victim's inbox,
  a future cache visitor) — not the attacker — is the one who acts on it.

## Research basis

Facts grounding this draft were verified against:
- PortSwigger Web Security Academy's canonical treatment of password reset poisoning
  and Host header attacks (tier 2)
- RFC 9112 §3.2.2 / §7.2 on request-target precedence over the Host header (tier 1)
- A historical Django Host-header parsing defect (userinfo syntax) as a concrete
  implementation-variance example (tier 2)

## Key drafting decision flagged for review

The draft required broadening `mechanism.trust-boundary-confusion`'s stated
`authority_transition` language, which was written narrowly around "the component
executes the operation using its own ambient authority" — a phrase that reads as
specific to server-side network fetches (SSRF, XXE). Host header attacks do not
involve the server performing an operation *on the attacker's behalf against a third
party*; they involve the server **producing output** that a third party is later
induced to trust. This is flagged as an explicit arbitration item in
`03-arbitration.json` rather than silently forced to fit, per the anti-completeness-
over-correctness principle in the project's own design rules.
