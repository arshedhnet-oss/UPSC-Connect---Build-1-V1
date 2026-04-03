import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Video, Copy, Send, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SessionCardProps {
  booking: any;
  role: "mentor" | "mentee" | "admin";
  onChatWithMentee?: (menteeId: string) => void;
  onReview?: (booking: any) => void;
  onStatusUpdate?: (bookingId: string, status: string) => void;
  isReviewed?: boolean;
  chattingWith?: string | null;
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string; className: string }> = {
  pending_payment: { variant: "outline", label: "Pending", className: "bg-muted text-muted-foreground" },
  confirmed: { variant: "default", label: "Confirmed", className: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800" },
  completed: { variant: "secondary", label: "Completed", className: "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800" },
  cancelled: { variant: "destructive", label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const SessionCard = ({ booking, role, onChatWithMentee, onReview, onStatusUpdate, isReviewed, chattingWith }: SessionCardProps) => {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const { toast } = useToast();
  const b = booking;

  const config = statusConfig[b.status] || statusConfig.pending_payment;
  const otherParty = role === "mentee" ? b.mentor : b.mentee;
  const otherLabel = role === "mentee" ? "Mentor" : "Mentee";
  const hasMeeting = b.meeting_link && (b.status === "confirmed" || b.status === "completed");

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header: Name + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">
            {role === "admin" ? (
              <span className="flex flex-wrap items-center gap-1.5 text-sm">
                <span>{b.mentor?.name || "—"}</span>
                <span className="text-muted-foreground">→</span>
                <span>{b.mentee?.name || "—"}</span>
              </span>
            ) : (
              <span>{otherLabel}: {otherParty?.name || "—"}</span>
            )}
          </p>
          {b.slots && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(b.slots.date), "MMM d, yyyy")} · {b.slots.start_time?.slice(0, 5)} – {b.slots.end_time?.slice(0, 5)}
            </p>
          )}
        </div>
        <Badge className={`shrink-0 text-xs font-medium border ${config.className}`}>
          {config.label}
        </Badge>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {role === "mentor" && (b.status === "confirmed" || b.status === "completed") && onChatWithMentee && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] flex-1 sm:flex-none"
            disabled={chattingWith === b.mentee_id}
            onClick={() => onChatWithMentee(b.mentee_id)}
          >
            <Send className="h-4 w-4 mr-1.5" /> Chat with Mentee
          </Button>
        )}
        {b.status === "confirmed" && b.meeting_link && (
          <a href={b.meeting_link} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
            <Button size="sm" className="min-h-[44px] w-full">
              <Video className="h-4 w-4 mr-1.5" /> Join Meeting
            </Button>
          </a>
        )}
        {role === "mentee" && b.status === "completed" && !isReviewed && onReview && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] flex-1 sm:flex-none"
            onClick={() => onReview(b)}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" /> Leave Review
          </Button>
        )}
        {role === "mentee" && b.status === "completed" && isReviewed && (
          <Badge variant="secondary" className="text-xs self-start">Reviewed</Badge>
        )}

        {/* Status update for mentor */}
        {role === "mentor" && b.status === "confirmed" && onStatusUpdate && (
          <Button
            size="sm"
            variant="secondary"
            className="min-h-[44px] flex-1 sm:flex-none"
            onClick={() => onStatusUpdate(b.id, "completed")}
          >
            Mark Completed
          </Button>
        )}

        {/* Status update for admin */}
        {role === "admin" && onStatusUpdate && b.status !== "cancelled" && (
          <Select
            value={b.status}
            onValueChange={(val) => onStatusUpdate(b.id, val)}
          >
            <SelectTrigger className="min-h-[44px] w-full sm:w-[160px]">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending_payment">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Collapsible Meeting Details */}
      {hasMeeting && (
        <Collapsible open={meetingOpen} onOpenChange={setMeetingOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground px-2 h-9">
              <span className="flex items-center gap-1.5 text-xs">
                <Video className="h-3.5 w-3.5" /> Meeting Details
              </span>
              {meetingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-lg bg-muted/50 border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <a
                href={b.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                {b.meeting_link}
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(b.meeting_link);
                  toast({ title: "Link copied!" });
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            {b.meeting_passcode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Passcode:</span>
                <code className="text-sm font-mono font-semibold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                  {b.meeting_passcode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(b.meeting_passcode);
                    toast({ title: "Passcode copied!" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default SessionCard;
