import net from "net";

// Allowed domain suffixes
const ALLOWED_DOMAINS = ["americanexpress.com", "chase.com"];

/**
 * Checks if an IPv4 address is in private, loopback, or reserved ranges.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast)
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is private, loopback, or IPv4-mapped private address.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback ::1
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;

  // Unspecified ::
  if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;

  // Unique Local Address fc00::/7 (fc00... or fd00...)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-local fe80::/10 (fe8..., fe9..., fea..., feb...)
  if (/^fe[89ab]/i.test(normalized)) return true;

  // IPv4-mapped IPv6 address (e.g., ::ffff:127.0.0.1 or ::ffff:10.0.0.1)
  const ipv4MappedMatch = normalized.match(/^(?:0:)*ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4MappedMatch) {
    return isPrivateOrReservedIPv4(ipv4MappedMatch[1]);
  }

  return false;
}

/**
 * Validates whether a URL is permitted (HTTP/HTTPS, non-internal, allowed domain).
 */
export function validateUrl(urlString: string): { allowed: boolean; reason?: string; url?: URL } {
  let urlObj: URL;
  try {
    urlObj = new URL(urlString);
  } catch {
    return { allowed: false, reason: "Invalid URL format" };
  }

  // 1. Protocol check
  if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
    return { allowed: false, reason: "Only http and https protocols are allowed" };
  }

  const hostname = urlObj.hostname.toLowerCase();

  // 2. Localhost check
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "localhost.localdomain") {
    return { allowed: false, reason: "Requests to localhost are blocked" };
  }

  // 3. IP address check
  if (net.isIPv4(hostname)) {
    if (isPrivateOrReservedIPv4(hostname)) {
      return { allowed: false, reason: "Requests to private or reserved IP addresses are blocked" };
    }
  } else if (net.isIPv6(hostname)) {
    // Strip brackets if present in hostname
    const rawIpv6 = hostname.replace(/^\[|\]$/g, "");
    if (isPrivateOrReservedIPv6(rawIpv6)) {
      return { allowed: false, reason: "Requests to private or reserved IP addresses are blocked" };
    }
  }

  // 4. Allowed domain check
  const isAllowedDomain = ALLOWED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowedDomain) {
    return {
      allowed: false,
      reason: `Domain '${hostname}' is not in the allowed domains list (${ALLOWED_DOMAINS.join(", ")})`,
    };
  }

  return { allowed: true, url: urlObj };
}
