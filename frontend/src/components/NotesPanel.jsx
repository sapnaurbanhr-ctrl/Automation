import { useEffect, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Clock, Pencil, Trash2, Check, X } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import api from "../lib/api";

export default function NotesPanel({ leadId }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  const fetchNotes = useCallback(async () => {
    if (!leadId) return;
    try {
      const { data } = await api.get(`/leads/${leadId}/notes`);
      setNotes(data);
    } catch (_) {}
  }, [leadId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const submitNote = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post(`/leads/${leadId}/notes`, { text });
      setText("");
      await fetchNotes();
      toast.success("Note added");
    } catch (_) {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note) => {
    setEditingId(note.note_id);
    setEditingText(note.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (!editingText.trim()) return;
    try {
      await api.put(`/leads/${leadId}/notes/${editingId}`, { text: editingText });
      cancelEdit();
      await fetchNotes();
      toast.success("Note updated");
    } catch (_) {
      toast.error("Failed to update");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/leads/${leadId}/notes/${deleteId}`);
      setDeleteId(null);
      await fetchNotes();
      toast.success("Note deleted");
    } catch (_) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div data-testid="notes-panel">
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
              className="bg-white border border-[#E7E5E4] rounded-lg p-4 group"
            >
              {editingId === n.note_id ? (
                <div className="space-y-2">
                  <Textarea
                    data-testid={`note-edit-textarea-${n.note_id}`}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    className="bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      data-testid={`note-edit-cancel-${n.note_id}`}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      data-testid={`note-edit-save-${n.note_id}`}
                      className="bg-[#2D5A27] hover:bg-[#3B7235] text-white"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm text-[#1C1917] whitespace-pre-wrap leading-relaxed">{n.text}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-[#57534E] flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(n.created_at), "PPp")}
                      <span className="text-[#A8A29E]">·</span>
                      <span>{formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(n)}
                        data-testid={`note-edit-${n.note_id}`}
                        aria-label="Edit note"
                        className="p-1 rounded hover:bg-[#F7F5F2] text-[#57534E]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(n.note_id)}
                        data-testid={`note-delete-${n.note_id}`}
                        aria-label="Delete note"
                        className="p-1 rounded hover:bg-[#FEE2E2] text-[#991B1B]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="note-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="note-delete-confirm"
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
