import fs from 'fs';
import path from 'path';

/**
 * Content Oracle Loader.
 * Reads canonical topics, invariants, causal mechanisms, and structural diagrams
 * from content/ to serve as the ground truth oracle behind the reveal gate.
 *
 * NOTE: Canonical content must NEVER be exposed directly to the learner
 * before reveal_state is UNLOCKED.
 */
export class ContentOracle {
  constructor(contentDir = null) {
    this.contentDir = contentDir || path.resolve(process.cwd(), 'content');
  }

  /**
   * Load canonical topic specification and associated diagrams.
   */
  getTopicOracle(topicSlug = 'csrf') {
    const cleanSlug = topicSlug.replace('topic.', '');
    const topicDir = path.join(this.contentDir, 'topics', cleanSlug);

    if (!fs.existsSync(topicDir)) {
      throw new Error(`Topic directory not found: ${topicDir}`);
    }

    const topicPath = path.join(topicDir, 'topic.json');
    const topicData = JSON.parse(fs.readFileSync(topicPath, 'utf8'));

    // Load claims
    const claimsPath = path.join(topicDir, 'claims.json');
    let claims = [];
    if (fs.existsSync(claimsPath)) {
      claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8')).claims || [];
    }

    // Load diagrams
    const diagramsDir = path.join(topicDir, 'diagrams');
    const diagrams = {};
    if (fs.existsSync(diagramsDir)) {
      const diagramFiles = fs.readdirSync(diagramsDir).filter(f => f.endsWith('.txt'));
      for (const df of diagramFiles) {
        diagrams[df] = fs.readFileSync(path.join(diagramsDir, df), 'utf8');
      }
    }

    return {
      topic_id: topicData.topic_id,
      display_name: topicData.display_name,
      status: topicData.status,
      category: topicData.category,
      mechanism_family: topicData.mechanism_family,
      invariant: topicData.invariant,
      mental_model: topicData.mental_model,
      normal_behavior: topicData.normal_behavior,
      vulnerable_behavior: topicData.vulnerable_behavior,
      causal_mechanism: topicData.causal_mechanism,
      exploitability: topicData.exploitability,
      defenses: topicData.defenses || [],
      capabilities: topicData.capabilities || [],
      claims,
      diagrams
    };
  }
}
