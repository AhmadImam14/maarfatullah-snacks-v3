/**
 * ============================================================================
 * SANITY MENU LOADER
 * ============================================================================
 *
 * Fetches the live menu (products + categories) that the owner manages in
 * Sanity Studio, and publishes it as a promise on `window.SITE_MENU_READY`.
 *
 * script.js waits for that promise before rendering the menu. If Sanity cannot
 * be reached (offline, timeout, outage) the promise resolves to null and the
 * site falls back to the products in content.js, so the menu is never empty
 * because of a network problem.
 *
 * The dataset is public and read-only from the browser: no token is used or
 * needed here. Only the site's own domains are allowed by Sanity's CORS list.
 */
(function () {
  "use strict";

  var SANITY = {
    projectId: "tkqil7t5",
    dataset: "production",
    apiVersion: "2025-08-15",
    timeoutMs: 6000,
  };

  // Products sorted by their category's position, then their own position.
  // Category order drives the order of the filter buttons on the menu.
  var QUERY =
    '*[_type == "product"] | order(coalesce(category->order, 9999) asc, category->title asc, coalesce(order, 9999) asc, name asc) {' +
    '  "id": _id,' +
    "  name," +
    "  description," +
    "  price," +
    "  priceNote," +
    '  "image": { "url": image.asset->url + "?w=800&fit=max&auto=format", "alt": image.alt },' +
    '  "category": category->title,' +
    "  available," +
    "  badge" +
    "}";

  var url =
    "https://" + SANITY.projectId + ".apicdn.sanity.io/v" + SANITY.apiVersion +
    "/data/query/" + SANITY.dataset + "?query=" + encodeURIComponent(QUERY);

  var controller = typeof AbortController === "function" ? new AbortController() : null;
  var timer = controller ? setTimeout(function () { controller.abort(); }, SANITY.timeoutMs) : null;

  window.SITE_MENU_READY = fetch(url, controller ? { signal: controller.signal } : undefined)
    .then(function (response) {
      if (!response.ok) throw new Error("Sanity responded " + response.status);
      return response.json();
    })
    .then(function (data) {
      return Array.isArray(data.result) ? data.result : null;
    })
    .catch(function (error) {
      console.warn("Live menu unavailable, showing the built-in menu instead.", error);
      return null;
    })
    .finally(function () {
      if (timer) clearTimeout(timer);
    });
})();
