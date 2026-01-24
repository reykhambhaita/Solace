/**
 * ARCHITECTURAL FIX: Explicit Review → Anchor extraction
 * Guarantees concrete, retrieval-ready anchors from review semantics
 */

function extractReviewAnchors(reviewIR, codeContext, reviewResponse) {
  const anchors = {
    concrete: [],      // Explicit symbols, APIs, constructs
    conceptual: [],    // Abstract topics requiring refinement
    metadata: {
      hasConcreteSymbols: false,
      reviewQuality: 'unknown',
      shortCircuit: false,
      reason: null
    }
  };

  const language = codeContext.language.language;

  // SHORT-CIRCUIT: Trivial code detection
  if (isTrivialCode(reviewIR, codeContext)) {
    anchors.metadata.shortCircuit = true;
    anchors.metadata.reason = 'trivial-code-path';
    anchors.concrete.push({
      type: 'trivial',
      symbol: `${language} basics`,
      source: 'short-circuit',
      weight: 1.0
    });
    return anchors;
  }

  // VALIDATION: Reject degraded review states
  const reviewQuality = validateReviewQuality(reviewResponse);
  anchors.metadata.reviewQuality = reviewQuality.status;

  if (reviewQuality.status === 'invalid') {
    console.error('[Review-Anchor] Invalid review state:', reviewQuality.reasons);
    // Return minimal baseline anchors instead of proceeding
    return buildMinimalAnchors(codeContext);
  }

  // CONCRETE SYMBOLS: Extract from code elements (HIGH PRIORITY)
  const symbols = extractConcreteSymbols(reviewIR, codeContext);
  anchors.concrete.push(...symbols);
  anchors.metadata.hasConcreteSymbols = symbols.length > 0;

  // CONCEPTUAL: Extract from review semantics (LOWER PRIORITY)
  const concepts = extractReviewConcepts(reviewResponse, codeContext);
  anchors.conceptual.push(...concepts);

  console.log('[Review-Anchor]', {
    concrete: anchors.concrete.length,
    conceptual: anchors.conceptual.length,
    quality: reviewQuality.status,
    hasSymbols: anchors.metadata.hasConcreteSymbols
  });

  return anchors;
}

function isTrivialCode(reviewIR, codeContext) {
  // Detect hello-world, console.log, print-only patterns
  // We relax these conditions to prevent aggressive short-circuiting
  const trivialPatterns = [
    reviewIR.structure.linesOfCode < 3, // Reduced from 5
    (reviewIR.structure.functions === 0 && reviewIR.structure.classes === 0 && (reviewIR.structure.loops || 0) === 0), // Added loops
    reviewIR.elements.decisionRules.length === 0,
    codeContext.libraries.libraries.length === 0
  ];

  const trivialCount = trivialPatterns.filter(Boolean).length;
  // Require 4/4 trivial indicators instead of 3/4 to be considered truly trivial
  return trivialCount >= 4;
}

function validateReviewQuality(reviewResponse) {
  const reasons = [];

  // Check for empty or placeholder responses
  const fields = ['complexity', 'purpose', 'behavioral', 'risks', 'edgeCases', 'summary'];
  const invalidPatterns = [
    /unable to parse/i,
    /no issues found\./,
    /^$/,
    /^\s*$/
  ];

  fields.forEach(field => {
    const value = reviewResponse[field] || '';
    if (invalidPatterns.some(pattern => pattern.test(value))) {
      reasons.push(`${field}-empty-or-invalid`);
    }
  });

  // Check for ordinal contamination (should have been filtered, but double-check)
  fields.forEach(field => {
    const value = reviewResponse[field] || '';
    if (/^\s*\d+\.?\s*$/.test(value) || /^(item|section|point)\s*\d+/i.test(value)) {
      reasons.push(`${field}-ordinal-contamination`);
    }
  });

  return {
    status: reasons.length === 0 ? 'valid' : reasons.length <= 2 ? 'degraded' : 'invalid',
    reasons
  };
}

function extractConcreteSymbols(reviewIR, codeContext) {
  const symbols = [];
  const language = codeContext.language.language;

  // Extract from imported libraries (NON-STDLIB)
  codeContext.libraries.libraries
    .filter(lib => !lib.isStandardLib)
    .slice(0, 8)
    .forEach(lib => {
      symbols.push({
        type: 'library-api',
        symbol: lib.name,
        context: `${language} ${lib.name} API`,
        source: 'import-analysis',
        weight: 0.95,
        retrievalReady: true
      });
    });

  // Extract from frameworks
  codeContext.libraries.frameworks.forEach(fw => {
    symbols.push({
      type: 'framework-api',
      symbol: fw.name,
      context: `${language} ${fw.name}`,
      source: 'framework-detection',
      weight: 1.0,
      retrievalReady: true
    });
  });

  // Extract from magic values (if they represent APIs/configs)
  reviewIR.elements.magicValues
    .filter(mv => mv.role && mv.role !== 'unknown' && mv.role !== 'literal')
    .slice(0, 5)
    .forEach(mv => {
      symbols.push({
        type: 'config-symbol',
        symbol: mv.role,
        context: `${language} ${mv.role}`,
        source: 'magic-value-analysis',
        weight: 0.7,
        retrievalReady: true
      });
    });

  return symbols;
}

function extractReviewConcepts(reviewResponse, codeContext) {
  const concepts = [];
  const language = codeContext.language.language;

  // Extract from complexity analysis (if it mentions specific patterns)
  const complexityText = reviewResponse.complexity || '';
  const complexityPatterns = extractPatternsFromText(complexityText);
  complexityPatterns.forEach(pattern => {
    concepts.push({
      type: 'algorithmic-concept',
      topic: pattern,
      context: `${language} ${pattern}`,
      source: 'review-complexity',
      weight: 0.6,
      retrievalReady: false // Needs refinement
    });
  });

  // Extract from behavioral analysis
  const behavioralText = reviewResponse.behavioral || '';
  const behavioralPatterns = extractPatternsFromText(behavioralText);
  behavioralPatterns.forEach(pattern => {
    concepts.push({
      type: 'behavioral-concept',
      topic: pattern,
      context: `${language} ${pattern}`,
      source: 'review-behavioral',
      weight: 0.65,
      retrievalReady: false
    });
  });

  return concepts.slice(0, 5); // Limit conceptual anchors
}

function extractPatternsFromText(text) {
  // Extract technical terms (basic NLP)
  const technicalTerms = [];
  const words = text.toLowerCase().split(/\s+/);

  const technicalKeywords = [
    'recursion', 'iteration', 'memoization', 'async', 'promise',
    'callback', 'closure', 'prototype', 'inheritance', 'polymorphism',
    'concurrency', 'parallelism', 'mutex', 'semaphore', 'deadlock',
    'race condition', 'immutability', 'pure function', 'side effect'
  ];

  technicalKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      technicalTerms.push(keyword);
    }
  });

  return [...new Set(technicalTerms)]; // Deduplicate
}

function buildMinimalAnchors(codeContext) {
  const language = codeContext.language.language;

  return {
    concrete: [{
      type: 'fallback',
      symbol: `${language} documentation`,
      context: `${language} official docs`,
      source: 'minimal-fallback',
      weight: 1.0,
      retrievalReady: true
    }],
    conceptual: [],
    metadata: {
      hasConcreteSymbols: false,
      reviewQuality: 'fallback',
      shortCircuit: false,
      reason: 'degraded-review-quality'
    }
  };
}

module.exports = { extractReviewAnchors };