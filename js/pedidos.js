(function () {
  "use strict";

  const STORAGE_KEY = window.vinotintoUI.dataKeys.pedidos;
  const CATEGORIES = Object.freeze(["Entradas", "Platos fuertes", "Bebidas", "Postres"]);
  const MENU = Object.freeze([
    { id: "arepa-choclo", categoria: "Entradas", nombre: "Arepitas de choclo", descripcion: "Arepitas doradas con queso campesino y hogao de la casa.", precio: 18000 },
    { id: "empanadas-vinotinto", categoria: "Entradas", nombre: "Empanaditas Vinotinto", descripcion: "Masa crujiente, carne de res y ají artesanal.", precio: 22000 },
    { id: "patacones-camarones", categoria: "Entradas", nombre: "Patacones con camarones", descripcion: "Patacón crocante, camarones al ajillo y toque de limón.", precio: 32000 },
    { id: "ajiaco-santafereño", categoria: "Platos fuertes", nombre: "Ajiaco santafereño", descripcion: "Tres papas, pollo, mazorca, guascas y acompañamientos.", precio: 38000 },
    { id: "sobrebarriga", categoria: "Platos fuertes", nombre: "Sobrebarriga criolla", descripcion: "Sobrebarriga tierna en salsa criolla, papa y arroz.", precio: 46000 },
    { id: "trucha-almendras", categoria: "Platos fuertes", nombre: "Trucha a las almendras", descripcion: "Trucha fresca, almendras tostadas y vegetales de temporada.", precio: 52000 },
    { id: "lomo-vino-tinto", categoria: "Platos fuertes", nombre: "Lomo al vino tinto", descripcion: "Lomo de res a la parrilla con reducción de vino y puré.", precio: 58000 },
    { id: "limonada-coco", categoria: "Bebidas", nombre: "Limonada de coco", descripcion: "Limón fresco y coco cremoso, servida bien fría.", precio: 14000 },
    { id: "jugo-lulo", categoria: "Bebidas", nombre: "Jugo natural de lulo", descripcion: "Lulo colombiano preparado en agua o en leche.", precio: 11000 },
    { id: "agua-gas", categoria: "Bebidas", nombre: "Agua con gas", descripcion: "Agua mineral con gas, botella individual.", precio: 8000 },
    { id: "tres-leches", categoria: "Postres", nombre: "Torta tres leches", descripcion: "Bizcocho esponjoso, crema suave y canela.", precio: 16000 },
    { id: "merengon-frutas", categoria: "Postres", nombre: "Merengón de frutas", descripcion: "Merengue artesanal con crema y frutas frescas.", precio: 19000 }
  ]);

  const cart = new Map();
  const moneyFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  function formatCOP(amount) {
    return "$" + moneyFormatter.format(amount);
  }

  function readOrders() {
    const value = window.vinotintoStorage.get(STORAGE_KEY);
    return Array.isArray(value) ? value.filter(function (order) {
      return order && typeof order === "object";
    }) : [];
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderMenu() {
    const container = document.getElementById("menu-categorias");
    container.replaceChildren();

    CATEGORIES.forEach(function (category) {
      const products = MENU.filter(function (product) {
        return product.categoria === category;
      });
      const section = createElement("section", "menu-categoria");
      section.setAttribute("aria-labelledby", "categoria-" + slugify(category));
      const heading = createElement("div", "menu-categoria__encabezado");
      const title = createElement("h3", "", category);
      title.id = "categoria-" + slugify(category);
      const count = createElement("span", "menu-categoria__cantidad", String(products.length).padStart(2, "0"));
      heading.append(title, count);

      const grid = createElement("div", "platos-grid");
      products.forEach(function (product) {
        const card = createElement("article", "plato-card tarjeta");
        const detail = createElement("div", "plato-card__detalle");
        detail.append(
          createElement("h4", "plato-card__nombre", product.nombre),
          createElement("p", "plato-card__descripcion", product.descripcion)
        );
        const footer = createElement("div", "plato-card__pie");
        footer.append(createElement("strong", "plato-card__precio", formatCOP(product.precio)));
        const addButton = createElement("button", "plato-card__agregar");
        addButton.type = "button";
        addButton.setAttribute("aria-label", "Agregar " + product.nombre + " a la cuenta");
        addButton.title = "Agregar a la cuenta";
        addButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"></path></svg>';
        addButton.addEventListener("click", function () {
          addToCart(product.id);
        });
        footer.append(addButton);
        card.append(detail, footer);
        grid.append(card);
      });
      section.append(heading, grid);
      container.append(section);
    });
  }

  function slugify(value) {
    return value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  }

  function addToCart(productId) {
    const product = MENU.find(function (item) { return item.id === productId; });
    if (!product) return;
    const current = cart.get(productId);
    cart.set(productId, {
      product: product,
      quantity: current ? current.quantity + 1 : 1
    });
    renderCart();
    clearError();
  }

  function changeQuantity(productId, amount) {
    const current = cart.get(productId);
    if (!current) return;
    const quantity = current.quantity + amount;
    if (quantity < 1) return;
    cart.set(productId, { product: current.product, quantity: quantity });
    renderCart();
  }

  function removeFromCart(productId) {
    cart.delete(productId);
    renderCart();
  }

  function renderCart() {
    const container = document.getElementById("cuenta-items");
    const emptyState = document.getElementById("cuenta-vacia");
    const items = Array.from(cart.entries());
    container.replaceChildren();
    emptyState.hidden = items.length > 0;

    let total = 0;
    items.forEach(function (entry) {
      const productId = entry[0];
      const item = entry[1];
      const subtotal = item.product.precio * item.quantity;
      total += subtotal;

      const row = createElement("article", "cuenta-item");
      const description = createElement("div", "cuenta-item__descripcion");
      description.append(
        createElement("strong", "cuenta-item__nombre", item.product.nombre),
        createElement("span", "cuenta-item__precio", formatCOP(item.product.precio) + " c/u")
      );
      const controls = createElement("div", "cuenta-item__controles");
      const quantity = createElement("div", "cantidad-control");
      const decrease = createElement("button", "cantidad-control__boton", "−");
      decrease.type = "button";
      decrease.setAttribute("aria-label", "Disminuir " + item.product.nombre);
      decrease.disabled = item.quantity <= 1;
      decrease.addEventListener("click", function () { changeQuantity(productId, -1); });
      const quantityValue = createElement("span", "cantidad-control__valor", String(item.quantity));
      quantity.append(decrease, quantityValue);

      const increase = createElement("button", "cantidad-control__boton", "+");
      increase.type = "button";
      increase.setAttribute("aria-label", "Aumentar " + item.product.nombre);
      increase.addEventListener("click", function () { changeQuantity(productId, 1); });
      quantity.append(increase);

      const itemSubtotal = createElement("strong", "cuenta-item__subtotal", formatCOP(subtotal));
      const remove = createElement("button", "cuenta-item__quitar", "Quitar");
      remove.type = "button";
      remove.setAttribute("aria-label", "Quitar " + item.product.nombre + " de la cuenta");
      remove.addEventListener("click", function () { removeFromCart(productId); });
      controls.append(quantity, itemSubtotal, remove);
      row.append(description, controls);
      container.append(row);
    });
    document.getElementById("pedido-total").textContent = formatCOP(total);
  }

  function clearError() {
    const error = document.getElementById("pedido-error");
    error.hidden = true;
    error.textContent = "";
  }

  function showError(message) {
    const error = document.getElementById("pedido-error");
    error.textContent = message;
    error.hidden = false;
  }

  function renderOrderHistory(session) {
    const orders = readOrders().filter(function (order) {
      return order.usuario === session.usuario;
    }).sort(function (first, second) {
      return new Date(second.horaEntrada || 0) - new Date(first.horaEntrada || 0);
    });
    const list = document.getElementById("pedidos-lista");
    list.replaceChildren();
    document.getElementById("pedidos-contador").textContent =
      orders.length + (orders.length === 1 ? " pedido" : " pedidos");

    if (orders.length === 0) {
      const empty = createElement("div", "pedidos-vacio tarjeta");
      empty.append(
        createElement("span", "pedidos-vacio__estrella", "✧"),
        createElement("p", "", "Aún no has registrado pedidos en esta sesión.")
      );
      list.append(empty);
      return;
    }

    orders.forEach(function (order) {
      const card = createElement("article", "pedido-registro tarjeta");
      const top = createElement("div", "pedido-registro__superior");
      const title = createElement("div", "pedido-registro__titulo");
      const orderLabel = createElement("h3", "", "Pedido #" + order.numero);
      title.append(orderLabel, createElement("span", "", "Mesa " + order.mesa));
      const statusText = order.estado || "En cocina";
      const badge = createElement("span", "pedido-estado", statusText);
      badge.classList.add("pedido-estado--" + slugify(statusText));
      top.append(title, badge);

      const orderItems = Array.isArray(order.items) ? order.items : [];
      const summary = createElement("p", "pedido-registro__platos", orderItems.map(function (item) {
        return item.cantidad + " × " + item.nombre;
      }).join(" · "));
      const bottom = createElement("div", "pedido-registro__inferior");
      const time = new Date(order.horaEntrada);
      const timeText = Number.isNaN(time.getTime()) ? "Hora no disponible" : dateTimeFormatter.format(time);
      bottom.append(
        createElement("span", "pedido-registro__hora", "Ingresó a cocina · " + timeText),
        createElement("strong", "pedido-registro__total", formatCOP(Number(order.total) || 0))
      );
      card.append(top, summary, bottom);
      list.append(card);
    });
  }

  async function confirmOrder(session) {
    clearError();
    const tableSelect = document.getElementById("mesa");
    const table = tableSelect.value;
    const items = Array.from(cart.values());
    if (!table) {
      showError("Selecciona una mesa antes de confirmar el pedido.");
      tableSelect.focus();
      window.vinotintoUI.showToast("Selecciona una mesa para continuar.", "error");
      return;
    }
    if (items.length === 0) {
      showError("Agrega al menos un plato a la cuenta antes de confirmar.");
      document.querySelector(".menu-platos").scrollIntoView({ behavior: "smooth", block: "start" });
      window.vinotintoUI.showToast("La cuenta está vacía. Agrega uno o más platos.", "error");
      return;
    }

    const total = items.reduce(function (sum, item) {
      return sum + item.product.precio * item.quantity;
    }, 0);
    const confirmed = await window.vinotintoUI.confirm(
      "¿Enviar a cocina el pedido de la mesa " + table + " por " + formatCOP(total) + "?",
      { title: "Confirmar pedido", confirmText: "Enviar a cocina" }
    );
    if (!confirmed) return;

    const orders = readOrders();
    const order = {
      id: "pedido-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      numero: nextOrderNumber(orders),
      mesa: Number(table),
      usuario: session.usuario,
      rol: session.rol,
      estado: "En cocina",
      horaEntrada: new Date().toISOString(),
      items: items.map(function (item) {
        return {
          platoId: item.product.id,
          nombre: item.product.nombre,
          categoria: item.product.categoria,
          precio: item.product.precio,
          cantidad: item.quantity
        };
      }),
      total: total
    };
    orders.push(order);
    if (!window.vinotintoStorage.set(STORAGE_KEY, orders)) return;

    cart.clear();
    tableSelect.value = "";
    renderCart();
    renderOrderHistory(session);
    window.vinotintoUI.showToast("Pedido #" + order.numero + " enviado a cocina.");
  }

  function nextOrderNumber(orders) {
    return orders.reduce(function (highest, order) {
      const number = Number(order.numero);
      return Number.isFinite(number) ? Math.max(highest, number) : highest;
    }, 0) + 1;
  }

  function initialize() {
    const session = window.vinotintoUI.protectPage(["Administrador", "Mesero"]);
    if (!session) return;
    renderMenu();
    renderCart();
    renderOrderHistory(session);
    document.getElementById("confirmar-pedido").addEventListener("click", function () {
      confirmOrder(session);
    });
    document.getElementById("mesa").addEventListener("change", clearError);
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) renderOrderHistory(session);
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
