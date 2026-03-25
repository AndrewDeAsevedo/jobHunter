# jobHunter

Automated job scraper that monitors 170+ company career pages across four major job board platforms. Filters for entry-level software engineering roles in the SF Bay Area and Greater Boston, then sends real-time Discord notifications within minutes of a posting going live.

## How It Works

```
┌─────────────────────────────────────────────────┐
│                  Every 15 min                    │
│                                                  │
│   Greenhouse (46) ──┐                            │
│   Lever      (22) ──┤                            │
│   Workday    (47) ──┼── filter ── Discord ping   │
│   Ashby      (56) ──┘                            │
│                                                  │
├─────────────────────────────────────────────────┤
│                  Every 6 hrs                     │
│                                                  │
│   Google Discovery ── find new Workday/Ashby     │
│                       companies automatically    │
└─────────────────────────────────────────────────┘
```

- **Greenhouse API** — public REST endpoint per board token
- **Lever API** — public REST endpoint per company slug
- **Workday CXS API** — POST-based internal API with tenant/site/wd config
- **Ashby Posting API** — POST-based public job board endpoint
- **Google Discovery** — scrapes Google search results to find new Workday/Ashby career pages and auto-adds them to the scrape pool

## Filtering

Every job is checked against three criteria before notifying:

| Filter | Purpose |
|--------|---------|
| **Keywords** | Matches entry-level software/dev titles (SWE, frontend, backend, fullstack, DevOps, etc.) |
| **Locations** | SF Bay Area and Greater Boston metro areas including surrounding cities |
| **Excludes** | Rejects senior, staff, lead, principal, manager, director, and other non-entry-level titles |

## Setup

### Prerequisites

- Node.js >= 20
- A Discord webhook URL

### Install

```bash
git clone https://github.com/AndrewDeAsevedo/jobHunter.git
cd jobHunter
npm install
```

### Configure

Create a `.env` file:

```
DISCORD_WEBHOOK=https://discord.com/api/webhooks/your/webhook/url
```

### Run

```bash
npm start
```

### Run Persistently (Linux server)

```bash
pm2 start index.js --name jobhunter
pm2 save
```

## Project Structure

```
├── index.js          Main scraper — API checks, filtering, notifications, scheduling
├── companies.js      Curated Workday + Ashby company lists
├── seen.json         Auto-generated — tracks notified job IDs to prevent duplicates
├── discovered.json   Auto-generated — companies found by Google discovery
├── .env              Discord webhook URL (not committed)
└── package.json
```

## Customization

**Add companies** — edit the arrays in `companies.js` (Workday/Ashby) or the `GREENHOUSE_BOARDS` / `LEVER_COMPANIES` arrays in `index.js`.

**Change locations** — edit the `LOCATIONS` array in `index.js`.

**Change keywords** — edit the `KEYWORDS` array in `index.js`.

**Change exclusions** — edit the `EXCLUDE` array in `index.js`.

**Reset notifications** — clear `seen.json` to re-notify all current jobs:

```bash
echo "[]" > seen.json && pm2 restart jobhunter
```

## Use of AI

This project was built with the assistance of AI (Claude via Cursor). AI was used for:

- **Architecture & design** — planning the multi-API scraping approach and scheduling strategy
- **Debugging** — diagnosing API-specific issues (Workday 422s, Ashby URL construction, Google rate-limiting)
- **Code generation** — writing the initial scraper logic, and filtering system
- **Company research** — identifying which companies use which job board platforms and their correct API configurations
- **Iterative refinement** — expanding keyword/location/exclusion filters based on real output analysis

All code was reviewed, tested, and deployed by me. The architecture decisions — what to build, which platforms to target, how to filter, and where to deploy — were mine.
