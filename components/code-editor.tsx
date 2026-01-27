"use client";

import { CodeContextViewer } from "@/components/CodeContextViewer";
import { CodeReviewViewer } from "@/components/CodeReviewer";
import ResourceFetcher from "@/components/ResourceFetcher";
import { TranslationViewer } from "@/components/TranslationViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCodeContext } from "@/lib/analyzer/context-detector";
import { LANGUAGE_CONFIG } from "@/lib/language-config";
import { getMDNDoc } from "@/lib/mdn-docs";
import { useTranslation } from "@/lib/translation/use-translation";
import { Editor } from "@monaco-editor/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  BookOpen,
  Brain,
  Code2,
  Cpu,
  Loader2,
  Moon,
  Play,
  Server,
  Sparkles,
  Sun,
  Terminal,
  Zap
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Animated background orbs component
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Primary orb - purple/violet */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full animate-orb-1 opacity-30 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, oklch(0.65 0.28 280 / 0.4) 0%, transparent 70%)',
          filter: 'blur(20px)',
          willChange: 'transform',
        }}
      />
      {/* Secondary orb - cyan */}
      <div
        className="absolute top-1/4 -right-20 w-80 h-80 rounded-full animate-orb-2 opacity-25 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, oklch(0.75 0.22 195 / 0.4) 0%, transparent 70%)',
          filter: 'blur(15px)',
          willChange: 'transform',
        }}
      />
      {/* Tertiary orb - green/teal */}
      <div
        className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full animate-orb-3 opacity-20 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, oklch(0.8 0.22 145 / 0.35) 0%, transparent 70%)',
          filter: 'blur(15px)',
          willChange: 'transform',
        }}
      />
      {/* Accent orb - warm orange */}
      <div
        className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full animate-orb-2 opacity-15 dark:opacity-10"
        style={{
          background: 'radial-gradient(circle, oklch(0.75 0.2 35 / 0.3) 0%, transparent 70%)',
          filter: 'blur(15px)',
          animationDelay: '-5s',
          willChange: 'transform',
        }}
      />
    </div>
  );
}

// Status indicator component
function StatusIndicator({ status, label }: { status: 'idle' | 'running' | 'success' | 'error', label: string }) {
  const colors = {
    idle: 'bg-muted-foreground/40',
    running: 'bg-yellow-500 animate-pulse',
    success: 'bg-emerald-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Language badge with icon
function LanguageBadge({ language, type }: { language: string, type: 'client' | 'server' | 'none' }) {
  const icons = {
    client: <Zap className="h-3 w-3" />,
    server: <Server className="h-3 w-3" />,
    none: <Code2 className="h-3 w-3" />,
  };

  const colors = {
    client: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    server: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    none: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge variant="outline" className={`gap-1.5 ${colors[type]}`}>
      {icons[type]}
      {language.toUpperCase()}
    </Badge>
  );
}

export default function CodeEditor() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [editorWidth, setEditorWidth] = useState(45);
  const [activeTab, setActiveTab] = useState<"output" | "context" | "review" | "translate" | "resources">("output");
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewMetadata, setReviewMetadata] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>("python");
  const { translate, isTranslating, result: translationResult, error: translationError, reset: resetTranslation } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use the context hook for code analysis
  const { context: codeContext, isAnalyzing, error: analysisError } = useCodeContext(code);

  // Check which languages can run client-side (in browser)
  const canRunClientSide = (lang: string): boolean => {
    return ['javascript', 'typescript'].includes(lang);
  };

  // Check which languages need backend (Docker)
  const canRunOnBackend = (lang: string): boolean => {
    return ['python', 'java', 'go', 'cpp', 'c', 'ruby', 'php', 'rust'].includes(lang);
  };

  const getExecutionType = (lang: string): 'client' | 'server' | 'none' => {
    if (canRunClientSide(lang)) return 'client';
    if (canRunOnBackend(lang)) return 'server';
    return 'none';
  };

  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Error: No code to execute");
      return;
    }

    setIsRunning(true);
    setOutput("Executing code...");
    setActiveTab("output");

    try {
      if (canRunClientSide(language)) {
        runCodeClientSide();
      } else if (canRunOnBackend(language)) {
        await runCodeOnBackend();
      } else {
        setOutput(`Error: Language "${language}" is not supported yet`);
        setIsRunning(false);
      }
    } catch (error) {
      setOutput(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsRunning(false);
    }
  };

  const runCodeClientSide = () => {
    try {
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;

      console.log = (...args) => {
        logs.push(args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      console.error = (...args) => {
        logs.push('ERROR: ' + args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      eval(code);

      console.log = originalLog;
      console.error = originalError;

      setOutput(logs.join('\n') || 'Code executed successfully (no output)');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runCodeOnBackend = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      let formattedOutput = '';

      if (result.output?.trim()) {
        formattedOutput += `Output:\n${result.output}`;
      }

      if (result.error?.trim()) {
        formattedOutput += `${formattedOutput ? '\n\n' : ''}Error:\n${result.error}`;
      }

      if (!result.output && !result.error) {
        formattedOutput = 'Code executed successfully (no output)';
      }

      formattedOutput += `\n\n---\nExecution time: ${result.executionTime}`;
      formattedOutput += `\nExit code: ${result.exitCode}`;

      setOutput(formattedOutput);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setOutput(
          `Connection Error: Cannot connect to backend server.\n\n` +
          `Make sure the backend is running:\n` +
          `  cd solace-backend\n` +
          `  npm start\n\n` +
          `Backend URL: ${BACKEND_URL}`
        );
      } else {
        setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const getCodeReview = async () => {
    if (!code.trim()) {
      setReviewError("No code to review");
      return;
    }

    if (!codeContext || !codeContext.reviewIR) {
      setReviewError("Please wait for code analysis to complete");
      return;
    }

    setIsReviewing(true);
    setReviewError(null);
    setActiveTab("review");

    try {
      const response = await fetch(`${BACKEND_URL}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewIR: codeContext.reviewIR,
          codeContext: codeContext,
          prunedTree: null,
          fileContents: code
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.review) {
        setReviewResult(result.review);
        setReviewMetadata(result.metadata);
        setReviewError(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setReviewError(
          `Connection Error: Cannot connect to backend server.\n\n` +
          `Make sure the backend is running with GROQ_API_KEY set.`
        );
      } else {
        setReviewError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsReviewing(false);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !isDragging) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newWidth >= 25 && newWidth <= 75) {
      setEditorWidth(newWidth);
    }
  }, [isDragging]);

  const handleTranslate = async () => {
    if (!code.trim() || !codeContext?.reviewIR) return;

    setActiveTab("translate");

    await translate({
      sourceCode: code,
      sourceLanguage: language as any,
      targetLanguage: targetLanguage as any,
      reviewIR: codeContext.reviewIR,
    });
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', () => setIsDragging(false));
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove]);

  const tabs = [
    { id: 'output' as const, label: 'Output', icon: Terminal, color: 'text-foreground', loading: false },
    { id: 'context' as const, label: 'Context', icon: Brain, color: 'text-blue-500', loading: isAnalyzing },
    { id: 'review' as const, label: 'AI Review', icon: Sparkles, color: 'text-cyan-500', loading: isReviewing },
    { id: 'translate' as const, label: 'Translate', icon: ArrowRightLeft, color: 'text-purple-500', loading: isTranslating },
    { id: 'resources' as const, label: 'Resources', icon: BookOpen, color: 'text-emerald-500', loading: false },
  ];

  const languages = [
    { value: 'javascript', label: 'JavaScript', group: 'Browser' },
    { value: 'typescript', label: 'TypeScript', group: 'Browser' },
    { value: 'python', label: 'Python', group: 'Server' },
    { value: 'java', label: 'Java', group: 'Server' },
    { value: 'go', label: 'Go', group: 'Server' },
    { value: 'cpp', label: 'C++', group: 'Server' },
    { value: 'c', label: 'C', group: 'Server' },
    { value: 'ruby', label: 'Ruby', group: 'Server' },
    { value: 'php', label: 'PHP', group: 'Server' },
    { value: 'rust', label: 'Rust', group: 'Server' },
  ];

  const targetLanguages = [
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
    { value: 'javascript', label: 'JavaScript' },
  ];

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading Solace...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-screen w-full flex-col bg-background overflow-hidden">
        {/* Animated background */}
        <BackgroundOrbs />

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 flex items-center justify-between border-b border-border/50 glass-subtle px-6 py-3"
        >
          {/* Left section - Logo and language selection */}
          <div className="flex items-center gap-5">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg blur-md opacity-50" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg">
                  <Cpu className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  Solace
                </h1>
                <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">
                  AI Code Analysis
                </span>
              </div>
            </motion.div>

            <div className="h-8 w-px bg-border/50" />

            {/* Language selectors */}
            <div className="flex items-center gap-3">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/50 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-heavy">
                  {['Browser', 'Server', 'Analysis Only'].map(group => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {group}
                      </div>
                      {languages.filter(l => l.group === group).map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowRightLeft className="h-4 w-4" />
              </div>

              <Select
                value={targetLanguage}
                onValueChange={(val) => {
                  setTargetLanguage(val);
                  resetTranslation();
                }}
              >
                <SelectTrigger className="w-[130px] h-9 bg-background/50 border-border/50 hover:bg-accent/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-heavy">
                  {targetLanguages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value} disabled={lang.value === language}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <LanguageBadge language={language} type={getExecutionType(language)} />
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-3">
            {/* Analysis status */}
            <div className="flex items-center gap-4 mr-2">
              <StatusIndicator
                status={isAnalyzing ? 'running' : codeContext ? 'success' : 'idle'}
                label={isAnalyzing ? 'Analyzing...' : codeContext ? 'Ready' : 'Waiting'}
              />
            </div>

            {/* Action buttons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={runCode}
                  disabled={isRunning || getExecutionType(language) === 'none'}
                  size="sm"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 btn-glow"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? 'Running' : 'Run'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Execute code {canRunClientSide(language) ? 'in browser' : 'on server'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={getCodeReview}
                  disabled={isReviewing || isAnalyzing || !codeContext}
                  size="sm"
                  className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300 btn-glow"
                >
                  {isReviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Review
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Get AI-powered code review</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleTranslate}
                  disabled={isTranslating || isAnalyzing || !codeContext || language === targetLanguage}
                  size="sm"
                  className="gap-2 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 btn-glow"
                >
                  {isTranslating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4" />
                  )}
                  Translate
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Translate to {targetLanguages.find(l => l.value === targetLanguage)?.label}</p>
              </TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-border/50 mx-1" />

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="hover:bg-accent/50"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle theme</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </motion.header>

        {/* Main content */}
        <div ref={containerRef} className="relative z-10 flex flex-1 min-h-0">
          {/* Editor Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col border-r border-border/50"
            style={{ width: `${editorWidth}%` }}
          >
            {/* Editor header */}
            <div className="flex items-center justify-between border-b border-border/50 glass-subtle px-4 py-2">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Editor</span>
              </div>
              <div className="flex items-center gap-2">
                {code.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {code.split('\n').length} lines
                  </span>
                )}
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 relative">
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(value) => setCode(value || "")}
                theme={resolvedTheme === 'dark' ? "vs-dark" : "light"}
                onMount={(editor, monaco) => {
                  const supportedLanguages = [
                    'javascript', 'typescript', 'python', 'cpp',
                    'rust', 'go', 'php', 'java'
                  ];

                  supportedLanguages.forEach(lang => {
                    monaco.languages.registerHoverProvider(lang, {
                      provideHover: (model: any, position: any) => {
                        const word = model.getWordAtPosition(position);
                        if (!word) return null;

                        const wordText = word.word;
                        const currentLang = model.getLanguageId();
                        const doc = getMDNDoc(wordText, currentLang);

                        if (!doc) return null;

                        return {
                          range: new monaco.Range(
                            position.lineNumber,
                            word.startColumn,
                            position.lineNumber,
                            word.endColumn
                          ),
                          contents: [
                            { value: `**${wordText}**` },
                            { value: doc.description },
                            { value: `[MDN Reference](${doc.mdn})` }
                          ]
                        };
                      }
                    });

                    if (lang in LANGUAGE_CONFIG) {
                      const config = LANGUAGE_CONFIG[lang];
                      monaco.languages.registerCompletionItemProvider(lang, {
                        provideCompletionItems: (model: any, position: any) => {
                          const word = model.getWordUntilPosition(position);
                          const range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn
                          };

                          const suggestions: any[] = [];

                          config.keywords.forEach(keyword => {
                            const doc = getMDNDoc(keyword, lang);
                            suggestions.push({
                              label: keyword,
                              kind: monaco.languages.CompletionItemKind.Keyword,
                              insertText: keyword,
                              documentation: doc ? {
                                value: `${doc.description}\n\n[MDN Reference](${doc.mdn})`
                              } : "Keyword",
                              range: range
                            });
                          });

                          config.builtins.forEach(builtin => {
                            const doc = getMDNDoc(builtin, lang);
                            suggestions.push({
                              label: builtin,
                              kind: monaco.languages.CompletionItemKind.Function,
                              insertText: builtin,
                              documentation: doc ? {
                                value: `${doc.description}\n\n[MDN Reference](${doc.mdn})`
                              } : "Built-in",
                              range: range
                            });
                          });

                          config.snippets.forEach(snippet => {
                            suggestions.push({
                              label: snippet.label,
                              kind: monaco.languages.CompletionItemKind.Snippet,
                              insertText: snippet.insertText,
                              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                              documentation: snippet.documentation,
                              range: range
                            });
                          });

                          return { suggestions };
                        }
                      });
                    }
                  });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  fontLigatures: true,
                  lineNumbers: "on",
                  scrollBeyondLastLine: true,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "on",
                  padding: { top: 16, bottom: 16 },
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  renderLineHighlight: "all",
                  bracketPairColorization: { enabled: true },
                  scrollbar: {
                    vertical: "visible",
                    useShadows: false,
                    verticalScrollbarSize: 12,
                    horizontalScrollbarSize: 12,
                  },
                  overviewRulerLanes: 0,
                }}
              />
            </div>
          </motion.div>

          {/* Resizable Divider */}
          <div
            className="group relative w-1 cursor-col-resize bg-border/30 hover:bg-primary/50 transition-colors duration-200"
            onMouseDown={() => setIsDragging(true)}
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-muted-foreground/30 group-hover:bg-primary/70 transition-colors" />
          </div>

          {/* Right Panel */}
          <motion.div
            ref={rightPanelRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col bg-background/50"
            style={{ width: `${100 - editorWidth}%` }}
          >
            {/* Tab Headers */}
            <div className="flex border-b border-border/50 glass-subtle overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200
                    border-b-2 whitespace-nowrap
                    ${activeTab === tab.id
                      ? `border-current ${tab.color} bg-accent/30`
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/20'
                    }
                  `}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.loading && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {activeTab === "output" ? (
                    <div className="h-full overflow-auto p-6">
                      {output ? (
                        <pre className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {output}
                        </pre>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center max-w-sm">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
                              <Terminal className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              Ready to Execute
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Write some code and click Run to see the output here.
                            </p>
                            <Badge variant="secondary" className="gap-1.5">
                              {canRunClientSide(language) ? (
                                <>
                                  <Zap className="h-3 w-3" />
                                  Runs in browser
                                </>
                              ) : canRunOnBackend(language) ? (
                                <>
                                  <Server className="h-3 w-3" />
                                  Runs on server
                                </>
                              ) : (
                                <>
                                  <Code2 className="h-3 w-3" />
                                  Analysis only
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : activeTab === "context" ? (
                    <CodeContextViewer
                      context={codeContext}
                      isAnalyzing={isAnalyzing}
                      error={analysisError}
                    />
                  ) : activeTab === "translate" ? (
                    <TranslationViewer
                      sourceCode={code}
                      sourceLanguage={language}
                      targetLanguage={targetLanguage}
                      translatedCode={translationResult?.translatedCode || null}
                      warnings={translationResult?.warnings || []}
                      metadata={translationResult?.metadata}
                      isLoading={isTranslating}
                      error={translationError}
                    />
                  ) : activeTab === "resources" ? (
                    <ResourceFetcher
                      codeContext={codeContext}
                      isAnalyzing={isAnalyzing}
                      sourceCode={code}
                      reviewResult={reviewResult}
                      onReviewUpdate={(review, metadata) => {
                        setReviewResult(review);
                        setReviewMetadata(metadata);
                      }}
                    />
                  ) : (
                    <CodeReviewViewer
                      review={reviewResult}
                      metadata={reviewMetadata}
                      isLoading={isReviewing}
                      error={reviewError}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
