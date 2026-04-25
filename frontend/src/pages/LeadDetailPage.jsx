import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import NotesPanel from "../components/NotesPanel";
import StatusBadge from "../components/StatusBadge";
import LeadFormDialog from "../components/LeadFormDialog";
import { Button } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  CalendarIcon,
  Pencil,
  Trash2,
  MessageCircle,
  Trophy,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import api from "../lib/api";

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchLead = async () => {
    try {
      const { data } = await api.get(`/leads/${id}`);
      setLead(data);
    } catch (_) {
      toast.error("Lead not found");
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateFollowUp = async (date) => {
    const value = date ? format(date, "yyyy-MM-dd") : null;
    try {
      await api.put(`/leads/${id}`, { next_follow_up: value });
      toast.success(value ? "Follow-up updated" : "Follow-up cleared");
      fetchLead();
    } catch (_) {
      toast.error("Failed to update");
    }
  };

  const updateStatus = async (status) => {
    try {
      await api.put(`/leads/${id}`, { status });
      toast.success(`Marked as ${status}`);
      fetchLead();
    } catch (_) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted");
      navigate("/dashboard");
    } catch (_) {
      toast.error("Failed to delete");
    }
  };

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#FDFCFB]">
        <Header />
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 text-[#57534E]">Loading…</div>
      </div>
    );
  }

  const followDate = lead.next_follow_up ? parseISO(lead.next_follow_up) : null;

  return (
    <div className="min-h-screen bg-[#FDFCFB]" data-testid="lead-detail-page">
      <Header />
      <main className="max-w-5xl mx-auto px-6 md:px-8 py-10">
        <Link
          to="/dashboard"
          data-testid="back-to-dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[#57534E] hover:text-[#1C1917] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to leads
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={lead.status} />
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E]">
                {lead.source}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl tracking-tight font-light text-[#1C1917]">
              {lead.lead_name}
            </h1>
            <div className="flex items-center gap-2 text-[#57534E] mt-2">
              <Building2 className="h-4 w-4" /> {lead.company_name}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEditOpen(true)}
              data-testid="detail-edit-button"
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              data-testid="detail-delete-button"
              className="text-red-700 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-5">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] mb-2">
              Deal value
            </div>
            <div className="text-3xl font-light text-[#1C1917]">
              ${Number(lead.deal_value || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-5">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] mb-2">
              Next follow-up
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  data-testid="detail-page-followup-trigger"
                  className="flex items-center justify-between w-full text-left"
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
                      data-testid="detail-page-followup-clear"
                      className="w-full text-xs text-[#57534E] hover:text-[#1C1917] py-1"
                    >
                      Clear date
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-5 space-y-2">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] mb-1">
              Contact
            </div>
            <div className="flex items-center gap-2 text-sm text-[#1C1917]">
              <Mail className="h-4 w-4 text-[#57534E]" /> {lead.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#1C1917]">
              <Phone className="h-4 w-4 text-[#57534E]" /> {lead.phone || "—"}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-lg p-5 mb-10">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] mb-3">
            Quick actions
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => updateStatus("Contacted")}
              data-testid="detail-mark-contacted"
            >
              <MessageCircle className="h-4 w-4 mr-2 text-[#92400E]" /> Mark as Contacted
            </Button>
            <Button
              variant="outline"
              onClick={() => updateStatus("Won")}
              data-testid="detail-mark-won"
            >
              <Trophy className="h-4 w-4 mr-2 text-[#065F46]" /> Mark as Won
            </Button>
            <Button
              variant="outline"
              onClick={() => updateStatus("Lost")}
              data-testid="detail-mark-lost"
            >
              <XCircle className="h-4 w-4 mr-2 text-[#991B1B]" /> Mark as Lost
            </Button>
          </div>
        </div>

        <section>
          <h2 className="text-2xl tracking-tight font-medium text-[#1C1917] mb-4">Notes</h2>
          <NotesPanel leadId={id} />
        </section>
      </main>

      <LeadFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        onSaved={fetchLead}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {lead.lead_name} and all associated notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="detail-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="detail-delete-confirm"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
