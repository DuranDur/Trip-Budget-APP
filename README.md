# Trip Budget Tracker

A simple, 100% client-side web app for tracking trip expenses in multiple
currencies. Enter an expense in whatever currency you paid in, and the app
converts it into one base currency so you can see your real total spend.

No backend, no database, no build tools, no npm install. Just open the HTML
file in a browser.

## Running it

1. Download this folder.
2. Open `index.html` directly in your browser (double-click it, or drag it
   into a browser window).

That's it. The app talks to a free currency API over `fetch`, and everything
else runs in the browser.

## How it works

**Currency conversion** — [Frankfurter](https://frankfurter.dev) is a free
currency API that needs no API key and allows requests straight from the
browser. `currencyApi.js` is the only file that talks to it.

**Saving your data** — Expenses are saved in the browser's `localStorage`,
which is a small key-value store the browser keeps on disk. That means your
expenses are still there the next time you open the page, even after
closing the browser. They are **not** saved to any server — they live only
in the browser you added them in, tied to this specific file's location.
Clearing your browser data, or opening the file from a different browser or
folder, will start you with an empty list.

**Totals and summaries** — Nothing is pre-calculated or stored. Every time
the page loads (or you add/edit/delete an expense), the app re-reads the raw
expense list and recalculates the total, the category breakdown, and the
daily-spend chart from scratch. This keeps the numbers always in sync with
whatever expenses actually exist — there's no separate "total" that could
ever drift out of date.

## File structure

```
index.html         The page itself - form, summary, chart, table
index.css           All the styling
currencyApi.js      Talks to the Frankfurter API (rates + conversion)
expenseStoreApi.js  Reads/writes expenses to localStorage (create/read/update/delete)
budgetServiceapi.js  The math: converting, totaling, grouping by category/day
index.js            Wires everything together - renders the page, handles form events
```

The scripts load in that order in `index.html`, and each one only knows
about the layer below it: `index.js` calls into `budgetServiceapi.js` and
`expenseStoreApi.js`, `budgetServiceapi.js` calls into `currencyApi.js`, and
`currencyApi.js` is the only one that knows the API even exists.

## Features

- Add, edit, and delete expenses
- Pick the currency you paid in per-expense, and a separate "show totals in"
  currency for your summary
- Live conversion preview while you type, before you submit
- Total spend + a breakdown card per category
- A daily-spend bar chart, built from plain `<div>`s (no chart library)
- Each converted amount shows which day's exchange rate was used
- Inline validation (empty amount, non-numeric amount, missing currency)
- An example row shown when the list is empty, so the table isn't blank

## Things intentionally left out

This was built as a portfolio/practice project, so a few things are
deliberately out of scope:

- No user accounts or login - it's single-user, single-browser
- No backend server or real database
- No receipt uploads
- Currency conversions are converted one at a time in a loop rather than
  in parallel, to keep the code easy to follow (fine for a trip's worth of
  expenses; would be worth revisiting for a much larger list)

## Known limitations

- Frankfurter only publishes rates on business days, so a rate "from" a
  weekend or holiday date is actually the most recent prior business day's
  rate
- Not every currency has historical data going all the way back, so very
  old dates for less common currencies may fail to convert
