import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global uncaught boundary caught error:", error, errorInfo);
  }

  private handleReload = () => {
    try {
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center text-slate-100 font-sans" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">حدث خطأ غير متوقع</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                تم رصد خطأ أثناء تشغيل التطبيق. يرجى إعادة تحميل الصفحة لمتابعة التصفح بشكل سليم ومحدث.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل البوابة</span>
              </button>
              <a
                href="/"
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700 text-sm"
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
