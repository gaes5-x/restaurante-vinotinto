(function () {
  "use strict";

  const SESSION_KEY = "vinotinto_session";
  const DATA_KEYS = Object.freeze({
    pedidos: "vinotinto_pedidos",
    reservas: "vinotinto_reservas",
    novedades: "vinotinto_novedades"
  });
  const ROLE_PAGES = Object.freeze({
    "Administrador": ["inicio", "pedidos", "cocina", "reservas", "novedades"],
    "Mesero": ["inicio", "pedidos", "reservas", "novedades"],
    "Chef": ["inicio", "cocina", "novedades"]
  });
  const USER_ROLES = Object.freeze({
    admin: "Administrador",
    mesero: "Mesero",
    chef: "Chef"
  });
  const NAV_ITEMS = Object.freeze([
    { id: "inicio", label: "Inicio", href: "dashboard.html", icon: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6" },
    { id: "pedidos", label: "Pedidos", href: "pedidos.html", icon: "M4 5h16v15H4zM8 3v4m8-4v4M4 10h16m4 4h4m-4 3h7" },
    { id: "cocina", label: "Cocina", href: "cocina.html", icon: "M4 13h16l-1.5 7h-13L4 13Zm2-3a3 3 0 0 1 6 0m0 0a3 3 0 0 1 6 0m-6-7v2" },
    { id: "reservas", label: "Reservas", href: "reservas.html", icon: "M4 5h16v15H4zM8 3v4m8-4v4M4 10h16m-8 3v4m-2-2h4" },
    { id: "novedades", label: "Novedades", href: "novedades.html", icon: "M12 3 2.8 20h18.4L12 3Zm0 6v5m0 3h.01" }
  ]);

  let errorRedirectStarted = false;

  function redirectToServerError(error) {
    const currentPage = window.location.pathname.split("/").pop();
    console.error("Error no controlado en la aplicación.", error);
    if (currentPage === "500.html" || errorRedirectStarted) return;
    errorRedirectStarted = true;

    const reference = "VIN-" + Date.now().toString(36).toUpperCase();
    const errorPage = new URL("500.html", document.baseURI);
    errorPage.searchParams.set("ref", reference);
    window.location.replace(errorPage.href);
  }

  window.onerror = function (message, source, line, column, error) {
    const detail = error || new Error(
      String(message) + " (" + String(source) + ":" + String(line) + ":" + String(column) + ")"
    );
    redirectToServerError(detail);
    return true;
  };

  window.addEventListener("unhandledrejection", function (event) {
    event.preventDefault();
    redirectToServerError(event.reason);
  });

  function getSession() {
    const session = window.vinotintoStorage.get(SESSION_KEY);
    if (!session || typeof session !== "object"
      || typeof session.usuario !== "string"
      || USER_ROLES[session.usuario] !== session.rol) {
      window.location.replace("index.html");
      return null;
    }
    return session;
  }

  function protectPage(allowedRoles) {
    const session = getSession();
    if (!session) return null;
    if (allowedRoles && !allowedRoles.includes(session.rol)) {
      window.location.replace("404.html");
      return null;
    }
    return session;
  }

  function paintMenu(session, activePage) {
    const nav = document.getElementById("app-nav");
    if (!nav) return;

    const allowedPages = ROLE_PAGES[session.rol];
    nav.replaceChildren();
    NAV_ITEMS.filter(function (item) {
      return allowedPages.includes(item.id);
    }).forEach(function (item) {
      const link = document.createElement("a");
      link.className = "app-nav__enlace";
      link.href = item.href;
      link.setAttribute("data-page-link", item.id);
      if (item.id === activePage) {
        link.classList.add("app-nav__enlace--activo");
        link.setAttribute("aria-current", "page");
      }

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      icon.classList.add("app-nav__icono");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", item.icon);
      icon.append(path);

      const label = document.createElement("span");
      label.textContent = item.label;
      link.append(icon, label);
      nav.append(link);
    });
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = "app-toast" + (type === "error" ? " app-toast--error" : "");
    toast.setAttribute("role", type === "error" ? "alert" : "status");

    const mark = document.createElement("span");
    mark.className = "app-toast__marca";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = type === "error" ? "!" : "✦";
    const text = document.createElement("span");
    text.textContent = String(message);
    toast.append(mark, text);

    let region = document.getElementById("app-toast-region");
    if (!region) {
      region = document.createElement("div");
      region.id = "app-toast-region";
      region.className = "app-toast-region";
      region.setAttribute("aria-label", "Notificaciones");
      document.body.append(region);
    }
    region.append(toast);
    window.setTimeout(function () {
      toast.classList.add("app-toast--salida");
      toast.addEventListener("transitionend", function () {
        toast.remove();
      }, { once: true });
      window.setTimeout(function () {
        toast.remove();
      }, 350);
    }, 3600);
  }

  function confirm(message, options) {
    const config = options || {};
    return new Promise(function (resolve) {
      const dialog = document.createElement("dialog");
      dialog.className = "app-modal";
      dialog.setAttribute("aria-labelledby", "app-modal-titulo");

      const card = document.createElement("div");
      card.className = "app-modal__tarjeta tarjeta";
      const ornament = document.createElement("span");
      ornament.className = "app-modal__estrella";
      ornament.setAttribute("aria-hidden", "true");
      ornament.textContent = "✦";
      const title = document.createElement("h2");
      title.id = "app-modal-titulo";
      title.textContent = config.title || "Confirmar acción";
      const copy = document.createElement("p");
      copy.textContent = String(message);
      const actions = document.createElement("div");
      actions.className = "app-modal__acciones";
      const cancelButton = document.createElement("button");
      cancelButton.className = "btn btn--contorno";
      cancelButton.type = "button";
      cancelButton.textContent = config.cancelText || "Cancelar";
      const confirmButton = document.createElement("button");
      confirmButton.className = "btn btn--primario";
      confirmButton.type = "button";
      confirmButton.textContent = config.confirmText || "Confirmar";
      actions.append(cancelButton, confirmButton);
      card.append(ornament, title, copy, actions);
      dialog.append(card);
      document.body.append(dialog);

      let settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(result);
      }

      cancelButton.addEventListener("click", function () { finish(false); });
      confirmButton.addEventListener("click", function () { finish(true); });
      dialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        finish(false);
      });
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) finish(false);
      });
      dialog.showModal();
      cancelButton.focus();
    });
  }

  function readList(key) {
    const value = window.vinotintoStorage.get(key);
    return Array.isArray(value) ? value : [];
  }

  function recordStatus(record) {
    return String(record.estado || record.status || "").trim().toLocaleLowerCase("es");
  }

  function isActiveOrder(order) {
    return !["entregado", "entregada", "cancelado", "cancelada", "cerrado", "cerrada"].includes(recordStatus(order));
  }

  function isOpenNotice(notice) {
    return !["cerrada", "cerrado", "resuelta", "resuelto", "cancelada", "cancelado", "completada", "completado"].includes(recordStatus(notice));
  }

  function localDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function reservationDate(reservation) {
    const rawDate = reservation.fecha || reservation.date || reservation.fechaReserva || "";
    if (typeof rawDate !== "string" || !rawDate) return "";
    const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? "" : localDateKey(parsed);
  }

  function updateDashboard(session) {
    const username = session.usuario.charAt(0).toLocaleUpperCase("es") + session.usuario.slice(1);
    document.getElementById("usuario-nombre").textContent = username;
    document.getElementById("usuario-rol").textContent = session.rol;
    document.getElementById("bienvenida-nombre").textContent = username;
    document.getElementById("bienvenida-rol").textContent = session.rol;

    const now = new Date();
    document.getElementById("fecha-hoy").textContent = new Intl.DateTimeFormat("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now);

    const orders = readList(DATA_KEYS.pedidos);
    const reservations = readList(DATA_KEYS.reservas);
    const notices = readList(DATA_KEYS.novedades);
    document.getElementById("resumen-pedidos").textContent = orders.filter(isActiveOrder).length;
    document.getElementById("resumen-reservas").textContent = reservations.filter(function (reservation) {
      return reservationDate(reservation) === localDateKey(now)
        && !["cancelada", "cancelado"].includes(recordStatus(reservation));
    }).length;
    document.getElementById("resumen-novedades").textContent = notices.filter(isOpenNotice).length;
    document.querySelectorAll("[data-summary-page]").forEach(function (link) {
      link.hidden = !ROLE_PAGES[session.rol].includes(link.dataset.summaryPage);
    });

    const quickAccess = document.getElementById("accesos-rapidos");
    quickAccess.replaceChildren();
    NAV_ITEMS.filter(function (item) {
      return item.id !== "inicio" && ROLE_PAGES[session.rol].includes(item.id);
    }).forEach(function (item) {
      const link = document.createElement("a");
      link.className = "acceso-rapido";
      link.href = item.href;
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", item.icon);
      icon.append(path);
      const label = document.createElement("span");
      label.textContent = item.label;
      const arrow = document.createElement("span");
      arrow.className = "acceso-rapido__flecha";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      link.append(icon, label, arrow);
      quickAccess.append(link);
    });

    const readyOrders = orders.filter(function (order) {
      return ["listo", "lista", "preparado", "preparada"].includes(recordStatus(order))
        && (!order.usuario || order.usuario === session.usuario);
    });
    const readyList = document.getElementById("lista-pedidos-listos");
    const notifications = document.getElementById("panel-notificaciones");
    notifications.hidden = !ROLE_PAGES[session.rol].includes("pedidos");
    readyList.replaceChildren();
    if (readyOrders.length === 0) {
      const empty = document.createElement("p");
      empty.className = "notificaciones__vacio";
      empty.textContent = "No hay pedidos listos por entregar en este momento.";
      readyList.append(empty);
      return;
    }

    readyOrders.slice(0, 5).forEach(function (order) {
      const item = document.createElement("article");
      item.className = "pedido-listo";
      const detail = document.createElement("div");
      detail.className = "pedido-listo__detalle";
      const orderNumber = document.createElement("strong");
      const number = order.numero || order.numeroPedido || order.id;
      orderNumber.textContent = number ? "Pedido #" + number : "Pedido listo";
      const table = document.createElement("span");
      const tableNumber = order.mesa || order.numeroMesa;
      table.textContent = tableNumber ? "Mesa " + tableNumber : "Listo para entregar";
      detail.append(orderNumber, table);
      const badge = document.createElement("span");
      badge.className = "estado-badge";
      badge.textContent = "Listo";
      item.append(detail, badge);
      readyList.append(item);
    });
  }

  function initializeShell() {
    const page = document.body.dataset.page;
    if (!page) return;
    const permittedRoles = Object.keys(ROLE_PAGES).filter(function (role) {
      return ROLE_PAGES[role].includes(page);
    });
    const session = protectPage(permittedRoles);
    if (!session) return;

    const displayName = session.usuario.charAt(0).toLocaleUpperCase("es") + session.usuario.slice(1);
    const headerName = document.getElementById("usuario-nombre");
    const headerRole = document.getElementById("usuario-rol");
    if (headerName) headerName.textContent = displayName;
    if (headerRole) headerRole.textContent = session.rol;

    paintMenu(session, page);
    const logout = document.getElementById("cerrar-sesion");
    if (logout) {
      logout.addEventListener("click", async function () {
        const confirmed = await confirm("¿Quieres cerrar tu sesión en Restaurante Vinotinto?", {
          title: "Cerrar sesión",
          confirmText: "Cerrar sesión"
        });
        if (confirmed && window.vinotintoStorage.remove(SESSION_KEY)) {
          window.location.replace("index.html");
        }
      });
    }

    const toggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("app-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    function setMenuOpen(open) {
      document.body.classList.toggle("app-menu-abierto", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      overlay.hidden = !open;
    }
    if (toggle && sidebar && overlay) {
      toggle.addEventListener("click", function () {
        setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
      });
      overlay.addEventListener("click", function () { setMenuOpen(false); });
      sidebar.addEventListener("click", function (event) {
        if (event.target.closest("a")) setMenuOpen(false);
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") setMenuOpen(false);
      });
    }

    if (page === "inicio") updateDashboard(session);
  }

  window.vinotintoUI = Object.freeze({
    protectPage: protectPage,
    paintMenu: paintMenu,
    showToast: showToast,
    confirm: confirm,
    dataKeys: DATA_KEYS
  });

  document.addEventListener("DOMContentLoaded", initializeShell);
})();
