// routes/resources.js
const express = require('express');
const router = express.Router();

/**
 * Build search queries from code context using deep intent analysis
 */
async function buildSearchQueries(codeContext, sourceCode = '') {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.warn('GROQ API key not configured, falling back to basic queries');
    return buildFallbackQueries(codeContext);
  }

  try {
    // Extract context information
    const language = codeContext.language.language;
    const intent = codeContext.llmContext.intent;
    const paradigm = codeContext.paradigm.primary.paradigm;
    const patterns = codeContext.paradigm.patterns;
    const frameworks = codeContext.libraries.frameworks.map(f => f.name).join(', ') || 'None';
    const topLibraries = codeContext.libraries.libraries
      .filter(lib => !lib.isStandardLib)
      .slice(0, 5)
      .map(lib => lib.name)
      .join(', ') || 'None';
    const errorHandling = codeContext.libraries.errorHandling.approach;
    const executionModel = codeContext.paradigm.executionModel.primary;

    const systemPrompt = `You are an expert code analyst who deeply understands what code actually DOES and WHY developers write it.

Your task: Analyze code context and generate 5-7 HIGHLY SPECIFIC search queries that target the ACTUAL INTENT and REAL-WORLD USE CASE.

CRITICAL RULES:
1. Understand WHAT the code does, not just its structure
   - If code uses console.log() → "debugging and logging techniques"
   - If code uses print() → "debugging output and print formatting"
   - If code validates input → "input validation patterns and sanitization"
   - If code parses JSON → "JSON parsing error handling and validation"

2. Focus on SPECIFIC APIs, functions, and techniques being used
   - Include exact function names (console.log, fetch, map, filter, etc.)
   - Include specific patterns (async/await, promises, callbacks)
   - Include actual use cases (debugging, testing, data transformation)

3. Generate queries that find ACTIONABLE resources
   - Tutorials for the specific technique
   - Best practices for the actual use case
   - Common pitfalls and solutions
   - Real-world examples

4. Be CONCRETE, not abstract
   ❌ BAD: "TypeScript programming examples"
   ✅ GOOD: "TypeScript console.log debugging best practices"

   ❌ BAD: "Error handling patterns"
   ✅ GOOD: "try-catch error handling in async/await functions"

Return ONLY a JSON array:
[
  {
    "query": "highly specific search query targeting actual code intent",
    "type": "debugging|validation|parsing|transformation|testing|api-usage|pattern",
    "weight": 0.7-1.0,
    "reasoning": "brief explanation of why this query is relevant"
  }
]`;

    // Truncate source code if too long (keep first 500 chars for analysis)
    const codeSnippet = sourceCode.length > 500 ? sourceCode.substring(0, 500) + '...' : sourceCode;

    const userPrompt = `Analyze this code context and ACTUAL SOURCE CODE to understand what the developer is doing:

LANGUAGE: ${language}
PARADIGM: ${paradigm}
EXECUTION MODEL: ${executionModel}

FRAMEWORKS & LIBRARIES:
- Frameworks: ${frameworks}
- Libraries: ${topLibraries}

${codeSnippet ? `ACTUAL CODE:
\`\`\`${language}
${codeSnippet}
\`\`\`

` : ''}TASK: Look at the ${codeSnippet ? 'ACTUAL CODE above' : 'code context'} and generate 5-7 search queries for THIS SPECIFIC CODE.

Ask yourself:
- What specific APIs/functions ${codeSnippet ? 'do I see in the code' : 'are being used'}? (console.log, fetch, map, etc.)
- What is this code actually trying to do?
- What problems might the developer face with these specific APIs?
- What best practices exist for these exact functions?

Return the JSON array of queries now.`;

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
        temperature: 0.4, // Slightly higher for more creative, specific queries
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const queries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Transform to expected format
    const formattedQueries = queries.map(q => ({
      primary: q.query,
      weight: q.weight || 0.8,
      type: q.type || 'general',
      reasoning: q.reasoning || ''
    }));

    console.log(`Generated ${formattedQueries.length} intent-based queries:`);
    formattedQueries.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.type}] ${q.primary}`);
      if (q.reasoning) console.log(`     → ${q.reasoning}`);
    });

    return formattedQueries.length > 0 ? formattedQueries : buildFallbackQueries(codeContext);

  } catch (error) {
    console.error('LLM query generation error:', error);
    return buildFallbackQueries(codeContext);
  }
}

/**
 * Fallback query generation when LLM is unavailable
 */
function buildFallbackQueries(codeContext) {
  const queries = [];
  const language = codeContext.language.language;
  const intent = codeContext.llmContext.intent;
  const paradigm = codeContext.paradigm.primary.paradigm;

  // Basic intent query
  queries.push({
    primary: `${language} ${intent.primary} ${intent.semanticDescription}`,
    weight: 1.0,
    type: 'intent'
  });

  // Paradigm query
  if (paradigm && paradigm !== 'unknown') {
    queries.push({
      primary: `${language} ${paradigm} programming examples`,
      weight: 0.8,
      type: 'paradigm'
    });
  }

  // Framework query
  if (codeContext.libraries?.frameworks?.length > 0) {
    const framework = codeContext.libraries.frameworks[0].name;
    queries.push({
      primary: `${framework} tutorial`,
      weight: 0.9,
      type: 'framework'
    });
  }

  return queries;
}

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
async function fetchDocumentation(query, language) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    console.warn('Google API credentials not configured (GOOGLE_API_KEY or GOOGLE_CSE_ID missing)');
    return [];
  }

  try {
    // Add documentation-specific terms
    const docQuery = `${query} ${language} documentation tutorial guide`;

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(docQuery)}&num=5`
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items) return [];

    return data.items
      .filter(item => {
        const url = item.link.toLowerCase();
        // Filter for known documentation sites
        return url.includes('docs.') ||
          url.includes('documentation') ||
          url.includes('.readthedocs.') ||
          url.includes('developer.mozilla.org') ||
          url.includes('github.com') && url.includes('/wiki');
      })
      .map(item => ({
        type: 'documentation',
        title: item.title,
        url: item.link,
        description: item.snippet || 'No description available',
        metadata: {},
        rawRelevance: 0
      }));
  } catch (error) {
    console.error('Documentation fetch error:', error);
    return [];
  }
}

/**
 * Fetch YouTube videos
 */
async function fetchYouTube(query) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not configured (YOUTUBE_API_KEY missing)');
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encodeURIComponent(query)}&type=video&part=snippet&maxResults=5&order=relevance`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items) return [];

    return data.items.map(item => ({
      type: 'video',
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.videoId.videoId}`,
      description: item.snippet.description || 'No description available',
      metadata: {},
      rawRelevance: 0
    }));
  } catch (error) {
    console.error('YouTube fetch error:', error);
    return [];
  }
}

/**
 * Use LLM to rank resources by relevance
 */
async function rankResourcesWithLLM(resources, codeContext, queries) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.warn('GROQ API key not configured (GROQ_API_KEY missing), using basic scoring');
    return resources.map((r, i) => ({ ...r, relevanceScore: 0.5 - (i * 0.02) }));
  }

  try {
    // Extract context information
    const language = codeContext.language.language;
    const intent = codeContext.llmContext.intent;
    const paradigm = codeContext.paradigm.primary.paradigm;
    const patterns = codeContext.paradigm.patterns;
    const executionModel = codeContext.paradigm.executionModel.primary;
    const isDeterministic = codeContext.libraries.externalInteractions.isDeterministic;
    const frameworks = codeContext.libraries.frameworks.map(f => f.name).join(', ') || 'None';
    const topLibraries = codeContext.libraries.libraries
      .filter(lib => !lib.isStandardLib)
      .slice(0, 3)
      .map(lib => lib.name)
      .join(', ') || 'None';

    const systemPrompt = `You are an expert at evaluating learning resources for programmers.
Given code context and a list of resources, score each resource's relevance on a scale of 0.0 to 1.0.

Code Context:
- Language: ${language}
- Intent: ${intent.semanticDescription}
- Paradigm: ${paradigm}
- Execution Model: ${executionModel}
- Functions: ${patterns.functions}, Classes: ${patterns.classes}
- Complexity Indicators: Loops: ${patterns.loops}, Mutations: ${patterns.mutations}
- Deterministic: ${isDeterministic}
- Frameworks: ${frameworks}
- Key Libraries: ${topLibraries}

Search Queries Used:
${queries.map(q => `- ${q.primary} (${q.type})`).join('\n')}

Score each resource based on:
1. Direct relevance to the code's intent
2. Appropriate complexity level
3. Language/framework match
4. Resource quality (GitHub stars, Stack Overflow votes, etc.)
5. Freshness and maintenance

Return ONLY a JSON array of scores in the same order as the resources, no other text:
[0.95, 0.87, 0.65, ...]`;

    const userPrompt = `Resources to score:\n${resources.map((r, i) =>
      `${i}. [${r.type}] ${r.title}\n   ${r.description}\n   ${JSON.stringify(r.metadata)}`
    ).join('\n\n')}`;

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
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const scoresText = data.choices[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = scoresText.match(/\[[\s\S]*\]/);
    const scores = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Apply scores
    return resources.map((resource, i) => ({
      ...resource,
      relevanceScore: scores[i] || 0.5
    }));

  } catch (error) {
    console.error('LLM ranking error:', error);
    // Fallback: basic scoring based on metadata
    return resources.map((r, i) => {
      let score = 0.5;

      // Boost based on metadata
      if (r.metadata.stars > 1000) score += 0.15;
      else if (r.metadata.stars > 100) score += 0.1;

      if (r.metadata.votes > 10) score += 0.1;
      if (r.metadata.accepted) score += 0.15;

      // Slight penalty for position
      score -= i * 0.02;

      return { ...r, relevanceScore: Math.max(0, Math.min(1, score)) };
    });
  }
}

/**
 * Main endpoint
 */
router.post('/resources', async (req, res) => {
  try {
    const { codeContext, sourceCode } = req.body;

    if (!codeContext) {
      return res.status(400).json({
        success: false,
        error: 'Missing codeContext'
      });
    }

    // Build search queries from code context using LLM
    const queries = await buildSearchQueries(codeContext, sourceCode || '');
    console.log('Generated queries:', queries.map(q => q.primary));

    // Fetch from all sources in parallel
    const language = codeContext.language.language;
    const allResources = await Promise.all([
      ...queries.slice(0, 3).map(q => fetchGitHub(q.primary)),
      ...queries.slice(0, 3).map(q => fetchStackOverflow(q.primary))
    ]);

    // Flatten and deduplicate
    const flatResources = allResources.flat();
    const uniqueResources = Array.from(
      new Map(flatResources.map(r => [r.url, r])).values()
    );

    console.log(`Fetched ${uniqueResources.length} unique resources`);

    // Rank with LLM
    const rankedResources = await rankResourcesWithLLM(uniqueResources, codeContext, queries);

    // Sort by relevance and take top 20
    const topResources = rankedResources
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    console.log(`Returning ${topResources.length} ranked resources`);
    topResources.forEach((resource, index) => {
      console.log(`[Resource ${index + 1}] ${resource.title} - ${resource.url}`);
    });

    res.json({
      success: true,
      resources: topResources,
      metadata: {
        totalFetched: uniqueResources.length,
        totalReturned: topResources.length,
        queries: queries.map(q => q.primary),
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