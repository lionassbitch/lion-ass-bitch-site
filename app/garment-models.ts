type Silhouette = "cap" | "hoodie" | "jacket" | "pants" | "shirt" | "shorts" | "sweater" | "tee";

const productModels: Record<string, string> = {};

const silhouetteModels: Partial<Record<Silhouette, string>> = {};

const silhouetteKeywords: Array<[Silhouette, string[]]> = [
  ["hoodie", ["hoodie", "hooded"]],
  ["jacket", ["jacket", "varsity", "bomber"]],
  ["sweater", ["sweater", "sweatshirt", "crewneck"]],
  ["pants", ["pants", "jogger", "trouser"]],
  ["shorts", ["shorts"]],
  ["cap", ["cap", "hat", "beanie", "bucket"]],
  ["shirt", ["shirt", "button-up", "denim-shirt"]],
  ["tee", ["tee", "t-shirt", "tshirt"]],
];

export function findGarmentModel(handle: string, name: string) {
  const directModel = productModels[handle];
  if (directModel) return directModel;

  const identity = `${handle} ${name}`.toLowerCase();
  const silhouette = silhouetteKeywords.find(([, keywords]) => keywords.some((keyword) => identity.includes(keyword)))?.[0];
  return silhouette ? silhouetteModels[silhouette] : undefined;
}

// Add optimized garment files to public/models, then register either an exact
// Shopify handle in productModels or a reusable garment shape in silhouetteModels.
