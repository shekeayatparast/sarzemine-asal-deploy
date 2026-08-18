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
  Crown,
  User,
  Lock,
  LogIn,
  Home,
  Store,
  Loader2,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!username.trim() || !password.trim()) {
      toast.error("نام کاربری و رمز عبور را وارد کنید");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ورود ناموفق بود");
        return;
      }

      toast.success("ورود با موفقیت انجام شد", {
        description: "در حال انتقال به داشبورد مدیریت...",
      });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error("[admin login] error:", err);
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
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-honey-dark">
            ورود به پنل مدیریت
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            سرزمین عسل — مدیریت نمایندگان و گزارش‌ها
          </p>
        </div>

        <Card className="p-6 gap-5">
          <CardHeader className="px-0">
            <CardTitle className="text-lg">فرم ورود مدیر</CardTitle>
            <CardDescription>
              نام کاربری و رمز عبور مدیریت را وارد کنید
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-bold">
                  نام کاربری
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pr-9"
                    autoComplete="username"
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
                {submitting ? "در حال ورود..." : "ورود به پنل مدیریت"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="px-0 flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/agent/login">
                <Store className="w-4 h-4 ml-1.5" />
                ورود به پنل نماینده
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 ml-1" />
                بازگشت به سایت
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
