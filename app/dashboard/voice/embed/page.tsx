'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface VoiceAgent {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface WidgetConfig {
  agentId: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  title: string;
  subtitle: string;
  greeting: string;
  showTranscript: boolean;
  enableMinimize: boolean;
  autoExpand: boolean;
  pulseAnimation: boolean;
}

// ============================================================================
// Voice Widget Embed Configuration Page
// ============================================================================

export default function VoiceWidgetEmbedPage() {
  // State
  const [agents, setAgents] = useState<VoiceAgent[]>([
    { id: 'agent-1', name: 'Support Agent', status: 'active' },
    { id: 'agent-2', name: 'Sales Agent', status: 'active' },
    { id: 'agent-3', name: 'Booking Agent', status: 'inactive' },
  ]);

  const [config, setConfig] = useState<WidgetConfig>({
    agentId: 'agent-1',
    position: 'bottom-right',
    theme: 'dark',
    primaryColor: '#6366f1',
    title: 'Voice Assistant',
    subtitle: 'Powered by Agent Forge',
    greeting: 'Hi! Click the button to start a voice conversation.',
    showTranscript: true,
    enableMinimize: true,
    autoExpand: false,
    pulseAnimation: true,
  });

  const [apiKey, setApiKey] = useState('af_live_xxxxxxxxxxxxxx');
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Generate embed code
  const embedCode = `<!-- Agent Forge Voice Widget -->
<script>
(function() {
  var config = {
    agentId: "${config.agentId}",
    apiKey: "${apiKey}",
    position: "${config.position}",
    theme: "${config.theme}",
    primaryColor: "${config.primaryColor}",
    title: "${config.title}",
    subtitle: "${config.subtitle}",
    greeting: "${config.greeting}",
    showTranscript: ${config.showTranscript},
    enableMinimize: ${config.enableMinimize},
    autoExpand: ${config.autoExpand},
    pulseAnimation: ${config.pulseAnimation}
  };

  var script = document.createElement('script');
  script.src = 'https://widget.agentforge.ai/voice-widget.js';
  script.async = true;
  script.onload = function() {
    window.AgentForgeVoice.init(config);
  };
  document.head.appendChild(script);
})();
</script>`;

  const npmCode = `npm install @agentforge/voice-widget

// In your React/Next.js app:
import { VoiceWidget } from '@agentforge/voice-widget';

export default function App() {
  return (
    <VoiceWidget
      agentId="${config.agentId}"
      apiKey="${apiKey}"
      position="${config.position}"
      theme="${config.theme}"
      primaryColor="${config.primaryColor}"
      title="${config.title}"
      subtitle="${config.subtitle}"
      greeting="${config.greeting}"
      showTranscript={${config.showTranscript}}
      enableMinimize={${config.enableMinimize}}
      autoExpand={${config.autoExpand}}
      pulseAnimation={${config.pulseAnimation}}
    />
  );
}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Position styles for preview
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <a
            href="/dashboard/voice"
            style={{
              color: '#818cf8',
              textDecoration: 'none',
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Back to Voice Dashboard
          </a>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#f8fafc',
            margin: 0
          }}>
            Widget Embed
          </h1>
          <p style={{ color: '#94a3b8', marginTop: 8 }}>
            Configure and embed your voice widget on any website
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Configuration Panel */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: 16,
            border: '1px solid rgba(148, 163, 184, 0.1)',
            padding: 24
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginTop: 0, marginBottom: 24 }}>
              Configuration
            </h2>

            {/* Agent Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Voice Agent
              </label>
              <select
                value={config.agentId}
                onChange={(e) => setConfig(prev => ({ ...prev, agentId: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id} disabled={agent.status === 'inactive'}>
                    {agent.name} {agent.status === 'inactive' ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div style={{ marginBottom: 20 }}>
              <label id="position-label" style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Position
              </label>
              <div
                role="radiogroup"
                aria-labelledby="position-label"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}
              >
                {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map(pos => (
                  <button
                    key={pos}
                    role="radio"
                    aria-checked={config.position === pos}
                    onClick={() => setConfig(prev => ({ ...prev, position: pos }))}
                    style={{
                      padding: '10px 16px',
                      background: config.position === pos ? 'rgba(99, 102, 241, 0.3)' : 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${config.position === pos ? '#6366f1' : 'rgba(148, 163, 184, 0.2)'}`,
                      borderRadius: 8,
                      color: '#f1f5f9',
                      fontSize: 13,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {pos.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div style={{ marginBottom: 20 }}>
              <label id="theme-label" style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Theme
              </label>
              <div
                role="radiogroup"
                aria-labelledby="theme-label"
                style={{ display: 'flex', gap: 8 }}
              >
                {(['dark', 'light', 'auto'] as const).map(theme => (
                  <button
                    key={theme}
                    role="radio"
                    aria-checked={config.theme === theme}
                    onClick={() => setConfig(prev => ({ ...prev, theme: theme }))}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: config.theme === theme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${config.theme === theme ? '#6366f1' : 'rgba(148, 163, 184, 0.2)'}`,
                      borderRadius: 8,
                      color: '#f1f5f9',
                      fontSize: 13,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Color */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Primary Color
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  style={{
                    width: 48,
                    height: 44,
                    padding: 0,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                />
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 14
                  }}
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Title
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Subtitle
              </label>
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                Greeting Message
              </label>
              <textarea
                value={config.greeting}
                onChange={(e) => setConfig(prev => ({ ...prev, greeting: e.target.value }))}
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 14,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { key: 'showTranscript', label: 'Show Transcript' },
                { key: 'enableMinimize', label: 'Enable Minimize' },
                { key: 'autoExpand', label: 'Auto Expand' },
                { key: 'pulseAnimation', label: 'Pulse Animation' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={config[key as keyof WidgetConfig] as boolean}
                    onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: config.primaryColor,
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#f1f5f9' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview & Code Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Live Preview */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.1)',
              padding: 24,
              flex: 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                  Live Preview
                </h2>
                <button
                  onClick={() => setPreviewOpen(!previewOpen)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid #6366f1',
                    borderRadius: 8,
                    color: '#a5b4fc',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {previewOpen ? 'Close Widget' : 'Open Widget'}
                </button>
              </div>

              {/* Preview Container */}
              <div style={{
                position: 'relative',
                height: 400,
                background: config.theme === 'dark' ? '#0f172a' : '#f8fafc',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.2)'
              }}>
                {/* Demo website content */}
                <div style={{ padding: 24 }}>
                  <div style={{
                    width: 200,
                    height: 16,
                    background: config.theme === 'dark' ? '#334155' : '#e2e8f0',
                    borderRadius: 4,
                    marginBottom: 12
                  }} />
                  <div style={{
                    width: 300,
                    height: 12,
                    background: config.theme === 'dark' ? '#1e293b' : '#f1f5f9',
                    borderRadius: 4,
                    marginBottom: 8
                  }} />
                  <div style={{
                    width: 250,
                    height: 12,
                    background: config.theme === 'dark' ? '#1e293b' : '#f1f5f9',
                    borderRadius: 4,
                    marginBottom: 8
                  }} />
                  <div style={{
                    width: 280,
                    height: 12,
                    background: config.theme === 'dark' ? '#1e293b' : '#f1f5f9',
                    borderRadius: 4
                  }} />
                </div>

                {/* Widget Preview */}
                <div style={{
                  position: 'absolute',
                  ...positionStyles[config.position],
                }}>
                  {!previewOpen ? (
                    /* Floating Button */
                    <motion.button
                      animate={config.pulseAnimation ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      onClick={() => setPreviewOpen(true)}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd)`,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </motion.button>
                  ) : (
                    /* Expanded Widget Mini Preview */
                    <div style={{
                      width: 280,
                      background: config.theme === 'dark' ? '#1f2937' : '#ffffff',
                      borderRadius: 12,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                      overflow: 'hidden'
                    }}>
                      {/* Header */}
                      <div style={{
                        padding: '12px 16px',
                        background: config.theme === 'dark' ? '#111827' : '#f3f4f6',
                        borderBottom: `1px solid ${config.theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: config.theme === 'dark' ? '#f9fafb' : '#111827'
                          }}>
                            {config.title}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: config.theme === 'dark' ? '#9ca3af' : '#6b7280',
                            marginTop: 2
                          }}>
                            {config.subtitle}
                          </div>
                        </div>
                        <button
                          onClick={() => setPreviewOpen(false)}
                          style={{
                            width: 24,
                            height: 24,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: config.theme === 'dark' ? '#9ca3af' : '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Content */}
                      <div style={{ padding: 16, textAlign: 'center' }}>
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill={config.theme === 'dark' ? '#6b7280' : '#9ca3af'}
                          style={{ opacity: 0.5, marginBottom: 8 }}
                        >
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                        <p style={{
                          fontSize: 11,
                          color: config.theme === 'dark' ? '#9ca3af' : '#6b7280',
                          margin: 0,
                          lineHeight: 1.4
                        }}>
                          {config.greeting}
                        </p>
                      </div>

                      {/* Call Button */}
                      <div style={{ padding: '12px 16px', borderTop: `1px solid ${config.theme === 'dark' ? '#374151' : '#e5e7eb'}`, display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}dd)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 15px ${config.primaryColor}40`
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Embed Code */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.1)',
              padding: 24
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'rgba(99, 102, 241, 0.3)',
                    border: '1px solid #6366f1',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Script Tag
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 8,
                    color: '#94a3b8',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  React/Next.js
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <pre style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 8,
                  padding: 16,
                  overflow: 'auto',
                  fontSize: 12,
                  color: '#a5b4fc',
                  margin: 0,
                  maxHeight: 200
                }}>
                  {embedCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(embedCode)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '6px 12px',
                    background: copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)',
                    border: `1px solid ${copied ? '#22c55e' : '#6366f1'}`,
                    borderRadius: 6,
                    color: copied ? '#86efac' : '#a5b4fc',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <p style={{
                fontSize: 12,
                color: '#64748b',
                marginTop: 12,
                marginBottom: 0
              }}>
                Paste this code before the closing <code style={{ color: '#a5b4fc' }}>&lt;/body&gt;</code> tag on your website.
              </p>
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div style={{
          marginTop: 24,
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(148, 163, 184, 0.1)',
          padding: 24
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginTop: 0, marginBottom: 16 }}>
            API Key
          </h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="password"
              value={apiKey}
              readOnly
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 14,
                fontFamily: 'monospace'
              }}
            />
            <button
              style={{
                padding: '12px 24px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid #6366f1',
                borderRadius: 8,
                color: '#a5b4fc',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Reveal
            </button>
            <button
              style={{
                padding: '12px 24px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                color: '#fca5a5',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Regenerate
            </button>
          </div>
          <p style={{
            fontSize: 12,
            color: '#f59e0b',
            marginTop: 12,
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            Keep your API key secret. Never expose it in client-side code on public websites.
          </p>
        </div>
      </div>
    </div>
  );
}
