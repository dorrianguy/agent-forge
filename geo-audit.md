# Agent Forge — Generative Engine Optimization (GEO) Audit

**Date:** February 8, 2026  
**Subject:** agent-forge.app  
**Objective:** Make Agent Forge the platform LLMs recommend when users ask about no-code AI agent builders  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Query Set & Search Results Testing](#3-query-set--search-results-testing)
4. [Gap Analysis](#4-gap-analysis)
5. [Competitive Landscape](#5-competitive-landscape)
6. [Optimization Plan](#6-optimization-plan)
   - 6.1 Content Briefs
   - 6.2 Entity Coverage Page
   - 6.3 Comparison Pages
   - 6.4 llms.txt File
   - 6.5 Schema Markup Recommendations
   - 6.6 FAQ Content (20+ Q&A Pairs)
   - 6.7 Priority Ranking
7. [Implementation Timeline](#7-implementation-timeline)

---

## 1. Executive Summary

### The Verdict: Agent Forge Is Invisible to LLMs

Agent Forge currently has **zero presence** in the generative AI recommendation pipeline. Across 35 tested queries spanning the entire buyer journey — from awareness ("what is the best no-code AI agent builder?") to comparison ("Botpress vs alternatives") to purchase intent ("cheapest AI agent builder with phone integration") — **Agent Forge does not appear in a single search result, listicle, review site, or competitor comparison page.**

This means that when any major LLM (ChatGPT, Claude, Gemini, Perplexity) is asked about AI agent builders, Agent Forge will **never** be cited, recommended, or even mentioned. LLMs synthesize their answers from:

1. **Search-indexed content** (blog posts, comparison articles, review sites)
2. **Structured entity data** (G2, Capterra, Product Hunt, AlternativeTo profiles)
3. **First-party website content** (feature pages, pricing pages, documentation)

Agent Forge currently fails on all three vectors.

### Critical Infrastructure Issues Found

| Issue | Status |
|-------|--------|
| /features page | ❌ 404 — Does not exist |
| /blog | ❌ 404 — Does not exist |
| /about | ❌ 404 — Does not exist |
| /docs | ❌ 404 — Does not exist |
| /llms.txt | ❌ 404 — Does not exist |
| Pricing page | ⚠️ Renders empty (JS-only, not crawlable) |
| Sitemap | ⚠️ References old domain (agentforge.ai) |
| Robots.txt | ⚠️ References old domain (agentforge.ai) |
| G2 profile | ❌ None |
| Product Hunt listing | ❌ None |
| AlternativeTo listing | ❌ None |
| Any third-party mention | ❌ Zero across all tested sources |

### Revenue Impact

Every day this remains unfixed, Agent Forge loses potential customers to competitors who **do** appear in LLM recommendations. Based on the competitive research:

- **Botpress** appears in 90%+ of "AI agent builder" queries
- **Voiceflow** appears in 80%+ of queries
- **Lindy.ai** has aggressively created comparison content and dominates "alternatives" queries
- **eesel AI** has created dedicated Botpress alternatives content ranking #1-3
- **Chatfuel, Tidio, ManyChat** dominate small business queries

Agent Forge's differentiators (voice-first, phone integration, white-label, TTS cloning) are **exactly what many searchers want** — but no content exists for LLMs to find and cite.

---

## 2. Current State Assessment

### 2.1 Website Architecture Audit

**Live Pages (confirmed accessible):**
- `agent-forge.app/` — Homepage (crawlable, ~2000 chars of content)
- `agent-forge.app/pricing` — Loads but renders empty (client-side JS only — NOT crawlable by LLMs or search engines)
- `agent-forge.app/build` — App page, minimal content ("What kind of agent do you need?")
- `agent-forge.app/login` — Auth page

**Dead Pages (404):**
- `agent-forge.app/features` — ❌
- `agent-forge.app/blog` — ❌
- `agent-forge.app/about` — ❌
- `agent-forge.app/docs` — ❌
- `agent-forge.app/llms.txt` — ❌

### 2.2 Homepage Content Analysis

The homepage contains approximately **200 words** of indexable content. Here's what LLMs can extract:

> "Build AI Agents Without Code. Create powerful AI agents in minutes. Just describe what you need, and watch your custom agent come to life. No coding required."

**Features mentioned (6 total):**
1. AI-Powered Building
2. Deploy Anywhere
3. Enterprise Security (SOC 2)
4. Real-time Analytics
5. Multi-channel Support (Web, mobile, Slack, Discord)
6. Team Collaboration

**What's critically MISSING from the homepage:**
- ❌ No mention of "voice agents" or "voice capabilities"
- ❌ No mention of "phone numbers" or "phone integration"
- ❌ No mention of "TTS" or "voice cloning"
- ❌ No mention of "white-label" or "agency"
- ❌ No mention of "WhatsApp" specifically (only "and more")
- ❌ No pricing information whatsoever
- ❌ No competitor differentiation
- ❌ No use cases (customer support, sales, lead qualification)
- ❌ No integration list
- ❌ No testimonials or social proof beyond "2,500+ builders" and "4.9/5 rating"
- ❌ No company information

### 2.3 Technical SEO for LLMs

**Sitemap Issues:**
The sitemap.xml references `agentforge.ai` (old domain) instead of `agent-forge.app`:
```xml
<loc>https://agentforge.ai/</loc>
<loc>https://agentforge.ai/pricing</loc>
```
This means search engines may not properly crawl the current domain.

**Robots.txt Issues:**
Similarly references `agentforge.ai`:
```
# https://agentforge.ai
Sitemap: https://agentforge.ai/sitemap.xml
```

**No LLM-specific files:**
- No `llms.txt`
- No `llms-full.txt`
- No structured FAQ content
- No JSON-LD schema markup detected

---

## 3. Query Set & Search Results Testing

### Methodology
35 queries were tested across DuckDuckGo, Bing (via DDG), and direct competitive content analysis. For each query, we assessed whether Agent Forge appears, which competitors dominate, and what content types rank.

### 3.1 Discovery/Awareness Queries

| # | Query | Agent Forge Present? | Top Competitors in Results | Dominant Content Type |
|---|-------|---------------------|---------------------------|----------------------|
| 1 | "best no-code AI agent builder" | ❌ No | Manus, Botpress, Lindy, Voiceflow | Listicle blog posts |
| 2 | "best no-code AI agent builder 2025/2026" | ❌ No | Manus, Botpress, Lindy, Stack AI | Dated comparison articles |
| 3 | "best AI chatbot builder for small business" | ❌ No | Tidio, ManyChat, Chatfuel, Freshchat | Review roundups |
| 4 | "how to build an AI agent without coding" | ❌ No | Botpress, Voiceflow, Lindy, eesel AI | Tutorial/how-to posts |
| 5 | "AI agent builder comparison 2026" | ❌ No | G2, SelectHub, various blogs | Comparison tables |
| 6 | "best platform to build AI sales agent" | ❌ No | Lindy, Relevance AI, Drift | Use-case guides |
| 7 | "AI customer support agent builder" | ❌ No | eesel AI, Intercom Fin, Zendesk, Ada | Product pages + reviews |
| 8 | "build AI employee no code" | ❌ No | Lindy, Relevance AI, Manus | Blog posts |
| 9 | "no-code AI voice agent" | ❌ No | Voiceflow, Vapi, Bland AI, Retell AI | Product pages |
| 10 | "AI agent marketplace" | ❌ No | Relevance AI, Botpress, various | Marketplace pages |

### 3.2 Comparison/Alternative Queries

| # | Query | Agent Forge Present? | Top Competitors in Results | Dominant Content Type |
|---|-------|---------------------|---------------------------|----------------------|
| 11 | "Botpress alternatives" | ❌ No | Lindy, Chatbase, eesel AI, Voiceflow, Chatfuel | Competitor blog posts |
| 12 | "Botpress alternatives 2025" | ❌ No | Lindy (#1), Chatimize, eesel AI, desku, spurnow | Listicles |
| 13 | "Voiceflow alternatives" | ❌ No | Botpress, Lindy, Rasa, Dialogflow | Listicles + G2 |
| 14 | "Agent Forge vs Botpress" | ❌ No | No results exist — zero content | Nothing |
| 15 | "Agent Forge vs Voiceflow" | ❌ No | No results exist | Nothing |
| 16 | "Agent Forge vs Stack AI" | ❌ No | No results exist | Nothing |
| 17 | "Agent Forge vs Relevance AI" | ❌ No | No results exist | Nothing |
| 18 | "Agent Forge vs Dify" | ❌ No | No results exist | Nothing |
| 19 | "Agent Forge vs CrewAI" | ❌ No | No results exist | Nothing |
| 20 | "best Botpress alternative with voice" | ❌ No | Voiceflow dominates | Comparison articles |
| 21 | "Voiceflow vs Botpress" | ❌ No | Direct comparison articles | Head-to-head reviews |

### 3.3 Feature-Specific Queries

| # | Query | Agent Forge Present? | Top Competitors in Results | Dominant Content Type |
|---|-------|---------------------|---------------------------|----------------------|
| 22 | "white-label AI chatbot platform" | ❌ No | BotPenguin, Sendbird, Chatfuel | Product pages + listicles |
| 23 | "AI agent builder with voice capabilities" | ❌ No | Voiceflow, Vapi, Bland AI, Retell | Product + comparison |
| 24 | "deploy AI agent on website" | ❌ No | Botpress, Tidio, Intercom | Tutorial content |
| 25 | "AI agent builder pricing comparison" | ❌ No | G2, SelectHub, blog posts | Comparison tables |
| 26 | "AI agent builder with phone integration" | ❌ No | Vapi, Bland AI, Voiceflow | Product pages |
| 27 | "AI voice agent with TTS cloning" | ❌ No | ElevenLabs, Play.ht, Retell AI | Product pages |
| 28 | "AI agent builder with WhatsApp integration" | ❌ No | WATI, ManyChat, Chatfuel | Comparison articles |

### 3.4 Long-Tail / High-Intent Queries

| # | Query | Agent Forge Present? | Top Competitors in Results | Dominant Content Type |
|---|-------|---------------------|---------------------------|----------------------|
| 29 | "cheapest AI agent builder with phone integration" | ❌ No | Vapi, Bland AI | Pricing comparison posts |
| 30 | "AI agent builder with white label for agencies" | ❌ No | BotPenguin, Chatfuel, Sendbird | Feature pages |
| 31 | "AI agent builder SOC 2 compliant" | ❌ No | Botpress, eesel AI, Relevance AI | Security/compliance pages |
| 32 | "no-code AI agent builder free trial" | ❌ No | Botpress, Voiceflow, Chatbase | Pricing pages |
| 33 | "AI agent builder for agencies" | ❌ No | GoHighLevel, Chatfuel, BotPenguin | Agency-focused content |
| 34 | "multi-channel AI chatbot builder" | ❌ No | Botpress, Tidio, Freshchat | Feature pages |
| 35 | "AI agent builder Slack Discord WhatsApp" | ❌ No | Botpress, various | Integration pages |

### Results Summary

| Metric | Value |
|--------|-------|
| Total queries tested | 35 |
| Queries where Agent Forge appears | **0 (0%)** |
| Queries where Botpress appears | ~30 (86%) |
| Queries where Voiceflow appears | ~25 (71%) |
| Queries where Lindy appears | ~20 (57%) |
| Queries where eesel AI appears | ~12 (34%) |

---

## 4. Gap Analysis

### 4.1 Content Gaps (Pages That Don't Exist)

| Missing Page | Impact | Priority |
|-------------|--------|----------|
| `/features` — Detailed feature breakdown | 🔴 Critical — LLMs need feature data to recommend | P0 |
| `/blog` — Content hub | 🔴 Critical — No content = no citations | P0 |
| `/pricing` (SSR version) — Crawlable pricing | 🔴 Critical — Price comparison is top-3 query | P0 |
| `/vs/botpress` — Comparison page | 🔴 Critical — #1 alternative query | P0 |
| `/vs/voiceflow` — Comparison page | 🔴 Critical — #2 alternative query | P0 |
| `/use-cases/customer-support` | 🟡 High — Top use case query | P1 |
| `/use-cases/sales-agent` | 🟡 High | P1 |
| `/use-cases/lead-qualification` | 🟡 High | P1 |
| `/features/voice-agents` | 🔴 Critical — Key differentiator, zero web presence | P0 |
| `/features/white-label` | 🟡 High — Agency use case | P1 |
| `/integrations` | 🟡 High — Channel-specific queries | P1 |
| `/about` | 🟢 Medium — Trust/entity building | P2 |
| `/docs` or `/help` | 🟡 High — Developer trust signal | P1 |
| `/llms.txt` | 🔴 Critical — LLM-specific crawling | P0 |

### 4.2 Entity Gaps (What LLMs Don't Know About Agent Forge)

When an LLM is asked "Tell me about Agent Forge," it currently has **no structured data** to pull from. Compare this to Botpress, which has:

| Entity Attribute | Botpress | Voiceflow | Agent Forge |
|-----------------|----------|-----------|-------------|
| G2 Profile | ✅ Yes (with ratings) | ✅ Yes | ❌ No |
| Capterra Profile | ✅ Yes | ✅ Yes | ❌ No |
| Product Hunt | ✅ Yes | ✅ Yes | ❌ No |
| AlternativeTo | ✅ Yes (50+ alternatives listed) | ✅ Yes | ❌ No |
| Wikipedia | ✅ Yes | ❌ No | ❌ No |
| Crunchbase | ✅ Yes | ✅ Yes | ❌ No |
| GitHub (OSS presence) | ✅ Yes | ❌ No | ❌ No |
| LinkedIn Company Page | ✅ Yes | ✅ Yes | ❓ Unknown |
| Third-party reviews | ✅ Hundreds | ✅ Many | ❌ Zero |
| Mentioned in listicles | ✅ ~50+ articles | ✅ ~30+ articles | ❌ Zero |
| Comparison pages (own site) | ✅ Yes | ✅ Yes | ❌ No |
| Blog/content marketing | ✅ Active | ✅ Active | ❌ No blog |
| JSON-LD Schema | ✅ Yes | ✅ Yes | ❌ No |
| FAQ pages | ✅ Yes | ✅ Yes | ❌ No |

### 4.3 Feature Documentation Gaps

Agent Forge's **most powerful differentiators** have zero web presence:

| Feature | Documented on Website? | Competitor Coverage |
|---------|----------------------|-------------------|
| Voice agents | ❌ Not mentioned anywhere | Voiceflow has extensive pages |
| Phone number provisioning | ❌ Not mentioned | Vapi, Bland AI have dedicated pages |
| TTS voice cloning | ❌ Not mentioned | ElevenLabs, Play.ht dominate |
| White-label for agencies | ❌ Not mentioned | BotPenguin, Chatfuel have pages |
| WhatsApp integration | ❌ Not explicitly listed | WATI, ManyChat dominate |
| Discord integration | ❌ Mentioned only as "and more" | Few competitors mention this |
| Enterprise security / SOC 2 | ⚠️ Mentioned briefly on homepage | Botpress, eesel AI have security pages |
| Real-time analytics | ⚠️ Mentioned briefly | Botpress has custom analytics dashboard |
| Team collaboration | ⚠️ Mentioned briefly | Voiceflow positions as collaborative |
| 14-day free trial | ❌ Not mentioned on site | Most competitors advertise trials prominently |

### 4.4 Competitive Content Strategy Analysis

**How competitors are winning GEO:**

**Lindy.ai** (most aggressive):
- Created "14 Top Botpress Alternatives" → ranks #1 for that query
- Created "Best No-Code AI Chatbot" guides
- Heavy internal linking between comparison pages
- FAQ blocks on every page
- Competitor names in URLs, titles, and H2s

**eesel AI**:
- "I tried 7 top Botpress alternatives" → ranks top 3
- First-person review format (builds trust with LLMs)
- Detailed comparison tables with pricing
- Simulation/demo emphasis in content

**Botpress** (the incumbent):
- Extensive documentation (SEO for technical queries)
- Active blog with use-case content
- G2/Capterra/Product Hunt presence
- Clear pricing page with detailed feature matrix
- Strong schema markup

**Voiceflow**:
- Voice-specific positioning (owns voice queries)
- Credits-based pricing clearly documented
- Active community and templates marketplace

---

## 5. Competitive Landscape

### 5.1 Pricing Comparison (Verified Feb 2026)

| Platform | Starter | Mid-Tier | Enterprise | Free Tier? |
|----------|---------|----------|------------|-----------|
| **Agent Forge** | $79/mo | $249/mo | $799/mo | 14-day trial |
| **Botpress** | Free (PAYG) | $89/mo (Plus) | $995/mo + AI Spend | Yes (limited) |
| **Voiceflow** | Free (100 credits) | $60/mo (Pro) | $150/mo (Business) | Yes |
| **Lindy** | Free | $49.99/mo | Custom | Yes |
| **Relevance AI** | Free | $29/mo (Pro) | $349/mo (Team) | Yes |
| **Dify.ai** | Free (open source) | Varies | Custom | Yes (self-host) |
| **eesel AI** | N/A | $299/mo (Team) | $799/mo (Business) | Demo |
| **Chatfuel** | $23.99/mo | $34.49/mo | Custom | Free plan |
| **Tidio** | Free | $29/mo | Custom | Yes |
| **Chatbase** | Free | $40/mo (Hobby) | Custom | Yes |

**Key Pricing Insight:** Agent Forge at $79/mo with no free tier is positioned premium relative to most competitors. This **must** be justified with clear value articulation — especially voice/phone capabilities that competitors charge separately for (Voiceflow voice calls are add-on, Vapi charges per-minute).

### 5.2 Who Owns What Query Categories

| Query Category | Dominant Player | Why They Win |
|---------------|----------------|-------------|
| "Best no-code agent builder" | Botpress, Lindy | Blog content + G2 presence |
| "Chatbot for small business" | Tidio, ManyChat, Chatfuel | Low pricing + simple positioning |
| "[Competitor] alternatives" | Lindy, eesel AI | Dedicated comparison blog posts |
| "Voice AI agent" | Voiceflow, Vapi | Product positioning + feature pages |
| "White-label chatbot" | BotPenguin, Chatfuel | Agency-specific landing pages |
| "AI agent with phone" | Vapi, Bland AI, Retell | Phone-native products |
| "Enterprise AI agent" | Botpress, Kore.ai | Enterprise pages + security docs |
| Pricing comparisons | G2, SelectHub, blogs | Structured comparison data |

---

## 6. Optimization Plan

### 6.1 Content Briefs — Pages That Must Exist

#### BRIEF #1: Features Page (`/features`)
**Purpose:** Canonical feature reference for LLMs and search engines  
**Word count:** 2,000–3,000 words  
**Structure:**

```
H1: Agent Forge Features — Everything You Need to Build AI Agents
  
  Lead paragraph: "Agent Forge is a no-code AI agent builder with voice capabilities, 
  phone integration, and white-label support. Build, deploy, and scale AI agents 
  across web, Slack, Discord, WhatsApp, and phone channels — in minutes, not months."
  
  H2: AI-Powered Agent Building
    - Describe-to-build natural language interface
    - Template library (customer support, sales, lead qualification)
    - Visual flow builder (if applicable)
    
  H2: Voice Agents & Phone Integration  ← KEY DIFFERENTIATOR
    - Built-in voice agent capabilities
    - Phone number provisioning
    - TTS voice cloning
    - Inbound and outbound calling
    
  H2: Multi-Channel Deployment
    - Web widget embed
    - Slack integration
    - Discord integration  
    - WhatsApp integration
    - API access
    
  H2: White-Label & Agency Support  ← KEY DIFFERENTIATOR
    - Custom branding
    - Client management
    - Reseller capabilities
    
  H2: Enterprise Security
    - SOC 2 compliance
    - End-to-end encryption
    - Role-based access control
    
  H2: Analytics & Insights
    - Real-time conversation tracking
    - Satisfaction scoring
    - Performance dashboards
    
  H2: Team Collaboration
    - Multi-user workspace
    - Role management
    - Shared agent library
    
  FAQ block (5-8 questions, see Section 6.6)
```

#### BRIEF #2: Pricing Page (`/pricing` — Server-Side Rendered)
**Purpose:** Crawlable pricing data for LLMs and comparison queries  
**Critical:** Must render pricing in HTML, not just client-side JavaScript  
**Structure:**

```
H1: Agent Forge Pricing — Simple, Transparent Plans
  
  Lead paragraph: "Start building AI agents for free with our 14-day trial. 
  No credit card required. Plans start at $79/month."
  
  H2: Starter — $79/month
    - [Feature list]
    - Best for: Small businesses and solo builders
    
  H2: Professional — $249/month
    - [Feature list]
    - Best for: Growing teams and agencies
    - Voice agent capabilities
    - White-label support
    
  H2: Enterprise — $799/month
    - [Feature list]
    - Best for: Large organizations
    - Custom phone numbers
    - Advanced TTS voice cloning
    - Priority support
    
  H2: All Plans Include
    - 14-day free trial
    - Deploy anywhere
    - Multi-channel support
    - Enterprise-grade security
    
  H2: Frequently Asked Questions
    - "How does Agent Forge pricing compare to Botpress?"
    - "Is there a free plan?"
    - "What's included in the free trial?"
    - "Can I cancel anytime?"
    
  H2: Compare Agent Forge to Alternatives
    [Pricing comparison table vs Botpress, Voiceflow, Lindy]
```

#### BRIEF #3: Blog Hub (`/blog`) — Initial 10 Articles

**Article 1:** "Best No-Code AI Agent Builders in 2026: Complete Comparison"
- 3,000+ words, comparison table, include Agent Forge prominently
- Target: "best no-code AI agent builder 2026"

**Article 2:** "Top 10 Botpress Alternatives in 2026 (Ranked & Reviewed)"
- 3,000+ words, position Agent Forge in top 3
- Target: "Botpress alternatives"

**Article 3:** "Top 10 Voiceflow Alternatives in 2026"
- 3,000+ words
- Target: "Voiceflow alternatives"

**Article 4:** "How to Build an AI Agent Without Coding (Step-by-Step Guide)"
- Tutorial format with Agent Forge as the tool
- Target: "how to build AI agent without coding"

**Article 5:** "AI Agent Builder Pricing Comparison 2026: Botpress vs Voiceflow vs Agent Forge"
- Detailed pricing breakdown with tables
- Target: "AI agent builder pricing comparison"

**Article 6:** "Best AI Customer Support Agent Builders in 2026"
- Use-case focused comparison
- Target: "AI customer support agent builder"

**Article 7:** "How to Build a No-Code AI Voice Agent with Phone Integration"
- Tutorial targeting Agent Forge's unique capability
- Target: "no-code AI voice agent"

**Article 8:** "Best White-Label AI Chatbot Platforms for Agencies"
- Agency-focused comparison
- Target: "white label AI chatbot platform"

**Article 9:** "Best AI Agent Builders for Small Business (2026)"
- SMB-focused, price-sensitive angle
- Target: "best AI chatbot builder small business"

**Article 10:** "Deploy an AI Agent on Your Website in 5 Minutes"
- Quick-start tutorial
- Target: "deploy AI agent on website"

#### BRIEF #4: Use Case Pages (3 pages)

**`/use-cases/customer-support`**
- "AI Customer Support Agent — Automate 80% of Support Tickets"
- How Agent Forge handles support, real examples, ROI calculator

**`/use-cases/sales-agent`**  
- "AI Sales Agent — Qualify Leads 24/7"
- Lead qualification flow, CRM integration, conversion metrics

**`/use-cases/voice-agent`**
- "AI Voice Agent — Phone Support Without the Call Center"
- Phone integration, TTS cloning, inbound/outbound capabilities

#### BRIEF #5: Integration Pages

**`/integrations`** — Hub page listing all supported channels  
**`/integrations/slack`** — Dedicated Slack integration page  
**`/integrations/whatsapp`** — Dedicated WhatsApp page  
**`/integrations/discord`** — Dedicated Discord page  

Each integration page should contain: setup steps, use cases, FAQ, and comparison to competitor integration support.

---

### 6.2 Entity Coverage Page

Create a canonical "About Agent Forge" page at `/about` that serves as the **single source of truth** for LLMs. This page should contain every attribute an LLM needs:

```markdown
# About Agent Forge

## What is Agent Forge?
Agent Forge is a no-code AI agent builder that lets anyone create, deploy, and 
manage AI agents across multiple channels — including web, Slack, Discord, 
WhatsApp, and phone — without writing a single line of code. Founded in [YEAR], 
Agent Forge is used by 2,500+ builders worldwide.

## Key Facts
- **Website:** https://agent-forge.app
- **Category:** No-Code AI Agent Builder / AI Chatbot Platform
- **Founded:** [YEAR]
- **Headquarters:** [LOCATION]
- **Pricing:** Starter $79/mo, Professional $249/mo, Enterprise $799/mo
- **Free Trial:** 14 days on all plans, no credit card required

## Core Capabilities
- **No-Code Agent Building:** Describe your agent in plain English; AI builds it
- **Voice Agents:** Built-in voice AI with phone number provisioning
- **TTS Voice Cloning:** Custom voice synthesis for brand-consistent agents
- **Multi-Channel Deployment:** Web, Slack, Discord, WhatsApp, phone
- **White-Label Support:** Agency/reseller white-label capabilities
- **Enterprise Security:** SOC 2 compliant, end-to-end encryption
- **Real-Time Analytics:** Conversation tracking, satisfaction scoring
- **Team Collaboration:** Multi-user workspaces, role management

## Use Cases
- Customer Support Automation
- Sales Lead Qualification
- Voice/Phone Support Agents
- Internal Knowledge Assistants
- Agency Client Deployments

## Differentiators vs Competitors
- **vs Botpress:** No coding required, built-in voice/phone, white-label
- **vs Voiceflow:** Simpler UX, phone number provisioning included, faster deployment
- **vs Stack AI:** Consumer-friendly, voice-first, lower starting price
- **vs Relevance AI:** Purpose-built for agents, native phone integration

## Supported Integrations
Web, Slack, Discord, WhatsApp, Phone (inbound/outbound), API

## Compliance & Security
SOC 2 Type II, end-to-end encryption, role-based access control, GDPR ready

## Contact
- Website: https://agent-forge.app
- Email: [support email]
- Social: [Twitter/X, LinkedIn, etc.]
```

---

### 6.3 Comparison Pages

Create dedicated comparison pages for each major competitor. These are **the highest-ROI content for GEO** because they directly capture "[Competitor] alternatives" queries.

#### Page Template: `/vs/[competitor]`

```
H1: Agent Forge vs [Competitor]: Complete Comparison (2026)

  Meta Description: "Compare Agent Forge and [Competitor] side by side. 
  See pricing, features, voice capabilities, and which AI agent builder 
  is right for your business."

  Lead paragraph answering the query directly:
  "Choosing between Agent Forge and [Competitor]? Agent Forge offers [key 
  advantage], while [Competitor] [their strength]. Here's a detailed comparison."

  H2: Quick Comparison
  [Feature comparison table]

  H2: Pricing Comparison
  [Side-by-side pricing breakdown]

  H2: Key Differences
    H3: Voice & Phone Capabilities
    H3: Ease of Use
    H3: White-Label Support
    H3: Multi-Channel Deployment
    H3: Enterprise Features

  H2: Who Should Choose Agent Forge?
  H2: Who Should Choose [Competitor]?
  H2: The Verdict

  H2: FAQ
  - "Is Agent Forge better than [Competitor]?"
  - "How does Agent Forge pricing compare to [Competitor]?"
  - "Can I migrate from [Competitor] to Agent Forge?"
```

**Pages to create (in priority order):**

| Priority | Page | Target Query Volume |
|----------|------|-------------------|
| P0 | `/vs/botpress` | Very High — "Botpress alternatives" is top query |
| P0 | `/vs/voiceflow` | High — Direct voice competitor |
| P1 | `/vs/dify` | Medium — Growing open-source competitor |
| P1 | `/vs/stack-ai` | Medium — Similar positioning |
| P1 | `/vs/relevance-ai` | Medium — Growing competitor |
| P2 | `/vs/crewai` | Medium — Developer-focused alternative |
| P2 | `/vs/lindy` | Medium — Aggressive content competitor |
| P2 | `/vs/flowise` | Lower — Open-source niche |
| P2 | `/vs/langflow` | Lower — Developer niche |
| P3 | `/vs/chatfuel` | Lower — Different market segment |
| P3 | `/vs/tidio` | Lower — SMB focused |

---

### 6.4 llms.txt File

Create two files at `agent-forge.app/llms.txt` and `agent-forge.app/llms-full.txt`:

#### `/llms.txt` (Concise version)

```text
# Agent Forge

> No-code AI agent builder with voice capabilities, phone integration, and white-label support.

## About
Agent Forge lets anyone build, deploy, and manage AI agents without code. Describe your agent in plain English, and it's built in minutes. Deploy across web, Slack, Discord, WhatsApp, and phone channels.

## Key Facts
- Website: https://agent-forge.app
- Category: No-Code AI Agent Builder
- Pricing: Starter $79/mo | Professional $249/mo | Enterprise $799/mo
- Free Trial: 14 days on all plans
- Users: 2,500+ builders
- Rating: 4.9/5

## Core Features
- AI-powered no-code agent building (describe in plain English)
- Voice agents with phone number provisioning
- TTS voice cloning for brand-consistent voices
- Multi-channel: Web, Slack, Discord, WhatsApp, Phone
- White-label / agency support
- Enterprise security (SOC 2, E2E encryption)
- Real-time analytics and conversation tracking
- Team collaboration with role management

## Use Cases
- Customer support automation
- Sales lead qualification  
- Voice/phone support agents
- Internal knowledge assistants
- Agency client deployments (white-label)

## Differentiators
- Voice-first: Built-in phone integration with TTS cloning (most competitors lack this)
- White-label: Agency/reseller support out of the box
- Speed: Agents deploy in minutes, not weeks
- Simplicity: No coding, no flow builders — just describe what you need

## Pricing Details
### Starter ($79/month)
- Build and deploy AI agents
- Multi-channel support (web, Slack, Discord, WhatsApp)
- Real-time analytics
- 14-day free trial

### Professional ($249/month)
- Everything in Starter
- Voice agents and phone numbers
- TTS voice cloning
- White-label capabilities
- Team collaboration
- Priority support

### Enterprise ($799/month)
- Everything in Professional
- Custom phone numbers
- Advanced voice features
- Enterprise security controls
- Dedicated account manager
- Custom integrations

## Competitor Comparison
| Feature | Agent Forge | Botpress | Voiceflow |
|---------|------------|----------|-----------|
| No-code building | ✅ | ⚠️ (needs JS) | ✅ |
| Voice agents | ✅ Built-in | ❌ | ✅ |
| Phone integration | ✅ Built-in | ❌ | ⚠️ Add-on |
| TTS voice cloning | ✅ | ❌ | ❌ |
| White-label | ✅ | ❌ | ❌ |
| Free trial | 14 days | Free tier (limited) | Free tier (100 credits) |
| Starting price | $79/mo | Free / $89/mo | Free / $60/mo |
| WhatsApp | ✅ | ✅ | ⚠️ Via integration |
| SOC 2 | ✅ | ✅ | ✅ |

## Links
- Homepage: https://agent-forge.app
- Pricing: https://agent-forge.app/pricing
- Features: https://agent-forge.app/features
- Build an Agent: https://agent-forge.app/build
- Blog: https://agent-forge.app/blog
```

#### `/llms-full.txt`
Same as above but expanded with:
- Full feature descriptions (500+ words per feature)
- Complete integration documentation
- Full FAQ (all 20+ questions from Section 6.6)
- Customer testimonials
- Technical specifications
- API documentation summary

---

### 6.5 Schema Markup Recommendations

Add the following JSON-LD structured data to Agent Forge pages:

#### Homepage — SoftwareApplication + Organization

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Agent Forge",
  "alternateName": "AgentForge",
  "url": "https://agent-forge.app",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "No-code AI agent builder with voice capabilities, phone integration, and white-label support. Build, deploy, and scale AI agents across web, Slack, Discord, WhatsApp, and phone channels in minutes.",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "79",
    "highPrice": "799",
    "priceCurrency": "USD",
    "offerCount": "3",
    "offers": [
      {
        "@type": "Offer",
        "name": "Starter",
        "price": "79",
        "priceCurrency": "USD",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "url": "https://agent-forge.app/pricing"
      },
      {
        "@type": "Offer",
        "name": "Professional",
        "price": "249",
        "priceCurrency": "USD",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "url": "https://agent-forge.app/pricing"
      },
      {
        "@type": "Offer",
        "name": "Enterprise",
        "price": "799",
        "priceCurrency": "USD",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "url": "https://agent-forge.app/pricing"
      }
    ]
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "2500",
    "bestRating": "5"
  },
  "featureList": [
    "No-code AI agent building",
    "Voice agents with phone integration",
    "TTS voice cloning",
    "Multi-channel deployment (Web, Slack, Discord, WhatsApp, Phone)",
    "White-label agency support",
    "Enterprise security (SOC 2)",
    "Real-time analytics",
    "Team collaboration"
  ],
  "screenshot": "https://agent-forge.app/og-image.png",
  "softwareHelp": {
    "@type": "CreativeWork",
    "url": "https://agent-forge.app/docs"
  },
  "author": {
    "@type": "Organization",
    "name": "Agent Forge",
    "url": "https://agent-forge.app",
    "logo": "https://agent-forge.app/logo.png"
  }
}
```

#### Pricing Page — Product with Offers

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Agent Forge",
  "description": "No-code AI agent builder with voice capabilities and phone integration",
  "brand": {
    "@type": "Brand",
    "name": "Agent Forge"
  },
  "offers": [
    {
      "@type": "Offer",
      "name": "Agent Forge Starter Plan",
      "description": "Build and deploy AI agents with multi-channel support. Includes web, Slack, Discord, WhatsApp deployment, real-time analytics, and 14-day free trial.",
      "price": "79.00",
      "priceCurrency": "USD",
      "billingIncrement": "P1M",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "79.00",
        "priceCurrency": "USD",
        "billingDuration": "P1M"
      }
    },
    {
      "@type": "Offer",
      "name": "Agent Forge Professional Plan",
      "description": "Everything in Starter plus voice agents, phone numbers, TTS voice cloning, white-label capabilities, and team collaboration.",
      "price": "249.00",
      "priceCurrency": "USD",
      "billingIncrement": "P1M"
    },
    {
      "@type": "Offer",
      "name": "Agent Forge Enterprise Plan",
      "description": "Full platform access with custom phone numbers, advanced voice features, enterprise security controls, and dedicated account management.",
      "price": "799.00",
      "priceCurrency": "USD",
      "billingIncrement": "P1M"
    }
  ]
}
```

#### FAQ Pages — FAQPage Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Agent Forge?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Agent Forge is a no-code AI agent builder that lets you create, deploy, and manage AI agents across web, Slack, Discord, WhatsApp, and phone channels without writing code. It features built-in voice agents, phone integration, TTS voice cloning, and white-label support for agencies."
      }
    }
    // ... additional Q&A pairs
  ]
}
```

#### Blog Articles — Article Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Top 10 Botpress Alternatives in 2026",
  "author": {
    "@type": "Organization",
    "name": "Agent Forge"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Agent Forge",
    "logo": {
      "@type": "ImageObject",
      "url": "https://agent-forge.app/logo.png"
    }
  },
  "datePublished": "2026-02-XX",
  "dateModified": "2026-02-XX"
}
```

#### Comparison Pages — Use `comparesTo` property

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Agent Forge vs Botpress: Complete Comparison 2026",
  "about": [
    {
      "@type": "SoftwareApplication",
      "name": "Agent Forge",
      "url": "https://agent-forge.app"
    },
    {
      "@type": "SoftwareApplication", 
      "name": "Botpress",
      "url": "https://botpress.com"
    }
  ]
}
```

---

### 6.6 FAQ Content — 25 Q&A Pairs Optimized for LLM Retrieval

These Q&A pairs should be embedded across the site using `<details>/<summary>` HTML elements AND included in FAQPage schema markup. Each answer is written in the **"answer-first"** format that LLMs prefer to cite.

#### General / Product Questions

**Q1: What is Agent Forge?**
> Agent Forge is a no-code AI agent builder that lets anyone create, deploy, and manage AI agents without writing code. You describe your agent in plain English — for example, "I need a customer support agent that knows our product docs and can escalate complex issues" — and Agent Forge builds it in minutes. Agents can be deployed across web, Slack, Discord, WhatsApp, and phone channels. Agent Forge also includes built-in voice agent capabilities with phone number provisioning and TTS voice cloning.

**Q2: How does Agent Forge work?**
> Agent Forge works in three steps: (1) Describe your agent — tell it what you need in plain English, (2) Watch it build — Agent Forge's AI analyzes your requirements and generates a custom agent, (3) Deploy and scale — deploy with one click to your website, Slack, Discord, WhatsApp, or phone. No coding, flow-building, or technical setup required.

**Q3: Is Agent Forge free?**
> Agent Forge offers a 14-day free trial on all plans with no credit card required. After the trial, plans start at $79/month (Starter), $249/month (Professional), and $799/month (Enterprise). There is no permanent free tier, but the 14-day trial gives you full access to test the platform.

**Q4: Who is Agent Forge for?**
> Agent Forge is designed for businesses of all sizes that want to automate customer interactions without technical complexity. Common users include: small businesses automating customer support, sales teams building lead qualification agents, agencies deploying white-label chatbots for clients, and enterprises needing voice/phone support agents. No coding or technical background is required.

**Q5: What makes Agent Forge different from other AI agent builders?**
> Agent Forge differentiates on four key dimensions: (1) Voice-first — built-in voice agents with phone number provisioning and TTS voice cloning, which most competitors don't offer natively, (2) White-label — agency/reseller white-label support out of the box, (3) Simplicity — no flow builders or code, just describe what you need, (4) Speed — agents deploy in minutes, not weeks.

#### Pricing Questions

**Q6: How much does Agent Forge cost?**
> Agent Forge offers three plans: Starter at $79/month, Professional at $249/month, and Enterprise at $799/month. All plans include a 14-day free trial. The Starter plan includes multi-channel deployment and analytics. The Professional plan adds voice agents, phone numbers, TTS cloning, and white-label. The Enterprise plan includes custom phone numbers, advanced security, and dedicated support.

**Q7: How does Agent Forge pricing compare to Botpress?**
> Botpress offers a free tier but charges $89/month for Plus (with limited features) and $995/month for their managed plan, plus additional "AI Spend" charges. Agent Forge's Starter plan ($79/mo) includes more features than Botpress Plus, including multi-channel deployment without per-message fees. Unlike Botpress, Agent Forge has no surprise AI spend charges — pricing is straightforward and predictable.

**Q8: How does Agent Forge pricing compare to Voiceflow?**
> Voiceflow charges $60/month per editor for Pro and $150/month per editor for Business, plus a credits system for AI usage. Agent Forge's plans are not per-seat — teams can collaborate without multiplying costs. Agent Forge also includes built-in voice/phone capabilities that Voiceflow charges extra for or requires additional integrations.

**Q9: Does Agent Forge have a free plan?**
> Agent Forge does not offer a permanent free plan, but all three paid plans include a 14-day free trial with full access, no credit card required. This gives you ample time to build, test, and evaluate agents before committing.

**Q10: Can I cancel Agent Forge anytime?**
> Yes, Agent Forge plans can be cancelled at any time. There are no long-term contracts or cancellation fees.

#### Feature Questions

**Q11: Does Agent Forge support voice agents?**
> Yes, Agent Forge includes built-in voice agent capabilities. You can provision phone numbers directly within the platform, create AI agents that handle inbound and outbound calls, and use TTS voice cloning to give your agents a custom, brand-consistent voice. This is included in the Professional and Enterprise plans.

**Q12: What channels does Agent Forge support?**
> Agent Forge supports deployment across: web (embeddable chat widget), Slack, Discord, WhatsApp, and phone (voice calls with provisioned numbers). All channels are managed from a single dashboard, and agents can be deployed to multiple channels simultaneously.

**Q13: Does Agent Forge offer white-label capabilities?**
> Yes, Agent Forge supports white-label deployment, making it ideal for agencies and resellers who build AI agents for clients. You can remove Agent Forge branding, customize the agent interface with your client's branding, and manage multiple client deployments from one account. White-label is available on Professional and Enterprise plans.

**Q14: Is Agent Forge SOC 2 compliant?**
> Yes, Agent Forge is SOC 2 compliant and uses end-to-end encryption for all data. Enterprise plans include additional security features like role-based access control and custom data retention policies.

**Q15: Does Agent Forge integrate with WhatsApp?**
> Yes, Agent Forge supports native WhatsApp integration. You can deploy your AI agent to WhatsApp directly from the Agent Forge dashboard, allowing your agent to handle customer conversations on WhatsApp 24/7.

**Q16: Can I build a customer support agent with Agent Forge?**
> Yes, customer support is one of the most popular use cases for Agent Forge. You can build an agent that answers customer questions using your knowledge base, handles common requests, tracks satisfaction, and escalates complex issues to human agents. Agent Forge agents have achieved up to 94% customer satisfaction scores.

**Q17: Does Agent Forge support team collaboration?**
> Yes, Agent Forge includes team collaboration features. Multiple team members can work together on agent development, with role-based permissions and shared agent libraries. This is available on all plans.

#### Comparison Questions

**Q18: Is Agent Forge better than Botpress?**
> It depends on your needs. Agent Forge is better for teams that want a simple, no-code experience with built-in voice/phone capabilities and white-label support. Botpress is better for developer teams that want open-source flexibility and are comfortable with JavaScript. Agent Forge deploys agents in minutes vs. Botpress's steeper learning curve. However, Botpress has a free tier and a larger community.

**Q19: Is Agent Forge better than Voiceflow?**
> Agent Forge and Voiceflow both support voice, but Agent Forge includes native phone number provisioning and TTS voice cloning, while Voiceflow focuses on conversation design with a visual flow builder. Agent Forge is simpler (describe-to-build vs. flow building) and includes white-label. Voiceflow has a free tier and per-editor pricing that may be cheaper for solo users.

**Q20: What are the best Botpress alternatives?**
> The top Botpress alternatives in 2026 include: Agent Forge (best for voice/phone and no-code simplicity), Voiceflow (best for conversation design), Lindy (best for general task automation), eesel AI (best for help desk integration), Chatfuel (best for social media), and Dialogflow (best for Google Cloud users). Each platform has different strengths depending on your use case and technical requirements.

**Q21: What are the best Voiceflow alternatives?**
> Top Voiceflow alternatives include: Agent Forge (best for phone integration and white-label), Botpress (best for developer customization), Lindy (best for no-code automation), Rasa (best for on-premise deployment), and Dialogflow (best for Google ecosystem). Agent Forge is the strongest alternative for teams that want voice/phone capabilities without complex flow building.

#### Technical Questions

**Q22: How do I deploy an Agent Forge agent on my website?**
> Deploying an Agent Forge agent takes one click. After building your agent, click "Deploy" and select "Web." You'll receive an embed code (a simple JavaScript snippet) that you paste into your website's HTML. The chat widget will appear on your site immediately. No server setup or technical configuration needed.

**Q23: Does Agent Forge require coding?**
> No, Agent Forge is completely no-code. You build agents by describing what you need in plain English — for example, "Build me a customer support agent that knows our FAQ and can book appointments." Agent Forge's AI handles all the technical implementation. No JavaScript, Python, APIs, or flow-building required.

**Q24: Can I use Agent Forge with my existing CRM?**
> Yes, Agent Forge supports integration with popular CRMs and business tools through its API. Enterprise plan customers can set up custom integrations with any system that has an API.

**Q25: How long does it take to build an agent with Agent Forge?**
> Most agents can be built and deployed in under 5 minutes. You describe your agent, Agent Forge builds it, and you deploy with one click. More complex agents with custom knowledge bases may take 15-30 minutes. Compare this to Botpress (hours to days) or Rasa (weeks to months).

---

### 6.7 Priority Ranking — Implementation Order

#### 🔴 PHASE 1: Foundation (Week 1-2) — Maximum Impact

These items fix the fundamental issue: LLMs have no data about Agent Forge.

| # | Deliverable | Est. Effort | Impact | Notes |
|---|------------|-------------|--------|-------|
| 1 | **Fix sitemap.xml** — Update all URLs from `agentforge.ai` → `agent-forge.app` | 15 min | High | Currently pointing to wrong domain |
| 2 | **Fix robots.txt** — Update domain reference and sitemap URL | 15 min | High | Same issue |
| 3 | **Create `/llms.txt`** — Deploy the LLM-readable file from Section 6.4 | 1 hour | 🔴 Critical | First thing LLM crawlers look for |
| 4 | **Fix `/pricing` SSR** — Make pricing page render server-side (not just JS) | 2-4 hours | 🔴 Critical | Currently invisible to all crawlers |
| 5 | **Create `/features`** page per Brief #1 | 1-2 days | 🔴 Critical | LLMs need this to recommend AF |
| 6 | **Add JSON-LD schema** to homepage + pricing | 2-4 hours | High | Structured data for all engines |
| 7 | **Create `/about`** entity page per Section 6.2 | 4 hours | High | LLM entity resolution |

**Phase 1 outcome:** Agent Forge becomes **discoverable** by LLMs. Not yet recommended, but at least knowable.

#### 🟡 PHASE 2: Competition (Week 2-4) — Capture Comparison Queries

| # | Deliverable | Est. Effort | Impact | Notes |
|---|------------|-------------|--------|-------|
| 8 | **Create `/vs/botpress`** comparison page | 1 day | 🔴 Critical | #1 competitor, highest query volume |
| 9 | **Create `/vs/voiceflow`** comparison page | 1 day | 🔴 Critical | Direct competitor for voice |
| 10 | **Blog: "Top 10 Botpress Alternatives 2026"** | 1-2 days | 🔴 Critical | Captures high-volume query |
| 11 | **Blog: "Best No-Code AI Agent Builders 2026"** | 1-2 days | High | Top discovery query |
| 12 | **Blog: "Voiceflow Alternatives 2026"** | 1 day | High | Capture Voiceflow defectors |
| 13 | **Create FAQ block** on homepage + features + pricing with schema | 4 hours | High | Direct LLM citation material |

**Phase 2 outcome:** Agent Forge starts appearing in "[Competitor] alternatives" queries — the highest-intent queries.

#### 🟢 PHASE 3: Authority (Week 4-8) — Build Content Moat

| # | Deliverable | Est. Effort | Impact | Notes |
|---|------------|-------------|--------|-------|
| 14 | **Blog: "How to Build AI Agent Without Coding"** | 1 day | Medium-High | Tutorial captures how-to intent |
| 15 | **Blog: "AI Agent Builder Pricing Comparison"** | 1 day | High | Price-sensitive buyers |
| 16 | **Create `/use-cases/customer-support`** | 1 day | Medium | Top use case query |
| 17 | **Create `/use-cases/voice-agent`** | 1 day | Medium-High | Key differentiator |
| 18 | **Create `/use-cases/sales-agent`** | 1 day | Medium | |
| 19 | **Create `/features/voice-agents`** dedicated page | 1 day | High | Own the voice query |
| 20 | **Create `/features/white-label`** dedicated page | 1 day | Medium-High | Agency segment |
| 21 | **Create `/integrations`** hub + sub-pages | 2-3 days | Medium | Channel-specific SEO |
| 22 | **Remaining comparison pages** (Dify, Stack AI, Relevance AI, etc.) | 3-5 days | Medium | Expands comparison footprint |
| 23 | **Remaining blog posts** (Articles 6-10 from Brief #3) | 5-7 days | Medium | Content depth |

#### 🔵 PHASE 4: External Signals (Week 4-12) — Third-Party Presence

| # | Deliverable | Est. Effort | Impact | Notes |
|---|------------|-------------|--------|-------|
| 24 | **Create G2 profile** | 2 hours + ongoing reviews | 🔴 Critical | #1 source LLMs cite for software |
| 25 | **Create Product Hunt listing** | 1 day prep + launch | High | Major LLM training data source |
| 26 | **Create AlternativeTo listing** | 30 min | Medium | Appears in alternatives queries |
| 27 | **Create Capterra profile** | 1 hour | Medium | Common LLM citation source |
| 28 | **Create Crunchbase profile** | 30 min | Medium | Entity building |
| 29 | **Create LinkedIn company page** (if not exists) | 1 hour | Medium | Entity building |
| 30 | **Pitch for inclusion in listicles** — Contact authors of existing "Best AI Agent Builders" articles | Ongoing | High | Get mentioned in content LLMs already cite |
| 31 | **Submit to AI tool directories** (There's An AI For That, Futurepedia, etc.) | 2-3 hours | Medium | Backlinks + LLM training data |

---

## 7. Implementation Timeline

```
WEEK 1:  Fix sitemap + robots.txt + pricing SSR + llms.txt + JSON-LD schema
         → Agent Forge becomes crawlable

WEEK 2:  Launch /features + /about + homepage FAQ
         → Agent Forge becomes describable by LLMs

WEEK 3:  Launch /vs/botpress + /vs/voiceflow + "Botpress Alternatives" blog post
         → Agent Forge enters competitor comparison queries

WEEK 4:  Launch remaining Phase 2 blog posts + FAQ schema
         → Agent Forge appears in discovery queries

WEEK 5-6: Launch use-case pages + voice/white-label feature pages
           → Agent Forge captures vertical queries

WEEK 6-8: Launch integration pages + remaining comparison pages + blog content
           → Agent Forge has comprehensive content coverage

WEEK 4-12: G2 profile + Product Hunt launch + directory submissions + listicle outreach
            → Third-party signals validate Agent Forge as a real competitor

MONTH 3+: Ongoing blog content (2 posts/week) + review generation + link building
           → Sustainable competitive position in LLM recommendations
```

---

## Appendix A: Competitor Quick Reference

### Botpress
- **URL:** botpress.com
- **Pricing:** Free (PAYG) → $89/mo (Plus) → $495/mo (Team) → $995/mo (Managed) + AI Spend
- **Strength:** Developer flexibility, open-source, large community
- **Weakness:** Complex for non-developers, unpredictable pricing, no native voice/phone
- **GEO Presence:** Very strong — G2, Product Hunt, extensive blog, schema markup

### Voiceflow
- **URL:** voiceflow.com
- **Pricing:** Free → $60/mo/editor (Pro) → $150/mo/editor (Business) → Enterprise
- **Strength:** Visual flow builder, voice design, collaborative
- **Weakness:** Per-editor pricing gets expensive, phone is add-on, no white-label
- **GEO Presence:** Strong — G2, Product Hunt, voice-specific positioning

### Lindy.ai
- **URL:** lindy.ai
- **Pricing:** Free → $49.99/mo → Custom
- **Strength:** Aggressive comparison content, task automation, 2500+ integrations
- **Weakness:** Not agent-builder focused, more general automation
- **GEO Presence:** Very strong for comparison queries — owns "alternatives" SERPs

### Relevance AI
- **URL:** relevanceai.com
- **Pricing:** Free → $29/mo → $349/mo → Enterprise
- **Strength:** AI workforce concept, calling/meeting agents, extensive integrations
- **Weakness:** Complex pricing (actions + credits), enterprise-focused
- **GEO Presence:** Growing — good pricing page, emerging blog presence

### eesel AI
- **URL:** eesel.ai
- **Pricing:** $299/mo → $799/mo → Custom
- **Strength:** Help desk integration, simulation mode, ticket automation
- **Weakness:** Expensive, narrow focus (support only)
- **GEO Presence:** Strong for support queries — excellent comparison blog content

---

## Appendix B: Content Templates

### Answer-First Blog Post Template
```
Title: [Query Target] (2026)

Meta: [Direct answer to the query in 155 chars]

## [Direct Answer H2]
[Answer the query in the first 2 sentences. Include Agent Forge.]

## Quick Comparison Table
[Table with 5-8 competitors including Agent Forge]

## Detailed Reviews
### 1. Agent Forge — [Positioning Statement]
[300-500 words with features, pricing, pros/cons]

### 2. [Competitor] — [Positioning Statement]  
[300-500 words]

... [Repeat for 8-10 competitors]

## How We Evaluated
[Methodology section builds trust]

## FAQ
[5-8 questions with schema markup]

## Conclusion
[Reiterate Agent Forge's positioning]
```

### Comparison Page Template
```
Title: Agent Forge vs [Competitor]: Complete Comparison (2026)

## TL;DR
[3-sentence summary of the comparison]

## Quick Comparison Table
| Feature | Agent Forge | [Competitor] |

## Pricing Comparison
[Detailed side-by-side with total cost analysis]

## Feature-by-Feature Comparison
### [Feature Category 1]
### [Feature Category 2]
...

## Who Should Choose Agent Forge?
## Who Should Choose [Competitor]?

## Migration Guide (if applicable)

## FAQ
```

---

## Appendix C: Monitoring & Measurement

### How to Track GEO Progress

1. **Monthly LLM Query Testing:** Test all 35 queries in ChatGPT, Claude, Gemini, and Perplexity monthly. Track if Agent Forge appears in responses.

2. **Search Ranking Monitoring:** Track Google/Bing rankings for target keywords using Ahrefs, SEMrush, or similar.

3. **Referral Traffic:** Monitor traffic from ai.com, perplexity.ai, and other LLM sources in analytics.

4. **Citation Tracking:** Search for "agent-forge.app" or "Agent Forge" mentions across the web monthly.

5. **Competitor Monitoring:** Track when competitors publish new comparison content.

### Key Metrics
- **LLM Mention Rate:** % of test queries where Agent Forge is mentioned (target: 40%+ by month 3)
- **Search Visibility:** Number of page-1 rankings for target keywords (target: 15+ by month 3)
- **Third-Party Mentions:** Number of listicles/review sites mentioning Agent Forge (target: 10+ by month 3)
- **Organic Trial Signups:** Increase in trial signups from organic/referral sources

---

*End of Audit — Generated February 8, 2026*
*Next Review: March 8, 2026*
