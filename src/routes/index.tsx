import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Languages } from "lucide-react";

import logo from "@/assets/logo.png.asset.json";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "دخول النظام | مخازن هيربل سبا" },
      {
        name: "description",
        content: "سجّل الدخول إلى نظام إدارة مخازن هيربل سبا لمتابعة الأرصدة والحركات والتقارير.",
      },
      { property: "og:title", content: "دخول النظام | مخازن هيربل سبا" },
      {
        property: "og:description",
        content: "نظام إدارة المخازن الاحترافي لهيربل سبا.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, toggle, lang, dir } = useI18n();
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else toast.success(t("checkEmail"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(t("error"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div dir={dir} className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <img src={logo.url} alt="Herbal Spa" className="h-20 w-20" />
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">{t("appName")}</h2>
          <p className="mt-4 max-w-sm text-sidebar-foreground/70">{t("tagline")}</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <Stat value="36" label={t("warehouses")} />
            <Stat value="AR / EN" label={t("language")} />
            <Stat value="RBAC" label={t("users")} />
          </div>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© Herbal Spa</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <img src={logo.url} alt="Herbal Spa" className="h-14 w-14 lg:hidden" />
            <Button variant="outline" size="sm" onClick={toggle} className="ms-auto">
              <Languages className="h-4 w-4" />
              {lang === "ar" ? "English" : "العربية"}
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <h1 className="text-xl font-bold">
                {mode === "signin" ? t("signIn") : t("signUp")}
              </h1>
              <form onSubmit={submit} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("fullName")}</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {mode === "signin" ? t("signIn") : t("signUp")}
                </Button>
              </form>
              <Button variant="outline" className="mt-3 w-full" onClick={google}>
                {t("continueGoogle")}
              </Button>
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                {mode === "signin" ? `${t("noAccount")} ${t("signUp")}` : `${t("haveAccount")} ${t("signIn")}`}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-sidebar-accent p-4">
      <p className="text-lg font-bold text-sidebar-primary">{value}</p>
      <p className="mt-1 text-[11px] text-sidebar-foreground/70">{label}</p>
    </div>
  );
}
