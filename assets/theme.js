/* vrenyaCart Theme - Core JavaScript */

(function() {
  'use strict';

  /* ===== State ===== */
  const state = {
    cartOpen: false,
    searchOpen: false,
    mobileMenuOpen: false,
    quickViewOpen: false
  };

  /* ===== Utilities ===== */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
  }

  /* ===== Cart Drawer ===== */
  const cartDrawer = {
    init() {
      const cartIcon = document.querySelector('[data-cart-icon]');
      const cartOverlay = document.querySelector('[data-cart-overlay]');
      const cartClose = document.querySelector('[data-cart-close]');

      if (cartIcon) {
        cartIcon.addEventListener('click', () => this.open());
      }
      if (cartOverlay) {
        cartOverlay.addEventListener('click', () => this.close());
      }
      if (cartClose) {
        cartClose.addEventListener('click', () => this.close());
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.cartOpen) {
          this.close();
        }
      });
    },

    open() {
      const drawer = document.querySelector('[data-cart-drawer]');
      const overlay = document.querySelector('[data-cart-overlay]');
      if (drawer) {
        drawer.classList.add('open');
        state.cartOpen = true;
        document.body.style.overflow = 'hidden';
      }
      if (overlay) {
        overlay.classList.add('open');
      }
    },

    close() {
      const drawer = document.querySelector('[data-cart-drawer]');
      const overlay = document.querySelector('[data-cart-overlay]');
      if (drawer) {
        drawer.classList.remove('open');
        state.cartOpen = false;
        document.body.style.overflow = '';
      }
      if (overlay) {
        overlay.classList.remove('open');
      }
    },

    update() {
      fetch(window.Shopify.routes.root + 'cart.js')
        .then(response => response.json())
        .then(cart => {
          this.render(cart);
        })
        .catch(error => {
          console.error('Error:', error);
        });
    },

    render(cart) {
      const cartItems = document.querySelector('[data-cart-items]');
      const cartCount = document.querySelector('[data-cart-count]');
      const cartTotal = document.querySelector('[data-cart-total]');

      if (cartCount) {
        cartCount.textContent = cart.item_count;
      }

      if (cartTotal) {
        cartTotal.textContent = Shopify.formatMoney(cart.total_price, Shopify.money_format);
      }

      if (cartItems && cart.item_count > 0) {
        cartItems.innerHTML = cart.items.map(item => this.renderItem(item)).join('');
      }
    },

    renderItem(item) {
      return `
        <div class="cart-item">
          <img class="cart-item__image" src="${item.image}" alt="${item.title}">
          <div class="cart-item__info">
            <h4>${item.title}</h4>
            <p class="cart-item__price">${Shopify.formatMoney(item.price, Shopify.money_format)}</p>
            <div class="cart-item__qty">
              <button onclick="window.vrenyaCart.cart.updateQty('${item.key}', ${item.quantity - 1})">-</button>
              <span>${item.quantity}</span>
              <button onclick="window.vrenyaCart.cart.updateQty('${item.key}', ${item.quantity + 1})">+</button>
            </div>
          </div>
          <button onclick="window.vrenyaCart.cart.removeItem('${item.key}')">&times;</button>
        </div>
      `;
    },

    addItem(variantId, qty = 1) {
      fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{ id: variantId, quantity: qty }]
        })
      })
        .then(response => response.json())
        .then(cart => {
          this.render(cart);
          this.open();
        })
        .catch(error => {
          console.error('Error:', error);
        });
    },

    updateQty(key, qty) {
      fetch(window.Shopify.routes.root + 'cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          line: key,
          quantity: qty
        })
      })
        .then(response => response.json())
        .then(cart => {
          this.render(cart);
        })
        .catch(error => {
          console.error('Error:', error);
        });
    },

    removeItem(key) {
      this.updateQty(key, 0);
    }
  };

  /* ===== Product Form ===== */
  const productForm = {
    init() {
      const form = document.querySelector('[data-product-form]');
      if (!form) return;

      const addButton = form.querySelector('[data-add-to-cart]');
      if (addButton) {
        addButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.addToCart(form);
        });
      }

      this.initVariantSelectors(form);
    },

    initVariantSelectors(form) {
      const variantOptions = form.querySelectorAll('[data-variant-option]');
      variantOptions.forEach(option => {
        option.addEventListener('change', () => {
          this.updateSelectedVariant(form);
        });
      });
    },

    updateSelectedVariant(form) {
      const selectedVariant = form.querySelector('[data-selected-variant]');
      const variantRadios = form.querySelectorAll('[name="variant"]:checked');

      if (selectedVariant && variantRadios.length > 0) {
        selectedVariant.value = variantRadios[0].value;
      }
    },

    addToCart(form) {
      const productId = form.dataset.productId;
      const variantId = form.querySelector('[data-selected-variant]')?.value;
      const qty = form.querySelector('[data-quantity]')?.value || 1;

      if (variantId) {
        cartDrawer.addItem(variantId, parseInt(qty));
      } else {
        const addButton = form.querySelector('[data-add-to-cart]');
        addButton.disabled = true;
        addButton.textContent = 'Sold Out';
      }
    }
  };

  /* ===== Quick View ===== */
  const quickView = {
    init() {
      const quickViewButtons = document.querySelectorAll('[data-quick-view]');
      quickViewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const handle = btn.dataset.handle;
          this.open(handle);
        });
      });

      const closeBtn = document.querySelector('[data-quick-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.quickViewOpen) {
          this.close();
        }
      });
    },

    open(handle) {
      const container = document.querySelector('[data-quick-view-container]');
      if (!container) return;

      container.innerHTML = '<div class="loading">Loading...</div>';

      fetch(`/products/${handle}?view=quick`)
        .then(response => response.text())
        .then(html => {
          container.innerHTML = html;
          this.initProductForm(container);
        })
        .catch(error => {
          container.innerHTML = '<div class="error">Error loading product</div>';
        });

      const modal = document.querySelector('[data-quick-view-modal]');
      if (modal) {
        modal.classList.add('open');
        state.quickViewOpen = true;
        document.body.style.overflow = 'hidden';
      }
    },

    close() {
      const modal = document.querySelector('[data-quick-view-modal]');
      if (modal) {
        modal.classList.remove('open');
        state.quickViewOpen = false;
        document.body.style.overflow = '';
      }
    },

    initProductForm(container) {
      const form = container.querySelector('[data-product-form]');
      if (form) {
        productForm.initVariantSelectors(form);
      }
    }
  };

  /* ===== Search ===== */
  const search = {
    init() {
      const searchIcon = document.querySelector('[data-search-icon]');
      const searchClose = document.querySelector('[data-search-close]');
      const searchInput = document.querySelector('[data-search-input]');

      if (searchIcon) {
        searchIcon.addEventListener('click', () => this.open());
      }
      if (searchClose) {
        searchClose.addEventListener('click', () => this.close());
      }
      if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => this.search(e.target.value), 300));
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.searchOpen) {
          this.close();
        }
      });
    },

    open() {
      const modal = document.querySelector('[data-search-modal]');
      if (modal) {
        modal.classList.add('open');
        state.searchOpen = true;
        const input = modal.querySelector('[data-search-input]');
        if (input) input.focus();
        document.body.style.overflow = 'hidden';
      }
    },

    close() {
      const modal = document.querySelector('[data-search-modal]');
      if (modal) {
        modal.classList.remove('open');
        state.searchOpen = false;
        document.body.style.overflow = '';
      }
    },

    search(query) {
      if (!query || query.length < 2) return;

      fetch(`/search?q=${encodeURIComponent(query)}&type=product`)
        .then(response => response.text())
        .then(html => {
          const results = document.querySelector('[data-search-results]');
          if (results) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const products = doc.querySelectorAll('[data-product-item]');
            results.innerHTML = Array.from(products).map(el => el.outerHTML).join('');
          }
        });
    }
  };

  /* ===== Mobile Menu ===== */
  const mobileMenu = {
    init() {
      const menuToggle = document.querySelector('[data-menu-toggle]');
      if (menuToggle) {
        menuToggle.addEventListener('click', () => this.toggle());
      }

      const closeBtn = document.querySelector('[data-menu-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }
    },

    toggle() {
      const menu = document.querySelector('[data-mobile-menu]');
      if (menu) {
        if (state.mobileMenuOpen) {
          this.close();
        } else {
          menu.classList.add('open');
          state.mobileMenuOpen = true;
          document.body.style.overflow = 'hidden';
        }
      }
    },

    close() {
      const menu = document.querySelector('[data-mobile-menu]');
      if (menu) {
        menu.classList.remove('open');
        state.mobileMenuOpen = false;
        document.body.style.overflow = '';
      }
    }
  };

  /* ===== Language & Currency ===== */
  const languageCurrency = {
    init() {
      const langBtn = document.querySelector('[data-language-toggle]');
      const currBtn = document.querySelector('[data-currency-toggle]');

      if (langBtn) {
        langBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleMenu('language');
        });
      }

      if (currBtn) {
        currBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleMenu('currency');
        });
      }

      document.addEventListener('click', () => {
        this.closeAll();
      });
    },

    toggleMenu(type) {
      const menu = document.querySelector(`.${type}-menu`);
      if (menu) {
        menu.classList.toggle('hidden');
      }
    },

    closeAll() {
      document.querySelectorAll('.language-menu, .currency-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  };

  window.toggleLanguageMenu = function() {
    document.querySelector('.language-menu')?.classList.toggle('hidden');
  };

  window.toggleCurrencyMenu = function() {
    document.querySelector('.currency-menu')?.classList.toggle('hidden');
  };

  /* ===== Newsletter ===== */
  const newsletter = {
    init() {
      const form = document.querySelector('[data-newsletter-form]');
      if (!form) return;

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit(form);
      });
    },

    submit(form) {
      const email = form.querySelector('[data-email]').value;
      const submitBtn = form.querySelector('[data-submit]');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Subscribing...';

      fetch(window.Shopify.routes.root + 'contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `form_typenewsletter&email=${encodeURIComponent(email)}`
      })
        .then(response => response.text())
        .then(() => {
          form.innerHTML = '<p class="success">Thanks for subscribing!</p>';
        })
        .catch(error => {
          submitBtn.disabled = false;
          console.error('Error:', error);
        });
    }
  };

  /* ===== Image Lazy Loading ===== */
  const lazyLoad = {
    init() {
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
          imageObserver.observe(img);
        });
      }
    }
  };

  /* ===== Scroll Animations ===== */
  const scrollAnimations = {
    init() {
      if ('IntersectionObserver' in window) {
        const animationObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-visible');
            }
          });
        }, { threshold: 0.1 });

        document.querySelectorAll('[data-animate]').forEach(el => {
          animationObserver.observe(el);
        });
      }
    }
  };

  /* ===== Countdown Timer ===== */
  const countdownTimer = {
    init() {
      const timers = document.querySelectorAll('[data-countdown]');
      timers.forEach(timer => {
        const endDate = new Date(timer.dataset.countdown).getTime();
        this.update(timer, endDate);
        setInterval(() => this.update(timer, endDate), 1000);
      });
    },

    update(timer, endDate) {
      const now = new Date().getTime();
      const distance = endDate - now;

      if (distance < 0) {
        timer.innerHTML = '<span class="expired">Expired</span>';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      timer.innerHTML = `
        <span>${days}d</span> :
        <span>${hours}h</span> :
        <span>${minutes}m</span> :
        <span>${seconds}s</span>
      `;
    }
  };

  /* ===== Stock Alert ===== */
  const stockAlert = {
    init() {
      const alerts = document.querySelectorAll('[data-stock-alert]');
      alerts.forEach(alert => {
        const max = parseInt(alert.dataset.stockAlert);
        const random = Math.floor(Math.random() * max) + 1;
        alert.textContent = `Only ${random} left!`;
      });
    }
  };

  /* ===== Accordions ===== */
  const accordions = {
    init() {
      const accordionHeaders = document.querySelectorAll('[data-accordion-header]');
      accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
          const content = header.nextElementSibling;
          header.classList.toggle('open');
          if (content) {
            content.style.maxHeight = header.classList.contains('open')
              ? content.scrollHeight + 'px'
              : null;
          }
        });
      });
    }
  };

  /* ===== Tabs ===== */
  const tabs = {
    init() {
      const tabButtons = document.querySelectorAll('[data-tab-button]');
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tabButton;
          this.show(target);
        });
      });
    },

    show(target) {
      document.querySelectorAll('[data-tab-button]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tabButton === target);
      });
      document.querySelectorAll('[data-tab-content]').forEach(content => {
        content.classList.toggle('active', content.dataset.tabContent === target);
      });
    }
  };

  /* ===== Image Gallery ===== */
  const imageGallery = {
    init() {
      const mainImages = document.querySelectorAll('[data-gallery-main]');
      const thumbnails = document.querySelectorAll('[data-gallery-thumb]');

      thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
          const mainImage = mainImages[index];
          if (mainImage) {
            const src = thumb.dataset.src;
            mainImage.src = src;
          }
        });
      });
    }
  };

  /* ===== Initialize ===== */
  document.addEventListener('DOMContentLoaded', () => {
    cartDrawer.init();
    productForm.init();
    quickView.init();
    search.init();
    mobileMenu.init();
    newsletter.init();
    lazyLoad.init();
    scrollAnimations.init();
    countdownTimer.init();
    stockAlert.init();
    accordions.init();
    tabs.init();
    imageGallery.init();
    languageCurrency.init();

    /* Initialize variant selectors on product page */
    productForm.init();
  });

  /* ===== Expose to Window ===== */
  window.vrenyaCart = {
    cart: cartDrawer,
    product: productForm,
    quickView,
    search,
    mobileMenu,
    newsletter
  };

})();