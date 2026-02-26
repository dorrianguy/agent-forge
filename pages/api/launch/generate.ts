// =============================================================================
// API Route: /api/launch/generate (SECURED)
// =============================================================================
//
// Accepts a LaunchBrief, runs the generation pipeline, and streams progress
// events back to the client via Server-Sent Events (SSE).
//
// Security layers:
// 1. Authentication (requireAuth)
// 2. Input validation (Zod schema)
// 3. Injection detection (block prompt injection in brief)
// 4. PII scanning (redact or warn)
// 5. Rate limiting (10 req/min for generation)
// 6. AI output scanning (code-scanner on generated assets)
// =============================================================================

import type { NextApiResponse } from 'next';
import type {
  LaunchBrief,
  GeneratedAssets,
  PipelineProgress,
  LLMProvider,
} from '@/lib/launch/types';
import { runPipeline } from '@/lib/launch/pipeline';
import {
  requireAuth,
  validateRequest,
  GenerateRequestSchema,
  scanObjectForInjection,
  scanObjectForPII,
  redactPII,
  scanCode,
  hasCriticalFindings,
  formatCodeScanReport,
  getGenerationLimiter,
  getClientIP,
} from '@/lib/security';
import type { AuthenticatedRequest } from '@/lib/security';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default requireAuth(async function handler(
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
  // Rate Limiting (10 req/min for generation)
  // -------------------------------------------------------------------------
  const clientIP = getClientIP(req.headers as Record<string, string | string[] | undefined>);
  const rateLimitKey = req.session?.userId || clientIP;
  const limiter = getGenerationLimiter();
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
  const validation = validateRequest(GenerateRequestSchema, req.body);

  if (!validation.success) {
    return res.status(400).json(validation.error);
  }

  const { brief, provider, model, stream } = validation.data;

  // -------------------------------------------------------------------------
  // Injection Detection
  // -------------------------------------------------------------------------
  const injectionScan = scanObjectForInjection(brief);

  if (!injectionScan.clean) {
    return res.status(400).json({
      error: 'Potential prompt injection detected',
      findings: injectionScan.findings.map((f) => ({
        pattern: f.pattern,
        field: 'brief',
      })),
    });
  }

  // -------------------------------------------------------------------------
  // PII Scanning (redact text fields)
  // -------------------------------------------------------------------------
  const piiScan = scanObjectForPII(brief);

  if (!piiScan.clean) {
    // Redact PII in string fields of the brief
    const sanitizedBrief = JSON.parse(redactPII(JSON.stringify(brief))) as LaunchBrief;
    // Continue with sanitized brief
    Object.assign(brief, sanitizedBrief);
  }

  // -------------------------------------------------------------------------
  // Pipeline Execution
  // -------------------------------------------------------------------------
  const shouldStream = stream !== false;
  const resolvedProvider: LLMProvider = provider || 'openai';

  if (shouldStream) {
    // --- SSE Streaming Response ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const assets = await runPipeline(brief, {
        provider: resolvedProvider,
        model,
        onProgress: (progress: PipelineProgress) => {
          send({ type: 'progress', data: progress });
        },
      });

      // Scan generated assets for code vulnerabilities
      const codeFindings = scanGeneratedAssets(assets);

      if (codeFindings.length > 0) {
        send({
          type: 'security_warning',
          findings: codeFindings,
        });
      }

      // Send each completed asset
      for (const [key, value] of Object.entries(assets)) {
        if (value.status === 'done') {
          send({ type: 'asset', assetType: key, data: value });
        }
      }

      send({ type: 'complete', assets });
      res.write('data: [DONE]\n\n');
    } catch (err) {
      send({
        type: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      res.write('data: [DONE]\n\n');
    }

    res.end();
    return;
  }

  // --- Non-Streaming Response ---
  try {
    const progress: PipelineProgress[] = [];

    const assets = await runPipeline(brief, {
      provider: resolvedProvider,
      model,
      onProgress: (p) => progress.push(p),
    });

    // Scan generated assets for code vulnerabilities
    const codeFindings = scanGeneratedAssets(assets);

    const hasErrors = Object.values(assets).some((a) => a.status === 'error');

    return res.status(hasErrors ? 207 : 200).json({
      assets,
      progress,
      status: hasErrors ? 'partial' : 'complete',
      securityScan: codeFindings.length > 0
        ? { warnings: codeFindings.length, findings: codeFindings }
        : undefined,
    });
  } catch (err) {
    console.error('[launch/generate] Pipeline error:', err);
    return res.status(500).json({
      error: 'Pipeline execution failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ---------------------------------------------------------------------------
// Helper: Scan generated assets for code vulnerabilities
// ---------------------------------------------------------------------------

interface AssetCodeFinding {
  assetType: string;
  report: string;
  criticalOrHigh: boolean;
}

/**
 * Extract string content from generated assets and scan for code vulnerabilities.
 */
function scanGeneratedAssets(assets: GeneratedAssets): AssetCodeFinding[] {
  const findings: AssetCodeFinding[] = [];

  for (const [assetType, asset] of Object.entries(assets)) {
    if (asset.status !== 'done' || !asset.data) continue;

    // Extract all string values from the asset data
    const codeStrings = extractStrings(asset.data);

    for (const code of codeStrings) {
      // Only scan strings that look like they contain code
      if (looksLikeCode(code)) {
        const result = scanCode(code);
        if (!result.clean) {
          findings.push({
            assetType,
            report: formatCodeScanReport(result),
            criticalOrHigh: hasCriticalFindings(result),
          });
        }
      }
    }
  }

  return findings;
}

/** Recursively extract all strings from a value */
function extractStrings(value: unknown): string[] {
  const strings: string[] = [];

  if (typeof value === 'string' && value.length > 20) {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      strings.push(...extractStrings(item));
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const val of Object.values(value)) {
      strings.push(...extractStrings(val));
    }
  }

  return strings;
}

/** Heuristic: does this string look like it contains code? */
function looksLikeCode(text: string): boolean {
  const codeIndicators = [
    /function\s+\w+/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /import\s+.*from/,
    /require\s*\(/,
    /class\s+\w+/,
    /def\s+\w+\s*\(/,
    /SELECT\s+.*FROM/i,
    /INSERT\s+INTO/i,
    /<script/i,
    /innerHTML/,
    /document\.write/,
  ];

  return codeIndicators.some((pattern) => pattern.test(text));
}
