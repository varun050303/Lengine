/* Lengine frontend export: canonical knowledge only, presentation-neutral and deterministic. */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const contentRoot = path.join(root, "content");
const out = path.join(root, "web-export", "knowledge-export.json");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const readIf = (file, fallback) => fs.existsSync(file) ? readJson(file) : fallback;
const text = (value) => {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(text).filter(Boolean).join(" ");
  return "";
};

const manifest = readIf(path.join(contentRoot, "_manifest.json"), { schema_version: "unknown", contracts_version: "unknown", topics: [] });
const crosslinks = readIf(path.join(contentRoot, "_crosslinks.json"), { crosslinks: [] });
const mechanisms = readIf(path.join(contentRoot, "_mechanism_families.json"), { families: [] });
const conceptsDir = path.join(contentRoot, "concepts");
const concepts = fs.existsSync(conceptsDir) ? fs.readdirSync(conceptsDir).filter((file) => file.endsWith(".json")).sort().map((file) => readJson(path.join(conceptsDir, file))) : [];

const topics = (manifest.topics || []).map((manifestTopic) => {
  const slug = manifestTopic.topic;
  const dir = path.join(contentRoot, "topics", slug);
  const hasCanonical = fs.existsSync(path.join(dir, "topic.json"));
  const topic = hasCanonical ? readJson(path.join(dir, "topic.json")) : null;
  const diagramsDir = path.join(dir, "diagrams");
  const diagrams = fs.existsSync(diagramsDir) ? fs.readdirSync(diagramsDir).filter((file) => file.endsWith(".txt")).sort().map((file) => ({ file, text: fs.readFileSync(path.join(diagramsDir, file), "utf8") })) : [];
  return {
    manifest: manifestTopic,
    content_available: hasCanonical,
    topic: topic ? {
      ...topic,
      claims: readIf(path.join(dir, "claims.json"), null),
      assessment: readIf(path.join(dir, "assessment.json"), null),
      diagrams,
      editorial: {
        draft: fs.existsSync(path.join(dir, "editorial", "01-draft.md")),
        review: fs.existsSync(path.join(dir, "editorial", "02-review.json")),
        arbitration: fs.existsSync(path.join(dir, "editorial", "03-arbitration.json")),
      },
    } : null,
  };
});

const result = {
  export_schema: "lengine.frontend-export.v1",
  source_contracts_version: manifest.contracts_version,
  source_schema_version: manifest.schema_version,
  topics,
  concepts,
  mechanism_families: mechanisms,
  crosslinks,
  generated_from: "Lengine canonical content repository",
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(`Exported ${topics.length} manifest topics, ${concepts.length} concepts, ${mechanisms.families?.length || 0} mechanism families, and ${crosslinks.crosslinks?.length || 0} cross-links to ${out}`);
