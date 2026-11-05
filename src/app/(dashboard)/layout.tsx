import { DashboardProvider } from "@/components/dashboard/dashboard-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardProvider>{children}</DashboardProvider>;
}
