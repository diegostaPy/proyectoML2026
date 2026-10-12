(() => {
  const form = document.querySelector("#prediction-form");
  const result = document.querySelector("#prediction-result");

  if (!(form instanceof HTMLFormElement) || !(result instanceof HTMLElement)) {
    return;
  }

  const endpoint = form.dataset.endpoint?.trim();

  const showMessage = (message, state) => {
    result.hidden = false;
    result.dataset.state = state;
    result.textContent = message;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    if (!endpoint) {
      showMessage(
        "La API del modelo todavía no está configurada. No se ha generado ninguna predicción.",
        "notice",
      );
      return;
    }

    const fields = new FormData(form);
    const payload = Object.fromEntries(fields.entries());
    const numericFields = [
      "origin_latitude",
      "origin_longitude",
      "target_latitude",
      "target_longitude",
      "mean_temp_c",
      "rain_7d_mm",
      "high_humidity_hours_7d",
    ];

    for (const field of numericFields) {
      payload[field] = Number(payload[field]);
    }

    const button = form.querySelector('button[type="submit"]');
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
    showMessage("Consultando el servicio de inferencia…", "loading");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`El servicio respondió con estado ${response.status}.`);
      }

      const prediction = await response.json();
      const validRisks = ["bajo", "medio", "alto"];
      if (
        !prediction ||
        !validRisks.includes(prediction.risk) ||
        typeof prediction.probability !== "number" ||
        !Number.isFinite(prediction.probability) ||
        prediction.probability < 0 ||
        prediction.probability > 1 ||
        !Number.isInteger(prediction.horizon_days) ||
        typeof prediction.model_version !== "string"
      ) {
        throw new Error("La respuesta de la API no cumple el contrato esperado.");
      }

      const percentage = Math.round(prediction.probability * 100);
      showMessage(
        `Riesgo ${prediction.risk} · ${percentage}% de probabilidad · horizonte ${prediction.horizon_days} días · modelo ${prediction.model_version}.`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido al consultar el modelo.";
      showMessage(`No fue posible obtener una predicción: ${message}`, "error");
    } finally {
      if (button instanceof HTMLButtonElement) {
        button.disabled = false;
      }
    }
  });
})();
