"use client";

import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MapPin,
  ShoppingBasket,
} from "lucide-react";
import { CONTACT_PHONE, CONTACT_PHONE_RAW } from "@/lib/products";

const CONTACT_INFO = [
  {
    icon: Phone,
    label: "تلفن تماس",
    value: CONTACT_PHONE,
    href: `tel:${CONTACT_PHONE_RAW}`,
    dir: "ltr" as const,
  },
  {
    icon: MapPin,
    label: "آدرس",
    value: "شهرکرد، چهارمحال و بختیاری",
    href: null,
    dir: "rtl" as const,
  },
];

export function ContactView() {
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
            تماس با ما
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow">
            با ما در ارتباط باشید
          </h1>
          <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            سوال یا پیشنهادی دارید؟ خوشحال می‌شویم بشنویم. کارشناسان ما آماده
            پاسخگویی به شما هستند.
          </p>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-12 max-w-3xl mx-auto">
          {CONTACT_INFO.map((info) => (
            <Card
              key={info.label}
              className="p-6 text-center hover:shadow-lg transition-shadow border-border/60"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-honey-light/30 flex items-center justify-center">
                <info.icon className="w-7 h-7 text-honey-dark" />
              </div>
              <div className="text-sm text-muted-foreground mb-1">
                {info.label}
              </div>
              {info.href ? (
                <a
                  href={info.href}
                  dir={info.dir}
                  className="font-bold text-honey-dark hover:underline break-all text-lg"
                >
                  {info.value}
                </a>
              ) : (
                <div
                  dir={info.dir}
                  className="font-bold text-honey-dark text-lg"
                >
                  {info.value}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Side info / CTA */}
        <div className="max-w-3xl mx-auto">
          <Card className="p-6 md:p-8 bg-honey-light/20 border-honey/30">
            <ShoppingBasket className="w-12 h-12 text-honey-dark mb-3" />
            <h3 className="font-extrabold text-xl text-honey-dark mb-2">
              آماده خرید هستید؟
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              برای ثبت سفارش کافیست محصولات را انتخاب کرده و مراحل خرید را
              طی کنید. در صورت نیاز به راهنمایی، با شماره بالا تماس بگیرید.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("products")}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90"
              >
                مشاهده محصولات
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("track")}
                className="border-honey text-honey-dark hover:bg-honey hover:text-primary-foreground"
              >
                پیگیری سفارش
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
