const API_BASE = "/api/v1";

const state = {
  adminOrders: [],
  adminOrderQuery: "",
  adminOrderStatus: "",
  adminTab: "products",
  adminUserQuery: "",
  adminUserRole: "",
  adminUsers: [],
  authMode: "login",
  cart: null,
  category: "",
  orders: [],
  products: [],
  query: "",
  selectedProductId: "",
  token: localStorage.getItem("clicky_token") || "",
  user: null,
  view: "store",
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  boot();
});

function cacheElements() {
  Object.assign(els, {
    accountName: document.querySelector("#accountName"),
    adminNav: document.querySelector("#adminNav"),
    adminOrderQuery: document.querySelector("#adminOrderQuery"),
    adminOrderStatus: document.querySelector("#adminOrderStatus"),
    adminOrdersPanel: document.querySelector("#adminOrdersPanel"),
    adminOrdersTable: document.querySelector("#adminOrdersTable"),
    adminProductsPanel: document.querySelector("#adminProductsPanel"),
    adminProductsTable: document.querySelector("#adminProductsTable"),
    adminUserQuery: document.querySelector("#adminUserQuery"),
    adminUserRole: document.querySelector("#adminUserRole"),
    adminUsersPanel: document.querySelector("#adminUsersPanel"),
    adminUsersTable: document.querySelector("#adminUsersTable"),
    authDialog: document.querySelector("#authDialog"),
    authEmail: document.querySelector("#authEmail"),
    authForm: document.querySelector("#authForm"),
    authName: document.querySelector("#authName"),
    authPassword: document.querySelector("#authPassword"),
    authTitle: document.querySelector("#authTitle"),
    cartContent: document.querySelector("#cartContent"),
    cartCount: document.querySelector("#cartCount"),
    cartSummary: document.querySelector("#cartSummary"),
    closeAuth: document.querySelector("#closeAuth"),
    loginButton: document.querySelector("#loginButton"),
    logoutButton: document.querySelector("#logoutButton"),
    nameField: document.querySelector("#nameField"),
    ordersContent: document.querySelector("#ordersContent"),
    ordersSummary: document.querySelector("#ordersSummary"),
    productCategory: document.querySelector("#productCategory"),
    productCurrency: document.querySelector("#productCurrency"),
    productDescription: document.querySelector("#productDescription"),
    productDetail: document.querySelector("#productDetail"),
    productDpi: document.querySelector("#productDpi"),
    productForm: document.querySelector("#productForm"),
    productGrid: document.querySelector("#productGrid"),
    productId: document.querySelector("#productId"),
    productImageUrl: document.querySelector("#productImageUrl"),
    productName: document.querySelector("#productName"),
    productPrice: document.querySelector("#productPrice"),
    productSlug: document.querySelector("#productSlug"),
    productStock: document.querySelector("#productStock"),
    productWireless: document.querySelector("#productWireless"),
    productErgonomic: document.querySelector("#productErgonomic"),
    searchInput: document.querySelector("#searchInput"),
    storeSummary: document.querySelector("#storeSummary"),
    toast: document.querySelector("#toast"),
  });
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.category === state.category);
      });
      loadProducts();
    });
  });

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminTab = button.dataset.adminTab;
      renderAdmin();
    });
  });

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim();
    loadProducts();
  });

  els.loginButton.addEventListener("click", () => openAuth("login"));
  els.logoutButton.addEventListener("click", logout);
  els.closeAuth.addEventListener("click", () => els.authDialog.close());
  els.authForm.addEventListener("submit", submitAuth);
  els.productGrid.addEventListener("click", handleProductClick);
  els.productDetail.addEventListener("click", handleProductClick);
  els.cartContent.addEventListener("click", handleCartClick);
  els.ordersContent.addEventListener("click", handleOrderClick);
  els.productForm.addEventListener("submit", submitProductForm);
  document.querySelector("#clearProductForm").addEventListener("click", clearProductForm);
  els.adminProductsTable.addEventListener("click", handleAdminProductClick);
  els.adminUsersTable.addEventListener("click", handleAdminUserClick);
  document.addEventListener("error", handleProductImageError, true);

  els.adminOrderStatus.addEventListener("change", () => {
    state.adminOrderStatus = els.adminOrderStatus.value;
    renderAdminOrders();
  });
  els.adminOrderQuery.addEventListener("input", () => {
    state.adminOrderQuery = els.adminOrderQuery.value.trim().toLowerCase();
    renderAdminOrders();
  });
  els.adminUserRole.addEventListener("change", () => {
    state.adminUserRole = els.adminUserRole.value;
    renderAdminUsers();
  });
  els.adminUserQuery.addEventListener("input", () => {
    state.adminUserQuery = els.adminUserQuery.value.trim().toLowerCase();
    renderAdminUsers();
  });
}

async function boot() {
  try {
    await loadProducts();
    if (state.token) {
      await loadSession();
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    render();
  }
}

async function loadSession() {
  try {
    const data = await apiRequest("/me");
    state.user = data.user;
    await Promise.all([loadCart(), loadOrders()]);
    if (isAdmin()) {
      await loadAdminData();
    }
  } catch (error) {
    localStorage.removeItem("clicky_token");
    state.token = "";
    state.user = null;
    state.cart = null;
    state.orders = [];
    showToast("Session expired");
  }
}

async function apiRequest(path, options = {}) {
  const headers = {};
  const init = {
    method: options.method || "GET",
    headers,
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, init);
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (state.category) {
    params.set("category", state.category);
  }
  if (state.query) {
    params.set("q", state.query);
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await apiRequest(`/products${suffix}`);
  state.products = data.products || [];

  if (!state.products.some((product) => product.id === state.selectedProductId)) {
    state.selectedProductId = state.products[0]?.id || "";
  }

  renderProducts();
  renderProductDetail();
  renderAdminProducts();
}

async function loadCart() {
  if (!state.token) {
    state.cart = null;
    return;
  }

  const data = await apiRequest("/cart");
  state.cart = data.cart;
  renderCart();
  renderShell();
}

async function loadOrders() {
  if (!state.token) {
    state.orders = [];
    return;
  }

  const data = await apiRequest("/orders");
  state.orders = data.orders || [];
  renderOrders();
}

async function loadAdminData() {
  if (!isAdmin()) {
    return;
  }

  const [ordersData, usersData] = await Promise.all([
    apiRequest("/admin/orders"),
    apiRequest("/admin/users"),
  ]);
  state.adminOrders = ordersData.orders || [];
  state.adminUsers = usersData.users || [];
  renderAdmin();
}

function render() {
  renderShell();
  renderProducts();
  renderProductDetail();
  renderCart();
  renderOrders();
  renderAdmin();
  showView();
}

function renderShell() {
  if (state.view === "admin" && !isAdmin()) {
    state.view = "store";
  }

  els.accountName.textContent = state.user ? state.user.name : "Guest";
  els.loginButton.classList.toggle("is-hidden", Boolean(state.user));
  els.logoutButton.classList.toggle("is-hidden", !state.user);
  els.adminNav.classList.toggle("is-hidden", !isAdmin());
  els.cartCount.textContent = String(cartItemCount());

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function renderProducts() {
  if (!els.productGrid) {
    return;
  }

  els.storeSummary.textContent = productSummaryText();
  if (state.products.length === 0) {
    els.productGrid.innerHTML = `<div class="empty-state">No products found.</div>`;
    return;
  }

  els.productGrid.innerHTML = state.products.map(productCardTemplate).join("");
}

function renderProductDetail() {
  const product = selectedProduct();
  if (!product) {
    els.productDetail.innerHTML = `<div class="empty-state">No product selected.</div>`;
    return;
  }

  els.productDetail.innerHTML = `
    ${productMediaTemplate(product, "detail-media")}
    <div class="detail-body">
      <div class="detail-title-row">
        <div>
          <p class="eyebrow">${escapeHTML(product.category)}</p>
          <h2>${escapeHTML(product.name)}</h2>
        </div>
        ${stockBadgeTemplate(product.stock)}
      </div>
      <p>${escapeHTML(product.description)}</p>
      <dl class="detail-specs">
        <div><dt>Price</dt><dd>${formatMoney(product.priceCents, product.currency)}</dd></div>
        <div><dt>Sensor</dt><dd>${product.dpi.toLocaleString()} DPI</dd></div>
        <div><dt>Connection</dt><dd>${escapeHTML(connectionLabel(product))}</dd></div>
        <div><dt>Shape</dt><dd>${product.ergonomic ? "Ergonomic" : "Compact"}</dd></div>
      </dl>
      <div class="detail-actions">
        <button class="button" type="button" data-action="add-cart" data-product-id="${escapeAttr(product.id)}" ${product.stock <= 0 ? "disabled" : ""}>Add to cart</button>
        <span class="stock-note">${product.stock <= 0 ? "Out of stock" : `${product.stock} available`}</span>
      </div>
    </div>
  `;
}

function renderCart() {
  els.cartSummary.textContent = cartSummaryText();

  if (!state.user) {
    els.cartContent.innerHTML = `
      <div class="empty-state">
        <p>Log in to manage your cart.</p>
        <button class="button" type="button" data-action="open-login">Log in</button>
      </div>
    `;
    return;
  }

  const items = state.cart?.items || [];
  if (items.length === 0) {
    els.cartContent.innerHTML = `<div class="empty-state">Your cart is empty.</div>`;
    return;
  }

  els.cartContent.innerHTML = `
    <div class="cart-list">
      ${items.map((line) => `
        <article class="cart-line">
          ${productMediaTemplate(line.product, "cart-media")}
          <div class="cart-item-copy">
            <h3>${escapeHTML(line.product.name)}</h3>
            <p class="stock">${formatMoney(line.product.priceCents, line.product.currency)} each</p>
          </div>
          <div class="quantity-control" aria-label="Quantity for ${escapeAttr(line.product.name)}">
            <button type="button" data-action="cart-decrement" data-product-id="${escapeAttr(line.product.id)}">-</button>
            <span>${line.quantity}</span>
            <button type="button" data-action="cart-increment" data-product-id="${escapeAttr(line.product.id)}">+</button>
          </div>
          <div class="line-actions">
            <strong>${formatMoney(line.subtotalCents, state.cart.currency)}</strong>
            <button class="button button-secondary" type="button" data-action="cart-remove" data-product-id="${escapeAttr(line.product.id)}">Remove</button>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="cart-summary">
      <div>
        <p class="eyebrow">Total</p>
        <div class="price">${formatMoney(state.cart.totalCents, state.cart.currency)}</div>
      </div>
      <div class="checkout-controls">
        <label>Payment
          <select id="paymentMethod">
            <option value="simulation">Simulation</option>
            <option value="card-demo">Card demo</option>
            <option value="bank-transfer-demo">Bank transfer demo</option>
          </select>
        </label>
        <button class="button" type="button" data-action="checkout">Place order</button>
      </div>
    </div>
  `;
}

function renderOrders() {
  els.ordersSummary.textContent = orderSummaryText();

  if (!state.user) {
    els.ordersContent.innerHTML = `<div class="empty-state">Log in to view orders.</div>`;
    return;
  }

  if (state.orders.length === 0) {
    els.ordersContent.innerHTML = `<div class="empty-state">No orders yet.</div>`;
    return;
  }

  els.ordersContent.innerHTML = state.orders.map((order) => orderCard(order)).join("");
}

function renderAdmin() {
  if (!isAdmin()) {
    return;
  }

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === state.adminTab);
  });

  els.adminProductsPanel.classList.toggle("is-hidden", state.adminTab !== "products");
  els.adminOrdersPanel.classList.toggle("is-hidden", state.adminTab !== "orders");
  els.adminUsersPanel.classList.toggle("is-hidden", state.adminTab !== "users");
  renderAdminProducts();
  renderAdminOrders();
  renderAdminUsers();
}

function renderAdminProducts() {
  if (!els.adminProductsTable || !isAdmin()) {
    return;
  }

  if (state.products.length === 0) {
    els.adminProductsTable.innerHTML = `<div class="empty-state">No products found.</div>`;
    return;
  }

  els.adminProductsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${state.products.map((product) => `
          <tr>
            <td>
              <div class="table-product">
                ${productMediaTemplate(product, "table-media")}
                <div><strong>${escapeHTML(product.name)}</strong><br><span class="stock">${escapeHTML(product.slug)}</span></div>
              </div>
            </td>
            <td>${badgeTemplate(product.category)}</td>
            <td>${formatMoney(product.priceCents, product.currency)}</td>
            <td>${stockBadgeTemplate(product.stock)}</td>
            <td>
              <div class="admin-row-actions">
                <button class="button button-secondary" type="button" data-action="edit-product" data-product-id="${escapeAttr(product.id)}">Edit</button>
                <button class="button button-secondary" type="button" data-action="delete-product" data-product-id="${escapeAttr(product.id)}">Delete</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminOrders() {
  if (!isAdmin()) {
    return;
  }

  const orders = filteredAdminOrders();
  if (orders.length === 0) {
    els.adminOrdersTable.innerHTML = `<div class="empty-state">No orders yet.</div>`;
    return;
  }

  els.adminOrdersTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th>User</th>
          <th>Total</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map((order) => `
          <tr>
            <td><strong>${escapeHTML(order.id)}</strong><br><span class="stock">${order.items.length} item(s)</span></td>
            <td>${escapeHTML(order.userId)}</td>
            <td>${formatMoney(order.totalCents, order.currency)}</td>
            <td>${statusBadgeTemplate(order.status)} ${statusBadgeTemplate(order.paymentStatus, "payment")}</td>
            <td>${formatDate(order.createdAt)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminUsers() {
  if (!isAdmin()) {
    return;
  }

  const users = filteredAdminUsers();
  if (users.length === 0) {
    els.adminUsersTable.innerHTML = `<div class="empty-state">No users found.</div>`;
    return;
  }

  els.adminUsersTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>User</th>
          <th>Role</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((user) => `
          <tr>
            <td><strong>${escapeHTML(user.name)}</strong><br><span class="stock">${escapeHTML(user.email)}</span></td>
            <td>
              <select data-user-role="${escapeAttr(user.id)}">
                <option value="customer" ${user.role === "customer" ? "selected" : ""}>Customer</option>
                <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
              </select>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
              <button class="button button-secondary" type="button" data-action="save-user-role" data-user-id="${escapeAttr(user.id)}">Save</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function showView() {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-hidden", view.id !== `${state.view}View`);
  });
  renderShell();
}

function setView(view) {
  if (view === "admin" && !isAdmin()) {
    showToast("Admin access required");
    return;
  }
  state.view = view;
  showView();
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === mode);
  });
  els.nameField.classList.toggle("is-hidden", mode !== "register");
  els.authTitle.textContent = mode === "register" ? "Register" : "Log in";
  els.authPassword.autocomplete = mode === "register" ? "new-password" : "current-password";
}

function openAuth(mode = "login") {
  setAuthMode(mode);
  els.authForm.reset();
  els.authDialog.showModal();
  setTimeout(() => (mode === "register" ? els.authName : els.authEmail).focus(), 20);
}

async function submitAuth(event) {
  event.preventDefault();

  const isRegister = state.authMode === "register";
  const body = {
    email: els.authEmail.value.trim(),
    password: els.authPassword.value,
  };
  if (isRegister) {
    body.name = els.authName.value.trim();
  }

  try {
    const data = await apiRequest(isRegister ? "/auth/register" : "/auth/login", {
      method: "POST",
      body,
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("clicky_token", state.token);
    els.authDialog.close();
    await Promise.all([loadCart(), loadOrders()]);
    if (isAdmin()) {
      await loadAdminData();
    }
    render();
    showToast(isRegister ? "Account created" : "Logged in");
  } catch (error) {
    showToast(error.message);
  }
}

function logout() {
  localStorage.removeItem("clicky_token");
  Object.assign(state, {
    adminOrders: [],
    adminUsers: [],
    cart: null,
    orders: [],
    token: "",
    user: null,
    view: "store",
  });
  render();
  showToast("Logged out");
}

function handleProductClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const productId = button.dataset.productId;
  if (button.dataset.action === "view-product") {
    state.selectedProductId = productId;
    renderProducts();
    renderProductDetail();
  }
  if (button.dataset.action === "add-cart") {
    addToCart(productId);
  }
}

async function addToCart(productId) {
  if (!state.user) {
    openAuth("login");
    return;
  }

  try {
    const data = await apiRequest("/cart/items", {
      method: "POST",
      body: { productId, quantity: 1 },
    });
    state.cart = data.cart;
    renderCart();
    renderShell();
    showToast("Added to cart");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleCartClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  if (button.dataset.action === "open-login") {
    openAuth("login");
    return;
  }

  if (button.dataset.action === "checkout") {
    await checkout();
    return;
  }

  const productId = button.dataset.productId;
  const line = state.cart?.items.find((item) => item.product.id === productId);
  if (!line) {
    return;
  }

  if (button.dataset.action === "cart-increment") {
    await setCartQuantity(productId, line.quantity + 1);
  }
  if (button.dataset.action === "cart-decrement") {
    await setCartQuantity(productId, line.quantity - 1);
  }
  if (button.dataset.action === "cart-remove") {
    await removeCartItem(productId);
  }
}

async function setCartQuantity(productId, quantity) {
  try {
    if (quantity <= 0) {
      await removeCartItem(productId);
      return;
    }
    const data = await apiRequest(`/cart/items/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: { quantity },
    });
    state.cart = data.cart;
    renderCart();
    renderShell();
  } catch (error) {
    showToast(error.message);
  }
}

async function removeCartItem(productId) {
  try {
    const data = await apiRequest(`/cart/items/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
    state.cart = data.cart;
    renderCart();
    renderShell();
  } catch (error) {
    showToast(error.message);
  }
}

async function checkout() {
  try {
    const method = document.querySelector("#paymentMethod")?.value || "simulation";
    const data = await apiRequest("/orders", {
      method: "POST",
      body: { paymentMethod: method },
    });
    state.orders = [data.order, ...state.orders];
    await Promise.all([loadCart(), loadProducts()]);
    if (isAdmin()) {
      await loadAdminData();
    }
    setView("orders");
    showToast("Order placed. Payment is pending.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleOrderClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  if (button.dataset.action === "simulate-payment-success") {
    await simulateOrderPayment(button.dataset.orderId, "success");
  }
  if (button.dataset.action === "simulate-payment-failure") {
    await simulateOrderPayment(button.dataset.orderId, "failure");
  }
}

async function simulateOrderPayment(orderId, result) {
  if (!orderId) {
    return;
  }

  try {
    const data = await apiRequest(`/orders/${encodeURIComponent(orderId)}/payment/simulate`, {
      method: "POST",
      body: { result },
    });
    state.orders = state.orders.map((order) => (order.id === orderId ? data.order : order));
    if (isAdmin()) {
      await loadAdminData();
    }
    renderOrders();
    renderAdmin();
    showToast(result === "success" ? "Payment marked paid" : "Payment marked failed");
  } catch (error) {
    showToast(error.message);
  }
}

async function submitProductForm(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showToast("Admin access required");
    return;
  }

  const id = els.productId.value;
  const body = {
    name: els.productName.value.trim(),
    slug: els.productSlug.value.trim(),
    description: els.productDescription.value.trim(),
    category: els.productCategory.value,
    priceCents: Number(els.productPrice.value),
    currency: els.productCurrency.value.trim(),
    dpi: Number(els.productDpi.value),
    wireless: els.productWireless.checked,
    ergonomic: els.productErgonomic.checked,
    stock: Number(els.productStock.value),
    imageUrl: els.productImageUrl.value.trim(),
  };

  try {
    await apiRequest(id ? `/admin/products/${encodeURIComponent(id)}` : "/admin/products", {
      method: id ? "PATCH" : "POST",
      body,
    });
    clearProductForm();
    await loadProducts();
    showToast(id ? "Product updated" : "Product created");
  } catch (error) {
    showToast(error.message);
  }
}

function handleAdminProductClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const productId = button.dataset.productId;
  if (button.dataset.action === "edit-product") {
    fillProductForm(productId);
  }
  if (button.dataset.action === "delete-product") {
    deleteProduct(productId);
  }
}

function fillProductForm(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  els.productId.value = product.id;
  els.productName.value = product.name;
  els.productSlug.value = product.slug;
  els.productDescription.value = product.description;
  els.productCategory.value = product.category;
  els.productPrice.value = product.priceCents;
  els.productCurrency.value = product.currency;
  els.productDpi.value = product.dpi;
  els.productStock.value = product.stock;
  els.productImageUrl.value = product.imageUrl;
  els.productWireless.checked = product.wireless;
  els.productErgonomic.checked = product.ergonomic;
  els.productName.focus();
}

async function deleteProduct(productId) {
  if (!confirm("Delete this product?")) {
    return;
  }

  try {
    await apiRequest(`/admin/products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
    if (state.selectedProductId === productId) {
      state.selectedProductId = "";
    }
    await loadProducts();
    showToast("Product deleted");
  } catch (error) {
    showToast(error.message);
  }
}

function clearProductForm() {
  els.productForm.reset();
  els.productId.value = "";
  els.productCurrency.value = "PLN";
}

async function handleAdminUserClick(event) {
  const button = event.target.closest("[data-action='save-user-role']");
  if (!button) {
    return;
  }

  const userId = button.dataset.userId;
  const select = document.querySelector(`[data-user-role="${cssEscape(userId)}"]`);
  if (!select) {
    return;
  }

  try {
    const data = await apiRequest(`/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: { role: select.value },
    });
    state.adminUsers = state.adminUsers.map((user) => (user.id === userId ? data.user : user));
    if (state.user?.id === userId) {
      state.user = data.user;
    }
    render();
    showToast("User updated");
  } catch (error) {
    showToast(error.message);
  }
}

function selectedProduct() {
  return state.products.find((product) => product.id === state.selectedProductId) || null;
}

function productCardTemplate(product) {
  const selectedClass = product.id === state.selectedProductId ? " is-selected" : "";

  return `
    <article class="product-card${selectedClass}">
      ${productMediaTemplate(product)}
      <div class="product-body">
        <div class="product-title-row">
          <h3 class="product-title">${escapeHTML(product.name)}</h3>
          ${stockBadgeTemplate(product.stock)}
        </div>
        <p class="product-description">${escapeHTML(product.description)}</p>
        <div class="meta-row">
          ${badgeTemplate(product.category)}
          ${badgeTemplate(`${product.dpi.toLocaleString()} DPI`)}
          ${badgeTemplate(connectionLabel(product))}
        </div>
      </div>
      <div class="price-row">
        <div>
          <div class="price">${formatMoney(product.priceCents, product.currency)}</div>
          <div class="stock-note">${product.stock <= 0 ? "Unavailable" : `${product.stock} available`}</div>
        </div>
        <div class="line-actions">
          <button class="button button-secondary" type="button" data-action="view-product" data-product-id="${escapeAttr(product.id)}">View</button>
          <button class="button" type="button" data-action="add-cart" data-product-id="${escapeAttr(product.id)}" ${product.stock <= 0 ? "disabled" : ""}>Add</button>
        </div>
      </div>
    </article>
  `;
}

function productMediaTemplate(product, className = "") {
  const imageURL = product.imageUrl || "/assets/products/product-generic.svg";
  return `
    <figure class="product-media ${className}">
      <img data-product-image src="${escapeAttr(imageURL)}" alt="${escapeAttr(product.name)}" loading="lazy" />
    </figure>
  `;
}

function orderCard(order) {
  const paymentPending = order.paymentStatus === "pending";

  return `
    <article class="order-card">
      <div class="order-header">
        <div>
          <h3>${escapeHTML(order.id)}</h3>
          <span class="stock">${formatDate(order.createdAt)}</span>
        </div>
        <div class="order-status">
          ${statusBadgeTemplate(order.status)}
          ${statusBadgeTemplate(order.paymentStatus, "payment")}
          <strong>${formatMoney(order.totalCents, order.currency)}</strong>
        </div>
      </div>
      <ul class="order-items">
        ${order.items.map((item) => `
          <li class="order-line">
            <span>${escapeHTML(item.name)} x ${item.quantity}</span>
            <strong>${formatMoney(item.subtotalCents, order.currency)}</strong>
          </li>
        `).join("")}
      </ul>
      ${paymentPending ? `
        <div class="order-actions">
          <button class="button" type="button" data-action="simulate-payment-success" data-order-id="${escapeAttr(order.id)}">Pay</button>
          <button class="button button-secondary" type="button" data-action="simulate-payment-failure" data-order-id="${escapeAttr(order.id)}">Fail payment</button>
        </div>
      ` : ""}
    </article>
  `;
}

function badgeTemplate(label) {
  return `<span class="badge">${escapeHTML(label)}</span>`;
}

function stockBadgeTemplate(stock) {
  if (stock <= 0) {
    return `<span class="badge badge-danger">Out</span>`;
  }
  if (stock <= 5) {
    return `<span class="badge badge-warning">Low stock</span>`;
  }
  return `<span class="badge badge-success">In stock</span>`;
}

function statusBadgeTemplate(status, group = "order") {
  const normalized = String(status || "").toLowerCase();
  let tone = "";
  if (normalized === "confirmed" || normalized === "paid") {
    tone = " badge-success";
  } else if (normalized === "pending") {
    tone = " badge-warning";
  } else if (normalized === "payment_failed" || normalized === "failed") {
    tone = " badge-danger";
  }
  const label = group === "payment" ? `Payment: ${statusLabel(normalized)}` : statusLabel(normalized);
  return `<span class="badge${tone}">${escapeHTML(label)}</span>`;
}

function statusLabel(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function connectionLabel(product) {
  return product.wireless ? "Wireless" : "Wired";
}

function productSummaryText() {
  const count = state.products.length;
  const category = state.category ? `${state.category} ` : "";
  return `${count} ${category}${count === 1 ? "product" : "products"}`;
}

function cartSummaryText() {
  if (!state.user) {
    return "";
  }
  const count = cartItemCount();
  if (count === 0) {
    return "No items";
  }
  return `${count} ${count === 1 ? "item" : "items"} - ${formatMoney(state.cart?.totalCents || 0, state.cart?.currency || "PLN")}`;
}

function orderSummaryText() {
  if (!state.user) {
    return "";
  }
  const pending = state.orders.filter((order) => order.paymentStatus === "pending").length;
  if (state.orders.length === 0) {
    return "No orders";
  }
  return pending === 0 ? `${state.orders.length} orders` : `${state.orders.length} orders - ${pending} pending`;
}

function filteredAdminOrders() {
  return state.adminOrders.filter((order) => {
    if (state.adminOrderStatus && order.status !== state.adminOrderStatus) {
      return false;
    }
    if (!state.adminOrderQuery) {
      return true;
    }
    return `${order.id} ${order.userId}`.toLowerCase().includes(state.adminOrderQuery);
  });
}

function filteredAdminUsers() {
  return state.adminUsers.filter((user) => {
    if (state.adminUserRole && user.role !== state.adminUserRole) {
      return false;
    }
    if (!state.adminUserQuery) {
      return true;
    }
    return `${user.name} ${user.email} ${user.id}`.toLowerCase().includes(state.adminUserQuery);
  });
}

function handleProductImageError(event) {
  const image = event.target.closest?.("[data-product-image]");
  if (!image || image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = "/assets/products/product-generic.svg";
}

function cartItemCount() {
  return (state.cart?.items || []).reduce((total, item) => total + item.quantity, 0);
}

function isAdmin() {
  return state.user?.role === "admin";
}

function formatMoney(cents, currency = "PLN") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2600);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return CSS.escape(value);
  }
  return String(value).replaceAll('"', '\\"');
}
