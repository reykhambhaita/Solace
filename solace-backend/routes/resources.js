// routes/resources.js
const express = require('express');
const router = express.Router();

async function buildSearchQueries(reviewContext, codeContext, sourceCode = '') {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.warn('GROQ API key not configured, falling back to basic queries');
    return buildFallbackQueriesFromReview(reviewContext, codeContext);
  }

  try {
    const language = codeContext.language.language;
    const systemPrompt = `You are a search query optimization expert. Given an enriched learning context, generate 10-15 HIGHLY SPECIFIC search queries optimized for different content types.

QUERY TYPES TO GENERATE:
1. Official Documentation (2-3 queries) - Target MDN, language docs, framework docs
2. Tutorial/Guide (3-4 queries) - Target step-by-step learning content
3. Conceptual Explanation (2-3 queries) - Target theory and understanding
4. Video Content (2-3 queries) - Target YouTube, courses, screencasts
5. Troubleshooting (2-3 queries) - Target Stack Overflow, issue solutions

QUERY OPTIMIZATION RULES:
- Use exact technical terms and official names
- Include language/framework version context where relevant
- Add keywords like "tutorial", "guide", "explained", "how to"
- Use variations: "vs", "comparison", "best practices", "common mistakes"
- Target different skill levels: "beginner", "advanced", "deep dive"

Return ONLY a JSON array:
[
  {
    "query": "specific search query string",
    "type": "documentation|tutorial|conceptual|video|troubleshooting",
    "contentType": "article|video|docs",
    "targetAudience": "beginner|intermediate|advanced",
    "weight": 0.7-1.0
  }
]`;

    const userPrompt = `Generate optimized search queries from this learning context:

LANGUAGE: ${language}
PRIMARY CONCEPTS: ${reviewContext.primaryConcepts?.join(', ')}
PREREQUISITES: ${reviewContext.prerequisites?.join(', ')}
RELATED TOPICS: ${reviewContext.relatedTopics?.join(', ')}
ECOSYSTEM TERMS: ${reviewContext.ecosystemTerms?.join(', ')}

SEARCH INTENTS:
${JSON.stringify(reviewContext.searchIntents, null, 2)}

Generate 10-15 diverse, optimized search queries covering all content types and skill levels.`;

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
        temperature: 0.6,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const queries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const formattedQueries = queries.map(q => ({
      primary: q.query,
      weight: q.weight || 0.8,
      type: q.type || 'general',
      contentType: q.contentType || 'article',
      targetAudience: q.targetAudience || 'intermediate'
    }));

    console.log(`[Query Builder] Generated ${formattedQueries.length} queries from review context`);
    formattedQueries.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.type}/${q.contentType}] ${q.primary}`);
    });

    return formattedQueries.length > 0 ? formattedQueries : buildFallbackQueriesFromReview(reviewContext, codeContext);

  } catch (error) {
    console.error('Query generation error:', error);
    return buildFallbackQueriesFromReview(reviewContext, codeContext);
  }
}

function buildFallbackQueriesFromReview(reviewContext, codeContext) {
  const queries = [];
  const language = codeContext.language.language;

  // Generate from review context
  reviewContext.primaryConcepts?.forEach(concept => {
    queries.push({
      primary: `${language} ${concept} tutorial`,
      weight: 1.0,
      type: 'tutorial',
      contentType: 'article'
    });
  });

  reviewContext.searchIntents?.documentation?.forEach(intent => {
    queries.push({
      primary: intent,
      weight: 0.9,
      type: 'documentation',
      contentType: 'docs'
    });
  });

  reviewContext.searchIntents?.videos?.forEach(intent => {
    queries.push({
      primary: intent,
      weight: 0.85,
      type: 'video',
      contentType: 'video'
    });
  });

  return queries.slice(0, 10);
}
/**
 * Fallback query generation when LLM is unavailable
 */

/**
 * Fetch GitHub repositories
 */
async function fetchGitHub(query) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.warn('GitHub token not configured (process.env.GITHUB_TOKEN is missing)');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map(repo => ({
      type: 'github',
      title: repo.full_name,
      url: repo.html_url,
      description: repo.description || 'No description available',
      metadata: {
        stars: repo.stargazers_count,
        language: repo.language,
      },
      rawRelevance: 0 // Will be scored by LLM
    }));
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return [];
  }
}


async function fetchTavilyByIntent(queries) {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_API_KEY) return [];

  // Group by intent
  const intentGroups = {};
  queries.forEach(q => {
    const intent = q.intent || 'general';
    if (!intentGroups[intent]) intentGroups[intent] = [];
    intentGroups[intent].push(q);
  });

  const allResults = [];

  // Fetch each intent group separately
  for (const [intent, intentQueries] of Object.entries(intentGroups)) {
    try {
      const topQueries = intentQueries.slice(0, 3);
      const combinedQuery = topQueries.map(q => q.primary).join(' OR ');

      console.log(`[Tavily:${intent}] Fetching ${topQueries.length} queries`);

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: combinedQuery,
          search_depth: 'advanced',
          max_results: Math.min(topQueries.length * 2, 10)
        })
      });

      if (!response.ok) throw new Error(`Tavily error: ${response.status}`);

      const data = await response.json();
      const results = (data.results || []).map(result => {
        let type = 'article';
        const url = result.url.toLowerCase();

        if (url.includes('youtube.com') || url.includes('vimeo.com')) {
          type = 'video';
        } else if (url.includes('docs.') || url.includes('developer.')) {
          type = 'documentation';
        } else if (url.includes('stackoverflow.com')) {
          type = 'stackoverflow';
        }

        return {
          type,
          title: result.title,
          url: result.url,
          description: result.content?.substring(0, 200) || '',
          intent, // Tag with intent
          metadata: {
            score: result.score || 0.5,
            source: new URL(result.url).hostname
          },
          rawRelevance: result.score || 0.5
        };
      });

      allResults.push(...results);
      console.log(`[Tavily:${intent}] Got ${results.length} results`);

    } catch (error) {
      console.error(`[Tavily:${intent}] Error:`, error.message);
    }
  }

  return allResults;
}


/**
 * Fetch MDN documentation
 */
async function fetchMDN(query, language) {
  try {
    // MDN search endpoint
    const searchUrl = `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Solace-Learning-Platform/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`MDN API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.documents || []).slice(0, 3).map(doc => ({
      type: 'documentation',
      title: doc.title,
      url: `https://developer.mozilla.org${doc.mdn_url}`,
      description: doc.summary || 'Official MDN documentation',
      metadata: {
        category: 'mdn-docs',
        popularity: doc.popularity || 0,
        language: language
      },
      rawRelevance: 0.95 // MDN docs are highly relevant
    }));
  } catch (error) {
    console.error('MDN fetch error:', error);
    return [];
  }
}
/**
 * Fetch Stack Overflow questions
 */
async function fetchStackOverflow(query) {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=5&filter=withbody`
    );

    if (!response.ok) {
      throw new Error(`Stack Overflow API error: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map(item => ({
      type: 'stackoverflow',
      title: item.title,
      url: item.link,
      description: item.body_markdown?.substring(0, 200) || 'No description available',
      metadata: {
        votes: item.score,
        answers: item.answer_count,
        views: item.view_count,
        accepted: item.is_answered
      },
      rawRelevance: 0
    }));
  } catch (error) {
    console.error('Stack Overflow fetch error:', error);
    return [];
  }
}

/**
 * Fetch documentation via Google Custom Search
 */
/**
 * ARCHITECTURAL FIX: Ranking is best-effort enhancement
 * Uses pre-pruned, bounded payload
 */

async function rankResourcesWithLLM(resources, reviewContext) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // GUARANTEE: Return unranked on any failure
  if (!GROQ_API_KEY || resources.length === 0) {
    console.log('[Ranking] Skipped, using pre-ranking order');
    return resources.map((r, i) => ({
      ...r,
      relevanceScore: 0.9 - (i * 0.05),
      ranked: false
    }));
  }

  try {
    const systemPrompt = `Score ${resources.length} resources (0.0-1.0) for learning goal: "${reviewContext.learningGoal}"

Priority: ${JSON.stringify(reviewContext.contentPriority)}

Return ONLY JSON array of scores: [0.95, 0.87, ...]`;

    const userPrompt = resources.map((r, i) =>
      `${i}. [${r.type}] ${r.title}\n   ${r.description?.substring(0, 100)}`
    ).join('\n\n');

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
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error(`Ranking API error: ${response.status}`);

    const data = await response.json();
    const scoresText = data.choices[0]?.message?.content || '[]';
    const jsonMatch = scoresText.match(/\[[\s\S]*\]/);
    const scores = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return resources.map((r, i) => ({
      ...r,
      relevanceScore: scores[i] || r.rawRelevance || 0.5,
      ranked: true
    }));

  } catch (error) {
    console.error('[Ranking] Failed, using pre-ranking:', error.message);
    return resources.map((r, i) => ({
      ...r,
      relevanceScore: r.rawRelevance || (0.9 - i * 0.05),
      ranked: false
    }));
  }
}
/**
 * Main endpoint with review-driven workflow
 */

router.post('/resources', async (req, res) => {
  try {
    const { codeContext, sourceCode, userIntent } = req.body;

    if (!codeContext) {
      return res.status(400).json({
        success: false,
        error: 'Missing codeContext'
      });
    }

    console.log('[Resources] Starting review-driven resource fetch...');

    // STEP 1: Generate enriched review context (REVIEW STEP)
    const buildResourceReviewContext = req.app.locals.buildResourceReviewContext;
    const reviewContext = await buildResourceReviewContext(codeContext, sourceCode, userIntent);

    console.log('[Resources] Review context generated:', {
      primaryConcepts: reviewContext.primaryConcepts?.length,
      prerequisites: reviewContext.prerequisites?.length,
      searchIntents: Object.keys(reviewContext.searchIntents || {})
    });

    // STEP 2: Build search queries from reviewed context (QUERY GENERATION)
    const queries = await buildSearchQueries(reviewContext, codeContext, sourceCode);
    console.log(`[Resources] Generated ${queries.length} search queries from review`);

    // STEP 3: Fetch from all sources in parallel (RESOURCE FETCH)
    const language = codeContext.language.language;

    const fetchPromises = [];

    // Existing sources (keep as-is)
    queries.slice(0, 3).forEach(q => {
      fetchPromises.push(fetchGitHub(q.primary));
      fetchPromises.push(fetchStackOverflow(q.primary));
    });

    // NEW: Tavily batch search (all queries in one call)
    const tavilyQueries = queries.slice(0, 10); // Use more queries for batch
    fetchPromises.push(fetchTavilyByIntent(tavilyQueries));

    // NEW: MDN documentation (for web languages)
    if (['typescript', 'javascript'].includes(language)) {
      queries.filter(q => q.type === 'documentation').slice(0, 3).forEach(q => {
        fetchPromises.push(fetchMDN(q.primary, language));
      });
    }

    const allResources = await Promise.all(fetchPromises);

    // Flatten and deduplicate
    const flatResources = allResources.flat();
    const uniqueResources = Array.from(
      new Map(flatResources.map(r => [r.url, r])).values()
    );

    console.log(`[Resources] Fetched ${uniqueResources.length} unique resources`);

    // STEP 4: Rank with LLM (using review context)
    const rankedResources = await rankResourcesWithLLM(uniqueResources, codeContext, queries, reviewContext);

    // Sort by relevance and take top 25
    const topResources = rankedResources
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 25);

    console.log(`[Resources] Returning ${topResources.length} ranked resources`);

    res.json({
      success: true,
      resources: topResources,
      metadata: {
        totalFetched: uniqueResources.length,
        totalReturned: topResources.length,
        learningGoal: reviewContext.learningGoal,
        pipeline: {
          baselineQueries: queries.filter(q => q.source === 'baseline').length,
          expandedQueries: queries.filter(q => q.source === 'expansion').length,
          resourcesRanked: uniqueResources.length,
          resourcesReturned: topResources.length
        },
        queries: queries.map(q => q.primary),
        reviewContext: {
          primaryConcepts: reviewContext.primaryConcepts,
          learningPath: reviewContext.learningPath
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resources endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch resources'
    });
  }
});

module.exports = router;