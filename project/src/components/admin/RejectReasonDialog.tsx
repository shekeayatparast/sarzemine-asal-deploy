"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RejectReasonDialogProps {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional callback after a successful reject. */
  onDone?: () => void;
}

export function RejectReasonDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
  onDone,
}: RejectReasonDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (reason.trim().length < 5) {
      toast.error("لطفاً دلیل رد را به طور کامل وارد کنید (حداقل ۵ حرف)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "رد کردن نماینده ناموفق بود");
        return;
      }
      toast.success("نماینده با موفقیت رد شد", {
        description: `دلیل: ${reason.trim().slice(0, 60)}${reason.trim().length > 60 ? "…" : ""}`,
      });
      setReason("");
      onOpenChange(false);
      onDone?.();
      router.refresh();
    } catch (err) {
      console.error("[reject agent] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <ShieldX className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <DialogTitle>رد درخواست نمایندگی</DialogTitle>
              <DialogDescription>
                نماینده: <b className="text-foreground">{agentName}</b>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reason" className="font-bold">
            دلیل رد (برای نماینده نمایش داده می‌شود)
          </Label>
          <Textarea
            id="reason"
            placeholder="مثلاً: اطلاعات فروشگاه ناقص است، مدارک قابل قبول نیست، منطقه پوشش‌دهنده دیگر داریم و ..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            disabled={submitting}
            maxLength={500}
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground text-left">
            {reason.length}/۵۰۰
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            انصراف
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={submitting || reason.trim().length < 5}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldX className="w-4 h-4" />
            )}
            {submitting ? "در حال رد..." : "رد کردن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
