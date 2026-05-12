import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          background: '#fef2f2', 
          borderRadius: '16px', 
          border: '1px solid #fee2e2',
          margin: '20px 0'
        }}>
          <h2 style={{ color: '#991b1b', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 800 }}>Something went wrong</h2>
          <p style={{ color: '#b91c1c', fontSize: '0.9rem' }}>We encountered an error while rendering this part of the trip. Try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '16px', 
              padding: '8px 16px', 
              background: '#ef4444', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
