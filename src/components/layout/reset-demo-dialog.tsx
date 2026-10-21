"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Database, Loader2, RotateCcw } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDB } from "@/lib/storage/db";
import { resetDemoData } from "@/data/seed";

export function ResetDemoDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const counts = useLiveQuery(async () => {
    if (typeof window === "undefined") return { events: 0, alerts: 0, incidents: 0 };
    const db = getDB();
    return {
      events: await db.events.count(),
      alerts: await db.alerts.count(),
      incidents: await db.incidents.count(),
    };
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemoData(getDB());
      toast.success("Demo dataset restored", {
        description: "All local changes were replaced with the original synthetic seed.",
      });
      router.refresh();
      onClose();
    } catch (error) {
      toast.error("Reset failed", {
        description:
          error instanceof Error ? error.message : "Could not reset the demo data.",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reset demo dataset?"
      description="This replaces every locally stored record with the original synthetic seed."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={resetting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            {resetting ? "Resetting…" : "Reset demo"}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-[var(--muted)]">
        <p>
          The reset will discard alerts you acknowledged, incidents you created or
          edited, notes, findings, playbook progress, rule toggles, scenario
          results, and the local audit trail.
        </p>
        <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-[11px]">
          <Database className="size-4 text-[var(--accent)]" />
          <span>
            current: {counts?.events ?? 0} events · {counts?.alerts ?? 0} alerts ·{" "}
            {counts?.incidents ?? 0} incidents
          </span>
        </div>
        <p className="text-[11px]">
          All data is synthetic. Resetting cannot affect any real system.
        </p>
      </div>
    </Dialog>
  );
}
