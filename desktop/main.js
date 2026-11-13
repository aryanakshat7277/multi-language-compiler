const { app, BrowserWindow, Menu, shell, ipcMain, session } = require('electron');
const path = require('path');
const https = require('https');

const APP_URL = 'https://codeforge-pro.onrender.com';
const HEALTH_URL = 'https://codeforge-pro.onrender.com/api/compiler/health';

let mainWindow = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function checkServerHealth() {
  return new Promise((resolve) => {
    const req = https.get(HEALTH_URL, { timeout: 12000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function connectToRender(window, maxRetries = 30) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const isHealthy = await checkServerHealth();
    if (isHealthy) {
      window.loadURL(APP_URL);
      return;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  // If health ping failed repeatedly, try direct load anyway
  window.loadURL(APP_URL);
}

function createMainWindow() {
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'CodeForge Pro',
    icon: iconPath,
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      spellcheck: false
    }
  });

  // Filter User-Agent to avoid Google OAuth blocking Electron user-agents
  const customUserAgent = mainWindow.webContents.getUserAgent().replace(/Electron\/[0-9\.]+\s/, '');
  mainWindow.webContents.setUserAgent(customUserAgent);

  // Setup Menu
  setupMenu();

  // Load splash while warming up Render
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    connectToRender(mainWindow);
  });

  // Handle OAuth popups (Firebase, Google, GitHub) cleanly
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('accounts.google.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('github.com/login') ||
      url.includes('codeforge-pro.onrender.com')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 640,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    // External links open in default OS browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupMenu() {
  const template = [
    {
      label: 'CodeForge Pro',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow && mainWindow.loadURL(APP_URL)
        },
        {
          label: 'Reload Platform',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload()
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow && mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => mainWindow && mainWindow.webContents.canGoBack() && mainWindow.webContents.goBack()
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => mainWindow && mainWindow.webContents.canGoForward() && mainWindow.webContents.goForward()
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/aryanakshat7277/multi-language-compiler')
        },
        {
          label: 'Cloud Engine Telemetry',
          click: () => shell.openExternal('https://codeforge-pro.onrender.com/api/health/telemetry')
        },
        { type: 'separator' },
        {
          label: 'About CodeForge Pro',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About CodeForge Pro',
              message: 'CodeForge Pro — Desktop Edition v1.0.0',
              detail: 'Multi-Language Cloud Compiler & Evaluation Platform\nPowered by 6-Tier Multi-Key AI Engine\nTarget: https://codeforge-pro.onrender.com',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.on('retry-connection', () => {
  if (mainWindow) {
    connectToRender(mainWindow);
  }
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
