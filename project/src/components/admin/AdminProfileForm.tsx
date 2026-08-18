"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Lock,
  Save,
  KeyRound,
  Shield,
  Loader2,
  CheckCircle2,
  Hash,
  CalendarClock,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  toPersianDigits,
  formatJalaliDateTime,
} from "@/lib/format";
import { isStrongPassword } from "@/lib/format";

export interface AdminProfileData {
  id: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function AdminProfileForm({
  admin,
}: {
  admin: AdminProfileData;
}) {
  // ── Profile form state ───────────────────────────────────────────────
  const [name, setName] = useState(admin.name);
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password form state ──────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Profile info submit ──────────────────────────────────────────────
  const onProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;

    if (name.trim().length < 3) {
      toast.error("نام باید حداقل ۳ کاراکتر باشد");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "به‌روزرسانی ناموفق بود");
        return;
      }
      toast.success(data.message || "اطلاعات شما با موفقیت به‌روزرسانی شد");
      // Reload to reflect updated sidebar/header info
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      console.error("[admin profile form] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password change submit ───────────────────────────────────────────
  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;

    if (!currentPassword) {
      toast.error("رمز فعلی را وارد کنید");
      return;
    }
    const strength = isStrongPassword(newPassword);
    if (!strength.ok) {
      toast.error(strength.reason || "رمز جدید قوی نیست");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("تکرار رمز با رمز جدید مطابقت ندارد");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/profile", {
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
      toast.success(data.message || "رمز عبور با موفقیت تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      console.error("[admin password form] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = admin.role === "super_admin" ? "مدیر ارشد" : "مدیر";
  const lastLogin = admin.lastLoginAt
    ? formatJalaliDateTime(admin.lastLoginAt)
    : "—";
  const memberSince = formatJalaliDateTime(admin.createdAt);
  const lastUpdate = formatJalaliDateTime(admin.updatedAt);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
          <User className="w-6 h-6" />
          پروفایل مدیریت
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          اطلاعات حساب کاربری و رمز عبور خود را مدیریت کنید
        </p>
      </div>

      {/* Account overview */}
      <Card className="p-5 gap-3 bg-cream-gradient">
        <CardHeader className="px-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-honey-dark" />
            نمای کلی حساب
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Username */}
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">نام کاربری</p>
                <p className="font-bold text-foreground truncate" dir="ltr">
                  {admin.username}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">نقش</p>
                <Badge
                  variant="outline"
                  className="bg-honey-light/30 text-honey-dark border-honey/30 text-[11px]"
                >
                  {roleLabel}
                </Badge>
              </div>
            </div>

            {/* Active status */}
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">وضعیت حساب</p>
                <p className="font-bold text-emerald-600">
                  {admin.active ? "فعال" : "غیرفعال"}
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">نام نمایشی</p>
                <p className="font-bold text-foreground truncate">
                  {admin.name}
                </p>
              </div>
            </div>

            {/* Last login */}
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">آخرین ورود</p>
                <p className="font-bold text-foreground truncate">
                  {lastLogin}
                </p>
              </div>
            </div>

            {/* Member since */}
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">تاریخ عضویت</p>
                <p className="font-bold text-foreground truncate">
                  {memberSince}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            آخرین به‌روزرسانی: {lastUpdate} • شناسه:{" "}
            <span dir="ltr" className="font-mono">
              {toPersianDigits(admin.id.slice(-8))}
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile info form */}
        <Card className="p-5 gap-4">
          <CardHeader className="px-0">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-5 h-5 text-honey-dark" />
              اطلاعات کاربری
            </CardTitle>
            <CardDescription>
              نام نمایشی خود را ویرایش کنید. نام کاربری قابل تغییر نیست.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={onProfileSubmit} className="space-y-4">
              {/* Username (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="username" className="font-bold">
                  نام کاربری (غیرقابل تغییر)
                </Label>
                <div className="relative">
                  <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={admin.username}
                    disabled
                    className="pr-9 bg-muted/40"
                    dir="ltr"
                  />
                </div>
              </div>

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
                    placeholder="نام خود را وارد کنید"
                  />
                </div>
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

        {/* Password change form */}
        <Card className="p-5 gap-4">
          <CardHeader className="px-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-honey-dark" />
              تغییر رمز عبور
            </CardTitle>
            <CardDescription>
              برای امنیت بیشتر، رمز عبور خود را به‌صورت دوره‌ای تغییر دهید.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={onPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="font-bold">
                  رمز فعلی
                </Label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-9"
                    disabled={savingPassword}
                    autoComplete="current-password"
                    placeholder="••••••"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="font-bold">
                  رمز جدید
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-9"
                    disabled={savingPassword}
                    autoComplete="new-password"
                    placeholder="حداقل ۶ کاراکتر شامل حرف و عدد"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-bold">
                  تکرار رمز جدید
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-9"
                    disabled={savingPassword}
                    autoComplete="new-password"
                    placeholder="تکرار رمز جدید"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={savingPassword}
                className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-11"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {savingPassword ? "در حال تغییر..." : "تغییر رمز"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
