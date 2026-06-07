import { runChaosSweep } from "../domain/simulation/chaosEngine";

console.log("=========================================");
console.log("LOUREX CHAOS TESTING FRAMEWORK (SANDBOX)");
console.log("=========================================\n");

const results = runChaosSweep();

console.log("=== RESULTS MATRIX ===");
console.log(JSON.stringify(results, null, 2));

const allPassed = results.every((r) => r.stoppedByGuard && r.alertTriggered);

console.log("\n=== SUMMARY ===");
if (allPassed) {
  console.log("✅ SUCCESS: All structural guards and telemetry triggers function flawlessly under stress scenarios.");
} else {
  console.log("❌ FAILURE: One or more structural guards failed to block a critical breach, or telemetry failed to capture the event.");
}
console.log("=========================================");
