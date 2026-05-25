'use client';

import { useState, useRef, useCallback } from 'react';

export type SpeechToTextState = 'idle' | 'recording' | 'transcribing';

// ---------------------------------------------------------------------------
// Internal logger — prefixes every line with [STT] and a timestamp so logs
// are easy to filter in DevTools (filter by "[STT]").
// ---------------------------------------------------------------------------
function log(event: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  if (data && Object.keys(data).length > 0) {
    console.log(`[STT] ${ts} | ${event}`, data);
  } else {
    console.log(`[STT] ${ts} | ${event}`);
  }
}

function logWarn(event: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.warn(`[STT] ${ts} | ⚠ ${event}`, data ?? {});
}

function logError(event: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.error(`[STT] ${ts} | ✖ ${event}`, data ?? {});
}

// ---------------------------------------------------------------------------

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
  const sessionIdRef = useRef<string>('');
  const recordingStartedAtRef = useRef<number | null>(null);
  const chunkCountRef = useRef(0);
  const totalChunkBytesRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Stop + release the media stream
  // ---------------------------------------------------------------------------
  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const tracks = stream.getTracks();
    log('stream_stop', {
      sessionId: sessionIdRef.current,
      trackCount: tracks.length,
      trackLabels: tracks.map((t) => t.label || 'unknown'),
    });
    tracks.forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Send audio blob to /api/tools/transcribe
  // ---------------------------------------------------------------------------
  const transcribe = useCallback(async (blob: Blob) => {
    const sessionId = sessionIdRef.current;

    if (blob.size === 0) {
      logWarn('transcribe_skipped_empty_blob', { sessionId });
      setError('No audio was recorded.');
      setState('idle');
      return;
    }

    setState('transcribing');
    const startedAt = Date.now();

    log('transcribe_start', {
      sessionId,
      blobType: blob.type,
      blobSizeBytes: blob.size,
      blobSizeKb: +(blob.size / 1024).toFixed(1),
      language,
      chunkCount: chunkCountRef.current,
      totalChunkBytes: totalChunkBytesRef.current,
      recordingDurationMs: recordingStartedAtRef.current
        ? startedAt - recordingStartedAtRef.current
        : null,
    });

    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `speech.${ext}`, { type: blob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      log('transcribe_fetch_sending', {
        sessionId,
        fileName: file.name,
        fileSize: file.size,
        endpoint: '/api/tools/transcribe',
      });

      const res = await fetch('/api/tools/transcribe', { method: 'POST', body: formData });

      log('transcribe_fetch_response', {
        sessionId,
        status: res.status,
        ok: res.ok,
        durationMs: Date.now() - startedAt,
      });

      const data = await res.json().catch(() => {
        logWarn('transcribe_json_parse_failed', { sessionId });
        return {};
      });

      log('transcribe_payload_received', {
        sessionId,
        payloadKeys: Object.keys(data || {}),
        textLength: typeof data?.text === 'string' ? data.text.length : 0,
        textPreview: typeof data?.text === 'string' ? data.text.slice(0, 120) : null,
        serverError: data?.error ?? null,
        totalDurationMs: Date.now() - startedAt,
      });

      if (!res.ok) {
        throw new Error(data?.error || `Transcription failed (HTTP ${res.status})`);
      }

      const text: string = (data?.text || '').trim();

      if (text) {
        log('transcribe_success', {
          sessionId,
          transcribedLength: text.length,
          transcribedPreview: text.slice(0, 120),
          totalDurationMs: Date.now() - startedAt,
        });
        setError(null);
        onTranscript?.(text);
      } else {
        logWarn('transcribe_no_speech_in_response', {
          sessionId,
          totalDurationMs: Date.now() - startedAt,
        });
        setError('No speech detected.');
      }
    } catch (err: any) {
      logError('transcribe_error', {
        sessionId,
        message: err?.message ?? String(err),
        totalDurationMs: Date.now() - startedAt,
      });
      setError(err?.message || 'Transcription failed.');
    } finally {
      log('transcribe_done', {
        sessionId,
        totalDurationMs: Date.now() - startedAt,
      });
      setState('idle');
    }
  }, [language, onTranscript]);

  // ---------------------------------------------------------------------------
  // Start recording
  // ---------------------------------------------------------------------------
  const startRecording = useCallback(async () => {
    if (state !== 'idle') {
      logWarn('start_recording_skipped_not_idle', { currentState: state });
      return;
    }

    // Browser support check
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      logError('start_recording_no_browser_env');
      setError('Microphone unavailable in this environment.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      logError('start_recording_no_get_user_media');
      setError('Microphone not supported in this browser.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      logError('start_recording_no_media_recorder');
      setError('MediaRecorder not supported in this browser.');
      return;
    }

    // New session
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    chunkCountRef.current = 0;
    totalChunkBytesRef.current = 0;
    recordingStartedAtRef.current = null;
    setError(null);

    log('start_recording_begin', {
      sessionId: sessionIdRef.current,
      language,
      userAgent: navigator.userAgent,
    });

    // Codec preference
    const preferOpus = MediaRecorder.isTypeSupported('audio/webm;codecs=opus');
    const preferWebm = MediaRecorder.isTypeSupported('audio/webm');
    const mime = preferOpus ? 'audio/webm;codecs=opus' : preferWebm ? 'audio/webm' : '';

    log('start_recording_codec_check', {
      sessionId: sessionIdRef.current,
      supportsOpus: preferOpus,
      supportsWebm: preferWebm,
      selectedMime: mime || '(browser default)',
    });

    try {
      log('start_recording_requesting_microphone', { sessionId: sessionIdRef.current });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const audioTracks = stream.getAudioTracks();
      log('start_recording_microphone_granted', {
        sessionId: sessionIdRef.current,
        audioTrackCount: audioTracks.length,
        trackLabels: audioTracks.map((t) => t.label || 'unknown'),
        trackSettings: audioTracks.map((t) => t.getSettings()),
      });

      // Track lifecycle events
      for (const track of audioTracks) {
        track.onended = () =>
          log('audio_track_ended', {
            sessionId: sessionIdRef.current,
            label: track.label,
            readyState: track.readyState,
          });
        track.onmute = () =>
          log('audio_track_muted', {
            sessionId: sessionIdRef.current,
            label: track.label,
          });
        track.onunmute = () =>
          log('audio_track_unmuted', {
            sessionId: sessionIdRef.current,
            label: track.label,
          });
      }

      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      log('media_recorder_created', {
        sessionId: sessionIdRef.current,
        recorderMimeType: recorder.mimeType,
        recorderState: recorder.state,
      });

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data?.size) {
          chunksRef.current.push(e.data);
          chunkCountRef.current += 1;
          totalChunkBytesRef.current += e.data.size;
          log('chunk_received', {
            sessionId: sessionIdRef.current,
            chunkIndex: chunkCountRef.current,
            chunkSizeBytes: e.data.size,
            totalBytes: totalChunkBytesRef.current,
            recorderState: recorder.state,
          });
        } else {
          logWarn('chunk_empty_or_missing', {
            sessionId: sessionIdRef.current,
            dataSize: e.data?.size ?? null,
          });
        }
      };

      recorder.onstop = async () => {
        const stoppedAt = Date.now();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];

        log('recorder_stopped', {
          sessionId: sessionIdRef.current,
          finalBlobType: blob.type,
          finalBlobSizeBytes: blob.size,
          finalBlobSizeKb: +(blob.size / 1024).toFixed(1),
          totalChunks: chunkCountRef.current,
          totalChunkBytes: totalChunkBytesRef.current,
          recordingDurationMs: recordingStartedAtRef.current
            ? stoppedAt - recordingStartedAtRef.current
            : null,
        });

        stopStream();
        await transcribe(blob);
      };

      recorder.onerror = (e) => {
        logError('recorder_error', {
          sessionId: sessionIdRef.current,
          eventType: e.type,
          recorderState: recorder.state,
        });
        setError('Recording failed.');
        stopStream();
        setState('idle');
      };

      recorder.onstart = () => {
        recordingStartedAtRef.current = Date.now();
        log('recorder_started', {
          sessionId: sessionIdRef.current,
          recorderMimeType: recorder.mimeType,
          timesliceMs: 250,
        });
      };

      recorder.onpause = () =>
        log('recorder_paused', { sessionId: sessionIdRef.current });

      recorder.onresume = () =>
        log('recorder_resumed', { sessionId: sessionIdRef.current });

      recorderRef.current = recorder;
      recorder.start(250); // 250 ms timeslices
      setState('recording');

      log('start_recording_success', {
        sessionId: sessionIdRef.current,
        recorderState: recorder.state,
      });
    } catch (err: any) {
      logError('start_recording_failed', {
        sessionId: sessionIdRef.current,
        message: err?.message ?? String(err),
        name: err?.name ?? null,
      });
      stopStream();
      setError(err?.message || 'Could not access microphone.');
      setState('idle');
    }
  }, [state, language, stopStream, transcribe]);

  // ---------------------------------------------------------------------------
  // Stop recording (triggers onstop → transcribe)
  // ---------------------------------------------------------------------------
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    log('stop_recording_called', {
      sessionId: sessionIdRef.current,
      recorderState: recorder?.state ?? 'no_recorder',
      chunksSoFar: chunkCountRef.current,
      bytesSoFar: totalChunkBytesRef.current,
      recordingDurationMs: recordingStartedAtRef.current
        ? Date.now() - recordingStartedAtRef.current
        : null,
    });

    if (!recorder) {
      logWarn('stop_recording_no_recorder', { sessionId: sessionIdRef.current });
      return;
    }
    if (recorder.state === 'inactive') {
      logWarn('stop_recording_already_inactive', { sessionId: sessionIdRef.current });
      return;
    }

    recorder.stop();
    recorderRef.current = null;
    log('stop_recording_recorder_stop_called', { sessionId: sessionIdRef.current });
    // State transitions inside onstop → transcribe()
  }, []);

  // ---------------------------------------------------------------------------
  // Toggle (start if idle, stop if recording; ignore if transcribing)
  // ---------------------------------------------------------------------------
  const toggle = useCallback(() => {
    log('toggle_called', {
      sessionId: sessionIdRef.current,
      currentState: state,
    });
    if (state === 'idle') void startRecording();
    else if (state === 'recording') stopRecording();
    else logWarn('toggle_ignored_transcribing', { sessionId: sessionIdRef.current });
  }, [state, startRecording, stopRecording]);

  return { state, error, startRecording, stopRecording, toggle };
}
