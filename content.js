/**
 * ============================================================================
 * CONTENT SOURCE  —  the Sanity CMS swap point
 * ============================================================================
 *
 * This file is the SINGLE SOURCE OF TRUTH for every piece of *visible content*
 * on the site. It is deliberately the only file that needs to be replaced when
 * Sanity CMS is introduced.
 *
 * `script.js` never hard-codes content: it reads this object, normalises it,
 * and renders the UI from it. `index.html` contains only the empty shell.
 *
 * ---------------------------------------------------------------------------
 * FUTURE SANITY INTEGRATION — no changes required to script.js or index.html
 * ---------------------------------------------------------------------------
 *
 * Because this object is published on `window.SITE_CONTENT`, a future loader
 * can publish Sanity data into the exact same slot *before* script.js runs:
 *
 *   <!-- index.html: swap content.js for the Sanity loader -->
 *   <script src="sanity-content.js"></script>
 *   <script src="script.js"></script>
 *
 *   // sanity-content.js
 *   import { createClient } from ".../@sanity/client";
 *   const client = createClient({ projectId: "...", dataset: "...", ... });
 *   const products = await client.fetch(`*[_type == "product"] | order(order asc){
 *     "id": _id, name, "slug": slug.current, description, price, priceNote,
 *     "image": { "url": image.asset->url, alt: image.alt },
 *     "category": category->title, available, featured, badge
 *   }`);
 *   window.SITE_CONTENT = { ...staticContent, menu: { ...staticContent.menu, products } };
 *
 * Nothing else changes:  Content UI + cart + WhatsApp checkout stay identical.
 * Only the data SOURCE moves from this file to the Sanity API.
 *
 * See README.md → "Sanity CMS Migration" for the full field-by-field mapping.
 *
 * NOTE: business logic (cart maths, WhatsApp message building, modal/panel
 * state, theme) stays in script.js on purpose — Sanity controls CONTENT, not
 * application behaviour.
 */

window.SITE_CONTENT = {
  /* ==========================================================================
   * BUSINESS / CONTACT  (CMS: singleton "siteSettings" document)
   * The WhatsApp number lives here ONLY. script.js derives every WhatsApp
   * link and the checkout URL from it, so it is never duplicated.
   * ======================================================================== */
  business: {
    name: "Maarifatullah Snacks",
    tagline: "Fresh homemade snacks, delivered fast in Kano.",
    whatsappNumber: "2347032515203", // international format, no leading '+'
    email: "",
    phone: "",
    address: {
      locality: "Kano",
      country: "NG",
    },
    currency: {
      code: "NGN",   // ISO 4217 code — Intl renders the proper local convention
      symbol: "₦",   // fallback when a content source has no ISO code
      locale: "en-NG",
      decimals: 0,   // naira has no displayed decimals; USD would use 2
    },
  },

  /* ==========================================================================
   * NAVIGATION  (CMS: array of link objects)
   * ======================================================================== */
  nav: [
    { label: "Home", href: "#home" },
    { label: "Menu", href: "#products" },
    { label: "About", href: "#about" },
  ],

  /* ==========================================================================
   * HERO  (CMS: object inside "siteSettings" or a "homePage" document)
   * Every field is optional. Empty/absent fields are hidden by the renderer,
   * so changing the copy never breaks the layout.
   *
   * eyebrow / secondaryCta are supported but intentionally left empty for now,
   * because that copy does not exist yet. Fill them in later (in Sanity, via a
   * non-developer) and the UI picks them up with no code change.
   * ======================================================================== */
  hero: {
    eyebrow: "Homemade in Kano",
    headline: "Fresh Homemade Snacks",
    description: "Delicious snacks made fresh and delivered fast. Pick your favourites and order in seconds on WhatsApp.",
    primaryCta: { label: "Explore Menu", href: "#products" },
    secondaryCta: { label: "Chat on WhatsApp", channel: "whatsapp" },
    image: {
      url: "images/hero1.png",
      alt: "Assortment of fresh homemade snacks",
    },
    // Short selling points shown under the buttons. Keep them true.
    highlights: ["Made fresh", "Fast delivery in Kano", "Order on WhatsApp"],
  },

  /* ==========================================================================
   * HOW TO ORDER  (CMS: object inside "siteSettings")
   * Empty `steps` => the section renders nothing.
   * ======================================================================== */
  howToOrder: {
    heading: "How to order",
    steps: [
      { title: "Pick your snacks", text: "Tap + on anything you fancy. Your cart is saved as you go." },
      { title: "Check your cart", text: "Review your items and total before you send anything." },
      { title: "Send on WhatsApp", text: "Your order arrives in our chat, ready for us to confirm." },
    ],
  },

  /* ==========================================================================
   * MENU  (CMS: "product" documents + a "menu" settings object)
   *
   * PRODUCT SHAPE — matches the Sanity document shape 1:1
   *   id          string   stable unique identifier
   *   name        string   display name
   *   slug        string   URL-safe identifier (for future /product/<slug> pages)
   *   description string   short copy
   *   price       number   NUMERIC price — used for all cart maths
   *   priceNote   string   optional suffix, e.g. "/ 4" for a 4-piece pack
   *   image       object   { url, alt } — see "Images" note below
   *   category    string   optional; null until real categories exist
   *   available   boolean  false => shows "Unavailable" and cannot be added
   *   featured    boolean  marks a product for a future "featured" strip
   *   badge       string   optional label, e.g. "New", "Best seller"
   *
   * IMAGES — written as { url, alt } rather than a bare path string so the
   * renderer never depends on "an image is just a local file path".
   * script.js's resolveImage() accepts a plain string, { url }, { src } or a
   * Sanity shape { asset: { url } }, so a CMS CDN URL drops straight in.
   *
   * CATEGORIES — these four products have no official category yet, so every
   * `category` is null and the category filter stays hidden. Assign real
   * categories in Sanity later and the filter bar appears on its own; no
   * restructuring needed. Categories were NOT invented here on purpose.
   * ======================================================================== */
  menu: {
    heading: "Our Menu",
    subheading: "",
    allCategoriesLabel: "All",
    unavailableLabel: "Unavailable",
    emptyMessage: "No items to show right now. Please check back soon.",
    products: [
      {
        id: "coconut-drink",
        name: "Coconut Drink",
        slug: "coconut-drink",
        description: "Soft sweet juice",
        price: 1500,
        priceNote: "",
        image: { url: "images/coconut.PNG", alt: "Chilled coconut drink" },
        category: null,
        available: true,
        featured: false,
        badge: "",
      },
      {
        id: "cookie",
        name: "Cookie",
        slug: "cookie",
        description: "Crispy sweet delight",
        price: 2000,
        priceNote: "",
        image: { url: "images/cookie.jpeg", alt: "Freshly baked cookies" },
        category: null,
        available: true,
        featured: false,
        badge: "",
      },
      {
        id: "gireba",
        name: "Gireba",
        slug: "gireba",
        description: "Crunchy filled snack",
        price: 2500,
        priceNote: "",
        image: { url: "images/gireba.jpg", alt: "Gireba snack pieces" },
        category: null,
        available: true,
        featured: false,
        badge: "",
      },
      {
        id: "cupcakes",
        name: "Cupcakes",
        slug: "cupcakes",
        description: "Soft baked mini cakes",
        price: 1000,
        priceNote: "/ 4",
        image: { url: "images/cupcakes.png", alt: "Decorated mini cupcakes" },
        category: null,
        available: true,
        featured: false,
        badge: "",
      },
    ],
  },


  /* ==========================================================================
   * ABOUT / STORY  (CMS: "aboutPage" or a portable-text field)
   * `body` is an ARRAY of paragraphs so the story can grow to any length
   * without touching the layout.
   * ======================================================================== */
  about: {
    heading: "About Us",
    body: ["Premium homemade snacks with fast delivery in Kano."],
    image: null,
    cta: { label: "Say hello on WhatsApp", channel: "whatsapp" },
  },

  /* ==========================================================================
   * PROMOTIONAL BANNER  (CMS: optional "promo" document)
   * Set `active: true` and fill in copy to show a banner. While it is null /
   * inactive the slot renders nothing at all — no empty box, no fake offer.
   * ======================================================================== */
  promo: null,
  /*
  promo: {
    active: true,
    label: "Special offer",
    headline: "",
    description: "",
    cta: { label: "", href: "#products" },
  },
  */

  /* ==========================================================================
   * TESTIMONIALS / REVIEWS  (CMS: optional "testimonial" documents)
   * Empty array => the section renders nothing. Add entries later and it
   * appears automatically.
   * ======================================================================== */
  testimonials: [],

  /* ==========================================================================
   * FOOTER  (CMS: link groups inside "siteSettings")
   * `channel: "whatsapp"` is a small convention: it means "link to the
   * business's WhatsApp" and is resolved from business.whatsappNumber, so the
   * number is never duplicated across the content file.
   * ======================================================================== */
  footer: {
    groups: [
      {
        title: "Services",
        links: [
          { label: "Menu", href: "#products" },
          { label: "Delivery", href: "#home" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About us", href: "#about" },
          { label: "Contact", channel: "whatsapp" },
        ],
      },
    ],
    note: "© 2026 Maarifatullah Snacks",
  },
};

