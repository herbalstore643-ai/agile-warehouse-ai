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

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "الموردين | مخازن هيربل سبا" },
      { name: "description", content: "ملفات الموردين وبيانات التواصل والمشتريات." },
      { property: "og:title", content: "الموردين | مخازن هيربل سبا" },
      { property: "og:description", content: "إدارة بيانات الموردين." },
    ],
  }),
  component: Suppliers,
});

function Suppliers() {
  const { t, lang } = useI18n();
  const { isAdmin, has } = useRoles();
  const canManage = isAdmin || has("main_warehouse");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name_ar: "", name_en: "", phone: "", email: "", address: "", contact_person: "" });

  const { data = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setForm({ name_ar: "", name_en: "", phone: "", email: "", address: "", contact_person: "" });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={t("suppliers")}
        action={
          canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("add")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("suppliers")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["name_ar", t("nameAr")],
                      ["name_en", t("nameEn")],
                      ["phone", t("phone")],
                      ["email", t("email")],
                      ["contact_person", t("manager")],
                      ["address", t("location")],
                    ] as const
                  ).map(([k, label]) => (
                    <div key={k} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {t("save")}
                </Button>
              </DialogContent>
            </Dialog>
          )
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.length === 0 && <p className="text-sm text-muted-foreground">{t("noData")}</p>}
        {data.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-6">
              <p className="font-semibold">{lang === "ar" ? s.name_ar : (s.name_en ?? s.name_ar)}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {s.contact_person && <div>{s.contact_person}</div>}
                {s.phone && <div dir="ltr">{s.phone}</div>}
                {s.email && <div dir="ltr">{s.email}</div>}
                {s.address && <div>{s.address}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}