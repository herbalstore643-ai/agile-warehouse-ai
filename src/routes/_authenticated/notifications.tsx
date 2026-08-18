import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات | مخازن هيربل سبا" },
      { name: "description", content: "إشعارات الطلبات بانتظار الموافقة والشحنات في الطريق والأصناف تحت الحد الأدنى." },
      { property: "og:title", content: "الإشعارات | مخازن هيربل سبا" },
      { property: "og:description", content: "متابعة كل ما يخصك في النظام لحظيًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={t("notifications")}
        action={
          data.some((n) => !n.is_read) && (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
              <CheckCheck className="h-4 w-4" />
              {t("markAllRead")}
            </Button>
          )
        }
      />
      <div className="space-y-2">
        {data.length === 0 && <p className="text-muted-foreground">{t("noNotifications")}</p>}
        {data.map((n) => (
          <Card key={n.id} className={n.is_read ? "opacity-70" : "border-primary/40"}>
            <CardContent className="flex items-start justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
