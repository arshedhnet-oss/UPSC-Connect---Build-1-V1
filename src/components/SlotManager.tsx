import { useEffect, useState, useCallback } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  mentor_id: string;
  _status?: "existing" | "added";
}

interface SlotManagerProps {
  userId: string;
}

const SlotManager = ({ userId }: SlotManagerProps) => {
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  const addedSlots = slots.filter(s => s._status === "added");
  const hasChanges = addedSlots.length > 0 || removedIds.size > 0;

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const fetchSlots = useCallback(async () => {
    const { data } = await supabaseUntyped
      .from("slots")
      .select("*")
      .eq("mentor_id", userId)
      .order("date", { ascending: true });
    if (data) setSlots(data.map((s: any) => ({ ...s, _status: "existing" as const })));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const validateNoOverlap = (newSlot: { date: string; start_time: string; end_time: string }) => {
    const visible = slots.filter(s => !removedIds.has(s.id) && !s.is_booked);
    return !visible.some(
      s =>
        s.date === newSlot.date &&
        s.start_time < newSlot.end_time &&
        s.end_time > newSlot.start_time
    );
  };

  const addSlot = () => {
    if (!slotDate || !slotStart || !slotEnd) return;
    if (slotStart >= slotEnd) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }
    const newSlot = { date: slotDate, start_time: slotStart, end_time: slotEnd };
    if (!validateNoOverlap(newSlot)) {
      toast({ title: "This slot overlaps with an existing one", variant: "destructive" });
      return;
    }
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    setSlots(prev => [
      ...prev,
      { id: tempId, ...newSlot, is_booked: false, mentor_id: userId, _status: "added" },
    ]);
    setSlotDate("");
    setSlotStart("");
    setSlotEnd("");
  };

  const removeSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    if (slot._status === "added") {
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } else {
      setRemovedIds(prev => new Set([...prev, slotId]));
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Delete removed slots
      if (removedIds.size > 0) {
        const { error: delErr } = await supabaseUntyped
          .from("slots")
          .delete()
          .in("id", Array.from(removedIds));
        if (delErr) throw delErr;
      }

      // Insert added slots
      if (addedSlots.length > 0) {
        const inserts = addedSlots.map(s => ({
          mentor_id: userId,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
        }));
        const { error: insErr } = await supabaseUntyped.from("slots").insert(inserts);
        if (insErr) throw insErr;
      }

      toast({ title: "Availability updated successfully" });
      setRemovedIds(new Set());
      await fetchSlots();
    } catch (err: any) {
      toast({ title: "Failed to save changes", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const visibleSlots = slots.filter(s => !removedIds.has(s.id) && !s.is_booked);

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Manage Slots</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={slotDate}
              onChange={e => setSlotDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-1">
            <Label>Start</Label>
            <Input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} />
          </div>
          <Button onClick={addSlot} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> Add Slot
          </Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {visibleSlots.map((slot) => (
            <div
              key={slot.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                slot._status === "added"
                  ? "border-primary/40 bg-primary/5"
                  : "border-border"
              }`}
            >
              <div>
                <span className="font-medium text-foreground">
                  {format(new Date(slot.date), "MMM d, yyyy")}
                </span>
                <span className="text-sm text-muted-foreground ml-3">
                  {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                </span>
                {slot._status === "added" && (
                  <span className="ml-2 text-xs text-primary font-medium">New</span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeSlot(slot.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {visibleSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">No available slots. Add some above.</p>
          )}
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 pt-3 bg-card">
          <Button
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> Save Changes
              </>
            )}
          </Button>
          {hasChanges && (
            <p className="text-xs text-muted-foreground mt-1">
              You have unsaved changes ({addedSlots.length} added, {removedIds.size} removed)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SlotManager;
