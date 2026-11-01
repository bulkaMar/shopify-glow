(() => {
  const cartDrawer = {
    get dialog() {
      return document.querySelector('[data-cart-drawer]');
    },

    open() {
      if (this.dialog && !this.dialog.open) this.dialog.showModal();
      this.loadRecommendations();
    },

    async loadRecommendations(previousHtml) {
      const holder = document.querySelector('[data-cart-recommendations]');
      if (!holder || holder.dataset.loaded) return;
      holder.dataset.loaded = 'true';
      if (previousHtml) holder.innerHTML = previousHtml;

      try {
        const html = await (await fetch(holder.dataset.url)).text();
        const result = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-cart-recommendations-result]');
        if (result) holder.innerHTML = result.innerHTML;
      } catch {
        holder.innerHTML = '';
      }
    },

    close() {
      this.dialog?.close();
    },

    render(sections) {
      const html = sections?.['cart-drawer'];
      if (!html) return;

      const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-cart-drawer-content]');
      const previousRecommendations = document.querySelector('[data-cart-recommendations]')?.innerHTML;
      const oldBar = document.querySelector('[data-cart-drawer-content] [data-shipping-bar]');
      const newBar = fresh.querySelector('[data-shipping-bar]');
      const targetWidth = newBar?.style.width;
      if (oldBar && newBar) newBar.style.width = oldBar.style.width;

      document.querySelector('[data-cart-drawer-content]')?.replaceWith(fresh);

      if (oldBar && newBar) {
        requestAnimationFrame(() => requestAnimationFrame(() => (newBar.style.width = targetWidth)));
      }

      this.loadRecommendations(previousRecommendations);

      const count = Number(fresh.dataset.itemCount);
      document.querySelectorAll('[data-cart-count]').forEach((badge) => {
        badge.textContent = count;
        badge.hidden = count === 0;
      });
    },
  };

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-product-form]');
    if (!form) return;
    event.preventDefault();

    const button = form.querySelector('[type="submit"]');
    const error = form.querySelector('[data-form-error]');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    if (error) error.hidden = true;

    const body = new FormData(form);
    body.append('sections', 'cart-drawer');

    try {
      const response = await fetch(`${window.routes.cart_add_url}.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.description || data.message);

      cartDrawer.render(data.sections);
      quickView.dialog?.close();
      cartDrawer.open();
    } catch (e) {
      if (error) {
        error.textContent = e.message;
        error.hidden = false;
      }
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });

  document.addEventListener('click', async (event) => {
    document.querySelectorAll('[data-dropdown][open]').forEach((dropdown) => {
      if (!dropdown.contains(event.target)) dropdown.open = false;
    });

    const cartLink = event.target.closest('[data-cart-open]');
    if (cartLink && cartDrawer.dialog && document.body.dataset.template !== 'cart') {
      event.preventDefault();
      cartDrawer.open();
      return;
    }

    if (event.target.closest('[data-cart-close]') || event.target === cartDrawer.dialog) {
      cartDrawer.close();
      return;
    }

    const dialogOpener = event.target.closest('[data-dialog-open]');
    if (dialogOpener) {
      document.getElementById(dialogOpener.dataset.dialogOpen)?.showModal();
      return;
    }

    if (event.target.closest('[data-dialog-close]')) {
      event.target.closest('dialog')?.close();
      return;
    }

    if (event.target.matches('dialog[id^="ReviewDialog"]')) {
      event.target.close();
      return;
    }

    const quickViewButton = event.target.closest('[data-quick-view]');
    if (quickViewButton) {
      quickView.open(quickViewButton);
      return;
    }

    if (event.target.closest('[data-quick-view-close]') || event.target === quickView.dialog) {
      quickView.dialog.close();
      return;
    }

    const searchLink = event.target.closest('[data-search-open]');
    if (searchLink && search.dialog) {
      event.preventDefault();
      search.open();
      return;
    }

    if (event.target.closest('[data-search-close]') || event.target === search.dialog) {
      search.dialog.close();
      return;
    }

    const lineButton = event.target.closest('[data-cart-line]');
    if (lineButton) {
      lineButton.disabled = true;
      const response = await fetch(`${window.routes.cart_change_url}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          line: Number(lineButton.dataset.cartLine),
          quantity: Number(lineButton.dataset.cartQuantity),
          sections: ['cart-drawer'],
        }),
      });
      cartDrawer.render((await response.json()).sections);
      return;
    }

    const thumb = event.target.closest('[data-thumb]');
    if (thumb) {
      const product = thumb.closest('[data-product]');
      showImage(product, thumb.dataset.thumb);
      product.querySelectorAll('[data-thumb]').forEach((t) => t.setAttribute('aria-current', t === thumb));
      return;
    }

    const step = event.target.closest('[data-quantity-step]');
    if (step) {
      const input = step.parentElement.querySelector('input');
      const previous = input.value;
      if (step.dataset.quantityStep === 'up') input.stepUp();
      else input.stepDown();
      if (input.value !== previous) input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  function clampQuantity(input) {
    const max = input.max ? Number(input.max) : Infinity;
    const min = Number(input.min || 0);
    const value = Math.min(Math.max(Number(input.value) || min, min), max);
    input.value = value;

    const up = input.parentElement.querySelector('[data-quantity-step="up"]');
    if (up) up.disabled = value >= max;
  }

  document.addEventListener('change', (event) => {
    if (event.target.matches('input[name="quantity"]')) clampQuantity(event.target);
  });

  function animateShippingBar(oldRoot, newRoot) {
    const oldBar = oldRoot?.querySelector('[data-shipping-bar]');
    const newBar = newRoot?.querySelector('[data-shipping-bar]');
    if (!oldBar || !newBar) return () => {};
    const target = newBar.style.width;
    newBar.style.width = oldBar.style.width;
    return () => requestAnimationFrame(() => requestAnimationFrame(() => (newBar.style.width = target)));
  }

  async function updateCartPage(line, quantity, source) {
    const page = document.querySelector('[data-cart-page]');
    source?.closest('[data-cart-page-item]')?.classList.add('pointer-events-none', 'opacity-50');

    try {
      const response = await fetch(`${window.routes.cart_change_url}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line: Number(line), quantity: Number(quantity), sections: ['main-cart', 'cart-drawer'] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.description);

      const fresh = new DOMParser().parseFromString(data.sections['main-cart'], 'text/html').querySelector('[data-cart-page]');
      const startBar = animateShippingBar(page, fresh);
      page.replaceWith(fresh);
      startBar();
      cartDrawer.render(data.sections);
    } catch {
      window.location.reload();
    }
  }

  let cartUpdateTimer;
  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cart-page-quantity]');
    if (!input) return;
    clampQuantity(input);
    clearTimeout(cartUpdateTimer);
    cartUpdateTimer = setTimeout(() => updateCartPage(input.dataset.line, input.value, input), 400);
  });

  document.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-cart-page-remove]');
    if (!remove) return;
    event.preventDefault();
    updateCartPage(remove.dataset.cartPageRemove, 0, remove);
  });

  function showImage(product, src) {
    const image = product?.querySelector('[data-main-image]') || product?.querySelector('[data-main-media] img');
    if (!image || !src) return;
    image.removeAttribute('srcset');
    image.src = src;
    product.querySelectorAll('[data-thumb]').forEach((thumb) => thumb.setAttribute('aria-current', thumb.dataset.thumb === src));
  }

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-variant-input]');
    if (!input) return;

    const product = input.closest('[data-product]');
    if (!product) return;

    showImage(product, input.dataset.image);

    const price = product.querySelector('[data-price]');
    if (price) price.textContent = input.dataset.price;

    const comparePrice = product.querySelector('[data-compare-price]');
    if (comparePrice) {
      comparePrice.textContent = input.dataset.comparePrice;
      comparePrice.hidden = !input.dataset.comparePrice;
    }

    const quantity = product.querySelector('input[name="quantity"]');
    if (quantity) {
      if (input.dataset.max) quantity.max = input.dataset.max;
      else quantity.removeAttribute('max');
      clampQuantity(quantity);
    }

    const available = input.dataset.available === 'true';
    const button = product.querySelector('[data-add-button]');
    if (button) {
      button.disabled = !available;
      button.textContent = available ? button.dataset.addText : button.dataset.soldOutText;
    }

    const stickyAdd = product.querySelector('[data-sticky-add]');
    if (stickyAdd) {
      product.querySelector('[data-sticky-price]').textContent = input.dataset.price;
      stickyAdd.disabled = !available;
      stickyAdd.textContent = available ? button?.dataset.addText : button?.dataset.soldOutText;
    }

    const lowStock = product.querySelector('[data-low-stock]');
    if (lowStock) {
      lowStock.querySelector('[data-low-stock-text]').textContent = input.dataset.lowStock;
      lowStock.hidden = !input.dataset.lowStock;
    }

    if (input.closest('dialog')) return;

    const url = new URL(window.location.href);
    url.searchParams.set('variant', input.value);
    window.history.replaceState({}, '', url);
  });

  document.querySelectorAll('[data-recommendations-url]').forEach(async (section) => {
    const response = await fetch(section.dataset.recommendationsUrl);
    const html = await response.text();
    const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-recommendations-url]');

    if (fresh && fresh.innerHTML.trim()) section.innerHTML = fresh.innerHTML;
    else section.remove();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-dropdown][open]').forEach((dropdown) => {
      dropdown.open = false;
      dropdown.querySelector('summary').focus();
    });
  });

  document.addEventListener('change', (event) => {
    const form = event.target.closest('[data-filter-form]');
    if (!form) return;
    if (event.target.type === 'checkbox' || event.target.matches('[data-auto-submit]')) form.requestSubmit();
  });

  document.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-filter-form]')) return;
    document.querySelector('[data-product-grid]')?.setAttribute('data-loading', '');
  });

  const quickView = {
    get dialog() {
      return document.querySelector('[data-quick-view-dialog]');
    },

    async open(button) {
      button.setAttribute('aria-busy', 'true');
      const url = new URL(button.dataset.quickView, window.location.origin);
      url.searchParams.set('section_id', 'quick-view');

      try {
        const html = await (await fetch(url)).text();
        const root = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-quick-view-root]');
        if (!root) throw new Error();
        this.dialog.querySelector('[data-quick-view-content]').replaceChildren(root);
        this.dialog.showModal();
      } catch {
        window.location.href = button.dataset.quickView;
      } finally {
        button.removeAttribute('aria-busy');
      }
    },
  };

  const search = {
    timer: null,
    controller: null,
    storageKey: 'glow-recent-searches',

    get dialog() {
      return document.querySelector('[data-search-modal]');
    },

    get input() {
      return this.dialog.querySelector('[data-search-input]');
    },

    open() {
      this.renderRecent();
      this.dialog.showModal();
      this.input.focus();
    },

    getRecent() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
      } catch {
        return [];
      }
    },

    saveRecent(query) {
      if (!query) return;
      const recent = [query, ...this.getRecent().filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(recent));
      } catch {}
    },

    clearRecent() {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {}
      this.renderRecent();
    },

    renderRecent() {
      const wrapper = this.dialog.querySelector('[data-search-recent-wrapper]');
      const list = this.dialog.querySelector('[data-search-recent]');
      const recent = this.getRecent();
      wrapper.hidden = recent.length === 0;
      list.replaceChildren(
        ...recent.map((term) => {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.searchTerm = term;
          button.textContent = term;
          button.className = 'cursor-pointer rounded-full bg-soft px-3.5 py-1.5 text-sm transition hover:bg-accent hover:text-white';
          item.append(button);
          return item;
        }),
      );
    },

    showResults(visible) {
      this.dialog.querySelector('[data-search-empty]').hidden = visible;
      this.dialog.querySelector('[data-search-results]').hidden = !visible;
    },

    highlight(root, query) {
      const pattern = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      root.querySelectorAll('[data-search-highlight]').forEach((element) => {
        const text = element.textContent;
        element.textContent = '';
        text.split(pattern).forEach((part, index) => {
          if (index % 2 === 1) {
            const mark = document.createElement('mark');
            mark.className = 'rounded bg-blush px-0.5 text-ink';
            mark.textContent = part;
            element.append(mark);
          } else {
            element.append(part);
          }
        });
      });
    },

    async suggest(query) {
      const results = this.dialog.querySelector('[data-search-results]');
      const spinner = this.dialog.querySelector('[data-search-spinner]');
      if (query.length < 2) {
        this.controller?.abort();
        spinner.classList.add('hidden');
        results.innerHTML = '';
        this.showResults(false);
        return;
      }

      this.controller?.abort();
      this.controller = new AbortController();
      spinner.classList.remove('hidden');

      const url = new URL(window.routes.predictive_search_url, window.location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('section_id', 'predictive-search');
      url.searchParams.set('resources[limit]', '6');
      url.searchParams.set('resources[options][unavailable_products]', 'last');

      try {
        const html = await (await fetch(url, { signal: this.controller.signal })).text();
        const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-predictive-results]');
        if (fresh) {
          this.highlight(fresh, query);
          results.replaceChildren(...fresh.childNodes);
          this.showResults(true);
        }
        spinner.classList.add('hidden');
      } catch (error) {
        if (error.name !== 'AbortError') {
          results.innerHTML = '';
          spinner.classList.add('hidden');
        }
      }
    },
  };

  document.addEventListener('click', (event) => {
    if (!search.dialog?.open) return;

    const term = event.target.closest('[data-search-term]');
    if (term) {
      search.input.value = term.dataset.searchTerm;
      search.input.focus();
      search.suggest(term.dataset.searchTerm);
      return;
    }

    if (event.target.closest('[data-search-clear-recent]')) {
      search.clearRecent();
      return;
    }

    const resultLink = event.target.closest('[data-search-results] a');
    if (resultLink) search.saveRecent(search.input.value.trim());
  });

  document.addEventListener('submit', (event) => {
    if (event.target.matches('[data-search-form]')) search.saveRecent(search.input.value.trim());
  });

  document.addEventListener('input', (event) => {
    if (event.target.matches('[data-search-input]')) {
      clearTimeout(search.timer);
      search.timer = setTimeout(() => search.suggest(event.target.value.trim()), 250);
      return;
    }

    const compare = event.target.closest('[data-compare]');
    if (compare) compare.style.setProperty('--position', `${event.target.value}%`);
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.addEventListener('transitionend', (event) => {
          if (event.target === entry.target) entry.target.removeAttribute('data-reveal');
        });
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px' },
  );

  function initReveal(root = document) {
    root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((element) => revealObserver.observe(element));
  }

  function initStickyCart(root = document) {
    root.querySelectorAll('[data-sticky-cart]').forEach((bar) => {
      const target = bar.closest('[data-product]')?.querySelector('[data-add-button]');
      if (!target) return;

      new IntersectionObserver(([entry]) => {
        const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        bar.toggleAttribute('data-visible', show);
        bar.inert = !show;
      }).observe(target);
    });
  }

  initReveal();
  initStickyCart();

  document.addEventListener('shopify:section:load', (event) => {
    initReveal(event.target);
    initStickyCart(event.target);
  });

  document.querySelectorAll('[data-review-posted]').forEach((element) => element.closest('dialog')?.showModal());

  document.addEventListener('change', (event) => {
    const option = event.target.closest('[data-select-option]');
    if (!option) return;

    const dropdown = option.closest('details');
    const label = option.closest('label');
    dropdown.querySelector('[data-select-label]').textContent = label.textContent.trim();
    dropdown.querySelector('[data-select-image]').innerHTML = label.querySelector('[data-option-image]').innerHTML;
    dropdown.open = false;
  });

  function showCardDot(gallery, index) {
    gallery.querySelectorAll('[data-card-dot]').forEach((dot, i) => {
      dot.classList.toggle('bg-paper', i === index);
      dot.classList.toggle('bg-paper/40', i !== index);
    });
  }

  document.addEventListener(
    'scroll',
    (event) => {
      const track = event.target;
      if (!(track instanceof Element) || !track.matches('[data-card-track]')) return;
      showCardDot(track.closest('[data-card-gallery]'), Math.round(track.scrollLeft / track.clientWidth));
    },
    { capture: true, passive: true },
  );

  function showCardImage(gallery, index) {
    gallery.querySelectorAll('[data-card-image]').forEach((image, i) => {
      image.classList.toggle('md:opacity-100', i === index);
      image.classList.toggle('md:opacity-0', i !== index);
    });
    showCardDot(gallery, index);
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const gallery = event.target.closest?.('[data-card-gallery]');
    if (!gallery) return;

    const count = gallery.querySelectorAll('[data-card-image]').length;
    if (count < 2) return;

    const rect = gallery.getBoundingClientRect();
    const index = Math.min(count - 1, Math.floor(((event.clientX - rect.left) / rect.width) * count));
    if (gallery.dataset.cardIndex === String(index)) return;
    gallery.dataset.cardIndex = index;
    showCardImage(gallery, index);
  });

  document.addEventListener('pointerout', (event) => {
    if (event.pointerType !== 'mouse') return;
    const gallery = event.target.closest?.('[data-card-gallery]');
    if (!gallery || gallery.contains(event.relatedTarget)) return;
    gallery.dataset.cardIndex = 0;
    showCardImage(gallery, 0);
  });

  const readingProgress = document.querySelector('[data-reading-progress]');
  const articleContent = document.querySelector('[data-article-content]');
  if (readingProgress && articleContent) {
    const updateProgress = () => {
      const rect = articleContent.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.5;
      const progress = Math.min(Math.max(-rect.top / total, 0), 1);
      readingProgress.style.scale = `${progress} 1`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-link]');
    if (!button) return;

    await navigator.clipboard?.writeText(button.dataset.copyLink);
    const label = button.querySelector('span');
    const original = label.textContent;
    label.textContent = button.dataset.copiedText;
    button.querySelector('svg')?.classList.remove('hidden');
    setTimeout(() => {
      label.textContent = original;
      button.querySelector('svg')?.classList.add('hidden');
    }, 2000);
  });

  const toc = document.querySelector('[data-toc]');
  const headings = articleContent ? [...articleContent.querySelectorAll('h2')] : [];
  if (toc && headings.length > 1) {
    const links = headings.map((heading, index) => {
      heading.id ||= `section-${index + 1}`;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      link.className =
        '-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-ink/60 transition hover:text-ink aria-[current=true]:border-accent aria-[current=true]:font-medium aria-[current=true]:text-ink';
      item.append(link);
      toc.append(item);
      return link;
    });
    toc.closest('[data-toc-wrapper]').hidden = false;

    const tocObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = headings.indexOf(entry.target);
          links.forEach((link, i) => link.setAttribute('aria-current', i === index));
        });
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    headings.forEach((heading) => tocObserver.observe(heading));
  }
})();
