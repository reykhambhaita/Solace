// components/TranslationViewer.tsx

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Editor } from "@monaco-editor/react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  Info,
  Languages,
  Loader2,
  XCircle,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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
  const { resolvedTheme } = useTheme();

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Translation Failed</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/25">
              <Languages className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Translating {sourceLanguage.toUpperCase()} to {targetLanguage.toUpperCase()}
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered code translation in progress...
          </p>
          <div className="flex items-center justify-center gap-1 mt-3">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!translatedCode) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
            <Languages className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Translate</h3>
          <p className="text-sm text-muted-foreground">
            Select your target language and click "Translate" to convert your code.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-3 border-b border-border/50 glass-subtle"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="info">{sourceLanguage.toUpperCase()}</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="success">{targetLanguage.toUpperCase()}</Badge>
          </div>

          {validation && (
            <div className="flex items-center gap-1.5">
              {validation.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : validation.critical.length > 0 ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {validation && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quality:</span>
              <div className="flex items-center gap-2">
                <Progress
                  value={validation.score * 100}
                  className="h-2 w-20"
                />
                <span className={`text-xs font-bold ${
                  validation.score >= 0.8 ? 'text-emerald-500' :
                  validation.score >= 0.6 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {Math.round(validation.score * 100)}%
                </span>
              </div>
            </div>
          )}

          {metadata && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {metadata.tokensUsed.toLocaleString()} tokens
            </div>
          )}
        </div>
      </motion.div>

      {/* Validation Summary */}
      {validation && (validation.critical.length > 0 || validation.warnings.length > 0 || validation.info.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-6 py-2 border-b border-border/50 glass-subtle"
        >
          <div className="flex gap-4 text-xs">
            {validation.critical.length > 0 && (
              <div className="flex items-center gap-1.5 text-red-500">
                <XCircle className="h-3 w-3" />
                {validation.critical.length} Critical
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="flex items-center gap-1.5 text-yellow-500">
                <AlertTriangle className="h-3 w-3" />
                {validation.warnings.length} Warning{validation.warnings.length > 1 ? 's' : ''}
              </div>
            )}
            {validation.info.length > 0 && (
              <div className="flex items-center gap-1.5 text-blue-500">
                <Info className="h-3 w-3" />
                {validation.info.length} Info
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Warnings Banner */}
      {warnings && warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-6 py-3 border-b border-border/50 bg-yellow-500/5"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                Translation Notes
              </span>
              <div className="mt-1 space-y-0.5">
                {warnings.slice(0, 3).map((warning, idx) => (
                  <p key={`warning-${warning.slice(0, 20)}-${idx}`} className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-6 space-y-6"
        >
          {/* Validation Report */}
          {validation && validation.comparisonReport && (
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-foreground">Validation Report</h3>
              </div>

              {/* Structure */}
              <div className="glass rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Structure
                </h4>
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
              <div className="glass rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Behavior
                </h4>
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
              <div className="glass rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quality Metrics
                </h4>
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
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Issues
                  </h4>
                  <div className="space-y-2">
                    {validation.critical.map((issue, idx) => (
                      <IssueItem key={`critical-${issue.category}-${idx}`} issue={issue} />
                    ))}
                    {validation.warnings.map((issue, idx) => (
                      <IssueItem key={`warning-${issue.category}-${idx}`} issue={issue} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Translated Code */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-foreground">Translated Code</h3>
            </div>
            <div className="glass rounded-xl overflow-hidden border border-border/50">
              <Editor
                height="400px"
                language={targetLanguage}
                value={translatedCode}
                theme={resolvedTheme === 'dark' ? "vs-dark" : "light"}
                options={{
                  readOnly: false,
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  fontLigatures: true,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  padding: { top: 16, bottom: 16 },
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  renderLineHighlight: "all",
                  scrollbar: {
                    vertical: "visible",
                    useShadows: false,
                    verticalScrollbarSize: 10,
                  },
                  overviewRulerLanes: 0,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
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
    <div className={`p-3 rounded-lg border transition-colors ${
      isValid
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {isValid ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-red-500" />
        )}
      </div>
      <div className="flex items-baseline gap-2 text-xs">
        <span className="text-muted-foreground">{expected}</span>
        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />
        <span className={`font-medium ${isValid ? 'text-emerald-500' : 'text-red-500'}`}>
          {actual}
        </span>
        {delta !== null && (
          <span className="text-muted-foreground/60 text-[10px]">
            ({delta > 0 ? '+' : ''}{delta})
          </span>
        )}
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: ValidationIssue }) {
  const Icon = issue.type === 'critical' ? XCircle : issue.type === 'warning' ? AlertTriangle : Info;
  const styles = {
    critical: 'text-red-500 bg-red-500/10 border-red-500/20',
    warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${styles[issue.type]}`}>
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{issue.message}</p>
        {issue.expected !== undefined && issue.actual !== undefined && (
          <p className="opacity-70 mt-0.5">
            Expected: {issue.expected}, Got: {issue.actual}
          </p>
        )}
      </div>
    </div>
  );
}
