/**
 * Code Context Viewer Component
 * Displays code analysis results in a readable format with premium styling
 */

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Binary,
  Boxes,
  Clock,
  Code2,
  Cpu,
  FileCode,
  Gauge,
  GitBranch,
  Layers,
  Sparkles,
  Target,
  TestTube,
  Zap
} from "lucide-react";
import type { CodeContext } from "../lib/analyzer/context-detector";

interface CodeContextViewerProps {
  context: CodeContext | null;
  isAnalyzing?: boolean;
  error?: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function CodeContextViewer({ context, isAnalyzing, error }: CodeContextViewerProps) {
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Analysis Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </motion.div>
      </div>
    );
  }



  if (!context) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
            <Code2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Code to Analyze</h3>
          <p className="text-sm text-muted-foreground">
            Write some code in the editor to see detailed context analysis.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-6 space-y-6"
      >
        {/* Header Stats */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between pb-4 border-b border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-emerald-500/20">
              <Sparkles className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">Analysis Complete</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {context.analysisTime.toFixed(1)}ms
              </div>
            </div>
          </div>
          <Badge variant="success" className="gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Live
          </Badge>
        </motion.div>

        {/* Language & Identity */}
        <motion.section variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">Language & Identity</h3>
          </div>
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Language</span>
              <div className="flex items-center gap-2">
                <Badge variant="info">{context.language.language.toUpperCase()}</Badge>
                {context.language.dialect && (
                  <Badge variant="outline">{context.language.dialect}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${context.language.confidence * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="h-full bg-linear-to-r from-blue-600 to-blue-400"
                  />
                </div>
                <span className="text-xs font-medium text-foreground">
                  {Math.round(context.language.confidence * 100)}%
                </span>
              </div>
            </div>
            {context.codeType.type !== 'unknown' && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="purple" className="gap-1.5">
                  {context.codeType.testType && <TestTube className="h-3 w-3" />}
                  {context.codeType.type}
                </Badge>
              </div>
            )}
          </div>
        </motion.section>

        {/* Semantic Intent */}
        <motion.section variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-foreground">Semantic Intent</h3>
          </div>
          <div className="glass rounded-xl p-4 space-y-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Suggested Role
              </span>
              <p className="text-sm font-medium text-foreground mt-1">
                {context.llmContext.role}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Primary Intent
              </span>
              <p className="text-sm text-foreground mt-1 leading-relaxed">
                {context.llmContext.intent.semanticDescription}
              </p>
            </div>
            {context.llmContext.promptHints.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Guidance Points
                </span>
                <ul className="mt-2 space-y-1.5">
                  {context.llmContext.promptHints.map((hint, idx) => (
                    <li
                      key={`hint-${hint.slice(0, 20)}-${idx}`}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Zap className="h-3 w-3 mt-1 text-yellow-500 shrink-0" />
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.section>

        {/* Paradigm & Structure */}
        <motion.section variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-sky-500" />
            <h3 className="text-sm font-semibold text-foreground">Paradigm & Structure</h3>
          </div>
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-xs text-muted-foreground">Primary</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="warning">{context.paradigm.primary.paradigm}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(context.paradigm.primary.score)}%
                  </span>
                </div>
              </div>
              {context.paradigm.secondary && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs text-muted-foreground">Secondary</span>
                  <div className="mt-1">
                    <Badge variant="outline">{context.paradigm.secondary.paradigm}</Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Pattern Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <Layers className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                <div className="text-lg font-bold text-foreground">
                  {context.paradigm.patterns.classes}
                </div>
                <span className="text-xs text-muted-foreground">Classes</span>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <Binary className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                <div className="text-lg font-bold text-foreground">
                  {context.paradigm.patterns.functions}
                </div>
                <span className="text-xs text-muted-foreground">Functions</span>
              </div>
              <div className="text-center p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <GitBranch className="h-4 w-4 mx-auto text-cyan-500 mb-1" />
                <div className="text-lg font-bold text-foreground">
                  {context.paradigm.patterns.loops}
                </div>
                <span className="text-xs text-muted-foreground">Loops</span>
              </div>
            </div>

            {/* Class Names */}
            {context.paradigm.details.classNames?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Classes</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {context.paradigm.details.classNames.map((name, idx) => (
                    <code
                      key={`class-${name}-${idx}`}
                      className="px-2 py-0.5 text-xs font-mono bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-md border border-indigo-500/20"
                    >
                      {name}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Function Names */}
            {context.paradigm.details.functionNames?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Functions</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {context.paradigm.details.functionNames.map((name, idx) => (
                    <code
                      key={`fn-${name}-${idx}`}
                      className="px-2 py-0.5 text-xs font-mono bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-md border border-blue-500/20"
                    >
                      {name}()
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Language Fitness */}
            {context.paradigm.fitnessScore && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-sm text-muted-foreground">Language Fit Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${context.paradigm.fitnessScore * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className={`h-full ${context.paradigm.fitnessScore > 0.8
                        ? 'bg-linear-to-r from-emerald-500 to-green-500'
                        : 'bg-linear-to-r from-yellow-500 to-orange-500'
                        }`}
                    />
                  </div>
                  <span className={`text-xs font-bold ${context.paradigm.fitnessScore > 0.8 ? 'text-blue-500' : 'text-yellow-500'
                    }`}>
                    {Math.round(context.paradigm.fitnessScore * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Dependencies */}
        {(context.libraries.frameworks.length > 0 || context.libraries.libraries.length > 0) && (
          <motion.section variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-foreground">Dependencies</h3>
            </div>
            <div className="glass rounded-xl p-4 space-y-4">
              {context.libraries.frameworks.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Frameworks
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {context.libraries.frameworks.map((fw, idx) => (
                      <Badge key={`fw-${fw.name}-${idx}`} variant="success" className="gap-1.5">
                        {fw.name}
                        <span className="text-[10px] opacity-70">
                          {Math.round(fw.confidence * 100)}%
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {context.libraries.libraries.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Libraries
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {context.libraries.libraries.map((lib, idx) => (
                      <Badge key={`lib-${lib.name}-${idx}`} variant="outline">
                        {lib.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Behavior & Quality */}
        <motion.section variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-foreground">Behavior & Quality</h3>
          </div>
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Determinism</span>
              <Badge variant={context.libraries.externalInteractions.isDeterministic ? "success" : "warning"}>
                {context.libraries.externalInteractions.isDeterministic ? "Deterministic" : "Non-deterministic"}
              </Badge>
            </div>
            {context.reviewIR?.quality && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Control Flow Complexity</span>
                  <span className="text-sm font-medium text-foreground">
                    {context.reviewIR.quality.controlFlowComplexity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Testability Score</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${context.reviewIR.quality.testability}%` }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="h-full bg-linear-to-r from-indigo-500 to-blue-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {context.reviewIR.quality.testability}/100
                    </span>
                  </div>
                </div>
              </>
            )}
            {context.reviewIR?.elements.magicValues.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-sm text-yellow-500">Magic Values Detected</span>
                <Badge variant="warning">
                  {context.reviewIR.elements.magicValues.length} found
                </Badge>
              </div>
            )}
          </div>
        </motion.section>
      </motion.div>
    </ScrollArea>
  );
}
