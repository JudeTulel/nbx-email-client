import { invoke } from '@tauri-apps/api/core';

export interface SendEmailRequest {
  sender: string;
  sender_name: string;
  recipients: {
    to: string[];
    cc?: string[];
    bcc?: string[];
  };
  subject: string;
  body_html: string;
  body_plain_text: string;
}

export const tauriEmailApi = {
  /**
   * Send an email via Azure SMTP
   */
  async sendEmail(request: SendEmailRequest): Promise<string> {
    try {
      const result = await invoke<string>('send_email', { request });
      return result;
    } catch (error) {
      throw new Error(String(error));
    }
  },

  /**
   * Save SMTP credentials securely to system keychain
   */
  async saveSmtpCredentials(username: string, password: string): Promise<void> {
    await invoke('save_smtp_credentials', { username, password });
  },

  /**
   * Test SMTP connection
   */
  async testSmtpConnection(username: string): Promise<string> {
    return await invoke<string>('test_smtp_connection', { username });
  },

  /**
   * Delete SMTP credentials from keychain
   */
  async deleteSmtpCredentials(username: string): Promise<void> {
    await invoke('delete_smtp_credentials', { username });
  },
};
