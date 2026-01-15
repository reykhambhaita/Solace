// components/TranslationViewer.tsx

import { Badge } from "@/components/ui/badge";
import { Editor } from "@monaco-editor/react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Languages, Loader2 } from "lucide-react";

interface TranslationViewerProps {
  sourceCode: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedCode: string | null;
  warnings: string[];
  metadata?: {
    model: string;
    tokensUsed: number;
    timestamp: string;
  };
  isLoading?: boolean;
  error?: string | null;
}

export function TranslationViewer({
  sourceCode,
  sourceLanguage,
  targetLanguage,
  translatedCode,
  warnings,
  metadata,
  isLoading,
  error,
}: TranslationViewerProps) {
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-zinc-300 mb-2 font-medium">Translation Failed</p>
          <p className="text-sm text-zinc-500 mb-4 whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-purple-500 mb-4 animate-spin" />
          <p className="text-zinc-300 mb-2">
            Translating {sourceLanguage} to {targetLanguage}...
          </p>
          <p className="text-xs text-zinc-500">This may take 10-30 seconds</p>
        </div>
      </div>
    );
  }

  if (!translatedCode) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Languages className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">No translation available</p>
          <p className="text-sm text-zinc-600">Select target language and click "Translate"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header with Translation Info */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-[#0f0f0f]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
              {sourceLanguage.toUpperCase()}
            </Badge>
            <ArrowRight className="h-3 w-3 text-zinc-500" />
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
              {targetLanguage.toUpperCase()}
            </Badge>
          </div>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </div>
        {metadata && (
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Clock className="h-3 w-3" />
            {metadata.tokensUsed.toLocaleString()} tokens
          </div>
        )}
      </div>

      {/* Warnings Banner (if any) */}
      {warnings && warnings.length > 0 && (
        <div className="px-6 py-2 border-b border-zinc-800 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-medium text-yellow-400">Translation Notes:</span>
              <div className="mt-1 space-y-0.5">
                {warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-yellow-300/80">
                    • {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Translated Code Only */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={targetLanguage}
          value={translatedCode}
          theme="vs-dark"
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: true,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            scrollbar: {
              vertical: 'visible',
              useShadows: true,
              verticalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  );
}