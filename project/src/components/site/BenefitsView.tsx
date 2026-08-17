"use client";

import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Beaker,
  Heart,
  Star,
  Flower2,
  ShieldPlus,
  Brain,
  Zap,
  Droplet,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const GENERAL_BENEFITS = [
  {
    icon: ShieldPlus,
    title: "تقویت سیستم ایمنی",
    desc: "عسل دارای خواص ضدباکتریایی و ضدالتهابی است که به تقویت سیستم ایمنی بدن کمک می‌کند و در برابر بیماری‌ها از شما محافظت می‌کند.",
  },
  {
    icon: Zap,
    title: "افزایش انرژی",
    desc: "منبع طبیعی قود و کربوهیدرات، انرژی سریع و پایدار برای شروع روز یا قبل از ورزش بدون افت ناگهانی قند خون.",
  },
  {
    icon: Heart,
    title: "سلامت قلب",
    desc: "آنتی‌اکسیدان‌های موجود در عسل به کاهش کلسترول و بهبود سلامت قلب و عروق کمک می‌کنند.",
  },
  {
    icon: Brain,
    title: "بهبود حافظه",
    desc: "مصرف منظم عسل به بهبود عملکرد مغز، تمرکز و حافظه کمک می‌کند، به‌ویژه در کودکان و سالمندان.",
  },
  {
    icon: Flower2,
    title: "ضدالتهاب طبیعی",
    desc: "خواص ضدالتهابی عسل در تسکین گلودرد، سرفه و التهاب‌های داخلی بدن مؤثر است.",
  },
  {
    icon: Beaker,
    title: "سرشار از آنتی‌اکسیدان",
    desc: "حاوی ترکیبات فنلی و آنتی‌اکسیدان که با رادیکال‌های آزاد مبارزه کرده و از سلول‌ها محافظت می‌کنند.",
  },
];

const HONEY_TYPES = [
  {
    name: "عسل گون",
    color: "bg-honey-light/30",
    benefits: [
      "تقویت سیستم ایمنی بدن",
      "افزایش انرژی و رفع خستگی",
      "کمک به هضم بهتر غذا",
      "مفید برای رفع سردرد",
      "سرشار از آنتی‌اکسیدان",
    ],
  },
  {
    name: "عسل کنار",
    color: "bg-honey/20",
    benefits: [
      "خواص درمانی فراوان",
      "تقویت قوای جنسی",
      "درمان زخم معده و رفلاکس",
      "ضدباکتری بسیار قوی",
      "مفید برای بیماری‌های کبدی و کم‌خونی",
    ],
  },
  {
    name: "عسل چند گیاه",
    color: "bg-honey-light/25",
    benefits: [
      "ترکیب خواص چندین گیاه دارویی",
      "تقویت عمومی بدن",
      "سرشار از ویتامین‌ها و مواد معدنی",
      "ضدالتهاب طبیعی",
      "مفید برای سرماخوردگی و گلودرد",
    ],
  },
];

const FAQ = [
  {
    q: "چطور بفهمیم عسل طبیعی است؟",
    a: "عسل طبیعی ممکن است در دمای اتاق بلورینه (شکرک) شود که این نشانه طبیعی بودن آن است. عسل طبیعی طعمی گیاهی و منحصربه‌فرد دارد و در آب سرد به سختی حل می‌شود. بهترین راه، خرید از منابع معتبر و مورد اعتماد مانند سرزمین عسل است.",
  },
  {
    q: "شکرک زدن عسل یعنی چه؟",
    a: "شکرک زدن یا تبلور عسل، فرآیندی کاملاً طبیعی است که در عسل‌های طبیعی رخ می‌دهد و نشانه خلوص عسل است. برای بازگرداندن عسل به حالت مایع، کافی است ظرف را در حمام آب گرم (نه جوش) قرار دهید.",
  },
  {
    q: "میزان مصرف روزانه عسل چقدر است؟",
    a: "مصرف ۱ تا ۲ قاشق غذاخوری عسل در روز برای یک فرد سالم توصیه می‌شود. برای کودکان بالای یک سال نیز مقدار کمتری قابل مصرف است. توجه: عسل نباید به نوزادان زیر یک سال داده شود.",
  },
  {
    q: "بهترین زمان مصرف عسل چه زمانی است؟",
    a: "مصرف عسل ناشتا صبح‌ها برای دریافت انرژی و تقویت سیستم ایمنی بهترین زمان است. همچنین قبل از خواب نیز می‌تواند به بهبود کیفیت خواب کمک کند.",
  },
  {
    q: "تفاوت عسل گون، کنار و چند گیاه چیست؟",
    a: "تفاوت در نوع گل و گیاهی است که زنبور از شهد آن استفاده می‌کند. عسل گون از گل گون، عسل کنار از درخت سدر و عسل چند گیاه از ترکیب گل‌های مختلف به دست می‌آید. هر کدام طعم و خواص منحصربه‌فرد خود را دارند.",
  },
  {
    q: "نحوه نگهداری عسل چگونه است؟",
    a: "عسل را در ظرف دربسته، در جای خشک و خنک و دور از نور مستقیم خورشید نگهداری کنید. نیازی به نگهداری در یخچال نیست. با مراقبت صحیح، عسل طبیعی برای سال‌ها قابل مصرف باقی می‌ماند.",
  },
];

export function BenefitsView() {
  const { navigate } = useNav();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-honey-dark text-primary-foreground py-16 md:py-24">
        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/honeycomb-texture.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <Badge className="bg-honey-light/30 text-primary-foreground border-0 mb-4">
            خواص عسل
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow">
            شگفتی‌های طبیعی عسل
          </h1>
          <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            عسل طبیعی یکی از ارزشمندترین هدایای طبیعت است. با خواص درمانی و
            غذایی بی‌نظیر، قرن‌هاست که در سلامتی انسان نقش حیاتی دارد.
          </p>
        </div>
      </section>

      {/* General benefits */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="text-center mb-10">
          <Badge className="bg-accent text-accent-foreground border-0 mb-3">
            خواص عمومی
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-3">
            چرا عسل طبیعی مصرف کنیم؟
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            عسل طبیعی سرشار از خواصی است که به سلامتی شما کمک می‌کند.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GENERAL_BENEFITS.map((b) => (
            <Card
              key={b.title}
              className="p-5 hover:shadow-lg transition-all hover:-translate-y-1 border-border/60"
            >
              <div className="w-12 h-12 rounded-xl bg-honey-gradient flex items-center justify-center mb-4">
                <b.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-honey-dark">
                {b.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {b.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* By honey type */}
      <section className="bg-honey-light/15 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="bg-honey-gradient text-primary-foreground border-0 mb-3">
              خواص هر نوع عسل
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-3">
              خواص اختصاصی هر عسل
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              هر نوع عسل بسته به گیاه منشأ، خواص منحصربه‌فردی دارد.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HONEY_TYPES.map((h) => (
              <Card
                key={h.name}
                className={`p-6 ${h.color} border-honey/30 hover:shadow-lg transition-shadow`}
              >
                <h3 className="font-extrabold text-xl text-honey-dark mb-4">
                  {h.name}
                </h3>
                <ul className="space-y-2.5">
                  {h.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-honey-dark shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/90">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to consume */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <Badge className="bg-accent text-accent-foreground border-0 mb-3">
              راهنمای مصرف
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-4">
              نکات مصرف عسل طبیعی
            </h2>
            <ul className="space-y-3">
              {[
                "مصرف ۱ تا ۲ قاشق غذاخوری در روز کافی است",
                "بهترین مصرف ناشتا صبح‌ها است",
                "عسل را با آب ولرم (نه داغ) مصرف کنید",
                "از دادن عسل به نوزادان زیر یک سال خودداری کنید",
                "برای شیرین کردن نوشیدنی‌ها به جای قند استفاده کنید",
                "نگهداری در ظرف دربسته و دور از نور خورشید",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Droplet className="w-5 h-5 text-honey fill-honey shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 bg-honey-light/20 border-honey/30">
            <Star className="w-12 h-12 text-honey-dark mb-4" />
            <h3 className="font-extrabold text-xl text-honey-dark mb-3">
              یک توصیه ویژه
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              برای دریافت بیشترین خواص عسل، آن را با آب ولرم و کمی آبلیموی
              تازه ناشتا مصرف کنید. این ترکیب به پاکسازی بدن و تقویت سیستم
              ایمنی کمک شایانی می‌کند.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              همچنین می‌توانید عسل را با دارچین، زنجبیل یا زعفران ترکیب
              کنید تا خواص درمانی آن چند برابر شود.
            </p>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-honey-light/15 py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <Badge className="bg-accent text-accent-foreground border-0 mb-3">
              سوالات متداول
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-3">
              پرسش‌های شما درباره عسل
            </h2>
          </div>
          <Card className="p-2 md:p-4">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-border/60"
                >
                  <AccordionTrigger className="text-right font-bold text-base md:text-lg text-honey-dark hover:no-underline px-3">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed px-3 text-sm md:text-base">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-honey-dark mb-4">
          عسل طبیعی را همین حالا سفارش دهید
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          از خواص بی‌نظیر عسل طبیعی بهره‌مند شوید.
        </p>
        <Button
          onClick={() => navigate("products")}
          className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-lg h-13 px-8 text-base font-bold py-3.5"
        >
          مشاهده محصولات
          <ArrowLeft className="w-5 h-5 mr-1" />
        </Button>
      </section>
    </div>
  );
}
