# Launch Orchestration Workflow — Agent Forge Feature Spec

## The Problem

Product launch assets (landing page, email sequence, press release, social posts) are deeply interdependent:
- Press release references landing page URL and key claims
- Email sequence CTAs drive to landing page
- Social posts pull hooks from landing page + press release
- All assets must share consistent messaging, pricing, value props

Most people create these sequentially in isolation, then spend more time fixing inconsistencies than they did writing.

## The Solution

A **Launch Orchestration Workflow** — a built-in Agent Forge workflow template where users:
1. Input a **launch brief** once (product name, value prop, key features, pricing, launch date, URL, quotes)
2. The system generates all assets **in dependency order**, each inheriting context from prior assets
3. All links, claims, and messaging stay **automatically consistent**
4. User can edit any asset and changes **propagate** to dependent assets

## Architecture

### 1. Launch Brief (Single Source of Truth)

```typescript
interface LaunchBrief {
  id: string;
  // Core
  productName: string;
  tagline: string;             // One-liner
  valueProposition: string;    // Core value prop (2-3 sentences)
  keyFeatures: Feature[];      // Top 3-5 features with descriptions
  targetAudience: string;      // Who this is for
  
  // Pricing & Availability
  pricing: string;             // e.g. "Starting at $29/mo" or "Free during beta"
  launchDate: string;          // ISO date
  availabilityNote?: string;   // e.g. "Limited to first 500 users"
  
  // Links
  landingPageUrl: string;      // The hub everything points to
  signupUrl?: string;          // If different from landing page
  demoUrl?: string;
  
  // Social proof
  quotes?: Quote[];            // Testimonials, founder quotes
  stats?: string[];            // "10x faster", "Used by 500+ teams"
  
  // Brand
  companyName: string;
  founderName?: string;
  founderTitle?: string;
  brandVoice: 'professional' | 'casual' | 'bold' | 'technical';
  
  // Distribution
  socialPlatforms: ('twitter' | 'linkedin' | 'producthunt' | 'hackernews' | 'instagram')[];
  emailListSize?: number;
}

interface Feature {
  name: string;
  description: string;
  benefit: string;  // Why the user cares
}

interface Quote {
  text: string;
  author: string;
  title?: string;
  company?: string;
}
```

### 2. Asset Dependency Graph

```
Launch Brief (source of truth)
    │
    ├──► Landing Page Copy
    │       │
    │       ├──► Email Sequence (references landing page sections + URL)
    │       │       │
    │       │       └──► Email social sharing snippets
    │       │
    │       ├──► Press Release (references landing page + quotes + URL)
    │       │
    │       └──► Social Posts (pull hooks from landing page headlines)
    │               │
    │               ├──► Twitter/X thread
    │               ├──► LinkedIn post
    │               ├──► Product Hunt description
    │               └──► Hacker News Show HN
    │
    └──► Meta assets
            ├──► OG/meta descriptions
            └──► Product Hunt tagline + description
```

### 3. Generation Pipeline (ordered)

Each step's output becomes context for the next:

**Step 1: Landing Page Copy**
- Hero headline + subheadline
- Feature sections (from brief features)
- Social proof section
- CTA copy + button text
- FAQ section
- SEO meta title + description

**Step 2: Email Sequence** (3-5 emails)
- Email 1: Announcement ("We just launched X")
- Email 2: Feature deep-dive (references landing page sections)
- Email 3: Social proof / case study
- Email 4: Urgency / limited-time (if applicable)
- Email 5: Last call / reminder
- All CTAs link to `landingPageUrl`

**Step 3: Press Release**
- Headline
- Dateline + lede
- Body (features, quotes, availability)
- Boilerplate
- Contact info
- References landing page URL

**Step 4: Social Posts**
- Twitter/X: Launch announcement thread (5-7 tweets)
- LinkedIn: Professional announcement post
- Product Hunt: Title, tagline, description, first comment
- Hacker News: Show HN title + comment
- All link to landing page

### 4. Cross-Validation

After generation, run a validation pass:
- All URLs match `landingPageUrl` from brief
- Pricing mentioned consistently across all assets
- Feature names/descriptions match between assets
- Quotes are identical (no paraphrasing)
- Dates are consistent
- CTA text aligns with landing page buttons

### 5. Propagation

When user edits an upstream asset:
- Track which fields changed
- Re-generate dependent sections in downstream assets
- Highlight changes for user review before applying

## UI Flow

### In the Agent Forge Visual Builder:

1. **New Workflow → "Product Launch"** template
2. **Launch Brief Form** — fill in product details (guided wizard)
3. **Dependency Graph View** — visual node graph showing assets and connections (using ReactFlow)
4. **Generation** — click "Generate All" or step through one at a time
5. **Review Panel** — side-by-side view of each asset with inline editing
6. **Validation Report** — shows consistency check results
7. **Export** — download all assets as:
   - Individual files (markdown, HTML, plain text)
   - ZIP bundle
   - Copy to clipboard per asset
   - Direct integrations (Mailchimp, ConvertKit, Twitter API, etc.) — future

## Technical Implementation

### New Files Needed:

```
src/
  components/
    launch/
      LaunchBriefForm.tsx          # Wizard form for brief input
      LaunchDependencyGraph.tsx    # ReactFlow visualization
      LaunchAssetPanel.tsx         # Asset review/edit panel
      LaunchValidationReport.tsx   # Consistency check results
      LaunchExport.tsx             # Export options
  lib/
    launch/
      types.ts                    # TypeScript interfaces
      pipeline.ts                 # Generation pipeline orchestrator
      generators/
        landingPage.ts            # Landing page copy generator
        emailSequence.ts          # Email sequence generator
        pressRelease.ts           # Press release generator
        socialPosts.ts            # Social post generator
      validator.ts                # Cross-asset validation
      propagator.ts               # Change propagation logic
  templates/
    launch-workflow.json           # Template definition

pages/
  api/
    launch/
      generate.ts                 # API route for generation
      validate.ts                 # API route for validation
```

### Template Registration:

```json
{
  "id": "product-launch",
  "name": "Product Launch Orchestrator",
  "description": "Generate a complete, consistent launch package — landing page, emails, press release, and social posts — from a single brief",
  "icon": "🚀",
  "category": "workflows",
  "isWorkflow": true,
  "steps": ["brief", "landing-page", "emails", "press-release", "social", "validate", "export"]
}
```

## 6. Post-Launch Feedback Loop

The original design stops at delivery. But the best-performing assets should **feed back into the CMD** to create a self-improving messaging system:

| Signal | Source | What It Updates |
|--------|--------|-----------------|
| Best email open rate | Email analytics | CMD hooks — winning subject line becomes the default hook |
| Most-clicked LP section | Heatmap/analytics | CMD supporting claims — reorder by engagement |
| PR pickup angle | Media coverage | CMD positioning — refine based on what journalists latched onto |
| Top social post | Engagement metrics | CMD hooks — winning hook gets promoted to LP headline |

This turns a one-shot launch into a **self-improving messaging system**. Each launch compounds the learnings of every previous one.

### Implementation:

```typescript
interface FeedbackSignal {
  type: 'email_open' | 'lp_click' | 'pr_pickup' | 'social_engagement';
  assetId: string;
  metric: string;
  value: number;
  hookOrClaimRef: string;  // Maps back to CMD element
}

// After launch period, run:
// pipeline.analyzeFeedback(signals) → suggested CMD updates
// User reviews + approves → CMD evolves for next launch
```

New files:
```
src/lib/launch/
  feedback/
    signal-collector.ts      # Aggregates analytics signals
    cmd-updater.ts           # Suggests CMD mutations based on performance
    feedback-dashboard.tsx   # UI showing what worked + recommended changes
```

## 7. Channel-Specific Variants (A/B Baked In)

Currently each asset gets one version. Better approach — the CMD generates **2 variants per hook** so every channel gets an A/B test automatically:

| Asset | Variant A | Variant B |
|-------|-----------|-----------|
| Email subject line | Curiosity-driven | Outcome-driven |
| LP headline | Pain-focused | Aspiration-focused |
| Social post opener | Variant 1 | Variant 2 |
| Press release | Single version (no A/B) | — |

### Implementation:

```typescript
interface AssetVariants {
  assetType: 'email' | 'landing-page' | 'social';
  variantA: {
    hook: string;
    angle: 'curiosity' | 'pain' | 'default';
    content: string;
  };
  variantB: {
    hook: string;
    angle: 'outcome' | 'aspiration' | 'default';
    content: string;
  };
}

// Press releases always single version
// All other assets get automatic A/B pairs
```

Generation pipeline update:
- Step 1b: Generate LP headline variant B (aspiration) alongside variant A (pain)
- Step 2b: Generate email subject line variant B (outcome) alongside variant A (curiosity)
- Step 4b: Generate social opener variant B alongside variant A

New files:
```
src/lib/launch/
  generators/
    variant-generator.ts     # Generates A/B variants per hook angle
  components/
    VariantCompare.tsx        # Side-by-side variant preview UI
```

## 8. Sales Enablement Layer

PR, emails, and social cover awareness → conversion. Missing: **what happens when someone responds.** This layer bridges marketing to sales:

### Sales One-Pager
- Pulls from CMD: same claims, proof points, positioning
- Formatted for 1:1 sharing (PDF/image)
- Clean design, no fluff — designed for a prospect to read in 60 seconds

### Objection Script
- Expands the CMD objection table into **conversational rebuttals**
- Each objection gets: the pushback, the reframe, the proof point, the redirect
- Written in natural spoken language, not marketing copy

### Demo Talking Points
- Maps CMD supporting claims → product walkthrough sequence
- For each claim: what to show, what to say, what metric to highlight
- Ordered by impact (strongest proof first)

### Implementation:

```typescript
interface SalesEnablementKit {
  onePager: {
    headline: string;
    valueProps: string[];       // From CMD
    proofPoints: string[];      // From CMD
    callToAction: string;
    contactInfo: string;
  };
  objectionScript: {
    objection: string;
    reframe: string;
    proof: string;
    redirect: string;
  }[];
  demoTalkingPoints: {
    claim: string;              // From CMD
    showThis: string;           // Product feature to demo
    sayThis: string;            // Verbal script
    metric: string;             // Number to highlight
  }[];
}
```

New files:
```
src/lib/launch/
  generators/
    salesOnePager.ts           # Sales one-pager generator
    objectionScript.ts         # Conversational objection rebuttals
    demoTalkingPoints.ts       # Demo walkthrough script
  components/
    SalesEnablementPanel.tsx   # UI for sales assets
```

Updated dependency graph:
```
CMD → Sales One-Pager (same claims/proof, formatted for 1:1)
CMD → Objection Script (expanded from CMD objection table)
CMD → Demo Talking Points (maps claims to product walkthrough)
```

## 9. Partner/Affiliate Asset Kit

When someone else promotes your launch, they need **pre-made assets that stay on-message**:

### Swipe Copy
- Pre-written social posts partners can copy/paste
- Affiliate link appended to LP URL automatically
- Multiple lengths: tweet-sized, LinkedIn-sized, email blurb
- Platform-specific formatting (hashtags for Twitter, professional tone for LinkedIn)

### Email Blurb
- 2-3 paragraph insert for partner newsletters
- Written in third person (partner introducing your product)
- Includes key proof points from CMD
- CTA with partner's tracking link

### Co-Branded One-Pager
- Partner's logo + your CMD positioning
- Auto-generated from CMD + partner branding inputs
- PDF export, sharable link

### Implementation:

```typescript
interface PartnerKit {
  partnerId: string;
  partnerName: string;
  partnerLogo?: string;
  affiliateUrl: string;         // LP URL with partner tracking

  swipeCopy: {
    twitter: string[];          // 2-3 tweet options
    linkedin: string;           // Professional announcement
    emailBlurb: string;         // 2-3 paragraph newsletter insert
  };

  coBrandedOnePager: {
    partnerLogo: string;
    productPositioning: string;  // From CMD
    proofPoints: string[];       // From CMD
    callToAction: string;
    trackingUrl: string;
  };
}
```

New files:
```
src/lib/launch/
  generators/
    partnerKit.ts              # Partner/affiliate asset generator
  components/
    PartnerKitBuilder.tsx      # UI for creating partner kits
    PartnerKitPreview.tsx      # Preview co-branded assets
```

## 10. Launch Retrospective Template

After every launch, capture what worked. This becomes **input for the next launch's CMD** — compounding improvement:

```markdown
## Launch Retro: [Product Name]

### What Converted Best
- Channel: [which drove most LP traffic]
- Hook: [which CMD hook performed best]
- CTA: [which CTA language won]

### What to Keep for Next Launch CMD
- [Winning positioning angle]
- [Proof point that resonated most]

### What to Drop
- [Hook that fell flat]
- [Channel that underperformed]
```

### Implementation:

```typescript
interface LaunchRetro {
  launchId: string;
  productName: string;
  launchDate: string;

  bestConverting: {
    channel: string;
    hook: string;
    cta: string;
  };

  keepForNextCMD: string[];      // Winning elements
  dropFromNextCMD: string[];     // Underperforming elements

  metrics: {
    totalTraffic: number;
    conversionRate: number;
    topChannel: string;
    topAsset: string;
    hookPerformance: { hook: string; metric: number }[];
  };
}

// Retro feeds back into next CMD generation:
// pipeline.generateCMD(brief, previousRetros) → improved CMD
```

New files:
```
src/lib/launch/
  retro/
    retro-template.ts          # Retro data structure + defaults
    retro-analyzer.ts          # Analyzes retro → CMD recommendations
  components/
    LaunchRetro.tsx             # Post-launch retro form UI
    RetroInsights.tsx           # Visual insights from past launches
```

## 11. Video Script Integration

The system covers text assets. Add a **launch video script** that pulls from the CMD and ties into existing `product-demo-generator` and `remotion-best-practices` skills:

### 30-Second Teaser
- **Hook** (from CMD) → 5 seconds
- **Core Claim** (from CMD positioning) → 15 seconds
- **CTA** (from CMD) → 10 seconds
- Format: fast cuts, text overlays, urgency

### 60-Second Explainer
- **Hook** → 5 seconds
- **Supporting Claim 1** + proof → 15 seconds
- **Supporting Claim 2** + proof → 15 seconds
- **Supporting Claim 3** + proof → 15 seconds
- **CTA** → 10 seconds
- Format: screen recording + voiceover + text overlays

### Implementation:

```typescript
interface VideoScript {
  format: '30s-teaser' | '60s-explainer';
  scenes: {
    duration: number;           // Seconds
    voiceover: string;          // What to say
    visualDescription: string;  // What's on screen
    textOverlay?: string;       // Text that appears
    cmdSource: string;          // Which CMD element this pulls from
  }[];
  totalDuration: number;
  ctaUrl: string;               // Landing page URL
}

// Integration with existing skills:
// - product-demo-generator: auto-generate screen recordings
// - remotion-best-practices: render video programmatically
```

New files:
```
src/lib/launch/
  generators/
    videoScript.ts             # Video script generator (30s + 60s)
  components/
    VideoScriptEditor.tsx      # Script timeline editor UI
    VideoPreview.tsx            # Preview with timing markers
```

Updated dependency graph addition:
```
CMD → Video Scripts
        ├──► 30-second teaser (Hook + Core Claim + CTA)
        └──► 60-second explainer (All 3 Supporting Claims + Proof)
              ├──► product-demo-generator (screen recordings)
              └──► remotion-best-practices (programmatic render)
```

---

## Updated Asset Dependency Graph (Complete)

```
Launch Brief → CMD (Core Messaging Document)
    │
    ├──► Landing Page Copy (A/B headlines)
    │       ├──► Email Sequence (A/B subject lines, CTAs → LP URL)
    │       ├──► Press Release (references LP + quotes + URL)
    │       └──► Social Posts (A/B openers, hooks from LP headlines)
    │
    ├──► Sales Enablement
    │       ├──► Sales One-Pager (CMD claims + proof, 1:1 format)
    │       ├──► Objection Script (CMD objections → conversational rebuttals)
    │       └──► Demo Talking Points (CMD claims → product walkthrough)
    │
    ├──► Partner/Affiliate Kit
    │       ├──► Swipe Copy (pre-written social + email for partners)
    │       ├──► Email Blurb (newsletter insert)
    │       └──► Co-Branded One-Pager (partner logo + CMD positioning)
    │
    ├──► Video Scripts
    │       ├──► 30-second teaser (Hook + Core Claim + CTA)
    │       └──► 60-second explainer (Supporting Claims + Proof)
    │
    ├──► Meta assets (OG/meta descriptions, PH tagline)
    │
    └──► Post-Launch
            ├──► Feedback Loop (analytics → CMD updates)
            └──► Launch Retrospective (learnings → next CMD)
```

## Updated Template Registration:

```json
{
  "id": "product-launch",
  "name": "Product Launch Orchestrator",
  "description": "Generate a complete, consistent launch package — landing page, emails, press release, social posts, sales enablement, partner kits, and video scripts — from a single brief. With built-in A/B variants and post-launch feedback loops.",
  "icon": "🚀",
  "category": "workflows",
  "isWorkflow": true,
  "steps": ["brief", "cmd", "landing-page", "emails", "press-release", "social", "sales-enablement", "partner-kit", "video-scripts", "validate", "export", "retro"]
}
```

## Agent Forge Differentiator

This isn't just "write me a press release" — it's **orchestrated, context-aware content generation with cross-asset consistency**. No other tool does this as a single workflow with dependency awareness.

What makes this a **complete launch system** (not just a content generator):
1. **Single source of truth** — CMD feeds everything, guarantees consistency
2. **A/B baked in** — every channel gets test variants automatically
3. **Full funnel** — awareness (PR/social) → conversion (LP/email) → sales (enablement) → partnerships (affiliate kit)
4. **Video-ready** — scripts tied to existing demo generation and Remotion rendering skills
5. **Self-improving** — feedback loops and retrospectives compound learnings across launches

This becomes a flagship template that shows why Agent Forge workflows are more powerful than one-shot prompting.
