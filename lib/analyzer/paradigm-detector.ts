/**
 * FIXED Paradigm Recognition Component
 * Extracts ACTUAL identifiers from code, not node types
 */

import type { SupportedLanguage } from './language-detector';
import type { CSTNode } from './semantic-ir';

export interface ParadigmScore {
  paradigm: 'object-oriented' | 'functional' | 'procedural' | 'declarative';
  score: number;
  confidence: number;
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
  details: {
    classNames: string[];
    functionNames: string[];
    loopTypes: Array<{ type: string; line: number }>;
  };
}

// Language-specific node type mappings
type LanguagePattern = {
  class: string[];
  function: string[];
  loop: string[];
  identifier: string;
};

const LANGUAGE_PATTERNS: Record<SupportedLanguage, LanguagePattern> = {
  typescript: {
    class: ['class_declaration'],
    function: ['function_declaration', 'method_definition', 'arrow_function', 'function_expression'],
    loop: ['for_statement', 'for_in_statement', 'while_statement', 'do_statement'],
    identifier: 'identifier',
  },
  python: {
    class: ['class_definition'],
    function: ['function_definition'],
    loop: ['for_statement', 'while_statement'],
    identifier: 'identifier',
  },
  go: {
    class: [], // Go doesn't have classes
    function: ['function_declaration', 'method_declaration'],
    loop: ['for_statement'],
    identifier: 'identifier',
  },
  rust: {
    class: [], // Rust uses structs
    function: ['function_item'],
    loop: ['for_expression', 'while_expression', 'loop_expression'],
    identifier: 'identifier',
  },
  java: {
    class: ['class_declaration'],
    function: ['method_declaration'],
    loop: ['for_statement', 'while_statement', 'do_statement', 'enhanced_for_statement'],
    identifier: 'identifier',
  },
  cpp: {
    class: ['class_specifier'],
    function: ['function_definition'],
    loop: ['for_statement', 'while_statement', 'do_statement', 'for_range_loop'],
    identifier: 'identifier',
  },
  c: {
    class: [],
    function: ['function_definition'],
    loop: ['for_statement', 'while_statement', 'do_statement'],
    identifier: 'identifier',
  },
  ruby: {
    class: ['class'],
    function: ['method'],
    loop: ['for', 'while', 'until'],
    identifier: 'identifier',
  },
  php: {
    class: ['class_declaration'],
    function: ['method_declaration', 'function_definition'],
    loop: ['for_statement', 'while_statement', 'do_statement', 'foreach_statement'],
    identifier: 'name',
  },
};

/**
 * FIXED: Extract ACTUAL class name from declaration node
 */
function extractClassName(node: CSTNode, language: SupportedLanguage): string | null {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns || !patterns.class.includes(node.type)) {
    return null;
  }

  // Find the identifier child that contains the class name
  for (const child of node.children) {
    if (child.type === patterns.identifier || child.type === 'type_identifier') {
      const name = child.text.trim();
      // Validate: must be a valid identifier (alphanumeric + underscore, starts with letter)
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length < 50) {
        return name;
      }
    }
  }

  return null;
}

/**
 * FIXED: Extract ACTUAL function name from declaration node
 */
function extractFunctionName(node: CSTNode, language: SupportedLanguage): string | null {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns || !patterns.function.includes(node.type)) {
    return null;
  }

  // Arrow functions and anonymous functions don't have names
  if (node.type === 'arrow_function' || node.type === 'function_expression') {
    // Check if it's assigned to a variable
    const parent = node.parent;
    if (parent?.type === 'variable_declarator') {
      for (const child of parent.children) {
        if (child.type === patterns.identifier) {
          const name = child.text.trim();
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length < 50) {
            return name;
          }
        }
      }
    }
    return null; // Anonymous function
  }

  // Find the identifier child
  for (const child of node.children) {
    if (child.type === patterns.identifier || child.type === 'property_identifier') {
      const name = child.text.trim();
      // Validate: must be a valid identifier
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length < 50) {
        return name;
      }
    }
  }

  return null;
}

/**
 * FIXED: Get ACTUAL loop type from node
 */
function getLoopType(node: CSTNode, language: SupportedLanguage): string | null {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns || !patterns.loop.includes(node.type)) {
    return null;
  }

  // Convert node type to human-readable loop type
  const typeMap: Record<string, string> = {
    'for_statement': 'for',
    'for_in_statement': 'for...in',
    'for_of_statement': 'for...of',
    'while_statement': 'while',
    'do_statement': 'do...while',
    'enhanced_for_statement': 'for-each',
    'foreach_statement': 'foreach',
    'for_range_loop': 'range-for',
    'for_expression': 'for',
    'while_expression': 'while',
    'loop_expression': 'loop',
  };

  return typeMap[node.type] || node.type;
}

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
  classNames: string[];
  functionNames: string[];
  loopTypes: Array<{ type: string; line: number }>;
}

/**
 * FIXED: Count patterns using language-specific node types
 */
function countPatterns(node: CSTNode, language: SupportedLanguage): PatternCounts {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns) {
    return {
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
      classNames: [],
      functionNames: [],
      loopTypes: [],
    };
  }

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
    classNames: [],
    functionNames: [],
    loopTypes: [],
  };

  let insideClass = false;
  const functionNodes: CSTNode[] = [];

  function traverse(n: CSTNode) {
    const type = n.type;
    const text = n.text.toLowerCase();

    // Classes
    if (patterns.class.includes(type)) {
      counts.classes++;
      insideClass = true;

      const className = extractClassName(n, language);
      if (className) {
        counts.classNames.push(className);
      }
    }

    // Functions
    if (patterns.function.includes(type)) {
      counts.functions++;
      functionNodes.push(n);

      if (insideClass) {
        counts.methodsInClasses++;
      }

      if (type === 'arrow_function') {
        counts.arrowFunctions++;
      }

      const functionName = extractFunctionName(n, language);
      if (functionName) {
        counts.functionNames.push(functionName);
      }

      // Check for higher-order functions (returns a function)
      if (text.includes('return') && (text.includes('function') || text.includes('=>'))) {
        counts.higherOrderFunctions++;
      }
    }

    // Loops
    if (patterns.loop.includes(type)) {
      counts.loops++;

      const loopType = getLoopType(n, language);
      if (loopType) {
        counts.loopTypes.push({
          type: loopType,
          line: n.startPosition.row,
        });
      }
    }

    // Functional patterns
    if (type === 'call_expression' || type === 'method_invocation') {
      if (text.includes('.map(') || text.includes('.filter(') ||
        text.includes('.reduce(') || text.includes('.foreach(')) {
        counts.mapFilterReduce++;
      }
    }

    // Immutability
    if (language === 'typescript' && type === 'lexical_declaration') {
      if (text.startsWith('const')) {
        counts.constDeclarations++;
      }
    }

    // Mutations
    if (type.includes('assignment') || type === 'update_expression' ||
      type === 'augmented_assignment_expression') {
      counts.mutations++;
    }

    // Side effects
    if (text.includes('console.log') || text.includes('print(') ||
      text.includes('println') || text.includes('write') ||
      text.includes('fetch') || text.includes('http')) {
      counts.sideEffects++;
    }

    // Traverse children
    n.children.forEach(traverse);

    // Exit class scope
    if (patterns.class.includes(type)) {
      insideClass = false;
    }
  }

  traverse(node);

  // Estimate pure functions
  counts.pureFunctions = Math.max(
    0,
    counts.functions - counts.sideEffects - Math.floor(counts.mutations * 0.3)
  );

  return counts;
}

/**
 * Calculate paradigm scores with language-specific weights
 */
function calculateScores(
  counts: PatternCounts,
  language: SupportedLanguage
): { oop: number; functional: number; procedural: number } {
  const weights = {
    typescript: { oop: 1.0, functional: 1.2, procedural: 0.9 },
    python: { oop: 1.1, functional: 1.0, procedural: 1.0 },
    go: { oop: 0.7, functional: 0.8, procedural: 1.3 },
    rust: { oop: 0.8, functional: 1.3, procedural: 0.9 },
    java: { oop: 1.5, functional: 0.7, procedural: 0.8 },
    cpp: { oop: 1.3, functional: 0.7, procedural: 1.1 },
    c: { oop: 0.3, functional: 0.5, procedural: 1.5 },
    ruby: { oop: 1.4, functional: 0.9, procedural: 0.8 },
    php: { oop: 1.2, functional: 0.7, procedural: 1.1 },
  }[language];

  // Calculate scores
  let oopScore = (counts.classes * 15 + counts.methodsInClasses * 5) * weights.oop;
  let functionalScore = (
    counts.pureFunctions * 8 +
    counts.higherOrderFunctions * 12 +
    counts.arrowFunctions * 4 +
    counts.mapFilterReduce * 6 +
    counts.constDeclarations * 2
  ) * weights.functional;
  let proceduralScore = (
    counts.loops * 10 +
    counts.mutations * 5 +
    (counts.functions - counts.methodsInClasses) * 3
  ) * weights.procedural;

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
 * Get specific indicators for a paradigm
 */
function getIndicators(
  paradigm: 'object-oriented' | 'functional' | 'procedural',
  counts: PatternCounts
): string[] {
  const indicators: string[] = [];

  switch (paradigm) {
    case 'object-oriented':
      if (counts.classes > 0) {
        indicators.push(`${counts.classes} class${counts.classes > 1 ? 'es' : ''}`);
      }
      if (counts.methodsInClasses > 0) {
        indicators.push(`${counts.methodsInClasses} method${counts.methodsInClasses > 1 ? 's' : ''}`);
      }
      break;

    case 'functional':
      if (counts.pureFunctions > 0) {
        indicators.push(`${counts.pureFunctions} pure function${counts.pureFunctions > 1 ? 's' : ''}`);
      }
      if (counts.mapFilterReduce > 0) {
        indicators.push(`${counts.mapFilterReduce} array method${counts.mapFilterReduce > 1 ? 's' : ''}`);
      }
      if (counts.arrowFunctions > 0) {
        indicators.push(`${counts.arrowFunctions} arrow function${counts.arrowFunctions > 1 ? 's' : ''}`);
      }
      break;

    case 'procedural':
      if (counts.loops > 0) {
        indicators.push(`${counts.loops} loop${counts.loops > 1 ? 's' : ''}`);
      }
      if (counts.mutations > 0) {
        indicators.push(`${counts.mutations} mutation${counts.mutations > 1 ? 's' : ''}`);
      }
      break;
  }

  return indicators.slice(0, 3);
}

/**
 * Calculate confidence based on evidence
 */
function calculateConfidence(score: number, totalPatterns: number): number {
  if (totalPatterns === 0) return 0;

  let confidence = score / 100;

  // Penalize low evidence
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
 * MAIN EXPORT: Analyze paradigm from CST
 */
export function analyzeParadigm(
  cst: CSTNode,
  language: SupportedLanguage
): ParadigmAnalysisResult {
  // Count patterns using language-specific rules
  const counts = countPatterns(cst, language);

  // Calculate scores
  const scores = calculateScores(counts, language);

  // Total evidence
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

  paradigms.sort((a, b) => b.score - a.score);

  // Primary paradigm
  const primary: ParadigmScore = {
    paradigm: paradigms[0].paradigm,
    score: paradigms[0].score,
    confidence: calculateConfidence(paradigms[0].score, totalPatterns),
    indicators: getIndicators(paradigms[0].paradigm, counts),
  };

  // Secondary paradigm
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
    details: {
      classNames: counts.classNames,
      functionNames: counts.functionNames,
      loopTypes: counts.loopTypes,
    },
  };
}