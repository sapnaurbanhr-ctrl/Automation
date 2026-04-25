import { useEffect, useState, useCallback } from "react";
import Header from "../components/Header";
import StatsCards from "../components/StatsCards";
import LeadsTable from "../components/LeadsTable";
import LeadFormDialog from "../components/LeadFormDialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/stats");
      setStats(data);
    } catch (_) {}
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await api.get("/leads", { params });
      setLeads(data);
    } catch (_) {}
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const t = setTimeout(fetchLeads, 200);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  const handleSaved = async () => {
    await Promise.all([fetchLeads(), fetchStats()]);
  };

  const openCreate = () => {
    setEditingLead(null);
    setDialogOpen(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/leads/${deleteTarget.lead_id}`);
      toast.success("Lead deleted");
      setDeleteTarget(null);
      await Promise.all([fetchLeads(), fetchStats()]);
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB]" data-testid="dashboard-page">
      <Header />

      <main className="max-w-7xl mx-auto px-6 md:px-8 py-10">
        <section className="mb-10">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] mb-2">
            Overview
          </div>
          <h1 className="text-4xl sm:text-5xl tracking-tight font-light text-[#1C1917] mb-2">
            Your pipeline at a glance.
          </h1>
          <p className="text-[#57534E] text-base leading-relaxed">
            Track every conversation, follow-up, and opportunity in one quiet place.
          </p>
        </section>

        <section className="mb-12">
          <StatsCards stats={stats} />
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl tracking-tight font-medium text-[#1C1917]">Leads</h2>
              <p className="text-sm text-[#57534E] mt-1">
                {leads.length} {leads.length === 1 ? "lead" : "leads"} shown
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
                <Input
                  data-testid="search-input"
                  className="pl-9 w-full sm:w-64"
                  placeholder="Search name or company"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={openCreate}
                data-testid="add-lead-button"
                className="bg-[#2D5A27] hover:bg-[#3B7235] text-white px-5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add lead
              </Button>
            </div>
          </div>

          <LeadsTable
            leads={leads}
            onEdit={openEdit}
            onDelete={(l) => setDeleteTarget(l)}
          />
        </section>
      </main>

      <LeadFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editingLead}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent data-testid="delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.lead_name} from your pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-confirm"
              onClick={confirmDelete}
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
