import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen pt-24 bg-gray-50 text-right px-6 flex items-center justify-center" dir="rtl">
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="text-8xl font-black text-emerald-800">404</div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-900">
          عذراً، الصفحة التي تبحث عنها غير موجودة!
        </h1>
        
        <p className="text-lg text-gray-600 leading-relaxed">
          ربما تم نقل الصفحة، أو أن الرابط غير صحيح. يمكنك دائماً العودة إلى الصفحة الرئيسية واستكشاف المعاهد والأكاديميات المعتمدة لعام 2026.
        </p>

        <div className="pt-4">
          <Link 
            to="/" 
            className="inline-block bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-900 hover:to-emerald-700 text-white font-bold px-8 py-3.5 rounded-xl text-base shadow-lg transition-all duration-200"
          >
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
