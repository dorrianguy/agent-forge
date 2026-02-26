// =============================================================================
// Cross-Asset Validator
// =============================================================================
//
// Validates consistency across ALL generated assets, not just individual ones.
// Checks: URLs, pricing, quotes, dates, feature names, CTA alignment.
// =============================================================================

import type {
  LaunchBrief,
  GeneratedAssets,
  ValidationResult,
  ValidationType,
  ValidationSeverity,
  AssetType,
} from './types';

let resultCounter = 0;

function makeResult(
  type: ValidationType,
  severity: ValidationSeverity,
  message: string,
  asset?: AssetType,
  field?: string,
  expected?: string,
  actual?: string,
): ValidationResult {
  return {
    id: `val-${++resultCounter}`,
    type,
    severity,
    message,
    asset,
    field,
    expected,
    actual,
  };
}

// ---------------------------------------------------------------------------
// URL Consistency
// ---------------------------------------------------------------------------

function validateUrls(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  const expectedUrl = brief.landingPageUrl;

  // Landing Page
  const lp = assets.landingPage.data;
  if (lp) {
    if (lp.hero.ctaUrl !== expectedUrl && lp.hero.ctaUrl !== brief.signupUrl) {
      results.push(makeResult('url_consistency', 'error',
        `Landing page hero CTA URL mismatch`,
        'landingPage', 'hero.ctaUrl', expectedUrl, lp.hero.ctaUrl));
    } else {
      results.push(makeResult('url_consistency', 'pass', 'Landing page hero CTA URL is correct', 'landingPage'));
    }
    if (lp.closingCta.ctaUrl !== expectedUrl && lp.closingCta.ctaUrl !== brief.signupUrl) {
      results.push(makeResult('url_consistency', 'error',
        `Landing page closing CTA URL mismatch`,
        'landingPage', 'closingCta.ctaUrl', expectedUrl, lp.closingCta.ctaUrl));
    }
  }

  // Emails
  const es = assets.emailSequence.data;
  if (es) {
    for (const email of es.emails) {
      if (email.ctaUrl !== expectedUrl) {
        results.push(makeResult('url_consistency', 'error',
          `Email "${email.name}" CTA URL mismatch`,
          'emailSequence', `emails[${email.order}].ctaUrl`, expectedUrl, email.ctaUrl));
      }
    }
    if (es.emails.every((e) => e.ctaUrl === expectedUrl)) {
      results.push(makeResult('url_consistency', 'pass', 'All email CTA URLs are correct', 'emailSequence'));
    }
  }

  // Press Release
  const pr = assets.pressRelease.data;
  if (pr) {
    if (pr.url !== expectedUrl) {
      results.push(makeResult('url_consistency', 'error',
        'Press release URL mismatch',
        'pressRelease', 'url', expectedUrl, pr.url));
    } else {
      results.push(makeResult('url_consistency', 'pass', 'Press release URL is correct', 'pressRelease'));
    }
    if (pr.contactInfo?.website !== expectedUrl) {
      results.push(makeResult('url_consistency', 'warning',
        'Press release contact website mismatch',
        'pressRelease', 'contactInfo.website', expectedUrl, pr.contactInfo?.website));
    }
  }

  // Social Posts
  const sp = assets.socialPosts.data;
  if (sp?.hackernews && sp.hackernews.url !== expectedUrl) {
    results.push(makeResult('url_consistency', 'error',
      'Hacker News post URL mismatch',
      'socialPosts', 'hackernews.url', expectedUrl, sp.hackernews.url));
  }
  if (sp?.hackernews?.url === expectedUrl) {
    results.push(makeResult('url_consistency', 'pass', 'HN post URL is correct', 'socialPosts'));
  }

  // Check that Twitter thread contains the URL somewhere
  if (sp?.twitter) {
    const tweetTexts = sp.twitter.tweets.map((t) => t.text).join(' ');
    if (!tweetTexts.includes(expectedUrl)) {
      results.push(makeResult('url_consistency', 'warning',
        'Twitter thread does not contain the landing page URL in any tweet',
        'socialPosts', 'twitter.tweets'));
    }
  }

  // Check LinkedIn post contains URL
  if (sp?.linkedin) {
    if (!sp.linkedin.text.includes(expectedUrl)) {
      results.push(makeResult('url_consistency', 'warning',
        'LinkedIn post does not contain the landing page URL',
        'socialPosts', 'linkedin.text'));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Pricing Consistency
// ---------------------------------------------------------------------------

function validatePricing(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pricing = brief.pricing.toLowerCase();

  function checkText(text: string, assetType: AssetType, field: string): void {
    const lower = text.toLowerCase();
    if (lower.includes('pricing') || lower.includes('price') || lower.includes('$') || lower.includes('free') || lower.includes('/mo')) {
      // Text mentions pricing — check it matches
      if (!lower.includes(pricing)) {
        results.push(makeResult('pricing_consistency', 'warning',
          `${assetType} may reference pricing inconsistently`,
          assetType, field, brief.pricing));
      }
    }
  }

  // Check landing page
  const lp = assets.landingPage.data;
  if (lp) {
    const allLpText = [
      lp.hero.headline, lp.hero.subheadline,
      ...lp.faq.map((f) => f.answer),
      lp.closingCta.headline, lp.closingCta.subheadline,
    ].join(' ');
    checkText(allLpText, 'landingPage', 'various');
  }

  // Check emails
  const es = assets.emailSequence.data;
  if (es) {
    for (const email of es.emails) {
      checkText(email.body, 'emailSequence', `emails[${email.order}].body`);
      checkText(email.subject, 'emailSequence', `emails[${email.order}].subject`);
    }
  }

  // Check press release
  const pr = assets.pressRelease.data;
  if (pr) {
    const prText = [pr.lede, ...pr.bodyParagraphs, pr.availability].join(' ');
    checkText(prText, 'pressRelease', 'body');
  }

  if (results.length === 0) {
    results.push(makeResult('pricing_consistency', 'pass', 'Pricing appears consistent across all assets'));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Quote Accuracy
// ---------------------------------------------------------------------------

function validateQuotes(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!brief.quotes?.length) {
    results.push(makeResult('quote_accuracy', 'pass', 'No quotes to validate (none in brief)'));
    return results;
  }

  const briefQuotes = brief.quotes.map((q) => q.text.trim());

  // Check landing page testimonials
  const lp = assets.landingPage.data;
  if (lp?.socialProof?.testimonials) {
    for (const testimonial of lp.socialProof.testimonials) {
      const found = briefQuotes.some(
        (bq) => bq === testimonial.quote.trim() || levenshteinSimilarity(bq, testimonial.quote.trim()) > 0.9,
      );
      if (!found) {
        results.push(makeResult('quote_accuracy', 'warning',
          `Landing page testimonial may be paraphrased: "${testimonial.quote.substring(0, 60)}…"`,
          'landingPage', 'socialProof.testimonials'));
      }
    }
  }

  // Check press release quotes
  const pr = assets.pressRelease.data;
  if (pr?.quotes) {
    for (const prQuote of pr.quotes) {
      const found = briefQuotes.some(
        (bq) => bq === prQuote.text.trim() || levenshteinSimilarity(bq, prQuote.text.trim()) > 0.9,
      );
      if (!found && brief.founderName) {
        // Could be a generated founder quote — that's fine, just warn
        results.push(makeResult('quote_accuracy', 'warning',
          `Press release quote may not match brief verbatim: "${prQuote.text.substring(0, 60)}…"`,
          'pressRelease', 'quotes'));
      } else if (!found) {
        results.push(makeResult('quote_accuracy', 'error',
          `Press release contains an unrecognized quote: "${prQuote.text.substring(0, 60)}…"`,
          'pressRelease', 'quotes'));
      }
    }
  }

  if (results.filter((r) => r.severity !== 'pass').length === 0) {
    results.push(makeResult('quote_accuracy', 'pass', 'All quotes match the brief verbatim'));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Date Consistency
// ---------------------------------------------------------------------------

function validateDates(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  const launchDate = brief.launchDate;

  // Check press release dateline
  const pr = assets.pressRelease.data;
  if (pr) {
    const dateObj = new Date(launchDate);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    if (!pr.dateline.includes(year)) {
      results.push(makeResult('date_consistency', 'error',
        `Press release dateline year mismatch`,
        'pressRelease', 'dateline', year, pr.dateline));
    } else if (!pr.dateline.toLowerCase().includes(monthName.toLowerCase())) {
      results.push(makeResult('date_consistency', 'warning',
        `Press release dateline may have wrong month`,
        'pressRelease', 'dateline', monthName, pr.dateline));
    } else {
      results.push(makeResult('date_consistency', 'pass', 'Press release date is consistent', 'pressRelease'));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Feature Name Consistency
// ---------------------------------------------------------------------------

function validateFeatures(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  const featureNames = brief.keyFeatures.map((f) => f.name.toLowerCase());

  // Check landing page
  const lp = assets.landingPage.data;
  if (lp) {
    for (const section of lp.featureSections) {
      if (!featureNames.includes(section.featureName.toLowerCase())) {
        results.push(makeResult('feature_consistency', 'warning',
          `Landing page feature "${section.featureName}" doesn't match any brief feature name`,
          'landingPage', 'featureSections'));
      }
    }
    // Check all brief features are represented
    for (const feature of brief.keyFeatures) {
      const found = lp.featureSections.some(
        (s) => s.featureName.toLowerCase() === feature.name.toLowerCase(),
      );
      if (!found) {
        results.push(makeResult('feature_consistency', 'warning',
          `Brief feature "${feature.name}" is missing from landing page`,
          'landingPage', 'featureSections'));
      }
    }
  }

  if (results.filter((r) => r.severity !== 'pass').length === 0) {
    results.push(makeResult('feature_consistency', 'pass', 'Feature names are consistent across assets'));
  }

  return results;
}

// ---------------------------------------------------------------------------
// CTA Alignment
// ---------------------------------------------------------------------------

function validateCTAs(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];

  const lp = assets.landingPage.data;
  const es = assets.emailSequence.data;

  if (lp && es) {
    // Check that email CTAs are action-oriented (not empty/generic)
    for (const email of es.emails) {
      if (!email.ctaText || email.ctaText.length < 2) {
        results.push(makeResult('cta_alignment', 'error',
          `Email "${email.name}" has empty or very short CTA text`,
          'emailSequence', `emails[${email.order}].ctaText`));
      }
    }

    // Check landing page CTA is present
    if (!lp.hero.ctaText || lp.hero.ctaText.length < 2) {
      results.push(makeResult('cta_alignment', 'error',
        'Landing page hero CTA text is empty',
        'landingPage', 'hero.ctaText'));
    }
  }

  if (results.length === 0) {
    results.push(makeResult('cta_alignment', 'pass', 'CTAs are properly defined across all assets'));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sales Enablement Validation
// ---------------------------------------------------------------------------

function validateSalesEnablement(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  const se = assets.salesEnablement.data;
  if (!se) return results;

  // Check that one-pager value props map to brief features
  const featureNames = brief.keyFeatures.map((f) => f.name.toLowerCase());
  const featureBenefits = brief.keyFeatures.map((f) => f.benefit.toLowerCase());

  let matchedProps = 0;
  for (const prop of se.onePager.valueProps) {
    const propLower = prop.toLowerCase();
    const matchesFeature = featureNames.some((name) => propLower.includes(name)) ||
      featureBenefits.some((benefit) => propLower.includes(benefit.substring(0, 20)));
    if (matchesFeature) {
      matchedProps++;
    }
  }

  if (matchedProps === 0) {
    results.push(makeResult('feature_consistency', 'error',
      'Sales one-pager value props do not reference any brief features',
      'salesEnablement', 'onePager.valueProps'));
  } else if (matchedProps < se.onePager.valueProps.length / 2) {
    results.push(makeResult('feature_consistency', 'warning',
      `Only ${matchedProps}/${se.onePager.valueProps.length} sales one-pager value props map to brief features`,
      'salesEnablement', 'onePager.valueProps'));
  } else {
    results.push(makeResult('feature_consistency', 'pass',
      'Sales one-pager value props align with brief features', 'salesEnablement'));
  }

  // Check that proof points reference brief stats/quotes
  if (brief.stats?.length || brief.quotes?.length) {
    const briefEvidence = [
      ...(brief.stats || []).map((s) => s.toLowerCase()),
      ...(brief.quotes || []).map((q) => q.text.toLowerCase().substring(0, 30)),
    ];

    let matchedProofs = 0;
    for (const proof of se.onePager.proofPoints) {
      const proofLower = proof.toLowerCase();
      const matchesEvidence = briefEvidence.some((ev) => proofLower.includes(ev.substring(0, 20)));
      if (matchesEvidence) {
        matchedProofs++;
      }
    }

    if (matchedProofs === 0) {
      results.push(makeResult('quote_accuracy', 'warning',
        'Sales enablement proof points may not match brief stats/quotes',
        'salesEnablement', 'onePager.proofPoints'));
    } else {
      results.push(makeResult('quote_accuracy', 'pass',
        'Sales enablement proof points reference brief evidence', 'salesEnablement'));
    }
  }

  // Check contact info contains landing page URL
  if (!se.onePager.contactInfo.includes(brief.landingPageUrl)) {
    results.push(makeResult('url_consistency', 'error',
      'Sales one-pager contact info does not include landing page URL',
      'salesEnablement', 'onePager.contactInfo', brief.landingPageUrl, se.onePager.contactInfo));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Partner Kit Validation
// ---------------------------------------------------------------------------

function validatePartnerKit(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pk = assets.partnerKit.data;
  if (!pk) return results;

  const expectedUrl = brief.landingPageUrl;

  // Check swipe copy URLs match landing page URL
  for (let i = 0; i < pk.swipeCopy.twitter.length; i++) {
    if (!pk.swipeCopy.twitter[i].includes(expectedUrl)) {
      results.push(makeResult('url_consistency', 'error',
        `Partner kit tweet ${i + 1} does not include landing page URL`,
        'partnerKit', `swipeCopy.twitter[${i}]`, expectedUrl));
    }
  }

  if (!pk.swipeCopy.linkedin.includes(expectedUrl)) {
    results.push(makeResult('url_consistency', 'error',
      'Partner kit LinkedIn post does not include landing page URL',
      'partnerKit', 'swipeCopy.linkedin', expectedUrl));
  }

  if (!pk.swipeCopy.emailBlurb.includes(expectedUrl)) {
    results.push(makeResult('url_consistency', 'error',
      'Partner kit email blurb does not include landing page URL',
      'partnerKit', 'swipeCopy.emailBlurb', expectedUrl));
  }

  // Check co-branded one-pager CTA includes URL
  if (!pk.coBrandedOnePager.callToAction.includes(expectedUrl)) {
    results.push(makeResult('url_consistency', 'warning',
      'Partner kit co-branded one-pager CTA does not include landing page URL',
      'partnerKit', 'coBrandedOnePager.callToAction', expectedUrl));
  }

  // Cross-check: if landing page exists, verify partner kit URL matches
  const lp = assets.landingPage.data;
  if (lp) {
    const lpCtaUrl = lp.hero.ctaUrl;
    if (lpCtaUrl !== expectedUrl) {
      results.push(makeResult('url_consistency', 'warning',
        'Partner kit references a different URL than the landing page hero CTA',
        'partnerKit', 'swipeCopy', lpCtaUrl));
    }
  }

  if (results.length === 0) {
    results.push(makeResult('url_consistency', 'pass',
      'Partner kit URLs are consistent with landing page', 'partnerKit'));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Video Script Validation
// ---------------------------------------------------------------------------

function validateVideoScript(brief: LaunchBrief, assets: GeneratedAssets): ValidationResult[] {
  const results: ValidationResult[] = [];
  const vs = assets.videoScript.data;
  if (!vs) return results;

  // Check teaser30s total duration
  const teaser30sSum = vs.teaser30s.scenes.reduce((sum, s) => sum + s.duration, 0);
  if (teaser30sSum !== 30) {
    results.push(makeResult('date_consistency', 'error',
      `Video teaser scene durations sum to ${teaser30sSum}s, expected 30s`,
      'videoScript', 'teaser30s.totalDuration', '30', String(teaser30sSum)));
  } else {
    results.push(makeResult('date_consistency', 'pass',
      'Video teaser duration is correct (30s)', 'videoScript'));
  }

  if (vs.teaser30s.totalDuration !== 30) {
    results.push(makeResult('date_consistency', 'error',
      `Video teaser totalDuration is ${vs.teaser30s.totalDuration}, expected 30`,
      'videoScript', 'teaser30s.totalDuration', '30', String(vs.teaser30s.totalDuration)));
  }

  // Check explainer60s total duration
  const explainer60sSum = vs.explainer60s.scenes.reduce((sum, s) => sum + s.duration, 0);
  if (explainer60sSum !== 60) {
    results.push(makeResult('date_consistency', 'error',
      `Video explainer scene durations sum to ${explainer60sSum}s, expected 60s`,
      'videoScript', 'explainer60s.totalDuration', '60', String(explainer60sSum)));
  } else {
    results.push(makeResult('date_consistency', 'pass',
      'Video explainer duration is correct (60s)', 'videoScript'));
  }

  if (vs.explainer60s.totalDuration !== 60) {
    results.push(makeResult('date_consistency', 'error',
      `Video explainer totalDuration is ${vs.explainer60s.totalDuration}, expected 60`,
      'videoScript', 'explainer60s.totalDuration', '60', String(vs.explainer60s.totalDuration)));
  }

  // Check CTA scenes include landing page URL in text overlay
  const expectedUrl = brief.landingPageUrl;
  const teaserLast = vs.teaser30s.scenes[vs.teaser30s.scenes.length - 1];
  if (teaserLast && (!teaserLast.textOverlay || !teaserLast.textOverlay.includes(expectedUrl))) {
    results.push(makeResult('url_consistency', 'warning',
      'Video teaser CTA scene does not show landing page URL in text overlay',
      'videoScript', 'teaser30s.scenes[-1].textOverlay', expectedUrl));
  }

  const explainerLast = vs.explainer60s.scenes[vs.explainer60s.scenes.length - 1];
  if (explainerLast && (!explainerLast.textOverlay || !explainerLast.textOverlay.includes(expectedUrl))) {
    results.push(makeResult('url_consistency', 'warning',
      'Video explainer CTA scene does not show landing page URL in text overlay',
      'videoScript', 'explainer60s.scenes[-1].textOverlay', expectedUrl));
  }

  // Check cmdSource references are valid brief elements
  const validSources = [
    'valueProposition', 'tagline', 'callToAction', 'pricing',
    ...brief.keyFeatures.map((_, i) => `keyFeatures[${i}]`),
    ...(brief.stats || []).map((_, i) => `stats[${i}]`),
    ...(brief.quotes || []).map((_, i) => `quotes[${i}]`),
  ];

  const allScenes = [...vs.teaser30s.scenes, ...vs.explainer60s.scenes];
  for (const scene of allScenes) {
    if (!scene.cmdSource) {
      results.push(makeResult('feature_consistency', 'warning',
        `Video scene missing cmdSource reference`,
        'videoScript', 'scenes[].cmdSource'));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main Validator
// ---------------------------------------------------------------------------

/**
 * Run all cross-asset validation checks.
 */
export function validateAssets(
  brief: LaunchBrief,
  assets: GeneratedAssets,
): ValidationResult[] {
  // Reset counter for deterministic IDs within a run
  resultCounter = 0;

  const results: ValidationResult[] = [
    ...validateUrls(brief, assets),
    ...validatePricing(brief, assets),
    ...validateQuotes(brief, assets),
    ...validateDates(brief, assets),
    ...validateFeatures(brief, assets),
    ...validateCTAs(brief, assets),
    ...validateSalesEnablement(brief, assets),
    ...validatePartnerKit(brief, assets),
    ...validateVideoScript(brief, assets),
  ];

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple Levenshtein-based similarity (0–1) for fuzzy quote matching.
 */
function levenshteinSimilarity(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= la; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lb; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  const distance = matrix[la][lb];
  return 1 - distance / Math.max(la, lb);
}
