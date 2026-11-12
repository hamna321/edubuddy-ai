import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.js";
import AppShell from "@/components/AppShell.js";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/teachers", label: "Teachers", icon: "🧑‍🏫" },
  { href: "/admin/students", label: "Students", icon: "🧑‍🎓" },
  { href: "/admin/classes", label: "Classes", icon: "🏫" },
];

export default async function AdminLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/" + user.role);
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
