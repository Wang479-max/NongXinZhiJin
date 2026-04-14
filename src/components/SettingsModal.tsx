import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Bell, Palette, Shield, Smartphone, LogOut, CheckCircle2, Loader2, Sparkles, Cpu, Key, Info, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import DataService, { getUserApiKeys, setUserApiKeys } from '../services/dataService';
import { useNotifications } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
  onUpdateUser: (user: any) => void;
  initialTab?: 'profile' | 'notifications' | 'appearance' | 'security' | 'ai';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, onLogout, onUpdateUser, initialTab }) => {
  const { addNotification } = useNotifications();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'ai'>('profile');
  const [saved, setSaved] = useState(false);

  // Profile state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // AI state
  const [userQwenKey, setUserQwenKey] = useState('');
  const [userZhipuKey, setUserZhipuKey] = useState('');

  // Security state
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is2FAEnabled || false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Avatar presets
  const avatarPresets = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Tigger',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna'
  ];

  // Load saved settings or use defaults
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('nxzj_notifications');
    return saved ? JSON.parse(saved) : {
      system: true,
      alert: true,
      ai: true,
      news: false
    };
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nxzj_theme') || 'light';
  });

  // Load settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setUsername(user?.username || '');
      setEmail(user?.email || '');
      setPhone(user?.phone || '');
      setIs2FAEnabled(user?.is2FAEnabled || false);
      
      try {
        const { qwenKey, zhipuKey } = getUserApiKeys();
        setUserQwenKey(qwenKey);
        setUserZhipuKey(zhipuKey);

        const savedNotifications = localStorage.getItem('nxzj_notifications');
        if (savedNotifications) {
          setNotifications(JSON.parse(savedNotifications));
        }
        const savedTheme = localStorage.getItem('nxzj_theme');
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    try {
      // Save settings to localStorage
      localStorage.setItem('nxzj_notifications', JSON.stringify(notifications));
      localStorage.setItem('nxzj_theme', theme);
      setUserApiKeys(userQwenKey, userZhipuKey);
      
      // Update user profile
      const updatedUser = {
        ...user,
        username,
        email,
        phone,
        avatar,
        is2FAEnabled
      };
      
      await DataService.updateUserProfile(updatedUser);
      onUpdateUser(updatedUser);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      addNotification({
        title: '保存成功',
        message: '您的设置已成功保存。',
        type: 'success'
      });
    } catch (e) {
      console.error('Failed to save settings', e);
      addNotification({
        title: '保存失败',
        message: '保存设置失败，请检查网络连接。',
        type: 'error'
      });
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    localStorage.setItem('nxzj_notifications', JSON.stringify(newNotifications));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('nxzj_theme', newTheme);
    
    // Apply theme immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    }
  };

  const handleToggle2FA = async () => {
    try {
      const newState = !is2FAEnabled;
      if (newState) {
        await DataService.enable2FA(user.username);
      } else {
        await DataService.disable2FA(user.username);
      }
      setIs2FAEnabled(newState);
      const updatedUser = { ...user, is2FAEnabled: newState };
      onUpdateUser(updatedUser);
      addNotification({
        title: newState ? '双重认证已开启' : '双重认证已关闭',
        message: newState ? '您的账号现在更加安全了。' : '双重认证已关闭，建议您保持开启以保护账号安全。',
        type: 'success'
      });
    } catch (e) {
      console.error('Failed to toggle 2FA', e);
      addNotification({
        title: '操作失败',
        message: '操作失败，请稍后重试。',
        type: 'error'
      });
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: <User size={18} /> },
    { id: 'notifications', label: t('settings.notifications'), icon: <Bell size={18} /> },
    { id: 'appearance', label: t('settings.appearance'), icon: <Palette size={18} /> },
    { id: 'ai', label: t('settings.ai'), icon: <Cpu size={18} /> },
    { id: 'security', label: t('settings.security'), icon: <Shield size={18} /> },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl glass-panel rounded-[48px] shadow-2xl z-50 overflow-hidden flex flex-col md:flex-row h-[650px] max-h-[90vh]"
          >
            {/* Sidebar */}
            <div className="w-full md:w-72 bg-slate-50/30 dark:bg-white/5 backdrop-blur-md p-8 border-r border-white/20 dark:border-white/5 flex flex-col">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Smartphone size={22} />
                  </div>
                  {t('settings.title')}
                </h2>
                <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-white/50 dark:hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <nav className="flex-1 space-y-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 rounded-[24px] font-black transition-all duration-300 text-sm tracking-tight group",
                      activeTab === tab.id 
                        ? "bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 scale-105" 
                        : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <span className={cn(
                      "transition-transform duration-300",
                      activeTab === tab.id ? "scale-110" : "group-hover:scale-110"
                    )}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-8 border-t border-white/20 dark:border-white/5">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-[24px] font-black text-sm text-red-500 hover:bg-red-500/10 transition-all duration-300 tracking-tight group"
                >
                  <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                  {t('app.logout')}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-10 overflow-y-auto relative bg-white/40 dark:bg-black/20 backdrop-blur-sm custom-scrollbar">
              <button onClick={onClose} className="hidden md:block absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-white/50 dark:hover:bg-white/10 transition-all group">
                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>

              <div className="max-w-2xl mx-auto">
                <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <motion.div 
                      key="profile"
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">个人资料</h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">管理您的个人信息和账户设置，让平台更懂您。</p>
                      </div>
                      
                      <div className="flex flex-col gap-8">
                        <div className="flex items-center gap-8">
                          <div className="relative group">
                            <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-black border-4 border-white dark:border-white/10 shadow-2xl overflow-hidden transition-transform duration-500 group-hover:scale-105">
                              {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                username?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-lg flex items-center justify-center text-emerald-500 border border-slate-100 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Palette size={18} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">更换头像</h4>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">选择一个代表您的个性化头像</p>
                            <div className="flex flex-wrap gap-3">
                              {avatarPresets.map((p, i) => (
                                <button 
                                  key={i}
                                  onClick={() => setAvatar(p)}
                                  className={cn(
                                    "w-10 h-10 rounded-xl border-2 transition-all duration-300 overflow-hidden shadow-sm",
                                    avatar === p ? "border-emerald-500 scale-110 shadow-emerald-500/20" : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                                  )}
                                >
                                  <img src={p} alt={`Preset ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">用户名</label>
                            <input 
                              type="text" 
                              value={username} 
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-slate-900 dark:text-white transition-all duration-300 shadow-sm" 
                            />
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">角色权限</label>
                            <div className="w-full px-5 py-4 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl text-slate-400 dark:text-slate-600 font-black cursor-not-allowed shadow-inner">
                              {user?.role}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">联系邮箱</label>
                          <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="输入您的邮箱地址" 
                            className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-slate-900 dark:text-white transition-all duration-300 shadow-sm" 
                          />
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">手机号码</label>
                          <input 
                            type="tel" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="输入您的手机号码" 
                            className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-slate-900 dark:text-white transition-all duration-300 shadow-sm" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'notifications' && (
                    <motion.div 
                      key="notifications"
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">消息通知</h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">选择您希望接收的通知类型和方式，保持信息同步。</p>
                      </div>

                      <div className="space-y-4">
                        {[
                          { key: 'system', title: '系统通知', desc: '平台更新、维护及重要公告', icon: <Bell size={18} className="text-blue-500" /> },
                          { key: 'alert', title: '农田告警', desc: '设备离线、环境数据异常等告警信息', icon: <Shield size={18} className="text-red-500" /> },
                          { key: 'ai', title: 'AI 分析报告', desc: '病虫害识别结果、生长分析报告生成提醒', icon: <Sparkles size={18} className="text-emerald-500" /> },
                          { key: 'news', title: '资讯推送', desc: '农业政策、行业动态等最新资讯', icon: <Palette size={18} className="text-amber-500" /> },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-6 rounded-3xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 group shadow-sm">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                                {item.icon}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 dark:text-white text-sm">{item.title}</h4>
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">{item.desc}</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={notifications[item.key as keyof typeof notifications]} 
                                onChange={() => handleNotificationChange(item.key as keyof typeof notifications)}
                              />
                              <div className="w-12 h-7 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'appearance' && (
                    <motion.div 
                      key="appearance"
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">外观设置</h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">自定义平台的主题和显示偏好，打造专属视觉体验。</p>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings.theme.title')}</h4>
                        <div className="grid grid-cols-3 gap-6">
                          {[
                            { id: 'light', label: t('settings.theme.light'), icon: <Palette size={24} className="text-amber-500" /> },
                            { id: 'dark', label: t('settings.theme.dark'), icon: <Palette size={24} className="text-indigo-500" /> },
                            { id: 'system', label: t('settings.theme.system'), icon: <Smartphone size={24} className="text-slate-500" /> },
                          ].map((t) => (
                            <button 
                              key={t.id}
                              onClick={() => handleThemeChange(t.id)}
                              className={cn(
                                "flex flex-col items-center justify-center gap-4 p-8 rounded-[32px] border-2 transition-all duration-500 group relative overflow-hidden",
                                theme === t.id 
                                  ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xl shadow-emerald-500/10 scale-105" 
                                  : "border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:border-emerald-500/30 hover:scale-105"
                              )}
                            >
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                                theme === t.id ? "bg-emerald-600 text-white" : "bg-white dark:bg-white/10 text-slate-400 group-hover:scale-110"
                              )}>
                                {t.icon}
                              </div>
                              <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">{t.label}</span>
                              {theme === t.id && (
                                <motion.div 
                                  layoutId="theme-active"
                                  className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6 mt-8">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings.language')}</h4>
                        <div className="grid grid-cols-2 gap-6">
                          {[
                            { id: 'zh', label: '简体中文', icon: <Globe size={24} className="text-blue-500" /> },
                            { id: 'en', label: 'English', icon: <Globe size={24} className="text-red-500" /> },
                          ].map((lang) => (
                            <button 
                              key={lang.id}
                              onClick={() => {
                                i18n.changeLanguage(lang.id);
                                localStorage.setItem('language', lang.id);
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center gap-4 p-8 rounded-[32px] border-2 transition-all duration-500 group relative overflow-hidden",
                                i18n.language === lang.id 
                                  ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xl shadow-emerald-500/10 scale-105" 
                                  : "border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:border-emerald-500/30 hover:scale-105"
                              )}
                            >
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                                i18n.language === lang.id ? "bg-emerald-600 text-white" : "bg-white dark:bg-white/10 text-slate-400 group-hover:scale-110"
                              )}>
                                {lang.icon}
                              </div>
                              <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">{lang.label}</span>
                              {i18n.language === lang.id && (
                                <motion.div 
                                  layoutId="lang-active"
                                  className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6 mt-8">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">系统运行模式</h4>
                        <div className="p-6 rounded-3xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 flex items-center justify-between group hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 text-purple-500">
                              <Smartphone size={22} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 dark:text-white text-sm">离线演示模式</h4>
                              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">开启后，当外部 API 无法访问时将强制使用本地模拟数据，防止系统崩溃。</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={DataService.isDemoMode()} 
                              onChange={(e) => {
                                DataService.setDemoMode(e.target.checked);
                                // Force re-render to show updated state
                                setSaved(false);
                                setTimeout(() => setSaved(true), 100);
                              }}
                            />
                            <div className="w-12 h-7 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-purple-500 shadow-inner"></div>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'ai' && (
                    <motion.div 
                      key="ai"
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">AI 引擎配置</h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">配置您的 AI 模型 API 密钥，以获得更强大的诊断和分析能力。</p>
                      </div>

                      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-6 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Info size={24} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">使用说明</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              系统默认提供 <span className="font-black text-emerald-600 dark:text-emerald-400">公共演示 API 额度</span>。为了获得更稳定、更快速的诊断体验，建议您配置自己的 API 密钥。
                              <br />
                              1. <b>通义千问 (Qwen)</b>：用于视觉大模型识别（Qwen-VL-Max）。
                              <br />
                              2. <b>智谱 AI (Zhipu)</b>：用于专家诊断报告生成与智能助手。
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                              <Key size={16} />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">阿里云百炼 API Key</h4>
                          </div>
                          <div className="space-y-2">
                            <input 
                              type="password" 
                              value={userQwenKey}
                              onChange={(e) => setUserQwenKey(e.target.value)}
                              placeholder="sk-..." 
                              className="w-full input-glass px-5 py-4 font-mono text-sm transition-all duration-300" 
                            />
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                              获取地址：<a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">阿里云百炼控制台</a>
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                              <Key size={16} />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">智谱 AI API Key</h4>
                          </div>
                          <div className="space-y-2">
                            <input 
                              type="password" 
                              value={userZhipuKey}
                              onChange={(e) => setUserZhipuKey(e.target.value)}
                              placeholder="api_key..." 
                              className="w-full input-glass px-5 py-4 font-mono text-sm transition-all duration-300" 
                            />
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                              获取地址：<a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">智谱 AI 开放平台</a>
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div 
                      key="security"
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">账号安全</h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">保护您的账户安全，管理密码和登录设备，防患于未然。</p>
                      </div>

                      <div className="space-y-5">
                        <div className="p-6 rounded-3xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 flex items-center justify-between group hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 text-blue-500">
                              <Shield size={22} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 dark:text-white text-sm">登录密码</h4>
                              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">定期修改密码有助于保护账号安全</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowPasswordModal(true)}
                            className="px-6 py-2.5 bg-white dark:bg-white/10 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs transition-all duration-300 border border-slate-200 dark:border-white/10 shadow-sm active:scale-95"
                          >
                            修改密码
                          </button>
                        </div>

                        <div className="p-6 rounded-3xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 flex items-center justify-between group hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 text-emerald-500">
                              <Smartphone size={22} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 dark:text-white text-sm">双重认证 (2FA)</h4>
                              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">开启后，登录时需要输入动态验证码</p>
                            </div>
                          </div>
                          <button 
                            onClick={handleToggle2FA}
                            className={cn(
                              "px-6 py-2.5 rounded-2xl font-black text-xs transition-all duration-300 shadow-lg active:scale-95",
                              is2FAEnabled 
                                ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" 
                                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20"
                            )}
                          >
                            {is2FAEnabled ? '关闭认证' : '去开启'}
                          </button>
                        </div>
                        
                        <div className="p-8 rounded-[32px] border border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 shadow-sm">
                          <h4 className="font-black text-slate-900 dark:text-white text-sm mb-8 uppercase tracking-widest flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            最近登录设备
                          </h4>
                          <div className="space-y-8">
                            <div className="flex items-center justify-between group">
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/50 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-md group-hover:scale-110 transition-transform duration-300">
                                  <Smartphone size={20} />
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 dark:text-white text-sm">MacBook Pro (当前设备)</p>
                                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">Chrome • 广东深圳 • 127.0.0.1</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 uppercase tracking-widest shadow-sm">在线</span>
                            </div>
                            <div className="flex items-center justify-between opacity-60 group hover:opacity-100 transition-opacity duration-300">
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/50 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-md group-hover:scale-110 transition-transform duration-300">
                                  <Smartphone size={20} />
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 dark:text-white text-sm">iPhone 15 Pro</p>
                                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">App • 广东广州 • 2026-03-18 22:15</p>
                                </div>
                              </div>
                              <button className="text-[10px] font-black text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-widest">下线</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Save Button */}
                <div className="mt-12 pt-10 border-t border-white/20 dark:border-white/5 flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-3 px-12 py-4 bg-emerald-600 text-white rounded-[24px] font-black hover:bg-emerald-500 transition-all duration-300 active:scale-95 shadow-2xl shadow-emerald-500/30 tracking-tight group"
                  >
                    {saved ? (
                      <>
                        <CheckCircle2 size={20} className="animate-bounce" />
                        {t('settings.saved')}
                      </>
                    ) : (
                      <>
                        {t('settings.save')}
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white transition-colors" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Password Change Modal */}
          <AnimatePresence>
            {showPasswordModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowPasswordModal(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-md"
                />
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="relative w-full max-w-md bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-3xl rounded-[40px] p-10 shadow-2xl border border-white/20 dark:border-white/10"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">修改登录密码</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  
                  {passwordSuccess ? (
                    <div className="text-center py-10">
                      <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
                        <CheckCircle2 size={40} className="animate-bounce" />
                      </div>
                      <p className="text-xl font-black text-slate-900 dark:text-white mb-2">密码修改成功</p>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">请妥善保管您的新密码，下次登录时生效。</p>
                      <button 
                        onClick={() => setShowPasswordModal(false)}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 transition-all duration-300 shadow-xl shadow-emerald-500/20 active:scale-95"
                      >
                        完成并返回
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">当前密码</label>
                        <input 
                          type="password" 
                          value={passwords.current}
                          onChange={e => setPasswords({...passwords, current: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-white transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">新密码</label>
                        <input 
                          type="password" 
                          value={passwords.new}
                          onChange={e => setPasswords({...passwords, new: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-white transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">确认新密码</label>
                        <input 
                          type="password" 
                          value={passwords.confirm}
                          onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-white transition-all duration-300"
                        />
                      </div>
                      
                      {passwordError && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="text-xs font-black text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                        >
                          {passwordError}
                        </motion.p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <button 
                          onClick={() => setShowPasswordModal(false)}
                          className="py-4 text-slate-500 dark:text-slate-400 font-black hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all duration-300"
                        >
                          取消
                        </button>
                        <button 
                          onClick={async () => {
                            if (passwords.new !== passwords.confirm) {
                              setPasswordError('两次输入的新密码不一致');
                              return;
                            }
                            if (passwords.new.length < 6) {
                              setPasswordError('新密码长度不能少于 6 位');
                              return;
                            }
                            setIsChangingPassword(true);
                            try {
                              await DataService.changePassword({
                                oldPassword: passwords.current,
                                newPassword: passwords.new
                              });
                              setPasswordSuccess(true);
                            } catch (e: any) {
                              setPasswordError(e.message || '密码修改失败');
                            } finally {
                              setIsChangingPassword(false);
                            }
                          }}
                          disabled={isChangingPassword}
                          className="py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 transition-all duration-300 disabled:opacity-50 active:scale-95"
                        >
                          {isChangingPassword ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                          确认修改
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
