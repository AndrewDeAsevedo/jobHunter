/**
 * Confirmed working company lists for Workday and Ashby job board scrapers.
 * Only includes companies verified to return valid API responses.
 *
 * Workday format: { name, tenant, site, wd? }
 *   wd defaults to 1 if omitted.
 *
 * Ashby format: string (company slug)
 *
 * New companies are auto-discovered via Google and saved to discovered.json.
 */

// ---------------- WORKDAY ----------------
// Each company needs the correct wd number — there's no default.
// Google discovery auto-extracts the correct wd from real URLs.

export const WORKDAY_COMPANIES = [
  { name: "Salesforce", tenant: "salesforce", site: "External_Career_Site",      wd: 12 },
  { name: "Nvidia",     tenant: "nvidia",     site: "NVIDIAExternalCareerSite",  wd: 5 },
  { name: "Adobe",      tenant: "adobe",      site: "external_experienced",      wd: 5 },
  { name: "PayPal",     tenant: "paypal",     site: "Jobs" },
];

// ---------------- ASHBY ----------------
// Verified slugs that return 200 with job listings.

export const ASHBY_COMPANIES = [
  // --- AI / ML ---
  "cursor",
  "anyscale",

  // --- Developer Tools ---
  "supabase",
  "neon",
  "render",
  "stytch",
  "semgrep",

  // --- Fintech ---
  "ramp",
  "plaid",
  "column",
  "airbyte",

  // --- Productivity / SaaS ---
  "notion",
  "linear",
  "retool",
  "attio",
  "ashby",

  // --- Marketplace ---
  "whatnot",

  // --- Other ---
  "vanta",
  "watershed",
  "persona",
  "livekit",
  "mercury",
  "vercel",
];
