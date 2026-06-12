import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export function SettingsModal({ isOpen, onClose, profiles, activeProfileId, onSaveProfiles, onSelectProfile }) {
  const [selectedProfileId, setSelectedProfileId] = useState(activeProfileId);
  const [profileForm, setProfileForm] = useState(null);

  // --- API Testing States ---
  const [testStatus, setTestStatus] = useState('idle'); // 'idle' | 'running' | 'success' | 'error'
  const [testInitData, setTestInitData] = useState(null);
  const [testResponseData, setTestResponseData] = useState(null); // { statusCode, statusMessage, headers }
  const [testResponse, setTestResponse] = useState('');
  const [testRawResponse, setTestRawResponse] = useState('');
  const [testError, setTestError] = useState('');
  const isTestingRef = useRef(false);

  // Accordion toggles inside test logs
  const [showReqDetails, setShowReqDetails] = useState(true);
  const [showRespHeaders, setShowRespHeaders] = useState(true);

  // Initialize form when profile selection changes
  useEffect(() => {
    const activeProf = profiles.find(p => p.id === selectedProfileId) || profiles[0];
    if (activeProf) {
      setProfileForm({ 
        useStream: true,
        useMaxTokens: true,
        useTemperature: true,
        contextMode: 'all',
        contextMaxRounds: 10,
        contextMaxTokens: 2000,
        ...activeProf 
      });
    }
  }, [selectedProfileId, profiles]);

  // Bind API testing IPC listeners
  useEffect(() => {
    window.electronAPI.onTestApiInit((data) => {
      setTestInitData(data);
      setTestStatus('running');
      setTestResponse('');
      setTestRawResponse('');
      setTestError('');
      setTestResponseData(null);
    });

    window.electronAPI.onTestApiResponseStart((data) => {
      setTestResponseData(data);
    });

    window.electronAPI.onTestApiChunk((chunk) => {
      setTestResponse(prev => prev + chunk);
    });

    window.electronAPI.onTestApiRawChunk((chunk) => {
      setTestRawResponse(prev => prev + chunk);
    });

    window.electronAPI.onTestApiError((error) => {
      setTestStatus('error');
      setTestError(error);
      isTestingRef.current = false;
    });

    window.electronAPI.onTestApiEnd((data) => {
      if (isTestingRef.current) {
        setTestStatus('success');
        isTestingRef.current = false;
      }
    });

    return () => {
      window.electronAPI.removeTestApiListeners();
    };
  }, []);

  // Reset or cancel test on profile change or close
  const handleStopTest = () => {
    window.electronAPI.abortTestApiRequest();
    setTestStatus('idle');
    isTestingRef.current = false;
  };

  useEffect(() => {
    handleStopTest();
    setTestInitData(null);
    setTestResponseData(null);
    setTestResponse('');
    setTestRawResponse('');
    setTestError('');
    setTestStatus('idle');
  }, [selectedProfileId, isOpen]);

  if (!isOpen || !profileForm) return null;

  const handleInputChange = (field, val) => {
    setProfileForm(prev => {
      const updated = { ...prev, [field]: val };
      
      // Auto-update default URLs if provider changes
      if (field === 'provider') {
        if (val === 'anthropic') {
          updated.url = 'https://api.anthropic.com/v1/messages';
          if (!updated.model || updated.model.startsWith('gpt')) {
            updated.model = 'claude-3-5-sonnet-20241022';
          }
        } else {
          updated.url = 'https://api.openai.com/v1/chat/completions';
          if (!updated.model || updated.model.startsWith('claude')) {
            updated.model = 'gpt-4o';
          }
        }
      }
      return updated;
    });
  };

  const handleCreateProfile = () => {
    const newId = `profile-${Date.now()}`;
    const newProfile = {
      id: newId,
      name: `新建配置 ${profiles.length + 1}`,
      provider: 'openai',
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: '',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '你是一个得力、简明的 AI 助手。',
      useStream: true,
      useMaxTokens: true,
      useTemperature: true
    };

    const updated = [...profiles, newProfile];
    onSaveProfiles(updated, newId);
    setSelectedProfileId(newId);
  };

  const handleDeleteProfile = () => {
    if (profiles.length <= 1) {
      alert('必须保留至少一个模型配置。');
      return;
    }

    const filtered = profiles.filter(p => p.id !== selectedProfileId);
    const nextId = filtered[0].id;
    onSaveProfiles(filtered, nextId);
    setSelectedProfileId(nextId);
  };

  const handleSave = () => {
    const updated = profiles.map(p => p.id === profileForm.id ? { ...profileForm } : p);
    onSaveProfiles(updated, profileForm.id);
    onSelectProfile(profileForm.id);
    onClose();
  };

  const handleStartTest = () => {
    setTestStatus('running');
    setTestResponse('');
    setTestRawResponse('');
    setTestError('');
    setTestInitData(null);
    setTestResponseData(null);
    isTestingRef.current = true;
    window.electronAPI.sendTestApiRequest(profileForm);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">模型 API 配置管理</h2>
          <button className="modal-close-btn" onClick={() => { handleStopTest(); onClose(); }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Profile Selector */}
          <div className="form-group">
            <label>当前选择的模型配置</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                style={{ flex: 1 }}
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button 
                className="btn secondary" 
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={handleCreateProfile}
                title="新建配置"
              >
                <Plus size={16} />
              </button>
              <button 
                className="btn secondary" 
                style={{ padding: '8px 12px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={handleDeleteProfile}
                title="删除当前配置"
                disabled={profiles.length <= 1}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />

          {/* Profile Name */}
          <div className="form-group">
            <label>配置名称</label>
            <input 
              type="text" 
              value={profileForm.name} 
              onChange={(e) => handleInputChange('name', e.target.value)} 
              placeholder="例如：DeepSeek-Chat"
            />
          </div>

          {/* Provider Selection */}
          <div className="form-row">
            <div className="form-group">
              <label>接口格式 / 厂商</label>
              <select 
                value={profileForm.provider} 
                onChange={(e) => handleInputChange('provider', e.target.value)}
              >
                <option value="openai">OpenAI 兼容格式 (如 DeepSeek/Ollama)</option>
                <option value="anthropic">Anthropic (Claude) 格式</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>模型标识 (Model)</label>
              <input 
                type="text" 
                value={profileForm.model} 
                onChange={(e) => handleInputChange('model', e.target.value)} 
                placeholder={profileForm.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o'}
              />
            </div>
          </div>

          {/* API Base URL */}
          <div className="form-group">
            <label>API 接口地址 (Base URL)</label>
            <input 
              type="text" 
              value={profileForm.url} 
              onChange={(e) => handleInputChange('url', e.target.value)} 
              placeholder={profileForm.provider === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions'}
            />
          </div>

          {/* API Key */}
          <div className="form-group">
            <label>API 密钥 (API Key)</label>
            <input 
              type="password" 
              value={profileForm.apiKey} 
              onChange={(e) => handleInputChange('apiKey', e.target.value)} 
              placeholder="sk-..."
            />
          </div>

          {/* Stream Switch */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={profileForm.useStream !== false} 
                onChange={(e) => handleInputChange('useStream', e.target.checked)}
                style={{ width: 'auto', height: 'auto', margin: 0, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500' }}>开启流式传输 (Stream Response)</span>
            </label>
          </div>

          {/* Hyperparameters */}
          <div className="form-row">
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={profileForm.useTemperature !== false} 
                  onChange={(e) => handleInputChange('useTemperature', e.target.checked)}
                  style={{ width: 'auto', height: 'auto', margin: 0, cursor: 'pointer' }}
                />
                <span>随机性 (Temperature: {profileForm.useTemperature !== false ? profileForm.temperature : '未启用'})</span>
              </label>
              <div className="slider-container" style={{ opacity: profileForm.useTemperature !== false ? 1 : 0.4, pointerEvents: profileForm.useTemperature !== false ? 'auto' : 'none' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  value={profileForm.temperature ?? 0.7} 
                  disabled={profileForm.useTemperature === false}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={profileForm.useMaxTokens !== false} 
                  onChange={(e) => handleInputChange('useMaxTokens', e.target.checked)}
                  style={{ width: 'auto', height: 'auto', margin: 0, cursor: 'pointer' }}
                />
                <span>最大 Token 数 (Max Tokens)</span>
              </label>
              <input 
                type="number" 
                value={profileForm.maxTokens ?? ''} 
                disabled={profileForm.useMaxTokens === false}
                onChange={(e) => handleInputChange('maxTokens', e.target.value ? parseInt(e.target.value) : '')} 
                placeholder={profileForm.useMaxTokens !== false ? '4096' : '使用模型默认值'}
                style={{ opacity: profileForm.useMaxTokens !== false ? 1 : 0.5 }}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div className="form-group">
            <label>系统提示词 (System Prompt)</label>
            <textarea 
              rows={3}
              value={profileForm.systemPrompt} 
              onChange={(e) => handleInputChange('systemPrompt', e.target.value)} 
              placeholder="用于引导 AI 助手角色定位与回答格式的全局系统提示词..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '8px 0' }} />

          {/* Connection Test Section */}
          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>接口连接测试 (通过 Chromium 网络栈发送，自动使用系统代理及 SSL 根证书)</span>
            </label>
            <button 
              type="button" 
              className="btn" 
              style={{ 
                width: '100%', 
                backgroundColor: testStatus === 'running' ? '#ef4444' : 'rgba(99, 102, 241, 0.12)',
                border: `1px solid ${testStatus === 'running' ? '#ef4444' : 'var(--accent-color)'}`,
                color: testStatus === 'running' ? '#ffffff' : 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={testStatus === 'running' ? handleStopTest : handleStartTest}
            >
              {testStatus === 'running' ? '停止测试' : '测试 API 连接'}
            </button>

            {testStatus !== 'idle' && (
              <div style={{ 
                marginTop: '12px',
                background: '#040406', 
                border: '1px solid var(--border-light)', 
                borderRadius: '8px', 
                padding: '12px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                textAlign: 'left',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
                color: '#abb2bf',
                fontFamily: 'var(--font-code)'
              }}>
                {/* 1. Request Details Section */}
                {testInitData && (
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', color: '#61afef', fontWeight: 'bold', gap: '4px', marginBottom: '6px' }}
                      onClick={() => setShowReqDetails(!showReqDetails)}
                    >
                      {showReqDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>[1] 实际出站 HTTP 请求 (Actual Outgoing Request)</span>
                    </div>

                    {showReqDetails && (
                      <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <span style={{ color: '#56b6c2' }}>Method / URL: </span>
                          <span style={{ color: '#98c379', wordBreak: 'break-all' }}>POST {testInitData.url}</span>
                        </div>
                        <div>
                          <span style={{ color: '#56b6c2' }}>Request Headers (明文 API 密钥):</span>
                          <pre style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px', margin: '4px 0 0 0', overflowX: 'auto', fontSize: '11px', border: '1px solid rgba(255,255,255,0.04)', color: '#d19a66' }}>
                            {JSON.stringify(testInitData.headers, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span style={{ color: '#56b6c2' }}>Request Body (实际参数结构):</span>
                          <pre style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px', margin: '4px 0 0 0', overflowX: 'auto', fontSize: '11px', border: '1px solid rgba(255,255,255,0.04)', color: '#e5c07b' }}>
                            {JSON.stringify(testInitData.body, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Response Status & Headers */}
                {testResponseData ? (
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', color: '#c678dd', fontWeight: 'bold', gap: '4px', marginBottom: '6px' }}
                      onClick={() => setShowRespHeaders(!showRespHeaders)}
                    >
                      {showRespHeaders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>[2] 服务器 HTTP 握手响应 (Server HTTP Handshake)</span>
                    </div>

                    {showRespHeaders && (
                      <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                          <span style={{ color: '#56b6c2' }}>Status: </span>
                          <span style={{ 
                            color: testResponseData.statusCode >= 200 && testResponseData.statusCode < 300 ? '#98c379' : '#e06c75',
                            fontWeight: 'bold' 
                          }}>
                            {testResponseData.statusCode} {testResponseData.statusMessage}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#56b6c2' }}>Response Headers:</span>
                          <pre style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px', margin: '4px 0 0 0', overflowX: 'auto', fontSize: '11px', border: '1px solid rgba(255,255,255,0.04)', color: '#abb2bf' }}>
                            {JSON.stringify(testResponseData.headers, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  testStatus === 'running' && (
                    <div style={{ color: '#e5c07b', fontStyle: 'italic', paddingLeft: '18px' }}>
                      &gt; 正在等待服务器 HTTP 握手响应...
                    </div>
                  )
                )}

                {/* 3. Raw Response Body (SSE Stream) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ color: '#e5c07b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{profileForm.useStream !== false ? '[3] 原始服务器数据流 (Raw SSE Stream Chunks):' : '[3] 原始服务器响应体 (Raw HTTP Response Body):'}</span>
                    {testStatus === 'running' && <span className="streaming-cursor" style={{ width: '5px', height: '12px', margin: 0, backgroundColor: '#e5c07b' }} />}
                    {testStatus === 'success' && <span style={{ color: '#98c379', marginLeft: 'auto', fontSize: '11px' }}>● 测试成功结束</span>}
                    {testStatus === 'error' && <span style={{ color: '#e06c75', marginLeft: 'auto', fontSize: '11px' }}>● 测试失败</span>}
                  </span>

                  {testRawResponse ? (
                    <pre style={{ 
                      background: 'rgba(0, 0, 0, 0.4)', 
                      border: '1px solid rgba(255,255,255,0.08)', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      overflowX: 'auto',
                      margin: 0,
                      fontSize: '11.5px',
                      color: '#98c379',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      lineHeight: '1.4'
                    }}>
                      {testRawResponse}
                    </pre>
                  ) : (
                    testStatus === 'running' && (
                      <div style={{ color: '#5c6370', fontStyle: 'italic', paddingLeft: '18px' }}>
                        &gt; 暂未收到数据流包体 (等待 chunk 数据)...
                      </div>
                    )
                  )}
                </div>

                {/* 4. Parsed Answer */}
                {testResponse && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ color: '#98c379', fontWeight: 'bold' }}>[4] 客户端解析还原的对话内容 (Parsed Answer):</span>
                    <div style={{ 
                      background: 'rgba(152, 195, 121, 0.05)', 
                      border: '1px solid rgba(152, 195, 121, 0.2)', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: '1.5',
                      color: '#98c379',
                      fontSize: '12.5px'
                    }}>
                      {testResponse}
                    </div>
                  </div>
                )}

                {/* 5. Connection Error block */}
                {testError && (
                  <div style={{ 
                    background: 'rgba(224, 108, 117, 0.08)', 
                    border: '1px solid rgba(224, 108, 117, 0.25)', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    color: '#e06c75',
                    wordBreak: 'break-all',
                    marginTop: '6px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>[链接异常中断 (Error Log)]:</div>
                    <pre style={{ margin: 0, fontFamily: 'var(--font-code)', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                      {testError}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={() => { handleStopTest(); onClose(); }}>取消</button>
          <button className="btn primary" onClick={handleSave}>保存设置</button>
        </div>
      </div>
    </div>
  );
}
