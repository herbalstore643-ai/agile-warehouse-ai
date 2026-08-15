import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRoles } from "@/hooks/useAuth";
import { useLocalName, useWarehouses, nextDocNo } from "@/hooks/useWms";
import { PageHeader } from "@/components/AppLayout";
import { ItemsEditor, StatusBadgeClass, emptyItem, type DocItem } from "@/components/ItemsEditor";
import { printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/issues")({
  head: () => ({
    meta: [
      { title: "إذون الصرف | مخازن هيربل سبا" },
      { name: "description", content: "إصدار إذون صرف من المخازن للجهات المختلفة مع منع الصرف عند نقص الرصيد." },
      { property: "og:title", content: "إذون الصرف | مخازن هيربل سبا" },
      { property: "og:description", content: "إذون الصرف والاعتماد وخصم الأرصدة." },
    ],
  }),
  component: Issues,
});

function Issues() {
  const { t, lang } = useI18n();
  const { canWrite, isAdmin } = useRoles();
  const qc = useQueryClient();
  const localName = useLocalName();
  const { data: warehouses = [] } = useWarehouses();

  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [reason, setReason] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DocItem[]>([{ ...emptyItem }]);

  const { data = [] } = useQuery({
    queryKey: ["issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_vouchers")
        .select("*, warehouses(name_ar,name_en,code), issue_voucher_items(qty, products(sku,name_ar,name_en))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const valid = items.filter((i) => i.product_id && Number(i.qty) > 0);
      if (!warehouseId || valid.length === 0) throw new Error(t("error"));
      const doc_no = await nextDocNo("IV");
      const { data: v, error } = await supabase
        .from("issue_vouchers")
        .insert({
          doc_no,
          warehouse_id: warehouseId,
          recipient: recipient || null,
          reason: reason || null,
          doc_date: docDate,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: iErr } = await supabase.from("issue_voucher_items").insert(
        valid.map((i) => ({ voucher_id: v.id, product_id: i.product_id, qty: Number(i.qty) })),
      );
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setItems([{ ...emptyItem }]);
      setRecipient("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_issue", { _id: id });
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
        title={t("issues")}
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t("newIssue")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("newIssue")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
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
                    <Label>{t("date")}</Label>
                    <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("recipient")}</Label>
                    <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("reason")}</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>
                </div>
                <Label className="mt-2">{t("items")}</Label>
                <ItemsEditor items={items} setItems={setItems} />
                <Button onClick={() => create.mutate()} disabled={create.isPending}>{t("createDoc")}</Button>
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
              <TableHead>{t("warehouse")}</TableHead>
              <TableHead>{t("recipient")}</TableHead>
              <TableHead>{t("items")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t("noData")}</TableCell>
              </TableRow>
            )}
            {data.map((v) => {
              const its = (v.issue_voucher_items ?? []) as { qty: number; products: { sku: string; name_ar: string; name_en: string | null } | null }[];
              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium" dir="ltr">{v.doc_no}</TableCell>
                  <TableCell>{v.doc_date}</TableCell>
                  <TableCell>{localName(v.warehouses as never)}</TableCell>
                  <TableCell>{v.recipient ?? "-"}</TableCell>
                  <TableCell>{its.length}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${StatusBadgeClass(v.status)}`}>
                      {t(v.status as TKey)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        printReport(`${t("issues")} ${v.doc_no}`, its.map((i) => ({
                          [t("sku")]: i.products?.sku ?? "",
                          [lang === "ar" ? t("nameAr") : t("nameEn")]: (lang === "ar" ? i.products?.name_ar : i.products?.name_en) ?? "",
                          [t("qty")]: Number(i.qty),
                        })))
                      }
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {isAdmin && v.status !== "approved" && (
                      <Button size="sm" onClick={() => approve.mutate(v.id)} disabled={approve.isPending}>
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
