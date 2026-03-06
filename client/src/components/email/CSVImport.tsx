import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CSVContact } from '@/types/email';
import { cn } from '@/lib/utils';

interface CSVImportProps {
  onImport: (contacts: CSVContact[]) => void;
  contacts: CSVContact[];
  onClear: () => void;
}

export default function CSVImport({ onImport, contacts, onClear }: CSVImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const parseCSV = (file: File) => {
    setError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        if (data.length === 0) {
          setError('CSV file is empty or has no valid rows.');
          return;
        }

        // Try to find email and company name columns
        const headers = Object.keys(data[0]).map((h) => h.toLowerCase().trim());
        const emailKey = Object.keys(data[0]).find((k) => {
          const lower = k.toLowerCase().trim();
          return lower === 'email' || lower === 'e-mail' || lower === 'email_address' || lower === 'emailaddress';
        });
        const companyKey = Object.keys(data[0]).find((k) => {
          const lower = k.toLowerCase().trim();
          return lower === 'company' || lower === 'company_name' || lower === 'companyname' || lower === 'business' || lower === 'business_name';
        });
        const contactKey = Object.keys(data[0]).find((k) => {
          const lower = k.toLowerCase().trim();
          return lower === 'contact' || lower === 'contact_person' || lower === 'name' || lower === 'contact_name';
        });

        if (!emailKey) {
          setError('Could not find an "email" column in the CSV. Please ensure your CSV has a column named "email".');
          return;
        }

        const contacts: CSVContact[] = data
          .filter((row) => row[emailKey]?.trim())
          .map((row) => ({
            email: row[emailKey]!.trim(),
            companyName: companyKey ? row[companyKey]?.trim() || '' : '',
            contactPerson: contactKey ? row[contactKey]?.trim() : undefined,
            ...row,
          }));

        if (contacts.length === 0) {
          setError('No valid email addresses found in the CSV.');
          return;
        }

        onImport(contacts);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file.');
      return;
    }
    parseCSV(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (contacts.length > 0) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{contacts.length} contacts loaded</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        </div>
        <div className="max-h-[150px] overflow-auto space-y-1">
          {contacts.slice(0, 20).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-1 px-2 rounded bg-accent/30">
              <span className="text-foreground">{c.companyName || 'Unknown'}</span>
              <span className="text-muted-foreground">—</span>
              <span>{c.email}</span>
            </div>
          ))}
          {contacts.length > 20 && (
            <p className="text-xs text-muted-foreground px-2 py-1">...and {contacts.length - 20} more</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-1">
          Drop a CSV file here or <span className="text-primary font-medium">browse</span>
        </p>
        <p className="text-xs text-muted-foreground/60">
          CSV must have columns: email, company (optional: contact_person)
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
