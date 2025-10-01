import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🚨</div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Emergency System Error
            </h1>
            <p className="text-gray-600 mb-6">
              Something went wrong with the CrisisLink application.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 mr-4"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Reload Page
              </button>
            </div>
            <div className="mt-8 text-left bg-gray-100 p-4 rounded-lg max-w-lg">
              <h3 className="font-semibold mb-2">Error Details:</h3>
              <pre className="text-sm text-gray-600 overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
