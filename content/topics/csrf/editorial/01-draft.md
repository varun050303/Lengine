# Topic Specification Draft: Cross-Site Request Forgery (CSRF)

## 1. Executive Summary & Foundational Model
Cross-Site Request Forgery (CSRF) is an application-layer vulnerability rooted in **Origin-Context Confusion** (`mechanism.origin-context-confusion`). It occurs when a web application processes an authenticated, state-changing HTTP request under the false assumption that the request represents the intentional instruction of the authenticated user within the trusted application interface. In reality, the request is coerced or synthesized by an untrusted external origin that abuses the browser runtime's automated credential attachment mechanism (**ambient credentials**).

CSRF does not require an attacker to steal session identifiers, bypass cryptography, or compromise the server host. Instead, the attacker exploits the fundamental architectural asymmetry of the **Same-Origin Policy** (`concept.same-origin-policy`): while the SOP strictly blocks cross-origin reading of response data, it historically permits cross-origin sending of requests (e.g. standard HTML form submissions). When coupled with the browser's automated transmission of ambient credentials (`concept.ambient-credentials`), the victim's browser acts as a confused deputy, executing unauthorized state-changing operations on behalf of an external adversary.

## 2. Invariant & Causal Decomposition
- **Security Invariant**: A state-changing action must not be executed without verifying that the request was intentionally initiated by the user within the authentic application context.
- **Violation Condition**: The application executes a state-changing operation triggered by an incoming HTTP request using ambient session credentials, without validating an unpredictable, unforgeable origin-bound proof of user intent.
- **Minimum Causal Signature**:
  1. *Untrusted Origin*: Attacker hosts a malicious web page or script outside the target origin.
  2. *Victim User-Agent*: Holds valid, active ambient session credentials (cookies) for the target application.
  3. *Confused Dispatch*: Browser dispatches a cross-origin HTTP request to the target application, automatically attaching the victim's ambient session credentials.
  4. *Target Sink*: Server verifies session validity but fails to verify request provenance or proof of user intent, executing the state mutation.

## 3. Exploitability & Gate Logic
For an endpoint to be exploitable via CSRF, the following conditions must hold:
- **Condition 1 (AND)**: The target endpoint performs a state-changing operation (modifying account state, financial transfer, privilege escalation).
- **Condition 2 (AND)**: The application relies on ambient credentials (session cookies) for authentication.
- **Condition 3 (AND)**: The endpoint lacks effective unpredictable tokens (anti-CSRF tokens are omitted, unvalidated, or tied to attacker sessions).
- **Condition 4 (OR Gate - at least one required)**:
  - *Branch A*: SameSite=None is configured on the session cookie, allowing cross-site form POSTs.
  - *Branch B*: The state-changing operation can be triggered via HTTP GET (or accepts HTTP method switching), allowing top-level navigation CSRF under SameSite=Lax.
  - *Branch C*: The client runs in a legacy browser or executes within the 120-second Chromium Lax-allowing-unsafe window.
  - *Branch D*: The attacker controls a sibling subdomain capable of issuing same-site requests or performing cookie tossing.

## 4. Capability-Before-Impact Chain
1. **Primitive**: Cross-origin HTTP request dispatch with ambient session credentials attached.
2. **Capability 1 (State Modification)**: Ability to trigger arbitrary state mutations on behalf of the victim without inspecting the response body.
3. **Capability 2 (Account Takeover)**: Modifying email address or password reset endpoints to redirect account recovery tokens to attacker-controlled infrastructure.
4. **Capability 3 (Persistent Privilege Escalation)**: Creating administrative accounts or modifying access control lists.
5. **Impact**: Unauthorized financial loss, account hijacking, unauthorized data modification, and reputational damage.

## 5. Defensive Architecture
- **Primary Defense**: Synchronizer Token Pattern (STP) using cryptographically secure random nonces tied to the user's server-side session and embedded into forms/headers.
- **Cookie-Layer Defense**: `SameSite=Lax` (default) and `SameSite=Strict` on session cookies to withhold ambient authority during cross-site dispatches.
- **Platform-Layer Defense**: Fetch Metadata request headers (`Sec-Fetch-Site: same-origin` / `same-site`) evaluated at global API middleware.
- **Defense-in-Depth**: Step-up re-authentication (current password / MFA challenge) for critical state changes.
