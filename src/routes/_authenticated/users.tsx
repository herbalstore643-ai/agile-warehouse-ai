import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, KeyRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRoles, type AppRole } from "@/hooks/useAuth";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAppUser, setUserActive, setUserPassword } from "@/lib/admin-users.functions";
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
  const { has, isAdmin } = useRoles();
  const isSuper = has("super_admin");
  const qc = useQueryClient();
  const createFn = useServerFn(createAppUser);
  const passwordFn = useServerFn(setUserPassword);
  const activeFn = useServerFn(setUserActive);
  const [open, setOpen] = useState(false);
  const [pwUser, setPwUser] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "viewer" as AppRole,
  });

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

  const addUser = useMutation({
    mutationFn: async () => {
      if (!/^\d{6,12}$/.test(form.password)) throw new Error(t("passwordDigitsError"));
      await createFn({ data: form });
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setForm({ email: "", password: "", fullName: "", role: "viewer" });
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePw = useMutation({
    mutationFn: async () => {
      if (!/^\d{6,12}$/.test(pw)) throw new Error(t("passwordDigitsError"));
      await passwordFn({ data: { userId: pwUser!, password: pw } });
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setPwUser(null);
      setPw("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (v: { userId: string; isActive: boolean }) => {
      await activeFn({ data: v });
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={t("users")}
        action={
          isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t("newUser")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("newUser")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("fullName")}</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("email")}</Label>
                    <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("passwordDigits")}</Label>
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("role")}</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                      <SelectTrigger>
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
                  </div>
                  <Button className="w-full" onClick={() => addUser.mutate()} disabled={addUser.isPending}>
                    {t("save")}
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
              <TableHead>{t("fullName")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              {isAdmin && <TableHead />}
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
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPwUser(u.id);
                          setPw("");
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {t("resetPassword")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive.mutate({ userId: u.id, isActive: !u.is_active })}
                      >
                        {u.is_active ? t("deactivate") : t("activate")}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resetPassword")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("passwordDigits")}</Label>
              <Input
                dir="ltr"
                inputMode="numeric"
                value={pw}
                onChange={(e) => setPw(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button className="w-full" onClick={() => changePw.mutate()} disabled={changePw.isPending}>
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}