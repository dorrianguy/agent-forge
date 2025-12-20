/**
 * CallHistoryTable - Call logs with sorting and filtering
 * Features: Sortable table, date/outcome/duration filters, play recording, view transcript, sentiment
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Play,
  Pause,
  Square,
  Download,
  FileText,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Volume2
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

function SentimentIndicator({ sentiment }) {
  const getSentimentConfig = () => {
    switch (sentiment) {
      case 'positive':
        return {
          icon: TrendingUp,
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          label: 'Positive'
        };
      case 'negative':
        return {
          icon: TrendingDown,
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          label: 'Negative'
        };
      default:
        return {
          icon: Minus,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/30',
          label: 'Neutral'
        };
    }
  };

  const config = getSentimentConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
}

function CallOutcomeIcon({ outcome }) {
  switch (outcome) {
    case 'completed':
      return <Phone className="w-4 h-4 text-green-400" />;
    case 'missed':
      return <PhoneMissed className="w-4 h-4 text-red-400" />;
    case 'voicemail':
      return <Phone className="w-4 h-4 text-yellow-400" />;
    default:
      return <Phone className="w-4 h-4 text-white/40" />;
  }
}

function CallDirectionIcon({ direction }) {
  return direction === 'inbound' ? (
    <PhoneIncoming className="w-4 h-4 text-blue-400" />
  ) : (
    <PhoneOutgoing className="w-4 h-4 text-purple-400" />
  );
}

// Audio Player Modal Component
function AudioPlayerModal({ call, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percent * duration;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    // Create a mock audio file download
    const link = document.createElement('a');
    link.href = `/api/recordings/${call.id}.mp3`;
    link.download = `${call.caller.replace(/\s+/g, '_')}_${call.date.toISOString().split('T')[0]}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{call.caller}</h3>
              <p className="text-white/50 text-sm">{call.summary}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio element (hidden, using mock URL) */}
        <audio
          ref={audioRef}
          src={`/api/recordings/${call.id}.mp3`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Progress bar */}
        <div
          className="h-2 bg-white/10 rounded-full cursor-pointer mb-4 overflow-hidden"
          onClick={handleSeek}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between text-sm text-white/50 mb-6">
          <span>{formatTime(currentTime)}</span>
          <span>{call.duration}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <motion.button
            className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </motion.button>
          <motion.button
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            title="Download recording"
          >
            <Download className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Call info */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/40">Date</p>
            <p className="text-white/80">{call.date.toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-white/40">Duration</p>
            <p className="text-white/80">{call.duration}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Transcript Viewer Modal
function TranscriptModal({ call, onClose }) {
  // Mock transcript data
  const transcript = [
    { speaker: 'Agent', text: 'Hello, thank you for calling. How can I help you today?', time: '0:00' },
    { speaker: call.caller, text: `Hi, I need help with ${call.summary.toLowerCase()}.`, time: '0:05' },
    { speaker: 'Agent', text: 'Of course, I\'d be happy to assist you with that. Let me pull up your account.', time: '0:12' },
    { speaker: call.caller, text: 'Thank you, I appreciate the quick response.', time: '0:20' },
    { speaker: 'Agent', text: 'I can see your account here. Let me walk you through the solution.', time: '0:28' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Call Transcript</h3>
              <p className="text-white/50 text-sm">{call.caller} - {call.date.toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transcript content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {transcript.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex gap-3 ${entry.speaker === 'Agent' ? '' : 'flex-row-reverse'}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                entry.speaker === 'Agent'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {entry.speaker === 'Agent' ? 'AI' : entry.speaker.charAt(0)}
              </div>
              <div className={`flex-1 ${entry.speaker === 'Agent' ? '' : 'text-right'}`}>
                <div className={`inline-block px-4 py-2 rounded-2xl ${
                  entry.speaker === 'Agent'
                    ? 'bg-white/5 text-white/80'
                    : 'bg-purple-500/20 text-white/80'
                }`}>
                  {entry.text}
                </div>
                <p className="text-white/30 text-xs mt-1">{entry.time}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sentiment summary */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">Call Sentiment</span>
            <SentimentIndicator sentiment={call.sentiment} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CallHistoryTable({ agentId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [selectedCall, setSelectedCall] = useState(null);
  const [modalType, setModalType] = useState(null); // 'audio' or 'transcript'

  // Mock call history data
  const callHistory = [
    {
      id: 'call-1',
      caller: 'Sarah Johnson',
      phoneNumber: '+1 (555) 234-5678',
      direction: 'inbound',
      outcome: 'completed',
      duration: '4:32',
      durationSeconds: 272,
      date: new Date('2025-12-19T14:30:00'),
      sentiment: 'positive',
      hasRecording: true,
      hasTranscript: true,
      summary: 'Password reset assistance'
    },
    {
      id: 'call-2',
      caller: 'Michael Chen',
      phoneNumber: '+1 (555) 876-5432',
      direction: 'outbound',
      outcome: 'completed',
      duration: '8:15',
      durationSeconds: 495,
      date: new Date('2025-12-19T13:15:00'),
      sentiment: 'positive',
      hasRecording: true,
      hasTranscript: true,
      summary: 'Subscription upgrade'
    },
    {
      id: 'call-3',
      caller: 'Emily Rodriguez',
      phoneNumber: '+1 (555) 345-6789',
      direction: 'inbound',
      outcome: 'missed',
      duration: '0:00',
      durationSeconds: 0,
      date: new Date('2025-12-19T12:45:00'),
      sentiment: 'neutral',
      hasRecording: false,
      hasTranscript: false,
      summary: 'No answer'
    },
    {
      id: 'call-4',
      caller: 'David Park',
      phoneNumber: '+1 (555) 456-7890',
      direction: 'inbound',
      outcome: 'voicemail',
      duration: '0:45',
      durationSeconds: 45,
      date: new Date('2025-12-19T11:20:00'),
      sentiment: 'neutral',
      hasRecording: true,
      hasTranscript: true,
      summary: 'Left voicemail'
    },
    {
      id: 'call-5',
      caller: 'Lisa Thompson',
      phoneNumber: '+1 (555) 567-8901',
      direction: 'inbound',
      outcome: 'completed',
      duration: '12:18',
      durationSeconds: 738,
      date: new Date('2025-12-19T10:05:00'),
      sentiment: 'negative',
      hasRecording: true,
      hasTranscript: true,
      summary: 'Billing dispute'
    }
  ];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredCalls = callHistory
    .filter(call => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        call.caller.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.phoneNumber.includes(searchQuery) ||
        call.summary.toLowerCase().includes(searchQuery.toLowerCase());

      // Outcome filter
      const matchesOutcome = filterOutcome === 'all' || call.outcome === filterOutcome;

      return matchesSearch && matchesOutcome;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = a.date.getTime() - b.date.getTime();
          break;
        case 'duration':
          comparison = a.durationSeconds - b.durationSeconds;
          break;
        case 'caller':
          comparison = a.caller.localeCompare(b.caller);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-white/30" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4 text-purple-400" /> :
      <ChevronDown className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Phone className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold text-white">Call History</h3>
              <p className="text-white/50 text-sm">{filteredCalls.length} calls</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calls..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 rounded-lg text-white placeholder:text-white/30 border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Outcome Filter */}
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="px-4 py-2 bg-white/5 rounded-lg text-white border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
          >
            <option value="all">All Outcomes</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
            <option value="voicemail">Voicemail</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            className="px-4 py-2 bg-white/5 rounded-lg text-white border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-6 py-3">
                <button
                  onClick={() => handleSort('caller')}
                  className="flex items-center gap-2 text-white/60 text-sm font-medium hover:text-white transition-colors"
                >
                  Caller
                  <SortIcon field="caller" />
                </button>
              </th>
              <th className="text-left px-6 py-3">
                <span className="text-white/60 text-sm font-medium">Direction</span>
              </th>
              <th className="text-left px-6 py-3">
                <span className="text-white/60 text-sm font-medium">Outcome</span>
              </th>
              <th className="text-left px-6 py-3">
                <button
                  onClick={() => handleSort('duration')}
                  className="flex items-center gap-2 text-white/60 text-sm font-medium hover:text-white transition-colors"
                >
                  Duration
                  <SortIcon field="duration" />
                </button>
              </th>
              <th className="text-left px-6 py-3">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-2 text-white/60 text-sm font-medium hover:text-white transition-colors"
                >
                  Date & Time
                  <SortIcon field="date" />
                </button>
              </th>
              <th className="text-left px-6 py-3">
                <span className="text-white/60 text-sm font-medium">Sentiment</span>
              </th>
              <th className="text-right px-6 py-3">
                <span className="text-white/60 text-sm font-medium">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filteredCalls.map((call, index) => (
                <motion.tr
                  key={call.id}
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{call.caller}</p>
                      <p className="text-white/50 text-xs font-mono">{call.phoneNumber}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CallDirectionIcon direction={call.direction} />
                      <span className="text-white/70 text-sm capitalize">{call.direction}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CallOutcomeIcon outcome={call.outcome} />
                      <span className="text-white/70 text-sm capitalize">{call.outcome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-white/70 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      {call.duration}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white/70 text-sm">
                        {call.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-white/50 text-xs">
                        {call.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <SentimentIndicator sentiment={call.sentiment} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {call.hasRecording && (
                        <motion.button
                          className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/60 hover:text-purple-400 transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Play recording"
                          onClick={() => {
                            setSelectedCall(call);
                            setModalType('audio');
                          }}
                        >
                          <Play className="w-4 h-4" />
                        </motion.button>
                      )}
                      {call.hasTranscript && (
                        <motion.button
                          className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/60 hover:text-purple-400 transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="View transcript"
                          onClick={() => {
                            setSelectedCall(call);
                            setModalType('transcript');
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredCalls.length === 0 && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.7, 0.5]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Phone className="w-8 h-8 text-white/40" />
            </motion.div>
            <p className="text-white/50 text-sm">No calls found</p>
            <p className="text-white/30 text-xs mt-1">Try adjusting your filters</p>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedCall && modalType === 'audio' && (
          <AudioPlayerModal
            call={selectedCall}
            onClose={() => {
              setSelectedCall(null);
              setModalType(null);
            }}
          />
        )}
        {selectedCall && modalType === 'transcript' && (
          <TranscriptModal
            call={selectedCall}
            onClose={() => {
              setSelectedCall(null);
              setModalType(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
