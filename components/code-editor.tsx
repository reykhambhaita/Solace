"use client";

import { CodeContextViewer } from "@/components/CodeContextViewer";
import { CodeReviewViewer } from "@/components/CodeReviewer";
import ResourceFetcher from "@/components/ResourceFetcher";
import { TranslationViewer } from "@/components/TranslationViewer";
import { useCodeContext } from "@/lib/analyzer/context-detector";
import { LANGUAGE_CONFIG } from "@/lib/language-config";
import { getMDNDoc } from "@/lib/mdn-docs";
import { useTranslation } from "@/lib/translation/use-translation";
import { Editor } from "@monaco-editor/react";
import { ArrowRightLeft, BookOpen, Brain, Loader2, Play, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function CodeEditor() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [editorWidth, setEditorWidth] = useState(40);
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




  // Use the context hook for code analysis
  const { context: codeContext, isAnalyzing, error: analysisError } = useCodeContext(code);

  // Check which languages can run client-side (in browser)
  const canRunClientSide = (lang: string): boolean => {
    return ['javascript', 'typescript'].includes(lang);
  };

  // Check which languages need backend (Docker)
  const canRunOnBackend = (lang: string): boolean => {
    return ['python', 'java', 'go', 'cpp', 'c', 'ruby', 'php'].includes(lang);
  };

  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Error: No code to execute");
      return;
    }

    setIsRunning(true);
    setOutput("Executing code...");

    try {
      // Client-side execution (JavaScript/TypeScript)
      if (canRunClientSide(language)) {
        runCodeClientSide();
      }
      // Backend execution (Python, Java, Go, etc.)
      else if (canRunOnBackend(language)) {
        await runCodeOnBackend();
      }
      // Unsupported language
      else {
        setOutput(`Error: Language "${language}" is not supported yet`);
        setIsRunning(false);
      }
    } catch (error) {
      setOutput(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsRunning(false);
    }
  };

  // Run JavaScript/TypeScript in browser
  const runCodeClientSide = () => {
    try {
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;

      // Capture console.log
      console.log = (...args) => {
        logs.push(args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      // Capture console.error
      console.error = (...args) => {
        logs.push('ERROR: ' + args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      // Execute code
      eval(code);

      // Restore console
      console.log = originalLog;
      console.error = originalError;

      setOutput(logs.join('\n') || 'Code executed successfully (no output)');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Run code on backend (Python, Java, Go, etc.)
  const runCodeOnBackend = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: language
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Format output
      let formattedOutput = '';

      if (result.output && result.output.trim()) {
        formattedOutput += `Output:\n${result.output}`;
      }

      if (result.error && result.error.trim()) {
        formattedOutput += `${formattedOutput ? '\n\n' : ''}Error:\n${result.error}`;
      }

      if (!result.output && !result.error) {
        formattedOutput = 'Code executed successfully (no output)';
      }

      formattedOutput += `\n\nExecution time: ${result.executionTime}`;
      formattedOutput += `\nExit code: ${result.exitCode}`;

      setOutput(formattedOutput);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setOutput(
            `Connection Error: Cannot connect to backend server.\n\n` +
            `Make sure the backend is running:\n` +
            `  cd solace-backend\n` +
            `  npm start\n\n` +
            `Backend URL: ${BACKEND_URL}`
          );
        } else {
          setOutput(`Error: ${error.message}`);
        }
      } else {
        setOutput(`Error: ${String(error)}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Get code review from backend using Qwen 3-32B
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewIR: codeContext.reviewIR,
          codeContext: codeContext,
          prunedTree: null, // Let backend generate it
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
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setReviewError(
            `Connection Error: Cannot connect to backend server.\n\n` +
            `Make sure the backend is running with GROQ_API_KEY set:\n` +
            `  cd solace-backend\n` +
            `  GROQ_API_KEY=your_key npm start\n\n` +
            `Backend URL: ${BACKEND_URL}`
          );
        } else {
          setReviewError(error.message);
        }
      } else {
        setReviewError(String(error));
      }
    } finally {
      setIsReviewing(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;

    if (isDragging) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newWidth >= 20 && newWidth <= 70) {
        setEditorWidth(newWidth);
      }
    }
  };


  const handleTranslate = async () => {
    if (!code.trim()) {
      return;
    }

    if (!codeContext || !codeContext.reviewIR) {
      return;
    }

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
  }, [isDragging]);

  // Get button text and status
  const getRunButtonInfo = () => {
    if (isRunning) {
      return { text: 'Running...', disabled: true, icon: <Loader2 className="h-4 w-4 animate-spin" /> };
    }
    if (canRunClientSide(language)) {
      return { text: 'Run Code (Browser)', disabled: false, icon: <Play className="h-4 w-4" /> };
    }
    if (canRunOnBackend(language)) {
      return { text: 'Run Code (Server)', disabled: false, icon: <Play className="h-4 w-4" /> };
    }
    return { text: 'Not Supported', disabled: true, icon: <Play className="h-4 w-4" /> };
  };

  const runButtonInfo = getRunButtonInfo();

  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-[#0f0f0f] px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">Solace</h1>
          <div className="h-6 w-px bg-zinc-700" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none transition-colors hover:border-zinc-600 focus:border-blue-500"
          >
            <optgroup label="Browser (Client-side)">
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </optgroup>
            <optgroup label="Server (Docker)">
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="ruby">Ruby</option>
              <option value="php">PHP</option>
            </optgroup>
          </select>


          <select
            value={targetLanguage}
            onChange={(e) => {
              setTargetLanguage(e.target.value);
              resetTranslation();
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none transition-colors hover:border-zinc-600 focus:border-purple-500"
          >
            <option value="typescript">→ TypeScript</option>
            <option value="python">→ Python</option>
            <option value="java">→ Java</option>
            <option value="go">→ Go</option>
            <option value="rust">→ Rust</option>
            <option value="cpp">→ C++</option>
            <option value="c">→ C</option>
            <option value="ruby">→ Ruby</option>
            <option value="php">→ PHP</option>
            <option value="javascript">→ JavaScript</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Execution mode indicator */}
          {canRunClientSide(language) && (
            <span className="text-xs text-green-500">• Runs in browser</span>
          )}
          {canRunOnBackend(language) && (
            <span className="text-xs text-blue-500">• Runs on server</span>
          )}
          {!canRunClientSide(language) && !canRunOnBackend(language) && (
            <span className="text-xs text-yellow-500">• Not supported yet</span>
          )}

          {/* Run button */}
          <button
            onClick={runCode}
            disabled={runButtonInfo.disabled}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runButtonInfo.icon}
            {runButtonInfo.text}
          </button>

          {/* Review button */}
          <button
            onClick={getCodeReview}
            disabled={isReviewing || isAnalyzing || !codeContext}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-500 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isReviewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isReviewing ? 'Reviewing...' : 'Get Review'}
          </button>





          <button
            onClick={handleTranslate}
            disabled={isTranslating || isAnalyzing || !codeContext || language === targetLanguage}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-500 hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            {isTranslating ? 'Translating...' : 'Translate'}
          </button>

          <button
            onClick={() => setActiveTab("translate")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "translate"
              ? "border-purple-500 text-white bg-zinc-900/50"
              : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/30"
              }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Translate
            {isTranslating && (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-500" />
            )}
          </button>



          <button
            onClick={() => setActiveTab("resources")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "resources"
              ? "border-emerald-500 text-white bg-zinc-900/50"
              : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/30"
              }`}
          >
            <BookOpen className="h-4 w-4" />
            Resources
          </button>

        </div>
      </div>

      {/* Editor and Output */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Editor Panel */}
        <div
          className="flex flex-col border-r border-zinc-800"
          style={{ width: `${editorWidth}%` }}
        >
          <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 py-2">
            <span className="text-sm font-medium text-zinc-400">Editor</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              onMount={(editor, monaco) => {
                const supportedLanguages = [
                  'javascript', 'typescript', 'python', 'cpp',
                  'rust', 'go', 'php', 'java'
                ];

                supportedLanguages.forEach(lang => {
                  // Register Hover Provider
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
                          { value: `[MDN Reference ↗](${doc.mdn})` }
                        ]
                      };
                    }
                  });

                  // Register Completion Provider
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

                        // Keywords
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

                        // Built-ins
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

                        // Snippets
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
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
                  useShadows: true,
                  verticalScrollbarSize: 10,
                },
              }}
            />
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className="w-1 cursor-col-resize bg-zinc-800 hover:bg-blue-500 transition-colors"
          onMouseDown={() => setIsDragging(true)}
        />

        {/* Right Panel - Tabbed Output/Context/Review */}
        <div
          ref={rightPanelRef}
          className="flex flex-col bg-[#0a0a0a]"
          style={{ width: `${100 - editorWidth}%` }}
        >
          {/* Tab Headers */}
          <div className="flex border-b border-zinc-800 bg-[#0f0f0f]">
            <button
              onClick={() => setActiveTab("output")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "output"
                ? "border-blue-500 text-white bg-zinc-900/50"
                : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/30"
                }`}
            >
              <Play className="h-4 w-4" />
              Output
            </button>
            <button
              onClick={() => setActiveTab("context")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "context"
                ? "border-blue-500 text-white bg-zinc-900/50"
                : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/30"
                }`}
            >
              <Brain className="h-4 w-4" />
              Context
              {isAnalyzing && (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "review"
                ? "border-cyan-500 text-white bg-zinc-900/50"
                : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/30"
                }`}
            >
              <Sparkles className="h-4 w-4" />
              AI Review
              {isReviewing && (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-500" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "output" ? (
              <div className="flex-1 h-full overflow-auto p-6">
                {output ? (
                  <pre className="font-mono text-sm text-zinc-300 whitespace-pre-wrap">
                    {output}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-zinc-600 mb-2">
                        Run your code to see the output here
                      </p>
                      <p className="text-xs text-zinc-700">
                        {canRunClientSide(language)
                          ? '• Runs instantly in your browser'
                          : canRunOnBackend(language)
                            ? '• Requires backend server to be running'
                            : '• This language is not supported yet'}
                      </p>
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
              />
            ) : (
              <CodeReviewViewer
                review={reviewResult}
                metadata={reviewMetadata}
                isLoading={isReviewing}
                error={reviewError}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}