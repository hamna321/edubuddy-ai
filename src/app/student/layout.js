import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.js";
import AppShell from "@/components/AppShell.js";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/student", label: "Home", icon: "🏠" },
  { href: "/student/academic", label: "Academic Help", icon: "📘" },
  { href: "/student/emotional", label: "Emotional Support", icon: "💛" },
];

export default function StudentLayout({ children }) {
  const user = currentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/" + user.role);
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
