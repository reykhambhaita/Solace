// lib/translation/cross-language-map.ts

import { CrossLanguageMapping } from './types';

export const CrossLanguageMap: CrossLanguageMapping = {
  patterns: {
    'array-transformation': {
      from: 'any',
      to: {
        typescript: '.map()',
        python: 'list comprehension OR map()',
        go: 'for loop with append',
        rust: '.iter().map().collect()',
        java: 'stream().map().collect()',
        cpp: 'std::transform',
        c: 'for loop',
        ruby: '.map',
        php: 'array_map',
        javascript: '.map()',
      },
      restructureNeeded: false,
      notes: 'Python prefers list comprehensions, Go uses explicit loops',
    },
    'array-filtering': {
      from: 'any',
      to: {
        typescript: '.filter()',
        python: 'list comprehension with if OR filter()',
        go: 'for loop with conditional append',
        rust: '.iter().filter().collect()',
        java: 'stream().filter().collect()',
      },
      restructureNeeded: false,
      notes: 'Python: [x for x in items if condition]',
    },
    'error-handling': {
      from: 'any',
      to: {
        typescript: 'try-catch with Error',
        python: 'try-except with Exception',
        go: 'if err != nil { return err }',
        rust: 'Result<T, E> with match or ?',
        java: 'try-catch with Exception',
      },
      restructureNeeded: true,
      notes: 'Go and Rust use explicit error types, not exceptions',
    },
    'async-await': {
      from: 'any',
      to: {
        typescript: 'async/await with Promise',
        python: 'async/await with asyncio',
        go: 'goroutines with channels',
        rust: 'async fn with .await',
        java: 'CompletableFuture or async libraries',
      },
      restructureNeeded: true,
      notes: 'Go uses different concurrency model (goroutines)',
    },
    'null-checking': {
      from: 'any',
      to: {
        typescript: 'value === null || value === undefined',
        python: 'value is None',
        go: 'value == nil',
        rust: 'if let Some(v) = value OR match',
        java: 'value == null',
      },
      restructureNeeded: false,
      notes: 'Rust uses Option<T> instead of null',
    },
    'for-loop-index': {
      from: 'any',
      to: {
        typescript: 'for (let i = 0; i < arr.length; i++)',
        python: 'for i in range(len(arr))',
        go: 'for i := 0; i < len(arr); i++',
        rust: 'for i in 0..arr.len()',
        java: 'for (int i = 0; i < arr.length; i++)',
      },
      restructureNeeded: true,
      notes: 'Rust prefers iterator methods',
    },
    'for-each-loop': {
      from: 'any',
      to: {
        typescript: 'for (const item of array)',
        python: 'for item in list',
        go: 'for _, item := range slice',
        rust: 'for item in &vec',
        java: 'for (Type item : array)',
      },
      restructureNeeded: false,
      notes: 'Rust requires reference for iteration to avoid move',
    },
    'object-iteration': {
      from: 'any',
      to: {
        typescript: 'for (const key in obj)',
        python: 'for key in dict',
        go: 'for key := range map',
        rust: 'for (key, value) in &hashmap',
        java: 'for (Map.Entry<K, V> entry : map.entrySet())',
      },
      restructureNeeded: false,
      notes: 'Go iterates keys, Rust requires reference',
    },
    'string-interpolation': {
      from: 'any',
      to: {
        typescript: '`template ${variable}`',
        python: 'f"template {variable}"',
        go: 'fmt.Sprintf("template %v", variable)',
        rust: 'format!("template {}", variable)',
        java: 'String.format("template %s", variable)',
      },
      restructureNeeded: false,
      notes: 'Python f-strings (3.6+), Rust uses macros',
    },
    'array-length': {
      from: 'any',
      to: {
        typescript: 'array.length',
        python: 'len(array)',
        go: 'len(slice)',
        rust: 'vec.len()',
        java: 'array.length',
      },
      restructureNeeded: false,
      notes: 'Python uses function, others use property/method',
    },
    'string-concatenation': {
      from: 'any',
      to: {
        typescript: 'str1 + str2',
        python: 'str1 + str2',
        go: 'str1 + str2 OR strings.Join',
        rust: 'format!("{}{}", str1, str2) OR String::from(str1) + str2',
        java: 'str1 + str2 OR StringBuilder',
      },
      restructureNeeded: false,
      notes: 'Rust ownership complicates concatenation',
    },
  },

  translationWarnings: [
    // TypeScript → Python
    {
      from: 'typescript',
      to: 'python',
      warning: 'TypeScript interfaces have no direct Python equivalent',
      suggestion: 'Use dataclasses or TypedDict for type hints',
    },
    {
      from: 'typescript',
      to: 'python',
      warning: 'TypeScript Promise.all() requires asyncio.gather() in Python',
      suggestion: 'Use asyncio.gather(*tasks) for concurrent async operations',
    },
    {
      from: 'typescript',
      to: 'python',
      warning: 'Array methods like .push() differ from Python list methods',
      suggestion: 'Use .append() for push, .pop() for pop, etc.',
    },

    // Python → TypeScript
    {
      from: 'python',
      to: 'typescript',
      warning: 'Python list comprehensions need conversion to .map()/.filter()',
      suggestion: 'Convert [x for x in items] to items.map(x => x)',
    },
    {
      from: 'python',
      to: 'typescript',
      warning: 'Python tuple unpacking requires explicit destructuring',
      suggestion: 'Convert a, b = values to [a, b] = values',
    },
    {
      from: 'python',
      to: 'typescript',
      warning: 'Python None is not the same as undefined',
      suggestion: 'Use null for None, handle undefined separately',
    },

    // TypeScript → Go
    {
      from: 'typescript',
      to: 'go',
      warning: 'Go does not have classes - use structs and methods',
      suggestion: 'Convert classes to structs with attached methods',
    },
    {
      from: 'typescript',
      to: 'go',
      warning: 'Go uses explicit error returns instead of exceptions',
      suggestion: 'Return (value, error) and check if err != nil',
    },
    {
      from: 'typescript',
      to: 'go',
      warning: 'Go does not have array methods like map/filter',
      suggestion: 'Use explicit for loops for transformations',
    },

    // TypeScript → Rust
    {
      from: 'typescript',
      to: 'rust',
      warning: 'Rust ownership system requires careful handling of values',
      suggestion: 'Use references (&) for borrowing, clone() when needed',
    },
    {
      from: 'typescript',
      to: 'rust',
      warning: 'Rust has no null - use Option<T> instead',
      suggestion: 'Wrap nullable values in Option<T> and use match/if let',
    },
    {
      from: 'typescript',
      to: 'rust',
      warning: 'Rust strings are more complex (String vs &str)',
      suggestion: 'Use String for owned, &str for borrowed',
    },

    // Go → TypeScript
    {
      from: 'go',
      to: 'typescript',
      warning: 'Go error handling pattern needs conversion to try-catch',
      suggestion: 'Convert if err != nil to try-catch blocks',
    },
    {
      from: 'go',
      to: 'typescript',
      warning: 'Goroutines need conversion to Promises/async-await',
      suggestion: 'Use async functions and Promise.all for concurrency',
    },

    // Rust → TypeScript
    {
      from: 'rust',
      to: 'typescript',
      warning: 'Rust Result<T, E> needs conversion to try-catch',
      suggestion: 'Convert match result to try-catch or optional chaining',
    },
    {
      from: 'rust',
      to: 'typescript',
      warning: 'Rust ownership concepts have no TypeScript equivalent',
      suggestion: 'Focus on logic, TypeScript uses garbage collection',
    },

    // Java → TypeScript
    {
      from: 'java',
      to: 'typescript',
      warning: 'Java classes are more heavyweight than TypeScript',
      suggestion: 'Consider using TypeScript interfaces or simpler objects',
    },
    {
      from: 'java',
      to: 'typescript',
      warning: 'Java streams need conversion to array methods',
      suggestion: 'Convert stream().map().collect() to .map()',
    },
  ],

  libraryEquivalents: {
    'http-client': {
      typescript: 'fetch / axios',
      python: 'requests / httpx',
      go: 'net/http',
      rust: 'reqwest / hyper',
      java: 'HttpClient / OkHttp',
    },
    'testing': {
      typescript: 'jest / vitest',
      python: 'pytest / unittest',
      go: 'testing package',
      rust: 'built-in test framework',
      java: 'JUnit / TestNG',
    },
    'date-handling': {
      typescript: 'Date / dayjs',
      python: 'datetime / dateutil',
      go: 'time package',
      rust: 'chrono',
      java: 'java.time / LocalDateTime',
    },
    'json': {
      typescript: 'JSON.parse / JSON.stringify',
      python: 'json.loads / json.dumps',
      go: 'encoding/json',
      rust: 'serde_json',
      java: 'Jackson / Gson',
    },
    'logging': {
      typescript: 'console / winston',
      python: 'logging',
      go: 'log / logrus',
      rust: 'log / env_logger',
      java: 'SLF4J / Log4j',
    },
    'async': {
      typescript: 'async/await',
      python: 'asyncio',
      go: 'goroutines + channels',
      rust: 'tokio / async-std',
      java: 'CompletableFuture',
    },
  },
};