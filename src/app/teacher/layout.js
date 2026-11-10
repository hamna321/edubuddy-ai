import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.js";
import AppShell from "@/components/AppShell.js";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/teacher", label: "My Teaching", icon: "🏫" },
  { href: "/teacher/alerts", label: "Wellbeing Alerts", icon: "💛" },
];

export default function TeacherLayout({ children }) {
  const user = currentUser();
  if (!user) redirect("/login");
  if (user.role !== "teacher") redirect("/" + user.role);
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
