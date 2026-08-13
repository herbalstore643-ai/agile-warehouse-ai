import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRoles } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/warehouses")({
  head: () => ({
    meta: [
      { title: "المخازن | مخازن هيربل سبا" },
      { name: "description", content: "إدارة المخزن الرئيسي و35 مخزن فرعي وبياناتها ومسؤوليها." },
      { property: "og:title", content: "المخازن | مخازن هيربل سبا" },
      { property: "og:description", content: "إدارة المخازن الرئيسية والفرعية." },
    ],
  }),
  component: Warehouses,
});

function Warehouses() {
  const { t, lang } = useI18n();
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    code: "",
    name_ar: "",
    name_en: "",
    type: "branch" as "branch" | "main",
    location: "",
    manager_name: "",
    manager_phone: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").order("code");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("warehouses").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setForm({ code: "", name_ar: "", name_en: "", type: "branch", location: "", manager_name: "", manager_phone: "" });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data.filter((w) =>
    `${w.code} ${w.name_ar} ${w.name_en}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title={t("warehouses")}
        action={
          isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("newWarehouse")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("newWarehouse")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("code")} value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
                  <Field label={t("nameAr")} value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} />
                  <Field label={t("nameEn")} value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} />
                  <Field label={t("location")} value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
                  <Field label={t("manager")} value={form.manager_name} onChange={(v) => setForm({ ...form, manager_name: v })} />
                  <Field label={t("phone")} value={form.manager_phone} onChange={(v) => setForm({ ...form, manager_phone: v })} />
                </div>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {t("save")}
                </Button>
              </DialogContent>
            </Dialog>
          )
        }
      />
      <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-xs" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((w) => (
          <Card key={w.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{lang === "ar" ? w.name_ar : w.name_en}</p>
                  <p className="text-xs text-muted-foreground">{w.code}</p>
                </div>
                <Badge variant={w.type === "main" ? "default" : "secondary"}>
                  {w.type === "main" ? t("main") : t("branch")}
                </Badge>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div>{w.location}</div>
                {w.manager_name && <div>{`${t("manager")}: ${w.manager_name}`}</div>}
                {w.manager_phone && <div dir="ltr">{w.manager_phone}</div>}
                <div>{w.is_active ? t("active") : t("inactive")}</div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}