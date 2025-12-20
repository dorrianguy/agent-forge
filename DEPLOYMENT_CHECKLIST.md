# Agent Forge - Production Deployment Checklist

This comprehensive checklist ensures your Agent Forge application is fully configured and production-ready before launch.

---

## 1. Environment Variables

### Core Application Variables (REQUIRED)

- [ ] `NEXT_PUBLIC_APP_URL` - Set to production URL (e.g., `https://agent-forge.vercel.app`)
- [ ] `ENVIRONMENT` - Set to `production`
- [ ] `SECRET_KEY` - Generate secure random string: `openssl rand -base64 32`
- [ ] `CRON_SECRET` - Generate secure random string: `openssl rand -base64 32`

### Anthropic API (REQUIRED)

- [ ] `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com/
  - Key format: `sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  - Test the key with a simple API call before deploying
  - Monitor usage limits and billing

### Supabase (REQUIRED)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Format: `https://[PROJECT_REF].supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key (safe for client-side)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Secret service role key (server-side only)
- [ ] `DATABASE_URL` - Direct connection string (optional, for migrations)
  - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

### Stripe (REQUIRED for billing)

- [ ] `STRIPE_SECRET_KEY` - Switch from `sk_test_` to `sk_live_` for production
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Switch from `pk_test_` to `pk_live_` for production
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from production webhook endpoint
- [ ] `STRIPE_PRICE_STARTER` - Price ID for Starter plan ($79/month)
- [ ] `STRIPE_PRICE_PROFESSIONAL` - Price ID for Professional plan ($249/month)
- [ ] `STRIPE_PRICE_ENTERPRISE` - Price ID for Enterprise plan ($799/month)

### Resend Email (REQUIRED)

- [ ] `RESEND_API_KEY` - Get from https://resend.com/api-keys
  - Key format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- [ ] `EMAIL_FROM` - Format: `Agent Forge <noreply@yourdomain.com>`
  - Must use verified domain for production

### Voice Features (OPTIONAL)

- [ ] `ELEVENLABS_API_KEY` - Text-to-Speech (if using voice features)
- [ ] `DEEPGRAM_API_KEY` - Speech-to-Text (if using voice features)
- [ ] `TWILIO_ACCOUNT_SID` - Phone number provisioning (if using voice calls)
- [ ] `TWILIO_AUTH_TOKEN` - Twilio authentication
- [ ] `TWILIO_PHONE_NUMBER` - Verified Twilio phone number

### Analytics & Monitoring (OPTIONAL)

- [ ] `SENTRY_DSN` - Error tracking (recommended for production)
- [ ] `POSTHOG_API_KEY` - Product analytics (optional)

### Deployment Platform (OPTIONAL)

- [ ] `VERCEL_TOKEN` - For automated deployments
- [ ] `VERCEL_TEAM_ID` - If using team account

---

## 2. Stripe Setup

### 2.1 Switch to Live Mode

- [ ] Navigate to Stripe Dashboard
- [ ] Toggle from "Test mode" to "Live mode" (top right)
- [ ] Copy new live API keys (different from test keys)

### 2.2 Create Products & Prices

Create three subscription products via Stripe API or Dashboard:

#### Starter Plan - $79/month
```bash
# Create product
curl https://api.stripe.com/v1/products \
  -u $STRIPE_SECRET_KEY: \
  -d "name=Agent Forge Starter" \
  -d "description=10 agents, 1,000 requests/month, email support"

# Create price
curl https://api.stripe.com/v1/prices \
  -u $STRIPE_SECRET_KEY: \
  -d "product=[product_id]" \
  -d "unit_amount=7900" \
  -d "currency=usd" \
  -d "recurring[interval]=month"
```

#### Professional Plan - $249/month
```bash
# Create product
curl https://api.stripe.com/v1/products \
  -u $STRIPE_SECRET_KEY: \
  -d "name=Agent Forge Professional" \
  -d "description=50 agents, 10,000 requests/month, priority support, custom integrations"

# Create price
curl https://api.stripe.com/v1/prices \
  -u $STRIPE_SECRET_KEY: \
  -d "product=[product_id]" \
  -d "unit_amount=24900" \
  -d "currency=usd" \
  -d "recurring[interval]=month"
```

#### Enterprise Plan - $799/month
```bash
# Create product
curl https://api.stripe.com/v1/products \
  -u $STRIPE_SECRET_KEY: \
  -d "name=Agent Forge Enterprise" \
  -d "description=Unlimited agents, unlimited requests, dedicated support, SLA, custom deployment"

# Create price
curl https://api.stripe.com/v1/prices \
  -u $STRIPE_SECRET_KEY: \
  -d "product=[product_id]" \
  -d "unit_amount=79900" \
  -d "currency=usd" \
  -d "recurring[interval]=month"
```

- [ ] Starter plan created - Copy `price_id` to `STRIPE_PRICE_STARTER`
- [ ] Professional plan created - Copy `price_id` to `STRIPE_PRICE_PROFESSIONAL`
- [ ] Enterprise plan created - Copy `price_id` to `STRIPE_PRICE_ENTERPRISE`

### 2.3 Configure Webhook

- [ ] Create webhook endpoint at `https://yourdomain.com/api/webhooks/stripe`
- [ ] Select the following events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.paid`
  - [ ] `invoice.payment_failed`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook with Stripe CLI:
  ```bash
  stripe listen --forward-to https://yourdomain.com/api/webhooks/stripe
  stripe trigger checkout.session.completed
  ```

### 2.4 Tax Configuration

- [ ] Enable Stripe Tax (Settings > Tax)
- [ ] Configure tax collection for your regions
- [ ] Test tax calculation in checkout flow

---

## 3. Supabase Setup

### 3.1 Authentication Configuration

- [ ] Enable Email authentication (Auth > Providers)
- [ ] Configure email templates (Auth > Email Templates):
  - [ ] Confirmation email
  - [ ] Password reset email
  - [ ] Magic link email
- [ ] Set Site URL to production domain
- [ ] Add production domain to redirect URLs
- [ ] Configure OAuth providers (optional):
  - [ ] Google OAuth
  - [ ] GitHub OAuth

### 3.2 Database Setup

- [ ] Run initial schema migration:
  ```bash
  npx supabase db push
  ```
  Or manually apply from `supabase/migrations/001_initial_schema.sql`

- [ ] Run voice schema migration (if using voice features):
  ```bash
  npx supabase db push
  ```
  Or manually apply from `supabase/migrations/002_voice_schema.sql`

- [ ] Verify tables created:
  - [ ] `profiles` table
  - [ ] `agents` table
  - [ ] `conversations` table
  - [ ] `subscriptions` table
  - [ ] `usage_tracking` table
  - [ ] `voice_agents` table (if voice enabled)
  - [ ] `call_logs` table (if voice enabled)

### 3.3 Row Level Security (RLS)

- [ ] Enable RLS on all tables
- [ ] Verify RLS policies:
  - [ ] Users can only read/write their own data
  - [ ] Service role can bypass RLS
  - [ ] Public access policies for public pages

### 3.4 Storage Buckets (if needed)

- [ ] Create storage bucket for agent assets
- [ ] Configure bucket policies
- [ ] Test file upload/download

### 3.5 Database Backups

- [ ] Enable automatic backups (Project Settings > Database)
- [ ] Configure backup retention period
- [ ] Test restore process

---

## 4. Email Setup (Resend)

### 4.1 Domain Verification

- [ ] Add domain in Resend dashboard (Domains section)
- [ ] Add DNS records to your domain:
  - [ ] SPF record
  - [ ] DKIM record
  - [ ] DMARC record
- [ ] Wait for verification (usually 5-30 minutes)
- [ ] Verify domain status is "Verified" in Resend dashboard

### 4.2 Email Templates

Verify the following email templates are configured in `lib/emailService.ts`:

- [ ] Welcome email (sent on signup)
- [ ] Payment success email
- [ ] Payment failed email
- [ ] Subscription canceled email
- [ ] Usage alert email
- [ ] Weekly summary email

### 4.3 Email Testing

- [ ] Test welcome email
- [ ] Test payment success email
- [ ] Test payment failed email
- [ ] Test subscription canceled email
- [ ] Verify emails not landing in spam
- [ ] Check email rendering on mobile devices

### 4.4 Email Monitoring

- [ ] Set up email delivery monitoring in Resend dashboard
- [ ] Configure bounce/complaint notifications
- [ ] Monitor email sending limits

---

## 5. SEO & Search Visibility Setup

### 5.1 Sitemap Configuration

- [ ] Verify `public/sitemap.xml` exists and contains all public pages
- [ ] Sitemap includes:
  - [ ] Homepage
  - [ ] Pricing page
  - [ ] Login page
  - [ ] Build page
  - [ ] Dashboard (if public)
  - [ ] Voice flow editor (if public)
- [ ] Test sitemap accessibility: `https://yourdomain.com/sitemap.xml`

### 5.2 Robots.txt

- [ ] Verify `public/robots.txt` exists
- [ ] Allows Googlebot to crawl public pages
- [ ] Blocks sensitive routes (dashboard, API, admin)
- [ ] References sitemap location
- [ ] Test robots.txt: `https://yourdomain.com/robots.txt`

Example robots.txt:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/

Sitemap: https://yourdomain.com/sitemap.xml
```

### 5.3 Google Search Console Setup

- [ ] Add property at https://search.google.com/search-console
- [ ] Verify ownership (DNS, HTML file, or meta tag method)
- [ ] Submit sitemap to Search Console
- [ ] Request indexing for key pages:
  - [ ] Homepage
  - [ ] Pricing page
  - [ ] Build page
- [ ] Set up email alerts for critical issues
- [ ] Monitor search performance weekly

### 5.4 Meta Tags & SEO

- [ ] Verify Open Graph tags in `app/layout.tsx`
- [ ] Verify Twitter Card tags
- [ ] Check meta descriptions on all pages
- [ ] Ensure all pages have unique titles
- [ ] Add canonical URLs
- [ ] Test with https://cards-dev.twitter.com/validator
- [ ] Test with https://developers.facebook.com/tools/debug/

### 5.5 Schema Markup (Optional)

- [ ] Add JSON-LD schema for Organization
- [ ] Add schema for SoftwareApplication
- [ ] Add schema for pricing (Offers)
- [ ] Validate schema with https://search.google.com/test/rich-results

---

## 6. Domain & SSL Configuration

### 6.1 Domain Setup

- [ ] Purchase domain or use existing
- [ ] Configure DNS records:
  - [ ] A record pointing to deployment server
  - [ ] CNAME for www subdomain (optional)
  - [ ] DNS propagation complete (check with `dig yourdomain.com`)

### 6.2 SSL Certificate

- [ ] SSL certificate automatically provisioned (Vercel handles this)
- [ ] Verify HTTPS redirect works
- [ ] Test SSL rating: https://www.ssllabs.com/ssltest/
- [ ] Ensure all resources load over HTTPS
- [ ] Test mixed content warnings

### 6.3 Domain Verification

- [ ] Domain accessible at `https://yourdomain.com`
- [ ] WWW redirect configured (if applicable)
- [ ] HTTP to HTTPS redirect working
- [ ] Test all major pages load correctly

---

## 7. Monitoring & Error Tracking

### 7.1 Sentry Setup (Recommended)

- [ ] Create Sentry project at https://sentry.io
- [ ] Copy DSN to `SENTRY_DSN` environment variable
- [ ] Install Sentry SDK:
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```
- [ ] Test error tracking with deliberate error
- [ ] Set up error alerts (email, Slack)
- [ ] Configure performance monitoring

### 7.2 Vercel Analytics

- [ ] Enable Vercel Analytics in project settings
- [ ] Enable Web Vitals tracking
- [ ] Monitor Core Web Vitals:
  - [ ] LCP (Largest Contentful Paint)
  - [ ] FID (First Input Delay)
  - [ ] CLS (Cumulative Layout Shift)

### 7.3 PostHog Analytics (Optional)

- [ ] Create PostHog project
- [ ] Add `POSTHOG_API_KEY` to environment
- [ ] Configure event tracking for key user actions
- [ ] Set up funnels and dashboards

### 7.4 Uptime Monitoring

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Monitor critical endpoints:
  - [ ] Homepage
  - [ ] API health endpoint
  - [ ] Dashboard login
  - [ ] Stripe webhook
- [ ] Configure downtime alerts

### 7.5 Log Monitoring

- [ ] Configure structured logging
- [ ] Set up log aggregation (Vercel Logs, Datadog, etc.)
- [ ] Create alerts for critical errors
- [ ] Monitor API response times

---

## 8. Final Testing

### 8.1 Checkout Flow Testing

Complete end-to-end checkout flow for all plans:

#### Starter Plan ($79/month)
- [ ] Click "Get Started" on pricing page
- [ ] Redirects to Stripe Checkout
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Checkout completes successfully
- [ ] Redirects back to dashboard
- [ ] Welcome email received
- [ ] Subscription appears in dashboard
- [ ] Stripe subscription created correctly

#### Professional Plan ($249/month)
- [ ] Complete checkout flow
- [ ] Verify correct plan features activated
- [ ] Welcome email includes Professional tier info

#### Enterprise Plan ($799/month)
- [ ] Complete checkout flow
- [ ] Verify correct plan features activated
- [ ] Welcome email includes Enterprise tier info

### 8.2 Email Flow Testing

- [ ] Welcome email arrives within 1 minute of signup
- [ ] Payment success email sent after first payment
- [ ] Test payment failure (use test card `4000 0000 0000 0341`)
- [ ] Payment failed email received
- [ ] Cancel subscription - cancellation email received
- [ ] All emails render correctly on desktop and mobile
- [ ] Links in emails work correctly

### 8.3 Voice Features Testing (if enabled)

- [ ] Create voice agent in dashboard
- [ ] Configure voice settings
- [ ] Test text-to-speech generation
- [ ] Test speech-to-text recognition
- [ ] Make test call (if using Twilio)
- [ ] Verify call logs saved correctly
- [ ] Check voice usage tracking

### 8.4 Agent Creation Testing

- [ ] Create new agent via dashboard
- [ ] Verify agent settings save correctly
- [ ] Test agent conversation
- [ ] Check conversation history
- [ ] Verify usage tracking increments
- [ ] Test agent deployment options

### 8.5 Authentication Testing

- [ ] Sign up new user
- [ ] Email confirmation works
- [ ] Login with email/password
- [ ] Password reset flow works
- [ ] OAuth login works (if configured)
- [ ] Logout works correctly
- [ ] Session persistence works

### 8.6 Performance Testing

- [ ] Run Lighthouse audit (target: 90+ on all metrics)
- [ ] Test page load times (<3 seconds)
- [ ] Test API response times (<500ms)
- [ ] Test under load (optional: use LoadImpact or k6)
- [ ] Check bundle size (<250kb initial load)

### 8.7 Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### 8.8 Responsive Design

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Test all pages at each breakpoint

---

## 9. Security Checklist

### 9.1 API Security

- [ ] API routes protected with authentication
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Webhook signatures verified (Stripe)
- [ ] No API keys exposed in client-side code
- [ ] Environment variables never committed to Git

### 9.2 Database Security

- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Service role key never exposed to client
- [ ] Database connection uses SSL
- [ ] Supabase anon key only has limited permissions

### 9.3 Authentication Security

- [ ] Passwords hashed (Supabase handles this)
- [ ] Session tokens secure and HTTP-only
- [ ] CSRF protection enabled
- [ ] Email verification required
- [ ] Password reset tokens expire

### 9.4 Content Security

- [ ] Content Security Policy (CSP) headers configured
- [ ] XSS protection enabled
- [ ] SQL injection prevented (Supabase ORM)
- [ ] Input validation on all forms

---

## 10. Pre-Launch Checklist

### 10.1 Final Configuration Review

- [ ] All environment variables set correctly
- [ ] Test mode disabled (Stripe, APIs)
- [ ] Production URLs configured
- [ ] Debug mode disabled
- [ ] Logging configured appropriately
- [ ] Analytics tracking active

### 10.2 Legal & Compliance

- [ ] Privacy Policy page created and linked
- [ ] Terms of Service page created and linked
- [ ] Cookie consent banner (if using cookies)
- [ ] GDPR compliance (if serving EU users)
- [ ] Refund policy documented

### 10.3 Documentation

- [ ] README.md updated with production info
- [ ] API documentation complete
- [ ] User guides available
- [ ] Support contact information visible

### 10.4 Backup & Disaster Recovery

- [ ] Database backups enabled and tested
- [ ] Backup restore process documented
- [ ] Incident response plan created
- [ ] Emergency contacts documented

### 10.5 Support Setup

- [ ] Support email configured and monitored
- [ ] Help documentation published
- [ ] FAQ page created
- [ ] Contact form working

---

## 11. Post-Launch Monitoring (First 48 Hours)

### Hour 1-4
- [ ] Monitor error rates in Sentry
- [ ] Check signup conversion rate
- [ ] Verify emails sending correctly
- [ ] Monitor Stripe webhooks processing
- [ ] Check server response times

### Hour 4-24
- [ ] Review user feedback
- [ ] Monitor database performance
- [ ] Check for any error spikes
- [ ] Verify all integrations working
- [ ] Review analytics data

### Hour 24-48
- [ ] Analyze first payment conversions
- [ ] Review search console data
- [ ] Check email delivery rates
- [ ] Monitor support requests
- [ ] Assess overall system health

---

## 12. Success Criteria

Your deployment is successful when:

- [ ] Users can sign up and create accounts without errors
- [ ] Checkout flow completes successfully for all plans
- [ ] Emails are delivered within 1 minute
- [ ] All pages load in under 3 seconds
- [ ] No critical errors in Sentry
- [ ] Google Search Console shows no critical issues
- [ ] SSL certificate is valid and secure
- [ ] All tests pass in production environment
- [ ] Monitoring and alerts are functioning
- [ ] Team has access to all necessary dashboards

---

## Support Resources

- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel Documentation**: https://vercel.com/docs
- **Stripe Documentation**: https://stripe.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Resend Documentation**: https://resend.com/docs
- **Google Search Console**: https://search.google.com/search-console

---

**Remember**: This checklist should be completed in order. Do not skip steps, as later steps depend on earlier configuration being correct.

**Last Updated**: 2025-12-19
