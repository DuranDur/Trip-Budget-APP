# Trip Budget Tracker

A 100% client-side travel budgeting app. Log expenses in whatever currency you paid in, and the app converts everything into one base currency using live and historical exchange rates — so you always know your real total spend while traveling.

🌍 **Live demo:** https://durandur.github.io/Trip-Budget-APP/

## Features

- **Add, edit, and delete expenses** — description, amount, currency, category, and date per expense
- **Multi-currency support** — pick the currency you paid in for each expense, plus a separate "show totals in" base currency for the summary
- **Live conversion preview** — see the converted amount update as you type, before you even submit
- **Historical exchange rates** — each expense is converted using the rate from the day it was spent, not today's rate
- **Summary dashboard** — total spend plus a breakdown card per category
- **Daily-spend bar chart** — visualizes spending per day, built from plain `<div>`s (no chart library)
- **Rate transparency** — every converted amount shows which day's exchange rate was used
- **Inline form validation** — catches empty amounts, non-numeric input, and missing currencies
- **Persistent storage** — expenses survive browser restarts via `localStorage`
- **Offline-resilient currency list** — falls back to a built-in list of major currencies if the API is unreachable

## Tech Stack

| Layer      | Technology                                                              |
|------------|-------------------------------------------------------------------------|
| Language   | JavaScript (ES6+)                                                       |
| Markup     | HTML5                                                                   |
| Styling    | CSS3                                                                    |
| Exchange rates | [Frankfurter REST API](https://frankfurter.dev) (free, no API key needed) |
| Storage    | Browser `localStorage`                                                  |
| Hosting    | GitHub Pages                                                            |

No backend, no database, no build tools, no `npm install`. Just open the HTML file in a browser.

## Project Structure

```
Trip-Budget-APP/
├── index.html          # Page structure — expense form, summary cards, bar chart, expense table
├── index.css           # All styling
├── index.js            # UI layer — the only file that touches the DOM (form handling, rendering, events)
├── currencyapi.js      # API layer — the only file that talks to the Frankfurter API
├── budgetServiceapi.js # Math layer — currency conversion, totals, grouping by category/day
├── expenseStoreApi.js  # Storage layer — CRUD operations backed by localStorage
└── README.md
```

The scripts load in dependency order, and each layer only knows about the one below it:

```
index.js → budgetServiceapi.js + expenseStoreApi.js → currencyapi.js → Frankfurter API
```

## How It Works

### Currency conversion (`currencyapi.js`)

The single point of contact with the outside world. Wraps four Frankfurter endpoints:

- `getCurrencyList()` — fetches all supported currency codes/names (falls back to 7 major currencies on failure)
- `getLatestRates(base)` — today's rates for a base currency
- `getHistoricalRates(date, base)` — rates for a specific date, so past expenses convert at the rate from when they were spent
- `convertAmount(amount, from, to, date)` — converts one amount, returning `{ convertedAmount, rate, rateDate }`

### Budget math (`budgetServiceapi.js`)

Turns raw expenses into displayable numbers:

- `convertExpense()` / `convertAllExpenses()` — converts expenses into the base currency (one at a time for readability)
- `calculateBudgetSummary()` — total spend, expense count, and per-category breakdown
- `groupByCategory()` / `groupByDate()` — aggregations that feed the summary cards and the daily-spend bar chart

### Storage (`expenseStoreApi.js`)

A `localStorage`-backed "database" under the key `tripBudgetExpenses`:

- `createExpense()` — assigns an id (`Date.now()`) and appends
- `getExpenses()` / `updateExpense()` / `deleteExpense()` — full CRUD, JSON-serialized

Data lives only in the browser it was entered in — no server, no account.

### UI (`index.js`)

Holds app state in plain variables (no framework): the selected base currency, a cached currency list, and which expense is being edited. Handles form validation, the live conversion preview, edit/cancel flows, and re-renders the summary cards, bar chart, and expense table from scratch on every change — so displayed numbers can never drift out of sync with the stored expenses. Shows a sample expense ("Taxi from airport") when the list is empty.

Expense categories: Food, Transport, Lodging, Activities, Shopping, Other.

## Running It Locally

**Option 1 — just open it:**
1. Download or clone this repo.
2. Open `index.html` in your browser (double-click, or drag it into a browser window).

**Option 2 — serve it (recommended, avoids any file-protocol quirks):**
```bash
npx serve .
# or
python3 -m http.server 8000
```
Then visit `http://localhost:8000` (or the port shown).

```bash
git clone https://github.com/DuranDur/Trip-Budget-APP.git
```

## Known Limitations

- Frankfurter only publishes rates on business days — a rate "from" a weekend or holiday is actually the most recent prior business day's rate.
- Not every currency has deep historical data, so very old dates for less common currencies may fail to convert.
- Conversions run sequentially in a loop rather than in parallel — a deliberate readability trade-off that's plenty fast for a trip's worth of expenses.
- Single-user, single-browser: no accounts, no syncing, no receipt uploads.
