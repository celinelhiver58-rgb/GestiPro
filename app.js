
/* GestiPro - application front-end
   Gestion commerciale avec sauvegarde locale.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "gestipro_data_v1";
  const root = document.querySelector("main") || document.querySelector("principal");

  if (!root) {
    console.error("GestiPro : élément principal introuvable.");
    return;
  }

  const initialState = {
    products: [],
    sales: [],
    expenses: []
  };

  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

      if (
        saved &&
        Array.isArray(saved.products) &&
        Array.isArray(saved.sales) &&
        Array.isArray(saved.expenses)
      ) return saved;

    } catch (error) {
      console.warn("Erreur de lecture des données", error);
    }

    return JSON.parse(JSON.stringify(initialState));
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      alert("Impossible d'enregistrer les données.");
      console.error(error);
    }
  }

  function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function money(value) {
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0
    }).format(Number(value) || 0) + " FCFA";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function today() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function sum(items, field) {
    return items.reduce(
      (total, item) => total + (Number(item[field]) || 0),
      0
    );
  }

  function render() {
    const revenue = sum(state.sales, "total");
    const expenses = sum(state.expenses, "amount");

    const stockCount = state.products.reduce(
      (n, p) => n + (Number(p.stock) || 0),
      0
    );

    root.innerHTML = `
      <section class="gp-app" aria-label="Application GestiPro">

        <div class="gp-top">
          <div>
            <span class="gp-eyebrow">GESTION COMMERCIALE</span>
            <h2>Tableau de bord</h2>
            <p class="gp-muted">Suivez votre activité simplement.</p>
          </div>

          <span class="gp-date">
            ${new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}
          </span>
        </div>

        <div class="gp-stats">

          <article class="gp-stat">
            <span>Chiffre d'affaires</span>
            <strong>${money(revenue)}</strong>
            <small>Total des ventes enregistrées</small>
          </article>

          <article class="gp-stat">
            <span>Dépenses</span>
            <strong>${money(expenses)}</strong>
            <small>Total des dépenses enregistrées</small>
          </article>

          <article class="gp-stat">
            <span>Solde estimé</span>
            <strong>${money(revenue - expenses)}</strong>
            <small>Ventes moins dépenses</small>
          </article>

          <article class="gp-stat">
            <span>Articles en stock</span>
            <strong>${stockCount}</strong>
            <small>${state.products.length} référence(s)</small>
          </article>

        </div>

        <nav class="gp-tabs" aria-label="Sections">
          <button class="gp-tab active" data-view="overview">
            Vue d'ensemble
          </button>

          <button class="gp-tab" data-view="products">
            Produits
          </button>

          <button class="gp-tab" data-view="sales">
            Ventes
          </button>

          <button class="gp-tab" data-view="expenses">
            Dépenses
          </button>
        </nav>

        <section class="gp-panel" id="gp-content"></section>

        <footer class="gp-footer">
          GestiPro · Vos données sont enregistrées dans le navigateur de cet appareil.
        </footer>

      </section>
    `;

    addStyles();

    root.querySelectorAll(".gp-tab").forEach(button => {
      button.addEventListener("click", () => {
        showView(button.dataset.view);
      });
    });

    showView("overview");
  }

  function addStyles() {
    if (document.getElementById("gestipro-styles")) return;

    const style = document.createElement("style");
    style.id = "gestipro-styles";

    style.textContent = `
      .gp-app {
        color: #172033;
        font-family: Arial, sans-serif;
      }

      .gp-app * {
        box-sizing: border-box;
      }

      .gp-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }

      .gp-top h2 {
        margin: 5px 0;
        color: #123b70;
        font-size: 1.65rem;
      }

      .gp-eyebrow {
        font-size: .72rem;
        font-weight: 700;
        letter-spacing: .12em;
        color: #64748b;
      }

      .gp-muted,
      .gp-footer,
      .gp-stat small {
        color: #64748b;
      }

      .gp-date {
        font-size: .9rem;
        color: #64748b;
      }

      .gp-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin: 18px 0 22px;
      }

      .gp-stat {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 13px;
        padding: 16px;
        box-shadow: 0 2px 8px #0f172a0a;
      }

      .gp-stat span {
        display: block;
        font-size: .86rem;
        color: #64748b;
      }

      .gp-stat strong {
        display: block;
        margin: 10px 0 5px;
        color: #123b70;
        font-size: clamp(1.05rem, 2.4vw, 1.45rem);
        overflow-wrap: anywhere;
      }

      .gp-stat small {
        font-size: .76rem;
      }

      .gp-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 4px 0 12px;
        border-bottom: 1px solid #e2e8f0;
      }

      .gp-tab,
      .gp-btn {
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        padding: 10px 14px;
        background: #fff;
        color: #334155;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }

      .gp-tab.active,
      .gp-btn.primary {
        background: #123b70;
        color: #fff;
        border-color: #123b70;
      }

      .gp-panel {
        padding: 18px 0;
        min-height: 220px;
      }

      .gp-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }

      .gp-panel h3 {
        margin: 0;
        color: #123b70;
        font-size: 1.15rem;
      }

      .gp-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .gp-box {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
      }

      .gp-box h4 {
        margin: 0 0 12px;
      }

      .gp-list {
        margin: 0;
        padding-left: 18px;
        color: #475569;
      }

      .gp-empty {
        padding: 24px;
        text-align: center;
        color: #64748b;
        background: #f8fafc;
        border-radius: 10px;
      }

      .gp-table-wrap {
        overflow-x: auto;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #fff;
      }

      .gp-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 560px;
      }

      .gp-table th,
      .gp-table td {
        text-align: left;
        padding: 11px 12px;
        border-bottom: 1px solid #e2e8f0;
        font-size: .9rem;
      }

      .gp-table th {
        background: #f8fafc;
        color: #475569;
      }

      .gp-table tr:last-child td {
        border-bottom: 0;
      }

      .gp-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
        padding: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      }

      .gp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .gp-field.full {
        grid-column: 1 / -1;
      }

      .gp-field label {
        font-size: .85rem;
        font-weight: 600;
        color: #475569;
      }

      .gp-field input,
      .gp-field select {
        width: 100%;
        padding: 11px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #fff;
        font: inherit;
        color: #172033;
      }

      .gp-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .gp-btn.danger {
        color: #b91c1c;
        border-color: #fecaca;
      }

      .gp-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 20px;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: .78rem;
      }

      .gp-footer {
        text-align: center;
        font-size: .78rem;
        padding: 18px 0;
      }

      @media(max-width:700px) {
        .gp-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .gp-grid {
          grid-template-columns: 1fr;
        }

        .gp-form {
          grid-template-columns: 1fr;
        }

        .gp-field.full {
          grid-column: auto;
        }
      }

      @media(max-width:380px) {
        .gp-stats {
          grid-template-columns: 1fr;
        }

        .gp-stat {
          padding: 13px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function showView(view) {
    root.querySelectorAll(".gp-tab").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.view === view
      );
    });

    const panel = root.querySelector("#gp-content");

    if (view === "products") {
      panel.innerHTML = productsView();
    } else if (view === "sales") {
      panel.innerHTML = salesView();
    } else if (view === "expenses") {
      panel.innerHTML = expensesView();
    } else {
      panel.innerHTML = overviewView();
    }

    bindView(view);
  }

  function overviewView() {
    const recent = [...state.sales]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    return `
      <div class="gp-panel-head">
        <h3>Bienvenue sur GestiPro !</h3>
        <span class="gp-badge">Votre activité</span>
      </div>

      <div class="gp-grid">

        <article class="gp-box">
          <h4>Produits et stock</h4>
          <p>
            ${state.products.length} produit(s) enregistré(s),
            ${state.products.filter(p => Number(p.stock) <= 5).length}
            référence(s) avec un stock faible (5 ou moins).
          </p>
          <button class="gp-btn" data-go="products">
            Gérer les produits
          </button>
        </article>

        <article class="gp-box">
          <h4>Ventes</h4>
          <p>
            ${state.sales.length} vente(s) enregistrée(s)
            pour un total de ${money(sum(state.sales, "total"))}.
          </p>
          <button class="gp-btn" data-go="sales">
            Enregistrer une vente
          </button>
        </article>

        <article class="gp-box">
          <h4>Dépenses</h4>
          <p>
            ${state.expenses.length} dépense(s) enregistrée(s),
            soit ${money(sum(state.expenses, "amount"))}.
          </p>
          <button class="gp-btn" data-go="expenses">
            Ajouter une dépense
          </button>
        </article>

        <article class="gp-box">
          <h4>Dernières ventes</h4>
          ${
            recent.length
              ? `<ul class="gp-list">
                  ${recent.map(s => `
                    <li>
                      ${escapeHtml(s.productName)} — ${money(s.total)}
                      <small>(${escapeHtml(s.date)})</small>
                    </li>
                  `).join("")}
                </ul>`
              : `<div class="gp-empty">Aucune vente pour le moment.</div>`
          }
        </article>

      </div>
    `;
  }

  function productsView() {
    return `
      <div class="gp-panel-head">
        <h3>Gestion des produits</h3>
        <span class="gp-badge">${state.products.length} produit(s)</span>
      </div>

      <form class="gp-form" id="gp-product-form">

        <div class="gp-field">
          <label for="gp-p-name">Nom du produit *</label>
          <input id="gp-p-name" name="name" required maxlength="80"
            placeholder="Ex. Riz 25 kg">
        </div>

        <div class="gp-field">
          <label for="gp-p-category">Catégorie</label>
          <input id="gp-p-category" name="category" maxlength="60"
            placeholder="Ex. Alimentation">
        </div>

        <div class="gp-field">
          <label for="gp-p-price">Prix unitaire (FCFA) *</label>
          <input id="gp-p-price" name="price" type="number"
            min="0" step="1" required>
        </div>

        <div class="gp-field">
          <label for="gp-p-stock">Quantité en stock *</label>
          <input id="gp-p-stock" name="stock" type="number"
            min="0" step="1" required>
        </div>

        <div class="gp-field full">
          <button class="gp-btn primary" type="submit">
            Ajouter le produit
          </button>
        </div>

      </form>

      ${
        state.products.length
          ? `<div class="gp-table-wrap">
              <table class="gp-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Prix</th>
                    <th>Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.products.map(p => `
                    <tr>
                      <td>${escapeHtml(p.name)}</td>
                      <td>${escapeHtml(p.category || "—")}</td>
                      <td>${money(p.price)}</td>
                      <td>${p.stock}</td>
                      <td>
                        <button class="gp-btn danger"
                          data-delete-product="${p.id}" type="button">
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="gp-empty">
              Aucun produit. Ajoutez votre premier produit avec le formulaire.
            </div>`
      }
    `;
  }

  function salesView() {
    const options = state.products.map(p => `
      <option value="${p.id}">
        ${escapeHtml(p.name)} — ${money(p.price)} (stock: ${p.stock})
      </option>
    `).join("");

    return `
      <div class="gp-panel-head">
        <h3>Enregistrer une vente</h3>
        <span class="gp-badge">${state.sales.length} vente(s)</span>
      </div>

      ${
        state.products.length
          ? `<form class="gp-form" id="gp-sale-form">

              <div class="gp-field full">
                <label for="gp-s-product">Produit *</label>
                <select id="gp-s-product" name="productId" required>
                  <option value="">Choisir un produit</option>
                  ${options}
                </select>
              </div>

              <div class="gp-field">
                <label for="gp-s-qty">Quantité vendue *</label>
                <input id="gp-s-qty" name="quantity" type="number"
                  min="1" step="1" value="1" required>
              </div>

              <div class="gp-field">
                <label for="gp-s-date">Date *</label>
                <input id="gp-s-date" name="date" type="date"
                  value="${today()}" required>
              </div>

              <div class="gp-field full">
                <button class="gp-btn primary" type="submit">
                  Valider la vente
                </button>
              </div>

            </form>`
          : `<div class="gp-empty">
              Ajoutez d'abord un produit dans la section Produits
              avant d'enregistrer une vente.
            </div>`
      }

      ${
        state.sales.length
          ? `<div class="gp-table-wrap">
              <table class="gp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${[...state.sales]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map(s => `
                      <tr>
                        <td>${escapeHtml(s.date)}</td>
                        <td>${escapeHtml(s.productName)}</td>
                        <td>${s.quantity}</td>
                        <td>${money(s.total)}</td>
                      </tr>
                    `).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="gp-empty">Aucune vente enregistrée.</div>`
      }
    `;
  }

  function expensesView() {
    return `
      <div class="gp-panel-head">
        <h3>Suivi des dépenses</h3>
        <span class="gp-badge">${state.expenses.length} dépense(s)</span>
      </div>

      <form class="gp-form" id="gp-expense-form">

        <div class="gp-field">
          <label for="gp-e-title">Motif de la dépense *</label>
          <input id="gp-e-title" name="title" required maxlength="100"
            placeholder="Ex. Transport, électricité">
        </div>

        <div class="gp-field">
          <label for="gp-e-amount">Montant (FCFA) *</label>
          <input id="gp-e-amount" name="amount" type="number"
            min="1" step="1" required>
        </div>

        <div class="gp-field">
          <label for="gp-e-date">Date *</label>
          <input id="gp-e-date" name="date" type="date"
            value="${today()}" required>
        </div>

        <div class="gp-field">
          <label for="gp-e-note">Note (facultatif)</label>
          <input id="gp-e-note" name="note" maxlength="120"
            placeholder="Détail">
        </div>

        <div class="gp-field full">
          <button class="gp-btn primary" type="submit">
            Ajouter la dépense
          </button>
        </div>

      </form>

      ${
        state.expenses.length
          ? `<div class="gp-table-wrap">
              <table class="gp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Motif</th>
                    <th>Note</th>
                    <th>Montant</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${[...state.expenses]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map(e => `
                      <tr>
                        <td>${escapeHtml(e.date)}</td>
                        <td>${escapeHtml(e.title)}</td>
                        <td>${escapeHtml(e.note || "—")}</td>
                        <td>${money(e.amount)}</td>
                        <td>
                          <button class="gp-btn danger"
                            data-delete-expense="${e.id}" type="button">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    `).join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="gp-empty">Aucune dépense enregistrée.</div>`
      }
    `;
  }

  function bindView(view) {
    const panel = root.querySelector("#gp-content");

    panel.querySelectorAll("[data-go]").forEach(button => {
      button.addEventListener("click", () => {
        showView(button.dataset.go);
      });
    });

    const productForm = panel.querySelector("#gp-product-form");

    if (productForm) {
      productForm.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(productForm);
        const price = Number(data.get("price"));
        const stock = Number(data.get("stock"));

        if (!Number.isFinite(price) || price < 0 ||
            !Number.isInteger(stock) || stock < 0) {
          return alert("Vérifiez le prix et la quantité.");
        }

        state.products.push({
          id: uid(),
          name: String(data.get("name")).trim(),
          category: String(data.get("category")).trim(),
          price,
          stock
        });

        saveState();
        render();
        showView("products");
      });
    }

    panel.querySelectorAll("[data-delete-product]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.deleteProduct;

        if (state.sales.some(s => s.productId === id)) {
          return alert("Ce produit est lié à une vente. Il ne peut pas être supprimé.");
        }

        if (confirm("Supprimer ce produit ?")) {
          state.products = state.products.filter(p => p.id !== id);
          saveState();
          render();
          showView("products");
        }
      });
    });

    const saleForm = panel.querySelector("#gp-sale-form");

    if (saleForm) {
      saleForm.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(saleForm);
        const product = state.products.find(
          p => p.id === data.get("productId")
        );

        const quantity = Number(data.get("quantity"));

        if (!product) return alert("Choisissez un produit.");

        if (!Number.isInteger(quantity) || quantity < 1) {
          return alert("La quantité doit être un nombre entier supérieur à zéro.");
        }

        if (quantity > product.stock) {
          return alert(`Stock insuffisant. Stock disponible : ${product.stock}.`);
        }

        product.stock -= quantity;

        state.sales.push({
          id: uid(),
          productId: product.id,
          productName: product.name,
          quantity,
          total: product.price * quantity,
          date: data.get("date"),
          createdAt: Date.now()
        });

        saveState();
        render();
        showView("sales");
      });
    }

    const expenseForm = panel.querySelector("#gp-expense-form");

    if (expenseForm) {
      expenseForm.addEventListener("submit", event => {
        event.preventDefault();

        const data = new FormData(expenseForm);
        const amount = Number(data.get("amount"));

        if (!Number.isFinite(amount) || amount <= 0) {
          return alert("Le montant doit être supérieur à zéro.");
        }

        state.expenses.push({
          id: uid(),
          title: String(data.get("title")).trim(),
          amount,
          date: data.get("date"),
          note: String(data.get("note")).trim(),
          createdAt: Date.now()
        });

        saveState();
        render();
        showView("expenses");
      });
    }

    panel.querySelectorAll("[data-delete-expense]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.deleteExpense;

        if (confirm("Supprimer cette dépense ?")) {
          state.expenses = state.expenses.filter(e => e.id !== id);
          saveState();
          render();
          showView("expenses");
        }
      });
    });
  }

  render();

})();
