/**
 * Utility to capture UTM parameters, employee/agent referral codes, and campaign tags
 * automatically from campaign URLs and append them into the 'notes' field and agent fields.
 */

export interface AdAttribution {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
  agent?: string;
  sales_agent?: string;
  discount_code?: string;
  referrer?: string;
  capturedAt?: string;
}

export function captureAdAttribution(): void {
  if (typeof window === "undefined") return;
  
  try {
    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get("utm_source") || params.get("source");
    const utm_campaign = params.get("utm_campaign") || params.get("campaign");
    const utm_medium = params.get("utm_medium") || params.get("medium");
    const utm_content = params.get("utm_content") || params.get("content");
    const utm_term = params.get("utm_term") || params.get("term");
    
    // Employee / Agent / Marketer referral codes
    const ref = params.get("ref") || params.get("r");
    const agent = params.get("agent") || params.get("sales_agent") || params.get("rep") || params.get("marketer") || params.get("aff");
    const discount_code = params.get("discount") || params.get("code") || params.get("promo");

    if (utm_source || utm_campaign || utm_medium || utm_content || utm_term || ref || agent || discount_code) {
      const attribution: AdAttribution = {
        utm_source: utm_source || undefined,
        utm_campaign: utm_campaign || undefined,
        utm_medium: utm_medium || undefined,
        utm_content: utm_content || undefined,
        utm_term: utm_term || undefined,
        ref: ref || undefined,
        agent: agent || undefined,
        sales_agent: agent || ref || undefined,
        discount_code: discount_code || undefined,
        referrer: document.referrer ? new URL(document.referrer).hostname : undefined,
        capturedAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      };
      
      sessionStorage.setItem("academy_ad_attribution", JSON.stringify(attribution));
      localStorage.setItem("academy_ad_attribution", JSON.stringify(attribution));

      // Direct agent storage for instant lookup
      const effectiveAgent = agent || ref;
      if (effectiveAgent) {
        sessionStorage.setItem("academy_tracked_agent", effectiveAgent);
        localStorage.setItem("academy_tracked_agent", effectiveAgent);
      }

      if (discount_code) {
        sessionStorage.setItem("academy_tracked_discount", discount_code);
        localStorage.setItem("academy_tracked_discount", discount_code);
      }
    } else if (!sessionStorage.getItem("academy_ad_attribution") && document.referrer) {
      try {
        const refHost = new URL(document.referrer).hostname;
        if (refHost && !refHost.includes(window.location.hostname)) {
          const attribution: AdAttribution = {
            utm_source: refHost,
            referrer: document.referrer,
            capturedAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          };
          sessionStorage.setItem("academy_ad_attribution", JSON.stringify(attribution));
        }
      } catch {
        // invalid URL ignore
      }
    }
  } catch {
    // browser error guard
  }
}

export function getCapturedAgentName(): string {
  if (typeof window === "undefined") return "";
  try {
    const direct = sessionStorage.getItem("academy_tracked_agent") || localStorage.getItem("academy_tracked_agent");
    if (direct) return direct.trim();

    const raw = sessionStorage.getItem("academy_ad_attribution") || localStorage.getItem("academy_ad_attribution");
    if (raw) {
      const attr: AdAttribution = JSON.parse(raw);
      if (attr.agent) return attr.agent.trim();
      if (attr.sales_agent) return attr.sales_agent.trim();
      if (attr.ref) return attr.ref.trim();
    }
  } catch {
    // ignore
  }
  return "";
}

export function getCapturedDiscountCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const direct = sessionStorage.getItem("academy_tracked_discount") || localStorage.getItem("academy_tracked_discount");
    if (direct) return direct.trim();

    const raw = sessionStorage.getItem("academy_ad_attribution") || localStorage.getItem("academy_ad_attribution");
    if (raw) {
      const attr: AdAttribution = JSON.parse(raw);
      if (attr.discount_code) return attr.discount_code.trim();
    }
  } catch {
    // ignore
  }
  return "";
}

export function getFormattedAdAttribution(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = sessionStorage.getItem("academy_ad_attribution") || localStorage.getItem("academy_ad_attribution");
    if (!raw) return "";
    const attr: AdAttribution = JSON.parse(raw);
    
    const parts: string[] = [];
    const agentName = attr.agent || attr.sales_agent || attr.ref;
    if (agentName) parts.push(`الموظف/الرابط: ${agentName}`);
    if (attr.utm_source) parts.push(`المصدر: ${attr.utm_source}`);
    if (attr.utm_campaign) parts.push(`الحملة: ${attr.utm_campaign}`);
    if (attr.utm_medium) parts.push(`النوع: ${attr.utm_medium}`);
    if (attr.utm_content) parts.push(`المحتوى: ${attr.utm_content}`);
    if (attr.utm_term) parts.push(`الكلمة: ${attr.utm_term}`);
    if (attr.referrer && !attr.utm_source) parts.push(`المحيط: ${attr.referrer}`);

    if (parts.length > 0) {
      return `[إعلان: ${parts.join(" | ")}]`;
    }
  } catch {
    // ignore
  }
  return "";
}

export function combineNotesWithAdAttribution(userNotes: string): string {
  const attributionTag = getFormattedAdAttribution();
  const trimmedNotes = (userNotes || "").trim();

  if (!attributionTag) return trimmedNotes;
  if (!trimmedNotes) return attributionTag;
  if (trimmedNotes.includes(attributionTag)) return trimmedNotes;
  
  return `${trimmedNotes} | ${attributionTag}`;
}

