"""
TTS (Text-to-Speech) Manager for Agent Forge Voice

Handles text-to-speech synthesis with streaming support.
Supports ElevenLabs (primary), Deepgram, and OpenAI TTS.
"""

import os
import asyncio
import logging
import json
import hashlib
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, List, AsyncIterator, Union
import uuid

logger = logging.getLogger(__name__)


class TTSProvider(Enum):
    """Supported TTS providers"""
    ELEVENLABS = "elevenlabs"
    DEEPGRAM = "deepgram"
    OPENAI = "openai"


@dataclass
class TTSVoice:
    """Represents a TTS voice"""
    id: str
    name: str
    provider: TTSProvider
    language: str = "en"
    gender: Optional[str] = None  # male, female, neutral
    preview_url: Optional[str] = None
    description: Optional[str] = None
    labels: Dict[str, Any] = field(default_factory=dict)
    available_models: List[str] = field(default_factory=list)


@dataclass
class TTSConfig:
    """Configuration for TTS synthesis"""
    voice_id: str
    speed: float = 1.0  # 0.25 to 4.0 for most providers
    temperature: float = 0.5  # For ElevenLabs stability (0-1)
    stability: float = 0.5  # For ElevenLabs (0-1)
    similarity_boost: float = 0.75  # For ElevenLabs (0-1)
    style: float = 0.0  # For ElevenLabs style exaggeration (0-1)
    output_format: str = "pcm_16000"  # pcm_16000, pcm_24000, mp3_44100, etc.
    sample_rate: int = 24000  # Hz
    use_speaker_boost: bool = True  # For ElevenLabs
    optimize_streaming_latency: int = 2  # 0-4 for ElevenLabs
    model_id: str = "eleven_turbo_v2"  # Provider-specific model


class TTSManager:
    """
    Manages TTS operations for voice agents.

    Supports streaming and batch synthesis with multiple providers.
    """

    _instance: Optional['TTSManager'] = None

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # Provider selection
        provider_name = os.getenv('TTS_PROVIDER', 'elevenlabs').lower()
        self.provider = TTSProvider(provider_name)

        # API keys
        self.elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY')
        self.deepgram_api_key = os.getenv('DEEPGRAM_API_KEY')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')

        # Default voice IDs per provider
        self.default_voices = {
            TTSProvider.ELEVENLABS: os.getenv('ELEVENLABS_VOICE_ID', 'EXAVITQu4vr4xnSDxMaL'),  # Bella
            TTSProvider.DEEPGRAM: os.getenv('DEEPGRAM_VOICE_ID', 'aura-asteria-en'),
            TTSProvider.OPENAI: os.getenv('OPENAI_VOICE_ID', 'alloy'),
        }

        # Voice cache
        self._voice_cache: Dict[str, TTSVoice] = {}
        self._voices_loaded = False

        # ElevenLabs client
        self.elevenlabs_client = None
        self._init_elevenlabs()

        logger.info(f"TTSManager initialized with provider: {self.provider.value}")

    def _init_elevenlabs(self) -> None:
        """Initialize ElevenLabs client"""
        if self.elevenlabs_api_key:
            try:
                from elevenlabs.client import ElevenLabs
                self.elevenlabs_client = ElevenLabs(api_key=self.elevenlabs_api_key)
                logger.info("ElevenLabs client initialized")
            except ImportError:
                logger.warning("ElevenLabs SDK not installed. Run: pip install elevenlabs")
            except Exception as e:
                logger.error(f"Failed to initialize ElevenLabs: {e}")

    def is_configured(self) -> bool:
        """Check if TTS is properly configured"""
        if self.provider == TTSProvider.ELEVENLABS:
            return bool(self.elevenlabs_api_key)
        elif self.provider == TTSProvider.DEEPGRAM:
            return bool(self.deepgram_api_key)
        elif self.provider == TTSProvider.OPENAI:
            return bool(self.openai_api_key)
        return False

    async def list_voices(self, refresh: bool = False) -> List[TTSVoice]:
        """
        List available voices from the current provider.

        Args:
            refresh: Force refresh from API instead of using cache

        Returns:
            List of TTSVoice objects
        """
        if not refresh and self._voices_loaded:
            return list(self._voice_cache.values())

        if not self.is_configured():
            logger.warning("TTS not configured")
            return []

        try:
            if self.provider == TTSProvider.ELEVENLABS:
                voices = await self._list_elevenlabs_voices()
            elif self.provider == TTSProvider.DEEPGRAM:
                voices = await self._list_deepgram_voices()
            elif self.provider == TTSProvider.OPENAI:
                voices = await self._list_openai_voices()
            else:
                voices = []

            # Update cache
            self._voice_cache = {v.id: v for v in voices}
            self._voices_loaded = True

            return voices

        except Exception as e:
            logger.error(f"Failed to list voices: {e}")
            return []

    async def _list_elevenlabs_voices(self) -> List[TTSVoice]:
        """List ElevenLabs voices"""
        try:
            # Run in executor since SDK may be synchronous
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.elevenlabs_client.voices.get_all()
            )

            voices = []
            for voice in response.voices:
                voices.append(TTSVoice(
                    id=voice.voice_id,
                    name=voice.name,
                    provider=TTSProvider.ELEVENLABS,
                    language=voice.labels.get('language', 'en') if voice.labels else 'en',
                    gender=voice.labels.get('gender') if voice.labels else None,
                    preview_url=voice.preview_url,
                    description=voice.description if hasattr(voice, 'description') else None,
                    labels=dict(voice.labels) if voice.labels else {},
                    available_models=['eleven_turbo_v2', 'eleven_multilingual_v2', 'eleven_monolingual_v1']
                ))

            logger.info(f"Loaded {len(voices)} ElevenLabs voices")
            return voices

        except Exception as e:
            logger.error(f"Failed to list ElevenLabs voices: {e}")
            return []

    async def _list_deepgram_voices(self) -> List[TTSVoice]:
        """List Deepgram voices"""
        # Deepgram Aura voices (as of 2024)
        voices = [
            TTSVoice(
                id="aura-asteria-en",
                name="Asteria (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="female",
                description="Warm and friendly female voice"
            ),
            TTSVoice(
                id="aura-luna-en",
                name="Luna (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="female",
                description="Professional female voice"
            ),
            TTSVoice(
                id="aura-stella-en",
                name="Stella (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="female",
                description="Energetic female voice"
            ),
            TTSVoice(
                id="aura-athena-en",
                name="Athena (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="female",
                description="Clear and articulate female voice"
            ),
            TTSVoice(
                id="aura-hera-en",
                name="Hera (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="female",
                description="Authoritative female voice"
            ),
            TTSVoice(
                id="aura-orion-en",
                name="Orion (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="male",
                description="Deep and resonant male voice"
            ),
            TTSVoice(
                id="aura-arcas-en",
                name="Arcas (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="male",
                description="Professional male voice"
            ),
            TTSVoice(
                id="aura-perseus-en",
                name="Perseus (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="male",
                description="Strong and confident male voice"
            ),
            TTSVoice(
                id="aura-angus-en",
                name="Angus (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="male",
                description="Friendly male voice"
            ),
            TTSVoice(
                id="aura-orpheus-en",
                name="Orpheus (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="male",
                description="Smooth and melodic male voice"
            ),
            TTSVoice(
                id="aura-helios-en",
                name="Helios (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="male",
                description="Warm male voice"
            ),
            TTSVoice(
                id="aura-zeus-en",
                name="Zeus (English)",
                provider=TTSProvider.DEEPGRAM,
                language="en",
                gender="male",
                description="Commanding male voice"
            ),
        ]

        logger.info(f"Loaded {len(voices)} Deepgram voices")
        return voices

    async def _list_openai_voices(self) -> List[TTSVoice]:
        """List OpenAI TTS voices"""
        voices = [
            TTSVoice(
                id="alloy",
                name="Alloy",
                provider=TTSProvider.OPENAI,
                language="en",
                gender="neutral",
                description="Neutral and versatile voice",
                available_models=['tts-1', 'tts-1-hd']
            ),
            TTSVoice(
                id="echo",
                name="Echo",
                provider=TTSProvider.OPENAI,
                language="en",
                gender="male",
                description="Clear male voice",
                available_models=['tts-1', 'tts-1-hd']
            ),
            TTSVoice(
                id="fable",
                name="Fable",
                provider=TTSProvider.OPENAI,
                language="en",
                gender="male",
                description="Expressive male voice",
                available_models=['tts-1', 'tts-1-hd']
            ),
            TTSVoice(
                id="onyx",
                name="Onyx",
                provider=TTSProvider.OPENAI,
                language="en",
                gender="male",
                description="Deep male voice",
                available_models=['tts-1', 'tts-1-hd']
            ),
            TTSVoice(
                id="nova",
                name="Nova",
                provider=TTSProvider.OPENAI,
                language="en",
                gender="female",
                description="Friendly female voice",
                available_models=['tts-1', 'tts-1-hd']
            ),
            TTSVoice(
                id="shimmer",
                name="Shimmer",
                provider=TTSProvider.OPENAI,
                language="en",
                gender="female",
                description="Soft female voice",
                available_models=['tts-1', 'tts-1-hd']
            ),
        ]

        logger.info(f"Loaded {len(voices)} OpenAI voices")
        return voices

    async def get_voice(self, voice_id: str) -> Optional[TTSVoice]:
        """
        Get a specific voice by ID.

        Args:
            voice_id: Voice identifier

        Returns:
            TTSVoice object or None if not found
        """
        # Check cache first
        if voice_id in self._voice_cache:
            return self._voice_cache[voice_id]

        # Load voices if not already loaded
        if not self._voices_loaded:
            await self.list_voices()

        return self._voice_cache.get(voice_id)

    def get_default_voice_id(self) -> str:
        """Get the default voice ID for the current provider"""
        return self.default_voices.get(self.provider, '')

    async def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
        temperature: float = 0.5,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Synthesize speech from text (batch mode).

        Args:
            text: Text to synthesize
            voice_id: Voice ID (uses default if not specified)
            speed: Speech speed (0.25 to 4.0)
            temperature: Voice stability/temperature (0-1, provider-specific)
            **kwargs: Additional provider-specific parameters

        Returns:
            Dict with success status, audio bytes, format, etc.
        """
        if not self.is_configured():
            return {'success': False, 'error': 'TTS not configured'}

        voice_id = voice_id or self.get_default_voice_id()
        if not voice_id:
            return {'success': False, 'error': 'No voice ID specified'}

        try:
            if self.provider == TTSProvider.ELEVENLABS:
                return await self._synthesize_elevenlabs(text, voice_id, speed, temperature, **kwargs)
            elif self.provider == TTSProvider.DEEPGRAM:
                return await self._synthesize_deepgram(text, voice_id, speed, **kwargs)
            elif self.provider == TTSProvider.OPENAI:
                return await self._synthesize_openai(text, voice_id, speed, **kwargs)

            return {'success': False, 'error': 'Invalid provider'}

        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            return {'success': False, 'error': str(e)}

    async def _synthesize_elevenlabs(
        self,
        text: str,
        voice_id: str,
        speed: float,
        temperature: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Synthesize using ElevenLabs"""
        try:
            from elevenlabs import VoiceSettings

            # Voice settings
            voice_settings = VoiceSettings(
                stability=kwargs.get('stability', temperature),
                similarity_boost=kwargs.get('similarity_boost', 0.75),
                style=kwargs.get('style', 0.0),
                use_speaker_boost=kwargs.get('use_speaker_boost', True)
            )

            model_id = kwargs.get('model_id', 'eleven_turbo_v2')
            output_format = kwargs.get('output_format', 'pcm_24000')

            # Run in executor since SDK may be synchronous
            loop = asyncio.get_event_loop()
            audio_generator = await loop.run_in_executor(
                None,
                lambda: self.elevenlabs_client.text_to_speech.convert(
                    voice_id=voice_id,
                    text=text,
                    model_id=model_id,
                    voice_settings=voice_settings,
                    output_format=output_format
                )
            )

            # Collect all audio chunks
            audio_chunks = []
            for chunk in audio_generator:
                if chunk:
                    audio_chunks.append(chunk)

            audio_bytes = b''.join(audio_chunks)

            # Parse format for sample rate
            sample_rate = 24000  # default
            if 'pcm_16000' in output_format:
                sample_rate = 16000
            elif 'pcm_22050' in output_format:
                sample_rate = 22050
            elif 'pcm_24000' in output_format:
                sample_rate = 24000
            elif 'pcm_44100' in output_format or 'mp3_44100' in output_format:
                sample_rate = 44100

            return {
                'success': True,
                'audio': audio_bytes,
                'format': output_format,
                'sample_rate': sample_rate,
                'size_bytes': len(audio_bytes),
                'voice_id': voice_id,
                'provider': 'elevenlabs'
            }

        except Exception as e:
            logger.error(f"ElevenLabs synthesis failed: {e}")
            return {'success': False, 'error': str(e)}

    async def _synthesize_deepgram(
        self,
        text: str,
        voice_id: str,
        speed: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Synthesize using Deepgram"""
        try:
            import httpx

            # Deepgram Aura TTS endpoint
            url = "https://api.deepgram.com/v1/speak"

            params = {
                'model': voice_id,
                'encoding': kwargs.get('encoding', 'linear16'),
                'sample_rate': kwargs.get('sample_rate', 24000),
            }

            headers = {
                'Authorization': f'Token {self.deepgram_api_key}',
                'Content-Type': 'application/json'
            }

            payload = {
                'text': text
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    params=params,
                    json=payload,
                    timeout=30.0
                )

                if response.status_code == 200:
                    audio_bytes = response.content

                    return {
                        'success': True,
                        'audio': audio_bytes,
                        'format': params['encoding'],
                        'sample_rate': params['sample_rate'],
                        'size_bytes': len(audio_bytes),
                        'voice_id': voice_id,
                        'provider': 'deepgram'
                    }
                else:
                    error_msg = f"Deepgram API error: {response.status_code}"
                    try:
                        error_data = response.json()
                        error_msg += f" - {error_data.get('message', '')}"
                    except Exception:
                        pass

                    return {'success': False, 'error': error_msg}

        except Exception as e:
            logger.error(f"Deepgram synthesis failed: {e}")
            return {'success': False, 'error': str(e)}

    async def _synthesize_openai(
        self,
        text: str,
        voice_id: str,
        speed: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Synthesize using OpenAI TTS"""
        try:
            import httpx

            model = kwargs.get('model', 'tts-1')  # tts-1 or tts-1-hd
            response_format = kwargs.get('response_format', 'pcm')  # mp3, opus, aac, flac, pcm

            payload = {
                'model': model,
                'input': text,
                'voice': voice_id,
                'speed': speed,
                'response_format': response_format
            }

            headers = {
                'Authorization': f'Bearer {self.openai_api_key}',
                'Content-Type': 'application/json'
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    'https://api.openai.com/v1/audio/speech',
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )

                if response.status_code == 200:
                    audio_bytes = response.content

                    # Determine sample rate based on format
                    sample_rate = 24000  # Default for OpenAI TTS
                    if response_format == 'pcm':
                        sample_rate = 24000
                    elif response_format == 'mp3':
                        sample_rate = 44100

                    return {
                        'success': True,
                        'audio': audio_bytes,
                        'format': response_format,
                        'sample_rate': sample_rate,
                        'size_bytes': len(audio_bytes),
                        'voice_id': voice_id,
                        'provider': 'openai'
                    }
                else:
                    error_msg = f"OpenAI API error: {response.status_code}"
                    try:
                        error_data = response.json()
                        error_msg += f" - {error_data.get('error', {}).get('message', '')}"
                    except Exception:
                        pass

                    return {'success': False, 'error': error_msg}

        except Exception as e:
            logger.error(f"OpenAI synthesis failed: {e}")
            return {'success': False, 'error': str(e)}

    async def stream_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
        temperature: float = 0.5,
        **kwargs
    ) -> AsyncIterator[bytes]:
        """
        Stream speech synthesis in real-time.

        Args:
            text: Text to synthesize
            voice_id: Voice ID (uses default if not specified)
            speed: Speech speed (0.25 to 4.0)
            temperature: Voice stability/temperature (0-1)
            **kwargs: Additional provider-specific parameters

        Yields:
            Audio chunks as bytes (PCM 16-bit)
        """
        if not self.is_configured():
            logger.error("TTS not configured")
            return

        voice_id = voice_id or self.get_default_voice_id()
        if not voice_id:
            logger.error("No voice ID specified")
            return

        try:
            if self.provider == TTSProvider.ELEVENLABS:
                async for chunk in self._stream_elevenlabs(text, voice_id, speed, temperature, **kwargs):
                    yield chunk
            elif self.provider == TTSProvider.DEEPGRAM:
                async for chunk in self._stream_deepgram(text, voice_id, speed, **kwargs):
                    yield chunk
            elif self.provider == TTSProvider.OPENAI:
                async for chunk in self._stream_openai(text, voice_id, speed, **kwargs):
                    yield chunk

        except Exception as e:
            logger.error(f"TTS streaming failed: {e}")

    async def _stream_elevenlabs(
        self,
        text: str,
        voice_id: str,
        speed: float,
        temperature: float,
        **kwargs
    ) -> AsyncIterator[bytes]:
        """Stream using ElevenLabs"""
        try:
            from elevenlabs import VoiceSettings

            voice_settings = VoiceSettings(
                stability=kwargs.get('stability', temperature),
                similarity_boost=kwargs.get('similarity_boost', 0.75),
                style=kwargs.get('style', 0.0),
                use_speaker_boost=kwargs.get('use_speaker_boost', True)
            )

            model_id = kwargs.get('model_id', 'eleven_turbo_v2')
            output_format = kwargs.get('output_format', 'pcm_24000')
            optimize_streaming_latency = kwargs.get('optimize_streaming_latency', 2)

            # Run in executor since SDK may be synchronous
            loop = asyncio.get_event_loop()
            audio_generator = await loop.run_in_executor(
                None,
                lambda: self.elevenlabs_client.text_to_speech.convert(
                    voice_id=voice_id,
                    text=text,
                    model_id=model_id,
                    voice_settings=voice_settings,
                    output_format=output_format,
                    optimize_streaming_latency=optimize_streaming_latency
                )
            )

            # Stream chunks
            for chunk in audio_generator:
                if chunk:
                    yield chunk

        except Exception as e:
            logger.error(f"ElevenLabs streaming failed: {e}")

    async def _stream_deepgram(
        self,
        text: str,
        voice_id: str,
        speed: float,
        **kwargs
    ) -> AsyncIterator[bytes]:
        """Stream using Deepgram"""
        try:
            import httpx

            url = "https://api.deepgram.com/v1/speak"

            params = {
                'model': voice_id,
                'encoding': kwargs.get('encoding', 'linear16'),
                'sample_rate': kwargs.get('sample_rate', 24000),
            }

            headers = {
                'Authorization': f'Token {self.deepgram_api_key}',
                'Content-Type': 'application/json'
            }

            payload = {
                'text': text
            }

            async with httpx.AsyncClient() as client:
                async with client.stream(
                    'POST',
                    url,
                    headers=headers,
                    params=params,
                    json=payload,
                    timeout=30.0
                ) as response:
                    if response.status_code == 200:
                        async for chunk in response.aiter_bytes(chunk_size=4096):
                            if chunk:
                                yield chunk
                    else:
                        logger.error(f"Deepgram streaming error: {response.status_code}")

        except Exception as e:
            logger.error(f"Deepgram streaming failed: {e}")

    async def _stream_openai(
        self,
        text: str,
        voice_id: str,
        speed: float,
        **kwargs
    ) -> AsyncIterator[bytes]:
        """Stream using OpenAI TTS"""
        try:
            import httpx

            model = kwargs.get('model', 'tts-1')
            response_format = kwargs.get('response_format', 'pcm')

            payload = {
                'model': model,
                'input': text,
                'voice': voice_id,
                'speed': speed,
                'response_format': response_format
            }

            headers = {
                'Authorization': f'Bearer {self.openai_api_key}',
                'Content-Type': 'application/json'
            }

            async with httpx.AsyncClient() as client:
                async with client.stream(
                    'POST',
                    'https://api.openai.com/v1/audio/speech',
                    headers=headers,
                    json=payload,
                    timeout=30.0
                ) as response:
                    if response.status_code == 200:
                        async for chunk in response.aiter_bytes(chunk_size=4096):
                            if chunk:
                                yield chunk
                    else:
                        logger.error(f"OpenAI streaming error: {response.status_code}")

        except Exception as e:
            logger.error(f"OpenAI streaming failed: {e}")

    async def clone_voice(
        self,
        name: str,
        audio_files: List[bytes],
        description: Optional[str] = None,
        labels: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Clone a voice from audio samples (ElevenLabs only).

        Args:
            name: Name for the cloned voice
            audio_files: List of audio file bytes (MP3, WAV, etc.)
            description: Optional description
            labels: Optional metadata labels

        Returns:
            Dict with success status and voice_id
        """
        if self.provider != TTSProvider.ELEVENLABS:
            return {'success': False, 'error': 'Voice cloning only supported on ElevenLabs'}

        if not self.elevenlabs_api_key or not self.elevenlabs_client:
            return {'success': False, 'error': 'ElevenLabs not configured'}

        try:
            # Run in executor since SDK may be synchronous
            loop = asyncio.get_event_loop()
            voice = await loop.run_in_executor(
                None,
                lambda: self.elevenlabs_client.voices.add(
                    name=name,
                    files=audio_files,
                    description=description,
                    labels=labels or {}
                )
            )

            # Add to cache
            cloned_voice = TTSVoice(
                id=voice.voice_id,
                name=name,
                provider=TTSProvider.ELEVENLABS,
                description=description,
                labels=labels or {}
            )
            self._voice_cache[voice.voice_id] = cloned_voice

            logger.info(f"Cloned voice: {name} ({voice.voice_id})")

            return {
                'success': True,
                'voice_id': voice.voice_id,
                'name': name
            }

        except Exception as e:
            logger.error(f"Voice cloning failed: {e}")
            return {'success': False, 'error': str(e)}

    async def delete_voice(self, voice_id: str) -> Dict[str, Any]:
        """
        Delete a cloned voice (ElevenLabs only).

        Args:
            voice_id: Voice ID to delete

        Returns:
            Dict with success status
        """
        if self.provider != TTSProvider.ELEVENLABS:
            return {'success': False, 'error': 'Voice deletion only supported on ElevenLabs'}

        if not self.elevenlabs_api_key or not self.elevenlabs_client:
            return {'success': False, 'error': 'ElevenLabs not configured'}

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.elevenlabs_client.voices.delete(voice_id)
            )

            # Remove from cache
            if voice_id in self._voice_cache:
                del self._voice_cache[voice_id]

            logger.info(f"Deleted voice: {voice_id}")

            return {'success': True}

        except Exception as e:
            logger.error(f"Voice deletion failed: {e}")
            return {'success': False, 'error': str(e)}

    async def estimate_cost(
        self,
        text: str,
        provider: Optional[TTSProvider] = None
    ) -> Dict[str, Any]:
        """
        Estimate the cost of synthesizing text.

        Args:
            text: Text to synthesize
            provider: Provider to estimate for (uses current if not specified)

        Returns:
            Dict with character count, estimated cost, etc.
        """
        provider = provider or self.provider
        char_count = len(text)

        # Approximate pricing (as of 2024)
        cost_per_1k_chars = {
            TTSProvider.ELEVENLABS: 0.30,  # Turbo v2
            TTSProvider.DEEPGRAM: 0.015,   # Aura
            TTSProvider.OPENAI: 0.015,     # TTS-1
        }

        cost = (char_count / 1000) * cost_per_1k_chars.get(provider, 0)

        return {
            'character_count': char_count,
            'estimated_cost_usd': round(cost, 4),
            'provider': provider.value,
            'note': 'Pricing estimates may not be accurate. Check provider pricing.'
        }

    def get_supported_languages(self, provider: Optional[TTSProvider] = None) -> List[str]:
        """Get list of supported languages for a provider"""
        provider = provider or self.provider

        if provider == TTSProvider.ELEVENLABS:
            return [
                'en', 'es', 'fr', 'de', 'it', 'pt', 'pt-BR',
                'pl', 'nl', 'ja', 'ko', 'zh', 'ar', 'hi',
                'ru', 'sv', 'da', 'fi', 'no', 'cs', 'el',
                'he', 'hu', 'ro', 'th', 'tr', 'uk', 'id', 'ms'
            ]
        elif provider == TTSProvider.DEEPGRAM:
            return ['en', 'es', 'fr', 'de', 'pt', 'nl', 'ja', 'ko']
        elif provider == TTSProvider.OPENAI:
            return [
                'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl',
                'ja', 'ko', 'zh', 'ar', 'hi', 'ru', 'sv', 'da',
                'fi', 'no', 'cs', 'el', 'he', 'hu', 'ro', 'th',
                'tr', 'uk', 'id', 'ms', 'vi', 'tl'
            ]

        return ['en']

    def get_supported_formats(self, provider: Optional[TTSProvider] = None) -> List[str]:
        """Get list of supported output formats for a provider"""
        provider = provider or self.provider

        if provider == TTSProvider.ELEVENLABS:
            return [
                'mp3_22050', 'mp3_44100',
                'pcm_16000', 'pcm_22050', 'pcm_24000', 'pcm_44100',
                'ulaw_8000'
            ]
        elif provider == TTSProvider.DEEPGRAM:
            return ['linear16', 'mulaw', 'alaw']
        elif provider == TTSProvider.OPENAI:
            return ['mp3', 'opus', 'aac', 'flac', 'pcm']

        return ['pcm']


# Singleton instance
_tts_manager: Optional[TTSManager] = None


def get_tts_manager(config: Dict[str, Any] = None) -> TTSManager:
    """Get or create the TTS manager instance"""
    global _tts_manager
    if _tts_manager is None:
        _tts_manager = TTSManager(config)
    return _tts_manager
