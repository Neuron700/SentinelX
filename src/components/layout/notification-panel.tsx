"use client";

import { useRouter } from "next/navigation";
import { Bell, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { useLiveAlerts } from "@/hooks/use-live-data";
import { useUIStore } from "@/store/ui-store";
import { relativeTime } from "@/lib/time/time";
import { cn } from "@/lib/utils/cn";

export function NotificationPanel() {
  const alerts = useLiveAlerts();
  const { notificationsOpen, setNotificationsOpen } = useUIStore();
  const router = useRouter();
  const open = alerts.filter((a) => a.status === "new");
  const recent = [...alerts]
    .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
    .slice(0, 5);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${open.length ? `, ${open.length} unread` : ""}`}
        onClick={() => setNotificationsOpen(!notificationsOpen)}
        className="relative"
      >
        <Bell />
        {open.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--sev-critical)] px-1 font-mono text-[9px] font-bold leading-4 text-black">
            {open.length}
          </span>
        )}
      </Button>

      {notificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setNotificationsOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-1.5 w-80 animate-fade-in rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <p className="text-xs font-semibold">Notifications</p>
              <span className="font-mono text-[10px] text-[var(--muted)]">
                {open.length} unhandled
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Inbox className="size-5 text-[var(--subtle)]" />
                  <p className="text-xs text-[var(--muted)]">
                    No alerts in the local dataset yet.
                  </p>
                </div>
              ) : (
                <ul>
                  {recent.map((alert) => (
                    <li key={alert.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          router.push(`/alerts?alert=${alert.id}`);
                        }}
                        className={cn(
                          "flex w-full flex-col gap-1 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-[var(--surface-2)]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium">
                            {alert.title}
                          </span>
                          <SeverityBadge severity={alert.severity} withIcon={false} />
                        </div>
                        <span className="font-mono text-[10px] text-[var(--subtle)]">
                          {relativeTime(alert.firstSeen)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-[var(--border)] p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-[11px]"
                onClick={() => {
                  setNotificationsOpen(false);
                  router.push("/alerts");
                }}
              >
                View all alerts
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
