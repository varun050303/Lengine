/**
 * Visual Flow Diagrams Data Model
 * Translates the 6 canonical ASCII diagrams into rich, graphical, node-and-connector flowcharts.
 */

export interface FlowNode {
  id: string;
  title: string;
  role?: string;
  type: 'attacker' | 'browser' | 'server' | 'boundary' | 'decision' | 'defense' | 'state' | 'normal';
  details: string[];
  badges?: string[];
}

export interface FlowStep {
  stepNum: number;
  from: string;
  to: string;
  label: string;
  type: 'attack' | 'ambient' | 'defense' | 'normal';
  payload?: string;
}

export interface VisualDiagram {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  summary: string;
  keyTakeaway: string;
  flowType: 'boundary' | 'comparison' | 'pipeline' | 'logic_gates' | 'decision_tree' | 'interception';
  rawAsciiFilename: string;
}

export const VISUAL_DIAGRAMS_CONFIG: VisualDiagram[] = [
  {
    id: 'diag_1',
    number: '01',
    title: 'Origin-Context Trust Boundary',
    subtitle: 'How untrusted origins exploit the browser runtime as a Confused Deputy',
    summary: 'Visualizes the transition of untrusted external input into an authenticated target instruction via automatic ambient credential transmission.',
    keyTakeaway: 'The target server evaluates identity (valid session cookie) but fails to evaluate provenance (originating context).',
    flowType: 'boundary',
    rawAsciiFilename: '01-trust-boundary.txt'
  },
  {
    id: 'diag_2',
    number: '02',
    title: 'Normal vs. Vulnerable Execution',
    subtitle: 'Side-by-side comparison of intra-origin intent vs cross-origin coercion',
    summary: 'Contrasts legitimate form submission carrying unpredictable CSRF tokens against cross-origin forced form submissions.',
    keyTakeaway: 'In vulnerable behavior, the server conflates session validity with caller intent.',
    flowType: 'comparison',
    rawAsciiFilename: '02-normal-vs-vulnerable.txt'
  },
  {
    id: 'diag_3',
    number: '03',
    title: 'Data Flow & 6-Stage Causal Chain',
    subtitle: 'Step-by-step causal sequence from attacker lure to silent database commit',
    summary: 'Traces the 6 discrete transitions: payload staging, coerced execution, ambient credential injection, server authentication, state mutation, and asymmetric observation.',
    keyTakeaway: 'Even though Same-Origin Policy blocks evil.com from reading the response, the mutation on the server is already committed.',
    flowType: 'pipeline',
    rawAsciiFilename: '03-data-flow-causal-chain.txt'
  },
  {
    id: 'diag_4',
    number: '04',
    title: 'Boolean Exploitability Logic Gates',
    subtitle: 'The 4 mandatory conditions required for confirmed exploitability',
    summary: 'Evaluates the AND/OR logical conditions: state mutation AND ambient credentials AND missing tokens AND cross-origin transport.',
    keyTakeaway: 'Breaking ANY single gate completely breaks the vulnerability.',
    flowType: 'logic_gates',
    rawAsciiFilename: '04-exploitability-gates.txt'
  },
  {
    id: 'diag_5',
    number: '05',
    title: 'SameSite Cookie Decision Tree',
    subtitle: 'Full specification decision logic under RFC 6265bis & Chromium policies',
    summary: 'Maps browser cookie transmission rules across SameSite=Strict, Lax, None, top-level navigations, and the 2-minute Lax window.',
    keyTakeaway: 'Top-level GET navigations always transmit Lax cookies; subresource POSTs withhold them.',
    flowType: 'decision_tree',
    rawAsciiFilename: '05-samesite-decision-tree.txt'
  },
  {
    id: 'diag_6',
    number: '06',
    title: 'Breaking the Chain (Defenses)',
    subtitle: 'Defense-in-depth architecture and interception points along the attack path',
    summary: 'Maps 5 defensive intervention barriers: SameSite policy, Fetch Metadata headers, Custom headers, Synchronizer Token Pattern, and Re-authentication.',
    keyTakeaway: 'Apply defense-in-depth: combine cryptographically random tokens with SameSite cookies and Fetch Metadata.',
    flowType: 'interception',
    rawAsciiFilename: '06-breaking-the-chain.txt'
  }
];
