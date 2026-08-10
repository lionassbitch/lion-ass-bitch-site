"use client";

import { money, type ShopifyVariant } from "../lib/catalog";
import { site } from "../lib/site";

export default function AddToCartForm({
  id,
  variants,
  compact = false,
}: {
  id: number;
  variants: ShopifyVariant[];
  compact?: boolean;
}) {
  const available = variants.filter((variant) => variant.available);

  return (
    <form
      className={`addToCart${compact ? " addToCart--compact" : ""}`}
      action={site.shop.addUrl}
      method="post"
    >
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="return_to" value="/cart" />
      {available.length > 0 ? (
        <>
          <label htmlFor={`variant-${id}`}>
            {available.length > 1 ? "Choose color / size" : "Selected option"}
          </label>
          <select id={`variant-${id}`} name="id" defaultValue={String(available[0].id)}>
            {available.map((variant) => (
              <option value={variant.id} key={variant.id}>
                {variant.title} · {money.format(Number.parseFloat(variant.price))}
              </option>
            ))}
          </select>
          <button className="addToCart__button" type="submit">
            Add to Shopify cart
          </button>
        </>
      ) : (
        <button className="addToCart__button" type="button" disabled>
          Sold out on Shopify
        </button>
      )}
    </form>
  );
}
