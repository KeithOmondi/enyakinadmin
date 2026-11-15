import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProductThumb } from '@/components/ProductThumb';
import { Button } from '@/components/ui';

/** What the user chose: nothing, a new file, or "remove the current photo". */
export type PhotoChoice = { kind: 'none' } | { kind: 'file'; file: File } | { kind: 'remove' };

export function PhotoField({
  currentUrl,
  alt,
  choice,
  onChange,
  disabled,
}: {
  currentUrl: string | null;
  alt: string;
  choice: PhotoChoice;
  onChange: (c: PhotoChoice) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (choice.kind !== 'file') return setPreview(null);
    const url = URL.createObjectURL(choice.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [choice]);

  const shown = choice.kind === 'file' ? preview : choice.kind === 'remove' ? null : currentUrl;

  return (
    <div className="flex items-center gap-4">
      <ProductThumb url={shown} alt={alt} className="size-24 rounded-lg border border-border" />
      <div className="flex flex-col items-start gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Product photo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange({ kind: 'file', file });
            e.target.value = ''; // allow choosing the same file again
          }}
        />
        <Button variant="outline" disabled={disabled} onClick={() => input.current?.click()}>
          <Camera /> {shown ? 'Change photo' : 'Add photo'}
        </Button>
        {shown && (
          <Button variant="ghost" className="min-h-9 text-destructive" disabled={disabled} onClick={() => onChange(currentUrl ? { kind: 'remove' } : { kind: 'none' })}>
            <Trash2 /> Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP. Resized automatically.</p>
      </div>
    </div>
  );
}
