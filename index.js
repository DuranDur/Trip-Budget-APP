// ui.js
//
// This file is the only one allowed to touch the HTML directly.
// It reads from the form, calls into expenseStore.js and budgetService.js,
// and re-draws the page whenever something changes.

// ---- App state (just plain variables, no framework needed) ----
let currentBaseCurrency = "USD";
let currencyListCache = null; // so we don't re-fetch the currency list every time
let editingExpenseId = null; // null = adding a new expense, otherwise editing this id

// ---- Element references (grabbed once, reused everywhere) ----
const baseCurrencySelect = document.getElementById("baseCurrencySelect");
const expenseForm = document.getElementById("expenseForm");
const formTitle = document.getElementById("formTitle");
const descriptionInput = document.getElementById("descriptionInput");
const amountInput = document.getElementById("amountInput");
const amountError = document.getElementById("amountError");
const currencySelect = document.getElementById("currencySelect");
const currencyError = document.getElementById("currencyError");
const categorySelect = document.getElementById("categorySelect");
const dateInput = document.getElementById("dateInput");
const conversionPreview = document.getElementById("conversionPreview");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const summaryCards = document.getElementById("summaryCards");
const barChart = document.getElementById("barChart");
const expenseTableBody = document.getElementById("expenseTableBody");

// ---- A tiny sample expense shown only when the list is empty ----
const EXAMPLE_EXPENSE = {
  date: "2026-06-01",
  description: "Taxi from airport",
  category: "Transport",
  amount: 25,
  currency: "EUR",
};

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------

async function init() {
  // Default the date field to today, so users don't have to think about it.
  dateInput.value = new Date().toISOString().slice(0, 10);

  await loadCurrencyOptions();
  bindEvents();
  await renderAll();
}

// Fetch the currency list once and use it to fill both dropdowns.
async function loadCurrencyOptions() {
  currencyListCache = await getCurrencyList();

  const codes = Object.keys(currencyListCache).sort();

  baseCurrencySelect.innerHTML = "";
  currencySelect.innerHTML = "";

  codes.forEach(function (code) {
    const label = `${code} - ${currencyListCache[code]}`;

    const baseOption = document.createElement("option");
    baseOption.value = code;
    baseOption.textContent = label;
    baseCurrencySelect.appendChild(baseOption);

    const expenseOption = document.createElement("option");
    expenseOption.value = code;
    expenseOption.textContent = label;
    currencySelect.appendChild(expenseOption);
  });

  // Start both dropdowns on USD if it exists.
  if (currencyListCache.USD) {
    baseCurrencySelect.value = "USD";
    currencySelect.value = "USD";
  }

  currentBaseCurrency = baseCurrencySelect.value;
}

function bindEvents() {
  baseCurrencySelect.addEventListener("change", async function () {
    currentBaseCurrency = baseCurrencySelect.value;
    await renderAll();
  });

  expenseForm.addEventListener("submit", handleFormSubmit);

  cancelEditButton.addEventListener("click", function () {
    stopEditing();
  });

  // Update the live conversion preview whenever the relevant fields change.
  amountInput.addEventListener("input", updateConversionPreview);
  currencySelect.addEventListener("change", updateConversionPreview);
  dateInput.addEventListener("change", updateConversionPreview);
}

// ---------------------------------------------------------------
// Form handling
// ---------------------------------------------------------------

// Checks the form and returns { valid, errors }.
function validateForm() {
  const errors = {};

  const amountText = amountInput.value.trim();
  const amountNumber = Number(amountText);

  if (amountText === "") {
    errors.amount = "Enter an amount.";
  } else if (isNaN(amountNumber)) {
    errors.amount = "Amount must be a number.";
  } else if (amountNumber <= 0) {
    errors.amount = "Amount must be greater than 0.";
  }

  if (!currencySelect.value) {
    errors.currency = "Choose a currency.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors,
  };
}

function showFormErrors(errors) {
  amountError.textContent = errors.amount || "";
  currencyError.textContent = errors.currency || "";
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const { valid, errors } = validateForm();
  showFormErrors(errors);

  if (!valid) {
    return;
  }

  const expenseData = {
    description: descriptionInput.value.trim() || "(no description)",
    amount: Number(amountInput.value),
    currency: currencySelect.value,
    category: categorySelect.value,
    date: dateInput.value,
  };

  if (editingExpenseId) {
    updateExpense(editingExpenseId, expenseData);
  } else {
    createExpense(expenseData);
  }

  stopEditing();
  resetForm();
  await renderAll();
}

function resetForm() {
  expenseForm.reset();
  dateInput.value = new Date().toISOString().slice(0, 10);
  conversionPreview.textContent = "";
  showFormErrors({});
}

function startEditingExpense(expense) {
  editingExpenseId = expense.id;

  descriptionInput.value = expense.description;
  amountInput.value = expense.amount;
  currencySelect.value = expense.currency;
  categorySelect.value = expense.category;
  dateInput.value = expense.date;

  formTitle.textContent = "Edit expense";
  submitButton.textContent = "Save changes";
  cancelEditButton.classList.remove("hidden");

  updateConversionPreview();

  // Scroll the form into view so the user can see what they're editing.
  expenseForm.scrollIntoView({ behavior: "smooth" });
}

function stopEditing() {
  editingExpenseId = null;
  formTitle.textContent = "Add an expense";
  submitButton.textContent = "Add expense";
  cancelEditButton.classList.add("hidden");
}

async function handleDeleteExpense(id) {
  deleteExpense(id);

  // If the user deletes the expense they were editing, reset the form.
  if (editingExpenseId === id) {
    stopEditing();
    resetForm();
  }

  await renderAll();
}

// Show a live "this is about how much that'll be" preview before submit.
async function updateConversionPreview() {
  const amountText = amountInput.value.trim();
  const amountNumber = Number(amountText);
  const fromCurrency = currencySelect.value;

  if (amountText === "" || isNaN(amountNumber) || !fromCurrency) {
    conversionPreview.textContent = "";
    return;
  }

  if (fromCurrency === currentBaseCurrency) {
    conversionPreview.textContent = `= ${formatMoney(amountNumber)} ${currentBaseCurrency} (same currency)`;
    return;
  }

  try {
    conversionPreview.textContent = "Converting...";
    const result = await convertAmount(
      amountNumber,
      fromCurrency,
      currentBaseCurrency,
      dateInput.value,
    );
    conversionPreview.textContent =
      `≈ ${formatMoney(result.convertedAmount)} ${currentBaseCurrency} ` +
      `(rate from ${result.rateDate})`;
  } catch (error) {
    conversionPreview.textContent = "Could not preview conversion right now.";
  }
}

// ---------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------

// The main "redraw everything" function. Called after any change.
async function renderAll() {
  const expenses = getExpenses();

  if (expenses.length === 0) {
    renderEmptyState();
    renderSummaryCards({ total: 0, byCategory: {} });
    renderBarChart([]);
    return;
  }

  let convertedExpenses;
  try {
    convertedExpenses = await convertAllExpenses(expenses, currentBaseCurrency);
  } catch (error) {
    expenseTableBody.innerHTML = `<tr><td colspan="6">Could not load exchange rates right now. Try again in a moment.</td></tr>`;
    return;
  }

  // Show newest expenses first.
  convertedExpenses.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  renderExpenseTable(convertedExpenses);

  const summary = calculateBudgetSummary(convertedExpenses);
  renderSummaryCards(summary);
  renderBarChart(convertedExpenses);
}

function renderExpenseTable(convertedExpenses) {
  expenseTableBody.innerHTML = "";

  convertedExpenses.forEach(function (expense) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${expense.date}</td>
      <td>${escapeHtml(expense.description)}</td>
      <td>${expense.category}</td>
      <td>${formatMoney(expense.amount)} ${expense.currency}</td>
      <td>
        ${formatMoney(expense.convertedAmount)} ${expense.baseCurrency}
        <span class="rate-note">Converted using rate from ${expense.rateDate}</span>
      </td>
      <td class="row-actions">
        <button class="edit-button" data-id="${expense.id}">Edit</button>
        <button class="delete-button" data-id="${expense.id}">Delete</button>
      </td>
    `;

    expenseTableBody.appendChild(row);
  });

  // Wire up the buttons we just created.
  expenseTableBody.querySelectorAll(".edit-button").forEach(function (button) {
    button.addEventListener("click", function () {
      const expense = convertedExpenses.find(function (item) {
        return item.id === button.dataset.id;
      });
      startEditingExpense(expense);
    });
  });

  expenseTableBody
    .querySelectorAll(".delete-button")
    .forEach(function (button) {
      button.addEventListener("click", function () {
        handleDeleteExpense(button.dataset.id);
      });
    });
}

// Shown when there are no real expenses yet - a greyed-out example row.
function renderEmptyState() {
  expenseTableBody.innerHTML = `
    <tr class="example-row">
      <td>${EXAMPLE_EXPENSE.date}</td>
      <td>${EXAMPLE_EXPENSE.description} <span class="example-tag">Example</span></td>
      <td>${EXAMPLE_EXPENSE.category}</td>
      <td>${formatMoney(EXAMPLE_EXPENSE.amount)} ${EXAMPLE_EXPENSE.currency}</td>
      <td>-</td>
      <td></td>
    </tr>
    <tr>
      <td colspan="6">No expenses yet - add your first one above.</td>
    </tr>
  `;
}

function renderSummaryCards(summary) {
  summaryCards.innerHTML = "";

  const totalCard = document.createElement("div");
  totalCard.className = "summary-card total";
  totalCard.innerHTML = `
    <div class="label">Total spend</div>
    <div class="value">${formatMoney(summary.total)} ${currentBaseCurrency}</div>
  `;
  summaryCards.appendChild(totalCard);

  Object.keys(summary.byCategory).forEach(function (category) {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `
      <div class="label">${category}</div>
      <div class="value">${formatMoney(summary.byCategory[category])} ${currentBaseCurrency}</div>
    `;
    summaryCards.appendChild(card);
  });
}

// A simple bar chart built entirely from <div>s - no chart library needed.
function renderBarChart(convertedExpenses) {
  barChart.innerHTML = "";

  if (convertedExpenses.length === 0) {
    barChart.innerHTML = `<p class="empty-message">Add some expenses to see your daily spend.</p>`;
    return;
  }

  const totalsByDate = groupByDate(convertedExpenses);
  const days = Object.keys(totalsByDate).sort(); // oldest to newest
  const highestTotal = Math.max.apply(null, Object.values(totalsByDate));

  days.forEach(function (day) {
    const amount = totalsByDate[day];
    const heightPercent = highestTotal > 0 ? (amount / highestTotal) * 100 : 0;

    const wrapper = document.createElement("div");
    wrapper.className = "bar-wrapper";

    wrapper.innerHTML = `
      <div class="bar" style="height: ${heightPercent}%" title="${formatMoney(amount)} ${currentBaseCurrency}"></div>
      <div class="bar-label">${day.slice(5)}</div>
    `;

    barChart.appendChild(wrapper);
  });
}

// ---------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------

// Always show money with exactly 2 decimal places.
function formatMoney(amount) {
  return amount.toFixed(2);
}

// Avoid accidentally rendering HTML that a user typed into a description.
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------------------------------------------------------------
// Go!
// ---------------------------------------------------------------

init();
