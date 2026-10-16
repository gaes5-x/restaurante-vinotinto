(function () {
  "use strict";

  const STORAGE_KEY = window.vinotintoUI.dataKeys.pedidos;
  const REFRESH_INTERVAL = 10000;
  const MINUTE = 60 * 1000;
  const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  function readOrders() {
    const orders = window.vinotintoStorage.get(STORAGE_KEY);
    return Array.isArray(orders) ? orders.filter(function (order) {
      return order && typeof order === "object";
    }) : [];
  }

  function isInKitchen(order) {
    return String(order.estado || order.status || "").trim().toLocaleLowerCase("es") === "en cocina";
  }

  function formatElapsed(enteredAt, now) {
    const entryTime = new Date(enteredAt).getTime();
    if (!Number.isFinite(entryTime)) return { minutes: 0, label: "Hora no disponible", overdue: false };
    const elapsed = Math.max(0, now - entryTime);
    const minutes = Math.floor(elapsed / MINUTE);
    return {
      minutes: minutes,
      label: minutes === 1 ? "1 minuto" : minutes + " minutos",
      overdue: elapsed > 15 * MINUTE
    };
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderOrders() {
    const list = document.getElementById("cocina-lista");
    const emptyState = document.getElementById("cocina-vacio");
    const now = Date.now();
    const orders = readOrders().filter(isInKitchen).sort(function (first, second) {
      return new Date(first.horaEntrada || 0) - new Date(second.horaEntrada || 0);
    });
    list.replaceChildren();
    emptyState.hidden = orders.length !== 0;
    document.getElementById("cocina-contador").textContent =
      orders.length + (orders.length === 1 ? " comanda" : " comandas");

    orders.forEach(function (order) {
      const elapsed = formatElapsed(order.horaEntrada, now);
      const card = createElement("article", "comanda tarjeta");
      if (elapsed.overdue) card.classList.add("comanda--demorada");
      const header = createElement("div", "comanda__encabezado");
      const identity = createElement("div", "comanda__identidad");
      const table = createElement("span", "comanda__mesa", "Mesa " + order.mesa);
      const number = createElement("span", "comanda__numero", "Pedido #" + (order.numero || order.id || "—"));
      identity.append(table, number);

      const elapsedBadge = createElement(
        "span",
        "comanda__tiempo" + (elapsed.overdue ? " comanda__tiempo--demorado" : ""),
        elapsed.label
      );
      elapsedBadge.setAttribute("data-entered-at", order.horaEntrada || "");
      header.append(identity, elapsedBadge);

      const enteredAt = new Date(order.horaEntrada);
      const timeLabel = Number.isNaN(enteredAt.getTime())
        ? "Hora de entrada no disponible"
        : "Ingresó " + dateTimeFormatter.format(enteredAt);
      const time = createElement("p", "comanda__hora", timeLabel);
      const rule = createElement("div", "comanda__divisor");
      const productsHeading = createElement("h3", "comanda__productos-titulo", "Productos");
      const products = createElement("ul", "comanda__productos");
      (Array.isArray(order.items) ? order.items : []).forEach(function (item) {
        const row = createElement("li", "comanda__producto");
        const name = createElement("span", "", item.nombre || "Producto");
        const quantity = createElement("strong", "", "× " + (Number(item.cantidad) || 1));
        row.append(name, quantity);
        products.append(row);
      });

      const footer = createElement("div", "comanda__pie");
      const totalValue = Number(order.total);
      const total = createElement("span", "comanda__total",
        Number.isFinite(totalValue) ? "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(totalValue) : "");
      const readyButton = createElement("button", "btn btn--dorado comanda__listo", "Listo");
      readyButton.type = "button";
      readyButton.setAttribute("aria-label", "Marcar pedido " + (order.numero || "") + " de la mesa " + order.mesa + " como listo");
      readyButton.addEventListener("click", function () {
        markReady(order);
      });
      footer.append(total, readyButton);
      card.append(header, time, rule, productsHeading, products, footer);
      list.append(card);
    });
  }

  function markReady(orderToUpdate) {
    const orders = readOrders();
    const match = orders.find(function (order) {
      return order.id === orderToUpdate.id;
    });
    if (!match || !isInKitchen(match)) {
      renderOrders();
      return;
    }

    match.estado = "Listo";
    match.horaFinalizacion = new Date().toISOString();
    match.notificacionMesero = {
      mensaje: "El pedido #" + (match.numero || match.id) + " de la mesa " + match.mesa + " está listo.",
      creadaEn: match.horaFinalizacion,
      leida: false
    };
    if (!window.vinotintoStorage.set(STORAGE_KEY, orders)) return;

    renderOrders();
    window.vinotintoUI.showToast(
      "Pedido #" + (match.numero || match.id) + " listo. El mesero ya puede verlo en el dashboard."
    );
  }

  function initialize() {
    const session = window.vinotintoUI.protectPage(["Chef", "Administrador"]);
    if (!session) return;

    renderOrders();
    window.setInterval(renderOrders, REFRESH_INTERVAL);
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) renderOrders();
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
