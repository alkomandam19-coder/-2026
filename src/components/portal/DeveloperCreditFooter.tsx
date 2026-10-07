import React, { useState, useRef } from "react";
import { Code, Lock, ShieldCheck, Wrench } from "lucide-react";
import toast from "react-hot-toast";

interface DeveloperCreditFooterProps {
  onTriggerAdmin: () => void;
  isAdminUnlocked?: boolean;
  onLockAdmin?: () => void;
  className?: string;
}

export const DeveloperCreditFooter: React.FC<DeveloperCreditFooterProps> = ({
  onTriggerAdmin,
  isAdminUnlocked = false,
  onLockAdmin,
  className = ""
}) => {
  const [clickCount, setClickCount] = useState(0);
  const timerRef = useRef<any>(null);

  const handleClick = () => {
    // If admin is already unlocked, open admin panel directly on click
    if (isAdminUnlocked) {
      onTriggerAdmin();
      return;
    }

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (nextCount >= 3) {
      setClickCount(0);
      onTriggerAdmin();
    } else {
      timerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 2000);
    }
  };

  return (
    <div className={`space-y-2 ${className}`} dir="rtl">
      {/* Developer Credit Bar */}
      <div 
        onClick={handleClick}
        className="p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer rounded-2xl border border-slate-200/90 flex items-center justify-between text-[11px] font-semibold text-slate-800 transition select-none group active:scale-[0.99] shadow-2xs"
        id="developer-credit-badge"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-amber-100 text-amber-700 group-hover:rotate-12 transition-transform">
            <Code className="w-3.5 h-3.5" />
          </div>
          <span>
            تم التطوير والبرمجة بواسطة الميديا باير: <strong className="text-amber-700 font-bold">م/ محمد الروبي</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          {isAdminUnlocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 animate-pulse">
              <ShieldCheck className="w-3 h-3" />
              <span>لوحة التحكم نشطة (اضغط للإدارة)</span>
            </span>
          )}
        </div>
      </div>

      {/* Admin Mode Bar if unlocked */}
      {isAdminUnlocked && onLockAdmin && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900">
          <div className="flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-600" />
            <span>وضع الإدارة مفعل - يمكنك إضافة وتعديل وحذف البيانات مباشرة من البطاقات.</span>
          </div>
          <button
            onClick={onLockAdmin}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-bold transition shadow-2xs"
          >
            قفل وضع الإدارة 🔒
          </button>
        </div>
      )}
    </div>
  );
};
