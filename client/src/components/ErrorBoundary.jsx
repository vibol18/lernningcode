import React from 'react';

/**
 * Top-level error boundary. Catches any error thrown while rendering
 * the React tree and shows a friendly fallback UI instead of a blank
 * screen or a white page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Uncaught React error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-ui" role="alert">
          <div className="fatal-card">
            <div className="fatal-icon">!</div>
            <h1>Something went wrong</h1>
            <p>
              The application hit an unexpected error. This is handled so you
              don&apos;t get a blank page.
            </p>
            <details className="fatal-details">
              <summary>Show technical details</summary>
              <pre className="fatal-pre">
                {String(this.state.error && this.state.error.message)}
              </pre>
            </details>
            <button className="btn btn-primary" onClick={this.handleReset}>
              Try again
            </button>
            <button className="btn" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
