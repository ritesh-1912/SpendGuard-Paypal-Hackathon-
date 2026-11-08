import { CatalogProduct } from "./types";

const FALLBACK_CATALOG: CatalogProduct[] = [
  {
    id: "prod_hub_8in1",
    title: "Pro Series 8-in-1 Multiport USB-C Hub (4K HDMI, 100W PD)",
    price: 39.99,
    currency: "USD",
    category: "electronics",
    merchant: "techdirect.store",
    url: "https://techdirect.store/products/usbc-hub-8in1",
    availability: "InStock",
    source: "channel3_catalog",
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
    source: "channel3_catalog",
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
    source: "channel3_catalog",
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
    source: "channel3_catalog",
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
    source: "channel3_catalog",
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
    source: "channel3_catalog",
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
    source: "channel3_catalog",
  },
];

export async function searchProducts(query: string, maxPrice?: number): Promise<CatalogProduct[]> {
  const apiKey = process.env.CHANNEL3_API_KEY;
  const baseUrl = process.env.CHANNEL3_BASE_URL || "https://api.trychannel3.com/v1";

  if (apiKey && apiKey.trim() !== "") {
    try {
      const response = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];

        const mapped: CatalogProduct[] = [];
        for (const p of products) {
          const offer = p.offers?.[0];
          const priceAmount = offer?.price?.amount ? Number(offer.price.amount) : 0;
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
          });
        }

        if (mapped.length > 0) {
          return maxPrice ? mapped.filter((p) => p.price <= maxPrice) : mapped;
        }
      }
    } catch {
      // Fall back to local catalog if network request fails
    }
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let results = FALLBACK_CATALOG.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.merchant}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });

  if (results.length === 0) {
    const lower = query.toLowerCase();
    if (/hub|usb|cable/i.test(lower)) {
      results = FALLBACK_CATALOG.filter((p) => /hub|cable/i.test(p.title));
    } else if (/keyboard/i.test(lower)) {
      results = FALLBACK_CATALOG.filter((p) => /keyboard/i.test(p.title));
    } else if (/book|guide/i.test(lower)) {
      results = FALLBACK_CATALOG.filter((p) => /book|guide/i.test(p.title));
    } else if (/headphone|audio/i.test(lower)) {
      results = FALLBACK_CATALOG.filter((p) => /headphone/i.test(p.title));
    } else if (/shoes|sneaker|runner/i.test(lower)) {
      results = FALLBACK_CATALOG.filter((p) => /shoes/i.test(p.title));
    } else {
      results = FALLBACK_CATALOG.slice(0, 4);
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
