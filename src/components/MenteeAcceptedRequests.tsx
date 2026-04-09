import { useEffect, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Video, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AcceptedRequest {
  id: string;
  mentor_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  meeting_link: string | null;
  meeting_passcode: string | null;
  mentorName: string;
}

export default function MenteeAcceptedRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AcceptedRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabaseUntyped
        .from("booking_requests")
        .select("*")
        .eq("mentee_id", user.id)
        .eq("status", "accepted")
        .order("requested_date", { ascending: true });
      if (data && data.length > 0) {
        const mentorIds = [...new Set(data.map((r: any) => r.mentor_id))];
        const { data: mentors } = await supabaseUntyped
          .from("profiles")
          .select("id, name")
          .in("id", mentorIds);
        const mentorMap = new Map((mentors || []).map((m: any) => [m.id, m.name]));
        setRequests(data.map((r: any) => ({ ...r, mentorName: mentorMap.get(r.mentor_id) || "Mentor" })));
      } else {
        setRequests([]);
      }
    };
    fetch();

    const channel = supabaseUntyped
      .channel("mentee-accepted-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_requests", filter: `mentee_id=eq.${user.id}` }, () => { fetch(); })
      .subscribe();
    return () => { supabaseUntyped.removeChannel(channel); };
  }, [user]);

  if (requests.length === 0) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-3 mb-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Accepted Slot Requests</p>
      {requests.map((req) => {
        const date = new Date(req.requested_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
        return (
          <div key={req.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{req.mentorName}</p>
                <p className="text-sm text-muted-foreground">{date} · {req.requested_start_time} – {req.requested_end_time}</p>
              </div>
              <Badge variant="default" className="flex items-center gap-1 shrink-0">
                <CheckCircle2 className="h-3 w-3" /> Accepted
              </Badge>
            </div>
            {req.meeting_link && (
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
          </div>
        );
      })}
    </div>
  );
}
