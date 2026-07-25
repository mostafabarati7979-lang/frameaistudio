// Static content for the public marketing site. No pricing anywhere — per brief.

export type Service = {
  slug: string;
  title: string;
  category: string;
  short: string;
  full: string;
  features: string[];
  delivery: string;
  revisions: string;
  cover: string;
};


export const services: Service[] = [
  {
    slug: "wedding-film",
    title: "فیلم عروسی",
    category: "رویداد",
    short: "روایت سینمایی شب زندگی شما با کیفیت بی‌نظیر.",
    full: "تیم ما با چند دوربین حرفه‌ای، نورپردازی و صداگذاری اختصاصی، فیلم عروسی شما را در قالبی سینمایی و ماندگار تولید می‌کند.",
    features: ["فیلم‌برداری چند دوربینه", "اصلاح رنگ سینمایی", "میکس صدای حرفه‌ای", "تیزر کوتاه شبکه‌های اجتماعی"],
    delivery: "۳ تا ۶ هفته",
    revisions: "۲ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "formaliteh",
    title: "فیلم فرمالیته",
    category: "رویداد",
    short: "روزی که همه‌چیز آرام و زیباست، در قابی هنری.",
    full: "فیلم‌برداری فرمالیته در لوکیشن دلخواه با کارگردانی صحنه، نور طبیعی و تدوین سینمایی.",
    features: ["کارگردانی صحنه", "استفاده از گیمبال و درون", "رنگ‌بندی سینمایی", "موسیقی اختصاصی"],
    delivery: "۲ تا ۴ هفته",
    revisions: "۲ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "pre-wedding",
    title: "کلیپ پیش‌عروسی",
    category: "رویداد",
    short: "قصه‌ی عاشقانه‌ی شما، پیش از شب بزرگ.",
    full: "کلیپی کوتاه و هنری از داستان شما با فیلم‌نامه اختصاصی، لوکیشن انتخابی و تدوین ریتمیک.",
    features: ["فیلم‌نامه اختصاصی", "لوکیشن هنری", "تدوین ریتمیک", "خروجی افقی و عمودی"],
    delivery: "۲ هفته",
    revisions: "۱ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "cinematic-teaser",
    title: "تیزر سینمایی",
    category: "تبلیغات",
    short: "برند شما در قابی سینمایی، مخاطبتان را جادو می‌کند.",
    full: "تیزرهای سینمایی برای برند، محصول یا رویداد؛ از استوری‌بورد تا تحویل نهایی.",
    features: ["استوری‌بورد", "کارگردانی هنری", "افکت و موشن", "خروجی همه پلتفرم‌ها"],
    delivery: "۳ تا ۵ هفته",
    revisions: "۲ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "instagram-reels",
    title: "ریلز اینستاگرام",
    category: "شبکه‌های اجتماعی",
    short: "ویدئوهای کوتاه، پرمخاطب و درگیرکننده برای اینستاگرام.",
    full: "تولید ریلز حرفه‌ای متناسب با هویت برند شما با ترندهای روز و کیفیت سینمایی.",
    features: ["اسکریپت کوتاه", "فیلم‌برداری حرفه‌ای", "زیرنویس فارسی", "تحویل ماهانه"],
    delivery: "۱ هفته",
    revisions: "۱ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "story-ads",
    title: "استوری تبلیغاتی",
    category: "شبکه‌های اجتماعی",
    short: "قاب عمودی، پیام کوتاه، برخورد ماندگار.",
    full: "طراحی و تولید استوری‌های تبلیغاتی برای رشد فروش و آگاهی از برند.",
    features: ["طراحی گرافیک", "موشن اختصاصی", "متن تبلیغاتی", "تحویل بسته‌ای"],
    delivery: "۳ تا ۷ روز",
    revisions: "۱ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "venue-teaser",
    title: "تیزر تالار و باغ‌تالار",
    category: "تبلیغات",
    short: "معرفی سینمایی مکان شما برای جذب مشتری بیشتر.",
    full: "فیلم‌برداری هوایی و زمینی از تالار یا باغ‌تالار به همراه تدوین حرفه‌ای.",
    features: ["فیلم‌برداری هوایی", "نورپردازی شبانه", "روایت هنری", "خروجی متعدد"],
    delivery: "۲ هفته",
    revisions: "۲ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "boutique-teaser",
    title: "تیزر مزون لباس عروس",
    category: "تبلیغات",
    short: "لباس‌های شما، در قابی که شایسته آن‌هاست.",
    full: "فیلم‌برداری فشن مزون با کارگردانی هنری، مدل حرفه‌ای و تدوین سینمایی.",
    features: ["کارگردانی فشن", "نورپردازی استودیویی", "تدوین ریتمیک", "خروجی چند نسخه"],
    delivery: "۲ تا ۳ هفته",
    revisions: "۲ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "salon-teaser",
    title: "تیزر سالن زیبایی",
    category: "تبلیغات",
    short: "روایتی گرم و حرفه‌ای از خدمات سالن شما.",
    full: "تیزر تبلیغاتی برای سالن‌های زیبایی با کیفیت سینمایی.",
    features: ["فیلم‌برداری داخلی", "نورپردازی نرم", "تدوین احساسی", "خروجی متعدد"],
    delivery: "۱۰ روز",
    revisions: "۱ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "digital-invitation",
    title: "دعوت‌نامه دیجیتال",
    category: "خدمات دیجیتال",
    short: "دعوت‌نامه‌ای متحرک و اختصاصی برای مهمانان شما.",
    full: "طراحی و ساخت دعوت‌نامه دیجیتال متحرک با موسیقی و خروجی مناسب پیام‌رسان‌ها.",
    features: ["طراحی گرافیک", "موشن اختصاصی", "شخصی‌سازی نام", "خروجی برای واتساپ"],
    delivery: "۵ روز",
    revisions: "۱ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "motion-graphics",
    title: "موشن‌گرافیک",
    category: "خدمات دیجیتال",
    short: "پیام شما، در قالبی متحرک و جذاب.",
    full: "طراحی و ساخت موشن‌گرافیک برای تبلیغات، آموزش و معرفی خدمات.",
    features: ["اسکریپت", "طراحی شخصیت", "انیمیشن", "صداگذاری"],
    delivery: "۲ هفته",
    revisions: "۲ نوبت اصلاح",
    cover: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "monthly-content",
    title: "تولید محتوای ماهانه",
    category: "شبکه‌های اجتماعی",
    short: "برنامه محتوایی حرفه‌ای برای رشد پایدار برند شما.",
    full: "پکیج ماهانه تولید ویدئو، ریلز، استوری و پست برای شبکه‌های اجتماعی.",
    features: ["برنامه‌ریزی محتوا", "فیلم‌برداری ماهانه", "طراحی گرافیک", "گزارش عملکرد"],
    delivery: "قرارداد ماهانه",
    revisions: "بر اساس قرارداد",
    cover: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&w=1200&h=800&q=80",
  },
];

export type Package = {
  slug: string;
  title: string;
  description: string;
  includes: string[];
  outputs: string;
  delivery: string;
  bestseller?: boolean;
  cover: string;
};

export const packages: Package[] = [
  {
    slug: "digital-invite",
    title: "دعوت‌نامه دیجیتال",
    description: "پکیج طراحی و ساخت دعوت‌نامه متحرک اختصاصی برای مهمانان شما.",
    includes: ["طراحی گرافیک اختصاصی", "موشن با موسیقی", "شخصی‌سازی نام مهمان"],
    outputs: "۲ خروجی افقی/عمودی",
    delivery: "۵ تا ۷ روز",
    cover: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "reels-formaliteh",
    title: "ریلز فرمالیته",
    description: "برای زوج‌هایی که یک روایت کوتاه اما سینمایی از فرمالیته می‌خواهند.",
    includes: ["فیلم‌برداری نیم‌روزه", "تدوین ریلز ۶۰ ثانیه‌ای", "رنگ‌بندی سینمایی"],
    outputs: "۱ ریلز + ۳ استوری",
    delivery: "۱۰ روز",
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "cinematic-formaliteh",
    title: "فرمالیته سینمایی",
    description: "فیلم فرمالیته کامل با کارگردانی، نور و تدوین سینمایی.",
    includes: ["فیلم‌برداری تمام‌روز", "چند دوربین و درون", "تدوین سینمایی ۵-۸ دقیقه‌ای", "تیزر کوتاه شبکه‌های اجتماعی"],
    outputs: "فیلم بلند + تیزر",
    delivery: "۴ هفته",
    bestseller: true,
    cover: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "premium-wedding",
    title: "عروسی حرفه‌ای",
    description: "پوشش کامل شب عروسی با تیم چند‌نفره و کیفیت بی‌نظیر.",
    includes: ["پوشش کامل مراسم", "چند اپراتور + درون", "میکس صدای حرفه‌ای", "تیزر + فیلم بلند", "رنگ‌بندی سینمایی"],
    outputs: "فیلم بلند + تیزر + ریلز",
    delivery: "۶ هفته",
    bestseller: true,
    cover: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "monthly-social",
    title: "تولید محتوای ماهانه",
    description: "پکیج ماهانه رشد شبکه‌های اجتماعی برای برندها و کسب‌وکارها.",
    includes: ["۴ ریلز در ماه", "۸ استوری", "۲ پست تصویری", "گزارش عملکرد ماهانه"],
    outputs: "بسته کامل ماهانه",
    delivery: "قرارداد ماهانه",
    cover: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&w=1200&h=800&q=80",
  },
];

export type PortfolioItem = {
  slug: string;
  title: string;
  category: string;
  client: string;
  year: string;
  cover: string;
  description: string;
  isDemo: boolean;
};

export const portfolio: PortfolioItem[] = [
  {
    slug: "demo-wedding-atlas",
    title: "عروسی اطلس",
    category: "فیلم عروسی",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "روایتی گرم و سینمایی از یک شب عروسی خصوصی، با نگاهی مستند و ریتمی احساسی.",
    isDemo: true,
  },
  {
    slug: "demo-formaliteh-noor",
    title: "فرمالیته نور",
    category: "فرمالیته",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "لوکیشن ویلایی، نور طلایی غروب، و لحظه‌های آرام.",
    isDemo: true,
  },
  {
    slug: "demo-teaser-lumen",
    title: "تیزر برند لومن",
    category: "تیزر سینمایی",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "تیزر معرفی برند نورپردازی لومن، با تصاویر آهسته و افکت‌های سینمایی.",
    isDemo: true,
  },
  {
    slug: "demo-reels-atelier",
    title: "ریلز آتلیه رز",
    category: "ریلز اینستاگرام",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "مجموعه ریلز ماهانه برای مزون رز، با نگاهی فشن و مینیمال.",
    isDemo: true,
  },
  {
    slug: "demo-preweddin-story",
    title: "پیش‌عروسی داستان",
    category: "پیش‌عروسی",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "کلیپ داستانی از سفر یک زوج، در لوکیشن‌های طبیعی.",
    isDemo: true,
  },
  {
    slug: "demo-venue-baghsara",
    title: "تیزر باغ‌سرا",
    category: "تیزر تالار",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "معرفی سینمایی باغ‌سرا با فیلم‌برداری هوایی و نورپردازی شبانه.",
    isDemo: true,
  },
  {
    slug: "demo-monthly-cafe",
    title: "محتوای ماهانه کافه ماه",
    category: "محتوای ماهانه",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "بسته محتوای ماهانه ریلز و استوری برای کافه ماه.",
    isDemo: true,
  },
  {
    slug: "demo-motion-explain",
    title: "موشن معرفی محصول",
    category: "موشن‌گرافیک",
    client: "نمونه آزمایشی",
    year: "۱۴۰۳",
    cover: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&h=800&q=80",
    description: "موشن‌گرافیک ۹۰ ثانیه‌ای برای معرفی یک اپلیکیشن.",
    isDemo: true,
  },
];

export type FAQ = { q: string; a: string };

export const faqs: FAQ[] = [
  {
    q: "چرا قیمت‌ها در سایت نمایش داده نمی‌شود؟",
    a: "هر پروژه‌ی ما بر اساس نیاز، مدت، تیم اجرایی و جزئیات خاص خودش قیمت‌گذاری می‌شود. پس از ثبت درخواست، تیم ما پروژه شما را بررسی و پیش‌فاکتور اختصاصی ارسال می‌کند.",
  },
  {
    q: "مراحل همکاری با استودیو چگونه است؟",
    a: "۱) ثبت درخواست و بارگذاری اطلاعات پروژه. ۲) بررسی توسط تیم و ارسال پیش‌فاکتور. ۳) تأیید پیش‌فاکتور و امضای قرارداد. ۴) پرداخت پیش‌پرداخت و شروع اجرای پروژه. ۵) تحویل نسخه اولیه و اصلاحات. ۶) تسویه نهایی و تحویل خروجی.",
  },
  {
    q: "زمان تحویل پروژه چقدر است؟",
    a: "بسته به نوع خدمت بین ۵ روز تا ۶ هفته متغیر است. زمان دقیق در پیش‌فاکتور اعلام می‌شود.",
  },
  {
    q: "آیا فایل خام تحویل داده می‌شود؟",
    a: "به‌صورت پیش‌فرض خیر. در صورت درخواست و توافق در قرارداد، فایل خام قابل ارائه است.",
  },
  {
    q: "چند نوبت اصلاح در هر پروژه انجام می‌شود؟",
    a: "بسته به خدمت، معمولاً ۱ تا ۲ نوبت اصلاح در نسخه اولیه پیش‌بینی شده است. جزئیات در پیش‌فاکتور و قرارداد ذکر می‌شود.",
  },
];

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  readTime: string;
  cover: string;
};

export const posts: BlogPost[] = [
  {
    slug: "cinematic-wedding-tips",
    title: "۷ نکته برای داشتن فیلم عروسی سینمایی",
    excerpt: "چه چیزی یک فیلم عروسی را از یک ثبت ساده به یک اثر سینمایی تبدیل می‌کند؟",
    body: "روایت خوب، نور مناسب، صداگذاری حرفه‌ای و رنگ‌بندی — این‌ها ستون‌های اصلی یک فیلم عروسی سینمایی هستند. در این مقاله به هفت نکته کاربردی برای انتخاب تیم و برنامه‌ریزی مراسم می‌پردازیم.",
    date: "۱۴۰۳/۰۸/۱۵",
    readTime: "۵ دقیقه",
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "choosing-formaliteh-location",
    title: "چگونه بهترین لوکیشن فرمالیته را انتخاب کنیم؟",
    excerpt: "انتخاب لوکیشن مهم‌ترین تصمیم شما در فیلم فرمالیته است.",
    body: "لوکیشن هم نور را می‌سازد، هم فضا و حس فیلم را. در این مقاله معیارهای انتخاب لوکیشن مناسب و اشتباه‌های رایج را بررسی می‌کنیم.",
    date: "۱۴۰۳/۰۷/۲۸",
    readTime: "۴ دقیقه",
    cover: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&h=800&q=80",
  },
  {
    slug: "instagram-content-strategy",
    title: "استراتژی محتوای اینستاگرام برای برندهای لوکس",
    excerpt: "ریلز، استوری و پست — چگونه ترکیب درست را بسازیم؟",
    body: "برندهای لوکس به یک نگاه ثابت هنری نیاز دارند. در این مقاله چارچوب محتوایی ما برای برندهای این حوزه را می‌بینید.",
    date: "۱۴۰۳/۰۷/۱۰",
    readTime: "۶ دقیقه",
    cover: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&w=1200&h=800&q=80",
  },
];
