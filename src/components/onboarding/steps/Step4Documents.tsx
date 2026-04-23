import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Upload, FileCheck, Image as ImageIcon, X } from "lucide-react";

export interface DocumentsPayload {
  crDoc: File | null;
  taxDoc: File | null;
  logo: File | null;
  cover: File | null;
}

interface Props {
  onComplete: (data: DocumentsPayload) => void;
  onBack: () => void;
  loading?: boolean;
}

export const Step4Documents = ({ onComplete, onBack, loading }: Props) => {
  const [crDoc, setCrDoc] = useState<File | null>(null);
  const [taxDoc, setTaxDoc] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!crDoc) {
      setError("Commercial registration document is required");
      return;
    }
    setError(null);
    onComplete({ crDoc, taxDoc, logo, cover });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-bold">Documents & branding</h2>
        <p className="text-sm text-muted-foreground">Upload official docs for verification. Branding helps you stand out.</p>
      </div>

      <FileSlot
        label="Commercial Registration *"
        hint="PDF, JPG, or PNG"
        accept=".pdf,.jpg,.jpeg,.png"
        file={crDoc}
        onChange={setCrDoc}
        icon={FileCheck}
      />

      <FileSlot
        label="Tax Certificate (optional)"
        hint="PDF, JPG, or PNG"
        accept=".pdf,.jpg,.jpeg,.png"
        file={taxDoc}
        onChange={setTaxDoc}
        icon={FileCheck}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileSlot
          label="Company logo (optional)"
          hint="Square PNG/JPG"
          accept=".jpg,.jpeg,.png,.webp"
          file={logo}
          onChange={setLogo}
          icon={ImageIcon}
        />
        <FileSlot
          label="Cover image (optional)"
          hint="Wide JPG/PNG"
          accept=".jpg,.jpeg,.png,.webp"
          file={cover}
          onChange={setCover}
          icon={ImageIcon}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        By submitting, you confirm the information is accurate. Our team typically reviews applications within 24–48 hours.
      </p>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 me-2" /> Back
        </Button>
        <Button type="submit" variant="gold" className="flex-1 h-11" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit application"}
        </Button>
      </div>
    </form>
  );
};

const FileSlot = ({
  label, hint, accept, file, onChange, icon: Icon,
}: {
  label: string; hint: string; accept: string; file: File | null; onChange: (f: File | null) => void; icon: React.ElementType;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file ? (
        <div className="flex items-center justify-between gap-2 bg-secondary/60 border border-border rounded-lg px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 truncate">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{file.name}</span>
          </div>
          <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full border border-dashed border-border rounded-lg px-3 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>{hint}</span>
        </button>
      )}
    </div>
  );
};
