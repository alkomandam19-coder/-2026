import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, CheckCircle, Bell, User, MapPin, Award, Shield, FileText } from "lucide-react";

interface RealtimeEvent {
  name: string;
  governorate: string;
  specialization: string;
  source: string;
  timestamp?: string;
}

export function RealtimeNotificationToast() {
  const [activeNotification, setActiveNotification] = useState<RealtimeEvent | null>(null);

  // Play a gentle synthesized chime for real events
  const playElegantChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Gentle warm carrier note (sine wave)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // Upward G5 leap
      
      // Top sparkle note (triangle wave)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6 sparkle note
      
      // Smooth exponential decays
      gain1.gain.setValueAtTime(0.05, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      gain2.gain.setValueAtTime(0.02, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(ctx.destination);
      gain2.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.65);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Mask student's name professionally to protect privacy while maintaining full authenticity
  const maskName = (rawName: string): string => {
    if (!rawName) return "طالب مسجل";
    const cleaned = rawName.replace(/^\[.*?\]\s*/, "").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "طالب جديد";
    if (parts.length === 1) return parts[0];
    
    // Mask subsequent names (e.g. محمد عبد الرحمن -> محمد ع***)
    const firstName = parts[0];
    const maskedParts = parts.slice(1).map(p => {
      if (p.length <= 1) return p + "*";
      return p[0] + "***";
    });
    return [firstName, ...maskedParts].slice(0, 3).join(" ");
  };

  // Trigger notification display
  const triggerNotification = (event: RealtimeEvent) => {
    setActiveNotification(null);
    setTimeout(() => {
      setActiveNotification(event);
      playElegantChime();
    }, 150);
  };

  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Fetch ONLY genuine real events from backend
    const fetchRealtimeEvents = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/realtime-events?format=json");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.events) && data.events.length > 0) {
          const latest = data.events[0];
          // Only show if it's a real registration event that hasn't been shown in this session
          if (latest && latest.id !== lastEventIdRef.current && latest.type === "registration" && latest.data) {
            // Check if the event is reasonably recent (within last 30 minutes)
            const eventTime = latest.timestamp ? new Date(latest.timestamp).getTime() : Date.now();
            const isRecent = Date.now() - eventTime < 30 * 60 * 1000;
            
            lastEventIdRef.current = latest.id;
            if (isRecent) {
              triggerNotification({
                name: latest.data.name,
                governorate: latest.data.governorate,
                specialization: latest.data.specialization,
                source: latest.data.source || "استمارة القبول المركزي 🎫"
              });
            }
          }
        }
      } catch (err) {
        // Quiet fallback
      }
    };

    // Initial check on load, then lightweight polling every 5 seconds (5000ms)
    fetchRealtimeEvents();
    const pollInterval = setInterval(fetchRealtimeEvents, 5000);

    // 2. Listen to instant client-side event if student submitted on this client
    const handleLocalLeadRegistered = (e: CustomEvent<RealtimeEvent>) => {
      if (e.detail && e.detail.name) {
        triggerNotification(e.detail);
      }
    };

    window.addEventListener("real_lead_registered" as any, handleLocalLeadRegistered);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("real_lead_registered" as any, handleLocalLeadRegistered);
    };
  }, []);

  // Auto-dismiss the active notification after 6 seconds
  useEffect(() => {
    if (activeNotification) {
      const dismissTimer = setTimeout(() => {
        setActiveNotification(null);
      }, 6000);
      return () => clearTimeout(dismissTimer);
    }
  }, [activeNotification]);

  // Choose matching visual theme/icon for each registration source
  const getSourceIcon = (source: string) => {
    if (source.includes("🤖") || source.includes("البوت") || source.includes("الذكي")) {
      return <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />;
    }
    if (source.includes("📞") || source.includes("اتصال")) {
      return <Bell className="w-5 h-5 text-indigo-500 animate-bounce" />;
    }
    if (source.includes("📥") || source.includes("دليل")) {
      return <FileText className="w-5 h-5 text-emerald-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-teal-500" />;
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[9999] pointer-events-none select-none max-w-[270px] sm:max-w-xs w-auto font-sans">
      <AnimatePresence mode="wait">
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="pointer-events-auto bg-white/95 backdrop-blur-xl shadow-[0_12px_35px_rgba(15,23,42,0.14)] border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-start gap-2.5 relative overflow-hidden"
            dir="rtl"
            id="realtime-live-toast"
          >
            {/* Visual shine overlay */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
            
            {/* Interactive Pulse Dot */}
            <span className="absolute top-2 left-2 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>

            {/* Icon Container */}
            <div className="flex-shrink-0 bg-slate-50 border border-slate-100 p-1.5 sm:p-2 rounded-lg flex items-center justify-center shadow-xs mt-0.5">
              {getSourceIcon(activeNotification.source)}
            </div>

            {/* Message Body */}
            <div className="flex-grow min-w-0 pr-0.5">
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                <Shield className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 font-extrabold">تسجيل حقيقي مؤكد</span>
              </div>
              
              {/* Student Name & Gov */}
              <h4 className="text-slate-900 text-[11px] sm:text-xs font-bold leading-tight mb-0.5 flex items-center flex-wrap gap-1">
                <User className="w-3 h-3 text-slate-500 inline shrink-0" />
                <span>{maskName(activeNotification.name)}</span>
                {activeNotification.governorate && (
                  <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 py-0.2 px-1.5 rounded-full inline-flex items-center gap-0.5">
                    <MapPin className="w-2 h-2 text-slate-400" />
                    {activeNotification.governorate}
                  </span>
                )}
              </h4>

              {/* Specialization Detail */}
              <p className="text-slate-600 text-[10.5px] sm:text-[11.5px] leading-tight mb-1.5 font-medium flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">تسجيل في: <strong className="text-slate-900 font-bold">{activeNotification.specialization}</strong></span>
              </p>

              {/* Source/Badge */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[8.5px] sm:text-[9.5px] text-slate-400 font-bold">
                <span className="truncate">المصدر: <span className="text-emerald-700 bg-emerald-50/80 border border-emerald-100/60 rounded px-1 py-0.2 font-bold">{activeNotification.source}</span></span>
                <span className="text-emerald-600 font-black flex items-center gap-0.5 shrink-0">
                  ● حجز فوري
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
