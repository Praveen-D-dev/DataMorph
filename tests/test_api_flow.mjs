async function runIntegrationTest() {
  console.log("=== DataMorph End-to-End API Integration Test ===");
  const baseUrl = "http://localhost:3001/api";

  // 1. List Datasets
  const listRes = await fetch(`${baseUrl}/datasets`);
  const listJson = await listRes.json();
  console.log(`[1] Datasets retrieved: ${listJson.data.length} registered datasets`);
  if (listJson.data.length === 0) throw new Error("No datasets found");

  const sampleSales = listJson.data.find(d => d.filename === "sales.csv");
  console.log(`[2] Target dataset: ${sampleSales.filename} (ID: ${sampleSales.id})`);

  // 2. Profile Dataset
  const profileRes = await fetch(`${baseUrl}/datasets/${sampleSales.id}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forceRecalculate: false })
  });
  const profileJson = await profileRes.json();
  console.log(`[3] Profile computed: ${profileJson.data.file_info.row_count} rows, classification: ${profileJson.data.structural_classification}`);

  // 3. Generate Dashboard
  const dashRes = await fetch(`${baseUrl}/datasets/${sampleSales.id}/dashboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const dashJson = await dashRes.json();
  const dashboard = dashJson.data;
  console.log(`[4] Dashboard synthesized: "${dashboard.title}" with ${dashboard.kpis.length} KPIs and ${dashboard.visualizations.length} Charts`);

  // 4. Natural Language Command Execution
  const cmdRes = await fetch(`${baseUrl}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      command: "filter region to Europe",
      dashboardId: dashboard.id
    })
  });
  const cmdJson = await cmdRes.json();
  console.log(`[5] Natural Language Command processed:`);
  console.log(`    Intent: ${cmdJson.data.intent}`);
  console.log(`    Action: ${cmdJson.data.action_summary}`);
  console.log(`    Active Filters:`, cmdJson.data.updated_dashboard.active_filters);

  // 5. Voice Command Execution
  const voiceRes = await fetch(`${baseUrl}/voice/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: "change primary chart to line chart",
      dashboardId: dashboard.id
    })
  });
  const voiceJson = await voiceRes.json();
  console.log(`[6] Voice Command processed:`);
  console.log(`    Action: ${voiceJson.data.action_summary}`);
  if (listJson.status !== "success") throw new Error(`List failed: ${listJson.error?.message}`);
  if (profileJson.status !== "success") throw new Error(`Profile failed: ${profileJson.error?.message}`);
  if (dashJson.status !== "success") throw new Error(`Dashboard failed: ${dashJson.error?.message}`);
  if (cmdJson.status !== "success") throw new Error(`Command failed: ${cmdJson.error?.message}`);
  if (!cmdJson.data?.updated_dashboard?.active_filters) throw new Error("Expected active_filters on dashboard");
  if (voiceJson.status !== "success") throw new Error(`Voice command failed: ${voiceJson.error?.message}`);

  console.log("=== All Integration Tests PASSED Successfully! ===");
}

runIntegrationTest().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
