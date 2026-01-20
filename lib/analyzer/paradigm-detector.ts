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


export type ExecutionModel =
  | 'synchronous'
  | 'asynchronous'
  | 'event-driven'
  | 'concurrent'
  | 'mixed';




export interface ExecutionModelAnalysis {
  primary: ExecutionModel;
  confidence: number;
  indicators: string[];
  asyncPatterns: number;
  eventPatterns: number;
  concurrencyPatterns: number;
}

export type StateLifetime =
  | 'stateless'
  | 'local-ephemeral'
  | 'local-escaping'
  | 'global-immutable'
  | 'global-mutable'
  | 'shared-mutable';

export interface StateAnalysis {
  lifetime: StateLifetime;
  confidence: number;
  globalVars: number;
  mutabilityScore: number;
  indicators: string[];
  escapingReferences: number; // References that escape local scope
  closureCaptures: number; // Captured variables in closures
}

export interface ParadigmMixing {
  isIntentional: boolean;
  patterns: MixingPattern[];
  recommendation: 'refactor' | 'accept' | 'document';
  score: number; // 0-1, higher = more mixed
}

export interface MixingPattern {
  paradigmA: string;
  paradigmB: string;
  location: { row: number; column: number };
  reason: 'legacy-code' | 'optimization' | 'framework-required' | 'inconsistent';
  severity: 'low' | 'medium' | 'high';
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
  executionModel: ExecutionModelAnalysis; // NEW
  state: StateAnalysis;

  // NEW FIELDS:
  mixing?: ParadigmMixing; // Detect paradigm mixing
  fitnessScore?: number; // How well the paradigm fits the language (0-1)
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
/**
 * ENHANCED: Extract class name with multiple fallback strategies
 */
function extractClassName(node: CSTNode, language: SupportedLanguage): string | null {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns || !patterns.class.includes(node.type)) {
    return null;
  }

  // Strategy 1: Find identifier child
  for (const child of node.children) {
    if (child.type === patterns.identifier || child.type === 'type_identifier') {
      const name = child.text.trim();
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length < 50) {
        return name;
      }
    }
  }

  // Strategy 2: Pattern matching on text
  const classPatterns: Record<string, RegExp> = {
    typescript: /class\s+([A-Z][a-zA-Z0-9_]*)/,
    python: /class\s+([A-Z][a-zA-Z0-9_]*)/,
    java: /class\s+([A-Z][a-zA-Z0-9_]*)/,
    cpp: /class\s+([A-Z][a-zA-Z0-9_]*)/,
    php: /class\s+([A-Z][a-zA-Z0-9_]*)/,
    ruby: /class\s+([A-Z][a-zA-Z0-9_]*)/,
  };

  const pattern = classPatterns[language];
  if (pattern) {
    const match = node.text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Strategy 3: Check parent context for assignment
  if (node.parent?.type === 'variable_declarator') {
    const nameNode = node.parent.children.find(c => c.type === patterns.identifier);
    if (nameNode) {
      const name = nameNode.text.trim();
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
/**
 * ENHANCED: Extract function name with multiple fallback strategies
 */
function extractFunctionName(node: CSTNode, language: SupportedLanguage): string | null {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns || !patterns.function.includes(node.type)) {
    return null;
  }

  // Handle anonymous functions (arrow, lambda, etc.)
  const anonymousTypes = ['arrow_function', 'function_expression', 'lambda'];
  if (anonymousTypes.includes(node.type)) {
    // Check if assigned to variable
    if (node.parent?.type === 'variable_declarator') {
      for (const child of node.parent.children) {
        if (child.type === patterns.identifier) {
          const name = child.text.trim();
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length < 50) {
            return name;
          }
        }
      }
    }

    // Check if it's a property assignment (method)
    if (node.parent?.type === 'pair' || node.parent?.type === 'property_assignment') {
      const keyNode = node.parent.children.find(c =>
        c.type === 'property_identifier' || c.type === patterns.identifier
      );
      if (keyNode) {
        const name = keyNode.text.trim();
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length < 50) {
          return name;
        }
      }
    }

    return null; // Truly anonymous
  }

  // Strategy 1: Find identifier child
  for (const child of node.children) {
    if (child.type === patterns.identifier || child.type === 'property_identifier') {
      const name = child.text.trim();
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length < 50) {
        return name;
      }
    }
  }

  // Strategy 2: Pattern matching
  const functionPatterns: Record<string, RegExp> = {
    typescript: /(?:function|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=(]/,
    python: /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
    go: /func\s+(?:\([^)]*\)\s*)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
    rust: /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[<(]/,
    java: /(?:public|private|protected|static)?\s*\w+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
    cpp: /(?:\w+\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:const)?\s*\{/,
    php: /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
    ruby: /def\s+([a-zA-Z_][a-zA-Z0-9_?!]*)/,
  };

  const pattern = functionPatterns[language];
  if (pattern) {
    const match = node.text.match(pattern);
    if (match && match[1]) {
      return match[1];
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
 * Analyze execution model from code patterns
 */
function analyzeExecutionModel(cst: CSTNode, language: SupportedLanguage): ExecutionModelAnalysis {
  let asyncPatterns = 0;
  let eventPatterns = 0;
  let concurrencyPatterns = 0;
  const indicators: string[] = [];

  const codeText = cst.text.toLowerCase();

  // Async patterns
  const asyncKeywords = ['async', 'await', 'promise', 'then(', 'catch('];
  asyncPatterns = asyncKeywords.filter(kw => codeText.includes(kw)).length;

  if (language === 'python') {
    if (codeText.includes('asyncio') || codeText.includes('async def')) asyncPatterns += 2;
  }
  if (language === 'go') {
    if (codeText.includes('go ') || codeText.includes('chan ')) asyncPatterns += 2;
  }
  if (language === 'rust') {
    if (codeText.includes('async fn') || codeText.includes('.await')) asyncPatterns += 2;
  }

  // Event patterns
  const eventKeywords = ['addeventlistener', '.on(', '.once(', 'emitter', 'observable', 'subject'];
  eventPatterns = eventKeywords.filter(kw => codeText.includes(kw)).length;

  // Concurrency patterns
  const concurrencyKeywords = ['thread', 'mutex', 'lock', 'atomic', 'concurrent', 'parallel'];
  concurrencyPatterns = concurrencyKeywords.filter(kw => codeText.includes(kw)).length;

  if (language === 'go') {
    if (codeText.includes('sync.') || codeText.includes('goroutine')) concurrencyPatterns += 2;
  }

  // Determine primary model
  let primary: ExecutionModel = 'synchronous';
  let maxScore = 0;

  if (asyncPatterns > maxScore) {
    primary = 'asynchronous';
    maxScore = asyncPatterns;
    indicators.push(`${asyncPatterns} async patterns`);
  }
  if (eventPatterns > maxScore) {
    primary = 'event-driven';
    maxScore = eventPatterns;
    indicators.push(`${eventPatterns} event handlers`);
  }
  if (concurrencyPatterns > maxScore) {
    primary = 'concurrent';
    maxScore = concurrencyPatterns;
    indicators.push(`${concurrencyPatterns} concurrency primitives`);
  }

  // Mixed if multiple patterns present
  const totalPatterns = asyncPatterns + eventPatterns + concurrencyPatterns;
  if (totalPatterns > 3 && maxScore < totalPatterns * 0.7) {
    primary = 'mixed';
    indicators.push('multiple execution models');
  }

  const confidence = Math.min(1, (maxScore + totalPatterns) / 10);

  return {
    primary,
    confidence: Math.round(confidence * 100) / 100,
    indicators: indicators.slice(0, 3),
    asyncPatterns,
    eventPatterns,
    concurrencyPatterns,
  };
}

/**
 * Analyze state lifetime and mutability with escaping detection
 */
function analyzeState(cst: CSTNode, language: SupportedLanguage, counts: PatternCounts): StateAnalysis {
  const indicators: string[] = [];
  let globalVars = 0;
  let mutabilityScore = 0;
  let escapingReferences = 0;
  let closureCaptures = 0;

  const codeText = cst.text.toLowerCase();

  // Count global declarations
  if (language === 'typescript') {
    globalVars = (codeText.match(/^(let|var)\s+\w+/gm) || []).length;
    const constCount = (codeText.match(/^const\s+\w+/gm) || []).length;
    mutabilityScore = globalVars > 0 ? (globalVars / (globalVars + constCount)) * 100 : 0;

    // Detect escaping through returns
    escapingReferences = (codeText.match(/return\s+\{[^}]*\}/g) || []).length;
    escapingReferences += (codeText.match(/return\s+\[/g) || []).length;

    // Detect closures
    closureCaptures = (codeText.match(/=>\s*{[^}]*\w+[^}]*}/g) || []).length;
  }

  if (language === 'python') {
    globalVars = (codeText.match(/^[A-Z_][A-Z0-9_]*\s*=/gm) || []).length;
    closureCaptures = (codeText.match(/nonlocal\s+/g) || []).length;
  }

  if (language === 'go') {
    globalVars = (codeText.match(/^var\s+\w+/gm) || []).length;
    escapingReferences = (codeText.match(/return\s+&/g) || []).length;
  }

  // Mutation indicators
  mutabilityScore += (counts.mutations / (counts.functions + 1)) * 50;
  mutabilityScore = Math.min(100, mutabilityScore);

  // Determine lifetime with finer granularity
  let lifetime: StateLifetime = 'stateless';

  if (globalVars > 3 && mutabilityScore > 40) {
    lifetime = 'global-mutable';
    indicators.push(`${globalVars} mutable globals`);
  } else if (globalVars > 2 && mutabilityScore <= 40) {
    lifetime = 'global-immutable';
    indicators.push(`${globalVars} immutable globals`);
  } else if (escapingReferences > 2 || closureCaptures > 2) {
    lifetime = 'local-escaping';
    indicators.push('escaping references detected');
  } else if (counts.mutations > counts.functions && globalVars === 0) {
    lifetime = 'shared-mutable';
    indicators.push('local mutation patterns');
  } else if (counts.functions > 0 && escapingReferences === 0) {
    lifetime = 'local-ephemeral';
    indicators.push('ephemeral local state');
  }

  const confidence = globalVars > 0 || counts.functions > 0 ? 0.85 : 0.4;

  return {
    lifetime,
    confidence,
    globalVars,
    mutabilityScore: Math.round(mutabilityScore),
    indicators: indicators.slice(0, 2),
    escapingReferences,
    closureCaptures,
  };
}
/**
 * Detect if code mixes paradigms and whether it's intentional
 */
function detectParadigmMixing(
  counts: PatternCounts,
  scores: { oop: number; functional: number; procedural: number },
  cst: CSTNode
): ParadigmMixing {
  const patterns: MixingPattern[] = [];
  const threshold = 25; // Paradigm scores above this indicate significant presence

  const activeParadigms = Object.entries(scores)
    .filter(([_, score]) => score > threshold)
    .map(([paradigm]) => paradigm);

  // If 2+ paradigms are significantly present, it's mixed
  if (activeParadigms.length < 2) {
    return {
      isIntentional: false,
      patterns: [],
      recommendation: 'accept',
      score: 0
    };
  }

  const mixingScore = activeParadigms.length / 3; // 0-1 scale

  // Detect specific mixing patterns

  // OOP + Functional mixing (common in modern TypeScript/Scala)
  if (scores.oop > threshold && scores.functional > threshold) {
    if (counts.classes > 0 && counts.mapFilterReduce > 0) {
      patterns.push({
        paradigmA: 'object-oriented',
        paradigmB: 'functional',
        location: { row: 0, column: 0 },
        reason: 'framework-required', // React, etc.
        severity: 'low'
      });
    }
  }

  // OOP + Procedural (often legacy code)
  if (scores.oop > threshold && scores.procedural > threshold) {
    if (counts.classes > 0 && counts.loops > counts.mapFilterReduce * 2) {
      patterns.push({
        paradigmA: 'object-oriented',
        paradigmB: 'procedural',
        location: { row: 0, column: 0 },
        reason: 'legacy-code',
        severity: 'medium'
      });
    }
  }

  // Functional + Procedural (inconsistent style)
  if (scores.functional > threshold && scores.procedural > threshold) {
    if (counts.loops > 0 && counts.mapFilterReduce > 0) {
      patterns.push({
        paradigmA: 'functional',
        paradigmB: 'procedural',
        location: { row: 0, column: 0 },
        reason: 'inconsistent',
        severity: 'high'
      });
    }
  }

  // Determine if mixing is intentional
  const intentionalReasons = new Set(['framework-required', 'optimization']);
  const isIntentional = patterns.every(p => intentionalReasons.has(p.reason));

  // Recommendation
  let recommendation: ParadigmMixing['recommendation'] = 'accept';
  if (patterns.some(p => p.severity === 'high')) {
    recommendation = 'refactor';
  } else if (patterns.some(p => p.severity === 'medium')) {
    recommendation = 'document';
  }

  return {
    isIntentional,
    patterns,
    recommendation,
    score: mixingScore
  };
}

/**
 * Calculate how well a paradigm fits the language
 */
function calculateParadigmFitness(
  paradigm: 'object-oriented' | 'functional' | 'procedural',
  language: SupportedLanguage
): number {
  // Language paradigm affinity (0-1)
  const affinityMatrix: Record<SupportedLanguage, Record<string, number>> = {
    typescript: { 'object-oriented': 0.9, 'functional': 0.9, 'procedural': 0.7 },
    python: { 'object-oriented': 0.9, 'functional': 0.8, 'procedural': 0.9 },
    go: { 'object-oriented': 0.6, 'functional': 0.6, 'procedural': 1.0 },
    rust: { 'object-oriented': 0.7, 'functional': 1.0, 'procedural': 0.8 },
    java: { 'object-oriented': 1.0, 'functional': 0.7, 'procedural': 0.7 },
    cpp: { 'object-oriented': 1.0, 'functional': 0.6, 'procedural': 0.9 },
    c: { 'object-oriented': 0.3, 'functional': 0.4, 'procedural': 1.0 },
    ruby: { 'object-oriented': 1.0, 'functional': 0.8, 'procedural': 0.7 },
    php: { 'object-oriented': 0.9, 'functional': 0.6, 'procedural': 0.8 },
  };

  return affinityMatrix[language]?.[paradigm] || 0.5;
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
  const executionModel = analyzeExecutionModel(cst, language);
  const state = analyzeState(cst, language, counts);

  // NEW: Detect paradigm mixing
  const mixing = detectParadigmMixing(counts, scores, cst);

  // NEW: Calculate fitness score
  const fitnessScore = calculateParadigmFitness(primary.paradigm as any, language);

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
    executionModel,
    state,
    mixing: mixing.patterns.length > 0 ? mixing : undefined,
    fitnessScore,
  };
}