import React from "react";

const GradientMeshBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#060B14]">
      {/* Blue Gradient Orb */}
      <div 
        className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-blue-600/20 blur-[120px]"
        aria-hidden="true"
      />
      {/* Cyan Gradient Orb */}
      <div 
        className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-cyan-500/10 blur-[100px]"
        aria-hidden="true"
      />
      {/* Soft noise/grain overlay or just a subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(6,11,20,0.4)_100%)]" />
    </div>
  );
};

export default GradientMeshBackground;
