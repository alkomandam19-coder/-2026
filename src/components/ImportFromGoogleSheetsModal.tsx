import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  Upload, 
  ClipboardPaste, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  ArrowRight,
  UserCheck,
  UserPlus,
  HelpCircle
} from "lucide-react";
import { Lead } from "../types";

interface ImportFromGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLeads: Lead[]) => void;
  existingLeads: Lead[];
}

export const ImportFromGoogleSheetsModal: React.FC<ImportFromGoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingLeads
}) => {
  const [pasteText, setPasteText] = useState("");
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    message: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Extract known existing phone numbers for duplicate detection
  const existingPhones = new Set<string>();
  existingLeads.forEach(l => {
    const raw = String(l.phoneNumber || l.whatsappNumber || "").replace(/\D/g, "");
    if (raw.length >= 9) {
      existingPhones.add(raw);
      if (raw.length === 11 && raw.startsWith("01")) existingPhones.add(raw.substring(1));
      if (raw.length === 10) existingPhones.add("0" + raw);
    }
  });

  // Parse raw text pasted from Google Sheets
  const handleParseText = (text: string) => {
    setPasteText(text);
    setErrorMsg("");
    setImportResult(null);

    if (!text.trim()) {
      setPreviewStudents([]);
      return;
    }

    setIsParsing(true);
    try {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        setPreviewStudents([]);
        setIsParsing(false);
        return;
      }

      let headerRow: string[] = [];
      let startIndex = 0;
      const firstLineCols = lines[0].includes("\t") ? lines[0].split("\t") : lines[0].split(",");
      const hasHeaders = firstLineCols.some(c => 
        /اسم|هاتف|تليفون|موبيل|واتس|محافظ|تخصص|دورة|مؤهل|ملاحظ|تاريخ|طالب|شعبة|كود/i.test(c)
      );

      if (hasHeaders) {
        headerRow = firstLineCols.map(c => c.trim().toLowerCase());
        startIndex = 1;
      }

      const parsed: any[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.includes("\t") ? line.split("\t") : line.split(",");
        if (cols.length < 2) continue;

        let name = "";
        let phone = "";
        let whatsapp = "";
        let governorate = "";
        let specialization = "";
        let agent = "";
        let status = "pending";
        let notes = "";
        let eduLevel = "غير محدد";
        let dateStr = "";

        if (headerRow.length > 0) {
          cols.forEach((col, idx) => {
            const h = headerRow[idx] || "";
            const val = col.trim().replace(/^["']|["']$/g, '');
            if (!val) return;

            if (/اسم/i.test(h)) name = val;
            else if (/هاتف|تليفون|موبيل|رقم/i.test(h) && !/واتس/i.test(h)) phone = val;
            else if (/واتس/i.test(h)) whatsapp = val;
            else if (/محافظ/i.test(h)) governorate = val;
            else if (/تخصص|قسم|شعبة/i.test(h)) specialization = val;
            else if (/موظف|مسؤول|مسئول|agent/i.test(h)) agent = val;
            else if (/حالة|status/i.test(h)) status = val;
            else if (/ملاحظ|notes|مصدر/i.test(h)) notes = val;
            else if (/مؤهل|تعليم/i.test(h)) eduLevel = val;
            else if (/تاريخ|وقت|date/i.test(h)) dateStr = val;
          });
        }

        // Fallback column heuristics if no header or fields missing
        if (!phone) {
          for (const col of cols) {
            const digits = col.replace(/\D/g, "");
            if (digits.length >= 10 && digits.length <= 14) {
              phone = digits;
              break;
            }
          }
        }
        if (!name) {
          for (const col of cols) {
            const trimmed = col.trim().replace(/^["']|["']$/g, '');
            if (/[\u0600-\u06FF]/.test(trimmed) && trimmed.split(/\s+/).length >= 2 && !phone.includes(trimmed)) {
              name = trimmed;
              break;
            }
          }
        }

        if (phone || name) {
          const cleanPh = phone.replace(/\D/g, "");
          const isDuplicate = cleanPh.length >= 9 && existingPhones.has(cleanPh);

          parsed.push({
            studentName: name || "طالب بدون اسم",
            phoneNumber: phone,
            whatsappNumber: whatsapp || phone,
            governorate: governorate || "غير محدد",
            specialization: specialization || "غير محدد",
            agentName: agent || "",
            status: status || "pending",
            notes: notes || "",
            educationLevel: eduLevel || "غير محدد",
            date: dateStr || new Date().toISOString(),
            isDuplicate
          });
        }
      }

      setPreviewStudents(parsed);
    } catch (err: any) {
      setErrorMsg("حدث خطأ أثناء معالجة النص: " + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        handleParseText(content);
      }
    };
    reader.readAsText(file);
  };

  // Submit parsed students to backend
  const handleConfirmImport = async () => {
    if (previewStudents.length === 0) return;
    setIsImporting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/students/import-from-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: previewStudents })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل استيراد الطلاب");
      }

      setImportResult({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
        message: `تم استيراد وحفظ ${data.importedCount} طالب بنجاح في سوبابيز والموقع!`
      });

      if (data.importedStudents && data.importedStudents.length > 0) {
        onSuccess(data.importedStudents);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء حفظ الطلاب");
    } finally {
      setIsImporting(false);
    }
  };

  const newStudentsCount = previewStudents.filter(s => !s.isDuplicate).length;
  const duplicateStudentsCount = previewStudents.filter(s => s.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                استيراد ومزامنة الطلاب من شيت جوجل (Google Sheets)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الصق خلايا شيت جوجل مباشرة لاستيراد أي طالب مفقود وحفظه تلقائياً في سوبابيز والموقع
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Success Banner */}
          {importResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3 text-emerald-800 dark:text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">{importResult.message}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  تم الحفظ في قاعدة بيانات Supabase والتحديث الفوري في جدول الطلاب واللوحة الإدارية.
                  {importResult.skippedCount > 0 && ` (تم تجاوز ${importResult.skippedCount} طالب مسجلين مسبقاً)`}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-200 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Instruction helper */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <span className="font-bold">طريقة الاستخدام السريعة:</span>
              <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-600 dark:text-slate-300">
                <li>افتح شيت جوجل الذي يحتوي على بيانات الطلاب.</li>
                <li>حدد الصفوف والأعمدة واضغط نسخ (<kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-xs font-mono">Ctrl + C</kbd>).</li>
                <li>الصق النص هنا في المربع بالأسفل (<kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-xs font-mono">Ctrl + V</kbd>).</li>
                <li>سيتعرف النظام تلقائياً على الأسماء وأرقام الهواتف والتخصصات والمحافظات، ثم اضغط <strong>تأكيد الاستيراد والحفظ لسوبابيز</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Input Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                الصق بيانات شيت جوجل هنا:
              </label>
              <label className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                أو ارفع ملف CSV من جهازك
                <input 
                  type="file" 
                  accept=".csv,.txt" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            <textarea
              rows={4}
              value={pasteText}
              onChange={(e) => handleParseText(e.target.value)}
              placeholder="الصق خلايا الشيت هنا... مثال:
محمد أحمد	01012345678	القاهرة	تمريض	أحمد علي
سارة محمود	01198765432	الجيزة	صحافة وإعلام	منى حسن"
              className="w-full px-4 py-3 text-sm font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition resize-none text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Preview Section */}
          {previewStudents.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    البيانات التي تم التعرف عليها ({previewStudents.length} طالب):
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {newStudentsCount} طالب جديد
                  </span>
                  {duplicateStudentsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                      {duplicateStudentsCount} مسجل مسبقاً
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">اسم الطالب</th>
                      <th className="py-2.5 px-3">الهاتف</th>
                      <th className="py-2.5 px-3">التخصص</th>
                      <th className="py-2.5 px-3">المحافظة</th>
                      <th className="py-2.5 px-3">الحالة المقترحة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {previewStudents.map((s, idx) => (
                      <tr key={idx} className={s.isDuplicate ? "bg-slate-50/50 dark:bg-slate-800/30 opacity-70" : "hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"}>
                        <td className="py-2 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold">{s.studentName}</td>
                        <td className="py-2 px-3 font-mono" dir="ltr">{s.phoneNumber}</td>
                        <td className="py-2 px-3">{s.specialization}</td>
                        <td className="py-2 px-3">{s.governorate}</td>
                        <td className="py-2 px-3">
                          {s.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                              <UserCheck className="w-3 h-3" />
                              مسجل مسبقاً
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              <UserPlus className="w-3 h-3" />
                              طالب جديد للحفظ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {previewStudents.length > 0 && (
              <span>سيتم تخصيص كود حجز فريد تلقائي لكل طالب وحفظه في سوبابيز وقاعدة البيانات.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || previewStudents.length === 0 || newStudentsCount === 0}
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ إلى Supabase...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  تأكيد واستيراد {newStudentsCount} طالب إلى سوبابيز
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
