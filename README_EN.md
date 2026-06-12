<div align="center">

# 🤖 Simple LLM Chat

**A minimalist, modern, and cross-platform desktop LLM client for seamless chatting and API diagnostics.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Latest Release](https://img.shields.io/github/v/release/tiancj0109/simple-llm-chat?logo=github&color=green)](https://github.com/tiancj0109/simple-llm-chat/releases)
[![Electron](https://img.shields.io/badge/Electron-v22.3.27-blueviolet?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-v18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v5-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078d7?logo=windows&logoColor=white)](https://www.microsoft.com/windows)

简体中文 | [English](./README_EN.md)

</div>

---

## 🌟 Key Features

*   🎨 **Premium Glassmorphic UI**
    - Built using **glassmorphic design language** with sleek dark backgrounds and carefully chosen HSL accent colors.
    - Smooth animations and micro-transitions for a satisfying tactile desktop experience.

*   🔌 **Universal API Compatibility**
    - **OpenAI Standard**: Support for DeepSeek, OpenAI, Ollama, LocalAI, and other OpenAI-compatible endpoints.
    - **Anthropic Standard**: Support for Claude 3.5 Sonnet / Opus messages schema.

*   🩺 **Real-time Connection Diagnostics**
    - **Outgoing Inspector**: Inspect the exact plaintext Request Headers and Request Body before they leave your client.
    - **Handshake Monitor**: View HTTP response status codes and all headers returned by the LLM server.
    - **SSE Stream Logger**: Dual pane layout showing both the raw Server-Sent Event (SSE) packets and parsed markdown responses side-by-side.

*   ⚡ **Granular Parameter Control & Toggles**
    - Independent switches for **Stream**, **Temperature**, and **Max Tokens**.
    - When turned off, the corresponding key is **completely excluded** from the JSON payload, avoiding request rejection from custom fine-tuned endpoints.

*   🧠 **Smart Context History Truncation**
    - `All History`: Keep full memory context for long coherent dialogues.
    - `Message Rounds`: Keep the most recent $N$ rounds of conversations, automatically discarding older blocks to save on API costs.
    - `Token Budget Estimation`: Built-in mixed language tokenizer estimator (1.0 Token per Chinese char, 0.75 Token per English word). Automatically prunes older history to stay within budget constraints.

---

## 🛠️ Stack & Architecture

- **Frontend Core**: `React 18` + `Vite`
- **Native Wrapper**: `Electron` (Sandboxed desktop wrapper targeting Win7/Win10/Win11)
- **Communications**: Secure `IPC` (Inter-process Communication) messaging bridge
- **Network Layer**: Native Chromium network stack supporting system proxies and custom self-signed SSL certs out-of-the-box.

---

## 🚀 Getting Started

### 1. Run in Development Mode

```bash
# Clone the repository and navigate into it
# Install dependencies
npm install

# Start Vite hot-reload server & launch the Electron shell
npm run dev
```

### 2. Build Portable Desktop App (.exe)

```bash
npm run package
```
*The portable binary will be saved in `dist-electron/MinimalistLLMChat-1.0.0-Portable.exe`.*

---

## 📄 License

This project is open-source and licensed under the [MIT License](./LICENSE).
