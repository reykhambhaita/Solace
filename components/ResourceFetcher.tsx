// components/ResourceFetcher.tsx
"use client";

import { AlertCircle, BookOpen, Code, ExternalLink, Eye, Loader2, MessageSquare, Search, Star, Video } from 'lucide-react';
import { useState } from 'react';

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
      let currentReviewResponse = props.reviewResult;

      // STEP 1: If no review available, trigger one automatically
      if (!currentReviewResponse) {
        console.log('[Resources] No review found, triggering auto-review...');
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
        currentReviewResponse = reviewData.review;

        // Notify parent if callback exists
        if (props.onReviewUpdate) {
          props.onReviewUpdate(reviewData.review, reviewData.metadata);
        }
      }

      // STEP 2: Fetch resources with reviewResponse
      const response = await fetch(`${BACKEND_URL}/api/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeContext: codeContext,
          reviewIR: codeContext.reviewIR,
          sourceCode: sourceCode,
          userIntent: userIntent,
          reviewResponse: currentReviewResponse // REQUIRED NOW
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'github': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'stackoverflow': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'documentation': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'video': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const countByType = (type: string) => {
    return resources.filter(r => r.type === type).length;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/40 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white mb-1">Learning Resources</h2>
          <p className="text-sm text-zinc-400">
            AI-curated resources based on your code context
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 mr-4">
            <input
              type="text"
              placeholder="What do you want to learn? (optional)"
              value={userIntent}
              onChange={(e) => setUserIntent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={fetchResources}
            disabled={isLoading || isAnalyzing || !codeContext}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isLoading ? 'Fetching...' : 'Find Resources'}
          </button>
        </div>

        {/* Pipeline Metadata (shows what actually happened) */}
        {resources.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Baseline Queries:</span>
                <span className="text-emerald-400">{metadata?.pipeline?.baselineQueries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Expanded Queries:</span>
                <span className="text-blue-400">{metadata?.pipeline?.expandedQueries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>LLM-Ranked:</span>
                <span className="text-purple-400">{metadata?.pipeline?.resourcesRanked || 0}/{resources.length}</span>
              </div>
              {metadata?.learningGoal && (
                <div className="pt-2 border-t border-zinc-800 text-zinc-400">
                  Goal: {metadata.learningGoal}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        {resources.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'all'
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
            >
              All ({resources.length})
            </button>
            <button
              onClick={() => setActiveFilter('github')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'github'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5" />
                GitHub ({countByType('github')})
              </div>
            </button>
            <button
              onClick={() => setActiveFilter('stackoverflow')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'stackoverflow'
                ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Stack Overflow ({countByType('stackoverflow')})
              </div>
            </button>
            <button
              onClick={() => setActiveFilter('documentation')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'documentation'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Docs ({countByType('documentation')})
              </div>
            </button>
            <button
              onClick={() => setActiveFilter('video')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'video'
                ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5" />
                Videos ({countByType('video')})
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400 mb-1">Error</p>
              <p className="text-sm text-red-300/80 whitespace-pre-wrap">{error}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-sm text-zinc-400">Searching for relevant resources...</p>
            <p className="text-xs text-zinc-600 mt-2">
              Analyzing code context and fetching from multiple sources
            </p>
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Search className="h-12 w-12 text-zinc-700 mb-4" />
            <p className="text-sm text-zinc-500 mb-2">No resources yet</p>
            <p className="text-xs text-zinc-600 text-center max-w-sm">
              Write some code and click "Find Resources" to get AI-curated learning materials
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResources.map((resource, index) => (
              <div
                key={index}
                className="group rounded-lg border border-border bg-muted/50 p-4 transition-all hover:border-foreground/20 hover:bg-muted"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg border p-2 ${getTypeColor(resource.type)}`}>
                    {getTypeIcon(resource.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-foreground text-sm group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {resource.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-xs font-medium text-emerald-400">
                            {Math.round(resource.relevanceScore * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                      {resource.description}
                    </p>

                    {/* Metadata */}
                    {resource.metadata && (
                      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                        {resource.metadata.stars !== undefined && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5" />
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
                          <div className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {resource.metadata.language}
                          </div>
                        )}
                        {resource.metadata.accepted && (
                          <div className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                            ✓ Accepted
                          </div>
                        )}
                      </div>
                    )}

                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Open Resource
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}