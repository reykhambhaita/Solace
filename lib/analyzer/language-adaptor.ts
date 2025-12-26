/**
 * Language Adapter System
 * Normalizes language-specific AST patterns into semantic IR
 */

import type { CSTNode } from '../analyzer/semantic-ir';

// Add adapter registry
const adapters = new Map<string, LanguageAdapter>();

export function registerAdapter(adapter: LanguageAdapter): void {
  adapters.set(adapter.language, adapter);
}

export function getAdapter(language: string): LanguageAdapter | null {
  return adapters.get(language) || null;
}


export interface LoopPattern {
  type: 'for' | 'while' | 'foreach' | 'iterator';
  initNode?: CSTNode;
  conditionNode?: CSTNode;
  updateNode?: CSTNode;
  bodyNode: CSTNode;
}

export interface FunctionPattern {
  name: string;
  parameters: string[];
  bodyNode: CSTNode;
  isAsync?: boolean;
  isGenerator?: boolean;
}

export interface ConditionalPattern {
  conditionNode: CSTNode;
  thenNode: CSTNode;
  elseNode?: CSTNode;
}

export interface AllocationPattern {
  type: 'array' | 'map' | 'object' | 'buffer' | 'primitive';
  sizeExpression?: CSTNode;
  isDynamic: boolean;
}

export interface EntryPointPattern {
  type: 'main' | 'export' | 'global' | 'test';
  node: CSTNode;
  confidence: number;
}

/**
 * Language adapter interface
 * Each language implements this to normalize patterns
 */
export interface LanguageAdapter {
  language: string;

  // Pattern extraction
  extractLoops(cst: CSTNode): LoopPattern[];
  extractFunctions(cst: CSTNode): FunctionPattern[];
  extractConditionals(cst: CSTNode): ConditionalPattern[];
  extractAllocations(cst: CSTNode): AllocationPattern[];

  // Entry point detection
  detectEntryPoints(cst: CSTNode): EntryPointPattern[];

  // Parameter analysis
  extractFunctionParameters(node: CSTNode): string[];

  // Type helpers
  isLoopNode(node: CSTNode): boolean;
  isFunctionNode(node: CSTNode): boolean;
  isConditionalNode(node: CSTNode): boolean;
  isAllocationNode(node: CSTNode): boolean;
  isCallNode(node: CSTNode): boolean;
  isReturnNode(node: CSTNode): boolean;
  isBreakNode(node: CSTNode): boolean;
  isContinueNode(node: CSTNode): boolean;
}

/**
 * Base adapter with common utilities
 */
export abstract class BaseLanguageAdapter implements LanguageAdapter {
  abstract language: string;

  abstract extractLoops(cst: CSTNode): LoopPattern[];
  abstract extractFunctions(cst: CSTNode): FunctionPattern[];
  abstract extractConditionals(cst: CSTNode): ConditionalPattern[];
  abstract extractAllocations(cst: CSTNode): AllocationPattern[];
  abstract detectEntryPoints(cst: CSTNode): EntryPointPattern[];
  abstract extractFunctionParameters(node: CSTNode): string[];

  abstract isLoopNode(node: CSTNode): boolean;
  abstract isFunctionNode(node: CSTNode): boolean;
  abstract isConditionalNode(node: CSTNode): boolean;
  abstract isAllocationNode(node: CSTNode): boolean;
  abstract isCallNode(node: CSTNode): boolean;
  abstract isReturnNode(node: CSTNode): boolean;
  abstract isBreakNode(node: CSTNode): boolean;
  abstract isContinueNode(node: CSTNode): boolean;

  /**
   * Find all nodes matching predicate
   */
  protected findNodes(cst: CSTNode, predicate: (node: CSTNode) => boolean): CSTNode[] {
    const results: CSTNode[] = [];

    const traverse = (node: CSTNode) => {
      if (predicate(node)) {
        results.push(node);
      }
      node.children.forEach(traverse);
    };

    traverse(cst);
    return results;
  }

  /**
   * Get child by field name
   */
  protected getChildByField(node: CSTNode, fieldName: string): CSTNode | null {
    return node.children.find(c => c.fieldName === fieldName) || null;
  }

  /**
   * Get all children of specific type
   */
  protected getChildrenByType(node: CSTNode, type: string): CSTNode[] {
    return node.children.filter(c => c.type === type);
  }
}