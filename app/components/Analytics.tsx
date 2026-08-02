// Privacy-respecting analytics foundation. Renders nothing unless a Plausible
// domain is configured via NEXT_PUBLIC_ANALYTICS_DOMAIN, so no visitor data is
// collected by default and there are no third-party requests out of the box.
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  const src =
    process.env.NEXT_PUBLIC_ANALYTICS_SRC ?? "https://plausible.io/js/script.js";
  if (!domain) return null;

  return <script defer data-domain={domain} src={src} />;
}
