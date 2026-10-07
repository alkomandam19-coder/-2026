import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  GraduationCap, 
  Award, 
  BookOpen, 
  Sparkles, 
  Share2, 
  Ticket,
  UserCheck
} from "lucide-react";
import { 
  Branch, 
  DEFAULT_BRANCHES, 
  LOCAL_STORAGE_BRANCHES_KEY 
} from "../data/branchesData";
import { 
  Specialization, 
  AccreditationItem, 
  StudySystemItem,
  LOCAL_STORAGE_SPECIALIZATIONS_KEY,
  LOCAL_STORAGE_ACCREDITATIONS_KEY,
  LOCAL_STORAGE_STUDYSYSTEM_KEY,
  DEFAULT_SPECIALIZATIONS,
  DEFAULT_ACCREDITATIONS,
  DEFAULT_STUDYSYSTEM
} from "../data/academyPortalData";
import { PortalTabsNav, PortalTabType } from "../components/portal/PortalTabsNav";
import { BranchesListView } from "../components/portal/BranchesListView";
import { SpecializationsView } from "../components/portal/SpecializationsView";
import { AccreditationsView } from "../components/portal/AccreditationsView";
import { StudySystemView } from "../components/portal/StudySystemView";
import { DeveloperCreditFooter } from "../components/portal/DeveloperCreditFooter";
import { AcademyAdminDashboardModal } from "../components/portal/AcademyAdminDashboardModal";
import { AcademyRegistrationModal } from "../components/portal/AcademyRegistrationModal";
import { 
  AuthModal, 
  BranchFormModal,
  SpecializationFormModal, 
  AccreditationFormModal, 
  StudySystemFormModal, 
  DeleteConfirmModal 
} from "../components/portal/PortalModals";
import { saveSiteConfig, syncAllConfigsFromDatabase } from "../utils/configSync";
import toast from "react-hot-toast";

function parseList<T>(data: any, fallback: T[]): T[] {
  if (data === null || data === undefined) return fallback;
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const p = JSON.parse(data);
      if (Array.isArray(p)) return p;
    } catch (e) {}
  }
  return fallback;
}

export default function BranchesPage() {
  // 1. Tab State with URL query sync
  const [activeTab, setActiveTab] = useState<PortalTabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "specializations" || tabParam === "accreditations" || tabParam === "studysystem" || tabParam === "branches") {
        return tabParam as PortalTabType;
      }
    } catch (e) {
      console.error(e);
    }
    return "branches";
  });

  const handleSelectTab = (tab: PortalTabType) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Data States
  const [branches, setBranches] = useState<Branch[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_BRANCHES_KEY);
        if (saved) return parseList(saved, DEFAULT_BRANCHES);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_BRANCHES;
  });

  const [specializations, setSpecializations] = useState<Specialization[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_SPECIALIZATIONS_KEY);
        if (saved) return parseList(saved, DEFAULT_SPECIALIZATIONS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SPECIALIZATIONS;
  });

  const [accreditations, setAccreditations] = useState<AccreditationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_ACCREDITATIONS_KEY);
        if (saved) return parseList(saved, DEFAULT_ACCREDITATIONS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_ACCREDITATIONS;
  });

  const [studySystemItems, setStudySystemItems] = useState<StudySystemItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_STUDYSYSTEM_KEY);
        if (saved) return parseList(saved, DEFAULT_STUDYSYSTEM);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_STUDYSYSTEM;
  });

  // 3. Admin & Registration Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Sub-entity Form Modals
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | undefined>();

  const [isSpecFormOpen, setIsSpecFormOpen] = useState(false);
  const [specToEdit, setSpecToEdit] = useState<Specialization | undefined>();

  const [isAccFormOpen, setIsAccFormOpen] = useState(false);
  const [accToEdit, setAccToEdit] = useState<AccreditationItem | undefined>();

  const [isStudyFormOpen, setIsStudyFormOpen] = useState(false);
  const [studyToEdit, setStudyToEdit] = useState<StudySystemItem | undefined>();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "branch" | "spec" | "acc" | "study"; item: any } | null>(null);

  // Persistence & Cloud Sync Effects
  useEffect(() => {
    let isMounted = true;

    async function loadCloudData() {
      const configs = await syncAllConfigsFromDatabase();
      if (isMounted && configs) {
        if (configs[LOCAL_STORAGE_BRANCHES_KEY] !== undefined) {
          const b = parseList(configs[LOCAL_STORAGE_BRANCHES_KEY], DEFAULT_BRANCHES);
          setBranches(b);
        }
        if (configs[LOCAL_STORAGE_SPECIALIZATIONS_KEY] !== undefined) {
          const s = parseList(configs[LOCAL_STORAGE_SPECIALIZATIONS_KEY], DEFAULT_SPECIALIZATIONS);
          setSpecializations(s);
        }
        if (configs[LOCAL_STORAGE_ACCREDITATIONS_KEY] !== undefined) {
          const a = parseList(configs[LOCAL_STORAGE_ACCREDITATIONS_KEY], DEFAULT_ACCREDITATIONS);
          setAccreditations(a);
        }
        if (configs[LOCAL_STORAGE_STUDYSYSTEM_KEY] !== undefined) {
          const st = parseList(configs[LOCAL_STORAGE_STUDYSYSTEM_KEY], DEFAULT_STUDYSYSTEM);
          setStudySystemItems(st);
        }
      }
    }
    loadCloudData();

    const handleConfigsUpdated = () => {
      try {
        const savedB = localStorage.getItem(LOCAL_STORAGE_BRANCHES_KEY);
        if (savedB !== null) setBranches(parseList(savedB, DEFAULT_BRANCHES));

        const savedS = localStorage.getItem(LOCAL_STORAGE_SPECIALIZATIONS_KEY);
        if (savedS !== null) setSpecializations(parseList(savedS, DEFAULT_SPECIALIZATIONS));

        const savedA = localStorage.getItem(LOCAL_STORAGE_ACCREDITATIONS_KEY);
        if (savedA !== null) setAccreditations(parseList(savedA, DEFAULT_ACCREDITATIONS));

        const savedSt = localStorage.getItem(LOCAL_STORAGE_STUDYSYSTEM_KEY);
        if (savedSt !== null) setStudySystemItems(parseList(savedSt, DEFAULT_STUDYSYSTEM));
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("site_configs_updated", handleConfigsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("site_configs_updated", handleConfigsUpdated);
    };
  }, []);

  // 3-Click Footer Trigger: Open Passcode auth if locked, or Dashboard directly if unlocked
  const handleFooterTrigger = () => {
    if (isAdminUnlocked) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  // Auth Success -> Open Central Admin Dashboard
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setIsAdminUnlocked(true);
    setIsAdminDashboardOpen(true);
    toast.success("تم فتح لوحة تحكم أكاديمية السلام بنجاح 🛡️");
  };

  // Lock Admin
  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setIsAdminDashboardOpen(false);
    toast.success("تم قفل لوحة التحكم وتأمين الواجهة بنجاح 🔒");
  };

  // Dispatch Auth for in-view actions (edit/delete)
  const handleRequestAuth = (
    type: "branch" | "specialization" | "accreditation" | "studysystem",
    action: "add" | "edit" | "delete",
    targetItem?: any
  ) => {
    if (!isAdminUnlocked) {
      setIsAuthModalOpen(true);
      return;
    }

    if (action === "delete") {
      setDeleteTarget({
        type: type === "branch" ? "branch" : type === "specialization" ? "spec" : type === "accreditation" ? "acc" : "study",
        item: targetItem
      });
      setIsDeleteModalOpen(true);
      return;
    }

    if (type === "branch") {
      setBranchToEdit(action === "edit" ? targetItem : undefined);
      setIsBranchFormOpen(true);
    } else if (type === "specialization") {
      setSpecToEdit(action === "edit" ? targetItem : undefined);
      setIsSpecFormOpen(true);
    } else if (type === "accreditation") {
      setAccToEdit(action === "edit" ? targetItem : undefined);
      setIsAccFormOpen(true);
    } else if (type === "studysystem") {
      setStudyToEdit(action === "edit" ? targetItem : undefined);
      setIsStudyFormOpen(true);
    }
  };

  // Save Branch
  const handleSaveBranch = (branch: Branch) => {
    setBranches((prev) => {
      const exists = prev.some((b) => b.id === branch.id);
      const next = exists ? prev.map((b) => (b.id === branch.id ? branch : b)) : [branch, ...prev];
      saveSiteConfig(LOCAL_STORAGE_BRANCHES_KEY, next);
      return next;
    });
    setIsBranchFormOpen(false);
    toast.success("تم حفظ بيانات الفرع بنجاح");
  };

  // Save Specialization
  const handleSaveSpecialization = (spec: Specialization) => {
    setSpecializations((prev) => {
      const exists = prev.some((s) => s.id === spec.id);
      const next = exists ? prev.map((s) => (s.id === spec.id ? spec : s)) : [spec, ...prev];
      saveSiteConfig(LOCAL_STORAGE_SPECIALIZATIONS_KEY, next);
      return next;
    });
    setIsSpecFormOpen(false);
    toast.success("تم حفظ بيانات التخصص بنجاح");
  };

  // Save Accreditation
  const handleSaveAccreditation = (acc: AccreditationItem) => {
    setAccreditations((prev) => {
      const exists = prev.some((a) => a.id === acc.id);
      const next = exists ? prev.map((a) => (a.id === acc.id ? acc : a)) : [acc, ...prev];
      saveSiteConfig(LOCAL_STORAGE_ACCREDITATIONS_KEY, next);
      return next;
    });
    setIsAccFormOpen(false);
    toast.success("تم حفظ بيانات الاعتماد بنجاح");
  };

  // Save Study System
  const handleSaveStudySystem = (item: StudySystemItem) => {
    setStudySystemItems((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      const next = exists ? prev.map((s) => (s.id === item.id ? item : s)) : [item, ...prev];
      saveSiteConfig(LOCAL_STORAGE_STUDYSYSTEM_KEY, next);
      return next;
    });
    setIsStudyFormOpen(false);
    toast.success("تم حفظ بيانات نظام الدراسة بنجاح");
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;

    if (type === "branch") {
      setBranches((prev) => {
        const next = prev.filter((b) => b.id !== item.id);
        saveSiteConfig(LOCAL_STORAGE_BRANCHES_KEY, next);
        return next;
      });
      toast.success("تم حذف الفرع بنجاح");
    } else if (type === "spec") {
      setSpecializations((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(LOCAL_STORAGE_SPECIALIZATIONS_KEY, next);
        return next;
      });
      toast.success("تم حذف التخصص بنجاح");
    } else if (type === "acc") {
      setAccreditations((prev) => {
        const next = prev.filter((a) => a.id !== item.id);
        saveSiteConfig(LOCAL_STORAGE_ACCREDITATIONS_KEY, next);
        return next;
      });
      toast.success("تم حذف الاعتماد بنجاح");
    } else if (type === "study") {
      setStudySystemItems((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(LOCAL_STORAGE_STUDYSYSTEM_KEY, next);
        return next;
      });
      toast.success("تم حذف البند بنجاح");
    }

    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // Share direct tab link
  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "بوابة أكاديمية السلام للتدريب",
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط البوابة بنجاح لمشاركته");
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-400 selection:text-slate-950 flex flex-col justify-between" dir="rtl">
      
      <div>
        {/* 1. Header Banner & Branding */}
        <header className="relative bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 pt-7 pb-8 overflow-hidden print:hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-950 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>المنظومة الرسمية الشاملة للطلاب والدارسين</span>
                <span className="bg-amber-200/80 text-amber-950 text-[11px] px-2 py-0.5 rounded font-mono font-bold">2026 - 2027</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareLink}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs transition flex items-center gap-1.5"
                  title="مشاركة رابط الصفحة"
                >
                  <Share2 className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">مشاركة الرابط</span>
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="max-w-3xl space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                بوابة <span className="text-amber-600 font-extrabold">أكاديمية السلام للتدريب والاستشارات</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                دليلك المعتمد لمقرات وفروع الأكاديمية، التخصصات والمصروفات ونظام الأقساط، التوثيقات والشهادات الرسمية المعتمدة، ونظام الدراسة والتدريب العملي بالمستشفيات والشركات.
              </p>
            </div>

            {/* Register Now Button Directly Under Header */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                id="salam-register-now-btn"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95"
              >
                <Ticket className="w-5 h-5 text-slate-950" />
                <span>سجل الآن بالأكاديمية (خصم 25% بكود AM2026)</span>
                <Sparkles className="w-4 h-4 text-amber-900" />
              </button>

              <div className="text-xs font-bold text-slate-600 bg-amber-50/80 px-3.5 py-2 rounded-xl border border-amber-200/80 flex items-center gap-2">
                <span>🎟️ كود الخصم:</span>
                <span className="font-mono font-black text-amber-950 bg-amber-400/90 px-2 py-0.5 rounded text-xs">
                  AM2026
                </span>
                <span className="text-[11px] text-slate-500">(سارٍ لجميع التخصصات)</span>
              </div>
            </div>

          </div>
        </header>

        {/* 2. Sub-Pages Navigation Tabs */}
        <PortalTabsNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          counts={{
            branches: branches.length,
            specializations: specializations.length,
            accreditations: accreditations.length,
            studysystem: studySystemItems.length
          }}
        />

        {/* 3. Main Views Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* TAB 1: BRANCHES */}
          {activeTab === "branches" && (
            <BranchesListView
              branches={branches}
              onSaveBranch={handleSaveBranch}
              onRequestAuth={(action, branch) => handleRequestAuth("branch", action, branch)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 2: SPECIALIZATIONS (With Salam 25% Discount Announcement) */}
          {activeTab === "specializations" && (
            <SpecializationsView
              specializations={specializations}
              onSave={setSpecializations}
              onRequestAuth={(action, spec) => handleRequestAuth("specialization", action, spec)}
              isAdminUnlocked={isAdminUnlocked}
              showSalamDiscount={true}
            />
          )}

          {/* TAB 3: ACCREDITATIONS */}
          {activeTab === "accreditations" && (
            <AccreditationsView
              accreditations={accreditations}
              onSave={setAccreditations}
              onRequestAuth={(action, item) => handleRequestAuth("accreditation", action, item)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 4: STUDY SYSTEM */}
          {activeTab === "studysystem" && (
            <StudySystemView
              studySystemItems={studySystemItems}
              onSave={setStudySystemItems}
              onRequestAuth={(action, item) => handleRequestAuth("studysystem", action, item)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

        </main>
      </div>

      {/* 4. Unified Clean Footer with 3-Click Developer Credit Trigger */}
      <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-xs py-8 px-4 sm:px-6 lg:px-8 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          
          <div className="space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>أكاديمية السلام للتدريب والاستشارات © 2026</span>
            </div>
            <p className="text-[11px] text-slate-500">
              بوابة الدارسين والفروع المعتمدة لكافة التخصصات والاعتمادات الرسمية
            </p>
          </div>

          <DeveloperCreditFooter
            onTriggerAdmin={handleFooterTrigger}
            isAdminUnlocked={isAdminUnlocked}
            onLockAdmin={handleLockAdmin}
          />

        </div>
      </footer>

      {/* =========================================================
          Admin Modals & Forms
      ========================================================= */}
      
      {/* 1. Register Now Modal */}
      <AcademyRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        academyName="أكاديمية السلام للتدريب والاستشارات"
        availableSpecializations={specializations.map(s => ({ id: s.id, name: s.name }))}
        defaultDiscountCode="AM2026"
      />

      {/* 2. Admin Passcode Modal (Opens on 3-clicks if locked) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        academyScope="salam"
        academyName="أكاديمية السلام للتدريب"
        actionTitle="التحقق من صلاحية الإدارة للوحة تحكم أكاديمية السلام"
      />

      {/* 3. Central Admin Dashboard Modal */}
      <AcademyAdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        academyName="أكاديمية السلام للتدريب والاستشارات"
        onAddBranch={() => {
          setIsAdminDashboardOpen(false);
          setBranchToEdit(undefined);
          setIsBranchFormOpen(true);
        }}
        onAddSpecialization={() => {
          setIsAdminDashboardOpen(false);
          setSpecToEdit(undefined);
          setIsSpecFormOpen(true);
        }}
        onAddAccreditation={() => {
          setIsAdminDashboardOpen(false);
          setAccToEdit(undefined);
          setIsAccFormOpen(true);
        }}
        onAddStudySystem={() => {
          setIsAdminDashboardOpen(false);
          setStudyToEdit(undefined);
          setIsStudyFormOpen(true);
        }}
        onLockAdmin={handleLockAdmin}
        isLiveAdminMode={isAdminUnlocked}
        onToggleLiveAdminMode={() => setIsAdminUnlocked(!isAdminUnlocked)}
      />

      {/* 4. Branch Form Modal (Add / Edit) */}
      {isBranchFormOpen && (
        <BranchFormModal
          isOpen={isBranchFormOpen}
          onClose={() => setIsBranchFormOpen(false)}
          onSave={handleSaveBranch}
          branchToEdit={branchToEdit}
        />
      )}

      {/* 5. Specialization Form Modal */}
      {isSpecFormOpen && (
        <SpecializationFormModal
          isOpen={isSpecFormOpen}
          onClose={() => setIsSpecFormOpen(false)}
          onSave={handleSaveSpecialization}
          initialData={specToEdit}
        />
      )}

      {/* 6. Accreditation Form Modal */}
      {isAccFormOpen && (
        <AccreditationFormModal
          isOpen={isAccFormOpen}
          onClose={() => setIsAccFormOpen(false)}
          onSave={handleSaveAccreditation}
          initialData={accToEdit}
        />
      )}

      {/* 7. Study System Form Modal */}
      {isStudyFormOpen && (
        <StudySystemFormModal
          isOpen={isStudyFormOpen}
          onClose={() => setIsStudyFormOpen(false)}
          onSave={handleSaveStudySystem}
          initialData={studyToEdit}
        />
      )}

      {/* 8. Delete Confirm Modal */}
      {isDeleteModalOpen && deleteTarget && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={deleteTarget.item.name || deleteTarget.item.title || "هذا البند"}
          itemType={deleteTarget.type === "branch" ? "فرع" : deleteTarget.type === "spec" ? "تخصص" : deleteTarget.type === "acc" ? "اعتماد" : "بند دراسي"}
        />
      )}

    </div>
  );
}
