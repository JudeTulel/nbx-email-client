export interface Recipients {
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // base64
}

export type EmailStatus = 'draft' | 'sent' | 'failed' | 'sending';

export interface Email {
  id: string;
  sender: string;
  senderName: string;
  recipients: Recipients;
  subject: string;
  bodyHtml: string;
  bodyPlainText: string;
  sentAt: string;
  status: EmailStatus;
  errorMessage?: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'marketing' | 'support' | 'admin' | 'custom';
  subject: string;
  bodyHtml: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SmtpConfig {
  server: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
}

export interface AppConfig {
  smtp: SmtpConfig;
  defaultSender: string;
  defaultSenderName: string;
  autoSaveDrafts: boolean;
  signatureHtml: string;
}

export interface CSVContact {
  companyName: string;
  email: string;
  contactPerson?: string;
  [key: string]: string | undefined;
}
