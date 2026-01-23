/**
 * Code Context Viewer Component
 * Displays code analysis results in a readable format
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Clock,
  Code2
} from "lucide-react";
import type { CodeContext } from "../lib/analyzer/context-detector";

interface CodeContextViewerProps {
  context: CodeContext | null;
  isAnalyzing?: boolean;
  error?: string | null;
}

export function CodeContextViewer({ context, isAnalyzing, error }: CodeContextViewerProps) {
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-zinc-400 mb-2">Analysis Error</p>
          <p className="text-sm text-zinc-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-zinc-400">Analyzing code...</p>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Code2 className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">No code to analyze</p>
          <p className="text-sm text-zinc-600">Write some code to see the context analysis</p>
        </div>
      </div>
    );
  }

  const TopicSection = ({ topic, items, children, className }: { topic: string, items?: (string | React.ReactNode)[], children?: React.ReactNode, className?: string }) => (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-zinc-500"></div>
        {topic}
      </h3>
      {items && items.length > 0 && (
        <ul className="space-y-1.5 ml-3 border-l border-border pl-3">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-foreground flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0"></span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
      {children && (
        <div className="ml-3 border-l border-border pl-3 pt-1">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <ScrollArea className="flex-1 w-full bg-background">
      <div className="p-6">
        {/* Analysis Stats (Header) */}
        <div className="flex items-center justify-between pb-6 mb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-zinc-300">Analysis Active</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Clock className="h-3 w-3" />
            {context.analysisTime.toFixed(1)}ms
          </div>
        </div>

        <div className="max-w-3xl">
          {/* 1. Language & Identity */}
          <TopicSection
            topic="Language & Identity"
            items={[
              <span key="lang">Language: <span className="text-blue-400 font-medium">{context.language.language.toUpperCase()}</span> {context.language.dialect && `(${context.language.dialect})`} <span className="text-zinc-500 text-xs">({Math.round(context.language.confidence * 100)}% confidence)</span></span>,
              context.codeType.type !== 'unknown' && <span key="type">Type: <span className="text-green-400 font-medium">{context.codeType.type.toUpperCase()}</span></span>,
              context.codeType.testType && <span key="test">Test Category: {context.codeType.testType}</span>
            ].filter(Boolean) as React.ReactNode[]}
          />

          {/* 2. Semantic Intent (LLM Context) */}
          <TopicSection
            topic="Semantic Intent"
            items={[
              <span key="role">Suggested Role: <span className="font-medium text-foreground">{context.llmContext.role}</span></span>,
              <span key="intent">Primary Intent: {context.llmContext.intent.semanticDescription}</span>,
              context.llmContext.promptHints.length > 0 && (
                <div key="hints" className="mt-1">
                  <span className="text-zinc-500 block mb-1">Guidance points:</span>
                  <div className="space-y-1">
                    {context.llmContext.promptHints.map(h => (
                      <div key={h} className="text-zinc-400 text-xs pl-2">• {h}</div>
                    ))}
                  </div>
                </div>
              )
            ].filter(Boolean) as React.ReactNode[]}
          />

          {/* 3. Programming Paradigm & Structure */}
          <TopicSection
            topic="Paradigm & Structure"
            items={[
              <span key="primary">Primary: <span className="text-orange-400">{context.paradigm.primary.paradigm}</span> ({Math.round(context.paradigm.primary.score)}%)</span>,
              context.paradigm.secondary && <span key="secondary">Secondary: {context.paradigm.secondary.paradigm}</span>,
              <span key="mixing">Mixing: {context.paradigm.mixing?.score ? 'Mixed Patterns' : 'Pure'}</span>,

              // Structure Stats
              <span key="stats">Stats: <span className="text-zinc-400">{context.paradigm.patterns.classes} Classes, {context.paradigm.patterns.functions} Functions, {context.paradigm.patterns.loops} Loops</span></span>,

              // Class Names
              context.paradigm.details.classNames?.length > 0 && (
                <span key="classes" className="flex items-start gap-2">
                  <span className="shrink-0 text-zinc-400">Classes:</span>
                  <div className="flex flex-wrap gap-1">
                    {context.paradigm.details.classNames.map((name, i) => (
                      <span key={i} className="text-purple-300 font-mono text-xs bg-muted px-1.5 rounded">{name}</span>
                    ))}
                  </div>
                </span>
              ),

              // Function Names
              context.paradigm.details.functionNames?.length > 0 && (
                <span key="functions" className="flex items-start gap-2">
                  <span className="shrink-0 text-zinc-400">Functions:</span>
                  <div className="flex flex-wrap gap-1">
                    {context.paradigm.details.functionNames.map((name, i) => (
                      <span key={i} className="text-blue-300 font-mono text-xs bg-muted px-1.5 rounded">{name}()</span>
                    ))}
                  </div>
                </span>
              ),

              <span key="fitness">Language Fit: <span className={context.paradigm.fitnessScore && context.paradigm.fitnessScore > 0.8 ? "text-green-400" : "text-yellow-400"}>{Math.round((context.paradigm.fitnessScore || 0) * 100)}%</span></span>
            ].filter(Boolean) as React.ReactNode[]}
          />

          {/* 5. Dependencies & Frameworks */}
          {(context.libraries.frameworks.length > 0 || context.libraries.libraries.length > 0) && (
            <TopicSection topic="Dependencies">
              {context.libraries.frameworks.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-zinc-500 block mb-1">Frameworks</span>
                  <ul className="list-disc list-inside">
                    {context.libraries.frameworks.map((fw, i) => (
                      <li key={i} className="text-sm text-green-400">{fw.name} <span className="text-zinc-600 text-xs">({Math.round(fw.confidence * 100)}%)</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {context.libraries.libraries.length > 0 && (
                <div>
                  <span className="text-xs text-zinc-500 block mb-1">Libraries</span>
                  <ul className="list-disc list-inside grid grid-cols-2 gap-x-4">
                    {context.libraries.libraries.map((lib, i) => (
                      <li key={i} className="text-sm text-foreground">{lib.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TopicSection>
          )}

          {/* 6. Behavior & Quality */}
          <TopicSection
            topic="Behavior & Quality"
            items={[
              <span key="determinism">Determinism: <span className={context.libraries.externalInteractions.isDeterministic ? "text-green-400" : "text-yellow-400"}>{context.libraries.externalInteractions.isDeterministic ? "Deterministic" : "Non-deterministic"}</span></span>,
              context.reviewIR?.quality && <span key="complexity">Control Flow Complexity: {context.reviewIR.quality.controlFlowComplexity}</span>,
              context.reviewIR?.quality && <span key="testability">Testability Score: {context.reviewIR.quality.testability}/100</span>,
              context.reviewIR?.elements.magicValues.length ? <span key="magic" className="text-yellow-400">Magic Values Detected: {context.reviewIR.elements.magicValues.length}</span> : null
            ].filter(Boolean) as React.ReactNode[]}
          />
        </div>
      </div>
    </ScrollArea>
  );
}