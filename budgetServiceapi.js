// budgetService.js
//
// This file turns raw expenses into numbers we can show on screen:
// converting currencies, adding totals, and grouping by category or day.

// Convert one expense into the base currency.
// Returns a NEW object - we don't change the original expense.
async function convertExpense(expense, baseCurrency) {
  const result = await convertAmount(
    expense.amount,
    expense.currency,
    baseCurrency,
    expense.date,
  );

  return Object.assign({}, expense, {
    convertedAmount: result.convertedAmount,
    rate: result.rate,
    rateDate: result.rateDate,
    baseCurrency: baseCurrency,
  });
}

// Convert a whole list of expenses into the base currency.
// We convert one at a time with a for loop instead of Promise.all so it's
// easier to follow - for a small trip's worth of expenses this is plenty fast.
async function convertAllExpenses(expenses, baseCurrency) {
  const convertedExpenses = [];

  for (let i = 0; i < expenses.length; i++) {
    const converted = await convertExpense(expenses[i], baseCurrency);
    convertedExpenses.push(converted);
  }

  return convertedExpenses;
}

// Add up every converted expense, and break the total down by category.
function calculateBudgetSummary(convertedExpenses) {
  let total = 0;

  for (let i = 0; i < convertedExpenses.length; i++) {
    total += convertedExpenses[i].convertedAmount;
  }

  return {
    total: total,
    count: convertedExpenses.length,
    byCategory: groupByCategory(convertedExpenses),
  };
}

// Group converted expenses by category, returning a total per category.
// Example: { Food: 120.50, Transport: 40.00 }
function groupByCategory(convertedExpenses) {
  const totals = {};

  for (let i = 0; i < convertedExpenses.length; i++) {
    const expense = convertedExpenses[i];
    const category = expense.category || "Other";

    if (!totals[category]) {
      totals[category] = 0;
    }

    totals[category] += expense.convertedAmount;
  }

  return totals;
}

// Group converted expenses by date, returning a total per day.
// Used for the daily-spend bar chart.
function groupByDate(convertedExpenses) {
  const totals = {};

  for (let i = 0; i < convertedExpenses.length; i++) {
    const expense = convertedExpenses[i];
    const day = expense.date;

    if (!totals[day]) {
      totals[day] = 0;
    }

    totals[day] += expense.convertedAmount;
  }

  return totals;
}
