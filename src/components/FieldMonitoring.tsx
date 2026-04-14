import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Activity,
  FlaskConical, 
  AlertCircle, 
  History, 
  BarChart3, 
  LineChart as LineChartIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
  X,
  Download,
  Zap,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { utils, writeFile } from 'xlsx';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import DataService, { RealtimeData, HistoryItem, Thresholds } from '../services/dataService';
import { cn } from '../lib/utils';
import { useNotifications } from '../context/NotificationContext';

// --- Components ---
const FieldMonitoring: React.FC<{ user: any, onNavigate: (tab: string) => void, initialPlotId?: string, navKey?: number }> = ({ user, onNavigate, initialPlotId, navKey }) => {
  const { t } = useTranslation();
  const [plots, setPlots] = useState<any[]>([]);
  const [activePlot, setActivePlot] = useState(initialPlotId || '');

  // Update activePlot if initialPlotId changes and scroll to it
  useEffect(() => {
    if (initialPlotId && plots.length > 0) {
      setActivePlot(initialPlotId);
      setTimeout(() => {
        const el = document.getElementById(`plot-card-${initialPlotId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else if (initialPlotId) {
      // Still set active plot even if plots aren't loaded yet
      setActivePlot(initialPlotId);
    }
  }, [initialPlotId, navKey, plots.length]);

  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [allPlotsData, setAllPlotsData] = useState<Record<string, RealtimeData>>({});
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState('7d');
  const [chartPlotId, setChartPlotId] = useState<string>('all');
  const [selectedParams, setSelectedParams] = useState<string[]>(['temperature', 'humidity', 'soilMoisture']);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [detailItem, setDetailItem] = useState<HistoryItem | null>(null);
  const [calibratingSensor, setCalibratingSensor] = useState<string | null>(null);
  const [calibrationReason, setCalibrationReason] = useState('');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const { addNotification } = useNotifications();

  const thresholds = useMemo(() => DataService.getThresholds(), []);

  // --- Helper Functions ---
  function getParamLabel(key: string): string {
    const labels: any = {
      temperature: t('monitoring.params.temperature'), 
      humidity: t('monitoring.params.humidity'), 
      light: t('monitoring.params.light'),
      soilTemp: t('monitoring.params.soilTemp'),
      soilMoisture: t('monitoring.params.soilMoisture'), 
      pH: t('monitoring.params.soilPh'),
      nitrogen: t('monitoring.params.nitrogen'),
      phosphorus: t('monitoring.params.phosphorus'),
      potassium: t('monitoring.params.potassium')
    };
    return labels[key] || key;
  }

  function getParamUnit(key: string): string {
    const units: any = {
      temperature: '℃', humidity: '%RH', light: 'Lux',
      soilTemp: '℃', soilMoisture: '%', pH: 'pH',
      nitrogen: 'mg/kg', phosphorus: 'mg/kg', potassium: 'mg/kg'
    };
    return units[key] || '';
  }

  function getParamIcon(key: string): React.ReactNode {
    switch (key) {
      case 'temperature': case 'soilTemp': return <Thermometer size={18} />;
      case 'humidity': case 'soilMoisture': return <Droplets size={18} />;
      case 'light': return <Sun size={18} />;
      case 'pH': case 'nitrogen': case 'phosphorus': case 'potassium': return <FlaskConical size={18} />;
      default: return <Info size={18} />;
    }
  }

  function getStatus(key: string, value: number, thresholds: Thresholds): 'normal' | 'low' | 'high' {
    const tr = thresholds[key];
    if (!tr) return 'normal';
    if (value < tr.min) return 'low';
    if (value > tr.max) return 'high';
    return 'normal';
  }

  function getParamColor(index: number, opacity: number = 1): string {
    const colors = [
      `rgba(46, 125, 50, ${opacity})`,   // Forest Green
      `rgba(76, 175, 80, ${opacity})`,   // Emerald Green
      `rgba(59, 130, 246, ${opacity})`,  // Blue
      `rgba(245, 158, 11, ${opacity})`,  // Amber
      `rgba(239, 68, 68, ${opacity})`,   // Red
    ];
    return colors[index % colors.length];
  }

  function renderHistoryValue(key: string, value: number, unit: string, thresholds: Thresholds) {
    const status = getStatus(key, value, thresholds);
    
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md",
        status === 'high' ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" :
        status === 'low' ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" :
        "text-slate-800 dark:text-slate-200"
      )}>
        <span className="font-mono font-bold">{value.toFixed(2)}{unit}</span>
        {status === 'high' && <ArrowUp size={14} />}
        {status === 'low' && <ArrowDown size={14} />}
      </div>
    );
  }

  interface MonitorCardProps {
    label: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    status: 'normal' | 'low' | 'high';
  }

  const MonitorCard: React.FC<MonitorCardProps> = ({ label, value, unit, icon, status }) => {
    const statusConfig = {
      normal: { label: t('app.online'), color: 'text-emerald-500', bg: 'bg-white dark:bg-[#0A0A0A]/50 dark:backdrop-blur-xl', border: 'border-slate-100 dark:border-white/10' },
      low: { label: t('management.status.warning'), color: 'text-orange-500', bg: 'bg-orange-50/50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20' },
      high: { label: t('management.status.danger'), color: 'text-red-500', bg: 'bg-red-50/50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' }
    };

    const config = statusConfig[status];

    return (
      <div className={cn(
        "bento-card p-6 transition-all hover:scale-105 duration-300",
        config.bg,
        config.border
      )}>
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-2 rounded-xl bg-white dark:bg-[#050505]/50 shadow-sm border border-slate-100 dark:border-white/5", config.color)}>
            {icon}
          </div>
          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg bg-white dark:bg-[#050505]/50 shadow-sm border border-slate-100 dark:border-white/5", config.color)}>
            {config.label}
          </span>
        </div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{value.toFixed(2)}</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{unit}</span>
        </div>
      </div>
    );
  };

  // 初始化数据加载
  useEffect(() => {
    const init = async () => {
      const list = await DataService.getPlots(user?.username);
      setPlots(list);
      if (list.length > 0) {
        setActivePlot(prev => prev || list[0].id);
      }
      
      // Load all plots realtime data
      const dataMap: Record<string, RealtimeData> = {};
      for (const plot of list) {
        dataMap[plot.id] = await DataService.getRealtimeData(plot.id);
      }
      setAllPlotsData(dataMap);
    };
    init();
  }, [user]);

  useEffect(() => {
    if (activePlot) {
      loadRealtime();
      loadHistory(1);
      loadChartData();
    }

    // 订阅数据更新
    const unsubscribe = DataService.subscribe(() => {
      if (activePlot) loadRealtime();
      // Also update all plots data
      if (plots.length > 0) {
        (async () => {
          const dataMap: Record<string, RealtimeData> = {};
          for (const plot of plots) {
            dataMap[plot.id] = await DataService.getRealtimeData(plot.id);
          }
          setAllPlotsData(dataMap);
        })();
      }
    });
    return () => unsubscribe();
  }, [activePlot, plots]);

  // 监听参数或时间范围变化更新图表
  useEffect(() => {
    if (activePlot) loadChartData();
  }, [timeRange, selectedParams, chartPlotId, activePlot]);

  const loadRealtime = async () => {
    const data = await DataService.getRealtimeData(activePlot);
    setRealtimeData(data);
    checkAlerts(data);
  };

  const loadHistory = async (page: number) => {
    const { total, list } = await DataService.getHistoryList(activePlot, page);
    setHistoryList(list);
    setTotalRecords(total);
    setCurrentPage(page);
  };

  const loadChartData = async () => {
    const targetPlot = chartPlotId === 'all' ? 'all' : chartPlotId;
    const data = await DataService.getHistoricalData(targetPlot, timeRange, selectedParams);
    setChartData(data);
  };

  const memoizedChartData = useMemo(() => chartData, [chartData]);

  const handleExportExcel = async () => {
    try {
      // 获取较大规模的历史记录用于导出（例如前100条）
      const { list } = await DataService.getHistoryList(activePlot, 1, 100);
      
      if (!list || list.length === 0) {
        addNotification({
          title: t('monitoring.export.fail'),
          message: t('monitoring.export.noData'),
          type: 'warning'
        });
        return;
      }

      // 准备导出数据
      const exportData = list.map(item => ({
        [t('monitoring.table.time')]: item.time,
        [`${t('monitoring.params.temperature')}(℃)`]: item.temperature.toFixed(2),
        [`${t('monitoring.params.humidity')}(%RH)`]: item.humidity.toFixed(2),
        [`${t('monitoring.params.light')}(Lux)`]: item.light.toFixed(2),
        [`${t('monitoring.params.soilTemp')}(℃)`]: item.soilTemp.toFixed(2),
        [`${t('monitoring.params.soilMoisture')}(%)`]: item.soilMoisture.toFixed(2),
        [`${t('monitoring.params.soilPh')}(pH)`]: item.pH.toFixed(2),
        [`${t('monitoring.params.nitrogen')} (mg/kg)`]: item.nitrogen.toFixed(2),
        [`${t('monitoring.params.phosphorus')} (mg/kg)`]: item.phosphorus.toFixed(2),
        [`${t('monitoring.params.potassium')} (mg/kg)`]: item.potassium.toFixed(2),
      }));

      // 创建工作表
      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, t('monitoring.export.sheetName'));

      // 生成文件名
      const plotName = plots.find(p => p.id === activePlot)?.name || activePlot;
      const filename = t('monitoring.export.filename', { 
        name: plotName, 
        date: new Date().toISOString().split('T')[0] 
      });

      // 写入文件并触发下载
      writeFile(wb, filename);

      addNotification({
        title: t('monitoring.export.success'),
        message: t('monitoring.export.successMsg', { count: list.length }),
        type: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      addNotification({
        title: t('monitoring.export.fail'),
        message: t('monitoring.export.error'),
        type: 'error'
      });
    }
  };

  const handleCalibrate = async (sensorKey: string, value: number) => {
    if (!calibrationReason.trim()) {
      addNotification({
        title: t('monitoring.calibration.fail'),
        message: t('monitoring.calibration.failReason'),
        type: 'warning'
      });
      return;
    }

    setIsCalibrating(true);
    try {
      const result = await DataService.calibrateSensor(activePlot, sensorKey, value, calibrationReason);
      if (result.success) {
        addNotification({
          title: t('monitoring.calibration.success'),
          message: t('monitoring.calibration.successMsg', { 
            param: getParamLabel(sensorKey), 
            value, 
            unit: getParamUnit(sensorKey) 
          }),
          type: 'success'
        });
        setCalibratingSensor(null);
        setCalibrationReason('');
        loadRealtime(); // 刷新实时数据
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      addNotification({
        title: t('monitoring.calibration.fail'),
        message: error instanceof Error ? error.message : t('app.unknownError'),
        type: 'error'
      });
    } finally {
      setIsCalibrating(false);
    }
  };

  const checkAlerts = (data: RealtimeData) => {
    const sessionKey = `alert_shown_${new Date().toISOString().split('T')[0]}_${activePlot}`;
    
    // 简单防骚扰：每个地块每天仅首次加载发送通知
    if (localStorage.getItem(sessionKey)) return;

    const plotName = plots.find(p => p.id === activePlot)?.name || activePlot;

    if (data.nitrogen < thresholds.nitrogen.min) {
      addNotification({
        title: t('monitoring.warnings.title', { name: plotName, param: t('monitoring.params.nitrogen') }),
        message: t('monitoring.warnings.lowNitrogen', { value: data.nitrogen }),
        type: 'warning'
      });
    }
    if (data.phosphorus < thresholds.phosphorus.min) {
      addNotification({
        title: t('monitoring.warnings.title', { name: plotName, param: t('monitoring.params.phosphorus') }),
        message: t('monitoring.warnings.lowPhosphorus', { value: data.phosphorus }),
        type: 'warning'
      });
    }
    if (data.potassium < thresholds.potassium.min) {
      addNotification({
        title: t('monitoring.warnings.title', { name: plotName, param: t('monitoring.params.potassium') }),
        message: t('monitoring.warnings.lowPotassium', { value: data.potassium }),
        type: 'warning'
      });
    }

    localStorage.setItem(sessionKey, 'true');
  };

  if (plots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-white/80 dark:bg-[#121214]/40 backdrop-blur-xl rounded-[40px] border border-slate-100 dark:border-white/5 p-12">
        <div className="w-24 h-24 bg-forest-green/10 text-forest-green dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
          <Activity size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">{t('monitoring.empty.title')}</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 font-medium">
          {t('monitoring.empty.desc')}
        </p>
        <button 
          onClick={() => onNavigate('management')}
          className="px-8 py-4 bg-forest-green text-white rounded-2xl font-black text-sm hover:bg-emerald-green transition-all shadow-xl shadow-forest-green/20"
        >
          {t('monitoring.empty.action')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 0. 地块选择器 */}
      <section className="flex items-center justify-between bg-white/80 dark:bg-[#121214]/40 backdrop-blur-xl p-6 rounded-[32px] card-shadow border border-slate-100 dark:border-white/5 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-forest-green/10 text-forest-green dark:text-emerald-400 rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/5">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t('monitoring.sidebar.currentPlot')}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('monitoring.sidebar.desc')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {plots.map(plot => (
            <button
              key={plot.id}
              onClick={() => setActivePlot(plot.id)}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
                activePlot === plot.id 
                  ? "bg-forest-green text-white shadow-lg shadow-forest-green/20" 
                  : "bg-slate-50 dark:bg-[#0A0A0A]/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] border border-slate-100 dark:border-white/5"
              )}
            >
              {plot.name}
            </button>
          ))}
        </div>
      </section>

      {/* 0.5. 所有地块实时概览 */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plots.map(plot => {
          const data = allPlotsData[plot.id];
          if (!data) return null;
          return (
            <div 
              key={plot.id} 
              id={`plot-card-${plot.id}`}
              onClick={() => setActivePlot(plot.id)}
              className={cn(
                "bg-white/80 dark:bg-[#050505]/40 backdrop-blur-xl rounded-[32px] p-6 card-shadow border transition-all duration-500 cursor-pointer hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none relative overflow-hidden",
                activePlot === plot.id ? "border-forest-green dark:border-emerald-500 shadow-lg shadow-forest-green/10" : "border-slate-100 dark:border-white/5"
              )}
            >
              {plot.isSimulated && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-bl-xl z-10">
                  {t('monitoring.detail.status.simulated') || t('management.stats.simulated')}
                </div>
              )}
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white">{plot.name}</h4>
                <span className="text-xs font-bold px-3 py-1 bg-forest-green/10 text-forest-green dark:text-emerald-400 rounded-full">
                  {plot.crop}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-y-6 gap-x-4">
                {[
                  { key: 'temperature', icon: <Thermometer size={14} /> },
                  { key: 'humidity', icon: <Droplets size={14} /> },
                  { key: 'light', icon: <Sun size={14} /> },
                  { key: 'soilTemp', icon: <Thermometer size={14} /> },
                  { key: 'soilMoisture', icon: <Droplets size={14} /> },
                  { key: 'pH', icon: <FlaskConical size={14} /> },
                  { key: 'nitrogen', icon: <FlaskConical size={14} /> },
                  { key: 'phosphorus', icon: <FlaskConical size={14} /> },
                  { key: 'potassium', icon: <FlaskConical size={14} /> },
                ].map(({ key, icon }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                      {icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{getParamLabel(key)}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {data[key as keyof RealtimeData].toFixed(2)}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {getParamUnit(key)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* 1. 顶部实时数据卡片区 */}
      <section className="relative">
        {plots.find(p => p.id === activePlot)?.status === 'pending_setup' && (
          <div className="absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-[8px] rounded-[32px] flex flex-col items-center justify-center text-center p-12 border border-dashed border-indigo-500/30">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
              <Zap size={40} className="animate-pulse" />
            </div>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t('monitoring.inactive.title')}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
              {t('monitoring.inactive.desc')}
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#1A1A1A] rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Search size={14} />
                {t('monitoring.inactive.action')}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {realtimeData && (Object.entries(realtimeData) as [keyof RealtimeData, number][]).map(([key, value]) => (
            <MonitorCard 
              key={key}
              label={getParamLabel(key)}
              value={value}
              unit={getParamUnit(key)}
              icon={getParamIcon(key)}
              status={getStatus(key, value, thresholds)}
            />
          ))}
        </div>
      </section>

      {/* 2. 中部图表分析区 */}
      <section className="bg-white/80 dark:bg-[#050505]/40 backdrop-blur-xl rounded-[40px] card-shadow p-8 border border-slate-100 dark:border-white/5 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
              {chartPlotId === 'all' ? t('monitoring.chart.allPlots') : t('monitoring.chart.trendAnalysis', { name: plots.find(p => p.id === chartPlotId)?.name || '' })}
            </h3>
            <div className="flex bg-slate-100 dark:bg-[#0A0A0A]/50 p-1 rounded-xl border border-slate-200 dark:border-white/5">
              <button 
                onClick={() => setChartType('line')}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-black transition-all", chartType === 'line' ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-forest-green dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")}
              >
                {t('monitoring.chart.line')}
              </button>
              <button 
                onClick={() => setChartType('bar')}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-black transition-all", chartType === 'bar' ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-forest-green dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")}
              >
                {t('monitoring.chart.bar')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <select 
              className="bg-slate-50 dark:bg-[#0A0A0A]/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-forest-green dark:text-slate-300 transition-colors"
              value={chartPlotId}
              onChange={(e) => setChartPlotId(e.target.value)}
            >
              <option value="all">{t('monitoring.sidebar.allPlots')}</option>
              {plots.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select 
              className="bg-slate-50 dark:bg-[#0A0A0A]/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-forest-green dark:text-slate-300 transition-colors"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d">{t('monitoring.chart.range.7d')}</option>
              <option value="30d">{t('monitoring.chart.range.30d')}</option>
            </select>
            
            <div className="flex flex-wrap gap-2">
              {['temperature', 'humidity', 'light', 'soilTemp', 'soilMoisture', 'pH', 'nitrogen', 'phosphorus', 'potassium'].map(p => (
                <label key={p} className="flex items-center gap-2 bg-slate-50 dark:bg-[#0A0A0A]/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1A1A1A] transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedParams.includes(p)}
                    onChange={() => {
                      if (selectedParams.includes(p)) {
                        if (selectedParams.length > 1) setSelectedParams(selectedParams.filter(item => item !== p));
                      } else {
                        if (selectedParams.length < 5) setSelectedParams([...selectedParams, p]);
                      }
                    }}
                    className="rounded text-forest-green focus:ring-forest-green dark:bg-[#1A1A1A] dark:border-white/10"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{getParamLabel(p)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <AreaChart data={memoizedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {selectedParams.map((param, index) => (
                    <linearGradient key={`grad-${param}`} id={`color-${param}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getParamColor(index)} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={getParamColor(index)} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                {/* 动态生成 Y 轴 */}
                {Array.from(new Set(selectedParams.map(p => getParamUnit(p)))).map((unit, index) => (
                  <YAxis 
                    key={`y-${unit}`}
                    yAxisId={`y-${unit}`}
                    orientation={index % 2 === 0 ? 'left' : 'right'}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                    label={{ value: unit, angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 10 }}
                  />
                ))}
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#f8fafc', marginBottom: '8px', fontWeight: 'black' }}
                />
                <RechartsLegend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                  onClick={(e) => {
                    const { dataKey } = e;
                    if (typeof dataKey === 'string') {
                      setHiddenSeries(prev => 
                        prev.includes(dataKey) 
                          ? prev.filter(s => s !== dataKey) 
                          : [...prev, dataKey]
                      );
                    }
                  }}
                  formatter={(value: string) => (
                    <span className={cn(
                      "text-xs font-bold ml-1 cursor-pointer transition-opacity",
                      hiddenSeries.includes(value) ? "text-slate-300 opacity-40 line-through" : "text-slate-400"
                    )}>
                      {getParamLabel(value)}
                    </span>
                  )}
                />
                {selectedParams.map((param, index) => (
                  <Area
                    key={param}
                    type="monotone"
                    dataKey={param}
                    hide={hiddenSeries.includes(param)}
                    yAxisId={`y-${getParamUnit(param)}`}
                    stroke={getParamColor(index)}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#color-${param})`}
                    animationDuration={1500}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={memoizedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                {Array.from(new Set(selectedParams.map(p => getParamUnit(p)))).map((unit, index) => (
                  <YAxis 
                    key={`y-${unit}`}
                    yAxisId={`y-${unit}`}
                    orientation={index % 2 === 0 ? 'left' : 'right'}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                  />
                ))}
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#f8fafc', marginBottom: '8px', fontWeight: 'black' }}
                />
                <RechartsLegend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                  onClick={(e) => {
                    const { dataKey } = e;
                    if (typeof dataKey === 'string') {
                      setHiddenSeries(prev => 
                        prev.includes(dataKey) 
                          ? prev.filter(s => s !== dataKey) 
                          : [...prev, dataKey]
                      );
                    }
                  }}
                  formatter={(value: string) => (
                    <span className={cn(
                      "text-xs font-bold ml-1 cursor-pointer transition-opacity",
                      hiddenSeries.includes(value) ? "text-slate-300 opacity-40 line-through" : "text-slate-400"
                    )}>
                      {getParamLabel(value)}
                    </span>
                  )}
                />
                {selectedParams.map((param, index) => (
                  <Bar
                    key={param}
                    dataKey={param}
                    hide={hiddenSeries.includes(param)}
                    yAxisId={`y-${getParamUnit(param)}`}
                    fill={getParamColor(index)}
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. 底部历史记录列表 */}
      <section className="bg-white/80 dark:bg-[#050505]/40 backdrop-blur-xl rounded-[40px] card-shadow p-8 border border-slate-100 dark:border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
            <History className="text-forest-green dark:text-emerald-400" size={22} />
            {t('monitoring.history')}
          </h3>
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-forest-green hover:text-white dark:hover:bg-emerald-500 transition-all border border-slate-200 dark:border-white/5 shadow-sm"
            >
              <Download size={14} />
              {t('monitoring.export.button')}
            </button>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => loadHistory(currentPage - 1)}
                className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#0A0A0A]/50 disabled:opacity-30 dark:text-slate-400 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-black text-slate-600 dark:text-slate-400">{t('monitoring.table.pageInfo', { current: currentPage, total: Math.ceil(totalRecords / 5) })}</span>
              <button 
                disabled={currentPage >= Math.ceil(totalRecords / 5)}
                onClick={() => loadHistory(currentPage + 1)}
                className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#0A0A0A]/50 disabled:opacity-30 dark:text-slate-400 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.time')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.temp')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.humidity')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.light')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.soilTemp')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.soilMoisture')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.params.soilPh')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.nitrogen')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.phosphorus')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('monitoring.table.potassium')}</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">{t('monitoring.table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((item, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-[#1A1A1A]/50 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">{item.time}</td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('temperature', item.temperature, '℃', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('humidity', item.humidity, '%', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('light', item.light, 'Lx', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('soilTemp', item.soilTemp, '℃', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('soilMoisture', item.soilMoisture, '%', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('pH', item.pH, '', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('nitrogen', item.nitrogen, '', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('phosphorus', item.phosphorus, '', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderHistoryValue('potassium', item.potassium, '', thresholds)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button 
                      onClick={() => setDetailItem(item)}
                      className="text-forest-green dark:text-emerald-400 text-xs font-bold hover:underline"
                    >
                      {t('monitoring.table.detail')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailItem(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl bg-white/90 dark:bg-[#050505]/95 backdrop-blur-2xl rounded-[32px] sm:rounded-[40px] shadow-2xl border border-white/20 dark:border-white/10 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden m-4"
            >
              {/* Sticky Header */}
              <div className="p-4 sm:p-6 lg:p-8 pb-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center shrink-0">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 sm:gap-3 tracking-tight">
                  <History className="text-forest-green dark:text-emerald-400" size={24} />
                  <span className="truncate">{t('monitoring.detail.title', { time: detailItem.time })}</span>
                </h3>
                <button 
                  onClick={() => setDetailItem(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] rounded-full transition-colors shrink-0"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                  {Object.entries(detailItem).filter(([k]) => k !== 'time').map(([k, v]) => {
                    const status = getStatus(k, v as number, thresholds);
                    const statusConfig = {
                      normal: { label: t('monitoring.detail.status.normal'), color: 'text-emerald-500', bg: 'bg-white dark:bg-[#0A0A0A]/50', border: 'border-slate-100 dark:border-white/5' },
                      low: { label: t('monitoring.detail.status.low'), color: 'text-orange-500', bg: 'bg-orange-50/50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20' },
                      high: { label: t('monitoring.detail.status.high'), color: 'text-red-500', bg: 'bg-red-50/50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' }
                    };
                    const config = statusConfig[status];

                    return (
                      <div key={k} className={cn(
                        "p-4 sm:p-5 rounded-[24px] border transition-all flex flex-col justify-between",
                        config.bg,
                        config.border
                      )}>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className={cn("p-1.5 sm:p-2 rounded-xl bg-white dark:bg-[#050505]/50 shadow-sm border border-slate-100 dark:border-white/5", config.color)}>
                              {getParamIcon(k)}
                            </div>
                            <span className={cn("text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg bg-white dark:bg-[#050505]/50 shadow-sm border border-slate-100 dark:border-white/5", config.color)}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest truncate">{getParamLabel(k)}</p>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 dark:text-white font-mono">
                              {typeof v === 'number' ? v.toFixed(2) : v}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500">{getParamUnit(k)}</span>
                          </div>
                        </div>

                        <div className="mt-4 sm:mt-6">
                          {calibratingSensor === k ? (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-2 sm:space-y-3"
                            >
                              <textarea
                                placeholder={t('monitoring.calibration.reason_placeholder')}
                                value={calibrationReason}
                                onChange={(e) => setCalibrationReason(e.target.value)}
                                className="w-full p-2 sm:p-3 text-[10px] sm:text-xs bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-forest-green dark:text-slate-300 resize-none h-16 sm:h-20"
                              />
                              <div className="flex gap-2">
                                <button
                                  disabled={isCalibrating}
                                  onClick={() => handleCalibrate(k, v as number)}
                                  className="flex-1 py-1.5 sm:py-2 bg-forest-green text-white text-[10px] sm:text-xs font-bold rounded-lg hover:bg-forest-green/90 disabled:opacity-50"
                                >
                                  {isCalibrating ? t('monitoring.calibration.calibrating') : t('monitoring.calibration.confirm')}
                                </button>
                                <button
                                  onClick={() => {
                                    setCalibratingSensor(null);
                                    setCalibrationReason('');
                                  }}
                                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-200 dark:bg-[#2A2A2A] text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-[#333333]"
                                >
                                  {t('app.cancel')}
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <button
                              onClick={() => setCalibratingSensor(k)}
                              className="flex items-center gap-1 sm:gap-2 text-forest-green dark:text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-forest-green/5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors w-full justify-center border border-transparent hover:border-forest-green/20"
                            >
                              <AlertCircle size={12} className="sm:w-[14px] sm:h-[14px]" />
                              {t('monitoring.calibration.title')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-6 lg:p-8 pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/5 shrink-0">
                <button 
                  onClick={() => setDetailItem(null)}
                  className="w-full py-3 sm:py-4 bg-[#1A1A1A] dark:bg-forest-green text-white rounded-xl sm:rounded-2xl font-black text-sm sm:text-base hover:bg-[#0A0A0A] dark:hover:bg-forest-green/90 transition-all active:scale-[0.98] shadow-xl shadow-forest-green/10"
                >
                  {t('app.close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FieldMonitoring;
