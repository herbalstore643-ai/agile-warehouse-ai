import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, FileSpreadsheet, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRoles } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppLayout";
import { exportToExcel, printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "الأصناف | مخازن هيربل سبا" },
      { name: "description", content: "كتالوج الأصناف بالباركود والصور والأسماء بالعربي والإنجليزي والأرصدة." },
      { property: "og:title", content: "الأصناف | مخازن هيربل سبا" },
      { property: "og:description", content: "كتالوج الأصناف والأرصدة والحدود الدنيا." },
    ],
  }),
  component: Products,
});

const empty = {
  sku: "",
  barcode: "",
  name_ar: "",
  name_en: "",
  unit: "pcs",
  image_url: "",
  min_qty: "0",
  max_qty: "",
  purchase_price: "0",
  notes: "",
};

function Products() {
  const { t, lang } = useI18n();
  const { isAdmin, has } = useRoles();
  const canManage = isAdmin || has("main_warehouse");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(empty);

  const { data = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, stock_balances(qty)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || null,
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim() || null,
        unit: form.unit,
        image_url: form.image_url.trim() || null,
        min_qty: Number(form.min_qty) || 0,
        max_qty: form.max_qty ? Number(form.max_qty) : null,
        purchase_price: Number(form.purchase_price) || 0,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data
    .filter((p) => `${p.sku} ${p.barcode ?? ""} ${p.name_ar} ${p.name_en ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .map((p) => ({
      ...p,
      total: (p.stock_balances as { qty: number }[] | null)?.reduce((s, b) => s + Number(b.qty), 0) ?? 0,
    }));

  const exportRows = rows.map((p) => ({
    [t("sku")]: p.sku,
    [t("barcode")]: p.barcode ?? "",
    [t("nameAr")]: p.name_ar,
    [t("nameEn")]: p.name_en ?? "",
    [t("unit")]: p.unit,
    [t("balance")]: p.total,
    [t("minQty")]: p.min_qty,
    [t("purchasePrice")]: p.purchase_price,
  }));

  return (
    <>
      <PageHeader
        title={t("products")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToExcel("products", exportRows)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => printReport(t("products"), exportRows)}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
            {canManage && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    {t("newProduct")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("newProduct")}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <F label={t("sku")} v={form.sku} on={(v) => setForm({ ...form, sku: v })} />
                    <F label={t("barcode")} v={form.barcode} on={(v) => setForm({ ...form, barcode: v })} />
                    <F label={t("nameAr")} v={form.name_ar} on={(v) => setForm({ ...form, name_ar: v })} />
                    <F label={t("nameEn")} v={form.name_en} on={(v) => setForm({ ...form, name_en: v })} />
                    <F label={t("unit")} v={form.unit} on={(v) => setForm({ ...form, unit: v })} />
                    <F label={t("imageUrl")} v={form.image_url} on={(v) => setForm({ ...form, image_url: v })} />
                    <F label={t("minQty")} v={form.min_qty} on={(v) => setForm({ ...form, min_qty: v })} />
                    <F label={t("maxQty")} v={form.max_qty} on={(v) => setForm({ ...form, max_qty: v })} />
                    <F label={t("purchasePrice")} v={form.purchase_price} on={(v) => setForm({ ...form, purchase_price: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("notes")}</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <Button onClick={() => create.mutate()} disabled={create.isPending}>
                    {t("save")}
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />
      <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-xs" />
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sku")}</TableHead>
              <TableHead>{lang === "ar" ? t("nameAr") : t("nameEn")}</TableHead>
              <TableHead>{t("barcode")}</TableHead>
              <TableHead>{t("unit")}</TableHead>
              <TableHead>{t("balance")}</TableHead>
              <TableHead>{t("minQty")}</TableHead>
              <TableHead>{t("purchasePrice")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.sku}</TableCell>
                <TableCell>{lang === "ar" ? p.name_ar : (p.name_en ?? p.name_ar)}</TableCell>
                <TableCell dir="ltr">{p.barcode ?? "-"}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell className={p.total <= Number(p.min_qty) ? "font-bold text-destructive" : "font-semibold"}>
                  {p.total}
                </TableCell>
                <TableCell>{Number(p.min_qty)}</TableCell>
                <TableCell>{Number(p.purchase_price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}