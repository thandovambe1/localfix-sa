import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin-nav";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="container-page py-8 md:py-10">
      <AdminNav name={session.name} email={session.email} role={session.role} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
