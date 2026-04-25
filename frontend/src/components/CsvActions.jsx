import { useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Download, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import api, { API } from "../lib/api";

export default function CsvActions({ onImported }) {
  const fileRef = useRef(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const res = await fetch(`${API}/leads/export/csv`, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exported leads.csv");
    } catch (_) {
      toast.error("Export failed");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    try {
      const { data } = await api.post("/leads/import/csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      setResultOpen(true);
      onImported?.();
      if (data.created > 0) toast.success(`Imported ${data.created} leads`);
      else toast.error("No leads imported");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
        data-testid="csv-file-input"
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        data-testid="csv-import-button"
      >
        <Upload className="h-4 w-4 mr-2" /> {importing ? "Importing…" : "Import CSV"}
      </Button>
      <Button
        variant="outline"
        onClick={handleExport}
        data-testid="csv-export-button"
      >
        <Download className="h-4 w-4 mr-2" /> Export CSV
      </Button>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent data-testid="csv-result-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-medium">
              <FileText className="h-5 w-5" /> Import results
            </DialogTitle>
            <DialogDescription>
              {result?.created || 0} leads imported successfully.
            </DialogDescription>
          </DialogHeader>
          {result?.errors?.length > 0 && (
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-md p-3 text-sm text-[#92400E] max-h-64 overflow-y-auto">
              <div className="font-medium mb-1">{result.errors.length} row(s) skipped:</div>
              <ul className="list-disc list-inside space-y-1">
                {result.errors.slice(0, 30).map((er, i) => (
                  <li key={i} className="text-xs">{er}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-xs text-[#57534E] bg-[#F7F5F2] rounded-md p-3">
            Required columns: <code>lead_name, company_name, email</code>. Optional:{" "}
            <code>phone, source, deal_value, status, next_follow_up</code> (YYYY-MM-DD).
          </div>
          <DialogFooter>
            <Button onClick={() => setResultOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
