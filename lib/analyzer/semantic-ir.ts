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

/**
 * Loop bounds representation
 */
export interface LoopBounds {
  type: 'constant' | 'input' | 'unknown';
  value?: number; // For constant bounds
  variable?: string; // For input-dependent bounds
  complexity: string; // e.g., 'O(n)', 'O(log n)', 'O(1)'
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