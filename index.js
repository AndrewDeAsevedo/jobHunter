import fetch from "node-fetch";
import fs from "fs";
import * as cheerio from "cheerio";
import { WORKDAY_COMPANIES, ASHBY_COMPANIES } from "./companies.js";
import "dotenv/config";

const FETCH_TIMEOUT_MS = 10_000;

/** Aborts after FETCH_TIMEOUT_MS to prevent hanging on unresponsive APIs. */
function fetchWithTimeout(url, opts = {}) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// ---------------- CONFIG ----------------

const KEYWORDS = [
  // Core SWE titles
  "software engineer",
  "software developer",
  "swe ",
  "sde ",

  // Stack-specific
  "frontend engineer",
  "front end engineer",
  "front-end engineer",
  "frontend developer",
  "backend engineer",
  "back end engineer",
  "back-end engineer",
  "backend developer",
  "fullstack engineer",
  "full stack engineer",
  "full-stack engineer",
  "fullstack developer",
  "full stack developer",
  "full-stack developer",

  // Web / Mobile
  "web developer",
  "web engineer",
  "ios engineer",
  "ios developer",
  "android engineer",
  "android developer",
  "mobile engineer",
  "mobile developer",

  // Infra / Platform / Cloud
  "platform engineer",
  "infrastructure engineer",
  "cloud engineer",
  "systems engineer",
  "site reliability engineer",
  "sre ",
  "devops engineer",
  "production engineer",
  "build engineer",
  "release engineer",
  "tooling engineer",

  // Data / ML / AI
  "data engineer",
  "ml engineer",
  "machine learning engineer",
  "ai engineer",
  "applied scientist",

  // Security
  "security engineer",
  "application security engineer",
  "appsec engineer",

  // QA / Test
  "qa engineer",
  "quality engineer",
  "test engineer",
  "sdet",
  "automation engineer",

  // Specialties
  "application engineer",
  "integration engineer",
  "api engineer",
  "embedded engineer",
  "embedded software",
  "firmware engineer",
  "network engineer",
  "database engineer",
  "solutions engineer",
  "support engineer",
  "implementation engineer",
];

const LOCATIONS = [
  // --- San Francisco / Bay Area ---
  "san francisco",
  "sf",
  "bay area",
  "san jose",
  "palo alto",
  "mountain view",
  "sunnyvale",
  "santa clara",
  "cupertino",
  "redwood city",
  "menlo park",
  "oakland",
  "berkeley",
  "fremont",
  "hayward",
  "san mateo",
  "foster city",
  "burlingame",
  "south san francisco",
  "daly city",
  "san bruno",
  "milpitas",
  "campbell",
  "los gatos",
  "saratoga",
  "pleasanton",
  "livermore",
  "walnut creek",
  "concord",
  "san ramon",
  "dublin, ca",
  "alameda",
  "emeryville",
  "richmond, ca",
  "novato",
  "san rafael",
  "half moon bay",

  // --- Boston / Greater Boston ---
  "boston",
  "cambridge",
  "somerville",
  "brookline",
  "waltham",
  "burlington, ma",
  "lexington, ma",
  "newton",
  "needham",
  "wellesley",
  "woburn",
  "bedford, ma",
  "billerica",
  "lowell",
  "marlborough",
  "framingham",
  "natick",
  "quincy",
  "braintree",
  "weymouth",
  "norwood",
  "dedham",
  "watertown",
  "medford",
  "malden",
  "revere",
  "chelsea, ma",
  "lynn",
  "salem, ma",
  "beverly",
  "peabody",
  "andover",
  "worcester",
  "massachusetts",

  // --- Remote / Flexible ---
  "remote",
];

const EXCLUDE = [
  // --- Seniority (too experienced) ---
  "senior",
  "sr.",
  "sr ",
  "staff",
  "principal",
  "distinguished",
  "fellow",

  // --- Leadership ---
  "lead",
  "manager",
  "director",
  "head of",
  "vp ",
  "vice president",
  "president",
  "chief",
  "cto",
  "cio",
  "architect",

  // --- Not full-time / not permanent ---
  "intern",
  "internship",
  "co-op",
  "coop",
  "contract",
  "contractor",
  "freelance",
  "temporary",
  "temp ",
  "part time",
  "part-time",

  // --- Overqualified requirements ---
  "phd",
  "ph.d",
  "masters",
  "master's",
  "10+ years",
  "8+ years",
  "7+ years",
  "6+ years",
  "5+ years",

  // --- Non-IC roles that sneak through ---
  "consultant",
  "advisory",
  "evangelist",
  "strategist",
  "analyst",
];

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const SEEN_FILE = "seen.json";
const DISCOVERED_FILE = "discovered.json";

// ---------------- STATE ----------------

let seen = new Set();
if (fs.existsSync(SEEN_FILE)) {
  seen = new Set(JSON.parse(fs.readFileSync(SEEN_FILE)));
}

/** Persistent store for Google-discovered companies, keyed by platform. */
let discovered = { workday: [], ashby: [], greenhouse: [], lever: [] };
if (fs.existsSync(DISCOVERED_FILE)) {
  const loaded = JSON.parse(fs.readFileSync(DISCOVERED_FILE));
  discovered = { ...discovered, ...loaded };
}

function saveDiscovered() {
  fs.writeFileSync(DISCOVERED_FILE, JSON.stringify(discovered, null, 2));
}

// ---------------- HELPERS ----------------

const normalize = (s) => (s || "").toLowerCase();

function matches(title, location) {
  const t = normalize(title);
  const l = normalize(location);

  return (
    KEYWORDS.some(k => t.includes(k)) &&
    LOCATIONS.some(loc => l.includes(loc)) &&
    !EXCLUDE.some(e => t.includes(e))
  );
}

async function notify(title, location, url) {
  const msg = `🔥 ${title}\n📍 ${location}\n${url}\n`;

  console.log(msg);

  if (DISCORD_WEBHOOK) {
    await fetchWithTimeout(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msg })
    });
  }
}

function saveSeen() {
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen], null, 2));
}

// ---------------- GREENHOUSE ----------------

const GREENHOUSE_BOARDS = [
  // --- SF / Bay Area ---
  "airbnb", "stripe", "figma", "discord", "instacart",
  "lyft", "pinterest", "reddit", "squarespace", "twitch",
  "databricks", "anthropic", "cockroachlabs", "gusto",
  "flexport", "benchling", "airtable", "webflow",
  "samsara", "faire", "chime", "marqeta", "affirm",
  "nerdwallet", "ziprecruiter", "yelp", "asana",
  "cloudera", "hashicorp", "pagerduty", "fastly",
  "docusign", "okta", "unity3d", "cruise",

  // --- Boston / Cambridge ---
  "hubspot", "toast", "rapid7", "formlabs",
  "draftkings", "klaviyo", "smartbear", "veeva",
  "thoughtspot", "mimecast", "pegasystems",
  "recorded-future", "jellyfish", "tulip",
  "snyk", "akaaborea",
];

function getAllGreenhouseBoards() {
  const known = new Set(GREENHOUSE_BOARDS);
  const extra = discovered.greenhouse.filter(b => !known.has(b));
  return [...GREENHOUSE_BOARDS, ...extra];
}

async function checkGreenhouse() {
  for (const board of getAllGreenhouseBoards()) {
    try {
      const res = await fetchWithTimeout(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`
      );

      if (!res.ok) {
        console.error(`[Greenhouse] ${board}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();

      for (const job of data.jobs || []) {
        const id = `gh-${job.id}`;

        if (seen.has(id)) continue;

        const title = job.title;
        const location = job.location?.name || "";

        if (matches(title, location)) {
          seen.add(id);
          await notify(title, location, job.absolute_url);
        }
      }
    } catch (err) {
      console.error(`[Greenhouse] ${board}: ${err.message}`);
    }
  }
}

// ---------------- LEVER ----------------

const LEVER_COMPANIES = [
  // --- SF / Bay Area ---
  "plaid", "Netflix", "coinbase", "notion",
  "cloudflare", "brex", "newrelic", "verkada",
  "nianticlabs", "relativityspace", "rippling",
  "ironclad", "lacework", "grammarly", "andurilindustries",
  "dbt-labs", "materialize",

  // --- Boston / Cambridge ---
  "motioncorporation", "locus-robotics", "whoop", "appcues",
  "transmitsecurity",
];

function getAllLeverCompanies() {
  const known = new Set(LEVER_COMPANIES.map(c => c.toLowerCase()));
  const extra = discovered.lever.filter(c => !known.has(c.toLowerCase()));
  return [...LEVER_COMPANIES, ...extra];
}

async function checkLever() {
  for (const company of getAllLeverCompanies()) {
    try {
      const res = await fetchWithTimeout(
        `https://api.lever.co/v0/postings/${company}?mode=json`
      );
      const jobs = await res.json();

      if (!Array.isArray(jobs)) {
        console.error(`[Lever] ${company}: unexpected response (not an array)`);
        continue;
      }

      for (const job of jobs) {
        const id = `lv-${job.id}`;

        if (seen.has(id)) continue;

        const title = job.text;
        const location = job.categories?.location || "";

        if (matches(title, location)) {
          seen.add(id);
          await notify(title, location, job.hostedUrl);
        }
      }
    } catch (err) {
      console.error(`[Lever] ${company}: ${err.message}`);
    }
  }
}

// ---------------- WORKDAY ----------------

function getAllWorkdayCompanies() {
  const knownTenants = new Set(WORKDAY_COMPANIES.map(c => c.tenant));
  const extra = discovered.workday.filter(c => !knownTenants.has(c.tenant));
  return [...WORKDAY_COMPANIES, ...extra];
}

async function checkWorkday() {
  for (const company of getAllWorkdayCompanies()) {
    try {
      const wdNum = company.wd || 1;
      const url = `https://${company.tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${company.tenant}/${company.site}/jobs`;

      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "" })
      });

      if (!res.ok) {
        console.error(`[Workday] ${company.name}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();

      for (const job of data.jobPostings || []) {
        const id = `wd-${company.tenant}-${job.externalPath}`;

        if (seen.has(id)) continue;

        const title = job.title;
        const location = job.locationsText || "";
        const jobId = job.externalPath.split("/").pop();
        const jobUrl = `https://${company.tenant}.wd${wdNum}.myworkdayjobs.com/en-US/${company.site}/details/${jobId}`;

        if (matches(title, location)) {
          seen.add(id);
          await notify(title, location, jobUrl);
        }
      }
    } catch (err) {
      console.error(`[Workday] ${company.name}: ${err.message}`);
    }
  }
}

// ---------------- ASHBY ----------------

function getAllAshbyCompanies() {
  const knownSlugs = new Set(ASHBY_COMPANIES);
  const extra = discovered.ashby.filter(s => !knownSlugs.has(s));
  return [...ASHBY_COMPANIES, ...extra];
}

async function checkAshby() {
  for (const company of getAllAshbyCompanies()) {
    try {
      const res = await fetchWithTimeout(
        `https://api.ashbyhq.com/posting-api/job-board/${company}`
      );

      if (!res.ok) {
        console.error(`[Ashby] ${company}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();

      for (const job of data.jobs || []) {
        const id = `ash-${job.id}`;

        if (seen.has(id)) continue;

        const title = job.title;
        const location = job.location || "";
        const jobUrl = job.jobUrl || `https://jobs.ashbyhq.com/${company}/${job.id}`;

        if (matches(title, location)) {
          seen.add(id);
          await notify(title, location, jobUrl);
        }
      }
    } catch (err) {
      console.error(`[Ashby] ${company}: ${err.message}`);
    }
  }
}

// ---------------- GOOGLE DISCOVERY ----------------

const DISCOVERY_QUERIES = [
  // Workday
  `site:myworkdayjobs.com "software engineer" "san francisco"`,
  `site:myworkdayjobs.com "software engineer" "boston"`,
  `site:myworkdayjobs.com "new grad" software engineer`,
  `site:myworkdayjobs.com "entry level" software engineer`,
  // Ashby
  `site:jobs.ashbyhq.com "software engineer" "san francisco"`,
  `site:jobs.ashbyhq.com "software engineer" "boston"`,
  `site:jobs.ashbyhq.com "new grad" software engineer`,
  `site:jobs.ashbyhq.com "entry level" software engineer`,
  // Greenhouse
  `site:boards.greenhouse.io "software engineer" "san francisco"`,
  `site:boards.greenhouse.io "software engineer" "boston"`,
  `site:boards.greenhouse.io "new grad" software engineer`,
  `site:boards.greenhouse.io "entry level" software engineer`,
  // Lever
  `site:jobs.lever.co "software engineer" "san francisco"`,
  `site:jobs.lever.co "software engineer" "boston"`,
  `site:jobs.lever.co "new grad" software engineer`,
  `site:jobs.lever.co "entry level" software engineer`,
];

const GOOGLE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Random delay between min and max ms to look less automated. */
function randomDelay(minMs, maxMs) {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

/**
 * Extract Workday company info from a URL like:
 * https://{tenant}.wd{N}.myworkdayjobs.com/{site}/job/...
 */
function parseWorkdayUrl(url) {
  const match = url.match(
    /https?:\/\/([^.]+)\.wd(\d+)\.myworkdayjobs\.com\/([^/]+)/
  );
  if (!match) return null;

  const [, tenant, wdNum, site] = match;
  if (site === "wday") return null;

  return {
    name: tenant.charAt(0).toUpperCase() + tenant.slice(1),
    tenant,
    site,
    ...(wdNum !== "1" && { wd: parseInt(wdNum) })
  };
}

/**
 * Extract Ashby company slug from a URL like:
 * https://jobs.ashbyhq.com/{slug}/...
 */
function parseAshbyUrl(url) {
  const match = url.match(/https?:\/\/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (!match) return null;
  return match[1].toLowerCase();
}

/**
 * Extract Greenhouse board token from a URL like:
 * https://boards.greenhouse.io/{token}/jobs/...
 */
function parseGreenhouseUrl(url) {
  const match = url.match(/https?:\/\/boards\.greenhouse\.io\/([^/?#]+)/);
  if (!match) return null;
  const token = match[1].toLowerCase();
  if (token === "embed" || token === "include") return null;
  return token;
}

/**
 * Extract Lever company slug from a URL like:
 * https://jobs.lever.co/{slug}/...
 */
function parseLeverUrl(url) {
  const match = url.match(/https?:\/\/jobs\.lever\.co\/([^/?#]+)/);
  if (!match) return null;
  return match[1].toLowerCase();
}

async function scrapeGoogleLinks(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=30`;

  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": GOOGLE_UA,
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (!res.ok) {
    console.error(`[Discovery] HTTP ${res.status} for: ${query.slice(0, 50)}`);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const links = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const match = href.match(/\/url\?q=(https:\/\/[^&]+)/);
    if (match) {
      const link = decodeURIComponent(match[1]);
      if (
        link.includes("myworkdayjobs.com") ||
        link.includes("ashbyhq.com") ||
        link.includes("boards.greenhouse.io") ||
        link.includes("jobs.lever.co")
      ) {
        links.push(link);
      }
    }
  });

  return links;
}

async function discoverCompanies() {
  const knownWdTenants = new Set([
    ...WORKDAY_COMPANIES.map(c => c.tenant),
    ...discovered.workday.map(c => c.tenant)
  ]);
  const knownAshbySlugs = new Set([
    ...ASHBY_COMPANIES,
    ...discovered.ashby
  ]);
  const knownGhBoards = new Set([
    ...GREENHOUSE_BOARDS,
    ...discovered.greenhouse
  ]);
  const knownLeverSlugs = new Set([
    ...LEVER_COMPANIES.map(c => c.toLowerCase()),
    ...discovered.lever.map(c => c.toLowerCase())
  ]);

  let counts = { workday: 0, ashby: 0, greenhouse: 0, lever: 0 };

  for (let i = 0; i < DISCOVERY_QUERIES.length; i++) {
    try {
      const links = await scrapeGoogleLinks(DISCOVERY_QUERIES[i]);

      for (const link of links) {
        const wdCompany = parseWorkdayUrl(link);
        if (wdCompany && !knownWdTenants.has(wdCompany.tenant)) {
          knownWdTenants.add(wdCompany.tenant);
          discovered.workday.push(wdCompany);
          counts.workday++;
          console.log(`[Discovery] 🆕 Workday: ${wdCompany.name} (${wdCompany.tenant}/${wdCompany.site})`);
        }

        const ashbySlug = parseAshbyUrl(link);
        if (ashbySlug && !knownAshbySlugs.has(ashbySlug)) {
          knownAshbySlugs.add(ashbySlug);
          discovered.ashby.push(ashbySlug);
          counts.ashby++;
          console.log(`[Discovery] 🆕 Ashby: ${ashbySlug}`);
        }

        const ghBoard = parseGreenhouseUrl(link);
        if (ghBoard && !knownGhBoards.has(ghBoard)) {
          knownGhBoards.add(ghBoard);
          discovered.greenhouse.push(ghBoard);
          counts.greenhouse++;
          console.log(`[Discovery] 🆕 Greenhouse: ${ghBoard}`);
        }

        const leverSlug = parseLeverUrl(link);
        if (leverSlug && !knownLeverSlugs.has(leverSlug)) {
          knownLeverSlugs.add(leverSlug);
          discovered.lever.push(leverSlug);
          counts.lever++;
          console.log(`[Discovery] 🆕 Lever: ${leverSlug}`);
        }
      }

      if (i < DISCOVERY_QUERIES.length - 1) await randomDelay(8000, 15000);
    } catch (err) {
      console.error(`[Discovery] ${err.message}`);
    }
  }

  const total = counts.workday + counts.ashby + counts.greenhouse + counts.lever;
  if (total) {
    saveDiscovered();
    console.log(`[Discovery] Added ${counts.greenhouse} Greenhouse + ${counts.lever} Lever + ${counts.workday} Workday + ${counts.ashby} Ashby companies\n`);
  } else {
    console.log("[Discovery] No new companies found\n");
  }
}

// ---------------- RUN ----------------

const API_INTERVAL_MS = 15 * 60 * 1000;    // 15 minutes
const GOOGLE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function runAPIs() {
  console.log(`[${new Date().toLocaleTimeString()}] 🔍 Checking Greenhouse + Lever + Workday + Ashby...\n`);

  await Promise.all([checkGreenhouse(), checkLever(), checkWorkday(), checkAshby()]);
  saveSeen();

  console.log(`[${new Date().toLocaleTimeString()}] ✅ API check done\n`);
}

async function runDiscovery() {
  console.log(`[${new Date().toLocaleTimeString()}] 🔍 Discovering new companies via Google...\n`);
  await discoverCompanies();
  console.log(`[${new Date().toLocaleTimeString()}] ✅ Discovery done\n`);
}

async function start() {
  await runAPIs();

  setInterval(runAPIs, API_INTERVAL_MS);
  setInterval(runDiscovery, GOOGLE_INTERVAL_MS);

  const ghTotal = getAllGreenhouseBoards().length;
  const levTotal = getAllLeverCompanies().length;
  const wdTotal = getAllWorkdayCompanies().length;
  const ashTotal = getAllAshbyCompanies().length;
  console.log(`⏰ Tracking ${ghTotal} Greenhouse + ${levTotal} Lever + ${wdTotal} Workday + ${ashTotal} Ashby companies`);
  console.log(`⏰ APIs every 15m, Discovery in ${GOOGLE_INTERVAL_MS / 3600000}h. Ctrl+C to stop.\n`);
}

start();