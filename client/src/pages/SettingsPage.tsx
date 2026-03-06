import { useState } from 'react';
import { tauriEmailApi } from '@/lib/tauri-api';
import { Save, TestTube, CheckCircle2, XCircle, Loader2, Server, User, Info, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfigStore } from '@/store/email-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { config, updateConfig } = useConfigStore();
  const [smtpUsername, setSmtpUsername] = useState('marketing@nbx-exchange.co.ke');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCredentials = async () => {
    if (!smtpUsername || !smtpPassword) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsSaving(true);
    try {
      await tauriEmailApi.saveSmtpCredentials(smtpUsername, smtpPassword);
      toast.success('SMTP credentials saved securely!');
      setSmtpPassword(''); // Clear password field
    } catch (error: any) {
      toast.error('Failed to save credentials: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await tauriEmailApi.testSmtpConnection(smtpUsername);
      toast.success(result);
    } catch (error: any) {
      toast.error('Connection failed: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="h-full overflow-auto p-4 lg:p-6">
      <div className="max-w-[700px] mx-auto space-y-8">
        {/* SMTP Configuration */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Azure SMTP Configuration</h3>
          </div>
          <div className="border border-border rounded-lg p-5 bg-card/30 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SMTP Server</label>
                <Input value="smtp.azurecomm.net" disabled className="bg-input/30 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Port</label>
                <Input value="587" disabled className="bg-input/30 text-sm font-mono" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username (Sender Address)</label>
              <Input
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                placeholder="marketing@nbx-exchange.co.ke"
                className="bg-input/30 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use: marketing@, support@, or info@nbx-exchange.co.ke
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password (Azure Client Secret)</label>
              <Input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="Paste your Azure client secret here"
                className="bg-input/30 text-sm font-mono pr-20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Stored securely in your system keychain (Windows Credential Manager / macOS Keychain)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveCredentials}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-1.5" /> Save Credentials</>}
              </Button>

              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Testing...</> : <><TestTube className="w-4 h-4 mr-1.5" /> Test Connection</>}
              </Button>
            </div>
          </div>
        </section>

        {/* General Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">General Settings</h3>
          </div>
          <div className="border border-border rounded-lg p-5 bg-card/30 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Sender Email</label>
                <Input
                  value={config.defaultSender}
                  onChange={(e) => updateConfig({ defaultSender: e.target.value })}
                  placeholder="marketing@nbx-exchange.co.ke"
                  className="bg-input/30 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Sender Name</label>
                <Input
                  value={config.defaultSenderName}
                  onChange={(e) => updateConfig({ defaultSenderName: e.target.value })}
                  placeholder="NBX Exchange"
                  className="bg-input/30 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSave"
                checked={config.autoSaveDrafts}
                onChange={(e) => updateConfig({ autoSaveDrafts: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="autoSave" className="text-xs text-muted-foreground">
                Auto-save drafts every 30 seconds
              </label>
            </div>
          </div>
        </section>

        {/* Email Signature */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Email Signature</h3>
          </div>
          <div className="border border-border rounded-lg p-5 bg-card/30">
            <textarea
              value={config.signatureHtml}
              onChange={(e) => updateConfig({ signatureHtml: e.target.value })}
              rows={4}
              placeholder="Your email signature (HTML supported)"
              className="w-full bg-input/30 border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </section>

        {/* About */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">About</h3>
          </div>
          <div className="border border-border rounded-lg p-5 bg-card/30">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application</span>
                <span className="font-mono">NBX Email Client</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-mono">Nairobi Block Exchange</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Website</span>
                <a href="https://www.nbx-exchange.co.ke" target="_blank" rel="noopener" className="font-mono text-primary hover:underline">
                  nbx-exchange.co.ke
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="w-4 h-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
