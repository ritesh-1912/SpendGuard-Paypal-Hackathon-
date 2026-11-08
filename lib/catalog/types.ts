export interface CatalogProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  merchant: string;
  url: string;
  imageUrl?: string;
  availability: string;
  source: "channel3_live" | "channel3_catalog" | "channel3_sample";
  isSample?: boolean;
}
