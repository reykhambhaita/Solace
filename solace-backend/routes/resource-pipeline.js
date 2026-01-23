/**
 * ARCHITECTURAL FIX: Deterministic anchor extraction
 * Guarantees concrete query seeds from code context
 */

function extractAnchors(codeContext, reviewIR, sourceCode) {
  const anchors = {
    mandatory: [],      // Must produce at least 1 query
    optional: [],       // Enhance coverage
    metadata: {}
  };

  const language = codeContext.language.language;

  // MANDATORY: Language-specific official docs
  anchors.mandatory.push({
    type: 'official-docs',
    target: `${language} official documentation`,
    reason: 'language-runtime',
    weight: 1.0
  });

  // MANDATORY: Frameworks (concrete, detected)
  codeContext.libraries.frameworks.forEach(fw => {
    anchors.mandatory.push({
      type: 'framework-docs',
      target: `${fw.name} ${language} documentation`,
      reason: `detected-framework:${fw.name}`,
      weight: 0.95
    });
  });

  // MANDATORY: Imported libraries (not stdlib)
  codeContext.libraries.libraries
    .filter(lib => !lib.isStandardLib)
    .slice(0, 5)
    .forEach(lib => {
      anchors.mandatory.push({
        type: 'library-docs',
        target: `${lib.name} ${language} documentation`,
        reason: `detected-import:${lib.name}`,
        weight: 0.9
      });
    });

  // MANDATORY: Primary paradigm
  const paradigm = codeContext.paradigm.primary.paradigm;
  anchors.mandatory.push({
    type: 'conceptual',
    target: `${language} ${paradigm} patterns`,
    reason: `paradigm:${paradigm}`,
    weight: 0.85
  });

  // OPTIONAL: Error patterns (if detected)
  if (reviewIR.quality.errorHandling === 'partial' || reviewIR.quality.errorHandling === 'none') {
    anchors.optional.push({
      type: 'troubleshooting',
      target: `${language} error handling best practices`,
      reason: 'error-handling-gap',
      weight: 0.7
    });
  }

  // OPTIONAL: Magic values (concrete)
  if (reviewIR.elements.magicValues.length > 0) {
    const uniqueRoles = [...new Set(reviewIR.elements.magicValues.map(mv => mv.role))];
    uniqueRoles.slice(0, 3).forEach(role => {
      if (role && role !== 'unknown') {
        anchors.optional.push({
          type: 'conceptual',
          target: `${language} ${role} configuration`,
          reason: `magic-value:${role}`,
          weight: 0.65
        });
      }
    });
  }

  anchors.metadata = {
    totalAnchors: anchors.mandatory.length + anchors.optional.length,
    mandatoryCount: anchors.mandatory.length,
    detectedImports: codeContext.libraries.libraries.filter(l => !l.isStandardLib).length,
    language
  };

  console.log('[Anchors] Extracted:', {
    mandatory: anchors.mandatory.length,
    optional: anchors.optional.length
  });

  return anchors;
}


/**
 * ARCHITECTURAL FIX: Baseline queries (never fails silently)
 * Transforms anchors → guaranteed queries
 */

function buildBaselineQueries(anchors) {
  const queries = [];

  // GUARANTEE: At least 1 query per mandatory anchor
  anchors.mandatory.forEach(anchor => {
    queries.push({
      primary: anchor.target,
      intent: anchor.type,
      weight: anchor.weight,
      source: 'baseline',
      reason: anchor.reason,
      contentType: anchor.type === 'official-docs' ? 'docs' :
        anchor.type === 'framework-docs' ? 'docs' :
          anchor.type === 'library-docs' ? 'docs' : 'article'
    });
  });

  // OPTIONAL: Add optional anchors if under limit
  const remainingSlots = 15 - queries.length;
  anchors.optional.slice(0, remainingSlots).forEach(anchor => {
    queries.push({
      primary: anchor.target,
      intent: anchor.type,
      weight: anchor.weight,
      source: 'baseline',
      reason: anchor.reason,
      contentType: 'article'
    });
  });

  console.log('[Baseline] Generated', queries.length, 'guaranteed queries');

  // HARD GUARANTEE
  if (queries.length === 0) {
    throw new Error('CRITICAL: Baseline query generation failed (0 queries)');
  }

  return queries;
}
/**
 * ARCHITECTURAL FIX: LLM expansion is optional enhancement
 * Cannot fail the pipeline
 */

async function expandQueries(baselineQueries, reviewContext, codeContext) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.log('[Expansion] Skipped (no API key)');
    return baselineQueries;
  }

  try {
    const language = codeContext.language.language;

    const systemPrompt = `Generate 3-5 SUPPLEMENTARY search queries to enhance baseline coverage.

CONSTRAINTS:
- Only expand on existing baseline queries
- Max 5 new queries
- Must align with learning goal: ${reviewContext.learningGoal}
- Prioritize: ${JSON.stringify(reviewContext.contentPriority)}

Return JSON array: [{"query": "...", "intent": "...", "weight": 0.6-0.8}]`;

    const userPrompt = `BASELINE QUERIES:
${baselineQueries.map(q => `- ${q.primary}`).join('\n')}

EXPANSION HINTS:
${reviewContext.expansionHints?.join(', ') || 'none'}

Generate 3-5 supplementary queries.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) throw new Error(`Expansion API error: ${response.status}`);

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const expansions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const expandedQueries = expansions.slice(0, 5).map(exp => ({
      primary: exp.query,
      intent: exp.intent || 'general',
      weight: exp.weight || 0.7,
      source: 'expansion',
      reason: 'llm-enhancement',
      contentType: 'article'
    }));

    console.log('[Expansion] Added', expandedQueries.length, 'enhancement queries');
    return [...baselineQueries, ...expandedQueries];

  } catch (error) {
    console.error('[Expansion] Failed, using baseline only:', error.message);
    return baselineQueries; // GUARANTEE: Never fails pipeline
  }
}
/**
 * ARCHITECTURAL FIX: Prune before ranking
 * Guarantees ranking payload < 15 resources
 */

function pruneForRanking(resources, maxResources = 15) {
  // Deduplicate by URL
  const uniqueByUrl = Array.from(
    new Map(resources.map(r => [r.url, r])).values()
  );

  // Priority ranking (pre-ranking)
  const prioritized = uniqueByUrl.sort((a, b) => {
    // Official docs > everything
    if (a.type === 'documentation' && b.type !== 'documentation') return -1;
    if (b.type === 'documentation' && a.type !== 'documentation') return 1;

    // Then by raw relevance
    return (b.rawRelevance || 0) - (a.rawRelevance || 0);
  });

  const pruned = prioritized.slice(0, maxResources);

  console.log(`[Pruning] ${resources.length} → ${pruned.length} (pre-ranking)`);

  return pruned;
}

module.exports = { extractAnchors, buildBaselineQueries, expandQueries, pruneForRanking };
