/**
 * VoiceAgentBuilder - Example Usage
 * Demonstrates how to integrate the VoiceAgentBuilder into your dashboard
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Sparkles } from 'lucide-react';
import VoiceAgentBuilder from './VoiceAgentBuilder';

export default function VoiceAgentBuilderExample() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [createdAgents, setCreatedAgents] = useState([]);

  const handleAgentCreated = (formData) => {
    console.log('Voice agent created with configuration:', formData);

    // Add to created agents list
    const newAgent = {
      id: `voice-agent-${Date.now()}`,
      ...formData,
      createdAt: new Date().toISOString(),
      status: 'deploying'
    };

    setCreatedAgents(prev => [...prev, newAgent]);

    // Simulate deployment
    setTimeout(() => {
      setCreatedAgents(prev =>
        prev.map(agent =>
          agent.id === newAgent.id
            ? { ...agent, status: 'active' }
            : agent
        )
      );
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Voice Agent Builder Example</h1>
          <p className="text-white/60">
            Click the button below to open the multi-step wizard
          </p>
        </div>

        {/* Create Button */}
        <motion.button
          onClick={() => setShowBuilder(true)}
          className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-3 shadow-lg shadow-orange-500/25 mb-8"
          whileHover={{
            scale: 1.05,
            boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)"
          }}
          whileTap={{ scale: 0.98 }}
        >
          <Phone className="w-5 h-5" />
          Create Voice Agent
          <Sparkles className="w-5 h-5" />
        </motion.button>

        {/* Created Agents List */}
        {createdAgents.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Created Agents</h2>
            <div className="space-y-3">
              {createdAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        {agent.agentType} Agent
                      </h3>
                      <div className="flex gap-2 text-sm text-white/60">
                        <span>Voice: {agent.voice}</span>
                        <span>•</span>
                        <span>Language: {agent.language}</span>
                        <span>•</span>
                        <span>LLM: {agent.llmProvider}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      agent.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Agent Builder Modal */}
        <VoiceAgentBuilder
          isOpen={showBuilder}
          onClose={() => setShowBuilder(false)}
          onComplete={handleAgentCreated}
        />
      </div>
    </div>
  );
}
