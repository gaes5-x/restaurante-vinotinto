(function () {
  "use strict";

  const STORAGE_KEY = window.vinotintoUI.dataKeys.novedades;
  const TICKET_PATTERN = /^NOV-(\d+)$/;
  const PRIORITIES = ["Alta", "Media", "Baja"];
  const TYPES = ["Interna", "De cliente"];
  const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  function readTickets() {
    const tickets = window.vinotintoStorage.get(STORAGE_KEY);
    return Array.isArray(tickets) ? tickets.filter(function (ticket) {
      return ticket && typeof ticket === "object";
    }) : [];
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function clearError() {
    const error = document.getElementById("novedad-error");
    error.textContent = "";
    error.hidden = true;
  }

  function showError(message) {
    const error = document.getElementById("novedad-error");
    error.textContent = message;
    error.hidden = false;
  }

  function nextTicketCode(tickets) {
    const maxNumber = tickets.reduce(function (max, ticket) {
      const match = TICKET_PATTERN.exec(String(ticket.ticket || ""));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return "NOV-" + String(maxNumber + 1).padStart(3, "0");
  }

  function priorityClass(priority) {
    return String(priority || "").toLocaleLowerCase("es");
  }

  function statusClass(status) {
    return String(status || "").toLocaleLowerCase("es").replace(/\s+/g, "-");
  }

  function renderTickets(session) {
    const isAdmin = session.rol === "Administrador";
    const allTickets = readTickets();
    const typeFilter = document.getElementById("filtro-tipo").value;
    const statusFilter = document.getElementById("filtro-estado").value;
    const tickets = allTickets.filter(function (ticket) {
      const visibleToRole = isAdmin || ticket.usuario === session.usuario;
      const matchesType = !isAdmin || !typeFilter || ticket.tipo === typeFilter;
      const matchesStatus = !isAdmin || !statusFilter || ticket.estado === statusFilter;
      return visibleToRole && matchesType && matchesStatus;
    }).sort(function (first, second) {
      return new Date(second.fechaHora || 0) - new Date(first.fechaHora || 0);
    });

    const list = document.getElementById("novedades-lista");
    const empty = document.getElementById("novedades-vacio");
    list.replaceChildren();
    empty.hidden = tickets.length > 0;
    document.getElementById("tickets-contador").textContent =
      tickets.length + (tickets.length === 1 ? " ticket" : " tickets");

    tickets.forEach(function (ticket) {
      const card = createElement("article", "ticket tarjeta");
      const header = createElement("div", "ticket__encabezado");
      const code = createElement("span", "ticket__codigo", ticket.ticket || "NOV-???");
      const status = createElement("span", "ticket__estado ticket__estado--" + statusClass(ticket.estado), ticket.estado || "Abierta");
      header.append(code, status);

      const meta = createElement("div", "ticket__meta");
      meta.append(
        createElement("span", "ticket__tipo", ticket.tipo || "Sin tipo"),
        createElement("span", "ticket__prioridad ticket__prioridad--" + priorityClass(ticket.prioridad), "Prioridad " + (ticket.prioridad || "—"))
      );
      const description = createElement("p", "ticket__descripcion", ticket.descripcion || "");
      const created = new Date(ticket.fechaHora);
      const createdLabel = Number.isNaN(created.getTime())
        ? "Fecha no disponible"
        : dateTimeFormatter.format(created);
      const footer = createElement("div", "ticket__pie");
      const author = createElement("span", "ticket__autor", "Creado por " + (ticket.usuario || "equipo"));
      const time = createElement("time", "ticket__fecha", createdLabel);
      if (!Number.isNaN(created.getTime())) time.dateTime = created.toISOString();
      footer.append(author, time);
      card.append(header, meta, description, footer);

      if (isAdmin) card.append(createAdminControls(ticket, session));
      list.append(card);
    });
  }

  function createAdminControls(ticket, session) {
    const controls = createElement("div", "ticket__gestion");
    const label = createElement("label", "ticket__gestion-label", "Actualizar estado");
    const select = document.createElement("select");
    select.className = "ticket__gestion-select";
    select.setAttribute("aria-label", "Nuevo estado para " + ticket.ticket);
    ["Abierta", "En gestión", "Resuelta"].forEach(function (state) {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      option.selected = state === ticket.estado;
      select.append(option);
    });
    label.htmlFor = "estado-" + ticket.ticket.toLowerCase();
    select.id = label.htmlFor;

    const button = createElement("button", "btn btn--contorno ticket__actualizar", "Guardar estado");
    button.type = "button";
    button.disabled = select.value === (ticket.estado || "Abierta");
    select.addEventListener("change", function () {
      button.disabled = select.value === (ticket.estado || "Abierta");
    });
    button.addEventListener("click", function () {
    updateTicketStatus(ticket.ticket, select.value, session);
    });
    controls.append(label, select, button);
    return controls;
  }

  function updateTicketStatus(ticketCode, newStatus, session) {
    const allowedStates = ["Abierta", "En gestión", "Resuelta"];
    if (!allowedStates.includes(newStatus)) {
      window.vinotintoUI.showToast("El estado seleccionado no es válido.", "error");
      return;
    }

    const tickets = readTickets();
    const ticket = tickets.find(function (item) { return item.ticket === ticketCode; });
    if (!ticket) {
      renderTickets(session);
      window.vinotintoUI.showToast("No se encontró el ticket para actualizar.", "error");
      return;
    }

    if (ticket.estado === newStatus) return;
    ticket.estado = newStatus;
    ticket.estadoActualizadoEn = new Date().toISOString();
    if (!window.vinotintoStorage.set(STORAGE_KEY, tickets)) return;

    renderTickets(session);
    window.vinotintoUI.showToast(ticketCode + " actualizado a «" + newStatus + "».");
  }

  function createTicket(session) {
    clearError();
    const typeInput = document.getElementById("novedad-tipo");
    const descriptionInput = document.getElementById("novedad-descripcion");
    const priorityInput = document.querySelector('input[name="prioridad"]:checked');
    const type = typeInput.value;
    const description = descriptionInput.value.trim();
    const priority = priorityInput ? priorityInput.value : "";

    if (!TYPES.includes(type)) {
      showError("Selecciona si la novedad es interna o de un cliente.");
      typeInput.focus();
      return;
    }
    if (!description || description.length > 1000) {
      showError("Escribe una descripción de hasta 1.000 caracteres.");
      descriptionInput.focus();
      return;
    }
    if (!PRIORITIES.includes(priority)) {
      showError("Selecciona una prioridad para el ticket.");
      document.querySelector(".novedad-prioridad input").focus();
      return;
    }

    const tickets = readTickets();
    const ticket = {
      ticket: nextTicketCode(tickets),
      tipo: type,
      descripcion: description,
      prioridad: priority,
      fechaHora: new Date().toISOString(),
      estado: "Abierta",
      usuario: session.usuario,
      rol: session.rol
    };
    tickets.push(ticket);
    if (!window.vinotintoStorage.set(STORAGE_KEY, tickets)) return;

    document.getElementById("form-novedad").reset();
    renderTickets(session);
    window.vinotintoUI.showToast(ticket.ticket + " creado y registrado como Abierta.");
  }

  function initialize() {
    const session = window.vinotintoUI.protectPage(["Administrador", "Mesero", "Chef"]);
    if (!session) return;

    const isAdmin = session.rol === "Administrador";
    const filters = document.getElementById("novedad-filtros");
    filters.hidden = !isAdmin;
    document.getElementById("tickets-subtitulo").textContent =
      isAdmin ? "Seguimiento del equipo" : "Tus reportes";
    document.getElementById("tickets-titulo").textContent =
      isAdmin ? "Tickets registrados" : "Mis tickets";

    renderTickets(session);
    document.getElementById("form-novedad").addEventListener("submit", function (event) {
      event.preventDefault();
      createTicket(session);
    });
    document.getElementById("novedad-tipo").addEventListener("change", clearError);
    document.getElementById("novedad-descripcion").addEventListener("input", clearError);
    document.querySelectorAll('input[name="prioridad"]').forEach(function (input) {
      input.addEventListener("change", clearError);
    });
    if (isAdmin) {
      document.getElementById("filtro-tipo").addEventListener("change", function () {
        renderTickets(session);
      });
      document.getElementById("filtro-estado").addEventListener("change", function () {
        renderTickets(session);
      });
    }
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) renderTickets(session);
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
