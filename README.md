# Simple LLM Chat

一个极简、现代、即开即用的跨平台大语言模型（LLM）桌面聊天与调试客户端。

[English](./README_EN.md) | 简体中文

---

## ✨ 核心特性

- 🎨 **极简现代设计**：采用暗黑科技风美学，支持毛玻璃质感、微动画切换，提供极致舒适的视觉体验。
- 🤖 **多厂商 API 兼容**：原生支持 **OpenAI 兼容格式**（如 OpenAI、DeepSeek、Ollama、LocalAI）及 **Anthropic Claude 格式**。
- 🔍 **高保真网络诊断 (API 测试器)**：无需打开外部抓包工具，测试面板中可直接实时观测：
  - 发送的实际明文请求头 (Headers) 与请求体 (Body)
  - 握手响应状态码及完整的服务器响应头 (Response Headers)
  - 原始数据流分块 (Raw SSE Stream Chunks)
  - 解析后的纯文本内容
- ⚙️ **精细化超参数开关**：随机性 (Temperature)、最大 Token 数 (Max Tokens)、流式传输 (Stream) 均配备独立物理开关，支持在不兼容特定参数的自定义模型上关闭发送该参数，防止报错。
- 🧠 **智能上下文控制**：支持三种历史上下文裁剪模式，拒绝 Token 隐形膨胀：
  - **不进行限制**：发送全部历史记录。
  - **按对话轮数限制**：自定义只保留最近 $N$ 轮会话，超出部分自动裁剪。
  - **按 Token 估算限制**：内置轻量高效的中英文混合 Token 估算算法（汉字按 1.0 Token，英文单词按 0.75 Token 计算），超出设定上限自动从老消息开始截断，避免超出上下文上限。
- 🛡️ **原生网络栈支持**：基于 Electron Chromium 原生网络层发送请求，自动使用系统全局代理、SSL 根证书，极大缓解自签证书或代理拦截导致的 SSL 错误。

---

## 📸 界面预览

*支持 Win7 64位及更高版本的便携绿色单文件 `.exe`。*

---

## 🛠️ 安装与开发

本项目基于 **Vite + React + Electron** 架构构建。

### 1. 克隆与安装依赖

```bash
# 安装依赖
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

### 3. 生产环境打包 (生成 Windows 便携单文件)

```bash
npm run package
```
*编译完成后，可在 `dist-electron/` 文件夹下找到 `SimpleLLMChat-1.0.0-Portable.exe`。*

---

## 📖 上下文管理算法说明

为了保证在没有 Python 等庞大分词依赖的情况下获得精准的 Token 预测，客户端内部集成了一套混合文本估算方案：
```javascript
function estimateTokens(text) {
  if (!text) return 0;
  // 匹配所有汉字字符，按 1.0 Token/字计算
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 匹配所有非汉字单词，按 0.75 Token/单词计算
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(Boolean).length;
  return Math.ceil(chineseChars * 1.0 + englishWords * 0.75) + 4; // 包含 4 Token 的角色元数据开销
}
```

---

## 📄 开源协议

本项目采用 [MIT License](./LICENSE) 协议开源。
