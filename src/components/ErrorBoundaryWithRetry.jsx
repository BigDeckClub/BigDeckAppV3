import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundaryWithRetry extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-300 mb-2">Something went wrong</h3>
          <p className="text-slate-400 mb-4">{this.state.error?.message}</p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundaryWithRetry;
