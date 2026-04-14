import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { Loader2, AlertCircle, ExternalLink, Newspaper, Gavel, TrendingUp, RefreshCw, Globe, Sparkles, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DataService from '../services/dataService';

interface NewsItem {
  title: string;
  time: string;
  source: string;
  link: string;
  content?: string;
}

interface NewsDetailModalProps {
  news: NewsItem | null;
  onClose: () => void;
}

const NewsDetailModal = React.memo<NewsDetailModalProps>(({ news, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-2xl rounded-[40px] shadow-2xl overflow-hidden w-full max-w-2xl border border-white/20 dark:border-white/5"
      >
        <div className="p-8 md:p-10 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                  {news?.source}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center gap-1.5">
                  <Clock size={14} />
                  {news?.time}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                {news?.title}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-2xl transition-all duration-300 group"
            >
              <X size={20} className="text-slate-500 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <div className="aspect-video w-full rounded-[32px] overflow-hidden bg-slate-100 dark:bg-white/5 relative group">
            <img 
              src={`https://picsum.photos/seed/${news?.title}/1200/600`} 
              alt="News Cover" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium whitespace-pre-wrap selection:bg-emerald-500/30">
              {news?.content || t('news.detail.placeholder', { source: news?.source || t('news.detail.unknown_source'), title: news?.title })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100 dark:border-white/5">
            <a 
              href={news?.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-center hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              {t('news.detail.visit_original')} <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
            <button 
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-slate-100/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-center hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all duration-300"
            >
              {t('news.detail.back_to_list')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

interface NewsModuleProps {
  user?: any;
}

const NewsModule: React.FC<NewsModuleProps> = ({ user }) => {
  const { t } = useTranslation();
  const [maraNews, setMaraNews] = useState<NewsItem[]>([]);
  const [tianxingNews, setTianxingNews] = useState<NewsItem[]>([]);
  const [govNews, setGovNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'policy' | 'industry' | 'service'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchNews = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const [maraData, tianxingData, govData] = await Promise.all([
        DataService.getNews('mara'),
        DataService.getNews('tianxing'),
        DataService.getNews('gov-service')
      ]);

      setMaraNews(maraData);
      setTianxingNews(tianxingData);
      setGovNews(govData);
      setLastUpdated(new Date());

      if (maraData.length === 0 && tianxingData.length === 0 && govData.length === 0) {
        if (!isBackground) setError(t('news.empty'));
      }
    } catch (err) {
      console.error('Fetch news failed:', err);
      if (!isBackground) setError(t('news.error'));
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredNews = () => {
    if (activeTab === 'policy') return maraNews;
    if (activeTab === 'industry') return tianxingNews;
    if (activeTab === 'service') return govNews;
    
    // 合并所有
    const combined = [...maraNews, ...govNews, ...tianxingNews];
    return combined;
  };

  const newsList = filteredNews().filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.source && item.source.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const featuredNews = [...maraNews, ...tianxingNews].slice(0, 3);
  const [currentFeatured, setCurrentFeatured] = useState(0);

  useEffect(() => {
    if (featuredNews.length === 0) return;
    const timer = setInterval(() => {
      setCurrentFeatured(prev => (prev + 1) % featuredNews.length);
    }, 15000); // Increased from 5000 to 15000
    return () => clearInterval(timer);
  }, [featuredNews.length]);

  const handleNewsClick = React.useCallback((e: React.MouseEvent, item: NewsItem) => {
    e.preventDefault();
    setSelectedNews(item);
    setShowDetailModal(true);
  }, []);

  const handleCloseModal = React.useCallback(() => {
    setShowDetailModal(false);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-20">
      <AnimatePresence>
        {showDetailModal && (
          <NewsDetailModal 
            news={selectedNews} 
            onClose={handleCloseModal} 
          />
        )}
      </AnimatePresence>
      {/* Featured News Carousel */}
      <div className="relative h-[450px] rounded-[48px] overflow-hidden shadow-2xl shadow-emerald-500/10 group border border-white/20 dark:border-white/5">
        <AnimatePresence mode="wait">
            {featuredNews.length > 0 && (
            <motion.div
              key={currentFeatured}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 block cursor-pointer"
              onClick={(e) => handleNewsClick(e, featuredNews[currentFeatured])}
            >
              <img 
                src={`https://picsum.photos/seed/agri-featured-${currentFeatured}/1200/600`} 
                alt="Featured" 
                className="w-full h-full object-cover transition-transform duration-[20s] group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 p-12 flex flex-col justify-end">
                <div className="max-w-3xl space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <span className="px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/30">
                      {featuredNews[currentFeatured].source}
                    </span>
                    <span className="text-white/70 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md bg-white/10 px-3 py-1 rounded-full border border-white/10">
                      <Clock size={14} />
                      {featuredNews[currentFeatured].time}
                    </span>
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl"
                  >
                    {featuredNews[currentFeatured].title}
                  </motion.h2>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-emerald-400 font-black text-sm group-hover:translate-x-2 transition-all duration-300"
                  >
                    {t('news.detail.visit_original')} <ExternalLink size={16} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carousel Indicators */}
        <div className="absolute bottom-10 right-12 flex gap-3 z-10">
          {featuredNews.map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentFeatured(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-700 ease-in-out",
                currentFeatured === i ? "w-12 bg-emerald-500 shadow-lg shadow-emerald-500/50" : "w-2 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/80 dark:bg-[#0A0A0A]/60 backdrop-blur-2xl p-4 rounded-[32px] border border-white/20 dark:border-white/5 shadow-2xl shadow-black/5">
            <div className="flex bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5">
              {[
                { id: 'all', label: t('knowledge.categories.all'), icon: Newspaper },
                { id: 'policy', label: t('knowledge.categories.policy'), icon: Gavel },
                { id: 'service', label: t('knowledge.categories.planting'), icon: Sparkles },
                { id: 'industry', label: t('knowledge.categories.market'), icon: TrendingUp }
              ].map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300",
                    activeTab === tab.id 
                      ? "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10 scale-105" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/30 dark:hover:bg-white/5"
                  )}
                >
                  <tab.icon size={14} className={cn(activeTab === tab.id ? "animate-pulse" : "")} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 max-w-md flex items-center gap-3 bg-slate-100/50 dark:bg-white/5 px-5 py-2.5 rounded-2xl border border-transparent focus-within:border-emerald-500/30 focus-within:bg-white dark:focus-within:bg-white/10 transition-all duration-300 shadow-inner">
              <Globe size={16} className="text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('knowledge.search')} 
                className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 w-full placeholder:text-slate-400/60 font-medium"
              />
            </div>

            <button 
              onClick={() => fetchNews()}
              disabled={loading}
              className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
            >
              <RefreshCw size={20} className={cn(loading && "animate-spin")} />
            </button>
          </div>

          {/* News List */}
          <div className="space-y-4 min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#121214]/80 rounded-[32px] card-shadow border border-slate-50 dark:border-white/5"
                >
                  <Loader2 className="text-forest-green animate-spin mb-4" size={40} />
                  <p className="text-slate-400 font-black">{t('app.loading')}</p>
                </motion.div>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#121214]/80 rounded-[32px] card-shadow border border-red-50 dark:border-red-900/20"
                >
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="text-red-500" size={32} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">{t('news.error')}</h3>
                  <p className="text-slate-400 font-medium mb-6">{error}</p>
                  <button 
                    onClick={() => fetchNews()}
                    className="px-8 py-3 bg-forest-green text-white rounded-2xl font-black hover:bg-opacity-90 transition-all"
                  >
                    {t('ai_assistant.errors.network.action')}
                  </button>
                </motion.div>
              ) : newsList.length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-black">{t('news.empty')}</div>
              ) : (
                <div className="space-y-4">
                  {newsList.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, ease: "easeOut" }}
                      onClick={(e) => handleNewsClick(e, item)}
                      className="bento-card p-6 flex gap-6 group hover:translate-x-2 transition-all duration-500 cursor-pointer"
                    >
                      <div className="w-44 h-32 bg-slate-100 dark:bg-white/5 rounded-[24px] overflow-hidden flex-shrink-0 relative shadow-inner">
                        <img 
                          src={`https://picsum.photos/seed/agri-news-${i}/400/300`} 
                          alt="News" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 shadow-lg border border-white/20 dark:border-white/10">
                          {item.source === '农业农村部' ? t('news.categories.policy') : item.source === '政务服务平台' ? t('knowledge.categories.planting') : (item.source || t('news.categories.tech'))}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-2">
                        <div>
                          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight tracking-tight">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-5 text-xs font-bold text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500/40 animate-pulse" />
                              {item.source}
                            </span>
                            <span className="flex items-center gap-2">
                              <Clock size={14} className="text-slate-300 dark:text-slate-600" />
                              {item.time}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-black opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 gap-2">
                          {t('news.detail.visit_original')} <ExternalLink size={14} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Bottom Links */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                    <a 
                      href="http://www.moa.gov.cn/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 bg-white/50 dark:bg-white/5 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-slate-200/50 dark:border-white/5 rounded-3xl p-5 flex items-center justify-between group transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                          <Globe size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">中华人民共和国农业农村部</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">官方网站主页</p>
                        </div>
                      </div>
                      <ExternalLink size={18} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                    </a>
                    <a 
                      href="https://www.cnhnb.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 bg-white/50 dark:bg-white/5 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-slate-200/50 dark:border-white/5 rounded-3xl p-5 flex items-center justify-between group transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">中国惠农网</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">农业B2B服务平台</p>
                        </div>
                      </div>
                      <ExternalLink size={18} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                    </a>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Sources Info */}
          <div className="bento-card p-8">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Globe size={18} />
              </div>
              权威数据源
            </h3>
            <div className="space-y-4">
              {[
                { name: '农业农村部', desc: '官方政策与指导意见', color: 'bg-blue-500' },
                { name: '天行数据', desc: '实时行业动态与行情', color: 'bg-emerald-500' },
                { name: '政务服务', desc: '本地化农业服务资讯', color: 'bg-amber-500' }
              ].map((source, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors duration-300 shadow-sm">
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm animate-pulse", source.color)} />
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white">{source.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{source.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Section */}
          <div className="bg-white/80 dark:bg-[#0A0A0A]/60 backdrop-blur-2xl rounded-[40px] shadow-2xl shadow-black/5 p-8 border border-white/20 dark:border-white/10">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp size={18} />
              </div>
              实时热点
            </h3>
            <div className="space-y-8">
                  {tianxingNews.slice(0, 5).map((item, i) => (
                <div 
                  key={i} 
                  onClick={(e) => handleNewsClick(e, item)}
                  className="flex gap-4 group cursor-pointer items-start"
                >
                  <span className={cn(
                    "text-2xl font-black italic leading-none transition-all duration-300",
                    i < 3 ? "text-emerald-500/20 dark:text-emerald-500/40 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:scale-110" : "text-slate-100 dark:text-white/5"
                  )}>
                    {i + 1 < 10 ? `0${i + 1}` : i + 1}
                  </span>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-relaxed tracking-tight">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats/Info */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-[40px] shadow-2xl shadow-emerald-500/30 p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                资讯统计
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10 hover:bg-white/20 transition-colors duration-300">
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">今日新增资讯</p>
                  <p className="text-4xl font-black tracking-tighter">+{maraNews.length + tianxingNews.length}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10 hover:bg-white/20 transition-colors duration-300">
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">覆盖数据源</p>
                  <p className="text-4xl font-black tracking-tighter">3个</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsModule;
