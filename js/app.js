const API_URL = "https://shopsphere-zqm5.onrender.com";
const productGroups = [
    {
        category: "Premium Tech",
        prefix: "tech",
        items: [
            ["MacBook Air M3", 114900, 124900, 4.9, "Apple's thin and light laptop with M3 performance for work, study, and travel.", "images/products/macbook-air-m3.jpg"],
            ["iPhone 16 Pro", 119900, 129900, 4.8, "A premium smartphone built for photos, video, speed, and daily productivity.", "images/products/iphone-16-pro.jpg"],
            ["Sony WH-1000XM5", 29990, 34990, 4.8, "Noise-cancelling wireless headphones for focused listening and travel.", "images/products/sony-wh-1000xm5.jpg"],
            ["Apple Watch Series 10", 49900, 54900, 4.7, "A smart watch for fitness, notifications, health tracking, and everyday use.", "images/products/apple-watch-series-10.jpg"],
            ["Samsung Odyssey G6", 39999, 45999, 4.6, "A high-refresh gaming monitor for smooth play, sharp visuals, and desk setups.", "images/products/samsung-odyssey-g6.jpg"]
        ]
    }
];

const products = productGroups.flatMap((group, groupIndex) =>
    group.items.map(([name, price, oldPrice, rating, description, image], itemIndex) => ({
        id: String(itemIndex + 1),
        name,
        category: group.category,
        price,
        oldPrice,
        rating,
        date: `2026-06-${String(13 - groupIndex).padStart(2, "0")}`,
        image,
        description
    }))
);

const fallbackImage = "images/sections/hero.jpg";
const TAX_RATE = 0.18;

const state = {
    cart: readStorage("shopsphere_cart", []),
    wishlist: readStorage("shopsphere_wishlist", []),
    user: readStorage("shopsphere_user", null),
    theme: localStorage.getItem("shopsphere_theme") || "light",
    filters: {
        search: "",
        category: "All",
        sort: "newest"
    }
};

const main = document.querySelector("#main");
const navPanel = document.querySelector("#navPanel");
const menuToggle = document.querySelector("#menuToggle");
const cartCount = document.querySelector("#cartCount");
const authLink = document.querySelector("#authLink");
const modalRoot = document.querySelector("#modalRoot");

document.querySelector("#year").textContent = new Date().getFullYear();
document.body.classList.toggle("dark", state.theme === "dark");

menuToggle.addEventListener("click", () => {
    const isOpen = navPanel.classList.toggle("open");
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

document.querySelector("#themeToggle").addEventListener("click", () => {
    state.theme = document.body.classList.toggle("dark") ? "dark" : "light";
    localStorage.setItem("shopsphere_theme", state.theme);
    toast(`${state.theme === "dark" ? "Dark" : "Light"} mode enabled`, "success");
});

document.querySelector("#backToTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
document.querySelector("#footerNewsletter").addEventListener("click", () => {
    location.hash = "#/";
    setTimeout(() => document.querySelector("#newsletterEmail")?.focus(), 80);
});

window.addEventListener("scroll", () => {
    document.querySelector("#backToTop").classList.toggle("show", window.scrollY > 420);
});

window.addEventListener("hashchange", renderRoute);
document.addEventListener("click", handleDocumentClick);
document.addEventListener("submit", handleSubmit);
modalRoot.addEventListener("click", (event) => {
    if (event.target === modalRoot || event.target.closest("[data-close-modal]")) closeModal();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
});

renderRoute();
updateHeader();

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}

function getRoute() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const [path, query = ""] = hash.split("?");
    return { path, params: new URLSearchParams(query) };
}

function renderRoute() {
    const { path, params } = getRoute();
    closeMobileMenu();
    if (path === "/products") {
        state.filters.category = params.get("category") || state.filters.category || "All";
        renderProductsPage();
    } else if (path === "/cart") {
        renderCartPage();
    } else if (path === "/login") {
        renderAuthPage("login");
    } else if (path === "/register") {
        renderAuthPage("register");
    } else if (path === "/wishlist") {
        renderWishlistPage();
    } else if (path === "/about") {
        renderAboutPage();
    } else if (path === "/contact") {
        renderContactPage();
    } else {
        renderHomePage();
    }
    updateActiveLinks(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateHeader() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    if (state.user) {
        authLink.textContent = "Logout";
        authLink.href = "#/logout";
    } else {
        authLink.textContent = "Login";
        authLink.href = "#/login";
    }
}

function updateActiveLinks(path) {
    document.querySelectorAll("[data-route]").forEach((link) => {
        link.classList.toggle("active", link.dataset.route === path);
    });
}

function closeMobileMenu() {
    navPanel.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
}

function handleDocumentClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
        if (event.target.closest(".auth-link")?.getAttribute("href") === "#/logout") {
            event.preventDefault();
            logout();
        }
        return;
    }

    const { action, id, category } = button.dataset;
    if (action === "add-cart") addToCart(id, button);
    if (action === "quick-view") openQuickView(id);
    if (action === "wishlist") toggleWishlist(id);
    if (action === "category") {
        location.hash = `#/products?category=${encodeURIComponent(category)}`;
    }
    if (action === "increase") changeQuantity(id, 1);
    if (action === "decrease") changeQuantity(id, -1);
    if (action === "remove") removeFromCart(id);
    if (action === "checkout") checkout(button);
    if (action === "clear-filters") {
        state.filters = { search: "", category: "All", sort: "newest" };
        renderProductsPage();
    }
}

function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (form.id === "loginForm") login(form);
    if (form.id === "registerForm") register(form);
    if (form.id === "newsletterForm") subscribeNewsletter(form);
    if (form.id === "contactForm") submitContact(form);
}

function imageHtml(product, className = "") {
    return `<img class="${className}" src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}';">`;
}

function productCard(product) {
    const wished = state.wishlist.includes(product.id);
    return `
        <article class="product-card">
            <button class="icon-button wishlist-btn ${wished ? "active" : ""}" type="button" data-action="wishlist" data-id="${product.id}" aria-label="${wished ? "Remove from" : "Add to"} wishlist">&hearts;</button>
            <div class="product-image">${imageHtml(product)}</div>
            <div class="product-body">
                <div class="product-meta">
                    <span class="badge">${product.category}</span>
                    <span class="rating">&starf; ${product.rating}</span>
                </div>
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="price-row">
                    <span class="price">${formatCurrency(product.price)}</span>
                    <span class="old-price">${formatCurrency(product.oldPrice)}</span>
                </div>
                <div class="card-actions">
                    <button class="button" type="button" data-action="add-cart" data-id="${product.id}">Add to Cart</button>
                    <button class="button button-secondary" type="button" data-action="quick-view" data-id="${product.id}">Quick View</button>
                </div>
            </div>
        </article>
    `;
}

function renderHomePage() {
    const featured = products.map(productCard).join("");
    main.innerHTML = `
        <section class="page hero">
            <div class="hero-copy">
                <p class="eyebrow">Premium technology</p>
                <h1>Apple, Sony, and Samsung essentials in one clean store.</h1>
                <p>Shop 5 selected products with quick search, saved favorites, and a cart that remembers your picks.</p>
                <div class="hero-actions">
                    <a class="button" href="#/products">Explore Products</a>
                    <a class="button button-outline" href="#/wishlist">View Wishlist</a>
                </div>
                <div class="stats-grid" aria-label="Store highlights">
                    <div class="stat-card"><strong>5</strong><span>Products only</span></div>
                    <div class="stat-card"><strong>3</strong><span>Top tech brands</span></div>
                    <div class="stat-card"><strong>Fast</strong><span>Search and cart</span></div>
                </div>
            </div>
            <div class="hero-media">
                <img src="images/sections/frontpage-tech-shopping.jpg" alt="Online shopping boxes on a laptop keyboard" onerror="this.onerror=null;this.src='${fallbackImage}';">
            </div>
        </section>
        <section class="page section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Featured picks</p>
                    <h2>Popular right now</h2>
                </div>
                <a class="button button-outline" href="#/products">Shop all</a>
            </div>
            <div class="product-grid">${featured}</div>
            ${newsletterBlock()}
        </section>
    `;
}

function renderProductsPage() {
    const categories = ["All", ...new Set(products.map(product => product.category))];
    const list = getFilteredProducts();
    main.innerHTML = `
        <section class="page">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Product catalog</p>
                    <h1>Find your next favorite product</h1>
                    <p>Search instantly, filter by category, sort by price or newest arrivals, and preview details before adding to cart.</p>
                </div>
            </div>
            <div class="controls" role="search">
                <div class="field">
                    <label for="searchInput">Search products</label>
                    <input id="searchInput" type="search" value="${state.filters.search}" placeholder="Search MacBook, iPhone, Sony, Watch, Samsung..." autocomplete="off">
                </div>
                <div class="field">
                    <label for="categorySelect">Category</label>
                    <select id="categorySelect">
                        ${categories.map(category => `<option value="${category}" ${state.filters.category === category ? "selected" : ""}>${category}</option>`).join("")}
                    </select>
                </div>
                <div class="field">
                    <label for="sortSelect">Sort by</label>
                    <select id="sortSelect">
                        <option value="newest" ${state.filters.sort === "newest" ? "selected" : ""}>Newest</option>
                        <option value="price-low" ${state.filters.sort === "price-low" ? "selected" : ""}>Price: Low to High</option>
                        <option value="price-high" ${state.filters.sort === "price-high" ? "selected" : ""}>Price: High to Low</option>
                    </select>
                </div>
            </div>
            <div class="filter-row">
                <strong>${list.length} ${list.length === 1 ? "product" : "products"} found</strong>
                <button class="text-button" type="button" data-action="clear-filters">Clear filters</button>
            </div>
            <div id="productResults" class="${list.length ? "product-grid" : ""}">
                ${list.length ? list.map(productCard).join("") : emptyState("No Products Found", "Try a different search term, category, or sorting option.")}
            </div>
        </section>
    `;

    document.querySelector("#searchInput").addEventListener("input", (event) => {
        state.filters.search = event.target.value;
        renderProductsPage();
        document.querySelector("#searchInput")?.focus();
    });
    document.querySelector("#categorySelect").addEventListener("change", (event) => {
        state.filters.category = event.target.value;
        renderProductsPage();
    });
    document.querySelector("#sortSelect").addEventListener("change", (event) => {
        state.filters.sort = event.target.value;
        renderProductsPage();
    });
}

function getFilteredProducts() {
    const search = state.filters.search.trim().toLowerCase();
    return products
        .filter(product => state.filters.category === "All" || product.category === state.filters.category)
        .filter(product => !search || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(search))
        .sort((a, b) => {
            if (state.filters.sort === "price-low") return a.price - b.price;
            if (state.filters.sort === "price-high") return b.price - a.price;
            return new Date(b.date) - new Date(a.date);
        });
}

function renderCartPage() {
    const items = state.cart.map(item => ({ ...item, product: products.find(product => product.id === item.id) })).filter(item => item.product);
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const shipping = subtotal > 0 && subtotal < 5000 ? 149 : 0;
    const total = subtotal + tax + shipping;

    main.innerHTML = `
        <section class="page">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Shopping cart</p>
                    <h1>Your cart</h1>
                    <p>Review quantities, remove items, and see totals update automatically.</p>
                </div>
            </div>
            ${items.length ? `
                <div class="cart-layout">
                    <div class="cart-list">
                        ${items.map(({ product, quantity }) => `
                            <article class="cart-item">
                                ${imageHtml(product)}
                                <div>
                                    <span class="badge">${product.category}</span>
                                    <h3>${product.name}</h3>
                                    <p>${formatCurrency(product.price)} each</p>
                                </div>
                                <div class="cart-row">
                                    <div class="quantity-control" aria-label="Quantity for ${product.name}">
                                        <button class="quantity-button" type="button" data-action="decrease" data-id="${product.id}" aria-label="Decrease quantity">&minus;</button>
                                        <strong>${quantity}</strong>
                                        <button class="quantity-button" type="button" data-action="increase" data-id="${product.id}" aria-label="Increase quantity">+</button>
                                    </div>
                                    <strong>${formatCurrency(product.price * quantity)}</strong>
                                    <button class="text-button" type="button" data-action="remove" data-id="${product.id}">Remove</button>
                                </div>
                            </article>
                        `).join("")}
                    </div>
                    <aside class="summary-card" aria-label="Order summary">
                        <h2>Order summary</h2>
                        <div class="summary-line"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
                        <div class="summary-line"><span>Tax (18%)</span><strong>${formatCurrency(tax)}</strong></div>
                        <div class="summary-line"><span>Shipping</span><strong>${shipping ? formatCurrency(shipping) : "Free"}</strong></div>
                        <div class="summary-total"><span>Total</span><span>${formatCurrency(total)}</span></div>
                        <button class="button" type="button" data-action="checkout">Checkout</button>
                    </aside>
                </div>
            ` : emptyState("Your cart is empty", "Add a few products to see your order summary here.", "Browse products", "#/products")}
        </section>
    `;
}

function renderWishlistPage() {
    const wished = products.filter(product => state.wishlist.includes(product.id));
    main.innerHTML = `
        <section class="page">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Saved items</p>
                    <h1>Your wishlist</h1>
                    <p>Keep track of favorite products and move them to cart when ready.</p>
                </div>
            </div>
            ${wished.length ? `<div class="product-grid">${wished.map(productCard).join("")}</div>` : emptyState("No favorites yet", "Tap the heart on any product to save it here.", "Explore products", "#/products")}
        </section>
    `;
}

function renderAuthPage(mode) {
    const isLogin = mode === "login";
    main.innerHTML = `
        <section class="page auth-wrap">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">${isLogin ? "Welcome back" : "Create account"}</p>
                    <h1>${isLogin ? "Login to continue shopping" : "Register for faster checkout"}</h1>
                    <p>Authentication is stored locally for this static demo, including validation and logout behavior.</p>
                    <div class="chip-row">
                        <span class="chip">Persistent cart</span>
                        <span class="chip">Saved wishlist</span>
                        <span class="chip">Local account state</span>
                    </div>
                </div>
            </div>
            <form class="auth-card" id="${isLogin ? "loginForm" : "registerForm"}" novalidate>
                <h2>${isLogin ? "Login" : "Register"}</h2>
                <div class="message" id="formMessage"></div>
                ${!isLogin ? `
                    <div class="field">
                        <label for="name">Full name</label>
                        <input id="name" name="name" type="text" autocomplete="name" placeholder="Aarav Sharma">
                        <span class="field-error" data-error-for="name"></span>
                    </div>
                ` : ""}
                <div class="field">
                    <label for="email">Email address</label>
                    <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com">
                    <span class="field-error" data-error-for="email"></span>
                </div>
                <div class="field">
                    <label for="password">Password</label>
                    <input id="password" name="password" type="password" autocomplete="${isLogin ? "current-password" : "new-password"}" placeholder="At least 8 characters">
                    <span class="field-error" data-error-for="password"></span>
                </div>
                <div class="form-actions">
                    <button class="button" type="submit">${isLogin ? "Login" : "Create account"}</button>
                    <a class="button button-outline" href="${isLogin ? "#/register" : "#/login"}">${isLogin ? "Create account" : "I have an account"}</a>
                </div>
            </form>
        </section>
    `;
}

function renderAboutPage() {
    main.innerHTML = `
        <section class="page">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">About ShopSphere</p>
                    <h1>Designed for confident everyday shopping</h1>
                    <p>ShopSphere is a production-style static e-commerce experience with polished product discovery, account flows, and cart interactions.</p>
                </div>
            </div>
            <div class="feature-grid">
                <article class="info-card"><h3>Curated catalog</h3><p>Products include categories, prices, ratings, descriptions, and resilient image handling.</p></article>
                <article class="info-card"><h3>Fast interactions</h3><p>Search, filters, cart, wishlist, and route changes update instantly in the browser.</p></article>
                <article class="info-card"><h3>Responsive design</h3><p>The layout adapts cleanly across phone, tablet, and desktop screens.</p></article>
            </div>
            ${newsletterBlock()}
        </section>
    `;
}

function renderContactPage() {
    main.innerHTML = `
        <section class="page contact-layout">
            <div>
                <div class="section-heading">
                    <div>
                        <p class="eyebrow">Contact</p>
                        <h1>We are here to help</h1>
                        <p>Send a message and the form will validate your input before showing confirmation.</p>
                    </div>
                </div>
                <form class="auth-card" id="contactForm" novalidate>
                    <div class="message" id="formMessage"></div>
                    <div class="field">
                        <label for="contactName">Name</label>
                        <input id="contactName" name="name" type="text" placeholder="Your name">
                        <span class="field-error" data-error-for="name"></span>
                    </div>
                    <div class="field">
                        <label for="contactEmail">Email</label>
                        <input id="contactEmail" name="email" type="email" placeholder="you@example.com">
                        <span class="field-error" data-error-for="email"></span>
                    </div>
                    <div class="field">
                        <label for="message">Message</label>
                        <textarea id="message" name="message" placeholder="How can we help?"></textarea>
                        <span class="field-error" data-error-for="message"></span>
                    </div>
                    <button class="button" type="submit">Send Message</button>
                </form>
            </div>
            <aside class="summary-card">
                <h2>Support details</h2>
                <div class="summary-line"><span>Email</span><strong>support@shopsphere.example</strong></div>
                <div class="summary-line"><span>Phone</span><strong>7820870530</strong></div>
                <div class="summary-line"><span>Hours</span><strong>Mon-Sat</strong></div>
                <p>For order questions, include your email and product name so support can respond quickly.</p>
            </aside>
        </section>
    `;
}

function newsletterBlock() {
    return `
        <section class="newsletter-band" aria-label="Newsletter subscription">
            <div>
                <h2>Get launch offers first</h2>
                <p>Subscribe for product drops, price alerts, and member-only deals.</p>
            </div>
            <form id="newsletterForm" novalidate>
                <div class="field">
                    <label for="newsletterEmail">Email address</label>
                    <input id="newsletterEmail" name="email" type="email" placeholder="you@example.com">
                    <span class="field-error" data-error-for="email"></span>
                </div>
                <button class="button" type="submit">Subscribe</button>
            </form>
        </section>
    `;
}

function emptyState(title, text, cta, href) {
    return `
        <div class="empty-state">
            <h2>${title}</h2>
            <p>${text}</p>
            ${cta ? `<div class="section-actions center-actions"><a class="button" href="${href}">${cta}</a></div>` : ""}
        </div>
    `;
}

function addToCart(id, button) {
    const product = products.find(item => item.id === id);
    if (!product) {
        toast("Product is unavailable", "error");
        return;
    }
    setLoading(button, true);
    setTimeout(() => {
        const existing = state.cart.find(item => item.id === id);
        if (existing) existing.quantity += 1;
        else state.cart.push({ id, quantity: 1 });
        writeStorage("shopsphere_cart", state.cart);
        updateHeader();
        setLoading(button, false);
        toast(`${product.name} added to cart`, "success");
        if (getRoute().path === "/cart") renderCartPage();
    }, 260);
}

function changeQuantity(id, delta) {
    const item = state.cart.find(cartItem => cartItem.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        state.cart = state.cart.filter(cartItem => cartItem.id !== id);
        toast("Item removed from cart", "success");
    }
    writeStorage("shopsphere_cart", state.cart);
    updateHeader();
    renderCartPage();
}

function removeFromCart(id) {
    state.cart = state.cart.filter(item => item.id !== id);
    writeStorage("shopsphere_cart", state.cart);
    updateHeader();
    toast("Item removed from cart", "success");
    renderCartPage();
}

function toggleWishlist(id) {
    const product = products.find(item => item.id === id);
    if (!product) return;
    if (state.wishlist.includes(id)) {
        state.wishlist = state.wishlist.filter(item => item !== id);
        toast(`${product.name} removed from wishlist`, "success");
    } else {
        state.wishlist.push(id);
        toast(`${product.name} saved to wishlist`, "success");
    }
    writeStorage("shopsphere_wishlist", state.wishlist);
    renderRoute();
}

function checkout(button) {
    if (!state.user) {
        toast("Login before checkout", "error");
        location.hash = "#/login";
        return;
    }
    setLoading(button, true);
    setTimeout(() => {
        state.cart = [];
        writeStorage("shopsphere_cart", state.cart);
        updateHeader();
        toast("Order placed successfully", "success");
        renderCartPage();
    }, 500);
}

function openQuickView(id) {
    const product = products.find(item => item.id === id);
    if (!product) return;
    const wished = state.wishlist.includes(id);
    modalRoot.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="quickViewTitle">
            <button class="icon-button modal-close" type="button" data-close-modal aria-label="Close quick view">&times;</button>
            <div class="quick-view">
                ${imageHtml(product)}
                <div class="quick-view-body">
                    <span class="badge">${product.category}</span>
                    <h2 id="quickViewTitle">${product.name}</h2>
                    <p>${product.description}</p>
                    <div class="price-row">
                        <span class="price">${formatCurrency(product.price)}</span>
                        <span class="rating">&starf; ${product.rating}</span>
                    </div>
                    <div class="chip-row">
                        <span class="chip">Free returns</span>
                        <span class="chip">Secure checkout</span>
                        <span class="chip">Fast dispatch</span>
                    </div>
                    <div class="form-actions">
                        <button class="button" type="button" data-action="add-cart" data-id="${product.id}">Add to Cart</button>
                        <button class="button button-outline" type="button" data-action="wishlist" data-id="${product.id}">${wished ? "Remove Favorite" : "Save Favorite"}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    modalRoot.classList.add("show");
    modalRoot.setAttribute("aria-hidden", "false");
    modalRoot.querySelector(".modal-close").focus();
}

function closeModal() {
    modalRoot.classList.remove("show");
    modalRoot.setAttribute("aria-hidden", "true");
    modalRoot.innerHTML = "";
}

function setLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle("loading", isLoading);
    button.disabled = isLoading;
}

function login(form) {
    const values = Object.fromEntries(new FormData(form));
    clearErrors(form);
    const errors = validateAuth(values);
    if (Object.keys(errors).length) {
        showErrors(form, errors);
        showMessage("Please fix the highlighted fields.", "error");
        return;
    }
    state.user = { email: values.email.trim(), name: values.email.split("@")[0] };
    writeStorage("shopsphere_user", state.user);
    updateHeader();
    showMessage("Login successful. Redirecting to products...", "success");
    toast("Logged in successfully", "success");
    setTimeout(() => location.hash = "#/products", 550);
}

async function register(form) {
    const values = Object.fromEntries(new FormData(form));

    try {
        const response = await fetch(
            "https://shopsphere-zqm5.onrender.com/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: values.name,
                    email: values.email,
                    password: values.password
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            alert("Registration Successful!");
            location.hash = "#/login";
        } else {
            alert(data.detail || "Registration Failed");
        }
    } catch (error) {
        console.error(error);
        alert("Server Error");
    }
}
}

function logout() {
    state.user = null;
    localStorage.removeItem("shopsphere_user");
    updateHeader();
    toast("Logged out", "success");
    location.hash = "#/";
}

function validateAuth(values, requireName = false) {
    const errors = {};
    if (requireName && !values.name?.trim()) errors.name = "Enter your full name.";
    if (!isValidEmail(values.email)) errors.email = "Enter a valid email address.";
    if (!values.password || values.password.length < 8) errors.password = "Password must be at least 8 characters.";
    return errors;
}

function subscribeNewsletter(form) {
    const values = Object.fromEntries(new FormData(form));
    clearErrors(form);
    if (!isValidEmail(values.email)) {
        showErrors(form, { email: "Enter a valid email address." });
        toast("Newsletter email is invalid", "error");
        return;
    }
    localStorage.setItem("shopsphere_newsletter", values.email.trim());
    form.reset();
    toast("Subscribed to newsletter", "success");
}

function submitContact(form) {
    const values = Object.fromEntries(new FormData(form));
    clearErrors(form);
    const errors = {};
    if (!values.name?.trim()) errors.name = "Enter your name.";
    if (!isValidEmail(values.email)) errors.email = "Enter a valid email address.";
    if (!values.message?.trim() || values.message.trim().length < 12) errors.message = "Message must be at least 12 characters.";
    if (Object.keys(errors).length) {
        showErrors(form, errors);
        showMessage("Please fix the highlighted fields.", "error");
        return;
    }
    form.reset();
    showMessage("Message sent successfully.", "success");
    toast("Message sent", "success");
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach(error => error.textContent = "");
    form.querySelectorAll("input, textarea").forEach(input => input.removeAttribute("aria-invalid"));
}

function showErrors(form, errors) {
    Object.entries(errors).forEach(([name, message]) => {
        const field = form.elements[name];
        const target = form.querySelector(`[data-error-for="${name}"]`);
        if (target) target.textContent = message;
        if (field) field.setAttribute("aria-invalid", "true");
    });
}

function showMessage(text, type) {
    const message = document.querySelector("#formMessage");
    if (!message) return;
    message.className = `message show ${type}`;
    message.textContent = text;
}

function toast(text, type = "success") {
    const region = document.querySelector("#toastRegion");
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = text;
    region.appendChild(item);
    setTimeout(() => item.remove(), 3200);
}
