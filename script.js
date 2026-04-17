/* =========================================================
   Bee Specimen Catalog Viewer
   Static GitHub Pages version
   Updated advanced filtering with multi-word support
========================================================= */

const CSV_FILE_PATH = "data/specimens.csv";

/* =========================================================
   Table columns shown on the main page
========================================================= */
const DISPLAY_COLUMNS = [
  "occurrenceID",
  "recordedBy",
  "identifiedBy",
  "samplingProtocol",
  "host_plant",
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
  "class",
  "order",
  "family",
  "subfamily",
  "tribe",
  "genus",
  "subgenus",
  "specificEpithet",
  "sex",
  "scientificName"
];

/* =========================================================
   Grouped filters
========================================================= */
const FILTER_GROUPS = {
  number: ["occurrenceID"],

  locality: [
    "country",
    "stateProvince",
    "county",
    "municipality",
    "locality"
  ],

  province: ["stateProvince"],

  event: ["eventDate", "day", "month", "year", "eventTime"],
  day: ["day"],
  month: ["month"],
  year: ["year"],

  taxonomy: [
    "kingdom",
    "phylum",
    "class",
    "order",
    "family",
    "subfamily",
    "tribe",
    "genus",
    "subgenus",
    "specificEpithet",
    "scientificName",
    "sex"
  ],
  family: ["family"],
  genus: ["genus"],
  subgenus: ["subgenus"],
  specificEpithet: ["specificEpithet"],
  sex: ["sex"],

  samplingProtocol: ["samplingProtocol"],
  hostPlant: ["host_plant"]
};

/* =========================================================
   Full known database fields
========================================================= */
const ALL_DATABASE_FIELDS = [
  "occurrenceID",
  "dataset",
  "AnthophilaTag",
  "complete_digitizeTag",
  "complete_dataTag",
  "recordedBy",
  "Status",
  "individualCount",
  "scientificName",
  "kingdom",
  "phylum",
  "class",
  "order",
  "family",
  "subfamily",
  "tribe",
  "genus",
  "subgenus",
  "specificEpithet",
  "scientificnameAuthorship",
  "taxonrank",
  "identificationQualifier",
  "typeStatus",
  "identifiedBy",
  "dateIdentified",
  "lifestage",
  "sex",
  "country",
  "countryCode",
  "stateProvince",
  "county",
  "municipality",
  "locality",
  "verbatimLatitude",
  "decimalLatitude",
  "verbatimLongitude",
  "decimalLongitude",
  "geodeticDatum",
  "georeferenceVerificationStatus",
  "minimumElevationInMeters",
  "verbatimEventDate",
  "eventDate",
  "eventTime",
  "day",
  "month",
  "year",
  "eventRemarks",
  "occurenceRemarks",
  "organismRemarks",
  "host_plant",
  "samplingProtocol",
  "disposition",
  "verbatimLocality",
  "verbatimGeoreference",
  "GBIFTIGER-ID"
];

/* =========================================================
   Quick search fields
   = fields NOT already covered by dedicated filters
========================================================= */
const DEDICATED_FILTER_FIELDS = Array.from(
  new Set([
    ...FILTER_GROUPS.number,
    ...FILTER_GROUPS.locality,
    ...FILTER_GROUPS.province,
    ...FILTER_GROUPS.event,
    ...FILTER_GROUPS.day,
    ...FILTER_GROUPS.month,
    ...FILTER_GROUPS.year,
    ...FILTER_GROUPS.taxonomy,
    ...FILTER_GROUPS.family,
    ...FILTER_GROUPS.genus,
    ...FILTER_GROUPS.subgenus,
    ...FILTER_GROUPS.specificEpithet,
    ...FILTER_GROUPS.sex,
    ...FILTER_GROUPS.samplingProtocol,
    ...FILTER_GROUPS.hostPlant
  ])
);

const QUICK_SEARCH_FIELDS = ALL_DATABASE_FIELDS.filter(
  (field, index, arr) =>
    !DEDICATED_FILTER_FIELDS.includes(field) && arr.indexOf(field) === index
);

/* =========================================================
   State variables
========================================================= */
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let rowsPerPage = 50;
let currentSortColumn = null;
let currentSortDirection = "asc";
let topScrollbarSynced = false;

/* =========================================================
   DOM elements
========================================================= */
const globalSearchInput = document.getElementById("globalSearch");
const numberFilterInput = document.getElementById("numberFilter");

const localityFilterInput = document.getElementById("localityFilter");
const provinceFilterInput = document.getElementById("provinceFilter");

const eventFilterInput = document.getElementById("eventFilter");
const dayFilterInput = document.getElementById("dayFilter");
const monthFilterInput = document.getElementById("monthFilter");
const yearFilterInput = document.getElementById("yearFilter");

const taxonomyFilterInput = document.getElementById("taxonomyFilter");
const familyFilterInput = document.getElementById("familyFilter");
const genusFilterInput = document.getElementById("genusFilter");
const subgenusFilterInput = document.getElementById("subgenusFilter");
const specificEpithetFilterInput = document.getElementById("specificEpithetFilter");
const sexFilterInput = document.getElementById("sexFilter");

const samplingProtocolFilterInput = document.getElementById("samplingProtocolFilter");
const hostPlantFilterInput = document.getElementById("hostPlantFilter");

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

const tableScrollTop = document.getElementById("tableScrollTop");
const tableScrollTopInner = document.getElementById("tableScrollTopInner");

/* =========================================================
   Utility functions
========================================================= */
function safeValue(value) {
  return value == null ? "" : String(value);
}

function normalizeText(value) {
  return safeValue(value).trim().toLowerCase();
}

function escapeHTML(str) {
  return safeValue(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanHeaderName(header) {
  return safeValue(header).replace(/^\uFEFF/, "").trim();
}

function splitQueryIntoTerms(searchText) {
  return normalizeText(searchText)
    .split(/\s+/)
    .filter(term => term.length > 0);
}

/* ---------------------------------------------------------
   Multi-word matching:
   Every word must be found.
--------------------------------------------------------- */
function matchesField(record, searchText, fieldName) {
  const terms = splitQueryIntoTerms(searchText);
  if (terms.length === 0) return true;

  const fieldText = normalizeText(record[fieldName]);
  return terms.every(term => fieldText.includes(term));
}

/* ---------------------------------------------------------
   Grouped multi-word matching:
   Terms can be distributed across the combined group fields.
--------------------------------------------------------- */
function matchesGroup(record, searchText, columns) {
  const terms = splitQueryIntoTerms(searchText);
  if (terms.length === 0) return true;

  const combinedText = columns
    .map(column => normalizeText(record[column]))
    .join(" ");

  return terms.every(term => combinedText.includes(term));
}

function matchesQuickSearch(record, searchText) {
  const terms = splitQueryIntoTerms(searchText);
  if (terms.length === 0) return true;

  const combinedText = QUICK_SEARCH_FIELDS
    .map(column => normalizeText(record[column]))
    .join(" ");

  return terms.every(term => combinedText.includes(term));
}

/* =========================================================
   CSV parser
========================================================= */
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

  const headers = rows[0].map(header => cleanHeaderName(header));

  return rows.slice(1).map(values => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] !== undefined ? values[index].trim() : "";
    });
    return record;
  });
}

/* =========================================================
   Data loading
========================================================= */
async function loadCSVData() {
  try {
    loadingMessage.classList.remove("hidden");
    errorMessage.classList.add("hidden");
    noResultsMessage.classList.add("hidden");
    tableWrapper.classList.add("hidden");

    if (tableScrollTop) {
      tableScrollTop.classList.add("hidden");
    }

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

    if (tableScrollTop) {
      tableScrollTop.classList.remove("hidden");
      syncHorizontalScrollbars();
      updateTopScrollbarWidth();
    }

    console.log("CSV loaded successfully.");
    console.log("Number of records:", allRecords.length);
    console.log("Sample record:", allRecords[0]);
    console.log("Quick search fields:", QUICK_SEARCH_FIELDS);

  } catch (error) {
    console.error(error);
    loadingMessage.classList.add("hidden");
    errorMessage.textContent = error.message;
    errorMessage.classList.remove("hidden");
  }
}

/* =========================================================
   Table header
========================================================= */
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

/* =========================================================
   Sorting
========================================================= */
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

/* =========================================================
   Filtering logic
========================================================= */
function applyFilters() {
  filteredRecords = allRecords.filter(record => {
    return (
      matchesQuickSearch(record, globalSearchInput.value) &&
      matchesGroup(record, numberFilterInput.value, FILTER_GROUPS.number) &&

      matchesGroup(record, localityFilterInput.value, FILTER_GROUPS.locality) &&
      matchesField(record, provinceFilterInput.value, "stateProvince") &&

      matchesGroup(record, eventFilterInput.value, FILTER_GROUPS.event) &&
      matchesField(record, dayFilterInput.value, "day") &&
      matchesField(record, monthFilterInput.value, "month") &&
      matchesField(record, yearFilterInput.value, "year") &&

      matchesGroup(record, taxonomyFilterInput.value, FILTER_GROUPS.taxonomy) &&
      matchesField(record, familyFilterInput.value, "family") &&
      matchesField(record, genusFilterInput.value, "genus") &&
      matchesField(record, subgenusFilterInput.value, "subgenus") &&
      matchesField(record, specificEpithetFilterInput.value, "specificEpithet") &&
      matchesField(record, sexFilterInput.value, "sex") &&

      matchesField(record, samplingProtocolFilterInput.value, "samplingProtocol") &&
      matchesField(record, hostPlantFilterInput.value, "host_plant")
    );
  });

  filteredRecords = sortRecords(filteredRecords);
}

/* =========================================================
   Rendering
========================================================= */
function renderTable() {
  tableBody.innerHTML = "";

  if (filteredRecords.length === 0) {
    tableWrapper.classList.add("hidden");
    noResultsMessage.classList.remove("hidden");

    if (tableScrollTop) {
      tableScrollTop.classList.add("hidden");
    }

    updateSummary();
    updatePaginationControls();
    return;
  }

  noResultsMessage.classList.add("hidden");
  tableWrapper.classList.remove("hidden");

  if (tableScrollTop) {
    tableScrollTop.classList.remove("hidden");
  }

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

  if (tableScrollTop) {
    updateTopScrollbarWidth();
  }
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

/* =========================================================
   Top scrollbar sync
========================================================= */
function updateTopScrollbarWidth() {
  if (!tableWrapper || !tableScrollTopInner) return;
  tableScrollTopInner.style.width = tableWrapper.scrollWidth + "px";
}

function syncHorizontalScrollbars() {
  if (!tableWrapper || !tableScrollTop || !tableScrollTopInner || topScrollbarSynced) {
    return;
  }

  let syncingFromTop = false;
  let syncingFromBottom = false;

  tableScrollTop.addEventListener("scroll", () => {
    if (syncingFromBottom) return;
    syncingFromTop = true;
    tableWrapper.scrollLeft = tableScrollTop.scrollLeft;
    syncingFromTop = false;
  });

  tableWrapper.addEventListener("scroll", () => {
    if (syncingFromTop) return;
    syncingFromBottom = true;
    tableScrollTop.scrollLeft = tableWrapper.scrollLeft;
    syncingFromBottom = false;
  });

  window.addEventListener("resize", updateTopScrollbarWidth);
  topScrollbarSynced = true;
}

/* =========================================================
   Combined update
========================================================= */
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

/* =========================================================
   Reset filters
========================================================= */
function resetFilters() {
  globalSearchInput.value = "";
  numberFilterInput.value = "";

  localityFilterInput.value = "";
  provinceFilterInput.value = "";

  eventFilterInput.value = "";
  dayFilterInput.value = "";
  monthFilterInput.value = "";
  yearFilterInput.value = "";

  taxonomyFilterInput.value = "";
  familyFilterInput.value = "";
  genusFilterInput.value = "";
  subgenusFilterInput.value = "";
  specificEpithetFilterInput.value = "";
  sexFilterInput.value = "";

  samplingProtocolFilterInput.value = "";
  hostPlantFilterInput.value = "";

  currentPage = 1;
  currentSortColumn = null;
  currentSortDirection = "asc";

  applyFiltersAndRender();
}

/* =========================================================
   Event listeners
========================================================= */
[
  globalSearchInput,
  numberFilterInput,

  localityFilterInput,
  provinceFilterInput,

  eventFilterInput,
  dayFilterInput,
  monthFilterInput,
  yearFilterInput,

  taxonomyFilterInput,
  familyFilterInput,
  genusFilterInput,
  subgenusFilterInput,
  specificEpithetFilterInput,
  sexFilterInput,

  samplingProtocolFilterInput,
  hostPlantFilterInput
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

/* =========================================================
   Initialize
========================================================= */
loadCSVData();
