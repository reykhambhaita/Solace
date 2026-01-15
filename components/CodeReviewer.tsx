/**
 * Code Review Viewer Component
 * Displays LLM-powered code review from Qwen 3-32B
 */

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileWarning,
  Lightbulb,
  Shield,
  Target,
  XCircle,
} from "lucide-react";
import { JSX, useState } from "react";

export interface ReviewResult {
  complexity: string;
  purpose: string;
  behavioral: string;
  risks: string;
  edgeCases: string;
  summary: string;
  raw: string;
}

export interface ReviewMetadata {
  model: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  timestamp: string;
}

interface CodeReviewViewerProps {
  review: ReviewResult | null;
  metadata?: ReviewMetadata;
  isLoading?: boolean;
  error?: string | null;
}

export function CodeReviewViewer({ review, metadata, isLoading, error }: CodeReviewViewerProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-zinc-300 mb-2 font-medium">Review Failed</p>
          <p className="text-sm text-zinc-500 mb-4">{error}</p>
          <p className="text-xs text-zinc-600">
            Make sure your GROQ_API_KEY is set in the backend environment
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p className="text-zinc-300 mb-2">Analyzing code with Qwen 3-32B...</p>
          <p className="text-xs text-zinc-500">This may take 10-30 seconds</p>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Target className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">No review available</p>
          <p className="text-sm text-zinc-600">Click "Get Review" to analyze your code</p>
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: 'complexity',
      title: 'Complexity Analysis',
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/50',
      content: review.complexity
    },
    {
      id: 'purpose',
      title: 'Purpose Understanding',
      icon: Lightbulb,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/50',
      content: review.purpose
    },
    {
      id: 'behavioral',
      title: 'Behavioral Correctness',
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/50',
      content: review.behavioral
    },
    {
      id: 'risks',
      title: 'Hidden Risks',
      icon: AlertCircle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/50',
      content: review.risks
    },
    {
      id: 'edgeCases',
      title: 'Edge Cases & Boundaries',
      icon: FileWarning,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/50',
      content: review.edgeCases
    },
    {
      id: 'summary',
      title: 'Summary',
      icon: Shield,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/50',
      content: review.summary
    },
  ];

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="p-6 space-y-4">
        {/* Review Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-medium text-zinc-300">AI Code Review</span>
          </div>
          {metadata && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                Qwen 3-32B
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Clock className="h-3 w-3" />
                {metadata.tokensUsed.toLocaleString()} tokens
              </div>
            </div>
          )}
        </div>

        {/* Structured Review Output */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          {(() => {
            try {
              // Strip <think> blocks and parse JSON
              const cleanedRaw = review.raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              const jsonMatch = cleanedRaw.match(/\{[\s\S]*\}/);
              if (!jsonMatch) return <pre className="text-sm text-zinc-300">{cleanedRaw}</pre>;

              const parsed = JSON.parse(jsonMatch[0]);

              const sections = [
                { key: 'complexity', label: 'Complexity Analysis', icon: '⚡' },
                { key: 'purpose', label: 'Purpose Understanding', icon: '🎯' },
                { key: 'behavioral', label: 'Behavioral Correctness', icon: '✓' },
                { key: 'risks', label: 'Hidden Risks', icon: '⚠️' },
                { key: 'edgeCases', label: 'Edge Cases & Boundaries', icon: '🔍' },
                { key: 'summary', label: 'Summary', icon: '📋' }
              ];

              return sections.map(section => {
                const content = parsed[section.key];
                if (!content) return null;

                return (
                  <div key={section.key} className="border-l-2 border-cyan-500/50 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{section.icon}</span>
                      <h4 className="text-sm font-semibold text-zinc-200">{section.label}</h4>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {content}
                    </p>
                  </div>
                );
              });
            } catch (error) {
              // Fallback to raw display if parsing fails
              const cleanedRaw = review.raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              return <pre className="text-sm text-zinc-300 whitespace-pre-wrap">{cleanedRaw}</pre>;
            }
          })()}
        </div>

        {/* Token Usage Details */}
        {metadata && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800">
                <div className="text-xs text-zinc-500">Prompt Tokens</div>
                <div className="text-lg font-semibold text-zinc-300">
                  {metadata.promptTokens.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800">
                <div className="text-xs text-zinc-500">Completion Tokens</div>
                <div className="text-lg font-semibold text-zinc-300">
                  {metadata.completionTokens.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800">
                <div className="text-xs text-zinc-500">Total</div>
                <div className="text-lg font-semibold text-cyan-400">
                  {metadata.tokensUsed.toLocaleString()}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-600 text-center mt-3">
              Reviewed at {new Date(metadata.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * Format review content with basic markdown-like styling
 */
function formatReviewContent(content: string): JSX.Element[] {
  if (!content) return [];

  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Headers (lines starting with ###)
    if (trimmed.startsWith('###')) {
      elements.push(
        <h4 key={key++} className="text-base font-semibold text-zinc-200 mt-4 mb-2">
          {trimmed.replace(/^###\s*/, '')}
        </h4>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-4 mb-1">
          <span className="text-cyan-400 mt-1">•</span>
          <span className="flex-1">{trimmed.substring(2)}</span>
        </div>
      );
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.+)$/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-2 ml-4 mb-1">
            <span className="text-cyan-400">{match[1]}.</span>
            <span className="flex-1">{match[2]}</span>
          </div>
        );
        continue;
      }
    }

    // Bold text (**text**)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    if (boldRegex.test(trimmed)) {
      const parts = trimmed.split(boldRegex);
      elements.push(
        <p key={key++} className="mb-2">
          {parts.map((part, idx) =>
            idx % 2 === 1 ? (
              <strong key={idx} className="font-semibold text-zinc-100">{part}</strong>
            ) : (
              <span key={idx}>{part}</span>
            )
          )}
        </p>
      );
      continue;
    }

    // Code references (`code`)
    const codeRegex = /`([^`]+)`/g;
    if (codeRegex.test(trimmed)) {
      const parts = trimmed.split(codeRegex);
      elements.push(
        <p key={key++} className="mb-2">
          {parts.map((part, idx) =>
            idx % 2 === 1 ? (
              <code key={idx} className="px-1.5 py-0.5 bg-zinc-800 text-cyan-300 rounded text-sm font-mono">
                {part}
              </code>
            ) : (
              <span key={idx}>{part}</span>
            )
          )}
        </p>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="mb-2">
        {trimmed}
      </p>
    );
  }

  return elements;
}