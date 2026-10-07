import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import { app, getAllServerNewsPosts } from "./api/index";

// Load environment variables
dotenv.config();

const PORT = 3000;

// ----------------- Static Asset Serving & Dynamic SSR Meta Tag Injection -----------------

const titlesMap: Record<string, string> = {
  "/": "بوابة حجز المعاهد والأكاديميات الخاصة والتعليم المهني المعتمد بمصر",
  "/branches": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
  "/salam": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
  "/salam-academy": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
  "/elsalam": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
  "/alsalam": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
  "/peace": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
  "/peace-academy": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
  "/trust": "بوابة أكاديمية تراست للعلوم الطبية الحديثة الرسمية 2026",
  "/trust-academy": "بوابة أكاديمية تراست للعلوم الطبية الحديثة الرسمية 2026",
  "/apex": "بوابة أكاديمية أبيكس كولج الرسمية 2026",
  "/apex-college": "بوابة أكاديمية أبيكس كولج الرسمية 2026",
  "/apexcollege": "بوابة أكاديمية أبيكس كولج الرسمية 2026",
  "/refaq": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
  "/refaq-academy": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
  "/alrefaq": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
  "/al-refaq": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
  "/sales-portal": "بوابة مسؤولي المبيعات والتسجيل المباشر",
  "/departments": "تصفح الأقسام والتخصصات الدراسية المعتمدة | بوابة المعاهد الخاصة",
  "/discounts": "تثبيت وحجز خصومات المصروفات الفورية | بوابة المعاهد الخاصة",
  "/accreditation": "تفاصيل الشهادات والاعتمادات والتوثيق الرسمي | بوابة المعاهد الخاصة",
  "/registration-guide": "دليل الخطوات الأربعة للتسجيل الإلكتروني واستخراج الاستمارة الموحدة",
  "/trending": "الأقسام والتخصصات الأكثر طلباً في سوق العمل المصري حالياً",
  "/guidance": "اختبار تحديد التخصص والمسار الدراسي المناسب لميولك ومهاراتك",
  "/news": "أحدث الأخبار والتنبيهات العامة للقبول والتدريب بالأكاديميات المعتمدة",
  "/about": "من نحن | بوابة التعريف بالمعاهد والأكاديميات المهنية المعتمدة بمصر",
  "/privacy": "سياسة الخصوصية وميثاق الأمان الرقمي وخصوصية البيانات للطلاب",
  "/thank-you": "تم تأكيد طلبك بنجاح | يرجى الاحتفاظ برمز الحجز المركزي",
  "/form-extraction": "استخراج وطباعة استمارة الحجز الإلكتروني الموحدة",
  "/complaints": "بوابة الاستفسارات والدعم المباشر للمسجلين",
  "/admin": "لوحة الإدارة والمطور"
};

const descriptionsMap: Record<string, string> = {
  "/": "منصة تعريفية وتسويقية تتيح لك التعرف على تخصصات المعاهد الخاصة والأكاديميات المعتمدة بمصر وحجز مقعدك الدراسي مباشرة مع خصومات للتسجيل المبكر.",
  "/departments": "استكشف التخصصات والشعب الدراسية المتاحة بالأكاديميات والمعاهد الخاصة المعتمدة، وتعرف على شروط القبول والمستقبل المهني والمهارات المطلوبة لكل قسم.",
  "/discounts": "سجل بياناتك المبدئية الآن لحفظ مقعدك وتثبيت الخصومات المتاحة لفترة محدودة على المصروفات وحجز ميزات التنسيق الفردي مجاناً بالكامل.",
  "/accreditation": "اطلع على تفاصيل الاعتمادات الرسمية للشهادات المهنية الممنوحة وفرص التوثيق بالخارجية وتأجيل الخدمة العسكرية والتدريب الميداني والعملي المتاح للطلاب.",
  "/registration-guide": "تعرف على الخطوات الأربعة البسيطة للتقديم الإلكتروني، والأوراق الرسمية المطلوبة لدفعة ٢٠٢٦، وكيفية استدعاء وطباعة استمارة الحجز الموحدة بالمنصة.",
  "/trending": "رصد حي لأكثر التخصصات والأقسام طلباً واهتماماً من الطلاب هذا العام، مرتبة بناءً على الإحصائيات الفعلية لحركات حجز المقاعد والاتصال الجاري.",
  "/guidance": "قم بإجراء اختبار توجيهي سريع ومبسط يساعدك في اختيار التخصص الأكاديمي والمستقبل المهني الأنسب لمهاراتك الفردية وقدراتك الفنية مجاناً.",
  "/news": "تابع آخر الأخبار والبيانات الصحفية والتنبيهات الحصرية حول برامج التدريب العملي، وفرص التوظيف، وتفاصيل الأنشطة الطلابية بالأكاديميات المعتمدة.",
  "/about": "تعرف على رؤية وأهداف بوابتنا المستقلة في تقديم الاستشارات والتوجيه الأكاديمي الموثوق وحجز تخصصات المعاهد الخاصة والبرامج التدريبية بمصر.",
  "/privacy": "نلتزم بحماية خصوصية بيانات الطلاب وهواتفهم وسريتها التامة بالمنصة. تعرف على بنود ميثاق الأمان الرقمي وسياسة الاستخدام العادل للاستمارة الموحدة."
};

function renderHtmlWithMeta(req: express.Request, rawHtml: string): string {
  const urlPath = req.path || "/";
  const cleanPath = urlPath.endsWith("/") && urlPath.length > 1 ? urlPath.slice(0, -1) : urlPath;
  let html = rawHtml;

  const host = (req.headers["x-forwarded-host"] || req.headers.host || "eg-academies.com") as string;
  const proto = (req.headers["x-forwarded-proto"] || "https") as string;
  const origin = `${proto}://${host}`;

  let pageTitle = titlesMap[cleanPath] || "البوابة الموحدة للتسجيل الإلكتروني المهني";
  let pageDesc = descriptionsMap[cleanPath] || "منصة تعريفية وتسويقية تتيح لك التعرف على تخصصات المعاهد الخاصة والأكاديميات المعتمدة بمصر وحجز مقعدك الدراسي مباشرة مع خصومات للتسجيل المبكر.";
  let pageImage = `${origin}/logo.png`;
  let ogType = "website";
  let isNewsArticle = false;
  let newsArticleData: any = null;

  // Dynamic News Post Meta Resolution (e.g. /news/1 or /news/1740000000000 or ?article=1 or ?id=1 or ?post=1)
  if (cleanPath.startsWith("/news/") || req.query.article || req.query.id || req.query.post) {
    const rawId = cleanPath.startsWith("/news/") 
      ? cleanPath.replace("/news/", "").trim() 
      : String(req.query.article || req.query.id || req.query.post || "").trim();

    if (rawId) {
      try {
        const allNews = getAllServerNewsPosts();
        const found = allNews.find((item: any) => String(item.id) === String(rawId));
        if (found) {
          isNewsArticle = true;
          newsArticleData = found;
          pageTitle = `${found.title} | بوابة المعاهد الخاصة والأكاديميات المعتمدة`;
          pageDesc = found.desc || (found.content ? found.content.slice(0, 180) : pageDesc);
          ogType = "article";

          if (found.imageUrl) {
            const img = String(found.imageUrl).trim();
            if (img.startsWith("http://") || img.startsWith("https://")) {
              pageImage = img;
            } else {
              // Base64 or local relative URL -> serve via binary streaming endpoint so Facebook crawler can display it
              pageImage = `${origin}/api/news-image/${found.id}`;
            }
          }
        }
      } catch (err) {
        console.error("Error resolving news article metadata:", err);
      }
    }
  }

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);

  // Replace Description
  html = html.replace(
    /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
    `<meta name="description" content="${pageDesc}" />`
  );

  // Replace Open Graph / Facebook tags
  html = html.replace(
    /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:title" content="${pageTitle}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:description" content="${pageDesc}" />`
  );

  const canonicalUrl = `${origin}${cleanPath === "/" ? "" : cleanPath}`;
  html = html.replace(
    /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );
  html = html.replace(
    /<meta\s+property="og:type"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:type" content="${ogType}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image" content="${pageImage}" />`
  );

  // Ensure Facebook Open Graph Image Dimensions and Alt are present
  if (!html.includes('property="og:image:width"')) {
    html = html.replace(
      "</head>",
      `  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:image:alt" content="${pageTitle.replace(/"/g, "&quot;")}" />\n</head>`
    );
  }

  // Replace Twitter tags
  html = html.replace(
    /<meta\s+(?:name|property)="twitter:title"\s+content=".*?"\s*\/?>/gi,
    `<meta name="twitter:title" content="${pageTitle}" />`
  );
  html = html.replace(
    /<meta\s+(?:name|property)="twitter:description"\s+content=".*?"\s*\/?>/gi,
    `<meta name="twitter:description" content="${pageDesc}" />`
  );
  html = html.replace(
    /<meta\s+(?:name|property)="twitter:image"\s+content=".*?"\s*\/?>/gi,
    `<meta name="twitter:image" content="${pageImage}" />`
  );

  // Canonical Tag
  if (!html.includes('rel="canonical"')) {
    html = html.replace(
      "</head>",
      `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`
    );
  }

  // Dynamic Server-rendered Schema.org JSON-LD Structured Data
  const schemas: any[] = [];
  
  // 1. Organization Schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    "name": "بوابة المعاهد الخاصة والتعليم المهني بمصر",
    "url": origin,
    "logo": `${origin}/logo.png`,
    "description": "منصة تعريفية وتسويقية تتيح لك التعرف على تخصصات المعاهد الخاصة والأكاديميات المعتمدة بمصر وحجز مقعدك الدراسي مباشرة مع خصومات للتسجيل المبكر."
  });

  // 2. WebSite Schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    "name": "بوابة المعاهد الخاصة والتعليم المهني بمصر",
    "url": origin,
    "publisher": {
      "@id": `${origin}/#organization`
    }
  });

  // 3. WebPage or NewsArticle Schema
  if (isNewsArticle && newsArticleData) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": newsArticleData.title,
      "image": [pageImage],
      "datePublished": newsArticleData.createdAt || "2026-06-24T14:30:00.000Z",
      "dateModified": newsArticleData.createdAt || "2026-06-24T14:30:00.000Z",
      "description": pageDesc,
      "publisher": {
        "@id": `${origin}/#organization`
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      }
    });
  } else {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${canonicalUrl}/#webpage`,
      "url": canonicalUrl,
      "name": pageTitle,
      "description": pageDesc,
      "isPartOf": {
        "@id": `${origin}/#website`
      },
      "about": {
        "@id": `${origin}/#organization`
      }
    });
  }

  const schemaHtml = `  <script type="application/ld+json" id="jsonld-structured-data">\n${JSON.stringify(schemas, null, 2)}\n  </script>\n`;
  html = html.replace("</head>", `${schemaHtml}</head>`);

  return html;
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode with Vite Middleware Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Helper to detect social media bots/scrapers (Facebook crawler, WhatsApp, Twitterbot, etc.)
    const isSocialCrawler = (ua: string = "") => {
      const lower = ua.toLowerCase();
      return (
        lower.includes("facebookexternalhit") ||
        lower.includes("facebot") ||
        lower.includes("twitterbot") ||
        lower.includes("whatsapp") ||
        lower.includes("telegrambot") ||
        lower.includes("linkedinbot")
      );
    };

    // Middleware: Serve rich Open Graph SSR HTML for news routes and crawler requests in dev mode
    app.get(["/news/:id", "/news"], async (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.includes(".")) {
        return next();
      }
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const transformedHtml = renderHtmlWithMeta(req, template);
        return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(transformedHtml);
      } catch (e) {
        next(e);
      }
    });

    // Also catch requests from Facebook / WhatsApp crawlers anywhere
    app.use(async (req, res, next) => {
      const ua = (req.headers["user-agent"] || "") as string;
      if (isSocialCrawler(ua) && !req.path.startsWith("/api") && !req.path.includes(".")) {
        try {
          const templatePath = path.resolve(process.cwd(), "index.html");
          let template = fs.readFileSync(templatePath, "utf-8");
          template = await vite.transformIndexHtml(req.originalUrl, template);
          const transformedHtml = renderHtmlWithMeta(req, template);
          return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(transformedHtml);
        } catch (e) {
          next(e);
        }
      }
      next();
    });

    app.use(vite.middlewares);
    console.log("Vite development middleware with dynamic Open Graph SSR injector integrated.");
  } else {
    // Production Mode: Serve built files
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files (js, css, images) but skip default index serving
    app.use(express.static(distPath, { index: false }));

    const indexHtmlPath = path.join(distPath, "index.html");
    let indexHtmlContent = "";
    try {
      indexHtmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
    } catch (e) {
      console.error("Error reading index.html:", e);
    }

    // SSR fallback for all routes in production
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api") || req.path.includes(".")) {
        return res.status(404).send("Not found");
      }
      if (indexHtmlContent) {
        const html = renderHtmlWithMeta(req, indexHtmlContent);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
      } else {
        res.sendFile(indexHtmlPath);
      }
    });
    console.log("Production dynamic SSR meta injector & technical SEO handler configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Academy Server running actively on http://0.0.0.0:${PORT}`);
  });
}

startServer();
