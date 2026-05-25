'use client';

import { useState, useRef, useCallback } from 'react';

export type SpeechToTextState = 'idle' | 'recording' | 'transcribing';

export function useSpeechToText(options?: {
  language?: string;
  onTranscript?: (text: string) => void;
}) {
  const language = options?.language ?? 'en';
  const onTranscript = options?.onTranscript;

  const [state, setState] = useState<SpeechToTextState>('idle');
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const transcribe = useCallback(async (blob: Blob) => {
    if (blob.size === 0) {
      setError('No audio was recorded.');
      setState('idle');
      return;
    }
    setState('transcribing');
    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `speech.${ext}`, { type: blob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      const res = await fetch('/api/tools/transcribe', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || 'Transcription failed');

      const text: string = (data?.text || '').trim();
      if (text) {
        setError(null);
        onTranscript?.(text);
      } else {
        setError('No speech detected.');
      }
    } catch (err: any) {
      setError(err?.message || 'Transcription failed.');
    } finally {
      setState('idle');
    }
  }, [language, onTranscript]);

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Microphone not supported in this browser.');
      return;
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        stopStream();
        await transcribe(blob);
      };

      recorder.onerror = () => {
        setError('Recording failed.');
        stopStream();
        setState('idle');
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setState('recording');
    } catch (err: any) {
      stopStream();
      setError(err?.message || 'Could not access microphone.');
      setState('idle');
    }
  }, [state, stopStream, transcribe]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    recorderRef.current = null;
    // state transitions to 'transcribing' inside onstop → transcribe()
  }, []);

  const toggle = useCallback(() => {
    if (state === 'idle') void startRecording();
    else if (state === 'recording') stopRecording();
  }, [state, startRecording, stopRecording]);

  return { state, error, startRecording, stopRecording, toggle };
}
