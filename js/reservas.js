(function () {
  "use strict";

  const STORAGE_KEY = window.vinotintoUI.dataKeys.reservas;
  const SLOT_MINUTES = 120;
  const SLOT_STARTS = Object.freeze(["12:00", "14:00", "16:00", "18:00", "20:00"]);
  const TABLES = Object.freeze([
    { numero: 1, capacidad: 2 },
    { numero: 2, capacidad: 3 },
    { numero: 3, capacidad: 4 },
    { numero: 4, capacidad: 5 },
    { numero: 5, capacidad: 6 },
    { numero: 6, capacidad: 7 },
    { numero: 7, capacidad: 8 },
    { numero: 8, capacidad: 9 },
    { numero: 9, capacidad: 10 },
    { numero: 10, capacidad: 12 }
  ]);
  const timeFormatter = new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  const dateFormatter = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  function localDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function readReservations() {
    const reservations = window.vinotintoStorage.get(STORAGE_KEY);
    return Array.isArray(reservations) ? reservations.filter(function (reservation) {
      return reservation && typeof reservation === "object";
    }) : [];
  }

  function reservationStatus(reservation) {
    return String(reservation.estado || reservation.status || "").trim().toLocaleLowerCase("es");
  }

  function isCancelled(reservation) {
    return ["cancelada", "cancelado", "cancelled", "canceled"].includes(reservationStatus(reservation));
  }

  function timeToMinutes(time) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ""));
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function reservationInterval(reservation) {
    const start = timeToMinutes(reservation.hora);
    if (start === null) return null;
    const duration = Number(reservation.duracionMinutos) || SLOT_MINUTES;
    return { start: start, end: start + duration };
  }

  function intervalsOverlap(first, second) {
    return first.start < second.end && second.start < first.end;
  }

  function getActiveOnDate(reservations, date) {
    return reservations.filter(function (reservation) {
      return reservation.fecha === date && !isCancelled(reservation);
    });
  }

  function occupiedTableNumbers(reservations, date, time) {
    const targetInterval = { start: timeToMinutes(time), end: timeToMinutes(time) + SLOT_MINUTES };
    return new Set(getActiveOnDate(reservations, date).filter(function (reservation) {
      const interval = reservationInterval(reservation);
      return interval && intervalsOverlap(interval, targetInterval);
    }).map(function (reservation) {
      return Number(reservation.mesa);
    }));
  }

  function findAvailableTable(reservations, date, time, partySize) {
    const occupied = occupiedTableNumbers(reservations, date, time);
    return TABLES.filter(function (table) {
      return table.capacidad >= partySize && !occupied.has(table.numero);
    }).sort(function (first, second) {
      return first.capacidad - second.capacidad;
    })[0] || null;
  }

  function isSlotInPast(date, time) {
    if (date !== localDateKey(new Date())) return false;
    const startsAt = timeToMinutes(time);
    const now = new Date();
    return startsAt !== null && startsAt <= now.getHours() * 60 + now.getMinutes();
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function clearError() {
    const error = document.getElementById("reserva-error");
    error.textContent = "";
    error.hidden = true;
  }

  function showError(message) {
    const error = document.getElementById("reserva-error");
    error.textContent = message;
    error.hidden = false;
  }

  function clearAlternatives() {
    const alternatives = document.getElementById("reserva-alternativas");
    alternatives.replaceChildren();
    alternatives.hidden = true;
  }

  function showAlternatives(reservations, date, partySize, unavailableTime) {
    const alternatives = document.getElementById("reserva-alternativas");
    alternatives.replaceChildren();
    const availableTimes = SLOT_STARTS.filter(function (time) {
      return time !== unavailableTime
        && !isSlotInPast(date, time)
        && findAvailableTable(reservations, date, time, partySize);
    }).slice(0, 2);
    if (availableTimes.length === 0) {
      alternatives.hidden = true;
      return;
    }

    const heading = createElement("strong", "reserva-alternativas__titulo", "Horarios disponibles");
    const copy = createElement("span", "reserva-alternativas__texto", "Prueba uno de estos horarios:");
    const buttons = createElement("div", "reserva-alternativas__horas");
    availableTimes.forEach(function (time) {
      const button = createElement("button", "reserva-alternativas__boton", formatTime(time));
      button.type = "button";
      button.addEventListener("click", function () {
        document.getElementById("reserva-hora").value = time;
        clearError();
        clearAlternatives();
        document.getElementById("reserva-hora").focus();
        window.vinotintoUI.showToast("Horario " + formatTime(time) + " seleccionado. Confirma para guardar la reserva.");
      });
      buttons.append(button);
    });
    alternatives.append(heading, copy, buttons);
    alternatives.hidden = false;
  }

  function formatTime(time) {
    const parts = time.split(":").map(Number);
    const date = new Date(2000, 0, 1, parts[0], parts[1]);
    return timeFormatter.format(date);
  }

  function validateForm(name, date, time, partySize) {
    if (!name || name.length > 80) return "Escribe el nombre del cliente (máximo 80 caracteres).";
    if (!date) return "Selecciona la fecha de la reserva.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "La fecha seleccionada no es válida.";
    const parsedDate = new Date(date + "T00:00:00");
    if (Number.isNaN(parsedDate.getTime()) || localDateKey(parsedDate) !== date) {
      return "La fecha seleccionada no es válida.";
    }
    if (date < localDateKey(new Date())) return "La fecha de la reserva no puede estar en el pasado.";
    if (!SLOT_STARTS.includes(time)) return "Selecciona una franja de dos horas disponible.";
    if (isSlotInPast(date, time)) return "Selecciona una franja futura para la fecha de hoy.";
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 12) {
      return "El número de personas debe ser un entero entre 1 y 12.";
    }
    return "";
  }

  function getReservationId(reservations) {
    let id;
    do {
      id = "reserva-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    } while (reservations.some(function (reservation) { return reservation.id === id; }));
    return id;
  }

  function renderReservations(date) {
    const reservations = getActiveOnDate(readReservations(), date).sort(function (first, second) {
      return (timeToMinutes(first.hora) || 0) - (timeToMinutes(second.hora) || 0);
    });
    const list = document.getElementById("reservas-lista");
    list.replaceChildren();
    document.getElementById("reservas-contador").textContent =
      reservations.length + (reservations.length === 1 ? " reserva" : " reservas");
    const dateDisplay = new Date(date + "T12:00:00");

    if (reservations.length === 0) {
      const empty = createElement("div", "reservas-vacio tarjeta");
      empty.append(
        createElement("span", "reservas-vacio__estrella", "✧"),
        createElement("h3", "", "Sin reservas para esta fecha"),
        createElement("p", "", "Cuando alguien reserve una mesa, encontrarás aquí los detalles de su visita."),
        createElement("span", "divisor divisor--corto reservas-vacio__divisor", "")
      );
      const divider = empty.querySelector(".reservas-vacio__divisor");
      divider.innerHTML = "<span>✦</span>";
      divider.setAttribute("aria-hidden", "true");
      list.append(empty);
      return;
    }

    reservations.forEach(function (reservation) {
      const card = createElement("article", "reserva-registro tarjeta");
      const heading = createElement("div", "reserva-registro__encabezado");
      const time = createElement("time", "reserva-registro__hora", formatTime(reservation.hora));
      time.dateTime = reservation.hora;
      const status = createElement("span", "reserva-estado", reservation.estado || "Confirmada");
      heading.append(time, status);

      const guest = createElement("h3", "reserva-registro__cliente", reservation.nombre || "Cliente");
      const details = createElement("div", "reserva-registro__detalles");
      details.append(
        createElement("span", "", "Mesa " + reservation.mesa),
        createElement("span", "", reservation.personas + (Number(reservation.personas) === 1 ? " persona" : " personas")),
        createElement("span", "", "Hasta " + formatTime(addMinutes(reservation.hora, Number(reservation.duracionMinutos) || SLOT_MINUTES)))
      );
      const footer = createElement("div", "reserva-registro__pie");
      const dateLabel = createElement("span", "reserva-registro__fecha", dateFormatter.format(dateDisplay));
      footer.append(dateLabel);

      const cancelButton = createElement("button", "reserva-registro__cancelar", "Cancelar");
      cancelButton.type = "button";
      cancelButton.setAttribute("aria-label", "Cancelar reserva de " + (reservation.nombre || "cliente") + " a las " + formatTime(reservation.hora));
      cancelButton.addEventListener("click", function () {
        cancelReservation(reservation);
      });
      footer.append(cancelButton);
      card.append(heading, guest, details, footer);
      list.append(card);
    });
  }

  function addMinutes(time, minutes) {
    const start = timeToMinutes(time);
    if (start === null) return time;
    const end = start + minutes;
    return String(Math.floor(end / 60) % 24).padStart(2, "0") + ":" + String(end % 60).padStart(2, "0");
  }

  async function cancelReservation(reservation) {
    const confirmed = await window.vinotintoUI.confirm(
      "¿Cancelar la reserva de " + reservation.nombre + " para la mesa " + reservation.mesa + " a las " + formatTime(reservation.hora) + "?",
      { title: "Cancelar reserva", confirmText: "Sí, cancelar" }
    );
    if (!confirmed) return;

    const reservations = readReservations();
    const match = reservations.find(function (item) { return item.id === reservation.id; });
    if (!match || isCancelled(match)) {
      renderReservations(document.getElementById("filtro-fecha").value);
      return;
    }

    match.estado = "Cancelada";
    match.canceladaEn = new Date().toISOString();
    if (!window.vinotintoStorage.set(STORAGE_KEY, reservations)) return;

    renderReservations(document.getElementById("filtro-fecha").value);
    window.vinotintoUI.showToast("La reserva de " + match.nombre + " fue cancelada.");
  }

  function validateAvailability(session) {
    clearError();
    clearAlternatives();
    const nameInput = document.getElementById("cliente-nombre");
    const dateInput = document.getElementById("reserva-fecha");
    const timeInput = document.getElementById("reserva-hora");
    const partyInput = document.getElementById("reserva-personas");
    const name = nameInput.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;
    const partySize = Number(partyInput.value);
    const error = validateForm(name, date, time, partySize);

    if (error) {
      showError(error);
      if (date && SLOT_STARTS.includes(time) && Number.isInteger(partySize)
        && partySize >= 1 && partySize <= 12 && isSlotInPast(date, time)) {
        showAlternatives(readReservations(), date, partySize, time);
      }
      const invalidField = !name ? nameInput
        : !date ? dateInput
          : !SLOT_STARTS.includes(time) ? timeInput
            : partyInput;
      invalidField.focus();
      return;
    }

    const reservations = readReservations();
    const table = findAvailableTable(reservations, date, time, partySize);
    if (!table) {
      showError("No hay una mesa disponible para " + partySize + (partySize === 1 ? " persona" : " personas") + " a las " + formatTime(time));
      showAlternatives(reservations, date, partySize, time);
      window.vinotintoUI.showToast("Ese horario no está disponible. Revisa las alternativas.", "error");
      return;
    }

    const reservation = {
      id: getReservationId(reservations),
      nombre: name,
      fecha: date,
      hora: time,
      personas: partySize,
      mesa: table.numero,
      capacidadMesa: table.capacidad,
      duracionMinutos: SLOT_MINUTES,
      estado: "Confirmada",
      usuario: session.usuario,
      creadaEn: new Date().toISOString()
    };
    reservations.push(reservation);
    if (!window.vinotintoStorage.set(STORAGE_KEY, reservations)) return;

    document.getElementById("form-reserva").reset();
    dateInput.min = localDateKey(new Date());
    dateInput.value = date;
    document.getElementById("filtro-fecha").value = date;
    renderReservations(date);
    window.vinotintoUI.showToast(
      "Reserva confirmada para " + name + ". Mesa " + table.numero + " a las " + formatTime(time)
    );
  }

  function initialize() {
    const session = window.vinotintoUI.protectPage(["Administrador", "Mesero"]);
    if (!session) return;

    const today = localDateKey(new Date());
    const form = document.getElementById("form-reserva");
    const dateInput = document.getElementById("reserva-fecha");
    const filterInput = document.getElementById("filtro-fecha");
    dateInput.min = today;
    dateInput.value = today;
    filterInput.value = today;
    renderReservations(today);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      validateAvailability(session);
    });
    filterInput.addEventListener("change", function () {
      if (filterInput.value) renderReservations(filterInput.value);
    });
    [dateInput, document.getElementById("reserva-hora"), document.getElementById("reserva-personas")].forEach(function (input) {
      input.addEventListener("change", function () {
        clearError();
        clearAlternatives();
      });
    });
    document.getElementById("cliente-nombre").addEventListener("input", function () {
      clearError();
    });
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY && filterInput.value) renderReservations(filterInput.value);
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
