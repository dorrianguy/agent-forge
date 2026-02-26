# 🚀 Agent Forge — Launch Checklist

_Target: Product Hunt launch + organic growth_

---

## Phase 0: Pre-Build (Research & Strategy) ✅
- [x] Strategic analysis — Agent Forge identified as #1 priority
- [x] Pricing tiers defined ($0 / $29 / $79 / $199 / Enterprise)
- [x] Landing page copy written
- [ ] **Competitor pricing audit** (in progress — sub-agent running)
- [x] Pricing confirmed: $29 / $79 / $199 / Enterprise (no free tier)
- [x] 10 starter agent templates defined

## Phase 1: Core Product (Week 1)
### Auth & Billing
- [ ] Supabase project setup (auth + database)
- [ ] User registration + login (email + Google OAuth)
- [ ] Stripe integration (subscriptions + usage metering)
- [ ] Plan enforcement (agent limits, message limits per tier)
- [ ] Billing portal (upgrade, downgrade, cancel)

### Agent Builder (MVP)
- [ ] Visual agent builder UI (React + shadcn/ui)
- [ ] System prompt editor with preview
- [ ] Knowledge base upload (PDF, text, URL scraper)
- [ ] Model selection (GPT-4o default, Claude/Gemini as options)
- [ ] Test chat panel (try agent before deploying)
- [ ] Agent settings (name, avatar, greeting, fallback behavior)

### Agent Runtime
- [ ] Hosted inference endpoint (routes to selected LLM)
- [ ] RAG pipeline (embed docs → vector search → context injection)
- [ ] Conversation memory (per-session + cross-session)
- [ ] Human escalation trigger (configurable rules)
- [ ] Rate limiting per plan tier

## Phase 2: Deployment & Embed (Week 2)
### Embed Widget
- [ ] JavaScript embed snippet (`<script>` tag)
- [ ] Customizable chat bubble (colors, position, avatar)
- [ ] "Powered by Agent Forge" badge (free tier)
- [ ] Mobile-responsive widget
- [ ] Lazy loading (no performance impact on host site)

### Multi-Channel
- [ ] Web chat (embed)
- [ ] Slack integration
- [ ] WhatsApp (Twilio/Meta API)
- [ ] Email (inbound parsing)
- [ ] API endpoint (for custom integrations)

### Template Marketplace
- [ ] 10 starter templates:
  1. Customer Support Agent
  2. Sales Qualifier
  3. Appointment Scheduler
  4. FAQ Bot
  5. E-Commerce Assistant
  6. Lead Capture Agent
  7. HR Q&A Bot
  8. IT Help Desk
  9. Restaurant Order Agent
  10. Real Estate Showing Booker
- [ ] Template preview + one-click deploy
- [ ] Community template submissions (post-launch)

## Phase 3: Launch Prep (Week 3)
### Landing Page
- [ ] Build landing page (Next.js or Astro)
- [ ] Connect to Stripe checkout
- [ ] Add demo video (60-second build walkthrough)
- [ ] Set up analytics (Plausible or PostHog)
- [ ] A/B test headline variants
- [ ] Mobile optimization pass

### Product Hunt
- [ ] Create maker profile (Dorrian)
- [ ] Prepare PH assets:
  - [ ] Logo (256x256)
  - [ ] Gallery images (1270x760) × 5
  - [ ] GIF demo (auto-playing)
  - [ ] Tagline (60 chars max)
  - [ ] Description (260 chars)
  - [ ] First comment (founder story)
- [ ] Schedule launch (Tuesday or Wednesday, 12:01 AM PT)
- [ ] Line up 10+ hunter upvotes for launch morning
- [ ] Prepare "Thank You" discount (PH-exclusive 30% off first 3 months)

### Content Marketing (Pre-Launch)
- [ ] "Build an AI Employee in 60 Seconds" — YouTube Short / TikTok
- [ ] Twitter/X thread: "I built an AI agent builder. Here's what I learned."
- [ ] Blog post: "Why We Built Agent Forge" (SEO: "no-code AI agent builder")
- [ ] Hacker News "Show HN" post draft
- [ ] Reddit posts (r/SaaS, r/startups, r/artificial, r/smallbusiness)

### Email & Waitlist
- [ ] Waitlist landing page (if launching later)
- [ ] Welcome email sequence (3 emails):
  1. Welcome + quick start guide
  2. Template showcase + use case ideas
  3. Upgrade nudge with social proof

## Phase 4: Post-Launch (Week 4+)
### Growth
- [ ] Referral program ("Give $10, Get $10")
- [ ] Affiliate program (20% recurring for 12 months)
- [ ] SEO: 10 blog posts targeting agent-building keywords
- [ ] Integration partnerships (listed on Zapier, HubSpot marketplace)
- [ ] Agency partner program (dedicated onboarding for agencies)

### Analytics & Iteration
- [ ] User behavior tracking (where do people drop off?)
- [ ] Conversion funnel optimization
- [ ] NPS survey at day 7 and day 30
- [ ] Feature request board (Canny or similar)
- [ ] Weekly metrics review (signups, activation, conversion, churn)

### Viral Loops
- [ ] "Powered by Agent Forge" link on all free-tier agents
- [ ] Agent marketplace (users share/sell agents)
- [ ] Chrome extension for ScreenshotGuard cross-sell
- [ ] "Made with Agent Forge" social sharing

---

## 🎯 Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|-------------------|
| Signups | 500 | 3,000 |
| Agents Created | 1,000 | 10,000 |
| Paid Conversions | 25 (5%) | 200 (6.7%) |
| MRR | $725 | $5,800 |
| Messages Processed | 50K | 500K |
| Product Hunt Upvotes | 500+ | — |

---

## 🚨 Blockers & Risks

| Risk | Mitigation |
|------|-----------|
| LLM costs eat margin | Usage-based pricing above limits; smart model routing (cheaper models for simple queries) |
| Shell/exec broken on dev machine | Route coding to Claude Code in VS Code |
| Brave API not configured | Use manual research / web_fetch as fallback |
| Solo developer bandwidth | Prioritize ruthlessly; MVP features only for launch |
| Competition launches first | Speed + "Powered by" viral loop + agency play = defensible |

---

_Sprint starts now. Ship in 3 weeks or die trying. 🔥_
