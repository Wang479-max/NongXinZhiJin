import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Upload, 
  Scan, 
  History, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Leaf, 
  Bug, 
  Activity,
  ChevronRight,
  Image as ImageIcon,
  X,
  FileText,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Zap,
  Brain,
  TrendingUp,
  ShieldCheck,
  Mic,
  MicOff,
  RefreshCw,
  Camera,
  Download,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DataService, { AICropAnalysis, getUserApiKeys, getPublicAIUsage } from '../services/dataService';

interface RecognitionResult {
  type: string;
  target: string;
  confidence: number;
  description: string;
  suggestions: string[];
  detailedReport: string;
  status: 'normal' | 'warning' | 'danger';
  isSimulated?: boolean;
  isCollaborative?: boolean;
  isAgricultureRelated?: boolean;
  qwenSummary?: string;
  zhipuVisionDetail?: string;
  relatedKnowledge?: { title: string; type: string; summary: string }[];
}

interface AIRecognitionProps {
  onNavigate?: (tab: string, query?: string) => void;
  user?: any;
}

import { useAIRequest } from '../hooks/useAIRequest';

import { useNotifications } from '../context/NotificationContext';

const AIRecognition: React.FC<AIRecognitionProps> = ({ onNavigate, user: propUser }) => {
  const { t } = useTranslation();

  const ANALYSIS_STEPS = [
    t('ai_recognition.steps.upload'),
    t('ai_recognition.steps.vision'),
    t('ai_recognition.steps.deep'),
    t('ai_recognition.steps.collaborative'),
    t('ai_recognition.steps.report')
  ];

  const PLOT_ANALYSIS_STEPS = t('ai_recognition.plot_steps', { returnObjects: true }) as string[];

  const { addNotification } = useNotifications();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'pest' | 'species' | 'growth'>('pest');
  const [selectedPlot, setSelectedPlot] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<'suggestions' | 'report'>('suggestions');
  const [plots, setPlots] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [displayedResult, setDisplayedResult] = useState<RecognitionResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [user, setUser] = useState<any>(propUser);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [publicUsage, setPublicUsage] = useState(0);

  useEffect(() => {
    const { qwenKey, zhipuKey } = getUserApiKeys();
    setPublicUsage(getPublicAIUsage());
    
    if (!qwenKey || !zhipuKey) {
      const timer = setTimeout(() => {
        setShowApiKeyPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Use custom hook for AI recognition
  const { 
    data: recognitionData, 
    isLoading: isAnalyzing, 
    error: recognitionError, 
    stepText: analysisStepText,
    progress: analysisProgress,
    request: runAIRecognition,
    retry: retryRecognition,
    reset: resetRecognition
  } = useAIRequest(DataService.recognizeImage);

  // Update usage when analysis completes
  useEffect(() => {
    if (recognitionData) {
      setPublicUsage(getPublicAIUsage());
    }
  }, [recognitionData]);

  // Use custom hook for plot analysis
  const {
    data: plotAnalysisData,
    isLoading: isPlotAnalyzing,
    error: plotAnalysisError,
    stepText: plotAnalysisStepText,
    progress: plotAnalysisProgress,
    request: runAIPlotAnalysis,
    retry: retryPlotAnalysis,
    reset: resetPlotAnalysis
  } = useAIRequest(DataService.analyzeCropSuitability);

  // Update displayed result when AI data changes
  useEffect(() => {
    if (recognitionData) {
      setDisplayedResult(recognitionData);
    }
  }, [recognitionData]);

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    } else {
      const storedUser = localStorage.getItem('nxzj_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    
    DataService.getPlots(propUser?.username).then(list => {
      setPlots(list);
      if (list.length > 0 && !selectedPlot) {
        const firstReadyPlot = list.find(p => p.status !== 'pending_setup') || list[0];
        setSelectedPlot(firstReadyPlot.id);
        
        // 如果地块已就绪，自动执行一次分析
        if (firstReadyPlot.status !== 'pending_setup') {
          setTimeout(() => {
            runPlotAnalysisForPlot(firstReadyPlot.id);
          }, 500);
        }
      }
    });
    loadHistory();
  }, [propUser]);

  const runPlotAnalysisForPlot = async (plotId: string) => {
    if (!plotId) return;
    const plot = plots.find(p => p.id === plotId) || (await DataService.getPlots()).find(p => p.id === plotId);
    
    if (plot?.status === 'pending_setup') {
      return;
    }

    resetRecognition();
    
    try {
      await runAIPlotAnalysis(plotId, undefined, { steps: PLOT_ANALYSIS_STEPS });
    } catch (err) {
      console.error('Plot analysis error:', err);
    }
  };

  const canUseAI = () => {
    // 移除 10 次硬限制，改为提醒模式
    // 只要有 API Key 或者处于演示模式（由 DataService 处理）就允许使用
    return true;
  };

  const loadHistory = async () => {
    const data = await DataService.getRecognitionHistory();
    setHistory(data);
  };

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      addNotification({
        title: '摄像头访问失败',
        message: err.name === 'NotAllowedError' || err.message.includes('Permission denied')
          ? '无法访问摄像头，请检查浏览器权限设置。如果您在预览窗口中，请尝试点击右上角“在新标签页中打开”重试。'
          : '无法启动摄像头，请确保设备支持并已连接摄像头。',
        type: 'error'
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        setSelectedImage(imageData);
        stopCamera();
      }
    }
  };

  const downloadReport = () => {
    if (!displayedResult) return;
    
    const plotInfo = plots.find(p => p.id === selectedPlot);
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>农芯智境 - AI 智能诊断报告</title>
    <style>
        body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; color: #333; max-w-3xl; margin: 0 auto; padding: 40px; background: #f8fafc; }
        .container { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { border-bottom: 2px solid #1B5E20; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { color: #1B5E20; margin: 0; font-size: 28px; }
        .meta { color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section-title { color: #1B5E20; border-left: 4px solid #1B5E20; padding-left: 10px; font-size: 18px; margin-bottom: 15px; }
        .highlight { background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; }
        .danger { background: #fef2f2; border-color: #fecaca; }
        .warning { background: #fffbeb; border-color: #fde68a; }
        table { w-full; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
        th { background: #f8fafc; color: #475569; }
        .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1 class="title">AI 智能诊断报告</h1>
                <p style="margin: 5px 0 0 0; color: #64748b;">农芯智境 (NongXinZhiJing) 智慧农业管理系统</p>
            </div>
            <div class="meta">
                生成时间: ${new Date().toLocaleString()}<br>
                诊断类型: ${types.find(t => t.id === analysisType)?.label || analysisType}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">基本信息</h2>
            <table>
                <tr><th>关联地块</th><td>${plotInfo ? `${plotInfo.name} (${plotInfo.crop})` : '未指定'}</td></tr>
                <tr><th>诊断目标</th><td><strong>${displayedResult.target}</strong></td></tr>
                <tr><th>置信度</th><td>${((displayedResult.confidence || 0) * 100).toFixed(1)}%</td></tr>
                <tr><th>风险等级</th><td>${displayedResult.status === 'danger' ? '高风险' : displayedResult.status === 'warning' ? '中风险' : '正常'}</td></tr>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">初步诊断结论</h2>
            <div class="highlight ${displayedResult.status === 'danger' ? 'danger' : displayedResult.status === 'warning' ? 'warning' : ''}">
                ${displayedResult.description}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">专家级深度分析</h2>
            <p style="white-space: pre-wrap;">${displayedResult.detailedReport || '暂无深度分析数据。'}</p>
        </div>

        <div class="section">
            <h2 class="section-title">处理建议</h2>
            <ul>
                ${(Array.isArray(displayedResult.suggestions) ? displayedResult.suggestions : []).map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
            </ul>
        </div>

        ${displayedResult.qwenSummary ? `
        <div class="section">
            <h2 class="section-title">多引擎协同分析数据</h2>
            <h4>阿里云百炼视觉引擎</h4>
            <p style="font-size: 14px; color: #475569;">${displayedResult.qwenSummary}</p>
            <h4>智谱 AI 视觉增强</h4>
            <p style="font-size: 14px; color: #475569;">${displayedResult.zhipuVisionDetail}</p>
        </div>
        ` : ''}

        <div class="footer">
            本报告由 农芯智境 AI 引擎自动生成，仅供农业生产参考，不作为最终决策依据。<br>
            © ${new Date().getFullYear()} 农芯智境团队
        </div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `农芯智境_AI诊断报告_${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        addNotification({
          title: '格式不支持',
          message: '图片格式不支持。请上传 JPG 或 PNG 格式的图片。',
          type: 'warning'
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        addNotification({
          title: '图片过大',
          message: '图片大小不能超过 5MB。请压缩后重新上传。',
          type: 'warning'
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setDisplayedResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!selectedImage) return;
    if (!canUseAI()) {
      addNotification({
        title: '额度已耗尽',
        message: `您的${user?.plan || '基础版'}订阅本月 AI 识别次数已达上限，请升级版本以继续使用。`,
        type: 'warning'
      });
      return;
    }

    const plotData = plots.find(p => p.id === selectedPlot);
    if (plotData?.status === 'pending_setup') {
      addNotification({
        title: '地块未配置',
        message: '该地块尚未配置，请先在“农田管理”中连接设备。',
        type: 'warning'
      });
      return;
    }

    // Clear previous results to show loading state clearly
    setDisplayedResult(null);
    resetPlotAnalysis();
    setActiveResultTab('suggestions');

    try {
      const result = await runAIRecognition(selectedImage, analysisType, plotData, user?.username, { steps: ANALYSIS_STEPS });
      if (result) {
        setDisplayedResult(result as any);
      }
      loadHistory();
    } catch (err: any) {
      console.error('Recognition error:', err);
    }
  };

  const runPlotAnalysis = async () => {
    if (!selectedPlot) return;
    const plot = plots.find(p => p.id === selectedPlot);
    
    if (plot?.status === 'pending_setup') {
      addNotification({
        title: t('ai_recognition.modals.plot_not_configured_title'),
        message: t('ai_recognition.modals.plot_not_configured_message'),
        type: 'warning'
      });
      return;
    }

    // Clear recognition result when starting plot analysis
    setDisplayedResult(null);
    resetRecognition();
    
    try {
      await runAIPlotAnalysis(selectedPlot, undefined, { steps: PLOT_ANALYSIS_STEPS });
    } catch (err: any) {
      console.error('Plot analysis error:', err);
    }
  };

  const types = [
    { id: 'pest', label: t('ai_recognition.types.pest'), icon: <Bug size={18} />, color: 'text-red-500', bg: 'bg-red-50' },
    { id: 'species', label: t('ai_recognition.types.species'), icon: <Leaf size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'growth', label: t('ai_recognition.types.growth'), icon: <Activity size={18} />, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const handleSelectHistory = (item: any) => {
    setSelectedImage(item.image);
    setDisplayedResult(item.result);
    setSelectedPlot(item.plotId);
    // 根据历史记录中的类型标签反推分析类型 ID
    const typeId = types.find(t => t.label === item.type)?.id || 'pest';
    setAnalysisType(typeId as any);
    setActiveResultTab('suggestions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleListen = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      // 强制请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Microphone permission denied', err);
      addNotification({
        title: t('ai_recognition.mic_denied.title'),
        message: t('ai_recognition.mic_denied.message'),
        type: 'error'
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addNotification({
        title: t('ai_recognition.browser_unsupported.title'),
        message: t('ai_recognition.browser_unsupported.message'),
        type: 'warning'
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        const lowerTranscript = finalTranscript.toLowerCase();
        console.log('Voice command:', lowerTranscript);
        
        if (lowerTranscript.includes('病虫害')) {
          setAnalysisType('pest');
        } else if (lowerTranscript.includes('种类') || lowerTranscript.includes('品种')) {
          setAnalysisType('species');
        } else if (lowerTranscript.includes('生长')) {
          setAnalysisType('growth');
        }

        if (lowerTranscript.includes('上传') || lowerTranscript.includes('图片') || lowerTranscript.includes('照片')) {
          fileInputRef.current?.click();
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          addNotification({
            title: t('ai_recognition.mic_denied.title'),
            message: t('ai_recognition.mic_denied.message'),
            type: 'error'
          });
        } else {
          console.warn('Speech recognition issue: ' + event.error);
        }
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const getErrorDetails = (error: string | null) => {
    if (!error) return null;
    
    if (error.includes('额度已耗尽') || error.includes('403') || error.includes('429')) {
      return {
        title: t('ai_recognition.errors.quota.title'),
        desc: t('ai_recognition.errors.quota.desc'),
        suggestions: t('ai_recognition.errors.quota.tips', { returnObjects: true }) as string[],
        action: { label: t('ai_recognition.errors.quota.action'), onClick: () => (window as any).openSettings?.('ai') }
      };
    }
    
    if (error.includes('API 密钥') || error.includes('401')) {
      return {
        title: t('ai_recognition.errors.invalid_key.title'),
        desc: t('ai_recognition.errors.invalid_key.desc'),
        suggestions: t('ai_recognition.errors.invalid_key.tips', { returnObjects: true }) as string[],
        action: { label: t('ai_recognition.errors.invalid_key.action'), onClick: () => (window as any).openSettings?.('ai') }
      };
    }

    if (error.includes('网络') || error.includes('Failed to fetch') || error.includes('无法连接')) {
      return {
        title: t('ai_recognition.errors.network.title'),
        desc: t('ai_recognition.errors.network.desc'),
        suggestions: t('ai_recognition.errors.network.tips', { returnObjects: true }) as string[],
        action: { label: t('ai_recognition.errors.network.action'), onClick: recognitionError ? retryRecognition : retryPlotAnalysis }
      };
    }

    return {
      title: t('ai_recognition.errors.unknown.title'),
      desc: error,
      suggestions: t('ai_recognition.errors.unknown.tips', { returnObjects: true }) as string[],
      action: { label: t('ai_recognition.errors.unknown.action'), onClick: recognitionError ? retryRecognition : retryPlotAnalysis }
    };
  };

  const { qwenKey, zhipuKey } = getUserApiKeys();
  const hasUserKeys = qwenKey || zhipuKey;

  const errorDetails = getErrorDetails(recognitionError || plotAnalysisError);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* API Key Prompt Modal */}
      <AnimatePresence>
        {showApiKeyPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApiKeyPrompt(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-lg bg-white/90 dark:bg-[#0A0A0A]/80 backdrop-blur-3xl rounded-[48px] p-10 shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
              
              <div className="flex items-center gap-6 mb-8 relative">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-[24px] flex items-center justify-center shrink-0 border border-amber-500/10 dark:border-amber-500/10 shadow-inner">
                  <Zap size={36} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">配置您的 AI 引擎</h3>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-1">开启更稳定、更强大的诊断体验</p>
                </div>
              </div>

              <div className="space-y-6 mb-10 relative">
                <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20">
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    您当前正在使用系统的 <span className="font-black">公共演示额度</span>。该额度由开发者提供，仅供功能试用，且有总额度限制。
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                      <span>公共额度使用情况</span>
                      <span>已试用 {publicUsage} 次</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    <AlertTriangle size={12} />
                    注意：公共额度有每日调用上限，且在高并发时可能响应缓慢。
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  为了保证您的长期稳定使用，并解锁更高精度的视觉分析模型，建议您在设置中配置个人的 <span className="font-black text-slate-900 dark:text-white">通义千问</span> 或 <span className="font-black text-slate-900 dark:text-white">智谱 AI</span> 密钥。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 relative">
                <button 
                  onClick={() => setShowApiKeyPrompt(false)}
                  className="flex-1 py-5 bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 rounded-3xl font-black text-sm hover:bg-slate-200 dark:hover:bg-[#2A2A2A] transition-all border border-transparent dark:border-white/5 active:scale-95"
                >
                  先用演示额度
                </button>
                <button 
                  onClick={() => {
                    setShowApiKeyPrompt(false);
                    (window as any).openSettings?.('ai');
                  }}
                  className="flex-1 py-5 bg-amber-600 text-white rounded-3xl font-black text-sm hover:bg-amber-500 transition-all text-center flex items-center justify-center gap-3 shadow-xl shadow-amber-600/20 active:scale-95 shimmer-btn"
                >
                  <ShieldCheck size={18} />
                  立即配置私有 Key
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* API Key Reminder */}
      {!hasUserKeys && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 p-6 rounded-[32px] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-amber-500/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <Zap size={120} />
          </div>
          
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-800/40 rounded-2xl text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner border border-amber-200/50">
            <Zap size={32} className="animate-pulse" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <h3 className="text-lg font-black text-amber-900 dark:text-amber-200 tracking-tight flex items-center justify-center md:justify-start gap-2">
                公共演示额度使用中
                <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-700 text-amber-700 dark:text-amber-200 text-[10px] font-black rounded-full uppercase tracking-tighter">Limited</span>
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                  已试用 {publicUsage} 次
                </span>
              </div>
            </div>
            <p className="text-sm text-amber-800/70 dark:text-amber-400/80 leading-relaxed max-w-2xl">
              当前您正在使用系统的公共演示 API 额度。为了获得更稳定、更快速的诊断体验，并支持更大规模的并发请求，建议您在设置中配置个人的 <span className="font-black text-amber-900 dark:text-amber-100">通义千问 (Qwen)</span> 或 <span className="font-black text-amber-900 dark:text-amber-100">智谱 AI (Zhipu)</span> API 密钥。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button 
              onClick={() => (window as any).openSettings?.('ai')}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-amber-600/30 active:scale-95 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              立即配置私有 Key
            </button>
          </div>
        </motion.div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">AI 智能识别</h1>
            <button
              onClick={toggleListen}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold",
                isListening 
                  ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30" 
                  : "bg-forest-green/10 text-forest-green hover:bg-forest-green/20"
              )}
              title={isListening ? "停止聆听" : "语音指令 (如: '切换到病虫害识别并上传图片')"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {isListening ? "正在聆听指令..." : "语音控制"}
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">融合视觉识别与大语言模型，为您提供专业的农事诊断建议</p>
        </div>
        
        <div className="flex bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl shadow-black/5 border border-white/20 dark:border-white/5">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setAnalysisType(t.id as any);
                setDisplayedResult(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                analysisType === t.id 
                  ? "bg-forest-green text-white shadow-lg shadow-forest-green/20" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-[#1A1A1A]/40"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Upload & Preview */}
        <div className="lg:col-span-4 space-y-4 sticky top-8">
          <div 
            className={cn(
              "relative aspect-square bento-card border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center group",
              selectedImage 
                ? "border-forest-green/30" 
                : "border-slate-200/50 dark:border-[#222222]/30"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/jpeg, image/png, image/jpg" 
            />
            
            {isCameraOpen ? (
              <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6">
                  <button 
                    onClick={stopCamera}
                    className="p-4 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all"
                  >
                    <X size={24} />
                  </button>
                  <button 
                    onClick={capturePhoto}
                    className="p-4 bg-forest-green text-white rounded-full hover:bg-emerald-green shadow-lg shadow-forest-green/20 transition-all active:scale-90"
                  >
                    <Camera size={32} />
                  </button>
                </div>
              </div>
            ) : selectedImage ? (
              <div className="relative w-full h-full cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img src={selectedImage} alt="Preview" className={cn("w-full h-full object-cover transition-all duration-500", isAnalyzing && "brightness-50")} />
                
                {isAnalyzing && (
                  <>
                    <div className="absolute inset-0 bg-forest-green/10 mix-blend-overlay" />
                    <motion.div 
                      initial={{ top: 0 }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] z-20"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/40 backdrop-blur-[2px]">
                      <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex flex-col items-center gap-3 max-w-[80%] text-center">
                        <div className="relative">
                          <Scan size={24} className="text-emerald-400 animate-pulse" />
                          <motion.div 
                            className="absolute -inset-2 border border-emerald-400/30 rounded-full"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-black text-white tracking-tight block">{analysisStepText}</span>
                          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mx-auto mt-2">
                            <motion.div 
                              className="h-full bg-emerald-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${analysisProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white hover:bg-white/30 transition-all">
                      <Upload size={24} />
                    </div>
                    <div 
                      onClick={(e) => { e.stopPropagation(); startCamera(); }}
                      className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white hover:bg-white/30 transition-all"
                    >
                      <Camera size={24} />
                    </div>
                  </div>
                )}
                {!isAnalyzing && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setDisplayedResult(null); }}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors shadow-lg z-10"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 w-full p-6">
                <div className="flex gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-forest-green transition-all group/btn"
                  >
                    <div className="w-12 h-12 bg-forest-green/10 text-forest-green rounded-2xl flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <span className="text-sm font-black text-slate-600 dark:text-slate-300">{t('ai_recognition.labels.upload')}</span>
                  </button>
                  <button 
                    onClick={startCamera}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-indigo-500 transition-all group/btn"
                  >
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                      <Camera size={24} />
                    </div>
                    <span className="text-sm font-black text-slate-600 dark:text-slate-300">{t('ai_recognition.labels.camera')}</span>
                  </button>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">{t('ai_recognition.labels.title')}</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-medium whitespace-pre-line">
                    {t('ai_recognition.labels.desc')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bento-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center">
                  <Brain size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('ai_recognition.labels.decision')}</h3>
              </div>
              {selectedPlot && plots.find(p => p.id === selectedPlot)?.status !== 'pending_setup' && (
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  {t('ai_recognition.labels.ready')}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('ai_recognition.labels.select_plot')}</label>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedPlot}
                    onChange={(e) => {
                      setSelectedPlot(e.target.value);
                      const plot = plots.find(p => p.id === e.target.value);
                      if (plot && plot.status !== 'pending_setup') {
                        runPlotAnalysisForPlot(e.target.value);
                      }
                    }}
                    className="flex-1 input-glass px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                  >
                    {plots.map(p => <option key={p.id} value={p.id}>{p.name} ({p.crop})</option>)}
                  </select>
                  <button
                    onClick={() => runPlotAnalysisForPlot(selectedPlot)}
                    disabled={isPlotAnalyzing || !selectedPlot}
                    className={cn(
                      "p-3 rounded-xl transition-all shadow-lg active:scale-95",
                      isPlotAnalyzing 
                        ? "bg-slate-100 text-slate-400" 
                        : "btn-primary shadow-indigo-500/20"
                    )}
                  >
                    {isPlotAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                  </button>
                </div>
              </div>

              {plots.find(p => p.id === selectedPlot)?.status === 'pending_setup' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-amber-700 dark:text-amber-400">{t('ai_recognition.modals.plot_not_configured_title')}</p>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 font-medium leading-relaxed">
                      {t('ai_recognition.modals.plot_not_configured_message')}
                    </p>
                    <button 
                      onClick={() => onNavigate?.('management')}
                      className="text-[10px] font-black text-amber-700 dark:text-amber-400 underline mt-1"
                    >
                      {t('ai_recognition.modals.go_to_management')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
              {/* Usage Limit Feedback */}
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('ai_recognition.labels.usage_title')}</span>
                  <span className="text-[10px] font-black text-forest-green">
                    {DataService.getUserApiKeys().qwenKey ? t('ai_recognition.labels.usage_unlimited') : t('ai_recognition.labels.usage_public', { count: publicUsage })}
                  </span>
                </div>
                {!DataService.getUserApiKeys().qwenKey && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-2 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {t('ai_recognition.labels.usage_warning')}
                  </p>
                )}
                <button 
                  onClick={() => (window as any).openSettings?.('ai')}
                  className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline mt-2 flex items-center gap-1"
                >
                  <Zap size={10} />
                  {t('ai_recognition.labels.usage_action')}
                </button>
              </div>

              <button 
                onClick={runAnalysis}
                disabled={!selectedImage || isAnalyzing}
                className="w-full py-4 bg-forest-green text-white rounded-2xl font-black text-lg shadow-lg shadow-forest-green/20 hover:bg-emerald-green transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    {t('ai_recognition.labels.analyzing_deep')}
                  </>
                ) : (
                  <>
                    <Scan size={24} />
                    {t('ai_recognition.labels.start_analysis')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recognition History Panel */}
          <div className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-3xl p-5 shadow-xl shadow-black/5 border border-white/20 dark:border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <History size={18} className="text-forest-green" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white">{t('ai_recognition.labels.history_title')}</h3>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {history.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-400 font-medium italic">{t('ai_recognition.labels.no_history')}</p>
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectHistory(item)}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl bg-slate-50/50 dark:bg-[#1A1A1A]/30 border border-slate-100 dark:border-white/5 hover:border-forest-green/30 hover:bg-forest-green/5 transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                      <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-black text-forest-green uppercase tracking-wider">{item.type}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate mb-0.5">{item.target}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          <Zap size={8} className="text-amber-500" />
                          <span className="text-[9px] text-slate-500 font-bold">{(item.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-[9px] text-slate-400 font-bold truncate">{t('ai_recognition.labels.plot_prefix')}{item.plotId?.split('_')[1] || t('ai_recognition.labels.unknown_plot')}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-8 space-y-4">
          <AnimatePresence mode="wait">
            {errorDetails ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="h-full min-h-[400px] bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-3xl border border-red-100 dark:border-red-900/20 flex flex-col items-center justify-center p-8 text-center shadow-xl"
              >
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                  <AlertTriangle size={40} />
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">{errorDetails.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mb-8">{errorDetails.desc}</p>
                
                <div className="w-full max-w-md bg-slate-50 dark:bg-white/5 rounded-2xl p-6 mb-8 text-left border border-slate-100 dark:border-white/5">
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{t('ai_recognition.labels.suggestions')}</h4>
                  <ul className="space-y-3">
                    {errorDetails.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center text-[10px] shrink-0">{i + 1}</div>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={errorDetails.action.onClick}
                    className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {errorDetails.action.label === t('ai_recognition.errors.network.action') ? <RefreshCw size={20} /> : <Zap size={20} />}
                    {errorDetails.action.label}
                  </button>
                  <button 
                    onClick={() => { resetRecognition(); resetPlotAnalysis(); }}
                    className="px-10 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10"
                  >
                    {t('ai_recognition.labels.cancel')}
                  </button>
                </div>
              </motion.div>
            ) : !displayedResult && !isAnalyzing ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full min-h-[300px] bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-3xl border-2 border-dashed border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center text-slate-400 p-8 text-center shadow-xl shadow-black/5"
              >
                <div className="w-24 h-24 bg-slate-50/50 dark:bg-[#1A1A1A]/30 rounded-full flex items-center justify-center mb-6 border border-slate-100 dark:border-white/5">
                  <Scan size={48} className="opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">{t('ai_recognition.labels.waiting_title')}</h3>
                <p className="text-sm max-w-xs text-slate-400/80">{t('ai_recognition.labels.waiting_desc')}</p>
              </motion.div>
            ) : isPlotAnalyzing ? (
              <motion.div 
                key="loading-plot"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full min-h-[300px] bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 border border-white/20 dark:border-white/10 flex flex-col items-center justify-center p-8 space-y-6"
              >
                <div className="relative">
                  <div className="w-32 h-32 border-4 border-indigo-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
                    <Brain size={40} className="animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    {plotAnalysisStepText}
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                    {t('ai_recognition.labels.loading_plot_desc')}
                  </p>
                </div>
                <div className="w-full max-w-xs bg-slate-100/50 dark:bg-[#1A1A1A]/30 h-1.5 rounded-full overflow-hidden border border-slate-200/20 dark:border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${plotAnalysisProgress}%` }}
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                </div>
              </motion.div>
            ) : isAnalyzing ? (
              <motion.div 
                key="loading-image"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full min-h-[300px] bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 border border-white/20 dark:border-white/10 flex flex-col items-center justify-center p-8 space-y-6"
              >
                <div className="relative">
                  <div className="w-32 h-32 border-4 border-forest-green/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-forest-green rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-forest-green">
                    <Scan size={40} className="animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    {analysisStepText}
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                    {t('ai_recognition.labels.loading_image_desc')}
                  </p>
                </div>
                <div className="w-full max-w-xs bg-slate-100/50 dark:bg-[#1A1A1A]/30 h-1.5 rounded-full overflow-hidden border border-slate-200/20 dark:border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    className="h-full bg-forest-green shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </motion.div>
            ) : plotAnalysisData ? (
              <motion.div 
                key="plot-result"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-700 dark:to-violet-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 group">
                  <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Brain size={240} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">{t('ai_recognition.labels.decision')}</span>
                      <div className="h-px w-12 bg-white/20" />
                      <span className="text-[10px] font-bold text-white/60 uppercase font-mono">{t('ai_recognition.labels.plot_label')}{plots.find(p => p.id === selectedPlot)?.name}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
                      <div>
                        <p className="text-indigo-100/60 text-xs font-bold mb-1">{t('ai_recognition.labels.recommended_crop')}</p>
                        <h4 className="text-5xl font-black tracking-tight">{plotAnalysisData.recommendedCrop}</h4>
                      </div>
                      <div className="flex items-center gap-4 pb-1">
                        <div className="h-12 w-px bg-white/10 hidden md:block" />
                        <div>
                          <p className="text-indigo-100/60 text-[10px] font-bold mb-1 uppercase">{t('ai_recognition.labels.suitability')}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black font-mono">{plotAnalysisData.suitability}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                      <p className="text-sm text-indigo-50 font-medium leading-relaxed">
                        {plotAnalysisData.reason}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-white/10 shadow-xl">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-500" />
                      {t('ai_recognition.labels.profit')}
                    </h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">¥{plotAnalysisData?.expectedProfit?.toLocaleString() || '0'}</span>
                      <span className="text-slate-400 text-xs font-bold">/ {t('app.year')}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">{t('ai_recognition.labels.profit_desc')}</p>
                  </div>
                  <div className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-white/10 shadow-xl">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <Leaf size={18} className="text-indigo-500" />
                      {t('ai_recognition.labels.alternatives')}
                    </h4>
                    <div className="space-y-2">
                      {plotAnalysisData.alternatives.map((alt, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                           <span className="font-bold text-slate-600 dark:text-slate-300">{alt.crop}</span>
                           <span className="font-mono text-slate-400">¥{alt?.expectedProfit?.toLocaleString() || '0'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {plotAnalysisData.fertilizationAdvice && (
                  <div className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/20 dark:border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <Zap size={120} className="text-amber-500" />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                          <Zap size={20} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{t('ai_recognition.labels.fertilization_title')}</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{t('ai_recognition.labels.fertilization_desc')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('ai_recognition.labels.fertilization_amount')}</p>
                          <div className="p-4 bg-slate-50/50 dark:bg-[#121214]/30 rounded-2xl border border-slate-100 dark:border-white/5">
                            <p className="text-xl font-black text-amber-600 dark:text-amber-400">{plotAnalysisData.fertilizationAdvice.amount}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('ai_recognition.labels.fertilization_timing')}</p>
                          <div className="p-4 bg-slate-50/50 dark:bg-[#121214]/30 rounded-2xl border border-slate-100 dark:border-white/5">
                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{plotAnalysisData.fertilizationAdvice.timing}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/10">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          <span className="font-black text-amber-600 dark:text-amber-400 mr-2">{t('ai_recognition.labels.expert_analysis')}</span>
                          {plotAnalysisData.fertilizationAdvice.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : displayedResult ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Result Header */}
                <div className={cn(
                  "bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-black/10 border-l-8 relative overflow-hidden group border",
                  displayedResult.status === 'danger' ? "border-red-500 dark:border-red-500/50" : 
                  displayedResult.status === 'warning' ? "border-amber-500 dark:border-amber-500/50" : 
                  "border-emerald-500 dark:border-emerald-500/50"
                )}>
                  <div className={cn(
                    "absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl transition-colors duration-700 opacity-50",
                    displayedResult.status === 'danger' ? "bg-red-500/10 dark:bg-red-500/20 group-hover:bg-red-500/20 dark:group-hover:bg-red-500/30" : 
                    displayedResult.status === 'warning' ? "bg-amber-500/10 dark:bg-amber-500/20 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/30" : 
                    "bg-emerald-500/10 dark:bg-emerald-500/20 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30"
                  )} />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border",
                            displayedResult.status === 'danger' ? "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400" : 
                            displayedResult.status === 'warning' ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" : 
                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                          )}>
                            {displayedResult.type}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 px-3 py-1 rounded-full border border-white/20">
                            <Zap size={12} className="text-amber-500" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('ai_recognition.labels.confidence_label')}</span>
                                <span className="text-slate-900 dark:text-white text-xs font-black">{((displayedResult.confidence || 0) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-20 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mt-0.5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(displayedResult.confidence || 0) * 100}%` }}
                                  className={cn(
                                    "h-full",
                                    (displayedResult.confidence || 0) > 0.8 ? "bg-emerald-500" : 
                                    (displayedResult.confidence || 0) > 0.5 ? "bg-amber-500" : "bg-red-500"
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          {displayedResult.isSimulated && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20">
                                {t('ai_recognition.labels.simulated')}
                              </span>
                            </>
                          )}
                          {displayedResult.isCollaborative && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-500/20 animate-pulse">
                                {t('ai_recognition.labels.collaborative_label')}
                              </span>
                            </>
                          )}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter mb-2 leading-tight">{displayedResult.target}</h2>
                      </div>
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-transform duration-500 hover:scale-110 shrink-0",
                        displayedResult.status === 'danger' ? "bg-red-500 text-white shadow-red-500/30" : 
                        displayedResult.status === 'warning' ? "bg-amber-500 text-white shadow-amber-500/30" : 
                        "bg-emerald-500 text-white shadow-emerald-500/30"
                      )}>
                        {displayedResult.status === 'danger' ? <AlertTriangle size={32} /> : 
                         displayedResult.status === 'warning' ? <AlertCircle size={32} /> : 
                         <CheckCircle2 size={32} />}
                      </div>
                    </div>
                    
                    <div className={cn(
                      "relative p-4 rounded-xl border",
                      displayedResult.status === 'danger' ? "bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20" : 
                      displayedResult.status === 'warning' ? "bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20" : 
                      "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20"
                    )}>
                      <p className={cn(
                        "font-medium leading-relaxed text-base",
                        displayedResult.status === 'danger' ? "text-red-800 dark:text-red-300" : 
                        displayedResult.status === 'warning' ? "text-amber-800 dark:text-amber-300" : 
                        "text-emerald-800 dark:text-emerald-300"
                      )}>
                        {displayedResult.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabs for Suggestions and Detailed Report */}
                <div className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 dark:border-white/10 overflow-hidden">
                  <div className="flex border-b border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => setActiveResultTab('suggestions')}
                      className={cn(
                        "flex-1 py-4 text-sm font-black transition-all flex items-center justify-center gap-2",
                        activeResultTab === 'suggestions' 
                          ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10" 
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                      )}
                    >
                      <CheckCircle2 size={18} />
                      {t('ai_recognition.labels.treatment_suggestions')}
                    </button>
                    {displayedResult.detailedReport && (
                      <button
                        onClick={() => setActiveResultTab('report')}
                        className={cn(
                          "flex-1 py-4 text-sm font-black transition-all flex items-center justify-center gap-2",
                          activeResultTab === 'report' 
                            ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10" 
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                        )}
                      >
                        <FileText size={18} />
                        {t('ai_recognition.labels.detailed_report')}
                      </button>
                    )}
                  </div>

                  <div className="p-6">
                    {activeResultTab === 'suggestions' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.isArray(displayedResult.suggestions) && displayedResult.suggestions.length > 0 ? (
                              displayedResult.suggestions.map((s, i) => (
                                <div 
                                  key={i}
                                  className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group flex gap-4"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-black text-sm group-hover:scale-110 transition-transform">
                                    {i + 1}
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                                    {s}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 p-8 text-center text-slate-400 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                <p>{t('ai_recognition.labels.no_suggestions')}</p>
                              </div>
                            )}
                          </div>

                          <div className="bg-indigo-50/80 dark:bg-indigo-900/20 backdrop-blur-md rounded-3xl p-6 border border-indigo-100 dark:border-indigo-800/50 shadow-sm flex flex-col justify-between md:col-span-2">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="space-y-2">
                                <h3 className="text-indigo-800 dark:text-indigo-400 font-black flex items-center gap-2 text-lg tracking-tight">
                                  <Activity size={20} />
                                  {t('ai_recognition.labels.smart_decision')}
                                </h3>
                                <p className="text-sm text-indigo-600 dark:text-indigo-300/70 font-bold leading-relaxed max-w-xl">
                                  {displayedResult.status === 'danger' ? (
                                    t('ai_recognition.labels.smart_decision_desc_danger', { type: displayedResult.type, target: displayedResult.target, plot: selectedPlot?.split('_')[1] || t('ai_recognition.labels.unknown_plot') })
                                  ) : displayedResult.status === 'warning' ? (
                                    t('ai_recognition.labels.smart_decision_desc_warning', { target: displayedResult.target, plot: selectedPlot?.split('_')[1] || t('ai_recognition.labels.unknown_plot') })
                                  ) : (
                                    t('ai_recognition.labels.smart_decision_desc_success', { target: displayedResult.target, plot: selectedPlot?.split('_')[1] || t('ai_recognition.labels.unknown_plot') })
                                  )}
                                </p>
                              </div>
                              <div className="flex gap-3 shrink-0">
                                <button 
                                  onClick={() => onNavigate?.('management')}
                                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                                >
                                  {t('ai_recognition.labels.go_to_management_btn')}
                                  <ArrowRight size={16} />
                                </button>
                                <button 
                                  onClick={() => onNavigate?.('knowledge', displayedResult.target)}
                                  className="px-6 py-3 bg-white dark:bg-[#1A1A1A] text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-[#2A2A2A] transition-all active:scale-95 shadow-sm"
                                >
                                  {t('ai_recognition.labels.view_wiki')}
                                  <BookOpen size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeResultTab === 'report' && displayedResult.detailedReport && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <ShieldCheck size={20} className="text-indigo-500" />
                            {t('ai_recognition.labels.diagnosis_conclusion')}
                          </h3>
                          <button
                            onClick={downloadReport}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#1A1A1A] dark:text-slate-300 dark:hover:bg-[#2A2A2A] border border-slate-200/50 dark:border-white/5"
                          >
                            <Download size={16} />
                            {t('ai_recognition.labels.download_report')}
                          </button>
                        </div>

                        {/* Multi-engine Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-[#050505]/80 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm relative group/card flex flex-col min-h-[100px] max-h-[240px] overflow-y-auto custom-scrollbar">
                            <div className="absolute top-3 right-3 text-blue-500/20 group-hover/card:text-blue-500/40 transition-colors">
                              <Zap size={24} />
                            </div>
                            <div className="flex items-center gap-1.5 mb-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] shrink-0 sticky top-0 bg-slate-50/90 dark:bg-[#050505]/90 backdrop-blur-sm py-1 z-10">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              {t('ai_recognition.labels.qwen_engine')}
                            </div>
                            <div className="flex-1 pr-1">
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                {displayedResult.qwenSummary?.includes('暂时不可用') || displayedResult.qwenSummary?.includes('受限') ? (
                                  <span className="flex flex-col gap-2">
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">{displayedResult.qwenSummary}</span>
                                    <button 
                                      onClick={() => (window as any).openSettings?.('ai')}
                                      className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                                    >
                                      <Settings size={10} />
                                      前往配置个人 API Key 以解锁完整功能
                                    </button>
                                  </span>
                                ) : (
                                  displayedResult.qwenSummary || t('ai_recognition.labels.no_qwen_data')
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-[#050505]/80 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm relative group/card flex flex-col min-h-[100px] max-h-[240px] overflow-y-auto custom-scrollbar">
                            <div className="absolute top-3 right-3 text-purple-500/20 group-hover/card:text-purple-500/40 transition-colors">
                              <Brain size={24} />
                            </div>
                            <div className="flex items-center gap-1.5 mb-3 text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] shrink-0 sticky top-0 bg-slate-50/90 dark:bg-[#050505]/90 backdrop-blur-sm py-1 z-10">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                              {t('ai_recognition.labels.zhipu_engine')}
                            </div>
                            <div className="flex-1 pr-1">
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                {displayedResult.zhipuVisionDetail || t('ai_recognition.labels.no_zhipu_data')}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-[#050505] rounded-xl border border-slate-100 dark:border-white/5 shadow-inner">
                          <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {displayedResult.detailedReport}
                            </Markdown>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Related Knowledge Section */}
                {displayedResult.relatedKnowledge && displayedResult.relatedKnowledge.length > 0 && (
                  <div className="bg-white/70 dark:bg-[#0A0A0A]/40 backdrop-blur-xl rounded-xl p-4 shadow-sm border border-white/20 dark:border-white/10 space-y-3">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-500/10 text-indigo-500 rounded-md flex items-center justify-center">
                        <BookOpen size={14} />
                      </div>
                      {t('ai_recognition.labels.related_knowledge')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {displayedResult.relatedKnowledge.map((item, idx) => (
                        <button 
                          key={idx}
                          onClick={() => onNavigate?.('knowledge', item.title)}
                          className="p-3 bg-slate-50 dark:bg-[#1A1A1A]/50 rounded-xl border border-slate-200/50 dark:border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors text-xs">
                              {item.title}
                            </div>
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                              {item.type}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                            {item.summary}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AIRecognition;
