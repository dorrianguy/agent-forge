// =============================================================================
// LaunchBriefForm — Multi-Step Wizard
// =============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Rocket,
  CheckCircle2,
} from 'lucide-react';
import type {
  LaunchBrief,
  Feature,
  Quote,
  BrandVoice,
  SocialPlatform,
  WizardStep,
} from '@/lib/launch/types';

// ---------------------------------------------------------------------------
// Step Definitions
// ---------------------------------------------------------------------------

const STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'basic', label: 'Basic Info', icon: '📋' },
  { id: 'features', label: 'Features', icon: '✨' },
  { id: 'pricing', label: 'Pricing & Dates', icon: '💰' },
  { id: 'social-proof', label: 'Social Proof', icon: '⭐' },
  { id: 'distribution', label: 'Distribution', icon: '📣' },
];

const BRAND_VOICES: { value: BrandVoice; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Corporate, polished, trustworthy' },
  { value: 'casual', label: 'Casual', desc: 'Friendly, conversational, approachable' },
  { value: 'bold', label: 'Bold', desc: 'Confident, disruptive, attention-grabbing' },
  { value: 'technical', label: 'Technical', desc: 'Precise, developer-focused, detail-rich' },
];

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; icon: string }[] = [
  { value: 'twitter', label: 'Twitter / X', icon: '🐦' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'producthunt', label: 'Product Hunt', icon: '🔶' },
  { value: 'hackernews', label: 'Hacker News', icon: '🟧' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
];

// ---------------------------------------------------------------------------
// Default State
// ---------------------------------------------------------------------------

function createDefaultBrief(): Omit<LaunchBrief, 'id'> {
  return {
    productName: '',
    tagline: '',
    valueProposition: '',
    keyFeatures: [{ name: '', description: '', benefit: '' }],
    targetAudience: '',
    pricing: '',
    launchDate: new Date().toISOString().split('T')[0],
    landingPageUrl: '',
    companyName: '',
    brandVoice: 'professional',
    socialPlatforms: ['twitter', 'linkedin'],
    quotes: [],
    stats: [],
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type StepErrors = Record<string, string>;

function validateStep(step: WizardStep, data: Omit<LaunchBrief, 'id'>): StepErrors {
  const errors: StepErrors = {};

  switch (step) {
    case 'basic':
      if (!data.productName.trim()) errors.productName = 'Product name is required';
      if (!data.tagline.trim()) errors.tagline = 'Tagline is required';
      if (!data.valueProposition.trim()) errors.valueProposition = 'Value proposition is required';
      if (!data.targetAudience.trim()) errors.targetAudience = 'Target audience is required';
      if (!data.companyName.trim()) errors.companyName = 'Company name is required';
      break;

    case 'features':
      if (data.keyFeatures.length === 0) {
        errors.features = 'At least one feature is required';
      }
      data.keyFeatures.forEach((f, i) => {
        if (!f.name.trim()) errors[`feature_${i}_name`] = `Feature ${i + 1} needs a name`;
        if (!f.description.trim()) errors[`feature_${i}_desc`] = `Feature ${i + 1} needs a description`;
        if (!f.benefit.trim()) errors[`feature_${i}_benefit`] = `Feature ${i + 1} needs a benefit`;
      });
      break;

    case 'pricing':
      if (!data.pricing.trim()) errors.pricing = 'Pricing is required';
      if (!data.launchDate) errors.launchDate = 'Launch date is required';
      if (!data.landingPageUrl.trim()) errors.landingPageUrl = 'Landing page URL is required';
      else if (!/^https?:\/\/.+/.test(data.landingPageUrl)) errors.landingPageUrl = 'Must be a valid URL';
      break;

    case 'social-proof':
      // Optional step — no required fields
      break;

    case 'distribution':
      if (data.socialPlatforms.length === 0) errors.platforms = 'Select at least one platform';
      break;
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LaunchBriefFormProps {
  onSubmit: (brief: LaunchBrief) => void;
  initialBrief?: LaunchBrief | null;
}

export default function LaunchBriefForm({ onSubmit, initialBrief }: LaunchBriefFormProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [data, setData] = useState<Omit<LaunchBrief, 'id'>>(
    initialBrief ? { ...initialBrief } : createDefaultBrief(),
  );
  const [errors, setErrors] = useState<StepErrors>({});
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Field updater
  const updateField = useCallback(<K extends keyof Omit<LaunchBrief, 'id'>>(
    key: K,
    value: Omit<LaunchBrief, 'id'>[K],
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
    // Clear field-level error
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    const stepErrors = validateStep(currentStep, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  }, [currentStep, currentStepIndex, data]);

  const goPrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
      setErrors({});
    }
  }, [currentStepIndex]);

  const handleSubmit = useCallback(() => {
    const stepErrors = validateStep(currentStep, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    const brief: LaunchBrief = {
      ...data,
      id: initialBrief?.id || `launch-${Date.now()}`,
    };
    onSubmit(brief);
  }, [currentStep, data, initialBrief, onSubmit]);

  // Feature management
  const addFeature = () => {
    updateField('keyFeatures', [
      ...data.keyFeatures,
      { name: '', description: '', benefit: '' },
    ]);
  };

  const removeFeature = (index: number) => {
    updateField(
      'keyFeatures',
      data.keyFeatures.filter((_, i) => i !== index),
    );
  };

  const updateFeature = (index: number, field: keyof Feature, value: string) => {
    const features = [...data.keyFeatures];
    features[index] = { ...features[index], [field]: value };
    updateField('keyFeatures', features);
  };

  // Quote management
  const addQuote = () => {
    updateField('quotes', [...(data.quotes || []), { text: '', author: '', title: '', company: '' }]);
  };

  const removeQuote = (index: number) => {
    updateField('quotes', (data.quotes || []).filter((_, i) => i !== index));
  };

  const updateQuote = (index: number, field: keyof Quote, value: string) => {
    const quotes = [...(data.quotes || [])];
    quotes[index] = { ...quotes[index], [field]: value };
    updateField('quotes', quotes);
  };

  // Stat management
  const addStat = () => {
    updateField('stats', [...(data.stats || []), '']);
  };

  const removeStat = (index: number) => {
    updateField('stats', (data.stats || []).filter((_, i) => i !== index));
  };

  const updateStat = (index: number, value: string) => {
    const stats = [...(data.stats || [])];
    stats[index] = value;
    updateField('stats', stats);
  };

  // Platform toggle
  const togglePlatform = (platform: SocialPlatform) => {
    const current = data.socialPlatforms;
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    updateField('socialPlatforms', updated);
  };

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const inputClasses = (fieldName: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm transition-colors bg-zinc-900 text-zinc-100 
     placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
     ${errors[fieldName] ? 'border-red-500/50' : 'border-zinc-700 hover:border-zinc-600'}`;

  const labelClasses = 'block text-sm font-medium text-zinc-300 mb-1.5';
  const errorClasses = 'text-xs text-red-400 mt-1';

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-2">
        {STEPS.map((step, i) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => {
                  if (isCompleted || i <= currentStepIndex) {
                    setCurrentStep(step.id);
                    setErrors({});
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                  ${isActive ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : ''}
                  ${isCompleted && !isActive ? 'text-green-400' : ''}
                  ${!isActive && !isCompleted ? 'text-zinc-500' : ''}
                  ${isCompleted || i <= currentStepIndex ? 'cursor-pointer hover:bg-zinc-800' : 'cursor-default'}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <span>{step.icon}</span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 min-h-[400px]">
        {/* Basic Info */}
        {currentStep === 'basic' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Basic Information</h2>

            <div>
              <label className={labelClasses}>Product Name *</label>
              <input
                className={inputClasses('productName')}
                value={data.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="e.g. LaunchPad Pro"
              />
              {errors.productName && <p className={errorClasses}>{errors.productName}</p>}
            </div>

            <div>
              <label className={labelClasses}>Tagline *</label>
              <input
                className={inputClasses('tagline')}
                value={data.tagline}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="e.g. Launch faster, grow smarter"
              />
              {errors.tagline && <p className={errorClasses}>{errors.tagline}</p>}
            </div>

            <div>
              <label className={labelClasses}>Value Proposition *</label>
              <textarea
                className={`${inputClasses('valueProposition')} resize-none`}
                rows={3}
                value={data.valueProposition}
                onChange={(e) => updateField('valueProposition', e.target.value)}
                placeholder="2-3 sentences explaining your core value..."
              />
              {errors.valueProposition && <p className={errorClasses}>{errors.valueProposition}</p>}
            </div>

            <div>
              <label className={labelClasses}>Target Audience *</label>
              <input
                className={inputClasses('targetAudience')}
                value={data.targetAudience}
                onChange={(e) => updateField('targetAudience', e.target.value)}
                placeholder="e.g. SaaS founders and indie hackers"
              />
              {errors.targetAudience && <p className={errorClasses}>{errors.targetAudience}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Company Name *</label>
                <input
                  className={inputClasses('companyName')}
                  value={data.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="e.g. Acme Inc."
                />
                {errors.companyName && <p className={errorClasses}>{errors.companyName}</p>}
              </div>

              <div>
                <label className={labelClasses}>Brand Voice</label>
                <select
                  className={inputClasses('brandVoice')}
                  value={data.brandVoice}
                  onChange={(e) => updateField('brandVoice', e.target.value as BrandVoice)}
                >
                  {BRAND_VOICES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label} — {v.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Founder Name</label>
                <input
                  className={inputClasses('founderName')}
                  value={data.founderName || ''}
                  onChange={(e) => updateField('founderName', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClasses}>Founder Title</label>
                <input
                  className={inputClasses('founderTitle')}
                  value={data.founderTitle || ''}
                  onChange={(e) => updateField('founderTitle', e.target.value)}
                  placeholder="e.g. CEO & Co-founder"
                />
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {currentStep === 'features' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">Key Features</h2>
              <button
                onClick={addFeature}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Feature
              </button>
            </div>

            {errors.features && <p className={errorClasses}>{errors.features}</p>}

            {data.keyFeatures.map((feature, i) => (
              <div key={i} className="border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-400">Feature {i + 1}</span>
                  {data.keyFeatures.length > 1 && (
                    <button
                      onClick={() => removeFeature(i)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div>
                  <input
                    className={inputClasses(`feature_${i}_name`)}
                    value={feature.name}
                    onChange={(e) => updateFeature(i, 'name', e.target.value)}
                    placeholder="Feature name"
                  />
                  {errors[`feature_${i}_name`] && <p className={errorClasses}>{errors[`feature_${i}_name`]}</p>}
                </div>
                <div>
                  <textarea
                    className={`${inputClasses(`feature_${i}_desc`)} resize-none`}
                    rows={2}
                    value={feature.description}
                    onChange={(e) => updateFeature(i, 'description', e.target.value)}
                    placeholder="What does this feature do?"
                  />
                  {errors[`feature_${i}_desc`] && <p className={errorClasses}>{errors[`feature_${i}_desc`]}</p>}
                </div>
                <div>
                  <input
                    className={inputClasses(`feature_${i}_benefit`)}
                    value={feature.benefit}
                    onChange={(e) => updateFeature(i, 'benefit', e.target.value)}
                    placeholder="Why should the user care?"
                  />
                  {errors[`feature_${i}_benefit`] && <p className={errorClasses}>{errors[`feature_${i}_benefit`]}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing & Dates */}
        {currentStep === 'pricing' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Pricing & Dates</h2>

            <div>
              <label className={labelClasses}>Pricing *</label>
              <input
                className={inputClasses('pricing')}
                value={data.pricing}
                onChange={(e) => updateField('pricing', e.target.value)}
                placeholder="e.g. Starting at $29/mo or Free during beta"
              />
              {errors.pricing && <p className={errorClasses}>{errors.pricing}</p>}
            </div>

            <div>
              <label className={labelClasses}>Launch Date *</label>
              <input
                type="date"
                className={inputClasses('launchDate')}
                value={data.launchDate}
                onChange={(e) => updateField('launchDate', e.target.value)}
              />
              {errors.launchDate && <p className={errorClasses}>{errors.launchDate}</p>}
            </div>

            <div>
              <label className={labelClasses}>Landing Page URL *</label>
              <input
                className={inputClasses('landingPageUrl')}
                value={data.landingPageUrl}
                onChange={(e) => updateField('landingPageUrl', e.target.value)}
                placeholder="https://yourproduct.com"
              />
              {errors.landingPageUrl && <p className={errorClasses}>{errors.landingPageUrl}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Signup URL</label>
                <input
                  className={inputClasses('signupUrl')}
                  value={data.signupUrl || ''}
                  onChange={(e) => updateField('signupUrl', e.target.value)}
                  placeholder="If different from landing page"
                />
              </div>
              <div>
                <label className={labelClasses}>Demo URL</label>
                <input
                  className={inputClasses('demoUrl')}
                  value={data.demoUrl || ''}
                  onChange={(e) => updateField('demoUrl', e.target.value)}
                  placeholder="Optional demo link"
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Availability Note</label>
              <input
                className={inputClasses('availabilityNote')}
                value={data.availabilityNote || ''}
                onChange={(e) => updateField('availabilityNote', e.target.value)}
                placeholder="e.g. Limited to first 500 users"
              />
            </div>
          </div>
        )}

        {/* Social Proof */}
        {currentStep === 'social-proof' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Social Proof</h2>

            {/* Quotes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={labelClasses}>Testimonials / Quotes</label>
                <button
                  onClick={addQuote}
                  className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Quote
                </button>
              </div>

              {(data.quotes || []).map((quote, i) => (
                <div key={i} className="border border-zinc-800 rounded-lg p-4 space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-400">Quote {i + 1}</span>
                    <button
                      onClick={() => removeQuote(i)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    className={`${inputClasses(`quote_${i}_text`)} resize-none`}
                    rows={2}
                    value={quote.text}
                    onChange={(e) => updateQuote(i, 'text', e.target.value)}
                    placeholder="The quote text..."
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      className={inputClasses(`quote_${i}_author`)}
                      value={quote.author}
                      onChange={(e) => updateQuote(i, 'author', e.target.value)}
                      placeholder="Author name"
                    />
                    <input
                      className={inputClasses(`quote_${i}_title`)}
                      value={quote.title || ''}
                      onChange={(e) => updateQuote(i, 'title', e.target.value)}
                      placeholder="Title"
                    />
                    <input
                      className={inputClasses(`quote_${i}_company`)}
                      value={quote.company || ''}
                      onChange={(e) => updateQuote(i, 'company', e.target.value)}
                      placeholder="Company"
                    />
                  </div>
                </div>
              ))}

              {(data.quotes || []).length === 0 && (
                <p className="text-sm text-zinc-500 italic">No quotes yet. Add testimonials to strengthen your launch.</p>
              )}
            </div>

            {/* Stats */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={labelClasses}>Stats / Proof Points</label>
                <button
                  onClick={addStat}
                  className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Stat
                </button>
              </div>

              {(data.stats || []).map((stat, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input
                    className={inputClasses(`stat_${i}`)}
                    value={stat}
                    onChange={(e) => updateStat(i, e.target.value)}
                    placeholder="e.g. 10x faster, Used by 500+ teams"
                  />
                  <button
                    onClick={() => removeStat(i)}
                    className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {(data.stats || []).length === 0 && (
                <p className="text-sm text-zinc-500 italic">Add compelling numbers to back up your claims.</p>
              )}
            </div>
          </div>
        )}

        {/* Distribution */}
        {currentStep === 'distribution' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Distribution Channels</h2>

            <div>
              <label className={labelClasses}>Social Platforms *</label>
              <p className="text-xs text-zinc-500 mb-3">
                Select the platforms where you&apos;ll announce your launch.
              </p>
              {errors.platforms && <p className={errorClasses}>{errors.platforms}</p>}

              <div className="grid grid-cols-2 gap-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const isSelected = data.socialPlatforms.includes(platform.value);
                  return (
                    <button
                      key={platform.value}
                      onClick={() => togglePlatform(platform.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                        ${isSelected
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                      <span className="text-xl">{platform.icon}</span>
                      <span className="text-sm font-medium">{platform.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClasses}>Email List Size</label>
              <input
                type="number"
                className={inputClasses('emailListSize')}
                value={data.emailListSize || ''}
                onChange={(e) => updateField('emailListSize', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="e.g. 5000"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 px-2">
        <button
          onClick={goPrev}
          disabled={currentStepIndex === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${currentStepIndex === 0
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-300 hover:bg-zinc-800'
            }`}
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {currentStepIndex < STEPS.length - 1 ? (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium
              bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium
              bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            <Rocket className="w-4 h-4" /> Generate Launch Assets
          </button>
        )}
      </div>
    </div>
  );
}
