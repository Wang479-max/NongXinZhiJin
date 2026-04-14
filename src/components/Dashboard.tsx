import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  Droplets, 
  Thermometer, 
  Sun, 
  Wind, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CloudRain,
  Cloud,
  CloudLightning,
  CloudSnow,
  Sunrise,
  Sunset,
  Umbrella,
  ThermometerSun,
  Moon,
  CloudSun,
  CloudMoon,
  CloudDrizzle,
  AlignLeft,
  Map as MapIcon,
  Search,
  MapPin,
  Loader2,
  Settings,
  LayoutGrid,
  Eye,
  EyeOff,
  Save,
  X,
  GripVertical,
  Sparkles,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import DataService, { RealtimeData, Plot } from '../services/dataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  onNavigate: (tab: string, hash?: string) => void;
  user: any;
}

const LOCATIONS = [
  { name: '兰州市安宁区', lat: 36.103, lon: 103.718 },
  { name: '北京市海淀区', lat: 39.956, lon: 116.310 },
  { name: '上海市浦东新区', lat: 31.221, lon: 121.544 },
  { name: '广州市天河区', lat: 23.124, lon: 113.330 },
  { name: '成都市武侯区', lat: 30.642, lon: 104.043 },
  { name: '郑州市金水区', lat: 34.802, lon: 113.678 },
  { name: '哈尔滨市南岗区', lat: 45.759, lon: 126.661 },
];

export default function Dashboard({ onNavigate, user }: DashboardProps) {
  const { t } = useTranslation();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [summaryData, setSummaryData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const ALL_WIDGETS = [
    { id: 'stats', label: t('dashboard.widgets.stats'), icon: Activity, desc: t('dashboard.widgets.desc.stats') },
    { id: 'chart', label: t('dashboard.widgets.chart'), icon: TrendingUp, desc: t('dashboard.widgets.desc.chart') },
    { id: 'plots', label: t('dashboard.widgets.plots'), icon: MapIcon, desc: t('dashboard.widgets.desc.plots') },
    { id: 'weather', label: t('dashboard.widgets.weather'), icon: CloudRain, desc: t('dashboard.widgets.desc.weather') },
    { id: 'logs', label: t('dashboard.widgets.logs'), icon: AlignLeft, desc: t('dashboard.widgets.desc.logs') },
    { id: 'map', label: t('dashboard.widgets.map'), icon: MapIcon, desc: t('dashboard.widgets.desc.map') },
    { id: 'intelligence', label: t('dashboard.widgets.intelligence'), icon: Sparkles, desc: t('dashboard.widgets.desc.intelligence') },
    { id: 'actions', label: t('dashboard.widgets.actions'), icon: CheckCircle2, desc: t('dashboard.widgets.desc.actions') },
  ];

  const getWeatherInfo = (code: number, isDay: number = 1) => {
    if (code === 0) return { icon: isDay ? Sun : Moon, label: t('app.weather.clear') };
    if (code === 1) return { icon: isDay ? CloudSun : CloudMoon, label: t('app.weather.mostlyClear') };
    if (code === 2) return { icon: Cloud, label: t('app.weather.partlyCloudy') };
    if (code === 3) return { icon: Cloud, label: t('app.weather.cloudy') };
    if (code >= 45 && code <= 48) return { icon: AlignLeft, label: t('app.weather.fog') };
    if (code >= 51 && code <= 55) return { icon: CloudDrizzle, label: t('app.weather.drizzle') };
    if (code >= 56 && code <= 57) return { icon: CloudDrizzle, label: t('app.weather.drizzle') };
    if (code >= 61 && code <= 65) return { icon: CloudRain, label: t('app.weather.rain') };
    if (code >= 66 && code <= 67) return { icon: CloudRain, label: t('app.weather.rain') };
    if (code >= 71 && code <= 75) return { icon: CloudSnow, label: t('app.weather.snow') };
    if (code === 77) return { icon: CloudSnow, label: t('app.weather.snow') };
    if (code >= 80 && code <= 82) return { icon: CloudRain, label: t('app.weather.rain') };
    if (code >= 85 && code <= 86) return { icon: CloudSnow, label: t('app.weather.snow') };
    if (code >= 95) return { icon: CloudLightning, label: t('app.weather.thunderstorm') };
    return { icon: isDay ? Sun : Moon, label: t('app.weather.unknown') };
  };

  const getAgriculturalAdvice = (weatherData: any) => {
    if (!weatherData || !weatherData.current || !weatherData.daily) return t('dashboard.advice.loading');
    
    const current = weatherData.current;
    
    if (current.wind_speed_10m > 30) {
      return t('dashboard.advice.wind');
    }
    if (current.temperature_2m > 35) {
      return t('dashboard.advice.temp_high');
    }
    if (current.temperature_2m < 5) {
      return t('dashboard.advice.temp_low');
    }
    
    return t('dashboard.advice.default');
  };

  // Dashboard Customization State
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('nxzj_dashboard_widgets');
    return saved ? JSON.parse(saved) : ['stats', 'chart', 'plots', 'weather', 'logs', 'map', 'intelligence', 'actions'];
  });
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempVisibleWidgets, setTempVisibleWidgets] = useState<string[]>([]);

  const RefreshCw = ({ size, className }: { size: number, className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M3 21v-5h5"/>
    </svg>
  );

  const handleAutoLocate = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${t('app.language_code') === 'en' ? 'en' : 'zh'}`);
            const data = await res.json();
            const name = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.suburb || t('dashboard.location_default');
            setSelectedLocation({ name, lat: latitude, lon: longitude });
          } catch (e) {
            setSelectedLocation({ name: t('dashboard.location_default'), lat: latitude, lon: longitude });
          }
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    handleAutoLocate();
  }, []);

  const handleSearchLocation = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=zh&format=json`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results.map((r: any) => ({
          name: `${r.name}${r.admin1 ? `, ${r.admin1}` : ''}`,
          lat: r.latitude,
          lon: r.longitude
        })));
        setShowDropdown(true);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const plotsData = await DataService.getPlots(user?.username);
        setPlots(plotsData);
        
        const firstPlotId = plotsData.length > 0 ? plotsData[0].id : '';
        
        const [latestData, weather, logs] = await Promise.all([
          firstPlotId ? DataService.getRealtimeData(firstPlotId) : Promise.resolve(null),
          DataService.getWeather(selectedLocation.lat, selectedLocation.lon),
          DataService.getSystemLogs()
        ]);
        
        if (latestData) setSummaryData(latestData);
        setSystemLogs(logs);
        if (weather) {
          setWeatherData(weather);
        }
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Subscribe to data updates
    const unsubscribe = DataService.subscribe(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [selectedLocation]);

  const formatValue = (val: number | undefined, defaultVal: number, isDecimal: boolean = false) => {
    const v = val !== undefined ? val : defaultVal;
    return isDecimal ? v.toFixed(2) : Math.round(v);
  };

  const stats = [
    { label: '平均温度', value: formatValue(summaryData?.temperature, 24.5, true), unit: '°C', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-500/10', trend: '+1.2%', desc: '实时环境气温' },
    { label: '平均湿度', value: formatValue(summaryData?.humidity, 65, true), unit: '%', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: '-2.5%', desc: '空气相对湿度' },
    { label: '光照强度', value: formatValue(summaryData?.light, 45000, false), unit: 'Lux', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: '+5.1%', desc: '当前光合有效辐射' },
    { label: '土壤水分', value: formatValue(summaryData?.soilMoisture, 32, true), unit: '%', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: '+0.8%', desc: '根系层土壤含水量' },
  ];

  const chartData = [
    { time: '00:00', temp: 18, hum: 75 },
    { time: '04:00', temp: 16, hum: 80 },
    { time: '08:00', temp: 22, hum: 70 },
    { time: '12:00', temp: 28, hum: 55 },
    { time: '16:00', temp: 26, hum: 60 },
    { time: '20:00', temp: 21, hum: 68 },
  ];

  const handleToggleWidget = (id: string) => {
    setTempVisibleWidgets(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleSaveCustomization = () => {
    setVisibleWidgets(tempVisibleWidgets);
    localStorage.setItem('nxzj_dashboard_widgets', JSON.stringify(tempVisibleWidgets));
    setIsCustomizing(false);
  };

  const isWidgetVisible = (id: string) => visibleWidgets.includes(id);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">农场概览</h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Trophy size={14} className="text-amber-600" />
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                2026 全国计算机设计大赛 · 参赛作品
              </span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">欢迎回来，管理员。当前农场运行状态良好。</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4 px-6 py-2 bg-white/70 dark:bg-[#121214]/40 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
            <div className="flex flex-col items-end">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">系统健康度</p>
              <p className="text-sm font-black text-emerald-500 dark:text-emerald-400">98% 极佳</p>
            </div>
            <div className="w-12 h-2 bg-slate-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '98%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
              />
            </div>
          </div>
          <button 
            onClick={() => {
              setTempVisibleWidgets(visibleWidgets);
              setIsCustomizing(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-[#121214]/40 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300 font-black text-xs hover:bg-forest-green hover:text-white transition-all group"
          >
            <LayoutGrid size={16} className="group-hover:rotate-90 transition-transform duration-500" />
            自定义面板
          </button>
          <div className="flex items-center gap-3 bg-white/70 dark:bg-[#121214]/40 backdrop-blur-xl p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
            <div className="w-10 h-10 bg-forest-green/10 text-forest-green dark:text-emerald-400 rounded-xl flex items-center justify-center border border-forest-green/10 dark:border-emerald-500/10">
              <Calendar size={20} />
            </div>
            <div className="pr-4">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">今日日期</p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                {new Date().toLocaleString(t('app.language_code') === 'en' ? 'en-US' : 'zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      <AnimatePresence>
        {isCustomizing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomizing(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-2xl rounded-[40px] p-8 shadow-2xl border border-slate-200/50 dark:border-white/5"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-forest-green/10 text-forest-green rounded-2xl flex items-center justify-center">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">自定义面板</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">选择您想要在首页显示的模块</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCustomizing(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3 mb-8">
                {ALL_WIDGETS.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => handleToggleWidget(widget.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-3xl border transition-all text-left group",
                      tempVisibleWidgets.includes(widget.id)
                        ? "bg-forest-green/5 border-forest-green/30 dark:bg-forest-green/10 dark:border-forest-green/20"
                        : "bg-slate-50/50 border-slate-100 dark:bg-[#1A1A1A]/30 dark:border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      tempVisibleWidgets.includes(widget.id) ? "bg-forest-green text-white" : "bg-white dark:bg-[#2A2A2A] text-slate-400"
                    )}>
                      <widget.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 dark:text-white">{widget.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{widget.desc}</p>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      tempVisibleWidgets.includes(widget.id) ? "text-forest-green" : "text-slate-300"
                    )}>
                      {tempVisibleWidgets.includes(widget.id) ? <Eye size={18} /> : <EyeOff size={18} />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsCustomizing(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveCustomization}
                  className="flex-1 py-4 bg-forest-green text-white rounded-2xl font-black hover:bg-opacity-90 transition-all shadow-lg shadow-forest-green/20 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  保存布局
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      {isWidgetVisible('stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
              className="bento-card p-6 rounded-[32px] group relative overflow-hidden"
            >
              {/* Glass reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-current opacity-[0.05] dark:opacity-[0.1] rounded-full blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-[0.15]" style={{ color: stat.color?.split('-')[1] || 'inherit' }} />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-inner border border-white/50", 
                  stat.bg, stat.color, "dark:bg-[#1A1A1A]/80 dark:border-white/10")}>
                  <stat.icon size={28} strokeWidth={2.5} />
                </div>
                <span className={cn(
                  "text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm border backdrop-blur-md",
                  stat.trend.startsWith('+') 
                    ? "text-emerald-700 bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" 
                    : "text-red-700 bg-red-50/80 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30"
                )}>
                  {stat.trend.startsWith('+') ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                  {stat.trend}
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none font-mono drop-shadow-sm">{stat.value}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-bold text-sm">{stat.unit}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Chart Card */}
        {isWidgetVisible('chart') && (
          <div className={cn("bento-card p-8 group",
            !isWidgetVisible('plots') ? "lg:col-span-3" : "lg:col-span-2"
          )}>
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">环境趋势分析</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">过去 24 小时温湿度波动情况</p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-100 dark:border-orange-500/20">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-[10px] font-black text-orange-700 dark:text-orange-400">温度</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-black text-blue-700 dark:text-blue-400">湿度</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/30" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: '1px solid rgba(255, 255, 255, 0.2)', 
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(16px)',
                      padding: '12px 16px',
                    }}
                    itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#0f172a', fontSize: '14px', letterSpacing: '-0.02em' }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '6 6' }}
                  />
                  <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorTemp)" />
                  <Area type="monotone" dataKey="hum" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorHum)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Plot Status List */}
        {isWidgetVisible('plots') && (
          <div className={cn("bento-card p-8 flex flex-col",
            !isWidgetVisible('chart') ? "lg:col-span-3" : ""
          )}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">地块状态</h3>
              <button 
                onClick={() => onNavigate('monitoring')}
                className="text-xs font-black text-forest-green dark:text-emerald-400 hover:underline flex items-center gap-1 transition-all"
              >
                查看全部 <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {plots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <MapIcon size={32} />
                  </div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">暂无地块数据</p>
                  <button 
                    onClick={() => onNavigate('management')}
                    className="px-4 py-2 bg-forest-green text-white rounded-xl text-xs font-bold hover:bg-emerald-green transition-all"
                  >
                    立即添加地块
                  </button>
                </div>
              ) : (
                plots.map((plot, i) => (
                  <div 
                    key={plot.id}
                    className="group p-4 rounded-3xl bg-slate-50/50 dark:bg-[#1A1A1A]/30 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-[#1A1A1A]/80 hover:border-forest-green/20 dark:hover:border-emerald-500/30 transition-all cursor-pointer"
                    onClick={() => onNavigate('monitoring')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center shadow-sm text-forest-green dark:text-emerald-400 border border-slate-100 dark:border-white/5">
                          <MapIcon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">{plot.name}</h4>
                            {plot.isSimulated && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-[8px] font-black rounded uppercase tracking-tighter">
                                模拟
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{plot.crop}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black shadow-sm border",
                        i === 0 
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20" 
                          : "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/20"
                      )}>
                        {i === 0 ? '状态优' : '需关注'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span>土壤水分: {plot.sensorData?.soilMoisture ? plot.sensorData.soilMoisture.toFixed(2) : '32.00'}%</span>
                      <span>预计收获: 45天</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => onNavigate('management')}
              className="mt-6 w-full py-4 bg-forest-green text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-green transition-all shadow-lg shadow-forest-green/20"
            >
              <TrendingUp size={18} />
              智能农事决策
            </button>
          </div>
        )}
      </div>

      {/* Middle Grid: Map & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Farm Map Widget */}
        {isWidgetVisible('map') && (
          <div className="lg:col-span-2 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[40px] card-shadow p-8 border border-slate-100 dark:border-white/5 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group/map-container">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover/map-container:bg-emerald-500/10 transition-colors duration-1000" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <MapIcon size={20} className="text-emerald-500" />
                  数字孪生农场
                </h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">地块空间分布与实时状态 (GIS)</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  传感器在线
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                  <Activity size={10} />
                  数据同步中
                </span>
              </div>
            </div>
            
            <div className="relative h-[360px] bg-slate-900 rounded-[32px] border border-slate-800 overflow-hidden group shadow-inner">
              {/* High-tech Map Background */}
              <div className="absolute inset-0 opacity-40">
                <div className="absolute inset-0" style={{ 
                  backgroundImage: 'linear-gradient(rgba(52, 211, 153, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 211, 153, 0.1) 1px, transparent 1px)', 
                  backgroundSize: '30px 30px',
                  backgroundPosition: 'center center'
                }} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900" />
              </div>
              
              {/* Scanning Line */}
              <motion.div 
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[2px] bg-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-0 pointer-events-none"
              />

              {/* Plot Outlines (Mock Digital Twin) */}
              <div className="absolute inset-0 p-8 z-10">
                <div className="relative w-full h-full">
                  {/* Plot 1 */}
                  <motion.div 
                    whileHover={{ scale: 1.02, zIndex: 20 }}
                    className="absolute top-[10%] left-[10%] w-[40%] h-[50%] bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/50 rounded-xl flex flex-col items-center justify-center cursor-pointer group/plot shadow-[0_0_15px_rgba(52,211,153,0.1)] hover:shadow-[0_0_25px_rgba(52,211,153,0.3)] transition-all"
                    onClick={() => onNavigate('monitoring')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl pointer-events-none" />
                    <span className="text-[12px] font-black text-white mb-1 tracking-widest drop-shadow-md">1号地块</span>
                    <span className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md">冬小麦</span>
                    
                    {/* Floating Data Points */}
                    <div className="absolute -top-3 -right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1.5 flex flex-col gap-1 opacity-0 group-hover/plot:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-1 text-[8px] text-white font-mono"><Thermometer size={8} className="text-orange-400"/> 24.5°C</div>
                      <div className="flex items-center gap-1 text-[8px] text-white font-mono"><Droplets size={8} className="text-blue-400"/> 65%</div>
                    </div>
                    
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,1)]" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,1)]" />
                  </motion.div>
                  
                  {/* Plot 2 */}
                  <motion.div 
                    whileHover={{ scale: 1.02, zIndex: 20 }}
                    className="absolute top-[10%] left-[55%] w-[35%] h-[35%] bg-orange-500/20 backdrop-blur-sm border border-orange-400/50 rounded-xl flex flex-col items-center justify-center cursor-pointer group/plot shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:shadow-[0_0_25px_rgba(249,115,22,0.3)] transition-all"
                    onClick={() => onNavigate('monitoring')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl pointer-events-none" />
                    <span className="text-[12px] font-black text-white mb-1 tracking-widest drop-shadow-md">2号地块</span>
                    <span className="text-[9px] font-bold text-orange-200 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md">玉米</span>
                    
                    <div className="absolute -top-3 -right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1.5 flex flex-col gap-1 opacity-0 group-hover/plot:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-1 text-[8px] text-white font-mono"><Thermometer size={8} className="text-orange-400"/> 26.2°C</div>
                      <div className="flex items-center gap-1 text-[8px] text-white font-mono"><Droplets size={8} className="text-blue-400"/> 58%</div>
                    </div>

                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-orange-400 rounded-full shadow-[0_0_10px_rgba(249,115,22,1)]" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full shadow-[0_0_10px_rgba(249,115,22,1)] animate-pulse" />
                  </motion.div>
                  
                  {/* Plot 3 */}
                  <motion.div 
                    whileHover={{ scale: 1.02, zIndex: 20 }}
                    className="absolute top-[65%] left-[10%] w-[80%] h-[25%] bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 rounded-xl flex flex-col items-center justify-center cursor-pointer group/plot shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all"
                    onClick={() => onNavigate('monitoring')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl pointer-events-none" />
                    <span className="text-[12px] font-black text-white mb-1 tracking-widest drop-shadow-md">3号地块</span>
                    <span className="text-[9px] font-bold text-blue-200 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md">大豆</span>
                    
                    <div className="absolute -top-3 -right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1.5 flex flex-col gap-1 opacity-0 group-hover/plot:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-1 text-[8px] text-white font-mono"><Thermometer size={8} className="text-orange-400"/> 22.8°C</div>
                      <div className="flex items-center gap-1 text-[8px] text-white font-mono"><Droplets size={8} className="text-blue-400"/> 72%</div>
                    </div>

                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
                  </motion.div>
                  
                  {/* Map Controls */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30">
                    <button className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg">+</button>
                    <button className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg">-</button>
                    <button className="w-8 h-8 bg-indigo-500/20 backdrop-blur-md rounded-lg border border-indigo-400/30 flex items-center justify-center text-indigo-300 hover:bg-indigo-500/40 transition-colors shadow-lg mt-2" title="切换图层">
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Logs Widget */}
        {isWidgetVisible('logs') && (
          <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[40px] card-shadow p-8 border border-slate-100 dark:border-white/5 flex flex-col hover:shadow-2xl transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">运行日志</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">实时监控中</span>
              </div>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[360px]">
              {systemLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <p className="text-xs font-bold">正在同步日志...</p>
                </div>
              ) : (
                systemLogs.map((log, i) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-[#1A1A1A]/30 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-[#1A1A1A]/80 transition-all group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                      log.status === 'success' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                      log.status === 'warning' ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" :
                      log.status === 'danger' ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" :
                      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    )}>
                      {log.type === 'hardware' ? <Settings size={18} /> : 
                       log.type === 'ai' ? <TrendingUp size={18} /> : 
                       log.type === 'news' ? <Activity size={18} /> : 
                       <CheckCircle2 size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed mb-1">{log.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {log.type === 'hardware' ? '硬件控制' : 
                           log.type === 'ai' ? '智能诊断' : 
                           log.type === 'news' ? '资讯同步' : '系统消息'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400/60 font-mono">
                          {new Date(log.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            
            <button 
              onClick={async () => {
                const logs = await DataService.getSystemLogs();
                setSystemLogs(logs);
              }}
              className="mt-6 w-full py-3 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition-all"
            >
              <RefreshCw size={14} />
              刷新日志
            </button>
          </div>
        )}

        {/* Agricultural Intelligence Widget */}
        {isWidgetVisible('intelligence') && (
          <div className="bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[40px] card-shadow p-8 border border-slate-100 dark:border-white/5 flex flex-col hover:shadow-2xl transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">农业情报</h3>
              <Sparkles className="text-amber-500" size={20} />
            </div>
            
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {/* Seasonal Tips */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    时令农事提醒
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: '🌱', month: '3月下旬', tip: '春分时节，抓紧进行春小麦播种与镇压。' },
                    { icon: '💧', month: '4月上旬', tip: '气温回升快，注意监测土壤墒情，适时灌溉。' }
                  ].map((tip, i) => (
                    <div key={i} className="group flex gap-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-500/5 dark:to-teal-500/5 border border-emerald-100/50 dark:border-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all hover:shadow-md hover:shadow-emerald-500/5">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A1A] shadow-sm flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                        {tip.icon}
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-1">{tip.month}</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{tip.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hot Topics */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    行业热门话题
                  </div>
                  <TrendingUp className="text-blue-500/50" size={14} />
                </div>
                <div className="space-y-2">
                  {[
                    { title: '2026年春季农资补贴政策解读', hot: true },
                    { title: '智慧农业：无人机植保技术规范', hot: false },
                    { title: '抗旱高产小麦新品种推介', hot: false }
                  ].map((topic, i) => (
                    <button 
                      key={i}
                      onClick={() => onNavigate('knowledge')}
                      className="w-full text-left p-3.5 rounded-2xl bg-slate-50/50 dark:bg-[#1A1A1A]/50 hover:bg-white dark:hover:bg-[#222] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 truncate pr-4">
                        <span className="text-slate-300 dark:text-slate-600 font-black text-sm italic">#{i + 1}</span>
                        <span className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{topic.title}</span>
                        {topic.hot && (
                          <span className="px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[8px] font-black tracking-wider uppercase shrink-0 animate-pulse">HOT</span>
                        )}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#2A2A2A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 shrink-0">
                        <ChevronRight size={12} className="text-slate-500 dark:text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => onNavigate('knowledge')}
              className="mt-6 w-full py-3 bg-forest-green text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-green transition-all"
            >
              进入知识库
              <ArrowUpRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Weather Forecast */}
        {isWidgetVisible('weather') && (
          <div className={cn(
            "rounded-[40px] card-shadow p-10 text-white relative overflow-hidden group transition-all duration-700 hover:shadow-2xl",
            weatherData?.current?.is_day === 0
              ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-black hover:shadow-indigo-500/30"
              : "bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600 hover:shadow-blue-500/30",
            !isWidgetVisible('actions') ? "lg:col-span-2" : ""
          )}>
            {/* Animated Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000" />
            
            {/* Background Icon */}
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000 pointer-events-none">
              {weatherData?.current ? React.createElement(getWeatherInfo(weatherData.current.weather_code, weatherData.current.is_day).icon, { size: 280 }) : <CloudRain size={280} />}
            </div>

            <div className="relative z-10">
              {/* Header & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-black tracking-tight">天气预报</h3>
                  <div className="relative flex items-center gap-3">
                    <div className="relative group/search">
                      <input 
                        type="text"
                        value={searchQuery || selectedLocation.name}
                        onChange={(e) => handleSearchLocation(e.target.value)}
                        onFocus={() => {
                          setSearchQuery('');
                          if (searchResults.length > 0) setShowDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        placeholder="搜索城市..."
                        className="bg-white/15 backdrop-blur-xl border border-white/20 text-white text-xs font-bold rounded-full pl-10 pr-4 py-2.5 outline-none placeholder:text-white/50 w-36 sm:w-48 focus:bg-white/25 focus:w-56 transition-all duration-500"
                      />
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70 group-focus-within/search:scale-110 transition-transform" />
                      {isSearching && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin opacity-70" />}
                    </div>
                    <button 
                      onClick={handleAutoLocate}
                      disabled={isLocating}
                      className="p-2.5 bg-white/15 hover:bg-white/25 rounded-full transition-all disabled:opacity-50 border border-white/20 shadow-lg active:scale-90"
                      title="自动定位"
                    >
                      {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    </button>

                    {/* Dropdown Results */}
                    <AnimatePresence>
                      {showDropdown && searchResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden z-50"
                        >
                          {searchResults.map((loc, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedLocation(loc);
                                setSearchQuery('');
                                setShowDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-forest-green hover:text-white transition-colors"
                            >
                              {loc.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest self-start sm:self-auto border border-white/10">
                  {weatherData?.current?.is_day === 0 ? '夜间' : '白天'}
                </span>
              </div>

              {/* Current Weather Main */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm font-black text-white/70 uppercase tracking-widest mb-1">当前天气</p>
                  <div className="flex items-end gap-3">
                    <h2 className="text-6xl font-black tracking-tighter font-mono">
                      {weatherData?.current ? weatherData.current.temperature_2m.toFixed(1) : '--'}°C
                    </h2>
                    <p className="text-xl font-bold text-white/80 mb-2">
                      {weatherData?.current ? getWeatherInfo(weatherData.current.weather_code, weatherData.current.is_day).label : '加载中'}
                    </p>
                  </div>
                </div>
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl group-hover:bg-white/20 transition-colors">
                  {weatherData?.current ? React.createElement(getWeatherInfo(weatherData.current.weather_code, weatherData.current.is_day).icon, { size: 32, className: "text-white drop-shadow-lg" }) : <Loader2 className="animate-spin" />}
                </div>
              </div>

              {/* Detailed Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                  <ThermometerSun size={20} className="text-white/70" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase font-bold">体感温度</p>
                    <p className="text-sm font-black font-mono">{weatherData?.current?.apparent_temperature ?? '--'}°C</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                  <Droplets size={20} className="text-white/70" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase font-bold">相对湿度</p>
                    <p className="text-sm font-black font-mono">{weatherData?.current?.relative_humidity_2m ?? '--'}%</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                  <Wind size={20} className="text-white/70" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase font-bold">风速</p>
                    <p className="text-sm font-black font-mono">{weatherData?.current?.wind_speed_10m ?? '--'} km/h</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                  <Umbrella size={20} className="text-white/70" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase font-bold">降水概率</p>
                    <p className="text-sm font-black font-mono">{weatherData?.daily?.precipitation_probability_max?.[0] ?? '--'}%</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                  <Sunrise size={20} className="text-white/70" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase font-bold">日出</p>
                    <p className="text-sm font-black font-mono">{weatherData?.daily?.sunrise?.[0] ? new Date(weatherData.daily.sunrise[0]).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}) : '--'}</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                  <Sunset size={20} className="text-white/70" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase font-bold">日落</p>
                    <p className="text-sm font-black font-mono">{weatherData?.daily?.sunset?.[0] ? new Date(weatherData.daily.sunset[0]).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}) : '--'}</p>
                  </div>
                </div>
              </div>

              {/* 24 Hour Forecast */}
              <div className="mb-6">
                <p className="text-xs font-bold text-white/70 mb-3 uppercase tracking-wider">24小时预报</p>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
                  {weatherData?.hourly?.time?.map((timeStr: string, index: number) => {
                    const date = new Date(timeStr);
                    const now = new Date();
                    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    
                    // Only show future hours (up to 24 hours ahead)
                    if (date < oneHourAgo || date > twentyFourHoursLater) return null;
                    
                    const hour = date.getHours();
                    const temp = weatherData.hourly.temperature_2m[index].toFixed(0);
                    const code = weatherData.hourly.weather_code[index];
                    const isDay = hour >= 6 && hour <= 18 ? 1 : 0; // Simple approximation
                    const { icon: HourlyIcon } = getWeatherInfo(code, isDay);
                    
                    return (
                      <div key={index} className="flex-shrink-0 w-16 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center snap-start">
                        <p className="text-[10px] font-bold text-white/70 mb-2">{hour}:00</p>
                        <HourlyIcon size={20} className="mb-2 text-white/90" />
                        <p className="text-sm font-black font-mono">{temp}°</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Forecast */}
              <div className="grid grid-cols-3 gap-4">
                {weatherData?.daily?.time?.slice(1, 4).map((timeStr: string, index: number) => {
                  const dayIndex = index + 1; // Skip today (index 0)
                  const maxTemp = weatherData.daily.temperature_2m_max[dayIndex].toFixed(0);
                  const minTemp = weatherData.daily.temperature_2m_min[dayIndex].toFixed(0);
                  const code = weatherData.daily.weather_code[dayIndex];
                  const { icon: DailyIcon, label } = getWeatherInfo(code, 1);

                  const dayLabels = ['明天', '后天', '大后天'];
                  const dayLabel = dayLabels[index] || timeStr;

                  return (
                    <div key={index} className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 border border-white/10 text-center hover:bg-white/20 transition-all hover:scale-105 duration-300">
                      <p className="text-xs font-bold opacity-70 mb-2">{dayLabel}</p>
                      <DailyIcon size={28} className="mx-auto mb-2 drop-shadow-xl" />
                      <p className="text-sm font-black mb-1 font-mono">{maxTemp}/{minTemp}°</p>
                      <p className="text-[10px] font-bold opacity-70">{label}</p>
                    </div>
                  );
                }) || [
                  { day: '明天', temp: '--/--°C', icon: CloudRain, label: '加载中' },
                  { day: '后天', temp: '--/--°C', icon: Sun, label: '加载中' },
                  { day: '大后天', temp: '--/--°C', icon: CloudSun, label: '加载中' },
                ].map((w, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/10 text-center">
                    <p className="text-xs font-bold opacity-70 mb-2">{w.day}</p>
                    <w.icon size={28} className="mx-auto mb-2" />
                    <p className="text-sm font-black mb-1 font-mono">{w.temp}</p>
                    <p className="text-[10px] font-bold opacity-70">{w.label}</p>
                  </div>
                ))}
              </div>

              {/* Agricultural Advice */}
              <div className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-400 text-yellow-900 rounded-xl flex items-center justify-center shadow-lg border border-yellow-300 flex-shrink-0 mt-1">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-xs font-black mb-1">农事提醒</p>
                  <p className="text-[11px] font-medium opacity-90 leading-relaxed">
                    {getAgriculturalAdvice(weatherData)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Quick Actions */}
        {isWidgetVisible('actions') && (
          <div className={cn("bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[40px] card-shadow p-8 border border-slate-100 dark:border-white/5 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-emerald-500/5 transition-all duration-500",
            !isWidgetVisible('weather') ? "lg:col-span-2" : ""
          )}>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 tracking-tight">快捷操作</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '病虫害识别', desc: '拍照智能诊断', icon: AlertCircle, color: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20', tab: 'ai' },
              { label: '作物生长分析', desc: 'AI 深度长势评估', icon: Sparkles, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', tab: 'ai' },
              { label: '农事百科', desc: '种植技术查询', icon: TrendingUp, color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', tab: 'knowledge' },
              { label: '农资商城', desc: '种子化肥采购', icon: Droplets, color: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20', link: 'https://www.cnhnb.com/' },
              { label: '智能决策', desc: '在线农技指导', icon: Activity, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', tab: 'management' },
              { label: '设备控制', desc: '远程控制设备', icon: Thermometer, color: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20', tab: 'management', hash: 'hardware-control' },
              { label: '数据报表', desc: '导出生产数据', icon: Calendar, color: 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20', tab: 'monitoring' },
              { label: '专家咨询', desc: '在线农业专家', icon: CheckCircle2, color: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-[#1A1A1A]/80 dark:text-slate-400 dark:border-white/5', action: 'expert' },
            ].map((action, i) => (
              <button 
                key={i}
                onClick={() => {
                  if (action.link) {
                    window.open(action.link, '_blank');
                  } else if (action.action === 'expert') {
                    setShowExpertModal(true);
                  } else if (action.tab) {
                    onNavigate(action.tab, action.hash);
                  }
                }}
                className="flex items-center gap-4 p-4 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-forest-green/20 dark:hover:border-emerald-500/30 hover:bg-white dark:hover:bg-[#1A1A1A]/50 transition-all text-left group shadow-sm"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm border", 
                  action.color)}>
                  <action.icon size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{action.label}</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

      {/* 专家咨询弹窗 */}
      <AnimatePresence>
        {showExpertModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExpertModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-xl bg-white/90 dark:bg-[#050505]/80 backdrop-blur-3xl rounded-[48px] p-12 shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-forest-green/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
              
              <div className="flex items-center gap-6 mb-10 relative">
                <div className="w-16 h-16 bg-forest-green/10 text-forest-green dark:text-emerald-400 rounded-[24px] flex items-center justify-center shrink-0 border border-forest-green/10 dark:border-emerald-500/10 shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">12316 农业服务热线</h3>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-1">全国通用 · 权威专家 · 24小时服务</p>
                </div>
              </div>

              <div className="space-y-4 mb-10 relative">
                {[
                  { title: '使用方法', content: '直接拨打 12316，无需加区号，覆盖全国。' },
                  { title: '服务时间', content: '多数地区早8点至晚6点专家在线，北京、贵州、兰州等地区24小时服务，支持语音留言。' },
                  { title: '服务内容', content: '小麦种植技术、缺氮/磷/钾诊断、病虫害防治、施肥指导等全品类农业问题。' },
                  { title: '优势', content: '一键对接本地农业专家，支持视频连线远程诊断，可匹配附近专家上门服务。' },
                ].map((item, i) => (
                  <div key={i} className="p-5 bg-slate-50/50 dark:bg-[#1A1A1A]/30 rounded-3xl border border-slate-100 dark:border-white/5 group hover:bg-white dark:hover:bg-white/5 transition-all">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1.5 group-hover:text-forest-green transition-colors">{item.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 relative">
                <button 
                  onClick={() => setShowExpertModal(false)}
                  className="flex-1 py-5 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 rounded-3xl font-black text-sm hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition-all border border-transparent dark:border-white/5 active:scale-95"
                >
                  关闭
                </button>
                <a 
                  href="tel:12316"
                  className="flex-1 py-5 bg-forest-green text-white rounded-3xl font-black text-sm hover:bg-forest-green/90 transition-all text-center flex items-center justify-center gap-3 shadow-xl shadow-forest-green/20 active:scale-95 shimmer-btn"
                >
                  <Activity size={18} />
                  立即拨打
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
