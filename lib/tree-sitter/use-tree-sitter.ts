"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Parser from "web-tree-sitter";

export type SupportedLanguage = "typescript" | "python" | "go" | "rust" | "java" | "cpp" | "c" | "ruby" | "php";

interface TreeSitterState {
  parser: Parser | null;
  language: SupportedLanguage | null;
  isLoading: boolean;
  error: string | null;
}

interface ParseResult {
  tree: Parser.Tree | null;
  sexp: string;
  rootNode: Parser.SyntaxNode | null;
  parseTime: number;
}

export function useTreeSitter() {
  const [state, setState] = useState<TreeSitterState>({
    parser: null,
    language: null,
    isLoading: false,
    error: null,
  });

  const parserRef = useRef<Parser | null>(null);
  const languagesRef = useRef<Map<SupportedLanguage, Parser.Language>>(
    new Map()
  );
  const ParserClass = useRef<typeof Parser | null>(null);

  // Initialize Parser
  const initParser = useCallback(async () => {
    if (parserRef.current) return parserRef.current;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const TreeSitter = (await import("web-tree-sitter")).default;

      await TreeSitter.init({
        locateFile(scriptName: string) {
          return `/wasm/${scriptName}`;
        },
      });

      const parser = new TreeSitter();
      parserRef.current = parser;
      ParserClass.current = TreeSitter;

      setState((prev) => ({ ...prev, parser, isLoading: false }));
      return parser;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to initialize parser";
      setState((prev) => ({ ...prev, error, isLoading: false }));
      return null;
    }
  }, []);

  // Load a language
  const loadLanguage = useCallback(
    async (language: SupportedLanguage): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        let parser = parserRef.current;
        if (!parser) {
          parser = await initParser();
          if (!parser) return false;
        }

        // Check if language is already loaded
        if (languagesRef.current.has(language)) {
          parser.setLanguage(languagesRef.current.get(language)!);
          setState((prev) => ({
            ...prev,
            language,
            isLoading: false,
          }));
          return true;
        }

        // Load the language
        const TreeSitter = ParserClass.current;
        if (!TreeSitter) {
          throw new Error("Parser class not initialized");
        }

        const wasmPath = `/wasm/tree-sitter-${language}.wasm`;
        const lang = await TreeSitter.Language.load(wasmPath);
        languagesRef.current.set(language, lang);
        parser.setLanguage(lang);

        setState((prev) => ({
          ...prev,
          language,
          isLoading: false,
        }));
        return true;
      } catch (err) {
        const error = err instanceof Error ? err.message : `Failed to load ${language} language`;
        setState((prev) => ({ ...prev, error, isLoading: false }));
        return false;
      }
    },
    [initParser]
  );

  // Parse code
  const parse = useCallback(
    (code: string): ParseResult => {
      const startTime = performance.now();

      if (!parserRef.current || !state.language) {
        return {
          tree: null,
          sexp: "",
          rootNode: null,
          parseTime: 0,
        };
      }

      try {
        const tree = parserRef.current.parse(code);
        const parseTime = performance.now() - startTime;

        return {
          tree,
          sexp: tree.rootNode.toString(),
          rootNode: tree.rootNode,
          parseTime,
        };
      } catch {
        return {
          tree: null,
          sexp: "",
          rootNode: null,
          parseTime: performance.now() - startTime,
        };
      }
    },
    [state.language]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      parserRef.current?.delete();
    };
  }, []);

  return {
    ...state,
    loadLanguage,
    parse,
    initParser,
  };
}

// AST Node helpers
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

export function syntaxNodeToAST(
  node: Parser.SyntaxNode,
  depth = 0,
  maxDepth = 50
): ASTNode | null {
  if (depth > maxDepth) return null;

  const children: ASTNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      const astChild = syntaxNodeToAST(child, depth + 1, maxDepth);
      if (astChild) {
        children.push(astChild);
      }
    }
  }

  return {
    id: `${node.startIndex}-${node.endIndex}-${depth}`,
    type: node.type,
    text: node.text.length > 100 ? node.text.slice(0, 100) + "..." : node.text,
    startPosition: node.startPosition,
    endPosition: node.endPosition,
    children,
    isNamed: node.isNamed,
    fieldName: null,
  };
}
