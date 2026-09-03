import { redirect } from "next/navigation";

/** Entry point: middleware sends unauthenticated visitors to /login. */
export default function Home() {
  redirect("/dashboard");
}
