import { CatalogProduct } from "./types";

// Curated reference catalog for immediate offline development / fallback
const FALLBACK_CATALOG: CatalogProduct[] = [
  {
    id: "ch3_usbc_anker_1",
    title: "Anker USB-C Hub, 555 USB-C Hub (8-in-1)",
    price: 39.99,
    currency: "USD",
    category: "electronics",
    merchant: "amazon.com",
    url: "https://www.amazon.com/dp/B0874HH4ZZ",
    imageUrl: "https://m.media-amazon.com/images/I/61r4V2U4KSL._AC_SL1500_.jpg",
    availability: "InStock",
    source: "channel3_catalog",
  },
  {
    id: "ch3_cable_anker_2",
    title: "Anker Powerline+ III USB-C to USB-C 2.0 Cable (6ft)",
    price: 18.99,
    currency: "USD",
    category: "electronics",
    merchant: "bestbuy.com",
    url: "https://www.bestbuy.com/site/anker-cable/12345.p",
    imageUrl: "https://m.media-amazon.com/images/I/51bZ0vEaB7L._AC_SL1200_.jpg",
    availability: "InStock",
    source: "channel3_catalog",
  },
  {
    id: "ch3_keyboard_keychron_3",
    title: "Keychron C1 Tenkeyless Wired Mechanical Keyboard",
    price: 64.99,
    currency: "USD",
    category: "electronics",
    merchant: "amazon.com",
    url: "https://www.amazon.com/dp/B08CN9YVMB",
    imageUrl: "https://m.media-amazon.com/images/I/61L18t+v1HL._AC_SL1500_.jpg",
    availability: "InStock",
    source: "channel3_catalog",
  },
  {
    id: "ch3_book_ddia_4",
    title: "Designing Data-Intensive Applications by Martin Kleppmann",
    price: 38.50,
    currency: "USD",
    category: "books",
    merchant: "amazon.com",
    url: "https://www.amazon.com/dp/1449373321",
    imageUrl: "https://m.media-amazon.com/images/I/91p53n8VNEL._SL1500_.jpg",
    availability: "InStock",
    source: "channel3_catalog",
  },
  {
    id: "ch3_headphones_sony_5",
    title: "Sony WH-1000XM5 Wireless Noise Canceling Headphones",
    price: 348.00,
    currency: "USD",
    category: "electronics",
    merchant: "bestbuy.com",
    url: "https://www.bestbuy.com/site/sony-headphones/6505727.p",
    imageUrl: "https://m.media-amazon.com/images/I/61+El0TwbSL._AC_SL1500_.jpg",
    availability: "InStock",
    source: "channel3_catalog",
  },
  {
    id: "ch3_shoes_nike_6",
    title: "Nike Air Zoom Pegasus 40 Running Shoes",
    price: 130.00,
    currency: "USD",
    category: "apparel",
    merchant: "nike.com",
    url: "https://www.nike.com/t/air-zoom-pegasus-40",
    imageUrl: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/shoes.jpg",
    availability: "InStock",
    source: "channel3_catalog",
  },
  {
    id: "ch3_temu_gadget_7",
    title: "Universal 10-in-1 Multi Tool Gadget",
    price: 9.99,
    currency: "USD",
    category: "electronics",
    merchant: "temu.com",
    url: "https://www.temu.com/goods-123.html",
    imageUrl: "https://img.temu.com/gadget.jpg",
    availability: "InStock",
    source: "channel3_catalog",
  },
];

export async function searchProducts(query: string, maxPrice?: number): Promise<CatalogProduct[]> {
  const apiKey = process.env.CHANNEL3_API_KEY;
  const baseUrl = process.env.CHANNEL3_BASE_URL || "https://api.trychannel3.com/v1";

  // If live Channel3 API Key is configured, make real API request
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
            merchant: offer?.domain || "unknown",
            url: offer?.url || "https://trychannel3.com",
            imageUrl: p.images?.[0]?.url,
            availability: offer?.availability || "InStock",
            source: "channel3_live",
          });
        }

        if (mapped.length > 0) {
          return maxPrice ? mapped.filter((p) => p.price <= maxPrice) : mapped;
        }
      } else {
        // Safe logging without exposing secrets
        console.warn(`[Channel3] Search returned status ${response.status}. Using local catalog.`);
      }
    } catch (err) {
      console.warn("[Channel3] Network error calling live API, using local catalog.", err instanceof Error ? err.message : "");
    }
  }

  // Filter fallback catalog by query terms
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let results = FALLBACK_CATALOG.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.merchant}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });

  if (results.length === 0) {
    results = FALLBACK_CATALOG.slice(0, 4);
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
  if (/book|handbook|guide|novel|manual|data-intensive|edition/i.test(lower)) {
    return "books";
  }
  if (/shirt|shoes|apparel|pants|jacket|hoodie|sneaker/i.test(lower)) {
    return "apparel";
  }
  return "electronics"; // default
}
