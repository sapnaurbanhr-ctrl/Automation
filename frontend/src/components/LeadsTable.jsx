import { Pencil, Trash2, MoreVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import StatusBadge from "./StatusBadge";

export default function LeadsTable({ leads, onEdit, onDelete }) {
  if (!leads?.length) {
    return (
      <div className="bg-white border border-[#E7E5E4] rounded-lg p-16 text-center">
        <div className="text-[#1C1917] text-lg font-medium mb-1">No leads yet</div>
        <div className="text-[#57534E] text-sm">
          Click “Add lead” to start tracking your pipeline.
        </div>
      </div>
    );
  }

  return (
    <div className="crm-table-wrapper" data-testid="leads-table">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F7F5F2] hover:bg-[#F7F5F2]">
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">
              Lead
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">
              Company
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">
              Contact
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">
              Source
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium text-right">
              Deal value
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">
              Status
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((l) => (
            <TableRow key={l.lead_id} data-testid={`lead-row-${l.lead_id}`} className="crm-row">
              <TableCell className="font-medium text-[#1C1917]">{l.lead_name}</TableCell>
              <TableCell className="text-[#1C1917]">{l.company_name}</TableCell>
              <TableCell>
                <div className="text-[#1C1917]">{l.email}</div>
                <div className="text-xs text-[#57534E]">{l.phone}</div>
              </TableCell>
              <TableCell className="text-[#57534E]">{l.source}</TableCell>
              <TableCell className="text-right text-[#1C1917]">
                ${Number(l.deal_value || 0).toLocaleString()}
              </TableCell>
              <TableCell>
                <StatusBadge status={l.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-testid={`row-actions-${l.lead_id}`}
                      className="p-2 rounded-md hover:bg-[#F7F5F2] transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-[#57534E]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEdit(l)}
                      data-testid={`edit-action-${l.lead_id}`}
                      className="cursor-pointer"
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(l)}
                      data-testid={`delete-action-${l.lead_id}`}
                      className="cursor-pointer text-red-700 focus:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
