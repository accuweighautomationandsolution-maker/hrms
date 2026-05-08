import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    // Clear storage to resolve potential state/cache corruption causing the crash
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload(true);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          margin: '2rem', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fee2e2', 
          borderRadius: '8px',
          color: '#991b1b',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong.</h1>
          <p style={{ marginBottom: '1rem' }}>The application has encountered an unexpected error and cannot continue.</p>
          <pre style={{ 
            backgroundColor: '#fff', 
            padding: '1rem', 
            borderRadius: '4px', 
            overflowX: 'auto',
            fontSize: '0.875rem',
            border: '1px solid #fecaca'
          }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#991b1b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Clear Cache & Reload App
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #991b1b',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
