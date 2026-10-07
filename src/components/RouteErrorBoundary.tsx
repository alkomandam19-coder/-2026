import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertCircle, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in route:", error, errorInfo);
    const msg = String(error?.message || "");
    if (
      msg.includes("Invalid hook call") ||
      msg.includes("useContext") ||
      msg.includes("dynamically imported module") ||
      msg.includes("Failed to fetch dynamically imported")
    ) {
      const recoveryKey = "ais_auto_route_heal";
      const lastHeal = sessionStorage.getItem(recoveryKey);
      const now = Date.now();
      if (!lastHeal || now - Number(lastHeal) > 10000) {
        sessionStorage.setItem(recoveryKey, String(now));
        window.location.reload();
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 text-center" dir="rtl">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">تحديث الصفحة مطلوب</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                تم تحديث محتوى الصفحة أو حدث انقطاع مؤقت أثناء التحميل. يرجى الضغط على زر إعادة المحاولة لمتابعة التصفح بشكل سليم.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة الآن</span>
              </button>
              <a
                href="/"
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <Home className="w-4 h-4" />
                <span>الرئيسية</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
