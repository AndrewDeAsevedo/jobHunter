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
  // --- SF / Bay Area ---
  { name: "Salesforce",    tenant: "salesforce",    site: "External_Career_Site",     wd: 12 },
  { name: "Nvidia",        tenant: "nvidia",        site: "NVIDIAExternalCareerSite", wd: 5 },
  { name: "Adobe",         tenant: "adobe",         site: "external_experienced",     wd: 5 },
  { name: "PayPal",        tenant: "paypal",        site: "Jobs" },
  { name: "Visa",          tenant: "visa",          site: "Visa_Careers",             wd: 5 },
  { name: "VMware",        tenant: "broadcom",      site: "VMwareJobsCareers",        wd: 5 },
  { name: "NetApp",        tenant: "netapp",        site: "NetApp_Careers",           wd: 5 },
  { name: "ServiceNow",    tenant: "servicenow",    site: "ServiceNowCareers",        wd: 5 },
  { name: "Autodesk",      tenant: "autodesk",      site: "Autodesk_Careers",         wd: 5 },
  { name: "Gap",           tenant: "gapinc",        site: "Gap_Inc_Careers",          wd: 5 },
  { name: "Uber",          tenant: "uber",          site: "Uber_Careers",             wd: 5 },
  { name: "Genentech",     tenant: "genentech",     site: "glodev",                   wd: 12 },
  { name: "Wells Fargo",   tenant: "wellsfargo",    site: "WellsFargoCareers",        wd: 5 },
  { name: "Chevron",       tenant: "chevron",       site: "Chevron_External_Career_Site", wd: 5 },
  { name: "EA",            tenant: "ea",            site: "EA_Careers",               wd: 5 },
  { name: "Lam Research",  tenant: "lamresearch",   site: "Careers",                  wd: 5 },
  { name: "Juniper",       tenant: "juniper",       site: "Juniper_Networks_Careers", wd: 5 },
  { name: "Cisco",         tenant: "cisco",         site: "Cisco_Careers",            wd: 5 },

  // --- Boston / Cambridge ---
  { name: "Wayfair",       tenant: "wayfair",       site: "External",                wd: 1 },
  { name: "MathWorks",     tenant: "mathworks",     site: "MathWorksJobs",           wd: 5 },
  { name: "Raytheon",      tenant: "rtx",           site: "RTX_Careers",             wd: 5 },
  { name: "State Street",  tenant: "statestreet",   site: "Careers",                 wd: 5 },
  { name: "Fidelity",      tenant: "fidelity",      site: "Fidelity_Careers",        wd: 1 },
  { name: "Liberty Mutual", tenant: "libertymutual", site: "Liberty_Mutual_Careers", wd: 5 },
  { name: "GE",            tenant: "ge",            site: "GE_Careers",              wd: 5 },
  { name: "Thermo Fisher", tenant: "thermofisher",  site: "External",                wd: 1 },
  { name: "Bose",          tenant: "bose",          site: "Bose_Careers",            wd: 5 },
  { name: "Analog Devices", tenant: "analogdevices", site: "ADICareers",             wd: 5 },
  { name: "Akamai",        tenant: "akamai",        site: "Akamai_Careers",          wd: 1 },
  { name: "iRobot",        tenant: "irobot",        site: "iRobot_Careers",          wd: 5 },
  { name: "PTC",           tenant: "ptc",           site: "PTCCareers",              wd: 1 },
];

// ---------------- ASHBY ----------------
// Verified slugs that return 200 with job listings.

export const ASHBY_COMPANIES = [
  // --- AI / ML ---
  "cursor", "anyscale", "cohere", "mistral",
  "together-ai", "huggingface", "modal", "replicate",
  "perplexityai", "glean",

  // --- Developer Tools ---
  "supabase", "neon", "render", "stytch", "semgrep",
  "grafana", "posthog", "prefect", "temporal",
  "highlight-io", "inngest", "resend", "trigger-dev",
  "snyk",

  // --- Fintech ---
  "ramp", "plaid", "column", "airbyte",
  "brex", "melio", "moderntreasury", "lithic",

  // --- Productivity / SaaS ---
  "notion", "linear", "retool", "attio", "ashby",
  "airtable", "coda", "equals", "rows",

  // --- Marketplace / Consumer ---
  "whatnot", "navan",

  // --- Infra / Cloud ---
  "vanta", "watershed", "persona", "livekit",
  "mercury", "vercel", "fly", "railway",
  "planetscale", "upstash", "convex", "tigerbeetle",

  // --- Boston / Cambridge ---
  "raptor-maps", "whoop", "tulip", "appcues",
  "immuta", "jellyfish-co", "salsify", "locus-robotics",
  "flywire", "vestmark", "silverfort",
];
