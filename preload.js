const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Actions
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Chat Actions
  sendChatRequest: (config) => ipcRenderer.send('chat-request', config),
  abortChatRequest: () => ipcRenderer.send('chat-abort'),

  // Event Listeners
  onChatChunk: (callback) => {
    ipcRenderer.on('chat-chunk', (event, text) => callback(text));
  },
  onChatError: (callback) => {
    ipcRenderer.on('chat-error', (event, error) => callback(error));
  },
  onChatEnd: (callback) => {
    ipcRenderer.on('chat-end', (event, data) => callback(data));
  },

  // Cleanup
  removeChatListeners: () => {
    ipcRenderer.removeAllListeners('chat-chunk');
    ipcRenderer.removeAllListeners('chat-error');
    ipcRenderer.removeAllListeners('chat-end');
  },

  // API Testing Actions
  sendTestApiRequest: (config) => ipcRenderer.send('test-api-request', config),
  abortTestApiRequest: () => ipcRenderer.send('test-api-abort'),

  // API Testing Listeners
  onTestApiInit: (callback) => {
    ipcRenderer.on('test-api-init', (event, data) => callback(data));
  },
  onTestApiResponseStart: (callback) => {
    ipcRenderer.on('test-api-response-start', (event, data) => callback(data));
  },
  onTestApiChunk: (callback) => {
    ipcRenderer.on('test-api-chunk', (event, text) => callback(text));
  },
  onTestApiRawChunk: (callback) => {
    ipcRenderer.on('test-api-raw-chunk', (event, text) => callback(text));
  },
  onTestApiError: (callback) => {
    ipcRenderer.on('test-api-error', (event, error) => callback(error));
  },
  onTestApiEnd: (callback) => {
    ipcRenderer.on('test-api-end', (event, data) => callback(data));
  },
  removeTestApiListeners: () => {
    ipcRenderer.removeAllListeners('test-api-init');
    ipcRenderer.removeAllListeners('test-api-response-start');
    ipcRenderer.removeAllListeners('test-api-chunk');
    ipcRenderer.removeAllListeners('test-api-raw-chunk');
    ipcRenderer.removeAllListeners('test-api-error');
    ipcRenderer.removeAllListeners('test-api-end');
  }
});
