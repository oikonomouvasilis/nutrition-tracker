"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type SVGProps } from "react";
import { logout } from "@/lib/auth/actions";

type Icon = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

const I = (props: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

const HomeIcon: Icon = (p) => (
  <svg {...I(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);
const AppleIcon: Icon = (p) => (
  <svg {...I(p)}>
    <path d="M12 8c-1.5-2-4-2.5-5.5-1C5 8 5 11 6 13.5 7 16 9 21 12 21s5-5 6-7.5c1-2.5 1-5.5-.5-6.5C16 5.5 13.5 6 12 8Z" />
    <path d="M12 8c.2-2 1.2-3.5 3-4" />
  </svg>
);
const BookIcon: Icon = (p) => (
  <svg {...I(p)}>
    <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
    <path d="M5 4a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2" />
    <path d="M9 8h6M9 12h4" />
  </svg>
);
const ChartIcon: Icon = (p) => (
  <svg {...I(p)}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16v-4M12 16V8M16 16v-6" />
  </svg>
);
const CalendarIcon: Icon = (p) => (
  <svg {...I(p)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);
const TargetIcon: Icon = (p) => (
  <svg {...I(p)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

const NAV: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Αρχική", icon: HomeIcon },
  { href: "/foods", label: "Τροφές", icon: AppleIcon },
  { href: "/meals", label: "Συνταγές", icon: BookIcon },
  { href: "/stats", label: "Στατιστικά", icon: ChartIcon },
  { href: "/history", label: "Ημερολόγιο", icon: CalendarIcon },
  { href: "/plan", label: "Πλάνο", icon: TargetIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-edge bg-surface-2 text-neon-green glow-green">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14c4 0 4-8 8-8s4 8 8 8" />
          <path d="M4 19h16" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        Nutri<span className="text-neon-green">Dash</span>
      </span>
    </Link>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="mt-6 flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Ico }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={[
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            ].join(" ")}
          >
            <span
              className={[
                "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition",
                active ? "bg-neon-green shadow-[0_0_12px_var(--color-neon-green)]" : "bg-transparent",
              ].join(" ")}
            />
            <Ico className={active ? "text-neon-green" : "text-muted group-hover:text-foreground"} />
            <span className="font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ userEmail }: { userEmail: string | null }) {
  return (
    <div className="mt-auto border-t border-edge pt-4">
      {userEmail && (
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-neon-cyan">
            {userEmail[0]?.toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-xs text-muted">{userEmail}</span>
        </div>
      )}
      <form action={logout}>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-edge px-3 py-2 text-sm text-muted transition hover:border-neon-pink/50 hover:text-neon-pink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          Αποσύνδεση
        </button>
      </form>
    </div>
  );
}

export default function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  // Auth σελίδες: χωρίς sidebar/chrome.
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-edge bg-surface/60 px-4 py-5 backdrop-blur-xl md:flex">
        <Brand />
        <NavList pathname={pathname} />
        <SidebarFooter userEmail={userEmail} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-edge bg-surface/70 px-4 backdrop-blur-xl md:hidden">
        <button
          aria-label="Μενού"
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-edge text-muted hover:text-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <Brand />
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-edge bg-surface px-4 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                aria-label="Κλείσιμο"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-edge text-muted hover:text-foreground"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            <SidebarFooter userEmail={userEmail} />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="md:pl-64">{children}</div>
    </div>
  );
}
