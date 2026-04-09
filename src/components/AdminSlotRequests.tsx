import { useEffect, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Check, X, AlertTriangle, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SlotRequest {
  id: string;
  mentor_id: string;
  mentee_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  message: string | null;
  mentor_message: string | null;
  status: string;
  payment_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function AdminSlotRequests() {
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabaseUntyped
      .from("booking_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setRequests(data);
      const userIds = [...new Set(data.flatMap((r: SlotRequest) => [r.mentor_id, r.mentee_id]))];
      if (userIds.length > 0) {
        const { data: profs } = await supabaseUntyped
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        if (profs) {
          const map: Record<string, { name: string; email: string }> = {};
          profs.forEach((p: any) => { map[p.id] = { name: p.name, email: p.email }; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending_mentor_confirmation":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><Check className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "expired_refunded":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
      case "cancelled":
        return <Badge variant="outline"><X className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-4">Loading...</p>;

  const pending = requests.filter(r => r.status === "pending_mentor_confirmation");
  const accepted = requests.filter(r => r.status === "accepted");
  const rejected = requests.filter(r => r.status === "rejected");
  const expired = requests.filter(r => r.status === "expired_refunded");

  const renderRequestRow = (r: SlotRequest) => (
    <div key={r.id} className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-medium text-foreground">
            {profiles[r.mentee_id]?.name || "Mentee"} → {profiles[r.mentor_id]?.name || "Mentor"}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(r.requested_date), "EEE, MMM d, yyyy")} • {r.requested_start_time.slice(0, 5)} – {r.requested_end_time.slice(0, 5)}
          </p>
        </div>
        {statusBadge(r.status)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Created: {format(new Date(r.created_at), "MMM d, HH:mm")}</span>
        {r.payment_id && <span>Payment: {r.payment_id.slice(0, 16)}...</span>}
        {r.expires_at && r.status === "pending_mentor_confirmation" && (
          <span className="text-amber-600">Expires: {format(new Date(r.expires_at), "MMM d, HH:mm")}</span>
        )}
      </div>
      {r.message && <p className="text-xs text-muted-foreground italic">Mentee: "{r.message}"</p>}
      {r.mentor_message && (
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground font-medium">Mentor message:</p>
          <p className="text-sm text-foreground italic">"{r.mentor_message}"</p>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <RefreshCw className="h-5 w-5" /> Slot Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="pending" className="text-xs">
              Pending {pending.length > 0 && <span className="ml-1 rounded-full bg-amber-500/20 text-amber-600 px-1.5 py-0.5 text-[10px]">{pending.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs">Accepted</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
            <TabsTrigger value="expired" className="text-xs">Expired</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>
            ) : (
              <div className="space-y-3">{pending.map(renderRequestRow)}</div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {accepted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No accepted requests</p>
            ) : (
              <div className="space-y-3">{accepted.map(renderRequestRow)}</div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejected.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No rejected requests</p>
            ) : (
              <div className="space-y-3">{rejected.map(renderRequestRow)}</div>
            )}
          </TabsContent>

          <TabsContent value="expired">
            {expired.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No expired requests</p>
            ) : (
              <div className="space-y-3">{expired.map(renderRequestRow)}</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
