# Glow Skin — custom Shopify theme

A custom Shopify theme for **Glow Skin**, a clean skincare brand. I built it from scratch with Liquid and Tailwind CSS. It doesn't use Dawn or any other starter theme.

## Features

- **Home page**: animated hero with floating badges, marquee, brand benefits, bestsellers, ingredients, before/after slider, testimonials, blog posts and newsletter. You can edit and reorder every section in the theme editor.
- **Product page**: image gallery, variant picker that updates price, image, stock message and URL, quantity selector, low stock message, sticky add-to-cart bar on scroll, and accordions. Skin types come from product tags, and benefits, ingredients and how-to-use come from product metafields. It also has customer reviews, product structured data for SEO and recommended products.
- **Product cards**: swipeable images on mobile, hover gallery on desktop, sale and sold-out badges, star rating from `reviews.rating` metafields, quick add and quick view.
- **Cart drawer**: add to cart, change quantity and remove items without a page reload, using the Ajax Cart API and the Section Rendering API. It shows an animated free shipping progress bar.
- **Search**: predictive search modal that shows products and pages as you type.
- **Collection page**: storefront filters (list and price range), sorting in custom dropdowns, active filter chips and pagination.
- **Reviews**: a "Write a review" form with a star rating input that sends reviews through the Shopify contact form for moderation.
- **Other pages**: contact page, search, cart page (works without JavaScript), blog, article, 404, password page and gift card.
- **Theme settings**: colors, fonts, free shipping threshold and social links are editable in the theme editor. Colors feed Tailwind through CSS variables. The logo is an inline SVG that uses the brand colors.
- **Translations**: English, German and French, with a language switcher in the header.
- **Motion and accessibility**: scroll reveal animations that respect `prefers-reduced-motion`, semantic HTML, a skip link, keyboard-friendly menus and dialogs, and labelled controls.

## Tech

- Shopify Liquid, Online Store 2.0 (JSON templates, section groups, metafields)
- Tailwind CSS v4
- Vanilla JavaScript in one small file, with no frameworks

## Structure

```
assets/      theme.js, compiled tailwind.css, favicon.svg
brand/       logo files (not uploaded to Shopify)
config/      theme settings (colors, fonts, cart, social)
layout/      theme.liquid, password.liquid
locales/     en, de, fr
sample-data/ products.csv for import (not uploaded to Shopify)
sections/    page sections (hero, header, main-product, quick-view, …)
snippets/    reusable parts (product-card, variant-picker, rating-stars, …)
src/         tailwind.css source
templates/   JSON templates for each page type
```

## Run locally

```bash
npm install
npm run dev      # Tailwind watcher + shopify theme dev
```

Other scripts:

```bash
npm run tw:build # minified production CSS
npm run check    # Shopify Theme Check
```
