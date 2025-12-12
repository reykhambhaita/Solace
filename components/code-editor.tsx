"use client";

import { Editor } from "@monaco-editor/react";
import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function CodeEditor() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [editorWidth, setEditorWidth] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const runCode = () => {
    try {
      const logs: string[] = [];
      const originalLog = console.log;

      console.log = (...args) => {
        logs.push(args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      eval(code);
      console.log = originalLog;

      setOutput(logs.join('\n') || 'Code executed successfully (no output)');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newWidth >= 20 && newWidth <= 80) {
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
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="ruby">Ruby</option>
            <option value="php">PHP</option>
          </select>
        </div>
        <button
          onClick={runCode}
          disabled={language !== "javascript"}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Run Code
        </button>
      </div>

      {/* Editor and Output */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
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

        {/* Output Panel */}
        <div
          className="flex flex-col bg-[#0a0a0a]"
          style={{ width: `${100 - editorWidth}%` }}
        >
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
                <p className="text-sm text-zinc-600">
                  Run your code to see the output here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}