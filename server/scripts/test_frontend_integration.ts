/**
 * End-to-End Frontend-Backend Integration Test
 * Verifies all API flows through the Vite proxy (port 5173 -> port 4000)
 */

const BASE_URL = "http://localhost:5173/api";

interface TestResult {
  step: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

async function run() {
  console.log("=================================================");
  console.log("  CONFLUENCE FRONTEND-BACKEND INTEGRATION TESTS  ");
  console.log("  Testing through Vite Proxy at:", BASE_URL);
  console.log("=================================================\n");

  let sessionCookie = "";
  const testEmail = `frontend_test_${Date.now()}@confluence.ai`;

  // Step 1: Register User
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Frontend Test Trader",
        email: testEmail,
        password: "SuperSecretPassword123!",
      }),
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      sessionCookie = setCookie.split(";")[0];
    }

    const data = await res.json();
    if (res.status === 201 && data.user?.email === testEmail) {
      results.push({ step: "1. User Registration", passed: true, details: { userId: data.user.id } });
    } else {
      results.push({ step: "1. User Registration", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "1. User Registration", passed: false, error: err.message });
  }

  // Step 2: Auth Me Session Check
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const data = await res.json();
    if (res.status === 200 && data.user?.email === testEmail) {
      results.push({ step: "2. Session Verification (GET /auth/me)", passed: true, details: { role: data.user.role } });
    } else {
      results.push({ step: "2. Session Verification (GET /auth/me)", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "2. Session Verification (GET /auth/me)", passed: false, error: err.message });
  }

  // Step 3: Complete Onboarding (Idempotent Authenticated Flow)
  try {
    const res = await fetch(`${BASE_URL}/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        riskCategory: "balanced",
        allocatableCapital: 25000,
        maxPositionPct: 15,
        maxDailyLossPct: 4,
        alpacaPaperKey: "PK_TEST_KEY_12345",
        alpacaPaperSecret: "SK_TEST_SECRET_67890",
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.riskProfile?.allocatableCapital === 25000) {
      results.push({ step: "3. Authenticated Onboarding Flow", passed: true, details: { capital: data.riskProfile.allocatableCapital } });
    } else {
      results.push({ step: "3. Authenticated Onboarding Flow", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "3. Authenticated Onboarding Flow", passed: false, error: err.message });
  }

  // Step 4: Add Ticker to Watchlist
  let watchlistId = "";
  try {
    const res = await fetch(`${BASE_URL}/watchlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        ticker: "AAPL",
        assetClass: "equity",
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.ticker === "AAPL") {
      watchlistId = data.id || data._id;
      results.push({ step: "4. Add Ticker to Watchlist", passed: true, details: { ticker: data.ticker } });
    } else {
      results.push({ step: "4. Add Ticker to Watchlist", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "4. Add Ticker to Watchlist", passed: false, error: err.message });
  }

  // Step 5: Get Enriched Watchlist (Qlib Factors & Probabilistic Forecasts)
  try {
    const res = await fetch(`${BASE_URL}/watchlist`, {
      headers: { Cookie: sessionCookie },
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data) && data.length > 0) {
      const item = data[0];
      results.push({
        step: "5. Enriched Watchlist Query",
        passed: true,
        details: { ticker: item.ticker, hasFactors: item.factors !== undefined, hasForecast: item.forecast !== undefined },
      });
    } else {
      results.push({ step: "5. Enriched Watchlist Query", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "5. Enriched Watchlist Query", passed: false, error: err.message });
  }

  // Step 6: Kill Switch Engagement
  try {
    const res = await fetch(`${BASE_URL}/kill-switch/engage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ reason: "Integration Test Emergency Halt" }),
    });
    const data = await res.json();
    if (res.status === 200 && data.isEngaged === true) {
      results.push({ step: "6. Global Kill Switch Engagement", passed: true, details: { isEngaged: data.isEngaged } });
    } else {
      results.push({ step: "6. Global Kill Switch Engagement", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "6. Global Kill Switch Engagement", passed: false, error: err.message });
  }

  // Step 7: Kill Switch Disengagement
  try {
    const res = await fetch(`${BASE_URL}/kill-switch/disengage`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    const data = await res.json();
    if (res.status === 200 && data.isEngaged === false) {
      results.push({ step: "7. Global Kill Switch Disengagement", passed: true, details: { isEngaged: data.isEngaged } });
    } else {
      results.push({ step: "7. Global Kill Switch Disengagement", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "7. Global Kill Switch Disengagement", passed: false, error: err.message });
  }

  // Step 8: Strategy Backtest Launch
  try {
    const res = await fetch(`${BASE_URL}/backtests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        strategyName: "PurgedCV Alpha Strategy",
        tickerUniverse: ["AAPL", "MSFT"],
        startDate: "2023-01-01",
        endDate: "2024-01-01",
      }),
    });
    const data = await res.json();
    if (res.status === 202 && data.backtestId) {
      results.push({ step: "8. Strategy Backtest Launch (PurgedCV)", passed: true, details: { backtestId: data.backtestId } });
    } else {
      results.push({ step: "8. Strategy Backtest Launch (PurgedCV)", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "8. Strategy Backtest Launch (PurgedCV)", passed: false, error: err.message });
  }

  // Step 9: Get Orders History
  try {
    const res = await fetch(`${BASE_URL}/orders`, {
      headers: { Cookie: sessionCookie },
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data)) {
      results.push({ step: "9. Orders History Query", passed: true, details: { count: data.length } });
    } else {
      results.push({ step: "9. Orders History Query", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "9. Orders History Query", passed: false, error: err.message });
  }

  // Step 10: Query Masked Credentials
  try {
    const res = await fetch(`${BASE_URL}/credentials`, {
      headers: { Cookie: sessionCookie },
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data)) {
      results.push({ step: "10. Masked Credentials Query", passed: true, details: { count: data.length, credentials: data } });
    } else {
      results.push({ step: "10. Masked Credentials Query", passed: false, error: JSON.stringify(data) });
    }
  } catch (err: any) {
    results.push({ step: "10. Masked Credentials Query", passed: false, error: err.message });
  }

  // Step 11: Cleanup Watchlist Item
  if (watchlistId) {
    try {
      const res = await fetch(`${BASE_URL}/watchlist/${watchlistId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        results.push({ step: "11. Cleanup Watchlist Item", passed: true });
      } else {
        results.push({ step: "11. Cleanup Watchlist Item", passed: false, error: JSON.stringify(data) });
      }
    } catch (err: any) {
      results.push({ step: "11. Cleanup Watchlist Item", passed: false, error: err.message });
    }
  }

  // Print Summary
  console.log("\n=================================================");
  console.log("              TEST RESULTS SUMMARY               ");
  console.log("=================================================");
  let passedCount = 0;
  for (const r of results) {
    const status = r.passed ? "✅ PASSED" : "❌ FAILED";
    console.log(`${status} - ${r.step}`);
    if (r.details) {
      console.log(`          Details: ${JSON.stringify(r.details)}`);
    }
    if (r.error) {
      console.log(`          Error:   ${r.error}`);
    }
    if (r.passed) passedCount++;
  }

  console.log(`\nTOTAL: ${passedCount}/${results.length} PASSED`);
  if (passedCount === results.length) {
    console.log("🎉 ALL FRONTEND-BACKEND INTEGRATION TESTS PASSED!");
  }
}

run();
