import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REDIRECT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Microsoft Picker Redirect</title>
    <script src="https://js.live.net/v7.2/OneDrive.js"></script>
    <script>
      (function () {
        function send(level, event, data) {
          try {
            fetch('/api/integrations/microsoft/picker-log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                level: level,
                event: event,
                sessionTraceId: 'redirect-page',
                pickerTraceId: null,
                appId: null,
                path: '/integrations/microsoft/picker',
                at: new Date().toISOString(),
                data: data || {},
                client: {
                  href: window.location.href,
                  referrer: document.referrer || null,
                  userAgent: navigator.userAgent || null,
                  visibilityState: document.visibilityState || null,
                  online: navigator.onLine,
                  language: navigator.language || null
                }
              }),
              keepalive: true
            }).catch(function () {});
          } catch (e) {}
        }

        send('info', 'picker-redirect-page-load', {
          hasOpener: !!window.opener,
          search: window.location.search || '',
          hasOAuthParam: /[?&]oauth=/.test(window.location.search),
          hasErrorParam: /[?&]error=/.test(window.location.search)
        });

        try {
          var usp = new URLSearchParams(window.location.search || '');
          var oauthRaw = usp.get('oauth');
          if (oauthRaw) {
            var oauthDecoded = JSON.parse(oauthRaw);
            send('info', 'picker-redirect-oauth-decoded', {
              clientIdSuffix: String(oauthDecoded.clientId || '').slice(-6),
              endpoint: oauthDecoded.endpoint || null,
              scopeCount: Array.isArray(oauthDecoded.scopes) ? oauthDecoded.scopes.length : 0,
              scopes: Array.isArray(oauthDecoded.scopes) ? oauthDecoded.scopes : [],
              origin: oauthDecoded.origin || null,
              redirectUri: oauthDecoded.redirectUri || null,
              hasLoginHint: Boolean(oauthDecoded.loginHint),
              hasState: Boolean(oauthDecoded.state)
            });
          }
        } catch (e) {
          send('warn', 'picker-redirect-oauth-decode-failed', {
            message: String((e && e.message) || 'decode_failed')
          });
        }

        window.addEventListener('load', function () {
          send('info', 'picker-redirect-window-load', {
            hasOneDriveGlobal: !!window.OneDrive
          });
        });

        setTimeout(function () {
          send('warn', 'picker-redirect-still-open-after-5s', {
            hasOpener: !!window.opener,
            hasOneDriveGlobal: !!window.OneDrive
          });
        }, 5000);
      })();
    </script>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #f8f8f8; color: #111; }
      main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }
      p { margin: 0; }
      .sub { margin-top: 8px; color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <div>
        <p>Microsoft picker authentication in progress...</p>
        <p class="sub">If this window does not close, you can close it and return to Cautie.</p>
      </div>
    </main>
  </body>
</html>`;

export async function GET(_request: NextRequest) {
  return new NextResponse(REDIRECT_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  });
}
