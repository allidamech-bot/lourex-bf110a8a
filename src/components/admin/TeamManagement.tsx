import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Trash2, Shield, Briefcase, Headset, Truck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BentoCard from "@/components/BentoCard";

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  admin: { icon: Shield, label: "Admin", color: "text-primary" },
  manager: { icon: Briefcase, label: "Manager", color: "text-amber-500" },
  support: { icon: Headset, label: "Support", color: "text-blue-400" },
  logistics: { icon: Truck, label: "Logistics", color: "text-emerald-400" },
  viewer: { icon: UserCheck, label: "Viewer", color: "text-muted-foreground" },
};

export const TeamManagement = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "support" });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_staff")
      .select("*")
      .order("created_at", { ascending: false });
    setStaff((data as StaffMember[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.full_name) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("organization_staff").insert({
      owner_id: user?.id,
      email: form.email,
      full_name: form.full_name,
      role: form.role,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${form.full_name} added as ${form.role}`);
      setForm({ email: "", full_name: "", role: "support" });
      setShowForm(false);
      await fetchStaff();
    }
    setSubmitting(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("organization_staff").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Staff member removed"); await fetchStaff(); }
  };

  const getRoleConfig = (role: string) => ROLE_CONFIG[role] || ROLE_CONFIG.viewer;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-xl font-semibold">Team Management</h2>
        </div>
        <Button variant="gold" onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                placeholder="Full Name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="bg-secondary border-border"
                required
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-secondary border-border"
                required
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
              >
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <Button variant="gold" type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Team Member"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {staff.length === 0 ? (
        <BentoCard>
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No team members yet. Click "Add Staff" to get started.</p>
          </div>
        </BentoCard>
      ) : (
        <div className="space-y-3">
          {staff.map((member, i) => {
            const cfg = getRoleConfig(member.role);
            const Icon = cfg.icon;
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card rounded-xl p-4 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium bg-secondary ${cfg.color}`}>
                  {cfg.label}
                </span>
                <button
                  onClick={() => handleRemove(member.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
