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
> Keep image file names and their references in `content.js` matching exactly
> (e.g. `images/coconut.PNG` is uppercase in this repo).

## Project Structure

```
index.html         Markup only: empty shell that script.js fills in
content.js         Site text (hero, about, footer, WhatsApp number) + fallback menu
sanity-content.js  Fetches the live menu from Sanity
script.js          All behaviour: rendering, cart, checkout, modal, theme, mobile nav
style.css          All styling, dark mode theme and responsive rules
fonts/             Custom "Nove" display font (Nove.otf)
images/            Hero image, favicon and the photos used by the fallback menu
```

## Editing the Menu

The owner manages **products and categories** in Sanity Studio:
**https://maarifatullah.sanity.studio** (sign-in required). Published changes
appear on the site within about a minute, with no redeploy.

The Studio's code lives in the separate `maarfatullahi-snacks-cms` project.

- **Products:** name, short description, price, optional price note (e.g. `/ 4`),
  photo, category, "Available to order" switch, optional badge, menu position.
- **Categories:** name and menu position. The category filter on the menu appears
  automatically once at least one product has a category.

`sanity-content.js` reads the published menu from Sanity's public API (no token).
If Sanity cannot be reached within 6 seconds, the site falls back to the products
in `content.js`, so keep those roughly in sync with the real menu.

Sanity only answers browsers from allowed sites. If the site moves to a new
domain, add it from the CMS project:

```powershell
npx sanity cors add https://your-new-domain.com --no-credentials
```

## Configuration

Business details (name, WhatsApp number, currency, address) and all other site
text live in `content.js`. The WhatsApp number is defined once there and every
WhatsApp link and the checkout message are built from it.

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

- Menu managed by the owner in Sanity Studio, with a built-in fallback menu
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
