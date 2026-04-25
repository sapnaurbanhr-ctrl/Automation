import { Pencil, Trash2, MoreVertical, MessageCircle, Trophy, XCircle, AlertCircle, CalendarClock } from "lucide-react";
import { format, parseISO, isToday, isPast } from "date-fns";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import StatusBadge from "./StatusBadge";

function FollowUpCell({ date }) {
  if (!date) return <span className="text-[#A8A29E] text-xs">—</span>;
  const d = parseISO(date);
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const cls = overdue
    ? "text-[#991B1B] bg-[#FEE2E2] border-[#FECACA]"
    : today
    ? "text-[#92400E] bg-[#FEF3C7] border-[#FDE68A]"
    : "text-[#1C1917] bg-white border-[#E7E5E4]";
  const Icon = overdue || today ? AlertCircle : CalendarClock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${cls}`}
      data-testid={`followup-${overdue ? "overdue" : today ? "today" : "future"}`}
    >
      <Icon className="h-3 w-3" />
      {overdue ? "Overdue " : today ? "Today " : ""}
      {format(d, "MMM d")}
    </span>
  );
}

function QuickAction({ label, icon: Icon, onClick, testid, color }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            data-testid={testid}
            className="p-1.5 rounded-md hover:bg-[#F7F5F2] transition-colors"
            style={{ color }}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function LeadsTable({ leads, onEdit, onDelete, onQuickStatus, onOpenLead }) {
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
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">Lead</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">Company</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">Contact</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">Source</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium text-right">Deal</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">Status</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium">Follow-up</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-[#57534E] font-medium text-center">Quick</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((l) => (
            <TableRow
              key={l.lead_id}
              data-testid={`lead-row-${l.lead_id}`}
              className="crm-row cursor-pointer"
              onClick={() => onOpenLead?.(l)}
            >
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
              <TableCell><StatusBadge status={l.status} /></TableCell>
              <TableCell><FollowUpCell date={l.next_follow_up} /></TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <QuickAction
                    label="Mark as Contacted"
                    icon={MessageCircle}
                    onClick={() => onQuickStatus(l, "Contacted")}
                    testid={`quick-contacted-${l.lead_id}`}
                    color="#92400E"
                  />
                  <QuickAction
                    label="Mark as Won"
                    icon={Trophy}
                    onClick={() => onQuickStatus(l, "Won")}
                    testid={`quick-won-${l.lead_id}`}
                    color="#065F46"
                  />
                  <QuickAction
                    label="Mark as Lost"
                    icon={XCircle}
                    onClick={() => onQuickStatus(l, "Lost")}
                    testid={`quick-lost-${l.lead_id}`}
                    color="#991B1B"
                  />
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <DropdownMenuItem onClick={() => onEdit(l)} data-testid={`edit-action-${l.lead_id}`} className="cursor-pointer">
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(l)} data-testid={`delete-action-${l.lead_id}`} className="cursor-pointer text-red-700 focus:text-red-700">
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
