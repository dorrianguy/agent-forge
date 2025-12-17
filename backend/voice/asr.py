"""
ASR (Automatic Speech Recognition) Manager for Agent Forge Voice

Handles real-time speech-to-text with streaming support.
Supports Deepgram (primary), Whisper, and AssemblyAI.
"""

import os
import asyncio
import logging
import json
import base64
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, List, AsyncIterator, Callable
import uuid

logger = logging.getLogger(__name__)


class ASRProvider(Enum):
    """Supported ASR providers"""
    DEEPGRAM = "deepgram"
    WHISPER = "whisper"
    ASSEMBLYAI = "assemblyai"


@dataclass
class TranscriptResult:
    """Represents a transcription result"""
    text: str
    is_final: bool
    confidence: float
    start_time: float  # seconds
    end_time: float  # seconds
    words: List[Dict[str, Any]] = field(default_factory=list)
    language: str = "en"
    speaker: Optional[int] = None  # For diarization
    channel: int = 0


@dataclass
class ASRConfig:
    """Configuration for ASR processing"""
    language: str = "en"
    model: str = "nova-2"  # Deepgram model
    sample_rate: int = 16000
    encoding: str = "linear16"
    channels: int = 1
    interim_results: bool = True
    punctuate: bool = True
    diarize: bool = False
    smart_format: bool = True
    profanity_filter: bool = False
    keywords: List[str] = field(default_factory=list)
    endpointing: int = 300  # milliseconds of silence to detect end of utterance
    utterance_end_ms: int = 1000  # milliseconds to wait before finalizing


class ASRStream:
    """
    Real-time streaming ASR session.

    Manages a WebSocket connection to the ASR provider for
    continuous speech recognition.
    """

    def __init__(
        self,
        manager: 'ASRManager',
        config: ASRConfig,
        on_transcript: Optional[Callable[[TranscriptResult], None]] = None,
        on_utterance_end: Optional[Callable[[], None]] = None
    ):
        self.manager = manager
        self.config = config
        self.on_transcript = on_transcript
        self.on_utterance_end = on_utterance_end

        self.stream_id = str(uuid.uuid4())
        self.is_active = False
        self.is_closed = False

        # Audio buffer
        self._audio_queue: asyncio.Queue = asyncio.Queue()
        self._transcript_queue: asyncio.Queue = asyncio.Queue()

        # WebSocket connection
        self._ws = None
        self._send_task = None
        self._receive_task = None

        # State tracking
        self._last_transcript_time = 0
        self._silence_start = None
        self._total_audio_duration = 0

        logger.info(f"ASR stream created: {self.stream_id}")

    async def start(self) -> None:
        """Start the streaming session"""
        if self.is_active:
            return

        self.is_active = True

        if self.manager.provider == ASRProvider.DEEPGRAM:
            await self._start_deepgram_stream()
        elif self.manager.provider == ASRProvider.ASSEMBLYAI:
            await self._start_assemblyai_stream()
        else:
            # Whisper doesn't support streaming - use batch mode
            logger.warning("Whisper does not support streaming. Using batch mode.")

    async def _start_deepgram_stream(self) -> None:
        """Start Deepgram streaming WebSocket"""
        try:
            import websockets

            # Build Deepgram streaming URL
            params = [
                f"model={self.config.model}",
                f"language={self.config.language}",
                f"encoding={self.config.encoding}",
                f"sample_rate={self.config.sample_rate}",
                f"channels={self.config.channels}",
                f"interim_results={str(self.config.interim_results).lower()}",
                f"punctuate={str(self.config.punctuate).lower()}",
                f"diarize={str(self.config.diarize).lower()}",
                f"smart_format={str(self.config.smart_format).lower()}",
                f"endpointing={self.config.endpointing}",
                f"utterance_end_ms={self.config.utterance_end_ms}",
            ]

            if self.config.keywords:
                params.append(f"keywords={','.join(self.config.keywords)}")

            url = f"wss://api.deepgram.com/v1/listen?{'&'.join(params)}"

            headers = {
                "Authorization": f"Token {self.manager.deepgram_api_key}"
            }

            self._ws = await websockets.connect(url, extra_headers=headers)

            # Start send and receive tasks
            self._send_task = asyncio.create_task(self._send_audio_loop())
            self._receive_task = asyncio.create_task(self._receive_deepgram_loop())

            logger.info(f"Deepgram stream started: {self.stream_id}")

        except ImportError:
            logger.error("websockets library not installed. Run: pip install websockets")
            raise
        except Exception as e:
            logger.error(f"Failed to start Deepgram stream: {e}")
            raise

    async def _start_assemblyai_stream(self) -> None:
        """Start AssemblyAI streaming WebSocket"""
        try:
            import websockets

            url = "wss://api.assemblyai.com/v2/realtime/ws"
            params = f"?sample_rate={self.config.sample_rate}"

            headers = {
                "Authorization": self.manager.assemblyai_api_key
            }

            self._ws = await websockets.connect(url + params, extra_headers=headers)

            self._send_task = asyncio.create_task(self._send_audio_loop())
            self._receive_task = asyncio.create_task(self._receive_assemblyai_loop())

            logger.info(f"AssemblyAI stream started: {self.stream_id}")

        except Exception as e:
            logger.error(f"Failed to start AssemblyAI stream: {e}")
            raise

    async def send_audio(self, audio_chunk: bytes) -> None:
        """Send audio data to the stream"""
        if not self.is_active or self.is_closed:
            return

        await self._audio_queue.put(audio_chunk)

        # Track audio duration (assuming 16-bit samples at configured sample rate)
        samples = len(audio_chunk) // 2  # 16-bit = 2 bytes per sample
        duration_ms = (samples / self.config.sample_rate) * 1000
        self._total_audio_duration += duration_ms

    async def _send_audio_loop(self) -> None:
        """Background task to send audio to WebSocket"""
        try:
            while self.is_active and not self.is_closed:
                try:
                    audio = await asyncio.wait_for(
                        self._audio_queue.get(),
                        timeout=0.1
                    )

                    if self._ws and not self._ws.closed:
                        await self._ws.send(audio)

                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Error sending audio: {e}")
                    break

        except asyncio.CancelledError:
            pass

    async def _receive_deepgram_loop(self) -> None:
        """Background task to receive Deepgram transcripts"""
        try:
            while self.is_active and not self.is_closed:
                try:
                    if not self._ws or self._ws.closed:
                        break

                    message = await self._ws.recv()
                    data = json.loads(message)

                    # Handle transcript message
                    if data.get('type') == 'Results':
                        channel = data.get('channel', {})
                        alternatives = channel.get('alternatives', [])

                        if alternatives:
                            alt = alternatives[0]
                            transcript = alt.get('transcript', '')

                            if transcript:
                                result = TranscriptResult(
                                    text=transcript,
                                    is_final=data.get('is_final', False),
                                    confidence=alt.get('confidence', 0.0),
                                    start_time=data.get('start', 0.0),
                                    end_time=data.get('start', 0.0) + data.get('duration', 0.0),
                                    words=alt.get('words', []),
                                    language=self.config.language,
                                    channel=data.get('channel_index', [0])[0] if data.get('channel_index') else 0
                                )

                                await self._transcript_queue.put(result)

                                if self.on_transcript:
                                    await self._maybe_call_async(self.on_transcript, result)

                    # Handle utterance end
                    elif data.get('type') == 'UtteranceEnd':
                        if self.on_utterance_end:
                            await self._maybe_call_async(self.on_utterance_end)

                    # Handle speech started
                    elif data.get('type') == 'SpeechStarted':
                        self._silence_start = None

                    # Handle metadata
                    elif data.get('type') == 'Metadata':
                        logger.debug(f"Deepgram metadata: {data}")

                except asyncio.TimeoutError:
                    continue
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON from Deepgram: {e}")
                except Exception as e:
                    logger.error(f"Error receiving Deepgram transcript: {e}")
                    break

        except asyncio.CancelledError:
            pass

    async def _receive_assemblyai_loop(self) -> None:
        """Background task to receive AssemblyAI transcripts"""
        try:
            while self.is_active and not self.is_closed:
                try:
                    if not self._ws or self._ws.closed:
                        break

                    message = await self._ws.recv()
                    data = json.loads(message)

                    message_type = data.get('message_type')

                    if message_type == 'PartialTranscript':
                        result = TranscriptResult(
                            text=data.get('text', ''),
                            is_final=False,
                            confidence=data.get('confidence', 0.0),
                            start_time=data.get('audio_start', 0) / 1000,
                            end_time=data.get('audio_end', 0) / 1000,
                            words=data.get('words', []),
                            language=self.config.language,
                        )

                        await self._transcript_queue.put(result)

                        if self.on_transcript:
                            await self._maybe_call_async(self.on_transcript, result)

                    elif message_type == 'FinalTranscript':
                        result = TranscriptResult(
                            text=data.get('text', ''),
                            is_final=True,
                            confidence=data.get('confidence', 0.0),
                            start_time=data.get('audio_start', 0) / 1000,
                            end_time=data.get('audio_end', 0) / 1000,
                            words=data.get('words', []),
                            language=self.config.language,
                        )

                        await self._transcript_queue.put(result)

                        if self.on_transcript:
                            await self._maybe_call_async(self.on_transcript, result)

                        if self.on_utterance_end:
                            await self._maybe_call_async(self.on_utterance_end)

                except Exception as e:
                    logger.error(f"Error receiving AssemblyAI transcript: {e}")
                    break

        except asyncio.CancelledError:
            pass

    async def _maybe_call_async(self, func: Callable, *args) -> None:
        """Call a function, handling both sync and async callables"""
        if asyncio.iscoroutinefunction(func):
            await func(*args)
        else:
            func(*args)

    async def get_transcript(self, timeout: float = 1.0) -> Optional[TranscriptResult]:
        """Get the next transcript from the queue"""
        try:
            return await asyncio.wait_for(
                self._transcript_queue.get(),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            return None

    async def get_all_transcripts(self) -> List[TranscriptResult]:
        """Get all pending transcripts"""
        transcripts = []
        while not self._transcript_queue.empty():
            try:
                transcripts.append(self._transcript_queue.get_nowait())
            except asyncio.QueueEmpty:
                break
        return transcripts

    async def close(self) -> None:
        """Close the streaming session"""
        if self.is_closed:
            return

        self.is_closed = True
        self.is_active = False

        # Cancel background tasks
        if self._send_task:
            self._send_task.cancel()
            try:
                await self._send_task
            except asyncio.CancelledError:
                pass

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        # Close WebSocket
        if self._ws and not self._ws.closed:
            # Send close message for Deepgram
            try:
                await self._ws.send(json.dumps({"type": "CloseStream"}))
            except Exception:
                pass

            await self._ws.close()

        logger.info(f"ASR stream closed: {self.stream_id}")

    @property
    def total_audio_duration_ms(self) -> float:
        """Get total audio duration processed in milliseconds"""
        return self._total_audio_duration


class ASRManager:
    """
    Manages ASR operations for voice agents.

    Supports streaming and batch transcription with multiple providers.
    """

    _instance: Optional['ASRManager'] = None

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # Provider selection
        provider_name = os.getenv('ASR_PROVIDER', 'deepgram').lower()
        self.provider = ASRProvider(provider_name)

        # API keys
        self.deepgram_api_key = os.getenv('DEEPGRAM_API_KEY')
        self.assemblyai_api_key = os.getenv('ASSEMBLYAI_API_KEY')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')  # For Whisper

        # Default model settings per provider
        self.default_models = {
            ASRProvider.DEEPGRAM: 'nova-2',
            ASRProvider.WHISPER: 'whisper-1',
            ASRProvider.ASSEMBLYAI: 'best',
        }

        # Deepgram client for batch processing
        self.deepgram_client = None
        self._init_deepgram()

        logger.info(f"ASRManager initialized with provider: {self.provider.value}")

    def _init_deepgram(self) -> None:
        """Initialize Deepgram client for batch processing"""
        if self.deepgram_api_key:
            try:
                from deepgram import DeepgramClient
                self.deepgram_client = DeepgramClient(self.deepgram_api_key)
                logger.info("Deepgram client initialized")
            except ImportError:
                logger.warning("Deepgram SDK not installed. Run: pip install deepgram-sdk")
            except Exception as e:
                logger.error(f"Failed to initialize Deepgram: {e}")

    def is_configured(self) -> bool:
        """Check if ASR is properly configured"""
        if self.provider == ASRProvider.DEEPGRAM:
            return bool(self.deepgram_api_key)
        elif self.provider == ASRProvider.WHISPER:
            return bool(self.openai_api_key)
        elif self.provider == ASRProvider.ASSEMBLYAI:
            return bool(self.assemblyai_api_key)
        return False

    def create_stream(
        self,
        language: str = "en",
        model: Optional[str] = None,
        on_transcript: Optional[Callable[[TranscriptResult], None]] = None,
        on_utterance_end: Optional[Callable[[], None]] = None,
        **kwargs
    ) -> ASRStream:
        """Create a new streaming ASR session"""
        config = ASRConfig(
            language=language,
            model=model or self.default_models.get(self.provider, 'nova-2'),
            **kwargs
        )

        return ASRStream(
            manager=self,
            config=config,
            on_transcript=on_transcript,
            on_utterance_end=on_utterance_end
        )

    async def transcribe_audio(
        self,
        audio_data: bytes,
        language: str = "en",
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Transcribe audio data (batch mode).

        Args:
            audio_data: Raw audio bytes or base64 encoded
            language: Language code
            model: Model to use (provider-specific)

        Returns:
            Dict with transcript, confidence, words, etc.
        """
        if not self.is_configured():
            return {'success': False, 'error': 'ASR not configured'}

        model = model or self.default_models.get(self.provider)

        if self.provider == ASRProvider.DEEPGRAM:
            return await self._transcribe_deepgram(audio_data, language, model, **kwargs)
        elif self.provider == ASRProvider.WHISPER:
            return await self._transcribe_whisper(audio_data, language, model, **kwargs)
        elif self.provider == ASRProvider.ASSEMBLYAI:
            return await self._transcribe_assemblyai(audio_data, language, **kwargs)

        return {'success': False, 'error': 'Invalid provider'}

    async def _transcribe_deepgram(
        self,
        audio_data: bytes,
        language: str,
        model: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Transcribe using Deepgram"""
        try:
            from deepgram import PrerecordedOptions

            options = PrerecordedOptions(
                model=model,
                language=language,
                punctuate=kwargs.get('punctuate', True),
                diarize=kwargs.get('diarize', False),
                smart_format=kwargs.get('smart_format', True),
            )

            # Run in executor since SDK may be synchronous
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.deepgram_client.listen.prerecorded.v("1").transcribe_file(
                    {"buffer": audio_data, "mimetype": "audio/wav"},
                    options
                )
            )

            results = response.results
            if results and results.channels:
                channel = results.channels[0]
                if channel.alternatives:
                    alt = channel.alternatives[0]

                    return {
                        'success': True,
                        'transcript': alt.transcript,
                        'confidence': alt.confidence,
                        'words': [
                            {
                                'word': w.word,
                                'start': w.start,
                                'end': w.end,
                                'confidence': w.confidence
                            }
                            for w in (alt.words or [])
                        ],
                        'language': language,
                        'duration': results.metadata.duration if results.metadata else 0
                    }

            return {'success': False, 'error': 'No transcription results'}

        except Exception as e:
            logger.error(f"Deepgram transcription failed: {e}")
            return {'success': False, 'error': str(e)}

    async def _transcribe_whisper(
        self,
        audio_data: bytes,
        language: str,
        model: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Transcribe using OpenAI Whisper"""
        try:
            import httpx
            import io

            # Prepare multipart form data
            files = {
                'file': ('audio.wav', io.BytesIO(audio_data), 'audio/wav'),
                'model': (None, model),
            }

            if language and language != 'auto':
                files['language'] = (None, language)

            if kwargs.get('response_format'):
                files['response_format'] = (None, kwargs['response_format'])

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    'https://api.openai.com/v1/audio/transcriptions',
                    headers={'Authorization': f'Bearer {self.openai_api_key}'},
                    files=files,
                    timeout=60.0
                )

                if response.status_code == 200:
                    result = response.json()

                    return {
                        'success': True,
                        'transcript': result.get('text', ''),
                        'confidence': 1.0,  # Whisper doesn't return confidence
                        'words': result.get('words', []),
                        'language': result.get('language', language),
                        'duration': result.get('duration', 0)
                    }
                else:
                    return {
                        'success': False,
                        'error': f"Whisper API error: {response.status_code}"
                    }

        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            return {'success': False, 'error': str(e)}

    async def _transcribe_assemblyai(
        self,
        audio_data: bytes,
        language: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Transcribe using AssemblyAI"""
        try:
            import httpx

            # First, upload the audio
            async with httpx.AsyncClient() as client:
                upload_response = await client.post(
                    'https://api.assemblyai.com/v2/upload',
                    headers={'Authorization': self.assemblyai_api_key},
                    content=audio_data,
                    timeout=60.0
                )

                if upload_response.status_code != 200:
                    return {'success': False, 'error': 'Failed to upload audio'}

                audio_url = upload_response.json()['upload_url']

                # Start transcription
                transcript_response = await client.post(
                    'https://api.assemblyai.com/v2/transcript',
                    headers={'Authorization': self.assemblyai_api_key},
                    json={
                        'audio_url': audio_url,
                        'language_code': language if language != 'en' else None,
                        'punctuate': kwargs.get('punctuate', True),
                        'speaker_labels': kwargs.get('diarize', False),
                    },
                    timeout=30.0
                )

                transcript_id = transcript_response.json()['id']

                # Poll for completion
                while True:
                    status_response = await client.get(
                        f'https://api.assemblyai.com/v2/transcript/{transcript_id}',
                        headers={'Authorization': self.assemblyai_api_key},
                        timeout=30.0
                    )

                    result = status_response.json()
                    status = result['status']

                    if status == 'completed':
                        return {
                            'success': True,
                            'transcript': result.get('text', ''),
                            'confidence': result.get('confidence', 0),
                            'words': result.get('words', []),
                            'language': language,
                            'duration': result.get('audio_duration', 0)
                        }
                    elif status == 'error':
                        return {'success': False, 'error': result.get('error', 'Unknown error')}

                    await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"AssemblyAI transcription failed: {e}")
            return {'success': False, 'error': str(e)}

    async def detect_language(self, audio_data: bytes) -> Optional[str]:
        """Detect the language of audio"""
        if not self.is_configured():
            return None

        try:
            if self.provider == ASRProvider.DEEPGRAM:
                from deepgram import PrerecordedOptions

                options = PrerecordedOptions(
                    detect_language=True,
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.deepgram_client.listen.prerecorded.v("1").transcribe_file(
                        {"buffer": audio_data, "mimetype": "audio/wav"},
                        options
                    )
                )

                if response.results and response.results.channels:
                    return response.results.channels[0].detected_language

            elif self.provider == ASRProvider.WHISPER:
                # Whisper auto-detects language
                result = await self._transcribe_whisper(audio_data, 'auto', 'whisper-1')
                return result.get('language')

            return None

        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return None

    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages for the current provider"""
        if self.provider == ASRProvider.DEEPGRAM:
            return [
                'en', 'en-US', 'en-GB', 'en-AU', 'en-IN',
                'es', 'es-419', 'fr', 'de', 'it', 'pt', 'pt-BR',
                'nl', 'ja', 'ko', 'zh', 'zh-CN', 'zh-TW',
                'ru', 'pl', 'uk', 'tr', 'ar', 'hi', 'id',
                'sv', 'da', 'fi', 'no', 'cs', 'el', 'he', 'hu', 'ro', 'th', 'vi'
            ]
        elif self.provider == ASRProvider.WHISPER:
            # Whisper supports 50+ languages
            return [
                'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'ko', 'zh',
                'ru', 'pl', 'uk', 'tr', 'ar', 'hi', 'id', 'sv', 'da', 'fi',
                'no', 'cs', 'el', 'he', 'hu', 'ro', 'th', 'vi', 'ms', 'tl'
            ]
        elif self.provider == ASRProvider.ASSEMBLYAI:
            return ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja']

        return ['en']


# Singleton instance
_asr_manager: Optional[ASRManager] = None


def get_asr_manager(config: Dict[str, Any] = None) -> ASRManager:
    """Get or create the ASR manager instance"""
    global _asr_manager
    if _asr_manager is None:
        _asr_manager = ASRManager(config)
    return _asr_manager
