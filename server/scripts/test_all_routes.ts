import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const BASE_URL = "http://localhost:4000";

interface TestResult {
  route: string;
  method: string;
  status: "PASS" | "FAIL";
  httpCode: number;
  details?: string;
}

async function runRouteTestSuite() {
  console.log("==================================================");
  console.log("🧪 TESTING ALL CONFLUENCE SERVER ROUTES LIVE");
  console.log(`🎯 Target Server: ${BASE_URL}`);
  console.log("==================================================\n");

  const results: TestResult[] = [];
  let authToken = "";
  let sessionCookie = "";
  let createdWatchlistId = "";
  let createdBacktestId = "";
  let createdRunId = "";
  let createdProposalId = "";
  let createdOrderId = "";

  async function request(
    method: string,
    endpoint: string,
    body?: any,
    headers: Record<string, string> = {}
  ) {
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };
    if (authToken && !reqHeaders["Authorization"]) {
      reqHeaders["Authorization"] = `Bearer ${authToken}`;
    }
    if (sessionCookie && !reqHeaders["Cookie"]) {
      reqHeaders["Cookie"] = sessionCookie;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Capture set-cookie if provided
    const cookieHeader = res.headers.get("set-cookie");
    if (cookieHeader) {
      sessionCookie = cookieHeader.split(";")[0];
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch (e) {
      data = await res.text();
    }

    return { status: res.status, data, ok: res.ok };
  }

  // 1. Health Check
  try {
    const res = await request("GET", "/health");
    results.push({
      route: "/health",
      method: "GET",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: res.data?.service,
    });
  } catch (err: any) {
    results.push({ route: "/health", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 2. Auth: Register
  const testEmail = `trader_${Date.now()}@example.com`;
  try {
    const res = await request("POST", "/api/auth/register", {
      email: testEmail,
      password: "SuperSecretPassword123!",
      displayName: "Quantitative Tester",
    });
    if (res.data?.token) authToken = res.data.token;
    results.push({
      route: "/api/auth/register",
      method: "POST",
      status: res.status === 201 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: res.data?.user?.email,
    });
  } catch (err: any) {
    results.push({ route: "/api/auth/register", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 3. Auth: Login
  try {
    const res = await request("POST", "/api/auth/login", {
      email: testEmail,
      password: "SuperSecretPassword123!",
    });
    if (res.data?.token) authToken = res.data.token;
    results.push({
      route: "/api/auth/login",
      method: "POST",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: "JWT cookie and Bearer issued",
    });
  } catch (err: any) {
    results.push({ route: "/api/auth/login", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 4. Auth: Get Current Profile (/me)
  try {
    const res = await request("GET", "/api/auth/me");
    results.push({
      route: "/api/auth/me",
      method: "GET",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: res.data?.user?.displayName,
    });
  } catch (err: any) {
    results.push({ route: "/api/auth/me", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 5. Onboarding: Full Onboarding Flow
  const onboardingEmail = `onboard_${Date.now()}@example.com`;
  try {
    const res = await request("POST", "/api/onboarding", {
      displayName: "Onboarded Pro",
      email: onboardingEmail,
      password: "StrongPassword987!",
      riskCategory: "balanced",
      allocatableCapital: 50000,
      maxPositionPct: 15,
      maxDailyLossPct: 5,
      marketFocus: ["equities"],
      notificationEmail: onboardingEmail,
      alpacaPaperKey: "PK_TEST_SAMPLE_KEY_12345",
      alpacaPaperSecret: "SK_TEST_SAMPLE_SECRET_67890",
    });
    // Switch to this user for the rest of tests
    if (res.data?.token) authToken = res.data.token;
    results.push({
      route: "/api/onboarding",
      method: "POST",
      status: res.status === 201 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Capital: $${res.data?.riskProfile?.allocatableCapital}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/onboarding", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 6. Risk Profile: GET
  try {
    const res = await request("GET", "/api/risk-profile");
    results.push({
      route: "/api/risk-profile",
      method: "GET",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Category: ${res.data?.riskCategory}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/risk-profile", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 7. Risk Profile: PUT
  try {
    const res = await request("PUT", "/api/risk-profile", {
      maxPositionPct: 12,
      maxDailyLossPct: 4,
    });
    results.push({
      route: "/api/risk-profile",
      method: "PUT",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Updated Max Pos: ${res.data?.maxPositionPct}%`,
    });
  } catch (err: any) {
    results.push({ route: "/api/risk-profile", method: "PUT", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 8. Credentials: POST
  try {
    const res = await request("POST", "/api/credentials", {
      provider: "groq",
      key: "gsk_test_credential_encryption_check",
    });
    results.push({
      route: "/api/credentials",
      method: "POST",
      status: res.status === 201 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Masked: ${res.data?.maskedKey}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/credentials", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 9. Credentials: GET
  try {
    const res = await request("GET", "/api/credentials");
    results.push({
      route: "/api/credentials",
      method: "GET",
      status: res.status === 200 && Array.isArray(res.data) ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Count: ${res.data?.length || 0}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/credentials", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 10. Watchlist: POST (Add Ticker)
  try {
    const res = await request("POST", "/api/watchlist", {
      ticker: "AAPL",
      assetClass: "equity",
    });
    if (res.data?._id) createdWatchlistId = res.data._id;
    results.push({
      route: "/api/watchlist",
      method: "POST",
      status: res.status === 201 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Added ${res.data?.ticker}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/watchlist", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 11. Watchlist: GET
  try {
    const res = await request("GET", "/api/watchlist");
    results.push({
      route: "/api/watchlist",
      method: "GET",
      status: res.status === 200 && Array.isArray(res.data) ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Watchlist items: ${res.data?.length || 0}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/watchlist", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 12. Quant Factors: GET /api/factors/:ticker
  try {
    const res = await request("GET", "/api/factors/AAPL");
    results.push({
      route: "/api/factors/:ticker",
      method: "GET",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Composite: ${res.data?.current?.compositeScore}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/factors/:ticker", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 13. Forecasts: GET /api/forecasts/:ticker
  try {
    const res = await request("GET", "/api/forecasts/AAPL?horizon=5d");
    results.push({
      route: "/api/forecasts/:ticker",
      method: "GET",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Median: $${res.data?.median}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/forecasts/:ticker", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 14. Backtests: POST
  try {
    const res = await request("POST", "/api/backtests", {
      strategyName: "Alpha-Momentum-Test",
      tickerUniverse: ["AAPL"],
      startDate: "2025-01-01",
      endDate: "2026-01-01",
    });
    if (res.data?.backtestId) createdBacktestId = res.data.backtestId;
    results.push({
      route: "/api/backtests",
      method: "POST",
      status: res.status === 202 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `ID: ${createdBacktestId}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/backtests", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 15. Backtests: GET List
  try {
    const res = await request("GET", "/api/backtests");
    results.push({
      route: "/api/backtests",
      method: "GET",
      status: res.status === 200 && Array.isArray(res.data) ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Total backtests: ${res.data?.length || 0}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/backtests", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 16. Analysis Runs: POST /api/analysis/run
  try {
    const res = await request("POST", "/api/analysis/run", {
      ticker: "AAPL",
      horizon: "5d",
      minConfidence: 0.60,
      debateRounds: 1,
      requireUnanimousConvergence: false,
    });
    if (res.data?.runId) createdRunId = res.data.runId;
    results.push({
      route: "/api/analysis/run",
      method: "POST",
      status: res.status === 202 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Run ID: ${createdRunId}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/analysis/run", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 17. Analysis Runs: GET List
  try {
    const res = await request("GET", "/api/analysis/runs");
    results.push({
      route: "/api/analysis/runs",
      method: "GET",
      status: res.status === 200 && Array.isArray(res.data) ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Active runs: ${res.data?.length || 0}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/analysis/runs", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 18. Analysis Runs: GET Single Run
  if (createdRunId) {
    try {
      const res = await request("GET", `/api/analysis/runs/${createdRunId}`);
      results.push({
        route: "/api/analysis/runs/:id",
        method: "GET",
        status: res.status === 200 ? "PASS" : "FAIL",
        httpCode: res.status,
        details: `Status: ${res.data?.status}`,
      });
    } catch (err: any) {
      results.push({ route: "/api/analysis/runs/:id", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
    }
  }

  // 19. Kill Switch: Engage
  try {
    const res = await request("POST", "/api/kill-switch/engage");
    results.push({
      route: "/api/kill-switch/engage",
      method: "POST",
      status: res.status === 200 ? "PASS" : "FAIL",
      httpCode: res.status,
      details: "Kill switch ENGAGED",
    });
  } catch (err: any) {
    results.push({ route: "/api/kill-switch/engage", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 20. Kill Switch: Status
  try {
    const res = await request("GET", "/api/kill-switch/status");
    results.push({
      route: "/api/kill-switch/status",
      method: "GET",
      status: res.status === 200 && res.data?.isEngaged === true ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `isEngaged: ${res.data?.isEngaged}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/kill-switch/status", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 21. Kill Switch: Disengage
  try {
    const res = await request("POST", "/api/kill-switch/disengage");
    results.push({
      route: "/api/kill-switch/disengage",
      method: "POST",
      status: res.status === 200 && res.data?.state?.isEngaged === false ? "PASS" : "FAIL",
      httpCode: res.status,
      details: "Kill switch DISENGAGED",
    });
  } catch (err: any) {
    results.push({ route: "/api/kill-switch/disengage", method: "POST", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 22. Proposals: GET
  try {
    const res = await request("GET", "/api/proposals");
    results.push({
      route: "/api/proposals",
      method: "GET",
      status: res.status === 200 && Array.isArray(res.data) ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Proposals: ${res.data?.length || 0}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/proposals", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 23. Orders: GET
  try {
    const res = await request("GET", "/api/orders");
    results.push({
      route: "/api/orders",
      method: "GET",
      status: res.status === 200 && Array.isArray(res.data) ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Orders: ${res.data?.length || 0}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/orders", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 24. Audit Log: GET
  try {
    const res = await request("GET", "/api/audit-log");
    results.push({
      route: "/api/audit-log",
      method: "GET",
      status: res.status === 200 && Array.isArray(res.data) ? "PASS" : "FAIL",
      httpCode: res.status,
      details: `Logged events: ${res.data?.length || 0}`,
    });
  } catch (err: any) {
    results.push({ route: "/api/audit-log", method: "GET", status: "FAIL", httpCode: 0, details: err.message });
  }

  // 25. Watchlist: DELETE
  if (createdWatchlistId) {
    try {
      const res = await request("DELETE", `/api/watchlist/${createdWatchlistId}`);
      results.push({
        route: "/api/watchlist/:id",
        method: "DELETE",
        status: res.status === 200 ? "PASS" : "FAIL",
        httpCode: res.status,
        details: "Item removed",
      });
    } catch (err: any) {
      results.push({ route: "/api/watchlist/:id", method: "DELETE", status: "FAIL", httpCode: 0, details: err.message });
    }
  }

  // Print Complete Results Table
  console.log("==================================================");
  console.log("📊 ALL ROUTES TEST RESULTS SUMMARY");
  console.log("==================================================");
  console.table(results);

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n🏁 Completed: ${passed} PASSED, ${failed} FAILED (Total: ${results.length} endpoints)`);
}

runRouteTestSuite();
