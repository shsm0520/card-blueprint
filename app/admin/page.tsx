import { redirect } from "next/navigation";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLegacyRedirect() {
  // Permanently move legacy /admin to /dashboard
  redirect("/dashboard");
}
