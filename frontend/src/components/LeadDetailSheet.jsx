import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { CalendarIcon, Mail, Phone, Building2, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import api from "../lib/api";
import StatusBadge from "./StatusBadge";
import NotesPanel from "./NotesPanel";

export default function LeadDetailSheet({ open, onOpenChange, lead, onChanged }) {
  const updateFollowUp = useCallback(async (date) => {
    const value = date ? format(date, "yyyy-MM-dd") : null;
    try {
      await api.put(`/leads/${lead.lead_id}`, { next_follow_up: value });
      toast.success(value ? "Follow-up updated" : "Follow-up cleared");
      onChanged?.();
    } catch (_) {
      toast.error("Failed to update");
    }
  }, [lead, onChanged]);

  if (!lead) return null;

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
          <Link
            to={`/leads/${lead.lead_id}`}
            data-testid="open-full-page-link"
            className="inline-flex items-center gap-1.5 text-sm text-[#2D5A27] hover:underline mt-2 w-fit"
            onClick={() => onOpenChange(false)}
          >
            Open full page <ExternalLink className="h-3 w-3" />
          </Link>
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
          <NotesPanel leadId={lead.lead_id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
