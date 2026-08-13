import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRoles, type AppRole } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "المستخدمين والصلاحيات | مخازن هيربل سبا" },
      { name: "description", content: "إدارة المستخدمين وتحديد صلاحياتهم على المخازن." },
      { property: "og:title", content: "المستخدمين والصلاحيات | مخازن هيربل سبا" },
      { property: "og:description", content: "نظام صلاحيات كامل لكل مستخدم." },
    ],
  }),
  component: Users,
});

const ROLES: AppRole[] = [
  "super_admin",
  "warehouse_manager",
  "main_warehouse",
  "branch_warehouse",
  "auditor",
  "viewer",
];

function Users() {
  const { t } = useI18n();
  const { has } = useRoles();
  const isSuper = has("super_admin");
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, is_active"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profiles.error) throw profiles.error;
      return (profiles.data ?? []).map((p) => ({
        ...p,
        roles: (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw del.error;
      const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title={t("users")} />
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fullName")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.full_name || "-"}</TableCell>
                <TableCell dir="ltr">{u.email}</TableCell>
                <TableCell>
                  {isSuper ? (
                    <Select
                      value={u.roles[0] ?? "viewer"}
                      onValueChange={(v) => setRole.mutate({ userId: u.id, role: v as AppRole })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(r as TKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {t(r as TKey)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>{u.is_active ? t("active") : t("inactive")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}