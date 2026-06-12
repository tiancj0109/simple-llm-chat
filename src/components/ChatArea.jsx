import React, { useRef, useEffect } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';
import { Markdown } from './Markdown';

export function ChatArea({ 
  chat, 
  activeProfile, 
  input, 
  setInput, 
  isStreaming, 
  streamingMessage, 
  onSendMessage, 
  onStopStreaming 
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (prompt) => {
    onSendMessage(prompt);
  };

  const suggestions = [
    { label: "代码调试", prompt: "编写一个简短的 Python 函数判断字符串是否为回文，并解释原理。" },
    { label: "技术对比", prompt: "解释 RESTful API 与 GraphQL 的区别，并对比其优缺点。" },
    { label: "日常写作", prompt: "写一封委婉且专业的邮件，向客户申请项目延期，并说明由于遇到不可抗力的技术难点。" },
    { label: "通俗解释", prompt: "用大白话解释什么是量子计算，就像解释给 10 岁的小孩听一样。" }
  ];

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h2 className="chat-header-title">
            {chat ? chat.title : '新会话'}
          </h2>
          <div className="chat-header-subtitle">
            当前配置: <span style={{ color: 'var(--text-primary)' }}>{activeProfile.name}</span> • 当前模型: <span style={{ color: 'var(--text-primary)' }}>{activeProfile.model}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {!chat || chat.messages.length === 0 ? (
          <div className="welcome-container">
            <div className="welcome-logo">Antigravity Chat</div>
            <p className="welcome-text">
              一款简约好用、支持 Win7 的大模型可视化桌面客户端。配置您的 API 密钥与接口，即刻开始对话。
            </p>
            
            {/* Suggestions Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '12px', 
              maxWidth: '600px', 
              width: '100%',
              marginTop: '20px'
            }}>
              {suggestions.map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSuggestionClick(s.prompt)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-light)',
                    padding: '16px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={12} style={{ color: 'var(--accent-color)' }} />
                    {s.label}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {s.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {chat.messages.map((msg, index) => (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                <div className="message-meta">
                  {msg.role === 'user' ? '你' : (msg.model || activeProfile.name)}
                </div>
                <div className="message-bubble">
                  {msg.role === 'user' ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  ) : (
                    <Markdown content={msg.content} />
                  )}
                </div>
              </div>
            ))}
            
            {/* Live Streaming Message Bubble */}
            {isStreaming && streamingMessage && (
              <div className="message-wrapper assistant">
                <div className="message-meta">
                  {activeProfile.name} (生成中...)
                </div>
                <div className="message-bubble">
                  <Markdown content={streamingMessage} />
                  <span className="streaming-cursor" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-panel">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
            className="chat-input-textarea"
            disabled={isStreaming && !streamingMessage}
          />
          <div className="input-actions">
            <div className="input-actions-left">
              {activeProfile.provider === 'anthropic' ? 'Claude 格式接口' : 'OpenAI 兼容接口'}
            </div>
            <div className="input-actions-right">
              {isStreaming ? (
                <button 
                  type="button" 
                  onClick={onStopStreaming}
                  className="action-btn stop"
                  title="停止生成"
                >
                  <Square size={15} fill="white" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="action-btn send"
                  disabled={!input.trim()}
                  title="发送消息"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
