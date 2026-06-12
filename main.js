const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');

// Disable Node SSL warning warnings globally (helpful for self-signed certificates, e.g. Ollama/LocalAI)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let mainWindow;
let activeChatRequest = null;
let activeTestRequest = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Custom borderless window for a premium, clean design
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true // standard security settings
    },
    backgroundColor: '#0a0a0f',
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Allow self-signed certificates for local APIs (e.g. Ollama, custom proxies)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

// Window Controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Helper to sanitize/mask API key in logs if requested, but we send unmasked keys in tests
function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 10) return '********';
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

// Chat Request IPC (using Chromium's net.request for proxy/SSL compatibility)
ipcMain.on('chat-request', async (event, config) => {
  const { provider, url, apiKey, model, messages, temperature, maxTokens, systemPrompt } = config;
  const isStream = config.useStream !== false;

  if (activeChatRequest) {
    try { activeChatRequest.abort(); } catch (e) {}
    activeChatRequest = null;
  }

  try {
    let targetUrl = url;
    let headers = {};
    let body = {};

    if (provider === 'anthropic') {
      targetUrl = url || 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      };

      const formattedMessages = messages.filter(m => m.role !== 'system');
      body = {
        model: model || 'claude-3-5-sonnet-20241022',
        messages: formattedMessages,
        stream: isStream
      };

      if (config.useMaxTokens !== false) {
        body.max_tokens = maxTokens ? parseInt(maxTokens) : 4096;
      }
      if (config.useTemperature !== false) {
        body.temperature = temperature !== undefined ? parseFloat(temperature) : 0.7;
      }
      if (systemPrompt) {
        body.system = systemPrompt;
      }
    } else {
      targetUrl = url || 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      };

      const formattedMessages = [...messages];
      if (systemPrompt) {
        const systemIndex = formattedMessages.findIndex(m => m.role === 'system');
        if (systemIndex > -1) {
          formattedMessages[systemIndex] = { role: 'system', content: systemPrompt };
        } else {
          formattedMessages.unshift({ role: 'system', content: systemPrompt });
        }
      }

      body = {
        model: model || 'gpt-4o',
        messages: formattedMessages,
        stream: isStream
      };

      if (config.useTemperature !== false) {
        body.temperature = temperature !== undefined ? parseFloat(temperature) : 0.7;
      }
      if (config.useMaxTokens !== false && maxTokens) {
        body.max_tokens = parseInt(maxTokens);
      }
    }

    const request = net.request({
      method: 'POST',
      url: targetUrl,
      useSessionCookies: false
    });

    activeChatRequest = request;

    Object.entries(headers).forEach(([key, val]) => {
      request.setHeader(key, val);
    });

    request.on('response', (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        let errBuffer = '';
        response.on('data', (chunk) => {
          errBuffer += chunk.toString('utf8');
        });
        response.on('end', () => {
          let msg = `HTTP ${response.statusCode}`;
          try {
            const parsed = JSON.parse(errBuffer);
            msg = parsed.error?.message || parsed.message || msg;
          } catch (e) {
            if (errBuffer) msg += `: ${errBuffer.substring(0, 200)}`;
          }
          event.reply('chat-error', msg);
        });
        return;
      }

      let sseBuffer = '';
      let fullResponseText = '';

      response.on('data', (chunk) => {
        const chunkText = chunk.toString('utf8');
        if (!isStream) {
          fullResponseText += chunkText;
          return;
        }

        sseBuffer += chunkText;
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (provider === 'anthropic') {
            if (trimmed.startsWith('data:')) {
              try {
                const data = JSON.parse(trimmed.substring(5).trim());
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  event.reply('chat-chunk', data.delta.text);
                } else if (data.type === 'error') {
                  event.reply('chat-error', data.error?.message || 'Anthropic stream error');
                }
              } catch (e) {}
            }
          } else {
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                const text = data.choices?.[0]?.delta?.content;
                if (text) {
                  event.reply('chat-chunk', text);
                }
              } catch (e) {}
            }
          }
        }
      });

      response.on('end', () => {
        if (!isStream) {
          try {
            const data = JSON.parse(fullResponseText);
            let text = '';
            if (provider === 'anthropic') {
              text = data.content?.[0]?.text || '';
            } else {
              text = data.choices?.[0]?.message?.content || '';
            }
            if (text) {
              event.reply('chat-chunk', text);
            }
          } catch (e) {
            event.reply('chat-error', `解析非流式 JSON 失败。原始响应:\n${fullResponseText}`);
            return;
          }
        } else {
          // Handle remaining buffer
          if (sseBuffer.trim()) {
            const trimmed = sseBuffer.trim();
            if (provider === 'anthropic') {
              if (trimmed.startsWith('data:')) {
                try {
                  const data = JSON.parse(trimmed.substring(5).trim());
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    event.reply('chat-chunk', data.delta.text);
                  }
                } catch (e) {}
              }
            } else {
              if (trimmed.startsWith('data:')) {
                try {
                  const data = JSON.parse(trimmed.substring(5).trim());
                  const text = data.choices?.[0]?.delta?.content;
                  if (text) event.reply('chat-chunk', text);
                } catch (e) {}
              }
            }
          }
        }
        event.reply('chat-end');
      });
    });

    request.on('error', (err) => {
      event.reply('chat-error', err.message || '网络连接或请求失败。');
    });

    request.write(JSON.stringify(body));
    request.end();

  } catch (error) {
    event.reply('chat-error', error.message || '内部请求错误。');
  }
});

ipcMain.on('chat-abort', () => {
  if (activeChatRequest) {
    try { activeChatRequest.abort(); } catch (e) {}
    activeChatRequest = null;
  }
});

// API Connection Testing IPC (using Chromium's net.request for proxy/SSL compatibility)
ipcMain.on('test-api-request', async (event, config) => {
  const { provider, url, apiKey, model, temperature, maxTokens, systemPrompt } = config;
  const isStream = config.useStream !== false;

  if (activeTestRequest) {
    try { activeTestRequest.abort(); } catch (e) {}
    activeTestRequest = null;
  }

  try {
    let targetUrl = url;
    let headers = {};
    let body = {};
    const testMessages = [{ role: 'user', content: '请回复“连接成功！”四个字' }];

    if (provider === 'anthropic') {
      targetUrl = url || 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      };

      body = {
        model: model || 'claude-3-5-sonnet-20241022',
        messages: testMessages,
        stream: isStream
      };

      if (config.useMaxTokens !== false) {
        body.max_tokens = maxTokens ? parseInt(maxTokens) : 4096;
      }
      if (config.useTemperature !== false) {
        body.temperature = temperature !== undefined ? parseFloat(temperature) : 0.7;
      }
      if (systemPrompt) {
        body.system = systemPrompt;
      }
    } else {
      targetUrl = url || 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      };

      const formattedMessages = [...testMessages];
      if (systemPrompt) {
        formattedMessages.unshift({ role: 'system', content: systemPrompt });
      }

      body = {
        model: model || 'gpt-4o',
        messages: formattedMessages,
        stream: isStream
      };

      if (config.useTemperature !== false) {
        body.temperature = temperature !== undefined ? parseFloat(temperature) : 0.7;
      }
      if (config.useMaxTokens !== false && maxTokens) {
        body.max_tokens = parseInt(maxTokens);
      }
    }

    // Inform renderer of the unmasked request info
    event.reply('test-api-init', {
      url: targetUrl,
      headers: headers,
      body: body
    });

    const request = net.request({
      method: 'POST',
      url: targetUrl,
      useSessionCookies: false
    });

    activeTestRequest = request;

    Object.entries(headers).forEach(([key, val]) => {
      request.setHeader(key, val);
    });

    request.on('response', (response) => {
      // Send the response status and headers immediately
      event.reply('test-api-response-start', {
        statusCode: response.statusCode,
        statusMessage: response.statusMessage || '',
        headers: response.headers
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        let errBuffer = '';
        response.on('data', (chunk) => {
          errBuffer += chunk.toString('utf8');
        });
        response.on('end', () => {
          // Send raw body string (usually error JSON or HTML page)
          event.reply('test-api-raw-chunk', errBuffer);
          event.reply('test-api-error', `HTTP ${response.statusCode} - ${response.statusMessage || ''}`);
        });
        return;
      }

      let sseBuffer = '';
      let fullResponseText = '';

      response.on('data', (chunk) => {
        const chunkText = chunk.toString('utf8');
        // Reply with raw chunk (stream or full body)
        event.reply('test-api-raw-chunk', chunkText);

        if (!isStream) {
          fullResponseText += chunkText;
          return;
        }

        sseBuffer += chunkText;
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (provider === 'anthropic') {
            if (trimmed.startsWith('data:')) {
              try {
                const data = JSON.parse(trimmed.substring(5).trim());
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  event.reply('test-api-chunk', data.delta.text);
                }
              } catch (e) {}
            }
          } else {
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                const text = data.choices?.[0]?.delta?.content;
                if (text) {
                  event.reply('test-api-chunk', text);
                }
              } catch (e) {}
            }
          }
        }
      });

      response.on('end', () => {
        if (!isStream) {
          try {
            const data = JSON.parse(fullResponseText);
            let text = '';
            if (provider === 'anthropic') {
              text = data.content?.[0]?.text || '';
            } else {
              text = data.choices?.[0]?.message?.content || '';
            }
            if (text) {
              event.reply('test-api-chunk', text);
            }
          } catch (e) {
            event.reply('test-api-error', `解析非流式 JSON 失败。原始响应:\n${fullResponseText}`);
            return;
          }
        } else {
          if (sseBuffer.trim()) {
            const trimmed = sseBuffer.trim();
            if (provider === 'anthropic') {
              if (trimmed.startsWith('data:')) {
                try {
                  const data = JSON.parse(trimmed.substring(5).trim());
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    event.reply('test-api-chunk', data.delta.text);
                  }
                } catch (e) {}
              }
            } else {
              if (trimmed.startsWith('data:')) {
                try {
                  const data = JSON.parse(trimmed.substring(5).trim());
                  const text = data.choices?.[0]?.delta?.content;
                  if (text) event.reply('test-api-chunk', text);
                } catch (e) {}
              }
            }
          }
        }
        event.reply('test-api-end');
      });
    });

    request.on('error', (err) => {
      // Send details to raw log
      event.reply('test-api-raw-chunk', `[连接故障详情]: \n${err.stack || err.message}`);
      event.reply('test-api-error', err.message || '网络连接或请求失败。');
    });

    request.write(JSON.stringify(body));
    request.end();

  } catch (error) {
    event.reply('test-api-raw-chunk', `[连接异常]: \n${error.stack || error.message}`);
    event.reply('test-api-error', error.message || '内部测试请求失败。');
  }
});

ipcMain.on('test-api-abort', () => {
  if (activeTestRequest) {
    try { activeTestRequest.abort(); } catch (e) {}
    activeTestRequest = null;
  }
});
