import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRoles } from "@/hooks/useAuth";
import { useLocalName, useSuppliers, useWarehouses, nextDocNo } from "@/hooks/useWms";
import { PageHeader } from "@/components/AppLayout";
import { ItemsEditor, StatusBadgeClass, emptyItem, type DocItem } from "@/components/ItemsEditor";
import { printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/receipts")({
  head: () => ({
    meta: [
      { title: "إذون الاستلام | مخازن هيربل سبا" },
      { name: "description", content: "تسجيل إذون استلام المشتريات من الموردين واعتمادها لترحيل الكميات للمخزن." },
      { property: "og:title", content: "إذون الاستلام | مخازن هيربل سبا" },
      { property: "og:description", content: "إذون استلام المشتريات والاعتماد والترحيل." },
    ],
  }),
  component: Receipts,
});

function Receipts() {
  const { t, lang } = useI18n();
  const { canWrite, isAdmin } = useRoles();
  const qc = useQueryClient();
  const localName = useLocalName();
  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouses = [] } = useWarehouses();

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DocItem[]>([{ ...emptyItem }]);

  const { data = [] } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_receipts")
        .select("*, suppliers(name_ar,name_en), warehouses(name_ar,name_en,code), purchase_receipt_items(qty, unit_price, products(sku,name_ar,name_en))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const valid = items.filter((i) => i.product_id && Number(i.qty) > 0);
      if (!warehouseId || valid.length === 0) throw new Error(t("error"));
      const doc_no = await nextDocNo("PR");
      const { data: rec, error } = await supabase
        .from("purchase_receipts")
        .insert({
          doc_no,
          supplier_id: supplierId || null,
          warehouse_id: warehouseId,
          invoice_no: invoiceNo || null,
          doc_date: docDate,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: iErr } = await supabase.from("purchase_receipt_items").insert(
        valid.map((i) => ({
          receipt_id: rec.id,
          product_id: i.product_id,
          qty: Number(i.qty),
          unit_price: Number(i.unit_price ?? 0),
          batch_no: i.batch_no || null,
          expiry_date: i.expiry_date || null,
        })),
      );
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setItems([{ ...emptyItem }]);
      setInvoiceNo("");
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_receipt", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={t("receipts")}
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t("newReceipt")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("newReceipt")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("supplier")}</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder={t("supplier")} /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{localName(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("warehouse")}</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger><SelectValue placeholder={t("selectWarehouse")} /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.code} — {localName(w)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("invoiceNo")}</Label>
                    <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("date")}</Label>
                    <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
                  </div>
                </div>
                <Label className="mt-2">{t("items")}</Label>
                <ItemsEditor items={items} setItems={setItems} showPrice showBatch />
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {t("createDoc")}
                </Button>
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
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("supplier")}</TableHead>
              <TableHead>{t("warehouse")}</TableHead>
              <TableHead>{t("items")}</TableHead>
              <TableHead>{t("total")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">{t("noData")}</TableCell>
              </TableRow>
            )}
            {data.map((r) => {
              const its = (r.purchase_receipt_items ?? []) as { qty: number; unit_price: number; products: { sku: string; name_ar: string; name_en: string | null } | null }[];
              const total = Number(r.total_amount) || its.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium" dir="ltr">{r.doc_no}</TableCell>
                  <TableCell>{r.doc_date}</TableCell>
                  <TableCell>{localName(r.suppliers as never) || "-"}</TableCell>
                  <TableCell>{localName(r.warehouses as never)}</TableCell>
                  <TableCell>{its.length}</TableCell>
                  <TableCell>{total.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${StatusBadgeClass(r.status)}`}>
                      {t(r.status as TKey)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        printReport(`${t("receipts")} ${r.doc_no}`, its.map((i) => ({
                          [t("sku")]: i.products?.sku ?? "",
                          [lang === "ar" ? t("nameAr") : t("nameEn")]: (lang === "ar" ? i.products?.name_ar : i.products?.name_en) ?? "",
                          [t("qty")]: Number(i.qty),
                          [t("price")]: Number(i.unit_price),
                        })))
                      }
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {isAdmin && r.status !== "approved" && (
                      <Button size="sm" onClick={() => approve.mutate(r.id)} disabled={approve.isPending}>
                        <Check className="h-4 w-4" />
                        {t("approve")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
