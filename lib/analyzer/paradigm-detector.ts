/**
 * Paradigm Recognition Component
 * Identifies programming paradigms used in code (OOP, Functional, Procedural)
 * UPDATED: Now uses lossless CSTNode instead of truncated ASTNode
 */

import type { SupportedLanguage } from './language-detector';
import type { CSTNode } from './semantic-ir';

export interface ParadigmScore {
  paradigm: 'object-oriented' | 'functional' | 'procedural' | 'declarative';
  score: number; // 0-100
  confidence: number; // 0-1
  indicators: string[];
}

export interface ParadigmAnalysisResult {
  primary: ParadigmScore;
  secondary?: ParadigmScore;
  patterns: {
    classes: number;
    functions: number;
    pureFunctions: number;
    higherOrderFunctions: number;
    mutations: number;
    loops: number;
  };
}

// Language weights - some languages naturally favor certain paradigms
const LANGUAGE_WEIGHTS: Record<SupportedLanguage, { oop: number; functional: number; procedural: number }> = {
  typescript: { oop: 1.0, functional: 1.2, procedural: 0.9 },
  python: { oop: 1.1, functional: 1.0, procedural: 1.0 },
  go: { oop: 0.7, functional: 0.8, procedural: 1.3 },
  rust: { oop: 0.8, functional: 1.3, procedural: 0.9 },
  java: { oop: 1.5, functional: 0.7, procedural: 0.8 },
  cpp: { oop: 1.3, functional: 0.7, procedural: 1.1 },
  c: { oop: 0.3, functional: 0.5, procedural: 1.5 },
  ruby: { oop: 1.4, functional: 0.9, procedural: 0.8 },
  php: { oop: 1.2, functional: 0.7, procedural: 1.1 },
};

// Node type mappings for different languages
const OOP_NODE_TYPES = new Set([
  'class_declaration',
  'class_definition',
  'interface_declaration',
  'method_definition',
  'method_declaration',
  'constructor_definition',
  'property_definition',
  'field_declaration',
  'extends_clause',
  'implements_clause',
  'inheritance',
  'public_field_definition',
  'private_field_definition',
]);

const FUNCTIONAL_NODE_TYPES = new Set([
  'arrow_function',
  'lambda',
  'function_expression',
  'call_expression',
  'higher_order_function',
]);

const PROCEDURAL_NODE_TYPES = new Set([
  'for_statement',
  'while_statement',
  'do_statement',
  'for_in_statement',
  'assignment_expression',
  'augmented_assignment',
  'update_expression',
]);

interface PatternCounts {
  classes: number;
  functions: number;
  pureFunctions: number;
  higherOrderFunctions: number;
  mutations: number;
  loops: number;
  methodsInClasses: number;
  arrowFunctions: number;
  constDeclarations: number;
  mapFilterReduce: number;
  sideEffects: number;
}

/**
 * Count patterns in CST
 * UPDATED: Now uses CSTNode with full, untruncated text
 */
function countPatterns(node: CSTNode, language: SupportedLanguage): PatternCounts {
  const counts: PatternCounts = {
    classes: 0,
    functions: 0,
    pureFunctions: 0,
    higherOrderFunctions: 0,
    mutations: 0,
    loops: 0,
    methodsInClasses: 0,
    arrowFunctions: 0,
    constDeclarations: 0,
    mapFilterReduce: 0,
    sideEffects: 0,
  };

  const functionNodes: CSTNode[] = [];
  let insideClass = false;

  function traverse(n: CSTNode) {
    const type = n.type;
    // Use full text - NO TRUNCATION
    const text = n.text.toLowerCase();

    // OOP patterns
    if (OOP_NODE_TYPES.has(type) || type.includes('class')) {
      if (type.includes('class') && !type.includes('storage')) {
        counts.classes++;
        insideClass = true;
      }
      if (type.includes('method') && insideClass) {
        counts.methodsInClasses++;
      }
    }

    // Function patterns
    if (type.includes('function') || type.includes('lambda')) {
      counts.functions++;
      functionNodes.push(n);

      if (type === 'arrow_function' || type === 'lambda_expression') {
        counts.arrowFunctions++;
      }

      // Check if function returns another function (higher-order)
      // Now with full text access - NO TRUNCATION
      if (text.includes('return') && (text.includes('function') || text.includes('=>'))) {
        counts.higherOrderFunctions++;
      }
    }

    // Functional patterns - map/filter/reduce
    if (type === 'call_expression' || type === 'method_invocation') {
      // Full text available - NO TRUNCATION
      if (text.includes('.map(') || text.includes('.filter(') ||
        text.includes('.reduce(') || text.includes('.foreach(') ||
        text.includes('map(') || text.includes('filter(')) {
        counts.mapFilterReduce++;
      }
    }

    // Const declarations (immutability)
    if (type === 'lexical_declaration' && text.startsWith('const')) {
      counts.constDeclarations++;
    }

    // Procedural patterns - loops
    if (PROCEDURAL_NODE_TYPES.has(type) ||
      type.includes('for') || type.includes('while') || type.includes('loop')) {
      if (type.includes('for') || type.includes('while') || type.includes('loop')) {
        counts.loops++;
      }
    }

    // Mutations
    if (type === 'assignment_expression' || type === 'augmented_assignment' ||
      type === 'update_expression' || type.includes('assignment')) {
      counts.mutations++;
    }

    // Side effects (I/O operations)
    // Full text available - NO TRUNCATION
    if (text.includes('print') || text.includes('console.log') ||
      text.includes('write') || text.includes('read') ||
      text.includes('fetch') || text.includes('http')) {
      counts.sideEffects++;
    }

    n.children.forEach(traverse);

    if (OOP_NODE_TYPES.has(type) && type.includes('class')) {
      insideClass = false;
    }
  }

  traverse(node);

  // Heuristic for pure functions (functions with no side effects or mutations)
  counts.pureFunctions = Math.max(0, counts.functions - counts.sideEffects - Math.floor(counts.mutations * 0.3));

  return counts;
}

/**
 * Calculate paradigm scores
 */
function calculateScores(
  counts: PatternCounts,
  language: SupportedLanguage
): { oop: number; functional: number; procedural: number } {
  const weights = LANGUAGE_WEIGHTS[language];

  // OOP score
  let oopScore = 0;
  oopScore += counts.classes * 15;
  oopScore += counts.methodsInClasses * 5;
  oopScore = oopScore * weights.oop;

  // Functional score
  let functionalScore = 0;
  functionalScore += counts.pureFunctions * 8;
  functionalScore += counts.higherOrderFunctions * 12;
  functionalScore += counts.arrowFunctions * 4;
  functionalScore += counts.mapFilterReduce * 6;
  functionalScore += counts.constDeclarations * 2;
  functionalScore = functionalScore * weights.functional;

  // Procedural score
  let proceduralScore = 0;
  proceduralScore += counts.loops * 10;
  proceduralScore += counts.mutations * 5;
  proceduralScore += (counts.functions - counts.methodsInClasses) * 3;
  proceduralScore = proceduralScore * weights.procedural;

  // Normalize to 100
  const total = oopScore + functionalScore + proceduralScore;
  if (total === 0) {
    return { oop: 0, functional: 0, procedural: 0 };
  }

  return {
    oop: Math.round((oopScore / total) * 100),
    functional: Math.round((functionalScore / total) * 100),
    procedural: Math.round((proceduralScore / total) * 100),
  };
}

/**
 * Get indicators for a paradigm
 */
function getIndicators(
  paradigm: 'object-oriented' | 'functional' | 'procedural',
  counts: PatternCounts
): string[] {
  const indicators: string[] = [];

  switch (paradigm) {
    case 'object-oriented':
      if (counts.classes > 0) indicators.push(`${counts.classes} class${counts.classes > 1 ? 'es' : ''}`);
      if (counts.methodsInClasses > 0) indicators.push(`${counts.methodsInClasses} method${counts.methodsInClasses > 1 ? 's' : ''}`);
      break;

    case 'functional':
      if (counts.pureFunctions > 0) indicators.push(`${counts.pureFunctions} pure function${counts.pureFunctions > 1 ? 's' : ''}`);
      if (counts.higherOrderFunctions > 0) indicators.push(`${counts.higherOrderFunctions} higher-order function${counts.higherOrderFunctions > 1 ? 's' : ''}`);
      if (counts.mapFilterReduce > 0) indicators.push(`${counts.mapFilterReduce} map/filter/reduce call${counts.mapFilterReduce > 1 ? 's' : ''}`);
      if (counts.arrowFunctions > 0) indicators.push(`${counts.arrowFunctions} arrow function${counts.arrowFunctions > 1 ? 's' : ''}`);
      break;

    case 'procedural':
      if (counts.loops > 0) indicators.push(`${counts.loops} loop${counts.loops > 1 ? 's' : ''}`);
      if (counts.mutations > 0) indicators.push(`${counts.mutations} mutation${counts.mutations > 1 ? 's' : ''}`);
      break;
  }

  return indicators.slice(0, 3);
}

/**
 * Calculate confidence based on code complexity
 */
function calculateConfidence(score: number, totalPatterns: number): number {
  if (totalPatterns === 0) return 0;

  // Base confidence from score
  let confidence = score / 100;

  // Adjust for code size (more patterns = higher confidence)
  if (totalPatterns < 5) {
    confidence *= 0.6;
  } else if (totalPatterns < 10) {
    confidence *= 0.8;
  } else if (totalPatterns < 20) {
    confidence *= 0.9;
  }

  return Math.min(Math.round(confidence * 100) / 100, 1.0);
}

/**
 * Analyze programming paradigm from CST
 * UPDATED: Now uses CSTNode instead of ASTNode for lossless analysis
 */
export function analyzeParadigm(
  cst: CSTNode,
  language: SupportedLanguage
): ParadigmAnalysisResult {
  // Count patterns - now with full text access
  const counts = countPatterns(cst, language);

  // Calculate scores
  const scores = calculateScores(counts, language);

  // Total patterns for confidence calculation
  const totalPatterns =
    counts.classes + counts.functions + counts.loops +
    counts.mapFilterReduce + counts.higherOrderFunctions;

  // Create paradigm scores
  const paradigms: Array<{
    paradigm: 'object-oriented' | 'functional' | 'procedural';
    score: number;
  }> = [
      { paradigm: 'object-oriented', score: scores.oop },
      { paradigm: 'functional', score: scores.functional },
      { paradigm: 'procedural', score: scores.procedural },
    ];

  // Sort by score
  paradigms.sort((a, b) => b.score - a.score);

  // Primary paradigm
  const primary: ParadigmScore = {
    paradigm: paradigms[0].paradigm,
    score: paradigms[0].score,
    confidence: calculateConfidence(paradigms[0].score, totalPatterns),
    indicators: getIndicators(paradigms[0].paradigm, counts),
  };

  // Secondary paradigm (if significant)
  let secondary: ParadigmScore | undefined;
  if (paradigms[1].score >= 20 && paradigms[1].score >= paradigms[0].score * 0.4) {
    secondary = {
      paradigm: paradigms[1].paradigm,
      score: paradigms[1].score,
      confidence: calculateConfidence(paradigms[1].score, totalPatterns),
      indicators: getIndicators(paradigms[1].paradigm, counts),
    };
  }

  return {
    primary,
    secondary,
    patterns: {
      classes: counts.classes,
      functions: counts.functions,
      pureFunctions: counts.pureFunctions,
      higherOrderFunctions: counts.higherOrderFunctions,
      mutations: counts.mutations,
      loops: counts.loops,
    },
  };
}