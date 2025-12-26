"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeComplexity, type ComplexityAnalysisResult } from "@/lib/analyzer/complexity-analyzer";
import { useCodeContext } from "@/lib/analyzer/context-detector";
import {
  syntaxNodeToAST,
  useTreeSitter,
  type ASTNode,
  type SupportedLanguage,
} from "@/lib/tree-sitter/use-tree-sitter";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { type CSTNode } from "../lib/analyzer/semantic-ir";
import { CodeContextViewer } from "./CodeContextViewer";
import { ComplexityViewer } from "./ComplexityViewer";
// Map language names to tree-sitter supported languages
const languageMap: Record<string, SupportedLanguage | null> = {
  javascript: "typescript",
  typescript: "typescript",
  python: "python",
  go: "go",
  rust: "rust",
  java: "java",
  cpp: "cpp",
  c: "c",
  ruby: "ruby",
  php: "php",
};

// Language display info
const languageInfo: Record<SupportedLanguage, { name: string; color: string }> = {
  typescript: { name: "TypeScript", color: "bg-blue-500" },
  python: { name: "Python", color: "bg-yellow-500" },
  go: { name: "Go", color: "bg-cyan-500" },
  rust: { name: "Rust", color: "bg-orange-500" },
  java: { name: "Java", color: "bg-green-500" },
  cpp: { name: "C++", color: "bg-red-500" },
  c: { name: "C", color: "bg-purple-500" },
  ruby: { name: "Ruby", color: "bg-pink-500" },
  php: { name: "PHP", color: "bg-indigo-500" },
};

// AST Tree Node Component with memoization
const ASTTreeNode = memo(({
  node,
  depth = 0,
  defaultExpanded = true,
}: {
  node: ASTNode;
  depth?: number;
  defaultExpanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded && depth < 3);
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;

  const nodeTypeColor = node.isNamed ? "text-blue-400" : "text-zinc-500";

  return (
    <div className="select-none">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div
          className="group flex items-center gap-1 py-0.5 hover:bg-zinc-800/50 rounded-sm cursor-pointer"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger className="p-0.5 hover:bg-zinc-800 rounded">
              {isExpanded ? (
                <ChevronDownIcon className="size-3 text-zinc-500" />
              ) : (
                <ChevronRightIcon className="size-3 text-zinc-500" />
              )}
            </CollapsibleTrigger>
          ) : (
            <span className="w-4" />
          )}

          <span className={`font-mono text-xs font-medium ${nodeTypeColor}`}>
            {node.type}
          </span>

          {isLeaf && node.text && node.text.length < 50 && (
            <span className="text-xs text-emerald-400 font-mono truncate max-w-[200px]">
              {`"${node.text}"`}
            </span>
          )}

          <span className="text-[10px] text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {node.startPosition.row}:{node.startPosition.column} - {node.endPosition.row}:
            {node.endPosition.column}
          </span>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            {node.children.map((child, index) => (
              <ASTTreeNode
                key={`${child.id}-${index}`}
                node={child}
                depth={depth + 1}
                defaultExpanded={depth < 2}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
});

ASTTreeNode.displayName = "ASTTreeNode";

interface TreeSitterAnalyzerProps {
  code: string;
  language: string;
}

export function TreeSitterAnalyzer({ code, language }: TreeSitterAnalyzerProps) {
  const { isLoading, error, language: loadedLanguage, loadLanguage, parse } = useTreeSitter();
  const [astTree, setAstTree] = useState<ASTNode | null>(null); // UI AST
  const [cstTree, setCstTree] = useState<CSTNode | null>(null); // NEW: Analysis CST
  const [sexp, setSexp] = useState("");
  const [parseTime, setParseTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [complexityResult, setComplexityResult] = useState<ComplexityAnalysisResult | null>(null);
  // Use the context hook for code analysis
  const { context: codeContext, isAnalyzing, error: analysisError } = useCodeContext(code);


  const treeSitterLang = useMemo(() => languageMap[language], [language]);
  const isSupported = treeSitterLang !== null;

  // Load language when it changes
  useEffect(() => {
    if (treeSitterLang) {
      loadLanguage(treeSitterLang);
    }
  }, [treeSitterLang, loadLanguage]);

  // Parse code with debounce
  const handleParse = useCallback(() => {
    if (!loadedLanguage || !isSupported) return;

    try {
      const result = parse(code);
      if (result.rootNode && result.cst) {
        // UI AST - shallow, truncated (existing)
        const ast = syntaxNodeToAST(result.rootNode, {
          maxDepth: 50,
          maxTextLength: 100,
          filter: (node) => node.isNamed || node.type === "identifier",
        });

        if (ast) {
          setAstTree(ast);
          setSexp(result.sexp);
          setParseTime(result.parseTime);

          // NEW: Store lossless CST for analysis
          setCstTree(result.cst);

          // MODIFIED: Use CST for complexity analysis, not UI AST
          const complexity = analyzeComplexity(result.cst, loadedLanguage);
          setComplexityResult(complexity);
        }
      }
    } catch (err) {
      console.error("[TreeSitterAnalyzer] Parse error:", err);
    }
  }, [code, loadedLanguage, parse, isSupported]);


  // Auto-parse with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleParse();
    }, 300);

    return () => clearTimeout(timer);
  }, [handleParse]);

  const handleCopySexp = useCallback(async () => {
    await navigator.clipboard.writeText(sexp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sexp]);

  if (!isSupported) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a]">
        <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 py-2">
          <span className="text-sm font-medium text-zinc-400">AST Analysis</span>
        </div>
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center">
            <p className="text-zinc-400 mb-2">AST analysis not available for {language}</p>
            <p className="text-xs text-zinc-600">
              Supported: JavaScript, TypeScript, Python, Go, Rust, Java, C++, C, Ruby, PHP
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 py-2 shrink-0">
        <span className="text-sm font-medium text-zinc-400">AST Analysis</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tree" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 shrink-0">
          <TabsList className="h-10 bg-transparent border-0 p-0 gap-4">
            <TabsTrigger
              value="tree"
              className="text-xs font-medium text-zinc-500 data-[state=active]:text-zinc-300 data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-t-md rounded-b-none px-4 py-2 transition-all hover:text-zinc-400"
            >
              Tree View
            </TabsTrigger>
            <TabsTrigger
              value="sexp"
              className="text-xs font-medium text-zinc-500 data-[state=active]:text-zinc-300 data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-t-md rounded-b-none px-4 py-2 transition-all hover:text-zinc-400"
            >
              S-Expression
            </TabsTrigger>
            <TabsTrigger
              value="context"
              className="text-xs font-medium text-zinc-500 data-[state=active]:text-zinc-300 data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-t-md rounded-b-none px-4 py-2 transition-all hover:text-zinc-400"
            >
              Code Context
            </TabsTrigger>
            <TabsTrigger
              value="complexity"
              className="text-xs font-medium text-zinc-500 data-[state=active]:text-zinc-300 data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-t-md rounded-b-none px-4 py-2 transition-all hover:text-zinc-400"
            >
              Complexity
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Stats bar */}
        <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 py-2 flex items-center gap-3 shrink-0">
          {treeSitterLang && (
            <Badge variant="secondary" className="bg-zinc-800 text-white text-xs border-0">
              {languageInfo[treeSitterLang].name}
            </Badge>
          )}
          {parseTime > 0 && (
            <span className="text-xs text-zinc-600">Parsed in {parseTime.toFixed(1)}ms</span>
          )}
          {codeContext && (
            <span className="text-xs text-zinc-600">
              Analyzed in {codeContext.analysisTime.toFixed(1)}ms
            </span>
          )}
          {error && <Badge variant="destructive" className="text-xs">{error}</Badge>}
        </div>


        {/* Tree View Tab */}
        <TabsContent
          value="tree"
          className="flex-1 m-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="flex-1">
            <div className="p-6">
              {astTree ? (
                <ASTTreeNode node={astTree} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                  {isLoading ? "Loading parser..." : "Write code to see AST"}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* S-Expression Tab */}
        <TabsContent
          value="sexp"
          className="flex-1 m-0 overflow-hidden relative data-[state=active]:flex data-[state=active]:flex-col"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 h-7 w-7 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700"
            onClick={handleCopySexp}
          >
            {copied ? (
              <CheckIcon className="size-3 text-green-400" />
            ) : (
              <CopyIcon className="size-3 text-zinc-400" />
            )}
          </Button>
          <ScrollArea className="flex-1">
            <pre className="p-6 text-xs font-mono text-zinc-400 whitespace-pre-wrap break-all">
              {sexp || "No S-expression to display"}
            </pre>
          </ScrollArea>
        </TabsContent>

        {/* Code Context Tab */}
        {/* Code Context Tab */}
        <TabsContent
          value="context"
          className="flex-1 m-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <CodeContextViewer
            context={codeContext}
            isAnalyzing={isAnalyzing}
            error={analysisError}
          />
        </TabsContent>

        {/* Complexity Tab */}
        <TabsContent
          value="complexity"
          className="flex-1 m-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ComplexityViewer
            complexity={complexityResult}
            isAnalyzing={false} // Since it's synchronous after parse
            error={null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}