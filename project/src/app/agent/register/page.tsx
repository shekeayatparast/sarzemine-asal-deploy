"use client";

import { useState, FormEvent, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
import { PROVINCES } from "@/lib/locations";
import {
  Store,
  User,
  Phone,
  Lock,
  Home,
  MapPin,
  Hash,
  UserPlus,
  Loader2,
  LogIn,
} from "lucide-react";
import { toPersianDigits, isValidIranPhone } from "@/lib/format";

export default function AgentRegisterPage() {
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [address, setAddress] = useState("");
  const [nationalId, setNationalId] = useState("");

  // For client-only validation rendering
  useEffect(() => setMounted(true), []);

  // Cities for selected province
  const cities = useMemo(() => {
    return PROVINCES.find((p) => p.name === province)?.cities || [];
  }, [province]);

  // Reset city when province changes
  useEffect(() => {
    setCity("");
  }, [province]);

  const validate = (): string | null => {
    if (name.trim().length < 3) return "نام باید حداقل ۳ کاراکتر باشد";
    if (!isValidIranPhone(phone.trim()))
      return "شماره موبایل نامعتبر است (مثال: 09123456789)";
    if (password.length < 6)
      return "رمز عبور باید حداقل ۶ کاراکتر باشد";
    if (!/\d/.test(password))
      return "رمز عبور باید حداقل یک عدد داشته باشد";
    if (!/[a-zA-Z]/.test(password))
      return "رمز عبور باید حداقل یک حرف داشته باشد";
    if (storeName.trim().length < 3)
      return "نام فروشگاه باید حداقل ۳ کاراکتر باشد";
    if (!province) return "استان را انتخاب کنید";
    if (!city) return "شهر را انتخاب کنید";
    if (address.trim().length < 5)
      return "آدرس باید حداقل ۵ کاراکتر باشد";
    if (nationalId.trim()) {
      // Convert Persian digits before checking national id format
      const normalizedId = nationalId
        .trim()
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
      if (!/^\d{10}$/.test(normalizedId))
        return "کد ملی باید ۱۰ رقم باشد";
    }
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/agent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password,
          storeName: storeName.trim(),
          province,
          city,
          address: address.trim(),
          nationalId: nationalId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ثبت‌نام ناموفق بود");
        return;
      }
      toast.success("ثبت‌نام شما با موفقیت انجام شد!", {
        description:
          "در انتظار تأیید مدیر. پس از تأیید، به پنل دسترسی خواهید داشت.",
      });
      // Full-page navigation so the new session cookie is sent reliably.
      window.location.assign("/agent");
    } catch (err) {
      console.error("[agent register] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cream-gradient py-8 px-4"
      dir="rtl"
    >
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-honey-gradient flex items-center justify-center mx-auto mb-3 shadow-md">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-honey-dark">
            ثبت‌نام نماینده فروش
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            برای شروع همکاری با سرزمین عسل، فرم زیر را تکمیل کنید
          </p>
        </div>

        <Card className="p-6 gap-5">
          <CardHeader className="px-0">
            <CardTitle className="text-lg">اطلاعات کاربری</CardTitle>
            <CardDescription>
              پس از ثبت‌نام، مدیر سایت شما را بررسی و تأیید می‌کند.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Name + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-bold">
                    نام و نام خانوادگی
                  </Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="مثلاً علی رضایی"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pr-9"
                      disabled={submitting}
                      maxLength={80}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-bold">
                    شماره موبایل
                  </Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="09123456789"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          toPersianDigits(e.target.value).replace(
                            /[^\d۰-۹]/g,
                            ""
                          )
                        )
                      }
                      className="pr-9"
                      dir="ltr"
                      disabled={submitting}
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>

              {/* Password + Store */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold">
                    رمز عبور
                  </Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="حداقل ۶ کاراکتر شامل حرف و عدد"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9"
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeName" className="font-bold">
                    نام فروشگاه / مغازه
                  </Label>
                  <div className="relative">
                    <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="storeName"
                      placeholder="مثلاً عسل فروشی برترین"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="pr-9"
                      disabled={submitting}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>

              {/* Province + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">استان</Label>
                  <Select
                    value={province}
                    onValueChange={(v) => setProvince(v)}
                    disabled={submitting || !mounted}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب استان" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">شهر</Label>
                  <Select
                    value={city}
                    onValueChange={(v) => setCity(v)}
                    disabled={
                      submitting || !mounted || !province
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="font-bold">
                  آدرس کامل
                </Label>
                <Textarea
                  id="address"
                  placeholder="استان، شهر، خیابان، کوچه، پلاک و..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* National ID (optional) */}
              <div className="space-y-2">
                <Label
                  htmlFor="nationalId"
                  className="font-bold flex items-center gap-1"
                >
                  کد ملی{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (اختیاری)
                  </span>
                </Label>
                <div className="relative">
                  <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="nationalId"
                    inputMode="numeric"
                    placeholder="۱۰ رقم"
                    value={nationalId}
                    onChange={(e) =>
                      setNationalId(
                        toPersianDigits(e.target.value).replace(
                          /[^\d۰-۹]/g,
                          ""
                        )
                      )
                    }
                    className="pr-9"
                    dir="ltr"
                    disabled={submitting}
                    maxLength={10}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-11"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {submitting ? "در حال ثبت‌نام..." : "ثبت‌نام نماینده"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="px-0 flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/agent/login">
                <LogIn className="w-4 h-4 ml-1.5" />
                قبلاً ثبت‌نام کرده‌ام — ورود
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 ml-1.5" />
                بازگشت به سایت
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
