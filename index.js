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
  "software engineer",
  "software engineer i",
  "new grad",
  "associate",
  "entry level",
  "junior"
];

const LOCATIONS = [
  "san francisco",
  "sf",
  "bay area",
  "san jose",
  "palo alto",
  "mountain view",
  "sunnyvale",
  "redwood city",
  "menlo park",
  "oakland",
  "remote"
];

const EXCLUDE = [
  "senior",
  "staff",
  "principal",
  "lead",
  "intern",
  "contract",
  "phd",
  "masters",
  "manager",
  "sr",
  "director",
  "president"
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
let discovered = { workday: [], ashby: [] };
if (fs.existsSync(DISCOVERED_FILE)) {
  discovered = JSON.parse(fs.readFileSync(DISCOVERED_FILE));
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
  "airbnb", "stripe", "figma", "discord", "instacart",
  "lyft", "pinterest", "reddit", "squarespace", "twitch",
  "databricks", "anthropic"
];

async function checkGreenhouse() {
  for (const board of GREENHOUSE_BOARDS) {
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
  "plaid",
];

async function checkLever() {
  for (const company of LEVER_COMPANIES) {
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
        const jobUrl = `https://${company.tenant}.wd${wdNum}.myworkdayjobs.com/${company.site}/job/${job.externalPath}`;

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
  `site:myworkdayjobs.com "software engineer" "san francisco"`,
  `site:myworkdayjobs.com "software engineer" "bay area"`,
  `site:myworkdayjobs.com "new grad" software engineer`,
  `site:myworkdayjobs.com "entry level" software engineer`,
  `site:jobs.ashbyhq.com "software engineer" "san francisco"`,
  `site:jobs.ashbyhq.com "software engineer" "bay area"`,
  `site:jobs.ashbyhq.com "new grad" software engineer`,
  `site:jobs.ashbyhq.com "entry level" software engineer`
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
      if (link.includes("myworkdayjobs.com") || link.includes("ashbyhq.com")) {
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

  let newWorkday = 0;
  let newAshby = 0;

  for (let i = 0; i < DISCOVERY_QUERIES.length; i++) {
    try {
      const links = await scrapeGoogleLinks(DISCOVERY_QUERIES[i]);

      for (const link of links) {
        const wdCompany = parseWorkdayUrl(link);
        if (wdCompany && !knownWdTenants.has(wdCompany.tenant)) {
          knownWdTenants.add(wdCompany.tenant);
          discovered.workday.push(wdCompany);
          newWorkday++;
          console.log(`[Discovery] 🆕 Workday: ${wdCompany.name} (${wdCompany.tenant}/${wdCompany.site})`);
        }

        const ashbySlug = parseAshbyUrl(link);
        if (ashbySlug && !knownAshbySlugs.has(ashbySlug)) {
          knownAshbySlugs.add(ashbySlug);
          discovered.ashby.push(ashbySlug);
          newAshby++;
          console.log(`[Discovery] 🆕 Ashby: ${ashbySlug}`);
        }
      }

      if (i < DISCOVERY_QUERIES.length - 1) await randomDelay(8000, 15000);
    } catch (err) {
      console.error(`[Discovery] ${err.message}`);
    }
  }

  if (newWorkday || newAshby) {
    saveDiscovered();
    console.log(`[Discovery] Added ${newWorkday} Workday + ${newAshby} Ashby companies\n`);
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

  const wdTotal = getAllWorkdayCompanies().length;
  const ashTotal = getAllAshbyCompanies().length;
  console.log(`⏰ Tracking ${wdTotal} Workday + ${ashTotal} Ashby + ${GREENHOUSE_BOARDS.length} Greenhouse + ${LEVER_COMPANIES.length} Lever companies`);
  console.log(`⏰ APIs every 15m, Discovery in ${GOOGLE_INTERVAL_MS / 3600000}h. Ctrl+C to stop.\n`);
}

start();