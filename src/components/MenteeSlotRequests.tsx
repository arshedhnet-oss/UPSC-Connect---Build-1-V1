import { useEffect, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, XCircle, Timer, Video, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SlotRequest {
  id: string;
  mentor_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  message: string | null;
  status: string;
  expires_at: string | null;
  meeting_link: string | null;
  meeting_passcode: string | null;
  created_at: string;
  mentor?: { name: string; email: string };
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isLow = timeLeft !== "Expired" && !timeLeft.startsWith("0h") === false;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${timeLeft === "Expired" ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>
      <Timer className="h-3 w-3" />
      {timeLeft}
    </span>
  );
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending_payment: { label: "Payment Pending", variant: "outline", icon: <Clock className="h-3 w-3" /> },
  pending_mentor_confirmation: { label: "Awaiting Mentor", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  accepted: { label: "Accepted", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired_refunded: { label: "Expired – Refunded", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
};

export default function MenteeSlotRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const { data } = await supabaseUntyped
        .from("booking_requests")
        .select("*")
        .eq("mentee_id", user.id)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        // Fetch mentor names
        const mentorIds = [...new Set(data.map((r: any) => r.mentor_id))];
        const { data: mentors } = await supabaseUntyped
          .from("profiles")
          .select("id, name")
          .in("id", mentorIds);
        const mentorMap = new Map((mentors || []).map((m: any) => [m.id, m.name]));
        setRequests(data.map((r: any) => ({ ...r, mentor: { name: mentorMap.get(r.mentor_id) || "Mentor" } })));
      } else {
        setRequests([]);
      }
      setLoading(false);
    };
    fetchRequests();

    const channel = supabaseUntyped
      .channel("mentee-slot-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_requests", filter: `mentee_id=eq.${user.id}` }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabaseUntyped.removeChannel(channel); };
  }, [user]);

  if (loading) return null;
  if (requests.length === 0) return null;

  const pending = requests.filter(r => r.status === "pending_mentor_confirmation" || r.status === "pending_payment");
  const closed = requests.filter(r => ["rejected", "expired_refunded", "cancelled"].includes(r.status));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const renderRequest = (req: SlotRequest) => {
    const cfg = statusConfig[req.status] || statusConfig.cancelled;
    const date = new Date(req.requested_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

    return (
      <div key={req.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">{req.mentor?.name || "Mentor"}</p>
            <p className="text-sm text-muted-foreground">{date} · {req.requested_start_time} – {req.requested_end_time}</p>
          </div>
          <Badge variant={cfg.variant} className="flex items-center gap-1 shrink-0">
            {cfg.icon} {cfg.label}
          </Badge>
        </div>

        {req.message && (
          <p className="text-sm text-muted-foreground italic">"{req.message}"</p>
        )}

        {req.status === "pending_mentor_confirmation" && req.expires_at && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <span className="text-xs text-muted-foreground">Mentor must respond within:</span>
            <CountdownTimer expiresAt={req.expires_at} />
          </div>
        )}

        {req.status === "accepted" && req.meeting_link && (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Meeting Details</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={req.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                {req.meeting_link}
              </a>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(req.meeting_link!)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {req.meeting_passcode && (
              <p className="text-xs text-muted-foreground">
                Passcode: <span className="font-mono font-medium text-foreground">{req.meeting_passcode}</span>
              </p>
            )}
          </div>
        )}

        {(req.status === "rejected" || req.status === "expired_refunded") && (
          <p className="text-xs text-muted-foreground">
            {req.status === "rejected" ? "The mentor declined this request. A refund has been initiated." : "The mentor didn't respond in time. A full refund has been initiated."}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Clock className="h-5 w-5" /> My Slot Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending" className="text-sm">
              Pending {pending.length > 0 && <span className="ml-1 rounded-full bg-amber-500/20 text-amber-600 px-1.5 py-0.5 text-xs">{pending.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-sm">
              Accepted {accepted.length > 0 && <span className="ml-1 rounded-full bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5 text-xs">{accepted.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-sm">
              Closed {closed.length > 0 && <span className="ml-1 rounded-full bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 text-xs">{closed.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pending.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No pending requests</p>
            ) : (
              <div className="space-y-3">{pending.map(renderRequest)}</div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {accepted.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No accepted requests yet</p>
            ) : (
              <div className="space-y-3">{accepted.map(renderRequest)}</div>
            )}
          </TabsContent>

          <TabsContent value="closed">
            {closed.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No closed requests</p>
            ) : (
              <div className="space-y-3">{closed.map(renderRequest)}</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
