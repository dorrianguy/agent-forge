// =============================================================================
// Launch Orchestration Workflow — Type Definitions
// =============================================================================

// ---------------------------------------------------------------------------
// Brief Types (Single Source of Truth)
// ---------------------------------------------------------------------------

export interface Feature {
  name: string;
  description: string;
  benefit: string;
}

export interface Quote {
  text: string;
  author: string;
  title?: string;
  company?: string;
}

export interface LaunchBrief {
  id: string;

  // Core
  productName: string;
  tagline: string;
  valueProposition: string;
  keyFeatures: Feature[];
  targetAudience: string;

  // Pricing & Availability
  pricing: string;
  launchDate: string; // ISO date
  availabilityNote?: string;

  // Links
  landingPageUrl: string;
  signupUrl?: string;
  demoUrl?: string;

  // Social proof
  quotes?: Quote[];
  stats?: string[];

  // Brand
  companyName: string;
  founderName?: string;
  founderTitle?: string;
  brandVoice: BrandVoice;

  // Distribution
  socialPlatforms: SocialPlatform[];
  emailListSize?: number;
}

export type BrandVoice = 'professional' | 'casual' | 'bold' | 'technical';

export type SocialPlatform =
  | 'twitter'
  | 'linkedin'
  | 'producthunt'
  | 'hackernews'
  | 'instagram';

// ---------------------------------------------------------------------------
// Generated Asset Types
// ---------------------------------------------------------------------------

export type AssetType =
  | 'landingPage'
  | 'emailSequence'
  | 'pressRelease'
  | 'socialPosts'
  | 'salesEnablement'
  | 'partnerKit'
  | 'videoScript';

export type GenerationStatus =
  | 'pending'
  | 'generating'
  | 'done'
  | 'error';

export interface AssetMetadata {
  generatedAt: string; // ISO timestamp
  model: string;
  tokensUsed: number;
  durationMs: number;
  version: number;
}

// --- Landing Page ---

export interface LandingPageHero {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
}

export interface LandingPageFeatureSection {
  featureName: string;
  headline: string;
  description: string;
  benefit: string;
}

export interface LandingPageSocialProof {
  headline: string;
  testimonials: Array<{
    quote: string;
    author: string;
    title?: string;
    company?: string;
  }>;
  stats: string[];
}

export interface LandingPageFAQ {
  question: string;
  answer: string;
}

export interface LandingPageMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterCard: 'summary' | 'summary_large_image';
}

export interface LandingPageAsset {
  hero: LandingPageHero;
  featureSections: LandingPageFeatureSection[];
  socialProof: LandingPageSocialProof;
  faq: LandingPageFAQ[];
  closingCta: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaUrl: string;
  };
  meta: LandingPageMeta;
}

// --- Email Sequence ---

export interface Email {
  id: string;
  order: number;
  name: string; // e.g. "Announcement", "Feature Deep-dive"
  subject: string;
  previewText: string;
  body: string; // Markdown
  ctaText: string;
  ctaUrl: string;
  sendDelay: string; // e.g. "Day 0", "Day 2"
}

export interface EmailSequenceAsset {
  emails: Email[];
  sequenceName: string;
  totalEmails: number;
}

// --- Press Release ---

export interface PressReleaseAsset {
  headline: string;
  subheadline?: string;
  dateline: string; // e.g. "SAN FRANCISCO, March 15, 2025"
  lede: string; // Opening paragraph
  bodyParagraphs: string[];
  quotes: Array<{
    text: string;
    attribution: string;
  }>;
  availability: string;
  boilerplate: string;
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
    website: string;
  };
  url: string;
}

// --- Social Posts ---

export interface TwitterThread {
  tweets: Array<{
    order: number;
    text: string;
    hasMedia: boolean;
  }>;
}

export interface LinkedInPost {
  text: string;
  hashtags: string[];
}

export interface ProductHuntPost {
  title: string;
  tagline: string;
  description: string;
  firstComment: string;
  topics: string[];
}

export interface HackerNewsPost {
  title: string; // "Show HN: ..."
  url: string;
  comment: string;
}

export interface InstagramPost {
  caption: string;
  hashtags: string[];
  altText: string;
}

export interface SocialPostsAsset {
  twitter?: TwitterThread;
  linkedin?: LinkedInPost;
  producthunt?: ProductHuntPost;
  hackernews?: HackerNewsPost;
  instagram?: InstagramPost;
}

// --- Sales Enablement ---

export interface SalesEnablementAsset {
  onePager: {
    headline: string;
    valueProps: string[];
    proofPoints: string[];
    callToAction: string;
    contactInfo: string;
  };
  objectionScript: {
    objection: string;
    reframe: string;
    proof: string;
    redirect: string;
  }[];
  demoTalkingPoints: {
    claim: string;
    showThis: string;
    sayThis: string;
    metric: string;
  }[];
}

// --- Partner Kit ---

export interface PartnerKitAsset {
  swipeCopy: {
    twitter: string[];
    linkedin: string;
    emailBlurb: string;
  };
  coBrandedOnePager: {
    productPositioning: string;
    proofPoints: string[];
    callToAction: string;
  };
}

// --- Video Script ---

export interface VideoScene {
  duration: number;
  voiceover: string;
  visualDescription: string;
  textOverlay?: string;
  cmdSource: string;
}

export interface VideoScriptAsset {
  teaser30s: {
    scenes: VideoScene[];
    totalDuration: number;
  };
  explainer60s: {
    scenes: VideoScene[];
    totalDuration: number;
  };
}

// ---------------------------------------------------------------------------
// Aggregate Asset Container
// ---------------------------------------------------------------------------

export interface LaunchAsset<T = unknown> {
  type: AssetType;
  status: GenerationStatus;
  data: T | null;
  metadata: AssetMetadata | null;
  error?: string;
}

export interface GeneratedAssets {
  landingPage: LaunchAsset<LandingPageAsset>;
  emailSequence: LaunchAsset<EmailSequenceAsset>;
  pressRelease: LaunchAsset<PressReleaseAsset>;
  socialPosts: LaunchAsset<SocialPostsAsset>;
  salesEnablement: LaunchAsset<SalesEnablementAsset>;
  partnerKit: LaunchAsset<PartnerKitAsset>;
  videoScript: LaunchAsset<VideoScriptAsset>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'pass';

export type ValidationType =
  | 'url_consistency'
  | 'pricing_consistency'
  | 'quote_accuracy'
  | 'date_consistency'
  | 'feature_consistency'
  | 'cta_alignment';

export interface ValidationResult {
  id: string;
  type: ValidationType;
  severity: ValidationSeverity;
  message: string;
  asset?: AssetType;
  field?: string;
  expected?: string;
  actual?: string;
}

// ---------------------------------------------------------------------------
// Propagation
// ---------------------------------------------------------------------------

export interface PropagationEdge {
  from: AssetType;
  to: AssetType;
  fields: string[]; // which fields in `from` affect `to`
}

export interface PropagationResult {
  affectedAssets: AssetType[];
  changes: Array<{
    asset: AssetType;
    reason: string;
    fields: string[];
  }>;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export type PipelineStage = AssetType;

export interface PipelineProgress {
  stage: PipelineStage;
  status: GenerationStatus;
  message: string;
  timestamp: string;
}

export interface PipelineContext {
  brief: LaunchBrief;
  assets: Partial<GeneratedAssets>;
}

export type LLMProvider = 'openai' | 'anthropic';

export interface PipelineOptions {
  provider: LLMProvider;
  model?: string;
  onProgress?: (progress: PipelineProgress) => void;
}

// ---------------------------------------------------------------------------
// Zustand Store
// ---------------------------------------------------------------------------

export type WizardStep =
  | 'basic'
  | 'features'
  | 'pricing'
  | 'social-proof'
  | 'distribution';

export interface LaunchWorkflowState {
  // Brief
  brief: LaunchBrief | null;
  wizardStep: WizardStep;

  // Generation
  assets: GeneratedAssets | null;
  pipelineStatus: GenerationStatus;
  pipelineProgress: PipelineProgress[];

  // UI
  selectedAsset: AssetType | null;
  validationResults: ValidationResult[];

  // Staleness tracking — assets that need regeneration after upstream edits
  staleAssets: Set<AssetType>;

  // Actions
  setBrief: (brief: LaunchBrief) => void;
  setWizardStep: (step: WizardStep) => void;
  setAssets: (assets: GeneratedAssets) => void;
  updateAsset: <T>(type: AssetType, asset: LaunchAsset<T>) => void;
  setPipelineStatus: (status: GenerationStatus) => void;
  addPipelineProgress: (progress: PipelineProgress) => void;
  setSelectedAsset: (type: AssetType | null) => void;
  setValidationResults: (results: ValidationResult[]) => void;
  reset: () => void;

  // Edit → Propagation Actions
  updateAssetContent: (assetType: AssetType, updatedContent: unknown) => void;
  getRegenerationPlan: (assetType: AssetType) => PropagationResult;
  regenerateDownstream: (assetType: AssetType) => Promise<void>;
  markAssetStale: (assetType: AssetType) => void;
}

// =============================================================================
// A/B Variant Types (launch-variants agent)
// =============================================================================

export type VariantAngle = 'curiosity' | 'outcome' | 'pain' | 'aspiration' | 'default';

export interface AssetVariant {
  angle: VariantAngle;
  hook: string;
  content: unknown; // Typed per asset
}

export interface VariantPair {
  assetType: AssetType;
  variantA: AssetVariant;
  variantB: AssetVariant;
}

/** Press releases do NOT get variants (single version only). */
export type VariantEligibleAsset = 'landingPage' | 'emailSequence' | 'socialPosts';

// =============================================================================
// Feedback Loop Types (launch-variants agent)
// =============================================================================

export type FeedbackSignalType =
  | 'email_open'
  | 'lp_click'
  | 'pr_pickup'
  | 'social_engagement';

export interface FeedbackSignal {
  type: FeedbackSignalType;
  assetId: string;
  variant: 'A' | 'B';
  metric: string;
  value: number;
  hookOrClaimRef: string;
  timestamp: string;
}

export interface CMDUpdate {
  field: 'hooks' | 'positioning' | 'supportingClaims';
  action: 'promote' | 'demote' | 'replace';
  original: string;
  suggested: string;
  reason: string;
  confidence: number; // 0-1
  source: FeedbackSignalType;
}

export interface FeedbackAnalysis {
  launchId: string;
  signals: FeedbackSignal[];
  suggestedUpdates: CMDUpdate[];
  winningVariants: { assetType: string; winner: 'A' | 'B'; margin: number }[];
}

// =============================================================================
// Launch Retrospective Types (launch-variants agent)
// =============================================================================

export interface LaunchRetro {
  launchId: string;
  productName: string;
  launchDate: string;
  completedDate: string;

  bestConverting: {
    channel: string;
    hook: string;
    cta: string;
  };

  keepForNextCMD: string[];
  dropFromNextCMD: string[];

  metrics: {
    totalTraffic: number;
    conversionRate: number;
    topChannel: string;
    topAsset: string;
    hookPerformance: { hook: string; metric: number; variant: 'A' | 'B' }[];
  };

  lessons: string[];
}
