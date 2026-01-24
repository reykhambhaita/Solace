// components/ResourceFetcher.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Code,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Video,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface Resource {
  type: 'github' | 'stackoverflow' | 'documentation' | 'video';
  title: string;
  url: string;
  description: string;
  relevanceScore: number;
  metadata?: {
    stars?: number;
    views?: number;
    answers?: number;
    language?: string;
    votes?: number;
    accepted?: boolean;
  };
}

interface ResourceFetcherProps {
  codeContext: any;
  isAnalyzing: boolean;
  sourceCode: string;
  reviewResult?: any;
  onReviewUpdate?: (review: any, metadata: any) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export default function ResourceFetcher(props: ResourceFetcherProps) {
  const { codeContext, isAnalyzing, sourceCode } = props;
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'github' | 'stackoverflow' | 'documentation' | 'video'>('all');
  const [userIntent, setUserIntent] = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  const fetchResources = async () => {
    if (!codeContext) {
      setError("No code context available. Please write some code first.");
      return;
    }

    if (!codeContext.reviewIR) {
      setError("Code analysis incomplete. Please wait for analysis to finish.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResources([]);
    setMetadata(null);

    try {
      // Always fetch a fresh review for the current code to avoid stale data
      console.log('[Resources] Fetching fresh review for current code...');
      const reviewRes = await fetch(`${BACKEND_URL}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewIR: codeContext.reviewIR,
          codeContext: codeContext,
          fileContents: sourceCode
        })
      });

      if (!reviewRes.ok) {
        const errorData = await reviewRes.json().catch(() => ({}));
        throw new Error(`Review Failed: ${errorData.error || reviewRes.statusText}`);
      }

      const reviewData = await reviewRes.json();
      const currentReviewResponse = reviewData.review;

      if (props.onReviewUpdate) {
        props.onReviewUpdate(reviewData.review, reviewData.metadata);
      }

      const response = await fetch(`${BACKEND_URL}/api/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeContext: codeContext,
          reviewIR: codeContext.reviewIR,
          sourceCode: sourceCode,
          userIntent: userIntent,
          reviewResponse: currentReviewResponse
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Resource Fetch Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.resources) {
        setResources(data.resources);
        setMetadata(data.metadata);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message.includes('Failed to fetch')
          ? `Connection Error: Cannot connect to backend server.\n\nMake sure the backend is running:\n  cd solace-backend\n  npm start\n\nBackend URL: ${BACKEND_URL}`
          : err.message
        : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResources = activeFilter === 'all'
    ? resources
    : resources.filter(r => r.type === activeFilter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'github': return <Code className="h-4 w-4" />;
      case 'stackoverflow': return <MessageSquare className="h-4 w-4" />;
      case 'documentation': return <BookOpen className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'github': return {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-500',
        gradient: 'from-purple-500 to-violet-500',
      };
      case 'stackoverflow': return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        text: 'text-orange-500',
        gradient: 'from-orange-500 to-amber-500',
      };
      case 'documentation': return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-500',
        gradient: 'from-blue-500 to-cyan-500',
      };
      case 'video': return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-500',
        gradient: 'from-red-500 to-rose-500',
      };
      default: return {
        bg: 'bg-muted/50',
        border: 'border-border',
        text: 'text-muted-foreground',
        gradient: 'from-gray-500 to-gray-600',
      };
    }
  };

  const countByType = (type: string) => {
    return resources.filter(r => r.type === type).length;
  };

  const filterButtons = [
    { id: 'all' as const, label: 'All', icon: Sparkles, count: resources.length },
    { id: 'github' as const, label: 'GitHub', icon: Code, count: countByType('github') },
    { id: 'stackoverflow' as const, label: 'Stack Overflow', icon: MessageSquare, count: countByType('stackoverflow') },
    { id: 'documentation' as const, label: 'Docs', icon: BookOpen, count: countByType('documentation') },
    { id: 'video' as const, label: 'Videos', icon: Video, count: countByType('video') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border/50 glass-subtle p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-green-500 shadow-sm">
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Learning Resources</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-curated resources based on your code context
          </p>
        </div>

        {/* Search Input & Button */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="What do you want to learn? (optional)"
              value={userIntent}
              onChange={(e) => setUserIntent(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-muted-foreground transition-all"
            />
          </div>
          <Button
            onClick={fetchResources}
            disabled={isLoading || isAnalyzing || !codeContext}
            variant="neon"
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isLoading ? 'Fetching...' : 'Find Resources'}
          </Button>
        </div>

        {/* Pipeline Metadata */}
        {resources.length > 0 && metadata && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-3"
          >
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {metadata?.pipeline?.baselineQueries || 0}
                </div>
                <span className="text-muted-foreground">Baseline Queries</span>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">
                  {metadata?.pipeline?.expandedQueries || 0}
                </div>
                <span className="text-muted-foreground">Expanded</span>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-500">
                  {metadata?.pipeline?.resourcesRanked || 0}
                </div>
                <span className="text-muted-foreground">Ranked</span>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-500">
                  {resources.length}
                </div>
                <span className="text-muted-foreground">Results</span>
              </div>
            </div>
            {metadata?.learningGoal && (
              <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span>Goal: {metadata.learningGoal}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Filters */}
        {resources.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {filterButtons.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                  ${activeFilter === filter.id
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
                  }
                `}
              >
                <filter.icon className="h-3.5 w-3.5" />
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-1 ${activeFilter === filter.id ? 'text-emerald-400' : 'text-muted-foreground/60'}`}>
                    ({filter.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 border border-red-500/20"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-500 mb-1">Error</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{error}</p>
                </div>
              </div>
            </motion.div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="relative mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/25">
                    <Search className="h-8 w-8 text-white animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Finding Resources
                </h3>
                <p className="text-sm text-muted-foreground">
                  Searching GitHub, Stack Overflow, docs, and more...
                </p>
              </motion.div>
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-sm"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Resources Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Write some code and click "Find Resources" to get AI-curated learning materials.
                </p>
              </motion.div>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {filteredResources.map((resource, index) => {
                const styles = getTypeStyles(resource.type);

                return (
                  <motion.div
                    key={`${resource.type}-${resource.url}-${index}`}
                    variants={itemVariants}
                    className="group glass rounded-xl p-4 transition-all duration-300 hover:border-foreground/10 card-hover"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${styles.gradient} shadow-lg`}>
                        {getTypeIcon(resource.type)}
                        <span className="sr-only">{resource.type}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title & Score */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2 group-hover:text-emerald-500 transition-colors">
                            {resource.title}
                          </h3>
                          <Badge variant="success" className="shrink-0 text-[10px]">
                            {Math.round(resource.relevanceScore * 100)}%
                          </Badge>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                          {resource.description}
                        </p>

                        {/* Metadata */}
                        {resource.metadata && (
                          <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                            {resource.metadata.stars !== undefined && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 text-yellow-500" />
                                {resource.metadata.stars.toLocaleString()}
                              </div>
                            )}
                            {resource.metadata.views !== undefined && (
                              <div className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {resource.metadata.views.toLocaleString()}
                              </div>
                            )}
                            {resource.metadata.answers !== undefined && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5" />
                                {resource.metadata.answers} answers
                              </div>
                            )}
                            {resource.metadata.votes !== undefined && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5" />
                                {resource.metadata.votes} votes
                              </div>
                            )}
                            {resource.metadata.language && (
                              <Badge variant="outline" className="text-[10px] py-0 h-5">
                                {resource.metadata.language}
                              </Badge>
                            )}
                            {resource.metadata.accepted && (
                              <Badge variant="success" className="text-[10px] py-0 h-5">
                                Accepted
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Link */}
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                          Open Resource
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
