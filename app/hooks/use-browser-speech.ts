'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ||
    null
  );
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

export const resolveSpeechLocale = (language?: string) => {
  switch ((language || 'en').toLowerCase()) {
    case 'nl':
      return 'nl-NL';
    case 'de':
      return 'de-DE';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'pt':
      return 'pt-PT';
    case 'pl':
      return 'pl-PL';
    case 'ru':
      return 'ru-RU';
    case 'ar':
      return 'ar-SA';
    case 'ur':
      return 'ur-PK';
    case 'bn':
      return 'bn-BD';
    case 'hi':
      return 'hi-IN';
    case 'zh':
      return 'zh-CN';
    default:
      return 'en-US';
  }
};

type UseBrowserSpeechOptions = {
  language?: string;
  suppressNoSpeechError?: boolean;
  onFinalText?: (text: string) => void;
  onInterimText?: (text: string) => void;
  onError?: (code: string) => void;
};

export function useBrowserSpeech({
  language = 'en',
  suppressNoSpeechError = true,
  onFinalText,
  onInterimText,
  onError,
}: UseBrowserSpeechOptions) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const interimRef = useRef('');

  const [isListening, setIsListening] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSupported = useMemo(() => Boolean(getSpeechRecognitionConstructor()), []);

  const cleanupRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    try { recognition.onresult = null; } catch {}
    try { recognition.onerror = null; } catch {}
    try { recognition.onend = null; } catch {}
    try { recognition.stop(); } catch {}
    try { recognition.abort(); } catch {}
  }, []);

  const stop = useCallback(() => {
    const pending = normalizeText(interimRef.current);
    if (pending) onFinalText?.(pending);
    interimRef.current = '';
    keepListeningRef.current = false;
    setIsListening(false);
    onInterimText?.('');
    cleanupRecognition();
  }, [cleanupRecognition, onFinalText, onInterimText]);

  const start = useCallback(() => {
    if (isListening) return true;
    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) {
      const code = 'not-supported';
      setLastError(code);
      onError?.(code);
      return false;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = resolveSpeechLocale(language);

    keepListeningRef.current = true;
    setLastError(null);
    setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = normalizeText(result?.[0]?.transcript || '');
        if (!text) continue;

        if (result?.isFinal) {
          onFinalText?.(text);
          interimRef.current = '';
        } else {
          interim = text;
        }
      }
      interimRef.current = interim;
      onInterimText?.(interim);
    };

    recognition.onerror = (event: any) => {
      const code = event?.error || 'unknown';
      if (code === 'no-speech' && suppressNoSpeechError) return;
      setLastError(code);
      onError?.(code);
    };

    recognition.onend = () => {
      if (!keepListeningRef.current) {
        setIsListening(false);
        onInterimText?.('');
        return;
      }

      const pending = normalizeText(interimRef.current);
      if (pending) {
        onFinalText?.(pending);
        interimRef.current = '';
        onInterimText?.('');
      }

      try {
        recognition.start();
      } catch {
        keepListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      setLastError('start-failed');
      onError?.('start-failed');
      keepListeningRef.current = false;
      setIsListening(false);
      cleanupRecognition();
      return false;
    }
  }, [cleanupRecognition, isListening, language, onError, onFinalText, onInterimText, suppressNoSpeechError]);

  return {
    isSupported,
    isListening,
    lastError,
    start,
    stop,
  };
}
