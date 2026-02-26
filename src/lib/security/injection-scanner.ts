// =============================================================================
// Prompt Injection Detection Scanner
// =============================================================================
//
// Detects prompt injection attempts in user input before it reaches any LLM.
// Ported from Vigil's dlp/scanner.ts with additional patterns for coverage.
//
// All functions are pure — no side effects, no throws.
// =============================================================================

import type { InjectionFinding, InjectionScanResult } from './types';

// ---------------------------------------------------------------------------
// Injection Patterns (15+ patterns from Vigil + extensions)
// ---------------------------------------------------------------------------

interface InjectionPattern {
  /** Human-readable name for the pattern */
  name: string;
  /** Regex to detect the injection attempt */
  pattern: RegExp;
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  // --- Instruction Override ---
  {
    name: 'ignore_previous_instructions',
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules|directives)/i,
  },
  {
    name: 'disregard_instructions',
    pattern: /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions|prompts|rules)/i,
  },
  {
    name: 'new_instructions',
    pattern: /new\s+instructions?\s*:/i,
  },
  {
    name: 'override_instructions',
    pattern: /override\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts|rules)/i,
  },
  {
    name: 'forget_instructions',
    pattern: /forget\s+(all\s+)?(previous|prior|your|everything|above)\s+(instructions|context|rules)?/i,
  },

  // --- Role Manipulation ---
  {
    name: 'role_reassignment',
    pattern: /you\s+are\s+now\s+(a|an|the)\s+/i,
  },
  {
    name: 'act_without_restrictions',
    pattern: /act\s+as\s+if\s+you\s+have\s+no\s+(restrictions|rules|guardrails)/i,
  },
  {
    name: 'pretend_no_restrictions',
    pattern: /pretend\s+(that\s+)?you\s+(are|can|have)\s+no\s+(restrictions|rules|limits)/i,
  },

  // --- System Prompt Extraction ---
  {
    name: 'system_prompt_override',
    pattern: /system\s*:\s*you\s+(are|must|should|will)/i,
  },
  {
    name: 'system_tag',
    pattern: /\[\s*system\s*\]/i,
  },
  {
    name: 'special_token',
    pattern: /<\|?(system|im_start|im_end|endoftext)\|?>/i,
  },
  {
    name: 'repeat_system_prompt',
    pattern: /repeat\s+(your\s+)?(entire\s+)?(system\s+)?prompt/i,
  },
  {
    name: 'output_system_prompt',
    pattern: /output\s+(your\s+)?(system\s+)?prompt/i,
  },
  {
    name: 'reveal_instructions',
    pattern: /what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt|rules)/i,
  },
  {
    name: 'reveal_prompt',
    pattern: /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
  },
  {
    name: 'show_system_message',
    pattern: /show\s+(me\s+)?(your\s+)?(system\s+)?(message|prompt|instructions)/i,
  },

  // --- Jailbreak Attempts ---
  {
    name: 'jailbreak_keyword',
    pattern: /jailbreak/i,
  },
  {
    name: 'dan_mode',
    pattern: /DAN\s+mode/i,
  },
  {
    name: 'developer_mode',
    pattern: /developer\s+mode\s+(enabled|on|activated)/i,
  },

  // --- Encoding / Obfuscation ---
  {
    name: 'base64_decode_instruction',
    pattern: /base64\s+(decode|interpret|execute|run)\s/i,
  },
  {
    name: 'hex_decode_instruction',
    pattern: /hex\s+(decode|interpret|execute|run)\s/i,
  },

  // --- Data Exfiltration ---
  {
    name: 'send_to_url',
    pattern: /send\s+(the\s+)?(data|info|content|response|output)\s+to\s+(https?:\/\/|http:\/\/)/i,
  },
  {
    name: 'exfiltrate_via_markdown',
    pattern: /!\[.*?\]\(https?:\/\/[^)]*\{/i,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan a single text string for prompt injection attempts.
 * Returns the first detected pattern, or null if clean.
 *
 * @param text - Text to scan for injection patterns
 * @returns The matched pattern name if injection detected, null if clean
 */
export function scanForInjection(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  for (const { name, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return name;
    }
  }

  return null;
}

/**
 * Scan a single text string and return all injection findings.
 * Unlike `scanForInjection`, this returns ALL matches, not just the first.
 *
 * @param text - Text to scan
 * @returns Array of all injection findings
 */
export function scanForAllInjections(text: string): InjectionFinding[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const findings: InjectionFinding[] = [];

  for (const { name, pattern } of INJECTION_PATTERNS) {
    // Create a new regex to reset state
    const regex = new RegExp(pattern.source, pattern.flags);
    const result = regex.exec(text);

    if (result) {
      findings.push({
        pattern: name,
        match: result[0],
        index: result.index,
      });
    }
  }

  return findings;
}

/**
 * Recursively scan all string fields in an object for prompt injection.
 * Traverses nested objects and arrays.
 *
 * @param obj - Object to scan (all string fields will be checked)
 * @returns Scan result with clean flag and all findings
 */
export function scanObjectForInjection(obj: unknown): InjectionScanResult {
  const findings: InjectionFinding[] = [];

  function walk(value: unknown): void {
    if (typeof value === 'string') {
      findings.push(...scanForAllInjections(value));
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
