import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { toast } from "react-hot-toast";
import { 
  Calendar, 
  Clock, 
  Search, 
  Share2, 
  ChevronLeft,
  X,
  GraduationCap,
  TrendingUp,
  Megaphone,
  User,
  ExternalLink,
  Sliders,
  Sparkles,
  Newspaper,
  Facebook,
  Copy,
  Check
} from "lucide-react";
import SpeechButton from "../components/SpeechButton";
import { parseVideoMedia } from "../utils/imageCompression";

interface NewsPost {
  id: string;
  title: string;
  desc: string;
  category: string;
  readTime: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
}

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

export const FALLBACK_ARTICLE_IMAGES = [
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop"
];

export const normalizeNewsPost = (post: any, index: number = 0): NewsPost => {
  const fallbackImg = FALLBACK_ARTICLE_IMAGES[index % FALLBACK_ARTICLE_IMAGES.length];
  let safeDate = post?.createdAt;
  if (!safeDate || isNaN(new Date(safeDate).getTime())) {
    safeDate = new Date(Date.now() - (index + 1) * 86400000).toISOString();
  }
  const img = (post?.imageUrl && typeof post.imageUrl === "string" && post.imageUrl.trim().length > 5)
    ? post.imageUrl.trim()
    : fallbackImg;

  return {
    id: String(post?.id || index + 1),
    title: String(post?.title || "بيان وتنبيه رسمي هام"),
    desc: String(post?.desc || ""),
    category: String(post?.category || "أخبار المعاهد 🏛️"),
    readTime: String(post?.readTime || "قراءة في ٣ دقائق"),
    content: String(post?.content || post?.desc || ""),
    imageUrl: img,
    videoUrl: post?.videoUrl || "",
    createdAt: safeDate
  };
};

export const formatSafeArabicDate = (dateStr?: string): string => {
  if (!dateStr) return "مُعلن مؤخراً";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "مُعلن مؤخراً";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
};

const DEFAULT_NEWS_POSTS: NewsPost[] = [];

const getFrameClass = (styleName: string = "default", hasFrame: boolean = true) => {
  if (!hasFrame || styleName === "no_frame") {
    return "border-0 bg-transparent p-0 shadow-none text-center space-y-3";
  }
  switch (styleName) {
    case "dotted":
      return "border-3 border-dotted border-[#0A2463] bg-slate-50/50 rounded-2xl p-3 text-center space-y-3 transition-all";
    case "dashed":
      return "border-2 border-dashed border-orange-500 bg-orange-50/40 rounded-2xl p-3 text-center space-y-3 transition-all";
    case "double":
      return "border-4 border-double border-[#0A2463] bg-blue-50/30 rounded-2xl p-3 text-center space-y-3 transition-all";
    case "neon_glow":
      return "border-2 border-cyan-400 bg-cyan-950/10 shadow-[0_0_20px_rgba(34,211,238,0.6)] rounded-2xl p-3 text-center space-y-3 transition-all";
    case "royal_gold":
      return "border-2 border-amber-500 bg-amber-500/5 shadow-[0_10px_25px_rgba(245,158,11,0.35)] rounded-2xl p-3 text-center space-y-3 transition-all";
    case "rounded_navy":
      return "border-4 border-[#0A2463] bg-[#0A2463]/5 rounded-[32px] p-4 text-center space-y-3 transition-all";
    case "glassmorphic":
      return "border border-white/40 bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-3 text-center space-y-3 transition-all";
    case "smooth_3d":
      return "border-b-4 border-r-4 border-t border-l border-slate-350 bg-slate-100 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_6px_rgba(0,0,0,0.06)] p-3 text-center space-y-3 transition-all";
    case "gradient_borders":
      return "border-2 border-transparent bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 rounded-2xl p-3 text-center space-y-3 text-white transition-all shadow-md";
    case "thick_classic":
      return "border-6 border-slate-800 bg-white rounded-xl p-3 text-center space-y-3 shadow-md transition-all";
    case "floating_shadows":
      return "border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)] -translate-y-1 hover:-translate-y-2 rounded-2xl p-4 text-center space-y-3 transition-all duration-300";
    case "sharp_minimal":
      return "border-2 border-slate-900 bg-white rounded-none p-3 text-center space-y-3 shadow-none transition-all";
    case "vintage_wave":
      return "border-2 border-amber-900/50 bg-[#FDFBF7] p-3 shadow-inner rounded-3xl text-center space-y-3 transition-all";
    case "super_elegant":
      return "border border-amber-200 bg-slate-950 text-amber-100 rounded-2xl shadow-[0_4px_25px_rgba(217,119,6,0.2)] p-4 text-center space-y-3 transition-all";
    case "gold_glow":
      return "border-2 border-amber-400 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.4)] rounded-2xl p-3 text-center space-y-3 transition-all";
    case "neon_blue":
      return "border-2 border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.45)] rounded-2xl p-3 text-center space-y-3 transition-all";
    case "neon_red":
      return "border-2 border-rose-500 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.45)] rounded-2xl p-3 text-center space-y-3 transition-all";
    case "dashed_coral":
      return "border-2 border-dashed border-orange-500 bg-orange-50/50 rounded-2xl p-4 text-center space-y-3 transition-all";
    case "double_indigo":
      return "border-4 border-double border-indigo-600 bg-indigo-50/40 rounded-2xl p-3 text-center space-y-3 transition-all";
    case "brutalist":
      return "border-3 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl p-3 text-center space-y-3 transition-all";
    case "soft_shadow":
      return "border-0 bg-white shadow-[0_10px_35px_rgba(0,0,0,0.12)] rounded-2xl p-4 text-center space-y-3 transition-all";
    case "gradient_fire":
      return "border-2 border-transparent bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 shadow-lg rounded-2xl p-3 text-center space-y-3 text-white transition-all";
    case "glassmorphism":
      return "border border-white/30 bg-white/20 backdrop-blur-md shadow-lg rounded-2xl p-3 text-center space-y-3 transition-all";
    case "retro_dotted":
      return "border-2 border-dotted border-slate-800 bg-slate-50 rounded-2xl p-3 text-center space-y-3 transition-all";
    case "playful_yellow":
      return "border-4 border-yellow-400 bg-amber-50 rounded-2xl shadow-[2px_2px_0px_rgba(0,0,0,0.15)] p-3 text-center space-y-3 transition-all";
    case "emerald_tech":
      return "border-2 border-emerald-500 bg-slate-900 text-emerald-300 rounded-2xl shadow-[0_0_10px_rgba(16,185,129,0.2)] p-3 text-center space-y-3 transition-all";
    case "vintage_paper":
      return "border-2 border-amber-900/40 bg-[#FDFBF7] p-3 shadow-inner rounded-md text-center space-y-3 transition-all";
    case "royal_purple":
      return "border-2 border-purple-600 bg-purple-500/5 shadow-[0_5px_15px_rgba(124,58,237,0.3)] rounded-2xl p-3 text-center space-y-3 transition-all";
    case "default":
    default:
      return "bg-[#0A2463]/5 border-2 border-dashed border-[#0a2463]/15 rounded-2xl p-3 text-center space-y-3 shadow-xs transition-all";
  }
};

interface AdConfigType {
  visible: boolean;
  title: string;
  description: string;
  linkUrl: string;
  imageUrl: string;
  btnText: string;
  hasFrame?: boolean;
  mode?: string;
  textPosition?: string;
  frameStyle?: string;
}

function RenderAd({ ad }: { ad: AdConfigType }) {
  if (!ad.visible) return null;

  const hasFrame = ad.hasFrame !== false;
  const mode = ad.mode || "image_and_text";
  const textPosition = ad.textPosition || "below";
  const frameStyle = ad.frameStyle || "default";

  const frameClasses = getFrameClass(frameStyle, hasFrame);

  const imageElement = ad.imageUrl ? (
    <div className={`overflow-hidden bg-slate-900/5 transition-all duration-300 ${hasFrame ? "rounded-xl border border-slate-200" : "rounded-none w-full"}`}>
      <div className="relative w-full flex items-center justify-center bg-slate-950/5">
        <LazyLoadImage 
          src={ad.imageUrl} 
          alt={ad.title} 
          className="w-full h-auto max-h-[580px] object-contain rounded-xl transition-transform duration-500 hover:scale-[1.01]" 
          referrerPolicy="no-referrer"
          effect="opacity"
          wrapperClassName="w-full block"
        />
      </div>
    </div>
  ) : (
    <div className="h-60 bg-gradient-to-b from-[#0a2463] to-slate-900 rounded-xl flex items-center justify-center text-white text-xs p-3 font-bold">
      إعلان البوابة المعتمد 📣
    </div>
  );

  const textElement = (
    <div className="space-y-2 text-right">
      <h4 className={`text-[11px] font-black leading-normal ${ad.frameStyle === "gradient_fire" ? "text-white" : ad.frameStyle === "emerald_tech" ? "text-emerald-400" : "text-slate-900"}`}>{ad.title}</h4>
      <p className={`text-[9.5px] font-semibold leading-relaxed line-clamp-3 ${ad.frameStyle === "gradient_fire" ? "text-white/85" : ad.frameStyle === "emerald_tech" ? "text-emerald-350" : "text-slate-650"}`}>{ad.description}</p>
      <a 
        href={ad.linkUrl}
        className="block text-center py-2 bg-[#FF7F50] hover:bg-[#FF7F50]/90 text-white font-extrabold text-[10px] rounded-lg transition-all shadow-sm cursor-pointer"
      >
        {ad.btnText || "تواصل معنا 📞"}
      </a>
    </div>
  );

  if (mode === "image_only") {
    return (
      <div className={frameClasses}>
        {hasFrame && (
          <span className="text-[9px] font-black text-white bg-amber-600 px-3 py-1 rounded-full uppercase tracking-wider block w-fit mx-auto mb-1">
            مساحة إعلانية
          </span>
        )}
        <a href={ad.linkUrl} className="block hover:opacity-95 transition-opacity w-full">
          {imageElement}
        </a>
      </div>
    );
  }

  let adContentLayout = null;

  if (textPosition === "above") {
    adContentLayout = (
      <div className="space-y-3">
        {textElement}
        {imageElement}
      </div>
    );
  } else if (textPosition === "right") {
    adContentLayout = (
      <div className="flex flex-col gap-3">
        <div className="w-full">{textElement}</div>
        <div className="w-full">{imageElement}</div>
      </div>
    );
  } else if (textPosition === "left") {
    adContentLayout = (
      <div className="flex flex-col gap-3">
        <div className="w-full">{imageElement}</div>
        <div className="w-full">{textElement}</div>
      </div>
    );
  } else {
    // default/below
    adContentLayout = (
      <div className="space-y-3">
        {imageElement}
        {textElement}
      </div>
    );
  }

  return (
    <div className={frameClasses}>
      {hasFrame && (
        <div className="text-center mb-1">
          <span className="text-[9px] font-black text-white bg-amber-600 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            مساحة إعلانية
          </span>
          <p className={`text-[9px] font-black leading-snug mt-1 ${ad.frameStyle === "gradient_fire" ? "text-white" : ad.frameStyle === "emerald_tech" ? "text-emerald-400" : "text-[#0a2463]"}`}>رعاية رسمية للبوابة</p>
        </div>
      )}
      {adContentLayout}
    </div>
  );
}

export default function NewsPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<NewsPost[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_news_posts_v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter((p: any) => !isAiGeneratedPost(p));
            return clean.map((p: any, idx: number) => normalizeNewsPost(p, idx));
          }
        } catch (e) {
          // fallback
        }
      }
    }
    return [];
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const prevPostsRef = useRef<NewsPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [facebookModalPost, setFacebookModalPost] = useState<NewsPost | null>(null);
  const [copiedFacebookText, setCopiedFacebookText] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");

  // Keep server in sync with news posts so crawlers (Facebook, WhatsApp, Twitter) always resolve current articles
  useEffect(() => {
    if (posts && posts.length > 0) {
      fetch("/api/news-posts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts })
      }).catch(() => {});
    }
  }, [posts]);

  const openPost = (post: NewsPost | null) => {
    if (post) {
      setSelectedPost(post);
      navigate(`/news/${post.id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setSelectedPost(null);
      navigate("/news");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const activeArticle = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = id || urlParams.get("article") || urlParams.get("id");
    if (!targetId || posts.length === 0) return null;
    return posts.find((p) => String(p.id) === String(targetId)) || null;
  }, [id, posts]);

  useEffect(() => {
    if (activeArticle) {
      document.title = `${activeArticle.title} | بوابة المعاهد الخاصة والأكاديميات المعتمدة`;
      const updateMeta = (selector: string, content: string) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute("content", content);
      };
      updateMeta('meta[property="og:title"]', activeArticle.title);
      updateMeta('meta[name="twitter:title"]', activeArticle.title);
      updateMeta('meta[property="og:description"]', activeArticle.desc || "");
      updateMeta('meta[name="twitter:description"]', activeArticle.desc || "");
      if (activeArticle.imageUrl && !activeArticle.imageUrl.startsWith("data:")) {
        updateMeta('meta[property="og:image"]', activeArticle.imageUrl);
        updateMeta('meta[name="twitter:image"]', activeArticle.imageUrl);
      }
    } else {
      document.title = "أحدث الأخبار والتنبيهات العامة للقبول والتدريب بالأكاديميات المعتمدة";
    }
  }, [activeArticle]);
  
  // Custom headers editable via developer dashboard
  const [pageTitle, setPageTitle] = useState("📰 المركز الإعلامي والأخبار الحصرية");
  const [pageSubtitle, setPageSubtitle] = useState("تابع آخر أخبار القبول بالمعاهد الفنية المعتمدة، فعاليات التخرج، والندوات الإرشادية والتوعوية لضمان اختيار مستقبلك الأكاديمي الأنسب.");

  // Featured Carousel Slide Index
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Right Ad Config
  const [rightAdConfig, setRightAdConfig] = useState({
    visible: true,
    title: "مساحة إعلانية",
    description: "ضع اعلانك هنا",
    linkUrl: "https://wa.me/201027976472?text= السلام عليكم م/ محمد محتاج احجز مساحة اعلانية في صفحة الاخبار الخاصة ب بوابة المعاهد والأكاديميات الخاصة ممكن اعرف التفاصيل والمطلوب",
    imageUrl: "https://j.top4top.io/p_38328dziu1.png",
    btnText: "تواصل معنا 📞🔗",
    hasFrame: true,
    mode: "image_and_text",
    textPosition: "below",
    frameStyle: "default"
  });

  // Left Ad Config
  const [leftAdConfig, setLeftAdConfig] = useState({
    visible: true,
    title: "مساحة إعلانية",
    description: "ضع اعلانك هنا",
    linkUrl: "https://wa.me/201027976472?text= السلام عليكم م/ محمد محتاج احجز مساحة اعلانية في صفحة الاخبار الخاصة ب بوابة المعاهد والأكاديميات الخاصة ممكن اعرف التفاصيل والمطلوب",
    imageUrl: "[url=https://j.top4top.io/p_38328dziu1.png][img]https://j.top4top.io/s_38328dziu1.png[/img][/url]",
    btnText: "تواصل معنا 📞🔗",
    hasFrame: true,
    mode: "image_and_text",
    textPosition: "below",
    frameStyle: "default"
  });

  // Header Left / Right Custom Content
  const [headerRightType, setHeaderRightType] = useState("none"); // none, text, image, both
  const [headerRightText, setHeaderRightText] = useState("");
  const [headerRightImage, setHeaderRightImage] = useState("");
  const [headerRightHasFrame, setHeaderRightHasFrame] = useState(true);
  const [headerRightTextPosition, setHeaderRightTextPosition] = useState("below"); // below, above, right, left
  const [headerRightFrameStyle, setHeaderRightFrameStyle] = useState("default");

  const [headerLeftType, setHeaderLeftType] = useState("none"); // none, text, image, both
  const [headerLeftText, setHeaderLeftText] = useState("");
  const [headerLeftImage, setHeaderLeftImage] = useState("");
  const [headerLeftHasFrame, setHeaderLeftHasFrame] = useState(true);
  const [headerLeftTextPosition, setHeaderLeftTextPosition] = useState("below"); // below, above, right, left
  const [headerLeftFrameStyle, setHeaderLeftFrameStyle] = useState("default");

  // Ticker Custom State
  const [tickerType, setTickerType] = useState("auto"); // auto, custom
  const [tickerCustomText, setTickerCustomText] = useState("تنبيه هام: فتح باب سحب ملفات التقديم والقبول المبدئي لجميع الشعب والقبول لدفعة ٢٠٢٦ • استخرج استمارتك الإلكترونية الآن برقم الهاتف بسهولة •");

  // Left Sidebar Custom Widget State (replaces Newsletter)
  const [customBoxVisible, setCustomBoxVisible] = useState(true);
  const [customBoxEmoji, setCustomBoxEmoji] = useState("📢");
  const [customBoxTitle, setCustomBoxTitle] = useState("تنويه هام للطلاب");
  const [customBoxText, setCustomBoxText] = useState("بوابة المعاهد والأكاديميات الخاصة ليس لها علاقة بالمجلس الأعلي للجامعات ولا التعليم العالي ، وجميع الدراسات مهنية تدريبية ولاتساوي درجة التعليم العالي ، وانما هي شهادات معتمده من جامعات حكومية بالفترة التدريبية وعدد الساعات تؤلك لسوق العمل.");
  const [customBoxBtnText, setCustomBoxBtnText] = useState("نتمني لكم التوفيق");
  const [customBoxBtnUrl, setCustomBoxBtnUrl] = useState("/registration-guide");

  const postScrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    // Load News Posts
    const saved = localStorage.getItem("custom_news_posts_v1");
    let currentPosts: NewsPost[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((p: any) => !isAiGeneratedPost(p));
          currentPosts = clean.map((p: any, idx: number) => normalizeNewsPost(p, idx));
        }
      } catch (e) {}
    }

    try {
      localStorage.setItem("custom_news_posts_v1", JSON.stringify(currentPosts));
    } catch (e) {}

    setPosts(currentPosts);

    // Auto open article if specified in query string (?article=ID or ?id=ID)
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get("article") || urlParams.get("id");
    if (articleId && currentPosts.length > 0) {
      const found = currentPosts.find(p => String(p.id) === String(articleId));
      if (found) {
        setSelectedPost(found);
      }
    }

    // If there's a previously loaded set of posts, check for newly added posts to trigger browser push notifications
    if (prevPostsRef.current.length > 0) {
      const prevIds = prevPostsRef.current.map(p => p.id);
      const newPosts = currentPosts.filter(p => !prevIds.includes(p.id));
      if (newPosts.length > 0) {
        newPosts.forEach(post => {
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`خبر عاجل جديد: ${post.category || "المركز الإعلامي"} 📣`, {
                body: post.title,
                icon: post.imageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=80&auto=format&fit=crop"
              });
            } catch (err) {
              console.error("Failed to trigger browser push notification:", err);
            }
          }
        });
      }
    }
    prevPostsRef.current = currentPosts;

    // Load Right Ad Config
    const savedRightAd = localStorage.getItem("custom_news_ad_right_v2");
    if (savedRightAd) {
      try {
        const parsed = JSON.parse(savedRightAd);
        setRightAdConfig({
          visible: parsed.visible !== false,
          title: parsed.title || "مساحة إعلانية",
          description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
          linkUrl: parsed.linkUrl || "/registration-guide",
          imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1525921429571-473b94195b9d?q=80&w=600&auto=format&fit=crop",
          btnText: parsed.btnText || "تواصل معنا 📞",
          hasFrame: parsed.hasFrame !== false,
          mode: parsed.mode || "image_and_text",
          textPosition: parsed.textPosition || "below",
          frameStyle: parsed.frameStyle || "default"
        });
      } catch (e) {}
    } else {
      // Legacy fallback
      const savedAd = localStorage.getItem("custom_news_ad_v1");
      if (savedAd) {
        try {
          const parsed = JSON.parse(savedAd);
          setRightAdConfig({
            visible: parsed.visible !== false,
            title: "مساحة إعلانية",
            description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
            linkUrl: parsed.linkUrl || "/registration-guide",
            imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1525921429571-473b94195b9d?q=80&w=600&auto=format&fit=crop",
            btnText: "تواصل معنا 📞",
            hasFrame: true,
            mode: "image_and_text",
            textPosition: "below",
            frameStyle: "default"
          });
        } catch (e) {}
      }
    }

    // Load Left Ad Config
    const savedLeftAd = localStorage.getItem("custom_news_ad_left_v2");
    if (savedLeftAd) {
      try {
        const parsed = JSON.parse(savedLeftAd);
        setLeftAdConfig({
          visible: parsed.visible !== false,
          title: parsed.title || "مساحة إعلانية",
          description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
          linkUrl: parsed.linkUrl || "/registration-guide",
          imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
          btnText: parsed.btnText || "الموقع الرسمي 🔗",
          hasFrame: parsed.hasFrame !== false,
          mode: parsed.mode || "image_and_text",
          textPosition: parsed.textPosition || "below",
          frameStyle: parsed.frameStyle || "default"
        });
      } catch (e) {}
    } else {
      // Legacy fallback
      const savedAd = localStorage.getItem("custom_news_ad_v1");
      if (savedAd) {
        try {
          const parsed = JSON.parse(savedAd);
          setLeftAdConfig({
            visible: parsed.visible !== false,
            title: "مساحة إعلانية",
            description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
            linkUrl: parsed.linkUrl || "/registration-guide",
            imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
            btnText: "الموقع الرسمي 🔗",
            hasFrame: true,
            mode: "image_and_text",
            textPosition: "below",
            frameStyle: "default"
          });
        } catch (e) {}
      }
    }

    // Header Right
    setHeaderRightType(localStorage.getItem("news_header_right_type_v1") || "none");
    setHeaderRightText(localStorage.getItem("news_header_right_text_v1") || "");
    setHeaderRightImage(localStorage.getItem("news_header_right_image_v1") || "");
    setHeaderRightHasFrame(localStorage.getItem("news_header_right_has_frame_v1") !== "false");
    setHeaderRightTextPosition(localStorage.getItem("news_header_right_text_position_v1") || "below");
    setHeaderRightFrameStyle(localStorage.getItem("news_header_right_frame_style_v1") || "default");

    // Header Left
    setHeaderLeftType(localStorage.getItem("news_header_left_type_v1") || "none");
    setHeaderLeftText(localStorage.getItem("news_header_left_text_v1") || "");
    setHeaderLeftImage(localStorage.getItem("news_header_left_image_v1") || "");
    setHeaderLeftHasFrame(localStorage.getItem("news_header_left_has_frame_v1") !== "false");
    setHeaderLeftTextPosition(localStorage.getItem("news_header_left_text_position_v1") || "below");
    setHeaderLeftFrameStyle(localStorage.getItem("news_header_left_frame_style_v1") || "default");

    // Ticker Type & Content
    setTickerType(localStorage.getItem("news_ticker_type_v1") || "auto");
    setTickerCustomText(localStorage.getItem("news_ticker_custom_text_v1") || "تنبيه هام: فتح باب سحب ملفات التقديم والقبول المبدئي لجميع الشعب والقبول لدفعة ٢٠٢٦ • استخرج استمارتك الإلكترونية الآن برقم الهاتف بسهولة •");

    // Custom Box (replaces Newsletter)
    setCustomBoxVisible(localStorage.getItem("news_custom_box_visible_v1") !== "false");
    setCustomBoxEmoji(localStorage.getItem("news_custom_box_emoji_v1") || "📢");
    setCustomBoxTitle(localStorage.getItem("news_custom_box_title_v1") || "تنويه هام للطلاب");
    setCustomBoxText(localStorage.getItem("news_custom_box_text_v1") || "بوابة المعاهد والأكاديميات الخاصة ليس لها علاقة بالمجلس الأعلي للجامعات ولا التعليم العالي ، وجميع الدراسات مهنية تدريبية ولاتساوي درجة التعليم العالي ، وانما هي شهادات معتمده من جامعات حكومية بالفترة التدريبية وعدد الساعات تؤلك لسوق العمل.");
    setCustomBoxBtnText(localStorage.getItem("news_custom_box_btn_text_v1") || "نتمني لكم التوفيق");
    setCustomBoxBtnUrl(localStorage.getItem("news_custom_box_btn_url_v1") || "https://www.facebook.com/Privateinstitutesandacademies1");

    // Load custom page title & subtitle
    const savedTitle = localStorage.getItem("news_page_title_v1");
    if (savedTitle) {
      setPageTitle(savedTitle);
    } else {
      setPageTitle("📰 المركز الإعلامي والأخبار الحصرية");
    }

    const savedSubtitle = localStorage.getItem("news_page_subtitle_v1");
    if (savedSubtitle) {
      setPageSubtitle(savedSubtitle);
    } else {
      setPageSubtitle("تابع آخر أخبار القبول بالمعاهد الفنية المعتمدة، فعاليات التخرج، والندوات الإرشادية والتوعوية لضمان اختيار مستقبلك الأكاديمي الأنسب.");
    }
  };

  useEffect(() => {
    loadData();

    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }

    const handleNewsUpdate = () => {
      loadData();
    };

    window.addEventListener("news_posts_updated", handleNewsUpdate);
    window.addEventListener("news_ad_updated", handleNewsUpdate);
    window.addEventListener("news_page_meta_updated", handleNewsUpdate);
    window.addEventListener("site_configs_updated", handleNewsUpdate);

    return () => {
      window.removeEventListener("news_posts_updated", handleNewsUpdate);
      window.removeEventListener("news_ad_updated", handleNewsUpdate);
      window.removeEventListener("news_page_meta_updated", handleNewsUpdate);
      window.removeEventListener("site_configs_updated", handleNewsUpdate);
    };
  }, []);

  const requestNotifPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("⚠️ عذراً، متصفحك لا يدعم إشعارات المتصفح.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        toast.success("🔔 تم تفعيل إشعارات المتصفح الفورية بنجاح!");
        new Notification("بوابة الأخبار الرسمية 🔔", {
          body: "شكراً لتفعيل الإشعارات! ستصلك تنبيهات فورية عند ظهور أخبار أو قرارات جديدة.",
          icon: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=80&auto=format&fit=crop"
        });
      } else if (permission === "denied") {
        toast.error("❌ لقد قمت برفض تفعيل الإشعارات. يرجى تفعيلها يدوياً من إعدادات المتصفح لضمان وصول التحديثات.");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  const testNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("بوابة الأخبار الرسمية 🔔", {
          body: "هذا إشعار تجريبي ناجح من نظام الإشعارات الفورية للأكاديميات الفنية!",
          icon: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=80&auto=format&fit=crop"
        });
        toast.success("📣 تم إرسال إشعار تجريبي بنجاح!");
      } catch (err) {
        toast.error("⚠️ فشل إرسال الإشعار. تحقق من صلاحيات المتصفح.");
      }
    } else {
      toast.error("⚠️ يرجى تفعيل صلاحية الإشعارات أولاً.");
    }
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "الكل" || post.category.includes(activeCategory.replace("الكل", ""));
    return matchesSearch && matchesCategory;
  });

  // Featured stories for the main "Youm7-style" top carousel (first 4 posts)
  const featuredPosts = posts.slice(0, 4);

  const categories = [
    { name: "الكل", icon: "✨" },
    { name: "إعلانات رسمية 📣", icon: "📣" },
    { name: "توجيه مهني 🧭", icon: "🧭" },
    { name: "أخبار المعاهد 🏛️", icon: "🏛️" },
    { name: "أخبار الفعاليات والطلاب 🎓", icon: "🎓" }
  ];

  const handleShare = (post: NewsPost, platform: "whatsapp" | "telegram" | "facebook" | "copy") => {
    const url = `${window.location.origin}/news/${post.id}`;
    const text = `اقرأ هذا الخبر الهام على بوابة التوجيه الأكاديمي المعتمدة:\n\n*${post.title}*\n${post.desc}\n\nتابع القراءة وتفاصيل التقديم عبر هذا الرابط الإلكتروني:\n${url}`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    
    if (platform === "facebook") {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      window.open(fbUrl, "_blank", "noopener,noreferrer,width=650,height=550");
      setFacebookModalPost(post);
      setCopiedFacebookText(false);
    } else if (platform === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
    } else if (platform === "telegram") {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(post.title)}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("🔗 تم نسخ رابط الخبر/المقال بنجاح!");
    }
  };

  const renderCustomHeaderBlock = (
    type: string, 
    text: string, 
    img: string, 
    hasFrame: boolean, 
    textPosition: string, 
    frameStyle: string
  ) => {
    if (type === "none" || !type) return null;

    const frameClasses = getFrameClass(frameStyle, hasFrame);

    const imageNode = (type === "image" || type === "both") && img ? (
      <img 
        src={img} 
        alt="إعلان مخصص" 
        className="w-full h-auto max-h-56 object-contain rounded-xl border border-white/10" 
        referrerPolicy="no-referrer"
      />
    ) : null;

    const textNode = (type === "text" || type === "both") && text ? (
      <p className="text-[11px] font-bold leading-relaxed text-white drop-shadow-xs">
        {text}
      </p>
    ) : null;

    let contentNode;
    if (type === "both" && imageNode && textNode) {
      if (textPosition === "above") {
        contentNode = (
          <div className="flex flex-col gap-2 text-right">
            {textNode}
            <div className="w-full rounded-xl overflow-hidden flex items-center justify-center">{imageNode}</div>
          </div>
        );
      } else if (textPosition === "right") {
        contentNode = (
          <div className="flex flex-row items-center gap-2 text-right">
            <div className="flex-1">{textNode}</div>
            <div className="w-20 sm:w-24 md:w-28 shrink-0 rounded-xl overflow-hidden flex items-center justify-center">{imageNode}</div>
          </div>
        );
      } else if (textPosition === "left") {
        contentNode = (
          <div className="flex flex-row-reverse items-center gap-2 text-right">
            <div className="flex-1">{textNode}</div>
            <div className="w-20 sm:w-24 md:w-28 shrink-0 rounded-xl overflow-hidden flex items-center justify-center">{imageNode}</div>
          </div>
        );
      } else { // default below
        contentNode = (
          <div className="flex flex-col gap-2 text-right">
            <div className="w-full rounded-xl overflow-hidden flex items-center justify-center">{imageNode}</div>
            {textNode}
          </div>
        );
      }
    } else {
      contentNode = (
        <div className="space-y-2 w-full">
          {imageNode && <div className="w-full rounded-xl overflow-hidden flex items-center justify-center">{imageNode}</div>}
          {textNode}
        </div>
      );
    }

    return (
      <div className={`${frameClasses} max-w-xs mx-auto overflow-hidden h-auto`}>
        {contentNode}
      </div>
    );
  };

  // DEDICATED FULL ARTICLE PAGE VIEW (صفحة الخبر والمقال المستقلة تماماً)
  if (activeArticle) {
    return (
      <div className="min-h-screen bg-slate-50/70 py-6 sm:py-10 px-3 sm:px-6 font-sans text-right" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Top Breadcrumb & Navigation Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 element-reveal">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
              <Link to="/" className="hover:text-[#0A2463] transition-colors">الرئيسية</Link>
              <span>/</span>
              <button onClick={() => openPost(null)} className="hover:text-[#0A2463] transition-colors cursor-pointer">الأخبار والتغطيات</button>
              <span>/</span>
              <span className="text-slate-900 font-extrabold truncate max-w-[200px] sm:max-w-xs">{activeArticle.title}</span>
            </div>
            
            <button
              onClick={() => openPost(null)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2463] hover:bg-slate-900 text-white text-xs font-black rounded-2xl transition-all shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 rotate-180 shrink-0" />
              <span>العودة لجميع الأخبار والقرارات</span>
            </button>
          </div>

          {/* Main Full Article Canvas */}
          <article className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden element-reveal">
            
            {/* Article Cover Header Image */}
            {activeArticle.imageUrl ? (
              <div className="relative min-h-[260px] sm:min-h-[380px] max-h-[580px] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Ambient blurred backdrop for aesthetic full bleed */}
                <img 
                  src={activeArticle.imageUrl} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110" 
                  aria-hidden="true"
                />
                <LazyLoadImage 
                  src={activeArticle.imageUrl} 
                  alt={activeArticle.title} 
                  className="relative z-10 w-full h-auto max-h-[580px] object-contain mx-auto" 
                  referrerPolicy="no-referrer"
                  effect="opacity"
                  wrapperClassName="w-full flex items-center justify-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-4 right-4 bg-[#dc2626] text-white text-xs font-black px-4 py-1.5 rounded-xl shadow-md z-20">
                  {activeArticle.category}
                </span>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-[#0A2463] to-slate-900 p-8 sm:p-10 text-white">
                <span className="bg-[#dc2626] text-white text-xs font-black px-3.5 py-1.5 rounded-xl inline-block mb-3">
                  {activeArticle.category}
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black leading-snug">
                  {activeArticle.title}
                </h1>
              </div>
            )}

            <div className="p-6 sm:p-10 space-y-7">
              {/* Metadata Info Bar */}
              <div className="space-y-4 border-b border-slate-100 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-extrabold">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      {formatSafeArabicDate(activeArticle.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-xl">
                      <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                      {activeArticle.readTime}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-black">
                      <User className="w-4 h-4 text-[#0a2463] shrink-0" />
                      المركز الإعلامي الرسمي
                    </span>
                  </div>
                  
                  <SpeechButton textToSpeak={`${activeArticle.title}. ${activeArticle.content}`} />
                </div>

                {activeArticle.imageUrl && (
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 leading-snug tracking-tight pt-2">
                    {activeArticle.title}
                  </h1>
                )}
              </div>

              {/* Full Article Text Body */}
              <div className="text-sm sm:text-base text-slate-800 leading-relaxed sm:leading-loose font-medium font-sans whitespace-pre-wrap space-y-5">
                {activeArticle.content}
              </div>

              {/* Video Player Display if Video URL is attached */}
              {activeArticle.videoUrl && (
                <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 my-6 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center gap-2">
                      <span>🎥 التغطية المصورة / التقرير بالفيديو:</span>
                    </span>
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      مشغّل بالفيديو HD 🎬
                    </span>
                  </div>
                  {(() => {
                    const parsed = parseVideoMedia(activeArticle.videoUrl);
                    if (parsed.isYouTube) {
                      return (
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                          <iframe
                            src={parsed.embedUrl}
                            title={activeArticle.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    } else {
                      return (
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center shadow-xl">
                          <video src={parsed.rawUrl} controls className="max-h-full max-w-full rounded-xl" />
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Social Share Toolbar */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-wrap gap-3 items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#dc2626] shrink-0" />
                  مشاركة التغطية الصحفية مع زملائك:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleShare(activeArticle, "facebook")}
                    className="px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-black rounded-xl cursor-pointer transition shadow-2xs flex items-center gap-1.5"
                    title="نشر ومشاركة على فيسبوك مع الصورة والعنوان"
                  >
                    <Facebook className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span>فيسبوك</span>
                  </button>
                  <button
                    onClick={() => handleShare(activeArticle, "whatsapp")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-2xs flex items-center gap-1"
                  >
                    واتساب 💬
                  </button>
                  <button
                    onClick={() => handleShare(activeArticle, "telegram")}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-2xs flex items-center gap-1"
                  >
                    تيليجرام ✈️
                  </button>
                  <button
                    onClick={() => handleShare(activeArticle, "copy")}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-2xs flex items-center gap-1"
                  >
                    نسخ الرابط 🔗
                  </button>
                </div>
              </div>

              {/* Direct News URL bar */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-black text-[#0A2463] shrink-0 text-xs">🔗 رابط الخبر المباشر:</span>
                  <a
                    href={`${window.location.origin}/news/${activeArticle.id}`}
                    target="_blank"
                    rel="noreferrer referrer"
                    className="font-mono text-blue-600 hover:underline truncate dir-ltr text-left"
                    dir="ltr"
                  >
                    {`${window.location.origin}/news/${activeArticle.id}`}
                  </a>
                </div>
                <button
                  onClick={() => handleShare(activeArticle, "copy")}
                  className="px-3 py-1.5 bg-[#0A2463] hover:bg-slate-900 text-white font-black text-xs rounded-xl transition cursor-pointer shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الرابط</span>
                </button>
              </div>
            </div>
          </article>

          {/* SUGGESTED NEWS SECTION (اقتراح باقي الأخبار والتغطيات الصحفية) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5 element-reveal">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm sm:text-base font-black text-[#0A2463] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                <span>قد يهمك أيضاً.. باقي الأخبار والتغطيات الصحفية المتاحة:</span>
              </h3>
              <Link to="/news" className="text-xs font-black text-indigo-600 hover:underline">
                تصفح كافة الأخبار ←
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {posts
                .filter((p) => p.id !== activeArticle.id)
                .slice(0, 6)
                .map((recPost) => (
                  <Link
                    key={recPost.id}
                    to={`/news/${recPost.id}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-2xl border border-slate-200 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs text-right space-y-3"
                  >
                    <div className="h-40 rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden relative">
                      {recPost.imageUrl ? (
                        <>
                          <img 
                            src={recPost.imageUrl} 
                            alt="" 
                            className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110" 
                            aria-hidden="true"
                          />
                          <img 
                            src={recPost.imageUrl} 
                            alt={recPost.title} 
                            className="relative z-10 w-full h-auto max-h-40 object-contain group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                          <Newspaper className="w-8 h-8" />
                        </div>
                      )}
                      <span className="absolute top-2 right-2 text-[9.5px] font-black text-white bg-slate-900/80 px-2 py-0.5 rounded-md">
                        {recPost.category}
                      </span>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0A2463] transition-colors">
                        {recPost.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-bold">
                        {recPost.desc}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-200/60 pt-2">
                      <span>{formatSafeArabicDate(recPost.createdAt)}</span>
                      <span className="text-indigo-600 font-black flex items-center gap-1">
                        قراءة المقال 📖
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]" dir="rtl">
      
      {/* 1. SEPARATE HEADER SECTION: Dark Golden Background with White Title & Dark Navy Subtitle */}
      <header className="bg-gradient-to-r from-[#7c5b1d] via-[#a38038] to-[#6b4e15] border-b border-amber-600 py-10 px-4 sm:px-6 shadow-md text-center">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Right custom block on desktop */}
          <div className="md:col-span-3 text-right hidden md:block">
            {renderCustomHeaderBlock(
              headerRightType, 
              headerRightText, 
              headerRightImage, 
              headerRightHasFrame, 
              headerRightTextPosition, 
              headerRightFrameStyle
            )}
          </div>

          {/* Center title (6 cols) */}
          <div className="md:col-span-6 space-y-3.5 text-center">
            <span className="inline-block bg-[#0A2463] text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full uppercase shadow-xs">
              بوابة المعاهد والأكاديميات الخاصة 📰
            </span>
            <div className="flex flex-col items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-md tracking-tight leading-none animate-fade-in">
                {pageTitle}
              </h1>
              <SpeechButton 
                textToSpeak={`${pageTitle}. ${pageSubtitle}`}
                className="bg-white/10 text-amber-300 border-white/20 hover:bg-amber-500 hover:text-white"
              />
            </div>
            {/* Subtitle is Dark Navy/Blue, high-contrast, premium styling as explicitly requested */}
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-white/40 max-w-xl mx-auto shadow-sm">
              <p className="text-xs sm:text-sm text-[#0a2463] font-black leading-relaxed">
                {pageSubtitle}
              </p>
            </div>
          </div>

          {/* Left custom block on desktop */}
          <div className="md:col-span-3 text-left hidden md:block">
            {renderCustomHeaderBlock(
              headerLeftType, 
              headerLeftText, 
              headerLeftImage, 
              headerLeftHasFrame, 
              headerLeftTextPosition, 
              headerLeftFrameStyle
            )}
          </div>

          {/* Mobile visible fallback blocks if customized */}
          {(headerRightType !== "none" || headerLeftType !== "none") && (
            <div className="md:hidden col-span-1 grid grid-cols-2 gap-2 mt-2">
              {headerRightType !== "none" && (
                <div className="p-2 bg-white/10 rounded-xl text-white text-right text-[10px] font-bold">
                  {renderCustomHeaderBlock(
                    headerRightType, 
                    headerRightText, 
                    headerRightImage, 
                    headerRightHasFrame, 
                    headerRightTextPosition, 
                    headerRightFrameStyle
                  )}
                </div>
              )}
              {headerLeftType !== "none" && (
                <div className="p-2 bg-white/10 rounded-xl text-white text-left text-[10px] font-bold">
                  {renderCustomHeaderBlock(
                    headerLeftType, 
                    headerLeftText, 
                    headerLeftImage, 
                    headerLeftHasFrame, 
                    headerLeftTextPosition, 
                    headerLeftFrameStyle
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </header>

      {/* 2. BREAKING NEWS TICKER BAR (شريط الأخبار العاجلة) */}
      <div className="bg-[#dc2626] text-white py-2.5 px-4 overflow-hidden shadow-xs border-b border-red-700 flex items-center gap-3">
        <span className="bg-white text-red-600 font-black text-xs px-3 py-1 rounded-md shrink-0 uppercase animate-pulse flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-600"></span>
          عاجل
        </span>
        <div className="relative flex-1 min-w-0 overflow-hidden h-5">
          {tickerType === "custom" ? (
            <div className="absolute flex gap-10 whitespace-nowrap animate-marquee font-bold text-xs text-white/95 leading-normal">
              <span>⚡ {tickerCustomText}</span>
            </div>
          ) : (
            <div className="absolute flex gap-10 whitespace-nowrap animate-marquee font-bold text-xs text-white/95 leading-normal">
              {posts.map((post, index) => (
                <span key={post.id} className="hover:underline cursor-pointer flex items-center gap-1.5" onClick={() => setSelectedPost(post)}>
                  <span>⚡ {post.title}</span>
                  <span className="text-yellow-300 font-black">|</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-white/70 font-mono shrink-0 hidden sm:inline">تحديث ٢٠٢٦ ⏱️</span>
      </div>

      {/* MAIN CONTAINER WITH FLANKING AD MARGINS (النمط الإعلاني الحقيقي لليوم السابع) */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* A. RIGHT VERTICAL AD MARGIN (Visible on all screens, sticky on desktop - 2 cols) */}
          <aside className="xl:col-span-2 space-y-4 xl:sticky xl:top-6 w-full">
            <RenderAd ad={rightAdConfig} />
            
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 text-center space-y-2">
              <span className="text-xl">🏆</span>
              <h5 className="text-[11px] font-black text-amber-900">سجل استمارتك اليوم</h5>
              <p className="text-[9.5px] font-bold text-slate-600">احصل على فرصة الالتحاق المباشر بأفضل برامج التعليم الفني.</p>
            </div>
          </aside>

          {/* B. CENTER MAIN FEED AREA (8 cols on xl, full width otherwise) */}
          <main className="xl:col-span-8 space-y-8">

            {/* 🔔 BROWSER PUSH NOTIFICATIONS SYSTEM CARD */}
            <div className="bg-gradient-to-r from-[#0A2463] to-[#0d2a75] rounded-3xl p-5 border border-[#0A2463]/25 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-x-4 -translate-y-4"></div>
              <div className="flex items-center gap-4 relative z-10 text-right">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <span className="text-2xl animate-bounce">🔔</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-black text-amber-400">نظام إشعارات المتصفح الفورية للأخبار ⏱️</h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-200">
                    فعّل الإشعارات لتصلك تنبيهات حية فورية على جهازك بمجرد صدور أي قرارات رسمية أو أخبار عاجلة جديدة.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10 w-full md:w-auto justify-end">
                {notifPermission === "granted" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10.5px] font-black">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                      الإشعارات مفعلة 🟢
                    </span>
                    <button
                      onClick={testNotification}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black transition active:scale-95 cursor-pointer border border-white/10"
                    >
                      تجربة إشعار تجريبي 📣
                    </button>
                  </div>
                ) : notifPermission === "denied" ? (
                  <span className="text-red-300 text-[10px] font-bold bg-red-950/40 border border-red-900/30 px-3 py-1.5 rounded-xl">
                    ⚠️ الإشعارات محظورة بالمتصفح. يرجى تفعيلها من إعدادات المتصفح.
                  </span>
                ) : (
                  <button
                    onClick={requestNotifPermission}
                    className="px-4 py-2 bg-[#FF7F50] hover:bg-[#FF7F50]/90 active:scale-95 text-white font-black text-[11px] rounded-xl transition shadow-md cursor-pointer animate-pulse"
                  >
                    تفعيل الإشعارات الآن 🔔
                  </button>
                )}
              </div>
            </div>
            
            {/* 1. THE YOUM7 SLIDER (كارت السلايدر الإخباري المتقدم - فصل تام بين البوستر الترويجي والنص المقالي) */}
            {featuredPosts.length > 0 && (() => {
              const currentPost = featuredPosts[activeSlideIdx] || featuredPosts[0];
              return (
                <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm" id="featured-news-slider">
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    
                    {/* Main Featured Showcase (8 cols): Split layout with dedicated media canvas & dedicated reading canvas */}
                    <div className="md:col-span-8 bg-gradient-to-br from-slate-950 via-[#0a1936] to-slate-950 text-white flex flex-col md:flex-row overflow-hidden relative">
                      
                      {/* Visual Flyer / Poster Canvas (50% on desktop, full on mobile) */}
                      <div 
                        className="md:w-1/2 w-full p-4 sm:p-5 flex items-center justify-center relative cursor-pointer group bg-black/40 min-h-[240px] sm:min-h-[290px] md:min-h-[380px]"
                        onClick={() => openPost(currentPost)}
                        title="انقر لقراءة التفاصيل الكاملة"
                      >
                        {currentPost.imageUrl ? (
                          <div className="relative w-full h-full max-h-[330px] flex items-center justify-center rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-lg">
                            {/* Ambient glowing backdrop */}
                            <img 
                              src={currentPost.imageUrl} 
                              alt="" 
                              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-125 pointer-events-none" 
                              aria-hidden="true"
                            />
                            {/* Crisp, clean, unobstructed poster / image with instant eager loading and error resilience */}
                            <img 
                              src={currentPost.imageUrl} 
                              alt={currentPost.title} 
                              loading="eager"
                              className="relative z-10 max-h-[320px] w-auto max-w-full object-contain rounded-xl shadow-md transition-transform duration-500 group-hover:scale-[1.03]"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FALLBACK_ARTICLE_IMAGES[activeSlideIdx % FALLBACK_ARTICLE_IMAGES.length];
                              }}
                            />
                            <span className="absolute top-3 right-3 z-20 bg-[#dc2626] text-white text-[10.5px] font-black px-2.5 py-1 rounded-lg shadow-md">
                              {currentPost.category}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900 text-indigo-200 rounded-2xl p-6 text-center">
                            <GraduationCap className="w-16 h-16 mb-2 text-amber-400" />
                            <span className="text-xs font-bold text-slate-300">بوابة الأخبار والبيانات الرسمية</span>
                            <span className="text-[10px] bg-[#dc2626] text-white px-2.5 py-1 rounded-md mt-2 font-black">
                              {currentPost.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Editorial Text Details Canvas (50% on desktop, full on mobile) - 100% CLEAR, NEVER OVERLAPPED */}
                      <div className="md:w-1/2 w-full p-5 sm:p-6 flex flex-col justify-between text-right border-t md:border-t-0 md:border-r border-white/10 bg-slate-900/40">
                        <div className="space-y-3.5">
                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-2 text-amber-400 font-bold">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatSafeArabicDate(currentPost.createdAt)}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-slate-300">
                                <Clock className="w-3.5 h-3.5" />
                                {currentPost.readTime}
                              </span>
                            </div>
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9.5px] font-black px-2.5 py-0.5 rounded-full">
                              🔥 تغطية خاصة
                            </span>
                          </div>

                          {/* Headline */}
                          <h2 
                            className="text-base sm:text-lg md:text-xl font-black text-white leading-snug hover:text-amber-400 cursor-pointer transition-colors"
                            onClick={() => openPost(currentPost)}
                          >
                            {currentPost.title}
                          </h2>

                          {/* Excerpt / Summary */}
                          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed line-clamp-4">
                            {currentPost.desc}
                          </p>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              onClick={() => openPost(currentPost)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>شاهد الخبر / شاهد المزيد 👁️</span>
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Share buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleShare(currentPost, "facebook")}
                                className="px-3 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                                title="مشاركة الخبر على فيسبوك كبوستر وعنوان متكامل"
                              >
                                <Facebook className="w-3.5 h-3.5 fill-current" />
                                <span>مشاركة فيسبوك</span>
                              </button>
                              <button
                                onClick={() => handleShare(currentPost, "copy")}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition cursor-pointer"
                                title="نسخ رابط الإعلان المباشر"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Direct News URL */}
                          <div className="flex items-center gap-1.5 bg-black/40 p-2 rounded-xl border border-white/10 text-[11px] text-slate-200 font-sans">
                            <span className="font-black text-amber-400 shrink-0 text-[10.5px]">🔗 رابط الخبر:</span>
                            <a
                              href={`${window.location.origin}/news/${currentPost.id}`}
                              target="_blank"
                              rel="noreferrer referrer"
                              className="font-mono text-amber-300 hover:underline truncate dir-ltr text-left"
                              dir="ltr"
                            >
                              {`${window.location.origin}/news/${currentPost.id}`}
                            </a>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Numbered Index Navigation Sidebar (4 cols on desktop) */}
                    <div className="md:col-span-4 bg-slate-50 border-r border-slate-100 flex flex-col justify-between">
                      <div className="p-4 border-b border-slate-100 bg-slate-100/50 flex items-center justify-between">
                        <h3 className="text-xs font-black text-[#0A2463] flex items-center gap-1.5 justify-start">
                          <TrendingUp className="w-4 h-4 text-[#FF7F50]" />
                          <span>الأخبار الأكثر قراءة الآن 📈</span>
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {activeSlideIdx + 1} من {featuredPosts.length}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-[300px] md:max-h-none overflow-y-auto">
                        {featuredPosts.map((post, idx) => (
                          <button
                            key={post.id}
                            onClick={() => setActiveSlideIdx(idx)}
                            className={`w-full p-3.5 text-right flex gap-3 items-start transition-all duration-300 cursor-pointer ${
                              activeSlideIdx === idx 
                                ? "bg-amber-500/10 border-r-4 border-amber-600" 
                                : "hover:bg-slate-100/80"
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-mono font-black ${
                              activeSlideIdx === idx 
                                ? "bg-[#dc2626] text-white" 
                                : "bg-slate-200 text-slate-750"
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-[11.5px] font-black text-slate-800 leading-snug line-clamp-2">
                              {post.title}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="p-3 bg-slate-100/80 border-t border-slate-150 text-center flex items-center justify-between px-4">
                        <button
                          onClick={() => setActiveSlideIdx((prev) => (prev - 1 + featuredPosts.length) % featuredPosts.length)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-[10.5px] font-bold transition border border-slate-250 cursor-pointer"
                        >
                          السابق
                        </button>
                        <button
                          onClick={() => openPost(currentPost)}
                          className="text-[10.5px] font-black text-indigo-650 hover:text-[#0A2463] inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          فتح صفحة الخبر 🔗
                        </button>
                        <button
                          onClick={() => setActiveSlideIdx((prev) => (prev + 1) % featuredPosts.length)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-[10.5px] font-bold transition border border-slate-250 cursor-pointer"
                        >
                          التالي
                        </button>
                      </div>
                    </div>

                  </div>
                </section>
              );
            })()}

            {/* 2. CATEGORY SELECTORS & SEARCH */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="ابحث في أرشيف الأخبار والقرارات الرسمية بالكلمة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-2xl pr-11 pl-4 py-3 text-xs sm:text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 text-right"
                  />
                  <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-black text-slate-600">تصفية سريعة</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-300 flex items-center gap-1.5 cursor-pointer border ${
                      activeCategory === cat.name
                        ? "bg-[#0A2463] text-white border-transparent shadow-xs scale-102"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. MAIN NEWSPAPER FEED LISTING */}
            {filteredPosts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center text-slate-500 border border-slate-200">
                <span className="text-5xl block mb-2">🔍</span>
                <p className="text-sm font-black text-slate-800">لا يوجد أخبار أو تقارير صحفية تطابق المعايير المحددة.</p>
                <p className="text-xs text-slate-400 mt-1">تأكد من عدم وجود أخطاء إملائية أو اختر تصنيفاً آخر.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Section title */}
                <div className="border-b-4 border-[#dc2626] pb-1 flex justify-between items-center">
                  <h3 className="bg-[#dc2626] text-white font-black text-xs px-4 py-1.5 rounded-t-xl flex items-center gap-1.5">
                    <span>📰 أحدث العناوين والتغطيات الإخبارية</span>
                  </h3>
                  <span className="text-[11px] font-mono font-black text-slate-400">العدد المتاح: {filteredPosts.length} خبر</span>
                </div>

                {/* News Cards list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPosts.map((post) => (
                    <article 
                      key={post.id}
                      className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between element-reveal"
                    >
                      <div>
                        {/* Image Frame with category tag - Supports full uncropped aspect ratios (1:1, 9:16, 4:5, 16:9) */}
                        <div className="relative min-h-[200px] sm:min-h-[240px] max-h-[360px] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                          {post.imageUrl ? (
                            <>
                              <img 
                                src={post.imageUrl} 
                                alt="" 
                                className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30 scale-110" 
                                aria-hidden="true"
                              />
                              <LazyLoadImage 
                                src={post.imageUrl} 
                                alt={post.title} 
                                className="relative z-10 w-full h-auto max-h-[360px] object-contain transition-transform duration-500 hover:scale-[1.02]"
                                referrerPolicy="no-referrer"
                                effect="opacity"
                                wrapperClassName="w-full flex items-center justify-center"
                              />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600">
                              <GraduationCap className="w-14 h-14" />
                            </div>
                          )}
                          <span className="absolute top-3 right-3 bg-[#0a2463] text-white text-[9.5px] font-black px-2.5 py-1 rounded-md shadow-xs">
                            {post.category}
                          </span>
                          {post.videoUrl && (
                            <span className="absolute top-3 left-3 bg-red-600/90 text-white text-[9.5px] font-black px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1 backdrop-blur-xs">
                              🎬 فيديو
                            </span>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="p-5 pb-1.5 flex items-center gap-4 text-[10px] text-slate-400 font-extrabold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            {formatSafeArabicDate(post.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {post.readTime}
                          </span>
                        </div>

                        {/* Headline & Abstract */}
                        <div className="px-5 space-y-2">
                          <h4 
                            className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 hover:text-[#dc2626] cursor-pointer"
                            onClick={() => openPost(post)}
                          >
                            {post.title}
                          </h4>
                          <p className="text-[11.5px] text-slate-550 font-bold leading-relaxed line-clamp-3">
                            {post.desc}
                          </p>
                        </div>
                      </div>

                      {/* Read More button & Sharing tools */}
                      <div className="p-5 pt-3.5 mt-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => openPost(post)}
                            className="px-3.5 py-1.5 bg-[#0a2463] hover:bg-[#dc2626] text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          >
                            <span>شاهد الخبر / شاهد المزيد 👁️</span>
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleShare(post, "facebook")}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] rounded-lg cursor-pointer transition-all border border-blue-200 text-[10px] font-black flex items-center gap-1"
                              title="مشاركة على فيسبوك"
                            >
                              <Facebook className="w-3 h-3 fill-current shrink-0" />
                              <span>فيسبوك</span>
                            </button>
                            <button
                              onClick={() => handleShare(post, "whatsapp")}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer transition-all border border-emerald-150 text-[10px] font-black"
                              title="مشاركة على واتساب"
                            >
                              واتساب 💬
                            </button>
                            <button
                              onClick={() => handleShare(post, "telegram")}
                              className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg cursor-pointer transition-all border border-sky-150 text-[10px] font-black"
                              title="مشاركة على تيليجرام"
                            >
                              تيليجرام ✈️
                            </button>
                          </div>
                        </div>

                        {/* Direct News Link Bar as requested */}
                        <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-sans">
                          <span className="font-black text-[#0A2463] shrink-0 text-[10.5px]">🔗 رابط الخبر:</span>
                          <a
                            href={`${window.location.origin}/news/${post.id}`}
                            target="_blank"
                            rel="noreferrer referrer"
                            className="font-mono text-blue-600 hover:underline truncate dir-ltr text-left"
                            dir="ltr"
                          >
                            {`${window.location.origin}/news/${post.id}`}
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

              </div>
            )}
          </main>

          {/* C. LEFT VERTICAL AD MARGIN & WIDGETS (Visible on all screens, sticky on desktop - 2 cols) */}
          <aside className="xl:col-span-2 space-y-4 xl:sticky xl:top-6 w-full">
            
            <RenderAd ad={leftAdConfig} />

            {/* Custom customizable block (Replaces Newsletter) */}
            {customBoxVisible && (
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xs text-right">
                <span className="text-xl">{customBoxEmoji}</span>
                <h5 className="text-[11px] font-black text-[#0A2463]">{customBoxTitle}</h5>
                <p className="text-[10px] text-slate-600 leading-relaxed font-bold whitespace-pre-line">{customBoxText}</p>
                {customBoxBtnText && (
                  <a 
                    href={customBoxBtnUrl}
                    className="block w-full py-2 bg-[#dc2626] hover:bg-red-700 text-white font-black text-center text-[10px] rounded-lg transition"
                  >
                    {customBoxBtnText}
                  </a>
                )}
              </div>
            )}

          </aside>

        </div>
      </div>

      {/* FACEBOOK SHARE ASSISTANT & PREVIEW MODAL */}
      {facebookModalPost && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setFacebookModalPost(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-right overflow-hidden relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-xs">
                  <Facebook className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">مساعد مشاركة الإعلان على فيسبوك 📢</h3>
                  <p className="text-[10px] text-slate-500 font-bold">معاينة ظهور البوستر والعنوان وكود الرابط المعتمد</p>
                </div>
              </div>
              <button
                onClick={() => setFacebookModalPost(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Social Preview Simulation Box */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                <span>📱 معاينة بطاقة فيسبوك (كما تظهر للمتابعين):</span>
              </span>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-xs">
                {/* Simulated Poster / Image Canvas */}
                <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  {facebookModalPost.imageUrl ? (
                    <img 
                      src={facebookModalPost.imageUrl} 
                      alt={facebookModalPost.title} 
                      className="max-h-full max-w-full object-contain mx-auto"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center text-slate-400 p-4">
                      <GraduationCap className="w-10 h-10 mx-auto mb-1 text-amber-400" />
                      <span className="text-[11px] font-bold">بوابة المعاهد والأكاديميات المعتمدة</span>
                    </div>
                  )}
                  <span className="absolute top-2.5 right-2.5 bg-[#dc2626] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs">
                    {facebookModalPost.category}
                  </span>
                </div>

                {/* Simulated Link Meta Info */}
                <div className="p-3 bg-slate-100 border-t border-slate-200 space-y-2">
                  <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500 block">
                    EG-ACADEMIES.COM
                  </span>
                  <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                    {facebookModalPost.title}
                  </h4>
                  <p className="text-[10px] text-slate-600 line-clamp-2 font-medium">
                    {facebookModalPost.desc}
                  </p>

                  {/* شاهد الخبر / شاهد المزيد وتحت منه رابط الخبر as requested */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const target = facebookModalPost;
                        setFacebookModalPost(null);
                        openPost(target);
                      }}
                      className="w-full py-2 bg-[#0A2463] hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>شاهد الخبر / شاهد المزيد 👁️</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="bg-white p-2 rounded-xl border border-slate-200 text-[10.5px] text-slate-700 font-sans flex items-center justify-between gap-1">
                      <span className="font-black text-[#0A2463] shrink-0">🔗 رابط الخبر:</span>
                      <a
                        href={`${window.location.origin}/news/${facebookModalPost.id}`}
                        target="_blank"
                        rel="noreferrer referrer"
                        className="font-mono text-blue-600 hover:underline truncate dir-ltr text-left"
                        dir="ltr"
                      >
                        {`${window.location.origin}/news/${facebookModalPost.id}`}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Caption Copier Block */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
                  <span>📋 كابشن البوست الجاهز للنشر:</span>
                </span>
                <span className="text-[9.5px] text-amber-800 font-bold bg-amber-200/60 px-2 py-0.5 rounded-full">
                  جاهز للصق المباشر
                </span>
              </div>
              <p className="text-[10.5px] text-slate-700 bg-white/80 p-2.5 rounded-xl border border-amber-200/70 font-sans leading-relaxed line-clamp-3">
                {`📢 ${facebookModalPost.title}\n${facebookModalPost.desc}\n👇 شاهد الخبر / شاهد المزيد:\n🔗 رابط الخبر: ${window.location.origin}/news/${facebookModalPost.id}`}
              </p>
              <button
                onClick={() => {
                  const postText = `📢 ${facebookModalPost.title}\n\n${facebookModalPost.desc}\n\n👇 شاهد الخبر / شاهد المزيد:\n${window.location.origin}/news/${facebookModalPost.id}\n\n🔗 رابط الخبر:\n${window.location.origin}/news/${facebookModalPost.id}\n\n#بوابة_المعاهد_الخاصة #تنسيق_2026 #الأكاديميات_المعتمدة #تعليم_مهني`;
                  navigator.clipboard.writeText(postText);
                  setCopiedFacebookText(true);
                  toast.success("✅ تم نسخ الكابشن الجاهز مع الهاشتاجات! يمكنك لصقه مباشرة داخل بوست فيسبوك.");
                  setTimeout(() => setCopiedFacebookText(false), 3000);
                }}
                className={`w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                  copiedFacebookText 
                    ? "bg-emerald-600 text-white" 
                    : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                }`}
              >
                {copiedFacebookText ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تم نسخ الكابشن بنجاح! الصقه في فيسبوك الآن</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ الكابشن والهاشتاجات لفيسبوك</span>
                  </>
                )}
              </button>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/news/${facebookModalPost.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <Facebook className="w-4 h-4 fill-current" />
                <span>إعادة فتح فيسبوك 📢</span>
              </a>

              <a
                href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(`${window.location.origin}/news/${facebookModalPost.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                title="تحديث ذاكرة التخزين المؤقت لفيسبوك فوراً"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فحص وتحديث فيسبوك 🔍</span>
              </a>
            </div>

            <p className="text-[10px] text-slate-500 font-bold text-center pt-1 border-t border-slate-100">
              💡 ملحوظة: الرابط مزوّد بأحدث بروتوكول Open Graph الرسمي لجلب الصور والعناوين تلقائياً.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
