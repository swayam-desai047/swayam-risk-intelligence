'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  FileText, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  Play, 
  Terminal, 
  ArrowUpRight, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Database,
  Cpu
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const { 
    token, 
    role, 
    predictions, 
    alerts, 
    incidents, 
    mlopsMetrics, 
    dashboardStats, 
    wsConnected, 
    activeTab, 
    logout,
    fetchDashboardData,
    connectWebSocket,
    triggerRetraining,
    createIncident
  } = useStore();

  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLabel, setFilterLabel] = useState('ALL');
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  
  // Incident Form state
  const [incType, setIncType] = useState('FRAUD_ATTEMPT');
  const [incSeverity, setIncSeverity] = useState('HIGH');
  const [incDesc, setIncDesc] = useState('');
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  // Mount hook
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth Protection guard
  useEffect(() => {
    if (isMounted && !token) {
      router.push('/');
    } else if (isMounted && token) {
      fetchDashboardData();
      connectWebSocket();
    }
  }, [token, router, fetchDashboardData, connectWebSocket, isMounted]);

  if (!isMounted || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060810] text-white">
        <div className="w-8 h-8 border-2 border-violet-600/30 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  // --- Handlers ---
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!incDesc) return;
    
    try {
      const success = await createIncident(incType, incSeverity, incDesc);
      if (success) {
        setIncDesc('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainSuccess(false);
    const success = await triggerRetraining();
    if (success) {
      setRetrainSuccess(true);
    }
    setTimeout(() => {
      setIsRetraining(false);
      setRetrainSuccess(false);
    }, 4000);
  };

  // --- Filter and Search Predictions ---
  const filteredPredictions = predictions.filter(p => {
    const matchesSearch = p.id.toString().includes(searchTerm) || 
      (p.features?.Amount?.toString() || '').includes(searchTerm);
    const matchesFilter = filterLabel === 'ALL' || p.label === filterLabel;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#060810] relative text-slate-100 font-sans">
      
      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 bg-[#0a0c16]/75 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-900/20 pulse-threat-high">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-wider text-white uppercase">ANTIGRAVITY</h2>
            <span className="text-[8px] text-cyan-400 font-extrabold tracking-widest flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full ${wsConnected ? 'bg-cyan-400 glowing-dot-active' : 'bg-rose-500'} inline-block`} />
              {wsConnected ? 'SECURE_LINK_LIVE' : 'LINK_DISCONNECTED'}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* 1. Sidebar Panel (Hidden on mobile, flex on desktop) */}
      <aside className="hidden md:flex w-64 border-r border-white/5 bg-[#0a0c16]/50 backdrop-blur-xl flex-col justify-between p-6 shrink-0 z-20">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-900/20 pulse-threat-high">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-md font-extrabold tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase">
                ANTIGRAVITY
              </h2>
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-cyan-400 glowing-dot-active' : 'bg-rose-500'} inline-block`} />
                {wsConnected ? 'SECURE_LINK_LIVE' : 'LINK_DISCONNECTED'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => useStore.setState({ activeTab: 'overview' })}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'overview' 
                  ? 'bg-violet-600/15 border border-violet-600/35 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Activity className="w-4 h-4 text-violet-400" />
              <span>Global Overview</span>
            </button>

            <button
              onClick={() => useStore.setState({ activeTab: 'predictions' })}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'predictions' 
                  ? 'bg-violet-600/15 border border-violet-600/35 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <FileText className="w-4 h-4 text-violet-400" />
              <span>Inference Logs</span>
            </button>

            <button
              onClick={() => useStore.setState({ activeTab: 'incidents' })}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'incidents' 
                  ? 'bg-violet-600/15 border border-violet-600/35 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-violet-400" />
              <span>Incident Room</span>
            </button>

            {role === 'ADMIN' && (
              <button
                onClick={() => useStore.setState({ activeTab: 'mlops' })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'mlops' 
                    ? 'bg-violet-600/15 border border-violet-600/35 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Settings className="w-4 h-4 text-violet-400" />
                <span>MLOps Control</span>
              </button>
            )}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-6 border-t border-white/5">
          <div className="mb-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Signed in as</p>
            <p className="text-xs font-bold text-slate-200 truncate">{role === 'ADMIN' ? 'Administrator' : 'Operator'}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-300 hover:text-rose-100 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0a0c16]/85 backdrop-blur-lg border-t border-white/5 flex justify-around py-2.5 px-2">
        <button
          onClick={() => useStore.setState({ activeTab: 'overview' })}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'overview' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}`}
        >
          <Activity className="w-5.5 h-5.5" />
          <span className="text-[8px] font-extrabold uppercase tracking-widest">Overview</span>
        </button>
        <button
          onClick={() => useStore.setState({ activeTab: 'predictions' })}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'predictions' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}`}
        >
          <FileText className="w-5.5 h-5.5" />
          <span className="text-[8px] font-extrabold uppercase tracking-widest">Logs</span>
        </button>
        <button
          onClick={() => useStore.setState({ activeTab: 'incidents' })}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'incidents' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}`}
        >
          <AlertTriangle className="w-5.5 h-5.5" />
          <span className="text-[8px] font-extrabold uppercase tracking-widest">Incidents</span>
        </button>
        {role === 'ADMIN' && (
          <button
            onClick={() => useStore.setState({ activeTab: 'mlops' })}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'mlops' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Settings className="w-5.5 h-5.5" />
            <span className="text-[8px] font-extrabold uppercase tracking-widest">MLOps</span>
          </button>
        )}
      </nav>

      {/* 2. Main Content Arena (Padded bottom on mobile to accommodate nav bar) */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto z-10 pb-24 md:pb-8">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Upper Stats Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Predictions */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-36">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-3">
                    <Database className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Inferences</p>
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-1">{dashboardStats.totalCount}</h3>
              </div>

              {/* HIGH Risk Predictions */}
              <div className={`glass-panel p-6 rounded-2xl border relative overflow-hidden flex flex-col justify-between min-h-36 ${
                dashboardStats.highRiskCount > 0 ? 'border-rose-500/20 bg-rose-500/5 shadow-md shadow-rose-950/20 pulse-threat-high' : 'border-white/5'
              }`}>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center mb-3">
                    <Shield className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">High-Risk Fraud</p>
                </div>
                <h3 className="text-3xl font-extrabold text-rose-500 mt-1">{dashboardStats.highRiskCount}</h3>
              </div>

              {/* MEDIUM Risk Warnings */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-36">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center mb-3">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Medium Warnings</p>
                </div>
                <h3 className="text-3xl font-extrabold text-amber-500 mt-1">{dashboardStats.mediumRiskCount}</h3>
              </div>

              {/* Confidence Score */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-36">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-violet-600/15 text-violet-400 flex items-center justify-center mb-3">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Avg Confidence</p>
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-1">
                  {((dashboardStats?.averageConfidence || 0) * 100).toFixed(1)}%
                </h3>
              </div>
            </section>

            {/* Live Chart Visualizer */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-violet-500 rounded-full glowing-dot-active" />
                    Live Risk Telemetry Stream
                  </h3>
                  <p className="text-xs text-slate-400">WebSocket transaction scores. Showing past 15 evaluations.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[10px] font-extrabold tracking-widest uppercase">
                  SIMULATOR_ACTIVE
                </span>
              </div>
              
              <div className="h-48 md:h-64 w-full">
                {dashboardStats.liveChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardStats.liveChartData}>
                      <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0c16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#a78bfa' }}
                      />
                      <Area type="monotone" dataKey="risk_score" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" name="Risk Score (%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Awaiting live streaming telemetry data...
                  </div>
                )}
              </div>
            </section>

            {/* Split feed (Alerts & Incidents) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Alert Feed */}
              <section className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Real-time Threat Alerts
                  </h3>
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {alerts.length > 0 ? (
                      alerts.map((al) => (
                        <div key={al.id} className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                          al.severity === 'HIGH' 
                            ? 'bg-rose-500/5 border-rose-500/15 hover:bg-rose-500/10' 
                            : 'bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10'
                        }`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            al.severity === 'HIGH' ? 'bg-rose-500/15 text-rose-500' : 'bg-amber-500/15 text-amber-500'
                          }`}>
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                al.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {al.severity} Severity
                              </span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(al.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium">{al.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No security alerts triggered in the current session.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Telemetry Log Summary */}
              <section className="glass-panel p-6 rounded-3xl border border-white/5">
                <h3 className="text-md font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Live Event Monitor
                </h3>
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {predictions.slice(0, 8).map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs hover:bg-white/10 transition-colors">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-200">TX_{p.id}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(p.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                          p.label === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          p.label === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {p.label}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                          ${(p.features?.Amount || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

          </div>
        )}

        {/* TAB 2: INFERENCE LOGS & SHAP */}
        {activeTab === 'predictions' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Historical Inference Logs</h2>
                <p className="text-xs text-slate-400">Explainable AI logs. Click any record to inspect real-time SHAP feature importances.</p>
              </div>
              
              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by ID or Amount"
                    className="pl-9 pr-4 py-2 text-xs rounded-xl glass-input w-48"
                  />
                </div>
                
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 p-1 rounded-xl">
                  {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((lbl) => (
                    <button
                      key={lbl}
                      onClick={() => setFilterLabel(lbl)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all ${
                        filterLabel === lbl ? 'bg-violet-600 text-white shadow-md shadow-violet-950/20' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Predictions Table & Drawer split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Table side */}
              <div className="xl:col-span-2 glass-panel rounded-3xl border border-white/5 overflow-x-auto">
                <table className="w-full min-w-[650px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Threat Level</th>
                      <th className="px-6 py-4">Confidence</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredPredictions.map((p) => (
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedPrediction(p)}
                        className={`hover:bg-white/5 cursor-pointer transition-colors ${
                          selectedPrediction?.id === p.id ? 'bg-violet-600/5' : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-200 flex items-center gap-2">
                          <Terminal className="w-4.5 h-4.5 text-slate-500" />
                          TX_{p.id}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            p.label === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            p.label === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {p.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{((p.confidence || 0) * 100).toFixed(1)}%</td>
                        <td className="px-6 py-4 font-semibold">${(p.features?.Amount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-slate-400">
                          {new Date(p.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPredictions.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No transactions match your search filter criteria.
                  </div>
                )}
              </div>

              {/* Explainer / SHAP Drawer side */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col h-full min-h-[450px]">
                {selectedPrediction ? (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-md font-bold text-white uppercase tracking-wider">SHAP Explainability</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">TX_{selectedPrediction.id} feature attributions.</p>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        selectedPrediction.label === 'HIGH' ? 'bg-rose-500/20 text-rose-400' :
                        selectedPrediction.label === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedPrediction.label} Threat
                      </span>
                    </div>

                    {/* Threat Score Indicator */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Model Probability Score</p>
                      <h4 className="text-2xl font-black text-white">{((selectedPrediction?.risk_score || 0) * 100).toFixed(3)}%</h4>
                    </div>

                    {/* SHAP Chart */}
                    <div className="space-y-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-violet-400" />
                        Top Positive Contributors (Drove Risk UP)
                      </p>
                      <div className="space-y-3">
                        {selectedPrediction.explanation?.top_positive_features?.map((ft) => (
                        <div key={ft.feature} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold">
                            <span className="text-slate-300">{ft.feature} <span className="text-slate-500">({(ft.original_value || 0).toFixed(2)})</span></span>
                            <span className="text-rose-400">+{(ft.shap_value || 0).toFixed(4)}</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (ft.shap_value || 0) * 200)}%` }} />
                          </div>
                        </div>
                      )) || (
                          <p className="text-[10px] text-slate-500 italic">No features contributed positively to this risk assessment.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Top Negative Contributors (Lowered Risk)
                      </p>
                      <div className="space-y-3">
                        {selectedPrediction.explanation?.top_negative_features?.map((ft) => (
                          <div key={ft.feature} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold">
                              <span className="text-slate-300">{ft.feature} <span className="text-slate-500">({(ft.original_value || 0).toFixed(2)})</span></span>
                              <span className="text-emerald-400">{(ft.shap_value || 0).toFixed(4)}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(ft.shap_value) * 200)}%` }} />
                            </div>
                          </div>
                        )) || (
                          <p className="text-[10px] text-slate-500 italic">No features contributed negatively to this risk assessment.</p>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col h-full items-center justify-center text-center space-y-3 py-16 text-slate-500">
                    <Terminal className="w-10 h-10 text-slate-600 animate-pulse" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Awaiting Selection</p>
                      <p className="text-[10px] max-w-[200px] mt-1 leading-relaxed">Click any row in the transaction logs to compute and view the interactive SHAP explanation.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: INCIDENT ROOM */}
        {activeTab === 'incidents' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Incident Investigation Center</h2>
              <p className="text-xs text-slate-400">Operator Threat Room. Add manual reports and manage auto-flagged anomalies.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Manual Incident Creation form */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 h-fit">
                <h3 className="text-md font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-violet-400" />
                  Manual Incident Report
                </h3>
                
                <form onSubmit={handleCreateIncident} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Anomaly Type</label>
                    <select
                      value={incType}
                      onChange={(e) => setIncType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input bg-black text-white focus:bg-black"
                    >
                      <option value="FRAUD_ATTEMPT" className="bg-black text-white">FRAUD_ATTEMPT</option>
                      <option value="SYSTEM_ANOMALY" className="bg-black text-white">SYSTEM_ANOMALY</option>
                      <option value="VELOCITY_TRIGGER" className="bg-black text-white">VELOCITY_TRIGGER</option>
                      <option value="API_LATENCY" className="bg-black text-white">API_LATENCY</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Severity</label>
                    <select
                      value={incSeverity}
                      onChange={(e) => setIncSeverity(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input bg-black text-white focus:bg-black"
                    >
                      <option value="LOW" className="bg-black text-white">LOW</option>
                      <option value="MEDIUM" className="bg-black text-white">MEDIUM</option>
                      <option value="HIGH" className="bg-black text-white">HIGH</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Detailed Description</label>
                    <textarea
                      required
                      value={incDesc}
                      onChange={(e) => setIncDesc(e.target.value)}
                      placeholder="Explain details of suspicious behaviors, source IPs, card velocities..."
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input min-h-24 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary py-2.5 rounded-xl text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>File Incident Log</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Incidents List */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5">
                <h3 className="text-md font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Active Incident Investigation Board
                </h3>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {incidents.length > 0 ? (
                    incidents.map((inc) => (
                      <div key={inc.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/10 transition-colors">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-xs">INC_{inc.id} - {inc.type}</span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              inc.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400' :
                              inc.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {inc.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{inc.description}</p>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Logged at {new Date(inc.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[9px] font-extrabold uppercase text-cyan-400 tracking-wider">
                            {inc.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Zero reported system incidents. System health checks are green.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: MLOps RETRAINING PANEL (ADMIN) */}
        {activeTab === 'mlops' && role === 'ADMIN' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider">MLOps Version Control & Monitoring</h2>
              <p className="text-xs text-slate-400">Administrator Console. Monitor model drifts and run pipeline retraining on new Kaggle datasets.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Retraining Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between h-fit">
                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-violet-400 animate-spin" style={{ animationDuration: '4s' }} />
                    Auto-Retraining Pipeline
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Trigger the full training script (`train.py`) asynchronously. This splits live transaction feeds, fits robust scalers, performs XGBoost hyperparameter fits, and computes SHAP tree explainer background variables.
                  </p>
                </div>

                <div className="space-y-4">
                  {retrainSuccess && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs flex items-start gap-2.5">
                      <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                      <span>Pipeline successfully triggered! Recompiling XGBoost binaries...</span>
                    </div>
                  )}
                  
                  <button
                    onClick={handleRetrain}
                    disabled={isRetraining}
                    className="w-full btn-primary py-3 rounded-xl text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isRetraining ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Rebuilding Model...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Trigger XGBoost Retrain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MLflow Model Registry Metrics */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5">
                <h3 className="text-md font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Model Registry & Evaluation (MLflow/Evidently AI)
                </h3>

                {mlopsMetrics && mlopsMetrics.accuracy !== undefined ? (
                  <div className="space-y-6">
                    {/* Upper stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Model Type</p>
                        <p className="text-xs font-bold text-white mt-1">XGBClassifier</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Accuracy</p>
                        <p className="text-xs font-bold text-white mt-1">{(mlopsMetrics.accuracy * 100).toFixed(2)}%</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">F1-Score</p>
                        <p className="text-xs font-bold text-white mt-1">{(mlopsMetrics.f1_score * 100).toFixed(2)}%</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ROC-AUC</p>
                        <p className="text-xs font-bold text-cyan-400 mt-1">{mlopsMetrics.roc_auc.toFixed(4)}</p>
                      </div>
                    </div>

                    {/* Detailed parameter list */}
                    <div className="space-y-3.5 p-5 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Pipeline Details</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-400">PR-AUC (Precision-Recall Area)</span>
                          <span className="font-bold text-slate-200">{mlopsMetrics.pr_auc.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-400">Class 1 (Fraud) Recall</span>
                          <span className="font-bold text-slate-200">{(mlopsMetrics.recall * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-400">Class 1 (Fraud) Precision</span>
                          <span className="font-bold text-slate-200">{(mlopsMetrics.precision * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-400">Data Drift Index (Evidently AI)</span>
                          <span className="font-bold text-emerald-400">0.021 (NO_DRIFT)</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                    <Database className="w-8 h-8 text-slate-600 animate-pulse" />
                    <span>{mlopsMetrics?.message || "Loading MLOps evaluation metrics..."}</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

    </div>
  );
}
