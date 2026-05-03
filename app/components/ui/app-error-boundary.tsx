'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[app-error-boundary] render failed', error);
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="mx-auto my-8 w-full max-w-3xl rounded-xl border surface-panel p-6">
        <h2 className="text-lg font-medium">{this.props.fallbackTitle || 'Something went wrong'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {this.props.fallbackDescription || 'This view failed to render. Reload and try again.'}
        </p>
        <div className="mt-4">
          <Button type="button" onClick={this.handleReload}>Reload</Button>
        </div>
      </div>
    );
  }
}

