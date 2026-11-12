
import { currentUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const user = await currentUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hi {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Ready to continue learning?
        </p>
      </div>
    </div>
  );
}
