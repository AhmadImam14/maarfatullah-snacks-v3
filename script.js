/**
 * ============================================================================
 * MAARIFATULLAH SNACKS — APPLICATION LAYER
 * ============================================================================
 *
 * Separation of concerns (see README → "Content architecture"):
 *
 *   content.js   CONTENT      what the business says  -> future Sanity source
 *   script.js    PRESENTATION rendering, layout, DOM
 *                + LOGIC      cart maths, WhatsApp checkout, UI state
 *   style.css    PRESENTATION styling only
 *   index.html   STRUCTURE    empty mount points, no hard-coded content
 *
 * This file contains NO business content. Everything visible is read from
 * `window.SITE_CONTENT` and normalised below, so swapping the data source for
 * the Sanity API requires zero changes here.
 *
 * "use strict" + IIFE-free top level is intentional: this stays a plain
 * browser script with no build step.
 */

"use strict";

/* ==========================================================================
 * 1. APPLICATION CONFIGURATION (not content — behaviour, not copy)
 * ======================================================================== */
const APP = {
  storage: {
    cart: "ms_cart",
    theme: "ms_theme",
  },
  /** Safety clamp so a stray value can never produce a 1e9-item order. */
  maxQuantityPerItem: 99,
  /** Used only if the content source does not provide a currency/locale. */
  fallbackCurrency: { symbol: "₦", locale: "en-NG" },
  /** Used only if the content source does not provide a WhatsApp number. */
  fallbackWhatsappNumber: "",
};

/* ==========================================================================
 * 2. SMALL VALUE HELPERS
 *    These make the renderer tolerant of incomplete CMS data: a missing field
 *    renders nothing instead of "undefined" leaking into the page.
 * ======================================================================== */

/** Coerce any value to a trimmed string, or the fallback when empty. */
function readText(value, fallbackText) {
  if (value === null || value === undefined) return fallbackText || "";
  const str = String(value).trim();
  return str || fallbackText || "";
}

/** Coerce to a finite number, or the fallback. */
function readNumber(value, fallbackNumber) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallbackNumber;
}

/** Always work with an array, whatever the CMS returns. */
function readList(value) {
  return Array.isArray(value) ? value : [];
}

/** Coerce a CMS value to a boolean, defaulting to `fallbackBoolean`. */
function readBoolean(value, fallbackBoolean) {
  if (value === null || value === undefined) return Boolean(fallbackBoolean);
  return value !== false;
}

/**
 * Resolve an image to a URL string.
 *
 * Deliberately accepts every shape a CMS might produce, so switching to Sanity
 * image assets cannot break the UI:
 *
 *   "images/cookie.jpeg"                      local path (used today)
 *   { url: "https://cdn.sanity.io/.../x.jpg" }  projected asset URL
 *   { src: "..." }                              generic object
 *   { asset: { url: "..." } }                   raw Sanity image document
 *   { asset: "https://..." }                    pre-resolved asset URL
 *   null / undefined / ""                       -> "" (renderer omits <img>)
 */
function resolveImage(source) {
  if (!source) return "";

  if (typeof source === "string") return source.trim();

  if (typeof source === "object") {
    if (typeof source.asset === "string") return source.asset.trim();
    if (source.asset && typeof source.asset.url === "string") return source.asset.url.trim();
    if (typeof source.url === "string") return source.url.trim();
    if (typeof source.src === "string") return source.src.trim();
  }

  return "";
}

/**
 * Resolve alt text for an image.
 *
 * Alt text is content, so it comes from the content source when present and
 * only falls back to a derived value. A CMS editor can therefore always
 * improve accessibility without a code change.
 */
function resolveImageAlt(source, fallbackAlt) {
  if (source && typeof source === "object") {
    const alt = readText(source.alt);
    if (alt) return alt;
  }
  return readText(fallbackAlt);
}

/** URL-safe slug, used only when the content source omits one. */
function slugify(value) {
  return readText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalise a link / CTA from the content source into { label, href, external }.
 *
 * Accepted shapes:
 *   "#products"                                  plain href
 *   { label: "Menu", href: "#products" }         labelled link
 *   { label: "Contact", channel: "whatsapp" }    link to the business WhatsApp
 *   null / undefined / missing href              -> null (renderer skips it)
 *
 * The `channel: "whatsapp"` convention keeps the phone number in exactly one
 * place (business.whatsappNumber) instead of duplicating it across content.
 */
function resolveLink(source, fallbackLabel) {
  if (!source) return null;

  if (typeof source === "string") {
    const href = source.trim();
    return href
      ? { label: readText(fallbackLabel, href), href, external: /^https?:/i.test(href) }
      : null;
  }

  if (typeof source !== "object") return null;

  const label = readText(source.label, fallbackLabel);

  if (source.channel === "whatsapp") {
    const href = whatsappUrl();
    return href ? { label: readText(label, "WhatsApp"), href, external: true } : null;
  }

  const href = readText(source.href || source.url);
  if (!href) return null;

  return {
    label: readText(label, href),
    href: href,
    external: source.external === true || /^https?:/i.test(href),
  };
}

/**
 * Normalise a single product.
 *
 * The output object is the ONLY shape the rest of the app knows about. Both
 * today's hand-written content and a future Sanity document flow through here,
 * which is why the UI needs no changes when the source changes.
 */
function normalizeProduct(raw, index) {
  const source = raw && typeof raw === "object" ? raw : {};

  // Sanity slugs arrive as { _type: "slug", current: "cookie" }, not strings.
  let rawSlug = "";
  if (typeof source.slug === "string") {
    rawSlug = source.slug;
  } else if (source.slug && typeof source.slug === "object") {
    rawSlug = readText(source.slug.current);
  }

  const name = readText(source.name, "Untitled item");
  const slug = slugify(rawSlug) || slugify(name) || "item-" + (index + 1);

  // A category may arrive as a string or as a Sanity reference object.
  let category = "";
  if (typeof source.category === "string") {
    category = source.category.trim();
  } else if (source.category && typeof source.category === "object") {
    category = readText(source.category.title || source.category.name);
  }

  return {
    // Accepts either `id` or Sanity's raw `_id`, so a future loader can pass
    // documents through without a projection step.
    id: readText(source.id) || readText(source._id) || slug,
    slug: slug,
    name: name,
    description: readText(source.description),
    price: Math.max(readNumber(source.price, 0), 0),
    priceNote: readText(source.priceNote),
    image: resolveImage(source.image),
    imageAlt: resolveImageAlt(source.image, name),
    category: category || null,
    available: readBoolean(source.available, true),
    featured: source.featured === true,
    badge: readText(source.badge) || null,
  };
}


/**
 * Normalise the whole content document, filling in safe defaults so the
 * renderer never has to null-check deeply nested values.
 */
function normalizeContent(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const business = source.business && typeof source.business === "object" ? source.business : {};
  const menu = source.menu && typeof source.menu === "object" ? source.menu : {};
  const hero = source.hero && typeof source.hero === "object" ? source.hero : {};
  const about = source.about && typeof source.about === "object" ? source.about : {};
  const footer = source.footer && typeof source.footer === "object" ? source.footer : {};
  const address = business.address && typeof business.address === "object" ? business.address : {};
  const rawCurrency = business.currency && typeof business.currency === "object" ? business.currency : {};

  return {
    business: {
      name: readText(business.name, "Maarifatullah Snacks"),
      tagline: readText(business.tagline),
      whatsappNumber: readText(business.whatsappNumber, APP.fallbackWhatsappNumber),
      email: readText(business.email),
      phone: readText(business.phone),
      address: {
        locality: readText(address.locality),
        country: readText(address.country),
      },
      currency: {
        code: readText(rawCurrency.code),
        symbol: readText(rawCurrency.symbol, APP.fallbackCurrency.symbol),
        locale: readText(rawCurrency.locale, APP.fallbackCurrency.locale),
        decimals: readNumber(rawCurrency.decimals, 0),
      },
    },

    nav: readList(source.nav),

    hero: {
      eyebrow: readText(hero.eyebrow),
      headline: readText(hero.headline),
      description: readText(hero.description),
      primaryCta: hero.primaryCta || null,
      secondaryCta: hero.secondaryCta || null,
      image: hero.image || null,
      imageAlt: resolveImageAlt(hero.image, ""),
    },

    menu: {
      heading: readText(menu.heading, "Our Menu"),
      subheading: readText(menu.subheading),
      allCategoriesLabel: readText(menu.allCategoriesLabel, "All"),
      unavailableLabel: readText(menu.unavailableLabel, "Unavailable"),
      emptyMessage: readText(menu.emptyMessage, "No items to show right now."),
      products: readList(menu.products).map(normalizeProduct),
    },

    about: {
      heading: readText(about.heading),
      body: readList(about.body)
        .map((paragraph) => readText(paragraph))
        .filter(Boolean),
      image: about.image || null,
    },

    promo: source.promo && typeof source.promo === "object" ? source.promo : null,

    testimonials: readList(source.testimonials),

    footer: {
      groups: readList(footer.groups),
      note: readText(footer.note),
    },
  };
}

/* ==========================================================================
 * 3. RESOLVED CONTENT + CURRENCY FORMATTING
 *    Everything below this line reads content from `content` / `products`.
 *    Replacing window.SITE_CONTENT is the entire CMS migration.
 * ======================================================================== */
const content = normalizeContent(window.SITE_CONTENT);
const products = content.menu.products;
const currency = content.business.currency;

/**
 * Format a number as business currency, e.g. 2500 -> "₦2,500".
 *
 * The content source controls the currency, so this adapts to whatever a CMS
 * provides:
 *   - with an ISO `code` (e.g. "NGN", "USD"), Intl renders the proper local
 *     convention (symbol placement, spacing);
 *   - `decimals` comes from the content too (naira 0, dollars 2);
 *   - with only a `symbol`, it falls back to symbol + locale number.
 */
function formatPrice(amount) {
  const value = readNumber(amount, 0);
  const digits = {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  };

  if (currency.code) {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        ...digits,
      }).format(value);
    } catch (err) {
      /* Invalid code or locale — fall through to symbol formatting. */
    }
  }

  let formatted;
  try {
    formatted = value.toLocaleString(currency.locale, digits);
  } catch (err) {
    formatted = value.toFixed(currency.decimals);
  }
  return currency.symbol + formatted;
}

/** Full displayed price for a product, including any pack note ("/ 4"). */
function productPriceLabel(product) {
  const base = formatPrice(product.price);
  return product.priceNote ? base + " " + product.priceNote : base;
}

/** Build a WhatsApp URL, optionally pre-filled with an order message. */
function whatsappUrl(message) {
  const number = readText(content.business.whatsappNumber).replace(/\D/g, "");
  if (!number) return "";
  const base = "https://wa.me/" + number;
  return message ? base + "?text=" + encodeURIComponent(message) : base;
}

/** Look up a normalised product by its stable id. */
function findProductById(id) {
  return products.find((product) => product.id === id) || null;
}


/* ==========================================================================
 * 4. UI STATE
 *    Cart contents, active category filter, theme. Not content.
 * ======================================================================== */
const state = {
  cart: {},
  activeCategory: null,
};

/** Read the persisted cart, tolerating absent or corrupted storage. */
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(APP.storage.cart));
    return saved && typeof saved === "object" ? saved : {};
  } catch (err) {
    return {};
  }
}

function saveCart() {
  try {
    localStorage.setItem(APP.storage.cart, JSON.stringify(state.cart));
  } catch (err) {
    /* Storage unavailable (private mode, quota) — cart still works in memory. */
  }
}

/**
 * Bring a restored cart in line with the current content.
 *
 * This is what makes the cart safe once a CMS owns the products: if an editor
 * deletes a product, marks it unavailable, or changes its price, a customer's
 * saved cart is corrected on load instead of offering a stale item. Entries are
 * keyed by the stable product id, so renaming never orphans a cart.
 */
function reconcileCart() {
  Object.keys(state.cart).forEach((id) => {
    const product = findProductById(id);

    if (!product || !product.available) {
      delete state.cart[id];
      return;
    }

    const quantity = Math.floor(readNumber(state.cart[id].qty, 0));
    state.cart[id].qty = Math.min(Math.max(quantity, 0), APP.maxQuantityPerItem);
    state.cart[id].name = product.name;
    state.cart[id].price = product.price;
  });
}

/** Add or remove quantity for a product. Presentation-agnostic. */
function changeQty(product, change) {
  if (change > 0 && !product.available) return;

  if (!state.cart[product.id]) {
    state.cart[product.id] = { name: product.name, price: product.price, qty: 0 };
  }

  state.cart[product.id].qty = Math.min(
    Math.max(state.cart[product.id].qty + change, 0),
    APP.maxQuantityPerItem
  );

  const quantityEl = document.getElementById("qty-" + product.id);
  if (quantityEl) quantityEl.textContent = state.cart[product.id].qty;

  saveCart();
  updateCart();
}

/** Remove a product from the cart entirely (cart-panel action). */
function removeItem(productId) {
  if (!state.cart[productId]) return;

  state.cart[productId].qty = 0;

  const quantityEl = document.getElementById("qty-" + productId);
  if (quantityEl) quantityEl.textContent = "0";

  saveCart();
  updateCart();
}

/** Cart entries that currently hold stock, with totals pre-computed. */
function getActiveCartEntries() {
  return Object.keys(state.cart)
    .map((id) => {
      const item = state.cart[id];
      const product = findProductById(id);
      return {
        id: id,
        product: product,
        name: product ? product.name : item.name,
        quantity: item.qty,
        price: item.price,
        lineTotal: item.qty * item.price,
      };
    })
    .filter((entry) => entry.quantity > 0);
}


/* ==========================================================================
 * 5. PRESENTATION HELPERS
 *    Tiny DOM utilities so render functions stay declarative.
 * ======================================================================== */

/** Set an element's text; returns the element so callers can chain. */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value === null || value === undefined ? "" : String(value);
  return el;
}

/** Show/hide an element, collapsing it from layout when hidden. */
function setHidden(id, isHidden) {
  const el = document.getElementById(id);
  if (el) el.hidden = Boolean(isHidden);
  return el;
}

/** Create an <a> from a resolved link object. */
function createLink(link, className) {
  const anchor = document.createElement("a");
  anchor.href = link.href;
  anchor.textContent = link.label;
  if (className) anchor.className = className;
  if (link.external) {
    anchor.target = "_blank";
    anchor.rel = "noopener";
  }
  return anchor;
}

/* ==========================================================================
 * 6. RENDER — STATIC CHROME (brand, nav, hero, promo, footer)
 *    All copy comes from `content`, so an editor can change any of it without
 *    touching this file.
 * ======================================================================== */

function renderBrand() {
  setText("brand", content.business.name);
}

function renderNav() {
  const navList = document.getElementById("nav-links");
  navList.innerHTML = "";

  content.nav.forEach((item) => {
    const link = resolveLink(item);
    if (!link) return;

    const listItem = document.createElement("li");
    const anchor = createLink(link);
    anchor.addEventListener("click", closeMobileMenu);
    listItem.appendChild(anchor);
    navList.appendChild(listItem);
  });
}

/**
 * Hero renderer.
 *
 * The layout is fixed; the *copy* is variable. Every optional field
 * (eyebrow, description, secondary CTA, image) is hidden when absent, so the
 * hero cannot break when an editor changes the text length or adds a field.
 */
function renderHero() {
  const hero = content.hero;

  setText("hero-headline", hero.headline);

  setText("hero-eyebrow", hero.eyebrow);
  setHidden("hero-eyebrow", !hero.eyebrow);

  setText("hero-description", hero.description);
  setHidden("hero-description", !hero.description);

  const heroImage = document.getElementById("hero-image");
  if (hero.image) {
    heroImage.src = resolveImage(hero.image);
    heroImage.alt = hero.imageAlt || "";
    heroImage.hidden = !heroImage.src;
  } else {
    heroImage.hidden = true;
  }

  // Primary + secondary CTA, in order. Missing ones are simply not rendered.
  const actions = document.getElementById("hero-actions");
  actions.innerHTML = "";

  let actionIndex = 0;
  [hero.primaryCta, hero.secondaryCta].forEach((cta) => {
    const link = resolveLink(cta);
    if (!link) return;
    actions.appendChild(createLink(link, actionIndex === 0 ? "btn" : "btn btn-secondary"));
    actionIndex += 1;
  });
}

/**
 * Promotional banner.
 * Renders nothing unless the content source provides an active promo, so no
 * empty container and no invented offer appear today.
 */
function renderPromo() {
  const slot = document.getElementById("promo-slot");
  slot.innerHTML = "";

  const promo = content.promo;
  const headline = readText(promo && promo.headline);
  const description = readText(promo && promo.description);

  if (!promo || promo.active === false || (!headline && !description)) {
    slot.hidden = true;
    return;
  }

  slot.hidden = false;

  const inner = document.createElement("div");
  inner.className = "promo-inner";

  const label = readText(promo.label);
  if (label) {
    const labelEl = document.createElement("span");
    labelEl.className = "promo-label";
    labelEl.textContent = label;
    inner.appendChild(labelEl);
  }

  if (headline) {
    const headlineEl = document.createElement("h2");
    headlineEl.className = "promo-headline";
    headlineEl.textContent = headline;
    inner.appendChild(headlineEl);
  }

  if (description) {
    const descriptionEl = document.createElement("p");
    descriptionEl.className = "promo-description";
    descriptionEl.textContent = description;
    inner.appendChild(descriptionEl);
  }

  const cta = resolveLink(promo.cta);
  if (cta) inner.appendChild(createLink(cta, "btn"));

  slot.appendChild(inner);
}

/** Footer: link groups + copyright note, all from content. */
function renderFooter() {
  const footer = document.getElementById("footer");
  footer.innerHTML = "";

  content.footer.groups.forEach((group) => {
    const heading = readText(group && group.title);
    const links = readList(group && group.links);
    if (!heading && links.length === 0) return;

    const nav = document.createElement("nav");

    if (heading) {
      const headingEl = document.createElement("h6");
      headingEl.className = "footer-title";
      headingEl.textContent = heading;
      nav.appendChild(headingEl);
    }

    links.forEach((item) => {
      const link = resolveLink(item);
      if (!link) return;
      nav.appendChild(createLink(link, "link"));
    });

    footer.appendChild(nav);
  });

  if (content.footer.note) {
    const noteNav = document.createElement("nav");
    const note = document.createElement("p");
    note.className = "link";
    note.textContent = content.footer.note;
    noteNav.appendChild(note);
    footer.appendChild(noteNav);
  }
}


/* ==========================================================================
 * 7. RENDER — MENU (heading, category filter, product cards)
 *    The grid is data-driven and size-agnostic: it works for 4, 8, 12 or 200
 *    products because nothing here assumes a product count.
 * ======================================================================== */

/** Distinct categories present in the content, in first-seen order. */
function getCategories() {
  const categories = [];
  products.forEach((product) => {
    if (product.category && categories.indexOf(product.category) === -1) {
      categories.push(product.category);
    }
  });
  return categories;
}

/** Products passing the current category filter. */
function getVisibleProducts() {
  if (!state.activeCategory) return products;
  return products.filter((product) => product.category === state.activeCategory);
}

/**
 * Category filter bar.
 *
 * Rendered ONLY when the content actually contains categories. Today no
 * product is categorised, so this stays hidden and the menu lists everything.
 * Assign categories in Sanity and the bar appears by itself — no page
 * restructuring required, and no invented categories for current data.
 */
function renderCategoryFilter() {
  const container = document.getElementById("category-filter");
  const categories = getCategories();
  container.innerHTML = "";

  if (categories.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;

  const options = [{ label: content.menu.allCategoriesLabel, value: null }].concat(
    categories.map((category) => ({ label: category, value: category }))
  );

  options.forEach((option) => {
    const isActive = option.value === state.activeCategory;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-btn";
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(isActive));
    if (isActive) button.classList.add("active");

    button.addEventListener("click", () => {
      state.activeCategory = option.value;
      renderCategoryFilter();
      renderProducts();
    });

    container.appendChild(button);
  });
}


/**
 * Build one product card.
 *
 * The card renders every CMS field it may receive and degrades gracefully:
 *   badge     -> shown when present
 *   available -> false shows "Unavailable" and disables the stepper
 *   category  -> shown when present
 *   featured  -> exposed as a data attribute for a future featured layout
 *   no image  -> neutral placeholder instead of a broken image icon
 *
 * The component is therefore already capable of the future fields, without any
 * of them being fabricated in today's content.
 */
function createProductCard(product) {
  const quantity = state.cart[product.id] ? state.cart[product.id].qty : 0;

  const card = document.createElement("article");
  card.className = "card fade show";
  card.dataset.id = product.id;
  card.dataset.slug = product.slug;
  card.dataset.category = product.category || "";
  card.dataset.available = String(product.available);
  card.dataset.featured = String(product.featured);
  if (!product.available) card.classList.add("is-unavailable");
  if (product.featured) card.classList.add("is-featured");

  /* ---- media (fixed aspect-ratio container: works with any image size) --- */
  const media = document.createElement("div");
  media.className = "card-media";

  if (product.image) {
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.imageAlt;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 400;
    image.height = 300;
    media.appendChild(image);
  } else {
    media.classList.add("card-media-empty");
  }

  const badgeText = product.available ? product.badge : content.menu.unavailableLabel;
  if (badgeText) {
    const badge = document.createElement("span");
    badge.className = "card-badge" + (product.available ? "" : " card-badge-unavailable");
    badge.textContent = badgeText;
    media.appendChild(badge);
  }

  card.appendChild(media);

  /* ---------------------------- text content ---------------------------- */
  const body = document.createElement("div");
  body.className = "card-content";

  const heading = document.createElement("h3");
  const detailsButton = document.createElement("button");
  detailsButton.type = "button";
  detailsButton.className = "card-details";
  detailsButton.textContent = product.name;
  detailsButton.setAttribute("aria-label", "View details for " + product.name);
  detailsButton.addEventListener("click", () => openModal(product));
  heading.appendChild(detailsButton);
  body.appendChild(heading);

  if (product.category) {
    const categoryEl = document.createElement("span");
    categoryEl.className = "card-category";
    categoryEl.textContent = product.category;
    body.appendChild(categoryEl);
  }

  if (product.description) {
    const description = document.createElement("p");
    description.textContent = product.description;
    body.appendChild(description);
  }

  const row = document.createElement("div");
  row.className = "row";

  const price = document.createElement("span");
  price.className = "card-price";
  price.textContent = productPriceLabel(product);
  row.appendChild(price);

  const stepper = document.createElement("div");
  stepper.className = "qty";

  const decrease = document.createElement("button");
  decrease.type = "button";
  decrease.className = "qty-btn";
  decrease.dataset.action = "decrease";
  decrease.textContent = "−";
  decrease.setAttribute("aria-label", "Decrease " + product.name + " quantity");

  const quantityValue = document.createElement("span");
  quantityValue.className = "qty-value";
  quantityValue.id = "qty-" + product.id;
  quantityValue.textContent = String(quantity);

  const increase = document.createElement("button");
  increase.type = "button";
  increase.className = "qty-btn";
  increase.dataset.action = "increase";
  increase.textContent = "+";
  increase.setAttribute("aria-label", "Increase " + product.name + " quantity");

  if (!product.available) {
    decrease.disabled = true;
    increase.disabled = true;
    stepper.classList.add("is-disabled");
  }

  [decrease, increase].forEach((button) => {
    button.addEventListener("click", (event) => {
      // Quantity changes must not also trigger the card's open-modal handler.
      event.stopPropagation();
      const change = button.dataset.action === "increase" ? 1 : -1;
      changeQty(product, change);
    });
  });

  stepper.appendChild(decrease);
  stepper.appendChild(quantityValue);
  stepper.appendChild(increase);

  row.appendChild(stepper);
  body.appendChild(row);
  card.appendChild(body);

  return card;
}


/** Render the menu heading and, for each visible product, a card. */
function renderProducts() {
  setText("menu-heading", content.menu.heading);
  setText("menu-subheading", content.menu.subheading);
  setHidden("menu-subheading", !content.menu.subheading);

  const grid = document.getElementById("products-grid");
  const visible = getVisibleProducts();
  grid.innerHTML = "";

  visible.forEach((product) => grid.appendChild(createProductCard(product)));

  const empty = document.getElementById("menu-empty");
  if (empty) {
    empty.hidden = visible.length > 0;
    empty.textContent = content.menu.emptyMessage;
  }

  // Observe any card not yet revealed (scroll animation).
  observeFadeElements(grid);
}

/** About / story section. `body` is an array of paragraphs. */
function renderAbout() {
  const hasContent = Boolean(content.about.heading) || content.about.body.length > 0;
  setHidden("about", !hasContent);
  if (!hasContent) return;

  setText("about-heading", content.about.heading);
  setHidden("about-heading", !content.about.heading);

  const body = document.getElementById("about-body");
  body.innerHTML = "";

  content.about.body.forEach((paragraph) => {
    const el = document.createElement("p");
    el.textContent = paragraph;
    body.appendChild(el);
  });
}

/**
 * Testimonials.
 * Renders nothing while the content array is empty — the section appears by
 * itself once real reviews exist in the CMS.
 */
function renderTestimonials() {
  const slot = document.getElementById("testimonials-slot");
  slot.innerHTML = "";

  if (content.testimonials.length === 0) {
    slot.hidden = true;
    return;
  }

  slot.hidden = false;

  const heading = document.createElement("h2");
  heading.className = "section-title";
  heading.textContent = "What our customers say";
  slot.appendChild(heading);

  const list = document.createElement("div");
  list.className = "testimonial-list";

  content.testimonials.forEach((testimonial) => {
    const item = testimonial && typeof testimonial === "object" ? testimonial : {};
    const quote = readText(item.quote);
    if (!quote) return;

    const card = document.createElement("blockquote");
    card.className = "testimonial";

    const text = document.createElement("p");
    text.textContent = quote;
    card.appendChild(text);

    const author = readText(item.author);
    if (author) {
      const cite = document.createElement("cite");
      cite.textContent = author;
      card.appendChild(cite);
    }

    list.appendChild(card);
  });

  slot.appendChild(list);
}


/* ==========================================================================
 * 8. RENDER — CART PANEL
 *    Renders from `state.cart`. No content dependency, so a CMS can never
 *    affect how totals are calculated.
 * ======================================================================== */
function updateCart() {
  const itemsEl = document.getElementById("cart-items");
  itemsEl.innerHTML = "";

  const entries = getActiveCartEntries();
  let total = 0;
  let count = 0;

  entries.forEach((entry) => {
    total += entry.lineTotal;
    count += entry.quantity;

    const row = document.createElement("div");
    row.className = "cart-item";

    const label = document.createElement("span");
    label.className = "cart-item-label";
    label.textContent = entry.name + " ×" + entry.quantity;

    const lineTotal = document.createElement("span");
    lineTotal.className = "cart-item-total";
    lineTotal.textContent = formatPrice(entry.lineTotal);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cart-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove " + entry.name + " from cart");
    remove.addEventListener("click", () => removeItem(entry.id));

    row.appendChild(label);
    row.appendChild(lineTotal);
    row.appendChild(remove);
    itemsEl.appendChild(row);
  });

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "Your cart is empty. Add something tasty!";
    itemsEl.appendChild(empty);
  }

  setText("cart-total", formatPrice(total));
  setText("cart-count", count);
  setText("cart-count-2", count);

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) checkoutBtn.disabled = count === 0;
}

/* ==========================================================================
 * 9. CHECKOUT (WhatsApp)
 *    Application logic. The only content it reads is the business WhatsApp
 *    number — everything else is computed client-side.
 * ======================================================================== */
function checkout() {
  const entries = getActiveCartEntries();

  if (entries.length === 0) {
    alert("Your cart is empty. Add an item before checking out.");
    return;
  }

  let message = "Hello, I want to order:\n";
  let total = 0;

  entries.forEach((entry) => {
    message += "• " + entry.name + " ×" + entry.quantity + " = " + formatPrice(entry.lineTotal) + "\n";
    total += entry.lineTotal;
  });

  message += "\nTotal: " + formatPrice(total);

  const url = whatsappUrl(message);
  if (!url) {
    alert("Ordering is temporarily unavailable. Please contact us directly.");
    return;
  }

  window.open(url, "_blank");
}


/* ==========================================================================
 * 10. PRODUCT DETAIL MODAL
 * ======================================================================== */
const modal = document.getElementById("product-modal");
let lastFocusedElement = null;

function openModal(product) {
  setText("modal-title", product.name);
  setText("modal-price", productPriceLabel(product));

  const description = document.getElementById("modal-description");
  description.textContent = product.description;
  description.hidden = !product.description;

  const categoryEl = document.getElementById("modal-category");
  categoryEl.textContent = product.category || "";
  categoryEl.hidden = !product.category;

  const availability = document.getElementById("modal-availability");
  availability.textContent = product.available ? "" : content.menu.unavailableLabel;
  availability.hidden = product.available;
  availability.classList.toggle("is-out", !product.available);

  // Collapse the whole meta row when there is nothing to show in it, so the
  // layout keeps working for products with no category and full availability.
  setHidden("modal-meta", !product.category && product.available);

  const modalImage = document.getElementById("modal-image");
  const imageUrl = product.image;
  if (imageUrl) {
    modalImage.src = imageUrl;
    modalImage.alt = product.imageAlt;
    modalImage.hidden = false;
  } else {
    modalImage.removeAttribute("src");
    modalImage.alt = "";
    modalImage.hidden = true;
  }

  lastFocusedElement = document.activeElement;
  modal.classList.add("active");
  document.body.classList.add("modal-open");

  const closeButton = modal.querySelector(".close-modal");
  if (closeButton) closeButton.focus();
}

function closeModal() {
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

/* ==========================================================================
 * 11. UI STATE HELPERS (mobile nav, cart panel, theme)
 * ======================================================================== */

function closeMobileMenu() {
  document.getElementById("nav-links").classList.remove("open");
  document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  const navLinks = document.getElementById("nav-links");
  const isOpen = navLinks.classList.toggle("open");
  document.getElementById("menu-toggle").setAttribute("aria-expanded", String(isOpen));
}

function toggleCart() {
  document.getElementById("cart-panel").classList.toggle("active");
}

function closeCart() {
  document.getElementById("cart-panel").classList.remove("active");
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  try {
    localStorage.setItem(APP.storage.theme, isDark ? "dark" : "light");
  } catch (err) {
    /* Storage unavailable — the theme still applies for this session. */
  }
}

/** Restore the saved theme, or follow the OS preference on a first visit. */
function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(APP.storage.theme);
  } catch (err) {
    saved = null;
  }

  if (saved) {
    applyTheme(saved);
    return;
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  }
}


/* ==========================================================================
 * 12. SCROLL REVEAL
 * ======================================================================== */
let fadeObserver = null;

function observeFadeElements(scope) {
  const root = scope || document;
  const elements = root.querySelectorAll(".fade:not(.show)");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("show"));
    return;
  }

  // One shared observer rather than one per card.
  if (!fadeObserver) fadeObserver = new IntersectionObserver(onFadeIntersect);
  elements.forEach((el) => fadeObserver.observe(el));
}

function onFadeIntersect(entries, observer) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("show");
    observer.unobserve(entry.target);
  });
}

/* ==========================================================================
 * 13. EVENT BINDING
 *    All handlers are wired here with addEventListener — no inline onclick,
 *    no global function dependencies from the markup.
 * ======================================================================== */
function bindEvents() {
  document.getElementById("menu-toggle").addEventListener("click", toggleMenu);

  const modeToggle = document.getElementById("mode-toggle");
  if (modeToggle) modeToggle.addEventListener("click", toggleDarkMode);

  // Cart openers: navbar icon + floating button (mouse and keyboard).
  ["cart-icon", "floating-cart"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("click", toggleCart);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCart();
      }
    });
  });

  document.getElementById("checkout-btn").addEventListener("click", checkout);

  const closeCartButton = document.getElementById("close-cart");
  if (closeCartButton) closeCartButton.addEventListener("click", closeCart);

  // Modal: close button, backdrop click.
  const closeModalButton = modal.querySelector(".close-modal");
  if (closeModalButton) closeModalButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  // Keep keyboard focus inside the modal while it is open.
  modal.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !modal.classList.contains("active")) return;

    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Clicking outside the cart panel closes it.
  document.addEventListener("click", (event) => {
    const cartPanel = document.getElementById("cart-panel");
    if (!cartPanel.classList.contains("active")) return;

    const cartIcon = document.getElementById("cart-icon");
    const floatingCart = document.getElementById("floating-cart");
    const insidePanel = cartPanel.contains(event.target);
    const onTrigger =
      (cartIcon && cartIcon.contains(event.target)) ||
      (floatingCart && floatingCart.contains(event.target));

    if (!insidePanel && !onTrigger) closeCart();
  });

  // Escape closes the topmost overlay.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (modal.classList.contains("active")) {
      closeModal();
      return;
    }

    closeCart();
    closeMobileMenu();
  });
}

/* ==========================================================================
 * 14. INIT
 *    Order matters: cart is reconciled against current content before the
 *    first render so a saved cart can never show a removed/unavailable item.
 * ======================================================================== */
function init() {
  state.cart = loadCart();
  reconcileCart();

  initTheme();

  renderBrand();
  renderNav();
  renderHero();
  renderPromo();
  renderAbout();
  renderTestimonials();

  renderCategoryFilter();
  renderProducts();
  renderFooter();

  updateCart();
  bindEvents();

  observeFadeElements(document);
}

document.addEventListener("DOMContentLoaded", init);

