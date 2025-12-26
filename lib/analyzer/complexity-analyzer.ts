
import type { BlockIR, CSTNode, FunctionIR, ProgramIR, StatementIR } from '../analyzer/semantic-ir';
import type { ASTNode } from '../tree-sitter/use-tree-sitter';
import { IRBuilder } from './ir-builder';
import { getAdapter } from './language-adaptor';
import type { SupportedLanguage } from './language-detector';

export interface ComplexityBreakdown {
  location: string;
  operation: string;
  complexity: string;
  reasoning: string;
}

export interface CaseComplexity {
  bigO: string;
  explanation: string;
  breakdown: ComplexityBreakdown[];
}

export interface TimeComplexity {
  worstCase: CaseComplexity;
  averageCase?: CaseComplexity;
  bestCase?: CaseComplexity;
}

export interface SpaceComplexity {
  bigO: string;
  explanation: string;
  breakdown: ComplexityBreakdown[];
}

export interface InputSize {
  name: string;
  description: string;
  growthImpact: 'primary' | 'secondary' | 'negligible';
}

export interface DominantOperation {
  type: string;
  location: string;
  complexity: string;
}

export interface OptimizationSuggestion {
  current: string;
  improved: string;
  technique: string;
}

export interface ComplexityAnalysisResult {
  timeComplexity: TimeComplexity;
  spaceComplexity: SpaceComplexity;
  inputSizes: InputSize[];
  dominantOperations: DominantOperation[];
  optimizationSuggestions: OptimizationSuggestion[];
  analysisTime: number;
}

interface LoopInfo {
  node: ASTNode;
  depth: number;
  iterations: string;
  type: 'for' | 'while' | 'foreach' | 'recursion';
  variable?: string;
  dependent: boolean;
}

interface RecursionInfo {
  node: ASTNode;
  branchingFactor: number;
  depth: string;
  recurrenceRelation: string;
}

interface DataStructureOp {
  type: string;
  operation: string;
  complexity: string;
}

const DATA_STRUCTURE_COMPLEXITY: Record<string, Record<string, string>> = {
  'array': {
    'access': 'O(1)',
    'search': 'O(n)',
    'insert': 'O(n)',
    'delete': 'O(n)',
    'push': 'O(1)',
    'pop': 'O(1)',
  },
  'hash_map': {
    'access': 'O(1)',
    'search': 'O(1)',
    'insert': 'O(1)',
    'delete': 'O(1)',
  },
  'linked_list': {
    'access': 'O(n)',
    'search': 'O(n)',
    'insert': 'O(1)',
    'delete': 'O(1)',
  },
  'tree': {
    'access': 'O(log n)',
    'search': 'O(log n)',
    'insert': 'O(log n)',
    'delete': 'O(log n)',
  },
  'heap': {
    'insert': 'O(log n)',
    'delete': 'O(log n)',
    'peek': 'O(1)',
  },
};

const BUILT_IN_COMPLEXITY: Record<string, string> = {
  'sort': 'O(n log n)',
  'map': 'O(n)',
  'filter': 'O(n)',
  'reduce': 'O(n)',
  'forEach': 'O(n)',
  'find': 'O(n)',
  'indexOf': 'O(n)',
  'includes': 'O(n)',
  'join': 'O(n)',
  'split': 'O(n)',
  'concat': 'O(n)',
  'slice': 'O(n)',
  'splice': 'O(n)',
};

/**
 * Identify input parameters and their sizes
 */
function identifyInputSizes(cst: CSTNode, language: SupportedLanguage): InputSize[] {
  const inputs: InputSize[] = [];
  const paramNames = new Set<string>();

  function findParameters(node: ASTNode) {
    // Function parameters
    if (node.type.includes('parameter') || node.type === 'formal_parameters') {
      node.children.forEach(child => {
        if (child.type === 'identifier' || child.type.includes('parameter')) {
          const name = child.text;
          if (name && name.length < 20 && !paramNames.has(name)) {
            paramNames.add(name);
            inputs.push({
              name,
              description: `input parameter`,
              growthImpact: 'primary',
            });
          }
        }
      });
    }

    node.children.forEach(findParameters);
  }

  findParameters(cst);

  // Default input if none found
  if (inputs.length === 0) {
    inputs.push({
      name: 'n',
      description: 'input size',
      growthImpact: 'primary',
    });
  }

  return inputs.slice(0, 3);
}

/**
 * Detect loops and their characteristics
 */
function detectLoops(cst: CSTNode): LoopInfo[] {
  const loops: LoopInfo[] = [];
  const loopStack: number[] = [];

  function traverse(node: CSTNode, depth: number = 0) {
    // Now has access to FULL text, no truncation
    const isLoop = node.type.includes('for') ||
      node.type.includes('while') ||
      node.type.includes('loop');

    if (isLoop) {
      loopStack.push(depth);
      const currentDepth = loopStack.length;

      // Analyze loop bounds
      let iterations = 'n';
      let loopType: LoopInfo['type'] = 'for';
      let variable = '';
      let dependent = false;

      const text = node.text.toLowerCase();

      // Detect loop type
      if (text.includes('while')) {
        loopType = 'while';
      } else if (text.includes('foreach') || text.includes('for') && text.includes(' in ')) {
        loopType = 'foreach';
      }

      // Detect iteration pattern
      if (text.includes('*= 2') || text.includes('* 2')) {
        iterations = 'log n';
      } else if (text.includes('/= 2') || text.includes('/ 2')) {
        iterations = 'log n';
      } else if (text.includes('.length') || text.includes('len(')) {
        iterations = 'n';
        dependent = currentDepth > 1;
      }

      loops.push({
        node,
        depth: currentDepth,
        iterations,
        type: loopType,
        variable,
        dependent,
      });
    }

    node.children.forEach(child => traverse(child, depth + 1));

    if (isLoop) {
      loopStack.pop();
    }
  }

  traverse(cst);
  return loops;
}

/**
 * Detect recursion
 */
function detectRecursion(cst: CSTNode): RecursionInfo[] {
  const recursions: RecursionInfo[] = [];
  const functionNames = new Set<string>();
  const functionCalls = new Map<string, number>();

  // First pass: collect function names
  function collectFunctions(node: ASTNode) {
    if (node.type.includes('function') && node.type.includes('definition')) {
      const nameNode = node.children.find(c => c.type === 'identifier');
      if (nameNode) {
        functionNames.add(nameNode.text);
      }
    }
    node.children.forEach(collectFunctions);
  }

  // Second pass: find recursive calls
  function findRecursiveCalls(node: ASTNode, currentFunction: string = '') {
    if (node.type.includes('function') && node.type.includes('definition')) {
      const nameNode = node.children.find(c => c.type === 'identifier');
      if (nameNode) {
        currentFunction = nameNode.text;
      }
    }

    if (node.type.includes('call') && currentFunction) {
      const callNameNode = node.children.find(c => c.type === 'identifier');
      if (callNameNode && callNameNode.text === currentFunction) {
        const count = (functionCalls.get(currentFunction) || 0) + 1;
        functionCalls.set(currentFunction, count);
      }
    }

    node.children.forEach(child => findRecursiveCalls(child, currentFunction));
  }

  collectFunctions(cst);
  findRecursiveCalls(cst);

  // Analyze recursive functions
  for (const [name, count] of functionCalls.entries()) {
    recursions.push({
      node: cst,
      branchingFactor: count,
      depth: 'n',
      recurrenceRelation: `T(n) = ${count}T(n/2) + O(1)`,
    });
  }

  return recursions;
}

/**
 * Calculate combined complexity from nested structures
 */
function combineComplexity(complexities: string[]): string {
  if (complexities.length === 0) return 'O(1)';
  if (complexities.length === 1) return complexities[0];

  // Parse and multiply complexities
  let result = 1;
  let hasLog = false;
  let hasN = false;
  let nPower = 0;

  for (const c of complexities) {
    const clean = c.replace(/O\(|\)/g, '');

    if (clean === '1') continue;

    if (clean.includes('log')) {
      hasLog = true;
    }

    if (clean.includes('n')) {
      hasN = true;
      const match = clean.match(/n\^?(\d*)/);
      if (match) {
        const power = match[1] ? parseInt(match[1]) : 1;
        nPower += power;
      }
    }
  }

  // Build result
  if (nPower === 0 && !hasLog) return 'O(1)';

  let complexityStr = 'O(';

  if (nPower > 0) {
    complexityStr += nPower === 1 ? 'n' : `n^${nPower}`;
  }

  if (hasLog) {
    complexityStr += nPower > 0 ? ' log n' : 'log n';
  }

  complexityStr += ')';

  return complexityStr;
}

/**
 * Analyze time complexity
 */
function analyzeTimeComplexity(
  cst: CSTNode,
  language: SupportedLanguage
): TimeComplexity {
  const loops = detectLoops(cst);
  const recursions = detectRecursion(cst);
  const breakdown: ComplexityBreakdown[] = [];

  // Analyze nested loops
  let maxLoopDepth = 0;
  const loopComplexities: string[] = [];

  for (const loop of loops) {
    if (loop.depth > maxLoopDepth) {
      maxLoopDepth = loop.depth;
    }

    const loopComplexity = loop.iterations === 'log n' ? 'O(log n)' : 'O(n)';

    breakdown.push({
      location: `loop at depth ${loop.depth}`,
      operation: `${loop.type} loop`,
      complexity: loopComplexity,
      reasoning: `Iterates ${loop.iterations} times${loop.dependent ? ' (dependent on outer loop)' : ''}`,
    });
  }

  // Calculate nested loop complexity
  let timeComplexity = 'O(1)';
  const loopComplexityChain: string[] = [];
  if (maxLoopDepth > 0) {
    // For each depth level, find the worst-case loop complexity
    for (let d = 1; d <= maxLoopDepth; d++) {
      const loopsAtDepth = loops.filter(l => l.depth === d);
      if (loopsAtDepth.length > 0) {
        // Prefer O(n) over O(log n) for worst case
        const hasLinear = loopsAtDepth.some(l => l.iterations !== 'log n');
        loopComplexityChain.push(hasLinear ? 'O(n)' : 'O(log n)');
      }
    }
    timeComplexity = combineComplexity(loopComplexityChain);
  }

  // Analyze recursion
  if (recursions.length > 0) {
    const recursion = recursions[0];
    if (recursion.branchingFactor === 2) {
      timeComplexity = 'O(2^n)';
      breakdown.push({
        location: 'recursive function',
        operation: 'recursion',
        complexity: 'O(2^n)',
        reasoning: 'Two recursive calls per invocation creates exponential growth',
      });
    } else if (recursion.branchingFactor === 1) {
      timeComplexity = 'O(n log n)';
      breakdown.push({
        location: 'recursive function',
        operation: 'divide and conquer',
        complexity: 'O(n log n)',
        reasoning: 'Single recursive call with linear work per level',
      });
    }
  }

  // Check for built-in operations
  const text = cst.text.toLowerCase();
  for (const [operation, complexity] of Object.entries(BUILT_IN_COMPLEXITY)) {
    if (text.includes(operation.toLowerCase())) {
      breakdown.push({
        location: 'built-in method',
        operation,
        complexity,
        reasoning: `Built-in ${operation} operation`,
      });
    }
  }

  const explanation = breakdown.length > 0
    ? breakdown[0].reasoning
    : 'Constant time operations only';

  return {
    worstCase: {
      bigO: timeComplexity,
      explanation,
      breakdown: breakdown.slice(0, 5),
    },
  };
}

/**
 * Analyze space complexity
 */
function analyzeSpaceComplexity(cst: CSTNode): SpaceComplexity {
  const breakdown: ComplexityBreakdown[] = [];
  let maxSpace = 'O(1)';

  // Detect data structure allocations
  function findAllocations(node: CSTNode) {
    const text = node.text.toLowerCase();

    // Array/list allocations
    if (text.includes('new array') || text.includes('[]') ||
      text.includes('list()') || text.includes('vec!')) {
      breakdown.push({
        location: 'data structure',
        operation: 'array allocation',
        complexity: 'O(n)',
        reasoning: 'Allocates array proportional to input size',
      });
      maxSpace = 'O(n)';
    }

    // Map/dictionary allocations
    if (text.includes('new map') || text.includes('{}') ||
      text.includes('dict()') || text.includes('hashmap')) {
      breakdown.push({
        location: 'data structure',
        operation: 'hash map allocation',
        complexity: 'O(n)',
        reasoning: 'Allocates map proportional to input size',
      });
      maxSpace = 'O(n)';
    }

    // Matrix allocations
    if (text.includes('[][]') || (text.includes('array') && text.includes('array'))) {
      breakdown.push({
        location: 'data structure',
        operation: 'matrix allocation',
        complexity: 'O(n²)',
        reasoning: 'Allocates 2D array',
      });
      maxSpace = 'O(n²)';
    }

    node.children.forEach(findAllocations);
  }

  findAllocations(cst);

  // Check recursion depth
  const recursions = detectRecursion(cst);
  if (recursions.length > 0) {
    breakdown.push({
      location: 'call stack',
      operation: 'recursion',
      complexity: 'O(n)',
      reasoning: 'Recursion depth adds to call stack',
    });

    if (maxSpace === 'O(1)') {
      maxSpace = 'O(n)';
    }
  }

  const explanation = breakdown.length > 0
    ? breakdown[0].reasoning
    : 'No additional space allocated';

  return {
    bigO: maxSpace,
    explanation,
    breakdown: breakdown.slice(0, 5),
  };
}

/**
 * Generate optimization suggestions
 */
function generateOptimizations(
  timeComplexity: TimeComplexity,
  spaceComplexity: SpaceComplexity,
  loops: LoopInfo[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // Nested loop optimizations
  if (loops.length >= 2 && timeComplexity.worstCase.bigO.includes('n²')) {
    suggestions.push({
      current: 'O(n²) nested loops',
      improved: 'O(n) using hash map',
      technique: 'Trade space for time - use hash map to eliminate inner loop',
    });
  }

  // Linear search optimizations
  if (timeComplexity.worstCase.bigO === 'O(n)' && loops.length === 1) {
    suggestions.push({
      current: 'O(n) linear search',
      improved: 'O(log n) binary search',
      technique: 'Sort array first, then use binary search',
    });
  }

  // Recursion optimizations
  if (timeComplexity.worstCase.bigO.includes('2^n')) {
    suggestions.push({
      current: 'O(2^n) exponential recursion',
      improved: 'O(n) with memoization',
      technique: 'Cache recursive results to avoid recomputation',
    });
  }

  return suggestions;
}

/**
 * Legacy complexity analysis function (fallback)
 */
function analyzeComplexityLegacy(
  cst: CSTNode,
  language: SupportedLanguage,
  startTime: number
): ComplexityAnalysisResult {
  // Analyze components
  const inputSizes = identifyInputSizes(cst, language);
  const timeComplexity = analyzeTimeComplexity(cst, language);
  const spaceComplexity = analyzeSpaceComplexity(cst);
  const loops = detectLoops(cst);

  // Identify dominant operations
  const dominantOperations: DominantOperation[] = [];
  if (loops.length > 0) {
    const deepestLoop = loops.reduce((max, loop) =>
      loop.depth > max.depth ? loop : max
    );
    dominantOperations.push({
      type: `nested loops (depth ${deepestLoop.depth})`,
      location: 'loop structure',
      complexity: timeComplexity.worstCase.bigO,
    });
  }

  // Generate optimization suggestions
  const optimizationSuggestions = generateOptimizations(
    timeComplexity,
    spaceComplexity,
    loops
  );

  const analysisTime = performance.now() - startTime;

  return {
    timeComplexity,
    spaceComplexity,
    inputSizes,
    dominantOperations,
    optimizationSuggestions,
    analysisTime,
  };
}

/**
 * Main complexity analysis function - IR-based
 */
export function analyzeComplexity(
  cst: CSTNode,
  language: SupportedLanguage
): ComplexityAnalysisResult {
  const startTime = performance.now();

  // Get language adapter
  const adapter = getAdapter(language);
  if (!adapter) {
    // Fallback to old behavior if no adapter
    return analyzeComplexityLegacy(cst, language, startTime);
  }

  // Build IR
  const builder = new IRBuilder(adapter, language);
  const programIR = builder.buildProgram(cst);

  // Analyze using IR
  const timeComplexity = analyzeTimeComplexityFromIR(programIR);
  const spaceComplexity = analyzeSpaceComplexityFromIR(programIR);
  const inputSizes = extractInputSizesFromIR(programIR);
  const dominantOps = findDominantOperations(programIR);
  const optimizations = generateOptimizationsFromIR(programIR, timeComplexity);

  const analysisTime = performance.now() - startTime;

  return {
    timeComplexity,
    spaceComplexity,
    inputSizes,
    dominantOperations: dominantOps,
    optimizationSuggestions: optimizations,
    analysisTime,
  };
}

/**
 * Analyze time complexity from IR
 */
function analyzeTimeComplexityFromIR(program: ProgramIR): TimeComplexity {
  const breakdown: ComplexityBreakdown[] = [];

  // Analyze entry points or all functions
  const functionsToAnalyze = program.entryPoints.length > 0
    ? program.entryPoints
    : program.functions;

  let worstComplexity = 'O(1)';

  for (const func of functionsToAnalyze) {
    const funcComplexity = analyzeFunctionComplexity(func, program);
    breakdown.push(...funcComplexity.breakdown);

    // Update worst case
    if (compareComplexity(funcComplexity.complexity, worstComplexity) > 0) {
      worstComplexity = funcComplexity.complexity;
    }
  }

  return {
    worstCase: {
      bigO: worstComplexity,
      explanation: breakdown.length > 0 ? breakdown[0].reasoning : 'Constant time operations',
      breakdown: breakdown.slice(0, 5),
    },
  };
}

/**
 * Analyze complexity of a single function
 */
function analyzeFunctionComplexity(func: FunctionIR, program: ProgramIR): {
  complexity: string;
  breakdown: ComplexityBreakdown[];
} {
  const breakdown: ComplexityBreakdown[] = [];

  // Check for recursion
  if (func.isRecursive) {
    breakdown.push({
      location: `function ${func.name}`,
      operation: 'recursion',
      complexity: 'O(2^n)', // Conservative estimate
      reasoning: 'Recursive function - actual complexity depends on recurrence relation',
    });
    return { complexity: 'O(2^n)', breakdown };
  }

  // Analyze loops
  const loopComplexities = analyzeLoopsInBlock(func.body, breakdown);
  const combinedComplexity = combineComplexities(loopComplexities);

  return { complexity: combinedComplexity, breakdown };
}

/**
 * Analyze loops in a block
 */
function analyzeLoopsInBlock(block: BlockIR, breakdown: ComplexityBreakdown[]): string[] {
  const complexities: string[] = [];
  const processedLoops = new Set<string>(); // Track processed loops by ID

  const analyzeStatement = (stmt: StatementIR, depth: number) => {
    if (stmt.type === 'loop') {
      // Prevent double-counting the same loop
      if (processedLoops.has(stmt.id)) {
        return;
      }
      processedLoops.add(stmt.id);

      const loopComplexity = stmt.bounds?.complexity || 'O(n)';

      breakdown.push({
        location: `loop at depth ${depth}`,
        operation: 'iteration',
        complexity: loopComplexity,
        reasoning: stmt.bounds?.type === 'constant'
          ? `Constant iterations: ${stmt.bounds.value}`
          : stmt.bounds?.type === 'input'
            ? `Depends on input size (${stmt.bounds.variable})`
            : 'Unknown iteration count',
      });

      complexities.push(loopComplexity);

      // Analyze nested loops - only increment depth for nested loops
      for (const child of stmt.children) {
        analyzeStatement(child, depth + 1);
      }
    } else if (stmt.type === 'conditional') {
      // Conditionals don't increase depth - analyze branches at same depth
      if (stmt.branches) {
        for (const branch of stmt.branches) {
          for (const s of branch) {
            analyzeStatement(s, depth);
          }
        }
      }
    } else {
      // Other statements don't increase depth
      for (const child of stmt.children) {
        analyzeStatement(child, depth);
      }
    }
  };

  for (const stmt of block.statements) {
    analyzeStatement(stmt, 1);
  }

  return complexities;
}

/**
 * Combine multiple complexities
 */
function combineComplexities(complexities: string[]): string {
  if (complexities.length === 0) return 'O(1)';
  if (complexities.length === 1) return complexities[0];

  // Count nested O(n) loops
  const linearCount = complexities.filter(c => c === 'O(n)').length;
  const logCount = complexities.filter(c => c === 'O(log n)').length;

  if (linearCount >= 2) return `O(n^${linearCount})`;
  if (linearCount === 1 && logCount >= 1) return 'O(n log n)';
  if (linearCount === 1) return 'O(n)';
  if (logCount >= 1) return 'O(log n)';

  return 'O(1)';
}

/**
 * Compare two complexity strings
 */
function compareComplexity(a: string, b: string): number {
  const order = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(2^n)'];
  const indexA = order.findIndex(o => a.includes(o.replace('O(', '').replace(')', '')));
  const indexB = order.findIndex(o => b.includes(o.replace('O(', '').replace(')', '')));
  return indexA - indexB;
}

/**
 * Analyze space complexity from IR
 */
function analyzeSpaceComplexityFromIR(program: ProgramIR): SpaceComplexity {
  const breakdown: ComplexityBreakdown[] = [];
  let maxSpace = 'O(1)';

  // Analyze allocations in all functions
  for (const func of program.functions) {
    for (const alloc of func.allocations) {
      if (alloc.allocationType === 'array' || alloc.allocationType === 'map') {
        const complexity = alloc.sizeDependent ? 'O(n)' : 'O(1)';
        breakdown.push({
          location: `function ${func.name}`,
          operation: `${alloc.allocationType} allocation`,
          complexity,
          reasoning: alloc.sizeDependent
            ? `Allocates ${alloc.allocationType} proportional to input size`
            : `Allocates constant-size ${alloc.allocationType}`,
        });

        if (complexity === 'O(n)' && maxSpace === 'O(1)') {
          maxSpace = 'O(n)';
        }
      }
    }

    // Check for recursion
    if (func.isRecursive) {
      breakdown.push({
        location: `function ${func.name}`,
        operation: 'recursion',
        complexity: 'O(n)',
        reasoning: 'Recursion depth adds to call stack',
      });

      if (maxSpace === 'O(1)') {
        maxSpace = 'O(n)';
      }
    }
  }

  const explanation = breakdown.length > 0
    ? breakdown[0].reasoning
    : 'No additional space allocated';

  return {
    bigO: maxSpace,
    explanation,
    breakdown: breakdown.slice(0, 5),
  };
}

/**
 * Extract input sizes from IR
 */
function extractInputSizesFromIR(program: ProgramIR): InputSize[] {
  const inputs: InputSize[] = [];

  // Extract from entry point functions
  const functionsToAnalyze = program.entryPoints.length > 0
    ? program.entryPoints
    : program.functions.slice(0, 1);

  for (const func of functionsToAnalyze) {
    for (const param of func.parameters) {
      inputs.push({
        name: param,
        description: `input parameter`,
        growthImpact: 'primary',
      });
    }
  }

  // Default input if none found
  if (inputs.length === 0) {
    inputs.push({
      name: 'n',
      description: 'input size',
      growthImpact: 'primary',
    });
  }

  return inputs.slice(0, 3);
}

/**
 * Find dominant operations from IR
 */
function findDominantOperations(program: ProgramIR): DominantOperation[] {
  const operations: DominantOperation[] = [];

  for (const func of program.functions) {
    // Check for nested loops
    const maxDepth = func.body.maxDepth;
    if (maxDepth > 1) {
      operations.push({
        type: `nested loops (depth ${maxDepth})`,
        location: `function ${func.name}`,
        complexity: maxDepth === 2 ? 'O(n^2)' : `O(n^${maxDepth})`,
      });
    }

    // Check for recursion
    if (func.isRecursive) {
      operations.push({
        type: 'recursion',
        location: `function ${func.name}`,
        complexity: 'O(2^n)',
      });
    }
  }

  return operations.slice(0, 5);
}

/**
 * Generate optimizations from IR
 */
function generateOptimizationsFromIR(
  program: ProgramIR,
  timeComplexity: TimeComplexity
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // Check for nested loops
  for (const func of program.functions) {
    if (func.body.maxDepth >= 2) {
      suggestions.push({
        current: 'O(n^2) nested loops',
        improved: 'O(n) using hash map',
        technique: 'Trade space for time - use hash map to eliminate inner loop',
      });
      break;
    }
  }

  // Check for recursion
  const hasRecursion = program.functions.some(f => f.isRecursive);
  if (hasRecursion && timeComplexity.worstCase.bigO.includes('2^n')) {
    suggestions.push({
      current: 'O(2^n) exponential recursion',
      improved: 'O(n) with memoization',
      technique: 'Cache recursive results to avoid recomputation',
    });
  }

  return suggestions;
}