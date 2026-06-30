import Link from "next/link";
import { Braces, ClipboardList, LayoutDashboard, LogIn, ShieldCheck, Trophy } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <Braces size={18} />
          </span>
          <span>CodeArena</span>
        </Link>
        <nav className="nav" aria-label="Primary navigation">
          <Link href="/">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link href="/problems">
            <ClipboardList size={16} />
            Problems
          </Link>
          <Link href="/contests">
            <Trophy size={16} />
            Contests
          </Link>
          <Link href="/admin/problems">
            <ShieldCheck size={16} />
            Admin
          </Link>
          <Link href="/login">
            <LogIn size={16} />
            Login
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
