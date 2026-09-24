import assert from "assert";
import { validateUrl, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6 } from "../lib/ssrf";
import { GET } from "../app/api/test/card-details/route";

async function runTests() {
  console.log("Running SSRF unit and integration tests...");

  // Setup env
  const TEST_ADMIN_KEY = "secret-admin-key-for-test";
  process.env.ADMIN_API_KEY = TEST_ADMIN_KEY;

  // ----------------------------------------------------
  // 1. Test IPv4 / IPv6 helper functions
  // ----------------------------------------------------
  assert.strictEqual(isPrivateOrReservedIPv4("127.0.0.1"), true);
  assert.strictEqual(isPrivateOrReservedIPv4("10.0.0.5"), true);
  assert.strictEqual(isPrivateOrReservedIPv4("172.16.0.1"), true);
  assert.strictEqual(isPrivateOrReservedIPv4("192.168.1.100"), true);
  assert.strictEqual(isPrivateOrReservedIPv4("169.254.169.254"), true);
  assert.strictEqual(isPrivateOrReservedIPv4("8.8.8.8"), false);

  assert.strictEqual(isPrivateOrReservedIPv6("::1"), true);
  assert.strictEqual(isPrivateOrReservedIPv6("fe80::1"), true);
  assert.strictEqual(isPrivateOrReservedIPv6("fc00::1"), true);

  console.log("✓ IP classification tests passed");

  // ----------------------------------------------------
  // 2. Test validateUrl function
  // ----------------------------------------------------
  // Allowed domains
  assert.strictEqual(validateUrl("https://www.americanexpress.com/us/credit-cards/").allowed, true);
  assert.strictEqual(validateUrl("https://creditcards.chase.com/all-credit-cards").allowed, true);
  assert.strictEqual(validateUrl("https://chase.com").allowed, true);

  // Blocked domains
  assert.strictEqual(validateUrl("https://evil.com").allowed, false);
  assert.strictEqual(validateUrl("https://example.com/test").allowed, false);

  // Blocked localhost / local IP
  assert.strictEqual(validateUrl("http://localhost:3000").allowed, false);
  assert.strictEqual(validateUrl("http://127.0.0.1/").allowed, false);
  assert.strictEqual(validateUrl("http://169.254.169.254/latest/meta-data/").allowed, false);

  // Invalid scheme
  assert.strictEqual(validateUrl("file:///etc/passwd").allowed, false);
  assert.strictEqual(validateUrl("gopher://americanexpress.com").allowed, false);

  console.log("✓ validateUrl tests passed");

  // ----------------------------------------------------
  // 3. Test Route Handler GET /api/test/card-details
  // ----------------------------------------------------

  // 3a. Unauthorized (no key)
  {
    const req = new Request("http://localhost:3000/api/test/card-details?url=https://chase.com");
    const res = await GET(req);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, "Unauthorized");
    console.log("✓ Auth test (no key) passed");
  }

  // 3b. Unauthorized (invalid key)
  {
    const req = new Request("http://localhost:3000/api/test/card-details?url=https://chase.com", {
      headers: { "x-admin-key": "wrong-key" },
    });
    const res = await GET(req);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, "Unauthorized");
    console.log("✓ Auth test (invalid key) passed");
  }

  // 3c. Authorized - Missing URL param
  {
    const req = new Request("http://localhost:3000/api/test/card-details", {
      headers: { "x-admin-key": TEST_ADMIN_KEY },
    });
    const res = await GET(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Missing url parameter");
    console.log("✓ Authorized test (missing url) passed");
  }

  // 3d. Authorized - Blocked local IP SSRF attempt
  {
    const req = new Request("http://localhost:3000/api/test/card-details?url=http://127.0.0.1:8080/internal", {
      headers: { "x-admin-key": TEST_ADMIN_KEY },
    });
    const res = await GET(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /blocked|not in the allowed domains/i);
    console.log("✓ SSRF test (blocked local IP) passed");
  }

  // 3e. Authorized - Blocked AWS metadata IP SSRF attempt
  {
    const req = new Request("http://localhost:3000/api/test/card-details?url=http://169.254.169.254/latest/meta-data/", {
      headers: { "x-admin-key": TEST_ADMIN_KEY },
    });
    const res = await GET(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /blocked|not in the allowed domains/i);
    console.log("✓ SSRF test (blocked cloud metadata IP) passed");
  }

  // 3f. Authorized - Blocked unallowed domain
  {
    const req = new Request("http://localhost:3000/api/test/card-details?url=https://example.com", {
      headers: { "x-admin-key": TEST_ADMIN_KEY },
    });
    const res = await GET(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /not in the allowed domains list/i);
    console.log("✓ SSRF test (unallowed domain) passed");
  }

  console.log("\nAll SSRF tests completed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
