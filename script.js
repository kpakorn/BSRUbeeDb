const CSV_FILE_PATH = "data/specimens.csv";

const DISPLAY_COLUMNS = [
  "occurrenceID",
  "country",
  "stateProvince",
  "county",
  "municipality",
  "locality",
  "eventDate",
  "day",
  "month",
  "year",
  "eventTime",
  "kingdom",
  "phylum",
  "order",
  "family",
  "subfamily",
  "tribe",
  "genus",
  "subgenus",
  "specificEpithet",
  "scientificName"
];

const FILTER_GROUPS = {
  number: ["occurrenceID"],
  locality: ["country", "stateProvince", "county", "municipality", "locality"],
  event: ["eventDate", "day", "month", "year", "eventTime"],
  taxonomy: [
    "kingdom",
    "phylum",
    "order",
    "family",
    "subfamily",
    "tribe",
    "genus",
    "subgenus",
    "specificEpithet",
    "scientificName"
  ]
};

let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let rowsPerPage = 50;
let currentSortColumn = null;
let currentSortDirection = "asc";

const globalSearchInput = document.getElementById("globalSearch");
const numberFilterInput = document.getElementById("numberFilter");
const localityFilterInput = document.getElementById("localityFilter");
const eventFilterInput = document.getElementById("eventFilter");
const taxonomyFilterInput = document.getElementById("taxonomyFilter");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const rowsPerPageSelect = document.getElementById("rowsPerPage");

const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const noResultsMessage = document.getElementById("noResultsMessage");
const tableWrapper = document.getElementById("tableWrapper");

const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const recordCount = document.getElementById("recordCount");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

function safeValue(value) {
  return value == null ? "" : String(value);
}

function normalizeText(value) {
  return safeValue(value).trim().toLowerCase();
}

function matchesGroup(record, searchText, columns) {
  const query = normalizeText(searchText);
  if (!query) return true;

  return columns.some((column) => {
    const value = normalizeText(record[column]);
    return value.includes(query);
  });
}

function matchesGlobal(record, searchText) {
  const query = normalizeText(searchText);
  if (!query) return true;

  return DISPLAY_COLUMNS.some((column) => {
    const value = normalizeText(record[column]);
    return value.includes(query);
  });
}

function escapeHTML(str) {
  return safeValue(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      row.push(current);
      current = "";

      if (row.some(cell => cell.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some(cell => cell.trim() !== "")) {
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(header => header.trim());

  return rows.slice(1).map(values => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] !== undefined ? values[index].trim() : "";
    });
    return record;
  });
}

async function loadCSVData() {
  try {
    loadingMessage.classList.remove("hidden");
    errorMessage.classList.add("hidden");
    noResultsMessage.classList.add("hidden");
    tableWrapper.classList.add("hidden");

    const response = await fetch(CSV_FILE_PATH);

    if (!response.ok) {
      throw new Error(`Could not load CSV file. HTTP status: ${response.status}`);
    }

    const csvText = await response.text();
    allRecords = parseCSV(csvText);

    if (allRecords.length === 0) {
      throw new Error("CSV loaded, but no records were found.");
    }

    const firstRecord = allRecords[0];
    const missingColumns = DISPLAY_COLUMNS.filter(col => !(col in firstRecord));

    if (missingColumns.length > 0) {
      throw new Error(
        "The CSV is missing these required headers: " + missingColumns.join(", ")
      );
    }

    filteredRecords = [...allRecords];

    buildTableHeader();
    applyFiltersAndRender();

    loadingMessage.classList.add("hidden");
    tableWrapper.classList.remove("hidden");

    console.log("CSV loaded successfully.");
    console.log("Number of records:", allRecords.length);
    console.log("Sample record:", allRecords[0]);

  } catch (error) {
    console.error(error);
    loadingMessage.classList.add("hidden");
    errorMessage.textContent = error.message;
    errorMessage.classList.remove("hidden");
  }
}

function buildTableHeader() {
  const headerRow = document.createElement("tr");

  DISPLAY_COLUMNS.forEach(column => {
    const th = document.createElement("th");
    th.textContent = column;

    th.addEventListener("click", () => {
      handleSort(column);
    });

    headerRow.appendChild(th);
  });

  tableHead.innerHTML = "";
  tableHead.appendChild(headerRow);
}

function handleSort(column) {
  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
  } else {
    currentSortColumn = column;
    currentSortDirection = "asc";
  }

  applyFiltersAndRender();
}

function sortRecords(records) {
  if (!currentSortColumn) return records;

  return [...records].sort((a, b) => {
    const valueA = normalizeText(a[currentSortColumn]);
    const valueB = normalizeText(b[currentSortColumn]);

    const numA = Number(valueA);
    const numB = Number(valueB);
    const bothNumeric = !isNaN(numA) && !isNaN(numB) && valueA !== "" && valueB !== "";

    let comparison = 0;

    if (bothNumeric) {
      comparison = numA - numB;
    } else {
      comparison = valueA.localeCompare(valueB);
    }

    return currentSortDirection === "asc" ? comparison : -comparison;
  });
}

function applyFilters() {
  const globalSearch = globalSearchInput.value;
  const numberFilter = numberFilterInput.value;
  const localityFilter = localityFilterInput.value;
  const eventFilter = eventFilterInput.value;
  const taxonomyFilter = taxonomyFilterInput.value;

  filteredRecords = allRecords.filter(record => {
    return (
      matchesGlobal(record, globalSearch) &&
      matchesGroup(record, numberFilter, FILTER_GROUPS.number) &&
      matchesGroup(record, localityFilter, FILTER_GROUPS.locality) &&
      matchesGroup(record, eventFilter, FILTER_GROUPS.event) &&
      matchesGroup(record, taxonomyFilter, FILTER_GROUPS.taxonomy)
    );
  });

  filteredRecords = sortRecords(filteredRecords);
}

function renderTable() {
  tableBody.innerHTML = "";

  if (filteredRecords.length === 0) {
    tableWrapper.classList.add("hidden");
    noResultsMessage.classList.remove("hidden");
    updateSummary();
    updatePaginationControls();
    return;
  }

  noResultsMessage.classList.add("hidden");
  tableWrapper.classList.remove("hidden");

  let visibleRecords = filteredRecords;

  if (rowsPerPage !== "all") {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    visibleRecords = filteredRecords.slice(startIndex, endIndex);
  }

  visibleRecords.forEach(record => {
    const tr = document.createElement("tr");

    DISPLAY_COLUMNS.forEach(column => {
      const td = document.createElement("td");
      td.innerHTML = escapeHTML(record[column]);
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  updateSummary();
  updatePaginationControls();
}

function updateSummary() {
  const total = allRecords.length;
  const filtered = filteredRecords.length;

  if (rowsPerPage === "all") {
    recordCount.textContent = `Showing all ${filtered} filtered records out of ${total} total records`;
  } else {
    const start = filtered === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, filtered);
    recordCount.textContent = `Showing ${start}-${end} of ${filtered} filtered records out of ${total} total records`;
  }
}

function updatePaginationControls() {
  if (rowsPerPage === "all") {
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    pageInfo.textContent = "Page 1 of 1";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));

  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function applyFiltersAndRender() {
  applyFilters();

  const totalPages =
    rowsPerPage === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  renderTable();
}

function resetFilters() {
  globalSearchInput.value = "";
  numberFilterInput.value = "";
  localityFilterInput.value = "";
  eventFilterInput.value = "";
  taxonomyFilterInput.value = "";

  currentPage = 1;
  currentSortColumn = null;
  currentSortDirection = "asc";

  applyFiltersAndRender();
}

[
  globalSearchInput,
  numberFilterInput,
  localityFilterInput,
  eventFilterInput,
  taxonomyFilterInput
].forEach(input => {
  input.addEventListener("input", () => {
    currentPage = 1;
    applyFiltersAndRender();
  });
});

rowsPerPageSelect.addEventListener("change", () => {
  rowsPerPage = rowsPerPageSelect.value === "all"
    ? "all"
    : Number(rowsPerPageSelect.value);

  currentPage = 1;
  applyFiltersAndRender();
});

resetFiltersBtn.addEventListener("click", resetFilters);

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});

nextPageBtn.addEventListener("click", () => {
  if (rowsPerPage !== "all") {
    const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  }
});

loadCSVData();
