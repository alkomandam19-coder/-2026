// Centralized Lead normalization and strict deduplication utilities

export interface StandardLead {
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
  specialization?: string;
  internalNotes?: string;
  wantsEquivalence?: boolean;
  academyName?: string;
  branch?: string;
  submissionDate?: string;
  appliedStatus?: string;
  academyNotes?: string;
  reassignedTimestamp?: number;
  reassignedDateStr?: string;
}

export function normalizeLead(raw: any): StandardLead {
  if (!raw) {
    return {
      id: "unknown",
      reservationCode: "",
      studentName: "",
      phoneNumber: "",
      educationLevel: "غير محدد",
      selectedDepartments: [],
      notes: "",
      date: "",
      timestamp: Date.now(),
      expiresAt: "",
      status: "pending"
    };
  }

  const reservationCode = String(raw.reservationCode || raw.reservation_code || raw.code || "").trim();
  const studentName = String(raw.studentName || raw.full_name || raw.name || "").trim();
  const phoneNumber = String(raw.phoneNumber || raw.phone || "").trim();
  const whatsappNumber = String(raw.whatsappNumber || raw.whatsapp_number || phoneNumber || "").trim();
  const governorate = String(raw.governorate || "").trim();
  const agentName = String(raw.agentName || raw.agent_name || "").trim();
  const id = String(raw.id || reservationCode || "").trim();

  let selectedDepartments: string[] = [];
  const rawDepts = raw.selectedDepartments || raw.selected_departments;
  if (Array.isArray(rawDepts)) {
    selectedDepartments = rawDepts;
  } else if (typeof rawDepts === "string") {
    try {
      const parsed = JSON.parse(rawDepts);
      if (Array.isArray(parsed)) selectedDepartments = parsed;
      else selectedDepartments = [rawDepts];
    } catch {
      selectedDepartments = rawDepts.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  const dateVal = raw.date || (raw.created_at ? new Date(raw.created_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" }) : "");
  const timestamp = Number(raw.timestamp) || (raw.created_at ? new Date(raw.created_at).getTime() : Date.now());
  const status = (raw.status === "completed" || raw.status === "no_reply") ? raw.status : "pending";

  return {
    id: id || "lead-" + Math.floor(100000 + Math.random() * 900000),
    reservationCode,
    studentName,
    phoneNumber,
    whatsappNumber,
    graduationYear: String(raw.graduationYear || raw.graduation_year || ""),
    governorate,
    educationLevel: String(raw.educationLevel || raw.education_level || "غير محدد"),
    basicCourse: String(raw.basicCourse || raw.basic_course || "دورة أكتوبر 2026 (الرئيسية)"),
    selectedDepartments,
    notes: String(raw.notes || ""),
    date: dateVal,
    timestamp: isNaN(timestamp) ? Date.now() : timestamp,
    expiresAt: String(raw.expiresAt || raw.expires_at || ""),
    status,
    agentName,
    specialization: String(raw.specialization || (selectedDepartments.length > 0 ? selectedDepartments[0] : "")),
    internalNotes: String(raw.internalNotes || ""),
    wantsEquivalence: Boolean(raw.wantsEquivalence || raw.wants_equivalence),
    academyName: String(raw.academyName || raw.academy_name || ""),
    branch: String(raw.branch || ""),
    submissionDate: String(raw.submissionDate || raw.submission_date || ""),
    appliedStatus: raw.appliedStatus || raw.applied_status || "pending",
    academyNotes: String(raw.academyNotes || raw.academy_notes || ""),
    reassignedTimestamp: raw.reassignedTimestamp,
    reassignedDateStr: raw.reassignedDateStr
  };
}

export function normalizeAndDeduplicateLeads(leads: any[]): StandardLead[] {
  if (!Array.isArray(leads)) return [];

  const keyIndexMap = new Map<string, number>();
  const result: StandardLead[] = [];

  for (const item of leads) {
    if (!item) continue;
    const lead = normalizeLead(item);

    const code = lead.reservationCode.trim();
    const id = lead.id.trim();
    const name = lead.studentName.trim();
    const phone = lead.phoneNumber.trim();

    // Deduplication Key:
    // 1. If reservationCode and ID exist, combine them
    // 2. If reservationCode exists, combine with student name
    // 3. If ID exists, use ID
    // 4. Fallback to phone + name
    const key = (code && id && id !== code)
      ? `cid_${code}_${id}`
      : (code ? `code_${code}_${name}` : (id ? `id_${id}` : `phone_${phone}_${name}`));

    if (keyIndexMap.has(key)) {
      const idx = keyIndexMap.get(key)!;
      const existing = result[idx];
      // Keep preferred fields: if incoming lead has non-empty agentName or newer timestamp, preserve it
      const preferredAgent = lead.agentName || existing.agentName || "";
      const preferredDateStr = lead.reassignedDateStr || existing.reassignedDateStr;
      const preferredTimestamp = Math.max(lead.timestamp || 0, existing.timestamp || 0);
      result[idx] = {
        ...existing,
        ...lead,
        agentName: preferredAgent,
        reassignedDateStr: preferredDateStr,
        timestamp: preferredTimestamp
      };
      continue;
    }
    keyIndexMap.set(key, result.length);
    result.push(lead);
  }

  return result;
}
