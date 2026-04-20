import { forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, User, Building2, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Auth = forwardRef<HTMLDivElement>((_props, _ref) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
    if (!/[0-9]/.test(pw)) return "Password must contain a number";
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) return "Password must contain a special character";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin) {
      const pwError = validatePassword(password);
      if (pwError) {
        toast.error(pwError);
        setLoading(false);
        return;
      }
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const { error: otpError } = await supabase.auth.signInWithOtp({ email });
      if (otpError) {
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.info("A verification code has been sent to your email.");
        setOtpStep(true);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, company_name: company } },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account.");
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    if (error) {
      toast.error("Invalid or expired code. Please try again.");
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) toast.error(error.message);
    else toast.success("New code sent to your email.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-gradient-gold tracking-wider mb-2">
            LOUREX
          </h1>
          <p className="text-muted-foreground">
            {otpStep
              ? "Enter the verification code sent to your email"
              : isLogin
              ? "Sign in to your dashboard"
              : "Create your merchant account"}
          </p>
        </div>

        <div className="glass-card rounded-xl p-8">
          {otpStep ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Code sent to <span className="text-foreground font-medium">{email}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button variant="gold" className="w-full h-11" disabled={loading || otp.length < 6} onClick={handleVerifyOtp}>
                {loading ? "Verifying..." : "Verify & Enter"}
              </Button>
              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full text-center"
              >
                Didn't receive a code? Resend
              </button>
              <button
                onClick={() => { setOtpStep(false); setOtp(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full text-center"
              >
                ← Back to login
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 bg-secondary border-border"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Company Name"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="pl-10 bg-secondary border-border"
                      />
                    </div>
                  </>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    required
                    minLength={8}
                  />
                </div>
                <Button variant="gold" className="w-full h-11" disabled={loading}>
                  {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
                <div className="pt-3 border-t border-border/50">
                  <button
                    onClick={() => navigate("/factory-signup")}
                    className="text-sm text-primary hover:text-primary/80 transition-colors block w-full font-medium"
                  >
                    🏭 Are you a supplier? Register your company →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
});

Auth.displayName = "Auth";

export default Auth;
