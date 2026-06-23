'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ErrorLogger } from '@/lib/error-logger';
import { generateErrorCode } from '@/lib/error-codes';

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
};

type State = {
  hasError: boolean;
  errorCode?: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Log the error and generate error code
    const errorCode = generateErrorCode('system');
    this.setState({ errorCode });

    // Send to error logging system
    ErrorLogger.handleError(error, 'error-boundary', {
      errorCode,
      locale: 'en',
    }).catch(() => {
      // Silently fail if logging fails
    });
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  private handleContactSupport = () => {
    if (typeof window !== 'undefined') {
      // Could open a modal or navigate to support page
      // For now, copy error code to clipboard
      if (this.state.errorCode) {
        navigator.clipboard.writeText(this.state.errorCode);
        alert(`Error code copied: ${this.state.errorCode}\n\nPlease contact support with this code.`);
      }
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto my-8 w-full max-w-3xl rounded-xl border surface-panel p-6">
        <h2 className="text-lg font-medium">{this.props.fallbackTitle || 'Something went wrong'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {this.props.fallbackDescription || 'This view failed to render. Reload and try again.'}
        </p>

        {this.state.errorCode && (
          <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Error Code:</p>
            <p className="font-mono text-sm">{this.state.errorCode}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Please save this code if you need to contact support.
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={this.handleReload}>
            Reload
          </Button>
          {this.state.errorCode && (
            <Button type="button" variant="outline" onClick={this.handleContactSupport}>
              Copy Error Code
            </Button>
          )}
        </div>
      </div>
    );
  }
}

