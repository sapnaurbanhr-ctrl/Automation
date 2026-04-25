import { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { CalendarIcon, Clock, Mail, Phone, Building2 } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import api from "../lib/api";
import StatusBadge from "./StatusBadge";

export default function LeadDetailSheet({ open, onOpenChange, lead, onChanged }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!lead) return;
    try {
      const { data } = await api.get(`/leads/${lead.lead_id}/notes`);
      setNotes(data);
    } catch (_) {}
  }, [lead]);

  useEffect(() => {
    if (open && lead) {
      setText("");
      fetchNotes();
    }
  }, [open, lead, fetchNotes]);

  if (!lead) return null;

  const submitNote = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post(`/leads/${lead.lead_id}/notes`, { text });
      setText("");
      await fetchNotes();
      toast.success("Note added");
    } catch (e) {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const updateFollowUp = async (date) => {
    const value = date ? format(date, "yyyy-MM-dd") : null;
    try {
      await api.put(`/leads/${lead.lead_id}`, { next_follow_up: value });
      toast.success(value ? "Follow-up updated" : "Follow-up cleared");
      onChanged?.();
    } catch (_) {
      toast.error("Failed to update");
    }
  };

  const followDate = lead.next_follow_up ? parseISO(lead.next_follow_up) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto bg-[#FDFCFB]" data-testid="lead-detail-sheet">
        <SheetHeader>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={lead.status} />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E]">
              {lead.source}
            </span>
          </div>
          <SheetTitle className="text-2xl font-medium tracking-tight">{lead.lead_name}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-[#57534E]">
            <Building2 className="h-4 w-4" /> {lead.company_name}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-4">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] mb-2">Deal value</div>
            <div className="text-2xl font-light text-[#1C1917]">${Number(lead.deal_value || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-4">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] mb-2">Next follow-up</div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  data-testid="detail-followup-trigger"
                  className="flex items-center justify-between w-full text-left hover:opacity-80"
                >
                  <span className="text-base text-[#1C1917]">
                    {followDate ? format(followDate, "PP") : "Not set"}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-[#57534E]" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={followDate || undefined}
                  onSelect={(d) => updateFollowUp(d)}
                  initialFocus
                />
                {lead.next_follow_up && (
                  <div className="p-2 border-t border-[#E7E5E4]">
                    <button
                      type="button"
                      onClick={() => updateFollowUp(null)}
                      data-testid="detail-followup-clear"
                      className="w-full text-xs text-[#57534E] hover:text-[#1C1917] py-1"
                    >
                      Clear date
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-lg p-4 mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#1C1917]">
            <Mail className="h-4 w-4 text-[#57534E]" /> {lead.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#1C1917]">
            <Phone className="h-4 w-4 text-[#57534E]" /> {lead.phone || "—"}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-[#1C1917] mb-3">Notes</h3>
          <form onSubmit={submitNote} className="space-y-2 mb-6">
            <Textarea
              data-testid="note-textarea"
              placeholder="Add a note about this lead…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="bg-white"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving || !text.trim()}
                data-testid="note-submit-button"
                className="bg-[#2D5A27] hover:bg-[#3B7235] text-white"
              >
                {saving ? "Adding…" : "Add note"}
              </Button>
            </div>
          </form>

          <div className="space-y-3" data-testid="notes-list">
            {notes.length === 0 ? (
              <div className="text-sm text-[#57534E] bg-white border border-dashed border-[#E7E5E4] rounded-lg p-6 text-center">
                No notes yet. Capture context, next steps, or call summaries.
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.note_id}
                  data-testid={`note-${n.note_id}`}
                  className="bg-white border border-[#E7E5E4] rounded-lg p-4"
                >
                  <div className="text-sm text-[#1C1917] whitespace-pre-wrap leading-relaxed">{n.text}</div>
                  <div className="text-xs text-[#57534E] mt-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(n.created_at), "PPp")}
                    <span className="text-[#A8A29E]">·</span>
                    <span>{formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
