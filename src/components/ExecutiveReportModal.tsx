import React, { useState } from "react";
import { X, Printer, Download, Award, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Users, MapPin, BookOpen, Megaphone, FileText } from "lucide-react";

interface Lead {
  id: string;
  reservationCode: string;
  studentName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  graduationYear?: string;
  governorate?: string;
  educationLevel: string;
  basicCourse?: string;
  selectedDepartments: string[];
  notes: string;
  date: string;
  timestamp: number;
  expiresAt: string;
  status: "pending" | "completed" | "no_reply";
  agentName?: string;
  internalNotes?: string;
}

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminLeads: Lead[];
  adminCallbacks: any[];
  parentInquiries: any[];
  shadowTickets: any[];
}

export default function ExecutiveReportModal({
  isOpen,
  onClose,
  adminLeads,
  adminCallbacks,
  parentInquiries,
  shadowTickets
}: ExecutiveReportModalProps) {
  if (!isOpen) return null;

  const nowFormatted = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  // Calculate Governorates Stats
  const govCounts: { [gov: string]: number } = {};
  adminLeads.forEach(l => {
    const g = l.governorate?.trim() || "غير محدد";
    govCounts[g] = (govCounts[g] || 0) + 1;
  });
  const sortedGovs = Object.entries(govCounts)
    .sort((a, b) => b[1] - a[1]);

  // Calculate Specializations/Departments Stats
  const deptCounts: { [dept: string]: number } = {};
  adminLeads.forEach(l => {
    if (l.selectedDepartments && l.selectedDepartments.length > 0) {
      l.selectedDepartments.forEach(d => {
        const clean = d.trim();
        deptCounts[clean] = (deptCounts[clean] || 0) + 1;
      });
    } else if (l.basicCourse) {
      const clean = l.basicCourse.replace("دورة ", "").trim();
      deptCounts[clean] = (deptCounts[clean] || 0) + 1;
    }
  });
  const sortedDepts = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1]);

  // Calculate Ad Attribution Sources Stats
  const adSources: { [source: string]: number } = {
    "إعلانات فيسبوك (Facebook Ads)": 0,
    "إعلانات تيك توك (TikTok Ads)": 0,
    "إعلانات جوجل (Google Ads)": 0,
    "رسائل واتساب وتوصيات (WhatsApp)": 0,
    "زيارات مباشرة للموقع (Direct)": 0
  };

  adminLeads.forEach(l => {
    const notes = (l.notes || "").toLowerCase();
    if (notes.includes("facebook") || notes.includes("فيسبوك") || notes.includes("fb")) {
      adSources["إعلانات فيسبوك (Facebook Ads)"]++;
    } else if (notes.includes("tiktok") || notes.includes("تيك توك")) {
      adSources["إعلانات تيك توك (TikTok Ads)"]++;
    } else if (notes.includes("google") || notes.includes("جوجل")) {
      adSources["إعلانات جوجل (Google Ads)"]++;
    } else if (notes.includes("whatsapp") || notes.includes("واتساب")) {
      adSources["رسائل واتساب وتوصيات (WhatsApp)"]++;
    } else {
      adSources["زيارات مباشرة للموقع (Direct)"]++;
    }
  });

  const sortedAdSources = Object.entries(adSources).sort((a, b) => b[1] - a[1]);

  // SLA Calculation
  let freshGreenCount = 0;   // < 6 hours
  let warningYellowCount = 0; // 6h - 24h
  let criticalRedCount = 0;   // > 24 hours
  let completedCount = 0;

  const nowMs = Date.now();
  adminLeads.forEach(l => {
    if (l.status === "completed") {
      completedCount++;
      return;
    }
    let leadTimeMs = Number(l.timestamp);
    if (!leadTimeMs || isNaN(leadTimeMs)) {
      if (l.date) {
        const parsed = Date.parse(l.date);
        if (!isNaN(parsed)) leadTimeMs = parsed;
      }
    }
    if (!leadTimeMs || isNaN(leadTimeMs)) leadTimeMs = nowMs;

    const hoursElapsed = (nowMs - leadTimeMs) / (1000 * 60 * 60);
    if (hoursElapsed < 6) {
      freshGreenCount++;
    } else if (hoursElapsed <= 24) {
      warningYellowCount++;
    } else {
      criticalRedCount++;
    }
  });

  const totalLeadsCount = adminLeads.length;
  const conversionRate = totalLeadsCount > 0 
    ? ((completedCount / totalLeadsCount) * 100).toFixed(1) 
    : "0";

  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة (Popups) لطباعة التقرير!");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title> التقرير الإداري التنفيذي - بوابة المعاهد والأكاديميات الخاصة</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 30px;
            color: #0f172a;
            background: #ffffff;
            direction: rtl;
          }
          .header {
            text-align: center;
            border-bottom: 3px double #0A2463;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #0A2463;
            font-size: 24px;
            margin: 0 0 5px 0;
            font-weight: 900;
          }
          .header p {
            color: #64748b;
            font-size: 13px;
            margin: 3px 0;
            font-weight: 600;
          }
          .badge-date {
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            margin-top: 10px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 16px;
            font-weight: 800;
            color: #0A2463;
            border-right: 4px solid #D4AF37;
            padding-right: 10px;
            margin-bottom: 15px;
            background: #f8fafc;
            padding: 8px 12px 8px 8px;
            border-radius: 4px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            background: #fafafa;
          }
          .card-val {
            font-size: 22px;
            font-weight: 900;
            color: #0A2463;
            margin-top: 5px;
          }
          .card-lbl {
            font-size: 11px;
            color: #64748b;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: right;
          }
          th {
            background-color: #0A2463;
            color: white;
            font-weight: 800;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 50px;
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 700;
            color: #475569;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1> بوابة المعاهد والأكاديميات الخاصة </h1>
          <p>التقرير الإداري التنفيذي الأسبوعي/الشهري الشامل - الإدارة العليا</p>
          <div class="badge-date">تاريخ واستخراج التقرير: ${nowFormatted}</div>
        </div>

        <!-- Metric Overview -->
        <div class="grid">
          <div class="card">
            <div class="card-lbl">إجمالي الطلاب المسجلين</div>
            <div class="card-val">${totalLeadsCount}</div>
          </div>
          <div class="card">
            <div class="card-lbl">معدل تحويل المبيعات (SLA)</div>
            <div class="card-val" style="color: #059669;">%${conversionRate}</div>
          </div>
          <div class="card">
            <div class="card-lbl">طلبات اتصالات وولي أمر</div>
            <div class="card-val">${adminCallbacks.length + parentInquiries.length}</div>
          </div>
          <div class="card">
            <div class="card-lbl">تذاكر المعايشة المجانية</div>
            <div class="card-val">${shadowTickets.length}</div>
          </div>
        </div>

        <!-- SLA Performance Breakdown -->
        <div class="section">
          <div class="section-title">⏱️ مؤشرات سرعة المتابعة والتواصل (Lead SLA & Follow-up Timer)</div>
          <table>
            <thead>
              <tr>
                <th>مؤشر حالة التواصل (SLA)</th>
                <th>الوصف المعياري</th>
                <th>عدد الحالات</th>
                <th>النسبة المئوية</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="color: #059669; font-weight: 800;">🟢 أخضر (استجابة فريش)</td>
                <td>تم التسجيل منذ أقل من 6 ساعات وبانتظار المتابعة</td>
                <td>${freshGreenCount}</td>
                <td>%${totalLeadsCount > 0 ? ((freshGreenCount/totalLeadsCount)*100).toFixed(1) : 0}</td>
              </tr>
              <tr>
                <td style="color: #d97706; font-weight: 800;">🟡 أصفر (تحذير تأخير)</td>
                <td>مرت 6 إلى 24 ساعة (أو 12 ساعة) دون تغيير الحالة</td>
                <td>${warningYellowCount}</td>
                <td>%${totalLeadsCount > 0 ? ((warningYellowCount/totalLeadsCount)*100).toFixed(1) : 0}</td>
              </tr>
              <tr>
                <td style="color: #dc2626; font-weight: 800;">🔴 أحمر (تأخير حرج!)</td>
                <td>مرت أكثر من 24 ساعة دون الاتصال بالطالب</td>
                <td>${criticalRedCount}</td>
                <td>%${totalLeadsCount > 0 ? ((criticalRedCount/totalLeadsCount)*100).toFixed(1) : 0}</td>
              </tr>
              <tr>
                <td style="color: #2563eb; font-weight: 800;">🟢 تم التواصل والتسجيل</td>
                <td>تم التواصل هاتفياً وتأكيد الحجز بنجاح</td>
                <td>${completedCount}</td>
                <td>%${totalLeadsCount > 0 ? ((completedCount/totalLeadsCount)*100).toFixed(1) : 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Governorates breakdown -->
        <div class="section">
          <div class="section-title">🗺️ إحصائيات الطلاب حسب المحافظات (Governorate Analytics)</div>
          <table>
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>المحافظة الجغرافية</th>
                <th>عدد الطلاب المسجلين</th>
                <th>النسبة من إجمالي الإقبال</th>
              </tr>
            </thead>
            <tbody>
              ${sortedGovs.map(([gov, count], idx) => `
                <tr>
                  <td>#${idx + 1}</td>
                  <td><strong>${gov}</strong></td>
                  <td>${count} طالب</td>
                  <td>%${totalLeadsCount > 0 ? ((count/totalLeadsCount)*100).toFixed(1) : 0}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <!-- Specializations breakdown -->
        <div class="section">
          <div class="section-title">📚 التخصصات والدبلومات الأكثر طلباً هذا الشهر (Top Requested Programs)</div>
          <table>
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>اسم القسم / الشعبة الدراسية</th>
                <th>عدد طلبات التسجيل</th>
                <th>نسبة الطلب الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${sortedDepts.map(([dept, count], idx) => `
                <tr>
                  <td>#${idx + 1}</td>
                  <td><strong>${dept}</strong></td>
                  <td>${count} طالب</td>
                  <td>%${totalLeadsCount > 0 ? ((count/totalLeadsCount)*100).toFixed(1) : 0}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <!-- Ad Sources Attribution -->
        <div class="section">
          <div class="section-title">📊 أداء الحملات الإعلانية ومصادر التسجيل (Ad Attribution & ROI Source)</div>
          <table>
            <thead>
              <tr>
                <th>القناة / المنصة الإعلانية</th>
                <th>عدد الطلاب القادمين</th>
                <th>النسبة من الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${sortedAdSources.map(([src, count]) => `
                <tr>
                  <td><strong>${src}</strong></td>
                  <td>${count} طالب</td>
                  <td>%${totalLeadsCount > 0 ? ((count/totalLeadsCount)*100).toFixed(1) : 0}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div>توقيع مدير التسويق والإعلانات: ........................</div>
          <div>توقيع واعتمد رئيس مجلس الإدارة: ........................</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in" dir="rtl">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right my-8 max-h-[90vh] flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0A2463] via-slate-900 to-[#0A2463] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 border border-amber-400/40 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">تقرير الإدارة التنفيذي الجاهز للطباعة (PDF Report) 📊</h3>
              <p className="text-xs text-slate-300">إحصائيات شاملة ومؤشرات SLA ومصادر إعلانات الطلاب</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition cursor-pointer text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Report Body Preview */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Top Quick Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-3xs text-center space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block">إجمالي الطلاب المسجلين</span>
              <span className="text-2xl font-black text-[#0A2463]">{totalLeadsCount}</span>
            </div>
            <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-3xs text-center space-y-1">
              <span className="text-[10px] text-emerald-700 font-bold block">نسبة نجاح التحويل (SLA)</span>
              <span className="text-2xl font-black text-emerald-600">%{conversionRate}</span>
            </div>
            <div className="p-4 bg-white border border-amber-200 rounded-2xl shadow-3xs text-center space-y-1">
              <span className="text-[10px] text-amber-700 font-bold block">طلبات أولياء الأمور واتصال</span>
              <span className="text-2xl font-black text-amber-600">{adminCallbacks.length + parentInquiries.length}</span>
            </div>
            <div className="p-4 bg-white border border-purple-200 rounded-2xl shadow-3xs text-center space-y-1">
              <span className="text-[10px] text-purple-700 font-bold block">تذاكر المعايشة المعتمدة</span>
              <span className="text-2xl font-black text-purple-600">{shadowTickets.length}</span>
            </div>
          </div>

          {/* 1. SLA Performance */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-[#0A2463] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>⏱️ مؤشرات سرعة المتابعة والتواصل (Lead SLA & Follow-up Timer)</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                <span className="font-bold block text-[11px] mb-1">🟢 فريش (&lt; 6 ساعات):</span>
                <strong className="text-lg font-black block">{freshGreenCount} طالب</strong>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <span className="font-bold block text-[11px] mb-1">🟡 تحذير (6-24 س / 12س):</span>
                <strong className="text-lg font-black block">{warningYellowCount} طالب</strong>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
                <span className="font-bold block text-[11px] mb-1">🔴 تأخير حرج (&gt; 24 س):</span>
                <strong className="text-lg font-black block">{criticalRedCount} طالب</strong>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <span className="font-bold block text-[11px] mb-1">🟢 تم التواصل والتعميد:</span>
                <strong className="text-lg font-black block">{completedCount} طالب</strong>
              </div>
            </div>
          </div>

          {/* 2. Governorates Table */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-[#0A2463] flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <span>🗺️ إحصائيات الطلاب حسب المحافظات الجغرافية</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2 border border-slate-200">الترتيب</th>
                    <th className="p-2 border border-slate-200">المحافظة</th>
                    <th className="p-2 border border-slate-200">عدد الطلاب</th>
                    <th className="p-2 border border-slate-200">النسبة من الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGovs.slice(0, 10).map(([gov, count], idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-100 font-bold text-slate-500">#{idx + 1}</td>
                      <td className="p-2 border border-slate-100 font-extrabold text-slate-800">{gov}</td>
                      <td className="p-2 border border-slate-100 font-bold">{count} طالب</td>
                      <td className="p-2 border border-slate-100 text-emerald-700 font-bold">%{(totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Specializations Table */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-[#0A2463] flex items-center gap-2 border-b border-slate-100 pb-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>📚 التخصصات والدبلومات الأكثر طلباً هذا الشهر</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2 border border-slate-200">الترتيب</th>
                    <th className="p-2 border border-slate-200">اسم الشعبة / القسم</th>
                    <th className="p-2 border border-slate-200">عدد الراغبين</th>
                    <th className="p-2 border border-slate-200">نسبة الإقبال</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDepts.map(([dept, count], idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-100 font-bold text-slate-500">#{idx + 1}</td>
                      <td className="p-2 border border-slate-100 font-extrabold text-slate-800">{dept}</td>
                      <td className="p-2 border border-slate-100 font-bold">{count} طالب</td>
                      <td className="p-2 border border-slate-100 text-amber-700 font-bold">%{(totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Ad Sources Table */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-[#0A2463] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Megaphone className="w-4 h-4 text-rose-500" />
              <span>📊 أداء الحملات الإعلانية ومصادر التسجيل (Ad Attribution & ROI Source)</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2 border border-slate-200">المصدر الإعلاني</th>
                    <th className="p-2 border border-slate-200">عدد المسجلين</th>
                    <th className="p-2 border border-slate-200">النسبة المئوية</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAdSources.map(([src, count], idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-100 font-extrabold text-slate-800">{src}</td>
                      <td className="p-2 border border-slate-100 font-bold">{count} طالب</td>
                      <td className="p-2 border border-slate-100 text-indigo-700 font-bold">%{(totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            إغلاق المعاينة
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-md flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>طباعة وتصدير كـ PDF الآن 🖨️</span>
          </button>
        </div>

      </div>
    </div>
  );
}
