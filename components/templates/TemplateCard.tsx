'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Headphones, HelpCircle, RotateCcw, Rocket, MessageSquarePlus, ShieldAlert,
  Wrench, Receipt, MessageCircle, Share2, Target, Calendar, Send,
  TrendingUp, Shield, FileText, RefreshCw, Handshake, Zap, Users as UsersIcon,
  CalendarCheck, ClipboardList, Bell, Stethoscope, Pill, Heart, HeartPulse,
  Search, Package, Sparkles, ShoppingCart, Ruler, Gift, Crown,
  Monitor, GraduationCap, Building, UserPlus, MapPin, Tag, Key, DoorOpen,
  Calculator, CreditCard, AlertCircle, PiggyBank, FileCheck, Settings,
  Utensils, Coffee, Plane, Leaf, MessageSquare, Star, Eye, ChevronRight
} from 'lucide-react';
import { AgentTemplate, CATEGORIES } from '@/lib/template-types';

interface TemplateCardProps {
  template: AgentTemplate;
  onPreview: () => void;
  onUseTemplate: () => void;
}

// Map string icon names to components
const iconMap: Record<string, React.ElementType> = {
  Headphones, HelpCircle, RotateCcw, Rocket, MessageSquarePlus, ShieldAlert,
  Wrench, Receipt, MessageCircle, Share2, Target, Calendar, Send,
  TrendingUp, Shield, FileText, RefreshCw, Handshake, Zap, Users: UsersIcon,
  CalendarCheck, ClipboardList, Bell, Stethoscope, Pill, Heart, HeartPulse,
  Search, Package, Sparkles, ShoppingCart, Ruler, Gift, Crown,
  Monitor, GraduationCap, Building, UserPlus, MapPin, Tag, Key, DoorOpen,
  Calculator, CreditCard, AlertCircle, PiggyBank, FileCheck, Settings,
  Utensils, Coffee, Plane, Leaf, MessageSquare
};

const categoryColorMap: Record<string, { bg: string; text: string; gradient: string }> = {
  'customer-service': { bg: 'bg-blue-500/20', text: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500' },
  'sales': { bg: 'bg-green-500/20', text: 'text-green-400', gradient: 'from-green-500 to-emerald-500' },
  'healthcare': { bg: 'bg-red-500/20', text: 'text-red-400', gradient: 'from-red-500 to-pink-500' },
  'ecommerce': { bg: 'bg-purple-500/20', text: 'text-purple-400', gradient: 'from-purple-500 to-violet-500' },
  'hr-internal': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', gradient: 'from-cyan-500 to-teal-500' },
  'real-estate': { bg: 'bg-amber-500/20', text: 'text-amber-400', gradient: 'from-amber-500 to-yellow-500' },
  'financial': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', gradient: 'from-emerald-500 to-green-500' },
  'hospitality': { bg: 'bg-pink-500/20', text: 'text-pink-400', gradient: 'from-pink-500 to-rose-500' },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function TemplateCard({ template, onPreview, onUseTemplate }: TemplateCardProps) {
  const Icon = iconMap[template.icon] || HelpCircle;
  const category = CATEGORIES.find(c => c.id === template.category);
  const colors = categoryColorMap[template.category] || categoryColorMap['customer-service'];

  // Calculate popularity display (stars)
  const popularityStars = Math.round(template.popularity / 20); // 0-5 stars

  return (
    <motion.div
      variants={fadeInUp}
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 group overflow-hidden transition-colors"
      whileHover={{ y: -4 }}
    >
      {/* Featured badge */}
      {template.featured && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-[10px] font-bold text-white uppercase tracking-wide">
            Featured
          </span>
        </div>
      )}

      {/* Icon and header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="text-white font-semibold truncate">{template.name}</h3>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}>
            {category?.name || template.category}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-white/50 text-sm line-clamp-2 mb-4 min-h-[40px]">
        {template.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-white/40"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="px-2 py-0.5 text-[10px] text-white/30">
            +{template.tags.length - 3} more
          </span>
        )}
      </div>

      {/* Popularity */}
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < popularityStars ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'
            }`}
            aria-hidden="true"
          />
        ))}
        <span className="text-white/30 text-xs ml-1">{template.popularity}%</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={onPreview}
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1.5"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <motion.button
          onClick={onUseTemplate}
          className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Use Template
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
