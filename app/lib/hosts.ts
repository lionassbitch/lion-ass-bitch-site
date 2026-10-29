// Host-aware routing for the Exsuvera / Lion Ass Bitch domain family.
//
// The parent house (exsuvera.com) sits above the flagship (lionassbitch.com).
// Every Exsuvera host serves the Exsuvera Presents gate at its root and pushes
// the click to LionAssBitch.com; lab.exsuvera.com is a pure redirect so the
// parent visibly routes to the child. The same deployment answers on all of
// them, so DNS is the only thing that has to change per domain.

export const LAB_ORIGIN = "https://lionassbitch.com";

// Hosts that render the Exsuvera Presents gate at "/".
export const EXSUVERA_GATE_HOSTS = [
  "exsuvera.com",
  "www.exsuvera.com",
  "exsuvera.lionassbitch.com",
  "presents.exsuvera.com",
] as const;

// Hosts that redirect straight to the flagship.
export const LAB_REDIRECT_HOSTS = ["lab.exsuvera.com", "lionassbitch.exsuvera.com"] as const;

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

export function isExsuveraGateHost(host: string | null | undefined): boolean {
  return (EXSUVERA_GATE_HOSTS as readonly string[]).includes(normalizeHost(host));
}

export function isLabRedirectHost(host: string | null | undefined): boolean {
  return (LAB_REDIRECT_HOSTS as readonly string[]).includes(normalizeHost(host));
}
