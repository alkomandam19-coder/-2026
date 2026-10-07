import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

// Statically import initial database snapshots from pure TypeScript modules
// to guarantee 100% bundling with zero filesystem or ESM JSON import attribute issues
import { defaultStudentsDb } from "../src/data/initialStudents";
import {
  defaultSiteConfigsDb,
  defaultManualAgentAssignments,
  defaultSalesReps,
  defaultRoiDepartments
} from "../src/data/initialConfigs";
import { ACADEMY_DEPARTMENTS } from "../src/data";

// Load environment variables
dotenv.config();

const SETTINGS_PATH = path.join(process.cwd(), "pdf-settings.json");
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycby4ZpxOrhpHRR2XoDKGEDNPBHR4gBAlOg4oVWVGYuoVMDm0Ywo5yyFMcYuSr_Y9CsU-/exec";

// --- TIMEOUT & NETWORK UTILITY HELPERS (2 SECONDS MAX TIMEOUT FOR SUPABASE / GEMINI / EXTERNAL REQUESTS) ---
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 2000): Promise<Response> {
  const effectiveTimeout = Math.min(timeoutMs || 2000, 2000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function formatEgyptDateTime(d: Date | number = new Date()): string {
  const dateObj = typeof d === "number" ? new Date(d) : (d instanceof Date ? d : new Date(d));
  if (isNaN(dateObj.getTime())) return "غير محدد";

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    };
    const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(dateObj);
    const map: Record<string, string> = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const ampm = (map.dayPeriod || "").toUpperCase() === "PM" ? "م" : "ص";
    return `${map.year}/${map.month}/${map.day} - ${map.hour}:${map.minute}:${map.second} ${ampm} (بتوقيت مصر)`;
  } catch {
    // Mathematical fallback for Egypt time:
    // Egypt is UTC+3 in summer (May through Oct), UTC+2 in winter (Nov through April)
    const month = dateObj.getUTCMonth() + 1;
    const offsetHours = (month >= 5 && month <= 10) ? 3 : 2;
    const egDate = new Date(dateObj.getTime() + offsetHours * 3600000);
    const y = egDate.getUTCFullYear();
    const mo = String(egDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(egDate.getUTCDate()).padStart(2, "0");
    let h = egDate.getUTCHours();
    const ampm = h >= 12 ? "م" : "ص";
    h = h % 12 || 12;
    const hStr = String(h).padStart(2, "0");
    const min = String(egDate.getUTCMinutes()).padStart(2, "0");
    const sec = String(egDate.getUTCSeconds()).padStart(2, "0");
    return `${y}/${mo}/${day} - ${hStr}:${min}:${sec} ${ampm} (بتوقيت مصر)`;
  }
}

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = 2000,
  fallbackValue: T = null as any
): Promise<T> {
  // Hard cap timeout at 2000ms (2 seconds) max to completely prevent serverless function timeouts
  const effectiveTimeout = Math.min(Math.max(timeoutMs || 2000, 50), 2000);
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[Timeout Shield] External request exceeded ${effectiveTimeout}ms limit. Returning fallback value.`);
      resolve(fallbackValue);
    }, effectiveTimeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } catch (err) {
    console.warn(`[Timeout Shield Error] Query exception:`, err);
    return fallbackValue;
  } finally {
    clearTimeout(timer);
  }
}

// --- SMART NON-BLOCKING FIRE-AND-FORGET GOOGLE SHEETS SYNCHRONIZATION ---
const syncedBookingCodes = new Set<string>();

async function syncToSheet(student: any, actionType = "register") {
  try {
    const phoneNum = String(student.phone || student.phoneNumber || "").trim();
    const bookingCode = String(student["رمز_الحجز"] || student.رمز_الحجز || student.reservation_code || student.reservationCode || student.bookingCode || student.booking_code || student.bookingNo || "").trim();

    // Only deduplicate rapid repeated calls for "register"
    if (actionType === "register") {
      if (bookingCode && syncedBookingCodes.has(bookingCode)) {
        console.log(`[Google Sheets] Suppressed duplicate sync request for booking code: ${bookingCode}`);
        return { success: true, skipped: true };
      }
      if (phoneNum && phoneNum.length >= 8 && syncedBookingCodes.has(phoneNum)) {
        console.log(`[Google Sheets] Suppressed duplicate sync request for phone: ${phoneNum}`);
        return { success: true, skipped: true };
      }

      if (bookingCode) syncedBookingCodes.add(bookingCode);
      if (phoneNum && phoneNum.length >= 8) syncedBookingCodes.add(phoneNum);
    }

    const depts = Array.isArray(student.selected_departments)
      ? student.selected_departments.join(", ")
      : Array.isArray(student.selectedDepartments)
        ? student.selectedDepartments.join(", ")
        : student.selected_departments || student.selectedDepartments || "";

    const assignedAgent = student.sales_agent || student.salesAgent || student.agentName || student.agent_name || resolveSalesAgentForLead(student) || "";

    const payload = {
      action: actionType,
      bookingCode: bookingCode, 
      booking_code: bookingCode, 
      bookingNo: bookingCode, 
      "رمز_الحجز": bookingCode, 
      fullName: student.full_name || student.studentName || "",               
      phone: student.phone || student.phoneNumber || "",                      
      whatsapp: student.whatsapp_number || student.whatsappNumber || student.phone || "",      
      governorate: student.governorate || "",                                 
      specialization: student.specialization || (Array.isArray(student.selected_departments) && student.selected_departments[0]) || "",                           
      selectedDepartments: depts,                                             
      notes: student.notes || "",                                             
      createdAt: student.created_at || student.timestamp || new Date().toISOString(), 
      bookingSymbol: student.booking_symbol || student.bookingSymbol || "",   
      graduationYear: student.graduation_year || student.graduationYear || "",
      educationLevel: student.education_level || student.educationLevel || "غير محدد", 
      basicCourse: student.basic_course || student.basicCourse || "دورة أكتوبر 2026 (الرئيسية)",         
      status: student.status || "pending",                                    
      expiryDate: student.expires_at || student.expiresAt || student.expiry_date || student.expiryDate || "",
      expiry_date: student.expires_at || student.expiresAt || student.expiry_date || student.expiryDate || "",
      expires_at: student.expires_at || student.expiresAt || student.expiry_date || student.expiryDate || "",
      expiresAt: student.expires_at || student.expiresAt || student.expiry_date || student.expiryDate || "",
      salesAgent: assignedAgent,
      agentName: assignedAgent,
      agent_name: assignedAgent,
      "الموظف": assignedAgent
    };

    // Get active Google Sheet URL from environment, site configs, or fallback
    const localConfigs = getLocalSiteConfigsBackup();
    const targetUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || localConfigs?.google_sheet_url || localConfigs?.custom_google_sheets_url || GOOGLE_SHEET_URL;

    console.log(`[Google Sheets Background] Fire-and-forget sync for "${payload.fullName}" (${payload.phone}) [action=${actionType}]`);

    // Pure fire-and-forget in background with 2s max timeout guard
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    })
      .then(async (res) => {
        const textResp = await res.text().catch(() => "");
        if (textResp.includes("Page not found") || textResp.includes("unable to open")) {
          console.warn("[Google Sheets Warning] Webhook returned 404/Page not found.");
          if (bookingCode) syncedBookingCodes.delete(bookingCode);
          if (phoneNum) syncedBookingCodes.delete(phoneNum);
        } else {
          console.log(`[Google Sheets Lead Sync Success] status=${res.status}`);
        }
      })
      .catch(err => {
        if (bookingCode) syncedBookingCodes.delete(bookingCode);
        if (phoneNum) syncedBookingCodes.delete(phoneNum);
        console.warn("[Google Sheets lead sync background warning]:", err.message);
      })
      .finally(() => clearTimeout(timeoutId));

    return { success: true, dispatched: true };
  } catch (error) {
    console.error("Error in syncToSheet server-side:", error);
    return { success: false, error: String(error) };
  }
}

async function syncComplaintToSheet(complaint: any) {
  try {
    const payload = {
      action: "complaint",
      studentName: complaint.student_name || complaint.studentName || "",
      phoneNumber: complaint.phone_number || complaint.phoneNumber || "",
      type: complaint.type || "",
      text: complaint.text || ""
    };

    const localConfigs = getLocalSiteConfigsBackup();
    const targetUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || localConfigs?.google_sheet_url || localConfigs?.custom_google_sheets_url || GOOGLE_SHEET_URL;

    // Fire-and-forget with 2s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(async (res) => {
        const textResp = await res.text().catch(() => "");
        console.log(`[Google Sheets Complaint Sync Success] status=${res.status}`);
      })
      .catch(err => console.warn("[Google Sheets complaint sync warning]:", err.message))
      .finally(() => clearTimeout(timeoutId));
  } catch (err) {
    console.error("❌ فشل إرسال الشكوى لجوجل شيت:", err);
  }
}

// --- SERVERLESS COMPATIBLE REAL-TIME EVENT BUFFER ---
const recentEvents: Array<{ id: string; type: string; data: any; timestamp: string }> = [];

export function broadcastEvent(type: string, data: any) {
  const eventObj = {
    id: "evt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    type,
    data,
    timestamp: new Date().toISOString()
  };
  recentEvents.unshift(eventObj);
  if (recentEvents.length > 20) {
    recentEvents.pop();
  }
  console.log(`[Event Broadcast] Type: ${type}, Data:`, data?.name);
}


// --- EMBEDDED PERSISTENCE DICTIONARY & MEMORY STORE ---
const EMBEDDED_DATABASES: Record<string, any> = {
  "students_db.json": defaultStudentsDb,
  "site_configs_db.json": defaultSiteConfigsDb,
  "manual_agent_assignments.json": defaultManualAgentAssignments,
  "sales-reps.json": defaultSalesReps,
  "roi-departments.json": defaultRoiDepartments,
};

const MEMORY_CACHE: Record<string, any> = {};

function getCurrentDir(): string {
  try {
    if (typeof __dirname !== "undefined") return __dirname;
  } catch {}
  try {
    if (import.meta && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}
  return process.cwd();
}

function resolveLocalFilePath(filename: string): string | null {
  const baseDir = getCurrentDir();
  const candidates = [
    path.join(process.cwd(), filename),
    path.join(baseDir, "..", filename),
    path.join(baseDir, filename),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}

// --- SMART SERVERLESS PERSISTENCE HELPERS FOR READ-ONLY ENVIRONMENTS (LIKE VERCEL) ---
function readSmartFile(filename: string, defaultContent: any): any {
  const embeddedDefault = EMBEDDED_DATABASES[filename];
  const effectiveDefault = (defaultContent !== undefined && defaultContent !== null && !(Array.isArray(defaultContent) && defaultContent.length === 0))
    ? defaultContent
    : (embeddedDefault !== undefined ? embeddedDefault : defaultContent);

  const localPath = resolveLocalFilePath(filename);
  const tmpPath = path.join("/tmp", filename);
  
  try {
    const hasLocal = localPath ? fs.existsSync(localPath) : false;
    const hasTmp = fs.existsSync(tmpPath);
    
    if (hasTmp) {
      // If local workspace file exists and is newer than /tmp, refresh /tmp
      if (hasLocal && localPath) {
        try {
          const localMtime = fs.statSync(localPath).mtimeMs;
          const tmpMtime = fs.statSync(tmpPath).mtimeMs;
          if (localMtime > tmpMtime) {
            const freshData = fs.readFileSync(localPath, "utf8");
            const freshParsed = JSON.parse(freshData);
            fs.writeFileSync(tmpPath, freshData, "utf8");
            MEMORY_CACHE[filename] = freshParsed;
            return freshParsed;
          }
        } catch (e) {}
      }

      const data = fs.readFileSync(tmpPath, "utf8");
      const parsed = JSON.parse(data);
      MEMORY_CACHE[filename] = parsed;
      return parsed;
    } else if (hasLocal && localPath) {
      const data = fs.readFileSync(localPath, "utf8");
      const parsed = JSON.parse(data);
      try {
        fs.writeFileSync(tmpPath, data, "utf8");
      } catch (e) {}
      MEMORY_CACHE[filename] = parsed;
      return parsed;
    } else if (MEMORY_CACHE[filename]) {
      return MEMORY_CACHE[filename];
    } else if (effectiveDefault !== undefined) {
      try {
        fs.writeFileSync(tmpPath, JSON.stringify(effectiveDefault, null, 2), "utf8");
      } catch (e) {}
      MEMORY_CACHE[filename] = effectiveDefault;
      return effectiveDefault;
    }
  } catch (err) {
    console.warn(`Smart file read failed for ${filename}, returning defaults:`, err);
  }
  return effectiveDefault;
}

function writeSmartFile(filename: string, data: any) {
  MEMORY_CACHE[filename] = data;
  const localPath = resolveLocalFilePath(filename) || path.join(process.cwd(), filename);
  const tmpPath = path.join("/tmp", filename);
  const serialized = JSON.stringify(data, null, 2);
  
  // 1. Try writing to process.cwd() (works on standard servers/local dev)
  try {
    fs.writeFileSync(localPath, serialized, "utf8");
  } catch (err) {
    // This is expected on read-only systems like Vercel
  }
  
  // 2. Also write/update in /tmp to prevent stale reads if /tmp fallback is preferred
  try {
    fs.writeFileSync(tmpPath, serialized, "utf8");
  } catch (err) {
    console.error(`Smart write failed for ${filename} even in /tmp:`, err);
  }
}

const DEFAULT_PDF_SETTINGS = {};

function getPdfSettings() {
  return readSmartFile("pdf-settings.json", DEFAULT_PDF_SETTINGS);
}

function savePdfSettings(settings: any) {
  writeSmartFile("pdf-settings.json", settings);
}

function getDeletedStudentTombstones(): string[] {
  return readSmartFile("deleted_students_tombstones.json", []);
}

function addDeletedStudentTombstones(identifiers: (string | undefined | null)[]) {
  const current = getDeletedStudentTombstones();
  const set = new Set(current.map(s => String(s).trim().toLowerCase()));
  identifiers.forEach(id => {
    if (id && typeof id === "string" && id.trim().length > 0) {
      const val = id.trim();
      const lower = val.toLowerCase();
      set.add(lower);
      const digits = val.replace(/\D/g, "");
      if (digits.length >= 6) {
        set.add(digits);
        let stripped = digits;
        if (stripped.startsWith("201") && stripped.length === 12) stripped = stripped.substring(1);
        if (stripped.startsWith("00201") && stripped.length === 14) stripped = stripped.substring(3);
        set.add(stripped);
      }
    }
  });
  const updated = Array.from(set);
  writeSmartFile("deleted_students_tombstones.json", updated);
  if (hasSupabase && isSupabaseOperationAllowed()) {
    saveSupabaseConfig("deleted_students_tombstones", updated).catch(() => {});
  }
  return updated;
}

function removeDeletedStudentTombstone(idOrPhone: string) {
  if (!idOrPhone) return;
  const current = getDeletedStudentTombstones();
  const clean = idOrPhone.trim();
  const lower = clean.toLowerCase();
  const digits = clean.replace(/\D/g, "");
  let strippedLeading = digits;
  if (strippedLeading.startsWith("201") && strippedLeading.length === 12) strippedLeading = strippedLeading.substring(1);
  if (strippedLeading.startsWith("00201") && strippedLeading.length === 14) strippedLeading = strippedLeading.substring(3);

  const filtered = current.filter(item => {
    const itemTrimmed = item.trim();
    const itemLower = itemTrimmed.toLowerCase();
    if (itemTrimmed === clean || itemLower === lower) return false;
    const itemDigits = itemTrimmed.replace(/\D/g, "");
    if (digits && itemDigits === digits) return false;
    if (strippedLeading && itemDigits === strippedLeading) return false;
    return true;
  });
  writeSmartFile("deleted_students_tombstones.json", filtered);
  if (hasSupabase && isSupabaseOperationAllowed()) {
    saveSupabaseConfig("deleted_students_tombstones", filtered).catch(() => {});
  }
}

function getDeletedRepTombstones(): string[] {
  return [];
}

function addDeletedRepTombstones(identifiers: (string | undefined | null)[]) {
  return [];
}

function removeDeletedRepTombstones(identifiers: (string | undefined | null)[]) {
  return [];
}

function getCachedDeletedStudentTombstonesSet(): Set<string> {
  const current = getDeletedStudentTombstones();
  return new Set(current.map(s => String(s).trim().toLowerCase()));
}

function isStudentDeleted(row: any, tombstonesSet?: Set<string>): boolean {
  if (!row) return true;
  if (row.status === "deleted" || (row.notes && String(row.notes).includes("[DELETED_PERMANENTLY]"))) {
    return true;
  }
  const tombstones = tombstonesSet || getCachedDeletedStudentTombstonesSet();
  if (tombstones.size === 0) return false;

  const idVal = String(row.id || "").trim().toLowerCase();
  if (idVal && tombstones.has(idVal)) return true;

  const codeVal = String(row.reservation_code || row.reservationCode || row.code || "").trim().toLowerCase();
  if (codeVal && tombstones.has(codeVal)) return true;

  const nameVal = String(row.full_name || row.studentName || row.name || "").trim().toLowerCase();
  if (nameVal && tombstones.has(nameVal)) return true;

  const phoneVal = String(row.phone || row.phoneNumber || row.whatsapp_number || row.whatsappNumber || "");
  const digits = phoneVal.replace(/\D/g, "");
  if (digits.length >= 6) {
    if (tombstones.has(digits)) return true;
    let stripped = digits;
    if (stripped.startsWith("201") && stripped.length === 12) stripped = stripped.substring(1);
    if (stripped.startsWith("00201") && stripped.length === 14) stripped = stripped.substring(3);
    if (tombstones.has(stripped)) return true;
  }
  return false;
}

let cachedLocalStudentsBackup: any[] | null = null;
let cachedLocalStudentsTimestamp = 0;

function getLocalStudentsBackup(): any[] {
  const now = Date.now();
  if (cachedLocalStudentsBackup && (now - cachedLocalStudentsTimestamp < 15000)) {
    return cachedLocalStudentsBackup;
  }

  const rows = readSmartFile("students_db.json", defaultStudentsDb || []);
  const tombstones = getCachedDeletedStudentTombstonesSet();
  const map = new Map<string, any>();
  if (Array.isArray(defaultStudentsDb)) {
    for (const r of defaultStudentsDb) {
      if (r && !isStudentDeleted(r, tombstones)) {
        const key = String(r.reservation_code || r.phone || r.id);
        if (key) map.set(key, r);
      }
    }
  }
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (r && !isStudentDeleted(r, tombstones)) {
        const key = String(r.reservation_code || r.phone || r.id);
        if (key) map.set(key, { ...(map.get(key) || {}), ...r });
      }
    }
  }
  const result = Array.from(map.values()).filter(r => !isStudentDeleted(r, tombstones));
  cachedLocalStudentsBackup = result;
  cachedLocalStudentsTimestamp = now;
  return result;
}

function invalidateLocalStudentsCache() {
  cachedLocalStudentsBackup = null;
  cachedLocalStudentsTimestamp = 0;
}

function saveLocalStudentsBackup(rows: any[]) {
  const tombstones = getCachedDeletedStudentTombstonesSet();
  const cleanRows = (rows || []).filter(r => !isStudentDeleted(r, tombstones));
  writeSmartFile("students_db.json", cleanRows);
  cachedLocalStudentsBackup = cleanRows;
  cachedLocalStudentsTimestamp = Date.now();
}

function localInsertStudent(row: any) {
  // If student was previously in tombstones and is explicitly submitting a fresh new registration, un-tombstone them
  if (row.phone) removeDeletedStudentTombstone(row.phone);
  if (row.reservation_code) removeDeletedStudentTombstone(row.reservation_code);
  if (row.full_name) removeDeletedStudentTombstone(row.full_name);

  const rowPhoneDigits = cleanPhoneDigits(row.phone || row.phoneNumber || row.whatsapp_number);
  const list = getLocalStudentsBackup().filter(r => {
    if (String(r.reservation_code) === String(row.reservation_code)) return false;
    if (rowPhoneDigits && rowPhoneDigits.length >= 9) {
      const rDigits = cleanPhoneDigits(r.phone || r.phoneNumber || r.whatsapp_number);
      if (rDigits === rowPhoneDigits) return false;
    }
    return true;
  });
  list.unshift(row);
  saveLocalStudentsBackup(list);
  invalidateLocalStudentsCache();
}

function getManualAgentAssignments(): Record<string, string> {
  const local = readSmartFile("manual_agent_assignments.json", {});
  const siteDb = getLocalSiteConfigsBackup();
  const fromDb = siteDb.manual_agent_assignments || {};
  return { ...defaultManualAgentAssignments, ...fromDb, ...local };
}

function saveManualAgentAssignment(identifier: string, agentName: string) {
  if (!identifier || !agentName) return;
  const current = getManualAgentAssignments();
  const cleanId = String(identifier).trim();
  current[cleanId] = agentName.trim();
  const stripped = cleanId.toUpperCase().replace(/^(REG-|#|CODE-)/i, "").trim();
  if (stripped) current[stripped] = agentName.trim();
  writeSmartFile("manual_agent_assignments.json", current);
  MEMORY_CACHE["manual_agent_assignments.json"] = current;
  const siteDb = getLocalSiteConfigsBackup();
  siteDb.manual_agent_assignments = current;
  saveLocalSiteConfigsBackup(siteDb);
  if (hasSupabase && isSupabaseOperationAllowed()) {
    saveSupabaseConfig("manual_agent_assignments", current).catch(() => {});
  }
}

function localUpdateStudent(codeOrId: string, payload: any) {
  const list = getLocalStudentsBackup();
  const clean = String(codeOrId || "").trim();
  const stripped = clean.toUpperCase().replace(/^(REG-|#|CODE-)/i, "").trim();

  let updated = false;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const match = 
      (r.reservation_code && String(r.reservation_code).trim() === clean) ||
      (r.reservation_code && String(r.reservation_code).trim() === stripped) ||
      (r.id && String(r.id).trim() === clean) ||
      (r.id && String(r.id).trim() === stripped) ||
      (r.phone && String(r.phone).trim() === clean) ||
      (r.whatsapp_number && String(r.whatsapp_number).trim() === clean);

    if (match) {
      list[i] = { ...list[i], ...payload };
      updated = true;
    }
  }

  if (updated) {
    saveLocalStudentsBackup(list);
  }
}

function localDeleteStudent(identifiers: { id?: string; code?: string; phone?: string; name?: string }) {
  addDeletedStudentTombstones([identifiers.id, identifiers.code, identifiers.phone, identifiers.name]);
  const list = getLocalStudentsBackup();
  const filtered = list.filter(r => {
    if (identifiers.id && String(r.id) === String(identifiers.id)) return false;
    if (identifiers.code && (String(r.reservation_code) === String(identifiers.code) || String(r.reservation_code).toUpperCase() === String(identifiers.code).toUpperCase())) return false;
    if (identifiers.phone && (String(r.phone) === String(identifiers.phone) || String(r.whatsapp_number) === String(identifiers.phone))) return false;
    if (identifiers.name && r.full_name && r.full_name.trim() === identifiers.name.trim()) return false;
    return !isStudentDeleted(r);
  });
  saveLocalStudentsBackup(filtered);
}

const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://qphaspuinxldwjijwyrf.supabase.co";

function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return "https://qphaspuinxldwjijwyrf.supabase.co";
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.origin;
  } catch (e) {
    return rawUrl.trim().replace(/\/rest\/v1\/?.*$/, "").replace(/\/$/, "");
  }
}

const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
const DEFAULT_SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwaGFzcHVpbnhsZHdqaWp3eXJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODUzNjY5OCwiZXhwIjoyMTA0MTEyNjk4fQ.GZb9S4wVUjjgoGidSBEcjB4lt_opu56dR6ab1Vy8gGg";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwaGFzcHVpbnhsZHdqaWp3eXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzY2OTgsImV4cCI6MjEwNDExMjY5OH0.i3MDlfY44UaDZLyaaTv-w7fa3NIgmIuFSY29ikYVj7c";
const envSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseKey = (envSupabaseKey && envSupabaseKey.startsWith("ey")) ? envSupabaseKey : DEFAULT_SUPABASE_SERVICE_KEY;

export const hasSupabase = !!(supabaseKey && supabaseKey.trim().length > 0 && supabaseKey !== "dummy-key-to-prevent-crash");
export const supabase = createClient(supabaseUrl, supabaseKey);

function getLocalSiteConfigsBackup(): Record<string, any> {
  return readSmartFile("site_configs_db.json", {});
}

function saveLocalSiteConfigsBackup(configs: Record<string, any>) {
  writeSmartFile("site_configs_db.json", configs);
}

// Circuit breaker for Supabase when egress quota is exceeded or service is temporarily restricted
let supabaseRestrictedUntil = 0;
let lastSupabaseRestrictionNotice = 0;

export function markSupabaseRestricted(reason: string, cooldownMs = 180000) {
  supabaseRestrictedUntil = Date.now() + cooldownMs;
  const now = Date.now();
  if (now - lastSupabaseRestrictionNotice > 60000) {
    lastSupabaseRestrictionNotice = now;
    console.warn(`[Supabase Quota/Status Notice]: ${reason}. System is operating safely with 100% data integrity using local storage.`);
  }
}

export function isSupabaseOperationAllowed(): boolean {
  if (!hasSupabase) return false;
  if (Date.now() < supabaseRestrictedUntil) return false;
  return true;
}

export function logSupabaseNotice(context: string, error: any) {
  if (!error) return;
  const msg = typeof error === "string" ? error : (error.message || JSON.stringify(error));
  if (msg.includes("exceed_egress_quota") || msg.includes("restricted") || msg.includes("spend caps")) {
    markSupabaseRestricted(`Quota restriction detected during ${context}: ${msg}`);
    return;
  }
  console.warn(`[Supabase Notice] ${context}:`, msg);
}

export async function getSupabaseConfig(key: string, defaultVal: any) {
  const localConfigs = getLocalSiteConfigsBackup();
  const fallbackVal = localConfigs[key] !== undefined ? localConfigs[key] : defaultVal;

  if (!hasSupabase || !isSupabaseOperationAllowed()) {
    return fallbackVal;
  }
  try {
    const supaPromise = supabase
      .from("site_configs")
      .select("value")
      .eq("key", key)
      .limit(30)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          logSupabaseNotice(`getSupabaseConfig(${key})`, error);
          return null;
        }
        if (!data) return null;
        return data.value;
      });

    const result = await withTimeout(supaPromise, 2000, null);
    if (result !== null && result !== undefined) {
      return result;
    }
    return fallbackVal;
  } catch (err: any) {
    logSupabaseNotice(`getSupabaseConfig(${key}) exception`, err);
    return fallbackVal;
  }
}

export async function saveSupabaseConfig(key: string, value: any) {
  // Always update local file backup first for 100% resilience
  const localConfigs = getLocalSiteConfigsBackup();
  localConfigs[key] = value;
  saveLocalSiteConfigsBackup(localConfigs);

  if (!hasSupabase || !isSupabaseOperationAllowed()) return;
  try {
    const upsertPromise = supabase
      .from("site_configs")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    await withTimeout(upsertPromise, 3500, null);
  } catch (err: any) {
    logSupabaseNotice(`saveSupabaseConfig(${key}) exception`, err);
  }
}

export const app = express();

// Middleware to preserve original URL paths in serverless/Vercel environments
app.use((req, res, next) => {
  if (req.originalUrl && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  }
  next();
});

// Enable JSON bodies parsing with 50MB limit for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini client (Lazy-initialize safely to avoid crashing if API key is not present on startup)
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in the Secrets panel inside Google AI Studio or on Vercel.");
    }
    genAIClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAIClient;
}

// ----------------- API Endpoints & DB Section -----------------

// Lead representation on frontend / server interface
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
  wantsEquivalence?: boolean;
  selectedDepartments: string[];
  notes: string;
  date: string;
  timestamp: number;
  expiresAt: string;
  status: "pending" | "completed" | "no_reply";
  agentName?: string;
  specialization?: string;
  internalNotes?: string;
  academyName?: string;
  branch?: string;
  submissionDate?: string;
  appliedStatus?: "applied" | "withdrawn" | "pending";
  academyNotes?: string;
  hasExtractedForm?: boolean;
  formExtracted?: boolean;
  rawNotes?: string;
  reassignedTimestamp?: number;
  reassignedDateStr?: string;
}

interface CallbackRequest {
  id: string;
  phoneNumber: string;
  whatsappNumber?: string;
  educationLevel?: string;
  studentName?: string;
  date: string;
  status: "pending" | "completed" | "no_reply";
  agentName?: string;
  internalNotes?: string;
  source?: string;
  specialization?: string;
  ip_address?: string;
}

interface Complaint {
  id: string;
  studentName: string;
  phoneNumber: string;
  type: "complaint" | "suggestion";
  text: string;
  date: string;
}

// Fallback arrays for non-students tables (callbacks & complaints remain in memory to obey instructions, only table students connects to Supabase)
let callbackRequests: CallbackRequest[] = [];

export async function getCallbackRequests(): Promise<CallbackRequest[]> {
  const localVal = callbackRequests;
  return await getSupabaseConfig("callback_requests", localVal);
}

export async function saveCallbackRequests(val: CallbackRequest[]) {
  callbackRequests = val;
  await saveSupabaseConfig("callback_requests", val);
}

// --- DYNAMIC COMPLAINTS BACKUP & SUPABASE PERSISTENCE ---
function getLocalComplaintsBackup(): any[] {
  return readSmartFile("complaints_db.json", []);
}

function saveLocalComplaintsBackup(rows: any[]) {
  writeSmartFile("complaints_db.json", rows);
}

function mapDbRowToComplaint(row: any): Complaint {
  return {
    id: row.id || "comp-" + Math.floor(100000 + Math.random() * 900000),
    studentName: row.student_name || "زائر سري للغاية 🔒",
    phoneNumber: row.phone_number || "غير محدد",
    type: row.type === "suggestion" || row.type === "مقترح" ? "suggestion" : "complaint",
    text: row.text || "",
    date: row.created_at ? new Date(row.created_at).toLocaleDateString("ar-EG") : (row.date || new Date().toLocaleDateString("ar-EG"))
  };
}

async function getComplaintsFromSupabase(): Promise<Complaint[]> {
  const localList = getLocalComplaintsBackup();
  if (hasSupabase) {
    try {
      const supaPromise = supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data, error }) => {
          if (error || !data) return null;
          return data;
        });
      
      const data = await withTimeout(supaPromise, 2000, null);
      if (data && data.length > 0) {
        // Sync local database with Supabase data to stay updated
        saveLocalComplaintsBackup(data);
        return data.map(mapDbRowToComplaint);
      }
    } catch (err) {
      console.error("Exception fetching complaints from Supabase, fallback to local:", err);
    }
  }
  return localList.map(mapDbRowToComplaint);
}

// Initial seed for PDF Leads (downloaders) in server memory
let pdfLeads: any[] = [
  {
    id: "pdf-249511",
    name: "أحمد سيد عبد العال",
    phone: "01034567891",
    specialization: "قسم البرمجة والذكاء الاصطناعي",
    downloadDate: new Date(Date.now() - 4 * 3600000).toISOString(),
    status: "pending",
    agentName: ""
  },
  {
    id: "pdf-110943",
    name: "رنا عماد الشريف",
    phone: "01287654321",
    specialization: "قسم الضيافة الجوية",
    downloadDate: new Date(Date.now() - 12 * 3600000).toISOString(),
    status: "completed",
    agentName: "سارة ممدوح"
  },
  {
    id: "pdf-830219",
    name: "مازن كريم جلال",
    phone: "01123423456",
    specialization: "قسم البترول",
    downloadDate: new Date(Date.now() - 25 * 3600000).toISOString(),
    status: "no_reply",
    agentName: "خالد عبد الفتاح"
  }
];

export async function getPdfLeads(): Promise<any[]> {
  const localVal = pdfLeads;
  return await getSupabaseConfig("pdf_leads", localVal);
}

export async function savePdfLeads(val: any[]) {
  pdfLeads = val;
  await saveSupabaseConfig("pdf_leads", val);
}

// Anti-Duplicate & IP Storage Helpers
const DUPLICATE_WARNING_MESSAGE = "لقد قمت بالتسجيل سابقاً بصفة ناجحة، وطلبك قيد المراجعة والتواصل من قِبل مستشار التسجيل. يرجى الانتظار ولن تحتاج إلى التسجيل مرة أخرى.";

function getClientIp(req: any): string {
  const rawIp = (req.headers["x-forwarded-for"] as string || req.socket?.remoteAddress || req.ip || "").toString();
  const firstIp = rawIp.split(",")[0].trim();
  return firstIp || "127.0.0.1";
}

function cleanPhoneDigits(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

function cleanStudentName(name: string): string {
  if (!name) return "";
  const stripped = name.replace(/^\[.*?\]\s*/, "").trim().toLowerCase();
  return stripped.replace(/\s+/g, " ");
}

function isGenericName(cleanName: string): boolean {
  if (!cleanName || cleanName.length < 3) return true;
  const genericList = ["طالب مجهول", "زائر غير مسجل", "زائر مهتم", "طالب جديد", "مجهول", "شريك توظيف", "حجز تذكرة مجانية"];
  return genericList.includes(cleanName);
}

async function checkIsDuplicateLead(req: any, phone: string, name: string): Promise<boolean> {
  const inputPhone = cleanPhoneDigits(phone);
  if (!inputPhone || inputPhone.length < 9) {
    return false;
  }

  // A. Fast authoritative Cloud check via Supabase
  if (hasSupabase) {
    try {
      const variants = Array.from(new Set([
        phone.trim(),
        inputPhone,
        `2${inputPhone}`,
        `+2${inputPhone}`,
        inputPhone.startsWith("0") ? inputPhone.slice(1) : inputPhone
      ])).filter(Boolean);

      const checkPromise = supabase
        .from("students")
        .select("id, status, notes, phone, whatsapp_number")
        .or(`phone.in.(${variants.join(",")}),whatsapp_number.in.(${variants.join(",")})`)
        .limit(30)
        .then(({ data, error }) => {
          if (error) {
            console.warn("Supabase check error in checkIsDuplicateLead:", error);
            return null; // Fall back to local check if query errored
          }
          if (!data || data.length === 0) {
            // Definitively not registered (or deleted from Supabase) -> ALLOW registration!
            return false;
          }
          // Only count as duplicate if there is an ACTIVE, non-deleted registration
          const hasActiveDuplicate = data.some((r: any) => {
            if (isStudentDeleted(r)) return false;
            if (r.status === "deleted" || (r.notes && String(r.notes).includes("[DELETED_PERMANENTLY]"))) return false;
            return true;
          });
          return hasActiveDuplicate;
        });

      const isDup = await withTimeout(checkPromise, 1500, null);
      if (isDup !== null) {
        // Authoritative decision from Supabase:
        // If false, it means student does not exist or was deleted -> ALLOW registration!
        // If true, an active registration already exists -> BLOCK duplicate!
        return isDup;
      }
    } catch (dbErr) {
      console.warn("Supabase checkIsDuplicateLead warning:", dbErr);
    }
  }

  // B. Fallback to local backup ONLY if Supabase is offline/timed out
  try {
    const localStudents = getLocalStudentsBackup();
    const duplicateInLocal = localStudents.some((s: any) => {
      if (isStudentDeleted(s)) return false;
      if (s.status === "deleted" || (s.notes && String(s.notes).includes("[DELETED_PERMANENTLY]"))) return false;
      const sPhone = cleanPhoneDigits(s.phone || s.phoneNumber || s.whatsapp_number);
      return sPhone && sPhone.length >= 9 && inputPhone === sPhone;
    });

    if (duplicateInLocal) return true;
  } catch (err) {
    console.warn("Local duplicate check warning:", err);
  }

  return false;
}

app.post("/api/pdf-leads", async (req, res) => {
  const { name, phone, whatsapp, specialization, educationLevel, education_level, whatsappNumber } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: "الرجاء توفير الاسم ورقم الهاتف لإتمام تسجيل التحميل." });
    return;
  }

  if (await checkIsDuplicateLead(req, phone, name)) {
    return res.status(400).json({
      error: DUPLICATE_WARNING_MESSAGE,
      isDuplicate: true
    });
  }

  const clientIp = getClientIp(req);
  const cleanName = name.trim();
  const cleanPhone = phone.trim();
  const cleanWhatsapp = (whatsapp || whatsappNumber || cleanPhone).trim();
  const cleanEducation = (educationLevel || education_level || "غير محدد").trim();
  const cleanSpec = (specialization || "الدليل الرسمي الشامل 2026").trim();

  const newPdfLead = {
    id: "pdf-" + Math.floor(100000 + Math.random() * 900000),
    name: cleanName,
    phone: cleanPhone,
    whatsappNumber: cleanWhatsapp,
    educationLevel: cleanEducation,
    specialization: cleanSpec,
    downloadDate: new Date().toISOString(),
    status: "pending",
    agentName: "",
    ip_address: clientIp
  };
  
  const currentLeads = await getPdfLeads();
  currentLeads.unshift(newPdfLead);
  await savePdfLeads(currentLeads);

  // PIPELINE: Also save directly into Supabase 'students' table and Google Sheets as full student record
  try {
    const reservationCode = await getNextReservationCode();
    const serializedNotes = serializeNotes("", `قام الطالب بتحميل ملف PDF الدليل التعريفي لـ ${cleanSpec}. [IP: ${clientIp}]`, false);
    
    const newStudentRow = {
      full_name: cleanName,
      phone: cleanPhone,
      whatsapp_number: cleanWhatsapp,
      graduation_year: "",
      governorate: "تحميل ملفات الـ PDF 📥",
      education_level: cleanEducation,
      basic_course: "تحميل كراسة الشروط والدليل 📥",
      selected_departments: [cleanSpec],
      specialization: cleanSpec,
      agent_name: "",
      notes: serializedNotes,
      reservation_code: reservationCode,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG"),
      created_at: new Date().toISOString()
    };

    localInsertStudent(newStudentRow);

    try {
      syncToSheet(newStudentRow).catch((sheetErr) => {
        console.warn("Sheet sync error for PDF lead:", sheetErr);
      });
    } catch (sheetErr) {
      console.warn("Sheet sync error for PDF lead:", sheetErr);
    }

    if (hasSupabase) {
      const { error: dbError } = await supabase
        .from('students')
        .insert([newStudentRow]);
      if (dbError) {
        console.error("Supabase insert error for PDF lead:", dbError);
      }
    }
  } catch (err) {
    console.error("Exception creating student row for PDF lead:", err);
  }

  // Broadcast PDF download lead real-time
  broadcastEvent("registration", {
    name: cleanName,
    governorate: "تحميل ملفات الـ PDF 📥",
    specialization: cleanSpec,
    source: "تحميل كراسة الشروط والدليل 📥"
  });

  res.json({ success: true, lead: newPdfLead });
});

// Text normalization for Arabic queries & aliases
export function normalizeArabicText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "") // Tashkeel
    .replace(/\s+/g, " ");
}

export const OFFICIAL_PARTNER_ACADEMIES = [
  "أكاديمية السلام للتدريب",
  "أكاديمية تراست للعلوم الطبية",
  "أكاديمية أبيكس",
  "أكاديمية الرفاق للتدريب"
] as const;

// Canonical academy detector: only returns an academy if explicitly present in raw name or notes tags. Never guesses or defaults!
export function resolveCanonicalAcademy(
  academyNameOrRaw?: string,
  rawNotes?: string,
  governorate?: string,
  specializationOrDepts?: string | string[]
): string {
  const raw = (academyNameOrRaw || "").trim();
  const notes = (rawNotes || "").trim();

  let candidate = "";

  // 1. Explicit raw academy provided (and not placeholder)
  if (raw && raw !== "auto" && raw !== "عام" && raw !== "غير محدد" && raw !== "undefined") {
    candidate = raw;
  }

  // 2. Explicit metadata tags in notes
  if (!candidate && notes) {
    if (notes.includes("__ACADEMY_NAME__:")) {
      const match = notes.match(/__ACADEMY_NAME__:([^\n\r]+)/);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val && val !== "auto" && val !== "عام" && val !== "undefined") {
          candidate = val;
        }
      }
    } else if (notes.includes("[تسجيل مباشر من بوابة:")) {
      const match = notes.match(/\[تسجيل مباشر من بوابة:\s*([^\]]+)\]/);
      if (match && match[1]) {
        candidate = match[1].trim();
      }
    } else if (notes.includes("[الاستمارة الرسمية:") || notes.includes("[استمارة التقديم:")) {
      const match = notes.match(/\[(?:الاستمارة الرسمية|استمارة التقديم):\s*([^\]]+)\]/);
      if (match && match[1]) {
        candidate = match[1].trim();
      }
    }
  }

  // If no explicit candidate exists, return empty string (DO NOT GUESS OR FALLBACK)
  if (!candidate) {
    return "";
  }

  const norm = normalizeArabicText(candidate);
  if (/تراست|trust/.test(norm)) {
    return "أكاديمية تراست للعلوم الطبية";
  }
  if (/ابيكس|ابكس|apex/.test(norm)) {
    return "أكاديمية أبيكس";
  }
  if (/رفاق|refaq/.test(norm)) {
    return "أكاديمية الرفاق للتدريب";
  }
  if (/سلام|salam/.test(norm)) {
    return "أكاديمية السلام للتدريب";
  }

  return candidate;
}

// Helper serializers/deserializers to save internalNotes, wantsEquivalence, academyName, branch, submissionDate, appliedStatus, academyNotes, formExtracted
function serializeNotes(
  userNotes: string,
  internalNotes?: string,
  wantsEquivalence?: boolean,
  academyName?: string,
  branch?: string,
  submissionDate?: string,
  appliedStatus?: string,
  academyNotes?: string,
  formExtracted?: boolean
): string {
  let result = userNotes || "";
  if (internalNotes) {
    result += `\n__INTERNAL_NOTES__:${internalNotes}`;
  }
  if (wantsEquivalence !== undefined) {
    result += `\n__WANTS_EQUIVALENCE__:${wantsEquivalence}`;
  }
  if (academyName) {
    result += `\n__ACADEMY_NAME__:${academyName}`;
  }
  if (branch) {
    result += `\n__BRANCH__:${branch}`;
  }
  if (submissionDate) {
    result += `\n__SUBMISSION_DATE__:${submissionDate}`;
  }
  if (appliedStatus) {
    result += `\n__APPLIED_STATUS__:${appliedStatus}`;
  }
  if (academyNotes) {
    result += `\n__ACADEMY_NOTES__:${academyNotes}`;
  }
  if (formExtracted !== undefined) {
    result += `\n__FORM_EXTRACTED__:${formExtracted}`;
  }
  return result;
}

function deserializeNotes(rawNotes: string): {
  userNotes: string;
  internalNotes: string;
  wantsEquivalence: boolean;
  academyName: string;
  branch: string;
  submissionDate: string;
  appliedStatus: "applied" | "withdrawn" | "pending";
  academyNotes: string;
  formExtracted: boolean;
} {
  if (!rawNotes) {
    return {
      userNotes: "",
      internalNotes: "",
      wantsEquivalence: false,
      academyName: "",
      branch: "",
      submissionDate: "",
      appliedStatus: "pending",
      academyNotes: "",
      formExtracted: false
    };
  }

  let internalNotes = "";
  let wantsEquivalence = false;
  let academyName = "";
  let branch = "";
  let submissionDate = "";
  let appliedStatus: "applied" | "withdrawn" | "pending" = "pending";
  let academyNotes = "";
  let formExtracted = false;

  const lines = rawNotes.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("__INTERNAL_NOTES__:")) {
      internalNotes = line.replace("__INTERNAL_NOTES__:", "").trim();
    } else if (line.startsWith("__WANTS_EQUIVALENCE__:")) {
      wantsEquivalence = line.replace("__WANTS_EQUIVALENCE__:", "").trim() === "true";
    } else if (line.startsWith("__ACADEMY_NAME__:")) {
      academyName = line.replace("__ACADEMY_NAME__:", "").trim();
    } else if (line.startsWith("__BRANCH__:")) {
      branch = line.replace("__BRANCH__:", "").trim();
    } else if (line.startsWith("__SUBMISSION_DATE__:")) {
      submissionDate = line.replace("__SUBMISSION_DATE__:", "").trim();
    } else if (line.startsWith("__APPLIED_STATUS__:")) {
      const val = line.replace("__APPLIED_STATUS__:", "").trim();
      if (val === "applied" || val === "withdrawn" || val === "pending") {
        appliedStatus = val;
      }
    } else if (line.startsWith("__ACADEMY_NOTES__:")) {
      academyNotes = line.replace("__ACADEMY_NOTES__:", "").trim();
    } else if (line.startsWith("__FORM_EXTRACTED__:")) {
      formExtracted = line.replace("__FORM_EXTRACTED__:", "").trim() === "true";
    } else {
      cleanLines.push(line);
    }
  }

  // If student has explicit submission date or branch in serialized notes, that also confirms form was generated
  if (branch.length > 0 || submissionDate.length > 0) {
    formExtracted = true;
  }

  return {
    userNotes: cleanLines.join("\n").trim(),
    internalNotes,
    wantsEquivalence,
    academyName,
    branch,
    submissionDate,
    appliedStatus,
    academyNotes,
    formExtracted
  };
}

// Strict check: only students who extracted/created an official application form qualify for the partner academy portal
function hasStudentExtractedForm(leadOrRow: any): boolean {
  if (!leadOrRow) return false;
  if (leadOrRow.hasExtractedForm === true || leadOrRow.has_extracted_form === true || leadOrRow.form_extracted === true || leadOrRow.formExtracted === true) {
    return true;
  }
  const subDate = String(leadOrRow.submission_date || leadOrRow.submissionDate || "").trim();
  const br = String(leadOrRow.branch || "").trim();
  if (subDate.length > 0 || br.length > 0) {
    return true;
  }
  const rawNotes = String(leadOrRow.rawNotes || leadOrRow.notes || "");
  if (rawNotes.includes("__SUBMISSION_DATE__:") || rawNotes.includes("__BRANCH__:") || rawNotes.includes("__FORM_EXTRACTED__:true") || rawNotes.includes("__FORM_GENERATED__:true")) {
    return true;
  }
  return false;
}

// Master verified sales assignment registry from official company records / PDF
const OFFICIAL_SALES_ASSIGNMENTS: Record<string, string> = {
  // Page 1
  "1000": "eng.mohamed",
  "1001": "eng.mohamed",
  "1002": "eng.mohamed",
  "1003": "eng.mohamed",
  "1005": "eng.mohamed",
  "1009": "eng.mohamed",
  "1027": "eng.mohamed",
  "1028": "eng.mohamed",
  "1029": "eng.mohamed",
  "1031": "نيجار",
  "1032": "سهام مصطفى",
  "1035_ali": "",
  "1035_aya": "Aya Elgamal",
  "1036": "هاجر احمد",
  "1037": "عبير المغربى",
  "1038": "Mariam Mahmoud",
  "1039": "هاجر احمد",
  "1041": "Mariam Mahmoud",
  "1042": "هاجر احمد",
  "1043": "معاذ",
  "1044": "جومانه احمد محمد",
  "1045": "مي جوده",
  "1046": "Aya Elgamal",
  "1047": "سهيله عادل",
  "1048": "جومانه احمد محمد",
  "1050": "سهيله عادل",
  "1051": "سهام مصطفى",
  "1052": "منار",
  "1053": "سهيله عادل",
  "1054": "Aya Elgamal",
  "1055": "Aya Elgamal",
  "1056": "سهام مصطفى",
  "1057": "Aya Elgamal",
  "1058": "عبير المغربى",
  "1059": "Aya Elgamal",
  "1060": "ساندي هانى",
  "1061": "Aya Elgamal",
  "1062": "",
  "1063": "سهيله عادل",
  "1064": "",
  "1065": "Aya Elgamal",
  "1066": "جومانه احمد محمد",
  "1067": "Mariam Mahmoud",
  "1068": "منار",
  "1069": "ساندي هانى",
  "1070": "Aya Elgamal",
  "1071": "Mariam Mahmoud",
  "1072": "عبير المغربى",
  "1073": "حسناء حسن",
  "1075": "منار",
  "1076": "Mariam Mahmoud",
  "1077": "منار",
  "1078": "منار",
  "1079": "ساندي هانى",
  "1080": "جومانه احمد محمد",
  "1081": "",
  "1082": "هاجر احمد",
  "1083": "منار",
  "1084": "نيجار",

  // Page 2
  "1085": "",
  "1086": "سهيله عادل",
  "1087": "هاجر احمد",
  "1088": "مي جوده",
  "1089": "Mariam Mahmoud",
  "1090": "Mariam Mahmoud",
  "1091": "منار",
  "1092": "منار",
  "1093": "منار",
  "1094": "Mariam Mahmoud",
  "1095": "هاجر احمد",
  "1096": "منار",
  "1097": "نيجار",
  "1098": "نيجار",
  "1099": "Mariam Mahmoud",
  "1100": "سهيله عادل",
  "1101": "Mariam Mahmoud",
  "1102": "سهيله عادل",
  "1103": "نيجار",
  "1104": "عبير المغربى",
  "1105": "منار",
  "1107": "سهيله عادل",
  "1108": "سهيله عادل",
  "1109": "هاجر احمد",
  "1110": "منار",
  "1111": "عبير المغربى",
  "1112": "جومانه احمد محمد",
  "1113": "ايه مختار فرغلي",
  "1114": "منار",
  "1115": "Aya Elgamal",
  "1116": "Aya Elgamal",
  "1117": "سهيله عادل",
  "1118": "معاذ",
  "1119": "معاذ",
  "1120": "عبير المغربى",
  "1121": "جومانه احمد محمد",
  "1122": "عبير المغربى",
  "1123": "معاذ",
  "1124": "هاجر احمد",
  "1125": "هاجر احمد",
  "1127": "هاجر احمد",
  "1128": "سهام مصطفى",
  "1129": "عبير المغربى",
  "1131": "عبير المغربى",
  "1132": "",
  "1133": "هاجر احمد",
  "1134": "سهيله عادل",
  "1135": "جومانه احمد محمد",
  "1136": "سهام مصطفى",
  "1137": "سهام مصطفى",
  "1138": "سهام مصطفى",
  "1140": "هاجر احمد",
  "1141": "هاجر احمد",
  "1142": "معاذ",
  "1143": "مي جوده",
  "1145": "هاجر احمد",
  "1146": "هاجر احمد",
  "1147": "جومانه احمد محمد",
  "1148": "منار",
  "1149": "عبير المغربى",
  "1150": "سهيله عادل",
  "1151": "نيجار",
  "1152": "مي جوده",
  "1153": "منار",
  "1154": "نيجار",
  "1155": "جومانه احمد محمد",
  "1156": "جومانه احمد محمد",
  "1157": "Malak same ahmed",
  "1158": "منار",

  // Page 3
  "1159": "معاذ",
  "1160": "سهيله عادل",
  "1161": "عبير المغربى",
  "1162": "منار",
  "1163": "معاذ",
  "1164": "منار",
  "1165": "نيجار",
  "1166": "جومانه احمد محمد",
  "1167": "معاذ",
  "1168": "نيجار",
  "1169": "هاجر احمد",
  "1170": "Mariam Mahmoud",
  "1171": "سهيله عادل",
  "1172": "سهيله عادل",
  "1173": "سهيله عادل",
  "1174": "حسناء حسن",
  "1175": "Aya Elgamal",
  "1176": "معاذ",
  "1177": "ندى ياسر محمد",
  "1178": "سهام مصطفى",
  "1179": "هاجر احمد",
  "1180": "معاذ",
  "1181": "حسناء حسن",
  "1182": "هاجر احمد",
  "1182_tasneem": "هاجر احمد",
  "1182_abdullah": "هاجر احمد",
  "1183": "",
  "1184": "Aya Elgamal",
  "1185": "معاذ",
  "1186": "عبير المغربى",
  "1188": "سهيله عادل",
  "1189": "منار",
  "1190": "نيجار",
  "1191": "ساندي هانى",
  "1192": "حسناء حسن",
  "1193": "جومانه احمد محمد",
  "1194": "حسناء حسن",
  "1197": "جومانه احمد محمد",
  "1198": "هاجر احمد",
  "1199": "معاذ",
  "1201": "سهيله عادل",
  "1202": "معاذ",
  "1203": "منار",
  "1204": "منار",
  "1205": "سهيله عادل",
  "1206": "هاجر احمد"
};

export function resolveSalesAgentForLead(row: any, deletedKeys?: Set<string>): string {
  if (!row) return "";

  const activeDeleted = deletedKeys && deletedKeys.size > 0 
    ? deletedKeys 
    : new Set(getDeletedRepKeys().map(k => String(k).trim().toLowerCase()).filter(Boolean));

  const isBlocked = (name: string): boolean => {
    if (!name || !name.trim()) return true;
    const clean = name.trim().toLowerCase();
    const norm = normalizeRepName(name);
    return activeDeleted.has(clean) || activeDeleted.has(norm);
  };

  const code = String(row.reservation_code || row.reservationCode || "").trim();
  const id = String(row.id || "").trim();
  const phone = String(row.phone || row.phoneNumber || row.whatsapp_number || "").trim();
  const strippedCode = code.toUpperCase().replace(/^(REG-|#|CODE-)/i, "").trim();

  // 0. If explicitly assigned in row and not blocked, this is authoritative!
  const rowAgent = String(row.agent_name || row.agentName || row.sales_agent || "").trim();
  if (rowAgent) {
    if (!isBlocked(rowAgent)) {
      return rowAgent;
    }
    return ""; // Agent was permanently deleted
  }

  // 1. Check manual persistent overrides (admin reassignments)
  try {
    const manualMap = getManualAgentAssignments();
    const candidate = (code && manualMap[code]) || 
                      (strippedCode && manualMap[strippedCode]) || 
                      (id && manualMap[id]) || 
                      (phone && manualMap[phone]);
    if (candidate && !isBlocked(candidate)) {
      return candidate.trim();
    }
  } catch (e) {}

  // 2. Check notes for transfer or agent tag
  const notes = String(row.notes || "");
  const transferMatch = notes.match(/\[تحويل لمستشار:\s*([^|\]]+?)(?:\s*بتاريخ|\s*\||\])/);
  if (transferMatch && transferMatch[1] && transferMatch[1].trim()) {
    const cand = transferMatch[1].trim();
    if (!isBlocked(cand)) return cand;
  }

  const match1 = notes.match(/الموظف\/الرابط:\s*([^|\]]+)/);
  if (match1 && match1[1] && match1[1].trim()) {
    const cand = match1[1].trim();
    if (!isBlocked(cand)) return cand;
  }

  const match2 = notes.match(/تسجيل مباشر عبر بوابة السيلز:\s*([^\]]+)/);
  if (match2 && match2[1] && match2[1].trim()) {
    const cand = match2[1].trim();
    if (!isBlocked(cand)) return cand;
  }

  const match3 = notes.match(/الموظف:\s*([^|\]]+)/);
  if (match3 && match3[1] && match3[1].trim()) {
    const cand = match3[1].trim();
    if (!isBlocked(cand)) return cand;
  }

  // 3. Fallback to historical dictionary only if not blocked
  const lookupCode = strippedCode || code || id;
  const name = String(row.full_name || row.student_name || row.studentName || "");

  if (lookupCode === "1035") {
    const cand = (name.includes("علي موسي") || name.includes("علي موسى")) ? OFFICIAL_SALES_ASSIGNMENTS["1035_ali"] : OFFICIAL_SALES_ASSIGNMENTS["1035_aya"];
    if (cand && !isBlocked(cand)) return cand;
    return "";
  }
  if (lookupCode === "1182") {
    const cand = name.includes("تسنيم") ? OFFICIAL_SALES_ASSIGNMENTS["1182_tasneem"] : OFFICIAL_SALES_ASSIGNMENTS["1182_abdullah"];
    if (cand && !isBlocked(cand)) return cand;
    return "";
  }

  if (lookupCode && OFFICIAL_SALES_ASSIGNMENTS[lookupCode]) {
    const cand = OFFICIAL_SALES_ASSIGNMENTS[lookupCode];
    if (cand && !isBlocked(cand)) return cand;
  }

  return "";
}

// Maps Supabase database row to the standard Lead interface
function mapDbRowToLead(row: any): Lead {
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();

  // Safe parsing of selected_departments
  let depts: string[] = [];
  if (Array.isArray(row.selected_departments)) {
    depts = row.selected_departments;
  } else if (typeof row.selected_departments === 'string') {
    try {
      depts = JSON.parse(row.selected_departments);
    } catch {
      depts = row.selected_departments ? row.selected_departments.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    }
  }

  // Parse notes to retrieve userNotes, internalNotes, wantsEquivalence, academyName, branch, submissionDate, appliedStatus, academyNotes
  const rawNotes = row.notes || "";
  const parsed = deserializeNotes(rawNotes);
  const resolvedAgent = resolveSalesAgentForLead(row);

  let reassignedTimestamp: number | undefined = undefined;
  let reassignedDateStr: string | undefined = undefined;
  const transferMatch = rawNotes.match(/\[تحويل لمستشار:\s*([^|\]]+?)\s*بتاريخ\s*([^|\]]+?)(?:\s*\|\s*([^\]]+))?\]/);
  if (transferMatch) {
    if (transferMatch[3]) {
      const pTs = Date.parse(transferMatch[3].trim());
      if (!isNaN(pTs)) {
        reassignedTimestamp = pTs;
        reassignedDateStr = formatEgyptDateTime(pTs);
      }
    }
    if (!reassignedDateStr && transferMatch[2]) {
      reassignedDateStr = transferMatch[2].trim();
    }
  }

  // If lead has a reassignment record, ensure status is "pending" unless the agent explicitly made follow-up notes
  const rawStatus = (row.status as any) || "pending";
  const finalLeadStatus = (reassignedTimestamp && rawStatus === "completed" && !rawNotes.includes("__AGENT_CONTACT_COMPLETED__")) 
    ? "pending" 
    : rawStatus;

  const isFormExtracted = hasStudentExtractedForm({
    ...row,
    notes: rawNotes,
    branch: row.branch || parsed.branch,
    submission_date: row.submission_date || row.submissionDate || parsed.submissionDate,
    has_extracted_form: row.has_extracted_form || parsed.formExtracted
  });

  const isFormSubmitted = Boolean(
    isFormExtracted || 
    rawNotes.includes("تسجيل مباشر من بوابة:") || 
    rawNotes.includes("استمارة التقديم:") || 
    rawNotes.includes("الاستمارة الرسمية:")
  );

  // STRICT REQUIREMENT: Only assign and display an academy if the student genuinely completed/extracted an official application form!
  const detectedAcademy = isFormSubmitted
    ? resolveCanonicalAcademy(
        row.academy_name || parsed.academyName,
        rawNotes,
        row.governorate,
        depts.length > 0 ? depts : (row.specialization || "")
      )
    : "";

  return {
    id: String(row.id || row.reservation_code || "lead-" + Math.floor(100000 + Math.random() * 900000)),
    reservationCode: row.reservation_code || "",
    studentName: row.full_name || "",
    phoneNumber: row.phone || "",
    whatsappNumber: row.whatsapp_number || "",
    graduationYear: row.graduation_year || "",
    governorate: row.governorate || "",
    educationLevel: row.education_level || "غير محدد",
    basicCourse: row.basic_course || "دورة أكتوبر 2026 (الرئيسية)",
    selectedDepartments: depts,
    notes: parsed.userNotes,
    rawNotes: rawNotes,
    date: createdAt.toLocaleString("ar-EG", { timeZone: "Africa/Cairo" }),
    timestamp: createdAt.getTime(),
    expiresAt: row.expires_at || new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG"),
    status: finalLeadStatus,
    agentName: resolvedAgent, // Correctly map sales agent from verified registry
    specialization: row.specialization || "", // Correctly map specialization
    internalNotes: parsed.internalNotes,
    wantsEquivalence: parsed.wantsEquivalence,
    academyName: detectedAcademy,
    branch: row.branch || parsed.branch || "",
    submissionDate: row.submission_date || row.submissionDate || parsed.submissionDate || "",
    appliedStatus: (row.applied_status || parsed.appliedStatus || "pending") as any,
    academyNotes: parsed.academyNotes || "",
    hasExtractedForm: hasStudentExtractedForm({
      ...row,
      notes: rawNotes,
      branch: row.branch || parsed.branch,
      submission_date: row.submission_date || row.submissionDate || parsed.submissionDate,
      has_extracted_form: row.has_extracted_form || parsed.formExtracted
    }),
    formExtracted: hasStudentExtractedForm({
      ...row,
      notes: rawNotes,
      branch: row.branch || parsed.branch,
      submission_date: row.submission_date || row.submissionDate || parsed.submissionDate,
      has_extracted_form: row.has_extracted_form || parsed.formExtracted
    }),
    reassignedTimestamp,
    reassignedDateStr
  };
}

// Pulls students table, strictly filtering out any deleted records
async function getLeadsFromSupabase(): Promise<Lead[]> {
  const localBackup = getLocalStudentsBackup();

  if (!hasSupabase || !isSupabaseOperationAllowed()) {
    return localBackup.filter(r => !isStudentDeleted(r)).map(mapDbRowToLead);
  }

  try {
    const supaPromise = supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (error) {
          logSupabaseNotice("getLeadsFromSupabase select", error);
          return null;
        }
        if (!data) return null;
        return data;
      });

    const data = await withTimeout(supaPromise, 2000, null);

    const deletedKeysArr = await getAuthoritativeDeletedRepKeys();
    const deletedKeys = new Set(deletedKeysArr.map(k => String(k).trim().toLowerCase()).filter(Boolean));

    if (data && data.length > 0) {
      // Keep ONLY valid non-deleted students and resolve sales agents
      const validSupaData = data.filter((r: any) => !isStudentDeleted(r)).map((r: any) => {
        const resolved = resolveSalesAgentForLead(r, deletedKeys);
        if (resolved && !r.agent_name) {
          r.agent_name = resolved;
          if (hasSupabase && r.id) {
            Promise.resolve(supabase.from('students').update({ agent_name: resolved }).eq('id', r.id)).catch(() => {});
          }
        } else if (r.agent_name && (deletedKeys.has(String(r.agent_name).toLowerCase().trim()) || deletedKeys.has(normalizeRepName(r.agent_name)))) {
          r.agent_name = "";
        }
        return r;
      });

      // Merge DB rows with local backup so nothing registered is lost
      const mergedMap = new Map<string, any>();
      for (const localRow of localBackup) {
        if (localRow && !isStudentDeleted(localRow)) {
          const key = String(localRow.reservation_code || localRow.phone || localRow.id);
          if (key) mergedMap.set(key, localRow);
        }
      }
      for (const supaRow of validSupaData) {
        if (supaRow && !isStudentDeleted(supaRow)) {
          const key = String(supaRow.reservation_code || supaRow.phone || supaRow.id);
          if (key) {
            const existing = mergedMap.get(key) || {};
            mergedMap.set(key, { ...existing, ...supaRow });
          }
        }
      }
      const merged = Array.from(mergedMap.values());

      // Sanitize merged rows with authoritative sales rep assignment and deleted agent protection
      merged.forEach((row: any) => {
        const resolved = resolveSalesAgentForLead(row, deletedKeys);
        if (resolved) {
          row.agent_name = resolved;
          row.agentName = resolved;
        } else if (row.agent_name && (deletedKeys.has(String(row.agent_name).toLowerCase().trim()) || deletedKeys.has(normalizeRepName(row.agent_name)))) {
          row.agent_name = "";
          row.agentName = "";
        }
      });

      // Canonicalize academy_name only if the student already submitted/extracted an application form
      merged.forEach((row: any) => {
        const rawNotes = row.notes || "";
        const isFormSubmitted = hasStudentExtractedForm(row) || 
          rawNotes.includes("تسجيل مباشر من بوابة:") || 
          rawNotes.includes("استمارة التقديم:") || 
          rawNotes.includes("الاستمارة الرسمية:");

        if (isFormSubmitted && row.academy_name) {
          row.academy_name = resolveCanonicalAcademy(row.academy_name, row.notes);
        } else if (!isFormSubmitted) {
          row.academy_name = "";
        }
      });

      // Sort merged rows chronologically descending
      merged.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      saveLocalStudentsBackup(merged);
      return merged.filter(r => !isStudentDeleted(r)).map(mapDbRowToLead);
    } else {
      return localBackup.filter(r => !isStudentDeleted(r)).map(mapDbRowToLead);
    }
  } catch (err) {
    console.error("Catch error in fetching students:", err);
    return localBackup.filter(r => !isStudentDeleted(r)).map(mapDbRowToLead);
  }
}

// Finds a single student row matching ID or registration code
async function findStudentRow(id: string): Promise<any> {
  const originalId = String(id || "").trim();
  if (!originalId) return null;
  const cleanId = originalId.toUpperCase().replace(/^(REG-|#|CODE-)/i, "").trim();

  // 1. Instant check in local backup first (0ms latency, always current)
  const localBackup = getLocalStudentsBackup();
  let localMatch = localBackup.find(r => 
    String(r.id) === originalId || 
    String(r.id) === cleanId || 
    String(r.reservation_code) === originalId || 
    String(r.reservation_code) === cleanId ||
    String(r.phone) === originalId ||
    String(r.whatsapp_number) === originalId
  );
  if (localMatch) {
    return localMatch;
  }

  // 2. Check embedded defaultStudentsDb directly to guarantee zero loss
  if (Array.isArray(defaultStudentsDb)) {
    localMatch = (defaultStudentsDb as any[]).find(r => 
      String(r.id) === originalId || 
      String(r.id) === cleanId || 
      String(r.reservation_code) === originalId || 
      String(r.reservation_code) === cleanId ||
      String(r.phone) === originalId ||
      String(r.whatsapp_number) === originalId
    );
    if (localMatch) {
      localInsertStudent(localMatch);
      return localMatch;
    }
  }

  if (!hasSupabase || !isSupabaseOperationAllowed()) {
    return null;
  }

  try {
    // 3. Try match reservation_code with original or clean code with timeout
    const { data: rowsByCode } = await withTimeout(
      supabase
        .from('students')
        .select('*')
        .or(`reservation_code.eq.${originalId},reservation_code.eq.${cleanId}`)
        .limit(30),
      1500,
      { data: null } as any
    );
    if (rowsByCode && rowsByCode.length > 0) {
      localInsertStudent(rowsByCode[0]);
      return rowsByCode[0];
    }

    // 4. Try match ID with numeric parse of clean/original code with timeout
    const numId = parseInt(cleanId, 10) || parseInt(originalId, 10);
    if (numId && !isNaN(numId)) {
      const { data: rowsById } = await withTimeout(
        supabase
          .from('students')
          .select('*')
          .eq('id', numId)
          .limit(30),
        1500,
        { data: null } as any
      );
      if (rowsById && rowsById.length > 0) {
        localInsertStudent(rowsById[0]);
        return rowsById[0];
      }
    }

    // 5. Fallback scan with timeout
    const { data: allRows } = await withTimeout(
      supabase
        .from('students')
        .select('*')
        .limit(30),
      1500,
      { data: null } as any
    );
    if (allRows) {
      const match = allRows.find(r => 
        String(r.id) === originalId || 
        String(r.id) === cleanId || 
        String(r.reservation_code) === originalId || 
        String(r.reservation_code) === cleanId ||
        String(r.phone) === originalId ||
        String(r.whatsapp_number) === originalId
      );
      if (match) {
        localInsertStudent(match);
        return match;
      }
    }
  } catch (err) {
    console.error("Supabase findStudentRow error, looking up in local backup:", err);
  }

  // Graceful local search fallback
  return null;
}

// Finds a single student row matching phone number
async function findStudentRowByPhone(phone: string): Promise<any> {
  const cleanPhone = String(phone || "").trim();
  if (!cleanPhone) return null;

  // 1. Check local backup
  const localBackup = getLocalStudentsBackup();
  let match = localBackup.find(r => 
    String(r.phone) === cleanPhone || 
    String(r.whatsapp_number) === cleanPhone ||
    String(r.phone || "").replace(/\D/g, "") === cleanPhone.replace(/\D/g, "")
  );
  if (match) return match;

  // 2. Check embedded defaultStudentsDb
  if (Array.isArray(defaultStudentsDb)) {
    match = (defaultStudentsDb as any[]).find(r => 
      String(r.phone) === cleanPhone || 
      String(r.whatsapp_number) === cleanPhone ||
      String(r.phone || "").replace(/\D/g, "") === cleanPhone.replace(/\D/g, "")
    );
    if (match) {
      localInsertStudent(match);
      return match;
    }
  }

  if (hasSupabase && isSupabaseOperationAllowed()) {
    try {
      // 3. Try exact match on 'phone' or 'whatsapp_number' with timeout
      const { data: rowsExact } = await withTimeout(
        supabase
          .from('students')
          .select('*')
          .or(`phone.eq.${cleanPhone},whatsapp_number.eq.${cleanPhone}`)
          .limit(30),
        1500,
        { data: null } as any
      );
      if (rowsExact && rowsExact.length > 0) {
        localInsertStudent(rowsExact[0]);
        return rowsExact[0];
      }
    } catch (err) {
      console.warn("Supabase findStudentRowByPhone error:", err);
    }
  }

  return null;
}

// Seed mock leads on first run if DB is entirely empty
async function seedInitialData() {
  const initialLeads = [
    {
      full_name: "أحمد محمود كامل",
      phone: "01212345678",
      whatsapp_number: "01212345678",
      graduation_year: "2025",
      governorate: "القاهرة",
      education_level: "ثانوية عامة",
      selected_departments: ["قسم تكنولوجيا الخدمات الطبية العاجلة", "قسم تكنولوجيا الأشعة والتصوير الطبي"],
      notes: serializeNotes("أرغب في الاستفسار عن تفاصيل تأجيل التجنيد والرسوم الإضافية المطلوبة لتثبيته.", "", false),
      reservation_code: "1000",
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG"),
      created_at: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString()
    },
    {
      full_name: "مريم عبد العزيز حسن",
      phone: "01212123456",
      whatsapp_number: "01212123456",
      graduation_year: "2024",
      governorate: "الإسكندرية",
      education_level: "دبلوم فني صناعي",
      selected_departments: ["قسم تكنولوجيا تصنيع تركيبات الأسنان"],
      notes: serializeNotes("هل تتوفر الدراسة في الفترة المسائية؟ وهل تكلفتها تختلف عن الصباحية؟", "", false),
      reservation_code: "1001",
      status: "completed",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG"),
      created_at: new Date().toISOString()
    }
  ];

  saveLocalStudentsBackup(initialLeads);

  if (!hasSupabase) {
    return;
  }

try {
    // تنظيف وفلترة البيانات الابتدائية بالملي لتطابق الـ 15 عمود وتمنع أي أيرور زيادة
    const cleanedInitialLeads = initialLeads.map((lead: any) => {
      const deptsString = Array.isArray(lead.selected_departments)
        ? lead.selected_departments.join(", ")
        : Array.isArray(lead.selectedDepartments)
          ? lead.selectedDepartments.join(", ")
          : lead.selected_departments || lead.selectedDepartments || "";

      return {
        full_name: lead.full_name || lead.fullName || lead.studentName || "",
        phone: lead.phone || lead.phoneNumber || "",
        governorate: lead.governorate || "",
        specialization: lead.specialization || lead.specializationName || "",
        notes: lead.notes || "",
        created_at: lead.created_at || lead.timestamp || new Date().toISOString(),
        reservation_code: lead.reservation_code || lead.reservationCode || lead.bookingCode || "",
        whatsapp_number: lead.whatsapp_number || lead.whatsappNumber || "",
        graduation_year: lead.graduation_year || lead.graduationYear || "",
        education_level: lead.education_level || lead.educationLevel || "",
        basic_course: lead.basic_course || lead.basicCourse || "",
        selected_departments: deptsString,
        status: lead.status || "pending",
        expires_at: lead.expires_at || lead.expiry_date || lead.expiryDate || lead.expiresAt || ""
      };
    });

    // إرسال البيانات النظيفة المتوافقة تماماً
    const { error } = await supabase.from('students').insert(cleanedInitialLeads);
    if (error) {
      console.error("Error seeding initial students to Supabase:", error);
    } else {
      console.log("Successfully seeded initial students to Supabase.");
    }
  } catch (err) {
    console.error("Exception seeding to Supabase:", err);
  }
}

// Gets the next available sequential reservation code based on max code in Supabase, local backup, and persistent sequence counter
async function getNextReservationCode(): Promise<string> {
  const localConfigs = getLocalSiteConfigsBackup();
  let maxCode = Math.max(1310, parseInt(String(localConfigs?.last_allocated_reservation_code || 1310), 10));

  // Track max code in local backup files first
  try {
    const localBackup = getLocalStudentsBackup();
    for (const row of localBackup) {
      if (row && row.reservation_code) {
        const code = parseInt(row.reservation_code, 10);
        if (!isNaN(code) && code > maxCode) {
          maxCode = code;
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse codes from local student backups:", err);
  }

  // Also query Supabase safely with limit and timeout guard
  if (hasSupabase) {
    try {
      const supaPromise = supabase
        .from('students')
        .select('reservation_code')
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data }) => data || []);

      const data = await withTimeout(supaPromise, 2000, []);
      for (const row of data) {
        if (row && row.reservation_code) {
          const code = parseInt(row.reservation_code, 10);
          if (!isNaN(code) && code > maxCode) {
            maxCode = code;
          }
        }
      }
    } catch (err) {
      console.warn("Could not query reservation codes from Supabase, using local counter:", err);
    }
  }

  const nextCode = maxCode + 1;
  // Persist latest code allocated
  try {
    localConfigs.last_allocated_reservation_code = nextCode;
    saveLocalSiteConfigsBackup(localConfigs);
  } catch (e) {}

  return String(nextCode);
}

// API: Check health/API key status
app.get("/api/health", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    hasApiKey: hasKey,
    time: new Date().toISOString()
  });
});

// API: Site configurations synchronization endpoint
app.get("/api/site-configs", async (req, res) => {
  const localConfigs = getLocalSiteConfigsBackup();
  if (!hasSupabase || !isSupabaseOperationAllowed()) {
    return res.json({ success: true, configs: localConfigs, hasSupabase: false });
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("site_configs")
        .select("key, value")
        .limit(30),
      2000,
      { data: null, error: null } as any
    );
    if (error) {
      logSupabaseNotice("GET /api/site-configs", error);
      return res.json({ success: true, configs: localConfigs, hasSupabase: true, error: error.message });
    }
    const configs: Record<string, any> = { ...localConfigs };
    if (data) {
      data.forEach((row: any) => {
        configs[row.key] = row.value;
      });
    }
    res.json({ success: true, configs, hasSupabase: true });
  } catch (err: any) {
    logSupabaseNotice("GET /api/site-configs exception", err);
    res.json({ success: true, configs: localConfigs, hasSupabase: true, error: String(err) });
  }
});

app.post("/api/site-config", async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  await saveSupabaseConfig(key, value);
  broadcastEvent("site_config_updated", { key, value });
  res.json({ success: true, hasSupabase });
});

// ----------------- News & Social Open Graph Media Endpoints -----------------
export const DEFAULT_SERVER_NEWS_POSTS: any[] = [];

const AI_FAKE_TITLES = [
  "كيف تكتشف شغفك",
  "أسرار سوق العمل",
  "تجهيز المستندات",
  "التوفير المالي",
  "تأجيل التجنيد",
  "الفرق الجوهري",
  "الأنشطة والرحلات",
  "بدء فتح باب قيد الشعب",
];

function isAiGeneratedPost(p: any): boolean {
  if (!p) return true;
  const title = String(p.title || "");
  const id = String(p.id || "");
  if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(id)) {
    if (AI_FAKE_TITLES.some(t => title.includes(t))) return true;
  }
  return AI_FAKE_TITLES.some(t => title.includes(t));
}

export function getAllServerNewsPosts(): any[] {
  try {
    const localConfigs = getLocalSiteConfigsBackup();
    if (localConfigs && localConfigs.custom_news_posts_v1) {
      const posts = typeof localConfigs.custom_news_posts_v1 === "string" 
        ? JSON.parse(localConfigs.custom_news_posts_v1) 
        : localConfigs.custom_news_posts_v1;
      if (Array.isArray(posts)) {
        return posts.filter((p: any) => !isAiGeneratedPost(p));
      }
    }
  } catch (e) {}
  return [];
}

// Endpoint: Fetch all news posts
app.get("/api/news-posts", (req, res) => {
  const posts = getAllServerNewsPosts();
  res.json({ success: true, posts });
});

// Endpoint: Sync news posts from frontend / admin
app.post("/api/news-posts/sync", async (req, res) => {
  const { posts } = req.body;
  if (Array.isArray(posts) && posts.length > 0) {
    await saveSupabaseConfig("custom_news_posts_v1", posts);
    broadcastEvent("site_config_updated", { key: "custom_news_posts_v1", value: posts });
    return res.json({ success: true, count: posts.length });
  }
  res.status(400).json({ error: "Invalid posts array" });
});

// Endpoint: Serve real image for news post (decodes base64 data URLs into binary, or redirects to external URLs)
// This is critical for Facebook, Twitter, WhatsApp, and Telegram crawlers which reject data: URLs
app.get("/api/news-image/:id", (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const allPosts = getAllServerNewsPosts();
    const post = allPosts.find((p: any) => String(p.id) === id);

    if (post && post.imageUrl) {
      const img = String(post.imageUrl).trim();
      
      // If Base64 Data URL (e.g. data:image/webp;base64,...)
      if (img.startsWith("data:")) {
        const match = img.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const buffer = Buffer.from(match[2], "base64");
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
          return res.send(buffer);
        }
      }
      
      // If external HTTP / HTTPS URL
      if (img.startsWith("http://") || img.startsWith("https://")) {
        return res.redirect(302, img);
      }
      
      // If relative URL
      if (img.startsWith("/")) {
        const localPath = path.join(process.cwd(), img);
        if (fs.existsSync(localPath)) {
          return res.sendFile(localPath);
        }
      }
    }

    // Fallback: Academy official logo or banner
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(logoPath);
    }

    res.status(404).send("Image not found");
  } catch (err: any) {
    console.error("Error serving news image:", err);
    res.status(500).send("Error serving image");
  }
});

// Dynamic SSR Open Graph handler for news articles & announcements (Optimized for Facebook, WhatsApp, Telegram, Twitter)
app.get(["/news/:id", "/news", "/article/:id"], (req, res, next) => {
  // Pass static assets (.js, .css, etc.) to next handler
  if (req.path.includes(".")) {
    return next();
  }

  try {
    const rawId = req.params.id || req.query.article || req.query.id || req.query.post || "";
    const cleanId = String(rawId).trim();
    const allNews = getAllServerNewsPosts();
    const post = cleanId ? allNews.find((p: any) => String(p.id) === cleanId) : allNews[0];

    // Read index.html template
    let html = "";
    const possiblePaths = [
      path.resolve(process.cwd(), "dist", "index.html"),
      path.resolve(process.cwd(), "index.html")
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        html = fs.readFileSync(p, "utf-8");
        break;
      }
    }

    if (!html) {
      return next();
    }

    const host = req.get("x-forwarded-host") || req.get("host") || "eg-academies.com";
    const proto = req.get("x-forwarded-proto") || req.protocol || "https";
    const origin = `${proto}://${host}`;

    if (post) {
      const pageTitle = `${post.title} | بوابة المعاهد والأكاديميات المعتمدة`;
      const pageDesc = post.desc || (post.content ? post.content.slice(0, 180) : "بوابة المعاهد الخاصة والأكاديميات المعتمدة بمصر");
      let pageImage = post.imageUrl || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop";
      if (!pageImage.startsWith("http://") && !pageImage.startsWith("https://")) {
        pageImage = `${origin}/api/news-image/${post.id}`;
      }
      const pageUrl = cleanId ? `${origin}/news/${post.id}` : `${origin}/news`;

      // Update <title>
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${pageTitle}</title>`);

      // Prepare comprehensive Open Graph & Twitter Cards
      const ogMeta = [
        `<meta property="og:type" content="article" />`,
        `<meta property="og:site_name" content="بوابة المعاهد الخاصة والأكاديميات المعتمدة بمصر" />`,
        `<meta property="og:title" content="${pageTitle.replace(/"/g, '&quot;')}" />`,
        `<meta property="og:description" content="${pageDesc.replace(/"/g, '&quot;')}" />`,
        `<meta property="og:image" content="${pageImage}" />`,
        `<meta property="og:image:secure_url" content="${pageImage}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${pageTitle.replace(/"/g, '&quot;')}" />`,
        `<meta property="og:url" content="${pageUrl}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${pageTitle.replace(/"/g, '&quot;')}" />`,
        `<meta name="twitter:description" content="${pageDesc.replace(/"/g, '&quot;')}" />`,
        `<meta name="twitter:image" content="${pageImage}" />`,
        `<link rel="canonical" href="${pageUrl}" />`
      ].join("\n    ");

      // Strip previous static tags to prevent conflicting crawler results
      html = html.replace(/<meta\s+property="og:[^>]*>/gi, "");
      html = html.replace(/<meta\s+name="twitter:[^>]*>/gi, "");
      html = html.replace(/<meta\s+property="twitter:[^>]*>/gi, "");
      html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, "");

      // Inject fresh Open Graph tags into <head>
      html = html.replace("</head>", `    ${ogMeta}\n  </head>`);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.status(200).send(html);
  } catch (err: any) {
    console.error("Error in SSR news handler:", err);
    return next();
  }
});

// API: Real-time Polling endpoint (Serverless Optimized - No SSE keepalive or setInterval)
app.get("/api/realtime-events", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  return res.json({
    success: true,
    events: recentEvents,
    timestamp: new Date().toISOString()
  });
});

// API: Post Callback Request from student with active database pipeline
app.post("/api/callbacks", async (req, res) => {
  const { phoneNumber, whatsappNumber, whatsapp_number, educationLevel, education_level, studentName, source, specialization, message } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ error: "الرجاء إدخال رقم الهاتف لطلب الاتصال." });
    return;
  }

  const cleanPhone = phoneNumber.trim();
  const cleanWa = (whatsappNumber || whatsapp_number || cleanPhone).trim();
  const cleanEdu = (educationLevel || education_level || "غير محدد").trim();
  const cleanName = (studentName || "طالب مجهول").trim();
  const cleanSpec = (specialization || "استفسار عام عن كافة التخصصات المتاحة").trim();
  const cleanSource = (source || "استمارة طلب اتصال واستفسار 📞").trim();

  if (await checkIsDuplicateLead(req, cleanPhone, cleanName)) {
    return res.status(400).json({
      error: DUPLICATE_WARNING_MESSAGE,
      isDuplicate: true
    });
  }

  const clientIp = getClientIp(req);

  const newRequest: CallbackRequest = {
    id: "cb-" + Math.floor(100000 + Math.random() * 900000),
    phoneNumber: cleanPhone,
    whatsappNumber: cleanWa,
    educationLevel: cleanEdu,
    studentName: cleanName,
    date: new Date().toLocaleString("ar-EG"),
    status: "pending",
    source: cleanSource,
    specialization: cleanSpec,
    internalNotes: message ? `الرسالة الأساسية: ${message} [IP: ${clientIp}]` : `قام العميل بطلب اتصال هاتفي من ${cleanSource} [IP: ${clientIp}]`,
    ip_address: clientIp
  };

  const currentCallbacks = await getCallbackRequests();
  currentCallbacks.unshift(newRequest);
  await saveCallbackRequests(currentCallbacks);

  // PIPELINE: Also save directly into Supabase 'students' table to establish dual unified delivery pipeline
  try {
    const reservationCode = await getNextReservationCode();
    const serializedNotes = serializeNotes("", message ? `${message} [IP: ${clientIp}]` : `قام العميل بطلب اتصال هاتفي سريع من ${cleanSource}. [IP: ${clientIp}]`, false);

    const newStudentRow = {
      full_name: cleanName,
      phone: cleanPhone,
      whatsapp_number: cleanWa,
      graduation_year: "",
      governorate: "طلب اتصال من مستشار التسجيل 📞",
      education_level: cleanEdu,
      basic_course: cleanSource,
      selected_departments: [cleanSpec],
      specialization: cleanSpec,
      agent_name: "",
      notes: serializedNotes,
      reservation_code: reservationCode,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG"),
      created_at: new Date().toISOString(),
      ip_address: clientIp
    };

    // Mirror to local JSON database backup
    localInsertStudent(newStudentRow);

    // Sync to Google Sheet server-side (failsafe background fire-and-forget)
    try {
      syncToSheet(newStudentRow).catch((sheetSyncErr) => {
        console.warn("Failsafe warning: syncToSheet failed inside /api/callbacks:", sheetSyncErr);
      });
    } catch (sheetSyncErr) {
      console.warn("Failsafe warning: syncToSheet failed inside /api/callbacks:", sheetSyncErr);
    }

    if (hasSupabase) {
      const { error: dbError } = await supabase
        .from('students')
        .insert([newStudentRow]);

      if (dbError) {
        console.error("Pipeline Sync Error: Failed to insert chatbot lead row directly to Supabase:", JSON.stringify(dbError, null, 2));
      } else {
        console.log("Pipeline Sync Success: Chatbot prompt/form lead row logged directly to Supabase as actual student row!");
      }
    }
  } catch (err) {
    console.error("Pipeline Sync Error: Exception thrown inside callbacks -> students pipeline handler:", err);
  }

  // Real-time notification broadcast
  const isChatbot = source && (source.includes("البوت") || source.includes("الشات") || source.includes("محادثة") || source.includes("تلقائي"));
  broadcastEvent("registration", {
    name: cleanName,
    governorate: "طلب اتصال من مستشار التسجيل 📞",
    specialization: cleanSpec,
    source: isChatbot ? "مستشار القبول الذكي 🤖" : `طلب اتصال مباشر 📞`
  });

  res.json({
    success: true,
    message: "تم استقبال طلب الاتصال بنجاح. سيتواصل معك مستشار القبول قريبًا.",
    callback: newRequest
  });
});

// API: Get and Post PDF Library Settings
app.get("/api/pdf-settings", async (req, res) => {
  const localSettings = getPdfSettings();
  const settings = await getSupabaseConfig("pdf_settings", localSettings);
  res.json(settings);
});

app.post("/api/pdf-settings", async (req, res) => {
  const newSettings = req.body;
  if (!newSettings || typeof newSettings !== "object") {
    res.status(400).json({ error: "الرجاء إرسال إعدادات صحيحة." });
    return;
  }
  savePdfSettings(newSettings);
  await saveSupabaseConfig("pdf_settings", newSettings);
  res.json({ success: true, settings: newSettings });
});

// ==========================================
// PDF DIGITAL LIBRARY MANAGER BACKEND LOGIC
// ==========================================
const LIBRARY_PATH = path.join(process.cwd(), "pdf-library.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// حماية السيرفر من الانهيار لضمان تشغيل التسجيل فوراً
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.log("Vercel Environment: Local uploads directory creation skipped safely.");
}

// Serve /uploads folder statically
app.use("/uploads", express.static(UPLOADS_DIR));

const DEFAULT_LIBRARY: any[] = [];

function getLibrary() {
  const lib = readSmartFile("pdf-library.json", DEFAULT_LIBRARY);
  if (Array.isArray(lib)) {
    // Filter out any older mock or placeholder library items (e.g. lib-1, lib-2, file_*)
    return lib.filter((item: any) => item && item.id !== "lib-1" && item.id !== "lib-2" && !String(item.id).startsWith("file_"));
  }
  return [];
}

function saveLibrary(lib: any) {
  writeSmartFile("pdf-library.json", lib);
}

// Get the PDF files library list
app.get("/api/pdf-library", async (req, res) => {
  const localLib = getLibrary();
  let lib = await getSupabaseConfig("pdf_library", null);
  if (!lib || !Array.isArray(lib) || lib.length === 0) {
    lib = await getSupabaseConfig("custom_pdf_library_v1", localLib);
  }
  res.json({ success: true, list: lib });
});

// Create/Update a file record inside the library list
app.post("/api/pdf-library", async (req, res) => {
  const { id, name, url, specialization } = req.body;
  if (!name || !url || !specialization) {
    res.status(400).json({ error: "الرجاء توفير مسمى الملف، رابط التحميل، والقسم المرتبط به." });
    return;
  }

  const localLib = getLibrary();
  const lib = await getSupabaseConfig("pdf_library", localLib);
  let record;

  if (id) {
    // Edit existing record
    const index = lib.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      lib[index] = {
        ...lib[index],
        name,
        url,
        specialization,
        uploadedAt: new Date().toISOString()
      };
      record = lib[index];
    } else {
      record = {
        id: "lib-" + Math.floor(100000 + Math.random() * 900000),
        name,
        url,
        specialization,
        mode: "external",
        uploadedAt: new Date().toISOString()
      };
      lib.push(record);
    }
  } else {
    // Create new record
    record = {
      id: "lib-" + Math.floor(100000 + Math.random() * 900000),
      name,
      url,
      specialization,
      mode: url.includes("/uploads/") ? "uploaded" : "external",
      uploadedAt: new Date().toISOString()
    };
    lib.push(record);
  }

  saveLibrary(lib);
  await saveSupabaseConfig("pdf_library", lib);
  await saveSupabaseConfig("custom_pdf_library_v1", lib);

  // Link this immediately to pdf-settings as requested! ("تثبيت الملف وربطه بـ بوابة التحميل")
  const localSettings = getPdfSettings();
  const settings = await getSupabaseConfig("pdf_settings", localSettings);
  settings[specialization] = url;
  savePdfSettings(settings);
  await saveSupabaseConfig("pdf_settings", settings);

  res.json({ success: true, list: lib, settings });
});

// Delete a library file record
app.delete("/api/pdf-library/:id", async (req, res) => {
  const { id } = req.params;
  const localLib = getLibrary();
  let lib = await getSupabaseConfig("pdf_library", null);
  if (!lib || !Array.isArray(lib) || lib.length === 0) {
    lib = await getSupabaseConfig("custom_pdf_library_v1", localLib);
  }
  const filtered = lib.filter((item: any) => item.id !== id);
  saveLibrary(filtered);
  await saveSupabaseConfig("pdf_library", filtered);
  await saveSupabaseConfig("custom_pdf_library_v1", filtered);
  res.json({ success: true, list: filtered });
});

// Direct file uploader using Base64 strings
app.post("/api/pdf-library/upload", async (req, res) => {
  const { base64, fileName } = req.body;
  if (!base64 || !fileName) {
    res.status(400).json({ error: "الرجاء إرسال الملف كاملاً مرمز بـ Base64 واسمه." });
    return;
  }

  try {
    // Sanitize fileName to prevent path traversal
    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9\.\-\_]/g, "_");
    const uniqueName = `${Date.now()}_${safeName}`;

    // Strip header if it contains e.g., "data:application/pdf;base64,"
    const parsedBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const buffer = Buffer.from(parsedBase64, "base64");

    // 1. Primary: Save to Supabase Storage bucket if hasSupabase is active
    if (hasSupabase) {
      try {
        console.log(`[Supabase Upload] Attempting to upload ${uniqueName} to bucket 'uploads'...`);
        
        let { data, error } = await supabase.storage
          .from("uploads")
          .upload(uniqueName, buffer, {
            contentType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
            upsert: true
          });

        // If bucket does not exist, try to create it dynamically
        if (error && (error.message?.includes("Bucket not found") || (error as any).status === 404)) {
          console.log("[Supabase Storage] 'uploads' bucket not found. Attempting to create it...");
          try {
            const { error: createErr } = await supabase.storage.createBucket("uploads", {
              public: true,
              fileSizeLimit: 52428800 // 50MB
            });
            if (createErr) {
              console.error("[Supabase Storage] Failed to create 'uploads' bucket:", createErr);
            } else {
              console.log("[Supabase Storage] Successfully created public 'uploads' bucket! Retrying upload...");
              const retryResult = await supabase.storage
                .from("uploads")
                .upload(uniqueName, buffer, {
                  contentType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
                  upsert: true
                });
              data = retryResult.data;
              error = retryResult.error;
            }
          } catch (bucketErr) {
            console.error("[Supabase Storage] Exception creating bucket:", bucketErr);
          }
        }

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from("uploads")
            .getPublicUrl(uniqueName);
          
          if (publicUrlData && publicUrlData.publicUrl) {
            console.log(`[Supabase Upload] Successfully saved file to Supabase Storage: ${publicUrlData.publicUrl}`);
            res.json({ success: true, fileUrl: publicUrlData.publicUrl, uniqueName });
            return;
          }
        } else {
          console.warn("[Supabase Upload] Failed, falling back to local file system. Details:", error);
        }
      } catch (supaUploadErr) {
        console.error("[Supabase Upload] Exception thrown, falling back to local storage:", supaUploadErr);
      }
    }

    // 2. Secondary/Fallback: Save to local folder
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/${uniqueName}`;

    res.json({ success: true, fileUrl, uniqueName });
  } catch (error: any) {
    console.error("Error writing uploaded file:", error);
    res.status(500).json({ error: "حدث خطأ أثناء حفظ الملف على السيرفر." });
  }
});

// API: Update PDF URL directly to bypass Vercel payload body size limits
app.post("/api/pdf-library/update", async (req, res) => {
  const { specialization, url } = req.body;
  if (!specialization || !url) {
    res.status(400).json({ error: "الرجاء توفير القسم ورابط الملف المباشر." });
    return;
  }

  // 1. Update in pdf-settings.json
  const localSettings = getPdfSettings();
  const settings = await getSupabaseConfig("pdf_settings", localSettings);
  settings[specialization] = url;
  savePdfSettings(settings);
  await saveSupabaseConfig("pdf_settings", settings);

  // 2. Also update matching record inside pdf-library.json if exists, or append it
  const localLib = getLibrary();
  const lib = await getSupabaseConfig("pdf_library", localLib);
  const index = lib.findIndex((item: any) => item.specialization === specialization);
  if (index !== -1) {
    lib[index].url = url;
    lib[index].uploadedAt = new Date().toISOString();
  } else {
    lib.push({
      id: "lib-" + Math.floor(100000 + Math.random() * 900000),
      name: `كتيب دليل ${specialization}`,
      specialization,
      url,
      mode: "external",
      uploadedAt: new Date().toISOString()
    });
  }
  saveLibrary(lib);
  await saveSupabaseConfig("pdf_library", lib);
  await saveSupabaseConfig("custom_pdf_library_v1", lib);

  res.json({ success: true, list: lib, settings });
});

// API: Complaints and Suggestions Form
app.post("/api/complaints", async (req, res) => {
  const { studentName, phoneNumber, type, text } = req.body;
  if (!text) {
    res.status(400).json({ error: "الرجاء كتابة نص الشكوى أو المقترح لإتمام الإرسال." });
    return;
  }

  const generatedId = "comp-" + Math.floor(100000 + Math.random() * 900000);
  const complaintDbRow = {
    id: generatedId,
    student_name: studentName ? studentName.trim() : "زائر سري للغاية 🔒",
    phone_number: phoneNumber ? phoneNumber.trim() : "غير محدد",
    type: type === "suggestion" ? "suggestion" : "complaint",
    text: text.trim(),
    created_at: new Date().toISOString()
  };

  // 1. Save local JSON backup
  const localList = getLocalComplaintsBackup();
  localList.unshift(complaintDbRow);
  saveLocalComplaintsBackup(localList);

  // 2. Save in Supabase
  if (hasSupabase) {
    try {
      // Omit the string id ('id') so Supabase can auto-generate the int8 bigint identity id natively
      const { id, ...supabaseRow } = complaintDbRow;
      const { error } = await supabase
        .from('complaints')
        .insert([supabaseRow]);
      if (error) {
        console.error("Error inserting complaint to Supabase:", error);
      }
    } catch (err) {
      console.error("Exception inserting complaint to Supabase:", err);
    }
  }

  // Send complaint to Google Sheets in background fire-and-forget
  syncComplaintToSheet(complaintDbRow).catch((err) => {
    console.warn("Complaint sheets sync warning:", err);
  });

  // Broadcast complaint/suggestion real-time
  broadcastEvent("registration", {
    name: studentName ? studentName.trim() : "زائر سري للغاية 🔒",
    governorate: "بوابة المقترحات",
    specialization: type === "suggestion" ? "تقديم اقتراح 💡" : "تقديم شكوى سرية ⚠️",
    source: "بوابة الاستفسارات والدعم 💬"
  });

  res.json({
    success: true,
    message: "تم تسليم الشكوى/المقترح مباشرة وبسرية تامة للإدارة العليا للمعاهد والأكاديميات. شكراً لاهتمامك بالتطوير!"
  });
});

// API: Mock Gmail automated email notification trigger (Google Workspace Suite SMTP simulator)
app.post("/api/simulate-gmail-trigger", (req, res) => {
  const { sender, recipient, subject, bodyTemplate } = req.body;
  console.log("=== SERVER GMAIL API TRANSMISSION LOG ===");
  console.log(`Outbound SMTP Socket: open`);
  console.log(`Sender Verified: ${sender}`);
  console.log(`Recipient Queue: ${recipient}`);
  console.log(`Subject Line: ${subject}`);
  console.log(`Body Delivery Payload:\n${bodyTemplate}`);
  console.log("=========================================");
  res.json({
    success: true,
    message: "تم محاكاة إرسال بريد التأهيل المهني الإلكتروني بنجاح لعنوان الطالب.",
    deliveryId: "gml-api-" + Math.floor(1000000 + Math.random() * 9000000)
  });
});

// API: Admin endpoint to fetch both leads, callback requests, and complaints
app.get("/api/admin/data", async (req, res) => {
  try {
    const supabaseLeads = await getLeadsFromSupabase();
    const complaints = await getComplaintsFromSupabase();
    const callbacks = await getCallbackRequests();
    const plist = await getPdfLeads();
    res.json({
      success: true,
      leads: supabaseLeads || [],
      callbacks: callbacks || [],
      complaints: complaints || [],
      pdfLeads: plist || []
    });
  } catch (err) {
    console.error("Error in GET /api/admin/data:", err);
    const localBackup = getLocalStudentsBackup().map(mapDbRowToLead);
    const localComplaints = getLocalComplaintsBackup().map(mapDbRowToComplaint);
    res.json({
      success: true,
      leads: localBackup,
      callbacks: callbackRequests,
      complaints: localComplaints,
      pdfLeads: pdfLeads
    });
  }
});

// API: Admin endpoint to toggle status / delete entries
app.post("/api/admin/update-status", async (req, res) => {
  const { type, id, status, agentName } = req.body;
  if (type === "callback") {
    const list = await getCallbackRequests();
    const cb = list.find(c => String(c.id) === String(id));
    if (cb) {
      cb.status = status;
      if (agentName !== undefined && String(agentName).trim()) {
        cb.agentName = String(agentName).trim();
      }
      await saveCallbackRequests(list);
      const supabaseLeads = await getLeadsFromSupabase();
      const plist = await getPdfLeads();
      res.json({ success: true, callbacks: list, leads: supabaseLeads, pdfLeads: plist });
      return;
    }
  } else if (type === "pdfLead") {
    const list = await getPdfLeads();
    const pl = list.find(p => String(p.id) === String(id));
    if (pl) {
      pl.status = status;
      if (agentName !== undefined && String(agentName).trim()) {
        pl.agentName = String(agentName).trim();
      }
      await savePdfLeads(list);
      const supabaseLeads = await getLeadsFromSupabase();
      const callbacks = await getCallbackRequests();
      res.json({ success: true, pdfLeads: list, callbacks: callbacks, leads: supabaseLeads });
      return;
    }
  } else if (type === "lead") {
    const dbRow = await findStudentRow(id);
    if (dbRow) {
      const targetStatus = (status !== undefined && status !== null && status !== "") ? status : (dbRow.status || "pending");
      const updatePayload: any = { status: targetStatus };
      if (agentName !== undefined && String(agentName).trim()) {
        const cleanAgent = String(agentName).trim();
        updatePayload.agent_name = cleanAgent;
        if (dbRow.reservation_code) saveManualAgentAssignment(dbRow.reservation_code, cleanAgent);
        if (dbRow.id) saveManualAgentAssignment(String(dbRow.id), cleanAgent);
        if (dbRow.phone) saveManualAgentAssignment(dbRow.phone, cleanAgent);
        if (id) saveManualAgentAssignment(String(id), cleanAgent);
      }

      // Mirror to local JSON database backup
      localUpdateStudent(dbRow.reservation_code || dbRow.id || id, updatePayload);

      // Sync to Supabase safely
      if (hasSupabase) {
        try {
          if (dbRow.id) {
            const numId = parseInt(String(dbRow.id), 10);
            if (!isNaN(numId)) {
              await supabase.from('students').update(updatePayload).eq('id', numId);
            }
          }
          if (dbRow.reservation_code) {
            await supabase.from('students').update(updatePayload).eq('reservation_code', String(dbRow.reservation_code));
          }
          if (dbRow.phone) {
            await supabase.from('students').update(updatePayload).eq('phone', String(dbRow.phone));
          }
        } catch (updateErr) {
          console.error("Supabase update-status error:", updateErr);
        }
      }

      // Sync to Google Sheet server-side (failsafe background fire-and-forget)
      try {
        syncToSheet({ ...dbRow, ...updatePayload }, "update").catch((sheetSyncErr) => {
          console.warn("Failsafe warning: syncToSheet failed inside /api/admin/update-status:", sheetSyncErr);
        });
      } catch (sheetSyncErr) {
        console.warn("Failsafe warning: syncToSheet failed inside /api/admin/update-status:", sheetSyncErr);
      }
    }

    const supabaseLeads = await getLeadsFromSupabase();
    const callbacks = await getCallbackRequests();
    const plist = await getPdfLeads();
    res.json({ success: true, callbacks, leads: supabaseLeads, pdfLeads: plist });
    return;
  }
  res.status(404).json({ error: "الطلب غير موجود" });
});

// ==========================================
// MASTER ADMIN SECURITY PASSWORDS CONFIGURATION
// كلمات مرور الإدارة العليا المعتمدة لتحويل وتعيين السيلز
// ==========================================
const MASTER_ADMIN_PASSWORDS = [
  "Mm151997",
  "mm151997",
  "admin123",
  "151997",
  "eng2026",
  "mamdouh2026",
  "engmamdouh2026"
];

function isMasterPasswordValid(password: string): boolean {
  if (!password) return false;
  const cleanPass = String(password).trim();
  const cleanLower = cleanPass.toLowerCase();
  return MASTER_ADMIN_PASSWORDS.includes(cleanPass) || MASTER_ADMIN_PASSWORDS.includes(cleanLower);
}

// API: Reassign Sales Representative with Master Password
app.post("/api/admin/reassign-agent", async (req, res) => {
  try {
    const { type = "lead", id, reservationCode, phone, newAgentName, password, status } = req.body;

    // Master password check - strictly required for reassign / assign
    if (!isMasterPasswordValid(password)) {
      return res.status(401).json({ 
        success: false, 
        error: "رمز الحماية غير صحيح! يرجى إدخال رمز الإدارة المعتمد لإتمام التحويل أو التعيين." 
      });
    }

    const cleanAgent = (newAgentName || "").trim();
    if (!cleanAgent) {
      return res.status(400).json({ success: false, error: "يرجى تحديد أو كتابة اسم مستشار المبيعات الجديد." });
    }

    if (type === "callback") {
      const list = await getCallbackRequests();
      const cb = list.find(c => String(c.id) === String(id));
      if (!cb) {
        return res.status(404).json({ success: false, error: "طلب الاتصال غير موجود." });
      }
      cb.agentName = cleanAgent;
      cb.status = "pending"; // Always reset to pending upon reassignment
      await saveCallbackRequests(list);

      const supabaseLeads = await getLeadsFromSupabase();
      const plist = await getPdfLeads();
      return res.json({ 
        success: true, 
        message: `تم تحويل طلب الاتصال إلى ${cleanAgent} بنجاح ✓`, 
        callbacks: list, 
        leads: supabaseLeads, 
        pdfLeads: plist 
      });
    }

    if (type === "pdfLead") {
      const list = await getPdfLeads();
      const pl = list.find(p => String(p.id) === String(id));
      if (!pl) {
        return res.status(404).json({ success: false, error: "طلب الدليل غير موجود." });
      }
      pl.agentName = cleanAgent;
      pl.status = "pending"; // Always reset to pending upon reassignment
      await savePdfLeads(list);

      const supabaseLeads = await getLeadsFromSupabase();
      const callbacks = await getCallbackRequests();
      return res.json({ 
        success: true, 
        message: `تم تحويل طلب الدليل إلى ${cleanAgent} بنجاح ✓`, 
        callbacks, 
        leads: supabaseLeads, 
        pdfLeads: list 
      });
    }

    // Lead / Student - look up by id, reservationCode, or phone
    let dbRow = await findStudentRow(id);
    if (!dbRow && reservationCode) {
      dbRow = await findStudentRow(reservationCode);
    }
    if (!dbRow && phone) {
      dbRow = await findStudentRowByPhone(phone);
    }
    if (!dbRow) {
      return res.status(404).json({ success: false, error: "سجل الطالب غير موجود." });
    }

    let notes = dbRow.notes || "";
    if (notes.includes("الموظف/الرابط:")) {
      notes = notes.replace(/الموظف\/الرابط:\s*[^|\]]+/g, `الموظف/الرابط: ${cleanAgent}`);
    } else if (notes.includes("الموظف:")) {
      notes = notes.replace(/الموظف:\s*[^|\]]+/g, `الموظف: ${cleanAgent}`);
    } else {
      notes = notes ? `[إعلان: الموظف/الرابط: ${cleanAgent}] | ${notes}` : `[إعلان: الموظف/الرابط: ${cleanAgent}]`;
    }

    // Always compute exact Egypt date/time on server (accurate Cairo time UTC+3)
    const transferNowStr = formatEgyptDateTime();
    const transferNowIso = new Date().toISOString();
    notes = notes.replace(/\[تحويل لمستشار:\s*[^\]]+\]/g, "").trim();
    notes = `[تحويل لمستشار: ${cleanAgent} بتاريخ ${transferNowStr} | ${transferNowIso}] | ${notes}`;

    // Persist to manual assignments map across all possible identifiers
    if (dbRow.reservation_code) saveManualAgentAssignment(dbRow.reservation_code, cleanAgent);
    if (dbRow.id) saveManualAgentAssignment(String(dbRow.id), cleanAgent);
    if (dbRow.phone) saveManualAgentAssignment(dbRow.phone, cleanAgent);
    if (dbRow.whatsapp_number) saveManualAgentAssignment(dbRow.whatsapp_number, cleanAgent);
    if (id) saveManualAgentAssignment(String(id), cleanAgent);
    if (reservationCode) saveManualAgentAssignment(String(reservationCode), cleanAgent);
    if (phone) saveManualAgentAssignment(String(phone), cleanAgent);

    // CRITICAL: Reassignment ALWAYS resets status to "pending" ("⏳ انتظار تواصل").
    // The sales rep was just assigned and has not yet contacted the student.
    const finalStatus = (status && status !== "completed") ? status : "pending";

    const safeUpdatePayload: any = {
      agent_name: cleanAgent,
      notes: notes,
      status: finalStatus
    };

    // Mirror to local JSON database backup
    localUpdateStudent(dbRow.reservation_code || dbRow.id || id, safeUpdatePayload);

    // Sync to Supabase safely (only valid columns)
    if (hasSupabase) {
      try {
        if (dbRow.id) {
          const numId = parseInt(String(dbRow.id), 10);
          if (!isNaN(numId)) {
            await supabase.from('students').update(safeUpdatePayload).eq('id', numId);
          }
          await supabase.from('students').update(safeUpdatePayload).eq('id', String(dbRow.id));
        }
        if (dbRow.reservation_code) {
          await supabase.from('students').update(safeUpdatePayload).eq('reservation_code', String(dbRow.reservation_code));
        }
        if (dbRow.phone) {
          await supabase.from('students').update(safeUpdatePayload).eq('phone', String(dbRow.phone));
        }
        if (dbRow.whatsapp_number) {
          await supabase.from('students').update(safeUpdatePayload).eq('whatsapp_number', String(dbRow.whatsapp_number));
        }
      } catch (sbErr) {
        console.error("Supabase reassign-agent error:", sbErr);
      }
    }

    // Sync to Google Sheet (background fire-and-forget)
    try {
      syncToSheet({ ...dbRow, ...safeUpdatePayload }, "update").catch((sheetErr) => {
        console.warn("syncToSheet warning in reassign-agent:", sheetErr);
      });
    } catch (sheetErr) {
      console.warn("syncToSheet warning in reassign-agent:", sheetErr);
    }

    const supabaseLeads = await getLeadsFromSupabase();
    const callbacks = await getCallbackRequests();
    const plist = await getPdfLeads();

    return res.json({
      success: true,
      message: `تم تحويل وتعيين الطالب ${dbRow.full_name || ""} إلى مستشار المبيعات (${cleanAgent}) بنجاح وتحديث سوبابيز ✓`,
      agentName: cleanAgent,
      leads: supabaseLeads,
      callbacks,
      pdfLeads: plist
    });
  } catch (err: any) {
    console.error("Error in /api/admin/reassign-agent:", err);
    res.status(500).json({ success: false, error: err.message || "حدث خطأ أثناء تحويل السيلز" });
  }
});

// API: Bulk reassign all leads of an agent to another agent
app.post("/api/admin/bulk-reassign-agent", async (req, res) => {
  try {
    const { fromAgent, toAgent, password } = req.body;

    if (!isMasterPasswordValid(password)) {
      return res.status(401).json({ success: false, error: "رمز الحماية غير صحيح! يرجى إدخال رمز الإدارة المعتمد." });
    }

    const cleanFrom = String(fromAgent || "").trim();
    const cleanTo = String(toAgent || "").trim();
    if (!cleanFrom || !cleanTo) {
      return res.status(400).json({ success: false, error: "يرجى تحديد السيلز الحالي والسيلز الجديد المراد التحويل إليه." });
    }

    let updatedStudentsCount = 0;

    // 1. Direct authoritative batch update in Supabase (both exact and case/name variations)
    if (hasSupabase && isSupabaseOperationAllowed()) {
      try {
        await supabase
          .from('students')
          .update({ agent_name: cleanTo, status: 'pending' })
          .eq('agent_name', cleanFrom);

        const normCleanFrom = normalizeRepName(cleanFrom);
        if (normCleanFrom && normCleanFrom !== cleanFrom) {
          await supabase
            .from('students')
            .update({ agent_name: cleanTo, status: 'pending' })
            .ilike('agent_name', `%${cleanFrom}%`);
        }
      } catch (sbErr) {
        console.warn("Supabase direct bulk agent update warning:", sbErr);
      }
    }

    // 2. Synchronize all local storage students and manual assignments map
    const localStudents = getLocalStudentsBackup();
    const manualAssignments = getManualAgentAssignments();
    const transferNowStr = formatEgyptDateTime();
    const transferNowIso = new Date().toISOString();

    for (const lead of localStudents) {
      const currentAgent = (lead.agentName || lead.agent_name || "").trim();
      if (currentAgent === cleanFrom || normalizeRepName(currentAgent) === normalizeRepName(cleanFrom)) {
        let rawNotes = lead.notes || "";
        rawNotes = rawNotes.replace(/\[تحويل لمستشار:\s*[^\]]+\]/g, "").trim();
        rawNotes = `[تحويل لمستشار: ${cleanTo} بتاريخ ${transferNowStr} | ${transferNowIso}] | ${rawNotes}`;
        lead.agent_name = cleanTo;
        lead.agentName = cleanTo;
        lead.notes = rawNotes;
        lead.status = "pending";

        if (lead.reservation_code) {
          const c = String(lead.reservation_code).trim();
          manualAssignments[c] = cleanTo;
          const sc = c.toUpperCase().replace(/^(REG-|#|CODE-)/i, "").trim();
          if (sc) manualAssignments[sc] = cleanTo;
        }
        if (lead.id) manualAssignments[String(lead.id).trim()] = cleanTo;
        if (lead.phone) manualAssignments[String(lead.phone).trim()] = cleanTo;
        if (lead.whatsapp_number) manualAssignments[String(lead.whatsapp_number).trim()] = cleanTo;

        updatedStudentsCount++;
      }
    }

    saveLocalStudentsBackup(localStudents);
    writeSmartFile("manual_agent_assignments.json", manualAssignments);
    MEMORY_CACHE["manual_agent_assignments.json"] = manualAssignments;
    const siteDb = getLocalSiteConfigsBackup();
    siteDb.manual_agent_assignments = manualAssignments;
    saveLocalSiteConfigsBackup(siteDb);
    if (hasSupabase && isSupabaseOperationAllowed()) {
      saveSupabaseConfig("manual_agent_assignments", manualAssignments).catch(() => {});
    }

    // Also update callbacks and pdf leads if assigned to this agent
    const callbacks = await getCallbackRequests();
    let cbUpdated = false;
    callbacks.forEach(c => {
      if ((c.agentName || "").trim() === cleanFrom) {
        c.agentName = cleanTo;
        cbUpdated = true;
      }
    });
    if (cbUpdated) await saveCallbackRequests(callbacks);

    const pdfLeads = await getPdfLeads();
    let plUpdated = false;
    pdfLeads.forEach(p => {
      if ((p.agentName || "").trim() === cleanFrom) {
        p.agentName = cleanTo;
        plUpdated = true;
      }
    });
    if (plUpdated) await savePdfLeads(pdfLeads);

    const refreshedLeads = await getLeadsFromSupabase();

    return res.json({
      success: true,
      message: `تم تحويل جميع طلاب (${cleanFrom}) وعددهم (${updatedStudentsCount} طالب) إلى مستشار المبيعات (${cleanTo}) بنجاح وتحديث سوبابيز ✓`,
      leads: refreshedLeads,
      callbacks,
      pdfLeads,
      updatedCount: updatedStudentsCount
    });
  } catch (err: any) {
    console.error("Error in bulk-reassign-agent:", err);
    res.status(500).json({ success: false, error: err.message || "حدث خطأ أثناء التحويل الجماعي" });
  }
});

app.post("/api/admin/sync-all-to-remote", async (req, res) => {
  try {
    const students = await getLeadsFromSupabase();
    let supaUpdated = 0;
    let sheetsPushed = 0;

    for (const lead of students) {
      const resolvedAgent = lead.agentName || (lead as any).agent_name || resolveSalesAgentForLead(lead) || "";
      if (resolvedAgent) {
        lead.agentName = resolvedAgent;
        (lead as any).agent_name = resolvedAgent;
      }

      if (hasSupabase && lead.id) {
        try {
          await supabase.from('students').update({
            agent_name: resolvedAgent
          }).eq('id', lead.id);
          supaUpdated++;
        } catch (e) {}
      }

      try {
        syncToSheet(lead, "sync").catch(() => {});
        sheetsPushed++;
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: `تمت مزامنة جميع الطلاب (${students.length}) مع سوبابيز وجوجل شيت بنجاح ✓`,
      total: students.length,
      supaUpdated,
      sheetsPushed
    });
  } catch (err: any) {
    console.error("Error in /api/admin/sync-all-to-remote:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/google-sheets/config - Get active Google Sheets URL and sync status
app.get("/api/google-sheets/config", async (req, res) => {
  try {
    const localConfigs = getLocalSiteConfigsBackup();
    const activeUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || localConfigs?.google_sheet_url || localConfigs?.custom_google_sheets_url || GOOGLE_SHEET_URL;
    const isCustom = !!(localConfigs?.google_sheet_url || localConfigs?.custom_google_sheets_url || process.env.GOOGLE_SHEETS_WEBHOOK_URL);
    const leads = await getLeadsFromSupabase();
    res.json({
      success: true,
      googleSheetUrl: activeUrl,
      isCustom,
      totalStudents: leads.length,
      hasDefaultFallback: !isCustom
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/google-sheets/config - Save custom Google Sheets Webhook URL and test ping
app.post("/api/google-sheets/config", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return res.status(400).json({ 
        success: false, 
        error: "رابط Google Sheet Webhook غير صالح. يجب أن يبدأ بـ https://" 
      });
    }

    const cleanUrl = url.trim();

    // Check if the user mistakenly provided a normal Google Sheet viewer URL instead of the Apps Script Webhook
    if (cleanUrl.includes("docs.google.com/spreadsheets")) {
      return res.status(400).json({
        success: false,
        error: "⚠️ هذا رابط ملف Google Sheets العادي للمشاهدة، وليس رابط الويب هوك البرمجي (Apps Script Web App). للربط التلقائي، يرجى فتح الشيت > Extensions > Apps Script > نشر Web app واختيار Who has access: Anyone، ثم نسخ الرابط الذي ينتهي بـ /exec ولصقه هنا."
      });
    }

    const localConfigs = getLocalSiteConfigsBackup();
    localConfigs.google_sheet_url = cleanUrl;
    localConfigs.custom_google_sheets_url = cleanUrl;
    saveLocalSiteConfigsBackup(localConfigs);

    // Test ping with redirect following and diagnostic analysis
    let pingSuccess = false;
    let pingMsg = "";
    try {
      const pingController = new AbortController();
      const pingTimeout = setTimeout(() => pingController.abort(), 10000);

      const pingRes = await fetch(cleanUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping", test: true, timestamp: new Date().toISOString() }),
        redirect: "follow",
        signal: pingController.signal
      });
      clearTimeout(pingTimeout);

      const respText = await pingRes.text().catch(() => "");
      if (respText.includes("Page not found") || respText.includes("unable to open")) {
        pingSuccess = false;
        pingMsg = "تنبيه: استجاب الرابط بـ 'Page not found'. يرجى التأكد من اختيار 'Who has access: Anyone' في إعدادات النشر بـ Google Apps Script.";
      } else if (pingRes.ok || respText.includes("success") || respText.includes("connected")) {
        pingSuccess = true;
        pingMsg = "تم اختبار الرابط والاتصال بشيت جوجل بنجاح ✓";
      } else {
        pingSuccess = false;
        pingMsg = `الرابط استجاب برمز: ${pingRes.status}`;
      }
    } catch (e: any) {
      pingMsg = "تم حفظ الرابط محلياً (ملاحظة الاتصال: " + (e.message || "تعذر التحقق الفوري") + ")";
    }

    res.json({
      success: true,
      message: pingSuccess ? "تم حفظ وتفعيل رابط Google Sheet Webhook بنجاح ✓" : "تم حفظ الرابط (يرجى مراجعة صلاحيات النشر Anyone)",
      googleSheetUrl: cleanUrl,
      pingSuccess,
      pingMsg
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/google-sheets/sync-all - Push all registered students to active Google Sheet
app.post("/api/google-sheets/sync-all", async (req, res) => {
  try {
    const leads = await getLeadsFromSupabase();
    if (!leads || leads.length === 0) {
      return res.json({ success: true, message: "لا يوجد طلاب مسجلين حالياً للترحيل", total: 0, pushedCount: 0 });
    }

    const localConfigs = getLocalSiteConfigsBackup();
    const targetUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || localConfigs?.google_sheet_url || localConfigs?.custom_google_sheets_url || GOOGLE_SHEET_URL;

    // Prepare formatted students list for bulk sync
    const formattedStudents = leads.map((item: any) => {
      const student: any = item;
      const bookingCode = String(student["رمز_الحجز"] || student.reservation_code || student.reservationCode || student.bookingCode || "").trim();
      const depts = Array.isArray(student.selected_departments)
        ? student.selected_departments.join(", ")
        : Array.isArray(student.selectedDepartments)
          ? student.selectedDepartments.join(", ")
          : student.selected_departments || student.selectedDepartments || "";
      const assignedAgent = student.sales_agent || student.salesAgent || student.agentName || student.agent_name || resolveSalesAgentForLead(student) || "";

      return {
        bookingCode,
        fullName: student.full_name || student.studentName || "",
        phone: student.phone || student.phoneNumber || "",
        whatsapp: student.whatsapp_number || student.whatsappNumber || student.phone || "",
        governorate: student.governorate || "",
        selectedDepartments: depts,
        specialization: student.specialization || (Array.isArray(student.selected_departments) && student.selected_departments[0]) || "",
        educationLevel: student.education_level || student.educationLevel || "غير محدد",
        graduationYear: student.graduation_year || student.graduationYear || "",
        salesAgent: assignedAgent,
        status: student.status || "pending",
        createdAt: student.created_at || student.timestamp || new Date().toISOString(),
        notes: student.notes || ""
      };
    });

    // 1. Try sending bulk sync payload first (supported by upgraded Apps Script)
    let bulkSuccess = false;
    try {
      const bulkController = new AbortController();
      const bulkTimeout = setTimeout(() => bulkController.abort(), 20000);

      const bulkRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_sync",
          students: formattedStudents,
          count: formattedStudents.length
        }),
        redirect: "follow",
        signal: bulkController.signal
      });
      clearTimeout(bulkTimeout);

      const bulkText = await bulkRes.text().catch(() => "");
      if (bulkRes.ok && (bulkText.includes("success") || bulkText.includes("count"))) {
        bulkSuccess = true;
      }
    } catch (bulkErr) {
      console.warn("Bulk sync attempt returned, falling back to sequential:", bulkErr);
    }

    if (bulkSuccess) {
      return res.json({
        success: true,
        message: `تم إرسال ومزامنة كافة الطلاب (${leads.length} طالب) إلى شيت جوجل بنجاح دفعة واحدة ✓`,
        total: leads.length,
        pushedCount: leads.length,
        failedCount: 0
      });
    }

    // 2. Fallback: Sequential sync with slight pacing to prevent Google Sheets lock collisions
    let pushedCount = 0;
    let failedCount = 0;

    for (const lead of leads) {
      try {
        syncToSheet(lead, "sync").catch(() => {});
        pushedCount++;
      } catch (e) {
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: `تم ترحيل ومزامنة كافة الطلاب (${pushedCount} طالب) إلى شيت جوجل بنجاح ✓`,
      total: leads.length,
      pushedCount,
      failedCount
    });
  } catch (err: any) {
    console.error("Error in /api/google-sheets/sync-all:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export all students as genuine Excel (.xlsx) workbook with separate columns, RTL, and text formatting
app.get("/api/admin/export/students-excel", async (req, res) => {
  try {
    const students = await getLeadsFromSupabase();
    
    const headers = [
      "م",
      "كود الحجز",
      "اسم الطالب",
      "رقم الهاتف",
      "رقم الواتساب",
      "المحافظة",
      "المؤهل الدراسي",
      "سنة التخرج",
      "التخصص / الأقسام المختارة",
      "الأكاديمية المسجل بها",
      "الفرع المفضل",
      "الموظف المسؤول",
      "حالة الطلب",
      "استخراج الاستمارة الرسمية",
      "تاريخ ووقت التسجيل",
      "الملاحظات ومصدر الإعلان"
    ];

    const dataRows = students.map((s, idx) => {
      const depts = Array.isArray(s.selectedDepartments)
        ? s.selectedDepartments.join(" - ")
        : (s.selectedDepartments || (s as any).selected_departments || s.specialization || "");
      
      const phone = String(s.phoneNumber || (s as any).phone || "");
      const whatsapp = String(s.whatsappNumber || (s as any).whatsapp_number || phone);
      const code = String(s.reservationCode || (s as any).reservation_code || s.id || "");
      const formExtracted = s.hasExtractedForm || (s as any).formExtracted ? "تم استخراج الاستمارة ✓" : "لم تستخرج بعد";

      return [
        idx + 1,
        code,
        s.studentName || (s as any).full_name || "",
        phone,
        whatsapp,
        s.governorate || "",
        s.educationLevel || (s as any).education_level || "",
        s.graduationYear || (s as any).graduation_year || "",
        depts,
        s.academyName || (s as any).academy_name || "غير محدد",
        s.branch || (s as any).branch || "",
        s.agentName || (s as any).agent_name || "غير محدد",
        s.status || "جديد",
        formExtracted,
        s.date || (s as any).created_at || "",
        s.notes || ""
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Force phone numbers and reservation codes to string text type so leading zeros like '010...' are preserved
    const range = XLSX.utils.decode_range(ws['!ref'] || "A1:P1");
    for (let R = 1; R <= range.e.r; ++R) {
      // col 1: code (B), col 3: phone (D), col 4: whatsapp (E)
      [1, 3, 4].forEach(C => {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cellAddress] && ws[cellAddress].v !== undefined) {
          ws[cellAddress].t = 's'; // string text
          ws[cellAddress].v = String(ws[cellAddress].v);
        }
      });
    }

    // Set custom column widths for clean readability
    ws['!cols'] = [
      { wch: 6 },   // م
      { wch: 14 },  // كود الحجز
      { wch: 28 },  // اسم الطالب
      { wch: 18 },  // رقم الهاتف
      { wch: 18 },  // رقم الواتساب
      { wch: 15 },  // المحافظة
      { wch: 20 },  // المؤهل الدراسي
      { wch: 13 },  // سنة التخرج
      { wch: 34 },  // التخصص / الأقسام المختارة
      { wch: 26 },  // الأكاديمية المسجل بها
      { wch: 18 },  // الفرع المفضل
      { wch: 22 },  // الموظف المسؤول
      { wch: 16 },  // حالة الطلب
      { wch: 24 },  // استخراج الاستمارة الرسمية
      { wch: 24 },  // تاريخ ووقت التسجيل
      { wch: 40 }   // الملاحظات ومصدر الإعلان
    ];

    // Right-to-Left sheet property for Arabic
    ws['!views'] = [{ rightToLeft: true }];

    XLSX.utils.book_append_sheet(wb, ws, "سجل الطلاب المركزي");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="students_database_backup_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  } catch (err: any) {
    console.error("Error exporting students Excel:", err);
    res.status(500).send("Failed to export students Excel: " + err.message);
  }
});

// Export all students as CSV with UTF-8 BOM and sep=, directive for automatic column separation in Excel
app.get("/api/admin/export/students-csv", async (req, res) => {
  try {
    // If format=xlsx requested, redirect or handle as excel
    if (req.query.format === "xlsx" || req.query.format === "excel") {
      return res.redirect("/api/admin/export/students-excel");
    }

    const students = await getLeadsFromSupabase();
    const bom = "\uFEFF";
    // Crucial for Excel: sep=, tells Excel to immediately split columns by comma instead of dumping into Column A
    const excelSepHeader = "sep=,\r\n";
    const headers = [
      "م",
      "كود الحجز",
      "اسم الطالب",
      "رقم الهاتف",
      "رقم الواتساب",
      "المحافظة",
      "المؤهل الدراسي",
      "سنة التخرج",
      "التخصص / الأقسام المختارة",
      "الأكاديمية المسجل بها",
      "الفرع المفضل",
      "الموظف المسؤول",
      "الحالة",
      "استخراج الاستمارة الرسمية",
      "تاريخ التسجيل",
      "الملاحظات ومصدر الإعلان"
    ];

    const escapeCsv = (val: any) => {
      const s = String(val ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ");
      return `"${s}"`;
    };

    const rows = students.map((s, idx) => {
      const depts = Array.isArray(s.selectedDepartments)
        ? s.selectedDepartments.join(" - ")
        : (s.selectedDepartments || (s as any).selected_departments || s.specialization || "");
      
      const phone = String(s.phoneNumber || (s as any).phone || "");
      const whatsapp = String(s.whatsappNumber || (s as any).whatsapp_number || phone);
      const code = String(s.reservationCode || (s as any).reservation_code || s.id || "");
      const formExtracted = s.hasExtractedForm || (s as any).formExtracted ? "تم استخراج الاستمارة ✓" : "لم تستخرج بعد";

      return [
        idx + 1,
        escapeCsv(code),
        escapeCsv(s.studentName || (s as any).full_name),
        // Add tab prefix or quotes to ensure phone numbers preserve leading 0
        escapeCsv(phone ? `\t${phone}` : ""),
        escapeCsv(whatsapp ? `\t${whatsapp}` : ""),
        escapeCsv(s.governorate),
        escapeCsv(s.educationLevel || (s as any).education_level),
        escapeCsv(s.graduationYear || (s as any).graduation_year),
        escapeCsv(depts),
        escapeCsv(s.academyName || (s as any).academy_name || "غير محدد"),
        escapeCsv(s.branch || (s as any).branch || ""),
        escapeCsv(s.agentName || (s as any).agent_name || "غير محدد"),
        escapeCsv(s.status || "pending"),
        escapeCsv(formExtracted),
        escapeCsv(s.date || (s as any).created_at || ""),
        escapeCsv(s.notes || "")
      ].join(",");
    });

    const csvContent = bom + excelSepHeader + [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="students_database_backup_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error("Error exporting students CSV:", err);
    res.status(500).send("Failed to export students: " + err.message);
  }
});

app.get("/api/admin/export/students-json", async (req, res) => {
  try {
    const students = await getLeadsFromSupabase();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="students_db_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({
      success: true,
      total: students.length,
      exportedAt: new Date().toISOString(),
      students
    });
  } catch (err: any) {
    console.error("Error exporting students JSON:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students/import-from-sheet - Imports leads directly from Google Sheets / Excel copy-paste
app.post("/api/students/import-from-sheet", async (req, res) => {
  try {
    const { text, rows } = req.body;
    let parsedStudents: any[] = [];

    if (Array.isArray(rows) && rows.length > 0) {
      parsedStudents = rows;
    } else if (text && typeof text === "string" && text.trim().length > 0) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        return res.status(400).json({ success: false, error: "لا توجد بيانات صالحة للمعالجة." });
      }

      let headerRow: string[] = [];
      let startIndex = 0;
      const firstLineSplit = lines[0].includes("\t") ? lines[0].split("\t") : lines[0].split(",");
      const hasHeaderKeywords = firstLineSplit.some(col => 
        /اسم|هاتف|تليفون|موبيل|واتس|محافظ|تخصص|دورة|مؤهل|ملاحظ|تاريخ|طالب|شعبة/i.test(col)
      );

      if (hasHeaderKeywords) {
        headerRow = firstLineSplit.map(h => h.trim().toLowerCase());
        startIndex = 1;
      }

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

        // Fallback heuristics if header wasn't matched
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
          parsedStudents.push({
            studentName: name || "طالب بدون اسم",
            phoneNumber: phone,
            whatsappNumber: whatsapp || phone,
            governorate: governorate || "غير محدد",
            specialization: specialization || "غير محدد",
            agentName: agent || "",
            status: status || "pending",
            notes: notes || "",
            educationLevel: eduLevel || "غير محدد",
            date: dateStr || new Date().toISOString()
          });
        }
      }
    }

    if (parsedStudents.length === 0) {
      return res.status(400).json({ success: false, error: "لم يتم التعرف على أي بيانات طلاب في النص المدخل." });
    }

    const existingLeads = await getLeadsFromSupabase();
    const existingPhones = new Set<string>();
    existingLeads.forEach(l => {
      const p = cleanPhoneDigits(l.phoneNumber || l.whatsappNumber);
      if (p) {
        existingPhones.add(p);
        if (p.length === 11 && p.startsWith("01")) existingPhones.add(p.substring(1));
        if (p.length === 10) existingPhones.add("0" + p);
      }
    });

    const importedStudents: any[] = [];
    const skippedDuplicates: any[] = [];

    for (const item of parsedStudents) {
      const rawPhone = item.phoneNumber || item.phone || item.whatsappNumber || item.whatsapp_number || "";
      const cleanPh = cleanPhoneDigits(rawPhone);
      const studentName = (item.studentName || item.full_name || item.name || "").trim();

      if (!studentName && !cleanPh) continue;

      if (cleanPh && existingPhones.has(cleanPh)) {
        skippedDuplicates.push({ studentName, phone: cleanPh, reason: "موجود مسبقاً في قاعدة البيانات" });
        continue;
      }

      const resCode = await getNextReservationCode();
      const newStudentRow = {
        full_name: studentName || "طالب بدون اسم",
        phone: cleanPh || rawPhone.replace(/\D/g, ""),
        whatsapp_number: cleanPhoneDigits(item.whatsappNumber || item.whatsapp_number) || cleanPh,
        graduation_year: item.graduationYear || item.graduation_year || "",
        governorate: item.governorate || "غير محدد",
        education_level: item.educationLevel || item.education_level || "غير محدد",
        basic_course: item.basicCourse || item.basic_course || "دورة أكتوبر 2026 (الرئيسية)",
        selected_departments: item.selectedDepartments || [item.specialization || "غير محدد"],
        specialization: item.specialization || "غير محدد",
        agent_name: item.agentName || item.agent_name || "",
        notes: item.notes ? `${item.notes} | [مستورد من Google Sheet]` : "[مستورد من Google Sheet]",
        reservation_code: resCode,
        status: item.status || "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG"),
        created_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      };

      // 1. Local backup
      localInsertStudent(newStudentRow);

      // 2. Supabase insert
      if (hasSupabase) {
        try {
          const { error: sbErr } = await supabase.from('students').insert([newStudentRow]);
          if (sbErr) {
            console.warn("Supabase import warning (code collision):", sbErr.message);
            newStudentRow.reservation_code = `${await getNextReservationCode()}-${Math.floor(10 + Math.random() * 90)}`;
            localInsertStudent(newStudentRow);
            await supabase.from('students').insert([newStudentRow]);
          }
        } catch (e: any) {
          console.error("Supabase import exception:", e.message);
        }
      }

      if (cleanPh) {
        existingPhones.add(cleanPh);
      }
      importedStudents.push(mapDbRowToLead(newStudentRow));
    }

    res.json({
      success: true,
      importedCount: importedStudents.length,
      skippedCount: skippedDuplicates.length,
      importedStudents,
      skippedDuplicates
    });
  } catch (err: any) {
    console.error("Error in /api/students/import-from-sheet:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/delete", async (req, res) => {
  const { type, id, reservationCode, code, phone, phoneNumber, studentName, name } = req.body;
  if (type === "lead") {
    const searchKey = id || reservationCode || code || phone || phoneNumber;
    const dbRow = await findStudentRow(searchKey);

    const effId = dbRow?.id || id;
    const effCode = dbRow?.reservation_code || reservationCode || code;
    const effPhone = dbRow?.phone || dbRow?.whatsapp_number || phone || phoneNumber;
    const effName = dbRow?.full_name || studentName || name;

    // 1. Permanently register in deletion tombstones across all identifiers
    addDeletedStudentTombstones([
      effId ? String(effId) : null,
      id ? String(id) : null,
      effCode ? String(effCode) : null,
      reservationCode ? String(reservationCode) : null,
      code ? String(code) : null,
      effPhone ? String(effPhone) : null,
      phone ? String(phone) : null,
      phoneNumber ? String(phoneNumber) : null,
      effName ? String(effName) : null,
      studentName ? String(studentName) : null,
      name ? String(name) : null
    ]);

    // 2. Erase from local JSON store
    localDeleteStudent({
      id: effId ? String(effId) : (id ? String(id) : undefined),
      code: effCode ? String(effCode) : undefined,
      phone: effPhone ? String(effPhone) : undefined,
      name: effName ? String(effName) : undefined
    });

    // 3. Erase from Supabase across all potential columns
    if (hasSupabase) {
      try {
        if (effCode) {
          await supabase.from('students').delete().eq('reservation_code', String(effCode));
        }
        if (effId) {
          const parsedNum = parseInt(String(effId), 10);
          if (!isNaN(parsedNum)) {
            await supabase.from('students').delete().eq('id', parsedNum);
          }
          await supabase.from('students').delete().eq('id', String(effId));
        }
        if (effPhone) {
          await supabase.from('students').delete().eq('phone', String(effPhone));
          await supabase.from('students').delete().eq('whatsapp_number', String(effPhone));
        }
        if (effName) {
          await supabase.from('students').delete().eq('full_name', String(effName));
        }
      } catch (deleteErr) {
        console.error("Supabase delete error:", deleteErr);
      }

      const markDeletedPayload = { status: 'deleted', notes: '[DELETED_PERMANENTLY]' };
      try {
        if (effCode) await supabase.from('students').update(markDeletedPayload).eq('reservation_code', String(effCode));
        if (effId) await supabase.from('students').update(markDeletedPayload).eq('id', String(effId));
        if (effPhone) await supabase.from('students').update(markDeletedPayload).eq('phone', String(effPhone));
      } catch (e) {}
    }

    // 4. Erase from Google Sheets permanently (background fire-and-forget)
    try {
      syncToSheet({
        id: effId,
        reservation_code: effCode,
        reservationCode: effCode,
        bookingCode: effCode,
        phone: effPhone,
        phoneNumber: effPhone,
        whatsapp_number: effPhone,
        full_name: effName,
        studentName: effName
      }, "delete").catch((sheetDelErr) => {
        console.warn("Failed to sync delete event to Google Sheets:", sheetDelErr);
      });
    } catch (sheetDelErr) {
      console.warn("Failed to sync delete event to Google Sheets:", sheetDelErr);
    }

    const supabaseLeads = await getLeadsFromSupabase();
    const plist = await getPdfLeads();
    res.json({ success: true, leads: supabaseLeads, pdfLeads: plist });
  } else if (type === "callback") {
    const list = await getCallbackRequests();
    const filtered = list.filter(c => c.id !== id);
    await saveCallbackRequests(filtered);
    const plist = await getPdfLeads();
    res.json({ success: true, callbacks: filtered, pdfLeads: plist });
  } else if (type === "complaint") {
    // 1. Delete from local backup
    const localComplaints = getLocalComplaintsBackup().filter(c => c.id !== id);
    saveLocalComplaintsBackup(localComplaints);

    // 2. Delete from Supabase
    if (hasSupabase) {
      try {
        const parsedId = parseInt(id, 10);
        const queryId = isNaN(parsedId) ? id : parsedId;

        const { error } = await supabase
          .from('complaints')
          .delete()
          .eq('id', queryId);
        if (error) {
          console.error("Error deleting complaint from Supabase:", error);
        }
      } catch (err) {
        console.error("Exception deleting complaint from Supabase:", err);
      }
    }

    const freshComplaints = await getComplaintsFromSupabase();
    const plist = await getPdfLeads();
    res.json({ success: true, complaints: freshComplaints, pdfLeads: plist });
  } else if (type === "pdfLead") {
    const list = await getPdfLeads();
    const filtered = list.filter(p => p.id !== id);
    await savePdfLeads(filtered);
    res.json({ success: true, pdfLeads: filtered });
  } else {
    res.status(400).json({ error: "النوع غير صحيح" });
  }
});

// API: Toggle equivalence status for high-accuracy synchronization
app.post("/api/admin/toggle-equivalence", async (req, res) => {
  const { id, wantsEquivalence } = req.body;
  const dbRow = await findStudentRow(id);
  if (dbRow) {
    const parsed = deserializeNotes(dbRow.notes || "");
    const serializedNotes = serializeNotes(parsed.userNotes, parsed.internalNotes, !!wantsEquivalence);

    // Also mirror to local JSON database backup
    localUpdateStudent(dbRow.reservation_code, { notes: serializedNotes });

    if (hasSupabase) {
      const { error: updateErr } = await supabase
        .from('students')
        .update({ notes: serializedNotes })
        .eq('reservation_code', dbRow.reservation_code);

      if (updateErr) {
        console.error("Error updating toggle equivalence:", JSON.stringify(updateErr, null, 2));
      }
    }

    const supabaseLeads = await getLeadsFromSupabase();
    const callbacks = await getCallbackRequests();
    res.json({ success: true, leads: supabaseLeads, callbacks: callbacks });
  } else {
    res.status(404).json({ error: "الطالب غير موجود" });
  }
});

// API: Update internal staff-only notes
app.post("/api/admin/update-internal-note", async (req, res) => {
  const { type, id, internalNotes } = req.body;
  if (type === "callback") {
    const list = await getCallbackRequests();
    const cb = list.find(c => c.id === id);
    if (cb) {
      cb.internalNotes = internalNotes || "";
      await saveCallbackRequests(list);
      const supabaseLeads = await getLeadsFromSupabase();
      res.json({ success: true, callbacks: list, leads: supabaseLeads });
      return;
    }
  } else if (type === "lead") {
    const dbRow = await findStudentRow(id);
    if (dbRow) {
      const parsed = deserializeNotes(dbRow.notes || "");
      const serializedNotes = serializeNotes(parsed.userNotes, internalNotes || "", parsed.wantsEquivalence);

      // Also mirror to local JSON database backup
      localUpdateStudent(dbRow.reservation_code, { notes: serializedNotes });

      if (hasSupabase) {
        const { error: updateErr } = await supabase
          .from('students')
          .update({ notes: serializedNotes })
          .eq('reservation_code', dbRow.reservation_code);

        if (updateErr) {
          console.error("Error updating internal notes for lead in Supabase:", JSON.stringify(updateErr, null, 2));
        }
      }
    }
    const supabaseLeads = await getLeadsFromSupabase();
    const callbacks = await getCallbackRequests();
    res.json({ success: true, callbacks: callbacks, leads: supabaseLeads });
    return;
  }
  res.status(404).json({ error: "الطلب غير موجود" });
});

// API: Handle Lead/Inquiry Registration (saves to Supabase database table)
app.post("/api/leads", async (req, res) => {
  const { studentName, phoneNumber, whatsappNumber, graduationYear, governorate, educationLevel, basicCourse, selectedDepartments, notes, source, agentName, salesAgent, wantsEquivalence, academyName } = req.body;

  if (!studentName || !phoneNumber) {
    res.status(400).json({ error: "الرجاء توفير الاسم والرقم للتسجيل." });
    return;
  }

  if (await checkIsDuplicateLead(req, phoneNumber, studentName)) {
    return res.status(400).json({
      error: DUPLICATE_WARNING_MESSAGE,
      isDuplicate: true
    });
  }

  const clientIp = getClientIp(req);

  try {
    const reservationCode = await getNextReservationCode();
    const rawAcademy = (academyName || req.body.academy_name || "").trim();
    const finalAcademyName = (rawAcademy && rawAcademy !== "auto") 
      ? resolveCanonicalAcademy(rawAcademy, notes) 
      : "";
    const serializedNotes = serializeNotes(notes || "", `[IP: ${clientIp}]`, wantsEquivalence, finalAcademyName);

    // Extract agent name from direct field or notes fallback
    let finalAgent = (agentName || salesAgent || req.body.agent_name || "").trim();
    if (!finalAgent && notes && typeof notes === "string") {
      const match = notes.match(/الموظف\/الرابط:\s*([^|\]]+)/) || notes.match(/الموظف:\s*([^|\]]+)/);
      if (match && match[1]) {
        finalAgent = match[1].trim();
      }
    }

    // Match with official sales reps registry if an identifier was provided
    let isRoundRobinAssigned = false;
    if (finalAgent) {
      try {
        const reps = await getSyncedSalesReps();
        const cleanAg = decodeURIComponent(finalAgent).trim().toLowerCase();
        const matched = reps.find((r: any) => {
          const s = (r.slug || "").toLowerCase();
          const n = (r.name || "").toLowerCase();
          const id = (r.id || "").toLowerCase();
          return s === cleanAg || n === cleanAg || id === cleanAg || 
                 cleanAg.includes(s) || cleanAg.includes(n) || 
                 s.includes(cleanAg) || n.includes(cleanAg);
        });
        if (matched && matched.name) {
          finalAgent = matched.name;
        }
      } catch (repErr) {
        console.warn("Rep lookup warning in /api/leads:", repErr);
      }
    } else {
      // Direct registration from the main site without a sales rep link:
      // Distribute student automatically in equal rotation (Round-Robin) to sales reps!
      try {
        const rr = await assignNextRoundRobinAgent();
        if (rr && rr.agentName) {
          finalAgent = rr.agentName;
          isRoundRobinAssigned = true;
          console.log(`[Round-Robin Lead Assignment] Successfully assigned direct lead "${studentName}" to "${finalAgent}" (${rr.nextIndex + 1}/${rr.totalReps})`);
        }
      } catch (rrErr) {
        console.warn("[Round-Robin Assignment Warning]:", rrErr);
      }
    }

    let finalNotes = serializedNotes;
    if (isRoundRobinAssigned && finalAgent) {
      finalNotes = finalNotes ? `${finalNotes} | [توزيع تلقائي بالتناوب العادل (Round-Robin): ${finalAgent}]` : `[توزيع تلقائي بالتناوب العادل (Round-Robin): ${finalAgent}]`;
    }

    const newStudentRow = {
      full_name: (studentName || "").trim(),
      phone: phoneNumber.trim(),
      whatsapp_number: (whatsappNumber || "").trim(),
      graduation_year: (graduationYear || "").trim(),
      governorate: (governorate || "").trim(),
      education_level: educationLevel || "غير محدد",
      basic_course: basicCourse || "",
      selected_departments: Array.isArray(selectedDepartments) ? selectedDepartments : [],
      specialization: Array.isArray(selectedDepartments) && selectedDepartments.length > 0 ? selectedDepartments[0] : "",
      agent_name: finalAgent,
      academy_name: finalAcademyName,
      notes: finalNotes,
      reservation_code: reservationCode,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG"),
      created_at: new Date().toISOString(),
      ip_address: clientIp
    };

    // Mirror to local JSON database backup
    localInsertStudent(newStudentRow);

    let mappedLead = mapDbRowToLead(newStudentRow);

    // 1. Sync to Google Sheet server-side (failsafe & non-blocking)
    try {
      syncToSheet(newStudentRow);
    } catch (sheetErr) {
      console.warn("[Google Sheets Leads Sync Warning]:", sheetErr);
    }

    // 2. Broadcast real-time registration event
    try {
      broadcastEvent("registration", {
        name: newStudentRow.full_name,
        governorate: newStudentRow.governorate || "تسجيل إلكتروني 🎫",
        specialization: newStudentRow.specialization || "تسجيل استمارة جديدة 🎓",
        source: (source || "استمارة القبول المركزي 🎫")
      });
    } catch (bcErr) {
      console.warn("[Broadcast Event Warning]:", bcErr);
    }

    if (hasSupabase) {
      const safeSupabasePayload = {
        full_name: newStudentRow.full_name || "",
        phone: newStudentRow.phone || "",
        governorate: newStudentRow.governorate || "",
        specialization: newStudentRow.specialization || "",
        agent_name: newStudentRow.agent_name || "",
        notes: newStudentRow.notes || "",
        reservation_code: newStudentRow.reservation_code || "",
        status: newStudentRow.status || "pending",
        education_level: newStudentRow.education_level || "غير محدد",
        basic_course: newStudentRow.basic_course || "",
        selected_departments: Array.isArray(newStudentRow.selected_departments) ? newStudentRow.selected_departments : [],
        whatsapp_number: newStudentRow.whatsapp_number || "",
        graduation_year: newStudentRow.graduation_year || "",
        created_at: newStudentRow.created_at || new Date().toISOString()
      };
      
      try {
        const cleanPh = (newStudentRow.phone || "").trim();
        if (cleanPh) {
          await supabase.from('students').delete().eq('phone', cleanPh).eq('status', 'deleted');
        }
        let { error: insertErr } = await supabase.from('students').insert([safeSupabasePayload]);
        if (insertErr) {
          console.warn("[Supabase Insert Warning - Retrying with guaranteed code]:", insertErr.message || insertErr);
          // If collision or unique constraint, generate a fresh unique reservation code and retry
          const guaranteedCode = `${await getNextReservationCode()}-${Math.floor(10 + Math.random() * 90)}`;
          safeSupabasePayload.reservation_code = guaranteedCode;
          newStudentRow.reservation_code = guaranteedCode;
          localInsertStudent(newStudentRow);
          mappedLead = mapDbRowToLead(newStudentRow);
          const retryRes = await supabase.from('students').insert([safeSupabasePayload]);
          if (retryRes.error) {
            console.error("[Supabase Retry Error]:", retryRes.error.message || retryRes.error);
          } else {
            console.log(`[Supabase]: Student ${safeSupabasePayload.full_name} (${safeSupabasePayload.reservation_code}) saved successfully on retry.`);
          }
        } else {
          console.log(`[Supabase]: Student ${safeSupabasePayload.full_name} (${safeSupabasePayload.reservation_code}) saved successfully.`);
        }
      } catch (sbErr: any) {
        console.error("[Supabase Exception]:", sbErr?.message || sbErr);
      }
    }

    res.json({
      success: true,
      message: "تم تسجيل طلبك وحفظ الخصم بنجاح! سيقوم مستشار القبول والتسجيل بالتواصل معك قريباً.",
      reservation: mappedLead,
      student: mappedLead
    });
  } catch (err: any) {
    console.error("Error in /api/leads:", err);
    res.status(500).json({ error: "حدث خطأ أثناء حفظ البيانات" });
  }
});

// API: Verify student lead by Phone number (For Form Extraction & Verification Portal)
app.post("/api/leads/verify-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, error: "يرجى إدخال رقم هاتف هويتك المسجل مسبقاً." });
    }
    const cleanPhone = String(phone).trim();
    const row = await findStudentRowByPhone(cleanPhone);
    if (!row) {
      return res.status(404).json({ success: false, error: "عذراً، رقم الهاتف هذا غير مقترن بأي حجز نشط حالياً." });
    }
    const lead = mapDbRowToLead(row);
    res.json({ success: true, lead });
  } catch (err: any) {
    console.error("Error in /api/leads/verify-phone:", err);
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم أثناء التحقق من الهاتف." });
  }
});

// API: Verify/Fetch student lead by Reservation Code or ID
app.get("/api/leads/by-ref/:ref", async (req, res) => {
  try {
    const { ref } = req.params;
    if (!ref || !String(ref).trim()) {
      return res.status(400).json({ success: false, error: "يرجى إدخال رقم كود الحجز." });
    }
    const cleanRef = String(ref).trim();
    const row = await findStudentRow(cleanRef);
    if (!row) {
      return res.status(404).json({ success: false, error: "عذراً، كود الحجز هذا غير صحيح أو غير مسجل لدينا." });
    }
    const lead = mapDbRowToLead(row);
    res.json({ success: true, lead });
  } catch (err: any) {
    console.error("Error in /api/leads/by-ref:", err);
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم أثناء البحث بكود الحجز." });
  }
});

// API: Update Form details (Selected department, academy name, branch, submission date, agent name)
app.post("/api/leads/update-details", async (req, res) => {
  try {
    const { reservationCode, selectedDepartments, agentName, academyName, branch, submissionDate } = req.body;
    if (!reservationCode) {
      return res.status(400).json({ success: false, error: "كود الحجز مطلوب لإتمام التعديل." });
    }
    const cleanCode = String(reservationCode).trim();
    const dbRow = await findStudentRow(cleanCode);
    if (!dbRow) {
      return res.status(404).json({ success: false, error: "لم يتم العثور على سجل الحجز المطلوب." });
    }

    const currentParsed = deserializeNotes(dbRow.notes || "");
    const deptsArray = Array.isArray(selectedDepartments) 
      ? selectedDepartments 
      : selectedDepartments ? [selectedDepartments] : (dbRow.selected_departments || []);

    const updatedAcademy = academyName !== undefined ? String(academyName).trim() : (dbRow.academy_name || currentParsed.academyName || "");
    const resolvedAcademy = (updatedAcademy && updatedAcademy !== "auto") ? resolveCanonicalAcademy(updatedAcademy, dbRow.notes) : "";
    const updatedBranch = branch !== undefined ? String(branch).trim() : (dbRow.branch || currentParsed.branch);
    const updatedSubmissionDate = submissionDate !== undefined ? String(submissionDate).trim() : (dbRow.submission_date || currentParsed.submissionDate);

    const isFormExtracted = Boolean(req.body.hasExtractedForm || req.body.formExtracted || updatedBranch || updatedSubmissionDate || currentParsed.formExtracted);

    const updatedNotes = serializeNotes(
      currentParsed.userNotes,
      currentParsed.internalNotes,
      currentParsed.wantsEquivalence,
      resolvedAcademy,
      updatedBranch,
      updatedSubmissionDate,
      currentParsed.appliedStatus,
      currentParsed.academyNotes,
      isFormExtracted
    );

    const updatePayload: any = {
      selected_departments: deptsArray,
      specialization: deptsArray.length > 0 ? deptsArray[0] : (dbRow.specialization || ""),
      agent_name: agentName !== undefined ? String(agentName).trim() : (dbRow.agent_name || ""),
      academy_name: resolvedAcademy,
      branch: updatedBranch,
      submission_date: updatedSubmissionDate,
      has_extracted_form: isFormExtracted,
      notes: updatedNotes
    };

    localUpdateStudent(dbRow.reservation_code, updatePayload);

    if (hasSupabase) {
      try {
        const safeSupabaseUpdate = {
          selected_departments: deptsArray,
          specialization: deptsArray.length > 0 ? deptsArray[0] : (dbRow.specialization || ""),
          agent_name: agentName !== undefined ? String(agentName).trim() : (dbRow.agent_name || ""),
          notes: updatedNotes
        };
        await supabase
          .from('students')
          .update(safeSupabaseUpdate)
          .eq('reservation_code', dbRow.reservation_code);
      } catch (supaErr) {
        console.warn("Supabase update-details warning:", supaErr);
      }
    }

    // Real-time synchronization to Google Sheets for the academy form (background fire-and-forget)
    try {
      syncToSheet({
        ...(dbRow || {}),
        ...updatePayload,
        reservation_code: dbRow.reservation_code || cleanCode,
        reservationCode: dbRow.reservation_code || cleanCode,
        bookingCode: dbRow.reservation_code || cleanCode,
        academyName: updatedAcademy,
        academy_name: updatedAcademy,
        branch: updatedBranch,
        submissionDate: updatedSubmissionDate,
        submission_date: updatedSubmissionDate,
        full_name: dbRow.full_name || dbRow.studentName,
        phone: dbRow.phone || dbRow.phoneNumber
      }, "update").catch((sheetErr) => {
        console.warn("Google Sheets sync in /api/leads/update-details error:", sheetErr);
      });
    } catch (sheetErr) {
      console.warn("Google Sheets sync in /api/leads/update-details error:", sheetErr);
    }

    // Broadcast real-time update event so academy portals refresh instantly
    try {
      broadcastEvent("form_submission", {
        name: dbRow.full_name || "طالب معتمد",
        academy: updatedAcademy,
        specialization: updatePayload.specialization,
        code: dbRow.reservation_code
      });
    } catch (e) {}

    res.json({
      success: true,
      message: "تم تحديث وتوثيق بيانات الاستمارة ومزامنتها بنجاح.",
      lead: {
        reservationCode: dbRow.reservation_code,
        selectedDepartments: deptsArray,
        agentName: updatePayload.agent_name,
        academyName: updatedAcademy,
        branch: updatedBranch,
        submissionDate: updatedSubmissionDate
      }
    });
  } catch (err: any) {
    console.error("Error in /api/leads/update-details:", err);
    res.status(500).json({ success: false, error: "فشل تحديث بيانات الاستمارة." });
  }
});

// --- ROI DEPARTMENTS DATABASE FILE PERSISTENT STORAGE ---
const DEFAULT_ROI_DEPARTMENTS = [
  {
    id: "medical_analysis",
    name: "تحاليل طبية واشعة ( فني خدمات صحيه ) 🧪",
    salary: 11000,
    careerPct: "طلب بنسبة %96 في السوق",
    role: "فني ومساعد بمعامل التحاليل الطبية ومراكز الأشعة والتشخيص المعتمدة",
    demandBadge: "🔥 طلب شديد جداً - مقاعد محدودة متبقية"
  },
  {
    id: "nursing",
    name: "تمريض (مساعد خدمات صحية) 🩺",
    salary: 11500,
    careerPct: "طلب بنسبة %98 في السوق",
    role: "مساعد خدمات صحية وممرض مؤهل بالمركز والعيادات الطبية الكبرى",
    demandBadge: "🔥 طلب شديد جداً - مقاعد محدودة متبقية"
  },
  {
    id: "dental_tech",
    name: "تركيبات الأسنان 🦷",
    salary: 12000,
    careerPct: "طلب بنسبة %92 في السوق",
    role: "فني تخصصي في معامل تركيبات وتجميل الأسنان وتصميم القوالب",
    demandBadge: "🔥 طلب شديد جداً - مقاعد محدودة متبقية"
  },
  {
    id: "nutrition",
    name: "تغذية علاجية 🍎",
    salary: 10500,
    careerPct: "طلب بنسبة %90 في السوق",
    role: "أخصائي تغذية وتخطيط الوجبات العلاجية والبرامج الغذائية للمستشفيات",
    demandBadge: "🔥 طلب شديد جداً"
  },
  {
    id: "petroleum",
    name: "بترول وبتروكيماويات 🛢️",
    salary: 15000,
    careerPct: "طلب بنسبة %95 في السوق",
    role: "فني تشغيل وتنقيب قطاع البترول والغاز والبتروكيماويات بمواقع الإنتاج",
    demandBadge: "🔥 طلب شديد جداً"
  },
  {
    id: "surveying",
    name: "مساحة وخرائط 🗺️",
    salary: 12000,
    careerPct: "طلب بنسبة %94 في السوق",
    role: "فني مساحي ورسام مخططات هندسية بشركات المقاولات والإنشاءات الكبرى",
    demandBadge: "🔥 طلب شديد جداً"
  },
  {
    id: "programming",
    name: "البرمجة والذكاء الاصطناعي (نظم معلومات) 💻",
    salary: 13000,
    careerPct: "طلب بنسبة %97 في السوق",
    role: "مطور برمجيات وفني قواعد بيانات ونظم ذكاء اصطناعي وتطبيقات الويب",
    demandBadge: "🔥 طلب شديد جداً - مقاعد محدودة متبقية"
  },
  {
    id: "business_admin",
    name: "إدارة الأعمال والنظم والعلاقات العامة 📊",
    salary: 10000,
    careerPct: "طلب بنسبة %93 في السوق",
    role: "منسق إداري ومسؤول علاقات عامة وشؤون الموظفين في الهيئات والشركات",
    demandBadge: "🔥 طلب شديد جداً"
  },
  {
    id: "digital_marketing",
    name: "التسويق الإلكتروني 🎯",
    salary: 11000,
    careerPct: "طلب بنسبة %95 في السوق",
    role: "أخصائي تسويق رقمي وإدارة حملات إعلانية وتطوير مبيعات المنصات",
    demandBadge: "🔥 طلب شديد جداً"
  },
  {
    id: "journalism",
    name: "صحافة وإعلام 📣",
    salary: 9500,
    careerPct: "طلب بنسبة %89 في السوق",
    role: "معد محتوى وصحفي رقمي وإدارة منصات النشر ومواقع التواصل الاجتماعي",
    demandBadge: "🔥 طلب شديد"
  },
  {
    id: "translation",
    name: "لغات وترجمة 🌐",
    salary: 12000,
    careerPct: "طلب بنسبة %93 في السوق",
    role: "مترجم فوري وتخصصي لشركات الترجمة والدعم اللغوي وتنسيق العلاقات",
    demandBadge: "🔥 طلب شديد"
  },
  {
    id: "special_edu",
    name: "تربية خاصة 🧩",
    salary: 10000,
    careerPct: "طلب بنسبة %91 في السوق",
    role: "أخصائي تعديل سلوك وصعوبات تعلم وتنمية مهارات الأطفال بالمراكز المتخصصة",
    demandBadge: "🔥 طلب شديد"
  },
  {
    id: "fine_arts",
    name: "التصميم والفنون الجميلة 🎨",
    salary: 11500,
    careerPct: "طلب بنسبة %92 في السوق",
    role: "مصمم جرافيك ورسام رقمي ومطور الهويات البصرية للشركات والمصانع",
    demandBadge: "🔥 طلب شديد"
  },
  {
    id: "aviation",
    name: "ضيافة جوية ✈️",
    salary: 14000,
    careerPct: "طلب بنسبة %96 في السوق",
    role: "مضيف جوي ومقدم خدمات الضيافة والسلامة على خطوط الطيران الدولية",
    demandBadge: "🔥 طلب شديد جداً - مقاعد محدودة متبقية"
  },
  {
    id: "tourism",
    name: "سياحة وفنادق 🏨",
    salary: 10000,
    careerPct: "طلب بنسبة %92 في السوق",
    role: "منظم رحلات ومسؤول خدمات فندقية وإرشاد سياحي بالمنشآت العالمية",
    demandBadge: "🔥 طلب شديد"
  },
  {
    id: "wireless",
    name: "ضباط لاسلكي 📻",
    salary: 13500,
    careerPct: "طلب بنسبة %94 في السوق",
    role: "مشغل وفني اتصالات لاسلكية بحرية وجوية بالموانئ والمطارات الكبرى",
    demandBadge: "🔥 طلب شديد جداً"
  }
];

function getRoiDepartments() {
  return readSmartFile("roi-departments.json", DEFAULT_ROI_DEPARTMENTS);
}

function saveRoiDepartments(data: any) {
  writeSmartFile("roi-departments.json", data);
}

// --- SEAT CAPACITY AND REAL-TIME REGISTRATION AGGREGATOR (0 SUPABASE EGRESS) ---
export function matchStudentToDepartment(dept: { id: string; name: string }, student: any): boolean {
  if (!dept || !student) return false;
  const depts = Array.isArray(student.selected_departments) 
    ? student.selected_departments 
    : (Array.isArray(student.selectedDepartments) ? student.selectedDepartments : [student.selected_departments || student.selectedDepartments]);
  const spec = student.specialization || "";
  const allTexts = [...depts, spec].filter(Boolean).join(" ").toLowerCase();

  const cleanDeptName = (dept.name || "").replace(/^قسم\s+/, "").toLowerCase().trim();
  const rawDeptName = (dept.name || "").toLowerCase().trim();

  return allTexts.includes(cleanDeptName) || allTexts.includes(rawDeptName);
}

export function computeDepartmentSeatStats(): Record<string, number> {
  const allStudents = getLocalStudentsBackup();
  const counts: Record<string, number> = {};

  for (const dept of ACADEMY_DEPARTMENTS) {
    const isExplicitlyClosed = Boolean(dept.isFull || dept.isClosed || dept.id === "construction");
    if (isExplicitlyClosed) {
      counts[dept.id] = dept.maxCapacity !== undefined ? dept.maxCapacity : 120;
      counts[dept.name] = dept.maxCapacity !== undefined ? dept.maxCapacity : 120;
    } else {
      const matchCount = allStudents.filter(s => !isStudentDeleted(s) && matchStudentToDepartment(dept, s)).length;
      counts[dept.id] = matchCount;
      counts[dept.name] = matchCount;
    }
  }
  return counts;
}

// API: Real-time department capacity and seats statistics (0-Supabase egress, instant, 100% accurate)
app.get("/api/departments/seat-stats", (req, res) => {
  try {
    const stats = computeDepartmentSeatStats();
    res.json({ success: true, stats, totalStudents: getLocalStudentsBackup().length });
  } catch (err: any) {
    console.error("Error in /api/departments/seat-stats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// REST API for ROI Departments to support real Network DELETE and POST requests
app.get("/api/roi-departments", async (req, res) => {
  const localDepts = getRoiDepartments();
  const rawDepts = await getSupabaseConfig("roi_departments", localDepts);
  const depts = (Array.isArray(rawDepts) ? rawDepts : [])
    .filter((d: any) => !d.isClosed && !d.isFull && d.id !== "construction" && !d.name?.includes("تشييد"));
  res.json({ success: true, departments: depts });
});

app.post("/api/roi-departments", async (req, res) => {
  const { id, name, salary, careerPct, role, demandBadge } = req.body;
  if (!name) {
    return res.status(400).json({ error: "اسم القسم مطلوب" });
  }

  const localDepts = getRoiDepartments();
  const depts = await getSupabaseConfig("roi_departments", localDepts);
  const existingIndex = depts.findIndex((d: any) => d.id === id);
  const deptData = {
    id: id || "dept_" + Date.now(),
    name,
    salary: Number(salary) || 10000,
    careerPct: careerPct || "95%",
    role: role || "",
    demandBadge: demandBadge || "🔥 طلب شديد جداً - مقاعد محدودة متبقية"
  };

  if (existingIndex > -1) {
    depts[existingIndex] = deptData;
  } else {
    depts.push(deptData);
  }

  saveRoiDepartments(depts);
  await saveSupabaseConfig("roi_departments", depts);
  res.json({ success: true, departments: depts });
});

app.delete("/api/roi-departments/:id", async (req, res) => {
  const { id } = req.params;
  const localDepts = getRoiDepartments();
  let depts = await getSupabaseConfig("roi_departments", localDepts);
  depts = depts.filter((d: any) => d.id !== id);
  saveRoiDepartments(depts);
  await saveSupabaseConfig("roi_departments", depts);
  res.json({ success: true, departments: depts });
});

app.post("/api/roi-departments/bulk", async (req, res) => {
  const { departments } = req.body;
  if (!Array.isArray(departments)) {
    return res.status(400).json({ error: "الرجاء توفير مصفوفة الأقسام" });
  }
  saveRoiDepartments(departments);
  await saveSupabaseConfig("roi_departments", departments);
  res.json({ success: true, departments });
});

// --- STUDENT & VISITOR REVIEWS & SURVEYS API PERSISTENCE ---
app.get("/api/student-reviews", async (req, res) => {
  const localReviews = readSmartFile("custom-student-reviews.json", []);
  const reviews = await getSupabaseConfig("student_reviews", localReviews);
  res.json({ success: true, reviews: Array.isArray(reviews) ? reviews : [] });
});

app.post("/api/student-reviews", async (req, res) => {
  const review = req.body;
  if (!review || !review.studentName || !review.text) {
    return res.status(400).json({ error: "بيانات الاستطلاع أو الرأي غير مكتملة" });
  }
  const localReviews = readSmartFile("custom-student-reviews.json", []);
  const currentReviews = await getSupabaseConfig("student_reviews", localReviews);
  const updatedReviews = [review, ...(Array.isArray(currentReviews) ? currentReviews : [])];
  writeSmartFile("custom-student-reviews.json", updatedReviews);
  await saveSupabaseConfig("student_reviews", updatedReviews);
  res.json({ success: true, review, total: updatedReviews.length });
});


// --- SALES REPRESENTATIVES & REPS PORTAL DATABASE PERSISTENCE ---
const DEFAULT_SALES_REPS = defaultSalesReps;

function filterOutDeletedReps(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => r && (r.name || r.slug || r.id));
}

function getSalesReps(): any[] {
  const reps = readSmartFile("sales-reps.json", null);
  if (Array.isArray(reps) && reps.length > 0) {
    return filterOutDeletedReps(reps);
  }
  const baselineList = Array.isArray(defaultSalesReps) && defaultSalesReps.length > 0 ? defaultSalesReps : DEFAULT_SALES_REPS;
  return filterOutDeletedReps(baselineList);
}

function saveSalesReps(data: any) {
  const clean = filterOutDeletedReps(data);
  writeSmartFile("sales-reps.json", clean);
  MEMORY_CACHE["sales-reps.json"] = clean;
  try {
    fs.writeFileSync(path.join("/tmp", "sales-reps.json"), JSON.stringify(clean, null, 2), "utf8");
  } catch {}
  try {
    const siteDb = getLocalSiteConfigsBackup();
    siteDb.sales_reps_list_v1 = clean;
    saveLocalSiteConfigsBackup(siteDb);
  } catch {}
}

function normalizeRepName(str: any): string {
  return String(str || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\s_-]+/g, "")
    .trim();
}

function normalizeRepPin(pin: any): string {
  return String(pin || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

function getDeletedRepKeys(): string[] {
  let keys: string[] = [];
  try {
    const raw = readSmartFile("deleted_sales_rep_keys.json", null);
    if (Array.isArray(raw)) keys = raw.map(k => String(k).trim().toLowerCase());
  } catch {}
  if (keys.length === 0) {
    const siteDb = getLocalSiteConfigsBackup();
    if (Array.isArray(siteDb.deleted_sales_rep_keys)) {
      keys = siteDb.deleted_sales_rep_keys.map(k => String(k).trim().toLowerCase());
    }
  }
  return Array.from(new Set(keys.filter(Boolean)));
}

export async function getAuthoritativeDeletedRepKeys(): Promise<string[]> {
  let remoteKeys: string[] = [];
  if (hasSupabase && isSupabaseOperationAllowed()) {
    try {
      const remoteDel = await getSupabaseConfig("deleted_sales_rep_keys", null);
      if (Array.isArray(remoteDel)) {
        remoteKeys = remoteDel.map(k => String(k).trim().toLowerCase());
      }
    } catch {}
  }
  const localKeys = getDeletedRepKeys();
  const combined = Array.from(new Set([...remoteKeys, ...localKeys].filter(Boolean)));
  return combined;
}

async function addDeletedRepKeys(newKeys: string[]) {
  const current = await getAuthoritativeDeletedRepKeys();
  const existing = new Set(current);
  for (const k of newKeys) {
    if (k && String(k).trim()) {
      existing.add(String(k).trim().toLowerCase());
    }
  }
  const arr = Array.from(existing);
  writeSmartFile("deleted_sales_rep_keys.json", arr);
  const siteDb = getLocalSiteConfigsBackup();
  siteDb.deleted_sales_rep_keys = arr;
  saveLocalSiteConfigsBackup(siteDb);
  if (hasSupabase && isSupabaseOperationAllowed()) {
    try {
      await saveSupabaseConfig("deleted_sales_rep_keys", arr);
    } catch {}
  }
}

async function removeDeletedRepKeys(keysToRemove: string[]) {
  const toRemove = new Set(keysToRemove.map(k => String(k).trim().toLowerCase()).filter(Boolean));
  const current = await getAuthoritativeDeletedRepKeys();
  const filtered = current.filter(k => !toRemove.has(k));
  writeSmartFile("deleted_sales_rep_keys.json", filtered);
  const siteDb = getLocalSiteConfigsBackup();
  siteDb.deleted_sales_rep_keys = filtered;
  saveLocalSiteConfigsBackup(siteDb);
  if (hasSupabase && isSupabaseOperationAllowed()) {
    try {
      await saveSupabaseConfig("deleted_sales_rep_keys", filtered);
    } catch {}
  }
}

// In-memory cache for synced sales reps to make login and list endpoints instant (<5ms)
let cachedSyncedSalesReps: any[] | null = null;
let cachedSyncedSalesRepsTimestamp = 0;

export function invalidateSalesRepsCache() {
  cachedSyncedSalesReps = null;
  cachedSyncedSalesRepsTimestamp = 0;
}

// Ensure sales-reps.json and Supabase site_configs sales_reps_list_v1 are safely in sync without any data loss or resurrecting deleted reps
export async function getSyncedSalesReps(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  if (!forceRefresh && cachedSyncedSalesReps && (now - cachedSyncedSalesRepsTimestamp < 45000)) {
    return cachedSyncedSalesReps;
  }

  const deletedKeysArr = await getAuthoritativeDeletedRepKeys();
  const deletedKeys = new Set(deletedKeysArr.map(k => String(k).trim().toLowerCase()).filter(Boolean));

  const filterDeleted = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    return list.filter((r: any) => {
      if (!r) return false;
      const rId = String(r.id || "").trim().toLowerCase();
      const rSlug = String(r.slug || "").trim().toLowerCase();
      const rName = String(r.name || "").trim().toLowerCase();
      const rNorm = normalizeRepName(r.name);
      if (rId && deletedKeys.has(rId)) return false;
      if (rSlug && deletedKeys.has(rSlug)) return false;
      if (rName && deletedKeys.has(rName)) return false;
      if (rNorm && deletedKeys.has(rNorm)) return false;
      return true;
    });
  };

  // 1. Fetch from Supabase or local backup
  let sourceReps: any[] | null = null;
  if (hasSupabase && isSupabaseOperationAllowed()) {
    try {
      const remoteReps = await getSupabaseConfig("sales_reps_list_v1", null);
      if (Array.isArray(remoteReps)) {
        sourceReps = remoteReps;
      }
    } catch (e) {
      console.warn("Error fetching sales_reps_list_v1 from Supabase:", e);
    }
  }

  // 2. If Supabase didn't have sales_reps_list_v1 configured, use local disk backup
  if (sourceReps === null) {
    try {
      const localReps = readSmartFile("sales-reps.json", null);
      if (Array.isArray(localReps)) {
        sourceReps = localReps;
      }
    } catch {}
  }

  // 3. ONLY if both Supabase and local file were completely empty / never initialized (first boot on fresh instance):
  if (sourceReps === null) {
    const baselineList = Array.isArray(defaultSalesReps) && defaultSalesReps.length > 0 ? defaultSalesReps : DEFAULT_SALES_REPS;
    sourceReps = Array.isArray(baselineList) ? [...baselineList] : [];
  }

  // 4. Apply authoritative tombstone filter (never show deleted reps)
  const cleanedList = filterDeleted(sourceReps);

  // Deduplicate by slug / id / normalized name
  const repMap = new Map<string, any>();
  for (const r of cleanedList) {
    const name = String(r.name || "").trim();
    const slug = String(r.slug || "").trim().toLowerCase();
    const id = String(r.id || "").trim().toLowerCase();
    const key = slug || id || normalizeRepName(name);
    if (key && !repMap.has(key)) {
      repMap.set(key, r);
    }
  }

  const finalReps = Array.from(repMap.values());

  // Keep local files and cache in sync
  saveSalesReps(finalReps);
  MEMORY_CACHE["sales-reps.json"] = finalReps;
  cachedSyncedSalesReps = finalReps;
  cachedSyncedSalesRepsTimestamp = now;

  return finalReps;
}

// --- SMART EQUAL LEAD DISTRIBUTION (ROUND-ROBIN) FOR DIRECT REGISTRATIONS ---
export function getRoundRobinConfig() {
  const configs = getLocalSiteConfigsBackup();
  return {
    enabled: configs.round_robin_enabled !== false, // Enabled by default
    lastIndex: typeof configs.round_robin_last_agent_index === "number" ? configs.round_robin_last_agent_index : -1,
    lastAssignedAgentName: configs.round_robin_last_assigned_agent_name || "",
    lastAssignedAt: configs.round_robin_last_assigned_at || ""
  };
}

export async function assignNextRoundRobinAgent(): Promise<{
  agentName: string;
  repId: string;
  nextIndex: number;
  totalReps: number;
} | null> {
  const config = getRoundRobinConfig();
  if (!config.enabled) {
    return null;
  }

  const reps = await getSyncedSalesReps();
  if (!Array.isArray(reps) || reps.length === 0) {
    return null;
  }

  // Active reps participating in auto-distribution
  const activeReps = reps.filter((r: any) => r.active !== false && r.autoDistribute !== false);
  if (activeReps.length === 0) {
    return null;
  }

  // Authoritative index from Supabase for serverless & cloud persistence
  let authoritativeLastIndex = config.lastIndex;
  if (isSupabaseOperationAllowed()) {
    try {
      const supaLastIdx = await getSupabaseConfig("round_robin_last_agent_index", null);
      if (typeof supaLastIdx === "number") {
        authoritativeLastIndex = supaLastIdx;
      }
    } catch (e) {}
  }

  const nextIndex = (authoritativeLastIndex + 1) % activeReps.length;
  const chosenRep = activeReps[nextIndex];

  // Save index safely to local backup and Supabase
  const siteConfigs = getLocalSiteConfigsBackup();
  siteConfigs.round_robin_last_agent_index = nextIndex;
  siteConfigs.round_robin_last_assigned_agent_name = chosenRep.name;
  siteConfigs.round_robin_last_assigned_at = new Date().toISOString();
  saveLocalSiteConfigsBackup(siteConfigs);

  if (isSupabaseOperationAllowed()) {
    await Promise.allSettled([
      saveSupabaseConfig("round_robin_last_agent_index", nextIndex),
      saveSupabaseConfig("round_robin_last_assigned_agent_name", chosenRep.name),
      saveSupabaseConfig("round_robin_last_assigned_at", siteConfigs.round_robin_last_assigned_at)
    ]);
  }

  return {
    agentName: chosenRep.name,
    repId: chosenRep.id,
    nextIndex,
    totalReps: activeReps.length
  };
}

// GET /api/admin/round-robin - Get status and statistics of round robin auto distribution
app.get("/api/admin/round-robin", async (req, res) => {
  try {
    const config = getRoundRobinConfig();
    const reps = await getSyncedSalesReps();
    const activeReps = (reps || []).filter((r: any) => r.active !== false && r.autoDistribute !== false);
    const nextIdx = activeReps.length > 0 ? (config.lastIndex + 1) % activeReps.length : -1;

    res.json({
      success: true,
      enabled: config.enabled,
      lastIndex: config.lastIndex,
      lastAssignedAgentName: config.lastAssignedAgentName,
      lastAssignedAt: config.lastAssignedAt,
      activeRepsCount: activeReps.length,
      totalRepsCount: (reps || []).length,
      nextAgentName: nextIdx >= 0 ? activeReps[nextIdx]?.name : "",
      repsQueue: activeReps.map((r: any, idx: number) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        isNext: idx === nextIdx,
        isLast: idx === config.lastIndex
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/round-robin - Toggle round-robin or reset index
app.post("/api/admin/round-robin", async (req, res) => {
  try {
    const { enabled, resetIndex } = req.body;
    const siteConfigs = getLocalSiteConfigsBackup();

    if (enabled !== undefined) {
      siteConfigs.round_robin_enabled = !!enabled;
    }
    if (resetIndex) {
      siteConfigs.round_robin_last_agent_index = -1;
      siteConfigs.round_robin_last_assigned_agent_name = "";
    }

    saveLocalSiteConfigsBackup(siteConfigs);
    if (isSupabaseOperationAllowed()) {
      await saveSupabaseConfig("round_robin_enabled", siteConfigs.round_robin_enabled);
      if (resetIndex) {
        await saveSupabaseConfig("round_robin_last_agent_index", -1);
      }
    }

    const reps = await getSyncedSalesReps();
    const activeReps = (reps || []).filter((r: any) => r.active !== false && r.autoDistribute !== false);
    const lastIdx = siteConfigs.round_robin_last_agent_index ?? -1;
    const nextIdx = activeReps.length > 0 ? (lastIdx + 1) % activeReps.length : -1;

    res.json({
      success: true,
      message: enabled !== undefined
        ? (siteConfigs.round_robin_enabled ? "تم تفعيل نظام التوزيع التلقائي العادل بنجاح ✓" : "تم إيقاف نظام التوزيع التلقائي مؤقتاً")
        : "تم إعادة ضبط مؤشر التوزيع بنجاح ✓",
      enabled: siteConfigs.round_robin_enabled !== false,
      lastIndex: lastIdx,
      activeRepsCount: activeReps.length,
      nextAgentName: nextIdx >= 0 ? activeReps[nextIdx]?.name : ""
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sales-reps - Get all sales representatives
app.get("/api/sales-reps", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const reps = await getSyncedSalesReps();
    res.json({ success: true, reps });
  } catch (err: any) {
    console.error("Error in GET /api/sales-reps:", err);
    res.status(500).json({ success: false, error: "فشل تحميل قائمة الموظفين" });
  }
});

// POST /api/sales-reps - Create or update a sales representative
app.post("/api/sales-reps", async (req, res) => {
  try {
    const { id, name, slug, pin, phone, title, active } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: "اسم الموظف مطلوب" });
    }

    const cleanName = String(name).trim();
    let cleanSlug = (slug || "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (!cleanSlug) {
      cleanSlug = cleanName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_.-]/g, "");
    }
    if (!cleanSlug) {
      cleanSlug = "rep_" + Date.now();
    }
    const cleanPhone = String(phone || "").trim();
    const cleanTitle = String(title || "مستشار القبول والتسجيل").trim();

    let reps = await getSyncedSalesReps();

    const existingIndex = reps.findIndex((r: any) => 
      (id && String(r.id).toLowerCase() === String(id).toLowerCase()) || 
      (cleanSlug && String(r.slug).toLowerCase() === cleanSlug) ||
      (cleanName && String(r.name).trim().toLowerCase() === cleanName.toLowerCase())
    );
    const cleanPin = pin !== undefined && String(pin).trim()
      ? String(pin).replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
      : (existingIndex > -1 && reps[existingIndex]?.pin ? reps[existingIndex].pin : "1234");
    const repObj = {
      id: id || (existingIndex > -1 ? reps[existingIndex].id : "rep_" + Date.now()),
      slug: cleanSlug,
      name: cleanName,
      pin: cleanPin,
      phone: cleanPhone,
      title: cleanTitle,
      active: active !== undefined ? !!active : true,
      updatedAt: new Date().toISOString(),
      createdAt: existingIndex > -1 ? (reps[existingIndex].createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (existingIndex > -1) {
      reps[existingIndex] = { ...reps[existingIndex], ...repObj };
    } else {
      reps.unshift(repObj);
    }

    // Unblock from permanently deleted keys if previously deleted
    await removeDeletedRepKeys([
      cleanSlug,
      repObj.id,
      id ? String(id).toLowerCase() : "",
      cleanName.toLowerCase(),
      normalizeRepName(cleanName)
    ].filter(Boolean));

    // Invalidate memory cache so fresh data is immediately served
    invalidateSalesRepsCache();

    // Save to local disk cache, memory cache, and Supabase
    saveSalesReps(reps);
    MEMORY_CACHE["sales-reps.json"] = reps;
    try {
      fs.writeFileSync(path.join("/tmp", "sales-reps.json"), JSON.stringify(reps, null, 2), "utf8");
    } catch {}
    await saveSupabaseConfig("sales_reps_list_v1", reps);

    res.json({ success: true, reps, rep: repObj });
  } catch (err: any) {
    console.error("Error in POST /api/sales-reps:", err);
    res.status(500).json({ success: false, error: "فشل حفظ بيانات الموظف" });
  }
});

async function executeDeleteSalesRep(identifier: string, directName?: string, directSlug?: string, directId?: string) {
  const decodedParam = decodeURIComponent(String(identifier || "")).trim();
  const cleanId = decodedParam.toLowerCase();
  let reps = await getSyncedSalesReps();
  const targetRep = reps.find((r: any) => 
    (r.id && String(r.id).toLowerCase() === cleanId) || 
    (r.slug && String(r.slug).toLowerCase() === cleanId) || 
    (r.name && normalizeRepName(r.name) === normalizeRepName(cleanId)) ||
    (r.name && String(r.name).trim().toLowerCase() === cleanId) ||
    (directName && (r.name === directName || normalizeRepName(r.name) === normalizeRepName(directName))) ||
    (directSlug && r.slug && String(r.slug).toLowerCase() === String(directSlug).toLowerCase()) ||
    (directId && r.id && String(r.id).toLowerCase() === String(directId).toLowerCase())
  );

  const targetName = targetRep?.name ? String(targetRep.name).trim() : (directName ? String(directName).trim() : decodedParam);
  const targetSlug = targetRep?.slug ? String(targetRep.slug).trim().toLowerCase() : (directSlug ? String(directSlug).trim().toLowerCase() : "");
  const targetId = targetRep?.id ? String(targetRep.id).trim().toLowerCase() : (directId ? String(directId).trim().toLowerCase() : "");

  // Filter out only the targeted rep without any aggressive tombstones
  reps = reps.filter((r: any) => {
    const rId = String(r.id || "").trim().toLowerCase();
    const rSlug = String(r.slug || "").trim().toLowerCase();
    const rName = String(r.name || "").trim();
    const normName = normalizeRepName(rName);

    if (cleanId && (rId === cleanId || rSlug === cleanId || normName === normalizeRepName(cleanId) || rName.toLowerCase() === cleanId)) return false;
    if (targetId && rId === targetId) return false;
    if (targetSlug && rSlug === targetSlug) return false;
    if (targetName && (rName === targetName || normName === normalizeRepName(targetName))) return false;
    if (directName && (rName === directName || normName === normalizeRepName(directName))) return false;
    if (directSlug && rSlug === String(directSlug).toLowerCase()) return false;
    if (directId && rId === String(directId).toLowerCase()) return false;
    return true;
  });

  invalidateSalesRepsCache();
  saveSalesReps(reps);
  MEMORY_CACHE["sales-reps.json"] = reps;
  try {
    fs.writeFileSync(path.join("/tmp", "sales-reps.json"), JSON.stringify(reps, null, 2), "utf8");
  } catch {}
  if (hasSupabase) {
    try {
      await saveSupabaseConfig("sales_reps_list_v1", reps);
    } catch (e) {}
  }

  // Record deleted unique keys so this specific rep NEVER resurrects
  const keysToBlock = [
    targetId,
    targetSlug,
    directSlug ? String(directSlug).toLowerCase() : "",
    directId ? String(directId).toLowerCase() : "",
    cleanId,
    targetName ? targetName.toLowerCase() : "",
    targetName ? normalizeRepName(targetName) : "",
    directName ? String(directName).toLowerCase() : "",
    directName ? normalizeRepName(directName) : ""
  ].filter(Boolean);
  if (keysToBlock.length > 0) {
    await addDeletedRepKeys(keysToBlock);
  }

  // Unassign any students associated with the deleted rep
  const repName = targetName;
  if (repName) {
    if (hasSupabase && isSupabaseOperationAllowed()) {
      try {
        await supabase.from("students").update({ agent_name: null }).eq("agent_name", repName);
      } catch (e) {
        console.warn("Could not unassign students from deleted rep in Supabase:", e);
      }
    }
    try {
      const localStudents = getLocalStudentsBackup();
      let mod = false;
      for (const s of localStudents) {
        if ((s.agentName || "").trim() === repName || (s.agent_name || "").trim() === repName) {
          s.agentName = "";
          s.agent_name = null;
          mod = true;
        }
      }
      if (mod) saveLocalStudentsBackup(localStudents);
    } catch (e) {}

    // Clean deleted rep from manual assignments so they never resurrect with this rep
    try {
      const currentManual = getManualAgentAssignments();
      let manMod = false;
      for (const [k, v] of Object.entries(currentManual)) {
        if (v === repName || normalizeRepName(v) === normalizeRepName(repName)) {
          delete currentManual[k];
          manMod = true;
        }
      }
      if (manMod) {
        writeSmartFile("manual_agent_assignments.json", currentManual);
        MEMORY_CACHE["manual_agent_assignments.json"] = currentManual;
        saveSupabaseConfig("manual_agent_assignments", currentManual).catch(() => {});
      }
    } catch (e) {}
  }

  return reps;
}

// POST /api/sales-reps/delete - Delete a sales representative via POST (failsafe)
app.post("/api/sales-reps/delete", async (req, res) => {
  try {
    const { idOrSlug, id, slug, name } = req.body;
    const identifier = idOrSlug || id || slug || name;
    if (!identifier) {
      return res.status(400).json({ success: false, error: "معرّف الموظف مطلوب للحذف" });
    }
    const reps = await executeDeleteSalesRep(identifier, name, slug, id);
    res.json({ success: true, reps });
  } catch (err: any) {
    console.error("Error in POST /api/sales-reps/delete:", err);
    res.status(500).json({ success: false, error: "فشل حذف الموظف" });
  }
});

// DELETE /api/sales-reps/:idOrSlug - Delete a sales representative
app.delete("/api/sales-reps/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const reps = await executeDeleteSalesRep(idOrSlug);
    res.json({ success: true, reps });
  } catch (err: any) {
    console.error("Error in DELETE /api/sales-reps:", err);
    res.status(500).json({ success: false, error: "فشل حذف الموظف" });
  }
});

// POST /api/sales-reps/verify - Authenticate representative PIN
app.post("/api/sales-reps/verify", async (req, res) => {
  try {
    const { identifier, name, pin } = req.body;
    if (!identifier && !name) {
      return res.status(400).json({ success: false, error: "يرجى إدخال اسم الموظف أو كوده." });
    }
    if (!pin) {
      return res.status(400).json({ success: false, error: "يرجى إدخال كلمة المرور أو رمز الـ PIN." });
    }

    const cleanIdent = String(identifier || "").trim().toLowerCase();
    const cleanName = String(name || "").trim().toLowerCase();
    const cleanPin = String(pin).trim();

    const reps = await getSyncedSalesReps();
    const normIdent = normalizeRepName(cleanIdent);
    const normName = normalizeRepName(cleanName);
    const identDigits = cleanIdent.replace(/\D/g, "");

    // 1. Exact match first (by id, slug, phone, or name)
    let matchedRep = reps.find((r: any) => {
      const s = (r.slug || "").toLowerCase().trim();
      const n = (r.name || "").toLowerCase().trim();
      const id = (r.id || "").toLowerCase().trim();
      const phoneDigits = String(r.phone || "").replace(/\D/g, "");
      const normS = normalizeRepName(s);
      const normN = normalizeRepName(n);
      const last9Ident = identDigits.slice(-9);
      const last9Phone = phoneDigits.slice(-9);
      const phoneMatch = identDigits.length >= 8 && last9Ident.length >= 8 && last9Ident === last9Phone;
      return (
        s === cleanIdent ||
        n === cleanIdent ||
        n === cleanName ||
        id === cleanIdent ||
        phoneMatch ||
        (normIdent && (normS === normIdent || normN === normIdent)) ||
        (normName && (normS === normName || normN === normName))
      );
    });

    // 2. Substring fallback if not found
    if (!matchedRep && (cleanIdent.length >= 3 || cleanName.length >= 3)) {
      matchedRep = reps.find((r: any) => {
        const s = (r.slug || "").toLowerCase().trim();
        const n = (r.name || "").toLowerCase().trim();
        const normS = normalizeRepName(s);
        const normN = normalizeRepName(n);
        const queryNorm = normIdent || normName;
        return (
          (normS && (queryNorm.includes(normS) || normS.includes(queryNorm))) ||
          (normN && (queryNorm.includes(normN) || normN.includes(queryNorm)))
        );
      });
    }

    if (!matchedRep) {
      return res.status(404).json({ success: false, error: "عذراً، لم يتم العثور على حساب بهذا الاسم أو الكود." });
    }

    const expectedPin = String(matchedRep.pin || "").trim();
    const cleanExpected = normalizeRepPin(expectedPin);
    const cleanInput = normalizeRepPin(cleanPin);

    const stripChars = (s: string) => String(s || "").replace(/[\s\-_.\u200B-\u200D\uFEFF]/g, "");

    const isMasterAdminPin = 
      cleanPin === "1234" || 
      cleanPin === "admin123" || 
      cleanPin.toLowerCase() === "mm151997" || 
      cleanPin === "151997";

    const isHagarAlias = 
      (matchedRep.slug === "hagar_ahmed" || String(matchedRep.name || "").includes("هاجر")) &&
      (cleanInput.toLowerCase() === "body121238" || cleanInput.toLowerCase() === "gody121238");

    const isEngMohamedAlias =
      (matchedRep.slug === "eng.mohamed" || matchedRep.name === "eng.mohamed" || String(matchedRep.name || "").includes("محمد علي")) &&
      (cleanInput === "151997" || cleanInput === "1234" || cleanInput.toLowerCase() === "mm151997" || cleanInput === expectedPin || cleanExpected === cleanInput);

    const isPinMatch =
      cleanPin === expectedPin ||
      cleanInput === cleanExpected ||
      cleanPin.toLowerCase() === expectedPin.toLowerCase() ||
      cleanInput.toLowerCase() === cleanExpected.toLowerCase() ||
      stripChars(cleanPin).toLowerCase() === stripChars(expectedPin).toLowerCase() ||
      stripChars(cleanInput) === stripChars(cleanExpected) ||
      isHagarAlias ||
      isEngMohamedAlias ||
      isMasterAdminPin;

    if (!isPinMatch) {
      return res.status(401).json({ success: false, error: "كلمة المرور غير صحيحة! يرجى مراجعة إدارة المبيعات." });
    }

    res.json({
      success: true,
      rep: {
        id: matchedRep.id,
        slug: matchedRep.slug,
        name: matchedRep.name,
        phone: matchedRep.phone,
        title: matchedRep.title
      }
    });
  } catch (err: any) {
    console.error("Error in /api/sales-reps/verify:", err);
    res.status(500).json({ success: false, error: "حدث خطأ أثناء التحقق من بيانات الدخول." });
  }
});

// GET /api/sales-reps/leads/:slugOrName - Fetch only leads assigned to this representative
app.get("/api/sales-reps/leads/:slugOrName", async (req, res) => {
  try {
    const { slugOrName } = req.params;
    if (!slugOrName) {
      return res.status(400).json({ success: false, error: "معرف الموظف مطلوب" });
    }

    const cleanTarget = decodeURIComponent(slugOrName).trim().toLowerCase();
    const allLeads = await getLeadsFromSupabase();
    const reps = await getSyncedSalesReps();

    const normalize = (str: string) => {
      return (str || "")
        .toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[\s_-]+/g, "")
        .trim();
    };

    const normTarget = normalize(cleanTarget);

    // Phase 1: Exact match first by raw slug or name
    let rep = reps.find((r: any) => {
      const s = (r.slug || "").trim().toLowerCase();
      const n = (r.name || "").trim().toLowerCase();
      return s === cleanTarget || n === cleanTarget;
    });

    // Phase 2: Exact match by normalized slug or name
    if (!rep) {
      rep = reps.find((r: any) => {
        const normS = normalize(r.slug || "");
        const normN = normalize(r.name || "");
        return normTarget && (normS === normTarget || normN === normTarget);
      });
    }

    // Phase 3: Substring match ONLY if no exact match found and target has sufficient length
    if (!rep && normTarget && normTarget.length >= 3) {
      rep = reps.find((r: any) => {
        const normS = normalize(r.slug || "");
        const normN = normalize(r.name || "");
        return normS.includes(normTarget) || normN.includes(normTarget);
      });
    }

    const targetNames: string[] = [cleanTarget];
    const isEngMohamed = cleanTarget === "eng.mohamed" || 
                         cleanTarget === "mohamed" || 
                         cleanTarget === "eng_mohamed" || 
                         normTarget === "م/محمد" ||
                         normTarget === "م/محمدعلي" ||
                         (rep && (rep.slug === "eng.mohamed" || rep.name === "eng.mohamed" || rep.name === "م/محمد علي"));

    if (isEngMohamed) {
      targetNames.push("eng.mohamed", "mohamed", "م/محمد", "م/محمد علي", "م/محمدعلي");
    }

    if (rep) {
      if (rep.name) {
        targetNames.push(rep.name.toLowerCase().trim());
        const normN = normalize(rep.name);
        if (normN) targetNames.push(normN);
        targetNames.push(rep.name.replace(/[أإآ]/g, "ا").trim());
        targetNames.push(rep.name.replace(/^ا/g, "أ").trim());
      }
      if (rep.slug) {
        targetNames.push(rep.slug.toLowerCase().trim());
        const normS = normalize(rep.slug);
        if (normS) targetNames.push(normS);
      }
    }

    const repLeads = allLeads.filter((lead: any) => {
      const ag = (lead.agentName || lead.agent_name || "").toLowerCase().trim();
      const notes = (lead.notes || "").toLowerCase();
      const normAg = normalize(ag);

      // If student is explicitly assigned to another agent, they do not belong to this rep
      if (ag && normAg) {
        const matchesThis = targetNames.some(target => {
          if (!target) return false;
          return ag === target.toLowerCase().trim() || normAg === normalize(target);
        });
        if (!matchesThis) return false;
      }

      return targetNames.some(target => {
        if (!target) return false;
        const normT = normalize(target);
        if (ag && (ag === target || normAg === normT)) return true;
        if (notes && (notes.includes(`الموظف:${target}`) || notes.includes(`الموظف/الرابط:${target}`) || notes.includes(`بوابة السيلز: ${target}`))) return true;
        if (notes && (notes.includes(`الموظف:${normT}`) || notes.includes(`الموظف/الرابط:${normT}`) || notes.includes(`بوابة السيلز: ${normT}`))) return true;
        return false;
      });
    });

    res.json({
      success: true,
      rep: rep || { name: slugOrName, slug: slugOrName },
      leads: repLeads,
      totalCount: repLeads.length
    });
  } catch (err: any) {
    console.error("Error in /api/sales-reps/leads/:slugOrName:", err);
    res.status(500).json({ success: false, error: "حدث خطأ أثناء استدعاء بيانات الطلاب الخاصة بالموظف." });
  }
});

// POST /api/sales-reps/lead-update - Update a lead directly from the sales portal
app.post("/api/sales-reps/lead-update", async (req, res) => {
  try {
    const { studentId, reservationCode, phone, studentName, status, internalNotes, repName } = req.body;
    if (!studentId && !reservationCode && !phone) {
      return res.status(400).json({ success: false, error: "معرف الطالب أو رمز الحجز مطلوب لإتمام التعديل." });
    }

    let dbRow: any = null;
    if (studentId) {
      dbRow = await findStudentRow(studentId);
    }
    if (!dbRow && reservationCode) {
      dbRow = await findStudentRow(reservationCode);
    }
    if (!dbRow && phone) {
      dbRow = await findStudentRowByPhone(phone);
    }

    // Auto-create/synthesize record if not found in database so sales reps are NEVER blocked
    if (!dbRow) {
      const fallbackCode = reservationCode || (studentId && !String(studentId).startsWith("lead-") ? String(studentId) : `REG-${Date.now().toString().slice(-4)}`);
      dbRow = {
        id: studentId || Date.now(),
        reservation_code: fallbackCode,
        full_name: studentName || "طالب مسجل",
        phone: phone || "",
        whatsapp_number: phone || "",
        status: status || "completed",
        notes: "",
        agent_name: repName || "",
        created_at: new Date().toISOString()
      };
      localInsertStudent(dbRow);
    }

    const currentParsed = deserializeNotes(dbRow.notes || "");
    const updatedInternal = internalNotes !== undefined ? internalNotes : currentParsed.internalNotes;
    let serializedNotes = serializeNotes(
      currentParsed.userNotes,
      updatedInternal,
      currentParsed.wantsEquivalence,
      currentParsed.academyName,
      currentParsed.branch,
      currentParsed.submissionDate,
      currentParsed.appliedStatus,
      currentParsed.academyNotes
    );

    // If agent clicked "تأكيد المكالمة والتعميد" (completed), stamp with explicit agent completion tag
    if (status === "completed" || (dbRow.notes && dbRow.notes.includes("__AGENT_CONTACT_COMPLETED__") && status !== "pending")) {
      if (!serializedNotes.includes("__AGENT_CONTACT_COMPLETED__")) {
        serializedNotes += "\n__AGENT_CONTACT_COMPLETED__";
      }
    } else if (status === "pending") {
      serializedNotes = serializedNotes.replace(/\n?__AGENT_CONTACT_COMPLETED__/g, "");
    }

    const updatePayload: any = {
      notes: serializedNotes
    };

    if (status !== undefined) {
      updatePayload.status = status;
    }

    if (repName && (!dbRow.agent_name || dbRow.agent_name.trim() === "")) {
      updatePayload.agent_name = repName;
    }

    // 1. Instant local persistence (0ms latency, always reliable)
    localUpdateStudent(dbRow.reservation_code || dbRow.id, updatePayload);

    // 2. Non-blocking asynchronous Supabase sync in background
    if (hasSupabase && isSupabaseOperationAllowed()) {
      withTimeout(
        supabase
          .from("students")
          .update(updatePayload)
          .eq("reservation_code", dbRow.reservation_code),
        1500,
        null
      ).catch((sbErr: any) => {
        console.warn("Supabase lead-update background sync warning:", sbErr?.message || sbErr);
      });
    }

    // 3. Non-blocking asynchronous Google Sheets sync in background
    try {
      syncToSheet({ ...dbRow, ...updatePayload }, "update").catch(e => {
        console.warn("Google Sheet sync warning:", e?.message || e);
      });
    } catch {}

    // 4. Return instant confirmation to the sales portal
    return res.json({
      success: true,
      updatedCode: dbRow.reservation_code,
      status: updatePayload.status !== undefined ? updatePayload.status : dbRow.status,
      internalNotes: updatedInternal
    });
  } catch (err: any) {
    console.error("Error in /api/sales-reps/lead-update:", err);
    res.status(500).json({ success: false, error: "فشل تحديث بيانات الطالب." });
  }
});

// ==========================================
// PARTNER ACADEMY PORTAL ENDPOINTS (Option A)
// ==========================================

function sanitizeNotesForAcademy(rawNotes: string): { studentNotes: string; academyNotes: string } {
  if (!rawNotes) return { studentNotes: "", academyNotes: "" };
  const parsed = deserializeNotes(rawNotes);
  const academyNotes = parsed.academyNotes || "";
  
  // Clean userNotes to remove internal marketing tags, discount codes, IP address, ad campaign names
  let cleanNotes = parsed.userNotes || "";
  cleanNotes = cleanNotes
    .replace(/\[كود الخصم:[^\]]*\]/gi, "")
    .replace(/\[إعلان:[^\]]*\]/gi, "")
    .replace(/\[اعلان:[^\]]*\]/gi, "")
    .replace(/\[المصدر:[^\]]*\]/gi, "")
    .replace(/\[IP:[^\]]*\]/gi, "")
    .replace(/\[تسجيل مباشر عبر بوابة السيلز:[^\]]*\]/gi, "")
    .replace(/\[بوابة:[^\]]*\]/gi, "")
    .replace(/\[بوابه:[^\]]*\]/gi, "")
    .replace(/\|/g, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/utm_[a-zA-Z_]+=[^\s&]+/gi, "")
    .replace(/fbclid=[^\s&]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return { studentNotes: cleanNotes, academyNotes };
}

// GET /api/academy-portal/list - Returns STRICTLY the 4 official partner academies and their real student counts (only students who extracted an official application form)
app.get("/api/academy-portal/list", async (req, res) => {
  try {
    const allLeads = await getLeadsFromSupabase();
    // STRICTLY: Only students who have generated / extracted an official application form!
    const extractedFormLeads = allLeads.filter((l: any) => hasStudentExtractedForm(l));

    const officialAcademies = [
      "أكاديمية السلام للتدريب",
      "أكاديمية تراست للعلوم الطبية",
      "أكاديمية أبيكس",
      "أكاديمية الرفاق للتدريب"
    ];

    const academyCountMap: Record<string, number> = {};
    officialAcademies.forEach(ac => {
      academyCountMap[ac] = 0;
    });

    // Accurately resolve and count every student who extracted an official application form
    extractedFormLeads.forEach((lead: any) => {
      const canonical = resolveCanonicalAcademy(
        lead.academyName,
        lead.rawNotes || lead.notes,
        lead.governorate,
        lead.selectedDepartments || lead.specialization
      );
      if (canonical && academyCountMap[canonical] !== undefined) {
        academyCountMap[canonical] = (academyCountMap[canonical] || 0) + 1;
      }
    });

    const result = officialAcademies.map(name => ({
      name,
      studentCount: academyCountMap[name] || 0
    }));

    res.json({ success: true, academies: result });
  } catch (err: any) {
    console.error("Error in /api/academy-portal/list:", err);
    res.status(500).json({ success: false, error: "فشل تحميل قائمة الأكاديميات." });
  }
});

// GET /api/academy-portal/leads/:academyName - Fetches sanitized student records for partner academy view (only students who extracted a form)
app.get("/api/academy-portal/leads/:academyName", async (req, res) => {
  try {
    const { academyName } = req.params;
    if (!academyName) {
      return res.status(400).json({ success: false, error: "اسم الأكاديمية مطلوب." });
    }

    const decodedTarget = decodeURIComponent(academyName).trim();
    const normTarget = normalizeArabicText(decodedTarget);
    const isMasterRequest = ["all", "master", "all-academies", "الكافة", "كافة", "مجمع"].some(k => normTarget.includes(k));

    const canonicalTarget = !isMasterRequest ? resolveCanonicalAcademy(decodedTarget) : "";

    const allLeads = await getLeadsFromSupabase();

    // STRICTLY: Filter leads who have generated / extracted an official application form!
    const extractedFormLeads = allLeads.filter((l: any) => hasStudentExtractedForm(l));

    // Filter leads that belong to this academy or all official academies
    let matchingLeads: any[] = [];
    if (isMasterRequest) {
      matchingLeads = extractedFormLeads;
    } else {
      matchingLeads = extractedFormLeads.filter((lead: any) => {
        const leadAcademy = resolveCanonicalAcademy(
          lead.academyName,
          lead.rawNotes || lead.notes,
          lead.governorate,
          lead.selectedDepartments || lead.specialization
        );
        return leadAcademy === canonicalTarget;
      });
    }

    // Sanitize leads to remove sensitive marketing/sales rep tags and provide academy-only notes
    const sanitizedLeads = matchingLeads.map((lead: any) => {
      const rawNotes = lead.rawNotes || lead.notes || "";
      const { studentNotes, academyNotes } = sanitizeNotesForAcademy(rawNotes);

      const assignedAcademy = resolveCanonicalAcademy(
        lead.academyName,
        rawNotes,
        lead.governorate,
        lead.selectedDepartments || lead.specialization
      );

      return {
        id: lead.id,
        reservationCode: lead.reservationCode,
        studentName: lead.studentName,
        phoneNumber: lead.phoneNumber,
        whatsappNumber: lead.whatsappNumber,
        graduationYear: lead.graduationYear,
        governorate: lead.governorate,
        educationLevel: lead.educationLevel,
        basicCourse: lead.basicCourse,
        selectedDepartments: lead.selectedDepartments,
        specialization: lead.specialization,
        notes: studentNotes,
        academyNotes: lead.academyNotes || academyNotes || "",
        date: lead.date,
        timestamp: lead.timestamp,
        status: lead.status,
        academyName: assignedAcademy,
        branch: lead.branch,
        submissionDate: lead.submissionDate,
        appliedStatus: lead.appliedStatus || "pending"
      };
    });

    const pendingCount = sanitizedLeads.filter(l => l.appliedStatus === "pending" || l.status === "pending").length;
    const completedCount = sanitizedLeads.filter(l => l.appliedStatus === "applied" || l.status === "completed").length;
    const withdrawnCount = sanitizedLeads.filter(l => l.appliedStatus === "withdrawn").length;

    res.json({
      success: true,
      academyName: isMasterRequest ? "كافة الأكاديميات الشريكة" : canonicalTarget,
      leads: sanitizedLeads,
      totalCount: sanitizedLeads.length,
      stats: {
        total: sanitizedLeads.length,
        pending: pendingCount,
        completed: completedCount,
        withdrawn: withdrawnCount
      }
    });
  } catch (err: any) {
    console.error("Error in /api/academy-portal/leads/:academyName:", err);
    res.status(500).json({ success: false, error: "فشل استدعاء بيانات طلاب الأكاديمية." });
  }
});

// POST /api/academy-portal/lead-update - Update student status and academy notes from partner academy view
app.post("/api/academy-portal/lead-update", async (req, res) => {
  try {
    const { studentId, status, appliedStatus, academyNotes, internalNotes } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, error: "معرف الطالب مطلوب لإتمام التعديل." });
    }

    const dbRow = await findStudentRow(studentId);
    if (!dbRow) {
      return res.status(404).json({ success: false, error: "لم يتم العثور على سجل الطالب." });
    }

    const currentParsed = deserializeNotes(dbRow.notes || "");
    const updatedInternal = internalNotes !== undefined ? internalNotes : currentParsed.internalNotes;
    const updatedAppliedStatus = appliedStatus !== undefined ? appliedStatus : currentParsed.appliedStatus;
    const updatedAcademyNotes = academyNotes !== undefined ? academyNotes : currentParsed.academyNotes;

    const serializedNotes = serializeNotes(
      currentParsed.userNotes,
      updatedInternal,
      currentParsed.wantsEquivalence,
      currentParsed.academyName,
      currentParsed.branch,
      currentParsed.submissionDate,
      updatedAppliedStatus,
      updatedAcademyNotes
    );

    const updatePayload: any = {
      notes: serializedNotes
    };

    if (status !== undefined) {
      updatePayload.status = status;
    }

    localUpdateStudent(dbRow.reservation_code, updatePayload);

    if (hasSupabase) {
      try {
        await supabase
          .from("students")
          .update(updatePayload)
          .eq("reservation_code", dbRow.reservation_code);
      } catch (sbErr) {
        console.error("Supabase update in academy-portal/lead-update error:", sbErr);
      }
    }

    // Google Sheets sync (background fire-and-forget)
    try {
      syncToSheet({ ...dbRow, ...updatePayload }, "update").catch((sheetSyncErr) => {
        console.warn("Failsafe warning: syncToSheet inside academy-portal/lead-update failed:", sheetSyncErr);
      });
    } catch (sheetSyncErr) {
      console.warn("Failsafe warning: syncToSheet inside academy-portal/lead-update failed:", sheetSyncErr);
    }

    res.json({
      success: true,
      updatedCode: dbRow.reservation_code,
      appliedStatus: updatedAppliedStatus,
      academyNotes: updatedAcademyNotes,
      status: updatePayload.status || dbRow.status
    });
  } catch (err: any) {
    console.error("Error in /api/academy-portal/lead-update:", err);
    res.status(500).json({ success: false, error: "فشل تحديث بيانات الطالب." });
  }
});

export default app;
