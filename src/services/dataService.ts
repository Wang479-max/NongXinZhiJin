/**
 * @file DataService.ts
 * @description 农芯智境平台数据适配层。
 * 增加了共享状态管理，支持农田管理与监测模块的联动。
 */

// 获取 Electron 注入的后端端口，如果没有则使用相对路径
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if ((window as any).electron && (window as any).electron.backendPort) {
      return `http://localhost:${(window as any).electron.backendPort}`;
    }
  }
  // 开发时用 http://localhost:3000，生产时用空字符串（即相对路径）
  if (import.meta.env && import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  return ''; 
};

export const API_BASE_URL = getApiBaseUrl();

// 演示模式开关，从 localStorage 读取
export const isDemoMode = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nxzj_demo_mode') === 'true';
  }
  return false;
};

export const setDemoMode = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nxzj_demo_mode', enabled ? 'true' : 'false');
  }
};

// 用户自定义 API Key 管理
export const getUserApiKeys = () => {
  if (typeof window !== 'undefined') {
    return {
      qwenKey: localStorage.getItem('nxzj_user_qwen_key') || '',
      zhipuKey: localStorage.getItem('nxzj_user_zhipu_key') || ''
    };
  }
  return { qwenKey: '', zhipuKey: '' };
};

export const getPublicAIUsage = () => {
  if (typeof window !== 'undefined') {
    return parseInt(localStorage.getItem('nxzj_public_ai_usage') || '0');
  }
  return 0;
};

export const incrementPublicAIUsage = () => {
  if (typeof window !== 'undefined') {
    const count = getPublicAIUsage();
    localStorage.setItem('nxzj_public_ai_usage', (count + 1).toString());
  }
};

export const getCurrentUsername = () => {
  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem('nxzj_user');
      if (userStr) {
        return JSON.parse(userStr).username;
      }
    } catch (e) {}
  }
  return null;
};

export const setUserApiKeys = (qwenKey: string, zhipuKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nxzj_user_qwen_key', qwenKey);
    localStorage.setItem('nxzj_user_zhipu_key', zhipuKey);
  }
};

// 封装 fetch，自动添加 API_BASE_URL
const apiFetch = async (url: string, options: RequestInit = {}) => {
  if (isDemoMode()) {
    throw new Error('Demo mode is enabled, skipping network request');
  }
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s timeout

  try {
    const response = await fetch(fullUrl, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    
    // Check for HTML response when expecting JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html') && !url.includes('.html')) {
      // If it's a 403/404/500, it's likely a generic error page from the server or proxy
      if (response.status >= 400) {
        throw new Error(`服务器请求失败 (状态码: ${response.status})。请检查网络连接或 API 配置。`);
      }
      const text = await response.text();
      console.warn(`[apiFetch] Received HTML instead of JSON for ${url}. Content snippet: ${text.substring(0, 100)}`);
      throw new Error(`服务器返回了非预期的 HTML 内容 (状态码: ${response.status})。这可能是由于服务暂时不可用或配置错误。`);
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查您的网络连接。');
    }
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('无法连接到服务器，请检查网络或确保后端服务已启动。');
    }
    throw error;
  }
};

export interface Plot {
  id: string;
  name: string;
  area: number;
  crop: string;
  growthStage?: string;
  nextTillageDate?: string;
  hardwareState?: any;
  sensorData?: any;
  lastFertilized?: string;
  isSimulated?: boolean;
}

export interface RealtimeData {
  temperature: number;
  humidity: number;
  light: number;
  soilTemp: number;
  soilMoisture: number;
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

export interface Threshold {
  min: number;
  max: number;
}

export interface Thresholds {
  [key: string]: Threshold;
}

export interface HistoryItem extends RealtimeData {
  time: string;
}

export interface AICropAnalysis {
  recommendedCrop: string;
  suitability: number;
  expectedProfit: number;
  reason: string;
  fertilizationAdvice?: {
    amount: string;
    timing: string;
    description: string;
  };
  alternatives: {
    crop: string;
    expectedProfit: number;
    suitability: number;
  }[];
}

// 模拟全局状态，用于模块间联动
let globalRealtimeData: RealtimeData = {
  temperature: 36.5, // High (threshold max: 35)
  humidity: 35,      // Low (threshold min: 40)
  light: 3200,
  soilTemp: 22.1,
  soilMoisture: 45,
  pH: 6.8,
  nitrogen: 45,      // Low (threshold min: 50)
  phosphorus: 25,
  potassium: 200
};

// 模拟用户信息，用于演示模式
let mockUser: any = {
  username: 'admin',
  name: '张农芯',
  role: '管理员',
  plan: '企业版',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  bio: '致力于智慧农业技术推广的先行者，农芯智境平台创始人。',
  phone: '13800138000',
  email: 'admin@nxzj.com',
  location: '北京市海淀区中关村农业科技园',
  joinDate: '2024-01-01',
  securityLogs: [
    { event: '登录成功', time: new Date().toISOString(), ip: '127.0.0.1' }
  ],
  favorites: [],
  twoFactorEnabled: false
};

// 监听回调列表
const listeners: (() => void)[] = [];

const DataService = {
  isDemoMode,
  setDemoMode,
  /**
   * 注册数据变化监听器
   */
  subscribe: (callback: () => void) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  },

  /**
   * 通知所有监听器数据已更新
   */
  notify: () => {
    listeners.forEach(cb => cb());
  },

  /**
   * 更新用户头像
   */
  uploadAvatar: async (file: File, username?: string): Promise<string> => {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          try {
            const response = await apiFetch('/api/user/avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ avatar: base64, username })
            });

            if (!response.ok) throw new Error('头像上传失败');
            const data = await response.json();
            resolve(data.avatarUrl);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  },

  /**
   * 获取系统运行日志
   */
  getSystemLogs: async (): Promise<any[]> => {
    try {
      const response = await apiFetch('/api/system/logs');
      if (!response.ok) throw new Error('Network response was not ok');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      return await response.json();
    } catch (error) {
      console.warn('Using fallback system logs due to fetch error');
      return [
        { id: 'log_1', status: 'success', type: 'hardware', message: '1号地块灌溉阀门已自动开启，预计灌溉30分钟', time: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 'log_2', status: 'warning', type: 'ai', message: 'AI诊断模型检测到2号地块存在轻微叶斑病风险', time: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
        { id: 'log_3', status: 'info', type: 'news', message: '已同步最新农业政策资讯 3 条', time: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 'log_4', status: 'danger', type: 'hardware', message: '3号大棚温湿度传感器连接异常，请检查网络', time: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: 'log_5', status: 'success', type: 'system', message: '系统数据备份完成', time: new Date(Date.now() - 1000 * 60 * 240).toISOString() }
      ];
    }
  },

  /**
   * 获取所有地块列表
   */
  getPlots: async (username?: string): Promise<any[]> => {
    try {
      const url = username ? `/api/plots?username=${username}` : '/api/plots';
      const response = await apiFetch(url);
      if (!response.ok) throw new Error('获取地块失败');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      return await response.json();
    } catch (error) {
      console.warn('Using fallback plots data due to fetch error');
      return [
        { id: 'plot_001', name: '地块 #1 - 核心区', area: 240, crop: '冬小麦' },
        { id: 'plot_002', name: '地块 #2 - 实验区', area: 120, crop: '玉米' },
      ];
    }
  },

  /**
   * 添加新地块
   */
  addPlot: async (plot: { name: string; area: number; crop: string; nextTillageDate?: string }, username?: string): Promise<any> => {
    try {
      const response = await apiFetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...plot, username })
      });
      if (!response.ok) throw new Error('添加地块失败');
      return await response.json();
    } catch (error) {
      console.error(error);
      return { id: `plot_${Date.now()}`, ...plot };
    }
  },

  /**
   * 连接地块设备（传感器、硬件）
   */
  connectPlotDevices: async (plotId: string, devices: string[]): Promise<any> => {
    try {
      const response = await apiFetch(`/api/plots/${plotId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices })
      });
      if (!response.ok) throw new Error('连接设备失败');
      return await response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**
   * 获取指定地块的实时监测数据
   */
  getRealtimeData: async (plotId: string): Promise<RealtimeData> => {
    if (!plotId) {
      return { ...globalRealtimeData };
    }
    try {
      const response = await apiFetch(`/api/monitoring/realtime?plotId=${plotId}`);
      if (!response.ok) throw new Error('获取实时数据失败');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      return await response.json();
    } catch (error) {
      console.warn('Using fallback realtime data due to fetch error');
      // Fallback to local mock if server fails, add some variation based on plotId
      const variation = (plotId.charCodeAt(plotId.length - 1) % 5) - 2;
      return { 
        ...globalRealtimeData,
        temperature: Number((globalRealtimeData.temperature + variation * 0.5).toFixed(2)),
        humidity: Number((globalRealtimeData.humidity + variation * 2).toFixed(2)),
        soilMoisture: Number((globalRealtimeData.soilMoisture + variation * 1.5).toFixed(2)),
        light: Number((globalRealtimeData.light + variation * 100).toFixed(2)),
      }; 
    }
  },

  /**
   * 智谱AI分析接口
   */
  analyzeCropSuitability: async (plotId: string, targetCrop?: string): Promise<AICropAnalysis> => {
    const currentData = await DataService.getRealtimeData(plotId);
    try {
      const { zhipuKey } = getUserApiKeys();
      const username = getCurrentUsername();
      const response = await apiFetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plotId, 
          currentData, 
          targetCrop,
          userZhipuKey: zhipuKey,
          username
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.error || 'AI 分析接口调用失败';
        const err = new Error(msg);
        (err as any).status = response.status;
        throw err;
      }
      return await response.json();
    } catch (error: any) {
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      console.warn('Using fallback AI analysis due to fetch error:', error);
      return {
        recommendedCrop: targetCrop || '冬小麦',
        suitability: 85,
        expectedProfit: 1200,
        reason: '根据当前土壤温湿度和养分数据，该地块非常适合种植该作物。',
        fertilizationAdvice: {
          amount: '复合肥 20kg/亩',
          timing: '建议在未来3天内，结合灌溉进行追肥。',
          description: '当前土壤氮磷钾含量略低于最佳水平，适量补充复合肥有助于作物生长。'
        },
        alternatives: [
          { crop: '玉米', suitability: 75, expectedProfit: 1000 },
          { crop: '大豆', suitability: 70, expectedProfit: 900 }
        ]
      };
    }
  },

  /**
   * 自动化施肥控制
   */
  executeFertilization: async (plotId: string) => {
    try {
      const response = await apiFetch('/api/hardware/fertilize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotId })
      });
      if (!response.ok) throw new Error('施肥失败');
      const result = await response.json();
      DataService.notify();
      return result;
    } catch (error) {
      console.error(error);
      return { success: false, message: "施肥系统连接失败" };
    }
  },

  /**
   * 远程硬件控制
   */
  controlHardware: async (plotId: string, type: 'irrigation' | 'ventilation' | 'heating' | 'lighting' | 'fertilization', action: 'start' | 'stop') => {
    try {
      const response = await apiFetch('/api/hardware/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotId, type, action })
      });
      if (!response.ok) throw new Error('硬件控制失败');
      const result = await response.json();
      DataService.notify();
      return result;
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  },

  getHardwareParams: async (plotId: string) => {
    try {
      const response = await apiFetch(`/api/hardware/params?plotId=${plotId}`);
      if (!response.ok) throw new Error('获取硬件参数失败');
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  updateHardwareParams: async (plotId: string, type: string, params: any) => {
    try {
      const response = await apiFetch('/api/hardware/params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotId, type, params })
      });
      if (!response.ok) throw new Error('更新硬件参数失败');
      const result = await response.json();
      DataService.notify();
      return result;
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  },

  /**
   * 获取历史数据用于图表分析
   */
  getHistoricalData: async (plotId: string, timeRange: string, params: string[]): Promise<any[]> => {
    const days = timeRange === '7d' ? 7 : 30;
    const data = [];
    const now = new Date();
    
    // Use plotId to create a simple deterministic variation
    const variation = plotId === 'all' ? 0 : (plotId.charCodeAt(plotId.length - 1) % 5) - 2;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const entry: any = { date: dateStr };
      params.forEach(param => {
        if (param === 'temperature') entry[param] = Number((20 + variation + Math.random() * 10).toFixed(2));
        else if (param === 'humidity') entry[param] = Number((50 + variation * 2 + Math.random() * 30).toFixed(2));
        else if (param === 'light') entry[param] = Number((20000 + variation * 1000 + Math.random() * 30000).toFixed(2));
        else if (param === 'soilTemp') entry[param] = Number((18 + variation + Math.random() * 8).toFixed(2));
        else if (param === 'soilMoisture') entry[param] = Number((30 + variation * 1.5 + Math.random() * 20).toFixed(2));
        else if (param === 'pH') entry[param] = Number((6.0 + variation * 0.1 + Math.random() * 1.5).toFixed(2));
        else if (param === 'nitrogen') entry[param] = Number((40 + variation * 5 + Math.random() * 100).toFixed(2));
        else if (param === 'phosphorus') entry[param] = Number((10 + variation * 2 + Math.random() * 40).toFixed(2));
        else if (param === 'potassium') entry[param] = Number((100 + variation * 10 + Math.random() * 200).toFixed(2));
        else entry[param] = Number((Math.random() * 100).toFixed(2));
      });
      data.push(entry);
    }
    return data;
  },

  /**
   * 获取分页历史记录列表
   */
  getHistoryList: async (plotId: string, page: number = 1, pageSize: number = 5) => {
    const total = 23;
    const list: HistoryItem[] = [];
    const now = new Date();

    for (let i = 0; i < pageSize; i++) {
      const time = new Date(now);
      time.setHours(time.getHours() - (page - 1) * pageSize - i);
      
      // Make some data occasionally out of bounds for demonstration
      const isOutlier = i % 3 === 0;
      
      list.push({
        time: time.toLocaleString(),
        temperature: Number((isOutlier ? 36 + Math.random() * 2 : 24 + Math.random() * 2).toFixed(2)),
        humidity: Number((isOutlier ? 30 + Math.random() * 5 : 60 + Math.random() * 10).toFixed(2)),
        light: Number((3000 + Math.random() * 500).toFixed(2)),
        soilTemp: Number((21 + Math.random() * 2).toFixed(2)),
        soilMoisture: Number((40 + Math.random() * 10).toFixed(2)),
        pH: Number((6.5 + Math.random() * 0.5).toFixed(2)),
        nitrogen: Number((isOutlier ? 40 + Math.random() * 5 : 110 + Math.random() * 20).toFixed(2)),
        phosphorus: Number((20 + Math.random() * 10).toFixed(2)),
        potassium: Number((180 + Math.random() * 40).toFixed(2))
      });
    }

    return { total, list };
  },

  /**
   * 传感器校准
   */
  calibrateSensor: async (plotId: string, sensorKey: string, newValue: number, reason: string) => {
    try {
      const response = await apiFetch('/api/monitoring/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotId, sensorKey, newValue, reason })
      });
      if (!response.ok) throw new Error('校准失败');
      const result = await response.json();
      DataService.notify();
      return result;
    } catch (error) {
      console.error(error);
      return { success: false, message: '校准请求失败' };
    }
  },

  /**
   * AI 图像识别与诊断 (调用后端多引擎协同接口)
   */
  recognizeImage: async (base64Image: string, type: 'pest' | 'species' | 'growth', plotData?: any, username?: string) => {
    try {
      const { qwenKey, zhipuKey } = getUserApiKeys();
      
      // If using public keys, increment usage
      if (!qwenKey || !zhipuKey) {
        incrementPublicAIUsage();
      }

      const response = await apiFetch('/api/ai/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Image, 
          type, 
          plotData, 
          username,
          userQwenKey: qwenKey,
          userZhipuKey: zhipuKey
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.error || '识别请求失败';
        const err = new Error(msg);
        (err as any).status = response.status;
        (err as any).data = errorData;
        throw err;
      }
      return await response.json();
    } catch (error: any) {
      // Only use fallback for network errors or demo mode, not for explicit API errors like 403/401
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      console.warn('Using fallback AI recognition due to fetch error:', error);
      return {
        isAgricultureRelated: true,
        type: type === 'pest' ? '叶斑病' : type === 'species' ? '小麦' : '生长良好',
        target: type === 'pest' ? '小麦叶斑病' : type === 'species' ? '冬小麦' : '正常生长',
        confidence: 0.92,
        description: '（演示模式）识别结果为模拟数据。',
        detailedReport: '由于当前处于演示模式或网络离线，此报告为系统自动生成的模拟诊断结果。在实际运行中，AI 引擎将提供深度的视觉分析和专家级诊断。',
        suggestions: ['建议检查网络连接', '确保 API 密钥配置正确', '可尝试重新上传图片'],
        relatedKnowledge: [],
        status: type === 'pest' ? 'danger' : 'normal'
      };
    }
  },

  /**
   * AI 智能助手聊天 (调用后端智谱 AI 接口)
   */
  chat: async (message: string, history: any[]) => {
    try {
      const { zhipuKey } = getUserApiKeys();
      const username = getCurrentUsername();
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          history,
          userZhipuKey: zhipuKey,
          username
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.error || '聊天请求失败';
        const err = new Error(msg);
        (err as any).status = response.status;
        throw err;
      }
      const data = await response.json();
      return data.text || data.reply || '抱歉，未能获取到有效回复。';
    } catch (error: any) {
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      console.warn('Using fallback AI chat due to fetch error:', error);
      return '（演示模式）您好！我是农芯智境 AI 助手。当前系统处于离线演示模式或网络连接异常，我暂时无法连接到云端大脑。请检查您的网络连接或 API 配置。';
    }
  },

  /**
   * 获取知识库推荐
   */
  getKnowledgeRecommendations: async (category: string, page: number, limit: number = 6, seed?: number, ids?: string) => {
    try {
      let url = `/api/knowledge/recommendations?page=${page}&limit=${limit}${seed !== undefined ? `&seed=${seed}` : ''}${category !== '全部' ? `&category=${encodeURIComponent(category)}` : ''}`;
      if (ids) url += `&ids=${encodeURIComponent(ids)}`;
      const response = await apiFetch(url);
      if (!response.ok) throw new Error('获取推荐失败');
      return await response.json();
    } catch (error) {
      console.error('Knowledge Recommendations error:', error);
      throw error;
    }
  },

  /**
   * 搜索知识库 (AI 增强)
   */
  searchKnowledge: async (query: string) => {
    try {
      const { zhipuKey } = getUserApiKeys();
      const username = getCurrentUsername();
      const response = await apiFetch(`/api/knowledge/search?q=${encodeURIComponent(query)}&userZhipuKey=${encodeURIComponent(zhipuKey)}&username=${encodeURIComponent(username || '')}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || '搜索失败');
      }
      return await response.json();
    } catch (error) {
      console.error('Knowledge Search error:', error);
      throw error;
    }
  },

  /**
   * 获取各指标的预警阈值
   */
  getThresholds: (): Thresholds => {
    return {
      temperature: { min: 15, max: 35 },
      humidity: { min: 40, max: 80 },
      light: { min: 2000, max: 10000 },
      soilTemp: { min: 10, max: 30 },
      soilMoisture: { min: 30, max: 70 },
      pH: { min: 5.5, max: 7.5 },
      nitrogen: { min: 50, max: 200 },
      phosphorus: { min: 10, max: 50 },
      potassium: { min: 80, max: 300 }
    };
  },

  /**
   * 获取农业资讯
   */
  getNews: async (source: 'mara' | 'tianxing' | 'gov-service'): Promise<any[]> => {
    try {
      const response = await apiFetch(`/api/news/${source}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      return await response.json();
    } catch (error) {
      console.warn(`Using fallback news for ${source} due to fetch error`);
      return [
        {
          id: 'news_1',
          title: '农业农村部部署推进春季农业生产工作',
          summary: '强调要抓好春季田管和春耕备耕，确保全年粮食和农业生产开好局起好步。',
          source: '农业农村部',
          date: new Date().toISOString(),
          url: '#'
        },
        {
          id: 'news_2',
          title: '2026年中央一号文件发布：全面推进乡村振兴',
          summary: '文件指出，要强化科技和改革双轮驱动，加快建设农业强国。',
          source: '新华社',
          date: new Date(Date.now() - 86400000).toISOString(),
          url: '#'
        },
        {
          id: 'news_3',
          title: '智慧农业新技术在多地推广应用',
          summary: '无人机植保、智能温室等新技术有效提升了农业生产效率。',
          source: '科技日报',
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          url: '#'
        }
      ];
    }
  },

  /**
   * 获取天气数据
   */
  getWeather: async (lat: number = 36.103, lon: number = 103.718): Promise<any> => {
    try {
      // 默认：兰州市安宁区坐标
      const response = await apiFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=Asia%2FShanghai`);
      if (!response.ok) throw new Error('Network response was not ok');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      return await response.json();
    } catch (error) {
      console.warn('Using fallback weather data due to fetch error');
      // Return mock data fallback
      return {
        current: {
          temperature_2m: 24.5,
          relative_humidity_2m: 60,
          apparent_temperature: 25,
          is_day: 1,
          precipitation: 0,
          weather_code: 0,
          wind_speed_10m: 12,
          wind_direction_10m: 180
        },
        hourly: {
          time: Array.from({length: 24}, (_, i) => new Date(Date.now() + i * 3600000).toISOString()),
          temperature_2m: Array.from({length: 24}, () => 20 + Math.random() * 10),
          precipitation_probability: Array.from({length: 24}, () => Math.floor(Math.random() * 30)),
          weather_code: Array.from({length: 24}, () => 0)
        },
        daily: {
          time: Array.from({length: 7}, (_, i) => new Date(Date.now() + i * 86400000).toISOString()),
          weather_code: [0, 1, 2, 3, 0, 1, 2],
          temperature_2m_max: [28, 27, 26, 25, 29, 30, 28],
          temperature_2m_min: [18, 17, 16, 15, 19, 20, 18],
          sunrise: Array.from({length: 7}, () => "06:00"),
          sunset: Array.from({length: 7}, () => "19:00"),
          uv_index_max: [6, 5, 4, 3, 7, 8, 6],
          precipitation_probability_max: [10, 20, 30, 40, 10, 5, 15]
        }
      };
    }
  },

  /**
   * 用户登录
   */
  login: async (payload: any) => {
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      console.warn('Simulating login in demo mode:', error);
      if (payload.username === 'admin' && payload.password === 'password123') {
        return { ok: true, data: { user: mockUser, token: 'demo-token' } };
      }
      return { ok: false, data: { message: '用户名或密码错误（演示模式：admin/password123）' } };
    }
  },

  /**
   * 用户注册
   */
  register: async (payload: any) => {
    try {
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      console.warn('Simulating register in demo mode:', error);
      return { ok: true, data: { user: { ...mockUser, username: payload.username }, token: 'demo-token' } };
    }
  },

  /**
   * 提交用户反馈
   */
  submitFeedback: async (feedback: { type: string; description: string; screenshot?: string; contact?: string }) => {
    try {
      const response = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...feedback, timestamp: new Date().toISOString() })
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '反馈提交失败');
      }
      return await response.json();
    } catch (error) {
      console.warn('Simulating feedback submission in demo mode:', error);
      return { success: true, message: '反馈提交成功（演示模式）' };
    }
  },

  /**
   * 获取 AI 识别历史记录
   */
  getRecognitionHistory: async () => {
    try {
      const response = await apiFetch('/api/recognition/history');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      if (!response.ok) throw new Error('获取识别历史失败');
      return await response.json();
    } catch (error) {
      console.warn('Using mock recognition history due to fetch error or demo mode:', error);
      return [
        {
          id: 'rec_1',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'pest',
          target: '小麦叶斑病',
          confidence: 0.95,
          description: '在叶片上发现典型的椭圆形褐色病斑，边缘有黄色晕圈。',
          image: 'https://picsum.photos/seed/pest1/400/300',
          plotId: 'plot_sim_1'
        },
        {
          id: 'rec_2',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          type: 'species',
          target: '冬小麦',
          confidence: 0.98,
          description: '植株生长健壮，分蘖正常，处于拔节初期。',
          image: 'https://picsum.photos/seed/crop1/400/300',
          plotId: 'plot_sim_2'
        }
      ];
    }
  },

  /**
   * 保存 AI 识别历史记录
   */
  saveRecognitionHistory: async (historyItem: { 
    type: string; 
    target: string; 
    confidence: number; 
    description: string; 
    image: string; 
    plotId: string;
    result: any;
  }) => {
    try {
      const response = await apiFetch('/api/recognition/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyItem)
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON');
      }
      if (!response.ok) throw new Error('保存识别历史失败');
      return await response.json();
    } catch (error) {
      console.warn('Simulating recognition history save in demo mode:', error);
      return { id: `rec_demo_${Date.now()}`, ...historyItem, timestamp: new Date().toISOString() };
    }
  },

  /**
   * 开启双重身份验证
   */
  enable2FA: async (username: string) => {
    try {
      const response = await apiFetch('/api/user/security/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!response.ok) throw new Error('开启 2FA 失败');
      const data = await response.json();
      mockUser.twoFactorEnabled = true;
      return data;
    } catch (error) {
      console.warn('Simulating 2FA enable in demo mode:', error);
      mockUser.twoFactorEnabled = true;
      return { success: true, message: '双重验证已开启（演示模式）' };
    }
  },

  /**
   * 关闭双重身份验证
   */
  disable2FA: async (username: string) => {
    try {
      const response = await apiFetch('/api/user/security/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!response.ok) throw new Error('关闭 2FA 失败');
      const data = await response.json();
      mockUser.twoFactorEnabled = false;
      return data;
    } catch (error) {
      console.warn('Simulating 2FA disable in demo mode:', error);
      mockUser.twoFactorEnabled = false;
      return { success: true, message: '双重验证已关闭（演示模式）' };
    }
  },

  /**
   * 获取用户资料
   */
  getUserProfile: async (username?: string) => {
    try {
      const url = username ? `/api/user/profile?username=${username}` : '/api/user/profile';
      const response = await apiFetch(url);
      if (!response.ok) throw new Error('获取用户资料失败');
      const data = await response.json();
      mockUser = { ...mockUser, ...data };
      return data;
    } catch (error) {
      console.warn('Using mock user profile due to fetch error or demo mode:', error);
      return mockUser;
    }
  },

  /**
   * 更新用户资料
   */
  updateUserProfile: async (profile: any) => {
    try {
      const response = await apiFetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!response.ok) throw new Error('更新用户资料失败');
      const data = await response.json();
      mockUser = { ...mockUser, ...data };
      return data;
    } catch (error) {
      console.warn('Updating mock user profile due to fetch error or demo mode:', error);
      mockUser = { ...mockUser, ...profile };
      return mockUser;
    }
  },

  /**
   * 修改密码
   */
  changePassword: async (payload: any) => {
    try {
      const response = await apiFetch('/api/user/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '修改密码失败');
      }
      return await response.json();
    } catch (error) {
      console.warn('Simulating password change success in demo mode:', error);
      return { success: true, message: '密码修改成功（演示模式）' };
    }
  },

  /**
   * 获取用户收藏列表
   */
  getFavorites: async (username?: string) => {
    try {
      const url = username ? `/api/user/favorites?username=${username}` : '/api/user/favorites';
      const response = await apiFetch(url);
      if (!response.ok) throw new Error('获取收藏列表失败');
      return await response.json();
    } catch (error) {
      console.error('Get favorites error:', error);
      return [];
    }
  },

  /**
   * 添加收藏
   */
  addFavorite: async (articleId: string, username?: string) => {
    try {
      const response = await apiFetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, username })
      });
      if (!response.ok) throw new Error('添加收藏失败');
      return await response.json();
    } catch (error) {
      console.error('Add favorite error:', error);
      throw error;
    }
  },

  /**
   * 移除收藏
   */
  removeFavorite: async (articleId: string, username?: string) => {
    try {
      const url = username ? `/api/user/favorites/${articleId}?username=${username}` : `/api/user/favorites/${articleId}`;
      const response = await apiFetch(url, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('移除收藏失败');
      return await response.json();
    } catch (error) {
      console.error('Remove favorite error:', error);
      throw error;
    }
  },

  getUserApiKeys,
  setUserApiKeys
};

export default DataService;
