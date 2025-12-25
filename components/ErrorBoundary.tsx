import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-200 p-6">
          <div className="bg-red-950/30 border border-red-500/30 p-8 rounded-lg max-w-lg text-center">
            <Icon name="shield" className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">System Crash Detected</h2>
            <p className="text-red-300/70 mb-4 font-mono text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <details className="text-left mb-6 bg-black/30 p-3 rounded text-xs font-mono text-slate-500">
              <summary className="cursor-pointer text-slate-400 mb-2">Stack Trace</summary>
              <pre className="overflow-auto max-h-32 whitespace-pre-wrap">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 border border-red-500/50 rounded text-red-200 text-sm font-medium transition-colors"
            >
              Reload System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
