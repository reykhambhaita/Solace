# Solace

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

An AI-powered code learning platform that provides intelligent code analysis, review, translation, and curated learning resources. Solace helps developers understand code deeply through multi-dimensional analysis and connects them with relevant learning materials.

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Why Solace Exists](#why-solace-exists)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Project Overview

Solace is a comprehensive code learning platform built with **Next.js 16** and **React 19** on the frontend, powered by a **Node.js/Express** backend. It leverages **Groq's Qwen-3-32B** model for intelligent code analysis and **Tree-sitter** for accurate AST parsing, providing developers with deep insights into code structure, behavior, and learning opportunities.

## Why Solace Exists

Learning to code and understanding complex codebases can be challenging, especially when:
- Code lacks documentation or context
- Multiple programming paradigms are involved
- Cross-language translation is needed
- Finding relevant learning resources is time-consuming

Solace solves these problems by providing:

- **Deep Understanding**: Multi-dimensional code analysis beyond syntax
- **Intelligent Guidance**: AI-powered reviews that identify risks and opportunities
- **Language Flexibility**: Seamless translation between 10+ programming languages
- **Curated Learning**: Smart resource discovery tailored to your code

## Features

### 🔍 **Deep Code Analysis**
- **Multi-Language Support**: JavaScript, TypeScript, Python, Java, Go, C, C++, Rust, Ruby, PHP
- **Paradigm Detection**: Automatically identifies programming paradigms (OOP, functional, procedural)
- **Complexity Analysis**: Evaluates time/space complexity, control flow, and code quality
- **Dependency Analysis**: Detects frameworks, libraries, and external interactions

### 🤖 **AI-Powered Code Review**
- **Behavioral Analysis**: Identifies side effects, determinism, and execution patterns
- **Risk Detection**: Highlights edge cases, magic values, and potential issues
- **Quality Metrics**: Testability scores, error handling assessment, mutability analysis
- **Powered by Groq**: Uses Qwen-3-32B for fast, accurate code reviews

### 🌐 **Cross-Language Translation**
- **Intelligent Translation**: Converts code between 10+ programming languages
- **Paradigm Preservation**: Maintains code structure, determinism, and execution model
- **Pattern Mapping**: Translates language-specific idioms appropriately
- **Validation**: Ensures translated code maintains original behavior

### 📚 **Smart Resource Fetching**
- **Review-Driven Queries**: Generates search queries from AI review insights
- **Multi-Source Aggregation**: Fetches from MDN, Stack Overflow, GitHub, and web
- **LLM Ranking**: Ranks resources by relevance using AI
- **Intent-Based Routing**: Routes queries to appropriate search engines

### 💡 **Interactive Code Editor**
- **Syntax Highlighting**: Powered by CodeMirror with language-specific themes
- **Real-Time Analysis**: Instant feedback as you type
- **Tree-Sitter Integration**: Accurate AST-based code parsing
- **Dark/Light Mode**: Seamless theme switching

## Tech Stack

### Frontend

<div>

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)

</div>

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Code Editor**: CodeMirror 6
- **Parser**: Tree-sitter (WASM)
- **Animations**: Framer Motion
- **State**: Zustand
- **Storage**: Dexie (IndexedDB)

### Backend

<div>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)

</div>

- **Runtime**: Node.js
- **Framework**: Express 5
- **AI Models**: Groq (Qwen-3-32B)
- **Search APIs**: Tavily, MDN, Stack Overflow, GitHub

## Architecture

### Frontend (Next.js + React)
```
solace/
├── app/                    # Next.js app router
├── components/             # React components
│   ├── code-editor.tsx    # Main code editor with analysis
│   ├── CodeReviewer.tsx   # AI code review interface
│   ├── ResourceFetcher.tsx # Learning resource fetcher
│   ├── TranslationViewer.tsx # Code translation UI
│   └── CodeContextViewer.tsx # Code context visualization
├── lib/                    # Core analysis libraries
│   ├── analyzer/          # Code analysis engines
│   │   ├── context-detector.ts
│   │   ├── paradigm-detector.ts
│   │   ├── library-analyzer.ts
│   │   └── semantic-ir.ts
│   ├── translation/       # Cross-language translation
│   └── tree-sitter/       # AST parsing
└── public/                # Static assets
```

### Backend (Express + Node.js)
```
solace-backend/
├── server.js              # Main Express server
└── routes/
    ├── resources.js       # Resource fetching & query generation
    └── resource-pipeline.js # Resource ranking & pruning
```

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- API Keys:
  - **Groq API Key** (for AI review & ranking) - [Get it here](https://console.groq.com)
  - **Tavily API Key** (for web search) - [Get it here](https://tavily.com)
  - **GitHub Token** (optional, for GitHub search) - [Generate here](https://github.com/settings/tokens)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/solace.git
   cd solace
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd solace-backend
   npm install
   cd ..
   ```

4. **Configure environment variables**

   Create `.env.local` in the root directory:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```

   Create `.env` in `solace-backend/`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   TAVILY_API_KEY=your_tavily_api_key_here
   GITHUB_TOKEN=your_github_token_here
   PORT=3001
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd solace-backend
   npm start
   ```

2. **Start the frontend (in a new terminal)**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Write Code
Use the integrated code editor to write or paste code in any supported language.

### 2. Analyze Code
The system automatically:
- Detects the programming language
- Analyzes code structure and paradigm
- Identifies libraries and dependencies
- Evaluates complexity and quality

### 3. Get AI Review
Click "Review Code" to receive:
- Detailed complexity analysis
- Purpose and behavioral assessment
- Risk and edge case identification
- Quality improvement suggestions

### 4. Fetch Learning Resources
Click "Find Resources" to get:
- Curated tutorials and documentation
- Stack Overflow solutions
- GitHub repositories
- Video tutorials

### 5. Translate Code
Select a target language to translate your code while preserving:
- Functionality and behavior
- Code structure
- Idiomatic patterns

## API Documentation

### Backend Endpoints

#### `POST /api/review`
Performs AI-powered code review.

**Request:**
```json
{
  "reviewIR": { /* semantic IR */ },
  "codeContext": { /* analysis context */ },
  "fileContents": "source code string"
}
```

**Response:**
```json
{
  "success": true,
  "review": {
    "complexity": "O(n) time, O(1) space...",
    "purpose": "Code description...",
    "behavioral": "Behavioral analysis...",
    "risks": "Identified risks...",
    "edgeCases": "Edge cases...",
    "summary": "Overall assessment..."
  },
  "metadata": {
    "model": "qwen-3-32b",
    "tokensUsed": 1234
  }
}
```

#### `POST /api/resources`
Fetches curated learning resources.

**Request:**
```json
{
  "codeContext": { /* analysis context */ },
  "reviewResponse": { /* AI review */ },
  "sourceCode": "source code string",
  "userIntent": "optional learning goal"
}
```

**Response:**
```json
{
  "success": true,
  "resources": [
    {
      "type": "documentation",
      "title": "Resource title",
      "url": "https://...",
      "description": "Resource description",
      "relevanceScore": 0.95
    }
  ],
  "metadata": {
    "learningGoal": "Generated learning goal",
    "totalQueries": 15,
    "queries": [...]
  }
}
```

#### `POST /api/translate`
Translates code between languages.

**Request:**
```json
{
  "sourceCode": "source code string",
  "sourceLanguage": "javascript",
  "targetLanguage": "python",
  "reviewIR": { /* semantic IR */ }
}
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Open a Pull Request

Please make sure to update tests as appropriate and adhere to the existing coding style.

## Acknowledgments

- **Groq** for fast LLM inference with Qwen-3-32B
- **Tree-sitter** for robust code parsing
- **CodeMirror** for the excellent editor
- **Tavily** for intelligent web search

---

<div align="center">

**Built with ❤️ for developers in training**

[Report Bug](https://github.com/yourusername/solace/issues) • [Request Feature](https://github.com/yourusername/solace/issues)

</div>