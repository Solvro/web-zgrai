import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function SpacesLayout({ children }: LayoutProps<"/spaces">) {
  return (
    <>
      <DashboardHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
