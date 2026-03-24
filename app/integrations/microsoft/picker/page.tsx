export default function MicrosoftPickerRedirectPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      {/* OneDrive v7.2 requires this script on the redirect URI page itself. */}
      <script src="https://js.live.net/v7.2/OneDrive.js" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
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
          `,
        }}
      />
      <div className="text-center">
        <p className="text-sm font-medium">Microsoft picker authentication in progress...</p>
        <p className="mt-1 text-xs text-muted-foreground">If this window does not close, you can close it and return to Cautie.</p>
      </div>
    </main>
  );
}
