# Bee Specimen Catalog Website

A static GitHub Pages website for browsing and searching a historical museum bee specimen catalog from a CSV database.

## Overview

This project is a browser-based specimen catalog designed for GitHub Pages. It uses only:

- HTML
- CSS
- JavaScript
- a CSV data file

No backend or database server is required.

The website is intended for museum, natural history, biodiversity, and collection-based datasets, especially historical bee specimen records.

## Main Features

- Static website compatible with GitHub Pages
- Loads specimen records directly from a CSV file
- Clean header, sidebar, and main table layout
- Search and filter tools in the left panel
- Multi-word search support
- Case-insensitive matching
- Sortable table columns
- Row display options: 25, 50, 100, or all
- Horizontal scrolling for wide tables
- Top and bottom horizontal scrollbars for easier navigation
- Responsive layout for desktop and mobile
- Beginner-friendly file structure and code

## Current Search Structure

### Quick search
Searches fields not already covered by the dedicated filter categories.

### Number
Searches:
- `occurrenceID`

### Locality
Searches:
- `country`
- `stateProvince`
- `county`
- `municipality`
- `locality`

Additional dedicated field:
- `Province` → `stateProvince`

### Event
Grouped search searches:
- `eventDate`
- `day`
- `month`
- `year`
- `eventTime`

Additional dedicated fields:
- `Day` → `day`
- `Month` → `month`
- `Year` → `year`

### Taxonomy
Grouped search searches:
- `kingdom`
- `phylum`
- `class`
- `order`
- `family`
- `subfamily`
- `tribe`
- `genus`
- `subgenus`
- `specificEpithet`
- `scientificName`

Additional dedicated fields:
- `Family` → `family`
- `Genus` → `genus`
- `Subgenus` → `subgenus`
- `Scientific epithet` → `specificEpithet`
- `Sex` → `sex`

### Others
Dedicated fields:
- `Sampling protocol` → `samplingProtocol`
- `Host plants` → `host_plant`

## Multi-word Search Logic

All search boxes support multiple words.

Example:

`Bombus flavescens`

This means:
- search is case-insensitive
- words are split by spaces
- all words must be present for a match

For grouped filters, the words may be found across the combined text of the grouped fields.

## Main Table Columns

The table currently displays columns in this order:

1. `occurrenceID`
2. `recordedBy`
3. `scientificName`
4. `sex`
5. `identifiedBy`
6. `samplingProtocol`
7. `host_plant`
8. `country`
9. `stateProvince`
10. `county`
11. `municipality`
12. `locality`
13. `eventDate`
14. `day`
15. `month`
16. `year`
17. `eventTime`
18. `kingdom`
19. `phylum`
20. `class`
21. `order`
22. `family`
23. `subfamily`
24. `tribe`
25. `genus`
26. `subgenus`
27. `specificEpithet`

## Project Structure

```text
.
├── index.html
├── style.css
├── script.js
├── README.md
├── assets/
│   └── logo.png
└── data/
    └── specimens.csv
