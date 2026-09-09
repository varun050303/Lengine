# Frontend integration proposal: Boundary Trace / Lengine

## Intent

The existing Boundary Trace interface has a strong Copperline Observatory visual system, but its topic changes currently swap mostly static copy. Lengine already contains the canonical knowledge model needed to make the experience genuinely topic-specific: typed topic specifications, atomic claims, safety contracts, assessments, mechanism families, prerequisites, cross-links, and structural diagrams.

This proposal keeps the frontend static and makes Lengine the source of truth. The frontend should consume one generated export rather than re-authoring security content in React components.

## Proposed experience changes

| Area | Current behavior | Proposed behavior |
|---|---|---|
| Causal map | Fixed five-node labels with topic text substituted into a few positions | Render source, transformation, parser/interpreter, security invariant, and effect from the canonical topic model; use mechanism-family labels and topic-specific stage names |
| Evidence drawer | Repeated prose sections with limited provenance | Add claim count, diagram count, variant count, implementation-variance state, safety state, and progressive disclosures for claims and assessments |
| Diagrams | No canonical diagram consumption | Render one or more Lengine structural diagrams as collapsible, readable evidence panels; add an optional SVG causal overview derived from the same stage data |
| Cross-linking | Hand-maintained related-topic arrays | Use `_crosslinks.json`, prerequisites, and `transfer.related_topics` to build a reusable mechanism graph |
| Study flow | Mark-as-reviewed only | Add learning objectives, transfer scenario, common learner errors, and explicit confirmation/stop-condition panels |
| Content lifecycle | Scaffold and authored content are visually similar | Show lifecycle state from `_manifest.json`: `not_started`, `in_review`, `completed`, `deprecated`, and distinguish canonical content from UI scaffolds |

## Export contract

The export should include, for every manifest topic, whether a canonical `topic.json` exists. For authored topics, the export includes the topic specification, claim registry, assessment, diagram text, editorial status, and source metadata. For scaffold topics, it includes the manifest row and an explicit `content_available: false` flag; the frontend must not invent canonical claims for those entries.

The export is deliberately static and deterministic. A rebuild should produce the same semantic content for the same repository commit, except for a generated metadata timestamp. The frontend may add presentation-only derived fields such as display colors or layout coordinates, but it must not alter security claims.

## Safety and provenance requirements

The UI must preserve Lengine’s distinctions between candidate evidence, confirmation, exploitation, capability, and impact. It should surface `safety_contract` fields before any probe or scenario detail, keep claims linked to their sources, and render `implementation_variance` as a first-class qualifier. Diagram text is evidence and teaching material, not an instruction to test an unauthorized system.

## Suggested implementation sequence

1. Run the export script during content refresh and commit the generated artifact with the Lengine revision hash.
2. Replace hand-maintained topic summary fields in the web project with the export adapter.
3. Add a reusable `KnowledgeDiagram` component that supports both the canonical text diagrams and a deterministic five-stage SVG causal view.
4. Add a `TopicEvidence` component for claims, safety, assessment, and implementation variance.
5. Add URL-addressable topic IDs and preserve study status in local storage; add cross-device persistence only if explicitly needed.

## Acceptance criteria

The implementation is complete when selecting two topics with different mechanism families visibly changes the causal stages, the evidence metadata, the available diagrams, the safety/confirmation content, and the cross-linked mechanism nodes. A topic with no canonical artifact must be visibly marked as a scaffold and must not be presented as reviewed technical content.
