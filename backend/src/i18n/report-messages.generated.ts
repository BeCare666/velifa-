// Fichier généré par scripts/sync-report-texts.js — ne pas modifier à la main.
// Source : frontend/src/messages/{fr,en,ar}.json (reportPage).
export const REPORT_MESSAGES = {
  "fr": {
    "scoreLabel": {
      "excellent": "Excellent",
      "needsWork": "À améliorer",
      "critical": "Critique"
    },
    "field": {
      "title": "Ce que vivent vos vrais visiteurs",
      "subtitleUrl": "Données réelles des utilisateurs de Chrome sur cette page (28 derniers jours, Chrome UX Report).",
      "subtitleOrigin": "Pas assez de trafic sur cette page : moyenne de tout votre domaine (28 derniers jours, Chrome UX Report).",
      "none": "Google ne dispose pas encore d’assez de visites réelles pour ce site. Les mesures ci-dessous sont des simulations.",
      "overall": "Évaluation globale :",
      "lcp": "Chargement (LCP)",
      "inp": "Réactivité (INP)",
      "cls": "Stabilité (CLS)",
      "fcp": "Premier affichage (FCP)",
      "ttfb": "Réponse serveur (TTFB)",
      "FAST": "Bon",
      "AVERAGE": "À améliorer",
      "SLOW": "Lent"
    },
    "lab": {
      "title": "Core Web Vitals (simulation)",
      "note": "Mesure de laboratoire Lighthouse : téléphone simulé sur réseau mobile lent.",
      "lcp": "Largest Contentful Paint",
      "cls": "Cumulative Layout Shift",
      "tbt": "Total Blocking Time",
      "fcp": "First Contentful Paint"
    },
    "scores": {
      "title": "Scores Lighthouse",
      "performance": "Performance",
      "accessibility": "Accessibilité",
      "seo": "SEO",
      "bestPractices": "Bonnes pratiques"
    },
    "recs": {
      "title": "Ce qu’il faut corriger en priorité",
      "impact": {
        "high": "Impact fort",
        "medium": "Impact moyen",
        "low": "Impact faible"
      },
      "list": {
        "render-blocking-insight": {
          "title": "Des fichiers bloquent l’affichage de la page",
          "how": "Le navigateur attend des fichiers CSS/JavaScript avant d’afficher quoi que ce soit. Chargez-les en différé ou réduisez-les."
        },
        "render-blocking-resources": {
          "title": "Des fichiers bloquent l’affichage de la page",
          "how": "Le navigateur attend des fichiers CSS/JavaScript avant d’afficher quoi que ce soit. Chargez-les en différé ou réduisez-les."
        },
        "image-delivery-insight": {
          "title": "Images trop lourdes ou au mauvais format",
          "how": "Compressez les images, utilisez WebP/AVIF et adaptez leur taille à l’écran."
        },
        "uses-optimized-images": {
          "title": "Images trop lourdes ou au mauvais format",
          "how": "Compressez les images, utilisez WebP/AVIF et adaptez leur taille à l’écran."
        },
        "modern-image-formats": {
          "title": "Images trop lourdes ou au mauvais format",
          "how": "Compressez les images, utilisez WebP/AVIF et adaptez leur taille à l’écran."
        },
        "offscreen-images": {
          "title": "Images trop lourdes ou au mauvais format",
          "how": "Compressez les images, utilisez WebP/AVIF et adaptez leur taille à l’écran."
        },
        "lcp-discovery-insight": {
          "title": "L’image principale est chargée trop tard",
          "how": "L’élément le plus visible (souvent la bannière) doit être découvert et chargé en priorité."
        },
        "cache-insight": {
          "title": "Les fichiers ne sont pas gardés en cache assez longtemps",
          "how": "Les visiteurs qui reviennent retéléchargent des fichiers qui n’ont pas changé."
        },
        "document-latency-insight": {
          "title": "Le serveur met du temps à répondre",
          "how": "La première réponse du serveur retarde tout le reste de la page."
        },
        "server-response-time": {
          "title": "Le serveur met du temps à répondre",
          "how": "La première réponse du serveur retarde tout le reste de la page."
        },
        "third-parties-insight": {
          "title": "Applications et scripts externes lourds",
          "how": "Des outils tiers (chat, pixels publicitaires, avis clients…) ralentissent la page."
        },
        "unused-javascript": {
          "title": "Code JavaScript chargé mais inutilisé",
          "how": "Une partie du JavaScript téléchargé ne sert pas sur cette page."
        },
        "unused-css-rules": {
          "title": "Styles CSS inutilisés",
          "how": "Une partie du CSS téléchargé ne sert pas sur cette page."
        },
        "legacy-javascript-insight": {
          "title": "JavaScript ancien inutilement volumineux",
          "how": "Du code de compatibilité pour vieux navigateurs alourdit la page."
        },
        "duplicated-javascript-insight": {
          "title": "Code JavaScript en double",
          "how": "Les mêmes bibliothèques sont chargées plusieurs fois."
        },
        "bootup-time": {
          "title": "Le JavaScript met trop de temps à s’exécuter",
          "how": "Le téléphone du visiteur est occupé et la page réagit lentement aux clics."
        },
        "mainthread-work-breakdown": {
          "title": "Le navigateur est surchargé",
          "how": "Trop de travail (scripts, mise en page) avant que la page soit utilisable."
        },
        "layout-shifts": {
          "title": "La page bouge pendant le chargement",
          "how": "Des éléments se déplacent et font cliquer au mauvais endroit."
        },
        "cls-culprits-insight": {
          "title": "La page bouge pendant le chargement",
          "how": "Des éléments se déplacent et font cliquer au mauvais endroit."
        },
        "unsized-images": {
          "title": "Images sans dimensions déclarées",
          "how": "Sans largeur/hauteur, la page se décale quand l’image arrive."
        },
        "font-display-insight": {
          "title": "Les polices retardent l’affichage du texte",
          "how": "Le texte reste invisible tant que la police n’est pas chargée."
        },
        "total-byte-weight": {
          "title": "Page trop lourde",
          "how": "Le volume total téléchargé est élevé, surtout pénalisant sur mobile."
        },
        "dom-size-insight": {
          "title": "Page trop complexe",
          "how": "Un très grand nombre d’éléments ralentit l’affichage et les interactions."
        },
        "crawlable-anchors": {
          "title": "Liens non explorables par Google",
          "how": "Certains liens ne peuvent pas être suivis par les moteurs de recherche."
        }
      }
    },
    "gulf": {
      "title": "Langue arabe et confidentialité",
      "disclaimer": "Indicateurs techniques automatiques, pas un avis juridique. Ils ne remplacent pas une vérification de conformité (ex. PDPL saoudienne).",
      "blocked": "Le site a bloqué notre robot : ces contrôles n’ont pas pu être réalisés.",
      "ok": "Aucun problème détecté sur ces points.",
      "issues": {
        "lang_missing": "La langue de la page n’est pas déclarée (attribut lang).",
        "arabic_without_rtl": "Contenu en arabe mais page non configurée de droite à gauche (RTL).",
        "arabic_lang_without_rtl": "Page déclarée en arabe sans sens d’écriture de droite à gauche.",
        "hreflang_missing": "Plusieurs langues disponibles, mais Google n’est pas informé des versions (hreflang).",
        "no_arabic_version": "Aucune version arabe repérée, alors que le marché du Golfe est majoritairement arabophone.",
        "trackers_without_consent_tool": "Des outils de suivi se chargent sans outil de consentement reconnu dans le code initial de la page.",
        "privacy_policy_link_missing": "Aucun lien vers une politique de confidentialité repéré sur la page."
      }
    },
    "impact": {
      "title": "Pourquoi la vitesse compte pour vos ventes",
      "body": "Selon l’étude « Milliseconds Make Millions » (Deloitte, commandée par Google, 2020), une amélioration de 0,1 s de la vitesse mobile était associée à +8,4 % de conversions sur les sites de commerce.",
      "caveat": "Il s’agit d’une corrélation observée sur 37 marques, pas d’une garantie pour votre site."
    }
  },
  "en": {
    "scoreLabel": {
      "excellent": "Excellent",
      "needsWork": "Needs improvement",
      "critical": "Critical"
    },
    "field": {
      "title": "What your real visitors experience",
      "subtitleUrl": "Real data from Chrome users on this page (last 28 days, Chrome UX Report).",
      "subtitleOrigin": "Not enough traffic on this page: average for your whole domain (last 28 days, Chrome UX Report).",
      "none": "Google does not yet have enough real visits for this site. The measurements below are simulations.",
      "overall": "Overall assessment:",
      "lcp": "Loading (LCP)",
      "inp": "Responsiveness (INP)",
      "cls": "Stability (CLS)",
      "fcp": "First paint (FCP)",
      "ttfb": "Server response (TTFB)",
      "FAST": "Good",
      "AVERAGE": "Needs improvement",
      "SLOW": "Slow"
    },
    "lab": {
      "title": "Core Web Vitals (simulation)",
      "note": "Lighthouse lab measurement: simulated phone on a slow mobile network.",
      "lcp": "Largest Contentful Paint",
      "cls": "Cumulative Layout Shift",
      "tbt": "Total Blocking Time",
      "fcp": "First Contentful Paint"
    },
    "scores": {
      "title": "Lighthouse scores",
      "performance": "Performance",
      "accessibility": "Accessibility",
      "seo": "SEO",
      "bestPractices": "Best practices"
    },
    "recs": {
      "title": "What to fix first",
      "impact": {
        "high": "High impact",
        "medium": "Medium impact",
        "low": "Low impact"
      },
      "list": {
        "render-blocking-insight": {
          "title": "Files are blocking the page from displaying",
          "how": "The browser waits for CSS/JavaScript files before showing anything. Defer or reduce them."
        },
        "render-blocking-resources": {
          "title": "Files are blocking the page from displaying",
          "how": "The browser waits for CSS/JavaScript files before showing anything. Defer or reduce them."
        },
        "image-delivery-insight": {
          "title": "Images are too heavy or in the wrong format",
          "how": "Compress images, use WebP/AVIF and size them for the screen."
        },
        "uses-optimized-images": {
          "title": "Images are too heavy or in the wrong format",
          "how": "Compress images, use WebP/AVIF and size them for the screen."
        },
        "modern-image-formats": {
          "title": "Images are too heavy or in the wrong format",
          "how": "Compress images, use WebP/AVIF and size them for the screen."
        },
        "offscreen-images": {
          "title": "Images are too heavy or in the wrong format",
          "how": "Compress images, use WebP/AVIF and size them for the screen."
        },
        "lcp-discovery-insight": {
          "title": "The main image is loaded too late",
          "how": "The most visible element (often the banner) should be discovered and loaded first."
        },
        "cache-insight": {
          "title": "Files are not cached long enough",
          "how": "Returning visitors re-download files that have not changed."
        },
        "document-latency-insight": {
          "title": "The server is slow to respond",
          "how": "The first server response delays the rest of the page."
        },
        "server-response-time": {
          "title": "The server is slow to respond",
          "how": "The first server response delays the rest of the page."
        },
        "third-parties-insight": {
          "title": "Heavy third-party apps and scripts",
          "how": "Third-party tools (chat, ad pixels, reviews…) are slowing the page down."
        },
        "unused-javascript": {
          "title": "JavaScript loaded but not used",
          "how": "Part of the downloaded JavaScript is not used on this page."
        },
        "unused-css-rules": {
          "title": "Unused CSS styles",
          "how": "Part of the downloaded CSS is not used on this page."
        },
        "legacy-javascript-insight": {
          "title": "Unnecessarily large legacy JavaScript",
          "how": "Compatibility code for old browsers makes the page heavier."
        },
        "duplicated-javascript-insight": {
          "title": "Duplicated JavaScript",
          "how": "The same libraries are loaded more than once."
        },
        "bootup-time": {
          "title": "JavaScript takes too long to run",
          "how": "The visitor’s phone is busy and the page reacts slowly to taps."
        },
        "mainthread-work-breakdown": {
          "title": "The browser is overloaded",
          "how": "Too much work (scripts, layout) before the page becomes usable."
        },
        "layout-shifts": {
          "title": "The page moves while loading",
          "how": "Elements shift around and cause mis-taps."
        },
        "cls-culprits-insight": {
          "title": "The page moves while loading",
          "how": "Elements shift around and cause mis-taps."
        },
        "unsized-images": {
          "title": "Images without declared dimensions",
          "how": "Without width/height, the page shifts when the image arrives."
        },
        "font-display-insight": {
          "title": "Fonts delay text display",
          "how": "Text stays invisible until the font has loaded."
        },
        "total-byte-weight": {
          "title": "Page is too heavy",
          "how": "The total download size is high, especially costly on mobile."
        },
        "dom-size-insight": {
          "title": "Page is too complex",
          "how": "A very large number of elements slows rendering and interactions."
        },
        "crawlable-anchors": {
          "title": "Links Google cannot crawl",
          "how": "Some links cannot be followed by search engines."
        }
      }
    },
    "gulf": {
      "title": "Arabic language and privacy",
      "disclaimer": "Automated technical indicators, not legal advice. They do not replace a compliance review (e.g. Saudi PDPL).",
      "blocked": "The site blocked our robot: these checks could not be performed.",
      "ok": "No issue detected on these points.",
      "issues": {
        "lang_missing": "The page language is not declared (lang attribute).",
        "arabic_without_rtl": "Arabic content but the page is not set to right-to-left (RTL).",
        "arabic_lang_without_rtl": "Page declared as Arabic without right-to-left direction.",
        "hreflang_missing": "Several languages are available, but Google is not told about the versions (hreflang).",
        "no_arabic_version": "No Arabic version found, while Gulf markets are mostly Arabic-speaking.",
        "trackers_without_consent_tool": "Tracking tools load without a recognised consent tool in the initial page code.",
        "privacy_policy_link_missing": "No link to a privacy policy found on the page."
      }
    },
    "impact": {
      "title": "Why speed matters for your sales",
      "body": "According to the “Milliseconds Make Millions” study (Deloitte, commissioned by Google, 2020), a 0.1 s mobile speed improvement was associated with +8.4% conversions on retail sites.",
      "caveat": "This is a correlation observed across 37 brands, not a guarantee for your site."
    }
  },
  "ar": {
    "scoreLabel": {
      "excellent": "ممتاز",
      "needsWork": "يحتاج إلى تحسين",
      "critical": "حرج"
    },
    "field": {
      "title": "ما يعيشه زوارك الحقيقيون",
      "subtitleUrl": "بيانات حقيقية من مستخدمي Chrome على هذه الصفحة (آخر 28 يوماً، تقرير Chrome UX).",
      "subtitleOrigin": "لا توجد زيارات كافية لهذه الصفحة: متوسط نطاقك بالكامل (آخر 28 يوماً، تقرير Chrome UX).",
      "none": "لا تملك Google بعد زيارات حقيقية كافية لهذا الموقع. القياسات أدناه محاكاة.",
      "overall": "التقييم العام:",
      "lcp": "التحميل (LCP)",
      "inp": "سرعة الاستجابة (INP)",
      "cls": "الاستقرار (CLS)",
      "fcp": "أول ظهور (FCP)",
      "ttfb": "استجابة الخادم (TTFB)",
      "FAST": "جيد",
      "AVERAGE": "يحتاج إلى تحسين",
      "SLOW": "بطيء"
    },
    "lab": {
      "title": "مؤشرات الويب الأساسية (محاكاة)",
      "note": "قياس مخبري من Lighthouse: هاتف محاكى على شبكة جوال بطيئة.",
      "lcp": "Largest Contentful Paint",
      "cls": "Cumulative Layout Shift",
      "tbt": "Total Blocking Time",
      "fcp": "First Contentful Paint"
    },
    "scores": {
      "title": "نتائج Lighthouse",
      "performance": "الأداء",
      "accessibility": "سهولة الوصول",
      "seo": "تحسين محركات البحث",
      "bestPractices": "أفضل الممارسات"
    },
    "recs": {
      "title": "ما يجب إصلاحه أولاً",
      "impact": {
        "high": "أثر كبير",
        "medium": "أثر متوسط",
        "low": "أثر ضعيف"
      },
      "list": {
        "render-blocking-insight": {
          "title": "ملفات تمنع ظهور الصفحة",
          "how": "ينتظر المتصفح تحميل ملفات CSS وJavaScript قبل عرض أي شيء. أجّل تحميلها أو قلّل حجمها."
        },
        "render-blocking-resources": {
          "title": "ملفات تمنع ظهور الصفحة",
          "how": "ينتظر المتصفح تحميل ملفات CSS وJavaScript قبل عرض أي شيء. أجّل تحميلها أو قلّل حجمها."
        },
        "image-delivery-insight": {
          "title": "صور ثقيلة جداً أو بصيغة غير مناسبة",
          "how": "اضغط الصور واستخدم صيغة WebP أو AVIF واجعل مقاسها مناسباً للشاشة."
        },
        "uses-optimized-images": {
          "title": "صور ثقيلة جداً أو بصيغة غير مناسبة",
          "how": "اضغط الصور واستخدم صيغة WebP أو AVIF واجعل مقاسها مناسباً للشاشة."
        },
        "modern-image-formats": {
          "title": "صور ثقيلة جداً أو بصيغة غير مناسبة",
          "how": "اضغط الصور واستخدم صيغة WebP أو AVIF واجعل مقاسها مناسباً للشاشة."
        },
        "offscreen-images": {
          "title": "صور ثقيلة جداً أو بصيغة غير مناسبة",
          "how": "اضغط الصور واستخدم صيغة WebP أو AVIF واجعل مقاسها مناسباً للشاشة."
        },
        "lcp-discovery-insight": {
          "title": "الصورة الرئيسية تُحمَّل متأخرة",
          "how": "يجب اكتشاف العنصر الأبرز (غالباً البانر) وتحميله أولاً."
        },
        "cache-insight": {
          "title": "الملفات لا تُخزَّن مؤقتاً لمدة كافية",
          "how": "الزوار العائدون يعيدون تحميل ملفات لم تتغير."
        },
        "document-latency-insight": {
          "title": "الخادم بطيء في الاستجابة",
          "how": "الاستجابة الأولى من الخادم تؤخر بقية الصفحة."
        },
        "server-response-time": {
          "title": "الخادم بطيء في الاستجابة",
          "how": "الاستجابة الأولى من الخادم تؤخر بقية الصفحة."
        },
        "third-parties-insight": {
          "title": "تطبيقات وسكربتات خارجية ثقيلة",
          "how": "أدوات خارجية (دردشة، بكسلات إعلانية، تقييمات…) تبطئ الصفحة."
        },
        "unused-javascript": {
          "title": "كود JavaScript محمَّل دون استخدام",
          "how": "جزء من JavaScript المحمَّل لا يُستخدم في هذه الصفحة."
        },
        "unused-css-rules": {
          "title": "أنماط CSS غير مستخدمة",
          "how": "جزء من CSS المحمَّل لا يُستخدم في هذه الصفحة."
        },
        "legacy-javascript-insight": {
          "title": "JavaScript قديم وكبير الحجم دون داعٍ",
          "how": "كود توافق للمتصفحات القديمة يزيد وزن الصفحة."
        },
        "duplicated-javascript-insight": {
          "title": "كود JavaScript مكرر",
          "how": "المكتبات نفسها تُحمَّل أكثر من مرة."
        },
        "bootup-time": {
          "title": "تنفيذ JavaScript يستغرق وقتاً طويلاً",
          "how": "هاتف الزائر مشغول والصفحة تستجيب ببطء للنقرات."
        },
        "mainthread-work-breakdown": {
          "title": "المتصفح محمَّل فوق طاقته",
          "how": "عمل كثير (سكربتات، تنسيق) قبل أن تصبح الصفحة قابلة للاستخدام."
        },
        "layout-shifts": {
          "title": "الصفحة تتحرك أثناء التحميل",
          "how": "عناصر تتحرك فتسبب نقرات في المكان الخطأ."
        },
        "cls-culprits-insight": {
          "title": "الصفحة تتحرك أثناء التحميل",
          "how": "عناصر تتحرك فتسبب نقرات في المكان الخطأ."
        },
        "unsized-images": {
          "title": "صور بدون أبعاد محددة",
          "how": "بدون عرض وارتفاع، تتحرك الصفحة عند ظهور الصورة."
        },
        "font-display-insight": {
          "title": "الخطوط تؤخر ظهور النص",
          "how": "يبقى النص غير مرئي حتى يكتمل تحميل الخط."
        },
        "total-byte-weight": {
          "title": "الصفحة ثقيلة جداً",
          "how": "حجم التحميل الإجمالي مرتفع، وهذا مكلف خاصة على الجوال."
        },
        "dom-size-insight": {
          "title": "الصفحة معقدة جداً",
          "how": "عدد كبير جداً من العناصر يبطئ العرض والتفاعل."
        },
        "crawlable-anchors": {
          "title": "روابط لا يستطيع Google تتبعها",
          "how": "بعض الروابط لا يمكن لمحركات البحث متابعتها."
        }
      }
    },
    "gulf": {
      "title": "اللغة العربية والخصوصية",
      "disclaimer": "مؤشرات تقنية آلية وليست استشارة قانونية. لا تغني عن مراجعة الامتثال (مثل نظام حماية البيانات الشخصية السعودي).",
      "blocked": "حظر الموقع روبوتنا: تعذّر إجراء هذه الفحوصات.",
      "ok": "لم تُكتشف أي مشكلة في هذه النقاط.",
      "issues": {
        "lang_missing": "لغة الصفحة غير مُعرَّفة (السمة lang).",
        "arabic_without_rtl": "محتوى عربي لكن الصفحة غير مضبوطة من اليمين إلى اليسار (RTL).",
        "arabic_lang_without_rtl": "الصفحة معرّفة بالعربية دون اتجاه من اليمين إلى اليسار.",
        "hreflang_missing": "عدة لغات متاحة، لكن Google غير مُبلَّغ بالنسخ اللغوية (hreflang).",
        "no_arabic_version": "لا توجد نسخة عربية، بينما أغلب أسواق الخليج ناطقة بالعربية.",
        "trackers_without_consent_tool": "أدوات تتبع تُحمَّل دون أداة موافقة معروفة في الكود الأولي للصفحة.",
        "privacy_policy_link_missing": "لم يُعثر على رابط لسياسة الخصوصية في الصفحة."
      }
    },
    "impact": {
      "title": "لماذا تهم السرعة لمبيعاتك",
      "body": "وفق دراسة «Milliseconds Make Millions» (ديلويت، بتكليف من Google، 2020)، ارتبط تحسين سرعة الجوال بمقدار 0.1 ثانية بزيادة 8.4% في التحويلات لمواقع التجزئة.",
      "caveat": "هذا ارتباط لوحظ لدى 37 علامة تجارية، وليس ضماناً لموقعك."
    }
  }
} as const;
