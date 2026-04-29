const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Configuração básica do autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  console.log('[Auto-update] Verificando se há atualizações...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[Auto-update] Atualização disponível:', info.version);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[Auto-update] Nenhuma atualização disponível no momento.');
});

autoUpdater.on('error', (err) => {
  console.error('[Auto-update] Erro na atualização:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`[Auto-update] Progresso do download: ${progressObj.percent.toFixed(2)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[Auto-update] Atualização baixada com sucesso e pronta para instalar.');
  autoUpdater.quitAndInstall();
});

const BACKUP_FILENAME = 'backup_pdv.json';
const backupPath = path.join(app.getPath('userData'), BACKUP_FILENAME);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/vite.svg')
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.maximize();
  mainWindow.show();

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// IPC Handlers
ipcMain.handle('save-backup', async (event, data) => {
  try {
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-backup', async () => {
  try {
    if (fs.existsSync(backupPath)) {
      const data = fs.readFileSync(backupPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar backup:', error);
    return null;
  }
});

ipcMain.handle('export-backup', async (event, data) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Exportar Backup',
    defaultPath: path.join(app.getPath('downloads'), `backup_pdv_${new Date().toISOString().split('T')[0]}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

ipcMain.handle('import-backup', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Importar Backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const data = fs.readFileSync(filePaths[0], 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      return null;
    }
  }
  return null;
});

app.whenReady().then(() => {
  createWindow();

  // Inicia a verificação de atualizações se não estiver em desenvolvimento
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
