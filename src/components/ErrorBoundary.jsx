import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Get error type and user-friendly message
 */
const getErrorDetails = (error) => {
  const errorMessage = error?.message || 'An unexpected error occurred';
  const errorName = error?.name || 'Error';

  // Categorize errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return {
      type: 'network',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      icon: 'network',
    };
  }

  if (errorMessage.includes('ChunkLoadError') || errorMessage.includes('Loading chunk')) {
    return {
      type: 'chunk',
      title: 'Loading Error',
      message: 'Failed to load part of the application. This usually happens after an update. Please refresh the page.',
      icon: 'refresh',
    };
  }

  if (errorName === 'TypeError' || errorName === 'ReferenceError') {
    return {
      type: 'runtime',
      title: 'Application Error',
      message: 'Something went wrong in the application. Our team has been notified.',
      icon: 'bug',
    };
  }

  return {
    type: 'unknown',
    title: 'Something went wrong',
    message: 'The application encountered an unexpected error. Please try refreshing the page.',
    icon: 'warning',
  };
};

/**
 * Report error to console (and optionally to external service)
 */
const reportError = (error, errorInfo) => {
  // Log to console
  console.error('ErrorBoundary caught an error:', error);
  console.error('Component stack:', errorInfo?.componentStack);

  // Here you could add integration with external error reporting services
  // Example: Sentry, LogRocket, etc.
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
  // }
};

/**
 * Generate error report content for user to copy
 */
const generateErrorReport = (error, errorInfo) => {
  const timestamp = new Date().toISOString();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const url = typeof window !== 'undefined' ? window.location.href : 'Unknown';

  return `
Error Report
============
Timestamp: ${timestamp}
URL: ${url}
Browser: ${userAgent}

Error: ${error?.name || 'Unknown'}: ${error?.message || 'No message'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
  `.trim();
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
      reportCopied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleToggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  handleCopyReport = async () => {
    const { error, errorInfo } = this.state;
    const report = generateErrorReport(error, errorInfo);
    
    try {
      await navigator.clipboard.writeText(report);
      this.setState({ reportCopied: true });
      setTimeout(() => this.setState({ reportCopied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error report:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, reportCopied } = this.state;
      const errorDetails = getErrorDetails(error);

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-lg w-full text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-red-400 mb-3">
              {errorDetails.title}
            </h1>

            {/* Message */}
            <p className="text-slate-400 mb-8">
              {errorDetails.message}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>

              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>

            {/* Error Details Toggle */}
            <div className="border-t border-slate-700 pt-6">
              <button
                onClick={this.handleToggleDetails}
                className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
              >
                {showDetails ? 'Hide technical details' : 'Show technical details'}
              </button>

              {showDetails && (
                <div className="mt-4 text-left">
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 overflow-auto max-h-64">
                    <p className="text-xs text-slate-500 mb-2">
                      <strong>Error:</strong> {error?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-red-400 mb-4 break-words">
                      {error?.message || 'No message available'}
                    </p>
                    {error?.stack && (
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    )}
                  </div>

                  {/* Report Issue Button */}
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={this.handleCopyReport}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
                    >
                      <Bug className="w-4 h-4" />
                      {reportCopied ? 'Copied to clipboard!' : 'Copy error report'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
