import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useEffect, useRef, useState } from 'react';

interface TerminalLine {
  type: 'output' | 'error' | 'input';
  content: string;
  timestamp: number;
}

interface TerminalProps {
  output: string;
  error: string;
  isRunning: boolean;
  onInput?: (input: string) => void;
  sessionId?: string;
}

export function Terminal({ output, error, isRunning, onInput, sessionId }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [lastOutput, setLastOutput] = useState('');
  const [lastError, setLastError] = useState('');

  useEffect(() => {
    if (output === '' && error === '') {
      setLines([]);
      setLastOutput('');
      setLastError('');
    }
  }, [output, error]);

  useEffect(() => {
    if (output && output !== lastOutput) {
      const newContent = output.slice(lastOutput.length);
      if (newContent) {
        const newLines = newContent.split('\n').filter(line => line).map(line => ({
          type: 'output' as const,
          content: line,
          timestamp: Date.now(),
        }));
        setLines(prev => [...prev, ...newLines]);
        setLastOutput(output);
      }
    }
  }, [output, lastOutput]);

  useEffect(() => {
    if (error && error !== lastError) {
      const newContent = error.slice(lastError.length);
      if (newContent) {
        const newLines = newContent.split('\n').filter(line => line).map(line => ({
          type: 'error' as const,
          content: line,
          timestamp: Date.now(),
        }));
        setLines(prev => [...prev, ...newLines]);
        setLastError(error);
      }
    }
  }, [error, lastError]);



  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !onInput) return;

    setLines(prev => [...prev, {
      type: 'input',
      content: `$ ${inputValue}`,
      timestamp: Date.now(),
    }]);

    setHistory(prev => [...prev, inputValue]);
    setHistoryIndex(-1);
    onInput(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInputValue('');
        } else {
          setHistoryIndex(newIndex);
          setInputValue(history[newIndex]);
        }
      }
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">Terminal</span>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-2 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Running
            </span>
          )}
          <button
            onClick={clearTerminal}
            className="text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1 hover:bg-zinc-800 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-1">
          {lines.length === 0 && (
            <div className="text-zinc-500 text-xs">
              Waiting for output...
            </div>
          )}
          {lines.map((line, index) => (
            <div
              key={`${line.timestamp}-${index}`}
              className={`${line.type === 'error'
                ? 'text-red-400'
                : line.type === 'input'
                  ? 'text-blue-400'
                  : 'text-zinc-300'
                }`}
            >
              {line.content}
            </div>
          ))}
        </div>
      </ScrollArea>

      {onInput && (
        <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-2">
          <div className="flex items-center gap-2 bg-zinc-900 rounded px-3 py-2">
            <span className="text-zinc-500">$</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type command and press Enter..."
              className="flex-1 bg-transparent outline-none text-zinc-100 placeholder-zinc-600"
              autoFocus

            />
          </div>
        </form>
      )}
    </div>
  );
}