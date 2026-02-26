// =============================================================================
// API Route: /api/launch/validate (SECURED)
// =============================================================================
//
// Accepts { brief, assets } and returns ValidationResult[] produced by the
// cross-asset validator.
//
// Security layers:
// 1. Authentication (requireAuth)
// 2. Input validation (Zod schema)
// 3. Rate limiting (30 req/min for validation)
// =============================================================================

import type { NextApiResponse } from 'next';
import type { GeneratedAssets } from '@/src/lib/launch/types';
import { validateAssets } from '@/src/lib/launch/validator';
import {
  requireAuth,
  validateRequest,
  ValidateRequestSchema,
  getValidationLimiter,
  getClientIP,
} from '@/src/lib/security';
import type { AuthenticatedRequest } from '@/src/lib/security';

export default requireAuth(function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
) {
  // -------------------------------------------------------------------------
  // Method Check
  // -------------------------------------------------------------------------
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // -------------------------------------------------------------------------
  // Rate Limiting (30 req/min for validation)
  // -------------------------------------------------------------------------
  const clientIP = getClientIP(req.headers as Record<string, string | string[] | undefined>);
  const rateLimitKey = req.session?.userId || clientIP;
  const limiter = getValidationLimiter();
  const rateResult = limiter.check(rateLimitKey);

  if (!rateResult.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateResult.resetMs / 1000).toString());
    res.setHeader('X-RateLimit-Limit', rateResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(rateResult.resetMs / 1000),
    });
  }

  res.setHeader('X-RateLimit-Limit', rateResult.limit.toString());
  res.setHeader('X-RateLimit-Remaining', rateResult.remaining.toString());

  // -------------------------------------------------------------------------
  // Input Validation (Zod)
  // -------------------------------------------------------------------------
  const validation = validateRequest(ValidateRequestSchema, req.body);

  if (!validation.success) {
    return res.status(400).json(validation.error);
  }

  const { brief, assets } = validation.data;

  // -------------------------------------------------------------------------
  // Business Logic
  // -------------------------------------------------------------------------
  try {
    const results = validateAssets(brief, assets as unknown as GeneratedAssets);
    return res.status(200).json({ results });
  } catch (err) {
    console.error('[launch/validate] Validation error:', err);
    return res.status(500).json({
      error: 'Validation failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
