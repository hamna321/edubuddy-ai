"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ROLE_LABEL = { admin: "Administrator", teacher: "Teacher", student: "Student" };
const ROLE_COLOR = {
  admin: "bg-purple-100 text-purple-700",
  teacher: "bg-emerald-100 text-emerald-700",
  student: "bg-sky-100 text-sky-700",
};

export default function AppShell({ user, nav, children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar */}
      <aside className="md:w-64 md:flex-shrink-0 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-[var(--border)] bg-white">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-xl">
            🎓
          </span>
          <div>
            <div className="font-bold leading-tight">EduBuddy</div>
            <div className="text-[11px] uppercase tracking-wide text-gray-400">
              {ROLE_LABEL[user.role]}
            </div>
          </div>
        </div>

        <nav className="flex md:flex-col gap-1 overflow-x-auto p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== `/${user.role}` && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-white/80 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-800">
              {user.name}
            </div>
            <div className="truncate text-xs text-gray-400">{user.email}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${ROLE_COLOR[user.role]}`}>
              {ROLE_LABEL[user.role]}
            </span>
            <button onClick={logout} className="btn-ghost !py-1.5 !px-3 text-xs">
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
