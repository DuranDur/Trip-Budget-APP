// expenseStore.js
//
// This file is our "database". Since there's no backend, everything is
// saved in the browser's localStorage instead. localStorage only stores
// strings, so we convert our list of expenses to and from JSON.

const STORAGE_KEY = "tripBudgetExpenses";

// Read every saved expense.
function getExpenses() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw);
}

// Write the whole list of expenses back to localStorage.
// (Kept private-ish - the other functions below call this one.)
function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// Add a new expense to the list. Returns the new expense, including
// the id that was generated for it.
function createExpense(expense) {
  const expenses = getExpenses();

  const newExpense = {
    id: Date.now().toString(), // good enough unique id for this app
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    category: expense.category,
    date: expense.date,
  };

  expenses.push(newExpense);
  saveExpenses(expenses);

  return newExpense;
}

// Update one expense by id. "updates" only needs to contain the fields
// that are changing.
function updateExpense(id, updates) {
  const expenses = getExpenses();

  const index = expenses.findIndex(function (expense) {
    return expense.id === id;
  });

  if (index === -1) {
    console.warn("Tried to update an expense that does not exist:", id);
    return;
  }

  expenses[index] = Object.assign({}, expenses[index], updates);
  saveExpenses(expenses);
}

// Remove one expense by id.
function deleteExpense(id) {
  const expenses = getExpenses();

  const remaining = expenses.filter(function (expense) {
    return expense.id !== id;
  });

  saveExpenses(remaining);
}
