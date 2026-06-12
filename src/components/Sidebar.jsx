import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Settings, Edit3, Check, X } from 'lucide-react';

export function Sidebar({ 
  chats, 
  activeChatId, 
  profiles, 
  activeProfileId, 
  onSelectChat, 
  onCreateChat, 
  onDeleteChat, 
  onRenameChat, 
  onSelectProfile, 
  onOpenSettings 
}) {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const handleStartRename = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = (chatId, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  return (
    <div className="sidebar">
      {/* New Chat Button */}
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onCreateChat}>
          <Plus size={16} />
          <span>新建对话</span>
        </button>
      </div>

      {/* Chat History List */}
      <div className="sidebar-history">
        {chats.length === 0 ? (
          <div style={{ padding: '20px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            暂无历史对话
          </div>
        ) : (
          chats.map(chat => {
            const isActive = chat.id === activeChatId;
            const isEditing = chat.id === editingChatId;

            return (
              <div 
                key={chat.id} 
                className={`history-item ${isActive ? 'active' : ''}`}
                onClick={() => !isEditing && onSelectChat(chat.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <MessageSquare size={14} style={{ flexShrink: 0, color: isActive ? 'var(--accent-color)' : 'var(--text-muted)' }} />
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(chat.id, e);
                        if (e.key === 'Escape') handleCancelRename(e);
                      }}
                      autoFocus
                      style={{ 
                        padding: '2px 6px', 
                        height: '24px', 
                        fontSize: '13px', 
                        width: '100%',
                        borderRadius: '4px'
                      }}
                    />
                  ) : (
                    <span className="history-item-title">{chat.title}</span>
                  )}
                </div>

                <div className="history-item-actions" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <button className="history-action-btn" onClick={(e) => handleSaveRename(chat.id, e)}>
                        <Check size={13} />
                      </button>
                      <button className="history-action-btn" onClick={handleCancelRename}>
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="history-action-btn" onClick={(e) => handleStartRename(chat, e)}>
                        <Edit3 size={13} />
                      </button>
                      <button 
                        className="history-action-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('确定要删除此会话吗？')) onDeleteChat(chat.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Panel */}
      <div className="sidebar-footer">
        {/* Quick Profile Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '4px' }}>
            当前模型配置
          </label>
          <select 
            value={activeProfileId}
            onChange={(e) => onSelectProfile(e.target.value)}
            style={{ 
              width: '100%', 
              backgroundColor: 'rgba(0,0,0,0.2)',
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: '8px'
            }}
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.model})</option>
            ))}
          </select>
        </div>

        {/* Settings Button */}
        <button className="sidebar-footer-btn" onClick={onOpenSettings}>
          <Settings size={15} />
          <span>配置与密钥管理</span>
        </button>
      </div>
    </div>
  );
}
