export default function About() {
  return (
    <div className="min-h-screen pt-24 bg-gray-50 text-right px-6 container mx-auto" dir="rtl">
      <div className="max-w-4xl mx-auto py-12 space-y-10">
        
        {/* العنوان الرئيسي الجديد */}
        <div className="border-r-8 border-emerald-800 pr-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-900 mb-4">
            بوابتك الذكية نحو مستقبل مهني لا يقبل بغير القمة
          </h1>
          <p className="text-2xl text-emerald-700 font-bold">
            رصدُ التميز.. وتشكيل المسار المهني لعام 2026
          </p>
        </div>

        {/* باقي الكود كما هو تماماً... */}

        {/* المقدمة */}
        <p className="text-lg text-gray-700 leading-relaxed text-justify">
          ليست مجرد بوابة إلكترونية، بل هي الكيان الرقمي السيادي والمظلة الرسمية المعتمدة لكبرى المعاهد والأكاديميات. 
          لقد قمنا بهندسة هذه البوابة لتكون "غرفة العمليات المركزية" لكل طالب طموح، وولي أمر يبحث عن الأمان والاعتماد، ولكل باحث عن بصمة حقيقية في سوق العمل. هنا، حيث تلتقي التكنولوجيا بالخبرة، نضع بين يديك تجربة لم تشهدها من قبل في أي منصة تعليمية أخرى.
        </p>

        {/* لماذا البوابة الفريدة */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-emerald-900 border-b-2 border-emerald-200 pb-2">
            لماذا يصفوننا بأننا "البوابة الفريدة"؟
          </h2>
          
          <div className="space-y-4 text-gray-700">
            <p><strong>قيادة البيانات المعتمدة:</strong> بوابتنا ليست محرك بحث عادي، بل هي مصدر الحقيقة الأول لكل تخصص ومعتمدة من جهات الاختصاص، لضمان أن كل خطوة تخطوها نحو تخصصك هي خطوة مبنية على أرقام ومؤشرات سوق العمل الفعلية.</p>
            <p><strong>تجربة متعددة الأبعاد:</strong> صممنا رحلتك داخل البوابة لتكون تفاعلية بالكامل؛ يمكنك استكشاف المسارات، محاكاة العوائد المادية، وتصفح الخبرات الميدانية بأسلوب بصري يضعك في قلب الحدث.</p>
            <p><strong>سيادة التطوير:</strong> نعتمد في بوابتنا على أنظمة الذكاء الاصطناعي المباشر (Direct AI Advisor)، لنضمن أن توجيهك الأكاديمي لا يعتمد على التخمين، بل على تحليلات دقيقة ومتغيرة لحظياً لتواكب طفرات عام 2026.</p>
            <p><strong>شفافية العلاقة:</strong> نحن لا نبيع وعوداً، بل نبني علاقات مهنية مستدامة. البوابة هي مساحة محايدة ومحترفة تعمل كحلقة وصل مباشرة بين الطالب والمؤسسة الأكاديمية دون وسيط، مع ضمان كامل لحقوقك التعليمية.</p>
          </div>
        </div>

        {/* الرؤية المستقبلية */}
        <div className="bg-emerald-900 text-white p-8 rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold mb-4">رؤيتنا المستقبلية</h2>
          <p className="text-lg leading-relaxed mb-6">
            نحن هنا لنغير مفهوم التعليم الفني والمهني؛ لننتقل به من مرحلة "الاختيار العشوائي" إلى مرحلة "الاستثمار الاستراتيجي" في المهارات. 
            نحن نهدف لأن تكون هذه البوابة هي البصمة الرقمية لكل طالب يبدأ رحلة احترافه، ولتكون هي المرجع الأول الذي لا يستغني عنه أي بيت يبحث عن التميز لأبنائه.
          </p>
          <p className="text-xl font-bold italic text-emerald-300">
            أنت الآن في المكان الصحيح.. حيث يبدأ التخطيط لمستقبل لا يقبل بغير القمة.
          </p>
        </div>

        {/* شريط الثقة والجودة */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-900 text-2xl font-bold">✓</div>
            <span className="text-sm font-semibold text-emerald-900">اعتماد رسمي</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 text-2xl font-bold">🛡️</div>
            <span className="text-sm font-semibold text-blue-900">بيانات آمنة</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-900 text-2xl font-bold">⭐</div>
            <span className="text-sm font-semibold text-amber-900">جودة تعليمية</span>
          </div>
        </div>

      </div>
    </div>
  );
}