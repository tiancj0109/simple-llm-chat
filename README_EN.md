# Simple LLM Chat

A minimalist, modern, and plug-and-play cross-platform desktop LLM client for chatting and API diagnostics.

简体中文 | [English](./README_EN.md)

---

## ✨ Features

- 🎨 **Minimalist & Modern UI**: Sleek dark-mode aesthetic with frosted glass textures, fluid transitions, and premium animations.
- 🤖 **Multi-Provider API Compatibility**: Native support for **OpenAI compatible formats** (e.g. OpenAI, DeepSeek, Ollama, LocalAI) and **Anthropic Claude format**.
- 🔍 **Out-of-the-box Connection Diagnostics**: Built-in network tester allows you to capture and inspect requests in real-time:
  - Raw outgoing request headers and request body payload.
  - Server HTTP handshake status codes and response headers.
  - Raw server-sent event (SSE) stream chunks.
  - Restored parsed plaintext response text.
- ⚙️ **Granular Parameter Toggles**: Independence toggles for Temperature, Max Tokens, and Stream. Safely turn off fields when dealing with specialized custom endpoints that throw errors on unsupported parameters.
- 🧠 **Smart Context Management**: Three context compression/truncation modes to prevent invisible Token inflation:
  - **No Limit**: Sends the entire conversation history of the active session.
  - **Limit by Rounds**: Restricts history to the most recent $N$ rounds (each round contains one user message and one assistant message).
  - **Limit by Tokens**: Utilizes a built-in mixed-language Token estimator (1.0 Token per Chinese character, 0.75 Token per English word). Older history is automatically trimmed once the threshold is exceeded.
- 🛡️ **Chromium Native Network Stack**: Leverages Electron Chromium network layers, automatically respecting system-wide proxies and SSL certificates.

---

## 🛠️ Setup & Development

Built with **Vite + React + Electron**.

### 1. Installation

```bash
npm install
```

### 2. Run in Development Mode

```bash
npm run dev
```

### 3. Package to Portable Binary (Windows)

```bash
npm run package
```
*Find the compiled executable under `dist-electron/SimpleLLMChat-1.0.0-Portable.exe`.*

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
