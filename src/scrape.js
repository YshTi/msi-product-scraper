const { firefox } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");

const PRODUCT_URL =
  "https://us-store.msi.com/Motherboards/Intel-Platform-Motherboard/INTEL-Z890/MAG-Z890-TOMAHAWK-WIFI";


function normalizeText(value) {
  if (typeof value !== "string") return null;

  return value.replace(/\s+/g, " ").trim() || null;
}

function normalizePrice(value) {
  if (value == null) return null;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) return null;

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function normalizeAvailability(value) {
  if (!value) return null;

  const text = value.toLowerCase();

  if (text.includes("out of stock") || text.includes("outofstock")) {
    return "out_of_stock";
  }

  if (text.includes("pre-order") || text.includes("preorder")) {
    return "pre_order";
  }

  if (text.includes("in stock") || text.includes("instock")) {
    return "in_stock";
  }

  return null;
}

async function getText(page, selector) {
  const locator = page.locator(selector).first();

  if (await locator.count() === 0) return null;

  return normalizeText(await locator.textContent());
}


async function extractBasicInfo(page) {
  const title = await getText(page, "h2.crop-text-2.title");

  const description = await getText(
    page,
    "h2.crop-text-2.title + div p"
  );

  const itemId = await page
    .locator('input[name="product_id"]')
    .getAttribute("value")
    .catch(() => null);

  const priceText = await getText(page, "#prices-new");

  const availabilityText = await getText(
    page,
    "#prices-new + br + span"
  );


  let ratingText = null;

  try {
    await page.waitForFunction(
      () => {
        const element = document.querySelector(
          "#average-rating-info"
        );

        return /\d+(?:\.\d+)?\s*\(\d+\)/.test(
          element?.textContent || ""
        );
      },
      null,
      { timeout: 20000 }
    );

    ratingText = await getText(
      page,
      "#average-rating-info"
    );
  } catch {
    console.log("Rating data was not available.");
  }

  console.log("Raw rating:", ratingText);

  const ratingMatch = ratingText?.match(
    /(\d+(?:\.\d+)?)\s*\((\d+)\)/
  );

  return {
    item_id: itemId,
    title,
    description,
    price: normalizePrice(priceText),
    availability: normalizeAvailability(availabilityText),
    star_rating: ratingMatch
      ? Number(ratingMatch[1])
      : null,
    review_count: ratingMatch
      ? Number(ratingMatch[2])
      : null,
  };
}


async function getProductImages(page) {
  const mainImage = await page
    .locator("#imagePopup")
    .getAttribute("src")
    .catch(() => null);

  const galleryImages = await page
    .locator("#carouselImages .product-detail-thumb-bto")
    .evaluateAll(images =>
      images
        .map(img => img.getAttribute("popup_img"))
        .filter(Boolean)
    );

  function toAbsoluteUrl(url) {
    if (!url) return null;

    try {
      return new URL(url, page.url()).href;
    } catch {
      return null;
    }
  }

  const imageUrl = toAbsoluteUrl(mainImage);

  const additionalImageUrls = [
    ...new Set(
        galleryImages
        .map(toAbsoluteUrl)
        .filter(Boolean)
    ),
    ]
    .filter(url => url !== imageUrl)
    .sort((a, b) => {
        const getNumber = url => {
        const match = url.match(/-(\d+)-\d+x\d+\./);
        return match ? Number(match[1]) : Infinity;
        };

        return getNumber(a) - getNumber(b);
    });

  return {
    image_url: imageUrl,
    additional_image_urls: additionalImageUrls,
  };
}


async function getCategories(page) {
  const categoryTree = await page
    .locator("ol.breadcrumb li.breadcrumb-item")
    .evaluateAll(items =>
      items
        .filter(item =>
          !item.classList.contains("active") &&
          item.textContent.trim().toLowerCase() !== "home"
        )
        .map(item => ({
          name: item.textContent.trim(),
          url: item.querySelector("a")?.href || null,
        }))
    );

  return {
    product_category: categoryTree.length
      ? categoryTree.map(item => item.name).join(" > ")
      : null,
    category_tree: categoryTree,
  };
}



async function getSpecs(page) {
  return page
    .locator(
      ".row.justify-content-center.no-gutters.my-margin table tr"
    )
    .evaluateAll(rows =>
      rows
        .map(row => {
          const nameElement = row.querySelector("th");
          const valueElement = row.querySelector("td");

          if (!nameElement || !valueElement) {
            return null;
          }

          const name = nameElement.textContent
            .replace(/\s+/g, " ")
            .trim();

          const value = valueElement.textContent
            .replace(/\s+/g, " ")
            .trim();

          if (!name) return null;

          return {
            name,
            value: value || null,
          };
        })
        .filter(Boolean)
    );
}



async function getBrand(page) {
  const brandText = await page
    .locator('meta[property="product:brand"], meta[name="brand"]')
    .first()
    .getAttribute("content")
    .catch(() => null);

  if (brandText) return normalizeText(brandText);

  const pageTitle = await page.title();

  return /\bMSI\b/i.test(pageTitle) ? "MSI" : null;
}


async function scrapeProduct() {
  const browser = await firefox.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });

    console.log("Opening MSI product page...");

    const response = await page.goto(PRODUCT_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log("HTTP status:", response?.status());
    console.log("Current URL:", page.url());
    console.log("Browser page title:", await page.title());

    if (!response || !response.ok()) {
      throw new Error(
        `Page request failed: ${response?.status() ?? "no response"}`
      );
    }

    await page.locator("h2.crop-text-2.title").waitFor({
      state: "attached",
      timeout: 30000,
    });

    const basicInfo = await extractBasicInfo(page);
    const images = await getProductImages(page);
    const categories = await getCategories(page);
    const specs = await getSpecs(page);
    const mpn =
        specs.find(spec =>
            spec.name.toLowerCase() === "manufacturer number"
        )?.value ?? null;
    const brand = await getBrand(page);

    const productData = {
      url: page.url(),
      item_id: basicInfo.item_id,
      title: basicInfo.title,
      brand,
      product_category: categories.product_category,
      category_tree: categories.category_tree,
      description: basicInfo.description,
      price: basicInfo.price,
      sale_price: null,
      availability: basicInfo.availability,
      image_url: images.image_url,
      additional_image_urls: images.additional_image_urls,
      specs,
      star_rating: basicInfo.star_rating,
      review_count: basicInfo.review_count,
      gtin: null,
      mpn,
      scraped_at: new Date().toISOString(),
    };

    const outputPath = path.join(
      __dirname,
      "../output/product.json"
    );

    await fs.mkdir(path.dirname(outputPath), {
      recursive: true,
    });

    await fs.writeFile(
      outputPath,
      JSON.stringify(productData, null, 2),
      "utf-8"
    );

    console.log("\nPRODUCT DATA:");
    console.log(JSON.stringify(productData, null, 2));

    console.log("\nProduct saved to output/product.json");

  } catch (error) {
    console.error("Scraping failed:", error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

scrapeProduct();
