// components/TranslationViewer.tsx

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Editor } from "@monaco-editor/react";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Clock, Info, Languages, Loader2, XCircle } from "lucide-react";

interface ValidationIssue {
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
}

interface ComparisonReport {
  structure: {
    functions: { expected: number; actual: number; match: boolean };
    classes: { expected: number; actual: number; match: boolean };
    linesOfCode: { expected: number; actual: number; acceptable: boolean };
  };
  behavior: {
    determinism: { expected: boolean; actual: boolean; match: boolean };
    executionModel: { expected: string; actual: string; acceptable: boolean };
    sideEffects: { expected: string; actual: string; match: boolean };
  };
  quality: {
    testability: { expected: number; actual: number; delta: number };
    complexity: { expected: number; actual: number; delta: number };
  };
  elements: {
    decisionPoints: { expected: number; actual: number; acceptable: boolean };
    magicValues: { expected: number; actual: number; preserved: number };
  };
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  critical: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  comparisonReport: ComparisonReport;
}

interface TranslationViewerProps {
  sourceCode: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedCode: string | null;
  warnings: string[];
  validation?: ValidationResult;
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
  validation,
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

          {validation && (
            validation.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : validation.critical.length > 0 ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          {validation && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Quality:</span>
              <div className="flex items-center gap-1">
                <Progress
                  value={validation.score * 100}
                  className="h-2 w-16"
                />
                <span className="text-xs text-zinc-400 w-10 text-right">
                  {Math.round(validation.score * 100)}%
                </span>
              </div>
            </div>
          )}

          {metadata && (
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Clock className="h-3 w-3" />
              {metadata.tokensUsed.toLocaleString()} tokens
            </div>
          )}
        </div>
      </div>

      {/* Validation Summary */}
      {validation && (
        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/30">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {validation.critical.length > 0 && (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-3 w-3" />
                <span>{validation.critical.length} Critical</span>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                <span>{validation.warnings.length} Warning{validation.warnings.length > 1 ? 's' : ''}</span>
              </div>
            )}
            {validation.info.length > 0 && (
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="h-3 w-3" />
                <span>{validation.info.length} Info</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings Banner (if any) */}
      {warnings && warnings.length > 0 && (
        <div className="px-6 py-2 border-b border-zinc-800 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-medium text-yellow-400">Translation Notes:</span>
              <div className="mt-1 space-y-0.5">
                {warnings.slice(0, 3).map((warning, idx) => (
                  <p key={idx} className="text-xs text-yellow-300/80">
                    • {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Scroll */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Validation Details */}
          {validation && validation.comparisonReport && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300">Validation Report</h3>

              {/* Structure */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-400">Structure</h4>
                <div className="grid grid-cols-3 gap-3">
                  <ValidationItem
                    label="Functions"
                    expected={validation.comparisonReport.structure.functions.expected}
                    actual={validation.comparisonReport.structure.functions.actual}
                    isValid={validation.comparisonReport.structure.functions.match}
                  />
                  <ValidationItem
                    label="Classes"
                    expected={validation.comparisonReport.structure.classes.expected}
                    actual={validation.comparisonReport.structure.classes.actual}
                    isValid={validation.comparisonReport.structure.classes.match}
                  />
                  <ValidationItem
                    label="Lines"
                    expected={validation.comparisonReport.structure.linesOfCode.expected}
                    actual={validation.comparisonReport.structure.linesOfCode.actual}
                    isValid={validation.comparisonReport.structure.linesOfCode.acceptable}
                    showDelta
                  />
                </div>
              </div>

              {/* Behavior */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-400">Behavior</h4>
                <div className="grid grid-cols-2 gap-3">
                  <ValidationItem
                    label="Determinism"
                    expected={validation.comparisonReport.behavior.determinism.expected ? 'Yes' : 'No'}
                    actual={validation.comparisonReport.behavior.determinism.actual ? 'Yes' : 'No'}
                    isValid={validation.comparisonReport.behavior.determinism.match}
                  />
                  <ValidationItem
                    label="Execution Model"
                    expected={validation.comparisonReport.behavior.executionModel.expected}
                    actual={validation.comparisonReport.behavior.executionModel.actual}
                    isValid={validation.comparisonReport.behavior.executionModel.acceptable}
                  />
                </div>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-400">Quality Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <ValidationItem
                    label="Complexity"
                    expected={validation.comparisonReport.quality.complexity.expected}
                    actual={validation.comparisonReport.quality.complexity.actual}
                    isValid={validation.comparisonReport.quality.complexity.delta <= 2}
                    showDelta
                  />
                  <ValidationItem
                    label="Testability"
                    expected={validation.comparisonReport.quality.testability.expected}
                    actual={validation.comparisonReport.quality.testability.actual}
                    isValid={validation.comparisonReport.quality.testability.delta <= 20}
                    showDelta
                  />
                </div>
              </div>

              {/* Issues */}
              {(validation.critical.length > 0 || validation.warnings.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-400">Issues</h4>
                  <div className="space-y-1">
                    {validation.critical.map((issue, idx) => (
                      <IssueItem key={idx} issue={issue} />
                    ))}
                    {validation.warnings.map((issue, idx) => (
                      <IssueItem key={idx} issue={issue} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Translated Code */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-300">Translated Code</h3>
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <Editor
                height="400px"
                language={targetLanguage}
                value={translatedCode}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ValidationItem({
  label,
  expected,
  actual,
  isValid,
  showDelta = false
}: {
  label: string;
  expected: string | number;
  actual: string | number;
  isValid: boolean;
  showDelta?: boolean;
}) {
  const delta = showDelta && typeof expected === 'number' && typeof actual === 'number'
    ? actual - expected
    : null;

  return (
    <div className={`p-2 rounded border ${isValid
        ? 'bg-green-500/5 border-green-500/30'
        : 'bg-red-500/5 border-red-500/30'
      }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400">{label}</span>
        {isValid ? (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        ) : (
          <XCircle className="h-3 w-3 text-red-500" />
        )}
      </div>
      <div className="flex items-baseline gap-2 text-xs">
        <span className="text-zinc-500">{expected}</span>
        <ArrowRight className="h-2 w-2 text-zinc-600" />
        <span className={isValid ? 'text-green-400' : 'text-red-400'}>{actual}</span>
        {delta !== null && (
          <span className="text-zinc-600 text-[10px]">
            ({delta > 0 ? '+' : ''}{delta})
          </span>
        )}
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: ValidationIssue }) {
  const Icon = issue.type === 'critical' ? XCircle : issue.type === 'warning' ? AlertTriangle : Info;
  const color = issue.type === 'critical' ? 'text-red-400 bg-red-500/10' :
    issue.type === 'warning' ? 'text-yellow-400 bg-yellow-500/10' :
      'text-blue-400 bg-blue-500/10';

  return (
    <div className={`flex items-start gap-2 p-2 rounded text-xs ${color}`}>
      <Icon className="h-3 w-3 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p>{issue.message}</p>
        {issue.expected !== undefined && issue.actual !== undefined && (
          <p className="text-[10px] opacity-70 mt-0.5">
            Expected: {issue.expected}, Got: {issue.actual}
          </p>
        )}
      </div>
    </div>
  );
}