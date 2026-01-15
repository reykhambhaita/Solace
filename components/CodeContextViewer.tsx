/**
 * Code Context Viewer Component
 * Displays code analysis results in a readable format
 */

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  FileCode,
  Layers,
  Package,
} from "lucide-react";
import { useState } from "react";
import type { CodeContext } from "../lib/analyzer/context-detector";

interface CodeContextViewerProps {
  context: CodeContext | null;
  isAnalyzing?: boolean;
  error?: string | null;
}

export function CodeContextViewer({ context, isAnalyzing, error }: CodeContextViewerProps) {
  const [languageOpen, setLanguageOpen] = useState(true);
  const [librariesOpen, setLibrariesOpen] = useState(true);
  const [paradigmOpen, setParadigmOpen] = useState(true);
  const [codeTypeOpen, setCodeTypeOpen] = useState(true);

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

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="p-6 space-y-4">
        {/* Analysis Stats */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-zinc-300">Analysis Complete</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Clock className="h-3 w-3" />
            {context.analysisTime.toFixed(1)}ms
          </div>
        </div>

        {/* Enhanced LLM Context & Review-IR */}
        <Collapsible open={true}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-cyan-400" />
                <span className="font-medium text-zinc-200">LLM Analysis Context</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4">
                {/* Role & Intent */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">LLM Role:</span>
                    <Badge className={`${context.llmContext.role === 'refactor' ? 'bg-green-500/20 text-green-400' :
                      context.llmContext.role === 'review-only' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                      {context.llmContext.role}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500">Code Intent:</span>
                    <div className="text-sm text-zinc-300 bg-zinc-800/30 p-2 rounded">
                      {context.llmContext.intent.semanticDescription}
                    </div>
                  </div>
                </div>

                {/* Readiness Breakdown */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-500 uppercase">Readiness Scores</span>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-zinc-800/30 text-center">
                      <div className="text-xs text-zinc-500">Review</div>
                      <div className="text-lg font-semibold text-green-400">
                        {Math.round(context.llmContext.readiness.reviewReadiness * 100)}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-zinc-800/30 text-center">
                      <div className="text-xs text-zinc-500">Refactor</div>
                      <div className="text-lg font-semibold text-blue-400">
                        {Math.round(context.llmContext.readiness.refactorReadiness * 100)}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-zinc-800/30 text-center">
                      <div className="text-xs text-zinc-500">Execution</div>
                      <div className="text-lg font-semibold text-purple-400">
                        {Math.round(context.llmContext.readiness.executionReadiness * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prompt Hints */}
                {context.llmContext.promptHints.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">Guidance for LLM:</span>
                    {context.llmContext.promptHints.map((hint, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-cyan-300 bg-cyan-500/10 p-2 rounded">
                        <span className="text-cyan-500">→</span>
                        <span>{hint}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blocking Issues */}
                {context.llmContext.readiness.blockingIssues.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">Blocking Issues:</span>
                    {context.llmContext.readiness.blockingIssues.map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Determinism Reasoning */}
                {context.libraries.externalInteractions.determinismReasoning && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Determinism:</span>
                      <Badge variant={context.libraries.externalInteractions.isDeterministic ? 'default' : 'destructive'}>
                        {context.libraries.externalInteractions.isDeterministic ? 'Deterministic' : 'Non-deterministic'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {context.libraries.externalInteractions.determinismReasoning.reasoning.map((reason, idx) => (
                        <div key={idx} className="text-xs text-zinc-400 pl-2 border-l-2 border-zinc-700">
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Testability */}
                {context.reviewIR && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                    <div className="p-2 rounded bg-zinc-800/30">
                      <div className="text-xs text-zinc-500">Testability</div>
                      <div className="text-lg font-semibold text-zinc-300">
                        {context.reviewIR.quality.testability}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-zinc-800/30">
                      <div className="text-xs text-zinc-500">Complexity</div>
                      <div className="text-lg font-semibold text-zinc-300">
                        {context.reviewIR.quality.controlFlowComplexity}
                      </div>
                    </div>
                  </div>
                )}

                {/* Magic Values & Silent Behaviors */}
                {context.reviewIR && (context.reviewIR.elements.magicValues.length > 0 || context.reviewIR.elements.silentBehaviors.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    {context.reviewIR.elements.magicValues.length > 0 && (
                      <div>
                        <span className="text-xs text-zinc-500">Magic Values ({context.reviewIR.elements.magicValues.length}):</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {context.reviewIR.elements.magicValues.slice(0, 5).map((mv, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-yellow-700 text-yellow-400">
                              {mv.value} {mv.role && `(${mv.role})`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {context.reviewIR.elements.silentBehaviors.length > 0 && (
                      <div>
                        <span className="text-xs text-zinc-500">Silent Behaviors ({context.reviewIR.elements.silentBehaviors.length}):</span>
                        <div className="space-y-1 mt-1">
                          {context.reviewIR.elements.silentBehaviors.slice(0, 3).map((sb, idx) => (
                            <div key={idx} className={`text-xs p-1.5 rounded ${sb.risk === 'high' ? 'bg-red-500/10 text-red-400' :
                              sb.risk === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-zinc-800/50 text-zinc-400'
                              }`}>
                              {sb.type} (line {sb.location})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Language Detection */}
        <Collapsible open={languageOpen} onOpenChange={setLanguageOpen}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <Code2 className="h-5 w-5 text-blue-400" />
                <span className="font-medium text-zinc-200">Language Detection</span>
              </div>
              {languageOpen ? (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Language:</span>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    {context.language.language.toUpperCase()}
                  </Badge>
                </div>
                {context.language.dialect && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Dialect:</span>
                    <span className="text-sm text-zinc-300">{context.language.dialect}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Confidence:</span>
                    <span className="text-sm text-zinc-300">
                      {Math.round(context.language.confidence * 100)}%
                    </span>
                  </div>
                  <Progress value={context.language.confidence * 100} className="h-2" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-500">Indicators:</span>
                  <div className="flex flex-wrap gap-1">
                    {context.language.indicators.map((indicator, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Libraries & Frameworks */}
        <Collapsible open={librariesOpen} onOpenChange={setLibrariesOpen}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-purple-400" />
                <span className="font-medium text-zinc-200">Libraries & Frameworks</span>
              </div>
              {librariesOpen ? (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4">
                {/* Frameworks */}
                {context.libraries.frameworks.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-zinc-500">Frameworks:</span>
                    {context.libraries.frameworks.map((framework, idx) => (
                      <div key={idx} className="space-y-2 p-3 rounded bg-zinc-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-300">{framework.name}</span>
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                            {Math.round(framework.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {framework.indicators.map((indicator, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Libraries */}
                {context.libraries.libraries.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-zinc-500">
                      Dependencies ({context.libraries.libraries.length}):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {context.libraries.libraries.slice(0, 8).map((lib, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded bg-zinc-800/30">
                          <Badge
                            variant="outline"
                            className={`text-xs border-zinc-700 ${lib.isStandardLib
                              ? 'text-zinc-500'
                              : lib.category === 'framework'
                                ? 'text-purple-400'
                                : lib.category === 'testing'
                                  ? 'text-yellow-400'
                                  : 'text-blue-400'
                              }`}
                          >
                            {lib.name}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {context.libraries.libraries.length > 8 && (
                      <p className="text-xs text-zinc-600">
                        +{context.libraries.libraries.length - 8} more
                      </p>
                    )}
                  </div>
                )}

                {context.libraries.libraries.length === 0 && (
                  <p className="text-sm text-zinc-600">No external libraries detected</p>
                )}

                {/* Package Manager */}
                {context.libraries.packageManager && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">Package Manager:</span>
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                      {context.libraries.packageManager}
                    </Badge>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Programming Paradigm */}
        <Collapsible open={paradigmOpen} onOpenChange={setParadigmOpen}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-orange-400" />
                <span className="font-medium text-zinc-200">Programming Paradigm</span>
              </div>
              {paradigmOpen ? (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4">
                {/* Primary Paradigm */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Primary:</span>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                      {context.paradigm.primary.paradigm.split('-').map(w =>
                        w.charAt(0).toUpperCase() + w.slice(1)
                      ).join(' ')}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Score:</span>
                      <span className="text-zinc-400">{context.paradigm.primary.score}%</span>
                    </div>
                    <Progress value={context.paradigm.primary.score} className="h-2" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {context.paradigm.primary.indicators.map((indicator, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Secondary Paradigm */}
                {context.paradigm.secondary && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Secondary:</span>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {context.paradigm.secondary.paradigm.split('-').map(w =>
                          w.charAt(0).toUpperCase() + w.slice(1)
                        ).join(' ')}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Score:</span>
                        <span className="text-zinc-400">{context.paradigm.secondary.score}%</span>
                      </div>
                      <Progress value={context.paradigm.secondary.score} className="h-2" />
                    </div>
                  </div>
                )}

                {/* Pattern Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                  <div className="p-2 rounded bg-zinc-800/30">
                    <div className="text-xs text-zinc-500">Classes</div>
                    <div className="text-lg font-semibold text-zinc-300">
                      {context.paradigm.patterns.classes}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/30">
                    <div className="text-xs text-zinc-500">Functions</div>
                    <div className="text-lg font-semibold text-zinc-300">
                      {context.paradigm.patterns.functions}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/30">
                    <div className="text-xs text-zinc-500">Pure Functions</div>
                    <div className="text-lg font-semibold text-zinc-300">
                      {context.paradigm.patterns.pureFunctions}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/30">
                    <div className="text-xs text-zinc-500">Loops</div>
                    <div className="text-lg font-semibold text-zinc-300">
                      {context.paradigm.patterns.loops}
                    </div>
                  </div>
                </div>

                {/* Detailed Code Elements */}
                {context.paradigm.details && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Detailed Breakdown</span>
                    </div>

                    {/* Classes */}
                    {context.paradigm.details.classNames && context.paradigm.details.classNames.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-zinc-500">Classes ({context.paradigm.details.classNames.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                          {context.paradigm.details.classNames.map((name, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-zinc-700 bg-zinc-800/50 text-purple-300 font-mono">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Functions */}
                    {context.paradigm.details.functionNames && context.paradigm.details.functionNames.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-zinc-500">Functions ({context.paradigm.details.functionNames.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                          {context.paradigm.details.functionNames.map((name, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-zinc-700 bg-zinc-800/50 text-blue-300 font-mono">
                              {name}()
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loops */}
                    {context.paradigm.details.loopTypes && context.paradigm.details.loopTypes.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-zinc-500">Loops ({context.paradigm.details.loopTypes.length})</span>
                        <div className="grid grid-cols-2 gap-2">
                          {context.paradigm.details.loopTypes.map((loop, idx) => (
                            <div key={idx} className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-800/30 border border-zinc-800/50">
                              <span className="text-xs text-orange-300 font-mono">{loop.type}</span>
                              <span className="text-[10px] text-zinc-500">line {loop.line + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Code Type */}
        <Collapsible open={codeTypeOpen} onOpenChange={setCodeTypeOpen}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <FileCode className="h-5 w-5 text-green-400" />
                <span className="font-medium text-zinc-200">Code Type</span>
              </div>
              {codeTypeOpen ? (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Type:</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    {context.codeType.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Confidence:</span>
                    <span className="text-sm text-zinc-300">
                      {Math.round(context.codeType.confidence * 100)}%
                    </span>
                  </div>
                  <Progress value={context.codeType.confidence * 100} className="h-2" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-500">Indicators:</span>
                  <div className="flex flex-wrap gap-1">
                    {context.codeType.indicators.map((indicator, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                </div>
                {context.codeType.entryPoints && context.codeType.entryPoints.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">Entry Points:</span>
                    <div className="flex flex-wrap gap-1">
                      {context.codeType.entryPoints.map((entry, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-zinc-700 text-zinc-400 font-mono">
                          {entry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {context.codeType.exports && context.codeType.exports.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">Exports:</span>
                    <div className="flex flex-wrap gap-1">
                      {context.codeType.exports.map((exp, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-zinc-700 text-zinc-400 font-mono">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>



      </div>
    </ScrollArea>
  );
}