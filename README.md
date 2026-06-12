<div align="center">

# 🤖 Simple LLM Chat

**极简、现代、即开即用的跨平台桌面大语言模型（LLM）对话与调试客户端**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Latest Release](https://img.shields.io/github/v/release/tiancj0109/simple-llm-chat?logo=github&color=green)](https://github.com/tiancj0109/simple-llm-chat/releases)
[![Electron](https://img.shields.io/badge/Electron-v22.3.27-blueviolet?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-v18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v5-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078d7?logo=windows&logoColor=white)](https://www.microsoft.com/windows)

[English](./README_EN.md) | 简体中文

</div>

---

## 🌟 核心特性

*   🎨 **极致视觉美学 (Premium UI)**
    *   采用精美的**暗黑毛玻璃 (Glassmorphism) 风格**，主色调选用和谐的 HSL 渐变。
    -   流畅的淡入淡出、伸缩微动画，让桌面操作充满呼吸感，告别死板。

*   🔌 **主流大模型原生兼容 (Universal API)**
    -   **OpenAI 格式**：完美兼容 DeepSeek-Chat, Ollama 常用模型, LocalAI, OpenAI 等所有标准 API 格式。
    -   **Anthropic 格式**：支持 Claude 3.5 Sonnet / Opus 等专属协议格式。

*   🩺 **内置出站网络诊断 (HTTP Capturer & Debugger)**
    -   **请求溯源**：在测试面板直接展示实际发送的明文请求头 (Headers) 与请求体 (Body)，防止“黑盒”请求。
    -   **握手响应**：完整呈现 HTTP 状态码、状态描述，以及服务器返回的所有 Headers 信息。
    -   **流式分块**：支持原始数据流 (Raw SSE Stream Chunks) 与解析内容双重同步监控。

*   ⚡ **独立超参精细控制 (Hyperparameter Toggles)**
    -   **流式传输 (Stream)** / **随机性 (Temperature)** / **最大 Token (Max Tokens)** 均带独立物理开关。
    -   **参数过滤**：当关闭某开关时，请求体中将**完全不携带**对应字段，避免在不支持该字段的自建/微调模型上报错。

*   🧠 **智能上下文裁剪 (Context Management Mode)**
    -   `全部历史`：维持全会话记忆，适合连贯深度对话。
    -   `轮数裁剪`：自定义保留最近 $N$ 轮会话，滚动式淘汰陈旧记忆，降低 Token 隐形膨胀。
    -   `Token 估算裁剪`：内置双语 Token 估算算法（汉字按 1.0 Token，英文单词按 0.75 Token 计算），接近上限时自动从旧消息开始剔除。

---

## 🛠️ 技术栈与架构

*   **前端框架**：`React 18` + `Vite` (构建高速响应单页应用)
*   **客户端容器**：`Electron` (隔离沙箱，打包 Win7/Win10/Win11 绿色客户端)
*   **通信层**：`IPC (Inter-Process Communication)` 安全双向信道
*   **网络通信**：基于 Chromium Native 网络栈，完美支持系统代理及 SSL 自签名证书。

---

## 📖 上下文估算裁剪算法

本项目在前端内置了高效的中英双语混合估算逻辑，无需加载分词大包：

```javascript
function estimateTokens(text) {
  if (!text) return 0;
  // 1. 汉字按 1.0 Token 计算
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 2. 英文单词按 0.75 Token 计算
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(Boolean).length;
  return Math.ceil(chineseChars * 1.0 + englishWords * 0.75) + 4; // 加 4 个元数据 Token 开销
}
```

---

## 🚀 快速开始

### 1. 开发环境运行

```bash
# 克隆项目并进入文件夹
# 安装依赖
npm install

# 运行 Vite 热重载及 Electron 窗口
npm run dev
```

### 2. 生成绿色便携包 (.exe)

```bash
npm run package
```
编译生成的 `.exe` 文件将位于：`dist-electron/MinimalistLLMChat-1.0.0-Portable.exe`。

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 协议发布，可自由修改与分发。
