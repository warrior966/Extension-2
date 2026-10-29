document.getElementById("backButton")?.addEventListener("click", () => {
  if (history.length > 1) {
    history.back();
  } else {
    document.getElementById("backButton").textContent = "Puedes cerrar esta pestaña";
    document.getElementById("backButton").disabled = true;
  }
});
