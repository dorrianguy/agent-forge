"""
Pydantic Settings Configuration for Agent Forge
Validates all environment variables at startup
"""

import os
from typing import Optional, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class StripeSettings(BaseSettings):
    """Stripe billing configuration"""
    secret_key: Optional[str] = Field(None, alias='STRIPE_SECRET_KEY')
    webhook_secret: Optional[str] = Field(None, alias='STRIPE_WEBHOOK_SECRET')
    price_starter: Optional[str] = Field(None, alias='STRIPE_PRICE_STARTER')
    price_professional: Optional[str] = Field(None, alias='STRIPE_PRICE_PROFESSIONAL')
    price_enterprise: Optional[str] = Field(None, alias='STRIPE_PRICE_ENTERPRISE')

    @property
    def is_configured(self) -> bool:
        return bool(self.secret_key)

    class Config:
        env_file = '.env'
        extra = 'ignore'


class SupabaseSettings(BaseSettings):
    """Supabase database configuration"""
    url: Optional[str] = Field(None, alias='SUPABASE_URL')
    anon_key: Optional[str] = Field(None, alias='SUPABASE_ANON_KEY')
    service_role_key: Optional[str] = Field(None, alias='SUPABASE_SERVICE_ROLE_KEY')

    @property
    def is_configured(self) -> bool:
        return bool(self.url and self.anon_key)

    class Config:
        env_file = '.env'
        extra = 'ignore'


class AISettings(BaseSettings):
    """AI model configuration"""
    anthropic_api_key: Optional[str] = Field(None, alias='ANTHROPIC_API_KEY')
    openai_api_key: Optional[str] = Field(None, alias='OPENAI_API_KEY')
    default_model: str = Field('claude-sonnet-4-20250514', alias='DEFAULT_AI_MODEL')
    max_tokens: int = Field(4096, alias='AI_MAX_TOKENS')
    temperature: float = Field(0.7, alias='AI_TEMPERATURE')

    @field_validator('temperature')
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if not 0 <= v <= 2:
            raise ValueError('Temperature must be between 0 and 2')
        return v

    @field_validator('max_tokens')
    @classmethod
    def validate_max_tokens(cls, v: int) -> int:
        if v < 1 or v > 100000:
            raise ValueError('max_tokens must be between 1 and 100000')
        return v

    @property
    def is_configured(self) -> bool:
        return bool(self.anthropic_api_key or self.openai_api_key)

    class Config:
        env_file = '.env'
        extra = 'ignore'


class VoiceSettings(BaseSettings):
    """Voice API configuration"""
    elevenlabs_api_key: Optional[str] = Field(None, alias='ELEVENLABS_API_KEY')
    deepgram_api_key: Optional[str] = Field(None, alias='DEEPGRAM_API_KEY')
    default_voice_id: str = Field('21m00Tcm4TlvDq8ikWAM', alias='DEFAULT_VOICE_ID')

    @property
    def is_configured(self) -> bool:
        return bool(self.elevenlabs_api_key or self.deepgram_api_key)

    class Config:
        env_file = '.env'
        extra = 'ignore'


class DatabaseSettings(BaseSettings):
    """Database configuration"""
    database_path: str = Field('agent_forge.db', alias='DATABASE_PATH')

    class Config:
        env_file = '.env'
        extra = 'ignore'


class AppSettings(BaseSettings):
    """Application configuration"""
    environment: str = Field('development', alias='ENVIRONMENT')
    debug: bool = Field(False, alias='DEBUG')
    log_level: str = Field('INFO', alias='LOG_LEVEL')
    allowed_origins: str = Field('http://localhost:3000,http://localhost:8000', alias='ALLOWED_ORIGINS')
    enable_docs: bool = Field(True, alias='ENABLE_DOCS')

    @field_validator('log_level')
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'Log level must be one of: {valid_levels}')
        return v.upper()

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == 'production'

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == 'development'

    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(',')]

    class Config:
        env_file = '.env'
        extra = 'ignore'


class Settings(BaseSettings):
    """Root settings that combines all config sections"""
    stripe: StripeSettings = Field(default_factory=StripeSettings)
    supabase: SupabaseSettings = Field(default_factory=SupabaseSettings)
    ai: AISettings = Field(default_factory=AISettings)
    voice: VoiceSettings = Field(default_factory=VoiceSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    app: AppSettings = Field(default_factory=AppSettings)

    class Config:
        env_file = '.env'
        extra = 'ignore'

    def validate_required(self) -> None:
        """Validate that required configuration is present"""
        errors = []

        if not self.ai.is_configured:
            errors.append("AI configuration missing: ANTHROPIC_API_KEY or OPENAI_API_KEY required")

        if errors:
            raise ValueError(f"Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors))

    def print_status(self) -> None:
        """Print configuration status for debugging"""
        print("\n=== Agent Forge Configuration ===")
        print(f"Environment: {self.app.environment}")
        print(f"Debug: {self.app.debug}")
        print(f"Log Level: {self.app.log_level}")
        print(f"\nServices:")
        print(f"  - AI: {'Configured' if self.ai.is_configured else 'Not configured'}")
        print(f"  - Stripe: {'Configured' if self.stripe.is_configured else 'Not configured'}")
        print(f"  - Supabase: {'Configured' if self.supabase.is_configured else 'Not configured'}")
        print(f"  - Voice: {'Configured' if self.voice.is_configured else 'Not configured'}")
        print("=================================\n")


# Singleton instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create settings singleton"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def validate_config() -> None:
    """Validate configuration at startup"""
    settings = get_settings()
    settings.validate_required()
    if settings.app.is_development:
        settings.print_status()
