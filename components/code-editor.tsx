"use client";

import { TreeSitterAnalyzer } from "@/components/tree-sitter-demo";
import { Editor } from "@monaco-editor/react";
import { Binary, Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function CodeEditor() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [editorWidth, setEditorWidth] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showAST, setShowAST] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setOutput("⚠ Error: No code to execute");
      return;
    }

    setIsRunning(true);
    setOutput("⏳ Executing code...");

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
        setOutput(`⚠ Error: Language "${language}" is not supported yet`);
        setIsRunning(false);
      }
    } catch (error) {
      setOutput(`⚠ Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
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

      setOutput(logs.join('\n') || '✓ Code executed successfully (no output)');
    } catch (error) {
      setOutput(`⚠ Error: ${error instanceof Error ? error.message : String(error)}`);
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

      formattedOutput += `\n\n⏱Execution time: ${result.executionTime}`;
      formattedOutput += `\nExit code: ${result.exitCode}`;

      setOutput(formattedOutput);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setOutput(
            `⚠ Connection Error: Cannot connect to backend server.\n\n` +
            `Make sure the backend is running:\n` +
            `  cd solace-backend\n` +
            `  npm start\n\n` +
            `Backend URL: ${BACKEND_URL}`
          );
        } else {
          setOutput(`⚠ Error: ${error.message}`);
        }
      } else {
        setOutput(`⚠ Error: ${String(error)}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newWidth >= 20 && newWidth <= 70) {
      setEditorWidth(newWidth);
    }
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
        </div>

        <div className="flex items-center gap-3">
          {/* AST Toggle */}
          <button
            onClick={() => setShowAST(!showAST)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${showAST
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
          >
            <Binary className="h-4 w-4" />
            AST
          </button>

          {/* Execution mode indicator */}
          {canRunClientSide(language) && (
            <span className="text-xs text-green-500">🟢 Runs in browser</span>
          )}
          {canRunOnBackend(language) && (
            <span className="text-xs text-blue-500">🐳 Runs on server</span>
          )}
          {!canRunClientSide(language) && !canRunOnBackend(language) && (
            <span className="text-xs text-yellow-500">⚠️ Not supported yet</span>
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
        </div>
      </div>

      {/* Editor, Output, and AST */}
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
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className="w-1 cursor-col-resize bg-zinc-800 hover:bg-blue-500 transition-colors"
          onMouseDown={() => setIsDragging(true)}
        />

        {/* Right Panel - Output and/or AST */}
        <div
          className="flex flex-col bg-[#0a0a0a]"
          style={{ width: `${100 - editorWidth}%` }}
        >
          {showAST ? (
            <div className="flex flex-col h-full">
              {/* Output Panel - Takes 40% when AST is shown */}
              <div className="flex flex-col border-b border-zinc-800" style={{ height: '40%' }}>
                <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 py-2">
                  <span className="text-sm font-medium text-zinc-400">Output</span>
                </div>
                <div className="flex-1 overflow-auto p-6">
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
              </div>

              {/* AST Panel - Takes 60% when shown */}
              <div className="flex-1 min-h-0">
                <TreeSitterAnalyzer code={code} language={language} />
              </div>
            </div>
          ) : (
            /* Output Panel - Full height when AST is hidden */
            <div className="flex flex-col h-full">
              <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 py-2">
                <span className="text-sm font-medium text-zinc-400">Output</span>
              </div>
              <div className="flex-1 overflow-auto p-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}