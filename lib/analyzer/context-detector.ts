import { useCallback, useEffect, useRef, useState } from 'react';
import {
  analyzeControlFlowComplexity,
  analyzeSideEffectCertainty,
  calculateTestability,
  detectMagicValues,
  detectSilentBehaviors,
  extractDecisionRules,
  mapToDomainTokens,
  type CSTNode,
} from '../analyzer/semantic-ir';
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
  confidence: ContextConfidence;
  llmContext: LLMContext;
  reviewIR: ReviewIR; // NEW - stable IR for LLM
}
export type LLMRole = 'review-only' | 'refactor' | 'generate' | 'explain';

export type CodeIntent =
  | 'data-transformation'
  | 'validation'
  | 'parsing'
  | 'aggregation'
  | 'routing'
  | 'formatting'
  | 'calculation'
  | 'orchestration'
  | 'unknown';

export interface IntentClassification {
  primary: CodeIntent;
  confidence: number;
  indicators: string[];
  semanticDescription: string;
}
/**
 * Stable Review-IR for LLM consumption (specifically Qwen 2.5 Coder 32B)
 */
export interface ReviewIR {
  version: '1.0';

  // Core identification
  language: string;
  codeType: string;
  intent: {
    primary: string;
    description: string;
  };

  // Structure
  structure: {
    functions: number;
    classes: number;
    linesOfCode: number;
    paradigm: string;
  };

  // Behavior
  behavior: {
    executionModel: string;
    isDeterministic: boolean;
    determinismReasons: string[];
    sideEffects: string;
    externalInteractions: string[];
  };

  // State
  state: {
    lifetime: string;
    mutability: number;
    globalVariables: number;
  };

  // Quality
  quality: {
    testability: number;
    controlFlowComplexity: number;
    errorHandling: string;
  };

  // Review guidance
  guidance: {
    role: string;
    readinessScores: {
      review: number;
      refactor: number;
      execution: number;
    };
    focusAreas: string[];
    promptHints: string[];
    warnings: string[];
  };

  // Extracted elements
  elements: {
    decisionRules: Array<{ condition: string; outcome: string; location: number }>;
    magicValues: Array<{ value: string | number; role?: string; location: number }>;
    silentBehaviors: Array<{ type: string; risk: string; location: number }>;
  };

  // Output contract
  outputContract: {
    structure: string;
    meaning: string;
    guarantees: string[];
  };
}
export interface LLMReadinessScore {
  reviewReadiness: number; // Can LLM safely review this?
  refactorReadiness: number; // Can LLM safely refactor this?
  executionReadiness: number; // Can LLM reason about execution?
  breakdown: {
    structuralClarity: number;
    semanticCompleteness: number;
    contextSufficiency: number;
    riskFactors: number;
  };
  blockingIssues: string[];
}

export interface LLMContext {
  role: LLMRole;
  readiness: LLMReadinessScore;
  intent: IntentClassification;
  promptHints: string[];
  focusAreas: string[];
}
export interface ContextConfidence {
  overall: number; // 0-1
  breakdown: {
    language: number;
    libraries: number;
    paradigm: number;
    codeType: number;
    executionModel: number;
  };
  warnings: string[];
  isLLMReady: boolean; // true if confidence high enough for LLM consumption
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
 * Classify the primary intent of the code
 */
function classifyIntent(
  cst: CSTNode,
  codeType: CodeTypeResult,
  paradigm: ParadigmAnalysisResult,
  libraries: LibraryAnalysisResult
): IntentClassification {
  const indicators: string[] = [];
  const codeText = cst.text.toLowerCase();
  const scores: Record<CodeIntent, number> = {
    'data-transformation': 0,
    'validation': 0,
    'parsing': 0,
    'aggregation': 0,
    'routing': 0,
    'formatting': 0,
    'calculation': 0,
    'orchestration': 0,
    'unknown': 0,
  };

  // Data transformation
  if (codeText.includes('.map(') || codeText.includes('.filter(') || codeText.includes('.reduce(')) {
    scores['data-transformation'] += 3;
    indicators.push('array transformations');
  }
  if (codeText.includes('transform') || codeText.includes('convert')) {
    scores['data-transformation'] += 2;
  }

  // Validation
  if (codeText.includes('validate') || codeText.includes('check') || codeText.includes('assert')) {
    scores['validation'] += 3;
    indicators.push('validation checks');
  }
  if (codeText.includes('isvalid') || codeText.includes('verify')) {
    scores['validation'] += 2;
  }

  // Parsing
  if (codeText.includes('parse') || codeText.includes('lex') || codeText.includes('token')) {
    scores['parsing'] += 3;
    indicators.push('parsing logic');
  }
  if (libraries.libraries.some(l => l.name.toLowerCase().includes('parser'))) {
    scores['parsing'] += 2;
  }

  // Aggregation
  if (codeText.includes('aggregate') || codeText.includes('sum') || codeText.includes('count') || codeText.includes('group')) {
    scores['aggregation'] += 3;
    indicators.push('data aggregation');
  }

  // Routing
  if (codeText.includes('route') || codeText.includes('router') || codeText.includes('dispatch')) {
    scores['routing'] += 3;
    indicators.push('request routing');
  }
  if (libraries.frameworks.some(f => f.name === 'Express' || f.name === 'FastAPI')) {
    scores['routing'] += 2;
  }

  // Formatting
  if (codeText.includes('format') || codeText.includes('render') || codeText.includes('template')) {
    scores['formatting'] += 3;
    indicators.push('output formatting');
  }

  // Calculation
  if (paradigm.patterns.loops > 2 && codeText.includes('math') || codeText.includes('calculate')) {
    scores['calculation'] += 3;
    indicators.push('computational logic');
  }

  // Orchestration
  if (paradigm.executionModel.primary === 'asynchronous' && paradigm.patterns.functions > 5) {
    scores['orchestration'] += 2;
    indicators.push('async orchestration');
  }
  if (codeText.includes('workflow') || codeText.includes('pipeline')) {
    scores['orchestration'] += 2;
  }

  const sortedIntents = (Object.keys(scores) as CodeIntent[])
    .sort((a, b) => scores[b] - scores[a]);

  const primary = sortedIntents[0];
  const maxScore = scores[primary];
  const confidence = maxScore > 0 ? Math.min(maxScore / 6, 1) : 0.3;

  const semanticDescriptions: Record<CodeIntent, string> = {
    'data-transformation': 'Transforms or restructures data between formats',
    'validation': 'Validates inputs or state against rules',
    'parsing': 'Parses and interprets structured input',
    'aggregation': 'Aggregates or summarizes data from multiple sources',
    'routing': 'Routes requests or messages to handlers',
    'formatting': 'Formats data for presentation or output',
    'calculation': 'Performs mathematical or algorithmic computations',
    'orchestration': 'Coordinates multiple operations or services',
    'unknown': 'Intent unclear from available context',
  };

  return {
    primary: maxScore > 0 ? primary : 'unknown',
    confidence: Math.round(confidence * 100) / 100,
    indicators: indicators.slice(0, 3),
    semanticDescription: semanticDescriptions[maxScore > 0 ? primary : 'unknown'],
  };
}

/**
 * Calculate LLM readiness scores for different roles
 */
function calculateLLMReadiness(
  context: Omit<CodeContext, 'confidence' | 'llmContext' | 'reviewIR'>
): LLMReadinessScore {
  const blockingIssues: string[] = [];

  // Structural clarity
  let structuralClarity = 0.8;
  if (context.paradigm.patterns.functions === 0 && context.paradigm.patterns.classes === 0) {
    structuralClarity = 0.3;
    blockingIssues.push('No identifiable structure');
  }
  if (context.codeType.type === 'unknown') {
    structuralClarity *= 0.7;
  }

  // Semantic completeness
  let semanticCompleteness = 0.7;
  if (context.codeType.executionIntent && context.codeType.executionIntent.blockers.length > 0) {
    semanticCompleteness *= 0.6;
  }
  if (context.libraries.externalInteractions.types.length > 3) {
    semanticCompleteness *= 0.8;
    blockingIssues.push('Many external dependencies');
  }

  // Context sufficiency
  let contextSufficiency = context.language.confidence;
  if (context.paradigm.primary.confidence < 0.5) {
    contextSufficiency *= 0.7;
  }

  // Risk factors (inverse score - lower is better)
  let riskFactors = 1.0;
  if (!context.libraries.externalInteractions.isDeterministic) {
    riskFactors *= 0.7;
  }
  if (context.paradigm.state.lifetime === 'shared-mutable') {
    riskFactors *= 0.8;
    blockingIssues.push('Shared mutable state detected');
  }
  if (!context.libraries.errorHandling.hasErrorHandling) {
    riskFactors *= 0.9;
  }

  const breakdown = {
    structuralClarity: Math.round(structuralClarity * 100) / 100,
    semanticCompleteness: Math.round(semanticCompleteness * 100) / 100,
    contextSufficiency: Math.round(contextSufficiency * 100) / 100,
    riskFactors: Math.round(riskFactors * 100) / 100,
  };

  // Review readiness: Can LLM understand and comment?
  const reviewReadiness = (structuralClarity * 0.4 + semanticCompleteness * 0.3 + contextSufficiency * 0.3);

  // Refactor readiness: Can LLM safely modify?
  const refactorReadiness = (structuralClarity * 0.3 + semanticCompleteness * 0.3 + contextSufficiency * 0.2 + riskFactors * 0.2);

  // Execution readiness: Can LLM reason about behavior?
  const executionReadiness = (semanticCompleteness * 0.4 + contextSufficiency * 0.3 + riskFactors * 0.3);

  return {
    reviewReadiness: Math.round(reviewReadiness * 100) / 100,
    refactorReadiness: Math.round(refactorReadiness * 100) / 100,
    executionReadiness: Math.round(executionReadiness * 100) / 100,
    breakdown,
    blockingIssues,
  };
}

/**
 * Determine appropriate LLM role and generate prompt hints
 */
function determineLLMRole(
  readiness: LLMReadinessScore,
  intent: IntentClassification,
  codeType: CodeTypeResult
): { role: LLMRole; promptHints: string[]; focusAreas: string[] } {
  const promptHints: string[] = [];
  const focusAreas: string[] = [];

  let role: LLMRole = 'review-only';

  // Determine role based on readiness
  if (readiness.refactorReadiness >= 0.75 && readiness.blockingIssues.length === 0) {
    role = 'refactor';
    promptHints.push('Code is well-structured and safe to refactor');
    promptHints.push('Maintain existing behavior while improving clarity');
    focusAreas.push('code quality', 'maintainability');
  } else if (readiness.reviewReadiness >= 0.6) {
    role = 'review-only';
    promptHints.push('Focus on correctness and clarity');
    promptHints.push('Identify potential bugs or unclear logic');
    focusAreas.push('correctness', 'readability');
  } else {
    role = 'explain';
    promptHints.push('Code structure is unclear - focus on explaining intent');
    focusAreas.push('understanding', 'documentation');
  }

  // Add intent-specific hints
  if (intent.confidence > 0.6) {
    promptHints.push(`Primary intent: ${intent.semanticDescription}`);
    focusAreas.push(intent.primary);
  }

  // Add risk-based hints
  if (readiness.blockingIssues.length > 0) {
    promptHints.push(`Caution: ${readiness.blockingIssues[0]}`);
  }

  // Code type hints
  if (codeType.type === 'test') {
    promptHints.push('Test code - focus on test coverage and assertions');
    focusAreas.push('test quality');
  }

  return { role, promptHints: promptHints.slice(0, 5), focusAreas: focusAreas.slice(0, 4) };
}
/**
 * Calculate overall context confidence and warnings
 */
function calculateContextConfidence(context: CodeContext): ContextConfidence {
  const warnings: string[] = [];

  const breakdown = {
    language: context.language.confidence,
    libraries: context.libraries.frameworks.length > 0 ? 0.9 : 0.7,
    paradigm: context.paradigm.primary.confidence,
    codeType: context.codeType.confidence,
    executionModel: context.paradigm.executionModel.confidence,
  };

  // Language warnings
  if (breakdown.language < 0.6) {
    warnings.push('Uncertain language detection');
  }

  // Empty or minimal code
  if (context.paradigm.patterns.functions === 0 && context.paradigm.patterns.classes === 0) {
    warnings.push('Minimal code structure detected');
    breakdown.paradigm *= 0.5;
  }

  // No clear code type
  if (context.codeType.type === 'unknown') {
    warnings.push('Unable to determine code type');
    breakdown.codeType = 0.3;
  }

  // Execution intent unclear
  if (context.codeType.executionIntent && !context.codeType.executionIntent.isRunnable &&
    context.codeType.executionIntent.blockers.length > 0) {
    warnings.push(`Execution blockers: ${context.codeType.executionIntent.blockers[0]}`);
  }

  const overall = Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length;
  const isLLMReady = overall >= 0.65 && warnings.length < 3;

  return {
    overall: Math.round(overall * 100) / 100,
    breakdown,
    warnings,
    isLLMReady,
  };
}

/**
 * Convert CodeContext to stable Review-IR for LLM consumption
 */
export function toReviewIR(context: CodeContext, cst: CSTNode): ReviewIR {
  // Extract additional elements
  const decisionRules = extractDecisionRules(cst);
  const magicValues = detectMagicValues(cst);
  const silentBehaviors = detectSilentBehaviors(cst);
  const controlFlow = analyzeControlFlowComplexity(cst);
  const sideEffectCertainty = analyzeSideEffectCertainty(
    cst,
    context.libraries.externalInteractions.types.filter(t => t !== 'none')
  );
  const testability = calculateTestability(
    cst,
    context.libraries.externalInteractions.isDeterministic,
    sideEffectCertainty,
    context.libraries.externalInteractions.types.filter(t => t !== 'none')
  );

  const linesOfCode = cst.text.split('\n').length;

  return {
    version: '1.0',

    language: context.language.language,
    codeType: context.codeType.type,
    intent: {
      primary: context.llmContext.intent.primary,
      description: context.llmContext.intent.semanticDescription,
    },

    structure: {
      functions: context.paradigm.patterns.functions,
      classes: context.paradigm.patterns.classes,
      linesOfCode,
      paradigm: context.paradigm.primary.paradigm,
    },

    behavior: {
      executionModel: context.paradigm.executionModel.primary,
      isDeterministic: context.libraries.externalInteractions.isDeterministic,
      determinismReasons: context.libraries.externalInteractions.determinismReasoning.reasoning,
      sideEffects: sideEffectCertainty,
      externalInteractions: context.libraries.externalInteractions.types,
    },

    state: {
      lifetime: context.paradigm.state.lifetime,
      mutability: context.paradigm.state.mutabilityScore,
      globalVariables: context.paradigm.state.globalVars,
    },

    quality: {
      testability: testability.score,
      controlFlowComplexity: controlFlow.cyclomaticComplexity,
      errorHandling: context.libraries.errorHandling.approach,
    },

    guidance: {
      role: context.llmContext.role,
      readinessScores: {
        review: context.llmContext.readiness.reviewReadiness,
        refactor: context.llmContext.readiness.refactorReadiness,
        execution: context.llmContext.readiness.executionReadiness,
      },
      focusAreas: context.llmContext.focusAreas,
      promptHints: context.llmContext.promptHints,
      warnings: context.confidence.warnings,
    },

    elements: {
      decisionRules: decisionRules.map(dr => ({
        condition: dr.condition.substring(0, 100),
        outcome: dr.outcome.substring(0, 50),
        location: dr.location.row,
      })),
      magicValues: mapToDomainTokens(magicValues).slice(0, 20).map(mv => ({
        value: mv.value,
        role: mv.domainToken?.semanticRole || mv.semanticRole,
        location: mv.location.row,
      })),
      silentBehaviors: silentBehaviors.slice(0, 10).map(sb => ({
        type: sb.type,
        risk: sb.risk,
        location: sb.location.row,
      })),
    },

    outputContract: {
      structure: context.libraries.outputContract.structure,
      meaning: context.libraries.outputContract.semanticMeaning,
      guarantees: context.libraries.outputContract.guarantees,
    },
  };
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
        libraries: {
          libraries: [],
          frameworks: [],
          externalInteractions: {
            types: [],
            confidence: 0,
            indicators: [],
            isDeterministic: true,
            nondeterministicSources: [],
            determinismReasoning: {
              isDeterministic: true,
              confidence: 0,
              reasoning: ['CST not available'],
              nondeterministicSources: [],
              classification: {
                class: 'fully-deterministic',
                valueStability: 'stable',
                orderStability: 'stable',
                hasRaceConditions: false,
                hasTimeDependency: false,
                hasRandomness: false,
                hasExternalState: false,
                llmGuidance: ''
              }
            },
          },
          errorHandling: {
            approach: 'unknown',
            confidence: 0,
            indicators: [],
            hasErrorHandling: false,
          },
          outputContract: {
            returnTypes: [],
            structure: 'unknown',
            semanticMeaning: 'Unspecified output',
            guarantees: [],
            uncertainties: ['CST not available'],
          },
        },
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
          details: {
            classNames: [],
            functionNames: [],
            loopTypes: [],
          },
          executionModel: {
            primary: 'synchronous',
            confidence: 0,
            indicators: [],
            asyncPatterns: 0,
            eventPatterns: 0,
            concurrencyPatterns: 0,
          },
          state: {
            lifetime: 'stateless',
            confidence: 0,
            globalVars: 0,
            mutabilityScore: 0,
            indicators: [],
            escapingReferences: 0,
            closureCaptures: 0,
          },
        },
        codeType: {
          type: 'unknown',
          confidence: 0,
          indicators: ['AST not available'],
        },
        analysisTime: performance.now() - startTime,
        confidence: {
          overall: 0,
          breakdown: {
            language: language.confidence,
            libraries: 0,
            paradigm: 0,
            codeType: 0,
            executionModel: 0
          },
          warnings: ['AST not available'],
          isLLMReady: false
        },
        llmContext: {
          role: 'explain',
          readiness: {
            reviewReadiness: 0,
            refactorReadiness: 0,
            executionReadiness: 0,
            breakdown: {
              structuralClarity: 0,
              semanticCompleteness: 0,
              contextSufficiency: 0,
              riskFactors: 0,
            },
            blockingIssues: ['CST not available'],
          },
          intent: {
            primary: 'unknown',
            confidence: 0,
            indicators: [],
            semanticDescription: 'Intent unclear from available context',
          },
          promptHints: ['CST not available - limited analysis'],
          focusAreas: [],
        },
        reviewIR: {
          version: '1.0',
          language: language.language,
          codeType: 'unknown',
          intent: {
            primary: 'unknown',
            description: 'Intent unclear from available context',
          },
          structure: {
            functions: 0,
            classes: 0,
            linesOfCode: 0,
            paradigm: 'procedural',
          },
          behavior: {
            executionModel: 'synchronous',
            isDeterministic: true,
            determinismReasons: ['CST not available'],
            sideEffects: 'none',
            externalInteractions: [],
          },
          state: {
            lifetime: 'stateless',
            mutability: 0,
            globalVariables: 0,
          },
          quality: {
            testability: 0,
            controlFlowComplexity: 0,
            errorHandling: 'unknown',
          },
          guidance: {
            role: 'explain',
            readinessScores: {
              review: 0,
              refactor: 0,
              execution: 0,
            },
            focusAreas: [],
            promptHints: ['CST not available - limited analysis'],
            warnings: ['CST not available'],
          },
          elements: {
            decisionRules: [],
            magicValues: [],
            silentBehaviors: [],
          },
          outputContract: {
            structure: 'unknown',
            meaning: 'Unspecified output',
            guarantees: [],
          },
        }
      };
    }

    // Step 2: Analyze libraries
    const libraries = analyzeLibraries(cst, language.language);

    // Step 3: Analyze paradigm - now uses CST
    const paradigm = analyzeParadigm(cst, language.language);

    // Step 4: Detect code type - now uses CST
    const codeType = detectCodeType(cst, language.language, libraries);

    const analysisTime = performance.now() - startTime;

    // Replace the existing confidence calculation with:
    const baseContext = {
      language,
      libraries,
      paradigm,
      codeType,
      analysisTime,
    };

    const intent = classifyIntent(cst, codeType, paradigm, libraries);
    const readiness = calculateLLMReadiness(baseContext);
    const { role, promptHints, focusAreas } = determineLLMRole(readiness, intent, codeType);

    const llmContext: LLMContext = {
      role,
      readiness,
      intent,
      promptHints,
      focusAreas,
    };

    const result: CodeContext = {
      ...baseContext,
      confidence: null as any,
      llmContext,
      reviewIR: null as any, // Will be set after
    };

    result.confidence = calculateContextConfidence(result);
    result.reviewIR = toReviewIR(result, cst);

    return result;
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

      const baseContext = {
        language: languageResult,
        libraries,
        paradigm,
        codeType,
        analysisTime,
      };

      const intent = classifyIntent(cst, codeType, paradigm, libraries);
      const readiness = calculateLLMReadiness(baseContext);
      const { role, promptHints, focusAreas } = determineLLMRole(readiness, intent, codeType);

      const llmContext: LLMContext = {
        role,
        readiness,
        intent,
        promptHints,
        focusAreas,
      };

      const result: CodeContext = {
        ...baseContext,
        confidence: null as any, // Will be set next
        llmContext,
        reviewIR: null as any, // Will be set after
      };

      result.confidence = calculateContextConfidence(result);
      result.reviewIR = toReviewIR(result, cst);




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