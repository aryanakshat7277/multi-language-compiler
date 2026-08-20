# 🚀 Multi Language Compiler & AI Intelligence Platform (CodeForge PRO v2.5)

High-performance polyglot code execution, Google Gemini 2.5 AI code mentor, AST tree parser, and real-time Code DNA similarity engine.

---

## 💻 Quickstart Guide for VS Code

### Option 1: One-Click Launch inside VS Code
1. Open this folder in **VS Code**:
   ```bash
   code .
   ```
2. Press **`F5`** (or click **Run and Debug** $\rightarrow$ **🚀 Full Stack (Backend + Frontend)**).
3. Open your browser:
   - 🌐 **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - ⚙️ **Backend API**: [http://localhost:3001](http://localhost:3001)

---

### Option 2: Terminal Launch
Run the full-stack development script:
```bash
npm run dev
```

---

## 🛠️ Project Structure

```
MULTI LANGUAGE COMPILER/
├── .vscode/                 # Pre-configured VS Code settings, tasks, and debug profiles
├── backend/                 # Node.js + Express + TypeScript + Prisma ORM + Gemini AI Provider
│   ├── src/
│   │   ├── controllers/     # Analysis, AI Review, Code Similarity & AST Controllers
│   │   ├── services/        # Gemini Provider, Lexer, Parser & AST Engine
│   │   └── routes/          # Express API Endpoints (/api/code-analysis, /api/ast/parse, etc.)
│   └── prisma/              # Prisma Schema & Database Migrations
├── frontend/                # React + Vite + TypeScript + Monaco Editor + Recharts
│   ├── src/
│   │   ├── pages/           # Code Analysis, AI Review, AST Explorer, Similarity Page
│   │   ├── components/      # Resizable Sections, IdeWindow, MetricsWaveWindow
│   │   └── services/        # API Client & Real-Time Gemini Data Hooks
└── Hackathon_Presentation.html # Interactive 4-Slide Hackathon Presentation Deck
```

---

## 📊 Core Features & Quality Metrics

1. **Polyglot Compiler Sandbox**: Sub-200ms execution for JavaScript, TypeScript, Python, C++, Java, and Go.
2. **Google Gemini 2.5 AI Pipeline**: bespokely analyzes written code for:
   - **Cyclomatic Complexity**: Measures control flow complexity. Lower is better.
   - **Maintainability Index**: Indicates overall maintainability (0-100). Higher is better.
   - **Code Duplication**: Detects repeated code blocks and statement patterns.
   - **Code Similarity**: Compares code structure/logic against platform benchmark references.
3. **AST Explorer**: Real-time Gemini-generated Abstract Syntax Tree visualization.
4. **4-Slide Hackathon Presentation**: Interactive slide deck saved directly on `D:\Hackathon_Presentation.html`.

---

## 👥 Hackathon Team Members
- **Akshat Aryan** (`240101120201`) — Team Lead & Lead System Architect
- **Arun Dev** (`240101120184`) — Polyglot Compiler Core Engineer
- **Aquib Hussain** (`240101120192`) — Security & RBAC Auth Lead
- **Warish Khan** (`240101120186`) — Frontend UI/UX & Monaco Specialist
- **Mohit** (`240101120207`) — Gemini AI Pipeline Specialist
- **Abhay** (`240101120220`) — Telemetry & Performance Engineer
