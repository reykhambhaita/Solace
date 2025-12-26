/**
 * TypeScript/JavaScript Language Adapter
 */

import type { CSTNode } from '../analyzer/semantic-ir';
import {
  BaseLanguageAdapter,
  type AllocationPattern,
  type ConditionalPattern,
  type EntryPointPattern,
  type FunctionPattern,
  type LoopPattern,
} from './language-adaptor';

export class TypeScriptAdapter extends BaseLanguageAdapter {
  language = 'typescript';

  extractLoops(cst: CSTNode): LoopPattern[] {
    const loops: LoopPattern[] = [];

    const loopNodes = this.findNodes(cst, node => this.isLoopNode(node));

    for (const node of loopNodes) {
      if (node.type === 'for_statement') {
        // Traditional for loop: for (init; condition; update) { body }
        const init = this.getChildByField(node, 'initializer');
        const condition = this.getChildByField(node, 'condition');
        const update = this.getChildByField(node, 'increment');
        const body = this.getChildByField(node, 'body') || node.children[node.children.length - 1];

        loops.push({
          type: 'for',
          initNode: init || undefined,
          conditionNode: condition || undefined,
          updateNode: update || undefined,
          bodyNode: body,
        });
      } else if (node.type === 'for_in_statement') {
        // for (x in obj)
        const body = this.getChildByField(node, 'body') || node.children[node.children.length - 1];
        loops.push({
          type: 'foreach',
          bodyNode: body,
        });
      } else if (node.type === 'while_statement') {
        const condition = this.getChildByField(node, 'condition');
        const body = this.getChildByField(node, 'body') || node.children[node.children.length - 1];

        loops.push({
          type: 'while',
          conditionNode: condition || undefined,
          bodyNode: body,
        });
      }
    }

    return loops;
  }

  extractFunctions(cst: CSTNode): FunctionPattern[] {
    const functions: FunctionPattern[] = [];

    const funcNodes = this.findNodes(cst, node => this.isFunctionNode(node));

    for (const node of funcNodes) {
      const name = this.extractFunctionName(node);
      const parameters = this.extractFunctionParameters(node);
      const body = this.getChildByField(node, 'body') ||
        node.children.find(c => c.type === 'statement_block');

      if (body) {
        functions.push({
          name,
          parameters,
          bodyNode: body,
          isAsync: node.text.includes('async'),
          isGenerator: node.text.includes('function*'),
        });
      }
    }

    return functions;
  }

  extractConditionals(cst: CSTNode): ConditionalPattern[] {
    const conditionals: ConditionalPattern[] = [];

    const ifNodes = this.findNodes(cst, node => this.isConditionalNode(node));

    for (const node of ifNodes) {
      const condition = this.getChildByField(node, 'condition');
      const consequence = this.getChildByField(node, 'consequence');
      const alternative = this.getChildByField(node, 'alternative');

      if (condition && consequence) {
        conditionals.push({
          conditionNode: condition,
          thenNode: consequence,
          elseNode: alternative || undefined,
        });
      }
    }

    return conditionals;
  }

  extractAllocations(cst: CSTNode): AllocationPattern[] {
    const allocations: AllocationPattern[] = [];

    const allocNodes = this.findNodes(cst, node => this.isAllocationNode(node));

    for (const node of allocNodes) {
      const text = node.text.toLowerCase();

      // Array allocations
      if (node.type === 'array' || text.includes('new array') || text.includes('array(')) {
        allocations.push({
          type: 'array',
          isDynamic: text.includes('.length') || text.includes('size'),
          sizeExpression: this.findArraySize(node),
        });
      }
      // Object/Map allocations
      else if (node.type === 'object' || text.includes('new map') || text.includes('{}')) {
        allocations.push({
          type: text.includes('map') ? 'map' : 'object',
          isDynamic: true,
        });
      }
      // Buffer allocations
      else if (text.includes('buffer') || text.includes('arraybuffer')) {
        allocations.push({
          type: 'buffer',
          isDynamic: true,
        });
      }
    }

    return allocations;
  }

  detectEntryPoints(cst: CSTNode): EntryPointPattern[] {
    const entryPoints: EntryPointPattern[] = [];

    // Export declarations
    const exports = this.findNodes(cst, node =>
      node.type === 'export_statement' ||
      node.type.includes('export')
    );

    for (const exp of exports) {
      entryPoints.push({
        type: 'export',
        node: exp,
        confidence: 0.8,
      });
    }

    // Top-level function calls (scripts)
    const topLevelCalls = cst.children.filter(c => this.isCallNode(c));
    if (topLevelCalls.length > 0) {
      entryPoints.push({
        type: 'global',
        node: topLevelCalls[0],
        confidence: 0.6,
      });
    }

    return entryPoints;
  }

  extractFunctionParameters(node: CSTNode): string[] {
    const params: string[] = [];
    const paramsNode = this.getChildByField(node, 'parameters') ||
      node.children.find(c => c.type === 'formal_parameters');

    if (!paramsNode) return params;

    for (const child of paramsNode.children) {
      if (child.type === 'identifier' || child.type === 'required_parameter') {
        const identNode = child.type === 'identifier' ? child :
          child.children.find(c => c.type === 'identifier');
        if (identNode) {
          params.push(identNode.text);
        }
      }
    }

    return params;
  }

  // Type checkers
  isLoopNode(node: CSTNode): boolean {
    return node.type === 'for_statement' ||
      node.type === 'for_in_statement' ||
      node.type === 'while_statement' ||
      node.type === 'do_statement';
  }

  isFunctionNode(node: CSTNode): boolean {
    return node.type === 'function_declaration' ||
      node.type === 'function_expression' ||
      node.type === 'arrow_function' ||
      node.type === 'method_definition';
  }

  isConditionalNode(node: CSTNode): boolean {
    return node.type === 'if_statement';
  }

  isAllocationNode(node: CSTNode): boolean {
    return node.type === 'array' ||
      node.type === 'object' ||
      (node.type === 'new_expression' && (
        node.text.includes('Array') ||
        node.text.includes('Map') ||
        node.text.includes('Set') ||
        node.text.includes('Buffer')
      ));
  }

  isCallNode(node: CSTNode): boolean {
    return node.type === 'call_expression';
  }

  isReturnNode(node: CSTNode): boolean {
    return node.type === 'return_statement';
  }

  isBreakNode(node: CSTNode): boolean {
    return node.type === 'break_statement';
  }

  isContinueNode(node: CSTNode): boolean {
    return node.type === 'continue_statement';
  }

  // Helper methods
  private extractFunctionName(node: CSTNode): string {
    const nameNode = this.getChildByField(node, 'name') ||
      node.children.find(c => c.type === 'identifier');
    return nameNode ? nameNode.text : '<anonymous>';
  }

  private findArraySize(node: CSTNode): CSTNode | undefined {
    // Look for size argument in Array constructor or length property
    const args = node.children.find(c => c.type === 'arguments');
    if (args && args.children.length > 0) {
      return args.children[0];
    }
    return undefined;
  }
}