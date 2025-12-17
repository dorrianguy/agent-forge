-- ============================================================================
-- Voice Agent Platform Schema Migration
-- Agent Forge - Voice Module Database Schema
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- VOICE AGENT CONFIGURATIONS
-- Stores voice-specific settings for agents
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_agent_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- TTS Voice Settings
    voice_id TEXT NOT NULL DEFAULT 'EXAVITQu4vr4xnSDxMaL',  -- Default ElevenLabs voice
    voice_provider TEXT NOT NULL DEFAULT 'elevenlabs',  -- elevenlabs, deepgram, openai
    language TEXT NOT NULL DEFAULT 'en',
    accent TEXT DEFAULT 'american',

    -- Voice Control Parameters
    speed DECIMAL(3,2) DEFAULT 1.0 CHECK (speed >= 0.5 AND speed <= 2.0),
    temperature DECIMAL(3,2) DEFAULT 0.5 CHECK (temperature >= 0 AND temperature <= 1),
    stability DECIMAL(3,2) DEFAULT 0.5 CHECK (stability >= 0 AND stability <= 1),

    -- Conversation Settings
    responsiveness DECIMAL(3,2) DEFAULT 0.5 CHECK (responsiveness >= 0 AND responsiveness <= 1),
    backchannel_enabled BOOLEAN DEFAULT true,
    backchannel_frequency DECIMAL(3,2) DEFAULT 0.3 CHECK (backchannel_frequency >= 0 AND backchannel_frequency <= 1),
    interruption_sensitivity DECIMAL(3,2) DEFAULT 0.5 CHECK (interruption_sensitivity >= 0 AND interruption_sensitivity <= 1),

    -- Call Settings
    max_call_duration INTEGER DEFAULT 3600,  -- seconds (default 1 hour)
    silence_timeout INTEGER DEFAULT 10,  -- seconds before auto-ending on silence
    end_call_after_silence_ms INTEGER DEFAULT 5000,

    -- Voicemail Settings
    voicemail_detection BOOLEAN DEFAULT true,
    voicemail_message TEXT,
    voicemail_action TEXT DEFAULT 'leave_message',  -- leave_message, hangup, transfer

    -- Greeting
    greeting_message TEXT,

    -- State Machine / Conversation Flow
    state_machine JSONB,  -- Stores conversation flow definition

    -- ASR Settings
    asr_provider TEXT DEFAULT 'deepgram',
    asr_model TEXT DEFAULT 'nova-2',
    asr_language TEXT DEFAULT 'en',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_agent_voice_config UNIQUE (agent_id)
);

-- Index for faster lookups
CREATE INDEX idx_voice_agent_configs_agent ON voice_agent_configs(agent_id);

-- ============================================================================
-- PHONE NUMBERS
-- Provisioned phone numbers linked to users and agents
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Number Details
    phone_number TEXT NOT NULL UNIQUE,
    friendly_name TEXT,
    country TEXT NOT NULL DEFAULT 'US',
    region TEXT,
    locality TEXT,

    -- Capabilities
    capabilities TEXT[] DEFAULT ARRAY['voice'],  -- voice, sms, mms

    -- Provider Info
    provider TEXT NOT NULL DEFAULT 'twilio',  -- twilio, telnyx
    provider_sid TEXT NOT NULL,

    -- Configuration URLs
    voice_url TEXT,
    sms_url TEXT,
    status_callback_url TEXT,

    -- Billing
    monthly_cost DECIMAL(10,2) DEFAULT 2.00,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'released')),

    -- Versioning
    active_version_id UUID,  -- References agent_versions

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'pending',
    branded_name TEXT,  -- For branded caller ID

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_phone_numbers_user ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_agent ON phone_numbers(agent_id);
CREATE INDEX idx_phone_numbers_number ON phone_numbers(phone_number);

-- ============================================================================
-- CALLS
-- Records of all voice calls
-- ============================================================================

CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    agent_id UUID REFERENCES agents(id),
    phone_number_id UUID REFERENCES phone_numbers(id),
    campaign_id UUID,  -- References voice_campaigns if part of campaign

    -- Call Details
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,

    -- Status
    status TEXT DEFAULT 'initiated' CHECK (status IN (
        'initiated', 'ringing', 'in_progress', 'completed',
        'busy', 'no_answer', 'failed', 'canceled', 'voicemail'
    )),

    -- Provider Info
    provider TEXT DEFAULT 'twilio',
    provider_call_id TEXT,

    -- Timing
    started_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,

    -- Recording
    recording_url TEXT,
    recording_duration INTEGER DEFAULT 0,
    recording_sid TEXT,

    -- Cost
    cost DECIMAL(10,4) DEFAULT 0,

    -- Analysis Results
    outcome TEXT,  -- appointment_booked, transferred, info_provided, etc.
    sentiment_score DECIMAL(3,2),  -- -1 to 1

    -- Agent Version
    agent_version_id UUID,  -- Which version of agent handled this

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Machine Detection
    answered_by TEXT,  -- human, machine, unknown

    -- Transfer Info
    transferred_to TEXT,
    transfer_type TEXT,  -- warm, cold, blind

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calls_user ON calls(user_id);
CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_campaign ON calls(campaign_id);
CREATE INDEX idx_calls_phone_number ON calls(phone_number_id);
CREATE INDEX idx_calls_direction ON calls(direction);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created ON calls(created_at);
CREATE INDEX idx_calls_provider_id ON calls(provider_call_id);

-- ============================================================================
-- CALL TRANSCRIPTS
-- Turn-by-turn transcript of calls
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,

    -- Speaker Info
    speaker TEXT NOT NULL CHECK (speaker IN ('user', 'agent', 'system')),

    -- Content
    message TEXT NOT NULL,

    -- Timing
    timestamp_ms INTEGER NOT NULL,  -- Milliseconds from call start
    duration_ms INTEGER,  -- Duration of this utterance

    -- ASR Metadata
    confidence DECIMAL(4,3),
    is_final BOOLEAN DEFAULT true,

    -- Word-level data
    words JSONB,  -- [{word, start, end, confidence}]

    -- Language
    language TEXT DEFAULT 'en',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_call_transcripts_call ON call_transcripts(call_id);
CREATE INDEX idx_call_transcripts_timestamp ON call_transcripts(timestamp_ms);

-- ============================================================================
-- CALL ANALYTICS
-- Post-call analysis results
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,

    -- Summary
    summary TEXT,

    -- Sentiment
    sentiment_score DECIMAL(3,2),  -- -1 to 1
    sentiment_label TEXT,  -- positive, negative, neutral

    -- Outcome
    outcome TEXT,
    outcome_confidence DECIMAL(4,3),

    -- Performance Metrics
    latency_avg_ms DECIMAL(10,2),
    latency_p95_ms DECIMAL(10,2),
    latency_max_ms DECIMAL(10,2),

    -- Conversation Metrics
    user_turns INTEGER DEFAULT 0,
    agent_turns INTEGER DEFAULT 0,
    total_turns INTEGER DEFAULT 0,
    interruptions INTEGER DEFAULT 0,

    -- Custom Metrics (extracted by LLM)
    custom_metrics JSONB DEFAULT '{}',

    -- Action Items
    action_items JSONB DEFAULT '[]',

    -- Intent Detection
    detected_intent TEXT,
    intent_confidence DECIMAL(4,3),

    -- Topics Discussed
    topics JSONB DEFAULT '[]',

    -- Analysis Status
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    analysis_version TEXT DEFAULT '1.0'
);

-- Indexes
CREATE INDEX idx_call_analytics_call ON call_analytics(call_id);
CREATE INDEX idx_call_analytics_sentiment ON call_analytics(sentiment_label);
CREATE INDEX idx_call_analytics_outcome ON call_analytics(outcome);

-- ============================================================================
-- VOICE CAMPAIGNS
-- Batch/outbound calling campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),

    -- Campaign Details
    name TEXT NOT NULL,
    description TEXT,

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'running', 'paused', 'completed', 'canceled'
    )),

    -- Phone Number
    from_number_id UUID REFERENCES phone_numbers(id),

    -- Schedule
    schedule JSONB,  -- {start_time, end_time, timezone, days_of_week, start_date, end_date}

    -- Settings
    concurrent_calls INTEGER DEFAULT 1 CHECK (concurrent_calls >= 1 AND concurrent_calls <= 50),
    calls_per_minute INTEGER DEFAULT 10,

    -- Retry Policy
    retry_policy JSONB DEFAULT '{"max_attempts": 3, "retry_delay_minutes": 60}',

    -- Stats (denormalized for quick access)
    total_contacts INTEGER DEFAULT 0,
    pending_contacts INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_voice_campaigns_user ON voice_campaigns(user_id);
CREATE INDEX idx_voice_campaigns_agent ON voice_campaigns(agent_id);
CREATE INDEX idx_voice_campaigns_status ON voice_campaigns(status);

-- ============================================================================
-- CAMPAIGN CONTACTS
-- Contacts in a campaign with their call status
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES voice_campaigns(id) ON DELETE CASCADE,

    -- Contact Info
    phone_number TEXT NOT NULL,
    name TEXT,
    email TEXT,

    -- Custom Fields (from CSV import)
    custom_fields JSONB DEFAULT '{}',

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'calling', 'completed', 'failed', 'skipped', 'do_not_call'
    )),

    -- Call Tracking
    call_id UUID REFERENCES calls(id),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,

    -- Result
    result TEXT,  -- answered, voicemail, busy, no_answer, failed
    outcome TEXT,  -- appointment_booked, interested, not_interested, etc.

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON campaign_contacts(status);
CREATE INDEX idx_campaign_contacts_phone ON campaign_contacts(phone_number);

-- ============================================================================
-- VOICE WEBHOOKS
-- User-registered webhooks for voice events
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Webhook Config
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,  -- call_started, call_ended, transcript_ready, etc.
    secret TEXT,  -- For HMAC signing

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Health Tracking
    last_delivery_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_failure_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_webhooks_user ON voice_webhooks(user_id);
CREATE INDEX idx_voice_webhooks_active ON voice_webhooks(is_active);

-- ============================================================================
-- WEBHOOK DELIVERIES
-- Log of webhook delivery attempts
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES voice_webhooks(id) ON DELETE CASCADE,

    -- Event Info
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),

    -- Response
    response_status_code INTEGER,
    response_body TEXT,

    -- Retry Tracking
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);

-- ============================================================================
-- AGENT VERSIONS
-- Version control for voice agents
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Version Number
    version_number INTEGER NOT NULL,

    -- Snapshot of Configuration
    voice_config JSONB NOT NULL,  -- Snapshot of voice_agent_configs
    state_machine JSONB,  -- Snapshot of conversation flow
    functions_enabled TEXT[] DEFAULT '{}',  -- List of enabled function names

    -- Status
    is_active BOOLEAN DEFAULT false,  -- Currently deployed version
    is_deployed BOOLEAN DEFAULT false,  -- Has been deployed at least once

    -- Deployment Info
    deployed_to JSONB DEFAULT '[]',  -- List of phone_number_ids

    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_at TIMESTAMPTZ,

    CONSTRAINT unique_agent_version UNIQUE (agent_id, version_number)
);

-- Indexes
CREATE INDEX idx_agent_versions_agent ON agent_versions(agent_id);
CREATE INDEX idx_agent_versions_active ON agent_versions(is_active);

-- ============================================================================
-- SMS MESSAGES
-- SMS message history
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    agent_id UUID REFERENCES agents(id),

    -- Message Details
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    body TEXT NOT NULL,

    -- Direction
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

    -- Status
    status TEXT DEFAULT 'queued' CHECK (status IN (
        'queued', 'sent', 'delivered', 'failed', 'received'
    )),

    -- Provider
    provider TEXT DEFAULT 'twilio',
    provider_sid TEXT,

    -- Media (for MMS)
    media_urls JSONB DEFAULT '[]',

    -- Related Call (if sent during call)
    call_id UUID REFERENCES calls(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_sms_messages_user ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_from ON sms_messages(from_number);
CREATE INDEX idx_sms_messages_to ON sms_messages(to_number);
CREATE INDEX idx_sms_messages_call ON sms_messages(call_id);

-- ============================================================================
-- SMS CONVERSATIONS
-- Thread-based SMS conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    agent_id UUID REFERENCES agents(id),

    -- Conversation Parties
    our_number TEXT NOT NULL,
    their_number TEXT NOT NULL,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),

    -- Stats
    message_count INTEGER DEFAULT 0,

    -- Timestamps
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,

    CONSTRAINT unique_sms_conversation UNIQUE (our_number, their_number)
);

-- Indexes
CREATE INDEX idx_sms_conversations_user ON sms_conversations(user_id);
CREATE INDEX idx_sms_conversations_their_number ON sms_conversations(their_number);

-- ============================================================================
-- VOICE USAGE
-- Track voice usage for billing
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),

    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- Usage Counts
    inbound_minutes INTEGER DEFAULT 0,
    outbound_minutes INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    sms_sent INTEGER DEFAULT 0,
    sms_received INTEGER DEFAULT 0,

    -- Costs
    inbound_cost DECIMAL(10,2) DEFAULT 0,
    outbound_cost DECIMAL(10,2) DEFAULT 0,
    sms_cost DECIMAL(10,2) DEFAULT 0,
    number_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_usage_user ON voice_usage(user_id);
CREATE INDEX idx_voice_usage_period ON voice_usage(period_start, period_end);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all voice tables
ALTER TABLE voice_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_usage ENABLE ROW LEVEL SECURITY;

-- Voice Agent Configs: Users can only access configs for their own agents
CREATE POLICY "Users own their voice configs" ON voice_agent_configs
    FOR ALL USING (
        agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    );

-- Phone Numbers: Users can only access their own numbers
CREATE POLICY "Users own their phone numbers" ON phone_numbers
    FOR ALL USING (user_id = auth.uid());

-- Calls: Users can only access their own calls
CREATE POLICY "Users own their calls" ON calls
    FOR ALL USING (user_id = auth.uid());

-- Call Transcripts: Users can access transcripts for their own calls
CREATE POLICY "Users own their call transcripts" ON call_transcripts
    FOR ALL USING (
        call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
    );

-- Call Analytics: Users can access analytics for their own calls
CREATE POLICY "Users own their call analytics" ON call_analytics
    FOR ALL USING (
        call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
    );

-- Voice Campaigns: Users can only access their own campaigns
CREATE POLICY "Users own their campaigns" ON voice_campaigns
    FOR ALL USING (user_id = auth.uid());

-- Campaign Contacts: Users can access contacts in their own campaigns
CREATE POLICY "Users own their campaign contacts" ON campaign_contacts
    FOR ALL USING (
        campaign_id IN (SELECT id FROM voice_campaigns WHERE user_id = auth.uid())
    );

-- Voice Webhooks: Users can only access their own webhooks
CREATE POLICY "Users own their webhooks" ON voice_webhooks
    FOR ALL USING (user_id = auth.uid());

-- Webhook Deliveries: Users can access deliveries for their own webhooks
CREATE POLICY "Users own their webhook deliveries" ON webhook_deliveries
    FOR ALL USING (
        webhook_id IN (SELECT id FROM voice_webhooks WHERE user_id = auth.uid())
    );

-- Agent Versions: Users can access versions for their own agents
CREATE POLICY "Users own their agent versions" ON agent_versions
    FOR ALL USING (
        agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    );

-- SMS Messages: Users can only access their own messages
CREATE POLICY "Users own their sms messages" ON sms_messages
    FOR ALL USING (user_id = auth.uid());

-- SMS Conversations: Users can only access their own conversations
CREATE POLICY "Users own their sms conversations" ON sms_conversations
    FOR ALL USING (user_id = auth.uid());

-- Voice Usage: Users can only access their own usage
CREATE POLICY "Users own their voice usage" ON voice_usage
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_voice_agent_configs_updated_at
    BEFORE UPDATE ON voice_agent_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_phone_numbers_updated_at
    BEFORE UPDATE ON phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_voice_campaigns_updated_at
    BEFORE UPDATE ON voice_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaign_contacts_updated_at
    BEFORE UPDATE ON campaign_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_voice_webhooks_updated_at
    BEFORE UPDATE ON voice_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_voice_usage_updated_at
    BEFORE UPDATE ON voice_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update campaign stats after contact status changes
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE voice_campaigns
    SET
        pending_contacts = (SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = NEW.campaign_id AND status = 'pending'),
        completed_calls = (SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = NEW.campaign_id AND status = 'completed'),
        failed_calls = (SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = NEW.campaign_id AND status = 'failed')
    WHERE id = NEW.campaign_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_stats_trigger
    AFTER INSERT OR UPDATE ON campaign_contacts
    FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();

-- Function to increment SMS conversation message count
CREATE OR REPLACE FUNCTION update_sms_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sms_conversations
    SET
        message_count = message_count + 1,
        last_message_at = NOW()
    WHERE
        (our_number = NEW.from_number AND their_number = NEW.to_number) OR
        (our_number = NEW.to_number AND their_number = NEW.from_number);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_conversation_stats_trigger
    AFTER INSERT ON sms_messages
    FOR EACH ROW EXECUTE FUNCTION update_sms_conversation_stats();
