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
  ClockIcon,
  CopyIcon
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  php: { name: "PHP", color: "bg-blue-500" },
};

// AST Tree Node Component
function ASTTreeNode({
  node,
  depth = 0,
  defaultExpanded = true,
}: {
  node: ASTNode;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded && depth < 3);
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;

  const nodeTypeColor = node.isNamed
    ? "text-blue-400"
    : "text-zinc-500";

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
            {node.startPosition.row}:{node.startPosition.column} - {node.endPosition.row}:{node.endPosition.column}
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
}

interface TreeSitterAnalyzerProps {
  code: string;
  language: string;
}

export function TreeSitterAnalyzer({ code, language }: TreeSitterAnalyzerProps) {
  const { isLoading, error, language: loadedLanguage, loadLanguage, parse } = useTreeSitter();
  const [astTree, setAstTree] = useState<ASTNode | null>(null);
  const [sexp, setSexp] = useState("");
  const [parseTime, setParseTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const treeSitterLang = languageMap[language];
  const isSupported = treeSitterLang !== null;

  // Load language when it changes
  useEffect(() => {
    if (treeSitterLang) {
      loadLanguage(treeSitterLang);
    }
  }, [treeSitterLang, loadLanguage]);

  // Parse code when it changes
  const handleParse = useCallback(() => {
    if (!loadedLanguage || !isSupported) return;

    const result = parse(code);
    if (result.rootNode) {
      const ast = syntaxNodeToAST(result.rootNode);
      setAstTree(ast);
      setSexp(result.sexp);
      setParseTime(result.parseTime);
    }
  }, [code, loadedLanguage, parse, isSupported]);

  // Auto-parse with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleParse();
    }, 300);

    return () => clearTimeout(timer);
  }, [handleParse]);

  const handleCopySexp = async () => {
    await navigator.clipboard.writeText(sexp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isSupported) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-zinc-400 mb-2">AST analysis not available for {language}</p>
          <p className="text-xs text-zinc-600">
            Supported: JavaScript, TypeScript, Python, Go, Rust
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header with stats */}
      <div className="border-b border-zinc-800 bg-[#0f0f0f] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-300">AST Analysis</span>
          {treeSitterLang && (
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
              <div className={`size-2 rounded-full mr-1.5 ${languageInfo[treeSitterLang].color}`} />
              {languageInfo[treeSitterLang].name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {error && (
            <Badge variant="destructive" className="text-xs">{error}</Badge>
          )}
          {parseTime > 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <ClockIcon className="size-3" />
              {parseTime.toFixed(2)}ms
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <Tabs defaultValue="tree" className="h-full flex flex-col">
          <div className="border-b border-zinc-800 px-4 bg-[#0f0f0f]">
            <TabsList className="h-10 bg-transparent border-b border-zinc-800">
              <TabsTrigger value="tree" className="text-zinc-400 data-[state=active]:text-black">
                Tree View
              </TabsTrigger>
              <TabsTrigger value="sexp" className="text-zinc-400 data-[state=active]:text-black">
                S-Expression
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tree" className="flex-1 min-h-0 m-0">
            <ScrollArea className="h-full">
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

          <TabsContent value="sexp" className="flex-1 min-h-0 m-0">
            <div className="relative h-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-7 w-7 bg-zinc-900 hover:bg-zinc-800"
                onClick={handleCopySexp}
              >
                {copied ? (
                  <CheckIcon className="size-3 text-green-400" />
                ) : (
                  <CopyIcon className="size-3 text-zinc-400" />
                )}
              </Button>
              <ScrollArea className="h-full">
                <pre className="p-6 text-xs font-mono text-zinc-400 whitespace-pre-wrap break-all">
                  {sexp || "No S-expression to display"}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}