// Product types and constants for سرزمین عسل

export type HoneySlug = "gon" | "konar" | "multi-plant";

export interface ContainerOption {
  size: number; // kg
  label: string; // Persian label
  canWax: boolean; // only 1kg can have wax
  isWholesale: boolean; // 25kg tin is wholesale
}

// ظروف ارائه‌شده
export const CONTAINERS: ContainerOption[] = [
  { size: 0.5, label: "ظرف ۰.۵ کیلویی", canWax: false, isWholesale: false },
  { size: 1, label: "ظرف ۱ کیلویی", canWax: true, isWholesale: false },
  { size: 2, label: "ظرف ۲ کیلویی", canWax: false, isWholesale: false },
  { size: 3, label: "ظرف ۳ کیلویی", canWax: false, isWholesale: false },
  { size: 4, label: "ظرف ۴ کیلویی", canWax: false, isWholesale: false },
  { size: 25, label: "حلب ۲۵ کیلویی (عمده)", canWax: false, isWholesale: true },
];

// Bonus threshold: every 5kg of non-wholesale honey → 0.5kg free
export const BONUS_THRESHOLD_KG = 5;
export const BONUS_AMOUNT_KG = 0.5;

// Payment info
export const PAYMENT_CARD_NUMBER = "6063 7310 4120 3812";
export const PAYMENT_CARD_HOLDER = "مهدی اصغریان";
export const UNIQUE_AMOUNT_MAX = 999; // max extra toman added for tracking

// Contact info
export const CONTACT_PHONE = "۰۹۱۴۰۲۰۲۳۲۰";
export const CONTACT_PHONE_RAW = "09140202320";

// Free delivery city
export const FREE_DELIVERY_CITY = "شهرکرد";

// Products seed data
export interface ProductSeed {
  name: string;
  slug: HoneySlug;
  description: string;
  pricePerKg: number; // toman
  color: string;
  origin: string;
  benefits: string;
  image: string;
  featured: boolean;
}

export const PRODUCTS_SEED: ProductSeed[] = [
  {
    name: "عسل گون",
    slug: "gon",
    description:
      "عسل گون از شهد گل‌های گیاه گون (یونجه شتر) تولید می‌شود. طعمی ملایم و شیرین و عطر لطیف گل‌های بهاری دارد. یکی از محبوب‌ترین عسل‌های ایران برای مصرف روزانه.",
    pricePerKg: 1400000,
    color: "",
    origin: "کوهستان‌های زاگرس",
    benefits:
      "تقویت سیستم ایمنی، افزایش انرژی و شادابی، کمک به هضم بهتر غذا، سرشار از آنتی‌اکسیدان، مفید برای رفع خستگی.",
    image: "/images/honey-gon.png",
    featured: true,
  },
  {
    name: "عسل کنار",
    slug: "konar",
    description:
      "عسل کنار (سدر) از شهد درختان کنار (سدر) به دست می‌آید. طعمی غنی و خوش‌طعم با کمی تلخی ملایم دارد. از باارزش‌ترین و گران‌قیمت‌ترین عسل‌های جهان به شمار می‌رود.",
    pricePerKg: 1200000,
    color: "",
    origin: "مناطق جنوبی ایران",
    benefits:
      "خواص درمانی فراوان، تقویت قوای جنسی، درمان زخم معده و رفلاکس، ضدباکتری قوی، مفید برای بیماری‌های کبدی و کم‌خونی.",
    image: "/images/honey-konar.png",
    featured: true,
  },
  {
    name: "عسل چند گیاه",
    slug: "multi-plant",
    description:
      "عسل چند گیاه (چندگل) از شهد انواع گل‌ها و گیاهان دارویی مختلف جمع‌آوری می‌شود. طعمی متعادل دارد و ترکیبی از خواص متنوع گیاهان مختلف را در خود جای داده است.",
    pricePerKg: 1200000,
    color: "",
    origin: "مراتع کوهستان‌های ایران",
    benefits:
      "ترکیب خواص چندین گیاه، تقویت عمومی بدن، سرشار از ویتامین‌ها و مواد معدنی، ضدالتهاب، مفید برای سرماخوردگی و گلودرد.",
    image: "/images/honey-multi.png",
    featured: true,
  },
];
