// Shared Shopify catalog access. The live storefront JSON is the source of
// truth; a committed snapshot is the resilient fallback so the archive, product
// pages, home, and search never render empty even when the network is down.
import catalogSnapshot from "../catalog-snapshot";
import { SHOP_DOMAIN } from "./site";

const PRODUCTS_PER_PAGE = 250;

export type ShopifyImage = {
  src: string;
  alt?: string | null;
  width?: number;
  height?: number;
};

export type ShopifyVariant = {
  id: number;
  title: string;
  price: string;
  available: boolean;
};

export type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  images?: ShopifyImage[];
  variants?: ShopifyVariant[];
};

export type Relic = {
  handle: string;
  id: number;
  name: string;
  note: string;
  priceFrom: number | null;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  available: boolean;
};

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function toRelic(product: ShopifyProduct): Relic | null {
  const images = product.images ?? [];
  if (!images[0]) return null;

  const variants = product.variants ?? [];
  const prices = variants
    .map((variant) => Number.parseFloat(variant.price))
    .filter(Number.isFinite);
  const priceFrom = prices.length > 0 ? Math.min(...prices) : null;
  const hasPriceRange = new Set(prices).size > 1;

  return {
    handle: product.handle,
    id: product.id,
    name: product.title,
    note:
      priceFrom === null
        ? "View price"
        : `${hasPriceRange ? "From " : ""}${money.format(priceFrom)}`,
    priceFrom,
    images,
    variants,
    available: variants.some((variant) => variant.available),
  };
}

export const fallbackRelics: Relic[] = (catalogSnapshot as unknown as ShopifyProduct[])
  .map(toRelic)
  .filter((relic): relic is Relic => relic !== null);

export async function getRelics(): Promise<Relic[]> {
  try {
    const products: ShopifyProduct[] = [];

    for (let page = 1; page <= 20; page += 1) {
      const response = await fetch(
        `https://${SHOP_DOMAIN}/products.json?limit=${PRODUCTS_PER_PAGE}&page=${page}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error(`Shopify catalog returned ${response.status}`);

      const payload = (await response.json()) as { products?: ShopifyProduct[] };
      const batch = payload.products ?? [];
      products.push(...batch);

      if (batch.length < PRODUCTS_PER_PAGE) break;
    }

    const unique = [...new Map(products.map((p) => [p.id, p])).values()];
    const relics = unique
      .map(toRelic)
      .filter((relic): relic is Relic => relic !== null);

    return relics.length > 0 ? relics : fallbackRelics;
  } catch (error) {
    console.error("Unable to load the live Shopify catalog", error);
    return fallbackRelics;
  }
}

export async function getRelic(handle: string): Promise<Relic | null> {
  const relics = await getRelics();
  return relics.find((relic) => relic.handle === handle) ?? null;
}

// Lightweight relational tagging derived from the catalog so the archive can
// offer real, content-driven filtering without a separate CMS taxonomy.
export type RelicCategory =
  | "All"
  | "Hoodies"
  | "Jackets"
  | "Tops"
  | "Bottoms"
  | "Headwear";

const CATEGORY_RULES: [RelicCategory, RegExp][] = [
  ["Hoodies", /hoodie|hooded/i],
  ["Jackets", /jacket|varsity|coat/i],
  ["Headwear", /cap|hat|beanie|bucket/i],
  ["Bottoms", /jean|pant|short|trouser|denim short/i],
  ["Tops", /tee|shirt|jersey|tank|sweat|crop|knit|top/i],
];

export function relicCategory(relic: Relic): RelicCategory {
  const identity = `${relic.handle} ${relic.name}`;
  for (const [category, rule] of CATEGORY_RULES) {
    if (rule.test(identity)) return category;
  }
  return "Tops";
}

export const RELIC_CATEGORIES: RelicCategory[] = [
  "All",
  "Hoodies",
  "Jackets",
  "Tops",
  "Bottoms",
  "Headwear",
];
