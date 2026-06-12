import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { Minus, Square, X, Sparkles } from 'lucide-react';

const DEFAULT_PROFILES = [
  {
    id: 'openai-default',
    name: 'OpenAI 默认配置',
    provider: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '你是一个得力、简明的 AI 助手。',
    useStream: true,
    useMaxTokens: true,
    useTemperature: true,
    contextMode: 'all',
    contextMaxRounds: 10,
    contextMaxTokens: 2000
  },
  {
    id: 'anthropic-default',
    name: 'Anthropic 默认配置',
    provider: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '你是一个得力、简明的 AI 助手。',
    useStream: true,
    useMaxTokens: true,
    useTemperature: true,
    contextMode: 'all',
    contextMaxRounds: 10,
    contextMaxTokens: 2000
  }
];

// Helper to estimate token counts for Chinese and English text
function estimateTokens(text) {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(Boolean).length;
  return Math.ceil(chineseChars * 1.0 + englishWords * 0.75) + 4;
}


export default function App() {
  // --- States ---
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('antigravity_profiles');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState(() => {
    return localStorage.getItem('antigravity_active_profile_id') || profiles[0].id;
  });

  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('antigravity_chats');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return localStorage.getItem('antigravity_active_chat_id') || '';
  });

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Refs to prevent stale closures in Electron IPC events ---
  const activeChatIdRef = useRef(activeChatId);
  const activeProfileIdRef = useRef(activeProfileId);
  const profilesRef = useRef(profiles);
  const streamingMessageRef = useRef(streamingMessage);

  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { activeProfileIdRef.current = activeProfileId; }, [activeProfileId]);
  useEffect(() => { profilesRef.current = profiles; }, [profiles]);
  useEffect(() => { streamingMessageRef.current = streamingMessage; }, [streamingMessage]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
  const activeChat = chats.find(c => c.id === activeChatId);

  // --- IPC Streaming Event Setup ---
  useEffect(() => {
    window.electronAPI.onChatChunk((chunk) => {
      setStreamingMessage(prev => prev + chunk);
    });

    window.electronAPI.onChatError((error) => {
      alert(`接口请求错误: ${error}`);
      setIsStreaming(false);
      setStreamingMessage('');
    });

    window.electronAPI.onChatEnd((data) => {
      setIsStreaming(false);
      const finalContent = streamingMessageRef.current;
      const chatId = activeChatIdRef.current;
      const currentProfiles = profilesRef.current;
      const currentProfileId = activeProfileIdRef.current;
      const currentProfile = currentProfiles.find(p => p.id === currentProfileId) || currentProfiles[0];

      if (finalContent && chatId) {
        setChats(prevChats => {
          const updated = prevChats.map(c => {
            if (c.id === chatId) {
              return {
                ...c,
                messages: [
                  ...c.messages,
                  { 
                    role: 'assistant', 
                    content: finalContent, 
                    model: currentProfile.model, 
                    timestamp: Date.now() 
                  }
                ]
              };
            }
            return c;
          });
          localStorage.setItem('antigravity_chats', JSON.stringify(updated));
          return updated;
        });
      }
      setStreamingMessage('');
    });

    return () => {
      window.electronAPI.removeChatListeners();
    };
  }, []);

  // --- Local Storage Sync ---
  const saveProfiles = (updatedProfiles, newActiveId) => {
    setProfiles(updatedProfiles);
    localStorage.setItem('antigravity_profiles', JSON.stringify(updatedProfiles));
    
    if (newActiveId) {
      setActiveProfileId(newActiveId);
      localStorage.setItem('antigravity_active_profile_id', newActiveId);
    }
  };

  const handleSelectProfile = (id) => {
    setActiveProfileId(id);
    localStorage.setItem('antigravity_active_profile_id', id);
  };

  // --- Chat Actions ---
  const handleSelectChat = (id) => {
    if (isStreaming) return;
    setActiveChatId(id);
    localStorage.setItem('antigravity_active_chat_id', id);
  };

  const handleCreateChat = () => {
    if (isStreaming) return;
    const newId = `chat-${Date.now()}`;
    const newChat = {
      id: newId,
      title: `新会话 ${chats.length + 1}`,
      messages: [],
      timestamp: Date.now()
    };
    
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    localStorage.setItem('antigravity_chats', JSON.stringify(updatedChats));
    
    setActiveChatId(newId);
    localStorage.setItem('antigravity_active_chat_id', newId);
  };

  const handleDeleteChat = (id) => {
    if (isStreaming && activeChatId === id) return;
    const updatedChats = chats.filter(c => c.id !== id);
    setChats(updatedChats);
    localStorage.setItem('antigravity_chats', JSON.stringify(updatedChats));

    if (activeChatId === id) {
      const nextActiveId = updatedChats.length > 0 ? updatedChats[0].id : '';
      setActiveChatId(nextActiveId);
      localStorage.setItem('antigravity_active_chat_id', nextActiveId);
    }
  };

  const handleRenameChat = (id, newTitle) => {
    const updatedChats = chats.map(c => c.id === id ? { ...c, title: newTitle } : c);
    setChats(updatedChats);
    localStorage.setItem('antigravity_chats', JSON.stringify(updatedChats));
  };

  const handleSendMessage = (content) => {
    if (!content.trim() || isStreaming) return;

    let currentChatId = activeChatId;

    // Create a new chat automatically if none is selected
    if (!currentChatId) {
      currentChatId = `chat-${Date.now()}`;
      const firstTitle = content.length > 20 ? content.substring(0, 20) + '...' : content;
      const newChat = {
        id: currentChatId,
        title: firstTitle,
        messages: [],
        timestamp: Date.now()
      };
      
      const updatedChats = [newChat, ...chats];
      setChats(updatedChats);
      localStorage.setItem('antigravity_chats', JSON.stringify(updatedChats));
      
      setActiveChatId(currentChatId);
      localStorage.setItem('antigravity_active_chat_id', currentChatId);
    }

    // Append user message
    const userMsg = { role: 'user', content, timestamp: Date.now() };
    let chatToUpdate = chats.find(c => c.id === currentChatId);
    
    // Fallback if chat list state hasn't updated synchronously
    const messagesHistory = chatToUpdate ? [...chatToUpdate.messages, userMsg] : [userMsg];

    setChats(prevChats => {
      const updated = prevChats.map(c => {
        if (c.id === currentChatId) {
          // If first message, auto-rename based on prompt
          const isFirstMsg = c.messages.length === 0;
          const title = isFirstMsg 
            ? (content.length > 24 ? content.substring(0, 24) + '...' : content) 
            : c.title;

          return { ...c, title, messages: [...c.messages, userMsg] };
        }
        return c;
      });
      localStorage.setItem('antigravity_chats', JSON.stringify(updated));
      return updated;
    });

    // Start streaming
    setIsStreaming(true);
    setStreamingMessage('');

    // Prune history based on selected context management mode
    let prunedHistory = [...messagesHistory];
    const mode = activeProfile.contextMode || 'all';

    if (mode === 'rounds') {
      const maxRounds = activeProfile.contextMaxRounds ?? 10;
      const keepCount = maxRounds * 2; // 1 round is a user prompt and model response
      if (prunedHistory.length > keepCount) {
        prunedHistory = prunedHistory.slice(-keepCount);
      }
    } else if (mode === 'tokens') {
      const maxTokensLimit = activeProfile.contextMaxTokens ?? 2000;
      let accTokens = 0;
      const keepIndices = [];
      
      for (let i = prunedHistory.length - 1; i >= 0; i--) {
        const msg = prunedHistory[i];
        const msgTokens = estimateTokens(msg.content);
        if (accTokens + msgTokens > maxTokensLimit) {
          break;
        }
        accTokens += msgTokens;
        keepIndices.unshift(i);
      }

      if (keepIndices.length > 0) {
        prunedHistory = prunedHistory.slice(keepIndices[0]);
      } else {
        prunedHistory = [prunedHistory[prunedHistory.length - 1]];
      }
    }

    // Trigger IPC Request
    window.electronAPI.sendChatRequest({
      provider: activeProfile.provider,
      url: activeProfile.url,
      apiKey: activeProfile.apiKey,
      model: activeProfile.model,
      temperature: activeProfile.temperature,
      maxTokens: activeProfile.maxTokens,
      systemPrompt: activeProfile.systemPrompt,
      useStream: activeProfile.useStream !== false,
      useTemperature: activeProfile.useTemperature !== false,
      useMaxTokens: activeProfile.useMaxTokens !== false,
      messages: prunedHistory
    });
  };

  const handleStopStreaming = () => {
    window.electronAPI.abortChatRequest();
    setIsStreaming(false);
    
    // Save whatever chunk got streamed before aborting
    const finalContent = streamingMessageRef.current;
    const chatId = activeChatIdRef.current;

    if (finalContent && chatId) {
      setChats(prevChats => {
        const updated = prevChats.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: [
                ...c.messages,
                { 
                  role: 'assistant', 
                  content: finalContent + ' [生成已中断]', 
                  model: activeProfile.model, 
                  timestamp: Date.now() 
                }
              ]
            };
          }
          return c;
        });
        localStorage.setItem('antigravity_chats', JSON.stringify(updated));
        return updated;
      });
    }
    setStreamingMessage('');
  };

  // --- Native Titlebar Controls ---
  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = () => window.electronAPI.maximize();
  const handleClose = () => window.electronAPI.close();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Custom Titlebar */}
      <div className="titlebar">
        <div className="titlebar-logo">
          <Sparkles size={14} style={{ color: 'var(--accent-color)' }} />
          <span>Antigravity Chat</span>
        </div>
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize} title="最小化">
            <Minus size={13} />
          </button>
          <button className="titlebar-btn" onClick={handleMaximize} title="最大化/还原">
            <Square size={10} />
          </button>
          <button className="titlebar-btn close" onClick={handleClose} title="关闭">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="app-container">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectChat={handleSelectChat}
          onCreateChat={handleCreateChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onSelectProfile={handleSelectProfile}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <ChatArea
          chat={activeChat}
          activeProfile={activeProfile}
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          streamingMessage={streamingMessage}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSaveProfiles={saveProfiles}
          onSelectProfile={handleSelectProfile}
        />
      </div>
    </div>
  );
}
