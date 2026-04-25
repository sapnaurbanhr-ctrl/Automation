import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import api from "../lib/api";

const SOURCES = ["LinkedIn", "Website", "Referral", "Other"];
const STATUSES = ["New", "Contacted", "Won", "Lost"];

const empty = {
  lead_name: "",
  company_name: "",
  email: "",
  phone: "",
  source: "LinkedIn",
  deal_value: "",
  status: "New",
  next_follow_up: "",
};

export default function LeadFormDialog({ open, onOpenChange, lead, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setForm({
        lead_name: lead.lead_name || "",
        company_name: lead.company_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        source: lead.source || "LinkedIn",
        deal_value: lead.deal_value ?? "",
        status: lead.status || "New",
        next_follow_up: lead.next_follow_up || "",
      });
    } else {
      setForm(empty);
    }
  }, [lead, open]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.lead_name || !form.company_name || !form.email) {
      toast.error("Please fill name, company and email.");
      return;
    }
    const payload = {
      ...form,
      deal_value: parseFloat(form.deal_value) || 0,
      next_follow_up: form.next_follow_up || null,
    };
    setSaving(true);
    try {
      if (lead) {
        await api.put(`/leads/${lead.lead_id}`, payload);
        toast.success("Lead updated");
      } else {
        await api.post("/leads", payload);
        toast.success("Lead created");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  const followDate = form.next_follow_up ? parseISO(form.next_follow_up) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="lead-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-medium tracking-tight">
            {lead ? "Edit lead" : "Add a new lead"}
          </DialogTitle>
          <DialogDescription className="text-[#57534E]">
            Capture key contact and deal information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="lead_name">Lead name</Label>
              <Input id="lead_name" data-testid="input-lead-name" value={form.lead_name} onChange={(e) => update("lead_name", e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company_name">Company</Label>
              <Input id="company_name" data-testid="input-company-name" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Acme Inc." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" data-testid="input-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@acme.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" data-testid="input-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 555 123 4567" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Lead source</Label>
              <Select value={form.source} onValueChange={(v) => update("source", v)}>
                <SelectTrigger data-testid="select-source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deal_value">Deal value ($)</Label>
              <Input id="deal_value" data-testid="input-deal-value" type="number" value={form.deal_value} onChange={(e) => update("deal_value", e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Next follow-up</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    data-testid="input-followup-date"
                    className="flex items-center justify-between bg-white border border-[#E7E5E4] rounded-md px-3 py-2 text-sm text-left hover:bg-[#F7F5F2] transition-colors"
                  >
                    <span className={followDate ? "text-[#1C1917]" : "text-[#A8A29E]"}>
                      {followDate ? format(followDate, "PP") : "Pick a date"}
                    </span>
                    <CalendarIcon className="h-4 w-4 text-[#57534E]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={followDate || undefined}
                    onSelect={(d) => update("next_follow_up", d ? format(d, "yyyy-MM-dd") : "")}
                    initialFocus
                  />
                  {form.next_follow_up && (
                    <div className="p-2 border-t border-[#E7E5E4]">
                      <button
                        type="button"
                        data-testid="clear-followup-button"
                        onClick={() => update("next_follow_up", "")}
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

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="lead-form-cancel">Cancel</Button>
            <Button type="submit" disabled={saving} data-testid="lead-form-submit" className="bg-[#2D5A27] hover:bg-[#3B7235] text-white">
              {saving ? "Saving…" : lead ? "Save changes" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
