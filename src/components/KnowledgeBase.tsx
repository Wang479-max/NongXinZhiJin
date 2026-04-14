import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Search, ChevronRight, BookOpen, HelpCircle, Lightbulb, Loader2, ArrowLeft, ExternalLink, Sparkles, RefreshCw, Clock, Heart, History, Trash2, AlertCircle, X, Link, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import DataService from '../services/dataService';

interface KnowledgeManual {
  title: string;
  summary: string;
  sections: {
    title: string;
    items: string[];
  }[];
  source: string;
}

interface Article {
  id: string;
  title: string;
  cat: string;
  date: string;
  img: string;
  summary: string;
  content: string;
  link?: string;
}

interface KnowledgeBaseProps {
  user: any;
  initialQuery?: string;
  onQueryHandled?: () => void;
  onNavigate?: (tab: string, query?: string) => void;
}

const highlightText = (text: string, keyword: string) => {
  if (!keyword || !keyword.trim()) return text;
  
  // Escape regex special characters in keyword
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} className="bg-amber-200 text-amber-900 rounded-sm px-0.5 font-bold">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ user, initialQuery, onQueryHandled, onNavigate }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manual, setManual] = useState<KnowledgeManual | null>(null);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [plots, setPlots] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Article[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContent, setShareContent] = useState<{ title: string; summary: string } | null>(null);

  // AI Generation Progress Simulation
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const fetchRecommendations = useCallback(async (category: string, targetPage: number, isLoadMore = false, silent = false) => {
    if (!silent) {
      if (isLoadMore) setIsLoading(true);
      else setIsRefreshing(true);
    }
    
    try {
      setError(null);
      // Use a random seed for "Refresh" to get different results
      const seed = isLoadMore ? targetPage : Math.floor(Math.random() * 1000);
      const nextPage = isLoadMore ? targetPage + 1 : 1;
      
      const data = await DataService.getKnowledgeRecommendations(category, nextPage, 6, seed);
      
      if (isLoadMore) {
        setRecommendations(prev => [...prev, ...data]);
        setPage(nextPage);
      } else {
        setRecommendations(data);
        setPage(1);
      }
      
      setHasMore(data.length === 6);
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('Failed to fetch recommendations:', error);
      setError(error.message || '获取推荐内容失败，请检查网络连接。');
    } finally {
      if (!silent) {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    }
  }, []); // Stable function

  const handleShare = (title: string, summary: string) => {
    setShareContent({ title, summary });
    setShowShareModal(true);
  };

  const ShareModal = () => (
    <AnimatePresence>
      {showShareModal && shareContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-[#0A0A0A] rounded-[40px] shadow-2xl overflow-hidden w-full max-w-sm border dark:border-white/5"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-forest-green/10 rounded-2xl flex items-center justify-center text-forest-green">
                  <Sparkles size={24} />
                </div>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="px-3 py-1 bg-forest-green text-white text-[10px] font-black uppercase tracking-widest rounded-full inline-block">
                  {t('knowledge.share.brand')}
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  {shareContent.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {shareContent.summary}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center text-slate-300 overflow-hidden">
                  <QRCodeSVG value={window.location.href} size={64} />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-white">{t('knowledge.share.scan')}</div>
                  <div className="text-[10px] text-slate-400 font-bold">{t('knowledge.share.scan_desc')}</div>
                </div>
              </div>

              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full py-4 bg-forest-green text-white rounded-2xl font-black text-lg shadow-lg shadow-forest-green/20 hover:bg-emerald-green transition-all"
              >
                {t('knowledge.share.done')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  useEffect(() => {
    // Load search history
    const history = localStorage.getItem('agri_search_history');
    if (history) setSearchHistory(JSON.parse(history));
    
    // Initial fetch of favorites to get IDs
    const initFavorites = async () => {
      try {
        const favs = await DataService.getFavorites(user?.username);
        setBookmarkedIds(favs.map((f: any) => f.id));
        if (showBookmarks) setFavorites(favs);
      } catch (e) {
        console.error('Init favorites error:', e);
      }
    };
    initFavorites();

    DataService.getPlots().then(data => setPlots(data));
  }, [user?.username]);

  const fetchFavorites = useCallback(async () => {
    setLoadingFavorites(true);
    try {
      const data = await DataService.getFavorites(user?.username);
      setFavorites(data);
      setBookmarkedIds(data.map((f: any) => f.id));
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  }, [user?.username]);

  useEffect(() => {
    if (showBookmarks) {
      fetchFavorites();
    }
  }, [showBookmarks, fetchFavorites]);

  // Update recommendations when category changes
  useEffect(() => {
    if (showBookmarks) return;
    
    fetchRecommendations(activeCategory, 1, false);
  }, [activeCategory, showBookmarks, fetchRecommendations]);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      handleSearch(initialQuery);
      onQueryHandled?.();
    }
  }, [initialQuery]);

  const categories = [
    { id: '全部', label: t('knowledge.categories.all'), icon: BookOpen },
    { id: '病虫害防治', label: t('knowledge.categories.pest'), icon: HelpCircle },
    { id: '种植技术', label: t('knowledge.categories.planting'), icon: Lightbulb },
    { id: '政策法规', label: t('knowledge.categories.policy'), icon: Sparkles },
    { id: '市场行情', label: t('knowledge.categories.market'), icon: RefreshCw }
  ];
  
  const hotTopics = [
    { title: '小麦种植手册', query: '小麦种植技术' },
    { title: '苹果种植10大要点', query: '苹果栽培' },
    { title: '玉米高产管理', query: '玉米种植' },
    { title: '温室大棚蔬菜', query: '温室蔬菜栽培' },
    { title: '水稻病虫害防治', query: '水稻病虫害' },
    { title: '测土配方施肥', query: '测土配方施肥技术' }
  ];

  const getSeasonalTips = () => {
    const month = new Date().getMonth() + 1;
    const tips = [
      { m: [3, 4, 5], tip: t('knowledge.seasonal_tips.spring'), icon: '🌱' },
      { m: [6, 7, 8], tip: t('knowledge.seasonal_tips.summer'), icon: '☀️' },
      { m: [9, 10, 11], tip: t('knowledge.seasonal_tips.autumn'), icon: '🍂' },
      { m: [12, 1, 2], tip: t('knowledge.seasonal_tips.winter'), icon: '❄️' }
    ];
    const currentTip = tips.find(t => t.m.includes(month)) || tips[0];
    return [
      { month: `${month}${t('app.month')}`, tip: currentTip.tip, icon: currentTip.icon },
      { month: t('knowledge.seasonal_tips.month_focus'), tip: t('knowledge.seasonal_tips.focus'), icon: '⚠️' }
    ];
  };

  const rightContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rightContentRef.current) {
      rightContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedArticle, manual]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setIsLoading(true);
    setManual(null);
    setSelectedArticle(null);

    // Save to history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('agri_search_history', JSON.stringify(newHistory));

    try {
      setError(null);
      const data = await DataService.searchKnowledge(query);
      setManual(data.aiResult);
      // Also show local results if any
      if (data.localResults && data.localResults.length > 0) {
        setRecommendations(data.localResults);
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      setError(error.message || '搜索失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (bookmarkedIds.includes(id)) {
        await DataService.removeFavorite(id, user?.username);
        setBookmarkedIds(prev => prev.filter(bid => bid !== id));
        if (showBookmarks) {
          setFavorites(prev => prev.filter(f => f.id !== id));
        }
      } else {
        await DataService.addFavorite(id, user?.username);
        setBookmarkedIds(prev => [...prev, id]);
        if (showBookmarks) {
          fetchFavorites();
        }
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const seasonalTips = getSeasonalTips();

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('agri_search_history');
  };

  return (
    <div className="flex flex-col h-full gap-8">
      <ShareModal />
      {/* 顶部搜索栏 */}
      <div className="flex flex-col gap-5">
        <div className="bg-white/80 dark:bg-[#0A0A0A]/60 backdrop-blur-2xl p-8 rounded-[40px] shadow-2xl shadow-black/5 flex items-center gap-6 border border-white/40 dark:border-white/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="flex-1 flex items-center gap-5 bg-slate-50/80 dark:bg-[#121214]/50 px-8 py-4 rounded-3xl border border-slate-200/50 dark:border-white/10 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-inner">
            <Search className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={24} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder={t('knowledge.search')} 
              className="flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 font-bold text-lg placeholder:text-slate-400/70" 
            />
          </div>
          <button 
            onClick={() => handleSearch(searchQuery)}
            disabled={isLoading}
            className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl font-black text-lg flex items-center gap-3 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50 relative overflow-hidden active:scale-95"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 size={22} className="animate-spin" />
                <span>AI 解析中...</span>
              </div>
            ) : (
              <>
                <Sparkles size={22} />
                AI 深度解析
              </>
            )}
            {isLoading && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
                className="absolute bottom-0 left-0 h-1.5 bg-white/40"
              />
            )}
          </button>
        </div>

        {searchHistory.length > 0 && (
          <div className="flex items-center gap-4 px-6">
            <History size={16} className="text-slate-400" />
            <div className="flex flex-wrap gap-3">
              {searchHistory.map((h, i) => (
                <button 
                  key={i}
                  onClick={() => {
                    setSearchQuery(h);
                    handleSearch(h);
                  }}
                  className="px-4 py-1.5 bg-white dark:bg-[#1A1A1A] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-2xl text-xs font-black transition-all border border-slate-100 dark:border-white/5 shadow-sm active:scale-95"
                >
                  {h}
                </button>
              ))}
              <button 
                onClick={clearHistory}
                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                title="清除历史"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-8 flex-1 overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-1/4 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white/80 dark:bg-[#0A0A0A]/60 backdrop-blur-2xl rounded-[40px] shadow-2xl shadow-black/5 p-8 border border-white/40 dark:border-white/10">
            <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 text-xl">
              <BookOpen size={24} className="text-emerald-600" />
              知识分类
            </h3>
            <div className="space-y-3">
              <div 
                onClick={() => {
                  setActiveCategory('全部');
                  setShowBookmarks(true);
                }}
                className={cn(
                  "p-5 rounded-3xl cursor-pointer transition-all flex items-center justify-between group mb-6 border-2", 
                  showBookmarks 
                    ? "bg-rose-500 text-white shadow-2xl shadow-rose-500/30 border-rose-400" 
                    : "bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <Heart size={22} fill={showBookmarks ? "currentColor" : "none"} className={cn(showBookmarks && "animate-pulse")} />
                  <span className="font-black text-base">我的收藏</span>
                </div>
                <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">{bookmarkedIds.length}</span>
              </div>

              <div className="h-px bg-slate-100 dark:bg-white/10 my-6" />

              {categories.map((cat, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setShowBookmarks(false);
                  }}
                  className={cn(
                    "p-5 rounded-3xl cursor-pointer transition-all flex items-center justify-between group border-2", 
                    activeCategory === cat.id && !showBookmarks
                      ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30 border-emerald-500" 
                      : "hover:bg-slate-50 dark:hover:bg-[#1A1A1A]/60 text-slate-600 dark:text-slate-400 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      activeCategory === cat.id && !showBookmarks ? "bg-white scale-150" : "bg-slate-300 dark:bg-slate-700 group-hover:scale-150 group-hover:bg-emerald-500"
                    )} />
                    <span className="font-black text-base">{cat.label}</span>
                  </div>
                  <ChevronRight size={20} className={cn(activeCategory === cat.id && !showBookmarks ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all")} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[40px] shadow-2xl shadow-indigo-500/20 p-8 text-white border border-white/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            
            <h3 className="font-black mb-6 flex items-center gap-3 text-xl relative z-10">
              <Sparkles size={24} />
              热门手册
            </h3>
            <div className="grid grid-cols-1 gap-3 relative z-10">
              {hotTopics.map((topic, i) => (
                <button 
                  key={i}
                  onClick={() => handleSearch(topic.query)}
                  className="w-full text-left p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-sm font-black border border-white/10 truncate hover:translate-x-2 active:scale-95"
                >
                  {topic.title}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#0A0A0A]/60 backdrop-blur-2xl rounded-[40px] shadow-2xl shadow-black/5 p-8 border border-white/40 dark:border-white/10">
            <h3 className="font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3 text-xl">
              <Clock size={24} className="text-amber-500" />
              农事提醒
            </h3>
            <div className="space-y-5">
              {seasonalTips.map((tip, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-3xl bg-slate-50/80 dark:bg-[#1A1A1A]/50 border border-slate-100 dark:border-white/10 hover:shadow-lg transition-all">
                  <span className="text-3xl">{tip.icon}</span>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tip.month}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-black leading-tight">{tip.tip}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧内容区 */}
        <div 
          ref={rightContentRef}
          className="flex-1 overflow-y-auto pr-2 custom-scrollbar scroll-smooth"
        >
          <AnimatePresence mode="wait" initial={false}>
            {manual ? (
              <motion.div 
                key="manual-view"
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-white/90 dark:bg-[#0A0A0A]/60 backdrop-blur-3xl rounded-[48px] shadow-2xl shadow-black/10 p-12 relative overflow-hidden border border-white/40 dark:border-white/10 min-h-full"
              >
                {/* 装饰背景 */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full -mr-48 -mt-48 blur-[120px] opacity-60" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 dark:bg-teal-500/20 rounded-full -ml-32 -mb-32 blur-[100px] opacity-40" />
                
                <button 
                  onClick={() => setManual(null)}
                  className="mb-10 flex items-center gap-3 text-slate-400 hover:text-emerald-600 transition-all font-black text-sm group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                  返回知识列表
                </button>

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                      <Sparkles size={14} />
                      AI 专家深度解析手册
                    </div>
                    
                    {/* 联动地块提醒 */}
                    {plots.some(p => manual.title.includes(p.crop) || manual.summary.includes(p.crop)) && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-5 bg-amber-50/90 dark:bg-amber-900/20 backdrop-blur-xl border border-amber-200/50 dark:border-amber-500/20 p-4 rounded-3xl shadow-xl shadow-amber-500/10"
                      >
                        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 font-black text-xs">
                          <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
                            <Sparkles size={16} />
                          </div>
                          <span>检测到您的地块有关联作物</span>
                        </div>
                        <button 
                          onClick={() => onNavigate?.('management')}
                          className="px-6 py-2 bg-amber-500 text-white rounded-2xl text-[10px] font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                        >
                          前往管理
                        </button>
                      </motion.div>
                    )}
                  </div>

                  <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">{highlightText(manual.title, searchQuery)}</h2>
                  <div className="relative mb-12">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-full" />
                    <p className="text-xl text-slate-600 dark:text-slate-300 font-bold pl-8 py-2 leading-relaxed italic">
                      "{highlightText(manual.summary, searchQuery)}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-16">
                    {manual.sections.map((section, i) => (
                      <div key={i} className="space-y-8">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20 border border-emerald-400/30">
                            {section.title.includes('种植') || section.title.includes('技术') ? <BookOpen size={28} /> :
                             section.title.includes('问题') || section.title.includes('风险') ? <HelpCircle size={28} /> :
                             section.title.includes('建议') || section.title.includes('核心') ? <Lightbulb size={28} /> :
                             <Sparkles size={28} />}
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {highlightText(section.title, searchQuery)}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          {section.items.map((item, j) => (
                            <motion.div 
                              key={j} 
                              whileHover={{ x: 10 }}
                              className="bento-card p-8 group"
                            >
                              <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                  {j + 1}
                                </div>
                                <p className="text-lg text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{highlightText(item, searchQuery)}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-20 pt-10 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1A1A1A] flex items-center justify-center text-slate-400">
                        <BookOpen size={14} />
                      </div>
                      <span className="text-xs text-slate-400 font-black uppercase tracking-widest">数据来源: {manual.source || '农芯智境 AI 知识库'}</span>
                    </div>
                    <button 
                      onClick={() => handleShare(manual.title, manual.summary)}
                      className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black flex items-center gap-2 hover:scale-105 transition-all shadow-xl active:scale-95"
                    >
                      分享知识卡片 <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : selectedArticle ? (
              <motion.div 
                key="article-view"
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bento-card p-12 relative overflow-hidden min-h-full"
              >
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="mb-10 flex items-center gap-3 text-slate-400 hover:text-emerald-600 transition-all font-black text-sm group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                  返回知识列表
                </button>

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-6">
                      <span className="px-6 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                        {selectedArticle.cat}
                      </span>
                      <span className="text-slate-400 text-xs font-black flex items-center gap-2 uppercase tracking-widest">
                        <Clock size={16} className="text-emerald-500" />
                        {selectedArticle.date}
                      </span>
                    </div>

                    {/* 联动地块提醒 */}
                    {plots.some(p => selectedArticle.title.includes(p.crop) || selectedArticle.summary.includes(p.crop) || selectedArticle.content.includes(p.crop)) && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-5 bg-amber-50/90 dark:bg-amber-900/20 backdrop-blur-xl border border-amber-200/50 dark:border-amber-500/20 p-4 rounded-3xl shadow-xl shadow-amber-500/10"
                      >
                        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 font-black text-xs">
                          <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
                            <Sparkles size={16} />
                          </div>
                          <span>检测到您的地块有关联作物</span>
                        </div>
                        <button 
                          onClick={() => onNavigate?.('management')}
                          className="px-6 py-2 bg-amber-500 text-white rounded-2xl text-[10px] font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                        >
                          前往管理
                        </button>
                      </motion.div>
                    )}
                  </div>

                  <div className="h-[450px] w-full rounded-[40px] overflow-hidden mb-12 border border-slate-100 dark:border-white/10 shadow-2xl relative group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                    <img 
                      src={`https://picsum.photos/seed/agri-${selectedArticle.img}/1200/800`} 
                      alt={selectedArticle.title} 
                      className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-1000"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-10 leading-tight tracking-tight">{selectedArticle.title}</h2>
                  
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-2xl text-slate-700 dark:text-slate-200 leading-relaxed font-bold mb-12 border-l-8 border-emerald-500 pl-10 py-2">
                      {selectedArticle.content}
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-[#0A0A0A]/60 p-10 rounded-[40px] border border-slate-100 dark:border-white/10 mb-12 shadow-inner">
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <Lightbulb className="text-amber-500" size={28} />
                        核心内容摘要
                      </h4>
                      <ul className="space-y-6">
                        <li className="flex gap-4 text-lg text-slate-700 dark:text-slate-300 font-bold">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                          <span>该技术在实际生产中已得到广泛验证，能有效提升作物产量约 15%-20%。</span>
                        </li>
                        <li className="flex gap-4 text-lg text-slate-700 dark:text-slate-300 font-bold">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                          <span>重点在于前期的环境评估与设备调试，确保各项指标处于最优区间。</span>
                        </li>
                        <li className="flex gap-4 text-lg text-slate-700 dark:text-slate-300 font-bold">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                          <span>建议农户根据自身地块实际情况，灵活调整实施方案。</span>
                        </li>
                      </ul>
                    </div>

                    <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-12 font-medium">
                      随着现代农业技术的不断进步，越来越多的数字化、智能化手段被引入到田间地头。本文所介绍的内容仅为冰山一角，更多详细的操作规程和技术细节，建议咨询当地农业技术推广部门或查阅专业文献。
                    </p>

                    <div className="flex justify-center mt-16 mb-12">
                      <a 
                        href={selectedArticle.link || `https://www.baidu.com/s?wd=${encodeURIComponent(selectedArticle.title + ' 农业技术')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-12 py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xl flex items-center gap-4 hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/30 hover:-translate-y-2 active:scale-95 no-underline"
                      >
                        <BookOpen size={24} />
                        {t('news.detail.visit_original') || '访问原文'}
                        <ExternalLink size={20} className="ml-2 opacity-70" />
                      </a>
                    </div>
                  </div>

                  {/* 相关推荐 */}
                  <div className="mt-20 pt-12 border-t border-slate-100 dark:border-white/10">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 flex items-center gap-3">
                      <BookOpen size={28} className="text-emerald-600" />
                      相关阅读推荐
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {recommendations
                        .filter(r => r.id !== selectedArticle.id)
                        .slice(0, 2)
                        .map((related, i) => (
                          <motion.div 
                            key={i}
                            whileHover={{ y: -5 }}
                            onClick={() => {
                              setSelectedArticle(related);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex gap-6 p-6 rounded-[32px] bg-slate-50 dark:bg-[#1A1A1A]/40 border border-slate-100 dark:border-white/10 hover:bg-white dark:hover:bg-[#1A1A1A]/60 transition-all cursor-pointer group shadow-sm hover:shadow-xl"
                          >
                            <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 shadow-md">
                              <img 
                                src={`https://picsum.photos/seed/agri-${related.img}/300/300`} 
                                alt={related.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex flex-col justify-center">
                              <h4 className="text-lg font-black text-slate-900 dark:text-white line-clamp-2 mb-3 group-hover:text-emerald-600 transition-colors leading-tight">
                                {related.title}
                              </h4>
                              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{related.date}</span>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>

                  <div className="mt-16 pt-10 border-t border-slate-100 dark:border-white/10 flex flex-wrap gap-6 justify-between items-center">
                    <button 
                      onClick={() => handleSearch(selectedArticle.title)}
                      className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-base flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                    >
                      <Sparkles size={20} />
                      使用 AI 深度解析
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        // Show a temporary toast or notification if possible, 
                        // but for now we'll just use the existing handleShare logic if it has a success state
                        handleShare(selectedArticle.title, selectedArticle.summary);
                      }}
                      className="text-sm text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-2 hover:underline tracking-widest uppercase"
                    >
                      复制分享链接 <Link size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="list-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-5">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {showBookmarks ? '我的收藏' : activeCategory === '全部' ? '今日推荐' : `${activeCategory} · 推荐`}
                    </h3>
                    {!showBookmarks && (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/20">
                        <Clock size={14} />
                        上次更新: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  {!showBookmarks && (
                    <button 
                      onClick={() => fetchRecommendations(activeCategory, 1, false)}
                      disabled={isRefreshing}
                      className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-[#050505]/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-black text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                    >
                      <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                      换一批内容
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-10">
                  {error ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center mb-6 text-rose-500">
                        <AlertCircle size={40} />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">内容加载失败</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">{error}</p>
                      <button 
                        onClick={() => fetchRecommendations(activeCategory, 1, false)}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                      >
                        <RefreshCw size={18} />
                        重试加载
                      </button>
                    </div>
                  ) : isRefreshing && recommendations.length === 0 ? (
                    // Skeleton Loader
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-white dark:bg-[#050505]/50 rounded-[40px] card-shadow overflow-hidden animate-pulse border border-slate-100 dark:border-white/10">
                        <div className="h-64 bg-slate-100 dark:bg-[#0A0A0A]" />
                        <div className="p-8 space-y-5">
                          <div className="h-8 bg-slate-100 dark:bg-[#0A0A0A] rounded-xl w-3/4" />
                          <div className="h-5 bg-slate-100 dark:bg-[#0A0A0A] rounded-xl w-full" />
                          <div className="h-5 bg-slate-100 dark:bg-[#0A0A0A] rounded-xl w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : showBookmarks ? (
                    favorites.length > 0 ? (
                      favorites.map((article, i) => (
                        <motion.div 
                          key={`${article.id}-${i}`} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => setSelectedArticle(article)}
                          className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-[32px] shadow-xl shadow-black/5 overflow-hidden group cursor-pointer hover:translate-y-[-4px] transition-all relative border border-white/20 dark:border-white/10"
                        >
                          <div className="h-48 bg-slate-100 dark:bg-[#050505] overflow-hidden relative">
                            <img 
                              src={`https://picsum.photos/seed/agri-${article.img}/600/400`} 
                              alt={article.title} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md rounded-full text-[10px] font-black text-forest-green border border-white/20">
                              {article.cat}
                            </div>
                            <button 
                              onClick={(e) => toggleBookmark(article.id, e)}
                              className="absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all border border-red-400 bg-red-500 text-white"
                            >
                              <Heart size={14} fill="currentColor" />
                            </button>
                          </div>
                          <div className="p-6">
                            <h4 className="font-black text-slate-800 dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-forest-green transition-colors">
                              {article.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-400/70 font-medium line-clamp-2 mb-4">
                              {article.summary}
                            </p>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1 group-hover:text-forest-green transition-colors">
                                <BookOpen size={12} />
                                阅读全文
                              </span>
                              <span>{article.date}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                        <Heart size={48} className="mb-4 opacity-20" />
                        <p className="font-black">暂无收藏内容</p>
                        <p className="text-xs font-bold mt-2">点击文章右上角的爱心即可收藏</p>
                      </div>
                    )
                  ) : (
                    recommendations.map((article, i) => (
                      <motion.div 
                        key={`${article.id}-${i}`} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (i % 6) * 0.1 }}
                        onClick={() => setSelectedArticle(article)}
                        className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-[32px] shadow-xl shadow-black/5 overflow-hidden group cursor-pointer hover:translate-y-[-4px] transition-all relative border border-white/20 dark:border-white/10"
                      >
                      <div className="h-48 bg-slate-100 dark:bg-[#050505] overflow-hidden relative">
                        <img 
                          src={`https://picsum.photos/seed/agri-${article.img}/600/400`} 
                          alt={article.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md rounded-full text-[10px] font-black text-forest-green border border-white/20">
                          {article.cat}
                        </div>
                        <button 
                          onClick={(e) => toggleBookmark(article.id, e)}
                          className={cn(
                            "absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all border border-white/20",
                            bookmarkedIds.includes(article.id) ? "bg-red-500 text-white border-red-400" : "bg-white/90 dark:bg-[#0A0A0A]/90 text-slate-400 hover:text-red-500"
                          )}
                        >
                          <Heart size={14} fill={bookmarkedIds.includes(article.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="p-6">
                        <h4 className="font-black text-slate-800 dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-forest-green transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400/70 font-medium line-clamp-2 mb-4">
                          {article.summary}
                        </p>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1 group-hover:text-forest-green transition-colors">
                            <BookOpen size={12} />
                            阅读全文
                          </span>
                          <span>{article.date}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                </div>

                {hasMore && recommendations.length > 0 && (
                  <div className="flex justify-center pb-10">
                    <button 
                      onClick={() => fetchRecommendations(activeCategory, page, true)}
                      disabled={isLoading}
                      className="px-10 py-4 bg-white dark:bg-[#050505]/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-400 hover:border-forest-green hover:text-forest-green transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          加载中...
                        </>
                      ) : (
                        <>
                          <ChevronRight size={18} className="rotate-90" />
                          加载更多内容
                        </>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
