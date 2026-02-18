/**
 * Tests for pricing configuration and plan logic
 *
 * Validates the config.json pricing structure to catch
 * misconfigurations before they hit production.
 */

import config from '@/config.json';

describe('Pricing Configuration', () => {
  const { plans, annual_discount, voice_overage } = config.pricing;

  describe('Plan Structure', () => {
    const planNames = ['starter', 'pro', 'scale', 'enterprise'] as const;

    it('has all expected plans', () => {
      for (const plan of planNames) {
        expect(plans).toHaveProperty(plan);
      }
    });

    it('each plan has required fields', () => {
      for (const plan of planNames) {
        const p = plans[plan];
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('price');
        expect(p).toHaveProperty('interval');
        expect(p).toHaveProperty('agents');
        expect(p).toHaveProperty('credits_included');
        expect(p).toHaveProperty('features');
        expect(typeof p.name).toBe('string');
        expect(typeof p.price).toBe('number');
        expect(p.interval).toBe('month');
      }
    });

    it('plans are in ascending price order', () => {
      expect(plans.starter.price).toBeLessThan(plans.pro.price);
      expect(plans.pro.price).toBeLessThan(plans.scale.price);
      expect(plans.scale.price).toBeLessThan(plans.enterprise.price);
    });

    it('agent limits increase with plan tier', () => {
      expect(plans.starter.agents).toBeGreaterThan(0);
      expect(plans.pro.agents).toBeGreaterThan(plans.starter.agents);
      // Scale and enterprise use -1 for unlimited
      expect(plans.scale.agents).toBe(-1);
      expect(plans.enterprise.agents).toBe(-1);
    });

    it('credits increase with plan tier', () => {
      expect(plans.starter.credits_included).toBeGreaterThan(0);
      expect(plans.pro.credits_included).toBeGreaterThan(plans.starter.credits_included);
      expect(plans.scale.credits_included).toBeGreaterThan(plans.pro.credits_included);
      // Enterprise is unlimited
      expect(plans.enterprise.credits_included).toBe(-1);
    });

    it('each plan has at least 3 features listed', () => {
      for (const plan of planNames) {
        expect(plans[plan].features.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('credit overage rate decreases with higher plans', () => {
      expect(plans.starter.credit_overage_rate).toBeGreaterThan(plans.pro.credit_overage_rate);
      expect(plans.pro.credit_overage_rate).toBeGreaterThan(plans.scale.credit_overage_rate);
      expect(plans.enterprise.credit_overage_rate).toBe(0);
    });
  });

  describe('Annual Discount', () => {
    it('annual discount is a valid percentage', () => {
      expect(annual_discount).toBeGreaterThan(0);
      expect(annual_discount).toBeLessThanOrEqual(1);
    });

    it('annual discount is 20%', () => {
      expect(annual_discount).toBe(0.20);
    });

    it('annual pricing calculation is correct', () => {
      const starterAnnual = plans.starter.price * (1 - annual_discount);
      expect(starterAnnual).toBeCloseTo(31.2); // $39 * 0.80

      const proAnnual = plans.pro.price * (1 - annual_discount);
      expect(proAnnual).toBeCloseTo(79.2); // $99 * 0.80
    });
  });

  describe('Voice Pricing', () => {
    it('has voice overage rates', () => {
      expect(voice_overage).toBeDefined();
      expect(voice_overage.per_minute_inbound).toBeGreaterThan(0);
      expect(voice_overage.per_minute_outbound).toBeGreaterThan(0);
    });

    it('outbound costs more than inbound', () => {
      expect(voice_overage.per_minute_outbound).toBeGreaterThan(voice_overage.per_minute_inbound);
    });

    it('toll-free numbers cost more than local', () => {
      expect(voice_overage.additional_number_toll_free).toBeGreaterThan(voice_overage.additional_number_local);
    });

    it('voice minutes increase with plan tier', () => {
      expect(plans.starter.voice_minutes).toBeGreaterThan(0);
      expect(plans.pro.voice_minutes).toBeGreaterThan(plans.starter.voice_minutes);
      expect(plans.scale.voice_minutes).toBeGreaterThan(plans.pro.voice_minutes);
      expect(plans.enterprise.voice_minutes).toBe(-1); // unlimited
    });
  });

  describe('Voice Configuration', () => {
    const { voice } = config;

    it('voice is enabled', () => {
      expect(voice.enabled).toBe(true);
    });

    it('has valid TTS configuration', () => {
      expect(voice.tts.provider).toBe('elevenlabs');
      expect(voice.tts.default_voice).toBeTruthy();
      expect(voice.tts.default_model).toBeTruthy();
      expect(voice.tts.default_speed).toBeGreaterThan(0);
    });

    it('has valid ASR configuration', () => {
      expect(voice.asr.provider).toBe('deepgram');
      expect(voice.asr.model).toBe('nova-2');
      expect(voice.asr.supported_languages).toContain('en');
      expect(voice.asr.supported_languages.length).toBeGreaterThan(5);
    });

    it('has pipeline latency target under 1 second', () => {
      expect(voice.pipeline.latency_target_ms).toBeLessThanOrEqual(1000);
    });

    it('concurrent call limits match plan tiers', () => {
      expect(voice.limits.max_concurrent_calls_starter).toBe(1);
      expect(voice.limits.max_concurrent_calls_pro).toBeGreaterThan(voice.limits.max_concurrent_calls_starter);
      expect(voice.limits.max_concurrent_calls_scale).toBeGreaterThan(voice.limits.max_concurrent_calls_pro);
      expect(voice.limits.max_concurrent_calls_enterprise).toBeGreaterThanOrEqual(voice.limits.max_concurrent_calls_scale);
    });
  });
});

describe('AI Configuration', () => {
  it('uses Anthropic as default provider', () => {
    expect(config.ai.provider).toBe('anthropic');
  });

  it('uses a valid Claude model', () => {
    expect(config.ai.model).toContain('claude');
  });

  it('temperature is in valid range', () => {
    expect(config.ai.temperature).toBeGreaterThanOrEqual(0);
    expect(config.ai.temperature).toBeLessThanOrEqual(2);
  });

  it('max_tokens is reasonable', () => {
    expect(config.ai.max_tokens).toBeGreaterThan(0);
    expect(config.ai.max_tokens).toBeLessThanOrEqual(4096);
  });
});

describe('Deployment Configuration', () => {
  it('supports multiple deployment targets', () => {
    expect(config.deployment.supported_targets.length).toBeGreaterThanOrEqual(3);
  });

  it('default target is valid', () => {
    expect(config.deployment.supported_targets).toContain(config.deployment.default_target);
  });

  it('supports major platforms', () => {
    const targets = config.deployment.supported_targets;
    expect(targets).toContain('cloudflare');
    expect(targets).toContain('vercel');
    expect(targets).toContain('docker');
  });
});

describe('Integration Configuration', () => {
  it('supports major messaging platforms', () => {
    const integrations = config.integrations.supported;
    expect(integrations).toContain('slack');
    expect(integrations).toContain('discord');
    expect(integrations).toContain('whatsapp');
  });

  it('supports CRM integrations', () => {
    const integrations = config.integrations.supported;
    expect(integrations).toContain('hubspot');
    expect(integrations).toContain('salesforce');
  });
});
