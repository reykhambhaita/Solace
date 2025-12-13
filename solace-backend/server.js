const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Solace backend is running',
    timestamp: new Date().toISOString()
  });
});

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
    // extract class name from code for java execution
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
    console.log(`Code written to: ${filepath}`);

    const dockerCommand = buildDockerCommand(filepath, filename, language);
    console.log(`Executing: ${dockerCommand}`);

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
      console.log(`Cleaned up: ${filepath}`);
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
    'c': `gcc /usercode/${filename} -o /tmp/program && /tmp/program`,
    'ruby': `ruby /usercode/${filename}`,
    'php': `php /usercode/${filename}`,
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
        resolve({
          stdout: stdout || '',
          stderr: 'Execution timeout (10 seconds exceeded)',
          exitCode: 124
        });
        return;
      }

      resolve({
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : ''),
        exitCode: error ? (error.code || 1) : 0
      });
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('Solace Backend Server Started');
  console.log(`Port: ${PORT}`);
});