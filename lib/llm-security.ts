/**
 * LLM Security — injection detection, PII scanning, and output filtering.
 *
 * Applied at the AI layer:
 *   - BEFORE sending user input to any LLM (injection detection)
 *   - AFTER receiving LLM output (PII scan + leakage detection)
 */

// ─── Prompt Injection Detection ──────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules|directives)/i,
  /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*you\s+(are|must|should|will)/i,
  /\[\s*system\s*\]/i,
  /<\|?(system|im_start|im_end|endoftext)\|?>/i,
  /repeat\s+(your\s+)?(entire\s+)?(system\s+)?prompt/i,
  /output\s+(your\s+)?(system\s+)?prompt/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt|rules)/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+(restrictions|rules|guardrails)/i,
  /pretend\s+(that\s+)?you\s+(are|can|have)\s+no\s+(restrictions|rules|limits)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode\s+(enabled|on|activated)/i,
  /forget\s+(everything|all|your instructions)/i,
];

/**
 * Check user input for prompt injection attempts.
 * Returns the matched pattern source if injection is detected, null otherwise.
 */
export function detectInjection(text: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return pattern.source;
    }
  }
  return null;
}

// ─── PII Detection ────────────────────────────────────────────────────────────

const PII_PATTERNS: Record<string, RegExp> = {
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE_US: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  OPENAI_API_KEY: /\bsk-[a-zA-Z0-9]{20,}\b/g,
  ANTHROPIC_API_KEY: /\bsk-ant-[a-zA-Z0-9\-_]{20,}\b/g,
  AWS_ACCESS_KEY: /\bAKIA[0-9A-Z]{16}\b/g,
  BEARER_TOKEN: /\bBearer\s+[a-zA-Z0-9\-._~+/]{20,}={0,2}\b/g,
};

const PII_REDACTION_MAP: Record<string, string> = {
  SSN: '[SSN REDACTED]',
  CREDIT_CARD: '[CARD REDACTED]',
  EMAIL: '[EMAIL REDACTED]',
  PHONE_US: '[PHONE REDACTED]',
  OPENAI_API_KEY: '[API KEY REDACTED]',
  ANTHROPIC_API_KEY: '[API KEY REDACTED]',
  AWS_ACCESS_KEY: '[AWS KEY REDACTED]',
  BEARER_TOKEN: '[BEARER TOKEN REDACTED]',
};

export interface PiiScanResult {
  clean: boolean;
  findings: Array<{ type: string; index: number }>;
  redacted: string;
}

/**
 * Scan text for PII and redact all findings.
 */
export function scanAndRedactPii(text: string): PiiScanResult {
  const findings: Array<{ type: string; index: number }> = [];
  let redacted = text;

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      findings.push({ type, index: match.index });
    }
    redacted = redacted.replace(new RegExp(pattern.source, pattern.flags), PII_REDACTION_MAP[type] ?? '[REDACTED]');
  }

  return { clean: findings.length === 0, findings, redacted };
}

// ─── System Prompt Leakage Detection ─────────────────────────────────────────

const LEAKAGE_PATTERNS: RegExp[] = [
  /my (system\s+)?instructions\s+(are|say|state|include)/i,
  /i('ve| have) been (instructed|told|configured|programmed|prompted) to/i,
  /my (system\s+)?prompt (is|says|reads|contains)/i,
  /as per my (instructions|configuration|system prompt|directives)/i,
  /the (instructions|prompt|system message) i (received|was given|operate under)/i,
  /i (am|was) configured (to|with|as)/i,
  /my (initial|original) instructions/i,
];

/**
 * Detect if an LLM response appears to be leaking its system prompt.
 * Returns matched pattern source if found, null otherwise.
 */
export function detectLeakage(text: string): string | null {
  for (const pattern of LEAKAGE_PATTERNS) {
    if (pattern.test(text)) {
      return pattern.source;
    }
  }
  return null;
}

// ─── Input Length Limits ──────────────────────────────────────────────────────

export const MAX_AGENT_DESCRIPTION_LENGTH = 2000;
export const MAX_AGENT_NAME_LENGTH = 100;

/**
 * Validate input lengths before sending to LLM.
 * Prevents token-flooding DoS attacks.
 */
export function validateInputLengths(inputs: Record<string, string | undefined>): string | null {
  const limits: Record<string, number> = {
    description: MAX_AGENT_DESCRIPTION_LENGTH,
    name: MAX_AGENT_NAME_LENGTH,
  };
  for (const [field, value] of Object.entries(inputs)) {
    if (!value) continue;
    const limit = limits[field] ?? 1000;
    if (value.length > limit) {
      return `${field} exceeds maximum length of ${limit} characters`;
    }
  }
  return null;
}
