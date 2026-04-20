import { SupplierStateGate } from "@/components/onboarding/SupplierStateGate";
import { ActivationChecklist } from "@/components/onboarding/ActivationChecklist";
import { FactoryCommandCenter } from "@/components/factory/FactoryCommandCenter";

const FactoryDashboard = () => (
  <SupplierStateGate>
    {(ctx) => (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-24 md:pt-28">
          <ActivationChecklist checklist={ctx.checklist} />
        </div>
        <FactoryCommandCenter />
      </div>
    )}
  </SupplierStateGate>
);

export default FactoryDashboard;
