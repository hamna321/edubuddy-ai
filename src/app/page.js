import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

const HOME = { admin: "/admin", teacher: "/teacher", student: "/student" };

export default function Home() {
  const s = getSession();
  redirect(s ? HOME[s.role] || "/login" : "/login");
}
