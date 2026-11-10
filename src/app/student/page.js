import Link from "next/link";
import { currentUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export default function StudentHome() {
  const user = currentUser();
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hi {user.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">What would you like to do today?</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/student/academic"
          className="group card overflow-hidden p-8 transition hover:shadow-pop"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-3xl">
            📘
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Academic Help</h2>
          <p className="mt-2 text-sm text-gray-500">
            Chat with your class notes. Ask questions and get answers tailored to your
            level — powered by your teachers&rsquo; uploaded material.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-brand-600 group-hover:underline">
            Start learning →
          </span>
        </Link>

        <Link
          href="/student/emotional"
          className="group card overflow-hidden p-8 transition hover:shadow-pop"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-3xl">
            💛
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Emotional Support</h2>
          <p className="mt-2 text-sm text-gray-500">
            Not feeling great? Talk to Robo by voice or text, or let the camera read how
            you&rsquo;re feeling. We&rsquo;ll gently let a teacher know if you need support.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-pink-600 group-hover:underline">
            Talk to Robo →
          </span>
        </Link>
      </div>
    </div>
  );
}
