
/**
 * Cost Expression Types
 * Represents complexity as an algebraic expression tree
 */
export type CostExpr =
  | { kind: 'constant'; value: number }
  | { kind: 'logarithmic'; base: number; variable: string }
  | { kind: 'linear'; variable: string }
  | { kind: 'polynomial'; degree: number; variable: string }
  | { kind: 'exponential'; base: number; variable: string }
  | { kind: 'multiply'; factors: CostExpr[] }
  | { kind: 'add'; terms: CostExpr[] }
  | { kind: 'symbolic'; name: string; description: string };

/**
 * Helper Constructors
 */

export function constCost(value: number = 1): CostExpr {
  return { kind: 'constant', value };
}

export function linearCost(variable: string = 'n'): CostExpr {
  return { kind: 'linear', variable };
}

export function logCost(variable: string = 'n', base: number = 2): CostExpr {
  return { kind: 'logarithmic', base, variable };
}

export function polyCost(degree: number, variable: string = 'n'): CostExpr {
  if (degree === 0) return constCost(1);
  if (degree === 1) return linearCost(variable);
  return { kind: 'polynomial', degree, variable };
}

export function expCost(base: number, variable: string = 'n'): CostExpr {
  return { kind: 'exponential', base, variable };
}

export function symbolicCost(name: string, description: string = ''): CostExpr {
  return { kind: 'symbolic', name, description };
}

export function multiplyCosts(...factors: CostExpr[]): CostExpr {
  if (factors.length === 0) return constCost(1);
  if (factors.length === 1) return factors[0];

  // Flatten nested multiplications
  const flatFactors: CostExpr[] = [];
  for (const factor of factors) {
    if (factor.kind === 'multiply') {
      flatFactors.push(...factor.factors);
    } else {
      flatFactors.push(factor);
    }
  }

  return { kind: 'multiply', factors: flatFactors };
}

export function addCosts(...terms: CostExpr[]): CostExpr {
  if (terms.length === 0) return constCost(0);
  if (terms.length === 1) return terms[0];

  // Flatten nested additions
  const flatTerms: CostExpr[] = [];
  for (const term of terms) {
    if (term.kind === 'add') {
      flatTerms.push(...term.terms);
    } else {
      flatTerms.push(term);
    }
  }

  return { kind: 'add', terms: flatTerms };
}

/**
 * Algebraic Reduction
 * Simplifies cost expressions using algebraic rules
 */
export function reduceCostExpr(expr: CostExpr): CostExpr {
  switch (expr.kind) {
    case 'constant':
    case 'logarithmic':
    case 'linear':
    case 'polynomial':
    case 'exponential':
    case 'symbolic':
      return expr;

    case 'multiply':
      return reduceMultiply(expr.factors);

    case 'add':
      return reduceAdd(expr.terms);
  }
}

function reduceMultiply(factors: CostExpr[]): CostExpr {
  // Reduce each factor first
  const reduced = factors.map(reduceCostExpr);

  // Collect constants
  let constantProduct = 1;
  const nonConstants: CostExpr[] = [];

  for (const factor of reduced) {
    if (factor.kind === 'constant') {
      constantProduct *= factor.value;
    } else {
      nonConstants.push(factor);
    }
  }

  // If any factor is 0, result is 0
  if (constantProduct === 0) {
    return constCost(0);
  }

  // If all factors are constant
  if (nonConstants.length === 0) {
    return constCost(constantProduct);
  }

  // If constant is 1, omit it
  const finalFactors = constantProduct === 1
    ? nonConstants
    : [constCost(constantProduct), ...nonConstants];

  // Combine same-variable polynomials
  const combined = combinePolynomials(finalFactors);

  if (combined.length === 1) {
    return combined[0];
  }

  return { kind: 'multiply', factors: combined };
}

function reduceAdd(terms: CostExpr[]): CostExpr {
  // Reduce each term first
  const reduced = terms.map(reduceCostExpr);

  // In Big-O, we keep only the dominant term
  // Order: exponential > polynomial > linear > logarithmic > constant

  let dominant: CostExpr | null = null;

  for (const term of reduced) {
    if (!dominant) {
      dominant = term;
      continue;
    }

    const comparison = compareDominance(term, dominant);
    if (comparison > 0) {
      dominant = term;
    }
  }

  return dominant || constCost(0);
}

function combinePolynomials(factors: CostExpr[]): CostExpr[] {
  // Combine n^a * n^b = n^(a+b)
  const byVariable = new Map<string, number>();
  const others: CostExpr[] = [];

  for (const factor of factors) {
    if (factor.kind === 'linear') {
      const current = byVariable.get(factor.variable) || 0;
      byVariable.set(factor.variable, current + 1);
    } else if (factor.kind === 'polynomial') {
      const current = byVariable.get(factor.variable) || 0;
      byVariable.set(factor.variable, current + factor.degree);
    } else {
      others.push(factor);
    }
  }

  const combined: CostExpr[] = [];
  for (const [variable, degree] of byVariable.entries()) {
    combined.push(polyCost(degree, variable));
  }

  return [...combined, ...others];
}

/**
 * Compare dominance of two cost expressions
 * Returns: > 0 if a dominates b, < 0 if b dominates a, 0 if equal
 */
function compareDominance(a: CostExpr, b: CostExpr): number {
  const rankA = getDominanceRank(a);
  const rankB = getDominanceRank(b);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // Same rank, compare degrees/bases
  if (a.kind === 'polynomial' && b.kind === 'polynomial') {
    return a.degree - b.degree;
  }

  if (a.kind === 'exponential' && b.kind === 'exponential') {
    return a.base - b.base;
  }

  return 0;
}

function getDominanceRank(expr: CostExpr): number {
  switch (expr.kind) {
    case 'constant':
      return 0;
    case 'logarithmic':
      return 1;
    case 'linear':
      return 2;
    case 'polynomial':
      return 2 + expr.degree;
    case 'exponential':
      return 100 + expr.base;
    case 'multiply':
      // Rank of multiplication is sum of ranks
      return expr.factors.reduce((sum, f) => sum + getDominanceRank(f), 0);
    case 'add':
      // Rank of addition is max of ranks
      return Math.max(...expr.terms.map(getDominanceRank));
    case 'symbolic':
      return 50; // Unknown, assume moderate
  }
}

/**
 * Convert Cost Expression to Big-O String
 * This is the ONLY place where we generate Big-O notation
 */
export function costExprToBigO(expr: CostExpr): string {
  const reduced = reduceCostExpr(expr);
  return `O(${costExprToString(reduced)})`;
}

function costExprToString(expr: CostExpr): string {
  switch (expr.kind) {
    case 'constant':
      return '1';

    case 'logarithmic':
      return expr.base === 2 ? `log ${expr.variable}` : `log_${expr.base} ${expr.variable}`;

    case 'linear':
      return expr.variable;

    case 'polynomial':
      if (expr.degree === 2) {
        return `${expr.variable}Â²`;
      }
      return `${expr.variable}^${expr.degree}`;

    case 'exponential':
      return `${expr.base}^${expr.variable}`;

    case 'multiply': {
      const parts = expr.factors.map(costExprToString);
      return parts.join(' ');
    }

    case 'add': {
      const parts = expr.terms.map(costExprToString);
      return parts.join(' + ');
    }

    case 'symbolic':
      return expr.name;
  }
}

/**
 * Get human-readable explanation of cost expression
 */
export function explainCostExpr(expr: CostExpr): string {
  switch (expr.kind) {
    case 'constant':
      return 'Constant time operation';

    case 'logarithmic':
      return `Logarithmic in ${expr.variable} (e.g., binary search)`;

    case 'linear':
      return `Linear in ${expr.variable} (e.g., single loop)`;

    case 'polynomial':
      if (expr.degree === 2) {
        return `Quadratic in ${expr.variable} (e.g., nested loops)`;
      }
      return `Polynomial degree ${expr.degree} in ${expr.variable}`;

    case 'exponential':
      return `Exponential in ${expr.variable} (e.g., recursive branching)`;

    case 'multiply': {
      const explanations = expr.factors.map(explainCostExpr);
      return `Product of: ${explanations.join(', ')}`;
    }

    case 'add': {
      const explanations = expr.terms.map(explainCostExpr);
      return `Sum of: ${explanations.join(', ')} (dominant term shown)`;
    }

    case 'symbolic':
      return expr.description || `Unknown complexity: ${expr.name}`;
  }
}
