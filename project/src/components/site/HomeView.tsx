"use client";

import { useState, useEffect } from "react";
import { Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "./ProductCard";
import { AddToCartDialog } from "./AddToCartDialog";
import { useNav } from "@/lib/store";
import { formatToman, toPersianDigits } from "@/lib/format";
import {
  Droplet,
  Leaf,
  Truck,
  Gift,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Heart,
  Flower2,
  Beaker,
  Star,
} from "lucide-react";

const FEATURES = [
  {
    icon: Leaf,
    title: "طبیعی و خالص",
    desc: "عسل صد در صد طبیعی بدون هیچ افزودنی",
  },
  {
    icon: Truck,
    title: "تحویل به سراسر کشور",
    desc: "ارسال به همه شهرهای ایران با هماهنگی تلفنی",
  },
  {
    icon: Gift,
    title: "هدیه با خرید",
    desc: "با هر ۵ کیلو خرید، ۰.۵ کیلو عسل هدیه بگیرید",
  },
  {
    icon: ShieldCheck,
    title: "کیفیت تضمینی",
    desc: "تضمین اصالت و کیفیت محصولات",
  },
];

const BENEFITS_PREVIEW = [
  {
    icon: Beaker,
    title: "سرشار از آنتی‌اکسیدان",
    desc: "مقابله با رادیکال‌های آزاد و تقویت سلامت بدن",
  },
  {
    icon: Heart,
    title: "تقویت سیستم ایمنی",
    desc: "محافظت طبیعی در برابر بیماری‌ها و عفونت‌ها",
  },
  {
    icon: Star,
    title: "انرژی و شادابی",
    desc: "منبع طبیعی قند و انرژی برای شروع روز",
  },
  {
    icon: Flower2,
    title: "خواص درمانی",
    desc: "مفید برای زخم، هضم و بسیاری از مشکلات سلامتی",
  },
];

export function HomeView() {
  const { navigate } = useNav();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Use cache: 'no-store' so the admin's price/description/featured edits
    // (made via the Telegram bot) are always reflected on the site.
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {});
  }, []);

  const onAdd = (p: Product) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-honey.png"
            alt="عسل طبیعی سرزمین عسل"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-honey-dark/85 via-honey-dark/55 to-honey-dark/20" />
        </div>
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <Badge className="bg-honey-light/90 text-honey-dark border-0 mb-4 text-sm">
              <Sparkles className="w-3.5 h-3.5 ml-1" />
              عسل طبیعی و خالص ایرانی
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-4 leading-tight drop-shadow-lg">
              سرزمین عسل
              <span className="block text-honey-light mt-2">
                طعم طبیعت در خانه شما
              </span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed drop-shadow">
              عسل طبیعی گون، کنار و چند گیاه — برداشت‌شده از طبیعت بکر
              ایران، با کیفیت تضمینی و ارسال به سراسر کشور.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("products")}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-xl h-13 px-7 text-base font-bold py-3.5"
              >
                مشاهده محصولات
                <ArrowLeft className="w-5 h-5 mr-1" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("benefits")}
                className="bg-primary-foreground/15 backdrop-blur text-primary-foreground hover:bg-primary-foreground/25 border border-primary-foreground/30 h-13 px-7 text-base font-bold py-3.5"
              >
                خواص عسل
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="container mx-auto px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="p-4 md:p-5 text-center hover:shadow-lg transition-shadow border-border/60 bg-card"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-honey-light/30 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-honey-dark" />
              </div>
              <h3 className="font-bold text-sm md:text-base mb-1 text-honey-dark">
                {f.title}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="text-center mb-10">
          <Badge className="bg-accent text-accent-foreground border-0 mb-3">
            محصولات ما
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-3">
            عسل‌های ویژه سرزمین عسل
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            سه نوع عسل باارزش، هر کدام با خواص و طعم منحصربه‌فرد خود. انتخاب
            با شماست.
          </p>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAdd} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            در حال بارگذاری محصولات...
          </div>
        )}
        <div className="text-center mt-10">
          <Button
            variant="outline"
            onClick={() => navigate("products")}
            className="border-honey text-honey-dark hover:bg-honey hover:text-primary-foreground h-12 px-8 text-base"
          >
            مشاهده همه محصولات
            <ArrowLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      </section>

      {/* Benefits teaser */}
      <section className="bg-honey-light/15 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="bg-honey-gradient text-primary-foreground border-0 mb-3">
              چرا عسل؟
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-3">
              خواص شگفت‌انگیز عسل طبیعی
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              عسل طبیعی یکی از ارزشمندترین هدایای طبیعت است که قرن‌هاست در
              سلامتی انسان نقش دارد.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS_PREVIEW.map((b) => (
              <Card
                key={b.title}
                className="p-5 hover:shadow-lg transition-shadow border-border/60"
              >
                <div className="w-11 h-11 rounded-xl bg-honey-gradient flex items-center justify-center mb-3">
                  <b.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-base mb-1.5 text-honey-dark">
                  {b.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button
              onClick={() => navigate("benefits")}
              className="bg-honey-gradient text-primary-foreground hover:opacity-90 h-12 px-8"
            >
              مطالعه کامل خواص عسل
              <ArrowLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* About teaser */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <img
                src="/images/apiary.png"
                alt="زرگه‌ی زنبور عسل سرزمین عسل"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <Badge className="bg-accent text-accent-foreground border-0 mb-3">
              درباره ما
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-honey-dark mb-4">
              داستان سرزمین عسل
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              ما با عشق و تعهد به طبیعت، عسل طبیعی و خالص را از زنبورستان‌های
              خود در کوهستان‌های بکر ایران برداشت می‌کنیم. هر قطره عسل ما
              حاصل تلاش بی‌وقفه زنبورهای زحمتکش و مراقبت دقیق ماست.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              هدف ما این است که عسل واقعی و طبیعی را به دست شما برسانیم؛
              عسلی که هم طعم بی‌نظیر طبیعت را داشته باشد و هم خواص درمانی
              کامل خود را حفظ کند.
            </p>
            <Button
              onClick={() => navigate("about")}
              variant="outline"
              className="border-honey text-honey-dark hover:bg-honey hover:text-primary-foreground h-12 px-7"
            >
              بیشتر بدانید
              <ArrowLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-honey-gradient py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <Droplet className="w-12 h-12 text-primary-foreground fill-primary-foreground mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground mb-3 drop-shadow">
            همین حالا سفارش خود را آغاز کنید
          </h2>
          <p className="text-primary-foreground/90 mb-8 max-w-xl mx-auto">
            عسل طبیعی و خالص سرزمین عسل را امتحان کنید و تفاوت را حس کنید.
          </p>
          <Button
            onClick={() => navigate("products")}
            className="bg-primary-foreground text-honey-dark hover:bg-primary-foreground/90 shadow-xl h-13 px-8 text-base font-bold py-3.5"
          >
            مشاهده محصولات
            <ArrowLeft className="w-5 h-5 mr-1" />
          </Button>
        </div>
      </section>

      <AddToCartDialog
        product={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
