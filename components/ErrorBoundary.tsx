import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
                    <div className="max-w-md w-full glass-panel border border-red-500/30 p-8 rounded-3xl shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                                <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-white">Ops! Algo deu errado</h1>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Erro de Renderização</p>
                            </div>
                        </div>

                        <div className="bg-black/50 rounded-xl p-4 border border-white/5 mb-6 overflow-auto max-h-[200px]">
                            <p className="text-red-400 font-mono text-sm leading-relaxed break-words">
                                {this.state.error?.toString()}
                            </p>
                            {this.state.errorInfo && (
                                <pre className="text-slate-500 text-[10px] mt-4 font-mono leading-tight">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            )}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">refresh</span>
                            Tentar Novamente (Recarregar)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
