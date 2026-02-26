// =============================================================================
// Security Module — Barrel Export
// =============================================================================
//
// Single entry point for all Agent Forge security functionality.
//
// Usage:
//   import { requireAuth, scanForInjection, scanCode } from '@/lib/security';
// =============================================================================

// --- Types ---
export type {
  Severity,
  DlpAction,
  UserRole,
  InjectionFinding,
  InjectionScanResult,
  PIIType,
  PIIFinding,
  PIIScanResult,
  VulnerabilityCategory,
  CodeVulnerability,
  CodeScanResult,
  SecurityScanResult,
  RateLimitConfig,
  RateLimitResult,
  AuthSession,
  ValidationError,
  ValidationErrorResponse,
  SecurityHeaders,
} from './types';

// --- Input Validation ---
export {
  sanitizeString,
  safeString,
  optionalSafeString,
  validateRequest,
  FeatureSchema,
  QuoteSchema,
  BrandVoiceSchema,
  SocialPlatformSchema,
  LaunchBriefSchema,
  LLMProviderSchema,
  GenerateRequestSchema,
  ValidateRequestSchema,
} from './input-validator';

// --- Injection Detection ---
export {
  scanForInjection,
  scanForAllInjections,
  scanObjectForInjection,
} from './injection-scanner';

// --- PII Detection & Redaction ---
export {
  scanForPII,
  scanTextForPII,
  redactPII,
  scanObjectForPII,
  applyDlpPolicy,
} from './pii-scanner';

// --- Code Security Scanner ---
export {
  scanCode,
  scanMultipleCodeBlocks,
  hasCriticalFindings,
  formatCodeScanReport,
} from './code-scanner';

// --- Rate Limiting ---
export {
  RateLimiter,
  API_RATE_LIMIT,
  GENERATION_RATE_LIMIT,
  VALIDATION_RATE_LIMIT,
  getApiLimiter,
  getGenerationLimiter,
  getValidationLimiter,
  getClientIP,
} from './rate-limiter';

// --- Authentication ---
export {
  getSession,
  requireAuth,
  requireRole,
  isRoleAtLeast,
} from './auth';
export type { AuthenticatedRequest } from './auth';
