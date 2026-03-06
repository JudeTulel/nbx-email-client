import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Email, EmailTemplate, AppConfig, CSVContact, EmailStatus } from '@/types/email';

// ---- Email Compose Store ----
interface EmailComposeState {
  sender: string;
  senderName: string;
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  subject: string;
  bodyHtml: string;
  isSending: boolean;
  sendError: string | null;

  setSender: (s: string) => void;
  setSenderName: (s: string) => void;
  setToRecipients: (r: string[]) => void;
  setCcRecipients: (r: string[]) => void;
  setBccRecipients: (r: string[]) => void;
  setSubject: (s: string) => void;
  setBodyHtml: (h: string) => void;
  setIsSending: (b: boolean) => void;
  setSendError: (e: string | null) => void;
  clearCompose: () => void;
  loadTemplate: (t: EmailTemplate) => void;
}

export const useEmailComposeStore = create<EmailComposeState>((set) => ({
  sender: '',
  senderName: '',
  toRecipients: [],
  ccRecipients: [],
  bccRecipients: [],
  subject: '',
  bodyHtml: '',
  isSending: false,
  sendError: null,

  setSender: (sender) => set({ sender }),
  setSenderName: (senderName) => set({ senderName }),
  setToRecipients: (toRecipients) => set({ toRecipients }),
  setCcRecipients: (ccRecipients) => set({ ccRecipients }),
  setBccRecipients: (bccRecipients) => set({ bccRecipients }),
  setSubject: (subject) => set({ subject }),
  setBodyHtml: (bodyHtml) => set({ bodyHtml }),
  setIsSending: (isSending) => set({ isSending }),
  setSendError: (sendError) => set({ sendError }),
  clearCompose: () => set({
    sender: '',
    senderName: '',
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
    subject: '',
    bodyHtml: '',
    isSending: false,
    sendError: null,
  }),
  loadTemplate: (t) => set({
    subject: t.subject,
    bodyHtml: t.bodyHtml,
  }),
}));

// ---- Email History Store ----
interface HistoryState {
  emails: Email[];
  searchQuery: string;
  statusFilter: EmailStatus | 'all';
  addEmail: (email: Email) => void;
  addEmails: (emails: Email[]) => void;
  updateEmailStatus: (id: string, status: EmailStatus, errorMessage?: string) => void;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (f: EmailStatus | 'all') => void;
  deleteEmail: (id: string) => void;
  clearHistory: () => void;
  getFilteredEmails: () => Email[];
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      emails: [],
      searchQuery: '',
      statusFilter: 'all',

      addEmail: (email) => set((state) => ({
        emails: [email, ...state.emails],
      })),
      addEmails: (emails) => set((state) => ({
        emails: [...emails, ...state.emails],
      })),
      updateEmailStatus: (id, status, errorMessage) => set((state) => ({
        emails: state.emails.map((e) =>
          e.id === id ? { ...e, status, errorMessage, updatedAt: new Date().toISOString() } : e
        ),
      })),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      deleteEmail: (id) => set((state) => ({
        emails: state.emails.filter((e) => e.id !== id),
      })),
      clearHistory: () => set({ emails: [] }),
      getFilteredEmails: () => {
        const { emails, searchQuery, statusFilter } = get();
        return emails.filter((e) => {
          const matchesSearch = !searchQuery ||
            e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.recipients.to.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase())) ||
            e.sender.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
          return matchesSearch && matchesStatus;
        });
      },
    }),
    { name: 'nbx-email-history' }
  )
);

// ---- Template Store ----
interface TemplateState {
  templates: EmailTemplate[];
  addTemplate: (t: EmailTemplate) => void;
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplatesByCategory: (cat: string) => EmailTemplate[];
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: uuidv4(),
    name: 'NBX SME Outreach',
    category: 'marketing',
    subject: 'Exclusive Invitation: Partner with NBX to Build Kenya\'s Capital Markets',
    bodyHtml: `<p>Dear <strong>{{COMPANY_NAME}}</strong> Leadership,</p>
<p>We are reaching out with an exciting opportunity to be part of a transformative movement in African capital markets. The <strong>Nairobi Block Exchange (NBX)</strong> is pioneering a regulated, blockchain-powered capital market designed specifically for promising SMEs like yours.</p>
<blockquote><p>Together, we can build Kenya. Your business is the backbone of our nation's economic growth, and we believe you deserve access to capital markets that recognize your potential.</p></blockquote>
<p>The NBX is currently developing a regulated capital market built on <strong>Hedera Hashgraph</strong>. It is designed to issue equities and bonds while unlocking regional and global capital access.</p>
<p>We are inviting select companies to express early interest in listing as part of our <strong>incubation and testnet development phase</strong>.</p>
<p>Kindly fill out the form: <a href="https://forms.gle/aHsL3MHpL31zL1gd9">NBX Interest Form</a></p>
<p>Or reach us on X (Previously Twitter): <a href="https://twitter.com/NBX_Exchange">@NBX_Exchange</a></p>
<p>We are looking forward to building the future of African capital markets together.</p>
<p>Warm regards,<br/>The NBX Team<br/>Nairobi Block Exchange<br/>www.nbx-exchange.co.ke</p>`,
    variables: ['COMPANY_NAME'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Welcome Email',
    category: 'support',
    subject: 'Welcome to NBX Exchange, {{COMPANY_NAME}}!',
    bodyHtml: `<p>Dear {{CONTACT_PERSON}},</p>
<p>Welcome to the <strong>Nairobi Block Exchange</strong> community! We're thrilled to have <strong>{{COMPANY_NAME}}</strong> on board.</p>
<p>As a member of our early access program, you'll be among the first to:</p>
<ul>
<li>Access our testnet platform for equity and bond issuance</li>
<li>Receive dedicated onboarding support</li>
<li>Shape the future of SME capital markets in Africa</li>
</ul>
<p>Our team will be in touch shortly to schedule your onboarding session.</p>
<p>Best regards,<br/>The NBX Team</p>`,
    variables: ['COMPANY_NAME', 'CONTACT_PERSON'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Monthly Newsletter',
    category: 'marketing',
    subject: '{{MONTH}} Newsletter — NBX Exchange Updates',
    bodyHtml: `<p>Dear {{COMPANY_NAME}},</p>
<p>Here's what's new at NBX this month:</p>
<h3>Platform Updates</h3>
<p>[Your updates here]</p>
<h3>Market Insights</h3>
<p>[Market insights here]</p>
<h3>Upcoming Events</h3>
<p>[Events here]</p>
<p>Stay connected,<br/>The NBX Team</p>`,
    variables: ['COMPANY_NAME', 'MONTH'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      addTemplate: (t) => set((state) => ({
        templates: [...state.templates, t],
      })),
      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        ),
      })),
      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      })),
      getTemplatesByCategory: (cat) => {
        return get().templates.filter((t) => cat === 'all' || t.category === cat);
      },
    }),
    { name: 'nbx-email-templates' }
  )
);

// ---- Config Store ----
interface ConfigState {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  updateSmtp: (updates: Partial<AppConfig['smtp']>) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: {
        smtp: {
          server: 'smtp.azurecomm.net',
          port: 587,
          username: '',
          password: '',
          useTls: true,
        },
        defaultSender: 'marketing@nbx-exchange.co.ke',
        defaultSenderName: 'NBX Exchange',
        autoSaveDrafts: true,
        signatureHtml: '<p>--<br/>Nairobi Block Exchange<br/>Building Africa\'s Capital Markets for Everyone<br/>www.nbx-exchange.co.ke</p>',
      },
      updateConfig: (updates) => set((state) => ({
        config: { ...state.config, ...updates },
      })),
      updateSmtp: (updates) => set((state) => ({
        config: {
          ...state.config,
          smtp: { ...state.config.smtp, ...updates },
        },
      })),
    }),
    { name: 'nbx-email-config' }
  )
);

// ---- CSV Import Store ----
interface CSVImportState {
  contacts: CSVContact[];
  isImporting: boolean;
  setContacts: (c: CSVContact[]) => void;
  setIsImporting: (b: boolean) => void;
  clearContacts: () => void;
}

export const useCSVImportStore = create<CSVImportState>((set) => ({
  contacts: [],
  isImporting: false,
  setContacts: (contacts) => set({ contacts }),
  setIsImporting: (isImporting) => set({ isImporting }),
  clearContacts: () => set({ contacts: [], isImporting: false }),
}));
