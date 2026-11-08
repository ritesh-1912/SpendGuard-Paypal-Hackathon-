import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog/channel3";
import { logAuditEvent } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || "").trim();
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
      products,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
