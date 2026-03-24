import Script from 'next/script';

export default function MicrosoftPickerRedirectPage() {
  return (
    <>
      <Script src="https://js.live.net/v7.2/OneDrive.js" strategy="beforeInteractive" />
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="text-center">
          <p className="text-sm font-medium">Microsoft picker authentication in progress...</p>
          <p className="mt-1 text-xs text-muted-foreground">If this window does not close, you can close it and return to Cautie.</p>
        </div>
      </main>
    </>
  );
}
