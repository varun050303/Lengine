export const MERMAID_DIAGRAMS: Record<string, string> = {
  diag_1: `sequenceDiagram
    autonumber
    actor Attacker as 🔴 Attacker (evil.com)
    actor Victim as 👤 Victim User
    participant Browser as 🌐 Victim Browser (Confused Deputy)
    participant Server as 🟢 Target Server (bank.com)

    Note over Attacker,Victim: Step 1: Lure & Delivery
    Attacker->>Victim: Phishing link / Malicious Ad
    Victim->>Browser: Navigates to evil.com
    Browser->>Attacker: GET https://evil.com/exploit.html
    Attacker-->>Browser: 200 OK: HTML with auto-submitting hidden form

    Note over Browser: Step 2: Coerced Client Execution
    Browser->>Browser: DOM executes document.forms[0].submit()
    Note over Browser: Cookie Jar: matches bank.com<br/>Automatically attaches session_id=XYZ

    rect rgb(35, 25, 30)
        Note over Browser,Server: ⚡ CROSS-ORIGIN TRUST BOUNDARY
        Browser->>Server: POST https://bank.com/transfer<br/>Headers: Cookie: session_id=XYZ, Origin: https://evil.com<br/>Body: recipient=attacker&amount=5000
    end

    Note over Server: Step 3: Server Conflation Flaw
    Server->>Server: 1. Checks Cookie: session_id -> Valid (Victim session!)<br/>2. OMITS Origin / Referer check<br/>3. OMITS Anti-CSRF Token check!
    Server->>Server: Executes state mutation: Transfer $5,000!

    Server-->>Browser: 302 Found / 200 OK: "Transfer Completed"
    Note over Browser,Attacker: Step 4: Asymmetric SOP
    Note over Browser,Attacker: Same-Origin Policy blocks evil.com from reading the response,<br/>BUT the state mutation is ALREADY COMMITTED on the server!
`,

  diag_2: `flowchart TD
    subgraph Legitimate ["✔ Legitimate Intra-Origin Execution Flow"]
        direction TB
        L1["👤 Legitimate User Navigates<br/><code>https://bank.com/transfer</code>"]
        L2["📄 Bank Frontend Loads<br/>• Embeds Anti-CSRF Token Nonce in DOM<br/>• <code>X-CSRF-Token: 9f8a2...</code>"]
        L3["🌐 Browser Dispatches POST<br/>• Origin: <code>https://bank.com</code><br/>• Cookie: <code>session=xyz</code><br/>• Nonce: <code>X-CSRF-Token: 9f8a2...</code>"]
        L4["🟢 Target Server Validates Both:<br/>✔ Session Cookie Valid (Authentication)<br/>✔ CSRF Nonce Matches Session (Intent Provenance)"]
        L5["✅ State Mutation Executed Safely<br/><i>Funds transferred with verified user intent</i>"]
        L1 --> L2 --> L3 --> L4 --> L5
    end

    subgraph Vulnerable ["💥 Vulnerable Cross-Origin CSRF Execution Flow"]
        direction TB
        V1["👤 Victim Lured to External Site<br/><code>https://evil.com/prize</code>"]
        V2["💀 Attacker Page Auto-Submits<br/>• Hidden form targeting <code>https://bank.com</code><br/>• Injects: <code>recipient=attacker&amount=5000</code>"]
        V3["🌐 Browser Acts as Confused Deputy<br/>• Origin: <code>https://evil.com</code> (Cross-Origin)<br/>• Injects: <code>Cookie: session=xyz</code> (Ambient)<br/>• ❌ NO Anti-CSRF Token Attached!"]
        V4["⚠️ Target Server Flawed Validation:<br/>✔ Validates Session Cookie<br/>❌ Omits Origin & Intent Token Checks!"]
        V5["💥 Unauthorized State Mutation Executed!<br/><i>Victim funds stolen without user awareness</i>"]
        V1 --> V2 --> V3 --> V4 --> V5
    end

    style Legitimate fill:#0c1710,stroke:#52dc88,stroke-width:2px,color:#f0f7f1
    style Vulnerable fill:#1e0c0f,stroke:#ff5252,stroke-width:2px,color:#f0f7f1
    style L5 fill:#13331d,stroke:#52dc88,color:#b7f35d
    style V5 fill:#381318,stroke:#ff5252,color:#ff8552
`,

  diag_3: `flowchart LR
    S1["<b>Step 1: Payload Staging</b><br/>Host exploit on evil.com<br/><code>&lt;form action='...'&gt;</code>"]
    S2["<b>Step 2: Coerced Dispatch</b><br/>Victim browser DOM<br/>executes auto-submit"]
    S3["<b>Step 3: Ambient Injection</b><br/>Browser Cookie Jar attaches<br/><code>Cookie: sid=XYZ</code>"]
    S4["<b>Step 4: Server Conflation</b><br/>Server checks session validity,<br/>ignores request origin"]
    S5["<b>Step 5: State Mutation</b><br/>Backend database updates<br/>email/password/balance"]
    S6["<b>Step 6: Asymmetric SOP Block</b><br/>evil.com cannot read body,<br/>but mutation is done!"]

    S1 -->|Victim Visits| S2
    S2 -->|Dispatches POST| S3
    S3 -->|Over Network Wire| S4
    S4 -->|Commits Transaction| S5
    S5 -->|Returns HTTP 200| S6

    style S1 fill:#1a1d2e,stroke:#63a4fc,stroke-width:1.5px,color:#f0f7f1
    style S2 fill:#2a1f3d,stroke:#b890fa,stroke-width:1.5px,color:#f0f7f1
    style S3 fill:#3a2f18,stroke:#f5b041,stroke-width:1.5px,color:#f0f7f1
    style S4 fill:#3a1c1d,stroke:#ff6b6b,stroke-width:1.5px,color:#f0f7f1
    style S5 fill:#421517,stroke:#ff4545,stroke-width:2px,color:#ff8552
    style S6 fill:#122b22,stroke:#38e1b0,stroke-width:1.5px,color:#b7f35d
`,

  diag_4: `flowchart TD
    C1["<b>Condition 1: State-Changing Action</b><br/>Endpoint performs impactful server-side mutation<br/><i>(email, password, funds, permissions)</i>"]
    C2["<b>Condition 2: Ambient Credential Dependency</b><br/>Authentication relies on browser-managed authority<br/><i>(session cookies, HTTP Basic, client TLS)</i>"]
    C3["<b>Condition 3: Token Absence / Bypass</b><br/>Endpoint lacks unpredictable token validation<br/><i>(omitted, unvalidated, or bypassable)</i>"]

    subgraph TransportGate ["<b>Condition 4: Cross-Origin Transport Pathway (BOOLEAN OR)</b>"]
        direction TB
        OR_A["[OR-A] Standard Form POST with SameSite=None"]
        OR_B["[OR-B] State-Changing GET Navigation (Lax sent)"]
        OR_C["[OR-C] Chromium 2-Minute Lax-allowing-unsafe Window"]
        OR_D["[OR-D] Sibling Subdomain (*.target.com) Cookie Tossing"]
    end

    AND_GATE{{"⚡ MASTER AND GATE<br/>(Requires Conditions 1, 2, 3 AND at least one OR branch)"}}

    C1 -->|TRUE| AND_GATE
    C2 -->|TRUE| AND_GATE
    C3 -->|TRUE| AND_GATE
    OR_A -->|Active| AND_GATE
    OR_B -->|Active| AND_GATE
    OR_C -->|Active| AND_GATE
    OR_D -->|Active| AND_GATE

    AND_GATE -->|ALL TRUE| VULN["💥 EXPLOITABLE CSRF CONFIRMED<br/><i>Attacker can reliably coerce state mutation</i>"]
    AND_GATE -.->|ANY SINGLE GATE BROKEN| BLOCKED["🛡️ EXPLOIT BROKEN / IMPOSSIBLE<br/><i>Attack neutralized by defense in depth</i>"]

    style AND_GATE fill:#2e2412,stroke:#f5b041,stroke-width:2px,color:#f5b041
    style TransportGate fill:#131d16,stroke:#4dd8d8,stroke-width:1.5px,color:#c4d2c5
    style VULN fill:#4a1215,stroke:#ff5252,stroke-width:2px,color:#ffb8ad
    style BLOCKED fill:#102b1b,stroke:#52dc88,stroke-width:2px,color:#b7f35d
`,

  diag_5: `flowchart TD
    Start(["Outbound HTTP Request Dispatched from Browser"]) --> Q1{"Is Request Origin Same-Site as Target?<br/><i>(Scheme + Registrable Domain eTLD+1 Match)</i>"}

    Q1 -- YES --> AttachAll["🟢 [ATTACH ALL COOKIES]<br/>Strict, Lax, None attached.<br/>Normal Same-Origin Navigation."]
    Q1 -- NO (Cross-Site) --> Q2{"Inspect Cookie's<br/><b>SameSite Attribute</b>"}

    Q2 -- "SameSite=Strict" --> BlockStrict["🛑 [WITHHOLD COOKIE]<br/>Never sent cross-site.<br/><b>Blocks ALL CSRF attacks.</b>"]
    Q2 -- "SameSite=None" --> Q3{"Secure Flag & HTTPS?"}
    Q2 -- "SameSite=Lax (or Default)" --> Q4{"Top-Level Navigation?<br/><i>(Address bar change, &lt;a href&gt;)</i>"}

    Q3 -- YES --> AttachNone["🔴 [ATTACH COOKIE]<br/>Cookie sent across origins.<br/><b>Vulnerable to Standard CSRF!</b>"]
    Q3 -- NO --> RejectNone["⚠️ [REJECT COOKIE]<br/>Browser drops cookie entirely (RFC 6265bis)."]

    Q4 -- NO (Subresource / POST / fetch / iframe) --> BlockLaxSub["🛑 [WITHHOLD COOKIE]<br/>Cookie withheld on cross-site subrequests.<br/><b>Blocks standard form POST CSRF.</b>"]
    Q4 -- YES (Top-Level Window Navigation) --> Q5{"HTTP Method Safe?<br/><i>(RFC 7231 GET / HEAD)</i>"}

    Q5 -- YES (GET) --> AttachLaxGet["⚠️ [ATTACH COOKIE]<br/>Cookie sent on top-level GET.<br/><b>Vulnerable if GET mutates state!</b>"]
    Q5 -- NO (POST / PUT / DELETE) --> Q6{"Chromium &lt; 120s Window?<br/><i>(Created without SameSite &lt; 2 min ago)</i>"}

    Q6 -- YES --> AttachWindow["🔴 [ATTACH COOKIE]<br/><b>Lax-allowing-unsafe exception!</b><br/>Cross-site POST carries cookie within 2 min."]
    Q6 -- NO --> BlockLaxPost["🛑 [WITHHOLD COOKIE]<br/>Cookie withheld on top-level POST.<br/>Request unauthenticated."]

    style Start fill:#162436,stroke:#63a4fc,color:#f0f7f1
    style Q1 fill:#2b2311,stroke:#f5b041,color:#f0f7f1
    style Q2 fill:#2b2311,stroke:#f5b041,color:#f0f7f1
    style Q3 fill:#2b2311,stroke:#f5b041,color:#f0f7f1
    style Q4 fill:#2b2311,stroke:#f5b041,color:#f0f7f1
    style Q5 fill:#2b2311,stroke:#f5b041,color:#f0f7f1
    style Q6 fill:#2b2311,stroke:#f5b041,color:#f0f7f1

    style BlockStrict fill:#0f2b1a,stroke:#52dc88,color:#b7f35d
    style BlockLaxSub fill:#0f2b1a,stroke:#52dc88,color:#b7f35d
    style BlockLaxPost fill:#0f2b1a,stroke:#52dc88,color:#b7f35d
    style AttachAll fill:#132d1d,stroke:#52dc88,color:#b7f35d
    style RejectNone fill:#232938,stroke:#798d7c,color:#c4d2c5

    style AttachNone fill:#421316,stroke:#ff5252,color:#ffb8ad
    style AttachWindow fill:#421316,stroke:#ff5252,color:#ffb8ad
    style AttachLaxGet fill:#3d2710,stroke:#f5b041,color:#ffd8a8
`,

  diag_6: `flowchart LR
    subgraph AttackTimeline ["⚡ Attack Causal Sequence"]
        direction TB
        A1["<b>1. Attacker Crafts Payload</b><br/>Synthesizes malicious state mutation"]
        A2["<b>2. Browser Processes Dispatch</b><br/>Inspects cookie jar for target domain"]
        A3["<b>3. Request Emitted Over Wire</b><br/>Browser appends HTTP request headers"]
        A4["<b>4. Request Arrives at Target Sink</b><br/>Target server web server receives packet"]
        A5["<b>5. Application Evaluates Payload</b><br/>Routing middleware inspects request params"]
        A6["<b>6. State Mutation Committed</b><br/>Backend database updates victim record"]

        A1 --> A2 --> A3 --> A4 --> A5 --> A6
    end

    subgraph Defenses ["🛡️ Defensive Architecture Interceptors"]
        direction TB
        D1["<b>DEFENSE 1: SameSite Cookie Policy</b><br/><code>Set-Cookie: SameSite=Strict (or Lax)</code><br/><i>Browser withholds cookie on cross-site POST.<br/>Server sees unauthenticated request &rarr; 401.</i>"]
        D2["<b>DEFENSE 2: Fetch Metadata (Sec-Fetch-Site)</b><br/>Server checks <code>Sec-Fetch-Site: cross-site</code><br/><i>Gateway rejects cross-origin mutations<br/>before endpoint execution &rarr; 403.</i>"]
        D3["<b>DEFENSE 3: Custom Non-Standard Header</b><br/>Require header: <code>X-CSRF-Token: ...</code><br/><i>HTML forms cannot send custom headers;<br/>Fetch/XHR triggers CORS preflight &rarr; Denied.</i>"]
        D4["<b>DEFENSE 4: Synchronizer Token Pattern (STP)</b><br/>Cryptographic random nonce tied to session.<br/><i>Attacker cannot read token due to SOP;<br/>Missing/invalid token &rarr; 403 Forbidden.</i>"]
        D5["<b>DEFENSE 5: Step-Up Re-Authentication</b><br/>Password / MFA prompt on mutation.<br/><i>Automated cross-origin requests fail without<br/>interactive user secret entry.</i>"]
    end

    A2 ==>|Intercepted by| D1
    A3 ==>|Intercepted by| D2
    A4 ==>|Intercepted by| D3
    A5 ==>|Intercepted by| D4
    A6 ==>|Intercepted by| D5

    style AttackTimeline fill:#261114,stroke:#ff5252,stroke-width:1.5px,color:#f0f7f1
    style Defenses fill:#0d2417,stroke:#52dc88,stroke-width:1.5px,color:#f0f7f1
    style D1 fill:#13331f,stroke:#52dc88,color:#b7f35d
    style D2 fill:#13331f,stroke:#52dc88,color:#b7f35d
    style D3 fill:#13331f,stroke:#52dc88,color:#b7f35d
    style D4 fill:#13331f,stroke:#52dc88,color:#b7f35d
    style D5 fill:#13331f,stroke:#52dc88,color:#b7f35d
`
};
