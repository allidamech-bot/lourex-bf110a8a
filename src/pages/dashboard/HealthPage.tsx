import { SystemHealthPanel } from "@/features/system/SystemHealthPanel";
import { BackendReadinessPanel } from "@/features/system/BackendReadinessPanel";

const HealthPage = () => (
  <div className="space-y-6">
    <BackendReadinessPanel />
    <SystemHealthPanel />
  </div>
);

export default HealthPage;
