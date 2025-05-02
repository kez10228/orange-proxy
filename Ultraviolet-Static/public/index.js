"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("uv-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("uv-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("uv-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("uv-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("uv-error-code");
/**
 * @type {HTMLDivElement}
 */
const loadingScreen = document.getElementById("uv-loading");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Show the loading screen
  loadingScreen.style.display = "block";

  try {
    await registerSW();
  } catch (err) {
    error.textContent = "Failed to register service worker.";
    errorCode.textContent = err.toString();
    loadingScreen.style.display = "none"; // Hide loading screen on error
    throw err;
  }

  // Default to Startpage if no search engine is selected
  const selectedSearchEngine = searchEngine.value || "https://www.startpage.com/do/search?query=";
  const url = search(address.value, selectedSearchEngine);

  let frame = document.getElementById("uv-frame");
  frame.style.display = "block";
  let wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";
  if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  }

  // Set iframe source and handle loading
  frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);

  // Hide the loading screen when the iframe finishes loading
  frame.onload = () => {
    loadingScreen.style.display = "none";
  };
});
