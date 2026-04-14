import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  BrainCircuit, 
  TrendingUp, 
  Zap, 
  Droplets, 
  Wind, 
  Flame, 
  CheckCircle2,
  Loader2,
  Info,
  DollarSign,
  LayoutDashboard,
  Scale,
  Sun,
  CloudRain,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Target,
  BarChart3,
  ShieldCheck,
  Search,
  FlaskConical,
  Calendar,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import DataService, { AICropAnalysis, RealtimeData } from '../services/dataService';
import { useAIRequest } from '../hooks/useAIRequest';
import { useNotifications } from '../context/NotificationContext';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

/**
 * @component FieldManagement
 * @description 农田管理模块。
 * 包含：地块统计、AI决策支持（智谱API预留）、经济效益分析、自动化硬件控制。
 */
const FieldManagement: React.FC<{ user: any, onNavigate: (tab: string) => void }> = ({ user, onNavigate }) => {
  const { t } = useTranslation();
  const { addNotification } = useNotifications();
  const [plots, setPlots] = useState<any[]>([]);
  const [activePlot, setActivePlot] = useState('');
  const {
    request: analyzeRequest,
    isLoading: isAnalyzing,
    error: analysisError,
    data: aiResult,
    stepText: analysisStepText,
    progress: analysisProgress
  } = useAIRequest(DataService.analyzeCropSuitability);
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [hardwareStatus, setHardwareStatus] = useState<Record<string, boolean>>({
    irrigation: false,
    ventilation: false,
    heating: false,
    lighting: false,
    fertilization: false
  });
  const [hardwareParams, setHardwareParams] = useState<any>({});
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsType, setSettingsType] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [targetCrop, setTargetCrop] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showConnectTutorial, setShowConnectTutorial] = useState(false);
  const [newPlot, setNewPlot] = useState({ 
    name: '', 
    area: '', 
    crop: '', 
    nextTillageDate: new Date().toISOString().split('T')[0] 
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const thresholds = useMemo(() => DataService.getThresholds(), []);

  // 检查地块是否处于预警状态
  const getPlotStatus = (plot: any) => {
    if (plot.isSimulated) return 'simulated';
    if (!plot.sensorData) return 'healthy';
    
    const data = plot.sensorData;
    let isWarning = false;
    let isDanger = false;

    for (const [key, value] of Object.entries(data)) {
      const threshold = thresholds[key];
      if (threshold && typeof value === 'number') {
        const range = threshold.max - threshold.min;
        const dangerMargin = range * 0.2; // 超出阈值范围 20% 视为危险
        
        if (value < threshold.min - dangerMargin || value > threshold.max + dangerMargin) {
          isDanger = true;
        } else if (value < threshold.min || value > threshold.max) {
          isWarning = true;
        }
      }
    }
    
    if (isDanger) return 'danger';
    if (isWarning) return 'warning';
    return 'healthy';
  };

  // 加载地块列表
  const loadPlots = async () => {
    const list = await DataService.getPlots(user?.username);
    setPlots(list);
    if (list.length > 0 && (!activePlot || !list.find(p => p.id === activePlot))) {
      setActivePlot(list[0].id);
    }
  };

  // 检查是否可以添加地块
  const canAddPlot = () => {
    const plan = user?.plan || '基础版';
    const isEnterprise = plan === '企业版' || plan === 'Enterprise Plan' || plan === 'Enterprise';
    const isPro = plan === '专业版' || plan === 'Pro Plan' || plan === 'Pro';
    const isBasic = plan === '基础版' || plan === 'Basic Plan' || plan === 'Basic';

    if (isEnterprise) return true;
    if (isPro && plots.length < 20) return true;
    if (isBasic && plots.length < 5) return true;
    return false;
  };

  // 加载数据
  const loadData = async () => {
    const data = await DataService.getRealtimeData(activePlot);
    setRealtimeData(data);
    
    const params = await DataService.getHardwareParams(activePlot);
    if (params) {
      setHardwareParams(params);
    }
  };

  // 加载AI分析数据
  const runAIAnalysis = async (customCrop?: string) => {
    if (!activePlot) return;
    try {
      await analyzeRequest(activePlot, customCrop);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    }
  };

  useEffect(() => {
    loadPlots();
  }, []);

  useEffect(() => {
    if (activePlot) {
      loadData();
      const currentPlot = plots.find(p => p.id === activePlot);
      if (currentPlot && currentPlot.status !== 'pending_setup') {
        runAIAnalysis();
      }
    }
    
    // 订阅数据更新
    const unsubscribe = DataService.subscribe(() => {
      if (activePlot) loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [activePlot, plots]);

  // 硬件控制逻辑
  const handleHardwareControl = async (type: 'irrigation' | 'ventilation' | 'heating' | 'lighting') => {
    const action = hardwareStatus[type] ? 'stop' : 'start';
    setActionLoading(type);
    try {
      await DataService.controlHardware(activePlot, type as any, action);
      setHardwareStatus(prev => ({ ...prev, [type]: !prev[type] }));
    } finally {
      setActionLoading(null);
    }
  };

  // 自动化施肥逻辑
  const handleFertilization = async () => {
    setActionLoading('fertilization');
    try {
      await DataService.executeFertilization(activePlot);
      setHardwareStatus(prev => ({ ...prev, fertilization: true }));
      setTimeout(() => setHardwareStatus(prev => ({ ...prev, fertilization: false })), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  // 添加地块逻辑
  const handleOpenConnectModal = () => {
    setShowConnectModal(true);
    const hasSeenTutorial = localStorage.getItem('hasSeenConnectTutorial');
    if (!hasSeenTutorial) {
      setShowConnectTutorial(true);
    }
  };

  const handleCloseConnectTutorial = () => {
    setShowConnectTutorial(false);
    localStorage.setItem('hasSeenConnectTutorial', 'true');
  };

  const getPlanName = (plan: string) => {
    if (plan === '企业版' || plan === 'Enterprise Plan' || plan === 'Enterprise') return t('app.enterprisePlan');
    if (plan === '专业版' || plan === 'Pro Plan' || plan === 'Pro') return t('app.proPlan');
    return t('app.basicPlan');
  };

  const handleAddPlot = async () => {
    if (!canAddPlot()) {
      addNotification({
        title: t('management.modals.limitTitle'),
        message: t('management.modals.limitMessage', { plan: getPlanName(user?.plan || '') }),
        type: 'warning'
      });
      return;
    }
    if (!newPlot.name || !newPlot.area || !newPlot.crop) return;
    const result = await DataService.addPlot({
      name: newPlot.name,
      area: Number(newPlot.area),
      crop: newPlot.crop,
      nextTillageDate: newPlot.nextTillageDate || undefined
    }, user?.username);
    setPlots(prev => [...prev, result]);
    setShowAddModal(false);
    setNewPlot({ 
      name: '', 
      area: '', 
      crop: '', 
      nextTillageDate: new Date().toISOString().split('T')[0] 
    });
    setActivePlot(result.id);
  };

  // 连接设备逻辑
  const handleConnectDevices = async () => {
    if (selectedDevices.length === 0) return;
    setIsConnecting(true);
    try {
      // 模拟连接过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      await DataService.connectPlotDevices(activePlot, selectedDevices);
      await loadPlots(); // 重新加载地块以获取最新状态
      setShowConnectModal(false);
      setSelectedDevices([]);
      runAIAnalysis(); // Trigger AI analysis now that it's unlocked
    } finally {
      setIsConnecting(false);
    }
  };

  const currentPlot = plots.find(p => p.id === activePlot);

  return (
    <div className="flex gap-8 h-full animate-in fade-in duration-500">
      {/* Plot List & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Plot Selector Sidebar */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-8">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('management.list.title')}</h2>
            <span className="text-[10px] font-black text-forest-green bg-forest-green/10 px-2 py-0.5 rounded-full">
              {t('management.list.count', { count: plots.length })}
            </span>
          </div>
          
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
            {plots.map((plot) => {
              const status = getPlotStatus(plot);
              const isWarning = status === 'warning';
              const isDanger = status === 'danger';
              const isActive = activePlot === plot.id;

              return (
                <motion.button
                  key={plot.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActivePlot(plot.id)}
                  className={cn(
                    "w-full text-left p-5 rounded-[24px] transition-all relative group overflow-hidden border",
                    isActive
                      ? "bento-card border-forest-green/30 shadow-xl shadow-forest-green/5"
                      : "bg-white/50 dark:bg-[#0A0A0A]/30 border-transparent hover:bg-white/80 dark:hover:bg-[#121214]/50"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-plot-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-forest-green rounded-r-full"
                    />
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                        isActive ? "bg-forest-green text-white" : "bg-slate-100 dark:bg-[#1A1A1A] text-slate-400"
                      )}>
                        <LayoutDashboard size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white">{plot.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{plot.crop}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      isDanger ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                      isWarning ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                      "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    )} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t('management.stats.soilMoisture')}</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-300">{plot.sensorData?.soilMoisture?.toFixed(1) || '32.5'}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t('management.stats.envTemp')}</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-300">{plot.sensorData?.temperature?.toFixed(1) || '24.8'}°C</p>
                    </div>
                  </div>

                  {plot.isSimulated && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[8px] font-black rounded uppercase tracking-tighter border border-indigo-500/20">
                      {t('management.stats.simulated')}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full py-4 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition-all border border-dashed border-slate-300 dark:border-white/10"
          >
            <Plus size={18} />
            {t('management.list.addPlot')}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Simulation Warning Banner */}
          {currentPlot?.isSimulated && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-10 dark:opacity-20" />
              <div className="relative p-8 rounded-[32px] border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/40 dark:bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/20 animate-pulse">
                    <Zap size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white mb-1">{t('management.modals.simulated_title')}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                      {t('management.modals.simulated_desc')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleOpenConnectModal}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-3 active:scale-95"
                >
                  <Plus size={20} />
                  {t('management.connectDevice')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              label={t('management.stats.totalArea')} 
              value={plots.reduce((acc, p) => acc + p.area, 0).toString()} 
              unit={t('management.stats.unitArea')} 
              icon={<LayoutDashboard className="text-blue-500" size={20} />} 
              color="blue"
            />
            <StatCard 
              label={t('management.stats.currentArea')} 
              value={currentPlot?.area.toString() || "0"} 
              unit={t('management.stats.unitArea')} 
              icon={<Scale className="text-emerald-500" size={20} />} 
              color="emerald"
            />
            <StatCard 
              label={t('management.stats.activeDevices')} 
              value={Object.values(hardwareStatus).filter(v => v).length.toString()} 
              unit={t('management.stats.unitDevice')} 
              icon={<Zap className="text-amber-500" size={20} />} 
              color="amber"
            />
            <StatCard 
              label={t('management.stats.estimatedRevenue')} 
              value={aiResult ? aiResult.expectedProfit.toLocaleString() : "---"} 
              unit={t('management.stats.unitCurrency')} 
              icon={<TrendingUp className="text-indigo-500" size={20} />} 
              color="indigo"
            />
          </div>

        {/* AI Decision Support Section */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[40px] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-white/80 dark:bg-[#050505]/60 backdrop-blur-2xl rounded-[40px] border border-white/20 dark:border-white/10 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <BrainCircuit size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t('management.ai.title')}</h3>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-500/20">{t('management.ai.model')}</span>
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('management.ai.subtitle')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={targetCrop}
                    onChange={(e) => setTargetCrop(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runAIAnalysis(targetCrop)}
                    placeholder={t('management.ai.placeholder')}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-2xl text-sm outline-none focus:border-indigo-500 transition-all dark:text-white"
                  />
                </div>
                <button 
                  onClick={() => runAIAnalysis(targetCrop)}
                  disabled={isAnalyzing}
                  className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  {targetCrop ? t('management.ai.targetAnalyze') : t('management.ai.smartRecommend')}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="py-20 flex flex-col items-center justify-center text-center"
                  >
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                      <div className="relative w-24 h-24 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-bounce">
                        <BrainCircuit size={48} />
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">{analysisStepText || t('management.ai.analyzing')}</h4>
                    <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">
                      {t('management.ai.analyzingDesc')}
                    </p>
                    <div className="mt-8 w-full max-w-xs h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${analysisProgress}%` }}
                        className="h-full bg-indigo-600"
                      />
                    </div>
                  </motion.div>
                ) : aiResult ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Recommendation Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-7 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                          <Target size={200} />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-6">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">{t('management.ai.bestRecommend')}</span>
                            <div className="h-px w-12 bg-white/20" />
                            <span className="text-[10px] font-bold text-white/60 uppercase font-mono">{t('management.ai.plotId')}: {activePlot}</span>
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
                            <div>
                              <p className="text-indigo-100/60 text-xs font-bold mb-1">{t('management.ai.suggestedCrop')}</p>
                              <h4 className="text-5xl font-black tracking-tight">{aiResult.recommendedCrop}</h4>
                            </div>
                            <div className="flex items-center gap-4 pb-1">
                              <div className="h-12 w-px bg-white/10 hidden md:block" />
                              <div>
                                <p className="text-indigo-100/60 text-[10px] font-bold mb-1 uppercase">{t('management.ai.matchingDegree')}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-black font-mono">{aiResult.suitability}%</span>
                                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${aiResult.suitability}%` }}
                                      className="h-full bg-emerald-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 p-1.5 bg-indigo-500/30 rounded-lg">
                                <Info size={16} className="text-indigo-200" />
                              </div>
                              <p className="text-sm text-indigo-50 font-medium leading-relaxed">
                                {aiResult.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-5 grid grid-cols-1 gap-4">
                        <div className="bg-slate-50 dark:bg-[#1A1A1A] rounded-[32px] p-6 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-500/20">
                              <DollarSign size={24} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg font-mono">{t('management.stats.yoy')}</span>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">{t('management.stats.estimatedRevenue')}</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight font-mono">¥{aiResult?.expectedProfit?.toLocaleString() || '0'}</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#1A1A1A] rounded-[32px] p-6 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20">
                              <ShieldCheck size={24} />
                            </div>
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg font-mono">{t('management.ai.highConfidence')}</span>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">{t('management.ai.confidenceLevel')}</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight font-mono">94.2%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Yield Comparison Chart */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div className="bg-white dark:bg-[#121214] rounded-[32px] p-8 border border-slate-100 dark:border-white/5 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white mb-8 flex items-center gap-2">
                          <BarChart3 size={18} className="text-indigo-600" />
                          {t('management.ai.revenueComparison')}
                        </h4>
                        <div className="h-[240px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: aiResult.recommendedCrop, profit: aiResult.expectedProfit, isRecommended: true },
                                ...aiResult.alternatives.map(alt => ({ name: alt.crop, profit: alt.expectedProfit, isRecommended: false }))
                              ]}
                              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                dy={10}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'monospace' }}
                                tickFormatter={(value) => `¥${value/1000}k`}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ 
                                  borderRadius: '20px', 
                                  border: 'none', 
                                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                                  padding: '16px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                  backdropFilter: 'blur(8px)'
                                }}
                                itemStyle={{ color: '#1e293b', fontWeight: 800, fontFamily: 'monospace' }}
                                labelStyle={{ color: '#64748b', marginBottom: '4px', fontWeight: 700 }}
                                formatter={(value: number) => [`¥${value.toLocaleString()}`, t('management.stats.estimatedRevenue')]}
                              />
                              <Bar dataKey="profit" radius={[8, 8, 0, 0]} barSize={40}>
                                {[
                                  { isRecommended: true },
                                  ...aiResult.alternatives.map(() => ({ isRecommended: false }))
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.isRecommended ? '#4f46e5' : '#cbd5e1'} className={entry.isRecommended ? '' : 'dark:fill-slate-700'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#1A1A1A] rounded-[32px] p-8 border border-slate-100 dark:border-white/5">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white mb-6">{t('management.ai.altAnalysis')}</h4>
                        <div className="space-y-4">
                          {aiResult.alternatives.map((alt, i) => (
                            <div key={i} className="bg-white dark:bg-[#0A0A0A] rounded-2xl p-5 border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 dark:bg-[#1A1A1A] text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 transition-colors">
                                  <Scale size={20} />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-white">{alt.crop}</p>
                                  <p className="text-[10px] font-bold text-slate-400 font-mono">{t('management.ai.matchingDegree')} {alt.suitability}%</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-slate-800 dark:text-white font-mono">¥{alt?.expectedProfit?.toLocaleString() || '0'}</p>
                                <p className="text-[10px] text-emerald-500 font-bold">{t('management.stats.estimatedRevenue')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                          <p className="text-[10px] font-bold text-indigo-900/70 dark:text-indigo-300/70 leading-relaxed">
                            <Zap size={12} className="inline mr-1 text-indigo-600" />
                            {t('management.ai.comparisonSummary', { recommended: aiResult.recommendedCrop, profitInc: '15.4%', riskDec: '8.2%' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-20 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-20 h-20 bg-slate-50 dark:bg-[#1A1A1A] text-slate-300 dark:text-slate-600 rounded-[32px] flex items-center justify-center mb-6 border border-dashed border-slate-200 dark:border-white/10">
                      <BrainCircuit size={40} />
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">{t('management.ai.readyTitle')}</h4>
                    <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs mb-8">
                      {t('management.ai.readyDesc')}
                    </p>
                    <button 
                      onClick={() => runAIAnalysis()}
                      className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                      {t('management.ai.startAnalysis')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Hardware Control Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
          {currentPlot?.status === 'pending_setup' && (
            <div className="absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-[4px] rounded-[32px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-indigo-500/30">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-500/30">
                <Zap size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">{t('management.hardware.unavailable')}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                {t('management.hardware.desc')}
              </p>
              <button 
                onClick={handleOpenConnectModal}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-black hover:bg-amber-700 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                {t('management.hardware.config')}
              </button>
            </div>
          )}
          {/* Remote Controls */}
          <div className="bg-white/80 dark:bg-[#050505]/60 backdrop-blur-2xl rounded-[40px] p-8 border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{t('management.hardware.remoteTitle')}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('management.hardware.remoteSubtitle')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <ControlToggle 
                label={t('management.hardware.irrigation')} 
                icon={<Droplets size={20} />} 
                active={hardwareStatus.irrigation}
                loading={actionLoading === 'irrigation'}
                onClick={() => handleHardwareControl('irrigation')}
                onSettingsClick={() => { setSettingsType('irrigation'); setShowSettingsModal(true); }}
                desc={t('management.hardware.irrigationDesc')}
              />
              <ControlToggle 
                label={t('management.hardware.ventilation')} 
                icon={<Wind size={20} />} 
                active={hardwareStatus.ventilation}
                loading={actionLoading === 'ventilation'}
                onClick={() => handleHardwareControl('ventilation')}
                onSettingsClick={() => { setSettingsType('ventilation'); setShowSettingsModal(true); }}
                desc={t('management.hardware.ventilationDesc')}
              />
              <ControlToggle 
                label={t('management.hardware.heating')} 
                icon={<Flame size={20} />} 
                active={hardwareStatus.heating}
                loading={actionLoading === 'heating'}
                onClick={() => handleHardwareControl('heating')}
                onSettingsClick={() => { setSettingsType('heating'); setShowSettingsModal(true); }}
                desc={t('management.hardware.heatingDesc')}
              />
              <ControlToggle 
                label={t('management.hardware.lighting')} 
                icon={<Sun size={20} />} 
                active={hardwareStatus.lighting}
                loading={actionLoading === 'lighting'}
                onClick={() => handleHardwareControl('lighting')}
                onSettingsClick={() => { setSettingsType('lighting'); setShowSettingsModal(true); }}
                desc={t('management.hardware.lightingDesc')}
              />
            </div>
          </div>

          {/* Automated Fertilization */}
          <div className="bg-white/80 dark:bg-[#050505]/60 backdrop-blur-2xl rounded-[40px] p-8 border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <FlaskConical size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{t('management.hardware.fertilizationTitle')}</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('management.hardware.fertilizationSubtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => { setSettingsType('fertilization'); setShowSettingsModal(true); }}
                className="p-3 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A1A] transition-colors"
              >
                <Target size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#1A1A1A] rounded-[32px] border border-slate-100 dark:border-white/5">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500 border border-transparent dark:border-white/5",
                hardwareStatus.fertilization 
                  ? "bg-emerald-500 text-white scale-110 shadow-xl shadow-emerald-500/20" 
                  : "bg-white dark:bg-[#1A1A1A] text-slate-300 dark:text-slate-600 shadow-sm"
              )}>
                {actionLoading === 'fertilization' ? <Loader2 className="animate-spin" size={32} /> : <FlaskConical size={32} />}
              </div>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-[200px] font-medium">
                {hardwareStatus.fertilization ? t('management.hardware.fertilizationActive') : t('management.hardware.fertilizationInactive')}
              </p>
              <button 
                onClick={handleFertilization}
                disabled={!!actionLoading}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 active:scale-95",
                  hardwareStatus.fertilization 
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default" 
                    : "bg-forest-green text-white hover:bg-emerald-green shadow-lg shadow-forest-green/20"
                )}
              >
                {hardwareStatus.fertilization ? t('management.hardware.fertilizing') : t('management.hardware.startFertilization')}
              </button>
            </div>
          </div>
        </section>
      </div>
      </div>

      {/* 硬件参数设置弹窗 */}
      <AnimatePresence>
        {showSettingsModal && settingsType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#121214] rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-white/10"
            >
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-[#1A1A1A] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">参数设置</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {settingsType === 'irrigation' ? '灌溉系统' :
                     settingsType === 'ventilation' ? '通风系统' :
                     settingsType === 'heating' ? '加热系统' :
                     settingsType === 'lighting' ? '补光系统' : '施肥系统'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {settingsType === 'irrigation' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">灌溉时长 (分钟)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.irrigation?.duration || 30}
                        onChange={e => setHardwareParams({ ...hardwareParams, irrigation: { ...hardwareParams.irrigation, duration: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">目标土壤湿度 (%)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.irrigation?.targetMoisture || 60}
                        onChange={e => setHardwareParams({ ...hardwareParams, irrigation: { ...hardwareParams.irrigation, targetMoisture: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </>
                )}
                {settingsType === 'ventilation' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">通风时长 (分钟)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.ventilation?.duration || 15}
                        onChange={e => setHardwareParams({ ...hardwareParams, ventilation: { ...hardwareParams.ventilation, duration: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">目标温度 (°C)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.ventilation?.targetTemp || 25}
                        onChange={e => setHardwareParams({ ...hardwareParams, ventilation: { ...hardwareParams.ventilation, targetTemp: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </>
                )}
                {settingsType === 'heating' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">加热时长 (分钟)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.heating?.duration || 60}
                        onChange={e => setHardwareParams({ ...hardwareParams, heating: { ...hardwareParams.heating, duration: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">目标温度 (°C)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.heating?.targetTemp || 20}
                        onChange={e => setHardwareParams({ ...hardwareParams, heating: { ...hardwareParams.heating, targetTemp: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </>
                )}
                {settingsType === 'lighting' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">补光时长 (分钟)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.lighting?.duration || 120}
                        onChange={e => setHardwareParams({ ...hardwareParams, lighting: { ...hardwareParams.lighting, duration: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">目标光照强度 (Lux)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.lighting?.targetLight || 50000}
                        onChange={e => setHardwareParams({ ...hardwareParams, lighting: { ...hardwareParams.lighting, targetLight: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </>
                )}
                {settingsType === 'fertilization' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">施肥量 (kg/亩)</label>
                      <input 
                        type="number" 
                        value={hardwareParams.fertilization?.amount || 15}
                        onChange={e => setHardwareParams({ ...hardwareParams, fertilization: { ...hardwareParams.fertilization, amount: Number(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">肥料类型</label>
                      <select 
                        value={hardwareParams.fertilization?.type || '复合肥'}
                        onChange={e => setHardwareParams({ ...hardwareParams, fertilization: { ...hardwareParams.fertilization, type: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                      >
                        <option value="复合肥">复合肥</option>
                        <option value="尿素">尿素</option>
                        <option value="磷酸二氢钾">磷酸二氢钾</option>
                        <option value="有机肥">有机肥</option>
                      </select>
                    </div>
                  </>
                )}
                
                <button 
                  onClick={async () => {
                    await DataService.updateHardwareParams(activePlot, settingsType, hardwareParams[settingsType]);
                    setShowSettingsModal(false);
                    addNotification({
                      title: '设置已保存',
                      message: '自动化执行参数已更新',
                      type: 'success'
                    });
                  }}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 mt-4"
                >
                  保存设置
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 添加地块弹窗 */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0A0A0A] rounded-[32px] p-10 shadow-2xl border border-transparent dark:border-white/10"
            >
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <Plus className="text-forest-green dark:text-emerald-400" />
                {t('management.modals.addTitle')}
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('management.modals.plotName')}</label>
                  <input 
                    type="text" 
                    value={newPlot.name}
                    onChange={e => setNewPlot({...newPlot, name: e.target.value})}
                    placeholder={t('management.modals.plotNamePlaceholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A]/50 text-slate-800 dark:text-white focus:border-forest-green dark:focus:border-emerald-500 focus:ring-2 focus:ring-forest-green/20 dark:focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('management.modals.plotArea')}</label>
                  <input 
                    type="number" 
                    value={newPlot.area}
                    onChange={e => setNewPlot({...newPlot, area: e.target.value})}
                    placeholder={t('management.modals.plotAreaPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A]/50 text-slate-800 dark:text-white focus:border-forest-green dark:focus:border-emerald-500 focus:ring-2 focus:ring-forest-green/20 dark:focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('management.modals.currentCrop')}</label>
                  <input 
                    type="text" 
                    value={newPlot.crop}
                    onChange={e => setNewPlot({...newPlot, crop: e.target.value})}
                    placeholder={t('management.modals.currentCropPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A]/50 text-slate-800 dark:text-white focus:border-forest-green dark:focus:border-emerald-500 focus:ring-2 focus:ring-forest-green/20 dark:focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('management.modals.nextTillage')}</label>
                  <input 
                    type="date" 
                    value={newPlot.nextTillageDate}
                    onChange={e => setNewPlot({...newPlot, nextTillageDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A]/50 text-slate-800 dark:text-white focus:border-forest-green dark:focus:border-emerald-500 focus:ring-2 focus:ring-forest-green/20 dark:focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-10">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="py-4 rounded-xl font-bold text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  {t('app.cancel')}
                </button>
                <button 
                  onClick={handleAddPlot}
                  className="py-4 bg-forest-green text-white rounded-xl font-bold hover:bg-emerald-green transition-all shadow-lg shadow-forest-green/20"
                >
                  {t('management.modals.confirmAdd')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showConnectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowConnectModal(false);
                setShowConnectTutorial(false);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0A0A0A] rounded-[40px] p-10 shadow-2xl border border-transparent dark:border-white/10"
            >
              <AnimatePresence>
                {showConnectTutorial && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-[110%] bg-indigo-600 text-white p-6 rounded-3xl shadow-2xl z-50 flex items-start gap-4"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                      <Info size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-black mb-2">{t('management.modals.tutorialTitle')}</h4>
                      <p className="text-sm text-indigo-100 leading-relaxed mb-4">
                        {t('management.modals.tutorialDesc')}
                      </p>
                      <button 
                        onClick={handleCloseConnectTutorial}
                        className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors"
                      >
                        {t('management.modals.tutorialConfirm')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t('management.modals.connectTitle')}</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('management.modals.connectSubtitle', { name: currentPlot?.name })}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConnectModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {[
                  { id: 'sensor_hub', name: t('management.hardware.devices.sensorHub.name'), type: 'sensor', desc: t('management.hardware.devices.sensorHub.desc') },
                  { id: 'soil_probe', name: t('management.hardware.devices.soilProbe.name'), type: 'sensor', desc: t('management.hardware.devices.soilProbe.desc') },
                  { id: 'irrigation_valve', name: t('management.hardware.devices.irrigationValve.name'), type: 'actuator', desc: t('management.hardware.devices.irrigationValve.desc') },
                  { id: 'ventilation_system', name: t('management.hardware.devices.ventilationSystem.name'), type: 'actuator', desc: t('management.hardware.devices.ventilationSystem.desc') },
                  { id: 'lighting_array', name: t('management.hardware.devices.lightingArray.name'), type: 'actuator', desc: t('management.hardware.devices.lightingArray.desc') },
                  { id: 'fertilizer_injector', name: t('management.hardware.devices.fertilizerInjector.name'), type: 'actuator', desc: t('management.hardware.devices.fertilizerInjector.desc') }
                ].map(device => {
                  const isSelected = selectedDevices.includes(device.id);
                  return (
                    <div 
                      key={device.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDevices(selectedDevices.filter(id => id !== device.id));
                        } else {
                          setSelectedDevices([...selectedDevices, device.id]);
                        }
                      }}
                      className={cn(
                        "p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-start gap-4 hover:scale-[1.02] active:scale-95",
                        isSelected 
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" 
                          : "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1A1A1A]/50 hover:border-slate-200 dark:hover:border-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        isSelected ? "bg-indigo-600 text-white" : "bg-white dark:bg-[#0A0A0A] text-slate-400 border border-slate-100 dark:border-white/5"
                      )}>
                        {device.type === 'sensor' ? <Search size={20} /> : <Zap size={20} />}
                      </div>
                      <div>
                        <p className={cn("font-bold text-sm mb-1", isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-white")}>
                          {device.name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">{device.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-[#222] transition-all"
                >
                  {t('app.cancel')}
                </button>
                <button 
                  onClick={handleConnectDevices}
                  disabled={isConnecting || selectedDevices.length === 0}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      {t('management.modals.connecting')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={24} />
                      {t('management.modals.confirmConnect')} ({selectedDevices.length})
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Helper Components ---

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: "hover:border-blue-500/30 dark:hover:border-blue-500/30",
    emerald: "hover:border-emerald-500/30 dark:hover:border-emerald-500/30",
    amber: "hover:border-amber-500/30 dark:hover:border-amber-500/30",
    indigo: "hover:border-indigo-500/30 dark:hover:border-indigo-500/30",
    rose: "hover:border-rose-500/30 dark:hover:border-rose-500/30",
  };

  const iconBgClasses = {
    blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className={cn(
      "bg-white/80 dark:bg-[#050505]/40 backdrop-blur-xl rounded-3xl p-5 card-shadow border border-white/20 dark:border-white/10 flex items-center gap-4 transition-all hover:scale-105 hover:shadow-xl group relative overflow-hidden",
      colorClasses[color]
    )}>
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-slate-500/5 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-500/10 dark:group-hover:bg-white/10 transition-colors" />
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center border border-transparent dark:border-white/5 group-hover:scale-110 transition-transform shadow-inner",
        iconBgClasses[color]
      )}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-slate-800 dark:text-white font-mono tracking-tight">{value}</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{unit}</span>
        </div>
      </div>
    </div>
  );
};

interface ControlToggleProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  loading: boolean;
  onClick: () => void;
  onSettingsClick?: () => void;
  desc: string;
}

const ControlToggle: React.FC<ControlToggleProps> = ({ label, icon, active, loading, onClick, onSettingsClick, desc }) => {
  const { t } = useTranslation();
  return (
    <div className={cn(
      "p-6 rounded-[32px] border transition-all flex items-center justify-between group hover:shadow-2xl relative overflow-hidden",
      active 
        ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 dark:border-emerald-500/30" 
        : "border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#0A0A0A]/40 backdrop-blur-md hover:border-slate-200 dark:hover:border-white/10"
    )}>
      {active && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 right-0 p-3"
        >
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
        </motion.div>
      )}
      <div className="flex items-center gap-5">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border border-transparent dark:border-white/5 group-hover:scale-110 shadow-inner",
          active 
            ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30" 
            : "bg-slate-50 dark:bg-[#1A1A1A]/80 text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:group-hover:bg-[#2A2A2A]"
        )}>
          {loading ? <Loader2 className="animate-spin" size={24} /> : icon}
        </div>
        <div>
          <p className={cn("font-black text-base transition-colors tracking-tight", active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-white")}>{label}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-3 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A1A] transition-colors"
          >
            <Target size={18} />
          </button>
        )}
        <button 
          onClick={onClick}
          disabled={loading}
          className={cn(
            "px-8 py-3 rounded-2xl text-sm font-black transition-all active:scale-95",
            active 
              ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-600" 
              : "bg-slate-100 dark:bg-[#1A1A1A] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#2A2A2A]"
          )}
        >
          {active ? t('management.hardware.active') : t('management.hardware.start')}
        </button>
      </div>
    </div>
  );
};

export default FieldManagement;
