// currencyApi.js
//
// This file is the only place that talks to the outside world (the
// Frankfurter API). Frankfurter is free, needs no API key, and allows
// requests straight from the browser.
//
// Docs: https://frankfurter.dev

const API_BASE_URL = "https://api.frankfurter.dev/v1";

// A small backup list in case the currency list fetch ever fails.
// This way the dropdown still has something useful in it.
const FALLBACK_CURRENCIES = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  MXN: "Mexican Peso",
};

// Get the full list of currency codes and names.
// Example result: { "USD": "US Dollar", "EUR": "Euro", ... }
async function getCurrencyList() {
  try {
    const response = await fetch(`${API_BASE_URL}/currencies`);
    if (!response.ok) {
      throw new Error("Currency list request failed");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Could not load currency list, using fallback list.", error);
    return FALLBACK_CURRENCIES;
  }
}

// Get today's exchange rates for one base currency.
// Example: getLatestRates("USD") -> { amount: 1, base: "USD", date: "2026-08-17", rates: { EUR: 0.86, ... } }
async function getLatestRates(base) {
  const response = await fetch(`${API_BASE_URL}/latest?from=${base}`);
  if (!response.ok) {
    throw new Error(`Could not load exchange rates for ${base}`);
  }
  return response.json();
}

// Get the exchange rates for a base currency on one specific date.
// date must be formatted like "2026-08-01".
async function getHistoricalRates(date, base) {
  const response = await fetch(`${API_BASE_URL}/${date}?from=${base}`);
  if (!response.ok) {
    throw new Error(`Could not load rates for ${base} on ${date}`);
  }
  return response.json();
}

// Convert an amount from one currency to another.
// If a date is given, uses that day's rate. Otherwise uses today's rate.
// Returns { convertedAmount, rate, rateDate }.
async function convertAmount(amount, from, to, date) {
  // No conversion needed if both currencies are the same.
  if (from === to) {
    return {
      convertedAmount: amount,
      rate: 1,
      rateDate: date || "today",
    };
  }

  const data = date
    ? await getHistoricalRates(date, from)
    : await getLatestRates(from);

  const rate = data.rates[to];

  // Frankfurter doesn't error on an unsupported pair, it just leaves the
  // currency out of the rates object - so we have to check for it ourselves.
  if (rate === undefined) {
    throw new Error(`No exchange rate found for ${from} to ${to}`);
  }

  return {
    convertedAmount: amount * rate,
    rate: rate,
    rateDate: data.date,
  };
}
