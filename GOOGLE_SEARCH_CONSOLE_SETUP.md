# Google Search Console Setup Guide

This guide walks you through setting up Google Search Console for your agent-forge application to ensure your site is indexed and visible in Google search results.

## Prerequisites

- Your site must be deployed and accessible via HTTPS
- You need a Google account
- The sitemap.xml file is already located at `public/sitemap.xml`

---

## Step 1: Access Google Search Console

1. Navigate to [https://search.google.com/search-console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click "Add Property" or "Start now" if this is your first property

---

## Step 2: Add Your Property (URL Prefix Method)

### Choose URL Prefix Method (Recommended)

1. In the property type selection, choose **URL prefix**
2. Enter your full site URL including protocol:
   - Example: `https://yourdomain.com`
   - Do NOT use `http://` - use `https://` for production sites
3. Click "Continue"

### Why URL Prefix Over Domain Property?

- URL prefix method is easier to verify
- You can track specific subdomains or paths separately
- No DNS changes required for verification

---

## Step 3: Verify Ownership

Google offers multiple verification methods. Choose the one that works best for your setup:

### Option A: HTML Tag Method (Easiest for Next.js)

1. Google will provide an HTML meta tag like:
   ```html
   <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   ```

2. Add this tag to your Next.js app's main layout or `_document.js`:

   **For App Router (app/layout.tsx):**
   ```tsx
   export const metadata = {
     verification: {
       google: 'YOUR_VERIFICATION_CODE',
     },
   }
   ```

   **For Pages Router (pages/_document.tsx):**
   ```tsx
   <Head>
     <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   </Head>
   ```

3. Deploy your changes
4. Return to Search Console and click "Verify"

### Option B: HTML File Upload Method

1. Download the HTML verification file provided by Google
   - File will be named like: `googleXXXXXXXXXXXX.html`
2. Place this file in your `public/` directory
3. Deploy your changes
4. The file should be accessible at: `https://yourdomain.com/googleXXXXXXXXXXXX.html`
5. Return to Search Console and click "Verify"

### Option C: DNS Verification Method

1. Google will provide a TXT record like:
   ```
   google-site-verification=XXXXXXXXXXXXXXXXXXXX
   ```
2. Log in to your domain registrar or DNS provider
3. Add a new TXT record to your domain's DNS settings:
   - **Type:** TXT
   - **Host/Name:** @ (or leave blank for root domain)
   - **Value:** `google-site-verification=XXXXXXXXXXXXXXXXXXXX`
   - **TTL:** 3600 (or default)
4. Wait for DNS propagation (can take 5-60 minutes)
5. Return to Search Console and click "Verify"

### Option D: Google Analytics Method

1. If you already have Google Analytics installed with the same Google account
2. Search Console can automatically verify using your existing GA tracking code
3. Simply select this option and click "Verify"

---

## Step 4: Submit Your Sitemap

Once verified, submit your sitemap to help Google discover and index your pages faster.

### Submit Sitemap

1. In Google Search Console, navigate to **Sitemaps** (left sidebar)
2. In the "Add a new sitemap" field, enter:
   ```
   sitemap.xml
   ```
   (Or full URL: `https://yourdomain.com/sitemap.xml`)
3. Click "Submit"
4. Status should show "Success" within a few seconds

### Verify Sitemap is Accessible

Before submitting, verify your sitemap is publicly accessible:
- Visit `https://yourdomain.com/sitemap.xml` in your browser
- You should see XML content with your site's URLs
- If you get a 404, check that `public/sitemap.xml` is deployed correctly

### Sitemap Best Practices

- Update your sitemap whenever you add new pages
- Include only public, indexable pages (no admin pages, no user-specific pages)
- Keep sitemap under 50MB and 50,000 URLs (split into multiple if needed)
- Use absolute URLs with full protocol and domain

---

## Step 5: Request Indexing for Key Pages

Google will eventually crawl your sitemap, but you can speed up indexing for important pages.

### Request Indexing Manually

1. In Search Console, go to **URL Inspection** (top search bar)
2. Enter the full URL of a key page:
   - Example: `https://yourdomain.com/`
   - Example: `https://yourdomain.com/pricing`
3. Click "Enter" or search icon
4. Google will inspect the URL
5. If "URL is not on Google", click **Request Indexing**
6. Wait for confirmation (this queues the page for crawling)

### Priority Pages to Index First

Request indexing for these pages in order:
1. Homepage (`/`)
2. Main product/service pages
3. Pricing page
4. About page
5. Key landing pages or top content

### Indexing Timeline

- Request indexing: Instant queue
- Google crawl: 1-7 days typically
- Appear in search results: 1-14 days after crawl
- Full indexing of all pages: 2-4 weeks for new sites

---

## Step 6: Monitor Indexing Status

### Check Coverage Report

1. Navigate to **Coverage** or **Pages** (left sidebar)
2. Review indexing status:
   - **Valid:** Pages successfully indexed
   - **Warning:** Indexed but with issues
   - **Error:** Pages not indexed due to errors
   - **Excluded:** Pages intentionally not indexed (noindex, robots.txt blocked, etc.)

### Common Issues and Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| "Crawled - currently not indexed" | Low quality or duplicate content | Improve content quality, add more value |
| "Discovered - currently not indexed" | Low priority, Google hasn't crawled yet | Wait, or request indexing manually |
| "Blocked by robots.txt" | Your robots.txt blocks Googlebot | Check `public/robots.txt`, ensure it allows Googlebot |
| "Submitted URL marked 'noindex'" | Page has noindex meta tag | Remove noindex tag from production pages |
| "Server error (5xx)" | Your server returned an error | Check server logs, fix errors |
| "Redirect error" | Page redirects incorrectly | Fix redirect chains or loops |

### Key Metrics to Monitor

1. **Total Indexed Pages:** Should match your sitemap count
2. **Coverage Errors:** Should be 0 for important pages
3. **Mobile Usability:** All pages should be mobile-friendly
4. **Core Web Vitals:** Monitor performance metrics
5. **Manual Actions:** Should show "No issues detected"

---

## Step 7: Ongoing Maintenance

### Weekly Tasks

- Check for new coverage errors
- Monitor indexing progress for new pages
- Review search performance data

### Monthly Tasks

- Update sitemap if you've added new pages
- Check Core Web Vitals report
- Review top performing pages
- Identify opportunities to improve click-through rates

### When Adding New Pages

1. Update your sitemap.xml (or regenerate if dynamic)
2. Deploy changes
3. Return to Search Console > Sitemaps
4. Click on your sitemap, then click "Refresh" or resubmit
5. Request indexing for critical new pages

---

## Troubleshooting

### Verification Failed

- **HTML Tag:** Ensure tag is in `<head>` section and deployed
- **HTML File:** Ensure file is in `public/` directory and accessible
- **DNS:** Wait longer for propagation (up to 48 hours in rare cases)
- **Cache:** Clear your site's cache if using CDN

### Sitemap Not Found (404 Error)

1. Verify file exists at `public/sitemap.xml` in your repository
2. Check your build process includes the `public/` directory
3. Verify deployment platform serves static files from `public/`
4. Test direct access: `https://yourdomain.com/sitemap.xml`

### No Pages Indexed After 2 Weeks

1. Check robots.txt doesn't block Googlebot
2. Ensure no noindex tags on important pages
3. Verify site is accessible (not behind authentication)
4. Check for server errors in Coverage report
5. Ensure sitemap was successfully submitted
6. Request indexing manually for key pages

### Pages Indexed But Not Ranking

- Search Console doesn't control rankings, only indexing
- Focus on content quality, backlinks, and SEO best practices
- Use Performance report to see queries and impressions
- This is normal for new sites (sandbox period can be 3-6 months)

---

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)
- [Robots.txt Specification](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Google Search Central](https://developers.google.com/search)

---

## Quick Reference Commands

### Check if Googlebot can access your site
```bash
curl -A "Googlebot" https://yourdomain.com/sitemap.xml
```

### Validate your sitemap
```bash
# Should return 200 status code
curl -I https://yourdomain.com/sitemap.xml
```

### Check robots.txt
```bash
curl https://yourdomain.com/robots.txt
```

---

## Success Checklist

- [ ] Property added to Google Search Console
- [ ] Ownership verified via HTML tag, file, or DNS
- [ ] Sitemap submitted successfully
- [ ] Key pages requested for indexing
- [ ] No coverage errors for important pages
- [ ] Mobile usability shows no issues
- [ ] Performance data begins appearing (within 2-3 days)
- [ ] Pages begin appearing in Google search (within 1-2 weeks)

---

**Note:** Indexing is not instant. It's normal for new sites to take 1-4 weeks before pages appear in search results. Focus on creating quality content and following best practices while Google crawls and evaluates your site.
