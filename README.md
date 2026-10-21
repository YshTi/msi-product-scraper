# MSI Product Page Scraper

A lightweight web scraper built with **Node.js, JavaScript, and Playwright** to extract structured product information from an MSI product detail page.

The scraper runs in **Firefox headless mode**, collects product data from the live website, and saves the results to `output/product.json`.

## Tech Stack

- **Node.js** — JavaScript runtime
- **JavaScript** — Data extraction and processing
- **Playwright** — Browser automation
- **Firefox** — Headless browser engine

## Features

- Extracts product ID, title, brand, and description
- Retrieves product price and availability
- Extracts category hierarchy and breadcrumb URLs
- Collects the main product image and additional gallery images
- Removes duplicate images and sorts gallery URLs
- Extracts technical specifications as key-value pairs
- Retrieves star rating and review count when available
- Extracts manufacturer part number (MPN)
- Normalizes prices, text, and availability
- Handles missing values using `null` or empty arrays
- Saves structured product information to JSON
- Includes basic error handling

## Project Structure

```text
msi-product-scraper/
├── src/
│   └── scrape.js
├── output/
│   └── product.json
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Installation

**Prerequisites:** Node.js and npm.

1. Clone the repository:

   ```bash
   git clone https://github.com/YshTi/msi-product-scraper.git
   cd msi-product-scraper
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Install Firefox for Playwright:

   ```bash
   npx playwright install firefox
   ```

## Usage

Run the scraper:

```bash
npm run scrape
```

The scraper launches Firefox in headless mode and creates or overwrites:

```text
output/product.json
```

## Target Product

**MSI MAG Z890 TOMAHAWK WIFI**

[View product on MSI Store](https://us-store.msi.com/Motherboards/Intel-Platform-Motherboard/INTEL-Z890/MAG-Z890-TOMAHAWK-WIFI)

## Output

The JSON output contains the following fields:

| Field                   | Description                            |
| ----------------------- | -------------------------------------- |
| `url`                   | Final product URL                      |
| `item_id`               | Store product identifier               |
| `title`                 | Product title                          |
| `brand`                 | Manufacturer brand                     |
| `product_category`      | Product category path                  |
| `category_tree`         | Breadcrumb names and URLs              |
| `description`           | Product description                    |
| `price`                 | Regular price as a number              |
| `sale_price`            | Discounted price, if available         |
| `availability`          | Normalized stock status                |
| `image_url`             | Main product image                     |
| `additional_image_urls` | Additional product images              |
| `specs`                 | Technical specifications               |
| `star_rating`           | Average customer rating                |
| `review_count`          | Number of reviews                      |
| `gtin`                  | Global Trade Item Number, if available |
| `mpn`                   | Manufacturer part number               |
| `scraped_at`            | ISO 8601 extraction timestamp          |

A sample of the extracted data is available in [`output/product.json`](output/product.json).

## Implementation Details

The scraper uses Playwright locators and CSS selectors to extract information directly from the product page.

- **Normalization:** Prices are converted to numbers, text is cleaned, and availability is standardized.
- **Image handling:** Duplicate gallery images are removed and URLs are sorted.
- **Specifications:** Technical specifications are extracted from HTML tables as name-value pairs.
- **Dynamic content:** The scraper waits for rating information when available.
- **Error handling:** Failed requests are reported, and the browser is closed in a `finally` block.

Product values are extracted at runtime rather than hardcoded.

## Notes

- The scraper targets a single MSI product page.
- Firefox is used in headless mode. During testing, Chromium headless requests returned HTTP 403.
- Optional fields are represented as `null` when unavailable.
- Prices, availability, and reviews may change between runs.

## Author

Tetiana Yushkevych
