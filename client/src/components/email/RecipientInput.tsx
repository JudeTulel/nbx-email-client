import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipientInputProps {
  label: string;
  recipients: string[];
  onChange: (recipients: string[]) => void;
  placeholder?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function RecipientInput({ label, recipients, onChange, placeholder }: RecipientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addRecipient = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setError(`"${trimmed}" is not a valid email`);
      return;
    }
    if (recipients.includes(trimmed)) {
      setError(`"${trimmed}" is already added`);
      return;
    }
    setError('');
    onChange([...recipients, trimmed]);
    setInputValue('');
  };

  const removeRecipient = (email: string) => {
    onChange(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addRecipient(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      removeRecipient(recipients[recipients.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const emails = text.split(/[,;\n\r\t]+/).map((s) => s.trim()).filter(Boolean);
    const valid: string[] = [];
    for (const email of emails) {
      if (isValidEmail(email) && !recipients.includes(email.toLowerCase())) {
        valid.push(email.toLowerCase());
      }
    }
    if (valid.length > 0) {
      onChange([...recipients, ...valid]);
    }
    setInputValue('');
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-input/30 min-h-[40px] cursor-text transition-colors",
          "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {recipients.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent text-xs font-mono text-accent-foreground"
          >
            {email}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeRecipient(email);
              }}
              className="hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) addRecipient(inputValue);
          }}
          placeholder={recipients.length === 0 ? (placeholder || 'Type email and press Enter') : ''}
          className="flex-1 min-w-[150px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
