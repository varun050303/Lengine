import fs from 'fs';
import path from 'path';

// Define types based on JSON schemas
export interface TopicManifest {
  topic: string;
  display_name: string;
  category: string;
  status: string;
}

export interface GraphNode {
  id: string;
  name: string;
  category: number; // 0: Topic, 1: Mechanism, 2: Concept
  value: number; // Size of the node
  symbolSize?: number;
  meta?: any;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: { show: boolean, formatter: string };
  lineStyle?: { type: string, color: string };
}

export function getManifest() {
  const manifestPath = path.resolve(process.cwd(), '../content/_manifest.json');
  try {
    const data = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { topics: [] };
  }
}

export function getTopicData(topicId: string) {
  const topicPath = path.resolve(process.cwd(), `../content/topics/${topicId}/topic.json`);
  try {
    if (fs.existsSync(topicPath)) {
      return JSON.parse(fs.readFileSync(topicPath, 'utf8'));
    }
  } catch (e) {
    // silently fail
  }
  return null;
}

export function getMechanismFamilies() {
  const mechPath = path.resolve(process.cwd(), '../content/_mechanism_families.json');
  try {
    if (fs.existsSync(mechPath)) {
      return JSON.parse(fs.readFileSync(mechPath, 'utf8')).families;
    }
  } catch (e) {
    // silently fail
  }
  return [];
}

export function getMechanismData(mechanismId: string) {
  const cleanId = mechanismId.replace('mechanism.', '');
  const mechPath = path.resolve(process.cwd(), `../content/mechanisms/${cleanId}.json`);
  try {
    if (fs.existsSync(mechPath)) {
      return JSON.parse(fs.readFileSync(mechPath, 'utf8'));
    }
  } catch (e) {
    // silently fail
  }
  return null;
}

export function getCrosslinks() {
  const linksPath = path.resolve(process.cwd(), '../content/_crosslinks.json');
  try {
    if (fs.existsSync(linksPath)) {
      return JSON.parse(fs.readFileSync(linksPath, 'utf8')).crosslinks;
    }
  } catch (e) {
    // silently fail
  }
  return [];
}

export function getGraphData() {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const addedNodes = new Set<string>();

  const manifest = getManifest();
  const mechanisms = getMechanismFamilies();
  const crosslinks = getCrosslinks();

  // 1. Add Mechanisms
  mechanisms.forEach((mech: any) => {
    const id = `mechanism.${mech.id}`;
    if (!addedNodes.has(id)) {
      nodes.push({
        id,
        name: mech.display_name,
        category: 1,
        value: 30, // Large node
        symbolSize: 40,
        meta: getMechanismData(mech.id) || mech
      });
      addedNodes.add(id);
    }
  });

  // 2. Add Topics and their prerequisites
  manifest.topics.forEach((t: any) => {
    // Only include topics that have actual data files, or just include all of them
    const tData = getTopicData(t.topic);
    if (!tData) return; // Skip if it hasn't been written yet

    const topicId = `topic.${t.topic}`;
    if (!addedNodes.has(topicId)) {
      nodes.push({
        id: topicId,
        name: t.display_name,
        category: 0,
        value: 20, // Medium node
        symbolSize: 25,
        meta: { ...t, ...tData }
      });
      addedNodes.add(topicId);
    }

    // Link Topic -> Mechanism
    if (tData.mechanism_family) {
      links.push({
        source: topicId,
        target: tData.mechanism_family,
        lineStyle: { type: 'solid', color: '#94d9d5' }
      });
    }

    // Add Concepts and Link Topic -> Concept
    if (tData.prerequisites) {
      tData.prerequisites.forEach((conceptId: string) => {
        if (!addedNodes.has(conceptId)) {
          nodes.push({
            id: conceptId,
            name: conceptId.replace('concept.', '').replace('-', ' ').toUpperCase(),
            category: 2,
            value: 10, // Small node
            symbolSize: 15,
            meta: { id: conceptId }
          });
          addedNodes.add(conceptId);
        }
        links.push({
          source: topicId,
          target: conceptId,
          lineStyle: { type: 'dashed', color: '#e5ba6d' }
        });
      });
    }
  });

  // 3. Add Crosslinks (Topic -> Topic)
  crosslinks.forEach((link: any) => {
    const sourceId = `topic.${link.from}`;
    const targetId = `topic.${link.to}`;
    // Only link if both exist in our graph
    if (addedNodes.has(sourceId) && addedNodes.has(targetId)) {
      links.push({
        source: sourceId,
        target: targetId,
        lineStyle: { type: 'dotted', color: '#87928b' }
      });
    }
  });

  return { nodes, links };
}
