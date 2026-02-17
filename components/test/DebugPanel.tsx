'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, Code, Cpu, Clock, DollarSign,
  Wrench, Database, FileText, Copy, Check, Eye, EyeOff
} from 'lucide-react';
import type { DebugInfo } from '@/lib/test-types';

interface DebugPanelProps {
  debugInfo: DebugInfo | null;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function DebugPanel({ debugInfo, isCollapsed, onToggle }: DebugPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['tokens', 'latency'])
  );
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatJson = (obj: any) => JSON.stringify(obj, null, 2);

  const Section = ({
    id,
    title,
    icon: Icon,
    children,
    copyContent,
  }: {
    id: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    copyContent?: string;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="border border-white/5 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-white">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {copyContent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(copyContent, id);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                {copiedSection === id ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-white/50" />
                )}
              </button>
            )}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/50" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-black/20">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden"
      initial={false}
      animate={{ width: isCollapsed ? 48 : 400 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/5 hover:bg-white/10 transition"
      >
        <Code className="w-5 h-5 text-orange-400" />
        {!isCollapsed && (
          <>
            <span className="text-sm font-semibold text-white flex-1 text-left">Debug Panel</span>
            <ChevronRight
              className={`w-4 h-4 text-white/50 transition-transform ${
                isCollapsed ? '' : 'rotate-180'
              }`}
            />
          </>
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto"
          >
            {!debugInfo ? (
              <div className="text-center py-8">
                <Code className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/40">
                  Send a message to see debug info
                </p>
              </div>
            ) : (
              <>
                {/* System Prompt */}
                <Section
                  id="system-prompt"
                  title="System Prompt"
                  icon={FileText}
                  copyContent={debugInfo.systemPrompt}
                >
                  <div className="relative">
                    <pre
                      className={`text-xs text-white/70 whitespace-pre-wrap font-mono ${
                        !showFullPrompt && debugInfo.systemPrompt.length > 500
                          ? 'max-h-32 overflow-hidden'
                          : ''
                      }`}
                    >
                      {debugInfo.systemPrompt}
                    </pre>
                    {debugInfo.systemPrompt.length > 500 && (
                      <button
                        onClick={() => setShowFullPrompt(!showFullPrompt)}
                        className="mt-2 flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300"
                      >
                        {showFullPrompt ? (
                          <>
                            <EyeOff className="w-3 h-3" /> Show less
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" /> Show full prompt
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </Section>

                {/* Token Usage */}
                <Section id="tokens" title="Token Usage" icon={Cpu}>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/5 text-center">
                      <p className="text-lg font-semibold text-white">
                        {debugInfo.tokens.input.toLocaleString()}
                      </p>
                      <p className="text-xs text-white/40">Input</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 text-center">
                      <p className="text-lg font-semibold text-white">
                        {debugInfo.tokens.output.toLocaleString()}
                      </p>
                      <p className="text-xs text-white/40">Output</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 text-center">
                      <p className="text-lg font-semibold text-orange-400">
                        {debugInfo.tokens.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-white/40">Total</p>
                    </div>
                  </div>
                </Section>

                {/* Latency */}
                <Section id="latency" title="Latency" icon={Clock}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-white/60">Response Time</span>
                    <span className="text-lg font-semibold text-white">
                      {debugInfo.latencyMs}
                      <span className="text-xs text-white/40 ml-1">ms</span>
                    </span>
                  </div>
                </Section>

                {/* Cost Estimate */}
                <Section id="cost" title="Cost Estimate" icon={DollarSign}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-white/60">This Message</span>
                    <span className="text-lg font-semibold text-green-400">
                      ${debugInfo.costEstimate.toFixed(6)}
                    </span>
                  </div>
                </Section>

                {/* Tool Calls */}
                {debugInfo.toolCalls.length > 0 && (
                  <Section id="tools" title={`Tool Calls (${debugInfo.toolCalls.length})`} icon={Wrench}>
                    <div className="space-y-2">
                      {debugInfo.toolCalls.map((tool, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-orange-400">{tool.name}</span>
                            {tool.durationMs && (
                              <span className="text-xs text-white/40">{tool.durationMs}ms</span>
                            )}
                          </div>
                          <pre className="text-xs text-white/50 font-mono overflow-x-auto">
                            {formatJson(tool.arguments)}
                          </pre>
                          {tool.result && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <span className="text-xs text-white/40">Result:</span>
                              <pre className="text-xs text-white/50 font-mono mt-1 overflow-x-auto">
                                {typeof tool.result === 'string'
                                  ? tool.result
                                  : formatJson(tool.result)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Knowledge Chunks */}
                {debugInfo.knowledgeChunks.length > 0 && (
                  <Section
                    id="knowledge"
                    title={`Knowledge Retrieved (${debugInfo.knowledgeChunks.length})`}
                    icon={Database}
                  >
                    <div className="space-y-2">
                      {debugInfo.knowledgeChunks.map((chunk, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-white/40">
                              {chunk.source || `Chunk ${idx + 1}`}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                              {(chunk.score * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-3">{chunk.content}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Full Request */}
                <Section
                  id="request"
                  title="API Request"
                  icon={Code}
                  copyContent={formatJson(debugInfo.request)}
                >
                  <pre className="text-xs text-white/50 font-mono overflow-x-auto max-h-48">
                    {formatJson(debugInfo.request)}
                  </pre>
                </Section>

                {/* Full Response */}
                <Section
                  id="response"
                  title="API Response"
                  icon={Code}
                  copyContent={formatJson(debugInfo.response)}
                >
                  <pre className="text-xs text-white/50 font-mono overflow-x-auto max-h-48">
                    {formatJson(debugInfo.response)}
                  </pre>
                </Section>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
