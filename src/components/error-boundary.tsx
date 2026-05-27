"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-8 text-center">
            <p className="text-sm text-destructive">
              Something went wrong loading this section.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
