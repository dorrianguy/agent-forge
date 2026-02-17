'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Headphones,
  TrendingUp,
  Heart,
  ShoppingCart,
  Users,
  Home,
  DollarSign,
  Utensils,
  LayoutGrid,
} from 'lucide-react';
import { CATEGORIES, TemplateCategory } from '@/lib/template-types';

interface CategoryFilterProps {
  selected: TemplateCategory | 'all';
  onChange: (category: TemplateCategory | 'all') => void;
}

const iconMap: Record<string, React.ElementType> = {
  Headphones,
  TrendingUp,
  Heart,
  ShoppingCart,
  Users,
  Home,
  DollarSign,
  Utensils,
};

const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  red: 'from-red-500 to-pink-500',
  purple: 'from-purple-500 to-violet-500',
  cyan: 'from-cyan-500 to-teal-500',
  amber: 'from-amber-500 to-yellow-500',
  emerald: 'from-emerald-500 to-green-500',
  pink: 'from-pink-500 to-rose-500',
};

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="w-full">
      {/* Mobile: Horizontal scroll */}
      <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          <CategoryButton
            isSelected={selected === 'all'}
            onClick={() => onChange('all')}
            icon={LayoutGrid}
            name="All"
            color="from-orange-500 to-red-500"
          />
          {CATEGORIES.map((cat) => (
            <CategoryButton
              key={cat.id}
              isSelected={selected === cat.id}
              onClick={() => onChange(cat.id)}
              icon={iconMap[cat.icon] || LayoutGrid}
              name={cat.name}
              color={colorMap[cat.color]}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Wrapped tabs */}
      <div className="hidden md:flex flex-wrap gap-2">
        <CategoryButton
          isSelected={selected === 'all'}
          onClick={() => onChange('all')}
          icon={LayoutGrid}
          name="All Templates"
          color="from-orange-500 to-red-500"
        />
        {CATEGORIES.map((cat) => (
          <CategoryButton
            key={cat.id}
            isSelected={selected === cat.id}
            onClick={() => onChange(cat.id)}
            icon={iconMap[cat.icon] || LayoutGrid}
            name={cat.name}
            color={colorMap[cat.color]}
          />
        ))}
      </div>
    </div>
  );
}

interface CategoryButtonProps {
  isSelected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  name: string;
  color: string;
}

function CategoryButton({ isSelected, onClick, icon: Icon, name, color }: CategoryButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
        isSelected
          ? 'bg-white/10 text-white border border-white/20'
          : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10 hover:text-white'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`w-6 h-6 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}
      >
        <Icon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
      </div>
      <span>{name}</span>
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-orange-500/50"
          layoutId="categoryHighlight"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
    </motion.button>
  );
}
