"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ShieldHalf, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_GROUPS, NAV_ITEMS } from "./nav-items";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileNavOpen,
    setMobileNavOpen,
  } = useUIStore();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--border)] px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="SentinelX overview"
          onClick={() => setMobileNavOpen(false)}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
            <ShieldHalf className="size-4" />
          </span>
          {!sidebarCollapsed && (
            <span className="truncate">
              <span className="block text-sm font-semibold tracking-tight">
                SentinelX
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--subtle)]">
                defense intelligence
              </span>
            </span>
          )}
        </Link>
        <button
          type="button"
          className="ml-auto text-[var(--muted)] md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="mb-4">
              {!sidebarCollapsed && (
                <p className="mb-1 px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--subtle)]">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={sidebarCollapsed ? item.label : undefined}
                        onClick={() => setMobileNavOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                          active
                            ? "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]"
                            : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                          sidebarCollapsed && "justify-center px-0"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            active
                              ? "text-[var(--accent)]"
                              : "text-[var(--subtle)] group-hover:text-[var(--muted)]"
                          )}
                        />
                        {!sidebarCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {active && !sidebarCollapsed && (
                          <span className="ml-auto size-1.5 rounded-full bg-[var(--accent)]" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-2">
        <div className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-2)] px-2.5 py-2">
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--success)]">
                <span className="size-1.5 animate-pulse-dot rounded-full bg-[var(--success)]" />
                Local demo
              </p>
              <p className="truncate font-mono text-[9px] text-[var(--subtle)]">
                v1.0.0 · synthetic data
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:inline-flex"
          >
            {sidebarCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 md:block",
          sidebarCollapsed ? "w-16" : "w-[232px]"
        )}
      >
        {content}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[260px] animate-fade-in border-r border-[var(--border)] bg-[var(--surface)]">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
