"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Parser from "web-tree-sitter";
import { type CSTNode, syntaxNodeToCST } from '../analyzer/semantic-ir';
export type SupportedLanguage = "typescript" | "python" | "go" | "rust" | "java" | "cpp" | "c" | "ruby" | "php";

interface TreeSitterState {
  language: SupportedLanguage | null;
  isLoading: boolean;
  error: string | null;
}

interface ParseResult {
  tree: Parser.Tree | null;
  rootNode: Parser.SyntaxNode | null;
  parseTime: number;
  // NEW: Add lossless CST for analysis
  cst: CSTNode | null;
}

interface ParseCacheEntry {
  code: string;
  result: ParseResult;
  timestamp: number;
}

const CACHE_MAX_SIZE = 10;
const CACHE_TTL = 60000; // 1 minute

/**
 * Custom hook for Tree-sitter parsing with caching and error handling
 * @returns Parser utilities and state
 */
export function useTreeSitter() {
  const [state, setState] = useState<TreeSitterState>({
    language: null,
    isLoading: false,
    error: null,
  });

  const parserRef = useRef<Parser | null>(null);
  const languagesRef = useRef<Map<SupportedLanguage, Parser.Language>>(new Map());
  const ParserClassRef = useRef<typeof Parser | null>(null);
  const currentLanguageRef = useRef<SupportedLanguage | null>(null);
  const parseCacheRef = useRef<Map<string, ParseCacheEntry>>(new Map());

  /**
   * Initialize Tree-sitter parser
   */
  const initParser = useCallback(async (): Promise<Parser | null> => {
    if (parserRef.current) return parserRef.current;

    try {
      const TreeSitter = (await import("web-tree-sitter")).default;

      await TreeSitter.init({
        locateFile(scriptName: string) {
          return `/wasm/${scriptName}`;
        },
      });

      const parser = new TreeSitter();
      parserRef.current = parser;
      ParserClassRef.current = TreeSitter;

      return parser;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to initialize parser";
      console.error("[TreeSitter] Initialization failed:", error);
      setState((prev) => ({ ...prev, error, isLoading: false }));
      return null;
    }
  }, []);

  /**
   * Load a language grammar
   */
  const loadLanguage = useCallback(
    async (language: SupportedLanguage): Promise<boolean> => {
      // Skip if already loaded
      if (currentLanguageRef.current === language && languagesRef.current.has(language)) {
        return true;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        let parser = parserRef.current;
        if (!parser) {
          parser = await initParser();
          if (!parser) {
            setState((prev) => ({ ...prev, isLoading: false }));
            return false;
          }
        }

        // Use cached language if available
        let lang = languagesRef.current.get(language);
        if (!lang) {
          const TreeSitter = ParserClassRef.current;
          if (!TreeSitter) {
            throw new Error("Parser class not initialized");
          }

          const wasmPath = `/wasm/tree-sitter-${language}.wasm`;
          lang = await TreeSitter.Language.load(wasmPath);
          languagesRef.current.set(language, lang);
        }

        parser.setLanguage(lang);
        currentLanguageRef.current = language;

        setState((prev) => ({ ...prev, language, isLoading: false }));
        return true;
      } catch (err) {
        const error = err instanceof Error ? err.message : `Failed to load ${language} language`;
        console.error(`[TreeSitter] Language loading failed for ${language}:`, error);
        setState((prev) => ({ ...prev, error, isLoading: false }));
        return false;
      }
    },
    [initParser]
  );

  /**
   * Clear expired cache entries
   */
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = parseCacheRef.current;

    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }

    // Limit cache size
    if (cache.size > CACHE_MAX_SIZE) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, cache.size - CACHE_MAX_SIZE);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }, []);

  /**
   * Parse code with caching
   */
  const parse = useCallback(
    (code: string): ParseResult => {
      const language = currentLanguageRef.current;
      const parser = parserRef.current;

      if (!parser || !language) {
        return {
          tree: null,
          rootNode: null,
          parseTime: 0,
          cst: null, // NEW
        };
      }

      // Check cache
      const cacheKey = `${language}:${code.substring(0, 100)}:${code.length}`;
      const cached = parseCacheRef.current.get(cacheKey);
      if (cached && cached.code === code) {
        return cached.result;
      }

      const startTime = performance.now();

      try {
        const tree = parser.parse(code);
        const parseTime = performance.now() - startTime;

        // NEW: Create lossless CST for analysis
        const cst = syntaxNodeToCST(tree.rootNode);

        const result: ParseResult = {
          tree,
          rootNode: tree.rootNode,
          parseTime,
          cst, // NEW: Lossless CST
        };

        // Cache result
        parseCacheRef.current.set(cacheKey, {
          code,
          result,
          timestamp: Date.now(),
        });

        clearExpiredCache();

        return result;
      } catch (err) {
        console.error("[TreeSitter] Parse error:", err);
        return {
          tree: null,
          rootNode: null,
          parseTime: performance.now() - startTime,
          cst: null, // NEW
        };
      }
    },
    [clearExpiredCache]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      parserRef.current?.delete();
      parseCacheRef.current.clear();
    };
  }, []);

  return {
    ...state,
    loadLanguage,
    parse,
    initParser,
  };
}

// AST Node types
export interface ASTNode {
  id: string;
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: ASTNode[];
  isNamed: boolean;
  fieldName: string | null;
}

export interface ASTConversionOptions {
  maxDepth?: number;
  maxTextLength?: number;
  filter?: (node: Parser.SyntaxNode) => boolean;
  lazyLoad?: boolean;
}

/**
 * Convert Tree-sitter SyntaxNode to AST with optimizations
 * Uses iterative traversal to prevent stack overflow
 */


//truncates text
//limits depth
//filters nodes
//loses semantic relationships
//does not retain the information needed for code analysis
export function syntaxNodeToAST(
  rootNode: Parser.SyntaxNode,
  options: ASTConversionOptions = {}
): ASTNode | null {
  const {
    maxDepth = 50,
    maxTextLength = 100,
    filter = () => true,
    lazyLoad = false,
  } = options;

  interface StackItem {
    node: Parser.SyntaxNode;
    depth: number;
    astNode: ASTNode;
    childIndex: number;
  }

  if (!filter(rootNode)) return null;

  // Create root AST node
  const rootText = rootNode.text;
  const truncatedText = rootText.length > maxTextLength
    ? rootText.substring(0, maxTextLength) + "..."
    : rootText;

  const rootASTNode: ASTNode = {
    id: `${rootNode.startIndex}-${rootNode.endIndex}-0`,
    type: rootNode.type,
    text: truncatedText,
    startPosition: rootNode.startPosition,
    endPosition: rootNode.endPosition,
    children: [],
    isNamed: rootNode.isNamed,
    fieldName: null,
  };

  // For lazy loading, only process root
  if (lazyLoad && rootNode.childCount > 0) {
    return rootASTNode;
  }

  // Iterative traversal using stack
  const stack: StackItem[] = [{
    node: rootNode,
    depth: 0,
    astNode: rootASTNode,
    childIndex: 0,
  }];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    // Check if we've processed all children
    if (current.childIndex >= current.node.childCount) {
      stack.pop();
      continue;
    }

    // Get next child
    const child = current.node.child(current.childIndex);
    current.childIndex++;

    if (!child || current.depth >= maxDepth || !filter(child)) {
      continue;
    }

    // Create AST node for child
    const childText = child.text;
    const childTruncatedText = childText.length > maxTextLength
      ? childText.substring(0, maxTextLength) + "..."
      : childText;

    const childASTNode: ASTNode = {
      id: `${child.startIndex}-${child.endIndex}-${current.depth + 1}`,
      type: child.type,
      text: childTruncatedText,
      startPosition: child.startPosition,
      endPosition: child.endPosition,
      children: [],
      isNamed: child.isNamed,
      fieldName: null,
    };

    current.astNode.children.push(childASTNode);

    // Add child to stack if it has children
    if (child.childCount > 0 && current.depth + 1 < maxDepth) {
      stack.push({
        node: child,
        depth: current.depth + 1,
        astNode: childASTNode,
        childIndex: 0,
      });
    }
  }

  return rootASTNode;
}

/**
 * Lazy-load children for an AST node
 */
export function lazyLoadASTChildren(
  node: Parser.SyntaxNode,
  depth: number,
  options: ASTConversionOptions = {}
): ASTNode[] {
  const { maxDepth = 50, maxTextLength = 100, filter = () => true } = options;
  const children: ASTNode[] = [];

  if (depth >= maxDepth) return children;

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child || !filter(child)) continue;

    const childText = child.text;
    const truncatedText = childText.length > maxTextLength
      ? childText.substring(0, maxTextLength) + "..."
      : childText;

    children.push({
      id: `${child.startIndex}-${child.endIndex}-${depth + 1}`,
      type: child.type,
      text: truncatedText,
      startPosition: child.startPosition,
      endPosition: child.endPosition,
      children: [],
      isNamed: child.isNamed,
      fieldName: null,
    });
  }

  return children;
}



//Syntax Engine:
//load tree-sitter WASM grammars
//parse code into abstract syntax tree
//cache parse results
//convert tree-sitter nodes to simplified AST for the UI and analysis