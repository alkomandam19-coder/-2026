import React, { Component, ErrorInfo, ReactNode } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CarouselErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("CarouselErrorBoundary caught an error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="w-full bg-slate-50/90 border border-slate-200/90 rounded-2xl p-6 sm:p-8 text-center space-y-3 font-sans shadow-xs my-2" 
          dir="rtl"
          role="status"
          aria-live="polite"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-xs mb-1 animate-pulse">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
          
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-black text-slate-800 font-sans">
              {this.props.fallbackTitle || "جاري تحديث البيانات..."}
            </h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
              {this.props.fallbackMessage || "يتم تحديث ومزامنة محتوى الكاروسيل لضمان أعلى مستويات الدقة والسرعة."}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-3xs cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CarouselErrorBoundary;
