import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Volume2, 
  Check, 
  Play, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  X,
  VolumeX,
  AlertTriangle,
  BellOff
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  ALERT_TONE_OPTIONS, 
  AlertToneId, 
  playSynthesizedTone 
} from "../utils/audioAlerts";
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  dispatchStudentPhoneNotification,
  isNotificationSupported 
} from "../utils/pushNotifications";

interface NotificationSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageKeyPrefix?: string;
  userPrefix?: string;
  userName?: string;
  title?: string;
  notificationsEnabled?: boolean;
  onToggleNotifications?: (val: boolean) => void;
}

export const NotificationSoundModal: React.FC<NotificationSoundModalProps> = ({
  isOpen,
  onClose,
  storageKeyPrefix,
  userPrefix,
  userName = "الموظف",
  title,
  notificationsEnabled = true,
  onToggleNotifications
}) => {
  const effectivePrefix = userPrefix || storageKeyPrefix || "user";
  const toneStorageKey = `app_alert_tone_${effectivePrefix}`;
  const volumeStorageKey = `app_alert_vol_${effectivePrefix}`;
  const pushEnabledStorageKey = `app_push_enabled_${effectivePrefix}`;

  const [selectedTone, setSelectedTone] = useState<AlertToneId>(() => {
    return (localStorage.getItem(toneStorageKey) as AlertToneId) || "crystal_chime";
  });

  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem(volumeStorageKey);
    return saved ? Number(saved) : 0.8;
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return getNotificationPermission();
  });

  const [isPlayingTestTone, setIsPlayingTestTone] = useState<string | null>(null);

  useEffect(() => {
    setPushPermission(getNotificationPermission());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTone = (id: AlertToneId) => {
    setSelectedTone(id);
    localStorage.setItem(toneStorageKey, id);
    playSynthesizedTone(id, volume);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem(volumeStorageKey, String(newVol));
  };

  const handleTestTone = (id: AlertToneId) => {
    setIsPlayingTestTone(id);
    playSynthesizedTone(id, volume);
    setTimeout(() => setIsPlayingTestTone(null), 1200);
  };

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    const perm = getNotificationPermission();
    setPushPermission(perm);
    if (granted) {
      localStorage.setItem(pushEnabledStorageKey, "true");
      toast.success("✓ تم تفعيل إشعارات الهاتف بنجاح!");
      // Send a welcoming test notification
      dispatchStudentPhoneNotification({
        studentName: "مرحباً بك!",
        department: "تم تفعيل إشعارات الهاتف بنجاح",
        governorate: "نظام التنبيهات المعتمد"
      });
      playSynthesizedTone(selectedTone, volume);
    } else {
      toast.error("يرجى السماح بالإشعارات من إعدادات المتصفح أو الهاتف.");
    }
  };

  const handleSendTestNotification = () => {
    playSynthesizedTone(selectedTone, volume);
    dispatchStudentPhoneNotification({
      studentName: "أحمد علي محمود (طالب تجريبي)",
      reservationCode: "9988",
      department: "قسم تمريض ومساعد خدمات صحية",
      governorate: "القاهرة",
      repName: userName
    });
    toast.success("تم إرسال إشعار تجريبي لهاتفك وتشغيل النغمة المختارة 📲");
  };

  return (
    <div 
      className="fixed inset-0 bg-[#0a2463]/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[9999] text-right font-sans overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a2463] via-slate-900 to-[#0a2463] p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-400/20 border border-amber-400/30 rounded-2xl flex items-center justify-center text-amber-300">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>مخصص لحساب: {userName}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {title || "نظام نغمات وإشعارات الهاتف الرسمية"}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                اختر نغمة التنبيه المخصصة لك وفعّل وصول إشعارات الطلاب الجدد لهاتفك
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Master Notifications On/Off Toggle */}
          {onToggleNotifications && (
            <div className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 shadow-xs ${
              notificationsEnabled 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950" 
                : "bg-slate-100 border-slate-300 text-slate-700"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  notificationsEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                }`}>
                  {notificationsEnabled ? <Bell className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    تنبيهات الطلاب الذين سجلوا بالبوابة لطلب التواصل
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {notificationsEnabled 
                      ? "التنبيهات مفعلة: ستسمع نغمة مخصصة وإشعار عند تسجيل أي طالب يطلب الاتصال" 
                      : "التنبيهات معطلة: لن يتم تشغيل أي أصوات أو إرسال إشعارات هاتفية"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleNotifications(!notificationsEnabled)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 shadow-sm ${
                  notificationsEnabled 
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {notificationsEnabled ? "مفعلة 🟢" : "تفعيل التنبيه ⚪"}
              </button>
            </div>
          )}

          {/* 1. Official Phone Notification Setup */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  إشعارات الهاتف الرسمية (Web Push)
                </span>
              </div>
              {pushPermission === "granted" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  مفعلة على هذا الهاتف
                </span>
              ) : pushPermission === "denied" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">
                  <VolumeX className="w-3.5 h-3.5" />
                  محظورة بالمتصفح
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                  غير مفعلة بعد
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              عند تفعيل الإشعارات، سيصلك تنبيه رسمي على شاشة الهاتف حتى أثناء إغلاق الشاشة أو تصفح تطبيقات أخرى فور تسجيل طالب جديد أو تحويله لحسابك.
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {pushPermission !== "granted" ? (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>تفعيل إشعارات الهاتف الآن 📲</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>إرسال إشعار تجريبي لاختبار الهاتف ⚡</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Tone Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-600" />
                <span>اختر نغمة التنبيه الصوتية:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-bold">
                (6 نغمات متباينة)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {ALERT_TONE_OPTIONS.map((tone) => {
                const isSelected = selectedTone === tone.id;
                const isPlaying = isPlayingTestTone === tone.id;

                return (
                  <div
                    key={tone.id}
                    onClick={() => handleSelectTone(tone.id)}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                        isSelected ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600"
                      }`}>
                        {tone.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs sm:text-sm font-black truncate ${
                            isSelected ? "text-indigo-950" : "text-slate-800"
                          }`}>
                            {tone.name}
                          </h4>
                          {isSelected && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9.5px] font-black">
                              <Check className="w-2.5 h-2.5" />
                              المختارة
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {tone.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestTone(tone.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                        isPlaying
                          ? "bg-amber-500 text-white border-amber-500 animate-pulse"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                      title="استماع للنغمة"
                    >
                      <Play className="w-3 h-3" />
                      <span>{isPlaying ? "جاري العزف..." : "استماع"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Volume Control */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <span>مستوى صوت التنبيه:</span>
              </span>
              <span className="font-black text-indigo-700">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>يتم حفظ تفضيلات النغمة والإشعارات تلقائياً بحسابك</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition cursor-pointer"
          >
            إغلاق وحفظ
          </button>
        </div>
      </div>
    </div>
  );
};
