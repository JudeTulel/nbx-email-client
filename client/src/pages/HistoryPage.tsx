import { useState } from 'react';
import { Search, Filter, Trash2, CheckCircle2, XCircle, Clock, Send, ChevronDown, Mail, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHistoryStore } from '@/store/email-store';
import type { Email, EmailStatus } from '@/types/email';
import { cn } from '@/lib/utils';

const statusConfig: Record<EmailStatus, { icon: typeof CheckCircle2; label: string; color: string }> = {
  sent: { icon: CheckCircle2, label: 'Sent', color: 'text-green-400' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-destructive' },
  draft: { icon: Clock, label: 'Draft', color: 'text-yellow-400' },
  sending: { icon: Send, label: 'Sending', color: 'text-blue-400' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryPage() {
  const history = useHistoryStore();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const filteredEmails = history.getFilteredEmails();

  const handleExport = () => {
    const csv = [
      ['Subject', 'To', 'Sender', 'Status', 'Sent At'].join(','),
      ...filteredEmails.map((e) =>
        [
          `"${e.subject.replace(/"/g, '""')}"`,
          `"${e.recipients.to.join('; ')}"`,
          e.sender,
          e.status,
          e.sentAt,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nbx-email-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedEmail) {
    const sc = statusConfig[selectedEmail.status];
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <sc.icon className={cn("w-4 h-4", sc.color)} />
            <span className={cn("text-xs font-medium", sc.color)}>{sc.label}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-lg font-semibold mb-4">{selectedEmail.subject}</h2>
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16 shrink-0">From:</span>
                <span className="font-mono">{selectedEmail.senderName} &lt;{selectedEmail.sender}&gt;</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16 shrink-0">To:</span>
                <span className="font-mono">{selectedEmail.recipients.to.join(', ')}</span>
              </div>
              {selectedEmail.recipients.cc.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">CC:</span>
                  <span className="font-mono">{selectedEmail.recipients.cc.join(', ')}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16 shrink-0">Date:</span>
                <span className="font-mono">{new Date(selectedEmail.sentAt).toLocaleString('en-KE')}</span>
              </div>
            </div>
            <div className="border border-border rounded-lg p-6 bg-card/50">
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
              />
            </div>
            {selectedEmail.errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                <strong>Error:</strong> {selectedEmail.errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search & Filter bar */}
      <div className="shrink-0 border-b border-border px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={history.searchQuery}
              onChange={(e) => history.setSearchQuery(e.target.value)}
              placeholder="Search emails..."
              className="pl-9 bg-input/30 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className={cn(showFilter && "border-primary text-primary")}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filter
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
          </div>
        </div>

        {showFilter && (
          <div className="flex items-center gap-2 mt-3">
            {(['all', 'sent', 'failed', 'draft'] as const).map((status) => (
              <button
                key={status}
                onClick={() => history.setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  history.statusFilter === status
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {status === 'all' ? 'All' : statusConfig[status].label}
              </button>
            ))}
            {history.emails.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all email history?')) {
                    history.clearHistory();
                  }
                }}
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-auto">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Mail className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No emails found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {history.emails.length === 0
                ? 'Sent emails will appear here'
                : 'Try adjusting your search or filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEmails.map((email) => {
              const sc = statusConfig[email.status];
              return (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className="w-full text-left px-4 lg:px-6 py-3.5 hover:bg-accent/30 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <sc.icon className={cn("w-4 h-4 mt-0.5 shrink-0", sc.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate">{email.subject || '(No subject)'}</p>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatDate(email.sentAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        to: {email.recipients.to.join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        history.deleteEmail(email.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
