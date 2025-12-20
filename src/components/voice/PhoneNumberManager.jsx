/**
 * Phone Number Manager Component
 * Manages provisioned phone numbers, assignments, and costs
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Plus, Trash2, MapPin, DollarSign, Check, X,
  MessageSquare, PhoneCall, Activity, Settings, AlertCircle,
  ChevronDown, Search, Filter
} from 'lucide-react';

// Animation variants
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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

export default function PhoneNumberManager() {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [isAddingNumber, setIsAddingNumber] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);

  // Load mock data
  useEffect(() => {
    setTimeout(() => {
      setPhoneNumbers([
        {
          id: 'num-1',
          number: '+1 (415) 555-0123',
          areaCode: '415',
          status: 'active',
          assignedTo: 'agent-1',
          assignedName: 'Support Bot',
          capabilities: ['voice', 'sms'],
          monthlyCost: 2.00,
          minutesUsed: 1234,
          smsCount: 567,
          acquiredDate: '2024-01-15'
        },
        {
          id: 'num-2',
          number: '+1 (212) 555-0456',
          areaCode: '212',
          status: 'active',
          assignedTo: 'agent-2',
          assignedName: 'Sales Assistant',
          capabilities: ['voice', 'sms'],
          monthlyCost: 2.00,
          minutesUsed: 892,
          smsCount: 234,
          acquiredDate: '2024-02-01'
        },
        {
          id: 'num-3',
          number: '+1 (650) 555-0789',
          areaCode: '650',
          status: 'inactive',
          assignedTo: null,
          assignedName: null,
          capabilities: ['voice', 'sms'],
          monthlyCost: 2.00,
          minutesUsed: 0,
          smsCount: 0,
          acquiredDate: '2024-03-10'
        }
      ]);

      setAgents([
        { id: 'agent-1', name: 'Support Bot' },
        { id: 'agent-2', name: 'Sales Assistant' },
        { id: 'agent-3', name: 'Lead Qualifier' }
      ]);

      setLoading(false);
    }, 800);
  }, []);

  const handleGetNewNumber = async () => {
    if (!areaCode || areaCode.length !== 3) return;

    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newNumber = {
      id: `num-${Date.now()}`,
      number: `+1 (${areaCode}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
      areaCode,
      status: 'inactive',
      assignedTo: null,
      assignedName: null,
      capabilities: ['voice', 'sms'],
      monthlyCost: 2.00,
      minutesUsed: 0,
      smsCount: 0,
      acquiredDate: new Date().toISOString().split('T')[0]
    };

    setPhoneNumbers(prev => [...prev, newNumber]);
    setIsAddingNumber(false);
    setAreaCode('');
    setLoading(false);
  };

  const handleAssignNumber = (numberId, agentId) => {
    setPhoneNumbers(prev => prev.map(num => {
      if (num.id === numberId) {
        const agent = agents.find(a => a.id === agentId);
        return {
          ...num,
          assignedTo: agentId,
          assignedName: agent?.name || null,
          status: agentId ? 'active' : 'inactive'
        };
      }
      return num;
    }));
  };

  const handleReleaseNumber = (numberId) => {
    setPhoneNumbers(prev => prev.filter(num => num.id !== numberId));
  };

  const filteredNumbers = phoneNumbers.filter(num => {
    const matchesSearch = num.number.includes(searchQuery) ||
                         num.assignedName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || num.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalMonthlyCost = phoneNumbers.reduce((sum, num) => sum + num.monthlyCost, 0);
  const activeCount = phoneNumbers.filter(num => num.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
                whileHover={{ scale: 1.05 }}
              >
                <Phone className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white">Phone Number Manager</h1>
                <p className="text-white/50 text-sm">Provision and assign voice numbers</p>
              </div>
            </div>
            <motion.button
              onClick={() => setIsAddingNumber(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25"
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" />
              Get New Number
            </motion.button>
          </div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={fadeInUp}
              className="p-4 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-blue-400" />
                <span className="text-white/60 text-sm">Total Numbers</span>
              </div>
              <p className="text-2xl font-bold text-white">{phoneNumbers.length}</p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="p-4 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-white/60 text-sm">Active Numbers</span>
              </div>
              <p className="text-2xl font-bold text-white">{activeCount}</p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="p-4 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-white/60 text-sm">Monthly Cost</span>
              </div>
              <p className="text-2xl font-bold text-white">${totalMonthlyCost.toFixed(2)}</p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          className="flex flex-col md:flex-row gap-3 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by number or agent..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 rounded-xl text-white placeholder:text-white/30 border border-white/10 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'inactive'].map((status) => (
              <motion.button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Numbers List */}
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {loading ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full mx-auto mb-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-white/50">Loading numbers...</p>
              </motion.div>
            ) : filteredNumbers.length === 0 ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">No numbers found</p>
              </motion.div>
            ) : (
              filteredNumbers.map((number, index) => (
                <PhoneNumberCard
                  key={number.id}
                  number={number}
                  agents={agents}
                  onAssign={handleAssignNumber}
                  onRelease={handleReleaseNumber}
                  index={index}
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Add Number Modal */}
      <AnimatePresence>
        {isAddingNumber && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !loading && setIsAddingNumber(false)}
            />

            <motion.div
              className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-purple-500" />

              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Get New Number</h3>
                      <p className="text-white/50 text-sm">Provision a phone number</p>
                    </div>
                  </div>
                  {!loading && (
                    <motion.button
                      onClick={() => setIsAddingNumber(false)}
                      className="text-white/40 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>

                <div className="mb-6">
                  <label className="text-white/60 text-sm mb-2 block flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Area Code
                  </label>
                  <input
                    type="text"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="e.g., 415, 212, 650"
                    maxLength={3}
                    className="w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder:text-white/30 border border-white/10 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    disabled={loading}
                  />
                  <p className="text-white/40 text-xs mt-2">Enter a 3-digit area code</p>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-blue-400 text-sm font-medium">Monthly Cost: $2.00</p>
                      <p className="text-white/40 text-xs mt-1">Voice + SMS capabilities included</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setIsAddingNumber(false)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all font-medium disabled:opacity-40"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleGetNewNumber}
                    disabled={!areaCode || areaCode.length !== 3 || loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Provisioning...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Provision Number
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Phone Number Card Component
function PhoneNumberCard({ number, agents, onAssign, onRelease, index }) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAssignClick = (agentId) => {
    onAssign(number.id, agentId);
    setShowDropdown(false);
  };

  return (
    <motion.div
      layout
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all"
      whileHover={{ y: -2 }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Number Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Phone className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">{number.number}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  number.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {number.status === 'active' && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1" />
                  )}
                  {number.status}
                </span>
                <span className="text-white/40 text-xs">Area: {number.areaCode}</span>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="flex items-center gap-2 mb-3">
            {number.capabilities.includes('voice') && (
              <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                <PhoneCall className="w-3 h-3" />
                Voice
              </span>
            )}
            {number.capabilities.includes('sms') && (
              <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                SMS
              </span>
            )}
          </div>

          {/* Assignment */}
          {number.assignedName ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/50">Assigned to:</span>
              <span className="text-orange-400 font-medium">{number.assignedName}</span>
            </div>
          ) : (
            <span className="text-white/40 text-sm">Not assigned</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/5">
            <p className="text-white/40 text-xs mb-1">Minutes</p>
            <p className="text-white font-semibold">{number.minutesUsed.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <p className="text-white/40 text-xs mb-1">SMS</p>
            <p className="text-white font-semibold">{number.smsCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <p className="text-white/40 text-xs mb-1">Cost</p>
            <p className="text-green-400 font-semibold">${number.monthlyCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <motion.button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all font-medium flex items-center gap-2 w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Settings className="w-4 h-4" />
              Assign
              <ChevronDown className="w-4 h-4 ml-auto" />
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  className="absolute top-full mt-2 w-full bg-slate-800 rounded-xl border border-white/10 shadow-2xl overflow-hidden z-10"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <button
                    onClick={() => handleAssignClick(null)}
                    className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/5 transition-colors text-sm"
                  >
                    Unassign
                  </button>
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleAssignClick(agent.id)}
                      className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/5 transition-colors text-sm"
                    >
                      {agent.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={() => onRelease(number.id)}
            className="px-4 py-2 bg-red-500/20 rounded-xl text-red-400 hover:bg-red-500/30 transition-all font-medium flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="w-4 h-4" />
            Release
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
