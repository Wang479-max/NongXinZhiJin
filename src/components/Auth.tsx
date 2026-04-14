import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { 
  User, 
  Lock, 
  Shield, 
  ArrowRight, 
  Leaf, 
  Loader2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  Globe,
  Cpu,
  Zap,
  Activity,
  ScanFace,
  Fingerprint
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface AuthProps {
  onLogin: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('普通用户');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  // Simulated system logs for the branding side
  useEffect(() => {
    const logs = [
      "Initializing AI Core...",
      "Connecting to sensor nodes...",
      "Syncing satellite data...",
      "Optimizing crop models...",
      "System health: 100%",
      "Security protocol: v3.0",
      "Neural network: Online",
    ];
    let i = 0;
    const interval = setInterval(() => {
      setSystemLogs(prev => [logs[i % logs.length], ...prev.slice(0, 3)]);
      i++;
    }, 5000); // Increased from 2500 to 5000
    return () => clearInterval(interval);
  }, []);

  // Mouse Parallax Effect for the card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 100 };
  const rotateX = useSpring(useTransform(mouseY, [0, window.innerHeight], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [0, window.innerWidth], [-8, 8]), springConfig);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length > 6) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 模拟网络请求延迟和验证过程
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (isLogin) {
        if (username && password) {
          // 模拟成功登录
          onLogin({ 
            username, 
            role: '管理员', 
            id: 'user_' + Date.now(),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
          });
        } else {
          setError(t('auth.errorEmpty'));
        }
      } else {
        if (username && password && role) {
          // 模拟成功注册
          onLogin({ 
            username, 
            role, 
            id: 'user_' + Date.now(),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
          });
        } else {
          setError(t('auth.errorEmpty'));
        }
      }
    } catch (err) {
      setError(t('auth.errorNetwork'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-[#020617] font-sans selection:bg-emerald-500/30">
      
      {/* --- Immersive Full-Screen Background --- */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=2500" 
          alt="Smart Agriculture" 
          className="w-full h-full object-cover opacity-20 scale-110 animate-pulse-slow"
          referrerPolicy="no-referrer"
        />
        {/* Complex Gradients for Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#020617]/90 to-[#020617]/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
        
        {/* Floating Light Orbs */}
        <motion.div 
          animate={{ 
            x: [0, 150, 0], 
            y: [0, -100, 0],
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            x: [0, -120, 0], 
            y: [0, 150, 0],
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[150px]"
        />
        <motion.div 
          animate={{ 
            x: [0, 80, 0], 
            y: [0, 80, 0],
            scale: [0.8, 1.1, 0.8],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-teal-500/20 rounded-full blur-[100px]"
        />
      </div>

      {/* --- Animated Tech Grid & Particles --- */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}>
        <motion.div 
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)]"
        />
      </div>

      {/* --- Main Content Layout --- */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8">
        
        {/* Left Side: High-Impact Branding */}
        <div className="w-full lg:w-[55%] flex flex-col items-center lg:items-start text-center lg:text-left pt-12 lg:pt-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="relative group">
              <div className="absolute -inset-3 bg-emerald-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition duration-500 animate-pulse" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-slate-900 to-black border border-emerald-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Leaf className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" size={32} />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <h2 className="text-3xl font-display font-black text-white tracking-widest drop-shadow-lg">{t('auth.brand')}</h2>
              <p className="text-[11px] font-mono text-emerald-400 uppercase tracking-[0.4em] drop-shadow-md">{t('auth.subtitle')}</p>
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-display font-black text-white leading-[1.1] tracking-tight mb-6 drop-shadow-2xl"
          >
            {t('auth.slogan1')}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 drop-shadow-[0_0_40px_rgba(16,185,129,0.4)]">
              {t('auth.slogan2')}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-slate-300 text-lg sm:text-xl leading-relaxed font-medium max-w-lg mb-12 drop-shadow-md"
          >
            {t('auth.description')}
          </motion.p>

          {/* Tech Stats / Badges */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center lg:justify-start gap-6"
          >
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl">
              <Activity className="text-emerald-400" size={20} />
              <div className="flex flex-col text-left">
                <span className="text-white font-black text-lg leading-none">99.9%</span>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">系统可用性</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl">
              <Cpu className="text-indigo-400" size={20} />
              <div className="flex flex-col text-left">
                <span className="text-white font-black text-lg leading-none">&lt;50ms</span>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">AI 响应延迟</span>
              </div>
            </div>
          </motion.div>

          {/* Terminal Logs */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-12 hidden lg:block w-full max-w-md"
          >
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-emerald-500/70 h-24 overflow-hidden relative shadow-inner">
              <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/40 to-transparent z-10" />
              <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/40 to-transparent z-10" />
              <AnimatePresence mode="popLayout">
                {systemLogs.map((log, idx) => (
                  <motion.div 
                    key={log + idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1 - idx * 0.25, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 mb-1.5"
                  >
                    <span className="text-emerald-500/40">root@agri-engine:~#</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Glassmorphism Login Form */}
        <div className="w-full lg:w-[45%] max-w-[480px] perspective-1000 pb-12 lg:pb-0">
          <motion.div 
            style={{ rotateX, rotateY }}
            initial={{ opacity: 0, scale: 0.95, z: -100 }}
            animate={{ opacity: 1, scale: 1, z: 0 }}
            transition={{ duration: 1, type: "spring", bounce: 0.4 }}
            className="bg-[#0F172A]/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 sm:p-12 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group/card"
          >
            {/* Card Inner Glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none group-hover/card:bg-emerald-500/20 transition-colors duration-700" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none group-hover/card:bg-indigo-500/20 transition-colors duration-700" />
            
            {/* Corner Brackets */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-emerald-500/30 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-emerald-500/30 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-emerald-500/30 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-emerald-500/30 rounded-br-lg pointer-events-none" />

            {/* Scanning Line Effect */}
            <motion.div 
              animate={{ top: ['-10%', '110%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent z-20 pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            />

            {/* Top decorative bar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60" />

            <div className="text-center mb-10 relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-6 shadow-inner">
                {isLogin ? <Fingerprint className="text-emerald-400" size={32} strokeWidth={1.5} /> : <ScanFace className="text-emerald-400" size={32} strokeWidth={1.5} />}
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight mb-2">
                {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
              </h3>
              <p className="text-slate-400 text-sm font-medium">
                {isLogin ? t('auth.loginDesc') : t('auth.registerDesc')}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex bg-black/40 p-1.5 rounded-2xl mb-10 relative border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] z-10">
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-y-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                style={{ 
                  width: 'calc(50% - 6px)',
                  left: isLogin ? '6px' : 'calc(50%)'
                }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
              />
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={cn(
                  "flex-1 py-3.5 text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 relative z-10",
                  isLogin ? "text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {t('auth.loginTab')}
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={cn(
                  "flex-1 py-3.5 text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 relative z-10",
                  !isLogin ? "text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {t('auth.registerTab')}
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.form 
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="space-y-6 relative z-10"
              >
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold backdrop-blur-md"
                  >
                    <Shield size={16} className="shrink-0" />
                    {error}
                  </motion.div>
                )}

                {/* Username Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
                    <User size={18} className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4.5 pl-14 pr-6 text-white font-bold focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 focus:bg-emerald-500/5 transition-all placeholder:text-transparent peer shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
                    placeholder="用户名"
                  />
                  <label className="absolute left-14 top-4.5 text-slate-500 font-bold pointer-events-none transition-all peer-focus:-top-3 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-400 peer-focus:tracking-widest peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-400 peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:uppercase bg-[#0F172A] px-2 rounded-md z-30">
                    {t('auth.usernameLabel')}
                  </label>
                </div>

                {/* Password Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
                    <Lock size={18} className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4.5 pl-14 pr-14 text-white font-bold focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 focus:bg-emerald-500/5 transition-all placeholder:text-transparent peer shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
                    placeholder="password"
                  />
                  <label className="absolute left-14 top-4.5 text-slate-500 font-bold pointer-events-none transition-all peer-focus:-top-3 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-400 peer-focus:tracking-widest peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-400 peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:uppercase bg-[#0F172A] px-2 rounded-md z-30">
                    {t('auth.passwordLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-500 hover:text-emerald-400 transition-colors z-20"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  
                  {/* Password Strength Meter */}
                  {!isLogin && password && (
                    <div className="absolute -bottom-5 left-2 right-2 flex gap-1 h-1">
                      {[25, 50, 75, 100].map((level) => (
                        <div 
                          key={level} 
                          className={cn(
                            "flex-1 rounded-full transition-colors duration-500",
                            passwordStrength >= level 
                              ? (passwordStrength <= 25 ? "bg-red-500" : passwordStrength <= 50 ? "bg-orange-500" : passwordStrength <= 75 ? "bg-yellow-500" : "bg-emerald-500")
                              : "bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between px-1 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          className="peer w-5 h-5 rounded-md border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer appearance-none transition-all checked:bg-emerald-500 checked:border-emerald-500" 
                        />
                        <CheckCircle2 size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                        {t('auth.rememberMe')}
                      </span>
                    </label>
                    <a href="#" className="text-xs font-black text-emerald-400 hover:text-emerald-300 transition-colors hover:underline">
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-4 pt-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 block">{t('auth.roleLabel')}</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: '普通用户', icon: User, label: t('auth.roleUser') },
                        { id: '农业专家', icon: Sparkles, label: t('auth.roleExpert') },
                        { id: '管理员', icon: Shield, label: t('auth.roleAdmin') }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRole(item.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-500 gap-2 relative overflow-hidden group/role",
                            role === item.id 
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                              : "bg-slate-950/40 border-white/5 text-slate-500 hover:border-white/10 hover:bg-white/5"
                          )}
                        >
                          {role === item.id && (
                            <motion.div 
                              layoutId="roleGlow"
                              className="absolute inset-0 bg-emerald-500/5 blur-xl"
                            />
                          )}
                          <item.icon size={20} className={cn("transition-all duration-500 relative z-10", role === item.id ? "scale-110 text-emerald-400" : "group-hover/role:text-slate-300")} />
                          <span className="text-[10px] font-black uppercase tracking-wider relative z-10">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-8">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative group/btn overflow-hidden rounded-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-[length:200%_100%] animate-gradient-x" />
                    <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_70%)]" />
                    
                    <div className="relative py-4.5 flex items-center justify-center gap-3 text-white font-black uppercase tracking-[0.3em] text-xs">
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>{t('auth.verifying')}</span>
                        </>
                      ) : (
                        <>
                          <span>{isLogin ? t('auth.loginBtn') : t('auth.registerBtn')}</span>
                          <ArrowRight size={18} className="group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {/* Alternative Login */}
                <div className="pt-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">{t('auth.externalApi')}</span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      type="button" 
                      onClick={() => setError('企业级单点登录服务正在维护中，请联系管理员。')}
                      className="flex flex-col items-center justify-center gap-2.5 bg-slate-950/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 py-5 rounded-2xl transition-all duration-500 group/social relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-emerald-500/60 text-[7px] font-black text-white px-2 py-0.5 rounded-bl-lg tracking-tighter">SSO</div>
                      <Globe size={20} className="text-slate-500 group-hover/social:text-emerald-400 group-hover/social:scale-110 transition-all duration-500" />
                      <span className="text-[9px] font-black text-slate-500 group-hover/social:text-white uppercase tracking-tighter transition-colors">政务云登录</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500/60 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[7px] text-emerald-500/40 font-black uppercase tracking-widest">已连接</span>
                      </div>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setError('微信认证接口已就绪，请扫描终端二维码。')}
                      className="flex flex-col items-center justify-center gap-2.5 bg-slate-950/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 py-5 rounded-2xl transition-all duration-500 group/social"
                    >
                      <Zap size={20} className="text-slate-500 group-hover/social:text-emerald-400 group-hover/social:scale-110 transition-all duration-500" />
                      <span className="text-[9px] font-black text-slate-500 group-hover/social:text-white uppercase tracking-tighter transition-colors">微信快捷</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500/60 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[7px] text-emerald-500/40 font-black uppercase tracking-widest">就绪</span>
                      </div>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setError('请插入物理安全密钥 (FIDO2/U2F)。')}
                      className="flex flex-col items-center justify-center gap-2.5 bg-slate-950/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 py-5 rounded-2xl transition-all duration-500 group/social"
                    >
                      <Shield size={20} className="text-slate-500 group-hover/social:text-emerald-400 group-hover/social:scale-110 transition-all duration-500" />
                      <span className="text-[9px] font-black text-slate-500 group-hover/social:text-white uppercase tracking-tighter transition-colors">硬件密钥</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1 h-1 rounded-full bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                        <span className="text-[7px] text-amber-500/40 font-black uppercase tracking-widest">待接入</span>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.form>
            </AnimatePresence>
          </motion.div>
          
          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
              © 2026 {t('app.brand')} · {t('auth.footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Auth;
