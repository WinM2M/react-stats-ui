type WikipediaSummary = {
  title: string;
  extract: string;
  description?: string;
  pageUrl: string;
};

const summaryCache = new Map<string, WikipediaSummary>();

function toLangCode(language: string): string {
  const code = language.slice(0, 2).toLowerCase();
  return code.length === 2 ? code : "en";
}

async function fetchSummary(languageCode: string, title: string): Promise<WikipediaSummary | null> {
  const normalizedTitle = decodeURIComponent(title);
  const key = `${languageCode}:${normalizedTitle}`;
  if (summaryCache.has(key)) {
    return summaryCache.get(key) ?? null;
  }

  const summaryUrl = `https://${languageCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(normalizedTitle)}`;
  const summaryResponse = await fetch(summaryUrl);
  if (!summaryResponse.ok) {
    return null;
  }

  const payload = (await summaryResponse.json()) as {
    title?: string;
    extract?: string;
    description?: string;
    content_urls?: { desktop?: { page?: string } };
  };

  if (!payload.extract || !payload.title) {
    return null;
  }

  const summary: WikipediaSummary = {
    title: payload.title,
    extract: payload.extract,
    description: payload.description,
    pageUrl: payload.content_urls?.desktop?.page ?? `https://${languageCode}.wikipedia.org/wiki/${encodeURIComponent(normalizedTitle)}`
  };
  summaryCache.set(key, summary);
  return summary;
}

async function resolveLocalizedTitle(languageCode: string, englishTitle: string): Promise<string> {
  if (languageCode === "en") {
    return decodeURIComponent(englishTitle);
  }

  const apiUrl =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=langlinks&titles=${encodeURIComponent(
      decodeURIComponent(englishTitle)
    )}&lllang=${languageCode}&lllimit=1&origin=*`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    return decodeURIComponent(englishTitle);
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Record<string, { langlinks?: Array<{ "*"?: string }> }>;
    };
  };

  const page = Object.values(data.query?.pages ?? {})[0];
  const langlinkTitle = page?.langlinks?.[0]?.["*"];
  return langlinkTitle ?? decodeURIComponent(englishTitle);
}

export async function fetchWikipediaSummary(language: string, englishTitle: string): Promise<WikipediaSummary | null> {
  const lang = toLangCode(language);
  const localizedTitle = await resolveLocalizedTitle(lang, englishTitle);
  const localizedSummary = await fetchSummary(lang, localizedTitle);
  if (localizedSummary) {
    return localizedSummary;
  }

  if (lang !== "en") {
    return await fetchSummary("en", decodeURIComponent(englishTitle));
  }

  return null;
}
