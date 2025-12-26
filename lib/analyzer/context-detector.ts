import { useCallback, useEffect, useRef, useState } from 'react';
import { type CSTNode } from '../analyzer/semantic-ir';
import { useTreeSitter } from '../tree-sitter/use-tree-sitter';
import { detectCodeType, type CodeTypeResult } from './code-type-detector';
import { detectLanguage, type LanguageDetectionResult } from './language-detector';
import { analyzeLibraries, type LibraryAnalysisResult } from './library-analyzer';
import { analyzeParadigm, type ParadigmAnalysisResult } from './paradigm-detector';
export interface CodeContext {
  language: LanguageDetectionResult;
  libraries: LibraryAnalysisResult;
  paradigm: ParadigmAnalysisResult;
  codeType: CodeTypeResult;
  analysisTime: number;
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${hash}_${str.length}`;
}

/**
 * Analyze code context (non-React version)
 */
export function analyzeCodeContext(
  code: string,
  cst?: CSTNode // CHANGED from ast?: ASTNode
): CodeContext | null {
  if (!code || code.trim().length === 0) {
    return null;
  }

  const startTime = performance.now();

  try {
    // Step 1: Detect language
    const language = detectLanguage(code);

    if (!cst) {
      // If no AST provided, we can't do full analysis
      // Return partial context
      return {
        language,
        libraries: { libraries: [], frameworks: [] },
        paradigm: {
          primary: { paradigm: 'procedural', score: 0, confidence: 0, indicators: [] },
          patterns: {
            classes: 0,
            functions: 0,
            pureFunctions: 0,
            higherOrderFunctions: 0,
            mutations: 0,
            loops: 0,
          },
        },
        codeType: {
          type: 'unknown',
          confidence: 0,
          indicators: ['AST not available'],
        },
        analysisTime: performance.now() - startTime,
      };
    }

    // Step 2: Analyze libraries
    const libraries = analyzeLibraries(cst, language.language);

    // Step 3: Analyze paradigm - now uses CST
    const paradigm = analyzeParadigm(cst, language.language);

    // Step 4: Detect code type - now uses CST
    const codeType = detectCodeType(cst, language.language, libraries);

    const analysisTime = performance.now() - startTime;


    return {
      language,
      libraries,
      paradigm,
      codeType,
      analysisTime,
    };
  } catch (error) {
    console.error('[CodeContext] Analysis error:', error);
    return null;
  }
}

/**
 * React Hook for code context analysis with caching and debouncing
 */
export function useCodeContext(code: string): {
  context: CodeContext | null;
  isAnalyzing: boolean;
  error: string | null;
} {
  const [context, setContext] = useState<CodeContext | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadLanguage, parse } = useTreeSitter();
  const cacheRef = useRef<Map<string, CodeContext>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCodeHashRef = useRef<string>('');

  const analyze = useCallback(async () => {
    if (!code || code.trim().length === 0) {
      setContext(null);
      setIsAnalyzing(false);
      return;
    }

    // Check cache
    const codeHash = hashCode(code);
    if (codeHash === lastCodeHashRef.current) {
      return; // Same code, no need to re-analyze
    }

    const cached = cacheRef.current.get(codeHash);
    if (cached) {
      setContext(cached);
      setIsAnalyzing(false);
      lastCodeHashRef.current = codeHash;
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const startTime = performance.now();

      // Step 1: Detect language
      const languageResult = detectLanguage(code);

      // Step 2: Load Tree-sitter language and parse
      const loaded = await loadLanguage(languageResult.language);
      if (!loaded) {
        throw new Error(`Failed to load parser for ${languageResult.language}`);
      }

      const parseResult = parse(code);
      if (!parseResult.cst) { // CHANGED from rootNode check
        throw new Error('Failed to parse code');
      }

      // CHANGED: Use CST directly, no conversion needed
      const cst = parseResult.cst;

      // Step 3: Run analyzers with CST
      const libraries = analyzeLibraries(cst, languageResult.language);
      const paradigm = analyzeParadigm(cst, languageResult.language);
      const codeType = detectCodeType(cst, languageResult.language, libraries);

      const analysisTime = performance.now() - startTime;

      const result: CodeContext = {
        language: languageResult,
        libraries,
        paradigm,
        codeType,
        analysisTime,
      };


      // Cache result
      cacheRef.current.set(codeHash, result);
      lastCodeHashRef.current = codeHash;

      // Limit cache size
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      setContext(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      console.error('[useCodeContext] Error:', errorMessage);
      setError(errorMessage);
      setContext(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [code, loadLanguage, parse]);

  // Debounced analysis
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      analyze();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [analyze]);

  return { context, isAnalyzing, error };
}