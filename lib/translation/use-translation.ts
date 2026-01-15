// lib/translation/use-translation.ts

import { useCallback, useState } from 'react';
import type { ReviewIR } from '../analyzer/context-detector';
import type { SupportedLanguage } from '../analyzer/language-detector';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface TranslationRequest {
  sourceCode: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  reviewIR: ReviewIR;
}

interface TranslationResult {
  translatedCode: string;
  warnings: string[];
  metadata: {
    model: string;
    tokensUsed: number;
    promptTokens: number;
    completionTokens: number;
    timestamp: string;
    sourceLanguage: string;
    targetLanguage: string;
  };
}

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (request: TranslationRequest) => {
    if (!request.sourceCode.trim()) {
      setError('No code to translate');
      return;
    }

    if (!request.reviewIR) {
      setError('ReviewIR is required for translation');
      return;
    }

    setIsTranslating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCode: request.sourceCode,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          reviewIR: request.reviewIR,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.translatedCode) {
        setResult({
          translatedCode: data.translatedCode,
          warnings: data.warnings || [],
          metadata: data.metadata,
        });
        setError(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message.includes('Failed to fetch')
            ? `Connection Error: Cannot connect to backend server.\n\nMake sure the backend is running:\n  cd solace-backend\n  npm start\n\nBackend URL: ${BACKEND_URL}`
            : err.message
          : String(err);

      setError(errorMessage);
      setResult(null);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsTranslating(false);
  }, []);

  return {
    translate,
    isTranslating,
    result,
    error,
    reset,
  };
}