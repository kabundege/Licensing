import { auth } from "@/auth";
import routes from "@/constants/routeNames";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(routes.dashboard.url);
  }
  redirect(routes.login.url);
}
