'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, RotateCcw, Play, ChevronDown, Terminal,
  Zap, Plus, MessageSquarePlus, Settings2, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getAgents } from '@/lib/auth';
import type { Agent } from '@/lib/supabase';
import ChatInterface from '@/components/test/ChatInterface';
import DebugPanel from '@/components/test/DebugPanel';
import DevicePreview from '@/components/test/DevicePreview';
import ConversationHistory from '@/components/test/ConversationHistory';
import type {
  TestMessage,
  TestSession,
  DebugInfo,
  DeviceView,
} from '@/lib/test-types';
import {
  generateSessionId,
  generateMessageId,
  calculateCost,
} from '@/lib/test-types';

// LocalStorage keys
const STORAGE_KEY = 'agent-forge-test-sessions';
const CURRENT_SESSION_KEY = 'agent-forge-current-session';

export default function TestConsolePage() {
  const router = useRouter();
  
  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [currentDebugInfo, setCurrentDebugInfo] = useState<DebugInfo | null>(null);
  
  // UI state
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
  const [debugCollapsed, setDebugCollapsed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showAgentSelect, setShowAgentSelect] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [debugHistory, setDebugHistory] = useState<DebugInfo[]>([]);

  // Load user, agents, and sessions
  useEffect(() => {
    async function loadData() {
      try {
        const user = await getUser();
        if (!user) {
          router.push('/login?redirect=/dashboard/test');
          return;
        }

        const agentsData = await getAgents();
        setAgents(agentsData);

        // Load sessions from localStorage
        const savedSessions = localStorage.getItem(STORAGE_KEY);
        if (savedSessions) {
          const parsed = JSON.parse(savedSessions);
          // Convert dates
          const sessionsWithDates = parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }));
          setSessions(sessionsWithDates);
        }

        // Restore current session
        const savedCurrentSession = localStorage.getItem(CURRENT_SESSION_KEY);
        if (savedCurrentSession) {
          const parsed = JSON.parse(savedCurrentSession);
          setCurrentSessionId(parsed.sessionId);
          setMessages(
            parsed.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
          setDebugHistory(parsed.debugHistory || []);
          if (parsed.agentId) {
            const agent = agentsData.find((a) => a.id === parsed.agentId);
            if (agent) setSelectedAgent(agent);
          }
        }

        // Auto-select first agent if none selected
        if (!savedCurrentSession && agentsData.length > 0) {
          setSelectedAgent(agentsData[0]);
          startNewSession(agentsData[0]);
        }
      } catch {
        router.push('/login?redirect=/dashboard/test');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Save current session to localStorage
  useEffect(() => {
    if (currentSessionId && selectedAgent) {
      localStorage.setItem(
        CURRENT_SESSION_KEY,
        JSON.stringify({
          sessionId: currentSessionId,
          agentId: selectedAgent.id,
          messages,
          debugHistory,
        })
      );
    }
  }, [currentSessionId, selectedAgent, messages, debugHistory]);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const startNewSession = (agent: Agent) => {
    const sessionId = generateSessionId();
    setCurrentSessionId(sessionId);
    setMessages([]);
    setDebugHistory([]);
    setCurrentDebugInfo(null);
    setSelectedAgent(agent);
  };

  const saveCurrentSession = useCallback(() => {
    if (!currentSessionId || !selectedAgent || messages.length === 0) return;

    const totalTokens = debugHistory.reduce((sum, d) => sum + d.tokens.total, 0);
    const totalCost = debugHistory.reduce((sum, d) => sum + d.costEstimate, 0);

    const session: TestSession = {
      id: currentSessionId,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      agentVersion: selectedAgent.config?.version,
      messages,
      debugHistory,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalTokens,
      totalCost,
      messageCount: messages.length,
    };

    setSessions((prev) => {
      const existing = prev.findIndex((s) => s.id === currentSessionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = session;
        return updated;
      }
      return [session, ...prev];
    });
  }, [currentSessionId, selectedAgent, messages, debugHistory]);

  const handleSendMessage = async (content: string) => {
    if (!selectedAgent) return;

    // Add user message
    const userMessage: TestMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call API with streaming
      const response = await fetch('/api/test/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let debugInfo: DebugInfo | null = null;

      // Create assistant message placeholder
      const assistantMessageId = generateMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.content) {
                assistantContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }

              if (data.done && data.debugInfo) {
                debugInfo = data.debugInfo;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Update final message with metadata
      if (debugInfo) {
        setCurrentDebugInfo(debugInfo);
        setDebugHistory((prev) => [...prev, debugInfo!]);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  metadata: {
                    tokens: debugInfo!.tokens,
                    latencyMs: debugInfo!.latencyMs,
                    costEstimate: debugInfo!.costEstimate,
                    toolCalls: debugInfo!.toolCalls,
                    knowledgeChunks: debugInfo!.knowledgeChunks,
                  },
                }
              : m
          )
        );
      }

      // Save session
      saveCurrentSession();
    } catch (error) {
      console.error('Chat error:', error);
      // Remove failed assistant message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClearConversation = () => {
    if (selectedAgent) {
      startNewSession(selectedAgent);
    }
  };

  const handleExportConversation = () => {
    const exportData = {
      agent: selectedAgent?.name,
      timestamp: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        ...(m.metadata && { metadata: m.metadata }),
      })),
      debugHistory,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-conversation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSession = (session: TestSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setDebugHistory(session.debugHistory);
    const agent = agents.find((a) => a.id === session.agentId);
    if (agent) setSelectedAgent(agent);
    if (session.debugHistory.length > 0) {
      setCurrentDebugInfo(session.debugHistory[session.debugHistory.length - 1]);
    }
    setHistoryOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId && selectedAgent) {
      startNewSession(selectedAgent);
    }
  };

  const handleShareSession = (session: TestSession) => {
    // For now, just copy a shareable link format (would need backend support)
    const shareData = btoa(JSON.stringify({ id: session.id }));
    return `${window.location.origin}/dashboard/test?session=${shareData}`;
  };

  const handleInjectSystemMessage = () => {
    const content = prompt('Enter system message:');
    if (content) {
      const systemMessage: TestMessage = {
        id: generateMessageId(),
        role: 'system',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    }
  };

  const handleSwitchAgent = (agent: Agent) => {
    // Save current session first
    saveCurrentSession();
    // Start new session with new agent
    startNewSession(agent);
    setShowAgentSelect(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Flame className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-full px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-white/60 hover:text-white transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Dashboard</span>
                </Link>

                <div className="h-6 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">Test Console</h1>
                    <p className="text-xs text-white/50">Real-time agent testing</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Agent Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowAgentSelect(!showAgentSelect)}
                    className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">
                      {selectedAgent?.name || 'Select Agent'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  </button>

                  <AnimatePresence>
                    {showAgentSelect && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 top-12 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                      >
                        <div className="p-2 border-b border-white/5">
                          <span className="text-xs text-white/40 px-2">Your Agents</span>
                        </div>
                        <div className="p-2 max-h-64 overflow-y-auto">
                          {agents.length === 0 ? (
                            <div className="px-4 py-6 text-center">
                              <Bot className="w-8 h-8 text-white/20 mx-auto mb-2" />
                              <p className="text-sm text-white/40">No agents yet</p>
                              <Link
                                href="/build"
                                className="text-xs text-orange-400 hover:text-orange-300"
                              >
                                Create one →
                              </Link>
                            </div>
                          ) : (
                            agents.map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => handleSwitchAgent(agent)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                                  selectedAgent?.id === agent.id
                                    ? 'bg-orange-500/20 text-white'
                                    : 'hover:bg-white/5 text-white/70'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                                  <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-medium">{agent.name}</p>
                                  <p className="text-xs text-white/40 capitalize">
                                    {agent.type.replace('_', ' ')}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quick Actions */}
                <div className="relative">
                  <button
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
                  >
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-sm">Actions</span>
                  </button>

                  <AnimatePresence>
                    {showQuickActions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-12 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                      >
                        <div className="p-2">
                          <button
                            onClick={() => {
                              handleClearConversation();
                              setShowQuickActions(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-white/70"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="text-sm">Reset Conversation</span>
                          </button>
                          <button
                            onClick={() => {
                              handleInjectSystemMessage();
                              setShowQuickActions(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-white/70"
                          >
                            <MessageSquarePlus className="w-4 h-4" />
                            <span className="text-sm">Inject System Message</span>
                          </button>
                          <button
                            onClick={() => {
                              setHistoryOpen(true);
                              setShowQuickActions(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-white/70"
                          >
                            <Play className="w-4 h-4" />
                            <span className="text-sm">Load Past Session</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* New Session */}
                <motion.button
                  onClick={() => selectedAgent && startNewSession(selectedAgent)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-4 h-4" />
                  New Test
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* Left Panel - Device Preview + Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <DevicePreview view={deviceView} onViewChange={setDeviceView}>
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearConversation={handleClearConversation}
                onExportConversation={handleExportConversation}
                isLoading={isStreaming}
                agentName={selectedAgent?.name}
                debugInfo={currentDebugInfo}
              />
            </DevicePreview>

            {/* Conversation History (below device preview) */}
            <div className="mt-4">
              <ConversationHistory
                sessions={sessions}
                currentSessionId={currentSessionId || undefined}
                onLoadSession={handleLoadSession}
                onDeleteSession={handleDeleteSession}
                onShareSession={handleShareSession}
                isOpen={historyOpen}
                onToggle={() => setHistoryOpen(!historyOpen)}
              />
            </div>
          </div>

          {/* Right Panel - Debug */}
          <DebugPanel
            debugInfo={currentDebugInfo}
            isCollapsed={debugCollapsed}
            onToggle={() => setDebugCollapsed(!debugCollapsed)}
          />
        </div>
      </div>

      {/* Click outside handlers */}
      {(showAgentSelect || showQuickActions) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setShowAgentSelect(false);
            setShowQuickActions(false);
          }}
        />
      )}
    </div>
  );
}
