'use client';

import { useState, useCallback } from 'react';

export function useScreenshotCapture() {
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async (): Promise<string | null> => {
    if (!navigator.mediaDevices?.getDisplayMedia) return null;
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      });

      return await new Promise<string | null>((resolve) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.onloadedmetadata = () => {
          video.play();
          // Give the video a frame to render
          setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              stream.getTracks().forEach((t) => t.stop());
              resolve(null);
              return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUri = canvas.toDataURL('image/png');
            stream.getTracks().forEach((t) => t.stop());
            video.srcObject = null;
            resolve(dataUri);
          }, 200);
        };
        video.onerror = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(null);
        };
      });
    } catch {
      // User cancelled or permission denied — not an error
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  return { capture, capturing };
}
