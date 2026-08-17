"use client";

import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplet,
  Leaf,
  Heart,
  ShieldCheck,
  Award,
  Users,
  Truck,
  Flower2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const VALUES = [
  {
    icon: Leaf,
    title: "طبیعت‌دوستی",
    desc: "احترام به طبیعت و زنبورها، برداشت پایدار و بدون آسیب به محیط زیست.",
  },
  {
    icon: ShieldCheck,
    title: "اصالت و خلوص",
    desc: "تضمین خلوص کامل عسل بدون هیچ‌گونه افزودنی، قند یا مواد نگهدارنده.",
  },
  {
    icon: Heart,
    title: "سلامت مشتری",
    desc: "ارائه محصولاتی که خودمان با اطمینان برای خانواده‌مان استفاده می‌کنیم.",
  },
  {
    icon: Award,
    title: "کیفیت برتر",
    desc: "کنترل کیفیت دقیق در تمام مراحل از برداشت تا بسته‌بندی و ارسال.",
  },
];

const STATS = [
  { value: "۳۱", label: "استان تحت پوشش" },
  { value: "+۵۰۰۰", label: "مشتری راضی" },
  { value: "۳", label: "نوع عسل ویژه" },
  { value: "۱۰۰٪", label: "طبیعی و خالص" },
];

const WHY_US = [
  "عسل صد در صد طبیعی و خالص",
  "بسته‌بندی بهداشتی و استاندارد",
  "ارسال رایگان در شهرکرد",
  "هدیه ویژه با خرید عمده",
  "پشتیبانی و مشاوره تخصصی",
];

export function AboutView() {
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
            درباره ما
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow">
            داستان سرزمین عسل
          </h1>
          <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            سفری به دنیای عسل طبیعی؛ جایی که عشق به طبیعت، تعهد به کیفیت و
            احترام به مشتری در هم آمیخته است.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative order-2 md:order-1">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <img
                src="/images/apiary.png"
                alt="زرگه‌ی زنبور عسل"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {/* (removed floating "+۲۰ سال تجربه" badge per customer request) */}
          <div className="order-1 md:order-2">
            <Badge className="bg-accent text-accent-foreground border-0 mb-3">
              شروع داستان ما
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-4">
              از عشق به طبیعت تا سرزمین عسل
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                داستان سرزمین عسل با عشق یک نفر به طبیعت و زنبورها آغاز شد.
                سال‌ها پیش، با چند کندو در کوهستان‌های بکر زاگرس شروع کردیم
                و کم‌کم متوجه شدیم که عسل واقعی، عسلی است که بدون هیچ
                دخالتی، توسط زنبورها از شهد گل‌های وحشی تولید می‌شود.
              </p>
              <p>
                امروز با افتخار، سه نوع عسل باارزش را به شما ارائه می‌دهیم:
                عسل گون با رنگ طلایی و طعم ملایم، عسل کنار با رنگ تیره و
                خواص درمانی بی‌نظیر، و عسل چند گیاه با ترکیبی از خواص
                متنوع.
              </p>
              <p>
                هدف ما این است که عسل واقعی را به دست شما برسانیم؛ عسلی که
                هم طعم طبیعت را داشته باشد و هم خواص درمانی کامل خود را
                حفظ کند.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-honey-gradient py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-4xl md:text-5xl font-extrabold text-primary-foreground mb-1 drop-shadow">
                  {s.value}
                </div>
                <div className="text-sm text-primary-foreground/80">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="text-center mb-10">
          <Badge className="bg-accent text-accent-foreground border-0 mb-3">
            ارزش‌های ما
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-3">
            آنچه به آن باور داریم
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            ارزش‌هایی که در هر مرحله از کار ما مشاهده می‌کنید.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((v) => (
            <Card
              key={v.title}
              className="p-5 text-center hover:shadow-lg transition-shadow border-border/60"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-honey-light/30 flex items-center justify-center">
                <v.icon className="w-7 h-7 text-honey-dark" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-honey-dark">
                {v.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {v.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-honey-light/15 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <Badge className="bg-honey-gradient text-primary-foreground border-0 mb-3">
                چرا سرزمین عسل؟
              </Badge>
              <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-4">
                مزایای خرید از ما
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                ما متعهد به ارائه بهترین کیفیت و خدمات به مشتریان عزیزمان
                هستیم. این مزایا باعث می‌شود با خیال راحت از ما خرید کنید.
              </p>
              <ul className="space-y-3">
                {WHY_US.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-honey shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="p-8 bg-card shadow-lg">
              <Flower2 className="w-12 h-12 text-honey mb-4" />
              <h3 className="font-extrabold text-xl text-honey-dark mb-3">
                عسل واقعی را بشناسید
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                عسل طبیعی هرگز شکرین مصنوعی ندارد، در دمای اتاق ممکن است
                بلورینه شود (که نشانه طبیعی بودن است) و طعمی منحصربه‌فرد و
                گیاهی دارد که با قندهای مصنوعی قابل مقایسه نیست.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                ما به شما تضمین می‌دهیم که هر قطره عسلی که از سرزمین عسل
                دریافت می‌کنید، صد در صد طبیعی و خالص است.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-14 text-center">
        <Droplet className="w-12 h-12 text-honey fill-honey mx-auto mb-4" />
        <h2 className="text-2xl md:text-3xl font-extrabold text-honey-dark mb-4">
          آماده‌ی تجربه طعم واقعی طبیعت هستید؟
        </h2>
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
