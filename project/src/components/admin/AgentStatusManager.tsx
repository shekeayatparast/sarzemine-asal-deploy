"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Check,
  X,
  Ban,
  CheckCircle2,
  Loader2,
  Settings2,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { toPersianDigits } from "@/lib/format";
import { RejectReasonDialog } from "./RejectReasonDialog";

interface AgentStatusManagerProps {
  agent: {
    id: string;
    name: string;
    status: string;
    commissionRate: number;
  };
}

export function AgentStatusManager({ agent }: AgentStatusManagerProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [commissionValue, setCommissionValue] = useState<number>(
    agent.commissionRate
  );

  const callPatch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "عملیات ناموفق بود");
        return false;
      }
      toast.success(data.message || "عملیات با موفقیت انجام شد");
      router.refresh();
      return true;
    } catch (err) {
      console.error("[agent status mgr] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const approve = () => callPatch({ status: "active" });
  const block = () => callPatch({ status: "blocked" });
  const activate = () => callPatch({ status: "active" });

  const submitCommission = async () => {
    const ok = await callPatch({ commissionRate: commissionValue });
    if (ok) setCommissionOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {agent.status === "pending" && (
        <>
          <Button
            onClick={approve}
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            تأیید نماینده
          </Button>
          <Button
            variant="destructive"
            onClick={() => setRejectOpen(true)}
            disabled={busy}
          >
            <X className="w-4 h-4" />
            رد درخواست
          </Button>
        </>
      )}

      {agent.status === "active" && (
        <Button
          variant="outline"
          onClick={block}
          disabled={busy}
          className="text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900/20"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Ban className="w-4 h-4" />
          )}
          مسدود کردن
        </Button>
      )}

      {agent.status === "blocked" && (
        <Button
          onClick={activate}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          فعال‌سازی مجدد
        </Button>
      )}

      {agent.status === "rejected" && (
        <Button
          onClick={activate}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          تأیید و فعال‌سازی
        </Button>
      )}

      <Button
        variant="secondary"
        onClick={() => {
          setCommissionValue(agent.commissionRate);
          setCommissionOpen(true);
        }}
        disabled={busy}
      >
        <Settings2 className="w-4 h-4" />
        ویرایش پورسانت
      </Button>

      <Dialog open={commissionOpen} onOpenChange={setCommissionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-honey-dark" />
              تنظیم نرخ پورسانت
            </DialogTitle>
            <DialogDescription>
              نماینده: <b className="text-foreground">{agent.name}</b>
              <br />
              نرخ فعلی: {toPersianDigits(agent.commissionRate)}٪
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <span className="text-4xl font-extrabold text-honey-dark">
                {toPersianDigits(commissionValue)}
              </span>
              <span className="text-2xl text-muted-foreground mr-1">٪</span>
            </div>
            <Slider
              value={[commissionValue]}
              onValueChange={(v) => setCommissionValue(v[0] ?? 0)}
              min={0}
              max={50}
              step={1}
              dir="ltr"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>۰٪</span>
              <span>۲۵٪</span>
              <span>۵۰٪</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission-input" className="text-xs">
                یا مقدار دقیق را وارد کنید
              </Label>
              <Input
                id="commission-input"
                type="number"
                min={0}
                max={100}
                value={commissionValue}
                onChange={(e) => {
                  const v = parseInt(e.target.value || "0", 10);
                  setCommissionValue(isNaN(v) ? 0 : Math.max(0, Math.min(100, v)));
                }}
                disabled={busy}
                dir="ltr"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommissionOpen(false)}
              disabled={busy}
            >
              انصراف
            </Button>
            <Button
              onClick={submitCommission}
              disabled={busy}
              className="bg-honey-gradient text-primary-foreground"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectReasonDialog
        agentId={agent.id}
        agentName={agent.name}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
    </div>
  );
}
