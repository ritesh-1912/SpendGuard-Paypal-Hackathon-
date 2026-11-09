import { CatalogProduct } from "./types";
import { logAuditEvent } from "@/lib/db/schema";

const SAMPLE_CATALOG: CatalogProduct[] = [
  {
    id: "prod_hub_8in1",
    title: "Pro Series 8-in-1 Multiport USB-C Hub (4K HDMI, 100W PD)",
    price: 39.99,
    currency: "USD",
    category: "electronics",
    merchant: "techdirect.store",
    url: "https://techdirect.store/products/usbc-hub-8in1",
    availability: "InStock",
    source: "channel3_sample",
    isSample: true,
  },
  {
    id: "prod_cable_usbc",
    title: "Braided USB-C to USB-C Fast Charging Cable (6ft)",
    price: 18.49,
    currency: "USD",
    category: "electronics",
    merchant: "hardwarecentral.shop",
    url: "https://hardwarecentral.shop/products/usbc-cable-6ft",
    availability: "InStock",
    source: "channel3_sample",
    isSample: true,
  },
  {
    id: "prod_kb_mechanical",
    title: "Tenkeyless Compact Wired Mechanical Keyboard (RGB, Blue Switches)",
    price: 64.20,
    currency: "USD",
    category: "electronics",
    merchant: "keyboardforge.io",
    url: "https://keyboardforge.io/products/tkl-mechanical-kb",
    availability: "InStock",
    source: "channel3_sample",
    isSample: true,
  },
  {
    id: "prod_book_data_systems",
    title: "Designing Scalable Data Systems: Architecture & Reliability Guide",
    price: 38.50,
    currency: "USD",
    category: "books",
    merchant: "bookvault.press",
    url: "https://bookvault.press/titles/scalable-data-systems",
    availability: "InStock",
    source: "channel3_sample",
    isSample: true,
  },
  {
    id: "prod_headphones_studio",
    title: "Studio Wireless Active Noise-Cancelling Headphones",
    price: 348.00,
    currency: "USD",
    category: "electronics",
    merchant: "audiomaster.store",
    url: "https://audiomaster.store/products/studio-wireless-anc",
    availability: "InStock",
    source: "channel3_sample",
    isSample: true,
  },
  {
    id: "prod_shoes_running",
    title: "Lightweight Marathon Cushion Running Shoes",
    price: 129.95,
    currency: "USD",
    category: "apparel",
    merchant: "athleticsdirect.shop",
    url: "https://athleticsdirect.shop/products/lightweight-running-shoes",
    availability: "InStock",
    source: "channel3_sample",
    isSample: true,
  },
  {
    id: "prod_multitool_gadget",
    title: "Pocket Precision Multi-Bit Screwdriver Set",
    price: 9.99,
    currency: "USD",
    category: "electronics",
    merchant: "gadgethaven.com",
    url: "https://gadgethaven.com/products/pocket-multitool",
    availability: "InStock",
    source: "channel3_sample",
    isSample: true,
  },
];

export async function searchProducts(query: string, maxPrice?: number): Promise<CatalogProduct[]> {
  const isOfflineDemo = process.env.DEMO_OFFLINE === "true";
  const apiKey = process.env.CHANNEL3_API_KEY;
  const baseUrl = process.env.CHANNEL3_BASE_URL || "https://api.trychannel3.com/v1";

  if (!isOfflineDemo) {
    if (!apiKey || apiKey.trim() === "") {
      const errMsg = "CHANNEL3_API_KEY is not configured. Set CHANNEL3_API_KEY or enable DEMO_OFFLINE=true.";
      logAuditEvent(
        "CATALOG_SEARCH_FAILED",
        errMsg,
        { query, error: "MISSING_API_KEY" },
        "WARN"
      );
      throw new Error(errMsg);
    }

    try {
      const response = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey.trim(),
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        const errMsg = `Channel3 search failed with status ${response.status}: ${response.statusText || errorBody || "Request error"}`;
        logAuditEvent(
          "CATALOG_SEARCH_FAILED",
          errMsg,
          { query, status: response.status, errorBody },
          "WARN"
        );
        throw new Error(errMsg);
      }

      const data = await response.json();
      const products = data.products || [];

      const mapped: CatalogProduct[] = [];
      for (const p of products) {
        const offer = p.offers?.[0];
        let priceAmount = 0;
        if (typeof offer?.price === "number") {
          priceAmount = offer.price;
        } else if (typeof offer?.price?.price === "number") {
          priceAmount = offer.price.price;
        } else if (offer?.price?.amount) {
          priceAmount = Number(offer.price.amount);
        }
        if (priceAmount <= 0) continue;

        mapped.push({
          id: p.id || `ch3_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: p.title || "Product",
          price: priceAmount,
          currency: offer?.price?.currency || "USD",
          category: inferCategory(p.title || ""),
          merchant: offer?.domain || "merchant.shop",
          url: offer?.url || "https://trychannel3.com",
          availability: offer?.availability || "InStock",
          source: "channel3_live",
          isSample: false,
        });
      }

      return maxPrice !== undefined ? mapped.filter((p) => p.price <= maxPrice) : mapped;
    } catch (err: any) {
      if (err.name === "TimeoutError") {
        const errMsg = "Channel3 API timed out after 8 seconds. Please try again.";
        logAuditEvent(
          "CATALOG_SEARCH_FAILED",
          errMsg,
          { query, error: "TIMEOUT" },
          "WARN"
        );
        throw new Error(errMsg);
      }

      if (!err.message?.startsWith("Channel3 search failed")) {
        const errMsg = `Channel3 network error: ${err.message || "Failed to reach catalog service"}`;
        logAuditEvent(
          "CATALOG_SEARCH_FAILED",
          errMsg,
          { query, error: err.message },
          "WARN"
        );
        throw new Error(errMsg);
      }

      throw err;
    }
  }

  // DEMO_OFFLINE=true fallback catalog with explicit sample indicators
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let results = SAMPLE_CATALOG.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.merchant}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });

  if (results.length === 0) {
    const lower = query.toLowerCase();
    if (/hub|usb|cable/i.test(lower)) {
      results = SAMPLE_CATALOG.filter((p) => /hub|cable/i.test(p.title));
    } else if (/keyboard/i.test(lower)) {
      results = SAMPLE_CATALOG.filter((p) => /keyboard/i.test(p.title));
    } else if (/book|guide/i.test(lower)) {
      results = SAMPLE_CATALOG.filter((p) => /book|guide/i.test(p.title));
    } else if (/headphone|audio/i.test(lower)) {
      results = SAMPLE_CATALOG.filter((p) => /headphone/i.test(p.title));
    } else if (/shoes|sneaker|runner/i.test(lower)) {
      results = SAMPLE_CATALOG.filter((p) => /shoes/i.test(p.title));
    } else {
      results = SAMPLE_CATALOG.slice(0, 4);
    }
  }

  if (maxPrice !== undefined) {
    results = results.filter((p) => p.price <= maxPrice);
  }

  return results;
}

function inferCategory(title: string): string {
  const lower = title.toLowerCase();
  if (/hub|cable|keyboard|mouse|headphone|electronics|charger|usb|adapter|laptop|monitor/i.test(lower)) {
    return "electronics";
  }
  if (/book|handbook|guide|novel|manual|data|edition/i.test(lower)) {
    return "books";
  }
  if (/shirt|shoes|apparel|pants|jacket|hoodie|sneaker/i.test(lower)) {
    return "apparel";
  }
  return "electronics";
}
