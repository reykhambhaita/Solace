require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const resourcesRouter = require('./routes/resources');

const app = express();
const PORT = process.env.PORT || 3001;

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Add logging middleware to debug routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Solace backend is running',
    timestamp: new Date().toISOString(),
    groqConfigured: !!GROQ_API_KEY
  });
});


async function buildResourceReviewContext(codeContext, sourceCode, userIntent = '') {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return buildBasicResourceContext(codeContext);
  }

  try {
    const language = codeContext.language.language;
    const intent = codeContext.llmContext.intent;
    const detReasoning = codeContext.libraries.externalInteractions.determinismReasoning;
    const sideEffects = codeContext.reviewIR.behavior.sideEffects;

    const systemPrompt = `You are a technical learning planner. Analyze code and output a CONSTRAINED learning strategy.

CRITICAL RULES:
1. Only reference APIs/constructs that ACTUALLY APPEAR in the code
2. Prerequisites must be concrete dependencies, not general topics
3. Learning path must align with detected paradigm and imports
4. Do NOT invent frameworks, libraries, or concepts

OUTPUT FORMAT (strict JSON):
{
  "learningGoal": "1-sentence specific goal based on code intent",
  "detectedGaps": ["concrete missing knowledge item 1", "item 2"],
  "skillLevel": "beginner|intermediate|advanced",
  "contentPriority": {
    "official-docs": 0-1,
    "tutorials": 0-1,
    "troubleshooting": 0-1,
    "videos": 0-1
  },
  "expansionHints": ["optional enhancement 1", "optional enhancement 2"]
}`;

    const userPrompt = `DETECTED CODE CONTEXT:
Language: ${language}
Paradigm: ${codeContext.paradigm.primary.paradigm} (Confidence: ${codeContext.paradigm.primary.confidence})
Intent: ${intent.semanticDescription}
Determinism: ${detReasoning.classification.class} (${detReasoning.classification.llmGuidance})
Side Effects: ${sideEffects.purity} (${sideEffects.sideEffectTypes.join(', ') || 'none'})
Frameworks: ${codeContext.libraries.frameworks.map(f => f.name).join(', ') || 'None'}
Imports: ${codeContext.libraries.libraries.filter(l => !l.isStandardLib).slice(0, 5).map(l => l.name).join(', ') || 'None'}
Metrics: ${codeContext.reviewIR.structure.functions} functions, ${codeContext.reviewIR.structure.classes} classes, ${codeContext.reviewIR.quality.controlFlowComplexity} complexity

${userIntent ? `USER GOAL: ${userIntent}` : ''}

Generate learning strategy JSON.`;

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
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const reviewContext = jsonMatch ? JSON.parse(jsonMatch[0]) : buildBasicResourceContext(codeContext);

    console.log(`[${new Date().toISOString()}] [Review] Generated constrained context`);
    return reviewContext;

  } catch (error) {
    console.error('Review context error:', error);
    return buildBasicResourceContext(codeContext);
  }
}

function buildBasicResourceContext(codeContext) {
  return {
    learningGoal: `Learn ${codeContext.language.language}`,
    detectedGaps: [],
    skillLevel: 'intermediate',
    contentPriority: {
      'official-docs': 1.0,
      'tutorials': 0.8,
      'troubleshooting': 0.5,
      'videos': 0.3
    },
    expansionHints: []
  };
}

// Export for use in resources.js
app.locals.buildResourceReviewContext = buildResourceReviewContext;

const { pruneForRanking } = require('./routes/resource-pipeline');


app.use('/api', resourcesRouter);

// =============================================================================
// CODE EXECUTION
// =============================================================================

// Code execution endpoint (existing)
app.post('/api/execute', async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({
      error: 'Missing required fields: code and language'
    });
  }

  console.log(`[${new Date().toISOString()}] Executing ${language} code (${code.length} chars)`);

  try {
    const result = await executeCode(code, language);
    console.log(`[${new Date().toISOString()}] Execution completed in ${result.executionTime}`);
    res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      error: error.message || 'Execution failed',
      details: error.toString()
    });
  }
});

async function executeCode(code, language) {
  const startTime = Date.now();
  const executionId = uuidv4();

  let extension = getFileExtension(language);
  let filename = `code_${executionId}.${extension}`;

  if (language === 'java') {
    const classNameMatch = code.match(/(?:public\s+)?class\s+(\w+)/);
    if (classNameMatch) {
      filename = `${classNameMatch[1]}.java`;
    } else {
      return {
        output: '',
        error: 'Error: No valid class declaration found in Java code.\n\nMake sure your code has a class declaration like:\nclass MyClass { ... }\nor\npublic class MyClass { ... }',
        exitCode: 1,
        executionTime: '0ms'
      };
    }
  }

  const filepath = path.join('/tmp', filename);

  try {
    await fs.writeFile(filepath, code, 'utf8');
    console.log(`[${new Date().toISOString()}] Code written to: ${filepath}`);

    const dockerCommand = buildDockerCommand(filepath, filename, language);
    console.log(`[${new Date().toISOString()}] Executing: ${dockerCommand}`);

    const result = await runDockerCommand(dockerCommand);
    const executionTime = Date.now() - startTime;

    return {
      output: result.stdout || '',
      error: result.stderr || '',
      exitCode: result.exitCode,
      executionTime: `${executionTime}ms`
    };

  } finally {
    try {
      await fs.unlink(filepath);
      console.log(`[${new Date().toISOString()}] Cleaned up: ${filepath}`);
    } catch (err) {
      console.error(`Cleanup failed for ${filepath}:`, err.message);
    }
  }
}

function buildDockerCommand(hostPath, containerFilename, language) {
  const runCommand = getRunCommand(language, containerFilename);

  return `docker run --rm \
    --memory="256m" \
    --cpus="0.5" \
    --network=none \
    --read-only \
    --tmpfs /tmp:rw,exec,nosuid,size=65536k \
    -v "${hostPath}:/usercode/${containerFilename}:ro" \
    solace-runner \
    timeout 10 bash -c "${runCommand}"`;
}

function getRunCommand(language, filename) {
  const commands = {
    'javascript': `node /usercode/${filename}`,
    'python': `python3 /usercode/${filename}`,
    'java': `cd /tmp && cp /usercode/${filename} . && javac ${filename} && java ${filename.replace('.java', '')}`,
    'go': `GOCACHE=/tmp/go-cache GOTMPDIR=/tmp go run /usercode/${filename}`,
    'cpp': `g++ /usercode/${filename} -o /tmp/program && /tmp/program`,
    'c': `gcc /usercode/${filename} -o /tmp/program -lm && /tmp/program`,
    'ruby': `ruby /usercode/${filename}`,
    'php': `php /usercode/${filename}`,
    'rust': `rustc /usercode/${filename} -o /tmp/program && /tmp/program`,
  };

  if (!commands[language]) {
    throw new Error(`Language "${language}" is not supported`);
  }

  return commands[language];
}

function getFileExtension(language) {
  const extensions = {
    'javascript': 'js',
    'python': 'py',
    'java': 'java',
    'go': 'go',
    'cpp': 'cpp',
    'c': 'c',
    'ruby': 'rb',
    'php': 'php',
    'rust': 'rs',
  };

  return extensions[language] || 'txt';
}

function runDockerCommand(command) {
  return new Promise((resolve) => {
    exec(command, {
      timeout: 15000,
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {

      if (error && error.killed) {
        console.warn(`[${new Date().toISOString()}] Execution timeout: ${command.substring(0, 100)}...`);
        resolve({
          stdout: stdout || '',
          stderr: 'Execution timeout (10 seconds exceeded)',
          exitCode: 124
        });
        return;
      }

      if (error || stderr) {
        console.log(`[${new Date().toISOString()}] Execution finished with error/stderr.`);
        if (stdout) console.log(`[${new Date().toISOString()}] STDOUT: ${stdout.substring(0, 500)}${stdout.length > 500 ? '...' : ''}`);
        if (stderr) console.error(`[${new Date().toISOString()}] STDERR: ${stderr.substring(0, 500)}${stderr.length > 500 ? '...' : ''}`);
      } else {
        console.log(`[${new Date().toISOString()}] Execution finished successfully.`);
        if (stdout) console.log(`[${new Date().toISOString()}] STDOUT: ${stdout.substring(0, 500)}${stdout.length > 500 ? '...' : ''}`);
      }

      resolve({
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : ''),
        exitCode: error ? (error.code || 1) : 0
      });
    });
  });
}

// =============================================================================
// CODE REVIEW
// =============================================================================

app.post('/api/review', async (req, res) => {
  console.log(`[${new Date().toISOString()}] [Review] Request received`);

  const { reviewIR, codeContext, prunedTree, fileContents } = req.body;

  if (!reviewIR || !fileContents) {
    console.log(`[${new Date().toISOString()}] [Review] Missing required fields`);
    return res.status(400).json({
      error: 'Missing required fields: reviewIR and fileContents'
    });
  }

  if (!GROQ_API_KEY) {
    console.log(`[${new Date().toISOString()}] [Review] GROQ_API_KEY not configured`);
    return res.status(500).json({
      error: 'GROQ_API_KEY not configured',
      message: 'Please set GROQ_API_KEY environment variable'
    });
  }

  console.log(`[${new Date().toISOString()}] Starting code review (${fileContents.length} chars)`);

  try {
    const prompt = buildReviewPrompt({
      reviewIR,
      codeContext,
      prunedTree: prunedTree || pruneTreeForLLM(reviewIR),
      fileContents
    });

    console.log(`[${new Date().toISOString()}] Calling Groq API with qwen-3-32b...`);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.1,
        max_tokens: 2048,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    const reviewText = data.choices[0].message.content;
    const parsedReview = parseReviewResponse(reviewText);

    console.log(`[${new Date().toISOString()}] Review completed. Tokens: ${data.usage?.total_tokens || 'unknown'}`);

    res.json({
      success: true,
      review: parsedReview,
      metadata: {
        model: 'qwen-3-32b',
        tokensUsed: data.usage?.total_tokens || 0,
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({
      error: error.message || 'Review failed',
      details: error.toString()
    });
  }
});

function buildReviewPrompt(input) {
  const analysisContext = extractAnalysisContext(input.reviewIR);
  const { reviewIR } = input;

  const systemPrompt = `STRICT JSON OUTPUT MODE - DATA FILLING ONLY

You must output ONLY a valid JSON object matching this exact schema.
No explanations, no thinking, no extra text.

REQUIRED JSON SCHEMA:
{
"complexity": "string - Describe time and space complexity using Big-O notation. Explicitly distinguish between worst-case and amortized complexity when applicable. Treat all function parameters and container inputs as variable-sized symbolic inputs when computing complexity. Do not assume constant-sized literals. Use full sentences and include both analyses if they differ. NO ordinals, indexes, or section numbers.",
  "purpose": "string - Describe code's clear purpose in about 5 sentences. NO ordinals, indexes, or section numbers.",
  "behavioral": "string - Full sentence analysis of behavioral correctness, race conditions, and edge case handling. . NO ordinals, indexes, or section numbers.",
  "risks": "string - Full sentence description of hidden risks including magic values, silent behaviors, state mutations, or error handling gaps. Use exactly 'No issues found.' if none exist. NO ordinals, indexes, or section numbers.",
  "edgeCases": "string - Full sentence description of edge cases and boundary conditions including input validation, null handling, and concurrency issues. Use exactly 'No issues found.' if none exist. NO ordinals, indexes, or section numbers.",
  "summary": "string - Full sentence overall code quality assessment with critical issues and improvement suggestions. . NO ordinals, indexes, or section numbers."
}

STRICTLY FORBIDDEN:
- Ordinal numbers as content (e.g., "2.", "3.", "item 1", "section 2")
- assuming constant-sized literals
- Empty strings or whitespace-only values
- Placeholder text or generic responses
- Any text outside the JSON object
- Extra keys not in the schema above
- Markdown code blocks or formatting
- Thinking tags or meta-commentary

STRICTLY REQUIRED:
- Use exactly "No issues found." when a category has no findings
- Only output valid JSON matching the schema above
- All content must be semantic and actionable, not structural references
- When describing purpose, behavior, risks, or edge cases, you MUST explicitly reference at least one concrete language construct, API, or symbol present in the code when applicable.
- If the code contains only trivial or standard library usage, you MUST explicitly name that usage (for example: console.log, print, fmt.Println).
- Avoid abstract phrases unless tied to a concrete construct.

Fill the JSON object based on the code analysis below.`;

  const userPrompt = `ANALYSIS CONTEXT (use this data to fill JSON fields):

Determinism: ${analysisContext.determinism.value}
Execution Model: ${analysisContext.executionModel}
State Lifetime: ${analysisContext.stateLifetime}
Side Effects: ${analysisContext.sideEffects.length > 0 ? analysisContext.sideEffects.join(', ') : 'none'}

CODE METRICS:
- Language: ${reviewIR.language}
- Paradigm: ${reviewIR.structure.paradigm}
- Lines: ${reviewIR.structure.linesOfCode}
- Functions: ${reviewIR.structure.functions}
- Classes: ${reviewIR.structure.classes}
- Control Flow Complexity: ${reviewIR.quality.controlFlowComplexity}
- Testability Score: ${reviewIR.quality.testability}/100
- Error Handling: ${reviewIR.quality.errorHandling}
- Mutability: ${reviewIR.state.mutability}%

DETECTED ELEMENTS:
- Decision Rules: ${reviewIR.elements.decisionRules.length}
- Magic Values: ${reviewIR.elements.magicValues.length}
- Silent Behaviors: ${reviewIR.elements.silentBehaviors.length}

CODE:
\`\`\`${reviewIR.language}
${input.fileContents}
\`\`\`

Fill the JSON fields now. Output ONLY the JSON object, nothing else.`;

  return {
    system: systemPrompt,
    user: userPrompt
  };
}

function extractAnalysisContext(reviewIR) {
  const classification = reviewIR.behavior.determinismReasons;

  let valueDeterminism = 'deterministic';
  if (classification.some(r => r.includes('random') || r.includes('time'))) {
    valueDeterminism = 'weakly-deterministic';
  } else if (!reviewIR.behavior.isDeterministic) {
    valueDeterminism = 'value-nondeterministic';
  }

  let outputOrder = 'stable';
  if (classification.some(r => r.includes('race') || r.includes('concurrent') || r.includes('async'))) {
    outputOrder = 'unstable';
  }

  return {
    determinism: {
      value: valueDeterminism,
      outputOrder,
      classification: reviewIR.behavior.isDeterministic ? 'fully-deterministic' : 'nondeterministic',
      confidence: 0.85,
    },
    stateLifetime: reviewIR.state.lifetime,
    executionModel: reviewIR.behavior.executionModel,
    sideEffects: reviewIR.behavior.sideEffects === 'none' ? [] : [reviewIR.behavior.sideEffects],
    externalInteractions: reviewIR.behavior.externalInteractions,
  };
}

function pruneTreeForLLM(reviewIR) {
  const sections = [];

  sections.push('=== CODE STRUCTURE ===');
  sections.push(`Language: ${reviewIR.language}`);
  sections.push(`Type: ${reviewIR.codeType}`);
  sections.push(`Paradigm: ${reviewIR.structure.paradigm}`);
  sections.push(`Functions: ${reviewIR.structure.functions}, Classes: ${reviewIR.structure.classes}`);
  sections.push(`Lines: ${reviewIR.structure.linesOfCode}`);
  sections.push('');

  if (reviewIR.elements.decisionRules.length > 0) {
    sections.push('=== DECISION POINTS ===');
    reviewIR.elements.decisionRules.slice(0, 10).forEach((dr, idx) => {
      sections.push(`${idx + 1}. Line ${dr.location}: ${dr.condition} → ${dr.outcome}`);
    });
    sections.push('');
  }

  if (reviewIR.elements.magicValues.length > 0) {
    sections.push('=== LITERAL VALUES ===');
    reviewIR.elements.magicValues.slice(0, 15).forEach((mv, idx) => {
      sections.push(`${idx + 1}. Line ${mv.location}: ${mv.value} ${mv.role ? `[${mv.role}]` : ''}`);
    });
    sections.push('');
  }

  sections.push('=== BEHAVIORAL PROPERTIES ===');
  sections.push(`Determinism: ${reviewIR.behavior.isDeterministic ? 'Yes' : 'No'}`);
  sections.push(`Execution: ${reviewIR.behavior.executionModel}`);
  sections.push(`Side Effects: ${reviewIR.behavior.sideEffects}`);
  sections.push(`State Lifetime: ${reviewIR.state.lifetime}`);
  sections.push(`Mutability: ${reviewIR.state.mutability}%`);

  return sections.join('\n');
}

function parseReviewResponse(response) {
  try {
    // Strip <think> blocks - common in Qwen/DeepSeek models
    let jsonText = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Remove markdown code blocks
    jsonText = jsonText.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

    // Robust JSON extraction: Find the first { and the last }
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonText);

    const requiredFields = ['complexity', 'purpose', 'behavioral', 'risks', 'edgeCases', 'summary'];
    for (const field of requiredFields) {
      if (!parsed[field] || typeof parsed[field] !== 'string') {
        console.warn(`Missing or invalid field: ${field}`);
        parsed[field] = 'Unable to parse this section.';
      }

      const trimmed = parsed[field].trim();
      if (/^\s*\d+\.?\s*$/.test(trimmed) || /^(item|section|point)\s*\d+/i.test(trimmed)) {
        console.warn(`Field ${field} contains ordinal reference: "${trimmed}"`);
        parsed[field] = 'No issues found.';
      }

      if (trimmed.length < 10 && trimmed !== 'No issues found.') {
        console.warn(`Field ${field} has insufficient content: "${trimmed}"`);
        parsed[field] = 'No issues found.';
      }
    }

    return {
      complexity: parsed.complexity,
      purpose: parsed.purpose,
      behavioral: parsed.behavioral,
      risks: parsed.risks,
      edgeCases: parsed.edgeCases,
      summary: parsed.summary,
      raw: response
    };
  } catch (error) {
    console.error('JSON parsing failed:', error.message);
    console.error('Response was:', response.substring(0, 500));

    return {
      complexity: 'Unable to parse review response. Please try again.',
      purpose: 'Unable to parse review response. Please try again.',
      behavioral: 'Unable to parse review response. Please try again.',
      risks: 'Unable to parse review response. Please try again.',
      edgeCases: 'Unable to parse review response. Please try again.',
      summary: 'Unable to parse review response. Please try again.',
      raw: response
    };
  }
}

// =============================================================================
// CODE TRANSLATION
// =============================================================================

app.post('/api/translate', async (req, res) => {
  console.log(`[${new Date().toISOString()}] [Translation] Request received`);

  const { sourceCode, sourceLanguage, targetLanguage, reviewIR } = req.body;

  if (!sourceCode || !sourceLanguage || !targetLanguage || !reviewIR) {
    console.log(`[${new Date().toISOString()}] [Translation] Missing required fields`);
    return res.status(400).json({
      error: 'Missing required fields: sourceCode, sourceLanguage, targetLanguage, reviewIR'
    });
  }

  if (!GROQ_API_KEY) {
    console.log(`[${new Date().toISOString()}] [Translation] GROQ_API_KEY not configured`);
    return res.status(500).json({
      error: 'GROQ_API_KEY not configured',
      message: 'Please set GROQ_API_KEY environment variable'
    });
  }

  console.log(`[${new Date().toISOString()}] Translating ${sourceLanguage} to ${targetLanguage}`);

  try {
    const prompt = buildTranslationPrompt({
      sourceCode,
      sourceLanguage,
      targetLanguage,
      reviewIR
    });

    console.log(`[${new Date().toISOString()}] Calling Groq API with qwen-3-32b...`);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    let content = data.choices[0].message.content;
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    let translatedCode = content;

    const codeBlockMatch = content.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      translatedCode = codeBlockMatch[1].trim();
    } else {
      console.log('[Translation] No code block found, returning raw trimmed content');
      translatedCode = content.replace(/```/g, '').trim();
    }

    const warnings = extractTranslationWarnings(sourceLanguage, targetLanguage);

    console.log(`[${new Date().toISOString()}] Translation completed. Tokens: ${data.usage?.total_tokens || 'unknown'}`);

    res.json({
      success: true,
      translatedCode,
      warnings,
      metadata: {
        model: 'qwen-3-32b',
        tokensUsed: data.usage?.total_tokens || 0,
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        timestamp: new Date().toISOString(),
        sourceLanguage,
        targetLanguage
      }
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: error.message || 'Translation failed',
      details: error.toString()
    });
  }
});

function buildTranslationPrompt({ sourceCode, sourceLanguage, targetLanguage, reviewIR }) {
  const adapters = {
    typescript: {
      function: 'function name(args): returnType { }',
      if: 'if (condition) { }',
      for: 'for (let i = 0; i < n; i++) { }',
      errorThrow: 'throw new Error(message)',
      errorCatch: 'catch (error: Error)',
      naming: 'camelCase for variables/functions, PascalCase for classes'
    },
    python: {
      function: 'def function_name(args):',
      if: 'if condition:',
      for: 'for item in iterable:',
      errorThrow: 'raise Exception(message)',
      errorCatch: 'except Exception as e',
      naming: 'snake_case for variables/functions, PascalCase for classes'
    },
    java: {
      function: 'public returnType methodName(Type arg) { }',
      if: 'if (condition) { }',
      for: 'for (int i = 0; i < n; i++) { }',
      errorThrow: 'throw new Exception(message)',
      errorCatch: 'catch (Exception e)',
      naming: 'camelCase for variables/methods, PascalCase for classes'
    },
    go: {
      function: 'func functionName(arg Type) ReturnType { }',
      if: 'if condition { }',
      for: 'for i := 0; i < n; i++ { }',
      errorThrow: 'return errors.New(message) or panic(message)',
      errorCatch: 'if err != nil { }',
      naming: 'camelCase for private, PascalCase for exported'
    },
    rust: {
      function: 'fn function_name(arg: Type) -> ReturnType { }',
      if: 'if condition { }',
      for: 'for item in iterable { }',
      errorThrow: 'return Err(error) or panic!(message)',
      errorCatch: 'match result { Ok(v) => ..., Err(e) => ... }',
      naming: 'snake_case for variables/functions, PascalCase for types/traits'
    },
    cpp: {
      function: 'ReturnType functionName(Type arg) { }',
      if: 'if (condition) { }',
      for: 'for (int i = 0; i < n; i++) { }',
      errorThrow: 'throw std::runtime_error(message)',
      errorCatch: 'catch (const std::exception& e)',
      naming: 'camelCase or snake_case for variables/functions, PascalCase for classes'
    },
    c: {
      function: 'ReturnType function_name(Type arg) { }',
      if: 'if (condition) { }',
      for: 'for (int i = 0; i < n; i++) { }',
      errorThrow: 'return error_code; // set errno',
      errorCatch: 'if (ret != 0) { // handle error }',
      naming: 'snake_case for variables/functions/structs'
    },
    ruby: {
      function: 'def function_name(args)',
      if: 'if condition',
      for: 'iterable.each do |item|',
      errorThrow: 'raise StandardError, message',
      errorCatch: 'rescue StandardError => e',
      naming: 'snake_case for variables/methods, PascalCase for classes/modules'
    },
    php: {
      function: 'function functionName($arg)',
      if: 'if ($condition) { }',
      for: 'foreach ($iterable as $item) { }',
      errorThrow: 'throw new Exception($message);',
      errorCatch: 'catch (Exception $e)',
      naming: 'camelCase or snake_case for variables/functions, PascalCase for classes'
    },
    javascript: {
      function: 'function name(args) { }',
      if: 'if (condition) { }',
      for: 'for (let i = 0; i < n; i++) { }',
      errorThrow: 'throw new Error(message)',
      errorCatch: 'catch (error)',
      naming: 'camelCase for variables/functions, PascalCase for classes'
    }
  };

  const targetAdapter = adapters[targetLanguage];
  const patterns = getRelevantPatterns(reviewIR, sourceLanguage, targetLanguage);

  const systemPrompt = `You are a code translator specializing in ${sourceLanguage} to ${targetLanguage} conversion.

CRITICAL CONSTRAINTS (from ReviewIR):
- MUST preserve determinism: ${reviewIR.behavior.isDeterministic ? 'Code is deterministic' : 'Code has non-deterministic elements'}
- MUST maintain execution model: ${reviewIR.behavior.executionModel}
- MUST preserve state lifetime: ${reviewIR.state.lifetime}
- MUST maintain function count: ${reviewIR.structure.functions} functions
- MUST preserve decision points: approximately ${reviewIR.elements.decisionRules.length} decision points

TARGET LANGUAGE SYNTAX (${targetLanguage}):
- Function: ${targetAdapter.function}
- If statement: ${targetAdapter.if}
- For loop: ${targetAdapter.for}
- Throw error: ${targetAdapter.errorThrow}
- Catch error: ${targetAdapter.errorCatch}
- Naming: ${targetAdapter.naming}

${patterns}

OUTPUT REQUIREMENTS:
1. Output ONLY the translated code inside a single markdown code block
2. NO conversational text (e.g., "Here is the code", "I hope this helps")
3. NO explanations outside the code block
4. Preserve all logic and behavior
5. Use idiomatic ${targetLanguage} patterns`;

  const userPrompt = `Translate this ${sourceLanguage} code to ${targetLanguage}:

\`\`\`${sourceLanguage}
${sourceCode}
\`\`\`

Return only the code block.`;

  return { system: systemPrompt, user: userPrompt };
}

function getRelevantPatterns(reviewIR, sourceLanguage, targetLanguage) {
  const patterns = [];

  if (reviewIR.behavior.executionModel.includes('async')) {
    if (targetLanguage === 'python') {
      patterns.push('ASYNC: async/await → Python async/await with asyncio');
    } else if (targetLanguage === 'java') {
      patterns.push('ASYNC: async/await → CompletableFuture or reactive streams');
    } else if (targetLanguage === 'go') {
      patterns.push('ASYNC: async/await → goroutines with channels');
    } else if (targetLanguage === 'rust') {
      patterns.push('ASYNC: async/await → Rust async/await with tokio');
    }
  }

  if (sourceLanguage === 'typescript') {
    if (targetLanguage === 'python') {
      patterns.push('ARRAYS: .map() → list comprehension OR map()');
      patterns.push('ARRAYS: .filter() → list comprehension with if OR filter()');
      patterns.push('NULL: === null → is None');
    } else if (targetLanguage === 'java') {
      patterns.push('ARRAYS: .map() → Stream.map()');
      patterns.push('ARRAYS: .filter() → Stream.filter()');
      patterns.push('NULL: === null → == null');
    } else if (targetLanguage === 'go') {
      patterns.push('ARRAYS: .map() → for loop with append');
      patterns.push('NULL: === null → == nil');
    } else if (targetLanguage === 'rust') {
      patterns.push('ARRAYS: .map() → iter().map()');
      patterns.push('ARRAYS: .filter() → iter().filter()');
      patterns.push('NULL: === null → Option::None or is_none()');
    }
  }

  if (sourceLanguage === 'python') {
    if (targetLanguage === 'typescript') {
      patterns.push('LIST COMP: [x for x in items] → items.map(x => x)');
      patterns.push('NULL: is None → === null');
    } else if (targetLanguage === 'java') {
      patterns.push('LIST COMP: [x for x in items] → stream().map()');
      patterns.push('NULL: is None → == null');
    } else if (targetLanguage === 'go') {
      patterns.push('LIST COMP: [x for x in items] → for loop');
      patterns.push('NULL: is None → == nil');
    } else if (targetLanguage === 'rust') {
      patterns.push('LIST COMP: [x for x in items] → iter().map()');
      patterns.push('NULL: is None → Option::None');
    }
  }

  if (sourceLanguage === 'java') {
    if (targetLanguage === 'typescript') {
      patterns.push('STREAMS: stream().map() → .map()');
      patterns.push('NULL: == null → === null');
    } else if (targetLanguage === 'python') {
      patterns.push('STREAMS: stream().map() → list comprehension');
      patterns.push('NULL: == null → is None');
    } else if (targetLanguage === 'go') {
      patterns.push('STREAMS: stream().map() → for loop');
      patterns.push('NULL: == null → == nil');
    } else if (targetLanguage === 'rust') {
      patterns.push('STREAMS: stream().map() → iter().map()');
      patterns.push('NULL: == null → Option::None');
    }
  }

  if (sourceLanguage === 'go') {
    if (targetLanguage === 'typescript') {
      patterns.push('ERROR: if err != nil → try/catch');
      patterns.push('NULL: == nil → === null');
    } else if (targetLanguage === 'python') {
      patterns.push('ERROR: if err != nil → try/except');
      patterns.push('NULL: == nil → is None');
    } else if (targetLanguage === 'java') {
      patterns.push('ERROR: if err != nil → try/catch');
      patterns.push('NULL: == nil → == null');
    } else if (targetLanguage === 'rust') {
      patterns.push('ERROR: if err != nil → Result<T, E>');
      patterns.push('NULL: == nil → Option::None');
    }
  }

  if (sourceLanguage === 'rust') {
    if (targetLanguage === 'typescript') {
      patterns.push('RESULT: Result<T, E> → try/catch or nullable');
      patterns.push('OPTION: Option<T> → T | null');
    } else if (targetLanguage === 'python') {
      patterns.push('RESULT: Result<T, E> → try/except or Optional');
      patterns.push('OPTION: Option<T> → Optional[T]');
    } else if (targetLanguage === 'java') {
      patterns.push('RESULT: Result<T, E> → try/catch or Optional');
      patterns.push('OPTION: Option<T> → Optional<T>');
    } else if (targetLanguage === 'go') {
      patterns.push('RESULT: Result<T, E> → (value, error)');
      patterns.push('OPTION: Option<T> → pointer or zero value');
    }
  }

  if (sourceLanguage === 'cpp') {
    patterns.push('MEMORY: shared_ptr/unique_ptr → GC or manual memory management');
    patterns.push('CONST: const correctness → may need explicit immutability');
  }

  if (sourceLanguage === 'c') {
    patterns.push('MEMORY: malloc/free → GC or classes');
    patterns.push('STRUCTS: struct → class or object');
  }

  if (sourceLanguage === 'ruby') {
    patterns.push('BLOCKS: do |x| ... end → arrow function or lambda');
    patterns.push('SYMBOLS: :symbol → string or constant');
  }

  if (sourceLanguage === 'php') {
    patterns.push('ARRAYS: Associative arrays → Map or Object');
    patterns.push('VARS: $variable → variable (no prefix)');
  }

  if (sourceLanguage === 'javascript') {
    patterns.push('TYPES: Dynamic typing → Static types (infer generic/any)');
    patterns.push('PROTOTYPES: Prototype chain → Classes');
  }

  return patterns.length > 0 ? `\nPATTERN EQUIVALENTS:\n${patterns.join('\n')}` : '';
}

function extractTranslationWarnings(sourceLanguage, targetLanguage) {
  const warnings = {
    'typescript-python': [
      'TypeScript interfaces have no direct Python equivalent - consider dataclasses',
      'Array methods like .push() differ - use .append() in Python'
    ],
    'python-typescript': [
      'Python list comprehensions need conversion to .map()/.filter()',
      'Python tuple unpacking requires explicit destructuring'
    ],
    'typescript-java': [
      'TypeScript interfaces map to Java interfaces with different semantics',
      'Arrow functions need conversion to lambdas or method references'
    ],
    'java-typescript': [
      'Java checked exceptions need conversion to TypeScript error handling',
      'Java generics have different variance rules than TypeScript'
    ],
    'typescript-go': [
      'TypeScript classes need conversion to Go structs with methods',
      'No exceptions in Go - use error return values'
    ],
    'go-typescript': [
      'Go error handling pattern needs conversion to try/catch',
      'Go interfaces are implicit - TypeScript interfaces are explicit'
    ],
    'typescript-rust': [
      'TypeScript null/undefined map to Rust Option<T>',
      'Memory management differs - Rust uses ownership system'
    ],
    'rust-typescript': [
      'Rust Result<T, E> needs conversion to exceptions or nullable types',
      'Rust lifetime annotations have no TypeScript equivalent'
    ],
    'python-java': [
      'Python duck typing needs explicit Java interfaces',
      'Python dynamic features require Java reflection or design patterns'
    ],
    'java-python': [
      'Java static typing becomes Python type hints',
      'Java access modifiers have no Python enforcement'
    ],
    'python-go': [
      'Python exceptions need conversion to Go error values',
      'Python dynamic typing requires careful Go interface design'
    ],
    'go-python': [
      'Go goroutines map to Python asyncio or threading',
      'Go channels need conversion to Python queues or async patterns'
    ],
    'python-rust': [
      'Python GC vs Rust ownership - memory management differs significantly',
      'Python exceptions map to Rust Result/Option types'
    ],
    'rust-python': [
      'Rust ownership system has no Python equivalent',
      'Rust zero-cost abstractions may not translate to Python performance'
    ],
    'java-go': [
      'Java exceptions need conversion to Go error values',
      'Java inheritance patterns need Go composition'
    ],
    'go-java': [
      'Go interfaces are structural - Java interfaces are nominal',
      'Go defer has no direct Java equivalent'
    ],
    'java-rust': [
      'Java GC vs Rust ownership - fundamentally different memory models',
      'Java null needs conversion to Rust Option<T>'
    ],
    'rust-java': [
      'Rust ownership/borrowing has no Java equivalent',
      'Rust traits map to Java interfaces with different semantics'
    ],
    'go-rust': [
      'Go GC vs Rust ownership - different memory management',
      'Go error values map to Rust Result<T, E>'
    ],
    'rust-go': [
      'Rust ownership system has no Go equivalent',
      'Rust Result/Option need conversion to Go error values and pointers'
    ],
    'cpp-typescript': ['C++ raw pointers/references need conversion', 'RAII pattern has no direct TS equivalent'],
    'typescript-cpp': ['Garbage collection -> Manual memory management', 'Interfaces -> Abstract classes'],
    'c-typescript': ['Manual memory management -> GC', 'Pointers -> References/Values'],
    'typescript-c': ['Objects/Classes -> Structs + Functions', 'Exceptions -> Error codes'],
    'ruby-typescript': ['Dynamic typing -> Static typing', 'Blocks -> Arrow functions'],
    'typescript-ruby': ['Static types lost', 'Interfaces -> Modules/Mixins'],
    'php-typescript': ['Associative arrays -> Maps/Objects', 'PHP traits -> Mixins'],
    'typescript-php': ['Interfaces -> PHP Interfaces', 'generics are limited in PHP'],
    'javascript-typescript': ['Inferring types from JSDoc or usage', 'Missing type safety'],
    'typescript-javascript': ['Type erasure', 'Decorators behavior might differ']
  };

  const key = `${sourceLanguage}-${targetLanguage}`;
  if (warnings[key]) return warnings[key];

  const dynamicWarnings = [];
  const staticLangs = ['typescript', 'java', 'go', 'rust', 'cpp', 'c'];
  const dynamicLangs = ['python', 'ruby', 'php', 'javascript'];
  const manualMemory = ['cpp', 'c', 'rust'];

  if (staticLangs.includes(sourceLanguage) && dynamicLangs.includes(targetLanguage)) {
    dynamicWarnings.push('Type safety guarantees lost in translation');
  } else if (dynamicLangs.includes(sourceLanguage) && staticLangs.includes(targetLanguage)) {
    dynamicWarnings.push('Missing type information must be inferred');
  }

  if (manualMemory.includes(targetLanguage) && !manualMemory.includes(sourceLanguage)) {
    dynamicWarnings.push('Requires manual memory management implementation');
  }

  return dynamicWarnings;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('Solace Backend Server Started');
  console.log(`Port: ${PORT}`);
  console.log(`Groq API: ${GROQ_API_KEY ? 'Configured ✓' : 'NOT CONFIGURED ✗'}`);
  console.log('=================================');
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/execute');
  console.log('  POST /api/review');
  console.log('  POST /api/translate');
  console.log('  POST /api/resources');
  console.log('=================================');
  if (!GROQ_API_KEY) {
    console.warn('⚠️  Warning: Set GROQ_API_KEY environment variable to enable AI features');
  }
});