/* GestiPro - première version interactive
   Données enregistrées dans le navigateur avec localStorage.
   Pour charger ce fichier, ajoutez dans index.html avant </body> :
   <script src="app.js" defer></script>
*/
(() => {
  "use strict";

  const STORAGE_KEY = "gestipro-data-v1";
  const money = (value) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const loadData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.products) &&
          Array.isArray(saved.sales) && Array.isArray(saved.expenses)) {
        return saved;
      }
    } catch (error) {
      console.warn("Données GestiPro illisibles :", error);
    }
    return { products: [], sales: [], expenses: [] };
  };

  let data = loadData();

  const saveData = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      alert("Impossible d'enregistrer les données sur cet appareil.");
    }
  };

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  function startApp() {
    const main = document.querySelector("main") || document.querySelector("principal") ||
      document.body;

    const style = element("style");
    style.textContent = `
      .gp-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:18px 0}
      .gp-stat,.gp-panel{background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 8px #ddd}
      .gp-stat strong{display:block;font-size:1.35rem;color:#123b70;margin-top:8px;overflow-wrap:anywhere}
      .gp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin:18px 0}
      .gp-panel h3{margin-top:0;color:#123b70}
      .gp-form{display:grid;gap:9px}
      .gp-form input,.gp-form select{box-sizing:border-box;width:100%;padding:11px;border:1px solid #ccd3df;border-radius:8px;font:inherit;background:#fff}
      .gp-btn{border:0;border-radius:8px;background:#123b70;color:#fff;padding:11px 14px;font:inherit;font-weight:600;cursor:pointer}
      .gp-btn:active{opacity:.8}
      .gp-list{padding-left:18px;margin-bottom:0}
      .gp-list li{margin:8px 0;overflow-wrap:anywhere}
      .gp-muted{color:#64748b;font-size:.9rem}
      .gp-section-title{margin:24px 0 10px;color:#123b70}
      .gp-empty{color:#64748b;font-style:italic}
    `;
    document.head.appendChild(style);

    const heading = element("h2", "Vue d’ensemble");
    main.appendChild(heading);

    const summary = element("section", undefined, "gp-summary");
    const salesStat = makeStat("Chiffre d’affaires", "0 FCFA");
    const expenseStat = makeStat("Dépenses", "0 FCFA");
    const profitStat = makeStat("Solde estimé", "0 FCFA");
    const stockStat = makeStat("Produits en stock", "0");
    summary.append(salesStat.card, expenseStat.card, profitStat.card, stockStat.card);
    main.appendChild(summary);

    const grid = element("section", undefined, "gp-grid");
    const productPanel = element("div", undefined, "gp-panel");
    productPanel.appendChild(element("h3", "Ajouter un produit"));
    const productForm = element("form", undefined, "gp-form");
    const productName = makeInput("Nom du produit", "text", true);
    const productPrice = makeInput("Prix de vente (FCFA)", "number", true);
    productPrice.min = "0";
    productPrice.step = "1";
    const productStock = makeInput("Quantité en stock", "number", true);
    productStock.min = "0";
    productStock.step = "1";
    const productSubmit = element("button", "Enregistrer le produit", "gp-btn");
    productSubmit.type = "submit";
    productForm.append(productName, productPrice, productStock, productSubmit);
    productPanel.appendChild(productForm);

    const salePanel = element("div", undefined, "gp-panel");
    salePanel.appendChild(element("h3", "Enregistrer une vente"));
    const saleForm = element("form", undefined, "gp-form");
    const saleProduct = element("select");
    saleProduct.required = true;
    saleProduct.setAttribute("aria-label", "Produit vendu");
    const saleQuantity = makeInput("Quantité vendue", "number", true);
    saleQuantity.min = "1";
    saleQuantity.step = "1";
    const saleSubmit = element("button", "Valider la vente", "gp-btn");
    saleSubmit.type = "submit";
    saleForm.append(saleProduct, saleQuantity, saleSubmit);
    salePanel.appendChild(saleForm);

    const expensePanel = element("div", undefined, "gp-panel");
    expensePanel.appendChild(element("h3", "Ajouter une dépense"));
    const expenseForm = element("form", undefined, "gp-form");
    const expenseLabel = makeInput("Motif de la dépense", "text", true);
    const expenseAmount = makeInput("Montant (FCFA)", "number", true);
    expenseAmount.min = "1";
    expenseAmount.step = "1";
    const expenseSubmit = element("button", "Enregistrer la dépense", "gp-btn");
    expenseSubmit.type = "submit";
    expenseForm.append(expenseLabel, expenseAmount, expenseSubmit);
    expensePanel.appendChild(expenseForm);

    grid.append(productPanel, salePanel, expensePanel);
    main.appendChild(grid);

    const lists = element("section", undefined, "gp-grid");
    const productsPanel = element("div", undefined, "gp-panel");
    productsPanel.appendChild(element("h3", "Mes produits"));
    const productsList = element("ul", undefined, "gp-list");
    productsPanel.appendChild(productsList);

    const activityPanel = element("div", undefined, "gp-panel");
    activityPanel.appendChild(element("h3", "Dernières opérations"));
    const activityList = element("ul", undefined, "gp-list");
    activityPanel.appendChild(activityList);
    lists.append(productsPanel, activityPanel);
    main.appendChild(lists);

    productForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = productName.value.trim();
      const price = Number(productPrice.value);
      const stock = Number(productStock.value);
      if (!name || !Number.isFinite(price) || price <= 0 ||
          !Number.isInteger(stock) || stock < 0) {
        alert("Vérifiez le nom, le prix et la quantité du produit.");
        return;
      }
      data.products.push({
        id: Date.now().toString(),
        name,
        price,
        stock
      });
      saveData();
      productForm.reset();
      render();
    });

    saleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const product = data.products.find((item) => item.id === saleProduct.value);
      const quantity = Number(saleQuantity.value);
      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        alert("Choisissez un produit et une quantité valide.");
        return;
      }
      if (quantity > product.stock) {
        alert("Stock insuffisant pour cette vente.");
        return;
      }
      product.stock -= quantity;
      data.sales.push({
        id: Date.now().toString(),
        productName: product.name,
        quantity,
        total: product.price * quantity,
        date: new Date().toISOString()
      });
      saveData();
      saleForm.reset();
      render();
    });

    expenseForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const label = expenseLabel.value.trim();
      const amount = Number(expenseAmount.value);
      if (!label || !Number.isFinite(amount) || amount <= 0) {
        alert("Saisissez un motif et un montant valide.");
        return;
      }
      data.expenses.push({
        id: Date.now().toString(),
        label,
        amount,
        date: new Date().toISOString()
      });
      saveData();
      expenseForm.reset();
      render();
    });

    function makeStat(label, initialValue) {
      const card = element("div", undefined, "gp-stat");
      card.appendChild(element("span", label, "gp-muted"));
      const value = element("strong", initialValue);
      card.appendChild(value);
      return { card, value };
    }

    function makeInput(placeholder, type, required) {
      const input = element("input");
      input.type = type;
      input.placeholder = placeholder;
      input.setAttribute("aria-label", placeholder);
      input.required = required;
      if (type === "number") input.inputMode = "numeric";
      return input;
    }

    function render() {
      const totalSales = data.sales.reduce((sum, item) => sum + item.total, 0);
      const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
      const totalStock = data.products.reduce((sum, item) => sum + item.stock, 0);
      salesStat.value.textContent = money(totalSales);
      expenseStat.value.textContent = money(totalExpenses);
      profitStat.value.textContent = money(totalSales - totalExpenses);
      stockStat.value.textContent = String(totalStock);

      saleProduct.replaceChildren();
      const firstOption = element("option", "Choisir un produit");
      firstOption.value = "";
      saleProduct.appendChild(firstOption);
      data.products.forEach((product) => {
        const option = element(
          "option",
          `${product.name} — ${money(product.price)} (stock : ${product.stock})`
        );
        option.value = product.id;
        option.disabled = product.stock < 1;
        saleProduct.appendChild(option);
      });

      productsList.replaceChildren();
      if (data.products.length === 0) {
        productsList.appendChild(element("li", "Aucun produit pour le moment.", "gp-empty"));
      } else {
        data.products.forEach((product) => {
          productsList.appendChild(element(
            "li",
            `${product.name} — ${money(product.price)} — Stock : ${product.stock}`
          ));
        });
      }

      activityList.replaceChildren();
      const activities = [
        ...data.sales.map((item) => ({
          text: `Vente : ${item.productName} × ${item.quantity} — ${money(item.total)}`,
          date: item.date
        })),
        ...data.expenses.map((item) => ({
          text: `Dépense : ${item.label} — ${money(item.amount)}`,
          date: item.date
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

      if (activities.length === 0) {
        activityList.appendChild(element("li", "Aucune opération enregistrée.", "gp-empty"));
      } else {
        activities.forEach((item) => {
          const date = new Date(item.date).toLocaleDateString("fr-FR");
          activityList.appendChild(element("li", `${item.text} (${date})`));
        });
      }
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }
})();
