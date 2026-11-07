import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RetailPro ErrorBoundary] Uncaught rendering error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.href = '/dashboard';
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-[500px] flex items-center justify-center p-6 bg-gray-50/50">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-card border border-rose-100 p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
              <AlertOctagon size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Se produjo un problema al renderizar esta vista
              </h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                La plataforma detectó una inconsistencia en los datos o en los componentes de esta sección. No te preocupes, tu sesión se mantiene a salvo.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <RotateCw size={15} />
                <span>Recargar página</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Home size={15} />
                <span>Ir al Dashboard</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="inline-flex items-center justify-between w-full text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
              >
                <span>Detalle técnico del error {isDev ? '(Entorno de desarrollo)' : ''}</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-4 bg-gray-900 rounded-xl text-xs tabular-nums text-rose-300 overflow-x-auto space-y-2 max-h-64">
                  <p className="font-bold text-rose-400">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[11px] font-sans text-gray-400 whitespace-pre-wrap leading-tight">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
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
