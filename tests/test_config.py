"""
Tests for config.py - Pydantic Settings Configuration.
Tests validation, loading, and is_configured properties.
"""

import os
import pytest
from unittest.mock import patch
from pydantic import ValidationError


class TestStripeSettings:
    """Tests for StripeSettings configuration."""

    def test_stripe_settings_loads_from_env(self):
        """Test that StripeSettings loads values from environment."""
        with patch.dict(os.environ, {
            'STRIPE_SECRET_KEY': 'sk_test_12345',
            'STRIPE_WEBHOOK_SECRET': 'whsec_12345',
            'STRIPE_PRICE_STARTER': 'price_starter',
            'STRIPE_PRICE_PROFESSIONAL': 'price_pro',
            'STRIPE_PRICE_ENTERPRISE': 'price_ent'
        }):
            from backend.config import StripeSettings
            settings = StripeSettings()

            assert settings.secret_key == 'sk_test_12345'
            assert settings.webhook_secret == 'whsec_12345'
            assert settings.price_starter == 'price_starter'
            assert settings.price_professional == 'price_pro'
            assert settings.price_enterprise == 'price_ent'

    def test_stripe_is_configured_true(self):
        """Test is_configured returns True when secret_key is set."""
        with patch.dict(os.environ, {'STRIPE_SECRET_KEY': 'sk_test_12345'}, clear=False):
            from backend.config import StripeSettings
            settings = StripeSettings()
            assert settings.is_configured is True

    def test_stripe_is_configured_false(self):
        """Test is_configured returns False when secret_key is not set."""
        with patch.dict(os.environ, {'STRIPE_SECRET_KEY': ''}, clear=False):
            from backend.config import StripeSettings
            settings = StripeSettings()
            assert settings.is_configured is False

    def test_stripe_optional_fields(self):
        """Test that Stripe fields are optional (settings can be created)."""
        # This test verifies that StripeSettings can be instantiated
        # Fields are optional - they may be None, empty, or have actual values from env/file
        from backend.config import StripeSettings
        settings = StripeSettings()
        # The key test is that instantiation doesn't raise an error
        # and is_configured property works correctly based on the secret_key value
        assert hasattr(settings, 'secret_key')
        assert hasattr(settings, 'is_configured')
        # is_configured should be True only if secret_key has a value
        assert settings.is_configured == bool(settings.secret_key)


class TestSupabaseSettings:
    """Tests for SupabaseSettings configuration."""

    def test_supabase_settings_loads_from_env(self):
        """Test that SupabaseSettings loads values from environment."""
        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_ANON_KEY': 'anon_key_123',
            'SUPABASE_SERVICE_ROLE_KEY': 'service_key_123'
        }):
            from backend.config import SupabaseSettings
            settings = SupabaseSettings()

            assert settings.url == 'https://test.supabase.co'
            assert settings.anon_key == 'anon_key_123'
            assert settings.service_role_key == 'service_key_123'

    def test_supabase_is_configured_true(self):
        """Test is_configured returns True when url and anon_key are set."""
        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_ANON_KEY': 'anon_key_123'
        }):
            from backend.config import SupabaseSettings
            settings = SupabaseSettings()
            assert settings.is_configured is True

    def test_supabase_is_configured_false_no_url(self):
        """Test is_configured returns False when url is not set."""
        with patch.dict(os.environ, {
            'SUPABASE_URL': '',
            'SUPABASE_ANON_KEY': 'anon_key_123'
        }, clear=False):
            from backend.config import SupabaseSettings
            settings = SupabaseSettings()
            assert settings.is_configured is False

    def test_supabase_is_configured_false_no_key(self):
        """Test is_configured returns False when anon_key is not set."""
        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_ANON_KEY': ''
        }, clear=False):
            from backend.config import SupabaseSettings
            settings = SupabaseSettings()
            assert settings.is_configured is False


class TestAISettings:
    """Tests for AISettings configuration."""

    def test_ai_settings_loads_from_env(self):
        """Test that AISettings loads values from environment."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'sk-ant-123',
            'OPENAI_API_KEY': 'sk-openai-123',
            'DEFAULT_AI_MODEL': 'claude-3-opus',
            'AI_MAX_TOKENS': '8192',
            'AI_TEMPERATURE': '0.5'
        }):
            from backend.config import AISettings
            settings = AISettings()

            assert settings.anthropic_api_key == 'sk-ant-123'
            assert settings.openai_api_key == 'sk-openai-123'
            assert settings.default_model == 'claude-3-opus'
            assert settings.max_tokens == 8192
            assert settings.temperature == 0.5

    def test_ai_settings_default_values(self):
        """Test that AISettings has correct default values."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'test-key'
        }, clear=False):
            from backend.config import AISettings
            settings = AISettings()

            assert settings.max_tokens == 4096
            assert settings.temperature == 0.7

    def test_ai_is_configured_with_anthropic(self):
        """Test is_configured returns True with Anthropic key."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'sk-ant-123',
            'OPENAI_API_KEY': ''
        }):
            from backend.config import AISettings
            settings = AISettings()
            assert settings.is_configured is True

    def test_ai_is_configured_with_openai(self):
        """Test is_configured returns True with OpenAI key."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': '',
            'OPENAI_API_KEY': 'sk-openai-123'
        }):
            from backend.config import AISettings
            settings = AISettings()
            assert settings.is_configured is True

    def test_ai_is_configured_false(self):
        """Test is_configured returns False when no keys are set."""
        env_copy = {k: v for k, v in os.environ.items()
                   if k not in ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY']}
        with patch.dict(os.environ, env_copy, clear=True):
            from backend.config import AISettings
            settings = AISettings()
            assert settings.is_configured is False

    def test_temperature_validation_valid(self):
        """Test that valid temperature values are accepted."""
        valid_temps = [0, 0.5, 1.0, 1.5, 2.0]
        for temp in valid_temps:
            with patch.dict(os.environ, {
                'ANTHROPIC_API_KEY': 'test',
                'AI_TEMPERATURE': str(temp)
            }):
                from backend.config import AISettings
                settings = AISettings()
                assert settings.temperature == temp

    def test_temperature_validation_invalid_negative(self):
        """Test that negative temperature raises validation error."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'test',
            'AI_TEMPERATURE': '-0.5'
        }):
            from backend.config import AISettings
            with pytest.raises(ValidationError) as exc_info:
                AISettings()
            assert 'temperature' in str(exc_info.value).lower()

    def test_temperature_validation_invalid_too_high(self):
        """Test that temperature > 2 raises validation error."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'test',
            'AI_TEMPERATURE': '2.5'
        }):
            from backend.config import AISettings
            with pytest.raises(ValidationError) as exc_info:
                AISettings()
            assert 'temperature' in str(exc_info.value).lower()

    def test_max_tokens_validation_valid(self):
        """Test that valid max_tokens values are accepted."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'test',
            'AI_MAX_TOKENS': '50000'
        }):
            from backend.config import AISettings
            settings = AISettings()
            assert settings.max_tokens == 50000

    def test_max_tokens_validation_invalid_zero(self):
        """Test that max_tokens of 0 raises validation error."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'test',
            'AI_MAX_TOKENS': '0'
        }):
            from backend.config import AISettings
            with pytest.raises(ValidationError) as exc_info:
                AISettings()
            assert 'max_tokens' in str(exc_info.value).lower()

    def test_max_tokens_validation_invalid_too_high(self):
        """Test that max_tokens > 100000 raises validation error."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'test',
            'AI_MAX_TOKENS': '200000'
        }):
            from backend.config import AISettings
            with pytest.raises(ValidationError) as exc_info:
                AISettings()
            assert 'max_tokens' in str(exc_info.value).lower()


class TestVoiceSettings:
    """Tests for VoiceSettings configuration."""

    def test_voice_settings_loads_from_env(self):
        """Test that VoiceSettings loads values from environment."""
        with patch.dict(os.environ, {
            'ELEVENLABS_API_KEY': 'el_key_123',
            'DEEPGRAM_API_KEY': 'dg_key_123',
            'DEFAULT_VOICE_ID': 'custom_voice_id'
        }):
            from backend.config import VoiceSettings
            settings = VoiceSettings()

            assert settings.elevenlabs_api_key == 'el_key_123'
            assert settings.deepgram_api_key == 'dg_key_123'
            assert settings.default_voice_id == 'custom_voice_id'

    def test_voice_is_configured_with_elevenlabs(self):
        """Test is_configured returns True with ElevenLabs key."""
        with patch.dict(os.environ, {
            'ELEVENLABS_API_KEY': 'el_key_123',
            'DEEPGRAM_API_KEY': ''
        }):
            from backend.config import VoiceSettings
            settings = VoiceSettings()
            assert settings.is_configured is True

    def test_voice_is_configured_with_deepgram(self):
        """Test is_configured returns True with Deepgram key."""
        with patch.dict(os.environ, {
            'ELEVENLABS_API_KEY': '',
            'DEEPGRAM_API_KEY': 'dg_key_123'
        }):
            from backend.config import VoiceSettings
            settings = VoiceSettings()
            assert settings.is_configured is True

    def test_voice_default_voice_id(self):
        """Test that default voice ID is set correctly."""
        with patch.dict(os.environ, {
            'ELEVENLABS_API_KEY': 'test'
        }):
            from backend.config import VoiceSettings
            settings = VoiceSettings()
            assert settings.default_voice_id == '21m00Tcm4TlvDq8ikWAM'


class TestAppSettings:
    """Tests for AppSettings configuration."""

    def test_app_settings_loads_from_env(self):
        """Test that AppSettings loads values from environment."""
        with patch.dict(os.environ, {
            'ENVIRONMENT': 'production',
            'DEBUG': 'true',
            'LOG_LEVEL': 'DEBUG',
            'ALLOWED_ORIGINS': 'https://app.com,https://api.com',
            'ENABLE_DOCS': 'false'
        }):
            from backend.config import AppSettings
            settings = AppSettings()

            assert settings.environment == 'production'
            assert settings.debug is True
            assert settings.log_level == 'DEBUG'
            assert settings.allowed_origins == 'https://app.com,https://api.com'
            assert settings.enable_docs is False

    def test_app_settings_default_values(self):
        """Test that AppSettings has correct default values."""
        env_copy = {k: v for k, v in os.environ.items()
                   if k not in ['ENVIRONMENT', 'DEBUG', 'LOG_LEVEL', 'ALLOWED_ORIGINS', 'ENABLE_DOCS']}
        with patch.dict(os.environ, env_copy, clear=True):
            from backend.config import AppSettings
            settings = AppSettings()

            assert settings.environment == 'development'
            assert settings.debug is False
            assert settings.log_level == 'INFO'
            assert settings.enable_docs is True

    def test_is_production(self):
        """Test is_production property."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'production'}):
            from backend.config import AppSettings
            settings = AppSettings()
            assert settings.is_production is True
            assert settings.is_development is False

    def test_is_development(self):
        """Test is_development property."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'development'}):
            from backend.config import AppSettings
            settings = AppSettings()
            assert settings.is_development is True
            assert settings.is_production is False

    def test_origins_list(self):
        """Test origins_list property."""
        with patch.dict(os.environ, {
            'ALLOWED_ORIGINS': 'https://app.com, https://api.com , https://web.com'
        }):
            from backend.config import AppSettings
            settings = AppSettings()
            origins = settings.origins_list
            assert len(origins) == 3
            assert 'https://app.com' in origins
            assert 'https://api.com' in origins
            assert 'https://web.com' in origins

    def test_log_level_validation_valid(self):
        """Test that valid log levels are accepted."""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        for level in valid_levels:
            with patch.dict(os.environ, {'LOG_LEVEL': level}):
                from backend.config import AppSettings
                settings = AppSettings()
                assert settings.log_level == level.upper()

    def test_log_level_validation_case_insensitive(self):
        """Test that log level validation is case insensitive."""
        with patch.dict(os.environ, {'LOG_LEVEL': 'debug'}):
            from backend.config import AppSettings
            settings = AppSettings()
            assert settings.log_level == 'DEBUG'

    def test_log_level_validation_invalid(self):
        """Test that invalid log level raises validation error."""
        with patch.dict(os.environ, {'LOG_LEVEL': 'INVALID'}):
            from backend.config import AppSettings
            with pytest.raises(ValidationError) as exc_info:
                AppSettings()
            assert 'log level' in str(exc_info.value).lower() or 'log_level' in str(exc_info.value).lower()


class TestSettings:
    """Tests for the root Settings class."""

    def test_settings_combines_all_sections(self):
        """Test that Settings combines all configuration sections."""
        with patch.dict(os.environ, {
            'ANTHROPIC_API_KEY': 'test-key',
            'ENVIRONMENT': 'test'
        }):
            from backend.config import Settings
            settings = Settings()

            assert hasattr(settings, 'stripe')
            assert hasattr(settings, 'supabase')
            assert hasattr(settings, 'ai')
            assert hasattr(settings, 'voice')
            assert hasattr(settings, 'database')
            assert hasattr(settings, 'app')

    def test_validate_required_passes_with_ai_key(self):
        """Test validate_required passes when AI key is present."""
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'}):
            from backend.config import Settings
            settings = Settings()
            # Should not raise
            settings.validate_required()

    def test_validate_required_fails_without_ai_key(self):
        """Test validate_required fails when no AI key is present."""
        env_copy = {k: v for k, v in os.environ.items()
                   if k not in ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY']}
        with patch.dict(os.environ, env_copy, clear=True):
            from backend.config import Settings
            settings = Settings()
            with pytest.raises(ValueError) as exc_info:
                settings.validate_required()
            assert 'AI configuration' in str(exc_info.value)

    def test_get_settings_singleton(self):
        """Test that get_settings returns a singleton."""
        from backend.config import get_settings, _settings
        # Reset singleton for testing
        import backend.config as config_module
        config_module._settings = None

        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'}):
            settings1 = get_settings()
            settings2 = get_settings()
            assert settings1 is settings2


class TestDatabaseSettings:
    """Tests for DatabaseSettings configuration."""

    def test_database_settings_loads_from_env(self):
        """Test that DatabaseSettings loads database path from environment."""
        with patch.dict(os.environ, {'DATABASE_PATH': '/custom/path/db.sqlite'}):
            from backend.config import DatabaseSettings
            settings = DatabaseSettings()
            assert settings.database_path == '/custom/path/db.sqlite'

    def test_database_settings_default_value(self):
        """Test that DatabaseSettings has correct default value."""
        env_copy = {k: v for k, v in os.environ.items()
                   if k != 'DATABASE_PATH'}
        with patch.dict(os.environ, env_copy, clear=True):
            from backend.config import DatabaseSettings
            settings = DatabaseSettings()
            assert settings.database_path == 'agent_forge.db'
