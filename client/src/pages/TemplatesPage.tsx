import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit3, Trash2, FileText, Search, Tag, ArrowLeft, Save, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/email/RichTextEditor';
import { useTemplateStore, useEmailComposeStore } from '@/store/email-store';
import type { EmailTemplate } from '@/types/email';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

const categories = [
  { value: 'all', label: 'All' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'support', label: 'Support' },
  { value: 'admin', label: 'Admin' },
  { value: 'custom', label: 'Custom' },
];

export default function TemplatesPage() {
  const templates = useTemplateStore();
  const compose = useEmailComposeStore();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<EmailTemplate['category']>('custom');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formVariables, setFormVariables] = useState('');

  const filtered = templates.templates.filter((t) => {
    const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const grouped = categories
    .filter((c) => c.value !== 'all')
    .map((c) => ({
      ...c,
      templates: filtered.filter((t) => t.category === c.value),
    }))
    .filter((g) => categoryFilter === 'all' ? g.templates.length > 0 : g.value === categoryFilter);

  const startCreate = () => {
    setFormName('');
    setFormCategory('custom');
    setFormSubject('');
    setFormBody('');
    setFormVariables('');
    setIsCreating(true);
    setEditingTemplate(null);
  };

  const startEdit = (t: EmailTemplate) => {
    setFormName(t.name);
    setFormCategory(t.category);
    setFormSubject(t.subject);
    setFormBody(t.bodyHtml);
    setFormVariables(t.variables.join(', '));
    setEditingTemplate(t);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('Template name is required.');
      return;
    }
    if (!formSubject.trim()) {
      toast.error('Subject is required.');
      return;
    }

    const variables = formVariables
      .split(',')
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);

    if (isCreating) {
      const newTemplate: EmailTemplate = {
        id: uuidv4(),
        name: formName,
        category: formCategory,
        subject: formSubject,
        bodyHtml: formBody,
        variables,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      templates.addTemplate(newTemplate);
      toast.success('Template created!');
    } else if (editingTemplate) {
      templates.updateTemplate(editingTemplate.id, {
        name: formName,
        category: formCategory,
        subject: formSubject,
        bodyHtml: formBody,
        variables,
      });
      toast.success('Template updated!');
    }

    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleUse = (t: EmailTemplate) => {
    compose.loadTemplate(t);
    navigate('/');
    toast.info(`Template "${t.name}" loaded into composer.`);
  };

  // Editor view
  if (isCreating || editingTemplate) {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h3 className="text-sm font-semibold">{isCreating ? 'New Template' : 'Edit Template'}</h3>
        </div>
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-[800px] mx-auto space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Template Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Monthly Newsletter"
                  className="bg-input/30 text-sm"
                />
              </div>
              <div className="w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as EmailTemplate['category'])}
                  className="w-full h-9 px-3 rounded-md border border-border bg-input/30 text-sm text-foreground"
                >
                  <option value="marketing">Marketing</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject Line</label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Email subject with {{VARIABLES}}"
                className="bg-input/30 text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Variables <span className="text-muted-foreground/60">(comma-separated)</span>
              </label>
              <Input
                value={formVariables}
                onChange={(e) => setFormVariables(e.target.value)}
                placeholder="COMPANY_NAME, CONTACT_PERSON, MONTH"
                className="bg-input/30 text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email Body</label>
              <RichTextEditor value={formBody} onChange={setFormBody} />
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-border px-4 lg:px-6 py-3 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="w-4 h-4 mr-1.5" />
            {isCreating ? 'Create Template' : 'Save Changes'}
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 bg-input/30 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  categoryFilter === c.value
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Button onClick={startCreate} size="sm" className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No templates found</p>
            <Button onClick={startCreate} variant="outline" size="sm" className="mt-3">
              <Plus className="w-4 h-4 mr-1" /> Create your first template
            </Button>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto space-y-6">
            {grouped.map((group) => (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label} ({group.templates.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {group.templates.map((t) => (
                    <div
                      key={t.id}
                      className="border border-border rounded-lg p-4 bg-card/30 hover:bg-card/60 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{t.subject}</p>
                          {t.variables.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {t.variables.map((v) => (
                                <span key={v} className="px-1.5 py-0.5 rounded bg-accent text-[10px] font-mono text-muted-foreground">
                                  {`{{${v}}}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => handleUse(t)} title="Use template">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => startEdit(t)} title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Delete template "${t.name}"?`)) {
                                templates.deleteTemplate(t.id);
                                toast.success('Template deleted.');
                              }
                            }}
                            title="Delete"
                            className="hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
