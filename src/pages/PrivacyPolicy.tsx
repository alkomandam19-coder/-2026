import React, { useEffect } from 'react';

export default function PrivacyPolicy() {
  const currentMonthYear = new Intl.DateTimeFormat('ar-EG', { 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date());

  return (
    <div className="min-h-screen pt-28 pb-16 bg-white" dir="rtl">
      <div className="container mx-auto px-6 max-w-5xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-900 mb-6">ميثاق الأمان الرقمي وخصوصية البيانات</h1>
          <div className="w-24 h-2 bg-emerald-600 mx-auto rounded-full mb-6"></div>
          <p className="text-gray-600 text-lg">نحن لا نحمي بياناتك فحسب، بل نحمي ثقتك بنا. إليك ميثاقنا الرسمي لعام 2026.</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-gray-50 p-8 md:p-12 rounded-3xl border border-gray-100 shadow-xl">
          <div className="space-y-10 text-right">
            
            <section>
              <h3 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center">
                <span className="bg-emerald-100 p-2 rounded-lg ml-3 text-emerald-700">01</span> البيانات التي نجمعها بمسؤولية
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg pr-12">
                نحن نجمع فقط ما يخدم رحلتك الأكاديمية (الاسم، الهاتف، المحافظة، التخصص). هذه البيانات هي ملكك وحدك، ونستخدمها لغرض وحيد وهو تسهيل عملية تواصلك مع الأكاديميات المعتمدة، مع التزامنا التام بعدم استخدامها في أي سياق آخر.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center">
                <span className="bg-emerald-100 p-2 rounded-lg ml-3 text-emerald-700">02</span> حصون الحماية والتشفير
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg pr-12">
                تخضع جميع بياناتكم لبروتوكولات تشفير متقدمة. كل طلب تقدمه، وكل مستند ترفعه، يتم نقله وتخزينه عبر خوادم مؤمنة بالكامل ومحمية بجدران نارية ذكية، مما يضمن أن خصوصيتك محمية من أي وصول غير مصرح به.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center">
                <span className="bg-emerald-100 p-2 rounded-lg ml-3 text-emerald-700">03</span> التزامنا تجاه تجربة المستخدم
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg pr-12">
                نستخدم ملفات الارتباط (Cookies) بذكاء وبشكل غير تطفلي، فقط لتحسين سرعة تصفحك وتخصيص تجربتك التعليمية داخل البوابة، مع توفير كامل الشفافية لك في التحكم في هذه الإعدادات عبر متصفحك.
              </p>
            </section>

         </div>
        </div>

        {/* رموز الجودة والاعتماد */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-900 text-2xl font-bold">✓</div>
            <span className="text-sm font-semibold text-emerald-900">جودة معتمدة</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 text-2xl font-bold">🛡️</div>
            <span className="text-sm font-semibold text-blue-900">تشفير وحماية</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-900 text-2xl font-bold">⭐</div>
            <span className="text-sm font-semibold text-amber-900">خدمة موثوقة</span>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-16 text-center text-gray-500 border-t border-gray-200 pt-8">
          <p className="font-semibold italic">"خصوصيتك هي أمانة نعتز بحمايتها في بوابة المعاهد والأكاديميات الخاصة."</p>
          <p className="mt-2 text-sm">آخر تحديث: {currentMonthYear}</p>
        </div>
      </div>
    </div>
  );
}
