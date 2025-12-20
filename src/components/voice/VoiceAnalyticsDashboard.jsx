/**
 * VoiceAnalyticsDashboard - Analytics view
 * Features: Total calls chart, average duration, success rate, top issues/intents, sentiment over time
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Calendar,
  Users
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

function useAnimatedCounter(target, duration = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

function StatCard({ title, value, icon: Icon, color, trend, delay }) {
  const colorMap = {
    purple: 'from-purple-500 to-pink-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500'
  };

  const bgColorMap = {
    purple: 'bg-purple-500/10',
    blue: 'bg-blue-500/10',
    green: 'bg-green-500/10',
    orange: 'bg-orange-500/10'
  };

  return (
    <motion.div
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 overflow-hidden group"
      variants={fadeInUp}
      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.1)' }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${bgColorMap[color]}`} />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <motion.div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-5 h-5 text-white" />
          </motion.div>
          {trend && (
            <motion.div
              className={`flex items-center gap-1 text-xs ${
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.5 }}
            >
              {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend.value}</span>
            </motion.div>
          )}
        </div>

        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-white/50">{title}</p>
      </div>
    </motion.div>
  );
}

function SimpleBarChart({ data, color = 'purple' }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <motion.div
            className="w-full bg-white/5 rounded-t-lg relative overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: `${(item.value / maxValue) * 100}%` }}
            transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
          >
            <motion.div
              className={`absolute inset-0 bg-gradient-to-t ${
                color === 'purple' ? 'from-purple-500 to-pink-500' :
                color === 'blue' ? 'from-blue-500 to-cyan-500' :
                'from-green-500 to-emerald-500'
              }`}
              whileHover={{ opacity: 0.8 }}
            />
          </motion.div>
          <span className="text-white/50 text-xs">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function SentimentChart({ data }) {
  const total = data.positive + data.neutral + data.negative;
  const positivePercent = (data.positive / total) * 100;
  const neutralPercent = (data.neutral / total) * 100;
  const negativePercent = (data.negative / total) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ThumbsUp className="w-5 h-5 text-green-400" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/70 text-sm">Positive</span>
            <span className="text-green-400 text-sm font-medium">{data.positive} ({positivePercent.toFixed(0)}%)</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${positivePercent}%` }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Minus className="w-5 h-5 text-yellow-400" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/70 text-sm">Neutral</span>
            <span className="text-yellow-400 text-sm font-medium">{data.neutral} ({neutralPercent.toFixed(0)}%)</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${neutralPercent}%` }}
              transition={{ duration: 1, delay: 0.4 }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThumbsDown className="w-5 h-5 text-red-400" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/70 text-sm">Negative</span>
            <span className="text-red-400 text-sm font-medium">{data.negative} ({negativePercent.toFixed(0)}%)</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${negativePercent}%` }}
              transition={{ duration: 1, delay: 0.6 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TopIssuesCard({ issues }) {
  return (
    <div className="space-y-3">
      {issues.map((issue, index) => (
        <motion.div
          key={index}
          className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ x: 4 }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <h4 className="text-white font-medium text-sm">{issue.intent}</h4>
            </div>
            <span className="text-white/50 text-xs">{issue.count} calls</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${issue.percentage}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
              />
            </div>
            <span className="text-white/50 text-xs">{issue.percentage}%</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function VoiceAnalyticsDashboard({ agentId, dateRange = '7d' }) {
  // Mock analytics data
  const analytics = {
    totalCalls: 1247,
    averageDuration: '5:34',
    successRate: 87,
    uniqueCallers: 892,
    callsByDay: [
      { label: 'Mon', value: 156 },
      { label: 'Tue', value: 189 },
      { label: 'Wed', value: 210 },
      { label: 'Thu', value: 178 },
      { label: 'Fri', value: 224 },
      { label: 'Sat', value: 145 },
      { label: 'Sun', value: 145 }
    ],
    sentiment: {
      positive: 756,
      neutral: 342,
      negative: 149
    },
    topIssues: [
      { intent: 'Password Reset', count: 234, percentage: 18.8 },
      { intent: 'Billing Question', count: 187, percentage: 15.0 },
      { intent: 'Account Upgrade', count: 156, percentage: 12.5 },
      { intent: 'Technical Support', count: 143, percentage: 11.5 },
      { intent: 'General Inquiry', count: 112, percentage: 9.0 }
    ],
    durationByDay: [
      { label: 'Mon', value: 320 },
      { label: 'Tue', value: 340 },
      { label: 'Wed', value: 355 },
      { label: 'Thu', value: 330 },
      { label: 'Fri', value: 310 },
      { label: 'Sat', value: 285 },
      { label: 'Sun', value: 295 }
    ]
  };

  const animatedTotalCalls = useAnimatedCounter(analytics.totalCalls, 1000);
  const animatedSuccessRate = useAnimatedCounter(analytics.successRate, 1200);
  const animatedUniqueCalls = useAnimatedCounter(analytics.uniqueCallers, 1400);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25"
            animate={{
              boxShadow: [
                "0 10px 40px rgba(168, 85, 247, 0.25)",
                "0 10px 60px rgba(168, 85, 247, 0.4)",
                "0 10px 40px rgba(168, 85, 247, 0.25)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BarChart3 className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-white">Voice Analytics</h2>
            <p className="text-white/50 text-sm">Performance insights for the last 7 days</p>
          </div>
        </div>

        <select
          className="px-4 py-2 bg-white/5 rounded-lg text-white border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          title="Total Calls"
          value={animatedTotalCalls.toLocaleString()}
          icon={Phone}
          color="purple"
          trend={{ value: '+12.5%', isPositive: true }}
          delay={0}
        />
        <StatCard
          title="Avg Duration"
          value={analytics.averageDuration}
          icon={Clock}
          color="blue"
          trend={{ value: '+0:45', isPositive: true }}
          delay={0.1}
        />
        <StatCard
          title="Success Rate"
          value={`${animatedSuccessRate}%`}
          icon={Target}
          color="green"
          trend={{ value: '+3.2%', isPositive: true }}
          delay={0.2}
        />
        <StatCard
          title="Unique Callers"
          value={animatedUniqueCalls.toLocaleString()}
          icon={Users}
          color="orange"
          trend={{ value: '+8.7%', isPositive: true }}
          delay={0.3}
        />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Calls Chart */}
        <motion.div
          className="rounded-2xl bg-white/5 border border-white/5 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Calls by Day
            </h3>
          </div>
          <SimpleBarChart data={analytics.callsByDay} color="purple" />
        </motion.div>

        {/* Average Duration Chart */}
        <motion.div
          className="rounded-2xl bg-white/5 border border-white/5 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Avg Duration (seconds)
            </h3>
          </div>
          <SimpleBarChart data={analytics.durationByDay} color="blue" />
        </motion.div>

        {/* Sentiment Over Time */}
        <motion.div
          className="rounded-2xl bg-white/5 border border-white/5 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Sentiment Analysis
            </h3>
          </div>
          <SentimentChart data={analytics.sentiment} />
        </motion.div>

        {/* Top Issues/Intents */}
        <motion.div
          className="rounded-2xl bg-white/5 border border-white/5 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Top Call Intents
            </h3>
          </div>
          <TopIssuesCard issues={analytics.topIssues} />
        </motion.div>
      </div>
    </div>
  );
}
