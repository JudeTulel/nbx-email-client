import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, ChevronDown, ChevronUp, FileText, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RecipientInput from '@/components/email/RecipientInput';
import RichTextEditor from '@/components/email/RichTextEditor';
import CSVImport from '@/components/email/CSVImport';
import { useEmailComposeStore, useHistoryStore, useConfigStore, useTemplateStore, useCSVImportStore } from '@/store/email-store';
import type { Email, EmailTemplate } from '@/types/email';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { tauriEmailApi } from '@/lib/tauri-api';

export default function Compose() {
  const compose = useEmailComposeStore();
  const history = useHistoryStore();
  const config = useConfigStore();
  const templates = useTemplateStore();
  const csvImport = useCSVImportStore();

  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const handleSend = async () => {
    if (compose.toRecipients.length === 0 && csvImport.contacts.length === 0) {
      toast.error('Please add at least one recipient or import a CSV file.');
      return;
    }
    if (!compose.subject.trim()) {
      toast.error('Please enter a subject line.');
      return;
    }
    if (!compose.bodyHtml.trim() || compose.bodyHtml === '<p></p>') {
      toast.error('Please write some email content.');
      return;
    }

    const sender = compose.sender || config.config.defaultSender;
    const senderName = compose.senderName || config.config.defaultSenderName;

    // Bulk send with CSV
    if (csvImport.contacts.length > 0) {
      setBulkSending(true);
      setBulkProgress({ sent: 0, failed: 0, total: csvImport.contacts.length });

      for (let i = 0; i < csvImport.contacts.length; i++) {
        const contact = csvImport.contacts[i];
        let personalizedSubject = compose.subject;
        let personalizedBody = compose.bodyHtml;

        // Replace variables
        personalizedSubject = personalizedSubject.replace(/\{\{COMPANY_NAME\}\}/gi, contact.companyName || '');
        personalizedSubject = personalizedSubject.replace(/\{\{CONTACT_PERSON\}\}/gi, contact.contactPerson || '');
        personalizedBody = personalizedBody.replace(/\{\{COMPANY_NAME\}\}/gi, contact.companyName || '');
        personalizedBody = personalizedBody.replace(/\{\{CONTACT_PERSON\}\}/gi, contact.contactPerson || '');

        // Replace other CSV columns
        for (const [key, value] of Object.entries(contact)) {
          if (value && key !== 'email' && key !== 'companyName' && key !== 'contactPerson') {
            const regex = new RegExp(`\\{\\{${key.toUpperCase()}\\}\\}`, 'gi');
            personalizedSubject = personalizedSubject.replace(regex, value);
            personalizedBody = personalizedBody.replace(regex, value);
          }
        }

        try {
          // 🔥 SEND VIA TAURI BACKEND
          await tauriEmailApi.sendEmail({
            sender,
            sender_name: senderName,
            recipients: { to: [contact.email], cc: [], bcc: [] },
            subject: personalizedSubject,
            body_html: personalizedBody,
            body_plain_text: personalizedBody.replace(/<[^>]*>/g, ''),
          });

          const email: Email = {
            id: uuidv4(),
            sender,
            senderName,
            recipients: { to: [contact.email], cc: [], bcc: [] },
            subject: personalizedSubject,
            bodyHtml: personalizedBody,
            bodyPlainText: personalizedBody.replace(/<[^>]*>/g, ''),
            sentAt: new Date().toISOString(),
            status: 'sent',
            attachments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          history.addEmail(email);
          setBulkProgress((prev) => ({ ...prev, sent: prev.sent + 1 }));
        } catch (error: any) {
          console.error('Failed to send to', contact.email, error);

          const failedEmail: Email = {
            id: uuidv4(),
            sender,
            senderName,
            recipients: { to: [contact.email], cc: [], bcc: [] },
            subject: personalizedSubject,
            bodyHtml: personalizedBody,
            bodyPlainText: personalizedBody.replace(/<[^>]*>/g, ''),
            sentAt: new Date().toISOString(),
            status: 'failed',
            errorMessage: error.message,
            attachments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          history.addEmail(failedEmail);
          setBulkProgress((prev) => ({ ...prev, failed: prev.failed + 1 }));
        }

        // Rate limiting: 1 email per second
        await new Promise((r) => setTimeout(r, 1000));
      }

      setBulkSending(false);
      toast.success(`Bulk send complete: ${bulkProgress.sent} sent, ${bulkProgress.failed} failed.`);
      csvImport.clearContacts();
      compose.clearCompose();
      return;
    }

    // Single send
    compose.setIsSending(true);

    try {
      // 🔥 SEND VIA TAURI BACKEND
      await tauriEmailApi.sendEmail({
        sender,
        sender_name: senderName,
        recipients: {
          to: compose.toRecipients,
          cc: compose.ccRecipients,
          bcc: compose.bccRecipients,
        },
        subject: compose.subject,
        body_html: compose.bodyHtml,
        body_plain_text: compose.bodyHtml.replace(/<[^>]*>/g, ''),
      });

      const email: Email = {
        id: uuidv4(),
        sender,
        senderName,
        recipients: {
          to: compose.toRecipients,
          cc: compose.ccRecipients,
          bcc: compose.bccRecipients,
        },
        subject: compose.subject,
        bodyHtml: compose.bodyHtml,
        bodyPlainText: compose.bodyHtml.replace(/<[^>]*>/g, ''),
        sentAt: new Date().toISOString(),
        status: 'sent',
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      history.addEmail(email);
      compose.setIsSending(false);
      compose.clearCompose();
      toast.success('Email sent successfully!');
    } catch (error: any) {
      console.error('Email send failed:', error);
      compose.setIsSending(false);
      toast.error(`Failed to send email: ${error.message}`);
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    compose.loadTemplate(template);
    setShowTemplates(false);
    toast.info(`Template "${template.name}" loaded.`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-[900px] mx-auto space-y-4">
          {/* Sender */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
              <Input
                value={compose.sender || config.config.defaultSender}
                onChange={(e) => compose.setSender(e.target.value)}
                placeholder="sender@nbx-exchange.co.ke"
                className="bg-input/30 font-mono text-sm"
              />
            </div>
            <div className="w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sender Name</label>
              <Input
                value={compose.senderName || config.config.defaultSenderName}
                onChange={(e) => compose.setSenderName(e.target.value)}
                placeholder="NBX Exchange"
                className="bg-input/30 text-sm"
              />
            </div>
          </div>

          {/* Recipients */}
          <RecipientInput
            label="To"
            recipients={compose.toRecipients}
            onChange={compose.setToRecipients}
            placeholder="Add recipients (press Enter or comma to add)"
          />

          {/* CC/BCC toggle */}
          <button
            type="button"
            onClick={() => setShowCcBcc(!showCcBcc)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {showCcBcc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            CC / BCC
          </button>

          {showCcBcc && (
            <div className="space-y-3">
              <RecipientInput
                label="CC"
                recipients={compose.ccRecipients}
                onChange={compose.setCcRecipients}
              />
              <RecipientInput
                label="BCC"
                recipients={compose.bccRecipients}
                onChange={compose.setBccRecipients}
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
            <Input
              value={compose.subject}
              onChange={(e) => compose.setSubject(e.target.value)}
              placeholder="Email subject..."
              className="bg-input/30 text-sm"
            />
          </div>

          {/* CSV Import toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCSVImport(!showCSVImport)}
              className={cn(showCSVImport && "border-primary text-primary")}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Bulk CSV Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn(showTemplates && "border-primary text-primary")}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Use Template
            </Button>
          </div>

          {/* CSV Import */}
          {showCSVImport && (
            <CSVImport
              contacts={csvImport.contacts}
              onImport={csvImport.setContacts}
              onClear={csvImport.clearContacts}
            />
          )}

          {/* Template selector */}
          {showTemplates && (
            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Select a template:</p>
              {templates.templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleUseTemplate(t)}
                  className="w-full text-left px-3 py-2.5 rounded-md border border-border bg-accent/20 hover:bg-accent/50 transition-colors"
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{t.subject}</p>
                </button>
              ))}
            </div>
          )}

          {/* Rich Text Editor */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Body</label>
            <RichTextEditor
              value={compose.bodyHtml}
              onChange={compose.setBodyHtml}
              placeholder="Write your email content here... Use {{COMPANY_NAME}} for personalization."
            />
          </div>

          {/* Bulk progress */}
          {bulkSending && (
            <div className="border border-border rounded-lg p-4 bg-card/50">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Sending bulk emails...</span>
              </div>
              <div className="w-full bg-accent rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                {bulkProgress.sent} / {bulkProgress.total} sent
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-border bg-card px-4 lg:px-6 py-3">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {csvImport.contacts.length > 0 && (
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {csvImport.contacts.length} CSV contacts loaded
              </span>
            )}
            {compose.toRecipients.length > 0 && (
              <span>{compose.toRecipients.length} direct recipient(s)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                compose.clearCompose();
                csvImport.clearContacts();
              }}
              className="text-muted-foreground"
            >
              Discard
            </Button>
            <Button
              onClick={handleSend}
              disabled={compose.isSending || bulkSending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {compose.isSending || bulkSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {csvImport.contacts.length > 0 ? `Send to ${csvImport.contacts.length} contacts` : 'Send'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
