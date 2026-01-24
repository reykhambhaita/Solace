# Solace

**Solace** is an AI-powered code learning platform that provides intelligent code analysis, review, translation, and curated learning resources. It helps developers understand code deeply through multi-dimensional analysis and connects them with relevant learning materials.

## ✨ Features

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

## 🏗️ Architecture

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

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm
- API Keys:
  - **Groq API Key** (for AI review & ranking)
  - **Tavily API Key** (for web search)
  - **GitHub Token** (optional, for GitHub search)

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

## 📖 Usage

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

## 🔧 API Documentation

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

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Code Editor**: CodeMirror 6
- **Parser**: Tree-sitter (WASM)
- **Animations**: Framer Motion
- **State**: Zustand
- **Storage**: Dexie (IndexedDB)

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5
- **AI Models**: Groq (Qwen-3-32B)
- **Search APIs**: Tavily, MDN, Stack Overflow, GitHub

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- **Groq** for fast LLM inference
- **Tree-sitter** for robust code parsing
- **CodeMirror** for the excellent editor
- **Tavily** for intelligent web search
