import { load } from "cheerio";

export async function GET() {
  try {
    const TARGET_URL =
      "https://creditcards.chase.com/all-credit-cards?CELL=6PK0&jp_ltg=chsecate_allcards";

    const res = await fetch(TARGET_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { success: false, error: `Failed to fetch: ${res.status}` },
        { status: 500 }
      );
    }

    const html = await res.text();
    const $ = load(html);

    const cardPageLinks: any[] = [];

    $("a").each((index: number, el: any) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      if (!href || !text) return;

      // Check if it's a card page
      const isCardPage =
        /(?:cash-back|travel|business|secured|student)-credit-cards\/[a-z0-9\-]+/i.test(
          href
        );

      if (isCardPage) {
        const isExternal =
          href.startsWith("http") && !href.includes("creditcards.chase.com");
        const isApplyPage = /application|oao|secure\.chase/i.test(href);

        const name = text
          .replace(/\s*opens(?:\s+\w+)*\s+in\s+a\s+new\s+window\s*/gi, "")
          .replace(/\s*\[new\]\s*/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        cardPageLinks.push({
          href: href.substring(0, 100),
          text: text.substring(0, 80),
          name,
          nameLength: name.length,
          isExternal,
          isApplyPage,
          hasLinksTo: name.includes("Links to"),
          hasOpens: name.includes("Opens"),
        });
      }
    });

    return Response.json({
      success: true,
      cardPageLinksFound: cardPageLinks.length,
      samples: cardPageLinks.slice(0, 30),
    });
  } catch (error) {
    console.error("Scraper error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
