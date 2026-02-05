'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, MessageCircle } from 'lucide-react';
import type { DeviceView, DeviceFrame, DEVICE_FRAMES } from '@/lib/test-types';

interface DevicePreviewProps {
  view: DeviceView;
  onViewChange: (view: DeviceView) => void;
  children: React.ReactNode;
}

const deviceConfig: Record<DeviceView, DeviceFrame> = {
  desktop: {
    type: 'desktop',
    width: 800,
    height: 600,
    label: 'Desktop',
  },
  mobile: {
    type: 'mobile',
    width: 375,
    height: 667,
    label: 'Mobile',
  },
  widget: {
    type: 'widget',
    width: 380,
    height: 520,
    label: 'Widget',
  },
};

const viewIcons: Record<DeviceView, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  widget: MessageCircle,
};

export default function DevicePreview({ view, onViewChange, children }: DevicePreviewProps) {
  const config = deviceConfig[view];
  const views: DeviceView[] = ['desktop', 'mobile', 'widget'];

  return (
    <div className="flex flex-col h-full">
      {/* View Toggle */}
      <div className="flex items-center justify-center gap-2 mb-4 p-1 bg-white/5 rounded-xl w-fit mx-auto">
        {views.map((v) => {
          const Icon = viewIcons[v];
          const isActive = view === v;

          return (
            <motion.button
              key={v}
              onClick={() => onViewChange(v)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  layoutId="device-indicator"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{deviceConfig[v].label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Device Frame */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <motion.div
          key={view}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          className="relative"
          style={{
            width: `min(${config.width}px, 100%)`,
            maxWidth: '100%',
          }}
        >
          {/* Device Shell */}
          {view === 'mobile' && (
            <div className="relative">
              {/* Phone Frame */}
              <div className="relative bg-slate-800 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-700">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl z-10" />
                
                {/* Screen */}
                <div
                  className="bg-slate-950 rounded-[2.25rem] overflow-hidden"
                  style={{ height: config.height }}
                >
                  {/* Status Bar */}
                  <div className="h-10 px-6 flex items-center justify-between text-white/60 text-xs bg-slate-900/50">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full ${
                              i <= 3 ? 'bg-white/60' : 'bg-white/20'
                            }`}
                            style={{ height: 4 + i * 2 }}
                          />
                        ))}
                      </div>
                      <span className="ml-1">100%</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="h-[calc(100%-40px)] overflow-hidden">
                    {children}
                  </div>
                </div>
                
                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
              </div>
            </div>
          )}

          {view === 'desktop' && (
            <div className="relative">
              {/* Monitor Frame */}
              <div className="bg-slate-800 rounded-xl p-2 shadow-2xl border-4 border-slate-700">
                {/* Browser Chrome */}
                <div className="h-8 px-3 flex items-center gap-2 bg-slate-900 rounded-t-lg">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 mx-2">
                    <div className="bg-slate-800 rounded px-3 py-1 text-xs text-white/40 flex items-center gap-2">
                      <span>🔒</span>
                      <span>yoursite.com</span>
                    </div>
                  </div>
                </div>
                
                {/* Screen */}
                <div
                  className="bg-slate-950 overflow-hidden"
                  style={{ height: config.height }}
                >
                  {children}
                </div>
              </div>
              
              {/* Stand */}
              <div className="mx-auto w-24 h-4 bg-slate-700 rounded-b-lg" />
              <div className="mx-auto w-40 h-2 bg-slate-700 rounded-full" />
            </div>
          )}

          {view === 'widget' && (
            <div className="relative">
              {/* Widget Container - simulates being embedded in a page */}
              <div className="bg-slate-800/50 rounded-2xl p-6 min-h-[600px] relative overflow-hidden">
                {/* Fake page content behind */}
                <div className="absolute inset-0 p-6">
                  <div className="space-y-4 opacity-30">
                    <div className="h-8 bg-white/10 rounded w-1/3" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-4 bg-white/10 rounded w-4/5" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-32 bg-white/10 rounded w-full" />
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                  </div>
                </div>
                
                {/* Widget positioned bottom-right */}
                <div className="absolute bottom-4 right-4 z-10">
                  <motion.div
                    className="shadow-2xl rounded-2xl overflow-hidden border border-white/10"
                    style={{
                      width: config.width,
                      height: config.height,
                    }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {children}
                  </motion.div>
                </div>
                
                {/* Floating trigger button */}
                <div className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg cursor-pointer opacity-0 pointer-events-none">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Size indicator */}
      <div className="text-center text-xs text-white/30 mt-2">
        {config.width} × {config.height}px
      </div>
    </div>
  );
}
