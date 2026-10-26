# Maarifatullah Snacks

A lightweight single-page storefront for **Maarifatullah Snacks** (Kano, Nigeria).
Customers browse the menu, build a cart, and place their order through WhatsApp — no
backend, no payment gateway, no build step required.

## Running Locally

Just open `index.html` in a browser, or serve the folder with any static server:

```powershell
# Option 1 - open directly
start index.html

# Option 2 - simple static server (any of these)
npx serve .
python -m http.server 8000
```

## Deploying

The site is 100% static, so it can be hosted on GitHub Pages, Netlify, Vercel,
Cloudflare Pages, or any shared host — upload the repository contents as-is.

> **Note:** some hosts (Linux, GitHub Pages, Netlify) are case-sensitive.
> Keep image file names and their references in `script.js` matching exactly
> (e.g. `images/coconut.PNG` is uppercase in this repo).

## Project Structure

```
index.html   Markup: navbar, hero, menu grid, cart panel, modal, footer
style.css    All styling, dark mode theme and responsive rules
script.js    All behaviour: products, cart, checkout, modal, theme, mobile nav
fonts/       Custom "Nove" display font (Nove.otf)
images/      Product photos, hero images and favicon
```

## Editing the Menu

All products live in one place — the `PRODUCTS` array at the top of `script.js`.
There is no need to touch `index.html` to add, remove, or re-price a snack:

```js
{
  id: "gireba",                 // must be unique; used for element ids
  name: "Gireba",               // used as the cart key
  description: "Crunchy filled snack",
  price: 2500,                  // numeric price used for totals
  priceLabel: "₦2500",          // text shown on the card and modal
  image: "images/gireba.jpg",
}
```

Product cards, the modal preview, the quantity steppers and the cart are all
rendered from this array.

## Configuration

Business settings live in the `CONFIG` object at the top of `script.js`:

```js
const CONFIG = {
  whatsappNumber: "2347032515203", // international format, no leading '+'
  storageKeys: { cart: "ms_cart", theme: "ms_theme" },
};
```

Remember to update the WhatsApp link in the footer (`index.html`) if the number changes.

## Unused Assets

These files are currently shipped but not referenced anywhere. They can be deleted
safely (they are kept only in case you want to use them later):

| File | Notes |
| --- | --- |
| `images/logo.png` | The navbar brand is text-only; a `.logo` CSS rule still exists if you re-add it. Also referenced by the `schema.org` `image` field. |
| `images/hero.png` | Older hero image; the site uses `images/hero1.png`. |
| `images/milky.jpg` | Not used by any product or section. |

The `.logo` rule in `style.css` is likewise unused unless you re-enable the logo
image in the navbar markup.

## Features

- Data-driven product grid rendered from `PRODUCTS`
- Quantity steppers with live per-item and cart totals
- Cart persists across page reloads via `localStorage`
- Cart panel with per-item remove buttons and an empty-cart state
- WhatsApp checkout with a pre-filled, properly URL-encoded order message
- Product preview modal (click outside or press `Esc` to close)
- Dark mode toggle that is remembered between visits and respects
  `prefers-color-scheme` on first visit
- Mobile hamburger navigation
- Scroll-reveal animations via `IntersectionObserver`
- SEO/social meta tags (description, Open Graph, theme-color) and
  `schema.org` LocalBusiness structured data

## Accessibility Notes

- Icon-only controls (`☰`, `🌓`, cart buttons, modal close, cart remove) have `aria-label`s
- Interactive non-button elements expose `role="button"` and keyboard support
  (`Enter` / `Space`)
- `Esc` closes the modal or the cart panel
- Visible focus outlines are provided for keyboard users
