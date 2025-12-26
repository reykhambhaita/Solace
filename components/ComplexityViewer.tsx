/**
 * Complexity Viewer Component
 * Displays Big O complexity analysis results
 */

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Lightbulb,
  TrendingUp,
  Zap
} from "lucide-react";
import { useState } from "react";
import type { ComplexityAnalysisResult } from "../lib/analyzer/complexity-analyzer";

interface ComplexityViewerProps {
  complexity: ComplexityAnalysisResult | null;
  isAnalyzing?: boolean;
  error?: string | null;
}

// Complexity color mapping
const COMPLEXITY_COLORS: Record<string, string> = {
  'O(1)': 'text-green-400 bg-green-500/20 border-green-500/50',
  'O(log n)': 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50',
  'O(n)': 'text-blue-400 bg-blue-500/20 border-blue-500/50',
  'O(n log n)': 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
  'O(n²)': 'text-orange-400 bg-orange-500/20 border-orange-500/50',
  'O(n³)': 'text-red-400 bg-red-500/20 border-red-500/50',
  'O(2^n)': 'text-purple-400 bg-purple-500/20 border-purple-500/50',
};

function getComplexityColor(complexity: string): string {
  for (const [key, color] of Object.entries(COMPLEXITY_COLORS)) {
    if (complexity.includes(key)) {
      return color;
    }
  }
  return 'text-zinc-400 bg-zinc-500/20 border-zinc-500/50';
}



export function ComplexityViewer({ complexity, isAnalyzing, error }: ComplexityViewerProps) {
  const [timeOpen, setTimeOpen] = useState(true);
  const [spaceOpen, setSpaceOpen] = useState(true);
  const [optimizationsOpen, setOptimizationsOpen] = useState(true);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-zinc-400 mb-2">Complexity Analysis Error</p>
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
          <p className="text-zinc-400">Analyzing complexity...</p>
        </div>
      </div>
    );
  }

  if (!complexity) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Zap className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">No complexity analysis</p>
          <p className="text-sm text-zinc-600">Write some code to analyze its complexity</p>
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
            <span className="text-sm font-medium text-zinc-300">Complexity Analysis Complete</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Clock className="h-3 w-3" />
            {complexity.analysisTime.toFixed(1)}ms
          </div>
        </div>

        {/* Time Complexity */}
        <Collapsible open={timeOpen} onOpenChange={setTimeOpen}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                <span className="font-medium text-zinc-200">Time Complexity</span>
              </div>
              {timeOpen ? (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4">
                {/* Worst Case */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Worst Case:</span>
                    <Badge className={getComplexityColor(complexity.timeComplexity.worstCase.bigO)}>
                      {complexity.timeComplexity.worstCase.bigO}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {complexity.timeComplexity.worstCase.explanation}
                  </p>

                  {/* Breakdown */}
                  {complexity.timeComplexity.worstCase.breakdown.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <span className="text-xs font-medium text-zinc-500">Breakdown:</span>
                      {complexity.timeComplexity.worstCase.breakdown.map((item, idx) => (
                        <div key={idx} className="p-3 rounded bg-zinc-800/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">{item.location}</span>
                            <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                              {item.complexity}
                            </Badge>
                          </div>
                          <div className="text-xs text-zinc-300 font-medium">{item.operation}</div>
                          <div className="text-xs text-zinc-500">{item.reasoning}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input Sizes */}
                {complexity.inputSizes.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-xs font-medium text-zinc-500 mb-2 block">Input Parameters:</span>
                    <div className="flex flex-wrap gap-2">
                      {complexity.inputSizes.map((input, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded bg-zinc-800/30">
                          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400 font-mono">
                            {input.name}
                          </Badge>
                          <span className="text-xs text-zinc-500">{input.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dominant Operations */}
                {complexity.dominantOperations.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-xs font-medium text-zinc-500 mb-2 block">Dominant Operations:</span>
                    {complexity.dominantOperations.map((op, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-zinc-800/30 mb-2">
                        <div className="flex-1">
                          <div className="text-xs text-zinc-300 font-medium">{op.type}</div>
                          <div className="text-xs text-zinc-500">{op.location}</div>
                        </div>
                        <Badge className={getComplexityColor(op.complexity)}>
                          {op.complexity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Space Complexity */}
        <Collapsible open={spaceOpen} onOpenChange={setSpaceOpen}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-purple-400" />
                <span className="font-medium text-zinc-200">Space Complexity</span>
              </div>
              {spaceOpen ? (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Auxiliary Space:</span>
                  <Badge className={getComplexityColor(complexity.spaceComplexity.bigO)}>
                    {complexity.spaceComplexity.bigO}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500">
                  {complexity.spaceComplexity.explanation}
                </p>

                {/* Breakdown */}
                {complexity.spaceComplexity.breakdown.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <span className="text-xs font-medium text-zinc-500">Memory Usage:</span>
                    {complexity.spaceComplexity.breakdown.map((item, idx) => (
                      <div key={idx} className="p-3 rounded bg-zinc-800/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">{item.location}</span>
                          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                            {item.complexity}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-300 font-medium">{item.operation}</div>
                        <div className="text-xs text-zinc-500">{item.reasoning}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Optimization Suggestions */}
        {
          complexity.optimizationSuggestions.length > 0 && (
            <Collapsible open={optimizationsOpen} onOpenChange={setOptimizationsOpen}>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                    <span className="font-medium text-zinc-200">Optimization Suggestions</span>
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                      {complexity.optimizationSuggestions.length}
                    </Badge>
                  </div>
                  {optimizationsOpen ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    {complexity.optimizationSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-3 rounded bg-zinc-800/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400">Current:</span>
                          <Badge variant="outline" className="text-xs border-red-700 text-red-400">
                            {suggestion.current}
                          </Badge>
                          <span className="text-zinc-600">→</span>
                          <span className="text-xs text-green-400">Improved:</span>
                          <Badge variant="outline" className="text-xs border-green-700 text-green-400">
                            {suggestion.improved}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-400">
                          <span className="font-medium text-zinc-300">Technique:</span> {suggestion.technique}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        }
      </div >
    </ScrollArea >
  );
}