import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 bg-error/5 border border-error/20 rounded-2xl text-center min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4 mx-auto">
            <span className="material-symbols-outlined text-error text-2xl">warning</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Something went wrong</h3>
          <p className="text-on-surface-variant font-body-md max-w-md mx-auto mb-6">
            An unexpected error occurred in this section of the hive. 
            {this.state.error?.message && (
              <span className="block mt-2 font-mono text-xs text-error/70">
                Error: {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2 bg-primary text-surface rounded-lg font-label-md hover:bg-stone-800 transition-colors"
          >
            Try to Recover
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
