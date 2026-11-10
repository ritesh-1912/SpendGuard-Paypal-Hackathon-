import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog/channel3";
import { logAuditEvent } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const maxPriceParam = searchParams.get("maxPrice");
    const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;

    if (!query) {
      return NextResponse.json({ error: "Search query ('q' or 'query') is required" }, { status: 400 });
    }

    const products = await searchProducts(query, maxPrice);

    return NextResponse.json({
      success: true,
      query,
      count: products.length,
      source: products[0]?.source || "channel3_live",
      products,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || body.q || "").trim();
    const maxPrice = body.maxPrice !== undefined ? Number(body.maxPrice) : undefined;

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const products = await searchProducts(query, maxPrice);

    logAuditEvent(
      "PRODUCT_SEARCH",
      `Searched products for '${query}'`,
      { query, maxPrice, resultCount: products.length }
    );

    return NextResponse.json({
      success: true,
      query,
      count: products.length,
      source: products[0]?.source || "channel3_live",
      products,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
