# SSRF — Pass 1: Deep Draft

**Pass**: 1 — Research + Construct
**Author**: Writer
**Date**: 2026-09-07
**Sources retrieved**: RFC 3986, PortSwigger SSRF, OWASP SSRF, OWASP SSRF Prevention Cheat Sheet, AWS IMDS documentation

---

## 1. Mental Model

**One sentence:**
SSRF occurs when an application that makes server-side network requests allows an attacker to influence the request destination, causing the server to use its privileged network position on the attacker's behalf.

**Short explanation:**
An application accepts input that determines where it sends a server-side network request. The server has a privileged network position — it can reach internal services, cloud metadata endpoints, and localhost services that external attackers cannot. When the attacker controls the destination, the server becomes an unwitting proxy: the request arrives at the target from a trusted internal IP, regardless of who initiated it. The attacker gains the server's network authority without gaining the server's identity.

**Core diagram:**
```
Attacker
   │
   │ controls destination
   ▼
Application
   │
   │ makes request from trusted position
   ▼
Server-side HTTP client
   │
   ▼
Destination attacker cannot reach directly
   │
   ▼
Internal service / cloud metadata / localhost
```

**Analogy:**
You give a delivery address to an employee who has badge access to restricted buildings. The employee delivers your package to the address you specified — inside a building you cannot enter yourself. The building's security checks the employee's badge, not your identity.

**Where the analogy breaks:**
Real SSRF involves URL parsing, DNS resolution, HTTP redirect following, multiple protocol support, response handling, and the distinction between full-response and blind variants. The "employee" may also follow redirect signs (HTTP redirects) that change the effective destination after initial validation.

---

## 2. Security Invariant

**Statement:** Attacker-controlled input must not give an external actor unauthorized use of the server's network position.

**Why it matters:** The server's network position is privileged — it includes access to internal networks, cloud metadata endpoints (169.254.169.254 [S5]), localhost services, and systems protected by network-layer access controls. This position exists because the application legitimately needs to communicate with backend systems. Unauthorized use of this position allows the attacker to read internal data, steal cloud credentials, interact with internal services, and bypass network segmentation.

**Violation condition:** Attacker-controlled input determines the destination of a server-side request without adequate validation. The server makes the request using its network position, crossing the trust boundary between the external attacker and the internal network.

**Investigation question:** Can an external actor cause the server to make a network request to a destination the actor specifies, and does that destination include addresses the actor could not reach directly?

---

## 3. Normal vs. Vulnerable Behavior

**Normal behavior:**
The application fetches data from a predetermined, trusted backend URL. User input may influence query parameters or path segments, but the destination host is hardcoded or selected from a strict allowlist. The server's network position is not exposed to attacker control.

```
User request → Application → Hardcoded backend URL → Trusted internal service
                                                        ↓
                                                   Response processed
```

**Vulnerable behavior:**
The application accepts a user-supplied URL (or URL component) and passes it to a server-side HTTP client. The user controls the destination host. The server makes the request from its internal network position.

```
Attacker-supplied URL → Application → Server-side HTTP client → Attacker's chosen destination
                                                                    ↓
                                                            Internal service responds
                                                            to trusted internal IP
```

**What changes:** In the normal case, the destination is application-controlled. In the vulnerable case, the destination is attacker-controlled. The server's network position is the same in both cases — the difference is who controls where that position is used.

---

## 4. Causal Mechanism

**Steps (what is actually happening):**

1. Attacker supplies a value through an application input — a URL, hostname, IP address, or port — in a parameter, header, or data format that influences a server-side request destination.
2. The application receives this value. It may validate, transform, or pass it through unchanged.
3. The value reaches a server-side HTTP client (or other protocol client) — the sink.
4. The HTTP client parses the URL, resolves DNS, and initiates a network connection.
5. The connection originates from the server's network interface. The destination sees a request from a trusted internal IP.
6. If the destination is an internal service, cloud metadata endpoint, or localhost service, it responds as if the request came from a legitimate internal component.
7. The attacker observes the result — either the response content (full SSRF), timing/error differences (blind SSRF), or an out-of-band callback.

**Data flow:**
```
Source: User-controlled parameter (stockApi, url, webhook, callback, imageUrl, etc.)
   ↓
Transformations: URL validation (if any), URL parsing, DNS resolution
   ↓
Parser/component: Server-side HTTP client (urllib, requests, HttpClient, curl, fetch)
   ↓
Sink: Outbound network connection from server's interface
   ↓
Result: Request reaches restricted destination using server's network authority
```

**Trust transformation:**
```
Attacker data:     A string (URL, hostname, IP)
Parser:            URL parser → DNS resolver → HTTP client
New meaning:       A network destination
Authority gained:  Server's network position (internal reachability + ambient credentials)
Effect:            Request to a destination the attacker cannot reach directly
```

---

## 5. Investigation

### Attack surface — where to look

- Any feature that accepts a URL as input (webhook configuration, URL preview, "fetch from URL" import, image URL, PDF generation from URL, API callback URL, link checker) [S2]
- Parameters containing full or partial URLs (stockApi=, url=, callback=, next=, dest=, redirect=, uri=, path=, imageUrl=)
- Features that display or process remote content server-side
- Data formats that support URL references (XML with external entities, SVG with external references, HTML import) [S2]
- HTTP headers that may influence server-side requests (Referer header used for analytics fetching) [S2]
- Partial URL components in parameters (hostname-only, path-only) that are assembled server-side into a full URL [S2]

### Competing hypotheses

When you observe an application feature that appears to fetch remote content:

| ID | Hypothesis | Predicted observation |
|----|-----------|----------------------|
| H1 | Browser fetches the URL (client-side) | Callback from your browser IP |
| H2 | Application server fetches the URL | Callback from application server IP |
| H3 | Third-party service fetches the URL | Callback from CDN/proxy IP |
| H4 | URL is stored but never fetched | No callback received |

### Minimal experiments

**Experiment 1 — Is there a server-side request primitive?**

Hypothesis: The application passes my input to a server-side HTTP client (H2).

Experiment: Supply a URL pointing to a server you control (Burp Collaborator, webhook.site, or your own callback server).

| Observation | Inference |
|------------|-----------|
| Callback from application server IP | H2 confirmed — server-side request exists |
| Callback from your browser IP | H1 — client-side fetch, not SSRF |
| Callback from CDN/proxy IP | H3 — investigate further |
| No callback | H4, or input doesn't reach a request sink |

Information gain: This single experiment can distinguish all four hypotheses.

Next experiment: If H2 confirmed → test internal destination reachability.

**Experiment 2 — Can the request reach restricted destinations?**

Hypothesis: The server-side request can reach internal addresses.

Experiment: Supply `http://127.0.0.1` or the cloud metadata IP `http://169.254.169.254/latest/meta-data/` and observe the response or error pattern.

| Observation | Inference |
|------------|-----------|
| Response contains localhost content or metadata | Internal network reachable — SSRF confirmed |
| Response differs from external-URL response (different error, different timing) | Suggests internal reachability with partial visibility |
| Same error as external URL / request blocked | Validation may be preventing internal destinations |

Next experiment: If blocked → investigate validation bypass (see defense analysis).

### Decision tree

```
Does the application accept a URL or hostname as input?
│
├─ NO → Look for indirect URL influence:
│        XML entities, partial URLs, Referer header,
│        stored URLs in data formats
│
└─ YES → Does the server make an outbound request
          when you supply a URL to your callback server?
          │
          ├─ NO → Input may not reach a request sink.
          │        Try different parameters, methods, encoding.
          │
          └─ YES → Does the request originate from the
                    server's IP (not your browser)?
                    │
                    ├─ NO → Client-side fetch. Not SSRF.
                    │
                    └─ YES → Can you direct the request
                              to an internal/restricted address?
                              │
                              ├─ NO → Validation may be blocking.
                              │        Investigate bypass techniques.
                              │
                              └─ YES → Can you observe the
                                        response or a side-effect?
                                        │
                                        ├─ YES → Full SSRF.
                                        │         Determine impact.
                                        │
                                        └─ NO → Blind SSRF.
                                                 Impact depends on
                                                 triggerable side-effects.
```

---

## 6. Exploitability / Preconditions

**Conditions (AND unless marked OR):**

1. **Attacker controls the destination** — URL, hostname, or IP in a parameter that influences the server-side request target
2. **Input reaches a server-side request primitive** — the value is actually passed to an HTTP client, not just stored or displayed
3. **Server has a privileged network position** — it can reach destinations the attacker cannot (internal services, metadata, localhost)
4. **Restricted destination is reachable from the server** — the target service is running and network-accessible from the server's network
5. **Observable capability exists** (OR gate):
   - Response content returned to attacker (full-response SSRF), OR
   - Out-of-band callback observable (blind SSRF with OOB), OR
   - Timing or error differences observable (blind SSRF with inference), OR
   - Meaningful side-effect triggerable on the internal service (blind SSRF with side-effect)

**Gate rule:** If any AND condition is false, the attack path breaks. Within the OR group, at least one must be true for exploitability.

---

## 7. Confirmation

**Candidate vs. confirmed:**
- **Candidate**: Application accepts a URL and appears to fetch it.
- **Confirmed**: Server makes a request to an attacker-specified destination from its own network position, and the attacker can demonstrate that the request crossed the network trust boundary (reached an internal address or service the attacker cannot reach directly).

**What must be proven:**
1. The request originates from the server, not the client browser
2. The attacker can influence the destination
3. The destination includes addresses the attacker cannot reach directly
4. The result (response, timing, callback, side-effect) is observable

**Evidence hierarchy:**
| Strength | Evidence |
|----------|----------|
| Strong | Response contains content from an internal service (cloud metadata credentials, internal admin panel) |
| Strong | Out-of-band callback received from server IP to attacker-controlled destination with internal address in the request |
| Moderate | Timing/error differences between internal and external destinations (e.g., connection refused for closed internal port vs. timeout for external) |
| Weak | Application accepts a URL parameter and fetches external content (proves server-side request, but not internal reachability) |
| Insufficient | URL parameter exists in the application (does not prove it reaches a request sink) |

**Safe confirmation:**
Point the URL parameter at your own callback server (Burp Collaborator, webhook.site). Verify the request arrives from the target application's server IP, not your browser IP. Then test reachability of an internal address — preferably one that returns a distinctive, non-sensitive response (e.g., the metadata endpoint path, which returns a directory listing rather than credentials).

---

## 8. Capability and Impact

**Primitive:** Server-side request to an attacker-controlled destination from the server's network position.

**Capability chain:**
```
SSRF primitive
    ↓
Server-originated request from trusted IP
    ↓ (+ internal service is running and reachable)
Internal network reachability
    ↓ (+ response returned or side-effect observable)
Read internal service responses / trigger internal actions
    ↓ (+ cloud metadata endpoint accessible)
Cloud credential retrieval (IAM role credentials via 169.254.169.254) [S5]
    ↓ (+ IAM role has meaningful permissions)
Cloud account actions using stolen credentials
```

Each arrow represents an additional prerequisite. Impact is NOT automatic — it depends on:

- Whether response content is returned (full vs. blind)
- What internal services are reachable from the server
- Whether internal services require authentication from the server's IP
- Whether the server has ambient credentials (cloud IAM roles, service accounts)
- Whether the IAM role has meaningful permissions
- Whether the attacker can chain SSRF with other vulnerabilities

**Impact conditions:**
- Full-response SSRF + cloud metadata with IMDSv1 → high/critical (credential theft) [S5]
- Full-response SSRF + internal admin panel without auth → high (internal access)
- Blind SSRF + out-of-band only → low-medium (confirms vulnerability, limited direct impact)
- Blind SSRF + triggerable state changes on internal services → medium-high
- SSRF blocked by effective validation → no impact

---

## 9. Common Traps

### Misconceptions

| Misconception | Why wrong | Correct model |
|--------------|-----------|---------------|
| "SSRF means accessing localhost" | SSRF exploits the server's entire network position — internal APIs, adjacent services, cloud metadata, any restricted destination — not only localhost | The vulnerability is destination control + privileged network position |
| "SSRF always returns the response" | Blind SSRF does not return response content. Impact depends on side-effects, timing, or OOB callbacks | Full vs. blind is a spectrum of observability, not a binary |
| "SSRF = automatic cloud takeover" | Cloud credential theft requires: (1) cloud environment, (2) metadata endpoint accessible (IMDSv2 may block simple GET), (3) IAM role attached, (4) role has meaningful permissions | Impact depends on the capability chain, not the vulnerability class alone |
| "Blocklisting internal IPs prevents SSRF" | Blocklists are bypassable via DNS rebinding, alternative IP representations, redirects, URL parsing tricks | Allowlists are more robust; blocklists create a cat-and-mouse game |

### False positives

| Observation | Incorrect conclusion | Why incorrect | What to verify next |
|------------|---------------------|---------------|---------------------|
| URL parameter in request | "Server fetches this URL" | The URL may be used for display, logging, or client-side redirect — never passed to a server-side request primitive | Send a callback-server URL; check if the server makes a request |
| Application displays remote page content | "Server-side fetch = SSRF candidate" | The fetch may be performed client-side (browser JavaScript), not server-side. No trust boundary is crossed if the browser fetches | Check the source IP at your callback server: server IP vs. browser IP |
| Server makes request to your callback | "SSRF confirmed" | Server-side request exists, but SSRF requires reaching a restricted destination. If internal addresses are all blocked, the trust boundary is maintained | Test internal destination reachability (127.0.0.1, metadata IP) |
| Application has a webhook feature | "Webhook = SSRF" | Webhook URLs may be validated against an allowlist, fetched asynchronously by a sandboxed service, or never used for inbound data retrieval | Determine whether the webhook fetch comes from the application server and reaches internal destinations |

### Failed attempts explained

| Attempt | Result | Why | Lesson |
|---------|--------|-----|--------|
| Supply `http://127.0.0.1` directly | Blocked / error | Application validates against an internal-IP blocklist before making the request | Validation occurs before the sink. Investigate whether the validator and sink disagree on the destination (URL parsing tricks, DNS rebinding, redirects) |
| Use DNS rebinding (short-TTL hostname) | Still blocked | Application re-resolves DNS after validation, or validates the resolved IP rather than the hostname | Defense validates at the correct layer (resolved IP, not hostname string). This is effective defense-in-depth |
| Use `http://127.0.0.1` with URL encoding (%31%32%37...) | Still blocked | Application normalizes/decodes the URL before validation | Validation handles encoding correctly. Try other representation disagreements (decimal IP, IPv6, redirect chain) |

---

## 10. Transfer

**Shared mechanism:** Trust-boundary confusion — attacker-controlled input causes a privileged component to act using its authority on the attacker's behalf.

**Related topics:**
| Topic | Shared principle |
|-------|-----------------|
| XXE | XML external entities trigger server-side requests to attacker-controlled URLs — SSRF via XML parser as the input vector |
| Open redirect | Attacker controls a URL destination, but the trust boundary is the user's browser trust rather than the server's network position |
| OAuth | redirect_uri manipulation exploits URL validation gaps similar to SSRF URL validation bypasses |

**Where else could this mechanism appear?**
The learner should ask: "Does any server-side component make network requests using attacker-influenced input?"

- Webhook URL configuration
- PDF/image generators that fetch remote resources
- File import from URL
- API proxy / gateway URL parameters
- Email sending (SMTP header injection via URL-like inputs)
- Headless browser screenshot/rendering services
- Document processors (DOCX, SVG with external references)
- OAuth/OIDC callback URL configuration
- RSS/Atom feed fetchers
- Link preview / URL unfurling features
- Cloud function triggers with URL parameters

**Transferable principle:** Whenever a server-side component makes a network request using attacker-influenced input, ask: can the attacker reach a destination they could not reach directly? The answer depends on the server's network position, the attacker's control over the destination, and the effectiveness of validation between the input and the sink.

---

## Sources

See `sources.json` for full source registry.
