import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRoleRedirect } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.role) {
    redirect(getRoleRedirect(session.user.role));
  }

  redirect("/login");
}
