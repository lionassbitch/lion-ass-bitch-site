import assert from "node:assert/strict";
import test from "node:test";

const shopDomain = "exsuvera-presents.myshopify.com";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function publishedProducts() {
  const response = await fetch(`https://${shopDomain}/products.json?limit=250`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  return payload.products;
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("server-renders every published Shopify product and mockup", async () => {
  const [response, products] = await Promise.all([render(), publishedProducts()]);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const visibleText = html.replace(/<!--.*?-->/gs, "");
  assert.match(html, /<title>Lion Ass Bitch/);
  assert.match(visibleText, new RegExp(`All live pieces \/ ${products.length} available`, "i"));

  for (const product of products) {
    assert.match(html, new RegExp(escapeRegex(product.title)));
    for (const image of product.images) {
      assert.match(html, new RegExp(escapeRegex(image.src)));
    }
  }
});

test("uses Shopify-only direct cart forms with every available variant", async () => {
  const [response, products] = await Promise.all([render(), publishedProducts()]);
  const html = await response.text();
  const productCards = html.match(/class="product(?:\s|")/g) ?? [];
  const cartForms = html.match(/action="https:\/\/exsuvera-presents\.myshopify\.com\/cart\/add"/g) ?? [];
  const renderedMockups = html.match(/class="mockupThumb"/g) ?? [];
  const expectedImageCount = products.reduce((total, product) => total + product.images.length, 0);

  assert.equal(productCards.length, products.length);
  assert.equal(cartForms.length, products.length);
  assert.equal(renderedMockups.length, expectedImageCount);
  assert.match(html, /name="return_to" value="\/cart"/);
  assert.match(html, /Add to Shopify cart/);
  assert.doesNotMatch(html, new RegExp(`href="https://${shopDomain}/products/`));

  for (const product of products) {
    for (const variant of product.variants.filter((item) => item.available)) {
      assert.match(html, new RegExp(`value="${variant.id}"`));
    }
  }

  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Ã‚|Ã¢â€ /);
});

test("renders the Voguejitsu discipline as a complete, accessible route", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("voguejitsu", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/voguejitsu", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Voguejitsu — Presence Is Power/);
  assert.match(html, /The five movement foundations/i);
  assert.match(html, /Legendary Guardian/);
  assert.match(html, /I leave the floor more powerful than I entered it/);
  assert.match(html, /aria-label="Voguejitsu navigation"/);
});
