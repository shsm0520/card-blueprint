import { load } from "cheerio";
import { extractAdminKey, verifyAdminKey } from "@/lib/auth/admin";
import { validateUrl } from "@/lib/ssrf";

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1 MB limit
const FETCH_TIMEOUT_MS = 5000; // 5 seconds timeout

/**
 * Safely fetches a URL with SSRF checks, redirect validation, timeout, and response size limits.
 */
async function safeFetch(initialUrl: string): Promise<Response> {
  let currentUrl = initialUrl;
  let redirectsRemaining = MAX_REDIRECTS;

  while (true) {
    const validation = validateUrl(currentUrl);
    if (!validation.allowed || !validation.url) {
      throw new Error(`SSRF validation failed: ${validation.reason}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirectsRemaining <= 0) {
          throw new Error("Too many redirects");
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Redirect status ${response.status} missing Location header`);
        }

        // Resolve relative redirect URL against currentUrl
        const resolvedRedirectUrl = new URL(location, currentUrl).toString();
        currentUrl = resolvedRedirectUrl;
        redirectsRemaining--;
        continue;
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Reads a Response stream up to MAX_RESPONSE_SIZE.
 */
async function readResponseBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) {
      throw new Error(`Response size exceeded limit of ${maxBytes} bytes`);
    }
    return text;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          reader.cancel();
          throw new Error(`Response size exceeded limit of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const concatenated = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    concatenated.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder("utf-8").decode(concatenated);
}

export async function GET(request: Request) {
  // 1. Verify admin key
  const adminKey = extractAdminKey(request.headers);
  if (!verifyAdminKey(adminKey)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cardUrl = searchParams.get("url");

  if (!cardUrl) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Initial SSRF check on input parameter
  const initialValidation = validateUrl(cardUrl);
  if (!initialValidation.allowed) {
    return Response.json({ error: initialValidation.reason }, { status: 400 });
  }

  try {
    const res = await safeFetch(cardUrl);

    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch: ${res.status}` },
        { status: 500 }
      );
    }

    const html = await readResponseBodyWithLimit(res, MAX_RESPONSE_SIZE);
    const $ = load(html);

    // Look for various annual fee patterns
    const pageText = $.text();

    // Get text containing "annual"
    const annualSections: string[] = [];
    $("*").each((i, el) => {
      const text = $(el).text();
      if (/annual\s+fee/i.test(text) && text.length < 500) {
        annualSections.push(text.trim());
      }
    });

    // Get all h2, h3, h4 headings with their content
    const headings: Record<string, string> = {};
    $("h2, h3, h4").each((i, el) => {
      const heading = $(el).text().trim();
      const section = $(el)
        .nextUntil("h2, h3, h4")
        .text()
        .trim()
        .substring(0, 300);
      if (heading && section) {
        headings[heading] = section;
      }
    });

    return Response.json({
      url: cardUrl,
      annualFeeSections: annualSections.slice(0, 5),
      headings,
      pageLength: html.length,
      textSnippet: pageText.substring(0, 1000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.startsWith("SSRF validation failed") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
