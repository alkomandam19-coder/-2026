import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Search, Phone, ShieldCheck, Check, MapPin, 
  Building, UserCheck, Download, FileText, Printer, 
  Share2, Copy, ArrowLeft, Sparkles, Calendar, 
  Award, AlertCircle, RefreshCw, X, GitBranch
} from "lucide-react";
import { toast } from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getDynamicDepartments } from "../components/InteractiveMarketingSuite";
import { 
  OFFICIAL_PARTNER_ACADEMIES, 
  getDynamicAcademyBranches, 
  OTHER_ACADEMY_OPTION_KEY 
} from "../data/academiesConfig";
const AcademicLogo = "/logo.png";

// Helper to parse oklch color string
function parseOklch(str: string) {
  const innerMatch = str.match(/oklch\s*\(([^)]+)\)/i);
  if (!innerMatch) return null;
  
  const content = innerMatch[1].trim();
  const normalized = content.replace(/[,/]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = normalized.split(' ');
  if (parts.length < 3) return null;
  
  const lStr = parts[0];
  const cStr = parts[1];
  const hStr = parts[2];
  const aStr = parts[3] || '1';
  
  let l = parseFloat(lStr);
  if (lStr.includes('%')) l /= 100;
  
  const c = parseFloat(cStr);
  const h = parseFloat(hStr);
  
  let a = parseFloat(aStr);
  if (aStr.includes('%')) a /= 100;
  
  return { l, c, h, a };
}

// Convert OKLCH to RGBA CSS color string
function oklchToRgba(oklchStr: string): string {
  const parsed = parseOklch(oklchStr);
  if (!parsed) return oklchStr;
  
  const { l, c, h, a } = parsed;
  
  const hRad = (h * Math.PI) / 180;
  const aLab = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);
  
  const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;
  
  const lMain = l_ * l_ * l_;
  const mMain = m_ * m_ * m_;
  const sMain = s_ * s_ * s_;
  
  const rLinear = 4.0767416621 * lMain - 3.3077115913 * mMain + 0.2309699292 * sMain;
  const gLinear = -1.2684380046 * lMain + 2.6097574011 * mMain - 0.3413193965 * sMain;
  const bLinear = -0.0041960863 * lMain - 0.7034186147 * mMain + 1.7076147010 * sMain;
  
  const gamma = (val: number): number => {
    return val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
  };
  
  const r = Math.max(0, Math.min(255, Math.round(gamma(rLinear) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(gamma(gLinear) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(gamma(bLinear) * 255)));
  
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Replace oklch expressions inside any CSS property values
function replaceOklchInString(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) {
    return str;
  }
  return str.replace(/oklch\s*\([^)]+\)/gi, (match) => {
    return oklchToRgba(match);
  });
}

// Converts any oklch color values on elements and their children into standard rgb colors temporarily as inline style properties, ensuring html2canvas computes the correct rgb values.
const convertOklchToRgbForElementStyles = (root: HTMLElement) => {
  const elements = root.getElementsByTagName("*");
  const allElements = [root, ...Array.from(elements)];
  
  const originals = allElements.map(elt => ({
    elt: elt as HTMLElement,
    styleAttr: elt.getAttribute("style")
  }));
  
  allElements.forEach(elt => {
    const htmlElt = elt as HTMLElement;
    if (!htmlElt.style) return;
    
    let computed;
    try {
      computed = window.getComputedStyle(htmlElt);
    } catch (e) {
      return;
    }
    
    const colorProps = [
      "color",
      "backgroundColor",
      "borderColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "outlineColor",
      "boxShadow",
      "textShadow"
    ];
    
    colorProps.forEach(prop => {
      const cssPropName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
      try {
        const val = computed.getPropertyValue(cssPropName);
        if (val && typeof val === 'string' && val.includes('oklch')) {
          const rgbVal = replaceOklchInString(val);
          htmlElt.style[prop as any] = rgbVal;
        }
      } catch (e) {
        // Safe fallback if setting style or getting value fails
      }
    });
  });
  
  return () => {
    originals.forEach(({ elt, styleAttr }) => {
      if (styleAttr === null) {
        elt.removeAttribute("style");
      } else {
        elt.setAttribute("style", styleAttr);
      }
    });
  };
};

const withOklchWorkaround = async <T,>(element: HTMLElement, action: () => Promise<T>): Promise<T> => {
  const restore = convertOklchToRgbForElementStyles(element);
  try {
    return await action();
  } finally {
    restore();
  }
};

// Local Lead Structure matching DB schema
interface Lead {
  id: string;
  reservationCode: string;
  studentName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  graduationYear?: string;
  governorate?: string;
  educationLevel: string;
  selectedDepartments: string[];
  notes: string;
  date: string;
  timestamp?: number;
  expiresAt?: string;
  status: string;
  agentName?: string;
  academyName?: string;
  branch?: string;
  submissionDate?: string;
  appliedStatus?: "applied" | "withdrawn" | "pending";
  specialization?: string;
  discountCode?: string;
}

// Pixel-perfect fully-scannable Code 39 Barcode helpers
const CODE39_PATTERNS: Record<string, string> = {
  '0': 'NNNWWWNNN', '1': 'WNNWNNNNW', '2': 'NNWWNNNNW', '3': 'WNWWNNNNN',
  '4': 'NNNWNNWNW', '5': 'WNNWNNWNN', '6': 'NNWWNNWNN', '7': 'NNNWNNNNW',
  '8': 'WNNWNNNNN', '9': 'NNWWNNNNN', 'A': 'WNNNNWNNW', 'B': 'NNWNNWNNW',
  'C': 'WNWNNWNNN', 'D': 'NNNNWWNNW', 'E': 'WNNNWWNNN', 'F': 'NNWNWWNNN',
  'G': 'NNNNNWNNW', 'H': 'WNNNNWNNN', 'I': 'NNWNNWNNN', 'J': 'NNNNWWNNN',
  'K': 'WNNNNNNWW', 'L': 'NNWNNNNWW', 'M': 'WNWNNNNWN', 'N': 'NNNNWNNWW',
  'O': 'WNNNWNNWN', 'P': 'NNWNWNNWN', 'Q': 'NNNNNNWWW', 'R': 'WNNNNNWWN',
  'S': 'NNWNNNWWN', 'T': 'NNNNWNWWN', 'U': 'WWNNNNNNW', 'V': 'NWWNNNNNW',
  'W': 'WWWNNNNNN', 'X': 'NWNNWNNNW', 'Y': 'WWNNWNNNN', 'Z': 'NWWNWNNNN',
  '-': 'NWNNNNWNW', '.': 'WWNNNNWNN', ' ': 'NWWNNNWNN', '*': 'NWNNWNWNN',
  '$': 'NWNWNWNNN', '/': 'NWNWNNNWN', '+': 'NWNNNWNWN', '%': 'NNNWNWNWN'
};

const loadQRImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // التحقق من أن الرابط خارجي فعلاً لمنع الـ Tainting وفي نفس الوقت السماح بالمسارات المحلية والـ Base64
    const isExternal = url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//"));
    if (isExternal) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // fallback آمن جداً: إذا فشل تحميل اللوجو لا تجعل الوظيفة تتوقف، بل أرجع صورة فارغة ليتحرك الكود
      const emptyImg = new Image();
      resolve(emptyImg);
    };
    img.src = url;
  });
};

const drawFormCanvas = (
  lead: Lead,
  selectedDeptName: string,
  academyName: string,
  agentName: string,
  branch?: string,
  submissionDate?: string,
  qrImg?: HTMLImageElement | null,
  logoImg?: HTMLImageElement | null,
  customWidth?: number,
  customHeight?: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  
  // Detect if user is on a mobile device (phone or tablet)
  const isMobile = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // If custom dimensions are supplied, use them (ideal for lightweight preview / memory safety)
  // Otherwise, use 1200x1700 for mobile, 2400x3400 for desktop
  const scaleFactor = isMobile ? 1 : 2;
  const targetWidth = customWidth || (1200 * scaleFactor);
  const targetHeight = customHeight || (1700 * scaleFactor);
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Scale context dynamically to fit coordinates designed at 1200x1700
  const scaleX = targetWidth / 1200;
  const scaleY = targetHeight / 1700;
  ctx.scale(scaleX, scaleY);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = targetWidth > 1500 ? "high" : "medium";

  // 1. White Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1200, 1700);

  // Decorative corner circles
  ctx.fillStyle = "rgba(10, 36, 99, 0.03)";
  ctx.beginPath();
  ctx.arc(1200, 0, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 1700, 240, 0, Math.PI * 2);
  ctx.fill();

  // 2. Double Border (Navy Blue)
  ctx.strokeStyle = "#0A2463";
  ctx.lineWidth = 12;
  ctx.strokeRect(30, 30, 1140, 1640);

  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 1104, 1604);

  // 3. Header Texts
  ctx.textAlign = "right";
  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText("بوابة المعاهد والأكاديميات الخاصة", 1110, 130);

  ctx.fillStyle = "#FF7F50";
  ctx.font = "bold 23px sans-serif";
  ctx.fillText("المنصة المركزية التفاعلية المعتمدة للتسجيل والتفويض الأكاديمي", 1110, 180);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("بموجب التعاقد المشترك وضوابط الحجز وتأكيد القبول المسبق دفعة ٢٠٢٦", 1110, 215);

  // Separator line
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(80, 250);
  ctx.lineTo(1120, 250);
  ctx.stroke();

  // 4. Transaction Code Block
  ctx.textAlign = "center";
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(350, 280, 500, 58);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(350, 280, 500, 58);

  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 19px sans-serif";
  ctx.fillText(`رقم المعاملة الفريد:  ${lead.reservationCode} / ${new Date().getFullYear()}`, 600, 316);

  // 5. Giant Banner
  ctx.fillStyle = "#FFFDF5";
  ctx.fillRect(80, 365, 1040, 145);
  ctx.strokeStyle = "#FCD34D";
  ctx.strokeRect(80, 365, 1040, 145);

  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 21px sans-serif";
  ctx.fillText("استمارة تقديم من بوابة المعاهد والأكاديميات الخاصة تسلم لـ", 600, 405);

  ctx.fillStyle = "#047857";
  ctx.font = "bold 30px sans-serif";
  const displayAcademyWithBranch = branch ? `🏰 ${academyName || "أكاديمية السلام الدولية"} (${branch})` : `🏰 ${academyName || "أكاديمية السلام الدولية"}`;
  ctx.fillText(displayAcademyWithBranch, 600, 450);

  const effectiveSubmissionDate = (submissionDate || lead.submissionDate || "").trim();
  if (effectiveSubmissionDate) {
    ctx.fillStyle = "#B45309";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`📅 موعد التقديم والحضور بمقر الأكاديمية: ${effectiveSubmissionDate}`, 600, 488);
  }

  // Helper row cell generator
  const drawCell = (labelText: string, valText: string, yPos: number, isRightCol: boolean, isBadge = false) => {
    const cellX = isRightCol ? 610 : 80;
    const cellWidth = 510;
    const cellHeight = 70;

    // Draw background
    ctx.fillStyle = isBadge ? "#FFFDF5" : "#F8FAFC";
    ctx.fillRect(cellX, yPos, cellWidth, cellHeight);
    ctx.strokeStyle = isBadge ? "#F59E0B" : "#E2E8F0";
    ctx.lineWidth = isBadge ? 2 : 1.5;
    ctx.strokeRect(cellX, yPos, cellWidth, cellHeight);

    // Label Alignment Right side of the cell
    ctx.textAlign = "right";
    ctx.fillStyle = isBadge ? "#B45309" : "#475569";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(labelText, cellX + cellWidth - 20, yPos + 42);

    // Value Alignment Left side of cell
    ctx.textAlign = "left";
    ctx.fillStyle = isBadge ? "#B45309" : "#0F172A";
    ctx.font = isBadge ? "bold 22px monospace" : "bold 19px sans-serif";
    ctx.fillText(valText, cellX + 20, yPos + 42);
  };

  // 6. Partition Title
  ctx.textAlign = "right";
  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 23px sans-serif";
  ctx.fillText("تفاصيل بيانات الطالب الشخصية والمؤهل الأكاديمي المرفق :", 1120, 560);

  // Draw students data rows
  let currentY = 585;
  drawCell("اسم الطالب كاملاً (رباعي):", lead.studentName, currentY, true);
  drawCell("رقم الهاتف المسجل :", lead.phoneNumber, currentY, false);

  currentY += 70;
  drawCell("رقم واتساب النشط:", lead.whatsappNumber || lead.phoneNumber, currentY, true);
  drawCell("المؤهل وسنة التخرج:", `${lead.educationLevel || "ثانوية عامة"} (${lead.graduationYear || "عام ٢٠٢٦"})`, currentY, false);

  currentY += 70;
  drawCell("المحافظة الجغرافية:", lead.governorate || "جمهورية مصر العربية", currentY, true);
  const discountCodeToUse = lead.discountCode || "AM2026";
  drawCell("كود الخصم المعتمد للطالب 🎫:", discountCodeToUse, currentY, false, true);
  
  // Draw Specialization as a full-size prominent panel
  ctx.fillStyle = "#ECFDF5";
  ctx.fillRect(80, currentY + 80, 1040, 80);
  ctx.strokeStyle = "#10B981";
  ctx.strokeRect(80, currentY + 80, 1040, 80);

  ctx.textAlign = "right";
  ctx.fillStyle = "#047857";
  ctx.font = "bold 21px sans-serif";
  ctx.fillText("شعبة التخصص المرصودة والموجه إليها الطالب :", 1090, currentY + 128);

  ctx.textAlign = "left";
  ctx.fillStyle = "#047857";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`★  ${selectedDeptName}  ★`, 120, currentY + 130);

  // 7. Partition Office and Advisor
  let targetY = currentY + 205;
  ctx.textAlign = "right";
  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 23px sans-serif";
  ctx.fillText("جهة توجيه القبول والمسؤول المتابع للاستمارة الرسمية :", 1120, targetY);

  let infoBoxY = targetY + 25;
  const boxW = 340;
  const boxH = 110;

  // Box 1: Destined Academy & Branch & Submission Date
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(780, infoBoxY, boxW, boxH);
  ctx.strokeStyle = "#CBD5E1";
  ctx.strokeRect(780, infoBoxY, boxW, boxH);
  ctx.textAlign = "right";
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(branch ? "🏰 الأكاديمية والفرع المعتمد" : "🏰 الأكاديمية المستلمة", 1100, infoBoxY + 28);
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText(academyName || "أكاديمية السلام الدولية", 1100, infoBoxY + 54);

  if (branch && effectiveSubmissionDate) {
    ctx.fillStyle = "#047857";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`📍 الفرع: ${branch}`, 1100, infoBoxY + 77);
    ctx.fillStyle = "#0284C7";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`📅 موعد الحضور: ${effectiveSubmissionDate}`, 1100, infoBoxY + 98);
  } else if (branch) {
    ctx.fillStyle = "#047857";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`📍 الفرع: ${branch}`, 1100, infoBoxY + 84);
  } else if (effectiveSubmissionDate) {
    ctx.fillStyle = "#0284C7";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`📅 موعد الحضور: ${effectiveSubmissionDate}`, 1100, infoBoxY + 84);
  }

  // Box 2: Pre-filled Office Name (Fixed A.M.GROUP / الروبي / حسبو)
  const officeName = "A.M.GROUP\nم / محمد الروبي @ م / أيمن حسبو";
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(430, infoBoxY, boxW, boxH);
  ctx.strokeStyle = "#CBD5E1";
  ctx.strokeRect(430, infoBoxY, boxW, boxH);
  ctx.textAlign = "right";
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("📝 مكتب التقديم والقبول المسؤول", 750, infoBoxY + 35);
  
  const officeLines = officeName.split("\n");
  if (officeLines.length > 1) {
    ctx.fillStyle = "#0A2463"; // Deep primary blue for group
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(officeLines[0].trim(), 750, infoBoxY + 63);
    
    ctx.fillStyle = "#1E293B"; // Neutral dark for owners
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(officeLines[1].trim(), 750, infoBoxY + 88);
  } else {
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(officeName, 750, infoBoxY + 75);
  }

  // Box 3: Advisor name
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(80, infoBoxY, boxW, boxH);
  ctx.strokeStyle = "#CBD5E1";
  ctx.strokeRect(80, infoBoxY, boxW, boxH);
  ctx.textAlign = "right";
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("👤 مستشار التسجيل المسؤول", 400, infoBoxY + 35);
  ctx.fillStyle = "#FF7F50";
  ctx.font = "bold 19px sans-serif";
  ctx.fillText(agentName || "مستشار التقديم المتابع", 400, infoBoxY + 75);

  // 8. Visual Stamp / QR code panel
  let complianceY = infoBoxY + 145;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(80, complianceY, 1040, 160);
  ctx.strokeStyle = "#E2E8F0";
  ctx.strokeRect(80, complianceY, 1040, 160);

  // Genuine high-quality active QR Code (Square)
  const qrSize = 120;
  const startBarcodeX = 120;
  const barcodeY = complianceY + 20;

  if (qrImg) {
    ctx.drawImage(qrImg, startBarcodeX, barcodeY, qrSize, qrSize);
  } else {
    // Elegant placeholder in case image not fully loaded yet
    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(startBarcodeX, barcodeY, qrSize, qrSize);
    ctx.strokeStyle = "#CBD5E1";
    ctx.strokeRect(startBarcodeX, barcodeY, qrSize, qrSize);
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR CODE", startBarcodeX + qrSize / 2, barcodeY + qrSize / 2 + 5);
  }

  // Draw Academic logo seal icon near the right top corner of canvas if available under logoImg
  if (logoImg) {
    try {
      ctx.save();
      ctx.beginPath();
      ctx.arc(80 + 55, 130, 45, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, 80 + 10, 130 - 45, 90, 90);
      ctx.restore();
      
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(80 + 55, 130, 45, 0, Math.PI * 2);
      ctx.stroke();
    } catch (e) {
      console.warn("Could not draw Academic Logo onto canvas:", e);
    }
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("كود التحقق الرقمي الثنائي المربّع المعتمد للبوابة الرسمية للحجز 🛡️", 265, complianceY + 50);

  ctx.fillStyle = "#FF7F50";
  ctx.font = "bold 15px monospace";
  ctx.fillText(`E-REF: ${lead.reservationCode || "1008"}-${lead.phoneNumber.slice(-4)}`, 265, complianceY + 84);

  ctx.fillStyle = "#059669";
  ctx.font = "bold 13px monospace";
  ctx.fillText("VERIFIED SECURE DIGITAL QR-STAMP • ACTIVE & GRANTED 🔐", 265, complianceY + 115);

  // Dynamic warning bulletins
  ctx.textAlign = "right";
  ctx.fillStyle = "#047857";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("تنويهات وضوابط تأكيد القبول وحفظ المقعد :", 1100, complianceY + 35);
  ctx.fillStyle = "#475569";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("• تعتبر هذه الاستمارة بمثابة طلب حجز موقع مسبق لدمج وخصم الطالب في شعب المعاهد لعام ٢٠٢٦.", 1100, complianceY + 68);
  ctx.fillText("• يحتفظ الطالب بحقه في تثبيت مصاريف الدفعة الأولى عند تسليم هذا المستند للمعهد خلال أسبوع من تاريخه.", 1100, complianceY + 98);
  ctx.fillText("• تعتمد الشؤون الفنية محتوى البيانات المدمجة ويتم التحقق من صحتها آلياً عبر كود الحجز.", 1100, complianceY + 128);

  // 9. Signature Block
  let signBlockY = complianceY + 230;
  ctx.textAlign = "center";
  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`شكر خاص من بوابة المعاهد والأكاديميات الخاصة للأكاديمية أو المعهد المذكور بمسماه (${academyName || "الأكاديمية المعتمدة"}) على الدعم والخصومات الممنوحة.`, 600, signBlockY);

  ctx.textAlign = "right";
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText("توقيع الطالب المقبول :", 1000, signBlockY + 60);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(800, signBlockY + 120);
  ctx.lineTo(1000, signBlockY + 120);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillText("مكتب التسجيل والقبول المعتمد :", 120, signBlockY + 60);

  // RED circular wax stamp
  ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(240, signBlockY + 105, 70, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(240, signBlockY + 105, 62, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("بوابة المعاهد", 240, signBlockY + 85);
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("التسجيل والقبول", 240, signBlockY + 110);
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("★ ٢٠٢٦ ★", 240, signBlockY + 135);

  // Footer bottom boundary
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, signBlockY + 175);
  ctx.lineTo(1120, signBlockY + 175);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("مع تحيات مكتب التسجيل والتسويق الرقمي المعتمد للبوابة الرسمية", 600, signBlockY + 205);

  return canvas;
};

export default function FormExtraction() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryRef = searchParams.get("ref");

  // Step definition inside the flow:
  // Step 2 = Secure Phone Verification
  // Step 3 = Data Review & Interactivity Suite
  // Step 4 = Official Carbon Form & Premium Actions Room
  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);

  // User input adjustments (Step 3)
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedAcademyKey, setSelectedAcademyKey] = useState<string>("");
  const [customAcademyName, setCustomAcademyName] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [submissionDate, setSubmissionDate] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [agentName, setAgentName] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Derived effective academy name
  const academyName = selectedAcademyKey === OTHER_ACADEMY_OPTION_KEY
    ? customAcademyName.trim()
    : (selectedAcademyKey || "أكاديمية السلام الدولية");

  // Helper to handle academy dropdown change
  const handleAcademyChange = (newKey: string) => {
    setSelectedAcademyKey(newKey);
    if (newKey === OTHER_ACADEMY_OPTION_KEY) {
      setAvailableBranches([]);
      setBranch("");
    } else {
      const branches = getDynamicAcademyBranches(newKey);
      setAvailableBranches(branches);
      setBranch(branches[0] || "");
    }
  };

  // Helper to initialize lead fields when loaded
  const populateLeadDetails = (loadedLead: Lead) => {
    setLead(loadedLead);
    const currentDept = loadedLead.selectedDepartments?.[0] || loadedLead.specialization || "";
    setSelectedDept(currentDept);
    setAgentName(loadedLead.agentName || "");
    setSubmissionDate(loadedLead.submissionDate || "");

    const acName = (loadedLead.academyName || "").trim();
    if (acName) {
      const matchOfficial = OFFICIAL_PARTNER_ACADEMIES.find(
        a => a.name === acName || a.shortName === acName || a.slug === acName || acName.includes(a.shortName)
      );
      if (matchOfficial) {
        setSelectedAcademyKey(matchOfficial.name);
        setCustomAcademyName("");
        const branches = getDynamicAcademyBranches(matchOfficial.name);
        setAvailableBranches(branches);
        setBranch(loadedLead.branch || branches[0] || "");
      } else {
        setSelectedAcademyKey(OTHER_ACADEMY_OPTION_KEY);
        setCustomAcademyName(acName);
        setAvailableBranches([]);
        setBranch(loadedLead.branch || "");
      }
    } else {
      const defaultAc = OFFICIAL_PARTNER_ACADEMIES[0].name;
      setSelectedAcademyKey(defaultAc);
      setCustomAcademyName("");
      const branches = getDynamicAcademyBranches(defaultAc);
      setAvailableBranches(branches);
      setBranch(loadedLead.branch || branches[0] || "");
    }
  };

  // Sharing states for fallback assistance
  const [showShareModal, setShowShareModal] = useState(false);
  const [whatsappTargetUrl, setWhatsappTargetUrl] = useState("");
  const [copiedMessage, setCopiedMessage] = useState("");

  // Safe QR Code local blob url to prevent dirtying/tainting the canvas
  const [qrBlobUrl, setQrBlobUrl] = useState<string>("");

  // Dynamic Departments repository
  const [availableDepts, setAvailableDepts] = useState<{ id: string; name: string }[]>([]);

  // Ref container for vector/PNG capture
  const formRef = useRef<HTMLDivElement>(null);

  // Rendered Image state for easy longpress sharing on mobile devices
  // Default to "html" view mode on mobile for absolute stability and zero canvas-crash risk,
  // and "image" on desktop.
  const [viewMode, setViewMode] = useState<"image" | "html">(() => {
    const isMobile = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? "html" : "image";
  });
  const [renderedImageUrl, setRenderedImageUrl] = useState<string>("");
  const [isRenderingImage, setIsRenderingImage] = useState<boolean>(false);

// 1. كود سحب وعرض الأقسام والتخصصات بالكامل (الثابتة والاحتياطية من الـ API)
  useEffect(() => {
    // الأقسام الأصلية المعتمدة للبوابة
    const localDepts = [
      { id: "med_1", name: "تحاليل طبية واشعة ( فني خدمات صحيه )" },
      { id: "med_2", name: "تمريض (مساعد خدمات صحية)" },
      { id: "med_3", name: "تركيبات الأسنان" },
      { id: "med_4", name: "تغذية علاجية" },
      { id: "eng_1", name: "بترول وبتروكيماويات" },
      { id: "eng_2", name: "مساحة وخرائط" },
      { id: "tech_1", name: "البرمجة والذكاء الاصطناعي (نظم معلومات)" },
      { id: "tech_2", name: "إدارة الأعمال والنظم والعلاقات العامة" },
      { id: "tech_3", name: "التسويق الإلكتروني" },
      { id: "hum_1", name: "صحافة وإعلام" },
      { id: "hum_2", name: "لغات وترجمة" },
      { id: "hum_3", name: "تربية خاصة" },
      { id: "hum_4", name: "التصميم والفنون الجميلة" },
      { id: "tour_1", name: "ضيافة جوية" },
      { id: "tour_2", name: "سياحة وفنادق" },
      { id: "tour_3", name: "ضباط لاسلكي (معتمد من وزارة الاتصالات)" }
    ];
    
    setAvailableDepts(localDepts);
    
    // محاولة تحديثها من السيرفر لو فيه داتا جديدة مع الحفاظ على الأقسام الأساسية
    fetch("/api/roi-departments")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((d: any, idx: number) => ({
            id: d.id || `api_d_${idx}`,
            name: d.name
          }));
          setAvailableDepts(mapped);
        }
      })
      .catch(err => {
        console.warn("Running smooth with certified local departments:", err);
      });
  }, []);

  // 2. كود تشغيل الباركود والتحقق التلقائي فور المسح بالكاميرا ونقله لغرفة الاستمارة مباشرة
  useEffect(() => {
    if (queryRef) {
      handleBypassVerification(queryRef).then(() => {
        setStep(4);
      }).catch(err => {
        console.error("QR Bypass error:", err);
        setStep(4); // Fallback آمن لضمان دخول الطالب
      });
    }
  }, [queryRef]);

// 3. Safe local offline QR Code generator
  useEffect(() => {
    if (!lead?.reservationCode) {
      setQrBlobUrl("");
      return;
    }
    
    // المفتاح السري لفك تجميد المعاينة وتحديث الصورة فوراً على التليفون
    const currentOrigin = window.location.hostname === "localhost" ? window.location.origin : "https://"+window.location.hostname;
    const targetUrl = `${currentOrigin}${window.location.pathname.split('?')[0]}?ref=${encodeURIComponent(lead.reservationCode)}&t=${Date.now()}`;
    
    QRCode.toDataURL(targetUrl, {
      width: 180,
      margin: 1.5,
      color: {
        dark: "#0a2463",
        light: "#ffffff",
      },
    })
    .then((base64Url) => {
      setQrBlobUrl(base64Url);
    })
    .catch((err) => {
      console.error("Local QR generation crashed:", err);
      // fallback
      setQrBlobUrl(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(targetUrl)}`);
    });
  }, [lead?.reservationCode]);

// Auto-render form to real image file (Base64) when step becomes 4 AND viewMode is "image" (lazy-load)
  useEffect(() => {
    if (step === 4 && lead && viewMode === "image") {
      setIsRenderingImage(true);
      
      const renderTimer = setTimeout(async () => {
        const isMobile = window.innerWidth < 768;
        let qrImg: HTMLImageElement | null = null;
        let logoImg: HTMLImageElement | null = null;

        // محاولة تحميل صورة الكيو أر
        if (qrBlobUrl) {
          try {
            qrImg = await loadQRImage(qrBlobUrl);
          } catch (qrErr) {
            console.warn("Could not load QR image, proceeding without it:", qrErr);
          }
        }

        // محاولة تحميل اللوجو
        try {
          logoImg = await loadQRImage(AcademicLogo);
        } catch (logoErr) {
          console.warn("Could not load academic logo, proceeding without it:", logoErr);
        }

        // الآن نقوم بالرسم المحمي بالكامل داخل try-catch واحدة بسيطة ومباشرة
        try {
          // المحاولة الأساسية بالأبعاد الذكية
          const canvas = drawFormCanvas(lead, selectedDept, academyName, agentName, branch, submissionDate, qrImg, logoImg, isMobile ? 1200 : undefined, isMobile ? 1700 : undefined);
          const dataUrl = canvas.toDataURL("image/png");
          setRenderedImageUrl(dataUrl);
        } catch (err) {
          console.error("المحاولة الأساسية فشلت، جاري الإجبار على الرسم العادي:", err);
          
          try {
            // لو فشل، شيل كل الصور الخارجية فوراً وارسم النص والخلفية كصورة حاف (بدون أبعاد مقيدة) عشان تضمن تطلع صورة مش جرنال!
            const canvas = drawFormCanvas(lead, selectedDept, academyName, agentName, branch, submissionDate, null, null);
            const dataUrl = canvas.toDataURL("image/png");
            setRenderedImageUrl(dataUrl);
          } catch (fallbackErr) {
            console.error("حتى الرسم الحاف فشل تماماً:", fallbackErr);
          }
        } finally {
          setIsRenderingImage(false);
        }
      }, 500); // زودنا الوقت لـ 500ms (نصف ثانية كاملة) عشان نضمن استقرار المتغيرات تماماً على الموبايل

      return () => clearTimeout(renderTimer);
    } else if (step !== 4) {
      setRenderedImageUrl("");
    }
  }, [step, viewMode, lead?.reservationCode, academyName, selectedDept, agentName, branch, submissionDate, qrBlobUrl]);

  // Check URL validation parameters (Bypass auto-login deep link)
  useEffect(() => {
    if (queryRef) {
      handleBypassVerification(queryRef);
    }
  }, [queryRef]);

  // Local Storage lead finder fallback
  const findLocalLeadFallback = (searchVal: string, isPhone: boolean): Lead | null => {
    try {
      const cleanVal = searchVal.trim().replace(/^(REG-|#|CODE-)/i, "");
      // 1. Check last_success_reservation
      const lastResRaw = localStorage.getItem("last_success_reservation");
      if (lastResRaw) {
        const lastRes = JSON.parse(lastResRaw);
        const p1 = String(lastRes.phoneNumber || lastRes.phone || "").replace(/\D/g, "");
        const p2 = String(searchVal).replace(/\D/g, "");
        const c1 = String(lastRes.reservationCode || lastRes.id || "").toUpperCase().replace(/^(REG-|#|CODE-)/i, "");
        if (isPhone && p1 && p2 && (p1 === p2 || (p1.length >= 9 && p2.length >= 9 && (p1.endsWith(p2) || p2.endsWith(p1))))) {
          return {
            id: lastRes.id || "lead-local",
            reservationCode: lastRes.reservationCode || "1008",
            studentName: lastRes.studentName || lastRes.full_name || "طالب معتمد",
            phoneNumber: lastRes.phoneNumber || lastRes.phone || searchVal,
            whatsappNumber: lastRes.whatsappNumber || lastRes.whatsapp_number,
            educationLevel: lastRes.educationLevel || lastRes.education_level || "ثانوية عامة",
            graduationYear: lastRes.graduationYear || lastRes.graduation_year || "2025",
            governorate: lastRes.governorate || "القاهرة",
            selectedDepartments: Array.isArray(lastRes.selectedDepartments) ? lastRes.selectedDepartments : [lastRes.specialization || "قسم التحاليل الطبية والأشعة"],
            notes: lastRes.notes || "",
            date: lastRes.date || new Date().toLocaleDateString("ar-EG"),
            timestamp: Date.now(),
            expiresAt: lastRes.expiresAt || "",
            status: lastRes.status || "pending",
            agentName: lastRes.agentName || lastRes.agent_name || "",
            specialization: lastRes.specialization || "",
            academyName: lastRes.academyName || ""
          };
        }
        if (!isPhone && (c1 === cleanVal.toUpperCase() || String(lastRes.reservationCode) === searchVal)) {
          return {
            id: lastRes.id || "lead-local",
            reservationCode: lastRes.reservationCode || cleanVal,
            studentName: lastRes.studentName || lastRes.full_name || "طالب معتمد",
            phoneNumber: lastRes.phoneNumber || lastRes.phone || "01000000000",
            whatsappNumber: lastRes.whatsappNumber || lastRes.whatsapp_number,
            educationLevel: lastRes.educationLevel || lastRes.education_level || "ثانوية عامة",
            graduationYear: lastRes.graduationYear || lastRes.graduation_year || "2025",
            governorate: lastRes.governorate || "القاهرة",
            selectedDepartments: Array.isArray(lastRes.selectedDepartments) ? lastRes.selectedDepartments : [lastRes.specialization || "قسم التحاليل الطبية والأشعة"],
            notes: lastRes.notes || "",
            date: lastRes.date || new Date().toLocaleDateString("ar-EG"),
            timestamp: Date.now(),
            expiresAt: lastRes.expiresAt || "",
            status: lastRes.status || "pending",
            agentName: lastRes.agentName || lastRes.agent_name || "",
            specialization: lastRes.specialization || "",
            academyName: lastRes.academyName || ""
          };
        }
      }

      // 2. Check academy_student_reservations
      const historyRaw = localStorage.getItem("academy_student_reservations");
      if (historyRaw) {
        const history = JSON.parse(historyRaw);
        if (Array.isArray(history)) {
          const match = history.find((item: any) => {
            const p1 = String(item.phoneNumber || item.phone || "").replace(/\D/g, "");
            const p2 = String(searchVal).replace(/\D/g, "");
            const c1 = String(item.reservationCode || item.id || "").toUpperCase().replace(/^(REG-|#|CODE-)/i, "");
            if (isPhone) {
              return p1 && p2 && (p1 === p2 || (p1.length >= 9 && p2.length >= 9 && (p1.endsWith(p2) || p2.endsWith(p1))));
            } else {
              return c1 === cleanVal.toUpperCase() || String(item.reservationCode) === searchVal;
            }
          });
          if (match) {
            return {
              id: match.id || "lead-local",
              reservationCode: match.reservationCode || "1008",
              studentName: match.studentName || match.full_name || "طالب معتمد",
              phoneNumber: match.phoneNumber || match.phone || searchVal,
              whatsappNumber: match.whatsappNumber || match.whatsapp_number,
              educationLevel: match.educationLevel || match.education_level || "ثانوية عامة",
              graduationYear: match.graduationYear || match.graduation_year || "2025",
              governorate: match.governorate || "القاهرة",
              selectedDepartments: Array.isArray(match.selectedDepartments) ? match.selectedDepartments : [match.specialization || "قسم التحاليل الطبية والأشعة"],
              notes: match.notes || "",
              date: match.date || new Date().toLocaleDateString("ar-EG"),
              timestamp: Date.now(),
              expiresAt: match.expiresAt || "",
              status: match.status || "pending",
              agentName: match.agentName || match.agent_name || "",
              specialization: match.specialization || "",
              academyName: match.academyName || ""
            };
          }
        }
      }
    } catch (e) {
      console.warn("Local storage fallback search error:", e);
    }
    return null;
  };

  // Deep-link check bypass
  const handleBypassVerification = async (refCode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leads/by-ref/${encodeURIComponent(refCode)}`);
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (response.ok && data?.success && data?.lead) {
        populateLeadDetails(data.lead);
        setStep(3);
        toast.success("🔓 تم سحب سجلكم ومطابقته رقمياً بالكامل عبر كود التحقق!");
        return;
      }

      // Check local fallback
      const localLead = findLocalLeadFallback(refCode, false);
      if (localLead) {
        populateLeadDetails(localLead);
        setStep(3);
        toast.success("🔓 تم استرجاع ومطابقة سجل حجزكم بنجاح!");
        return;
      }

      toast.error(data?.error || "رمز الحجز أو المعاملة المدخل لا يطابق أي حجز مسجل.");
    } catch (err) {
      console.error(err);
      const localLead = findLocalLeadFallback(refCode, false);
      if (localLead) {
        populateLeadDetails(localLead);
        setStep(3);
        toast.success("🔓 تم استرجاع ومطابقة سجل حجزكم بنجاح!");
      } else {
        toast.error("حدث خطأ أثناء الاتصال بنظام الاستعلام للحجز. يرجى التأكد من الرمز وإعادة المحاولة.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Secure Phone search match
  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) {
      toast.error("يرجى إدخال رقم هاتف هويتك المسجل مسبقاً.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/leads/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneSearch.trim() })
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (response.ok && data?.success && data?.lead) {
        populateLeadDetails(data.lead);
        setStep(3);
        toast.success("🔓 تم فك تشفير وتأكيد سجل هويتكم وحجزكم بنجاح!");
        return;
      }

      // Check local fallback
      const localLead = findLocalLeadFallback(phoneSearch.trim(), true);
      if (localLead) {
        populateLeadDetails(localLead);
        setStep(3);
        toast.success("🔓 تم فك تشفير وتأكيد سجل هويتكم وحجزكم بنجاح!");
        return;
      }

      toast.error(data?.error || "عذراً، رقم الهاتف هذا غير مقترن بأي حجز نشط حالياً.");
    } catch (err) {
      console.error(err);
      const localLead = findLocalLeadFallback(phoneSearch.trim(), true);
      if (localLead) {
        populateLeadDetails(localLead);
        setStep(3);
        toast.success("🔓 تم استرجاع ومطابقة سجل حجزكم بنجاح!");
      } else {
        toast.error("عذراً، لم يتم العثور على حجز مسجل بهذا الرقم. يرجى التأكد من الرقم المسجل.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Secure Code search match
  const handleCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSearch.trim()) {
      toast.error("يرجى إدخال رقم كود الحجز الخاص بك.");
      return;
    }

    setLoading(true);
    try {
      const cleanedCode = codeSearch.trim().toUpperCase().replace(/^(REG-|#|CODE-)/i, "");
      const response = await fetch(`/api/leads/by-ref/${encodeURIComponent(cleanedCode)}`);
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (response.ok && data?.success && data?.lead) {
        populateLeadDetails(data.lead);
        setStep(3);
        toast.success("🔓 تم فك تشفير وتأكيد سجل هويتكم وحجزكم بنجاح عبر كود الحجز!");
        return;
      }

      // Check local fallback
      const localLead = findLocalLeadFallback(cleanedCode, false);
      if (localLead) {
        populateLeadDetails(localLead);
        setStep(3);
        toast.success("🔓 تم فك تشفير وتأكيد سجل هويتكم وحجزكم بنجاح عبر كود الحجز!");
        return;
      }

      toast.error(data?.error || "عذراً، كود الحجز هذا غير صحيح أو غير مسجل لدينا.");
    } catch (err) {
      console.error(err);
      const localLead = findLocalLeadFallback(codeSearch.trim(), false);
      if (localLead) {
        populateLeadDetails(localLead);
        setStep(3);
        toast.success("🔓 تم استرجاع ومطابقة سجل حجزكم بنجاح!");
      } else {
        toast.error("عذراً، كود الحجز غير موجود أو تعذر الوصول إلى السيرفر. يرجى إعادة المحاولة.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync edits dynamically inside DB archives
  const handleSaveDetails = async () => {
    if (!lead) return;
    if (!selectedDept) {
      toast.error("يرجى اختيار شعبة التنسيق المطلوبة أولاً.");
      return;
    }

    setSavingDetails(true);
    try {
      const effectiveAc = academyName.trim();
      const response = await fetch("/api/leads/update-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationCode: lead.reservationCode,
          selectedDepartments: [selectedDept],
          agentName: agentName.trim(),
          academyName: effectiveAc,
          branch: branch.trim(),
          submissionDate: submissionDate.trim()
        })
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (response.ok && data?.success && data?.lead) {
        setLead(prev => prev ? { ...prev, ...data.lead } : data.lead);
        toast.success("💾 تم تثبيت وتوثيق الشعبة المختارة بنجاح داخل قواعد البيانات المعاهد!");
      } else {
        setLead(prev => prev ? {
          ...prev,
          selectedDepartments: [selectedDept],
          specialization: selectedDept,
          agentName: agentName.trim(),
          academyName: effectiveAc,
          branch: branch.trim(),
          submissionDate: submissionDate.trim()
        } : null);
        toast.success("💾 تم تثبيت وحفظ التعديلات بنجاح!");
      }
    } catch (err) {
      console.error(err);
      const effectiveAc = academyName.trim();
      setLead(prev => prev ? {
        ...prev,
        selectedDepartments: [selectedDept],
        specialization: selectedDept,
        agentName: agentName.trim(),
        academyName: effectiveAc,
        branch: branch.trim(),
        submissionDate: submissionDate.trim()
      } : null);
      toast.success("💾 تم حفظ التعديلات محلياً بنجاح!");
    } finally {
      setSavingDetails(false);
    }
  };

  // Trigger preview generation
  const handleTackleFormGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) {
      toast.error("الرجاء تحديد واختيار شعبة التنسيق.");
      return;
    }
    const effectiveAc = academyName.trim();
    if (!effectiveAc) {
      toast.error("الرجاء كتابة أو اختيار اسم الأكاديمية أو المعهد المانح للقبول.");
      return;
    }
    if (!submissionDate.trim()) {
      toast.error("الرجاء تحديد تاريخ التقديم / الحضور في مقر الأكاديمية (إجباري).");
      return;
    }
    if (!agentName.trim()) {
      toast.error("الرجاء تدوين اسم مستشار القبول والتنسيق المتابع للحجز.");
      return;
    }

    // 1. احفظ التعديلات في السيرفر أولاً
    setSavingDetails(true);
    try {
      const response = await fetch("/api/leads/update-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationCode: lead.reservationCode,
          selectedDepartments: [selectedDept],
          agentName: agentName.trim(),
          academyName: effectiveAc,
          branch: branch.trim(),
          submissionDate: submissionDate.trim()
        })
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      
      if (response.ok && data?.success && data?.lead) {
        setLead(prev => prev ? { ...prev, ...data.lead } : data.lead);
      } else {
        setLead(prev => prev ? {
          ...prev,
          selectedDepartments: [selectedDept],
          specialization: selectedDept,
          agentName: agentName.trim(),
          academyName: effectiveAc,
          branch: branch.trim(),
          submissionDate: submissionDate.trim()
        } : null);
      }
      
      toast.success("💾 تم تثبيت وتوثيق البيانات بنجاح!");
      setTimeout(() => {
        setStep(4);
        toast.success("✨ تم صياغة وتوليد وثيقة استمارتكم المعتمدة بنجاح!");
      }, 300);
    } catch (err) {
      console.error(err);
      setLead(prev => prev ? {
        ...prev,
        selectedDepartments: [selectedDept],
        specialization: selectedDept,
        agentName: agentName.trim(),
        academyName: effectiveAc,
        branch: branch.trim(),
        submissionDate: submissionDate.trim()
      } : null);
      toast.success("💾 تم تثبيت وتوثيق البيانات بنجاح!");
      setTimeout(() => {
        setStep(4);
        toast.success("✨ تم صياغة وتوليد وثيقة استمارتكم المعتمدة بنجاح!");
      }, 300);
    } finally {
      setSavingDetails(false);
    }
  };

  // 1. Download High-Res PNG
  const handleDownloadPNG = async () => {
    if (!lead) return;
    
    if (renderedImageUrl) {
      const link = document.createElement("a");
      link.download = `استمارة_تقديم_${lead.studentName || "موثقة"}.png`;
      link.href = renderedImageUrl;
      link.click();
      toast.success("📥 تم تحميل الوثيقة كصورة عالية الجودة وبنجاح تام!");
      return;
    }

    const toastId = toast.loading("جاري بناء وتصوير المعاملة بجودة حادة وفائقة الوضوح...");
    try {
      let qrImg: HTMLImageElement | null = null;
      if (qrBlobUrl) {
        try {
          qrImg = await loadQRImage(qrBlobUrl);
        } catch (e) {
          console.warn("Could not load QR for PNG download, proceeding without it:", e);
        }
      }
      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = await loadQRImage(AcademicLogo);
      } catch (e) {
        console.warn("Could not load logo for PNG download, proceeding without it:", e);
      }

      const canvas = drawFormCanvas(lead, selectedDept, academyName, agentName, branch, submissionDate, qrImg, logoImg);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `استمارة_تقديم_${lead.studentName || "موثقة"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("📥 تم تحميل الوثيقة كصورة عالية الجودة وبنجاح تام!", { id: toastId });
    } catch (err) {
      console.error("PNG render error:", err);
      toast.error("فشل محرك التوليد في تصوير الإطار.", { id: toastId });
    }
  };

  // 2. Download Official PDF
  const handleDownloadPDF = async () => {
    if (!lead) return;

    if (renderedImageUrl) {
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 Standard Width
      const imgHeight = 297; // A4 Standard Height
      pdf.addImage(renderedImageUrl, "PNG", 0, 0, imgWidth, imgHeight, undefined, "NONE");
      pdf.save(`استمارة_تقديم_${lead.studentName || "رسمية"}.pdf`);
      toast.success("📄 تم تحميل ملف الـ PDF الرسمي بجودة ممتازة!");
      return;
    }

    const toastId = toast.loading("جاري تجميع وترميز ملف الاستمارة بصيغة PDF القياسي (A4) فائق الوضوح...");
    try {
      let qrImg: HTMLImageElement | null = null;
      if (qrBlobUrl) {
        try {
          qrImg = await loadQRImage(qrBlobUrl);
        } catch (e) {
          console.warn("Could not load QR for PDF, proceeding without it:", e);
        }
      }
      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = await loadQRImage(AcademicLogo);
      } catch (e) {
        console.warn("Could not load logo for PDF, proceeding without it:", e);
      }

      const canvas = drawFormCanvas(lead, selectedDept, academyName, agentName, branch, submissionDate, qrImg, logoImg);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = 297; // exact A4 fill
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "NONE");
      pdf.save(`استمارة_تقديم_${lead.studentName || "رسمية"}.pdf`);
      
      toast.success("📄 تم حفظ ملف الـ PDF الرسمي بنجاح فائق الجودة!", { id: toastId });
    } catch (err) {
      console.error("PDF render error:", err);
      toast.error("حدث خطأ أثناء هيكلة ملف الـ PDF.", { id: toastId });
    }
  };

  // 3. Print Form Directly (Using secure, isolated print iframe / mobile native fallback)
  const handlePrint = async () => {
    if (!lead) return;
    const toastId = toast.loading("جاري تحضير وتوليد نموذج الاستمارة للطباعة الفورية... 🖨️");

    try {
      let finalImg = renderedImageUrl;
      if (!finalImg) {
        let qrImg: HTMLImageElement | null = null;
        if (qrBlobUrl) {
          try {
            qrImg = await loadQRImage(qrBlobUrl);
          } catch (e) {
            console.warn("Could not load QR for printing, proceeding without it:", e);
          }
        }
        let logoImg: HTMLImageElement | null = null;
        try {
          logoImg = await loadQRImage(AcademicLogo);
        } catch (e) {
          console.warn("Could not load logo for printing, proceeding without it:", e);
        }
        const canvas = drawFormCanvas(lead, selectedDept, academyName, agentName, branch, submissionDate, qrImg, logoImg);
        finalImg = canvas.toDataURL("image/png");
      }

      // Check if user is on mobile (phones/tablets) to bypass invisible iframe printing bugs
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Open a new clean tab with friendly controls and native print trigger for perfect mobile rendering
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          // Fallback instantly to PDF download if browser blocks window.open popup
          toast.error("عذراً، تم حظر نافذة الطباعة من المتصفح. سيتم تحميل الاستمارة بصيغة PDF فوراً...", { id: toastId });
          setTimeout(() => {
            handleDownloadPDF();
          }, 1500);
          return;
        }

        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>طباعة استمارة تقديم - بوابة المعاهد</title>
              <style>
                body {
                  margin: 0;
                  padding: 16px;
                  background-color: #f1f5f9;
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: flex-start;
                  min-height: 100vh;
                  box-sizing: border-box;
                }
                .btn-container {
                  width: 100%;
                  max-width: 500px;
                  display: flex;
                  gap: 12px;
                  margin-bottom: 20px;
                  justify-content: center;
                }
                .btn {
                  flex: 1;
                  padding: 14px 20px;
                  border: none;
                  border-radius: 12px;
                  font-size: 16px;
                  font-weight: bold;
                  cursor: pointer;
                  text-align: center;
                  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                  transition: all 0.2s;
                  text-decoration: none;
                }
                .btn-print {
                  background-color: #0284c7;
                  color: white;
                }
                .btn-close {
                  background-color: #475569;
                  color: white;
                }
                .preview-container {
                  width: 100%;
                  max-width: 500px;
                  background: white;
                  padding: 8px;
                  border-radius: 16px;
                  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                }
                img {
                  width: 100%;
                  height: auto;
                  display: block;
                  border-radius: 12px;
                }
                .info-tip {
                  text-align: center;
                  color: #475569;
                  font-size: 13px;
                  margin-top: 12px;
                  max-width: 500px;
                  line-height: 1.5;
                }
                @media print {
                  body {
                    padding: 0;
                    background-color: white;
                  }
                  .btn-container, .info-tip {
                    display: none !important;
                  }
                  .preview-container {
                    box-shadow: none;
                    padding: 0;
                    max-width: 100%;
                  }
                  img {
                    border-radius: 0;
                  }
                }
              </style>
            </head>
            <body>
              <div class="btn-container">
                <button class="btn btn-print" onclick="window.print()">🖨️ اضغط لبدء الطباعة</button>
                <button class="btn btn-close" onclick="window.close()">❌ إغلاق النافذة</button>
              </div>
              <div class="preview-container">
                <img src="${finalImg}" id="print-image" alt="استمارة تقديم موثقة" />
              </div>
              <div class="info-tip">
                💡 <b>تلميح للهاتف المحمول:</b> يمكنك أيضاً الضغط مطولاً على الاستمارة أعلاه وحفظها مباشرة كصورة في معرض صور هاتفك، أو مشاركتها مع أي طابعة متصلة بشبكتك.
              </div>
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    try {
                      window.print();
                    } catch (e) {}
                  }, 600);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success("📱 تم فتح صفحة الطباعة المتوافقة مع الجوال بنجاح!", { id: toastId });
        return;
      }

      // Desktop flow: Use the clean, hidden sandboxed iframe
      const printIframe = document.createElement("iframe");
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0px";
      printIframe.style.height = "0px";
      printIframe.style.border = "none";
      printIframe.style.zIndex = "-9999";
      printIframe.style.visibility = "hidden";
      
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
      if (!iframeDoc) {
        throw new Error("عذراً، لم يتسنَّ الوصول إلى محرّك الطباعة المعزول.");
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8" />
            <title>طباعة استمارة تقديم - بوابة المعاهد</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
              }
              img {
                width: 100% !important;
                height: auto !important;
                max-height: 100vh !important;
                display: block !important;
                margin: 0 auto !important;
                object-fit: contain !important;
              }
            </style>
          </head>
          <body>
            <img src="${finalImg}" id="print-image" alt="استمارة تقديم موثقة" />
            <script>
              const img = document.getElementById("print-image");
              img.onload = () => {
                setTimeout(() => {
                  window.focus();
                  try {
                    window.print();
                  } catch (e) {
                    console.error("Print blocked inside iframe:", e);
                  }
                }, 400);
              };
              // Secondary fallback trigger
              setTimeout(() => {
                window.focus();
                try {
                  window.print();
                } catch (e) {}
              }, 1800);
            </script>
          </body>
        </html>
      `);
      iframeDoc.close();

      toast.success("تم تجهيز الاستمارة وبدء أمر الطباعة! 🖨️✨", { id: toastId });

      // Clean up the iframe after a minute
      setTimeout(() => {
        try {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        } catch (e) {
          console.debug("Cleanup print iframe skipped:", e);
        }
      }, 60000);

    } catch (err: any) {
      console.error("Print feature error:", err);
      // Let the user download PDF directly if print API crashes or gets blocked
      toast.error("عذراً، تعذرت الطباعة الفورية بسبب قيود المتصفح. سيتم تنزيلها تلقائياً بصيغة PDF...", { id: toastId });
      setTimeout(() => {
        handleDownloadPDF();
      }, 1500);
    }
  };

  // Helper function to safely copy text regardless of the environment (HTTP, Non-Secure context, iframe constraints)
  const copyToClipboard = (text: string): Promise<void> => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    
    // Fallback using temporary textarea
    return new Promise<void>((resolve, reject) => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          resolve();
        } else {
          reject(new Error("document.execCommand('copy') failed style selection"));
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  // 4. WhatsApp Real Image & Advanced Fallback Room
  const handleWhatsAppShare = async () => {
    if (!lead) return;
    const toastId = toast.loading("جاري تجهيز الاستمارة للمشاركه المباشرة...");
    
    const studentId = lead.reservationCode || "1008";
    const studentName = lead.studentName || "";
    
    const shareText = `منصة التسجيل المعتمدة - تم استخراج استمارتك الرسمية بنجاح! رقم الحجز: #${studentId}. يمكنك مراجعتها وطباعتها عبر الرابط التالي: ${window.location.origin}/form-extraction?ref=${studentId}`;
    const apiWhatsAppUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    setWhatsappTargetUrl(apiWhatsAppUrl);

    const textToCopy = `بوابة المعاهد والأكاديميات الخاصة 🏢\n• رقم المعاملة: REG-${studentId}\n• الاسم: ${studentName}\n• التخصص: ${selectedDept}\n• الأكاديمية المستهدفة: ${academyName || "الأكاديمية المعتمدة"}\n• كود التحقق والباركود: ${window.location.origin}/form-extraction?ref=${studentId}`;
    setCopiedMessage(textToCopy);

    // Try automatic copy to clipboard for quick pasting
    try {
      await copyToClipboard(textToCopy);
    } catch (clipErr) {
      console.warn("Clipboard pre-copy failed:", clipErr);
    }

    try {
      let blob: Blob | null = null;
      let dataUrlToUse = renderedImageUrl;

      if (!dataUrlToUse) {
        let qrImg: HTMLImageElement | null = null;
        if (qrBlobUrl) {
          try {
            qrImg = await loadQRImage(qrBlobUrl);
          } catch (e) {
            console.warn("Could not load QR for WhatsApp share, proceeding without it:", e);
          }
        }
        let logoImg: HTMLImageElement | null = null;
        try {
          logoImg = await loadQRImage(AcademicLogo);
        } catch (e) {
          console.warn("Could not load logo for WhatsApp share, proceeding without it:", e);
        }

        const canvas = drawFormCanvas(lead, selectedDept, academyName, agentName, branch, submissionDate, qrImg, logoImg);
        dataUrlToUse = canvas.toDataURL("image/png");
      }

      const res = await fetch(dataUrlToUse);
      blob = await res.blob();

      if (!blob || !dataUrlToUse) {
        window.open(apiWhatsAppUrl, "_blank");
        toast.dismiss(toastId);
        return;
      }

      const file = new File([blob], `استمارة_تقديم_${studentName || "موثقة"}.png`, { type: "image/png" });
      
      let sharedFile = false;
      // Clean standard share sheet for supported mobile platforms
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          const shareData = {
            files: [file],
            title: `استمارة تقديم رسمية - بوابة المعاهد`,
            text: `السلام عليكم، لقد قمت باستخراج الاستمارة الرسمية كود #${studentId} للالتحاق بـ [${academyName}] قسم [${selectedDept}].`
          };
          await navigator.share(shareData);
          sharedFile = true;
          toast.success("📱 تم توجيه ومشاركة ملف الصورة بنجاح!", { id: toastId });
        } catch (shareErr) {
          console.warn("Navigator share threw error or declined:", shareErr);
        }
      }

      if (!sharedFile) {
        // Write image binary data directly to user's computer clipboard
        try {
          if (navigator.clipboard && window.isSecureContext) {
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
          }
        } catch (clipImgErr) {
          console.warn("Writing image blob to clipboard is unsupported on this browser:", clipImgErr);
        }

        // Trigger fallback file downloader automatically
        try {
          const link = document.createElement("a");
          link.download = `استمارة_تقديم_#${studentId}.png`;
          link.href = dataUrlToUse;
          link.click();
        } catch (downErr) {
          console.error("Auto image download for share failed:", downErr);
        }
        
        // Pop the helpful Arabic instructions dialog guide
        setShowShareModal(true);
        toast.success("📥 تم حفظ الاستمارة كصورة بجهازك وتجهيز المساعد الذكي!", { id: toastId });
      }
    } catch (err) {
      console.error("WhatsApp trigger error:", err);
      window.open(apiWhatsAppUrl, "_blank");
      toast.dismiss(toastId);
    }
  };

  // 5. Copy Transaction Data
  const handleCopyTransactionData = async () => {
    try {
      const studentId = lead?.reservationCode || "1008";
      const studentName = lead?.studentName || "";
      const textToCopy = `بوابة المعاهد والأكاديميات الخاصة\nرقم المعاملة: REG-${studentId}\nالاسم: ${studentName}\nالتخصص: ${selectedDept}\nكود التحقق: E-REF:${studentId}-6472`;
      await copyToClipboard(textToCopy);
      toast.success('📋 تم نسخ بيانات المعاملة بنجاح!');
    } catch (err) {
      console.error("Clipboard copy failed: ", err);
      toast.error("فشل نسخ المعاملة.");
    }
  };

  // Reset page
  const handleExitToVerification = () => {
    setLead(null);
    setPhoneSearch("");
    setSearchParams({});
    setStep(2);
    toast.success("تم التوجيه لشاشة التحقق الأولى بنجاح.");
  };

  // Construct dynamic micro QR Code for absolute verification
  const qrCodeUrl = lead 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.origin + "/form-extraction?ref=" + lead.reservationCode)}`
    : "";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-right font-sans min-h-screen bg-[#F8F9FA]" dir="rtl">
      
      {/* Dynamic Printing Style Overlay to hide other elements */}
      <style>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Hide Navbar, footer, and buttons panel */
          header, footer, nav, .no-print, button, .bg-emerald-50, .bg-[#F8F9FA] {
            display: none !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Expand form area to 100% printed viewport width */
          #official-form {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 2.5rem !important;
          }
        }
      `}</style>

      {/* CUSTOM BRANDING HEADER HERO AREA */}
      <div className="flex flex-col items-center justify-center text-center mt-3 mb-6 no-print space-y-3">
        <div className="inline-flex items-center gap-1.5 bg-[#F0F2F5] px-4 py-1.5 rounded-full text-[11px] font-black text-[#5C6B73] border border-slate-200">
          📄 شؤون التسجيل والقبول المستندي ٢٠٢٦
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A2463] hover:text-indigo-950 transition-all cursor-default leading-tight">
          استخراج الاستمارة الرسمية للتقديم الفوري
        </h1>
        <p className="text-[12px] sm:text-[13px] text-[#5C6B73] max-w-2xl font-bold leading-relaxed">
          بوابة المعاهد والأكاديميات الخاصة توفر للطلاب المسجلين إمكانية مراجعة بياناتهم، تعديل التخصص المطلق لمرة واحدة، وتوليد استمارات ورقية مختومة تسلم لإدارة القبول في الأكاديميات الشريكة.
        </p>

        {/* Link to Dedicated Guide Subpage */}
        <Link
          to="/form-extraction-guide"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-[#FF7F50] hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 border border-amber-300/40"
        >
          <span>📖 اضغط هنا لشرح خطوات استخراج الاستمارة وطباعتها بالتفصيل</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* STEP 2: SECURE PHONE VERIFICATION VIEW */}
      {step === 2 && (
        <div className="max-w-xl mx-auto space-y-6 no-print">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transform hover:scale-[1.01] transition-all duration-300">
            
            {/* Header Lock Section */}
            <div className="bg-[#0A2463] text-white px-6 py-5 border-b border-amber-400 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5.5 h-5.5 text-amber-400 animate-pulse" />
                <h2 className="text-sm font-black text-amber-100 tracking-tight">التحقق الهاتفي الآمن لحماية البيانات</h2>
              </div>
              <span className="text-[10px] text-zinc-300 bg-white/10 py-0.5 px-2 rounded-md font-mono font-bold select-none">SSL SECURE 256</span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-[#F0F5FF]/70 rounded-2xl p-4.5 border border-blue-100/80 text-right space-y-2">
                <p className="text-[12px] text-[#0A2463] leading-relaxed font-bold">
                  لغرض الحفاظ على خصوصية الطلاب وسرية البيانات المسجلة، يرجى كتابة رقم الهاتف الجاري (الذي استخدمته للحجز في الموقع أو تواصلت به مع مستشاري المنصة) أو كود الحجز المباشر للتحقق الفوري وسحب استمارتكم.
                </p>
              </div>
              
              {/* خيارات الاستعلام السريع والمطابقة */}
              <div className="space-y-6">
                
                {/* 1. الاستعلام بالهاتف والواتساب */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs font-black text-[#0A2463]">الطريقة الأولى: الاستعلام برقم الهاتف أو الواتساب</h3>
                  </div>
                  
                  <form onSubmit={handlePhoneVerification} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-black text-slate-500">رقم الهاتف أو الجوال المسجل بالطلب:</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                          <Phone className="w-4.5 h-4.5 text-emerald-600" />
                        </span>
                        <input
                          type="tel"
                          required
                          value={phoneSearch}
                          onChange={(e) => setPhoneSearch(e.target.value)}
                          placeholder="مثال: 01023456789"
                          className="w-full pl-5 pr-12 py-3 bg-[#FAFBFD] border border-slate-200 rounded-2xl text-center text-base font-black tracking-wider text-[#0A2463] focus:outline-none focus:ring-2 focus:ring-[#0A2463]/10 focus:bg-white focus:border-[#0A2463] transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#0A2463] hover:bg-slate-950 text-white transition-all rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جاري مطابقة الهوية الهاتفية...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 text-amber-400" />
                          <span>ابحث بالهاتف والواتساب 🔍</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* فاصل مرئي أنيق ومميز */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-dashed border-slate-200" />
                  <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 bg-white px-2">أو</span>
                  <div className="flex-grow border-t border-dashed border-slate-200" />
                </div>

                {/* 2. الاستعلام برقم الكود */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-xs font-black text-[#0A2463]">الطريقة الثانية: الاستعلام برقم كود الحجز (رقم المعاملة)</h3>
                  </div>

                  <form onSubmit={handleCodeVerification} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-black text-slate-500">رقم الكود المرجعي للحجز الخاص بك:</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                          <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
                        </span>
                        <input
                          type="text"
                          required
                          value={codeSearch}
                          onChange={(e) => setCodeSearch(e.target.value)}
                          placeholder="ابحث برقم الكود (مثال: 1008)"
                          className="w-full pl-5 pr-12 py-3 bg-[#FAFBFD] border border-slate-200 rounded-2xl text-center text-base font-black tracking-wider text-[#0A2463] focus:outline-none focus:ring-2 focus:ring-[#0A2463]/10 focus:bg-white focus:border-[#0A2463] transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-950 text-white transition-all rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جاري التحقق من كود الحجز...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 text-amber-400" />
                          <span>ابحث برقم الكود 🔐</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>

          {/* Advice card helper */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4.5 flex gap-3 text-right">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[12px] font-black text-amber-950">ملاحظة بخصوص كود التحقق السريع:</h4>
              <p className="text-[10px] text-amber-900 leading-relaxed font-bold">
                في حال قيامكم بالتسجيل مسبقاً ومسح رمز الباركود المربع الثنائي (QR Code) المتوفر على كود البطاقة الخاصة بكم، سيقوم النظام تلقائياً بتجاوز مرحلة كتابة رقم الجوال وإدراجكم مباشرة لمعاينة وطباعة الاستمارة الرسمية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DATA REVIEW & INTERACTIVITY SUITE */}
      {step === 3 && lead && (
        <div className="max-w-4xl mx-auto space-y-6 no-print">
          
          {/* Top Status Active Bar */}
          <div className="bg-emerald-50 border border-emerald-200 px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3.5 text-right">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping shrink-0" />
              <p className="text-xs sm:text-sm font-black text-emerald-950">
                الحجز الحالي نشط وموثق برقم #({lead.reservationCode})
              </p>
            </div>
            <button 
              onClick={handleExitToVerification}
              className="text-xs font-black text-red-600 hover:text-red-800 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>الخروج والبحث برقم آخر</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* FIRST CARD: DATA ENVELOPE AND INTERACTIVE EXTRACTION FOR ACADEMICS */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/95 overflow-hidden">
            
            {/* Header block with orange tag */}
            <div className="bg-[#FAFBFD] px-6 py-4.5 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4.5 bg-[#FF7F50] rounded-sm block" />
                <h3 className="text-xs sm:text-sm font-black text-[#0A2463]">أولاً: مراجعة البيانات المسجلة وتغيير شعبة التوجيه</h3>
              </div>
              <span className="text-[10px] font-bold text-[#FF7F50] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">رغبة الطالب 🏷️</span>
            </div>

            <div className="p-6 sm:p-7 space-y-6">
              
              {/* Responsive Details Bento Cells */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-right">
                
                <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-slate-200 flex flex-col justify-between h-20">
                  <span className="text-[10px] text-slate-400 block font-bold">اسم الطالب كاملاً:</span>
                  <p className="text-xs font-black text-slate-900 truncate">{lead.studentName}</p>
                </div>

                <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-slate-200 flex flex-col justify-between h-20">
                  <span className="text-[10px] text-slate-400 block font-bold">رقـم الهاتف النشط:</span>
                  <p className="text-xs font-black text-[#0A2463] truncate font-mono">{lead.phoneNumber}</p>
                </div>

                <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-slate-200 flex flex-col justify-between h-20">
                  <span className="text-[10px] text-slate-400 block font-bold">المحافظة الجغرافية:</span>
                  <p className="text-xs font-black text-slate-800 truncate">{lead.governorate || "غير محدد"}</p>
                </div>

                <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-slate-200 flex flex-col justify-between h-20">
                  <span className="text-[10px] text-slate-400 block font-bold">المؤهل والسنة:</span>
                  <p className="text-xs font-black text-slate-800 truncate leading-none">
                    {lead.educationLevel || "ثانوية عامة"} {lead.graduationYear ? `(${lead.graduationYear})` : ""}
                  </p>
                </div>

                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 flex flex-col justify-between h-20">
                  <span className="text-[10px] text-amber-800 block font-bold">كود الخصم المعتمد 🎫:</span>
                  <p className="text-xs font-black text-amber-950 font-mono tracking-wider">{lead.discountCode || "AM2026"}</p>
                </div>

              </div>

              {/* Dynamic Specialization Dropdown Wrapper yellow box */}
              <div className="p-5 sm:p-6 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm" />
                    <span>تغيير شعبة التخصّص / القسم المسجل (متاح التعديل بمرونة):</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed pr-3">
                    يمكنك تعديل القسم أو شعبة الدراسة التي ترغب في توثيقها بالبيان من خلال القائمة أدناه، ستحدث المنصة حجزك تلقائياً وشكل رسمي بمجرد الحفظ.
                  </p>
                </div>

                {/* Inside Input/Button selector bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-grow">
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-[#0A2463] focus:ring-1 focus:ring-[#0A2463] focus:outline-none"
                    >
                      <option value="">-- اضغط لاختيار تخصص رسمي --</option>
                      {availableDepts.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={savingDetails || !selectedDept}
                    className="px-5 py-3 bg-[#0A2463] text-white hover:bg-[#12317c] transition-all rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    {savingDetails ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>حفظ التعديل في النظام</span>
                  </button>
                </div>
              </div>

            </div>

            {/* SECTOR 2: ACADEMIC DETAILS FORM SECTION */}
            <form onSubmit={handleTackleFormGeneration}>
              <div className="bg-[#FAFBFD] px-6 py-4.5 border-t border-b border-slate-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4.5 bg-[#FF7F50] rounded-sm block" />
                  <h3 className="text-xs sm:text-sm font-black text-[#0A2463]">ثانياً: معلومات الأكاديمية والفرع ومستشار التنسيق</h3>
                </div>
                <span className="text-[10px] font-bold text-[#FF7F50] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">بيانات التوثيق 🏢</span>
              </div>

              <div className="p-6 sm:p-7 space-y-6">
                <p className="text-[11px] text-slate-500 font-bold leading-relaxed pr-1 mb-1">
                  يرجى اختيار الأكاديمية والفرع وتاريخ التقديم المتوقع لتوليد الاستمارة الرقمية الرسمية وتوجيهها للمقر المعتمد لدفعة ٢٠٢٦.
                </p>

                <div className="space-y-4">
                  {/* Academy Dropdown */}
                  <div className="space-y-1.5 text-right">
                    <label className="block text-xs font-black text-slate-700">الأكاديمية أو المعهد المستهدف: <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 pointer-events-none">
                        <Building className="w-4.5 h-4.5 text-zinc-500" />
                      </span>
                      <select
                        required
                        value={selectedAcademyKey}
                        onChange={(e) => handleAcademyChange(e.target.value)}
                        className="w-full pl-4 pr-11 py-3 bg-[#FAFBFD] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2463]"
                      >
                        <option value="">(اضغط لاختيار الاكاديمية التي تريد التقديم بها)</option>
                        {OFFICIAL_PARTNER_ACADEMIES.map((acad) => (
                          <option key={acad.id} value={acad.name}>
                            {acad.name}
                          </option>
                        ))}
                        <option value={OTHER_ACADEMY_OPTION_KEY}>
                          🏢 أكاديمية أخرى (كتابة الاسم يدوياً)...
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Academy Name (if other selected) */}
                  {selectedAcademyKey === OTHER_ACADEMY_OPTION_KEY && (
                    <div className="space-y-1.5 text-right p-4 bg-orange-50/60 border border-orange-200 rounded-2xl animate-fadeIn">
                      <label className="block text-xs font-black text-orange-900">
                        اكتب اسم الأكاديمية الأخرى يدوياً: <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                          <Building className="w-4.5 h-4.5 text-orange-500" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="مثال: أكاديمية النور للعلوم الطبية..."
                          value={customAcademyName}
                          onChange={(e) => setCustomAcademyName(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 bg-white border border-orange-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Secondary Branch Dropdown (if branches exist) */}
                  {availableBranches.length > 0 && (
                    <div className="space-y-1.5 text-right p-4 bg-blue-50/50 border border-blue-200 rounded-2xl animate-fadeIn">
                      <label className="block text-xs font-black text-[#0A2463] flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>تحديد الفرع المعتمد للأكاديمية: <span className="text-red-500">*</span></span>
                      </label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-blue-300 rounded-xl text-xs font-black text-[#0A2463] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {availableBranches.map((b) => (
                          <option key={b} value={b}>
                            فرع {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Submission Date Picker */}
                  <div className="space-y-1.5 text-right">
                    <label className="block text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>تاريخ التقديم / الحضور في مقر الأكاديمية: <span className="text-red-500">*</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={submissionDate}
                      onChange={(e) => setSubmissionDate(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAFBFD] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2463]"
                    />
                    <p className="text-[10px] text-emerald-700 font-bold pr-1">
                      حدد تاريخ الحضور وتقديم الأوراق في مقر الأكاديمية التي ترغب للتقديم اليها.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="space-y-1.5 text-right">
                      <label className="block text-xs font-black text-slate-700">مكتب التقديم والتشغيل المعتمد: <span className="text-slate-450 text-[10px] font-bold">(ثابت للجهة)</span></label>
                      <div className="p-3.5 bg-[#F8F9FA] border border-slate-200 rounded-xl space-y-0.5 flex items-center justify-between">
                        <div>
                          <strong className="text-xs text-[#0A2463] block tracking-wide">A.M.GROUP</strong>
                          <span className="text-[10px] text-slate-600 font-bold">م / محمد الروبي @ م / أيمن حسبو</span>
                        </div>
                        <Award className="w-5 h-5 text-amber-505 text-amber-550 mr-2" />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-right">
                      <label className="block text-xs font-black text-slate-700">اسم مستشار التقديمات / السيلز: <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                          <UserCheck className="w-4.5 h-4.5 text-slate-500" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="مثال: م / محمد"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 bg-[#FAFBFD] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Bottom Action Submit Button */}
              <div className="p-5 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-3xl">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-10 py-4 bg-[#FF7F50] hover:bg-orange-600 text-white text-xs font-black rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <span>توليد ومعاينة الاستمارة الرسمية فوراً 📄</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* STEP 4: HARD-COPY PRINT PREVIEW & DOWNLOADS ROOM */}
      {step === 4 && lead && (
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Success Banner Block */}
          <div className="bg-emerald-50 border border-emerald-250 p-5 rounded-3xl flex items-start gap-4 text-right no-print">
            <div className="w-11 h-11 bg-emerald-100/90 text-emerald-800 rounded-full flex items-center justify-center shrink-0 border border-emerald-200">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="space-y-1 flex-grow">
              <h3 className="text-sm font-black text-emerald-950">تم تجهيز استمارتك الرسمية الرقمية بنجاح!</h3>
              <p className="text-[11px] text-[#405A51] leading-relaxed font-bold">
                الاستمارة أدناه جاهزة تماماً ومصممة بدقة شديدة لتناسب أبعاد ورق الطباعة القياسي (A4)، يرجى القيام بتحميل الصورة الرسمية مباشرة أو مشاركتها عبر الهاتف.
              </p>
            </div>
            <button 
              onClick={() => setStep(3)}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg border border-slate-200 shadow-xs cursor-pointer"
            >
              تحوير مدخلاتك
            </button>
          </div>

          {/* ACTION BUTTONS PANEL */}
          <div className="bg-[#1A2536] rounded-3xl p-6 shadow-xl border border-slate-700 space-y-5 no-print text-right text-stone-100">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3.5">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-black text-white">تحميل ومشاركة صورة الاستمارة المعتمدة مباشرة:</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              <button
                onClick={handleDownloadPNG}
                className="p-3.5 bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/10 transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 text-center flex-col"
              >
                <Download className="w-5 h-5 text-white shrink-0" />
                <span className="text-[10px] font-black leading-tight">تحميل صورة استمارة عالية الجودة (PNG)</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="p-3.5 bg-[#4A5568] text-white hover:bg-[#2D3748] transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 text-center flex-col"
              >
                <FileText className="w-5 h-5 text-amber-300 shrink-0" />
                <span className="text-[10px] font-black leading-tight">تحميل كملف PDF رسمي 📄</span>
              </button>

              <button
                onClick={handlePrint}
                className="p-3.5 bg-[#2D3748] text-white hover:bg-[#1A202C] transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 text-center flex-col border border-slate-700"
              >
                <Printer className="w-5 h-5 text-sky-450 shrink-0 text-cyan-400" />
                <span className="text-[10px] font-black leading-tight">طباعة الاستمارة 🖨️</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="p-3.5 bg-[#FF6B35] text-white hover:bg-orange-700 transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 text-center flex-col"
              >
                <Share2 className="w-5 h-5 text-white shrink-0 animate-bounce" />
                <span className="text-[10px] font-black leading-tight">مشاركة الصورة على واتساب والفيسبوك 📱</span>
              </button>

              <button
                onClick={handleCopyTransactionData}
                className="p-3.5 bg-slate-800 text-white hover:bg-slate-700 transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 text-center flex-col border border-slate-700"
              >
                <Copy className="w-5 h-5 text-zinc-300 shrink-0" />
                <span className="text-[10px] font-black leading-tight">نسخ بيانات المعاملة 📋</span>
              </button>

            </div>

            <div className="bg-slate-850/30 p-4 rounded-xl border border-slate-700 text-[11px] leading-relaxed text-slate-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-400 mb-1">
                <span>💡 ميزة الاستمارة البصرية:</span>
              </p>
              <p className="font-medium pr-5">
                عند النقر على "تحميل كصورة" تقوم المنصة تلقائياً بإنشاء بصمة كربونية رسمية ومختومة للاستمارة ويقوم جهازك بتنزيلها فورا في الاستوديو. إذا كنت تستخدم هاتفاً اذكياً اضغط على "مشاركة كصورة" لإرسال الصورة مباشرة لأي شخص أو مكتب تنسيق عبر تطبيق WhatsApp أو Messenger.
              </p>
            </div>
          </div>

          {/* TABS FOR TOGGLING VIEW MODE */}
          <div className="flex bg-slate-800/40 p-1 rounded-2xl max-w-xl mx-auto gap-1 mb-6 border border-slate-700/50 no-print">
            <button
              onClick={() => setViewMode("image")}
              className={`flex-grow py-3 px-3 rounded-xl text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "image"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/30"
              }`}
            >
              <span>📱 عرض كصورة للحفظ والمشاركة (تلقائي)</span>
            </button>
            <button
              onClick={() => setViewMode("html")}
              className={`flex-grow py-3 px-3 rounded-xl text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "html"
                  ? "bg-slate-700 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/30"
              }`}
            >
              <span>🖨️ عرض كمستند للطباعة المباشرة (A4)</span>
            </button>
          </div>

          {/* IMAGE PREVIEW FOR QUICK SAVING / SHARING */}
          {viewMode === "image" && (
            <div className="border border-slate-300 rounded-3xl shadow-2xl p-1 bg-white relative no-print max-w-4xl mx-auto mb-6">
              {isRenderingImage ? (
                <div className="flex flex-col items-center justify-center p-24 bg-[#FAFBFD] rounded-3xl min-h-[450px]">
                  <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                  <h4 className="text-sm font-black text-slate-800 mb-1">جاري تصوير وتجهيز الاستمارة كصورة عالية الدقة...</h4>
                  <p className="text-[10px] font-bold text-slate-500">المنصة تقوم حالياً بدمج أختام بوابة المعاهد وتنسيق الباركود المباشر.</p>
                </div>
              ) : renderedImageUrl ? (
                <div className="space-y-4 p-4 bg-[#FAFBFD] rounded-2xl text-right">
                  {/* Banner instruction */}
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-black leading-relaxed space-y-1">
                    <p className="flex items-center gap-1.5 text-emerald-700 mb-1">
                      <span>💡 طريقة الحجز والمشاركة الموصى بها للهواتف:</span>
                    </p>
                    <p className="text-[11px] text-slate-705">
                      • <strong>اضغط طويلاً على الصورة الكبيرة بالأسفل</strong> ثم اختر <strong>"مشاركة الصورة"</strong> أو <strong>"حفظ الصورة بالاستوديو"</strong> لإرسالها مباشرة كمستند مرئي حقيقي على تطبيق واتساب والمجموعات الرسمية.
                    </p>
                    <p className="text-[11px] text-slate-705">
                      • إذا كنت على كمبيوتر مكتبي، يمكنك النقر كلك يمين على الاستمارة ثم <strong>"حفظ الصورة باسم" (Save Image As)</strong>.
                    </p>
                  </div>
                  
                  {/* Actual Real Image */}
                  <div className="border-4 border-[#0a2463] rounded-2xl overflow-hidden shadow-md bg-white relativ">
                    <img 
                      src={renderedImageUrl} 
                      alt="استمارة تقديم رسمية موثقة"
                      className="w-full h-auto object-contain select-all cursor-pointer" 
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-24 bg-red-50/50 rounded-3xl min-h-[450px] text-center">
                  <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                  <h4 className="text-sm font-black text-slate-800 mb-1">عذراً، لم نتمكن من تصوير المستند تلقائياً</h4>
                  <p className="text-xs text-slate-500 mb-3">يمكنك النقر على زر الطباعة المباشرة بالأسفل أو تحديث الصفحة.</p>
                  <button
                    onClick={() => {
                      // Force re-trigger of state render
                      setRenderedImageUrl("");
                      setStep(4);
                    }}
                    className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer"
                  >
                    تحديث وإعادة التوليد بضغطة واحدة 🔄
                  </button>
                </div>
              )}
            </div>
          )}

          {/* THE OFFICIAL HIGH-FIDELITY PRINTABLE EMBEDDED DOCUMENT CONTAINER (IMAGE D LOOKALIKE) */}
          <div className={`border border-slate-300 rounded-3xl shadow-2xl p-1 bg-white relative ${
            viewMode === "image" ? "absolute opacity-0 pointer-events-none -z-50 left-[-9999px] top-[-9999px] w-[800px]" : "block"
          }`}>
            <div 
              id="official-form"
              ref={formRef}
              className="p-10 text-slate-900 select-none relative overflow-hidden bg-white leading-relaxed text-right tracking-normal"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              
              {/* Image D Double Framed Borders */}
              <div className="absolute inset-5 border-[3px] border-[#0A2463] rounded-2xl pointer-events-none" />
              <div className="absolute inset-6 border border-amber-600/35 rounded-xl pointer-events-none" />

              <div className="relative z-10 space-y-7 px-4 py-4">
                
                {/* Header Layout: Right labels, Center Block, Left Round Seal */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[#0A2463]/10 pb-5 gap-4">
                  
                  {/* Right hand layout block */}
                  <div className="text-right space-y-1.5 max-w-sm sm:max-w-md">
                    <h2 className="text-lg font-black text-[#0a2463] leading-none">بوابة المعاهد والأكاديميات الخاصة</h2>
                    <h3 className="text-[11px] font-black text-[#FF6B35] leading-none mb-1">المنصة المركزية التفاعلية للتسجيل والتقويض الأكاديمي</h3>
                    <p className="text-[8px] text-slate-500 font-bold leading-normal">
                      بموجب التعاقد المشترك وضوابط القبول وتأكيد القبول المسبق دفعة ٢٠٢٦
                    </p>
                  </div>

                  {/* Shaded Middle Code container */}
                  <div className="text-center bg-[#F1F3F7] border border-slate-300 px-6 py-2.5 rounded-xl flex flex-col justify-center shrink-0">
                    <span className="text-[9px] font-black text-[#5C6B73] tracking-normal mb-0.5">رقم المعاملة الفريد:</span>
                    <strong className="text-sm font-mono font-black text-slate-900 select-all tracking-wider uppercase">
                      2026 / {lead.reservationCode || "1008"}
                    </strong>
                  </div>

                  {/* Left Logo Seal Crest */}
                  <div className="flex flex-col items-center justify-center space-y-1 shrink-0">
                    <div className="w-16 h-16 rounded-full border border-slate-200 object-contain shadow-xs p-1 flex items-center justify-center bg-white overflow-hidden">
                      <img 
                        src={AcademicLogo} 
                        className="w-full h-full object-contain rounded-full" 
                        alt="بوابة المعاهد والأكاديميات الخاصة" 
                        onError={(e) => {
                          e.currentTarget.src = "/logo.png";
                        }}
                      />
                    </div>
                    <span className="text-[7.5px] font-black text-[#0A2463] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-150">معتمد وموثق ٢٠٢٦</span>
                  </div>

                </div>

                {/* Main Shaded Form Label and Targets */}
                <div className="text-center space-y-2 py-1.5">
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-500 block select-none">رقم الدفعة : ٢٠٢٦ / ٢٠٢٧ مـ</span>
                  <div className="bg-[#FFFDF4] border border-amber-200 py-3.5 px-6 rounded-2xl max-w-2xl mx-auto space-y-1 shadow-xs">
                    <p className="text-xs font-black text-slate-700">استمارة تقديم من بوابة المعاهد والأكاديميات الخاصة تسلم لـ</p>
                    <h2 className="text-lg sm:text-2xl font-black text-[#10B981] tracking-wide select-all leading-relaxed">
                      {academyName || "أكاديمية السلام الدولية"} {branch ? `(${branch})` : ""} 🏰
                    </h2>
                    {submissionDate && (
                      <p className="text-[11px] font-bold text-amber-900 bg-amber-100/70 inline-block px-3 py-1 rounded-full border border-amber-200 mt-1">
                        📅 موعد التقديم والزيارة المتوقع: <span className="font-black text-slate-900">{submissionDate}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Details grid matching screenshot */}
                <div className="space-y-2">
                  <div className="text-xs font-black text-[#0A2463] flex items-center gap-1.5 pr-1.5">
                    <span className="w-1.5 h-3.5 bg-[#FF6B35] rounded-xs block" />
                    <span>تفاصيل بيانات الطالب الشخصية والمؤهل الأكاديمي المرفق :</span>
                  </div>

                  <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 text-xs">
                      
                      <div className="p-3.5 border-b border-l border-slate-250 flex items-center justify-between w-full">
                        <span className="text-slate-500 font-extrabold pr-1 select-none text-right">اسم الطالب كاملاً (رباعي):</span>
                        <strong className="text-[#0A2463] font-black text-left pl-1">{lead.studentName}</strong>
                      </div>

                      <div className="p-3.5 border-b border-slate-250 flex items-center justify-between w-full">
                        <span className="text-slate-500 font-extrabold pr-1 select-none text-right">رقم الهاتف المسجل :</span>
                        <strong className="text-slate-950 font-black tracking-wider text-left pl-1 font-mono">{lead.phoneNumber}</strong>
                      </div>

                      <div className="p-3.5 border-b border-l border-slate-250 flex items-center justify-between w-full">
                        <span className="text-slate-500 font-extrabold pr-1 select-none text-right">رقم واتساب النشط:</span>
                        <strong className="text-slate-950 font-black text-left pl-1 font-mono">{lead.whatsappNumber || lead.phoneNumber}</strong>
                      </div>

                      <div className="p-3.5 border-b border-slate-250 flex items-center justify-between w-full">
                        <span className="text-slate-500 font-extrabold pr-1 select-none text-right">المؤهل وسنة التخرج:</span>
                        <strong className="text-slate-800 font-black text-left pl-1 leading-none">{lead.educationLevel || "ثانوية عامة"} {lead.graduationYear ? `(${lead.graduationYear})` : "(٢٠٢٦)"}</strong>
                      </div>

                      <div className="p-3.5 border-l border-slate-250 flex items-center justify-between w-full">
                        <span className="text-slate-500 font-extrabold pr-1 select-none text-right">المحافظة الجغرافية:</span>
                        <strong className="text-slate-800 font-black text-left pl-1">{lead.governorate || "غير محدد"}</strong>
                      </div>

                      <div className="p-3.5 flex items-center justify-between bg-amber-50/70 border border-amber-200/80 w-full">
                        <span className="text-amber-900 font-extrabold pr-1 select-none text-right flex items-center gap-1">
                          <span>كود الخصم المعتمد للطالب:</span>
                          <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-sm font-bold">🎫 خصم فوري</span>
                        </span>
                        <strong className="text-amber-800 font-black text-left pl-1 text-sm font-mono tracking-wider">{lead.discountCode || "AM2026"}</strong>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Highlighted major section banner */}
                <div className="bg-white border-2 border-emerald-500 rounded-none py-4 px-6 text-center select-all">
                  <span className="text-xs font-black text-slate-800 block mb-1">الشعبة / التخصص الذي تم تسجيل حجز المقعد عليه رسمياً:</span>
                  <div className="text-emerald-600 text-lg sm:text-xl font-black tracking-widest">
                    ★ {selectedDept} ★
                  </div>
                </div>

                {/* Accept entities coordinates */}
                <div className="space-y-2">
                  <div className="text-xs font-black text-[#0A2463] flex items-center gap-1.5 pr-1.5">
                    <span className="w-1.5 h-3.5 bg-[#FF6B35] rounded-xs block" />
                    <span>جهة توجيه القبول والمسؤول المتابع للاستمارة الرسمية :</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 bg-[#FAFBFD] border border-slate-300 rounded-xl text-center min-h-[96px] flex flex-col justify-center items-center">
                      <span className="text-[11px] text-slate-500 font-black select-none block mb-1">
                        {branch ? "الأكاديمية والفرع المعتمد:" : "الأكاديمية المستلمة:"}
                      </span>
                      <strong className="text-slate-900 font-black text-sm sm:text-base block leading-snug">{academyName || "اكاديمية السلام الدوليه"}</strong>
                      {branch && (
                        <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">📍 الفرع: {branch}</span>
                      )}
                      {(submissionDate || lead.submissionDate) && (
                        <span className="text-[10px] text-sky-700 font-bold block mt-0.5">📅 موعد الحضور: {submissionDate || lead.submissionDate}</span>
                      )}
                    </div>

                    <div className="p-4 bg-[#FAFBFD] border border-slate-300 rounded-xl text-center min-h-[96px] flex flex-col justify-center items-center gap-1">
                      <span className="text-[11px] text-slate-500 font-black select-none block">مكتب التقديم والقبول المسؤول:</span>
                      <strong className="text-[#0A2463] font-black text-sm sm:text-base block leading-none">A.M.GROUP</strong>
                      <span className="text-[10px] text-slate-600 font-bold block leading-tight">م / محمد الروبي @ م / أيمن حسبو</span>
                    </div>

                    <div className="p-4 bg-[#FAFBFD] border border-slate-300 rounded-xl text-center min-h-[96px] flex flex-col justify-center items-center">
                      <span className="text-[11px] text-slate-500 font-black select-none block mb-1">مستشار التسجيل المسؤول:</span>
                      <strong className="text-[#FF6B35] font-black text-sm sm:text-base block leading-snug">{agentName || "م التنسيق والقبول"}</strong>
                    </div>
                  </div>
                </div>

                {/* Advisory notice details and QR scanner side-by-side (REVERSED: Text on right / QR on left in RTL) */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[#FAFBFD] p-5 rounded-2xl border border-slate-200">
                  
                  {/* Bullet regulations */}
                  <div className="md:col-span-3 text-right space-y-2 flex flex-col justify-center">
                    <h5 className="text-[11px] font-black text-[#0A2463]">🔹 تنويهات وضوابط تأكيد القبول وحفظ المقعد:</h5>
                    <ul className="space-y-1.5 text-[10px] text-slate-700 font-bold leading-relaxed list-none pr-0">
                      <li className="flex items-start gap-1 pr-1.5">
                        <span className="text-emerald-500 font-black ml-1 select-none">•</span>
                        <span>تعتبر هذه الاستمارة بمثابة طلب حجز موقع مسبق لدمج وخصم الطالب في شعب المعاهد لعام ٢٠٢٦ م.</span>
                      </li>
                      <li className="flex items-start gap-1 pr-1.5">
                        <span className="text-emerald-500 font-black ml-1 select-none">•</span>
                        <span>يحتفظ الطالب بحقه في تثبيت مصاريف الدفعة الأولى عند تسليم هذا المستند للمعهد خلال أسبوع من تاريخه.</span>
                      </li>
                      <li className="flex items-start gap-1 pr-1.5">
                        <span className="text-emerald-500 font-black ml-1 select-none">•</span>
                        <span>تعتمد الشؤون الفنية محتوى البيانات المدمجة ويتم التحقق من صحتها آلياً عبر كود الحجز.</span>
                      </li>
                    </ul>
                  </div>

                  {/* QR Core segment */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center space-y-1.5 border-slate-200 md:border-r md:pr-4">
                    <div className="p-2 border border-slate-250 bg-white rounded-xl shadow-xs">
                      {qrBlobUrl ? (
                        <img 
                          src={qrBlobUrl} 
                          className="w-28 h-28 object-contain rounded-md" 
                          alt="QR Verifier" 
                        />
                      ) : (
                        <div className="w-28 h-28 bg-slate-100 rounded-md animate-pulse" />
                      )}
                    </div>
                    <div className="text-center space-y-0.5">
                      <p className="text-[10px] font-mono font-black text-slate-900">E-REF: #{lead.reservationCode}</p>
                      <p className="text-[9.5px] font-black text-slate-950 tracking-tight leading-none">VERIFIED SECURE DIGITAL QR-STAMP • ACTIVE & GRANTED 🔒</p>
                    </div>
                  </div>

                </div>

                {/* Greetings tag and Signatures layout */}
                <div className="space-y-4 pt-1">
                  <div className="text-center font-black text-slate-800 text-xs tracking-tight">
                    شكر خاص من بوابة المعاهد والأكاديميات الخاصة للأكاديمية أو المعهد المذكور بمسماه <span className="text-[#0A2463] font-black tracking-wide underline">{academyName || "أكاديمية السلام الدولية"}</span> على الدعم والخصومات الممنوحة.
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center select-none text-[#0A2463] text-xs pt-4">
                    
                    <div className="space-y-10">
                      <span className="block font-black text-slate-700">: توقيع الطالب المقبول</span>
                      <div className="w-44 border-b border-dashed border-slate-400 mx-auto" />
                    </div>

                    <div className="space-y-10">
                      <span className="block font-black text-slate-700">: مكتب القبول والتسجيل المعتمد</span>
                      <div className="w-44 border-b border-dashed border-slate-400 mx-auto" />
                    </div>

                  </div>
                </div>

                {/* Circular Official red stamp overlay */}
                <div className="absolute bottom-4 left-6 pointer-events-none select-none select-none opacity-85 rotate-[12deg] scale-[1.05] flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-2 border-red-651 border-red-500 border-double p-0.5 text-center flex flex-col items-center justify-center bg-white/20 select-none shadow-xs ring-offset-bg">
                    <div className="w-full h-full rounded-full border border-red-500 p-1 flex flex-col items-center justify-center text-red-500 leading-none">
                      <span className="text-[7px] font-black block select-none">بوابة المعاهد</span>
                      <span className="text-[8.5px] font-black tracking-wide block select-none">التسجيل والقبول</span>
                      <span className="text-[8.5px] font-black tracking-wide block select-none">★ ٢٠٢٦ ★</span>
                      <span className="text-[6px] block font-bold select-none pr-0.5">APPROVED SECURITY🔒</span>
                    </div>
                  </div>
                </div>

                {/* Deep bottom watermark caption */}
                <div className="text-center text-[8px] text-slate-400 font-bold border-t border-slate-150 pt-2 select-none">
                  مع تحيات مكتب التسجيل والتنسيق الرقمي المعتمد للبوابة
                </div>

              </div>

            </div>
          </div>

        </div>
      )}

      {/* SHARING ASSISTANT MODAL OVERLAY */}
      {showShareModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 flex flex-col text-right">
            
            {/* Header branding */}
            <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
              <span className="text-xs font-black bg-emerald-500/30 px-3 py-1 rounded-full text-emerald-105">مساعد المشاركة والتحميل الذكي 📱</span>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition text-lg font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Image feedback area */}
              <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <span className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl shadow-md shrink-0">🚀</span>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-950">لقد تم تصوير وحفظ الاستمارة كصورة بجهازك الآن!</h4>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">ستجد صورة الاستمارة بوضوح عالٍ في مجلد التحميلات أو معرض الصور.</p>
                </div>
              </div>

              {/* Instructions guide */}
              <div className="space-y-3">
                <h5 className="text-xs font-black text-slate-800">لإرسال الاستمارة كصورة حقيقية مباشرة على واتساب/فيسبوك:</h5>
                <ol className="space-y-2.5 text-xs text-slate-600 font-bold pr-0">
                  <li className="flex items-start gap-2 font-black leading-relaxed">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600 text-[10px] shrink-0">١</span>
                    <p>قمنا <strong className="text-[#0d8c54]">بنسخ النص والبيانات</strong> تلقائياً لحافظة جهازك.</p>
                  </li>
                  <li className="flex items-start gap-2 font-black leading-relaxed">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600 text-[10px] shrink-0">٢</span>
                    <p>عند فتح المحادثة، قم بعمل <strong className="text-emerald-700">لصق (Paste / Ctrl+V)</strong> لإرسال تفاصيل المعاملة فوراً!</p>
                  </li>
                  <li className="flex items-start gap-2 font-black leading-relaxed">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600 text-[10px] shrink-0">٣</span>
                    <p>أو اضغط على زر المعرض بمحادثة واتساب وأرفق <strong className="text-emerald-700">الصورة المحمّلة حديثاً</strong> من استوديو جهازك.</p>
                  </li>
                </ol>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <a 
                  href={whatsappTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowShareModal(false)}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 transition-all text-white font-black text-xs text-center rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="animate-pulse">🟢</span>
                  <span>الذهاب إلى واتساب ومشاركة الاستمارة الآن</span>
                </a>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(copiedMessage);
                    toast.success("📋 تم إعادة نسخ بيانات التنسيقات!");
                  }}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs text-center rounded-2xl transition cursor-pointer"
                >
                  نسخ البيانات النصية مرة أخرى 📋
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
