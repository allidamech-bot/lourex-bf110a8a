import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Trash2, Shield, Briefcase, Headset, Truck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BentoCard from "@/components/BentoCard";

import { LourexRole, LOUREX_ROLES, INTERNAL_ROLES } from "@/features/auth/rbac";

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: LourexRole;
  status: string;
  created_at: string;
}

const ROLE_CONFIG: Record<LourexRole, { icon: typeof Shield; label: string; color: string }> = {
  owner: { icon: Shield, label: "Owner", color: "text-primary" },
  operations_employee: { icon: Briefcase, label: "Operations", color: "text-amber-500" },
  turkish_partner: { icon: Truck, label: "TR Partner", color: "text-emerald-400" },
  saudi_partner: { icon: Truck, label: "SA Partner", color: "text-emerald-400" },
  customer: { icon: UserCheck, label: "Customer", color: "text-muted-foreground" },
};

export const TeamManagement = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "operations_employee" as LourexRole });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("role", INTERNAL_ROLES)
      .order("created_at", { ascending: false });
    setStaff((data as any) || []);
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
    
    // Note: In a real system, we might invite the user or create a profile.
    // For this UI, we update or insert into profiles.
    const { error } = await supabase.from("profiles").upsert({
      email: form.email,
      full_name: form.full_name,
      role: form.role,
      status: "active",
    } as any, { onConflict: "email" });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${form.full_name} added/updated as ${form.role}`);
      setForm({ email: "", full_name: "", role: "operations_employee" });
      setShowForm(false);
      await fetchStaff();
    }
    setSubmitting(false);
  };

  const handleRemove = async (id: string) => {
    // Instead of deleting the user (which might be dangerous), we reset their role to customer
    const { error } = await supabase.from("profiles").update({ role: "customer" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Staff access removed (reverted to customer)"); await fetchStaff(); }
  };

  const getRoleConfig = (role: LourexRole) => ROLE_CONFIG[role] || ROLE_CONFIG.customer;

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
                onChange={(e) => setForm({ ...form, role: e.target.value as LourexRole })}
                className="h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
              >
                {INTERNAL_ROLES.map((role) => (
                  <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
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
