// =============================================================================
// AI Output Security Scanner — Code Vulnerability Detection
// =============================================================================
//
// Scans AI-generated code for security vulnerabilities before returning it
// to clients. This is CRITICAL for Agent Forge — we generate code for users
// and must not ship insecure patterns.
//
// Supports: JavaScript, TypeScript, Python, SQL, Shell
// All functions are pure — no side effects, no throws.
// =============================================================================

import type {
  Severity,
  VulnerabilityCategory,
  CodeVulnerability,
  CodeScanResult,
} from './types';

// ---------------------------------------------------------------------------
// Vulnerability Pattern Definitions
// ---------------------------------------------------------------------------

interface VulnerabilityPattern {
  /** Category of the vulnerability */
  category: VulnerabilityCategory;
  /** Severity level */
  severity: Severity;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Human-readable recommendation */
  recommendation: string;
}

const VULNERABILITY_PATTERNS: VulnerabilityPattern[] = [
  // -------------------------------------------------------------------------
  // SQL Injection (Critical)
  // -------------------------------------------------------------------------
  {
    category: 'sql_injection',
    severity: 'critical',
    pattern: /['"]?\s*\+\s*(?:req\.(?:body|query|params)|(?:user)?[Ii]nput|args|kwargs).*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)/i,
    recommendation: 'Use parameterized queries or prepared statements instead of string concatenation.',
  },
  {
    category: 'sql_injection',
    severity: 'critical',
    pattern: /(?:execute|query|raw)\s*\(\s*[`'"].*\$\{/i,
    recommendation: 'Use parameterized queries. Never interpolate user input into SQL strings.',
  },
  {
    category: 'sql_injection',
    severity: 'critical',
    pattern: /(?:f|F)["'](?:SELECT|INSERT|UPDATE|DELETE|DROP)\s.*\{/i,
    recommendation: 'Python f-strings in SQL queries allow injection. Use parameterized queries.',
  },
  {
    category: 'sql_injection',
    severity: 'critical',
    pattern: /['"]?\s*(?:OR|AND)\s+['"]?1['"]?\s*=\s*['"]?1/i,
    recommendation: 'Classic SQL injection pattern detected. Use parameterized queries.',
  },
  {
    category: 'sql_injection',
    severity: 'high',
    pattern: /\.format\s*\(.*\).*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i,
    recommendation: 'String .format() in SQL queries allows injection. Use parameterized queries.',
  },
  {
    category: 'sql_injection',
    severity: 'high',
    pattern: /%s.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i,
    recommendation: 'String formatting (%s) in SQL queries can allow injection. Use parameterized queries.',
  },

  // -------------------------------------------------------------------------
  // XSS — Cross-Site Scripting (High)
  // -------------------------------------------------------------------------
  {
    category: 'xss',
    severity: 'high',
    pattern: /\.innerHTML\s*=\s*(?!['"]<(?:br|hr|p)\s*\/?>['"])/i,
    recommendation: 'Use textContent instead of innerHTML, or sanitize with DOMPurify.',
  },
  {
    category: 'xss',
    severity: 'high',
    pattern: /document\.write\s*\(/i,
    recommendation: 'Avoid document.write(). Use DOM manipulation methods instead.',
  },
  {
    category: 'xss',
    severity: 'critical',
    pattern: /eval\s*\(\s*(?:req|request|user|input|args|data|body|query|params)/i,
    recommendation: 'Never eval() user input. Use JSON.parse() for data, or safer alternatives.',
  },
  {
    category: 'xss',
    severity: 'high',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/i,
    recommendation: 'Sanitize content before using dangerouslySetInnerHTML. Use DOMPurify.',
  },
  {
    category: 'xss',
    severity: 'medium',
    pattern: /\$\(\s*['"`].*['"`]\s*\)\.html\s*\(/i,
    recommendation: 'jQuery .html() can inject scripts. Use .text() for user content.',
  },
  {
    category: 'xss',
    severity: 'high',
    pattern: /(?:window|document)\.location\s*=\s*(?:req|request|user|input|data)/i,
    recommendation: 'Validate and sanitize URLs before redirecting. Use allowlists.',
  },

  // -------------------------------------------------------------------------
  // Hardcoded Secrets (High)
  // -------------------------------------------------------------------------
  {
    category: 'hardcoded_secret',
    severity: 'high',
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
    recommendation: 'Move API keys to environment variables. Never hardcode secrets.',
  },
  {
    category: 'hardcoded_secret',
    severity: 'high',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    recommendation: 'Move passwords to environment variables or a secrets manager.',
  },
  {
    category: 'hardcoded_secret',
    severity: 'high',
    pattern: /(?:secret|token|auth)[_-]?(?:key)?\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
    recommendation: 'Move tokens and secrets to environment variables.',
  },
  {
    category: 'hardcoded_secret',
    severity: 'high',
    pattern: /(?:sk|pk)[-_](?:live|test)[-_][A-Za-z0-9]{20,}/i,
    recommendation: 'Stripe key detected in code. Use environment variables.',
  },
  {
    category: 'hardcoded_secret',
    severity: 'high',
    pattern: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/,
    recommendation: 'AWS access key detected. Use IAM roles or environment variables.',
  },
  {
    category: 'hardcoded_secret',
    severity: 'medium',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/,
    recommendation: 'GitHub token detected. Use environment variables.',
  },

  // -------------------------------------------------------------------------
  // Insecure HTTP (Medium)
  // -------------------------------------------------------------------------
  {
    category: 'insecure_http',
    severity: 'medium',
    pattern: /(?:fetch|axios|request|http\.get|urllib|requests\.get)\s*\(\s*['"]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
    recommendation: 'Use HTTPS instead of HTTP for all external requests.',
  },
  {
    category: 'insecure_http',
    severity: 'medium',
    pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^'"]+['"]\s*(?:,|\))/i,
    recommendation: 'Use HTTPS URLs for external services.',
  },

  // -------------------------------------------------------------------------
  // Command Injection (Critical)
  // -------------------------------------------------------------------------
  {
    category: 'command_injection',
    severity: 'critical',
    pattern: /(?:child_process|exec|execSync|spawn|spawnSync)\s*\(\s*(?:req|request|user|input|args|data|body|query|params)/i,
    recommendation: 'Never pass user input to shell commands. Use parameterized child_process.execFile().',
  },
  {
    category: 'command_injection',
    severity: 'critical',
    pattern: /os\.system\s*\(\s*(?:f['"]|['"].*\+|.*\.format)/i,
    recommendation: 'Use subprocess.run() with a list of arguments instead of os.system().',
  },
  {
    category: 'command_injection',
    severity: 'critical',
    pattern: /subprocess\.(?:call|run|Popen)\s*\(\s*(?:f['"]|['"].*\+|.*\.format).*shell\s*=\s*True/i,
    recommendation: 'Avoid shell=True with user-controlled input. Pass arguments as a list.',
  },
  {
    category: 'command_injection',
    severity: 'high',
    pattern: /exec\s*\(\s*(?:req|request|user|input|args|data|body|query|params)/i,
    recommendation: 'Never exec() user-controlled input. Validate and sanitize all inputs.',
  },

  // -------------------------------------------------------------------------
  // Insecure Deserialization (Critical)
  // -------------------------------------------------------------------------
  {
    category: 'insecure_deserialization',
    severity: 'critical',
    pattern: /eval\s*\(\s*JSON\.parse/i,
    recommendation: 'JSON.parse() is sufficient — never wrap it in eval().',
  },
  {
    category: 'insecure_deserialization',
    severity: 'critical',
    pattern: /pickle\.loads?\s*\(/i,
    recommendation: 'pickle is unsafe for untrusted data. Use json or a safe serialization format.',
  },
  {
    category: 'insecure_deserialization',
    severity: 'critical',
    pattern: /yaml\.(?:load|safe_load)\s*\(\s*(?:req|request|user|input)/i,
    recommendation: 'Use yaml.safe_load() and validate input before deserializing.',
  },
  {
    category: 'insecure_deserialization',
    severity: 'high',
    pattern: /(?:unserialize|deserialize)\s*\(\s*(?:\$_(?:GET|POST|REQUEST|COOKIE)|req|request|user|input)/i,
    recommendation: 'Never deserialize untrusted data. Validate and use safe formats.',
  },

  // -------------------------------------------------------------------------
  // Path Traversal (High)
  // -------------------------------------------------------------------------
  {
    category: 'path_traversal',
    severity: 'high',
    pattern: /(?:readFile|readFileSync|createReadStream|open)\s*\(\s*(?:req|request|user|input|args|data|body|query|params)/i,
    recommendation: 'Validate and sanitize file paths. Use path.resolve() and check against an allowlist.',
  },
  {
    category: 'path_traversal',
    severity: 'high',
    pattern: /\.\.(?:\/|\\)/g,
    recommendation: 'Path traversal pattern detected. Sanitize paths and use path.resolve().',
  },
  {
    category: 'path_traversal',
    severity: 'medium',
    pattern: /path\.join\s*\(\s*(?:__dirname|process\.cwd\(\))?\s*,\s*(?:req|request|user|input|args|data|body|query|params)/i,
    recommendation: 'Validate user-supplied path segments. Check the resolved path is within expected directory.',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan a block of generated code for security vulnerabilities.
 * Handles multi-language output (JS, TS, Python, SQL, Shell).
 *
 * @param code - The generated code to scan
 * @returns Structured scan result with findings and severity summary
 */
export function scanCode(code: string): CodeScanResult {
  if (!code || typeof code !== 'string') {
    return {
      clean: true,
      findings: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }

  const lines = code.split('\n');
  const findings: CodeVulnerability[] = [];

  for (const vulnPattern of VULNERABILITY_PATTERNS) {
    // Create a fresh regex for each scan
    const regex = new RegExp(vulnPattern.pattern.source, vulnPattern.pattern.flags);

    // Scan line by line for accurate line references
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]!;
      const lineNum = lineIdx + 1;

      // Reset regex state for global patterns
      regex.lastIndex = 0;
      const match = regex.exec(line);

      if (match) {
        findings.push({
          severity: vulnPattern.severity,
          category: vulnPattern.category,
          pattern: vulnPattern.pattern.source,
          match: match[0],
          line: lineNum,
          lineContent: line.trim(),
          recommendation: vulnPattern.recommendation,
        });
      }
    }
  }

  // Build severity summary
  const summary: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    summary[finding.severity]++;
  }

  return {
    clean: findings.length === 0,
    findings,
    summary,
  };
}

/**
 * Scan multiple code blocks (e.g., from different generated files).
 * Merges all findings into a single result.
 *
 * @param codeBlocks - Array of code strings to scan
 * @returns Merged scan result across all code blocks
 */
export function scanMultipleCodeBlocks(codeBlocks: string[]): CodeScanResult {
  const allFindings: CodeVulnerability[] = [];

  for (const block of codeBlocks) {
    const result = scanCode(block);
    allFindings.push(...result.findings);
  }

  const summary: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of allFindings) {
    summary[finding.severity]++;
  }

  return {
    clean: allFindings.length === 0,
    findings: allFindings,
    summary,
  };
}

/**
 * Check if a scan result contains any critical or high severity findings.
 * Useful for deciding whether to block AI output from being returned.
 *
 * @param result - Code scan result to evaluate
 * @returns True if there are critical or high severity findings
 */
export function hasCriticalFindings(result: CodeScanResult): boolean {
  return result.summary.critical > 0 || result.summary.high > 0;
}

/**
 * Format scan findings into a human-readable report.
 *
 * @param result - Code scan result to format
 * @returns Formatted string report of all findings
 */
export function formatCodeScanReport(result: CodeScanResult): string {
  if (result.clean) {
    return '✅ No security vulnerabilities detected in generated code.';
  }

  const lines: string[] = [
    `⚠️ Security Scan: ${result.findings.length} finding(s) detected`,
    `   Critical: ${result.summary.critical} | High: ${result.summary.high} | Medium: ${result.summary.medium} | Low: ${result.summary.low}`,
    '',
  ];

  for (const finding of result.findings) {
    lines.push(
      `[${finding.severity.toUpperCase()}] ${finding.category} (line ${finding.line})`,
      `  Match: ${finding.match}`,
      `  Line:  ${finding.lineContent}`,
      `  Fix:   ${finding.recommendation}`,
      '',
    );
  }

  return lines.join('\n');
}
