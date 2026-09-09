import fs from 'fs';
import path from 'path';
import { CSRF_MINDMAP_DATA } from './csrf-mindmap';

export interface TopicKnowledge {
  mindmap: typeof CSRF_MINDMAP_DATA;
  topicJson: any;
  claims: any[];
  sources: any[];
  diagrams: { id: string; title: string; filename: string; content: string }[];
  crosslinks: any[];
  mechanismFamily: any;
  concepts: any[];
}

export function getCsrfFullKnowledge(): TopicKnowledge {
  const rootDir = process.cwd(); // root of workspace or ui
  // Determine content directory
  let contentDir = path.resolve(rootDir, 'content');
  if (!fs.existsSync(contentDir)) {
    contentDir = path.resolve(rootDir, '..', 'content');
  }

  // 1. Topic JSON
  const topicPath = path.join(contentDir, 'topics', 'csrf', 'topic.json');
  const topicJson = JSON.parse(fs.readFileSync(topicPath, 'utf8'));

  // 2. Claims
  const claimsPath = path.join(contentDir, 'topics', 'csrf', 'claims.json');
  const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8')).claims || [];

  // 3. Sources
  const sourcesPath = path.join(contentDir, 'topics', 'csrf', 'sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8')).sources || [];

  // 4. Diagrams
  const diagramsDir = path.join(contentDir, 'topics', 'csrf', 'diagrams');
  const diagramFiles = [
    { id: 'diag_1', filename: '01-trust-boundary.txt', title: '1. Origin-Context Trust Boundary' },
    { id: 'diag_2', filename: '02-normal-vs-vulnerable.txt', title: '2. Normal vs Vulnerable Execution' },
    { id: 'diag_3', filename: '03-data-flow-causal-chain.txt', title: '3. Data Flow & Causal Chain' },
    { id: 'diag_4', filename: '04-exploitability-gates.txt', title: '4. Boolean Exploitability Gates' },
    { id: 'diag_5', filename: '05-samesite-decision-tree.txt', title: '5. SameSite Cookie Decision Tree' },
    { id: 'diag_6', filename: '06-breaking-the-chain.txt', title: '6. Breaking the Chain (Defenses)' }
  ];

  const diagrams = diagramFiles.map(d => {
    const p = path.join(diagramsDir, d.filename);
    const content = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    return { ...d, content };
  });

  // 5. Crosslinks
  const crosslinksPath = path.join(contentDir, '_crosslinks.json');
  let crosslinks: any[] = [];
  if (fs.existsSync(crosslinksPath)) {
    const rawLinks = JSON.parse(fs.readFileSync(crosslinksPath, 'utf8')).crosslinks || [];
    crosslinks = rawLinks.filter((l: any) => l.from === 'csrf' || l.to === 'csrf');
  }

  // 6. Mechanism Family
  const mechPath = path.join(contentDir, '_mechanism_families.json');
  let mechanismFamily: any = null;
  if (fs.existsSync(mechPath)) {
    const families = JSON.parse(fs.readFileSync(mechPath, 'utf8')).families || [];
    // Prefer the topic's mechanism_family id when present in topic.json
    const topicMech = (topicJson.mechanism_family || '').replace(/^mechanism\./, '');
    mechanismFamily =
      families.find((f: any) => f.id === topicMech) ||
      families.find((f: any) => f.id === 'origin-context-confusion') ||
      null;
  }

  // 7. Concepts
  const conceptIds = ['ambient-credentials', 'same-origin-policy', 'samesite-cookies'];
  const concepts: any[] = [];
  for (const cid of conceptIds) {
    const cp = path.join(contentDir, 'concepts', `${cid}.json`);
    if (fs.existsSync(cp)) {
      concepts.push(JSON.parse(fs.readFileSync(cp, 'utf8')));
    }
  }

  return {
    mindmap: CSRF_MINDMAP_DATA,
    topicJson,
    claims,
    sources,
    diagrams,
    crosslinks,
    mechanismFamily,
    concepts
  };
}
