import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;
let backendPort = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '农芯智境 - 智慧农业管理系统',
    autoHideMenuBar: true,
    frame: false, // Frameless window for custom title bar
    titleBarStyle: 'hidden',
    show: false, // Hide until ready to prevent white flash
    backgroundColor: '#F8FAFC', // Match light theme bg
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: [`--backend-port=${backendPort}`],
      backgroundThrottling: false // Keep smooth when in background
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const url = app.isPackaged ? `http://localhost:${backendPort}` : `http://localhost:${backendPort}`;
  
  function loadWithRetry(retryCount) {
    mainWindow.loadURL(url).catch((err) => {
      if (retryCount > 0) {
        console.log(`Waiting for dev server... retrying in 1s (${retryCount} attempts left)`);
        setTimeout(() => loadWithRetry(retryCount - 1), 1000);
      } else {
        console.error('Failed to load the app:', err);
      }
    });
  }

  loadWithRetry(15); // Retry for up to 15 seconds

  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  // Window controls handlers
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow.isMaximized();
  });
}

function startBackendServer() {
  return new Promise((resolve, reject) => {
    const serverScript = app.isPackaged 
      ? path.join(__dirname, 'dist', 'server.js')
      : path.join(__dirname, 'server.ts');

    const execArgv = app.isPackaged ? [] : ['--import', 'tsx'];

    serverProcess = fork(serverScript, [], {
      env: {
        ...process.env,
        PORT: '0', // Let OS assign a free port
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        USER_DATA_PATH: app.getPath('userData'),
        RESOURCES_PATH: process.resourcesPath
      },
      execArgv: execArgv,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Backend]: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error]: ${data}`);
    });

    serverProcess.on('message', (msg) => {
      if (msg && msg.type === 'server-ready') {
        backendPort = msg.port;
        console.log(`Backend server is ready on port ${backendPort}`);
        resolve();
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start backend server:', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Backend server exited with code ${code}`);
    });
  });
}

app.whenReady().then(async () => {
  try {
    await startBackendServer();
    createWindow();
  } catch (error) {
    console.error("Failed to initialize app:", error);
    app.quit();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

