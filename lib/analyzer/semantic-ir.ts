/**
 * Semantic Intermediate Representation (IR)
 * Lossless representation for analysis - preserves full semantic information
 */

import type Parser from "web-tree-sitter";

/**
 * Full CST Node - Lossless wrapper around Tree-sitter SyntaxNode
 * Used for analysis pipeline only
 */
export interface CSTNode {
  // Core identity
  id: string;
  type: string;

  // Position information
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };

  // Semantic information
  isNamed: boolean;
  fieldName: string | null;

  // Full text - NO TRUNCATION
  text: string;

  // Children - lossless
  childCount: number;
  children: CSTNode[];

  // Parent reference for traversal
  parent: CSTNode | null;
}

/**
 * Statement types in the IR
 */
export type StatementType =
  | 'loop'
  | 'conditional'
  | 'call'
  | 'return'
  | 'break'
  | 'continue'
  | 'allocation'
  | 'assignment'
  | 'expression'
  | 'declaration';

import type { CostExpr } from './cost-expression';

/**
 * Loop bounds representation
 */
export interface LoopBounds {
  type: 'constant' | 'input' | 'symbolic' | 'unknown';
  value?: number; // For constant bounds
  variable?: string; // For input-dependent bounds
  cost: CostExpr; // Algebraic cost expression
  boundExpression?: CSTNode; // Original bound expression from CST
}


/**
 * Statement IR
 */
export interface StatementIR {
  id: string;
  type: StatementType;
  node: CSTNode; // Reference to original CST

  // For loops
  bounds?: LoopBounds;
  nested?: boolean;

  // For calls
  functionName?: string;
  isRecursive?: boolean;

  // For allocations
  allocationType?: 'array' | 'map' | 'object' | 'buffer' | 'primitive';
  sizeDependent?: boolean; // Depends on input size

  // For conditionals
  branches?: StatementIR[][];

  // Cost tracking
  cost?: CostExpr; // Time complexity cost
  spaceCost?: CostExpr; // Space complexity cost

  children: StatementIR[];
}


/**
 * Block IR - represents a code block
 */
export interface BlockIR {
  id: string;
  statements: StatementIR[];
  maxDepth: number; // Max nesting depth
  hasEarlyExit: boolean; // break, return, continue
}

/**
 * Function IR
 */
export interface FunctionIR {
  id: string;
  name: string;
  node: CSTNode; // Reference to original CST

  parameters: string[];
  returnType?: string;

  body: BlockIR;

  // Analysis metadata
  isRecursive: boolean;
  callsTo: string[]; // Functions this calls
  allocations: StatementIR[]; // Allocation sites

  // Entry point detection
  isEntryPoint: boolean;
  entryPointType?: 'main' | 'export' | 'global';
}

/**
 * Program IR - top-level semantic representation
 */
export interface ProgramIR {
  id: string;
  language: string;

  // CST root - lossless
  cst: CSTNode;

  // Semantic structures
  functions: FunctionIR[];
  globalStatements: StatementIR[];

  // Entry points
  entryPoints: FunctionIR[];

  // Metadata
  timestamp: number;
  analysisVersion: string;
}


/**
 * Decision rule extraction
 */
export interface DecisionRule {
  id: string;
  condition: string;
  outcome: string;
  location: { row: number; column: number };
  confidence: number;
}

export interface ControlFlowComplexity {
  branchDepth: number;
  maxNesting: number;
  totalBranches: number;
  linearity: number; // 0-1, higher = more linear
  cyclomaticComplexity: number;
}
/**
 * Domain-specific token mappings
 */
export interface DomainToken {
  literal: string;
  semanticRole: string;
  domain: string;
  weight?: number;
}

export const DOMAIN_TOKEN_TABLES: Record<string, DomainToken[]> = {
  logging: [
    { literal: 'CRITICAL', semanticRole: 'severity-boost', domain: 'logging', weight: 5 },
    { literal: 'ERROR', semanticRole: 'severity-boost', domain: 'logging', weight: 4 },
    { literal: 'WARNING', semanticRole: 'severity-moderate', domain: 'logging', weight: 3 },
    { literal: 'INFO', semanticRole: 'severity-normal', domain: 'logging', weight: 2 },
    { literal: 'DEBUG', semanticRole: 'severity-low', domain: 'logging', weight: 1 },
  ],
  http: [
    { literal: 'GET', semanticRole: 'read-operation', domain: 'http' },
    { literal: 'POST', semanticRole: 'create-operation', domain: 'http' },
    { literal: 'PUT', semanticRole: 'update-operation', domain: 'http' },
    { literal: 'DELETE', semanticRole: 'delete-operation', domain: 'http' },
    { literal: 'PATCH', semanticRole: 'partial-update', domain: 'http' },
  ],
  status: [
    { literal: '200', semanticRole: 'success', domain: 'http-status' },
    { literal: '201', semanticRole: 'created', domain: 'http-status' },
    { literal: '400', semanticRole: 'client-error', domain: 'http-status' },
    { literal: '401', semanticRole: 'unauthorized', domain: 'http-status' },
    { literal: '404', semanticRole: 'not-found', domain: 'http-status' },
    { literal: '500', semanticRole: 'server-error', domain: 'http-status' },
  ],
  validation: [
    { literal: 'required', semanticRole: 'mandatory-field', domain: 'validation' },
    { literal: 'optional', semanticRole: 'optional-field', domain: 'validation' },
    { literal: 'invalid', semanticRole: 'fails-validation', domain: 'validation' },
  ],
};

export const LANGUAGE_MAGIC_EXCEPTIONS: Record<string, Set<string | number | boolean | null | undefined>> = {
  typescript: new Set([0, 1, -1, '', null, undefined, true, false, 100, 200, 404, 500]),
  python: new Set([0, 1, -1, '', 'None', 'True', 'False', 100, 200, 404, 500]),
  go: new Set([0, 1, -1, '', 'nil', true, false]),
  rust: new Set([0, 1, -1, '', 'None', true, false]),
  java: new Set([0, 1, -1, '', null, true, false, 200, 404, 500]),
  cpp: new Set([0, 1, -1, '', 'nullptr', true, false]),
  c: new Set([0, 1, -1, '', 'NULL', true, false]),
  ruby: new Set([0, 1, -1, '', 'nil', true, false]),
  php: new Set([0, 1, -1, '', null, true, false]),
};

export const SEMANTIC_VALUE_PATTERNS = {
  // HTTP Status Codes
  httpStatus: (value: number) => value >= 100 && value <= 599,

  // Timeouts/Delays (milliseconds)
  timeout: (value: number) => value >= 100 && value <= 300000, // 100ms to 5min

  // Percentages
  percentage: (value: number) => value >= 0 && value <= 100,

  // Port numbers
  port: (value: number) => value >= 1 && value <= 65535,

  // File permissions (octal)
  filePermission: (value: number) =>
    value === 644 || value === 755 || value === 777 || value === 400,

  // Mathematical constants
  mathConstant: (value: number) =>
    Math.abs(value - Math.PI) < 0.001 ||
    Math.abs(value - Math.E) < 0.001 ||
    value === 0.5 || value === 0.25 || value === 0.75,
};

/**
 * Map detected magic values to domain tokens
 */
export function mapToDomainTokens(magicValues: MagicValue[]): Array<MagicValue & { domainToken?: DomainToken }> {
  return magicValues.map(mv => {
    for (const [domain, tokens] of Object.entries(DOMAIN_TOKEN_TABLES)) {
      const match = tokens.find(t =>
        t.literal.toLowerCase() === mv.value.toString().toLowerCase()
      );

      if (match) {
        return { ...mv, domainToken: match };
      }
    }
    return mv;
  });
}
export interface MagicValue {
  value: string | number;
  type: 'string-token' | 'numeric-constant' | 'boolean-flag';
  location: { row: number; column: number };
  context: string;
  semanticRole?: string;
}

export interface SilentBehavior {
  type: 'pass' | 'ignored-input' | 'fallthrough' | 'empty-catch';
  location: { row: number; column: number };
  context: string;
  risk: 'low' | 'medium' | 'high';
}

export type SideEffectCertainty = 'none' | 'local-only' | 'external-confirmed' | 'external-likely';

export interface TestabilityIndicators {
  isPure: boolean;
  isDeterministic: boolean;
  isIsolated: boolean;
  score: number; // 0-100
  factors: string[];
}


/**
 * Convert Tree-sitter SyntaxNode to lossless CSTNode
 * NO truncation, NO depth limits, NO filtering
 */
export function syntaxNodeToCST(
  node: Parser.SyntaxNode,
  parent: CSTNode | null = null
): CSTNode {
  const cstNode: CSTNode = {
    id: `${node.startIndex}-${node.endIndex}`,
    type: node.type,
    startIndex: node.startIndex,
    endIndex: node.endIndex,
    startPosition: node.startPosition,
    endPosition: node.endPosition,
    isNamed: node.isNamed,
    fieldName: null,
    text: node.text, // FULL TEXT - NO TRUNCATION
    childCount: node.childCount,
    children: [],
    parent,
  };

  // Recursively convert all children - LOSSLESS
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      cstNode.children.push(syntaxNodeToCST(child, cstNode));
    }
  }

  return cstNode;
}

/**
 * Find all nodes of a specific type in CST
 */
export function findNodesByType(cst: CSTNode, type: string): CSTNode[] {
  const results: CSTNode[] = [];

  function traverse(node: CSTNode) {
    if (node.type === type || node.type.includes(type)) {
      results.push(node);
    }
    node.children.forEach(traverse);
  }

  traverse(cst);
  return results;
}

/**
 * Find all nodes matching a predicate
 */
export function findNodes(
  cst: CSTNode,
  predicate: (node: CSTNode) => boolean
): CSTNode[] {
  const results: CSTNode[] = [];

  function traverse(node: CSTNode) {
    if (predicate(node)) {
      results.push(node);
    }
    node.children.forEach(traverse);
  }

  traverse(cst);
  return results;
}

/**
 * Get text content of a node without truncation
 */
export function getNodeText(node: CSTNode): string {
  return node.text;
}

/**
 * Check if node contains another node
 */
export function containsNode(parent: CSTNode, child: CSTNode): boolean {
  return (
    child.startIndex >= parent.startIndex &&
    child.endIndex <= parent.endIndex
  );
}

/**
 * Extract decision rules from conditional statements
 */
export function extractDecisionRules(cst: CSTNode): DecisionRule[] {
  const rules: DecisionRule[] = [];

  function traverse(node: CSTNode) {
    // Look for if statements, switch cases, ternaries
    if (node.type.includes('if_statement') || node.type.includes('conditional')) {
      const conditionNode = node.children.find(c =>
        c.type.includes('condition') || c.type.includes('parenthesized')
      );
      const consequentNode = node.children.find(c =>
        c.type.includes('consequence') || c.type.includes('statement_block')
      );

      if (conditionNode && consequentNode) {
        const condition = conditionNode.text.trim();
        const outcome = consequentNode.text.trim().substring(0, 50);

        rules.push({
          id: `rule-${node.startPosition.row}-${node.startPosition.column}`,
          condition,
          outcome,
          location: node.startPosition,
          confidence: condition.length < 100 ? 0.9 : 0.6,
        });
      }
    }

    node.children.forEach(traverse);
  }

  traverse(cst);
  return rules;
}

/**
 * Calculate control flow complexity
 */
export function analyzeControlFlowComplexity(cst: CSTNode): ControlFlowComplexity {
  let maxNesting = 0;
  let currentNesting = 0;
  let totalBranches = 0;
  let decisionPoints = 0;

  function traverse(node: CSTNode, depth: number) {
    if (node.type.includes('if_') || node.type.includes('switch_') ||
      node.type.includes('case') || node.type.includes('conditional')) {
      totalBranches++;
      currentNesting = depth + 1;
      maxNesting = Math.max(maxNesting, currentNesting);
      decisionPoints++;
    }

    if (node.type.includes('loop') || node.type.includes('while') || node.type.includes('for')) {
      decisionPoints++;
    }

    node.children.forEach(child => traverse(child, currentNesting));
  }

  traverse(cst, 0);

  // Cyclomatic complexity: M = E - N + 2P (simplified as decision points + 1)
  const cyclomaticComplexity = decisionPoints + 1;

  // Linearity: inverse of branching density
  const totalNodes = findNodes(cst, () => true).length;
  const linearity = totalNodes > 0 ? 1 - (totalBranches / totalNodes) : 1;

  return {
    branchDepth: maxNesting,
    maxNesting,
    totalBranches,
    linearity: Math.max(0, Math.min(1, linearity)),
    cyclomaticComplexity,
  };
}

interface MagicValueContext {
  nearbyText: string;
  parentType: string;
  isInCondition: boolean;
  isInLoop: boolean;
}

function getMagicValueContext(node: CSTNode): MagicValueContext {
  let parent = node.parent;
  let nearbyText = '';
  let isInCondition = false;
  let isInLoop = false;

  // Walk up tree to gather context
  let current = node;
  for (let i = 0; i < 3 && current; i++) {
    if (current.parent) {
      const siblings = current.parent.children;
      const index = siblings.indexOf(current);
      if (index > 0) {
        nearbyText = siblings[index - 1].text + ' ' + nearbyText;
      }

      if (current.parent.type.includes('if') || current.parent.type.includes('condition')) {
        isInCondition = true;
      }
      if (current.parent.type.includes('loop') || current.parent.type.includes('for') ||
        current.parent.type.includes('while')) {
        isInLoop = true;
      }

      current = current.parent;
    }
  }

  return {
    nearbyText: nearbyText.toLowerCase(),
    parentType: parent?.type || '',
    isInCondition,
    isInLoop
  };
}


/**
 * Detect magic values (literals that should be constants)
 */
/**
 * ENHANCED: Detect magic values with language-specific exceptions and semantic understanding
 */
export function detectMagicValues(
  cst: CSTNode,
  language?: string // Add optional language parameter
): MagicValue[] {
  const magicValues: MagicValue[] = [];
  const seenValues = new Set<string>();

  // Get language-specific exceptions
  const exceptions = language ? LANGUAGE_MAGIC_EXCEPTIONS[language] : new Set();

  function traverse(node: CSTNode) {
    const context = getMagicValueContext(node);

    // String literals
    if (node.type === 'string' || node.type === 'string_literal' || node.type === 'template_string') {
      const value = node.text.replace(/['"]/g, '');

      // Skip empty strings, very short strings, and exceptions
      if (value.length <= 2 || exceptions.has(value)) {
        return;
      }

      if (!seenValues.has(value)) {
        // Enhanced semantic role detection
        let semanticRole = detectStringSemanticRole(value, context);

        // Only report if it's truly a "magic" value
        if (semanticRole && !isWellKnownConstant(value)) {
          magicValues.push({
            value,
            type: 'string-token',
            location: node.startPosition,
            context: context.nearbyText.substring(0, 50),
            semanticRole,
          });
          seenValues.add(value);
        }
      }
    }

    // Numeric literals with enhanced detection
    if (node.type === 'number' || node.type === 'integer' || node.type === 'float') {
      const value = parseFloat(node.text);

      // Skip common exceptions
      if (exceptions.has(value)) {
        return;
      }

      if (!seenValues.has(node.text)) {
        const semanticRole = detectNumericSemanticRole(value, context);

        // Only report if semantic and not a well-known value
        if (semanticRole) {
          magicValues.push({
            value,
            type: 'numeric-constant',
            location: node.startPosition,
            context: context.nearbyText.substring(0, 50),
            semanticRole,
          });
          seenValues.add(node.text);
        }
      }
    }

    node.children.forEach(traverse);
  }

  traverse(cst);
  return magicValues;
}

function detectStringSemanticRole(value: string, context: MagicValueContext): string | undefined {
  const lowerValue = value.toLowerCase();

  // Log levels
  if (['error', 'warning', 'info', 'debug', 'critical', 'trace'].includes(lowerValue)) {
    return 'log-level';
  }

  // HTTP methods
  if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(lowerValue)) {
    return 'http-method';
  }

  // Environment names
  if (['development', 'production', 'staging', 'test'].includes(lowerValue)) {
    return 'environment';
  }

  // Common event names
  if (['click', 'submit', 'change', 'load', 'error', 'ready'].includes(lowerValue)) {
    return 'event-name';
  }

  // URLs/paths (heuristic)
  if (value.startsWith('/') || value.startsWith('http')) {
    return 'url-path';
  }

  // SQL keywords
  if (['select', 'insert', 'update', 'delete', 'create', 'drop'].includes(lowerValue)) {
    return 'sql-keyword';
  }

  // Looks like a token/identifier
  if (value.match(/^[a-z][a-z0-9_-]*$/i) && value.length > 3) {
    return 'identifier-token';
  }

  return undefined;
}

function detectNumericSemanticRole(value: number, context: MagicValueContext): string | undefined {
  // HTTP status codes
  if (SEMANTIC_VALUE_PATTERNS.httpStatus(value)) {
    if (context.nearbyText.includes('status') || context.nearbyText.includes('code')) {
      return 'http-status';
    }
  }

  // Timeouts
  if (SEMANTIC_VALUE_PATTERNS.timeout(value)) {
    if (context.nearbyText.includes('timeout') || context.nearbyText.includes('delay') ||
      context.nearbyText.includes('wait')) {
      return 'timeout-ms';
    }
  }

  // Percentages
  if (SEMANTIC_VALUE_PATTERNS.percentage(value)) {
    if (context.nearbyText.includes('percent') || context.nearbyText.includes('%')) {
      return 'percentage';
    }
  }

  // Ports
  if (SEMANTIC_VALUE_PATTERNS.port(value)) {
    if (context.nearbyText.includes('port')) {
      return 'port-number';
    }
  }

  // File permissions
  if (SEMANTIC_VALUE_PATTERNS.filePermission(value)) {
    return 'file-permission';
  }

  // Math constants
  if (SEMANTIC_VALUE_PATTERNS.mathConstant(value)) {
    return 'math-constant';
  }

  // Array indices/sizes (common pattern)
  if (context.isInLoop && value > 0 && value < 1000) {
    return 'loop-bound';
  }

  // Weights/thresholds
  if (value > 0 && value < 1) {
    if (context.nearbyText.includes('weight') || context.nearbyText.includes('threshold') ||
      context.nearbyText.includes('confidence')) {
      return 'weight-threshold';
    }
  }

  return undefined;
}

function isWellKnownConstant(value: string): boolean {
  const wellKnown = new Set([
    'utf-8', 'utf8', 'ascii',
    'localhost', '127.0.0.1',
    'true', 'false', 'null', 'undefined',
  ]);

  return wellKnown.has(value.toLowerCase());
}

/**
 * Detect silent behavior paths
 */
export function detectSilentBehaviors(cst: CSTNode): SilentBehavior[] {
  const behaviors: SilentBehavior[] = [];

  function traverse(node: CSTNode) {
    const text = node.text.toLowerCase();

    // Pass statements (Python)
    if (node.type === 'pass_statement') {
      behaviors.push({
        type: 'pass',
        location: node.startPosition,
        context: node.parent?.text.substring(0, 50) || '',
        risk: 'low',
      });
    }

    // Empty catch blocks
    if (node.type === 'catch_clause' || node.type === 'except_clause') {
      const bodyNode = node.children.find(c => c.type.includes('block') || c.type.includes('body'));
      if (bodyNode && bodyNode.text.trim().length < 5) {
        behaviors.push({
          type: 'empty-catch',
          location: node.startPosition,
          context: 'Exception handling without action',
          risk: 'high',
        });
      }
    }

    // Fallthrough in switch (no break)
    if (node.type === 'switch_case' || node.type === 'case_statement') {
      const hasBreak = node.text.includes('break');
      const hasReturn = node.text.includes('return');

      if (!hasBreak && !hasReturn && node.children.length > 2) {
        behaviors.push({
          type: 'fallthrough',
          location: node.startPosition,
          context: 'Switch case without break',
          risk: 'medium',
        });
      }
    }

    // Ignored function parameters
    if (node.type.includes('parameter')) {
      const paramName = node.text.trim();
      const parentFunc = node.parent;

      if (parentFunc && !parentFunc.text.includes(paramName.split(/[,()]/)[0])) {
        // Parameter name doesn't appear in function body
        behaviors.push({
          type: 'ignored-input',
          location: node.startPosition,
          context: `Unused parameter: ${paramName.substring(0, 20)}`,
          risk: 'low',
        });
      }
    }

    node.children.forEach(traverse);
  }

  traverse(cst);
  return behaviors;
}

/**
 * Determine side effect certainty
 */
export function analyzeSideEffectCertainty(
  cst: CSTNode,
  externalInteractions: string[]
): SideEffectCertainty {
  const text = cst.text.toLowerCase();

  // External side effects
  if (externalInteractions.length > 0) {
    return 'external-confirmed';
  }

  // Look for I/O operations
  const ioPatterns = [
    'console.log', 'print(', 'write', 'fetch', 'http',
    'readfile', 'writefile', 'query', 'execute'
  ];

  if (ioPatterns.some(pattern => text.includes(pattern))) {
    return 'external-likely';
  }

  // Look for mutations
  const mutationPatterns = ['=', '++', '--', 'push', 'pop', 'splice'];
  const hasMutations = mutationPatterns.some(pattern => text.includes(pattern));

  if (hasMutations) {
    return 'local-only';
  }

  return 'none';
}

/**
 * Calculate testability indicators
 */
export function calculateTestability(
  cst: CSTNode,
  isDeterministic: boolean,
  sideEffectCertainty: SideEffectCertainty,
  externalInteractions: string[]
): TestabilityIndicators {
  const factors: string[] = [];
  let score = 100;

  // Check if pure
  const isPure = sideEffectCertainty === 'none';
  if (!isPure) {
    score -= 30;
    factors.push('Has side effects');
  } else {
    factors.push('Pure function');
  }

  // Check determinism
  if (!isDeterministic) {
    score -= 25;
    factors.push('Non-deterministic');
  } else {
    factors.push('Deterministic output');
  }

  // Check isolation
  const isIsolated = externalInteractions.length === 0;
  if (!isIsolated) {
    score -= 20;
    factors.push('External dependencies');
  } else {
    factors.push('No external dependencies');
  }

  // Check complexity
  const complexity = analyzeControlFlowComplexity(cst);
  if (complexity.cyclomaticComplexity > 10) {
    score -= 15;
    factors.push('High complexity');
  }

  score = Math.max(0, score);

  return {
    isPure,
    isDeterministic,
    isIsolated,
    score,
    factors: factors.slice(0, 4),
  };
}

export interface NormalizedControlFlow {
  type: 'sequence' | 'branch' | 'loop' | 'error-handling' | 'call';
  children: NormalizedControlFlow[];
  metadata: {
    originalLanguage: string;
    originalConstruct: string;
    lineNumber: number;
  };
  condition?: string; // For branches/loops
  body?: string; // Simplified representation
}

/**
 * Normalize control flow across languages
 */
export function normalizeControlFlow(
  cst: CSTNode,
  language: string
): NormalizedControlFlow {
  const normalized: NormalizedControlFlow = {
    type: 'sequence',
    children: [],
    metadata: {
      originalLanguage: language,
      originalConstruct: cst.type,
      lineNumber: cst.startPosition.row
    }
  };

  // Map language-specific constructs to normalized types
  if (isIfStatement(cst, language)) {
    normalized.type = 'branch';
    normalized.condition = extractCondition(cst, language);

    // Process branches
    const branches = extractBranches(cst, language);
    normalized.children = branches.map(b => normalizeControlFlow(b, language));
  }
  else if (isLoopStatement(cst, language)) {
    normalized.type = 'loop';
    normalized.condition = extractCondition(cst, language);

    const body = extractLoopBody(cst, language);
    if (body) {
      normalized.children = [normalizeControlFlow(body, language)];
    }
  }
  else if (isErrorHandling(cst, language)) {
    normalized.type = 'error-handling';

    // Extract try/catch/finally or error check patterns
    const handlers = extractErrorHandlers(cst, language);
    normalized.children = handlers.map(h => normalizeControlFlow(h, language));
  }
  else if (isFunctionCall(cst, language)) {
    normalized.type = 'call';
    normalized.body = extractCallTarget(cst, language);
  }
  else {
    // Process children as sequence
    for (const child of cst.children) {
      if (child.isNamed && isControlFlow(child, language)) {
        normalized.children.push(normalizeControlFlow(child, language));
      }
    }
  }

  return normalized;
}

// Helper functions for normalization:

function isIfStatement(node: CSTNode, language: string): boolean {
  const ifTypes = ['if_statement', 'if_expression', 'conditional_expression'];
  return ifTypes.some(t => node.type.includes(t));
}

function isLoopStatement(node: CSTNode, language: string): boolean {
  const loopTypes = ['for', 'while', 'loop', 'each'];
  return loopTypes.some(t => node.type.toLowerCase().includes(t));
}

function isErrorHandling(node: CSTNode, language: string): boolean {
  const errorTypes = ['try', 'catch', 'except', 'finally', 'error'];
  return errorTypes.some(t => node.type.toLowerCase().includes(t));
}

function isFunctionCall(node: CSTNode, language: string): boolean {
  return node.type.includes('call');
}

function isControlFlow(node: CSTNode, language: string): boolean {
  return isIfStatement(node, language) ||
    isLoopStatement(node, language) ||
    isErrorHandling(node, language) ||
    isFunctionCall(node, language);
}

function extractCondition(node: CSTNode, language: string): string {
  const conditionNode = node.children.find(c =>
    c.type.includes('condition') || c.type.includes('test')
  );
  return conditionNode?.text.substring(0, 100) || '';
}

function extractBranches(node: CSTNode, language: string): CSTNode[] {
  return node.children.filter(c =>
    c.type.includes('consequence') ||
    c.type.includes('alternative') ||
    c.type.includes('block')
  );
}

function extractLoopBody(node: CSTNode, language: string): CSTNode | null {
  return node.children.find(c => c.type.includes('body') || c.type.includes('block')) || null;
}

function extractErrorHandlers(node: CSTNode, language: string): CSTNode[] {
  return node.children.filter(c =>
    c.type.includes('catch') || c.type.includes('except') || c.type.includes('finally')
  );
}

function extractCallTarget(node: CSTNode, language: string): string {
  const funcNode = node.children.find(c => c.type.includes('function') || c.type === 'identifier');
  return funcNode?.text.substring(0, 50) || '';
}

export interface SideEffectAnalysis {
  hasSideEffects: boolean;
  sideEffectTypes: ('io' | 'mutation' | 'exception' | 'timing' | 'network' | 'randomness')[];
  purity: 'pure' | 'referentially-transparent' | 'impure';
  memoizable: boolean;
  details: string[];
}

/**
 * Analyze side effects with more granularity
 */
export function analyzeSideEffects(
  cst: CSTNode,
  scope: 'global' | 'module' | 'function'
): SideEffectAnalysis {
  const sideEffectTypes = new Set<SideEffectAnalysis['sideEffectTypes'][number]>();
  const details: string[] = [];
  const text = cst.text.toLowerCase();

  // I/O operations
  if (text.includes('console.') || text.includes('print') ||
    text.includes('write') || text.includes('read')) {
    sideEffectTypes.add('io');
    details.push('I/O operations detected');
  }

  // Network calls
  if (text.includes('fetch') || text.includes('http') || text.includes('request')) {
    sideEffectTypes.add('network');
    details.push('Network calls detected');
  }

  // Mutations
  if (text.includes('=') && !text.includes('==') && !text.includes('===')) {
    sideEffectTypes.add('mutation');
    details.push('Variable mutations detected');
  }

  // Exception throwing
  if (text.includes('throw') || text.includes('raise') || text.includes('panic')) {
    sideEffectTypes.add('exception');
    details.push('Exception throwing detected');
  }

  // Timing operations
  if (text.includes('date') || text.includes('time') || text.includes('now()')) {
    sideEffectTypes.add('timing');
    details.push('Time-dependent operations');
  }

  // Randomness
  if (text.includes('random') || text.includes('uuid')) {
    sideEffectTypes.add('randomness');
    details.push('Random number generation');
  }

  // Determine purity
  let purity: SideEffectAnalysis['purity'] = 'pure';
  if (sideEffectTypes.size > 0) {
    // If only mutations, might still be referentially transparent
    if (sideEffectTypes.size === 1 && sideEffectTypes.has('mutation') && scope === 'function') {
      purity = 'referentially-transparent';
    } else {
      purity = 'impure';
    }
  }

  // Memoizable if pure or only depends on inputs
  const memoizable = purity === 'pure' ||
    (purity === 'referentially-transparent' && !sideEffectTypes.has('timing') && !sideEffectTypes.has('randomness'));

  return {
    hasSideEffects: sideEffectTypes.size > 0,
    sideEffectTypes: Array.from(sideEffectTypes),
    purity,
    memoizable,
    details
  };
}