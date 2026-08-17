import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  Truck,
  Users,
  FileBarChart,
  ArrowLeftRight,
  LogOut,
  Languages,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import logo from "@/assets/logo.png.asset.json";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRoles, useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const nav: { to: string; key: TKey; icon: typeof Warehouse }[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/warehouses", key: "warehouses", icon: Warehouse },
  { to: "/products", key: "products", icon: Package },
  { to: "/receipts", key: "receipts", icon: ArrowDownToLine },
  { to: "/issues", key: "issues", icon: ArrowUpFromLine },
  { to: "/transfers", key: "transfers", icon: ArrowLeftRight },
  { to: "/ledger", key: "ledger", icon: BookOpen },
  { to: "/movements", key: "movements", icon: ArrowLeftRight },
  { to: "/suppliers", key: "suppliers", icon: Truck },
  { to: "/reports", key: "reports", icon: FileBarChart },
  { to: "/users", key: "users", icon: Users },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { t, toggle, lang } = useI18n();
  const { user } = useSession();
  const { roles } = useRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <img src={logo.url} alt="Herbal Spa" className="h-11 w-11 rounded-full bg-white p-1" />
          <div className="leading-tight">
            <p className="text-sm font-bold">{t("appName")}</p>
            <p className="text-[11px] text-sidebar-foreground/60">WMS</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map(({ to, key, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
            >
              <Icon className="h-4 w-4" />
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/70">
          <p className="truncate font-medium text-sidebar-foreground">{user?.email}</p>
          <p className="mt-1">{roles.map((r) => t(r as TKey)).join(" · ")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <img src={logo.url} alt="Herbal Spa" className="h-8 w-8" />
            <span className="text-sm font-bold">{t("appName")}</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">{t("tagline")}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggle}>
              <Languages className="h-4 w-4" />
              {lang === "ar" ? "English" : "العربية"}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {t("signOut")}
            </Button>
          </div>
        </header>
        <div className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 md:hidden">
          {nav.map(({ to, key, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              {t(key)}
            </Link>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}