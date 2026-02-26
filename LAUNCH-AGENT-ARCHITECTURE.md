# Launch Orchestration — Agent Architecture

_Siberius overseeing. Sub-agents executing. Expert delivery on every facet._

## Agent Team

### Siberius (Overseer)
- **Role:** Architect, coordinator, quality gate
- **Owns:** CMD design, cross-asset validation, final review, feedback loop analysis
- **Does NOT delegate:** Type system updates, pipeline orchestration, dependency graph logic

### Agent 1: `launch-generators` — New Asset Generators
- **Scope:** Build 3 new generator modules + update types + wire into pipeline
- **Deliverables:**
  1. `src/lib/launch/generators/salesEnablement.ts` — Sales one-pager, objection script, demo talking points
  2. `src/lib/launch/generators/partnerKit.ts` — Swipe copy, email blurb, co-branded one-pager
  3. `src/lib/launch/generators/videoScript.ts` — 30s teaser + 60s explainer scripts
  4. Update `types.ts` — Add all new interfaces (SalesEnablementAsset, PartnerKitAsset, VideoScriptAsset, etc.)
  5. Update `pipeline.ts` — Add new generators to PIPELINE_ORDER, wire into runPipeline
  6. Update `validator.ts` — Add validation rules for new asset types

### Agent 2: `launch-variants` — A/B System + Feedback Loop + Retro
- **Scope:** Build the variant system, feedback analytics, and retrospective framework
- **Deliverables:**
  1. `src/lib/launch/variants/variant-generator.ts` — Generate A/B variants per hook angle
  2. `src/lib/launch/feedback/signal-collector.ts` — Aggregate analytics signals post-launch
  3. `src/lib/launch/feedback/cmd-updater.ts` — Suggest CMD mutations based on performance data
  4. `src/lib/launch/retro/retro-template.ts` — Retrospective data structure + defaults
  5. `src/lib/launch/retro/retro-analyzer.ts` — Analyze retro → CMD recommendations for next launch
  6. Update `types.ts` — Add AssetVariants, FeedbackSignal, LaunchRetro interfaces

### Agent 3: `launch-ui` — Frontend Components for All New Features
- **Scope:** Build React components for all new asset panels + variant UI + retro UI
- **Deliverables:**
  1. `src/components/launch/SalesEnablementPanel.tsx` — Sales assets view/edit
  2. `src/components/launch/PartnerKitBuilder.tsx` — Partner kit creation + preview
  3. `src/components/launch/VideoScriptEditor.tsx` — Script timeline editor
  4. `src/components/launch/VariantCompare.tsx` — Side-by-side A/B variant preview
  5. `src/components/launch/LaunchRetro.tsx` — Post-launch retro form
  6. `src/components/launch/FeedbackDashboard.tsx` — What worked + recommended CMD changes
  7. Update `LaunchWorkflow.tsx` — Integrate new panels into main orchestrator
  8. Update `LaunchDependencyGraph.tsx` — Add new nodes for all new asset types
  9. Update `launch-workflow.json` — New steps in template definition

## Execution Order

1. **Agent 1 starts first** — types + generators (backend foundation)
2. **Agent 2 starts in parallel** — variants + feedback (independent of Agent 1)
3. **Agent 3 starts after Agents 1 & 2 deliver** — needs their types/interfaces for UI

## Quality Gates (Siberius Reviews)

- [ ] All new types follow existing patterns in types.ts
- [ ] Generators match the LLM prompt structure of existing generators
- [ ] Pipeline order respects dependency graph
- [ ] Validator catches inconsistencies in new asset types
- [ ] UI components use existing design system (shadcn/ui, Radix, Lucide icons)
- [ ] Template registration updated with all new steps
