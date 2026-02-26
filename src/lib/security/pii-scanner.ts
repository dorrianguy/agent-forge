// =============================================================================
// PII Detection & Redaction Scanner
// =============================================================================
//
// Detects and optionally redacts Personally Identifiable Information (PII)
// from text. Ported from Vigil's dlp/scanner.ts with self-contained patterns
// (no external dependency on @vigil/shared).
//
// All functions are pure — no side effects, no throws.
// =============================================================================

import type { PIIType, PIIFinding, PIIScanResult, DlpAction } from './types';

// ---------------------------------------------------------------------------
// PII Patterns
// ---------------------------------------------------------------------------

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  /** String used to replace matches during redaction */
  redaction: string;
}

const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'SSN',
    // Matches xxx-xx-xxxx or xxx xx xxxx or xxxxxxxxx (with word boundaries)
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    redaction: '[SSN REDACTED]',
  },
  {
    type: 'CREDIT_CARD',
    // Matches common credit card formats (Visa, MC, Amex, Discover)
    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    redaction: '[CARD REDACTED]',
  },
  {
    type: 'EMAIL',
    // Standard email pattern
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    redaction: '[EMAIL REDACTED]',
  },
  {
    type: 'PHONE_US',
    // US phone: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1xxxxxxxxxx
    pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    redaction: '[PHONE REDACTED]',
  },
  {
    type: 'IP_ADDRESS',
    // IPv4 addresses
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    redaction: '[IP REDACTED]',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan text for PII patterns.
 * Returns all findings with type, match, index, and length.
 *
 * @param text - Text to scan for PII
 * @returns Array of PII findings
 */
export function scanForPII(text: string): PIIFinding[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const findings: PIIFinding[] = [];

  for (const { type, pattern } of PII_PATTERNS) {
    // Reset regex state by creating a new instance
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      findings.push({
        type,
        match: match[0],
        index: match.index,
        length: match[0].length,
      });
    }
  }

  return findings;
}

/**
 * Scan text and return a structured result.
 *
 * @param text - Text to scan for PII
 * @returns Structured scan result with clean flag and findings
 */
export function scanTextForPII(text: string): PIIScanResult {
  const findings = scanForPII(text);

  return {
    clean: findings.length === 0,
    findings,
  };
}

/**
 * Redact all PII from text, replacing matches with type-specific placeholders.
 *
 * @param text - Text to redact PII from
 * @returns Text with all PII replaced by redaction placeholders
 */
export function redactPII(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let redacted = text;

  for (const { pattern, redaction } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    redacted = redacted.replace(regex, redaction);
  }

  return redacted;
}

/**
 * Recursively scan all string fields in an object for PII.
 *
 * @param obj - Object to scan
 * @returns Structured scan result with all findings
 */
export function scanObjectForPII(obj: unknown): PIIScanResult {
  const findings: PIIFinding[] = [];

  function walk(value: unknown): void {
    if (typeof value === 'string') {
      findings.push(...scanForPII(value));
    } else if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const val of Object.values(value)) {
        walk(val);
      }
    }
  }

  walk(obj);

  return {
    clean: findings.length === 0,
    findings,
  };
}

/**
 * Apply DLP policy to text based on the configured action.
 * Returns processed text, block status, and findings.
 *
 * @param text - Text to process
 * @param action - DLP action to apply (BLOCK, WARN, REDACT, ALLOW)
 * @returns Object with processed text, blocked flag, and findings
 */
export function applyDlpPolicy(
  text: string,
  action: DlpAction,
): { text: string; blocked: boolean; findings: PIIFinding[] } {
  const findings = scanForPII(text);

  if (findings.length === 0) {
    return { text, blocked: false, findings: [] };
  }

  switch (action) {
    case 'BLOCK':
      return { text, blocked: true, findings };

    case 'WARN':
      return { text, blocked: false, findings };

    case 'REDACT':
      return { text: redactPII(text), blocked: false, findings };

    case 'ALLOW':
    default:
      return { text, blocked: false, findings: [] };
  }
}
