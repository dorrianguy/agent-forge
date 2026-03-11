---
name: agent-forge-voice
description: Add real-time voice capabilities to any AI agent using Agent Forge's LiveKit-powered voice pipeline. Turn text-based agents into hands-free voice assistants in minutes.
version: 1.0.0
author: dorrianguy
tags: [voice, livekit, speech-to-text, tts, ai-agents, real-time]
---

# agent-forge-voice

Add real-time voice capabilities to any Agent Forge agent using the LiveKit-powered voice pipeline. Your agent gains ears (STT) and a voice (TTS) — no WebRTC expertise required.

## What It Does

- Attaches a full duplex voice pipeline to any existing agent
- Streams audio via LiveKit WebRTC (sub-200ms round trip)
- Transcribes speech with Deepgram or OpenAI Whisper
- Speaks responses via Cartesia, ElevenLabs, or system TTS
- Supports wake word detection ("Hey [AgentName]")
- Works in browser, mobile, and embedded kiosks

## Usage

### Step 1: Have an existing agent

You need a deployed Agent Forge agent. If you don't have one yet, run `agent-forge-create` first.

### Step 2: Add voice to your agent

```bash
# Via Agent Forge CLI
agent-forge voice add --agent-id "my-support-agent"

# Or via the Agent Forge dashboard
open https://agent-forge.app/agents/my-support-agent/voice
```

### Step 3: Configure the voice pipeline

```bash
# Choose your STT and TTS providers
agent-forge voice config \
  --stt deepgram \
  --tts cartesia \
  --voice "Jessica" \
  --wake-word "Hey Assistant"
```

### Step 4: Test in browser

```bash
agent-forge voice test --open-browser
```

### Step 5: Embed on your site

Agent Forge generates a voice widget `<script>` tag — paste it into any page:

```html
<script
  src="https://agent-forge.app/widget/voice.js"
  data-agent-id="my-support-agent"
  data-theme="dark"
></script>
```

## Voice Pipeline Architecture

```
User speaks
  → Browser/app captures mic audio (PCM16)
  → LiveKit WebRTC → Agent Forge edge
  → STT (Deepgram / Whisper)
  → Your agent's LLM (streaming tokens)
  → TTS (Cartesia / ElevenLabs / system)
  → LiveKit → Browser plays audio
  → Display transcript overlay (optional)
```

**Latency budget:**
| Stage | Latency |
|-------|---------|
| Mic capture → edge | ~30ms |
| STT transcription | ~100ms |
| LLM first token | ~200ms |
| TTS synthesis | ~80ms |
| **Total (typical)** | **~400ms** |

## Configuration Options

```yaml
# agent-forge-voice.config.yaml
stt:
  provider: deepgram          # deepgram | whisper | assembly-ai
  model: nova-2               # deepgram model (fastest)
  language: en-US
  punctuate: true
  smart_format: true

tts:
  provider: cartesia          # cartesia | elevenlabs | azure | system
  voice_id: "jessica-en-us"
  speed: 1.0
  emotion: neutral            # neutral | happy | professional

voice_activity:
  wake_word: "Hey Assistant"  # Optional: always-on wake word
  silence_timeout_ms: 1500    # Stop listening after 1.5s silence
  interrupt_on_speech: true   # Let user interrupt agent mid-sentence

livekit:
  region: auto                # auto | us-east-1 | eu-west-1 | ap-southeast-1
```

## STT Providers

| Provider | Best For | Latency | Cost |
|----------|----------|---------|------|
| Deepgram Nova-2 | Real-time, accuracy | ~80ms | $0.0043/min |
| OpenAI Whisper | Batch, multilingual | ~500ms | $0.006/min |
| AssemblyAI | Long recordings | ~200ms | $0.0015/min |

## TTS Providers

| Provider | Best For | Latency | Cost |
|----------|----------|---------|------|
| Cartesia | Ultra-low latency, natural | ~60ms | $0.005/1k chars |
| ElevenLabs | Emotional range, voice cloning | ~200ms | $0.18/1k chars |
| Azure Neural | Enterprise, 400+ voices | ~150ms | $0.016/1k chars |
| System TTS | Offline, zero cost | ~0ms | Free |

## Output

After adding voice, your agent gains:
- LiveKit room credentials + connection URL
- Browser voice widget (`<script>` embed)
- React component: `<VoiceAgent agentId="..." />`
- REST endpoint: `POST /api/agent/voice/session`
- Voice transcript logs in Agent Forge dashboard

## Requirements

- Existing Agent Forge agent
- Agent Forge account: [agent-forge.app](https://agent-forge.app)
- For Deepgram STT: `DEEPGRAM_API_KEY`
- For Cartesia TTS: `CARTESIA_API_KEY`
- For ElevenLabs TTS: `ELEVENLABS_API_KEY`
- LiveKit credentials: auto-provisioned by Agent Forge (no setup needed)

## Links

- Dashboard: [agent-forge.app](https://agent-forge.app)
- Voice docs: [agent-forge.app/docs/voice](https://agent-forge.app/docs/voice)
- LiveKit docs: [docs.livekit.io](https://docs.livekit.io)
- GitHub: [github.com/dorrianguy/agent-forge](https://github.com/dorrianguy/agent-forge)
