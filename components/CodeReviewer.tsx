/**
 * Code Review Viewer Component
 * Displays LLM-powered code review from Qwen 3-32B with premium styling
 */

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Lightbulb,
  Shield,
  Sparkles,
  Target,
  XCircle,
  Zap,
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

export function CodeReviewViewer({ review, metadata, isLoading, error }: CodeReviewViewerProps) {
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Review Failed</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground/60">
            Make sure your GROQ_API_KEY is set in the backend environment
          </p>
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
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25">
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Analyzing with Qwen 3-32B
          </h3>
          <p className="text-sm text-muted-foreground">
            Deep code analysis in progress...
          </p>
          <div className="flex items-center justify-center gap-1 mt-3">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Review Available</h3>
          <p className="text-sm text-muted-foreground">
            Click "Review" to get AI-powered code analysis with insights and recommendations.
          </p>
        </motion.div>
      </div>
    );
  }

  const sections = [
    {
      id: 'complexity',
      title: 'Complexity Analysis',
      icon: Target,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/20',
      iconColor: 'text-blue-500',
    },
    {
      id: 'purpose',
      title: 'Purpose Understanding',
      icon: Lightbulb,
      gradient: 'from-yellow-500 to-amber-500',
      bg: 'bg-yellow-500/5',
      border: 'border-yellow-500/20',
      iconColor: 'text-yellow-500',
    },
    {
      id: 'behavioral',
      title: 'Behavioral Correctness',
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-500',
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      iconColor: 'text-emerald-500',
    },
    {
      id: 'risks',
      title: 'Hidden Risks',
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-red-500',
      bg: 'bg-orange-500/5',
      border: 'border-orange-500/20',
      iconColor: 'text-orange-500',
    },
    {
      id: 'edgeCases',
      title: 'Edge Cases & Boundaries',
      icon: FileWarning,
      gradient: 'from-purple-500 to-violet-500',
      bg: 'bg-purple-500/5',
      border: 'border-purple-500/20',
      iconColor: 'text-purple-500',
    },
    {
      id: 'summary',
      title: 'Summary',
      icon: Shield,
      gradient: 'from-cyan-500 to-teal-500',
      bg: 'bg-cyan-500/5',
      border: 'border-cyan-500/20',
      iconColor: 'text-cyan-500',
    },
  ];

  // Parse the review content
  const parseReviewContent = () => {
    try {
      const cleanedRaw = review.raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const jsonMatch = cleanedRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch {
      return null;
    }
  };

  const parsedContent = parseReviewContent();

  return (
    <ScrollArea className="h-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-6 space-y-6"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between pb-4 border-b border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">AI Code Review</span>
              {metadata && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[10px] py-0 h-5">
                    Qwen 3-32B
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {metadata.tokensUsed.toLocaleString()} tokens
                  </span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="cyan" className="gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </Badge>
        </motion.div>

        {/* Review Sections */}
        {parsedContent ? (
          <div className="space-y-4">
            {sections.map((section, index) => {
              const content = parsedContent[section.id];
              if (!content) return null;

              return (
                <motion.div
                  key={section.id}
                  variants={itemVariants}
                  className={`glass rounded-xl overflow-hidden ${section.border} border`}
                >
                  {/* Section Header */}
                  <div className={`flex items-center gap-3 px-4 py-3 ${section.bg}`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${section.gradient} shadow-sm`}>
                      <section.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                  </div>
                  {/* Section Content */}
                  <div className="px-4 py-3">
                    <p className="text-sm text-foreground leading-relaxed">
                      {content}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Fallback: Raw display */
          <motion.div variants={itemVariants} className="glass rounded-xl p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {review.raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()}
            </pre>
          </motion.div>
        )}

        {/* Token Usage */}
        {metadata && (
          <motion.div variants={itemVariants} className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-foreground">Token Usage</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {metadata.promptTokens.toLocaleString()}
                </div>
                <span className="text-xs text-muted-foreground">Prompt</span>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {metadata.completionTokens.toLocaleString()}
                </div>
                <span className="text-xs text-muted-foreground">Completion</span>
              </div>
              <div className="glass rounded-xl p-4 text-center bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20">
                <div className="text-2xl font-bold text-cyan-500">
                  {metadata.tokensUsed.toLocaleString()}
                </div>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Reviewed at {new Date(metadata.timestamp).toLocaleString()}
            </p>
          </motion.div>
        )}
      </motion.div>
    </ScrollArea>
  );
}
