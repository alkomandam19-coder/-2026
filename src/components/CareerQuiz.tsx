import React, { useState } from "react";
import { QUIZ_QUESTIONS, ACADEMY_DEPARTMENTS, Department } from "../data";
import { Sparkles, ArrowLeft, ArrowRight, RotateCcw, Check, Briefcase, BookOpen, GraduationCap } from "lucide-react";

interface CareerQuizProps {
  onSelectDepartment: (dept: Department) => void;
}

export function CareerQuiz({ onSelectDepartment }: CareerQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedDepartmentsByQuestions, setSelectedDepartmentsByQuestions] = useState<string[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleSelectOption = (questionId: number, value: string, departmentIds: string[]) => {
    // Save answer
    const updatedAnswers = { ...answers, [questionId]: value };
    setAnswers(updatedAnswers);

    // Filter or adjust scored departments
    // We append the departments matching the clicked choice
    let newScores = [...selectedDepartmentsByQuestions];
    // Filter out previous selections for this question if any to avoid double scoring
    const prevOption = QUIZ_QUESTIONS.find(q => q.id === questionId)
      ?.options.find(o => o.value === answers[questionId]);
    if (prevOption) {
      newScores = newScores.filter(dId => !prevOption.departments.includes(dId));
    }
    newScores.push(...departmentIds);
    setSelectedDepartmentsByQuestions(newScores);

    // Auto action for seamless flow
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      // Small timeout for visual feedback
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 250);
    } else {
      setTimeout(() => {
        setQuizCompleted(true);
      }, 300);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedDepartmentsByQuestions([]);
    setQuizCompleted(false);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextNoAnswer = () => {
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  // Calculate results safely
  const getTopMatches = () => {
    if (selectedDepartmentsByQuestions.length === 0) {
      // Fallback: recommend popular/core departments
      return ACADEMY_DEPARTMENTS.slice(0, 3);
    }

    // Count frequency of each department ID
    const counts: Record<string, number> = {};
    selectedDepartmentsByQuestions.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });

    // Sort by count descending
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    
    // Convert back to real department objects
    const matches = sortedIds
      .map(id => ACADEMY_DEPARTMENTS.find(d => d.id === id))
      .filter((d): d is Department => d !== undefined);

    if (matches.length === 0) {
      return ACADEMY_DEPARTMENTS.slice(0, 3);
    }

    return matches.slice(0, 3); // return top 3 matches
  };

  const activeQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex) / QUIZ_QUESTIONS.length) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs" id="career-quiz-wrapper" dir="rtl">
      {/* Quiz Top Accent Identity strip */}
      <div className="h-2 bg-gradient-to-r from-brand-navy via-brand-coral to-brand-gold"></div>

      {/* Main Container */}
      {!quizCompleted ? (
        <div className="p-6 md:p-8 space-y-6">
          {/* Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-navy/5 text-brand-navy rounded-lg">
                <Sparkles className="w-5 h-5 animate-pulse text-brand-coral" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 font-sans">مستشار التخصصات الذكي</h3>
                <p className="text-xs text-slate-500">أجب عن الأسئلة البسيطة لنقترح عليك أفضل تخصص دراسي يناسب مواهبك واهتماماتك بسوق العمل</p>
              </div>
            </div>
            
            <div className="text-left shrink-0">
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                السؤال {currentQuestionIndex + 1} من {QUIZ_QUESTIONS.length}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-navy transition-all duration-300 rounded-full" 
                style={{ width: `${progressPercent || 5}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>ابدأ التقييم</span>
              <span>{progressPercent}% مكتمل</span>
            </div>
          </div>

          {/* Question Text */}
          <div className="py-2">
            <h4 className="text-lg md:text-xl font-bold text-slate-800 leading-snug font-sans">
              {activeQuestion.text}
            </h4>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3.5 pt-2" id="quiz-options">
            {activeQuestion.options.map((option, idx) => {
              const isSelected = answers[activeQuestion.id] === option.value;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(activeQuestion.id, option.value, option.departments)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                      : "border-slate-150 bg-white hover:border-slate-350 hover:bg-slate-50 text-slate-700"
                  }`}
                  style={{ minHeight: "56px" }}
                  id={`option-${activeQuestion.id}-${idx}`}
                >
                  <span className="font-semibold text-sm md:text-base leading-relaxed">
                    {option.text}
                  </span>
                  
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected 
                      ? "border-brand-navy bg-brand-navy text-white" 
                      : "border-slate-300 bg-white group-hover:border-slate-400"
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helper Tips */}
          <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-500 flex items-center gap-2 border border-slate-100/80">
            <GraduationCap className="w-4 h-4 text-brand-navy shrink-0" />
            <span>نظام التقييم مبني على الإمكانيات الفعلية للأقسام والمهارات وفرص العمل المذكورة بالمرجع الشامل للأكاديميات.</span>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-4 py-2 text-sm font-semibold rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                currentQuestionIndex === 0
                  ? "border-slate-100 text-slate-300 cursor-not-allowed"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
              style={{ minHeight: "44px" }}
              id="quiz-prev-btn"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              onClick={handleNextNoAnswer}
              className="px-5 py-2 text-sm font-semibold text-brand-navy border border-brand-navy/20 hover:bg-brand-navy/5 rounded-xl transition flex items-center gap-1 cursor-pointer"
              style={{ minHeight: "44px" }}
              id="quiz-skip-btn"
            >
              <span>{currentQuestionIndex === QUIZ_QUESTIONS.length - 1 ? "إنهاء وتوليد النتائج" : "تخطي السؤال"}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-3 pb-4 border-b border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-brand-gold animate-bounce" />
            </div>
            <h3 className="font-extrabold text-2xl text-slate-900 font-sans">
              تم فحص وتحليل اختياراتك بنجاح!
            </h3>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              بناءً على اهتماماتك وطبيعة العمل المفضلة لديك، وجد مستشارنا الأكاديمي أن التخصصات التالية هي الأكثر توافقاً مع طموحاتك ومواهبك:
            </p>
          </div>

          {/* Result Cards */}
          <div className="space-y-4">
            {getTopMatches().map((dept, idx) => (
              <div 
                key={dept.id} 
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-navy hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                id={`match-card-${dept.id}`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-brand-navy text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <h4 className="font-extrabold text-lg text-slate-900">{dept.name}</h4>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      تطابق مميز ✨
                    </span>
                  </div>
                  
                  <p className="text-slate-600 text-sm leading-relaxed pr-10">
                    {dept.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pr-10 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {dept.skills.length} مهارات معتمدة
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {dept.careers.length} مسارات وظيفية
                    </span>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 shrink-0 justify-end pt-2 md:pt-0">
                  <button
                    onClick={() => onSelectDepartment(dept)}
                    className="flex-1 py-2 px-4 bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ minHeight: "44px" }}
                    id={`match-btn-reserve-${dept.id}`}
                  >
                    <span>احجز مقعدك بالقسم</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <a
                    href="#marketing-generator-anchor"
                    onClick={() => {
                      // Custom dispatch callback logic to select in generator
                      onSelectDepartment(dept);
                    }}
                    className="flex-1 py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1"
                    style={{ minHeight: "44px" }}
                    id={`match-btn-tool-${dept.id}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-coral" />
                    <span>توليد إعلان ذكي</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Reset Quiz & Disclaimer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleResetQuiz}
              className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              style={{ minHeight: "44px" }}
              id="quiz-restart-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة إجراء التقييم</span>
            </button>

            <span className="text-xs text-slate-400 leading-normal max-w-md font-sans text-right">
              تم احتساب هذا التوافق ليعكس اهتمامك ونقاط تركيزك العلمية؛ الدراسة الفعلية تمنحك مهارات مهنية حقيقية معتمدة تمكّنك من التنافس في سوق العمل.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
