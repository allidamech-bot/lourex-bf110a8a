import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onComplete: (data: { userId: string; email: string; contactName: string; phone: string }) => void;
  initialEmail?: string;
  alreadyAuthenticated?: boolean;
  initialContactName?: string;
  initialPhone?: string;
}

export const Step1Account = ({ onComplete, initialEmail, alreadyAuthenticated, initialContactName, initialPhone }: Props) => {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [contactName, setContactName] = useState(initialContactName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contactName.trim() || contactName.trim().length < 2) e.contactName = "Enter your full name";
    if (!phone.trim() || phone.trim().length < 6) e.phone = "Enter a valid phone number";
    if (!alreadyAuthenticated) {
      if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email";
      if (password.length < 8) e.password = "At least 8 characters";
      else if (!/[A-Z]/.test(password)) e.password = "Add an uppercase letter";
      else if (!/[0-9]/.test(password)) e.password = "Add a number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      let userId: string | null = null;

      if (alreadyAuthenticated) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Session expired. Please sign in again.");
        userId = user.id;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/factory-signup`,
            data: { full_name: contactName.trim() },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered")) {
            setErrors({ email: "An account already exists for this email. Please sign in." });
            toast.error("Account already exists. Sign in to continue your application.");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }
        userId = data.user?.id ?? null;
        if (!data.session && !userId) {
          // Email confirmation required
          toast.success("Check your inbox to confirm your email, then continue.");
          setLoading(false);
          return;
        }
      }

      if (!userId) {
        toast.error("Could not create your account. Please try again.");
        setLoading(false);
        return;
      }

      onComplete({ userId, email: email.trim(), contactName: contactName.trim(), phone: phone.trim() });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-bold">{alreadyAuthenticated ? "Confirm your contact details" : "Create your supplier account"}</h2>
        <p className="text-sm text-muted-foreground">
          {alreadyAuthenticated
            ? "We'll use these details to contact you about your application."
            : "Use your business email. You'll set up your company in the next steps."}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Contact person *</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="ps-10" placeholder="Full name" autoComplete="name" />
        </div>
        {errors.contactName && <p className="text-xs text-destructive">{errors.contactName}</p>}
      </div>

      <div className="space-y-2">
        <Label>Phone *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="ps-10" placeholder="+90 555 123 4567" autoComplete="tel" />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
      </div>

      <div className="space-y-2">
        <Label>Business email *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ps-10"
            placeholder="you@company.com"
            autoComplete="email"
            disabled={alreadyAuthenticated}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      {!alreadyAuthenticated && (
        <div className="space-y-2">
          <Label>Password *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ps-10"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
            />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>
      )}

      <Button type="submit" variant="gold" className="w-full h-11" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
      </Button>
    </form>
  );
};
