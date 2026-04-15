import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Parser from 'rss-parser';
import fs from 'fs';
import os from 'os';

// Handle both ESM and CJS environments
const getDirname = () => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {
    return __dirname;
  }
};

const getFilename = () => {
  try {
    return fileURLToPath(import.meta.url);
  } catch (e) {
    return __filename;
  }
};

const _filename = getFilename();
const _dirname = getDirname();

// Load .env from the correct directory
dotenv.config(); // Try root first

if (process.env.NODE_ENV === 'production') {
  // In Electron production, .env might be in the resources folder
  const resourcesEnv = path.join(process.cwd(), 'resources', '.env');
  if (fs.existsSync(resourcesEnv)) {
    dotenv.config({ path: resourcesEnv });
  }
  
  if (process.env.RESOURCES_PATH) {
    const electronEnv = path.join(process.env.RESOURCES_PATH, '.env');
    if (fs.existsSync(electronEnv)) {
      dotenv.config({ path: electronEnv });
    }
  }
} else {
  // In development fallback
  dotenv.config({ path: path.join(__dirname, '.env') });
}

// --- AI Recognition Helpers ---

function generateMockAIResult(type: string, plot: any) {
  const crop = plot?.crop || "作物";
  const plotName = plot?.name || "地块";
  
  if (type === 'pest') {
    return {
      type: "病虫害识别",
      target: `${crop}蚜虫 (初步诊断)`,
      confidence: 0.92,
      description: `在${plotName}的${crop}叶片背面发现少量绿色小型昆虫聚集，伴有叶片卷曲现象。初步判断为蚜虫早期侵害。`,
      suggestions: [
        "利用黄色粘虫板进行物理诱杀",
        "释放瓢虫等天敌进行生物防治",
        "如虫口密度继续增大，建议喷施 10% 吡虫啉可湿性粉剂 1500 倍液"
      ],
      detailedReport: `### 深度诊断报告\n\n**视觉特征分析：**\n通过多引擎协同扫描，识别出叶片背面存在明显的刺吸式口器害虫特征。虫体呈纺锤形，体色与叶片接近，具有明显的群集性。受害叶片表现出典型的不规则卷曲和生长停滞。\n\n**发生规律预测：**\n当前环境温度 22-26℃，湿度 60% 左右，正处于该类害虫的快速繁殖期。结合地块历史数据，预计未来 3-5 天内受害面积可能扩大 15%。\n\n**综合防治建议：**\n1. **监测预警：** 增加田间巡检频率，重点检查生长旺盛的植株。\n2. **精准施药：** 建议采用局部喷雾方式，重点喷洒叶片背面。\n3. **肥水管理：** 适当控制氮肥用量，增强植株抗逆性。`,
      status: "warning",
      isSimulated: true,
      isCollaborative: true,
      isAgricultureRelated: true,
      qwenSummary: "阿里云百炼视觉引擎：识别到疑似蚜虫群集，叶片伴有分泌物及卷曲特征。",
      zhipuVisionDetail: "智谱 AI 视觉增强：确认虫体形态为蚜虫，分布密度约为 5-10 只/叶，处于发生初期。"
    };
  } else if (type === 'species') {
    return {
      type: "作物种类识别",
      target: `${crop}`,
      confidence: 0.98,
      description: `识别结果确认为：${crop}。植株生长健壮，叶色浓绿，株型符合该品种典型特征。`,
      suggestions: [
        "当前处于生长旺盛期，需保证充足的水分供应",
        "注意观察中下部叶片是否有缺素症状",
        "根据生长进度，建议 7 天后进行一次叶面肥喷施"
      ],
      detailedReport: `### 作物分类与长势评估\n\n**形态学特征：**\n植株高度约 45cm，叶片呈披针形，边缘平滑，脉络清晰。分蘖情况良好，主茎粗壮，抗倒伏能力评估为优。\n\n**生育期判断：**\n结合图像特征与地块种植时间（${plot?.createdAt ? new Date(plot.createdAt).toLocaleDateString() : '未知'}），判断当前处于拔节期后期，即将进入孕穗期。\n\n**长势评价：**\n整体长势评分为 92/100。叶绿素分布均匀，未发现明显的病理性变色或机械损伤。建议维持当前的自动化灌溉与施肥策略。`,
      status: "normal",
      isSimulated: true,
      isCollaborative: true,
      isAgricultureRelated: true,
      qwenSummary: "阿里云百炼视觉引擎：识别为优质${crop}品种，植株形态完整，生长势头强劲。",
      zhipuVisionDetail: "智谱 AI 视觉增强：叶片指数（LAI）估算正常，光合作用效能处于高位。"
    };
  } else {
    return {
      type: "长势评估",
      target: "长势优良",
      confidence: 0.89,
      description: `${plotName}的${crop}整体长势均衡，水分盈缺度正常，未见明显逆境表现。`,
      suggestions: [
        "继续保持当前的智能化灌溉频率",
        "监测环境温度变化，防止高温灼伤",
        "定期清理田间杂草，减少养分竞争"
      ],
      detailedReport: `### 生理状态深度分析\n\n**营养状况评估：**\n通过多光谱模拟分析，植株氮素含量处于适宜区间。叶片 SPAD 估算值约为 42，光合色素积累充分。\n\n**环境适应性分析：**\n近期温湿度波动在作物耐受范围内。根系活力评估较强，水分利用效率（WUE）表现优异。\n\n**未来预测：**\n若维持当前管理水平，预计产量可达预期目标的 105%。建议在接下来的关键生育期加强磷钾肥的补充，以促进果实发育。`,
      status: "normal",
      isSimulated: true,
      isCollaborative: true,
      isAgricultureRelated: true,
      qwenSummary: "阿里云百炼视觉引擎：植株覆盖度高，群体结构合理，无明显缺素或干旱迹象。",
      zhipuVisionDetail: "智谱 AI 视觉增强：冠层温度分布均匀，蒸腾作用正常，生理代谢旺盛。"
    };
  }
}

export const app = express();

async function startServer() {
  const PORT = process.env.PORT || 3000;
  
  // Use /tmp for serverless environments (Vercel, EdgeOne, etc.)
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const USER_DATA_PATH = isServerless ? os.tmpdir() : (process.env.USER_DATA_PATH || _dirname);
  const DB_FILE = path.join(USER_DATA_PATH, 'nxzj_db.json');

  // AI API Keys and Cache
  const QWEN_API_KEY = process.env.QWEN_API_KEY || "";
  const ZHIPU_API_KEY = process.env.ZHIPU_AI_KEY || "";
  const aiCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
  const CACHE_VERSION = 'v2'; // Increment this when changing response structure

  // Increase payload limit for base64 image uploads
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // --- 模拟后端数据库/硬件状态 ---
  let users: any[] = [];
  let plots: Record<string, any> = {};
  let systemLogs: any[] = [];
  let feedbackList: any[] = [];
  let recognitionHistory: any[] = [];
  let globalConfig = {
    defaultApiUsageCount: 0,
    maxDefaultUsage: 100
  };

  // Load data from file
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      users = data.users || [];
      plots = data.plots || {};
      systemLogs = data.systemLogs || [];
      feedbackList = data.feedbackList || [];
      recognitionHistory = data.recognitionHistory || [];
      globalConfig = data.globalConfig || globalConfig;
      if (globalConfig.maxDefaultUsage < 100) {
        globalConfig.maxDefaultUsage = 100;
      }
      console.log(`[DB] Loaded data from ${DB_FILE}`);
    }
  } catch (err) {
    console.error(`[DB] Failed to load data from ${DB_FILE}:`, err);
  }

  // Save data to file (Debounced & Asynchronous to improve performance)
  let saveTimeout: NodeJS.Timeout | null = null;
  const saveData = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(async () => {
      try {
        const dataToSave = JSON.stringify({
          users, plots, systemLogs, feedbackList, recognitionHistory, globalConfig
        }, null, 2);
        await fs.promises.writeFile(DB_FILE, dataToSave);
      } catch (err) {
        console.error(`[DB] Failed to save data to ${DB_FILE}:`, err);
      }
    }, 1000); // 1 second debounce
  };

  // Initialize default data if empty
  if (users.length === 0) {
    users = [
      { 
        username: 'admin', 
        password: 'password123', 
        role: '管理员',
        plan: '企业版',
        aiRecognitionCount: 0,
        name: '张农芯',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        bio: '致力于智慧农业技术推广的先行者，农芯智境平台创始人。',
        phone: '13800138000',
        email: 'admin@nxzj.com',
        location: '北京市海淀区中关村农业科技园',
        joinDate: '2024-01-01',
        securityLogs: [
          { event: '登录成功', time: new Date().toISOString(), ip: '192.168.1.100' },
          { event: '修改个人资料', time: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.100' }
        ],
        favorites: [] as string[],
        twoFactorEnabled: false
      }
    ];
  }

  if (Object.keys(plots).length === 0) {
    plots = {
      'plot_sim_1': {
        id: 'plot_sim_1',
        owner: 'admin',
        name: '模拟田 - 1号',
        area: 50,
        crop: '小麦',
        growthStage: '拔节期',
        status: 'active',
        isSimulated: true,
        connectedDevices: [],
        nextTillageDate: '2026-04-15',
        hardwareState: {
          irrigation: false,
          ventilation: false,
          heating: false,
          lighting: false,
          fertilization: false
        },
        sensorData: {
          temperature: 22.50,
          humidity: 65.20,
          soilMoisture: 35.80,
          light: 12000.00,
          soilTemp: 18.50,
          pH: 6.80,
          nitrogen: 120.50,
          phosphorus: 45.20,
          potassium: 180.80
        }
      },
      'plot_sim_2': {
        id: 'plot_sim_2',
        owner: 'admin',
        name: '模拟田 - 2号',
        area: 30,
        crop: '玉米',
        growthStage: '苗期',
        status: 'active',
        isSimulated: true,
        connectedDevices: [],
        nextTillageDate: '2026-04-20',
        hardwareState: {
          irrigation: false,
          ventilation: false,
          heating: false,
          lighting: false,
          fertilization: false
        },
        sensorData: {
          temperature: 24.80,
          humidity: 58.50,
          soilMoisture: 32.10,
          light: 15000.00,
          soilTemp: 20.20,
          pH: 6.50,
          nitrogen: 110.20,
          phosphorus: 38.50,
          potassium: 165.40
        }
      },
      'plot_sim_3': {
        id: 'plot_sim_3',
        owner: 'admin',
        name: '模拟田 - 3号',
        area: 80,
        crop: '大豆',
        growthStage: '开花期',
        status: 'active',
        isSimulated: true,
        connectedDevices: [],
        nextTillageDate: '2026-05-01',
        hardwareState: {
          irrigation: false,
          ventilation: false,
          heating: false,
          lighting: false,
          fertilization: false
        },
        sensorData: {
          temperature: 21.20,
          humidity: 70.10,
          soilMoisture: 40.50,
          light: 10000.00,
          soilTemp: 17.80,
          pH: 7.10,
          nitrogen: 135.80,
          phosphorus: 52.10,
          potassium: 195.20
        }
      }
    };
  }

  // --- 动态生成知识库与资讯数据池 ---
  const categories = ['种植技术', '病虫害防治', '农机使用', '政策法规', '市场行情', '智慧农业'];
  const crops = ['小麦', '玉米', '大豆', '水稻', '马铃薯', '苹果', '柑橘', '葡萄', '茶叶', '蔬菜', '棉花', '花生'];
  const techs = ['节水灌溉', '测土配方施肥', '深松耕', '无人机植保', '智能温室控制', '水肥一体化', '保护性耕作', '精准播种', '机械化收获'];
  const pests = ['蚜虫', '红蜘蛛', '晚疫病', '稻飞虱', '玉米螟', '根腐病', '白粉病', '炭疽病'];
  const imgs = ['wheat', 'orchard', 'policy', 'soil', 'apple', 'potato', 'rice', 'tea', 'veggie', 'tractor'];

  function generateKnowledgePool(count: number) {
    const pool = [];
    const perCategory = Math.ceil(count / categories.length);
    
    for (const cat of categories) {
      for (let j = 1; j <= perCategory; j++) {
        const i = pool.length + 1;
        const crop = crops[Math.floor(Math.random() * crops.length)];
        let title = '';
        let summary = '';
        let content = '';
        
        if (cat === '种植技术') {
          const tech = techs[Math.floor(Math.random() * techs.length)];
          title = `${crop}${tech}高产栽培技术要点`;
          summary = `本文详细介绍了${crop}在${tech}方面的最新研究成果与实践经验。`;
          content = `在${crop}的种植过程中，${tech}的应用至关重要。通过科学的管理手段，可以显著提升单位面积产量并改善品质。建议农户在实际操作中注意土壤肥力监测与水分调节，结合当地气候条件灵活调整作业方案。`;
        } else if (cat === '病虫害防治') {
          const pest = pests[Math.floor(Math.random() * pests.length)];
          title = `${crop}${pest}的识别与综合防治策略`;
          summary = `针对近期多发的${crop}${pest}，专家给出了精准的识别方法和高效的防控方案。`;
          content = `${pest}是影响${crop}产量的主要因素之一。其发病初期症状不明显，容易被忽视。防治应坚持“预防为主”的方针，结合生物防治和化学防治手段，确保${crop}健康生长。`;
        } else if (cat === '农机使用') {
          title = `现代化${crop}生产机械化作业规范`;
          summary = `随着农业机械化的普及，掌握${crop}生产各环节的机具操作规范变得尤为重要。`;
          content = `从整地、播种到收获，机械化作业已覆盖${crop}生产全过程。操作人员应定期对机具进行保养，确保作业深度均匀，减少机械损伤，提高${crop}生产效率。`;
        } else if (cat === '政策法规') {
          title = `2026年${crop}种植专项补贴政策解读`;
          summary = `国家最新发布的关于${crop}种植的扶持政策，旨在保障粮食安全和农民增收。`;
          content = `根据最新政策，种植${crop}的农户可申请多项补贴。包括种子补贴、化肥补贴以及农机购置补贴等。申请流程简化，旨在让政策红利直达农户，助力${crop}产业发展。`;
        } else if (cat === '市场行情') {
          title = `近期全国${crop}市场价格走势分析与预测`;
          summary = `受供需关系影响，${crop}市场价格出现波动，未来走势值得关注。`;
          content = `监测数据显示，本周${crop}批发价格呈现稳中略升态势。主要原因是主产区受天气影响供应减少。预计下月随着新粮上市，价格将趋于平稳。建议${crop}种植户合理安排销售。`;
        } else {
          title = `智慧农业技术在${crop}生产中的创新应用`;
          summary = `利用物联网、大数据和AI技术，实现${crop}生产的数字化管理。`;
          content = `智慧农业通过安装在田间的传感器实时采集${crop}生长环境数据。AI模型根据数据自动生成灌溉和施肥方案，极大提高了资源利用效率，推动${crop}种植向智能化转型。`;
        }

        pool.push({
          id: `k-${cat}-${i}`,
          title,
          cat,
          date: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 60).toISOString().split('T')[0],
          img: imgs[Math.floor(Math.random() * imgs.length)],
          summary,
          content,
          link: `https://www.baidu.com/s?wd=${encodeURIComponent(title + ' 农业技术')}`
        });
      }
    }
    // Shuffle the pool to avoid having all categories grouped together
    return pool.sort(() => Math.random() - 0.5);
  }

  function generateNewsPool(source: string, count: number) {
    const news = [];
    const crops = ['小麦', '玉米', '大豆', '水稻', '马铃薯', '苹果', '柑橘', '葡萄', '茶叶', '蔬菜', '棉花', '花生'];
    for (let i = 1; i <= count; i++) {
      const crop = crops[Math.floor(Math.random() * crops.length)];
      let title = '';
      let sourceName = '';
      let link = '';
      
      if (source === 'mara') {
        title = `农业农村部：关于加强2026年春季${crop}田间管理的通知`;
        sourceName = '农业农村部';
        link = `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`;
      } else if (source === 'tianxing') {
        title = `行业观察：${crop}深加工产业迎来新机遇，产值有望突破新高`;
        sourceName = '行业观察';
        link = `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`;
      } else {
        title = `政务服务：2026年${crop}种植保险理赔绿色通道正式开启`;
        sourceName = '政务服务平台';
        link = `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`;
      }

      news.push({
        id: `news-${source}-${i}`,
        title,
        time: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
        source: sourceName,
        link,
        content: `【${sourceName} 深度报道】\n\n近日，${sourceName}发布了关于“${title}”的详细指南。\n\n随着我国农业现代化进程的加快，${crop}作为重要的农产品，其产业升级已成为行业关注的焦点。专家分析指出，通过引入智慧农业监测系统，结合大数据分析与精准作业，${crop}的单位产量可提升15%以上，同时化肥使用量减少20%，实现了经济效益与生态效益的双赢。\n\n目前，全国多个省份已启动${crop}标准化种植示范区建设。相关部门表示，将进一步加大对智慧农业装备的补贴力度，鼓励农户连接物联网传感器、自动化灌溉等设备，实现生产全过程的数字化管理。\n\n广大农友应积极响应政策号召，加强田间管理，利用好“农芯智境”等智能化平台，科学决策，保障丰收。更多详情请访问官方发布渠道或咨询当地农技站。`
      });
    }
    return news;
  }

  let knowledgePool = generateKnowledgePool(600);
  const newsPools = {
    mara: generateNewsPool('mara', 100),
    tianxing: generateNewsPool('tianxing', 100),
    gov: generateNewsPool('gov', 100)
  };

  // --- 真实数据更新逻辑 ---
  async function updateRealData() {
    const TIANXING_API_KEY = process.env.TIANXING_API_KEY || '17606b6810a2b0aff9318d71f4f68e1c';
    try {
      // 1. 更新资讯数据
      const fetchNews = async (word: string, sourceName: string, targetPool: any[]) => {
        const res = await fetch(`https://apis.tianapi.com/nongye/index?key=${TIANXING_API_KEY}&num=50${word ? '&word=' + encodeURIComponent(word) : ''}`);
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200 && data.result?.newslist) {
            const realItems = data.result.newslist.map((item: any, index: number) => ({
              id: `news-${sourceName}-real-${Date.now()}-${index}`,
              title: item.title,
              time: item.ctime.split(' ')[0],
              source: item.source || sourceName,
              link: item.url,
              content: item.description ? `${item.description}\n\n请点击“访问原文”查看详细内容。` : `【${item.source || sourceName}】\n\n${item.title}\n\n请点击“访问原文”查看详细内容。`
            }));
            // 保留旧的模拟数据作为补充，将真实数据放在前面
            return [...realItems, ...targetPool.filter((i: any) => !i.id.includes('-real-'))];
          }
        }
        return targetPool;
      };

      newsPools.mara = await fetchNews('农业农村部', '农业农村部', newsPools.mara);
      newsPools.tianxing = await fetchNews('', '行业观察', newsPools.tianxing);
      newsPools.gov = await fetchNews('政策', '政务服务', newsPools.gov);

      // 2. 更新知识库数据
      let newKnowledgeItems: any[] = [];
      const keywords = ['种植技术', '病虫害', '农机', '农业政策', '农产品市场', '智慧农业'];
      const catMap = ['种植技术', '病虫害防治', '农机使用', '政策法规', '市场行情', '智慧农业'];
      
      for (let i = 0; i < keywords.length; i++) {
        const kw = keywords[i];
        const cat = catMap[i];
        const res = await fetch(`https://apis.tianapi.com/nongye/index?key=${TIANXING_API_KEY}&num=20&word=${encodeURIComponent(kw)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200 && data.result?.newslist) {
            const items = data.result.newslist.map((item: any, index: number) => ({
              id: `k-${cat}-real-${Date.now()}-${index}`,
              title: item.title,
              cat: cat,
              date: item.ctime.split(' ')[0],
              img: imgs[Math.floor(Math.random() * imgs.length)],
              summary: item.description || item.title,
              content: item.description ? `${item.description}\n\n请点击“访问原文”查看详细内容。` : `【${cat}】\n\n${item.title}\n\n请点击“访问原文”查看详细内容。`,
              link: item.url
            }));
            newKnowledgeItems = newKnowledgeItems.concat(items);
          }
        }
      }
      
      if (newKnowledgeItems.length > 0) {
        // 保留旧的模拟数据，将真实数据放在前面
        const oldMockData = knowledgePool.filter(item => !item.id.includes('-real-'));
        knowledgePool = [...newKnowledgeItems, ...oldMockData];
      }

      console.log('Real data updated successfully from Tianxing API.');
    } catch (error) {
      console.error('Failed to update real data:', error);
    }
  }

  // 启动时获取一次真实数据
  updateRealData();
  
  // 每6小时更新一次
  setInterval(updateRealData, 1000 * 60 * 60 * 6);

  // --- 系统运行日志 ---

  function addLog(type: string, message: string, status: 'info' | 'success' | 'warning' | 'danger' = 'info') {
    const newLog = {
      id: `log_${Date.now()}`,
      time: new Date().toISOString(),
      type,
      message,
      status
    };
    systemLogs.unshift(newLog); saveData();
    if (systemLogs.length > 50) systemLogs.pop();
    return newLog;
  }

  app.get('/api/system/logs', (req, res) => {
    res.json(systemLogs);
  });

  // --- 农田地块管理接口 ---
  app.get('/api/plots', (req, res) => {
    const username = req.query.username as string || 'admin';
    const userPlots = Object.values(plots).filter(p => p.owner === username);
    res.json(userPlots);
  });

  app.post('/api/plots', (req, res) => {
    const { name, area, crop, nextTillageDate, username } = req.body;
    const id = `plot_${Date.now()}`;
    const owner = username || 'admin';
    plots[id] = {
      id,
      owner,
      name,
      area,
      crop,
      isSimulated: true, // 新添加的默认为模拟农田，直到连接真实设备
      status: 'pending_setup',
      connectedDevices: [],
      nextTillageDate: nextTillageDate || new Date().toISOString().split('T')[0],
      hardwareState: { irrigation: false, ventilation: false, heating: false, lighting: false, fertilization: false },
      sensorData: { temperature: 0, humidity: 0, light: 0, soilTemp: 0, soilMoisture: 0, pH: 0, nitrogen: 0, phosphorus: 0, potassium: 0 }
    };
    saveData(); res.json(plots[id]);
  });

  app.post('/api/plots/:id/connect', (req, res) => {
    const { id } = req.params;
    const { devices } = req.body;
    if (plots[id]) {
      const currentDevices = plots[id].connectedDevices || [];
      plots[id].connectedDevices = [...new Set([...currentDevices, ...devices])];
      
      // 检查是否连接了关键传感器和自动化设备
      const hasSensors = plots[id].connectedDevices.some((d: string) => d.includes('sensor') || d.includes('hub'));
      const hasAutomation = plots[id].connectedDevices.some((d: string) => d.includes('valve') || d.includes('fan') || d.includes('lamp') || d.includes('system'));
      
      if (hasSensors && hasAutomation) {
        plots[id].isSimulated = false; // 连接真实设备后不再是模拟农田
        plots[id].status = 'active';
        plots[id].sensorData = { 
          temperature: Number((20 + Math.random() * 10).toFixed(2)), 
          humidity: Number((40 + Math.random() * 40).toFixed(2)), 
          light: Number((1000 + Math.random() * 5000).toFixed(2)), 
          soilTemp: Number((15 + Math.random() * 10).toFixed(2)), 
          soilMoisture: Number((30 + Math.random() * 40).toFixed(2)), 
          pH: Number((6.0 + Math.random() * 1.5).toFixed(2)), 
          nitrogen: Number((50 + Math.random() * 100).toFixed(2)), 
          phosphorus: Number((20 + Math.random() * 30).toFixed(2)), 
          potassium: Number((100 + Math.random() * 200).toFixed(2)) 
        };
        addLog('hardware', `${plots[id].name} 已成功连接传感器与自动化设备，正式投入运行`, 'success');
      } else {
        addLog('hardware', `${plots[id].name} 已连接部分设备，请继续完善传感器与自动化系统配置`, 'warning');
      }
      saveData(); res.json(plots[id]);
    } else {
      res.status(404).json({ error: '地块未找到' });
    }
  });

  app.post('/api/hardware/control', (req, res) => {
    const { plotId, type, action } = req.body;
    const plot = plots[plotId];
    if (!plot) return res.status(404).json({ error: '地块未找到' });

    if (!plot.hardwareState) {
      plot.hardwareState = { irrigation: false, ventilation: false, heating: false, lighting: false, fertilization: false };
    }

    plot.hardwareState[type] = action === 'start';
    
    const actionText = action === 'start' ? '启动' : '关闭';
    const typeText = { irrigation: '灌溉', ventilation: '通风', heating: '加热', lighting: '补光', fertilization: '施肥' }[type as keyof typeof plot.hardwareState] || type;
    
    addLog('hardware', `${plot.name} 已${actionText}${typeText}系统`, 'info');
    saveData();

    if (action === 'start') {
      setTimeout(() => {
        if (plots[plotId] && plots[plotId].hardwareState) {
          plots[plotId].hardwareState[type] = false;
          saveData();
        }
      }, 5000);
    }

    res.json({ success: true, state: plot.hardwareState });
  });

  app.get('/api/hardware/params', (req, res) => {
    const { plotId } = req.query;
    const plot = plots[String(plotId)];
    if (!plot) return res.status(404).json({ error: '地块未找到' });

    if (!plot.hardwareParams) {
      plot.hardwareParams = {
        irrigation: { duration: 30, targetMoisture: 60 },
        ventilation: { duration: 15, targetTemp: 25 },
        heating: { duration: 60, targetTemp: 20 },
        lighting: { duration: 120, targetLight: 50000 },
        fertilization: { amount: 15, type: '复合肥' }
      };
      saveData();
    }
    res.json(plot.hardwareParams);
  });

  app.post('/api/hardware/params', (req, res) => {
    const { plotId, type, params } = req.body;
    const plot = plots[plotId];
    if (!plot) return res.status(404).json({ error: '地块未找到' });

    if (!plot.hardwareParams) {
      plot.hardwareParams = {
        irrigation: { duration: 30, targetMoisture: 60 },
        ventilation: { duration: 15, targetTemp: 25 },
        heating: { duration: 60, targetTemp: 20 },
        lighting: { duration: 120, targetLight: 50000 },
        fertilization: { amount: 15, type: '复合肥' }
      };
    }

    plot.hardwareParams[type] = { ...plot.hardwareParams[type], ...params };
    saveData();
    res.json({ success: true, params: plot.hardwareParams });
  });

  app.post('/api/hardware/fertilize', (req, res) => {
    const { plotId } = req.body;
    const plot = plots[plotId];
    if (!plot) return res.status(404).json({ error: '地块未找到' });

    // 模拟施肥逻辑
    plot.hardwareState.fertilization = true;
    addLog('hardware', `${plot.name} 已启动自动化施肥程序`, 'success');
    saveData();
    
    // 模拟一段时间后关闭
    setTimeout(() => {
      plot.hardwareState.fertilization = false;
      saveData();
    }, 5000);

    res.json({ success: true, message: '施肥已启动' });
  });

  // Helper for AI API calls with retry and timeout
  async function fetchWithRetry(url: string, options: any, retries = 2, backoff = 1000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorBody: any = {};
        try {
          errorBody = await response.json();
        } catch (e) {
          errorBody = { message: await response.text().catch(() => 'Unknown error') };
        }

        const errorMessage = errorBody.error?.message || errorBody.message || `API error: ${response.status}`;
        
        // Retry on 429 (Rate Limit) or 5xx (Server Error)
        if ((response.status === 429 || response.status >= 500) && retries > 0) {
          console.warn(`[AI API] ${response.status === 429 ? 'Rate limited' : 'Server error'} ${response.status}, retrying in ${backoff}ms... Error: ${errorMessage}`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接或稍后重试。');
      }
      if (retries > 0 && !error.message?.includes('401') && !error.message?.includes('403') && !error.message?.includes('400')) {
        console.warn(`[AI API] Network error or timeout, retrying in ${backoff}ms... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw error;
    }
  }

  // --- 实时监测数据接口 ---
  app.get('/api/monitoring/realtime', (req, res) => {
    const { plotId } = req.query;
    const plot = plots[String(plotId)];
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    
    const data = { ...plot.sensorData };
    data.temperature = Number((data.temperature + (Math.random() - 0.5) * 0.5).toFixed(2));
    data.humidity = Number((data.humidity + (Math.random() - 0.5) * 2).toFixed(2));
    
    res.json(data);
  });

  function checkUserQuota(username: string | undefined, isUsingDefault: boolean) {
    if (!isUsingDefault) return { allowed: true, isSharedQuota: false };
    if (!username) return { allowed: true, isSharedQuota: true }; // Allow if no user context
    
    const user = users.find(u => u.username === username);
    if (!user) return { allowed: true, isSharedQuota: true };
    
    const plan = user.role === '管理员' ? '企业版' : (user.plan || '基础版');
    if (plan === '企业版' || plan === '专业版') return { allowed: true, isSharedQuota: true };
    
    // Remove the hard limit of 10, but we can still track usage
    return { allowed: true, isSharedQuota: true };
  }

  function incrementUserQuota(username: string | undefined, isUsingDefault: boolean) {
    if (!isUsingDefault || !username) return;
    const user = users.find(u => u.username === username);
    if (user) {
      const plan = user.role === '管理员' ? '企业版' : (user.plan || '基础版');
      if (plan === '基础版') {
        user.aiRecognitionCount = (user.aiRecognitionCount || 0) + 1;
        saveData();
      }
    }
  }

  // AI 智能识别接口 (多引擎协同：阿里云百炼视觉引擎 + 智谱 AI 视觉增强 + 智谱 AI 专家诊断)
  app.post('/api/ai/recognize', async (req, res) => {
    const { image, type, plotId, plotData, username, userQwenKey, userZhipuKey } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "识别失败", message: "未接收到图片数据，请重新上传。" });
    }

    try {
      // Determine which keys to use
      let activeQwenKey = userQwenKey || QWEN_API_KEY;
      let activeZhipuKey = userZhipuKey || ZHIPU_API_KEY;
      let isUsingDefault = !userQwenKey || !userZhipuKey;

      const plot = plotData || (plotId ? plots[plotId] : null);

      // If both keys are missing or placeholders, provide a high-quality mock result for demonstration
      const isQwenMissing = !activeQwenKey || activeQwenKey === 'your_qwen_api_key_here' || activeQwenKey.trim() === '';
      const isZhipuMissing = !activeZhipuKey || activeZhipuKey === 'your_zhipu_api_key_here' || activeZhipuKey.trim() === '';

      if (isQwenMissing && isZhipuMissing) {
        console.log("[AI Recognition] No API keys provided. Providing simulated expert result for demonstration.");
        
        // Generate a realistic mock result based on type and plot data
        const mockResult = generateMockAIResult(type, plot);
        
        // Simulate a short delay for "analysis"
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return res.json(mockResult);
      }

      const quotaCheck = checkUserQuota(username, isUsingDefault);
      if (!quotaCheck.allowed) {
        return res.status(403).json({ error: "配额不足", message: "当前公共 API 配额已耗尽，请在设置中配置您个人的 API Key 以继续使用。" });
      }
      
      incrementUserQuota(username, isUsingDefault);

      // Check cache
      const cacheKey = `${CACHE_VERSION}_recognize_${type}_${image.substring(0, 100)}_${image.length}`;
      const cached = aiCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[AI Recognition] Returning cached result for ${type}`);
        return res.json(cached.data);
      }

      console.log(`[AI Recognition] Starting analysis for ${type}...`);
      
      let resultText = "";
      let recognitionSummary = "";
      let zhipuVisionResult = "";

      // Prompts
      const qwenPrompt = type === 'pest' 
          ? "请作为农业植保专家，识别图片中的病虫害名称，并给出初步的视觉特征描述（如病斑形状、颜色、受害部位等）。如果不是农业相关图片，请直接回复'非农业图像'。请务必全部使用中文回答，禁止使用任何英文单词或字母。"
          : type === 'species'
          ? "请作为植物分类学家，识别图片中的农作物种类，并给出形态学特征描述（如叶片形态、叶序等）。如果不是农业相关图片，请直接回复'非农业图像'。请务必全部使用中文回答，禁止使用任何英文单词或字母。"
          : "请作为作物生理专家，评估图片中农作物的长势和生理特征（如叶色深浅、植株密度、是否有逆境表现）。如果不是农业相关图片，请直接回复'非农业图像'。请务必全部使用中文回答，禁止使用任何英文单词或字母。";

      const visionPrompt = `首先，请严格判断这张图片是否真的包含农作物、植物、农业病虫害或农业土壤等与农业直接相关的元素。如果上传的图片明显不是农业相关（例如人物、动物、家具、汽车、风景等非农业场景），请直接回复“非农业图像：[具体描述你看到了什么]”。
如果确认是农业相关图片，请继续分析：
` + (type === 'pest' 
        ? "请作为农业植保专家，深度分析这张图片。请重点观察：1.病斑的形状、颜色、边缘特征；2.受害部位（叶尖、叶缘、叶脉）；3.是否有菌丝或虫卵。请给出极其详尽的视觉特征描述，并判断病虫害的具体阶段。请务必全部使用中文回答，禁止使用任何英文单词或字母。"
        : type === 'species'
        ? "请作为植物分类学家，观察这张农作物图片。请分析：1.叶片形态（披针形、卵形等）；2.叶序与分蘖情况；3.当前的生育期（苗期、拔节期、抽穗期等）。请给出专业的分类学描述。请务必全部使用中文回答，禁止使用任何英文单词或字母。"
        : "请作为作物生理专家，评估这张图片的作物长势。请分析：1.叶色深浅（SPAD值估算）；2.植株高度与密度感官；3.是否有干旱、缺氮、缺磷等逆境表现。请给出详细的生理状态描述。请务必全部使用中文回答，禁止使用任何英文单词或字母。");

      // Parallelize Qwen and Zhipu Vision calls
      const [qwenPromise, zhipuVisionPromise] = [
        (!isQwenMissing ? fetchWithRetry('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeQwenKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "qwen-vl-max",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: qwenPrompt },
                  { type: "image_url", image_url: { url: image } }
                ]
              }
            ]
          })
        }) : Promise.resolve({ choices: [{ message: { content: "阿里云百炼视觉引擎未配置。" } }] })).catch(e => {
          console.error("Qwen API call failed:", e);
          return { choices: [{ message: { content: "阿里云百炼视觉引擎调用失败。" } }] };
        }),
        (!isZhipuMissing ? fetchWithRetry('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeZhipuKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "glm-4v-flash",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: visionPrompt },
                  { type: "image_url", image_url: { url: image } }
                ]
              }
            ]
          })
        }) : Promise.resolve({ choices: [{ message: { content: "智谱 AI 视觉增强未配置。" } }] })).catch(e => {
          console.error("Zhipu Vision API call failed:", e);
          return { choices: [{ message: { content: "智谱 AI 视觉增强调用失败。" } }] };
        })
      ];

      const [qwenData, visionData] = await Promise.all([qwenPromise, zhipuVisionPromise]);
      
      recognitionSummary = qwenData.choices?.[0]?.message?.content || "";
      zhipuVisionResult = visionData.choices?.[0]?.message?.content || "";

      console.log(`[AI Recognition] Multi-engine scan complete. Generating expert report for ${type}...`);

      const expertPersona = type === 'pest' 
        ? "你是一个资深农业植保专家，精通各类农作物病虫害的视觉诊断、发生规律分析及综合防治策略。"
        : type === 'species'
        ? "你是一个资深植物分类学家与育种专家，擅长通过叶片、茎秆、花果等视觉特征准确识别农作物种类、品种及其生育期。"
        : "你是一个资深作物生理与营养专家，擅长通过植株形态、叶色变化评估作物的营养丰缺、水分状况及整体长势。";

      const reportPrompt = `请根据以下多引擎协同分析数据生成诊断报告：
识别类型：${type}
初步识别摘要：${recognitionSummary || '无'}
视觉增强分析：${zhipuVisionResult || '无'}
地块背景：${plot?.name || '核心示范区'} (主栽作物: ${plot?.crop || '冬小麦'})

如果“视觉增强分析”中明确指出这是“非农业图像”。请务必返回如下JSON：
{
  "isAgricultureRelated": false,
  "type": "非农业图像",
  "target": "未识别到农业目标",
  "confidence": 0,
  "description": "上传的图片似乎与农业无关，请上传包含农作物、病虫害或土壤的清晰照片。",
  "detailedReport": "系统检测到该图片不包含农业相关特征。为了获得准确的诊断，请确保照片主体为植物叶片、果实、茎秆或农业土壤等。",
  "suggestions": ["请重新拍摄并上传清晰的农作物照片", "确保照片主体占据画面中心", "避免反光或过度模糊"],
  "relatedKnowledge": []
}

如果确认是农业相关图片，请严格返回以下 JSON 格式：
{
  "isAgricultureRelated": true,
  "type": "识别到的具体细分类别",
  "target": "识别目标正式名称",
  "confidence": 0.95, 
  "description": "一句话核心诊断结论",
  "detailedReport": "详细的专家诊断报告（不少于200字），包含视觉特征总结、诱发原因分析、对产量的潜在影响评估",
  "suggestions": ["具体的农事操作建议1", "药剂或肥料推荐建议2", "后续监测建议3", "预防性管理建议4"],
  "relatedKnowledge": [
    {
      "title": "知识库条目或建议标题",
      "type": "类型，如 '百科', '农事建议', '防治指南'",
      "summary": "简短摘要"
    }
  ]
}`;

      let finalReportResponse;
      
      // Prefer Zhipu for final report generation
      if (activeZhipuKey && !isZhipuMissing) {
        finalReportResponse = await fetchWithRetry('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeZhipuKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "glm-4-flash",
            messages: [
              { role: "system", content: `${expertPersona}。请根据提供的识别信息，生成一份极具专业深度、针对性强的诊断报告。请务必返回 JSON 格式，且所有内容必须全部使用中文，绝对禁止使用任何英文单词或字母（包括专有名词，请翻译为中文）。` },
              { role: "user", content: reportPrompt }
            ],
            response_format: { type: "json_object" }
          })
        });
      } else if (activeQwenKey && !isQwenMissing) {
        // Fallback to Qwen
        finalReportResponse = await fetchWithRetry('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeQwenKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "qwen-max",
            messages: [
              { role: "system", content: `${expertPersona}。请根据提供的识别信息，生成一份极具专业深度、针对性强的诊断报告。请务必返回 JSON 格式，且所有内容必须全部使用中文，绝对禁止使用任何英文单词或字母（包括专有名词，请翻译为中文）。` },
              { role: "user", content: reportPrompt }
            ]
          })
        });
      } else {
        throw new Error("未配置有效的 AI 引擎密钥，无法生成深度诊断报告。");
      }

      if (!finalReportResponse || !finalReportResponse.choices || !finalReportResponse.choices[0] || !finalReportResponse.choices[0].message) {
        throw new Error("AI 诊断引擎响应异常，请稍后重试。");
      }
      resultText = finalReportResponse.choices[0].message.content.trim();
      
      // More robust JSON extraction
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultText = jsonMatch[0];
      }
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(resultText);
      } catch (parseErr) {
        console.error('[AI Recognition] JSON parse error:', parseErr, 'Original text:', resultText);
        parsedResult = {
          isAgricultureRelated: true,
          type: type === 'pest' ? '病虫害' : type === 'species' ? '作物识别' : '长势分析',
          target: '诊断报告生成中',
          confidence: 0.8,
          description: '诊断结果解析中，请稍后查看详细报告。',
          detailedReport: resultText,
          suggestions: ['请尝试重新识别以获得更准确的格式'],
          relatedKnowledge: []
        };
      }

      // Add metadata
      parsedResult.isCollaborative = true;
      parsedResult.qwenSummary = recognitionSummary;
      parsedResult.zhipuVisionDetail = zhipuVisionResult;
      parsedResult.timestamp = new Date().toISOString();

      // Save to cache
      aiCache.set(cacheKey, { data: parsedResult, timestamp: Date.now() });
      
      // Save to history
      recognitionHistory.unshift({
        id: Date.now().toString(),
        username,
        type,
        plotId,
        result: parsedResult,
        timestamp: new Date().toISOString()
      });
      if (recognitionHistory.length > 100) recognitionHistory.pop();
      saveData();

      res.json(parsedResult);

    } catch (error: any) {
      console.error('[AI Recognition] Error:', error);
      res.status(500).json({ 
        error: "识别失败", 
        message: error.message || "AI 引擎暂时无法响应，请检查网络或 API 密钥配置。" 
      });
    }
  });

  // 智谱 AI 分析接口
  app.post('/api/ai/analyze', async (req, res) => {
    const { plotId, currentData, targetCrop, userZhipuKey, username } = req.body;

    // Determine which keys to use
    let activeZhipuKey = userZhipuKey || ZHIPU_API_KEY;
    let isUsingDefault = !userZhipuKey;

    const quotaCheck = checkUserQuota(username, isUsingDefault);
    incrementUserQuota(username, isUsingDefault);

    const plot = plots[plotId];
    const growthStage = plot?.growthStage || '生长初期';

    // Cache for analysis
    const cacheKey = `analyze_${plotId}_${targetCrop || 'none'}_${JSON.stringify(currentData)}`;
    const cached = aiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`[AI Analyze] Returning cached result for plot ${plotId}`);
      return res.json(cached.data);
    }

    try {
      console.log(`[AI] Calling Zhipu AI for plot ${plotId}${targetCrop ? ` targeting ${targetCrop}` : ''}...`);
      
      const analyzePrompt = `
        你是一个专业的智慧农业专家。请根据以下农田实时监测数据与作物生长阶段，分析该地块的种植建议与精准施肥方案。
        
        当前作物: ${plot?.crop || '未知'}
        当前生长阶段: ${growthStage}
        
        监测数据:
        - 环境温度: ${currentData.temperature}℃
        - 环境湿度: ${currentData.humidity}%
        - 光照强度: ${currentData.light}Lux
        - 土壤温度: ${currentData.soilTemp}℃
        - 土壤湿度: ${currentData.soilMoisture}%
        - 土壤pH值: ${currentData.pH}
        - 氮(N): ${currentData.nitrogen}mg/kg
        - 磷(P): ${currentData.phosphorus}mg/kg
        - 钾(K): ${currentData.potassium}mg/kg
        
        ${targetCrop ? `用户特别想了解种植【${targetCrop}】的经济效益和匹配度。
        【极其重要】：
        1. 首先，你必须严格判断【${targetCrop}】是否为真实的农作物或经济植物。如果它根本不是植物（例如：石头、汽车、动物、手机、水等），你必须将 "suitability" 设置为 0，"expectedProfit" 设置为 0，并在 "reason" 中明确指出“【${targetCrop}】不是农作物，无法种植”。
        2. 如果它是农作物，请根据上述监测数据（特别是温度、pH值和氮磷钾）进行【真实、客观】的匹配度评估。不要总是给出 85 以上的高分！如果当前土壤条件完全不适合该作物（例如喜酸作物遇到高pH，或喜温作物遇到低温），请给出低分（如 20-50），并在 "reason" 中详细说明不适合的原因。` : '请推荐最适合种植的作物。'}

        请给出：
        1. ${targetCrop ? `针对【${targetCrop}】的深度分析结果` : '推荐作物名称（必须是具体的作物名称，如"小麦"、"玉米"，绝不能是数字或序号）'}
        2. 土壤与环境匹配度 (0-100，数字格式，必须真实客观，不适合就给低分)
        3. 预估亩产年收益 (人民币，数字格式)
        4. ${targetCrop ? '该作物的详细经济效益分析、土壤匹配原因及种植建议' : '推荐理由'}
        5. 针对当前作物和生长阶段的【施肥建议】：
           - 施肥量 (具体公斤/亩)
           - 施肥时机 (具体时间段或天气条件)
           - 详细描述 (为什么这么施肥)
        6. 2个备选作物及其匹配度和预估收益
        
        请务必以 JSON 格式返回，且所有内容必须全部使用中文，绝对禁止使用任何英文单词或字母，格式如下：
        {
          "recommendedCrop": "具体的作物名称字符串",
          "suitability": 数字,
          "expectedProfit": 数字,
          "reason": "字符串",
          "fertilizationAdvice": {
            "amount": "具体施肥量字符串，如 '尿素 15kg/亩'",
            "timing": "具体施肥时机字符串，如 '下周一早晨或雨前'",
            "description": "详细建议描述"
          },
          "alternatives": [
            {"crop": "字符串", "suitability": 数字, "expectedProfit": 数字}
          ]
        }
      `;

      let resultText = "";

      const response = await fetchWithRetry('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeZhipuKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            { role: "system", content: "你是一个资深农业专家，请基于土壤和环境数据提供专业的种植建议。请务必返回 JSON 格式，且所有内容必须全部使用中文，绝对禁止使用任何英文单词或字母（包括专有名词，请翻译为中文）。" },
            { role: "user", content: analyzePrompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      const zhipuData = response;
      resultText = zhipuData.choices[0].message.content.trim();
      
      if (resultText.startsWith('```json')) {
        resultText = resultText.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (resultText.startsWith('```')) {
        resultText = resultText.replace(/```\n?/, '').replace(/```$/, '');
      }
      
      const result = JSON.parse(resultText);
      
      // Cache the result
      aiCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      res.json(result);

    } catch (error: any) {
      console.error('[AI Analyze] Error:', error);
      res.status(500).json({ error: error.message || 'AI 分析失败，请检查 API 密钥或网络连接。' });
    }
  });

  app.post('/api/monitoring/calibrate', (req, res) => {
    const { plotId, sensorKey, newValue, reason } = req.body;
    const plot = plots[plotId];
    if (!plot) return res.status(404).json({ error: 'Plot not found' });

    if (!(sensorKey in plot.sensorData)) {
      return res.status(400).json({ error: 'Invalid sensor key' });
    }

    console.log(`[Calibration] Plot ${plotId}, Sensor ${sensorKey}: New baseline ${newValue}. Reason: ${reason}`);
    plot.sensorData[sensorKey] = Number(newValue);
    addLog('system', `${plot.name} ${sensorKey} 传感器校准完成`, 'success');
    res.json({ success: true, message: '校准成功' });
  });

  app.get('/api/knowledge/recommendations', (req, res) => {
    const { category, page = 1, limit = 6, seed, ids } = req.query;
    let filtered = knowledgePool;

    if (ids) {
      const idList = String(ids).split(',');
      filtered = knowledgePool.filter(item => idList.includes(item.id));
      return res.json(filtered);
    }

    if (category && category !== '全部') {
      filtered = knowledgePool.filter(item => item.cat === category);
    }
    
    const total = filtered.length;
    const pageSize = Number(limit);
    const currentPage = Number(page);
    
    let start = (currentPage - 1) * pageSize;
    
    // 如果提供了 seed 且是第一页（通常是“换一批”或初始加载），使用 seed 进行随机偏移
    if (seed !== undefined && currentPage === 1) {
      const randomOffset = (Number(seed) * 13) % Math.max(1, total - pageSize);
      start = randomOffset;
    }
    
    res.json(filtered.slice(start, start + pageSize));
  });

  app.get('/api/knowledge/search', async (req, res) => {
    const { q, userZhipuKey, username } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter' });
    
    // Determine which keys to use
    let activeZhipuKey = (userZhipuKey as string) || ZHIPU_API_KEY;
    let isUsingDefault = !userZhipuKey;

    const quotaCheck = checkUserQuota(username as string, isUsingDefault);
    incrementUserQuota(username as string, isUsingDefault);

    const query = String(q).trim();

    const localResults = knowledgePool.filter(item => 
      item.title.includes(query) || item.summary.includes(query) || item.content.includes(query)
    );

    try {
      const prompt = `你是一个资深农业专家。请根据用户的查询 "${query}"，生成一份专业、详实的 AI 深度解析手册。
      要求：
      1. 内容详实，总字数在 800-1000 字左右。
      2. 结构清晰，包含但不限于：背景介绍、核心原理解析、实施步骤或方法、风险评估与注意事项等。
      3. 语言风格：学术性与实用性并重。
      
      请务必以 JSON 格式返回，包含以下字段：
      - title: 手册标题 (字符串)
      - summary: 核心摘要 (字符串，约 150 字)
      - sections: 数组，包含多个部分（4-6 个部分），每个部分包含 title (字符串) 和 items (字符串数组，每个 item 是一段详细的论述)
      - source: 数据来源 (字符串，如“AI 农业知识库综合生成”)`;

      let resultText = "";

      const data = await fetchWithRetry('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeZhipuKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            { role: "system", content: "你是一个资深农业专家，只返回 JSON 格式的深度解析手册，且所有内容必须使用中文。" },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      const zhipuData = data;
      resultText = zhipuData.choices[0].message.content;
      
      // More robust JSON extraction
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultText = jsonMatch[0];
      }
      
      let aiResult;
      try {
        aiResult = JSON.parse(resultText);
      } catch (parseErr) {
        console.error('[Knowledge Search] JSON parse error:', parseErr, 'Original text:', resultText);
        aiResult = {
          title: `${query} 的深度解析`,
          summary: "由于生成内容格式异常，无法完整展示深度解析。请尝试重新搜索或更换关键词。",
          sections: [
            {
              title: "系统提示",
              items: ["AI 引擎返回了非标准格式的数据，正在尝试重新解析，请稍后再试。"]
            }
          ],
          source: "系统提示"
        };
      }
      
      res.json({
        aiResult,
        localResults: localResults.slice(0, 10) // Return top 10 local matches
      });

    } catch (error: any) {
      console.error('[Knowledge Search] Error:', error);
      // Fallback to local results if AI fails
      res.json({
        aiResult: {
          title: `关于 "${query}" 的搜索结果`,
          summary: "AI 深度解析暂时不可用，请参考以下本地知识库匹配结果。",
          sections: [],
          source: "本地知识库"
        },
        localResults: localResults.slice(0, 10)
      });
    }
  });

  app.get('/api/news/mara', async (req, res) => {
    res.json(newsPools.mara);
  });

  app.get('/api/news/tianxing', async (req, res) => {
    res.json(newsPools.tianxing);
  });

  app.get('/api/news/gov-service', (req, res) => {
    res.json(newsPools.gov);
  });

  app.post('/api/ai/chat', async (req, res) => {
    const { message, history, userZhipuKey, username } = req.body;

    // Determine which keys to use
    let activeZhipuKey = userZhipuKey || ZHIPU_API_KEY;
    let isUsingDefault = !userZhipuKey;

    const quotaCheck = checkUserQuota(username, isUsingDefault);
    incrementUserQuota(username, isUsingDefault);

    try {
      const currentUser = username || 'admin';
      const userPlots = Object.values(plots).filter(p => p.owner === currentUser || p.owner === 'admin');
      
      let plotContext = "";
      if (userPlots.length > 0) {
        plotContext = "\n\n【当前用户地块实时数据参考】\n";
        userPlots.forEach(p => {
          plotContext += `- 地块名称：${p.name} (作物: ${p.crop}, 生长阶段: ${p.growthStage})\n`;
          if (p.sensorData) {
            plotContext += `  实时监测：温度 ${p.sensorData.temperature}℃, 湿度 ${p.sensorData.humidity}%, 光照 ${p.sensorData.light}Lux, 土壤温度 ${p.sensorData.soilTemp}℃, 土壤水分 ${p.sensorData.soilMoisture}%, pH值 ${p.sensorData.pH}, 氮 ${p.sensorData.nitrogen}mg/kg, 磷 ${p.sensorData.phosphorus}mg/kg, 钾 ${p.sensorData.potassium}mg/kg\n`;
          }
          if (p.hardwareState) {
            plotContext += `  设备状态：灌溉 ${p.hardwareState.irrigation?'开':'关'}, 通风 ${p.hardwareState.ventilation?'开':'关'}, 加热 ${p.hardwareState.heating?'开':'关'}, 补光 ${p.hardwareState.lighting?'开':'关'}, 施肥 ${p.hardwareState.fertilization?'开':'关'}\n`;
          }
        });
        plotContext += "\n请根据以上实时数据，在回答时提供更具针对性的农事建议。如果用户询问当前地块情况，请直接参考上述数据。";
      }

      const messages = [
        { 
          role: "system", 
          content: `你是一个专业的农业 AI 助手，名叫'农芯智友'，是'农芯智境'农业管理系统的核心智能引擎。
          
你的回复必须严格遵循以下原则：
1. 【极度口语化与亲切】：你的回复将被直接用于语音合成播报。请务必使用极其自然、亲切、像朋友聊天一样的口语化表达。多使用“您好呀”、“建议您”、“其实呢”、“别担心”、“对啦”等有温度的词汇。绝对不要使用生硬的学术报告语气，不要像机器人在念稿子。
2. 【专业与通俗并重】：使用准确的农业术语，但必须用大白话解释，让普通农户一听就懂。比如不要说“提升土壤孔隙度”，可以说“让土壤更透气”。
3. 【操作导向】：当用户询问如何解决问题时，给出具体、可执行的操作步骤。如果涉及系统功能，请明确引导用户去哪个模块操作（如：“您可以点一下左边的‘农田管理’...”）。
4. 【短句为主】：为了让语音播报更像真人喘气和停顿，请尽量使用短句，多用逗号，避免超长句。不要使用复杂的 Markdown 符号（如大量的加粗、嵌套列表），因为这会影响语音朗读的流畅度。
5. 【精简回答】：尽量把回答控制在100字以内，挑最核心的重点说，不要长篇大论。
6. 【语言要求】：请务必使用中文回答。${plotContext}` 
        },
        ...history,
        { role: "user", content: message }
      ];

      let resultText = "";

      const data = await fetchWithRetry('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeZhipuKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: messages
        })
      });
      resultText = data.choices[0].message.content;

      res.json({ text: resultText });
    } catch (error: any) {
      console.error('[AI Chat] Error:', error);
      res.status(500).json({ error: error.message || 'AI 助手暂时不可用，请稍后再试。' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword, token: 'mock-token' });
    } else {
      res.status(401).json({ success: false, message: '账号或密码错误' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    const { username, password, role } = req.body;
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    const newUser = { 
      username, 
      password, 
      role: role || '普通用户',
      name: username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: '这位农友很懒，还没有填写简介。',
      phone: '',
      email: '',
      location: '',
      joinDate: new Date().toISOString().split('T')[0],
      securityLogs: [{ event: '账号注册', time: new Date().toISOString(), ip: '127.0.0.1' }],
      favorites: [],
      twoFactorEnabled: false,
      plan: 'free',
      aiRecognitionCount: 0
    };
    users.push(newUser); saveData();
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ success: true, user: userWithoutPassword, token: 'mock-token' });
  });

  // --- 2FA 验证接口 ---
  app.post('/api/user/security/2fa/enable', (req, res) => {
    const { username } = req.body;
    const user = users.find(u => u.username === username);
    if (user) {
      (user as any).twoFactorEnabled = true;
      (user as any).securityLogs.unshift({
        event: '开启双重身份验证',
        time: new Date().toISOString(),
        ip: req.ip || '127.0.0.1'
      });
      res.json({ success: true, message: '双重身份验证已开启' });
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  app.post('/api/user/security/2fa/disable', (req, res) => {
    const { username } = req.body;
    const user = users.find(u => u.username === username);
    if (user) {
      (user as any).twoFactorEnabled = false;
      (user as any).securityLogs.unshift({
        event: '关闭双重身份验证',
        time: new Date().toISOString(),
        ip: req.ip || '127.0.0.1'
      });
      res.json({ success: true, message: '双重身份验证已关闭' });
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });
  app.get('/api/user/profile', (req, res) => {
    // In a real app, we'd get the user from the token
    const username = req.query.username as string || 'admin';
    const user = users.find(u => u.username === username);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  app.post('/api/user/avatar', (req, res) => {
    const { username, avatar } = req.body;
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex > -1) {
      users[userIndex].avatar = avatar; saveData();
      users[userIndex].securityLogs.unshift({ event: '更新头像', time: new Date().toISOString(), ip: '127.0.0.1' });
      res.json({ success: true, avatarUrl: avatar });
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  app.post('/api/user/profile', (req, res) => {
    const { username, ...profileData } = req.body;
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex > -1) {
      users[userIndex] = { ...users[userIndex], ...profileData }; saveData();
      const { password, ...userWithoutPassword } = users[userIndex];
      res.json(userWithoutPassword);
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  app.post('/api/user/security/password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex > -1) {
      if (users[userIndex].password === oldPassword) {
        users[userIndex].password = newPassword; saveData();
        users[userIndex].securityLogs.unshift({ event: '修改密码', time: new Date().toISOString(), ip: '127.0.0.1' });
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, message: '原密码错误' });
      }
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  // --- 收藏夹接口 ---
  app.get('/api/user/favorites', (req, res) => {
    const username = req.query.username as string || 'admin';
    const user = users.find(u => u.username === username);
    if (user) {
      const favoriteArticles = knowledgePool.filter(a => user.favorites.includes(a.id));
      res.json(favoriteArticles);
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  app.post('/api/user/favorites', (req, res) => {
    const { username = 'admin', articleId } = req.body;
    const user = users.find(u => u.username === username);
    if (user) {
      if (!user.favorites.includes(articleId)) {
        user.favorites.push(articleId); saveData();
      }
      res.json({ success: true, favorites: user.favorites });
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  app.delete('/api/user/favorites/:id', (req, res) => {
    const { id } = req.params;
    const username = req.query.username as string || 'admin';
    const user = users.find(u => u.username === username);
    if (user) {
      user.favorites = user.favorites.filter(fid => fid !== id); saveData();
      res.json({ success: true, favorites: user.favorites });
    } else {
      res.status(404).json({ error: '用户未找到' });
    }
  });

  // --- 用户反馈接口 ---
  app.post('/api/feedback', (req, res) => {
    const { type, description, screenshot, contact, timestamp } = req.body;
    
    if (!type || !description) {
      return res.status(400).json({ success: false, message: '反馈类型和描述不能为空' });
    }

    const newFeedback = {
      id: `fb_${Date.now()}`,
      type,
      description,
      screenshot, // base64 string
      contact,
      timestamp: timestamp || new Date().toISOString(),
      status: 'pending'
    };

    feedbackList.push(newFeedback); saveData();
    console.log(`[Feedback] New feedback received: ${type} - ${description.substring(0, 20)}...`);
    
    res.json({ success: true, message: '反馈提交成功，感谢您的支持！', feedbackId: newFeedback.id });
  });

  // --- AI 识别历史记录 ---

  app.get('/api/recognition/history', (req, res) => {
    res.json(recognitionHistory);
  });

  app.post('/api/recognition/history', (req, res) => {
    const historyItem = {
      id: `rec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...req.body
    };
    recognitionHistory.unshift(historyItem); saveData();
    // 限制历史记录数量，例如保留最近 50 条
    if (recognitionHistory.length > 50) {
      recognitionHistory.pop();
    }
    res.json(historyItem);
  });

  // --- Catch-all for API routes ---
  // This MUST be after all valid API routes and before the SPA/Static handler
  app.use('/api', (req, res) => {
    res.status(404).json({ 
      error: 'Not Found', 
      message: `API endpoint ${req.originalUrl} not found`,
      path: req.path
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const viteModule = 'vite';
    import(viteModule).then(async ({ createServer: createViteServer }) => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const staticPath = _dirname.includes('dist') ? _dirname : distPath;
    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // Only listen if executed directly
  if (process.argv[1] === _filename || process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.cjs')) {
    const server = app.listen(PORT as number, '0.0.0.0', () => {
      const actualPort = (server.address() as any).port;
      console.log(`Server running at http://localhost:${actualPort}`);
      if (process.send) {
        process.send({ type: 'server-ready', port: actualPort });
      }
    });
  }
  
  return app;
}

startServer();

// Export for both ESM and CJS environments
export default app;
// @ts-ignore
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { app };
}
