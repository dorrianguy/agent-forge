// =============================================================================
// Security Type Definitions
// =============================================================================
//
// All interfaces and types used across the Agent Forge security layer.
// =============================================================================

// ---------------------------------------------------------------------------
// Severity & Action Enums
// ---------------------------------------------------------------------------

/** Severity levels for security findings */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Actions to take when PII is detected */
export type DlpAction = 'BLOCK' | 'WARN' | 'REDACT' | 'ALLOW';

/** User roles for RBAC */
export type UserRole = 'admin' | 'member' | 'viewer';

// ---------------------------------------------------------------------------
// Injection Detection
// ---------------------------------------------------------------------------

/** Result from scanning text for prompt injection */
export interface InjectionFinding {
  /** The regex pattern source that matched */
  pattern: string;
  /** The matched text */
  match: string;
  /** Character index where the match was found */
  index: number;
}

/** Result of an injection scan on an object */
export interface InjectionScanResult {
  /** Whether the input is clean (no injections found) */
  clean: boolean;
  /** All injection findings across scanned fields */
  findings: InjectionFinding[];
}

// ---------------------------------------------------------------------------
// PII Detection
// ---------------------------------------------------------------------------

/** Types of PII that can be detected */
export type PIIType =
  | 'SSN'
  | 'CREDIT_CARD'
  | 'EMAIL'
  | 'PHONE_US'
  | 'IP_ADDRESS';

/** A single PII finding */
export interface PIIFinding {
  /** Type of PII detected */
  type: PIIType;
  /** The matched text */
  match: string;
  /** Character index where the match was found */
  index: number;
  /** Length of the matched text */
  length: number;
}

/** Result of a PII scan */
export interface PIIScanResult {
  /** Whether the text is clean (no PII found) */
  clean: boolean;
  /** All PII findings */
  findings: PIIFinding[];
  /** Redacted text (only present when redaction is applied) */
  redactedText?: string;
}

// ---------------------------------------------------------------------------
// Code Security Scanning
// ---------------------------------------------------------------------------

/** Categories of code vulnerabilities */
export type VulnerabilityCategory =
  | 'sql_injection'
  | 'xss'
  | 'hardcoded_secret'
  | 'insecure_http'
  | 'command_injection'
  | 'insecure_deserialization'
  | 'path_traversal';

/** A single code vulnerability finding */
export interface CodeVulnerability {
  /** Severity of the vulnerability */
  severity: Severity;
  /** Category of the vulnerability */
  category: VulnerabilityCategory;
  /** The regex pattern that matched */
  pattern: string;
  /** The matched text */
  match: string;
  /** Line number where the vulnerability was found (1-indexed) */
  line: number;
  /** The full line content */
  lineContent: string;
  /** Human-readable recommendation for fixing */
  recommendation: string;
}

/** Result of scanning generated code for vulnerabilities */
export interface CodeScanResult {
  /** Whether the code is clean (no vulnerabilities found) */
  clean: boolean;
  /** All vulnerability findings */
  findings: CodeVulnerability[];
  /** Summary counts by severity */
  summary: Record<Severity, number>;
}

// ---------------------------------------------------------------------------
// Aggregate Security Scan Result
// ---------------------------------------------------------------------------

/** Combined result from all security scans */
export interface SecurityScanResult {
  /** Whether all scans passed */
  clean: boolean;
  /** Whether the request should be blocked */
  blocked: boolean;
  /** Injection scan results */
  injection: InjectionScanResult;
  /** PII scan results */
  pii: PIIScanResult;
  /** Code scan results (only for AI output scanning) */
  code?: CodeScanResult;
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

/** Configuration for a rate limit bucket */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in the window */
  maxRequests: number;
}

/** Result of a rate limit check */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Milliseconds until the limit resets */
  resetMs: number;
  /** Total limit */
  limit: number;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/** Authenticated user session */
export interface AuthSession {
  /** Unique user ID */
  userId: string;
  /** User email */
  email: string;
  /** User's role */
  role: UserRole;
  /** Session expiration timestamp (ISO) */
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Structured validation error for API responses */
export interface ValidationError {
  /** Field path that failed validation */
  field: string;
  /** Error message */
  message: string;
}

/** Structured validation error response */
export interface ValidationErrorResponse {
  /** Error type identifier */
  error: 'validation_error';
  /** Detailed field errors */
  details: ValidationError[];
}

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------

/** Security headers to apply to responses */
export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
}
