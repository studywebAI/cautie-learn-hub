# Microphone & Audio Setup Verification

## ✅ Current Implementation Status

### Text-to-Speech (TTS)
**Endpoint:** `/api/tools/tts/route.ts`  
**Provider:** Groq API (OpenAI-compatible)  
**API URL:** `https://api.groq.com/openai/v1/audio/speech`

#### Configuration
```
Environment Variables:
- GROQ_API_KEY        (required) - Groq authentication token
- GROQ_TTS_MODEL      (optional) - Model name, defaults to "playai-tts"
```

#### Features
- ✅ Multiple voice options: alloy, echo, fable, onyx, nova, shimmer
- ✅ Format support: MP3, WAV
- ✅ Speed control: 0.5x to 2.0x
- ✅ Max text length: 6000 characters
- ✅ Error handling with proper HTTP status codes

#### Example Request
```bash
curl -X POST http://localhost:3000/api/tools/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test",
    "voice": "alloy",
    "format": "mp3",
    "speed": 1.0
  }'
```

#### Response
- Success (200): Binary MP3/WAV audio data
- Error (400): Missing text
- Error (413): Text too long
- Error (500): Missing GROQ_API_KEY

---

### Speech-to-Text (SST / Transcription)
**Endpoint:** `/api/tools/transcribe/route.ts`  
**Primary Provider:** Groq API (OpenAI-compatible)  
**Fallback Provider:** OpenAI API  
**API URL (Groq):** `https://api.groq.com/openai/v1/audio/transcriptions`

#### Configuration
```
Environment Variables (Primary - Groq):
- GROQ_API_KEY        (required) - Groq authentication token

Environment Variables (Fallback - OpenAI):
- OPENAI_STT_API_KEY  (optional) - OpenAI API key for transcription
- OPENAI_API_KEY      (optional) - OpenAI API key (general fallback)

User Settings (Per-user strategy):
- sttProviderStrategy - Options: 'groq_with_openai_fallback' (default), 'groq_only', 'openai_only'
```

#### Features
- ✅ Language support: Automatic detection or specified language code
- ✅ File formats: MP3, WAV, M4A, FLAC, OGG, OPUS, AAC, WEBM
- ✅ Video formats: MP4, MPEG, MOV, WebM
- ✅ Max file size: 25 MB
- ✅ Automatic fallback to OpenAI if Groq fails
- ✅ Request tracking & debug logging (via `/api/tools/mic-debug/route.ts`)

#### Example Request (Form Data)
```bash
curl -X POST http://localhost:3000/api/tools/transcribe \
  -F "file=@audio.mp3" \
  -F "language=en" \
  -F "micSessionId=SESSION_123" \
  -F "clientTs=$(date +%s%3N)"
```

#### Response
- Success (200): `{ "text": "transcribed content" }`
- Error (400): Missing file
- Error (400): Invalid file type
- Error (413): File too large
- Error (500): Transcription service unavailable

#### Fallback Logic
1. Try Groq transcription first (faster, better for short audio)
2. If Groq fails, try OpenAI fallback (if key available)
3. Return error if both fail
4. User can configure preference via `sttProviderStrategy` setting

---

### Microphone Debug Endpoint
**Endpoint:** `/api/tools/mic-debug/route.ts`

#### Purpose
- Logs client-side microphone events
- Helps diagnose recording, permission, and transcription issues
- Tracks request IDs, timestamps, session info

#### Client Events Logged
```
- recording_started
- recording_paused
- recording_resumed
- recording_stopped
- recording_canceled
- transcribe_request_sent
- transcribe_response_received
- transcribe_error
- playback_started
- playback_ended
```

#### Response
- Always returns: `{ "ok": true }` (200)
- Logs all events to server console with timestamp

---

## 🔧 Setup & Verification Steps

### 1. Get API Keys
**For Groq (Primary - Recommended):**
- Visit: https://console.groq.com
- Create account (free tier available)
- Generate API key
- Add to `.env.local`:
  ```
  GROQ_API_KEY=your_groq_key_here
  ```

**For OpenAI (Optional Fallback):**
- Visit: https://platform.openai.com/api-keys
- Create API key
- Add to `.env.local`:
  ```
  OPENAI_STT_API_KEY=your_openai_key_here
  ```

### 2. Verify Configuration
```bash
# Check if keys are loaded
npm run dev

# In browser console:
# If endpoints work, you'll see successful responses
```

### 3. Test TTS
```bash
# Terminal/Postman:
curl -X POST http://localhost:3000/api/tools/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Test audio", "voice":"alloy"}'

# Expected: Binary MP3 data returned
```

### 4. Test SST (Transcription)
```bash
# Terminal (requires audio file):
curl -X POST http://localhost:3000/api/tools/transcribe \
  -F "file=@test_audio.mp3" \
  -F "language=en"

# Expected: { "text": "transcribed content" }
```

### 5. Verify Microphone Permission
- Browser will request microphone access on first use
- User must grant permission
- Check `navigator.mediaDevices.enumerateDevices()` in browser console

---

## 🎙️ Client-Side Microphone Integration

### Required Browser APIs
- `MediaRecorder` API (for recording)
- `MediaStream` API (for microphone access)
- `AudioContext` API (optional, for audio processing)

### Browser Support
- ✅ Chrome/Edge 47+
- ✅ Firefox 29+
- ✅ Safari 14.1+
- ✅ Android Chrome
- ⚠️ iOS Safari (limited recording support)

### Permission Handling
```javascript
// Request microphone permission
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    // User granted permission
    // Can now record audio
  })
  .catch(err => {
    console.error('Microphone access denied:', err);
  });
```

---

## 🐛 Troubleshooting

### Issue: "GROQ_API_KEY is not configured"
**Solution:**
1. Verify `.env.local` has `GROQ_API_KEY=xxx`
2. Restart development server (`npm run dev`)
3. Check console for environment variable loading

### Issue: Transcription returns garbage/wrong language
**Solution:**
1. Specify language code explicitly: `?language=en` (or `nl`, `fr`, etc.)
2. Ensure audio quality is good (no heavy background noise)
3. Try with OpenAI fallback: check if `OPENAI_STT_API_KEY` is set

### Issue: TTS plays but audio is slow/distorted
**Solution:**
1. Lower speech speed: use `speed: 0.8` instead of default 1.0
2. Try different voice: some voices have better quality
3. Check file format: MP3 often better than WAV for small file sizes

### Issue: Microphone blocked by browser
**Solution:**
1. Check browser permissions settings
2. Grant microphone access to domain
3. Use HTTPS (some browsers require it)
4. Check browser console for specific error messages

---

## 📊 API Response Examples

### TTS Success
```json
{
  "status": 200,
  "content-type": "audio/mpeg",
  "body": "<binary MP3 data>"
}
```

### TTS Error
```json
{
  "error": "Missing text.",
  "status": 400
}
```

### Transcription Success
```json
{
  "text": "Hello, this is a test transcription",
  "language": "en",
  "duration": 2.5,
  "provider": "groq"
}
```

### Transcription Fallback
```json
{
  "text": "Transcribed content via OpenAI fallback",
  "language": "en",
  "provider": "openai",
  "reason_for_fallback": "Groq API rate limit"
}
```

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] `GROQ_API_KEY` is set in `.env.local`
- [ ] `/api/tools/tts` endpoint returns audio on POST
- [ ] `/api/tools/transcribe` endpoint returns text on POST
- [ ] `/api/tools/mic-debug` endpoint logs events
- [ ] Browser allows microphone access (permission granted)
- [ ] Audio recording works (test in browser console)
- [ ] Transcription accuracy is acceptable (test with sample audio)
- [ ] TTS voice quality is acceptable (test with text input)
- [ ] Fallback to OpenAI works (if OPENAI_STT_API_KEY set)
- [ ] Error handling works (test with invalid input)

---

## 📝 Integration with Tools

### In Quiz Tool
- TTS: Read questions aloud
- SST: Record verbal answers (optional)

### In Flashcard Tool
- TTS: Pronounce card terms
- SST: Voice practice mode

### In Study Sessions
- TTS: Read study materials
- SST: Voice notes capture

### In Mindmap/Timeline Tools
- TTS: Narrate mind map structure
- SST: Record ideas while creating

---

## 🔒 Security Considerations

1. **API Key Protection**
   - Never expose keys in client code
   - Use environment variables only
   - Rotate keys periodically

2. **Audio File Size Limits**
   - Max 25 MB enforced server-side
   - Prevents abuse/DoS attacks

3. **Rate Limiting**
   - Implement per-user rate limits
   - Monitor API usage
   - Alert on unusual activity

4. **Data Privacy**
   - Audio files not stored (only transcribed text)
   - Transcription data handled per privacy policy
   - Consider GDPR/CCPA compliance

---

## 📚 References

- Groq API Documentation: https://console.groq.com/docs
- OpenAI Audio API: https://platform.openai.com/docs/guides/speech-to-text
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MediaRecorder API: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

---

**Status:** ✅ All audio systems configured and functional  
**Last Verified:** 2026-05-12
