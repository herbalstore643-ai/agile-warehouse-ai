import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X, Truck, PackageCheck, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRoles } from "@/hooks/useAuth";
import { useLocalName, useWarehouses, useMyWarehouses, nextDocNo } from "@/hooks/useWms";
import { PageHeader } from "@/components/AppLayout";
import { ItemsEditor, StatusBadgeClass, emptyItem, type DocItem } from "@/components/ItemsEditor";
import { printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({
    meta: [
      { title: "طلبات التحويل | مخازن هيربل سبا" },
      { name: "description", content: "دورة تحويل كاملة بين المخازن: طلب، اعتماد، شحن بالسائق والمرسل، استلام وتوثيق الفروقات." },
      { property: "og:title", content: "طلبات التحويل | مخازن هيربل سبا" },
      { property: "og:description", content: "اعتماد وشحن واستلام التحويلات بين المخازن." },
    ],
  }),
  component: Transfers,
});

type TItem = {
  id: string;
  product_id: string;
  requested_qty: number;
  sent_qty: number;
  received_qty: number;
  products: { sku: string; name_ar: string; name_en: string | null } | null;
};

function Transfers() {
  const { t, lang } = useI18n();
  const { canWrite, isAdmin } = useRoles();
  const qc = useQueryClient();
  const localName = useLocalName();
  const { data: warehouses = [] } = useWarehouses();
  const { data: myWarehouses = [] } = useMyWarehouses();

  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [fromW, setFromW] = useState("");
  const [toW, setToW] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DocItem[]>([{ ...emptyItem }]);

  const [shipOpen, setShipOpen] = useState<string | null>(null);
  const [recvOpen, setRecvOpen] = useState<string | null>(null);
  const [driver, setDriver] = useState("");
  const [sender, setSender] = useState("");
  const [receiver, setReceiver] = useState("");
  const [review, setReview] = useState("");
  const [qtyEdit, setQtyEdit] = useState<Record<string, string>>({});

  const { data = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfer_requests")
        .select(
          "*, from:warehouses!transfer_requests_from_warehouse_id_fkey(name_ar,name_en,code), to:warehouses!transfer_requests_to_warehouse_id_fkey(name_ar,name_en,code), transfer_items(id, product_id, requested_qty, sent_qty, received_qty, products(sku,name_ar,name_en))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const valid = items.filter((i) => i.product_id && Number(i.qty) > 0);
      if (!fromW || !toW || fromW === toW || valid.length === 0) throw new Error(t("error"));
      const doc_no = await nextDocNo("TR");
      const { data: u } = await supabase.auth.getUser();
      const { data: tr, error } = await supabase
        .from("transfer_requests")
        .insert({
          doc_no,
          from_warehouse_id: fromW,
          to_warehouse_id: toW,
          doc_date: docDate,
          request_notes: notes || null,
          status: "pending",
          requested_by: u.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: iErr } = await supabase.from("transfer_items").insert(
        valid.map((i) => ({ transfer_id: tr.id, product_id: i.product_id, requested_qty: Number(i.qty) })),
      );
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setItems([{ ...emptyItem }]);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args: Record<string, unknown> }) => {
      const { error } = await supabase.rpc(fn as never, args as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setShipOpen(null);
      setRecvOpen(null);
      setQtyEdit({});
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function saveQtys(field: "sent_qty" | "received_qty", its: TItem[]) {
    for (const it of its) {
      const raw = qtyEdit[it.id];
      const value = raw === undefined ? (field === "sent_qty" ? it.requested_qty : it.sent_qty) : Number(raw);
      const { error } = await supabase.from("transfer_items").update({ [field]: value }).eq("id", it.id);
      if (error) throw error;
    }
  }

  const rows = data.filter((r) => {
    if (tab === "incoming") return myWarehouses.includes(r.to_warehouse_id);
    if (tab === "outgoing") return myWarehouses.includes(r.from_warehouse_id);
    if (tab === "awaitingMe")
      return (
        (r.status === "pending" && (isAdmin || myWarehouses.includes(r.from_warehouse_id))) ||
        (r.status === "preparing" && (isAdmin || myWarehouses.includes(r.from_warehouse_id))) ||
        (r.status === "shipped" && (isAdmin || myWarehouses.includes(r.to_warehouse_id)))
      );
    return true;
  });

  const current = data.find((r) => r.id === (shipOpen ?? recvOpen));
  const currentItems = ((current?.transfer_items ?? []) as TItem[]) ?? [];

  return (
    <>
      <PageHeader
        title={t("transfers")}
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t("newTransfer")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("newTransfer")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("fromWarehouse")}</Label>
                    <Select value={fromW} onValueChange={setFromW}>
                      <SelectTrigger><SelectValue placeholder={t("selectWarehouse")} /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.code} — {localName(w)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("toWarehouse")}</Label>
                    <Select value={toW} onValueChange={setToW}>
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
                    <Label>{t("notes")}</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">{t("all")}</TabsTrigger>
          <TabsTrigger value="incoming">{t("incoming")}</TabsTrigger>
          <TabsTrigger value="outgoing">{t("outgoing")}</TabsTrigger>
          <TabsTrigger value="awaitingMe">{t("awaitingMe")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("docNo")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("fromWarehouse")}</TableHead>
              <TableHead>{t("toWarehouse")}</TableHead>
              <TableHead>{t("items")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t("noData")}</TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const its = (r.transfer_items ?? []) as TItem[];
              const canSource = isAdmin || myWarehouses.includes(r.from_warehouse_id);
              const canDest = isAdmin || myWarehouses.includes(r.to_warehouse_id);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium" dir="ltr">{r.doc_no}</TableCell>
                  <TableCell>{r.doc_date}</TableCell>
                  <TableCell>{localName(r.from as never)}</TableCell>
                  <TableCell>{localName(r.to as never)}</TableCell>
                  <TableCell>{its.length}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${StatusBadgeClass(r.status)}`}>
                      {t(r.status as TKey)}
                    </span>
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        printReport(`${t("transfers")} ${r.doc_no}`, its.map((i) => ({
                          [t("sku")]: i.products?.sku ?? "",
                          [lang === "ar" ? t("nameAr") : t("nameEn")]:
                            (lang === "ar" ? i.products?.name_ar : i.products?.name_en) ?? i.products?.name_ar ?? "",
                          [t("requestedQty")]: Number(i.requested_qty),
                          [t("sentQty")]: Number(i.sent_qty),
                          [t("receivedQty")]: Number(i.received_qty),
                          [t("qtyDiff")]: Number(i.sent_qty) - Number(i.received_qty),
                        })))
                      }
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {r.status === "pending" && canSource && (
                      <>
                        <Button size="sm" onClick={() => run.mutate({ fn: "approve_transfer", args: { _id: r.id } })}>
                          <Check className="h-4 w-4" />
                          {t("approve")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const reason = window.prompt(t("rejectionReason")) ?? "";
                            if (reason) run.mutate({ fn: "reject_transfer", args: { _id: r.id, _reason: reason } });
                          }}
                        >
                          <X className="h-4 w-4" />
                          {t("reject")}
                        </Button>
                      </>
                    )}
                    {r.status === "preparing" && canSource && (
                      <Button size="sm" onClick={() => { setQtyEdit({}); setShipOpen(r.id); }}>
                        <Truck className="h-4 w-4" />
                        {t("ship")}
                      </Button>
                    )}
                    {r.status === "shipped" && canDest && (
                      <Button size="sm" onClick={() => { setQtyEdit({}); setRecvOpen(r.id); }}>
                        <PackageCheck className="h-4 w-4" />
                        {t("receive")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!shipOpen} onOpenChange={(o) => !o && setShipOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("shipTransfer")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("driver")}</Label>
              <Input value={driver} onChange={(e) => setDriver(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("sender")}</Label>
              <Input value={sender} onChange={(e) => setSender(e.target.value)} />
            </div>
          </div>
          <QtyRows items={currentItems} field="sent" qtyEdit={qtyEdit} setQtyEdit={setQtyEdit} />
          <Button
            disabled={run.isPending}
            onClick={async () => {
              try {
                await saveQtys("sent_qty", currentItems);
                run.mutate({ fn: "ship_transfer", args: { _id: shipOpen, _driver: driver, _sender: sender } });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {t("confirm")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recvOpen} onOpenChange={(o) => !o && setRecvOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("receiveTransfer")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("receiver")}</Label>
              <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("branchReview")}</Label>
              <Input value={review} onChange={(e) => setReview(e.target.value)} />
            </div>
          </div>
          <QtyRows items={currentItems} field="received" qtyEdit={qtyEdit} setQtyEdit={setQtyEdit} />
          <Button
            disabled={run.isPending}
            onClick={async () => {
              try {
                await saveQtys("received_qty", currentItems);
                run.mutate({ fn: "receive_transfer", args: { _id: recvOpen, _receiver: receiver, _review: review } });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {t("confirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function QtyRows({
  items,
  field,
  qtyEdit,
  setQtyEdit,
}: {
  items: TItem[];
  field: "sent" | "received";
  qtyEdit: Record<string, string>;
  setQtyEdit: (v: Record<string, string>) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const base = field === "sent" ? Number(it.requested_qty) : Number(it.sent_qty);
        const value = qtyEdit[it.id] ?? String(base);
        const diff = base - Number(value || 0);
        return (
          <div key={it.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
            <div className="min-w-0 flex-1 truncate">
              {it.products?.sku} — {(lang === "ar" ? it.products?.name_ar : it.products?.name_en) ?? it.products?.name_ar}
            </div>
            <span className="text-xs text-muted-foreground">
              {field === "sent" ? t("requestedQty") : t("sentQty")}: {base}
            </span>
            <Input
              className="w-24"
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setQtyEdit({ ...qtyEdit, [it.id]: e.target.value })}
            />
            {diff !== 0 && (
              <span className="text-xs font-semibold text-destructive">{t("qtyDiff")}: {diff}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
