import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Printer, FileSpreadsheet, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRoles } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppLayout";
import { StatusBadgeClass } from "@/components/ItemsEditor";
import { nextDocNo, useLocalName, useWarehouses } from "@/hooks/useWms";
import { exportToExcel, printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/counts")({
  head: () => ({
    meta: [
      { title: "الجرد | مخازن هيربل سبا" },
      { name: "description", content: "أوامر الجرد بالباركود مع الرصيد الدفتري والكمية الفعلية والفروقات وتسوية الأرصدة." },
      { property: "og:title", content: "الجرد | مخازن هيربل سبا" },
      { property: "og:description", content: "جرد المخازن وتسوية الفروقات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Counts,
});

type Item = {
  id: string;
  product_id: string;
  book_qty: number;
  actual_qty: number | null;
  products: { sku: string; barcode: string | null; name_ar: string; name_en: string | null } | null;
};

function Counts() {
  const { t } = useI18n();
  const { isAdmin, canWrite } = useRoles();
  const qc = useQueryClient();
  const localName = useLocalName();
  const { data: warehouses = [] } = useWarehouses();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scan, setScan] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: counts = [] } = useQuery({
    queryKey: ["counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_counts")
        .select("*, warehouses(name_ar,name_en,code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["count-items", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_count_items")
        .select("id, product_id, book_qty, actual_qty, products(sku,barcode,name_ar,name_en)")
        .eq("count_id", activeId!);
      if (error) throw error;
      return data as unknown as Item[];
    },
  });

  const createCount = useMutation({
    mutationFn: async () => {
      if (!warehouseId) throw new Error(t("selectWarehouse"));
      const doc_no = await nextDocNo("IC");
      const { data: created, error } = await supabase
        .from("inventory_counts")
        .insert({ doc_no, warehouse_id: warehouseId, scope: "full", status: "in_progress" })
        .select("id")
        .single();
      if (error) throw error;
      const { data: balances, error: bErr } = await supabase
        .from("stock_balances")
        .select("product_id, qty")
        .eq("warehouse_id", warehouseId);
      if (bErr) throw bErr;
      if (balances?.length) {
        const { error: iErr } = await supabase.from("inventory_count_items").insert(
          balances.map((b) => ({
            count_id: created.id,
            product_id: b.product_id,
            book_qty: Number(b.qty),
          })),
        );
        if (iErr) throw iErr;
      }
      return created.id;
    },
    onSuccess: (id) => {
      toast.success(t("saved"));
      setOpen(false);
      setActiveId(id);
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveItems = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(draft);
      for (const [id, v] of entries) {
        const { error } = await supabase
          .from("inventory_count_items")
          .update({ actual_qty: v === "" ? null : Number(v) })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft({});
      qc.invalidateQueries({ queryKey: ["count-items", activeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_count", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["counts"] });
      qc.invalidateQueries({ queryKey: ["count-items", activeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = counts.find((c) => c.id === activeId);

  const rows = items.map((it) => {
    const actual = draft[it.id] ?? (it.actual_qty == null ? "" : String(it.actual_qty));
    return { it, actual, diff: actual === "" ? null : Number(actual) - Number(it.book_qty) };
  });

  const printRows = rows.map((r) => ({
    [t("sku")]: r.it.products?.sku ?? "",
    [t("products")]: localName(r.it.products),
    [t("bookQty")]: Number(r.it.book_qty),
    [t("actualQty")]: r.actual === "" ? "-" : Number(r.actual),
    [t("difference")]: r.diff ?? "-",
  }));

  function handleScan(code: string) {
    const found = items.find(
      (i) => i.products?.barcode === code.trim() || i.products?.sku === code.trim(),
    );
    if (!found) {
      toast.error(t("notFound"));
      return;
    }
    const el = document.getElementById(`actual-${found.id}`) as HTMLInputElement | null;
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  if (active) {
    return (
      <>
        <PageHeader
          title={`${t("counts")} — ${active.doc_no}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>
                <ArrowRight className="h-4 w-4" />
                {t("back")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToExcel(active.doc_no, printRows)}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => printReport(active.doc_no, printRows)}>
                <Printer className="h-4 w-4" />
                PDF
              </Button>
              {active.status !== "approved" && canWrite && (
                <Button size="sm" onClick={() => saveItems.mutate()} disabled={saveItems.isPending}>
                  {t("saveCount")}
                </Button>
              )}
              {active.status !== "approved" && isAdmin && (
                <Button size="sm" variant="secondary" onClick={() => approve.mutate(active.id)}>
                  {t("approveCount")}
                </Button>
              )}
            </div>
          }
        />
        <div className="mb-4 max-w-sm space-y-1.5">
          <Label>{t("scan")}</Label>
          <Input
            dir="ltr"
            placeholder={t("scanHint")}
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleScan(scan);
                setScan("");
              }
            }}
          />
        </div>
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sku")}</TableHead>
                <TableHead>{t("products")}</TableHead>
                <TableHead>{t("bookQty")}</TableHead>
                <TableHead>{t("actualQty")}</TableHead>
                <TableHead>{t("difference")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t("noData")}
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ it, actual, diff }) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.products?.sku}</TableCell>
                  <TableCell>{localName(it.products)}</TableCell>
                  <TableCell>{Number(it.book_qty)}</TableCell>
                  <TableCell>
                    <Input
                      id={`actual-${it.id}`}
                      className="w-28"
                      type="number"
                      step="any"
                      disabled={active.status === "approved"}
                      value={actual}
                      onChange={(e) => setDraft({ ...draft, [it.id]: e.target.value })}
                    />
                  </TableCell>
                  <TableCell
                    className={diff == null ? "" : diff === 0 ? "" : diff > 0 ? "text-emerald-600" : "text-destructive"}
                  >
                    {diff ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("counts")}
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t("newCount")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("newCount")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("warehouse")}</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectWarehouse")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.code} — {localName(w)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => createCount.mutate()} disabled={createCount.isPending}>
                    {t("startCount")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("docNo")}</TableHead>
              <TableHead>{t("warehouse")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {counts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {counts.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.doc_no}</TableCell>
                <TableCell>{localName(c.warehouses as { name_ar: string; name_en: string } | null)}</TableCell>
                <TableCell>
                  <Badge className={StatusBadgeClass(c.status)} variant="secondary">
                    {t(c.status as TKey)}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(c.started_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setActiveId(c.id)}>
                    {t("details")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
