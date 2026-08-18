"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PROVINCES } from "@/lib/locations";
import { toPersianDigits } from "@/lib/format";
import { toast } from "sonner";
import {
  User,
  Store,
  MapPin,
  Hash,
  Lock,
  Save,
  Loader2,
  Phone,
  CheckCircle2,
} from "lucide-react";

export interface AgentProfileData {
  id: string;
  name: string;
  phone: string;
  storeName: string;
  province: string;
  city: string;
  address: string;
  nationalId: string | null;
  commissionRate: number;
  balance: number;
  totalSales: number;
  totalOrders: number;
  status: string;
  createdAt: string;
}

export function ProfileForm({
  agent,
}: {
  agent: AgentProfileData;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Profile form state
  const [name, setName] = useState(agent.name);
  const [storeName, setStoreName] = useState(agent.storeName);
  const [province, setProvince] = useState(agent.province);
  const [city, setCity] = useState(agent.city);
  const [address, setAddress] = useState(agent.address);
  const [nationalId, setNationalId] = useState(agent.nationalId || "");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const cities = useMemo(
    () => PROVINCES.find((p) => p.name === province)?.cities || [],
    [province]
  );

  // Reset city when province changes
  useEffect(() => {
    if (mounted && province !== agent.province) {
      setCity("");
    }
  }, [province, mounted, agent.province]);

  const onProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;

    if (name.trim().length < 3) {
      toast.error("نام باید حداقل ۳ کاراکتر باشد");
      return;
    }
    if (storeName.trim().length < 3) {
      toast.error("نام فروشگاه باید حداقل ۳ کاراکتر باشد");
      return;
    }
    if (!province) {
      toast.error("استان را انتخاب کنید");
      return;
    }
    if (!city) {
      toast.error("شهر را انتخاب کنید");
      return;
    }
    if (address.trim().length < 5) {
      toast.error("آدرس باید حداقل ۵ کاراکتر باشد");
      return;
    }
    if (nationalId.trim() && !/^\d{10}$/.test(nationalId.trim())) {
      toast.error("کد ملی باید ۱۰ رقم باشد");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/agent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          storeName: storeName.trim(),
          province,
          city,
          address: address.trim(),
          nationalId: nationalId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "به‌روزرسانی ناموفق بود");
        return;
      }
      toast.success("اطلاعات شما با موفقیت به‌روزرسانی شد");
      router.refresh();
    } catch (err) {
      console.error("[profile form] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;

    if (!currentPassword) {
      toast.error("رمز فعلی را وارد کنید");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("رمز جدید باید حداقل ۶ کاراکتر باشد");
      return;
    }
    if (!/\d/.test(newPassword)) {
      toast.error("رمز جدید باید حداقل یک عدد داشته باشد");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      toast.error("رمز جدید باید حداقل یک حرف داشته باشد");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("تکرار رمز با رمز جدید مطابقت ندارد");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/agent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تغییر رمز ناموفق بود");
        return;
      }
      toast.success("رمز عبور با موفقیت تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("[password form] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
          <User className="w-6 h-6" />
          پروفایل
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          اطلاعات حساب خود را مدیریت کنید
        </p>
      </div>

      {/* Account overview */}
      <Card className="p-5 gap-3 bg-cream-gradient">
        <CardHeader className="px-0">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            وضعیت حساب
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">وضعیت</p>
              <p className="font-bold text-green-600">تأیید شده</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نرخ پورسانت</p>
              <p className="font-bold">{toPersianDigits(agent.commissionRate)}٪</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">کل سفارش‌ها</p>
              <p className="font-bold">{toPersianDigits(agent.totalOrders)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">فروش کل</p>
              <p className="font-bold">
                {toPersianDigits(agent.totalSales.toLocaleString("en-US"))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile form */}
        <Card className="p-5 gap-4">
          <CardHeader className="px-0">
            <CardTitle className="text-base">اطلاعات کاربری</CardTitle>
            <CardDescription>
              نام، نام فروشگاه و آدرس تحویل سفارش‌ها
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={onProfileSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold">
                  نام و نام خانوادگی
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pr-9"
                    disabled={savingProfile}
                    maxLength={80}
                  />
                </div>
              </div>

              {/* Phone (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-bold">
                  شماره موبایل (غیرقابل تغییر)
                </Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={toPersianDigits(agent.phone)}
                    disabled
                    className="pr-9 bg-muted/40"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Store name */}
              <div className="space-y-2">
                <Label htmlFor="storeName" className="font-bold">
                  نام فروشگاه
                </Label>
                <div className="relative">
                  <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="pr-9"
                    disabled={savingProfile}
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Province + City */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-bold">استان</Label>
                  <Select
                    value={province}
                    onValueChange={(v) => setProvince(v)}
                    disabled={savingProfile || !mounted}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب" />
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
                    disabled={savingProfile || !mounted || !province}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب" />
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
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={savingProfile}
                  maxLength={500}
                />
              </div>

              {/* National ID */}
              <div className="space-y-2">
                <Label
                  htmlFor="nationalId"
                  className="font-bold flex items-center gap-1"
                >
                  <Hash className="w-3.5 h-3.5" />
                  کد ملی{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (اختیاری)
                  </span>
                </Label>
                <Input
                  id="nationalId"
                  inputMode="numeric"
                  value={nationalId}
                  onChange={(e) =>
                    setNationalId(
                      toPersianDigits(e.target.value).replace(
                        /[^\d۰-۹]/g,
                        ""
                      )
                    )
                  }
                  disabled={savingProfile}
                  dir="ltr"
                  maxLength={10}
                />
              </div>

              <Button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-11"
              >
                {savingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password form */}
        <div className="space-y-5">
          <Card className="p-5 gap-4">
            <CardHeader className="px-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-honey-dark" />
                تغییر رمز عبور
              </CardTitle>
              <CardDescription>
                برای امنیت بیشتر، رمز عبور خود را تغییر دهید
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={onPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="font-bold">
                    رمز فعلی
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="current-password"
                    placeholder="••••••"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-bold">
                    رمز جدید
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="new-password"
                    placeholder="حداقل ۶ کاراکتر شامل حرف و عدد"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-bold">
                    تکرار رمز جدید
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="new-password"
                    placeholder="تکرار رمز جدید"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-11"
                >
                  {savingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {savingPassword ? "در حال تغییر..." : "تغییر رمز"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Logout / account actions */}
          <Card className="p-5 gap-3">
            <CardHeader className="px-0">
              <CardTitle className="text-base">مدیریت نشست</CardTitle>
              <CardDescription>
                خروج از حساب در این دستگاه
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form action="/api/auth/agent/logout" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  خروج از حساب
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
