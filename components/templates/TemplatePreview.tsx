'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronDown, ChevronUp, Star, MessageSquare, Bot, User,
  Sparkles, CheckCircle2, BookOpen, Zap,
  Headphones, HelpCircle, RotateCcw, Rocket, MessageSquarePlus, ShieldAlert,
  Wrench, Receipt, MessageCircle, Share2, Target, Calendar, Send,
  TrendingUp, Shield, FileText, RefreshCw, Users as UsersIcon,
  CalendarCheck, ClipboardList, Bell, Stethoscope, Pill, Heart, HeartPulse,
  Search, Package, ShoppingCart, Ruler, Gift, Crown,
  Monitor, GraduationCap, Building, UserPlus, MapPin, Tag, Key, DoorOpen,
  Calculator, CreditCard, AlertCircle, PiggyBank, FileCheck, Settings,
  Utensils, Coffee, Plane, Leaf
} from 'lucide-react';
import { AgentTemplate, CATEGORIES } from '@/lib/template-types';

interface TemplatePreviewProps {
  template: AgentTemplate;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: () => void;
}

// Map string icon names to components
const iconMap: Record<string, React.ElementType> = {
  Headphones, HelpCircle, RotateCcw, Rocket, MessageSquarePlus, ShieldAlert,
  Wrench, Receipt, MessageCircle, Share2, Target, Calendar, Send,
  TrendingUp, Shield, FileText, RefreshCw, Zap, Users: UsersIcon, Handshake: UserPlus,
  CalendarCheck, ClipboardList, Bell, Stethoscope, Pill, Heart, HeartPulse,
  Search, Package, Sparkles, ShoppingCart, Ruler, Gift, Crown,
  Monitor, GraduationCap, Building, UserPlus, MapPin, Tag, Key, DoorOpen,
  Calculator, CreditCard, AlertCircle, PiggyBank, FileCheck, Settings,
  Utensils, Coffee, Plane, Leaf, MessageSquare
};

const categoryColorMap: Record<string, { gradient: string }> = {
  'customer-service': { gradient: 'from-blue-500 to-cyan-500' },
  'sales': { gradient: 'from-green-500 to-emerald-500' },
  'healthcare': { gradient: 'from-red-500 to-pink-500' },
  'ecommerce': { gradient: 'from-purple-500 to-violet-500' },
  'hr-internal': { gradient: 'from-cyan-500 to-teal-500' },
  'real-estate': { gradient: 'from-amber-500 to-yellow-500' },
  'financial': { gradient: 'from-emerald-500 to-green-500' },
  'hospitality': { gradient: 'from-pink-500 to-rose-500' },
};

export default function TemplatePreview({ template, isOpen, onClose, onUseTemplate }: TemplatePreviewProps) {
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  
  const Icon = iconMap[template.icon] || HelpCircle;
  const category = CATEGORIES.find(c => c.id === template.category);
  const colors = categoryColorMap[template.category] || categoryColorMap['customer-service'];
  const popularityStars = Math.round(template.popularity / 20);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
          >
            {/* Header with gradient background */}
            <div className={`relative h-28 bg-gradient-to-br ${colors.gradient} opacity-20`}>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-black/20 hover:bg-black/40 transition-colors z-10"
              aria-label="Close preview"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 -mt-16">
              {/* Icon and title */}
              <div className="flex items-end gap-4 mb-6">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg border-4 border-slate-900`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{template.name}</h2>
                    {template.featured && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-[10px] font-bold text-white uppercase">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/50 text-sm">{category?.name}</span>
                    <span className="text-white/20">•</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < popularityStars ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'
                          }`}
                        />
                      ))}
                      <span className="text-white/40 text-xs ml-1">{template.popularity}% popularity</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-white/70 text-base mb-6">{template.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/5 rounded-full text-sm text-white/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Sample Conversation */}
              <div className="mb-6">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-orange-400" />
                  Sample Conversation
                </h3>
                <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/5">
                  {template.sampleConversation.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${message.role === 'assistant' ? '' : 'flex-row-reverse'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        message.role === 'assistant' 
                          ? `bg-gradient-to-br ${colors.gradient}` 
                          : 'bg-white/10'
                      }`}>
                        {message.role === 'assistant' ? (
                          <Bot className="w-4 h-4 text-white" />
                        ) : (
                          <User className="w-4 h-4 text-white/70" />
                        )}
                      </div>
                      <div className={`flex-1 p-3 rounded-xl text-sm ${
                        message.role === 'assistant'
                          ? 'bg-white/5 text-white/80'
                          : 'bg-orange-500/10 text-white/80'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Prompt (collapsible) */}
              <div className="mb-6">
                <button
                  onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                  className="w-full flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:bg-black/30 transition-colors"
                >
                  <span className="text-white font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    System Prompt
                  </span>
                  {showSystemPrompt ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </button>
                <AnimatePresence>
                  {showSystemPrompt && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-black/10 border-x border-b border-white/5 rounded-b-xl">
                        <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-relaxed">
                          {template.systemPrompt}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Capabilities & Knowledge Base */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Capabilities */}
                <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                  <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Capabilities
                  </h4>
                  <ul className="space-y-2">
                    {template.capabilities.map((cap) => (
                      <li key={cap} className="flex items-center gap-2 text-sm text-white/60">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Knowledge Base */}
                <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                  <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    Suggested Knowledge Base
                  </h4>
                  <ul className="space-y-2">
                    {template.suggestedKnowledgeBase.map((kb) => (
                      <li key={kb} className="flex items-center gap-2 text-sm text-white/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {kb}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer with CTA */}
            <div className="px-6 py-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-sm">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={onUseTemplate}
                  className="flex-[2] px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="w-5 h-5" />
                  Use This Template
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
