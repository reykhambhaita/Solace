/**
 * IR Builder - Converts CST to Semantic IR using language adapters
 */

import type { LanguageAdapter } from '../analyzer/language-adaptor';
import type { BlockIR, CSTNode, FunctionIR, LoopBounds, ProgramIR } from './semantic-ir';
import { type StatementIR } from './semantic-ir';

export class IRBuilder {
  private adapter: LanguageAdapter;
  private language: string;

  constructor(adapter: LanguageAdapter, language: string) {
    this.adapter = adapter;
    this.language = language;
  }

  /**
   * Build ProgramIR from CST
   */
  buildProgram(cst: CSTNode): ProgramIR {
    const functions = this.buildFunctions(cst);
    const globalStatements = this.buildGlobalStatements(cst);
    const entryPoints = this.detectEntryPoints(functions, cst);

    return {
      id: `program-${Date.now()}`,
      language: this.language,
      cst,
      functions,
      globalStatements,
      entryPoints,
      timestamp: Date.now(),
      analysisVersion: '1.0.0',
    };
  }

  /**
   * Build all functions
   */
  private buildFunctions(cst: CSTNode): FunctionIR[] {
    const functionPatterns = this.adapter.extractFunctions(cst);
    const functions: FunctionIR[] = [];

    for (const pattern of functionPatterns) {
      const body = this.buildBlock(pattern.bodyNode);
      const callsTo = this.findFunctionCalls(pattern.bodyNode);
      const allocations = this.findAllocations(pattern.bodyNode);
      const isRecursive = callsTo.includes(pattern.name);

      functions.push({
        id: `func-${pattern.name}-${pattern.bodyNode.startIndex}`,
        name: pattern.name,
        node: pattern.bodyNode,
        parameters: pattern.parameters,
        body,
        isRecursive,
        callsTo,
        allocations,
        isEntryPoint: false, // Will be set later
      });
    }

    return functions;
  }

  /**
   * Build block from CST node
   */
  private buildBlock(node: CSTNode): BlockIR {
    const statements = this.buildStatements(node);
    const maxDepth = this.calculateMaxDepth(statements);
    const hasEarlyExit = this.hasEarlyExit(statements);

    return {
      id: `block-${node.startIndex}`,
      statements,
      maxDepth,
      hasEarlyExit,
    };
  }

  /**
   * Build statements from node
   */
  private buildStatements(node: CSTNode, depth: number = 0): StatementIR[] {
    const statements: StatementIR[] = [];

    // Process loops
    if (this.adapter.isLoopNode(node)) {
      const loopStmt = this.buildLoopStatement(node, depth);
      if (loopStmt) statements.push(loopStmt);
      return statements;
    }

    // Process conditionals
    if (this.adapter.isConditionalNode(node)) {
      const condStmt = this.buildConditionalStatement(node, depth);
      if (condStmt) statements.push(condStmt);
      return statements;
    }

    // Process calls
    if (this.adapter.isCallNode(node)) {
      statements.push(this.buildCallStatement(node));
      return statements;
    }

    // Process returns
    if (this.adapter.isReturnNode(node)) {
      statements.push({ id: `return-${node.startIndex}`, type: 'return', node, children: [] });
      return statements;
    }

    // Process breaks
    if (this.adapter.isBreakNode(node)) {
      statements.push({ id: `break-${node.startIndex}`, type: 'break', node, children: [] });
      return statements;
    }

    // Process continues
    if (this.adapter.isContinueNode(node)) {
      statements.push({ id: `continue-${node.startIndex}`, type: 'continue', node, children: [] });
      return statements;
    }

    // Process allocations
    if (this.adapter.isAllocationNode(node)) {
      statements.push(this.buildAllocationStatement(node));
      return statements;
    }

    // Recurse into children
    for (const child of node.children) {
      statements.push(...this.buildStatements(child, depth));
    }

    return statements;
  }

  /**
   * Build loop statement with bounds analysis
   */
  private buildLoopStatement(node: CSTNode, depth: number): StatementIR | null {
    const loops = this.adapter.extractLoops(node);
    if (loops.length === 0) return null;

    const loop = loops[0];
    const bounds = this.analyzeLoopBounds(loop);
    const children = this.buildStatements(loop.bodyNode, depth + 1);

    return {
      id: `loop-${node.startIndex}`,
      type: 'loop',
      node,
      bounds,
      nested: depth > 0,
      children,
    };
  }

  /**
   * Analyze loop bounds - this is where we'll use LLM assistance later
   */
  private analyzeLoopBounds(loop: any): LoopBounds {
    // TODO: Use LLM to classify bounds
    // For now, use deterministic heuristics

    if (!loop.conditionNode) {
      return { type: 'unknown', complexity: 'O(?)' };
    }

    const condText = loop.conditionNode.text.toLowerCase();

    // Check for constant bounds
    if (/\d+/.test(condText)) {
      const match = condText.match(/\d+/);
      if (match) {
        return {
          type: 'constant',
          value: parseInt(match[0]),
          complexity: 'O(1)',
        };
      }
    }

    // Check for input-dependent bounds
    if (condText.includes('.length') || condText.includes('size') || condText.includes('count')) {
      return {
        type: 'input',
        variable: 'n',
        complexity: 'O(n)',
      };
    }

    // Check for logarithmic patterns
    if (condText.includes('*= 2') || condText.includes('/= 2') || condText.includes('* 2') || condText.includes('/ 2')) {
      return {
        type: 'input',
        variable: 'n',
        complexity: 'O(log n)',
      };
    }

    // Unknown
    return { type: 'unknown', complexity: 'O(?)' };
  }

  /**
   * Build conditional statement
   */
  private buildConditionalStatement(node: CSTNode, depth: number): StatementIR | null {
    const conditionals = this.adapter.extractConditionals(node);
    if (conditionals.length === 0) return null;

    const cond = conditionals[0];
    const thenBranch = this.buildStatements(cond.thenNode, depth + 1);
    const elseBranch = cond.elseNode ? this.buildStatements(cond.elseNode, depth + 1) : [];

    return {
      id: `cond-${node.startIndex}`,
      type: 'conditional',
      node,
      branches: [thenBranch, elseBranch],
      children: [],
    };
  }

  /**
   * Build call statement
   */
  private buildCallStatement(node: CSTNode): StatementIR {
    const functionName = this.extractCallName(node);

    return {
      id: `call-${node.startIndex}`,
      type: 'call',
      node,
      functionName,
      children: [],
    };
  }

  /**
   * Build allocation statement
   */
  private buildAllocationStatement(node: CSTNode): StatementIR {
    const allocations = this.adapter.extractAllocations(node);
    const alloc = allocations[0];

    return {
      id: `alloc-${node.startIndex}`,
      type: 'allocation',
      node,
      allocationType: alloc?.type || 'primitive',
      sizeDependent: alloc?.isDynamic || false,
      children: [],
    };
  }

  /**
   * Build global statements
   */
  private buildGlobalStatements(cst: CSTNode): StatementIR[] {
    // Find top-level statements that aren't functions
    const statements: StatementIR[] = [];

    for (const child of cst.children) {
      if (!this.adapter.isFunctionNode(child)) {
        statements.push(...this.buildStatements(child));
      }
    }

    return statements;
  }

  /**
   * Detect entry points
   */
  private detectEntryPoints(functions: FunctionIR[], cst: CSTNode): FunctionIR[] {
    const entryPointPatterns = this.adapter.detectEntryPoints(cst);
    const entryPoints: FunctionIR[] = [];

    for (const pattern of entryPointPatterns) {
      if (pattern.type === 'main') {
        const mainFunc = functions.find(f => f.name === 'main' || f.name === '__main__');
        if (mainFunc) {
          mainFunc.isEntryPoint = true;
          mainFunc.entryPointType = 'main';
          entryPoints.push(mainFunc);
        }
      } else if (pattern.type === 'export') {
        // Find exported functions
        const exportedFuncs = functions.filter(f =>
          pattern.node.text.includes(f.name)
        );
        for (const func of exportedFuncs) {
          func.isEntryPoint = true;
          func.entryPointType = 'export';
          entryPoints.push(func);
        }
      }
    }

    return entryPoints;
  }

  // Helper methods
  private calculateMaxDepth(statements: StatementIR[]): number {
    let maxDepth = 0;

    const traverse = (stmt: StatementIR, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      for (const child of stmt.children) {
        traverse(child, depth + 1);
      }
      if (stmt.branches) {
        for (const branch of stmt.branches) {
          for (const s of branch) {
            traverse(s, depth + 1);
          }
        }
      }
    };

    for (const stmt of statements) {
      traverse(stmt, 1);
    }

    return maxDepth;
  }

  private hasEarlyExit(statements: StatementIR[]): boolean {
    const check = (stmt: StatementIR): boolean => {
      if (stmt.type === 'return' || stmt.type === 'break' || stmt.type === 'continue') {
        return true;
      }
      if (stmt.children.some(check)) return true;
      if (stmt.branches?.some(branch => branch.some(check))) return true;
      return false;
    };

    return statements.some(check);
  }

  private findFunctionCalls(node: CSTNode): string[] {
    const calls: string[] = [];

    const traverse = (n: CSTNode) => {
      if (this.adapter.isCallNode(n)) {
        const name = this.extractCallName(n);
        if (name) calls.push(name);
      }
      n.children.forEach(traverse);
    };

    traverse(node);
    return [...new Set(calls)];
  }

  private extractCallName(node: CSTNode): string {
    // Try to find identifier in call expression
    const identNode = node.children.find(c => c.type === 'identifier' || c.type === 'member_expression');
    if (identNode) {
      if (identNode.type === 'identifier') {
        return identNode.text;
      } else {
        // For member expressions like obj.method(), extract method name
        const parts = identNode.text.split('.');
        return parts[parts.length - 1];
      }
    }
    return '<unknown>';
  }

  private findAllocations(node: CSTNode): StatementIR[] {
    const allocations: StatementIR[] = [];

    const traverse = (n: CSTNode) => {
      if (this.adapter.isAllocationNode(n)) {
        allocations.push(this.buildAllocationStatement(n));
      }
      n.children.forEach(traverse);
    };

    traverse(node);
    return allocations;
  }
}