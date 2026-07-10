import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingContent } from "@/components/landing-content";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/documents");

  return <LandingContent />;
}
