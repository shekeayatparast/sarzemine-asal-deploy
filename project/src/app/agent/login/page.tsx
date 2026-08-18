"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Store,
  Phone,
  Lock,
  LogIn,
  Home,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toPersianDigits } from "@/lib/format";

export default function AgentLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!phone.trim() || !password.trim()) {
      toast.error("شماره موبایل و رمز عبور را وارد کنید");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ورود ناموفق بود");
        return;
      }

      if (data.pendingApproval) {
        toast.success("ورود با موفقیت انجام شد", {
          description:
            "حساب شما در انتظار تأیید مدیر است. پس از تأیید به پنل دسترسی خواهید داشت.",
        });
        router.push("/agent");
        router.refresh();
        return;
      }

      toast.success("ورود با موفقیت انجام شد", {
        description: "در حال انتقال به داشبورد...",
      });
      router.push("/agent");
      router.refresh();
    } catch (err) {
      console.error("[agent login] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cream-gradient p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Logo + title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-honey-gradient flex items-center justify-center mx-auto mb-3 shadow-md">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-honey-dark">
            ورود نماینده فروش
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            برای دسترسی به پنل خود وارد شوید
          </p>
        </div>

        <Card className="p-6 gap-5">
          <CardHeader className="px-0">
            <CardTitle className="text-lg">فرم ورود</CardTitle>
            <CardDescription>
              شماره موبایل و رمز عبور خود را وارد کنید
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={onSubmit} className="space-y-4">
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
                    autoComplete="tel"
                    disabled={submitting}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-bold">
                  رمز عبور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9"
                    autoComplete="current-password"
                    disabled={submitting}
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
                  <LogIn className="w-4 h-4" />
                )}
                {submitting ? "در حال ورود..." : "ورود به پنل"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="px-0 flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/agent/register">
                <ShieldCheck className="w-4 h-4 ml-1.5" />
                ثبت‌نام نکرده‌اید؟ ثبت‌نام کنید
              </Link>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/login">
                  ورود ادمین
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <Home className="w-4 h-4 ml-1" />
                  بازگشت به سایت
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
