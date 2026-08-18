import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/AppLayout";
import { exportToExcel, printReport } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "سجل التدقيق | مخازن هيربل سبا" },
      { name: "description", content: "سجل كامل لمن قام بأي إجراء على المستندات والمخازن ومتى ولماذا." },
      { property: "og:title", content: "سجل التدقيق | مخازن هيربل سبا" },
      { property: "og:description", content: "تتبع كل الإجراءات داخل نظام المخازن." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { t } = useI18n();

  const { data = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const [logs, profiles] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (logs.error) throw logs.error;
      const map = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name || p.email || ""]));
      return (logs.data ?? []).map((l) => ({ ...l, userName: map.get(l.user_id ?? "") ?? "-" }));
    },
  });

  const rows = data.map((l) => ({
    [t("date")]: new Date(l.created_at).toLocaleString(),
    [t("user")]: l.userName,
    [t("action")]: l.action,
    [t("entity")]: l.entity ?? "",
    [t("reason")]: l.reason ?? "",
  }));

  return (
    <>
      <PageHeader
        title={t("audit")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToExcel("audit-log", rows)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => printReport(t("audit"), rows)}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("user")}</TableHead>
              <TableHead>{t("action")}</TableHead>
              <TableHead>{t("entity")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t("noAuditLogs")}
                </TableCell>
              </TableRow>
            )}
            {data.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell>{l.userName}</TableCell>
                <TableCell className="font-medium">{l.action}</TableCell>
                <TableCell>{l.entity ?? "-"}</TableCell>
                <TableCell>{l.reason ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
