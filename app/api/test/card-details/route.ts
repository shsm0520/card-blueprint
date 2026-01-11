import { load } from "cheerio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cardUrl = searchParams.get("url");

  if (!cardUrl) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(cardUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch: ${res.status}` },
        { status: 500 }
      );
    }

    const html = await res.text();
    const $ = load(html);

    // Look for various annual fee patterns
    const pageText = $.text();

    // Find sections containing "annual" or "fee"
    const sections: any = {};

    // Get text containing "annual"
    const annualSections: string[] = [];
    $("*").each((i, el) => {
      const text = $(el).text();
      if (/annual\s+fee/i.test(text) && text.length < 500) {
        annualSections.push(text.trim());
      }
    });

    // Get all h2, h3, h4 headings with their content
    const headings: any = {};
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
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
