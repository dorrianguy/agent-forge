'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, ArrowLeft, Sparkles, TrendingUp, Filter, SortAsc, 
  LayoutGrid, List, Star 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getProfile } from '@/lib/auth';
import type { Profile } from '@/lib/supabase';
import { agentTemplates, getFeaturedTemplates, getPopularTemplates } from '@/lib/templates-data';
import { TemplateCategory, SortOption, CATEGORIES } from '@/lib/template-types';
import SearchBar from '@/components/templates/SearchBar';
import CategoryFilter from '@/components/templates/CategoryFilter';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplatePreview from '@/components/templates/TemplatePreview';
import type { AgentTemplate } from '@/lib/template-types';

// Animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

export default function TemplatesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<AgentTemplate | null>(null);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getUser();
        if (!user) {
          router.push('/login?redirect=/dashboard/templates');
          return;
        }
        const profileData = await getProfile();
        if (!profileData || profileData.plan === 'free' || !profileData.plan) {
          router.push('/pricing?required=true');
          return;
        }
        setProfile(profileData);
      } catch {
        router.push('/login?redirect=/dashboard/templates');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let result = [...agentTemplates];

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter featured only
    if (showFeaturedOnly) {
      result = result.filter(t => t.featured);
    }

    // Sort
    switch (sortBy) {
      case 'popularity':
        result.sort((a, b) => b.popularity - a.popularity);
        break;
      case 'newest':
        // Since we don't have real dates, just reverse the array for "newest"
        result.reverse();
        break;
      case 'alphabetical':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy, showFeaturedOnly]);

  // Get featured templates for hero section
  const featuredTemplates = useMemo(() => getFeaturedTemplates().slice(0, 4), []);

  // Handle using a template
  const handleUseTemplate = (template: AgentTemplate) => {
    // Store template data in sessionStorage for the builder
    sessionStorage.setItem('templateData', JSON.stringify({
      name: template.name,
      type: template.category,
      systemPrompt: template.systemPrompt,
      suggestedKnowledge: template.suggestedKnowledgeBase,
      fromTemplate: template.id,
    }));
    router.push('/build?from=template');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Flame className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard"
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white/60" />
                </Link>
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Flame className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-xl font-bold">Template Gallery</h1>
                    <p className="text-xs text-white/50">Choose a starting point for your agent</p>
                  </div>
                </div>
              </div>

              <Link href="/build">
                <motion.button
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start from Scratch
                </motion.button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Hero Section with Featured Templates */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Featured Templates</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  className="relative p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 cursor-pointer group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setPreviewTemplate(template)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">{template.name}</h3>
                      <p className="text-white/40 text-xs">{CATEGORIES.find(c => c.id === template.category)?.name}</p>
                    </div>
                  </div>
                  <p className="text-white/50 text-xs line-clamp-2">{template.description}</p>
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Filters Section */}
          <motion.section 
            className="mb-8 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Search and View Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <SearchBar 
                value={searchQuery} 
                onChange={setSearchQuery}
                placeholder="Search templates by name, description, or tag..."
              />
              
              <div className="flex items-center gap-3">
                {/* Sort dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50 cursor-pointer"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="newest">Newest</option>
                    <option value="alphabetical">A-Z</option>
                  </select>
                  <SortAsc className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>

                {/* Featured toggle */}
                <button
                  onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                    showFeaturedOnly
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Star className={`w-4 h-4 ${showFeaturedOnly ? 'fill-orange-400' : ''}`} />
                  Featured
                </button>

                {/* View mode toggle */}
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <CategoryFilter 
              selected={selectedCategory} 
              onChange={setSelectedCategory}
            />
          </motion.section>

          {/* Results count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-white/40 text-sm">
              Showing <span className="text-white font-medium">{filteredTemplates.length}</span> templates
              {selectedCategory !== 'all' && (
                <span> in <span className="text-orange-400">{CATEGORIES.find(c => c.id === selectedCategory)?.name}</span></span>
              )}
              {searchQuery && (
                <span> matching "<span className="text-orange-400">{searchQuery}</span>"</span>
              )}
            </p>
          </div>

          {/* Templates Grid/List */}
          {filteredTemplates.length > 0 ? (
            <motion.div
              className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
              }
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={() => setPreviewTemplate(template)}
                  onUseTemplate={() => handleUseTemplate(template)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No templates found</h3>
              <p className="text-white/50 mb-6">Try adjusting your filters or search query</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setShowFeaturedOnly(false);
                }}
                className="px-4 py-2 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                Clear all filters
              </button>
            </motion.div>
          )}

          {/* Category Quick Stats */}
          <motion.section 
            className="mt-16 pt-8 border-t border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Templates by Category
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const count = agentTemplates.filter(t => t.category === cat.id).length;
                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-xl text-left transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-orange-500/20 border border-orange-500/30'
                        : 'bg-white/5 border border-white/5 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="text-2xl font-bold text-white mb-1">{count}</p>
                    <p className="text-white/50 text-sm">{cat.name}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        </main>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUseTemplate={() => {
            handleUseTemplate(previewTemplate);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}
