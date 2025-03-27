// Configurazioni
const TOMORROW_API_KEY = "AOSiRYoH04Jkvrb6iZmuNgMqcPredaKw";
const OPENTOMORROW_DEBUG = true; // Imposta false in produzione
let weatherChart = null;
let searchTimeout = null;

// Elementi DOM
const domElements = {
  time: document.getElementById("real-time"),
  themeToggle: document.getElementById("theme-toggle"),
  searchInput: document.getElementById("search-input"),
  searchBtn: document.getElementById("search-btn"),
  gpsBtn: document.getElementById("gps-btn"),
  autocomplete: document.getElementById("autocomplete-results"),
  currentWeather: document.getElementById("current-weather"),
  hourlyForecast: document.getElementById("hourly-forecast"),
  dailyForecast: document.getElementById("daily-forecast"),
  airQuality: document.getElementById("air-quality")
};

// Mappatura condizioni meteo
const weatherMappings = {
  icons: {
    1000: "fa-sun",         // Clear
    1100: "fa-cloud-sun",   // Partly Cloudy
    1101: "fa-cloud-sun",   // Mostly Cloudy
    1102: "fa-cloud",       // Cloudy
    1001: "fa-cloud",       // Overcast
    2000: "fa-smog",        // Fog
    2100: "fa-smog",        // Light Fog
    4000: "fa-cloud-rain",  // Drizzle
    4001: "fa-cloud-showers-heavy", // Rain
    4200: "fa-cloud-rain",  // Light Rain
    4201: "fa-cloud-showers-water", // Heavy Rain
    5000: "fa-snowflake",   // Snow
    5001: "fa-snowflake",   // Flurries
    5100: "fa-icicles",     // Light Snow
    5101: "fa-snowflake",   // Heavy Snow
    6000: "fa-cloud-meatball", // Freezing Drizzle
    6001: "fa-cloud-meatball", // Freezing Rain
    6200: "fa-cloud-meatball", // Light Freezing Rain
    6201: "fa-poo-storm",   // Heavy Freezing Rain
    7000: "fa-bolt",        // Ice Pellets
    7101: "fa-bolt",        // Heavy Ice Pellets
    7102: "fa-bolt",        // Light Ice Pellets
    8000: "fa-bolt"         // Thunderstorm
  },
  descriptions: {
    1000: "Sereno",
    1100: "Parz. Nuvoloso",
    1101: "Preval. Nuvoloso",
    1102: "Nuvoloso",
    1001: "Coperto",
    2000: "Nebbia",
    2100: "Foschia",
    4000: "Pioviggine",
    4001: "Pioggia",
    4200: "Pioggia Leggera",
    4201: "Pioggia Forte",
    5000: "Neve",
    5001: "Fitte Nevicate",
    5100: "Neve Leggera",
    5101: "Neve Forte",
    6000: "Pioggia Gelata",
    6001: "Grandine",
    6200: "Grandine Leggera",
    6201: "Grandine Forte",
    7000: "Ghiaccio",
    7101: "Tempesta di Ghiaccio",
    7102: "Ghiaccio Leggero",
    8000: "Temporale"
  }
};

// Inizializzazione
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setInterval(updateRealTime, 1000);
  domElements.gpsBtn.addEventListener("click", handleGeolocation);
  domElements.searchBtn.addEventListener("click", handleSearch);
  domElements.searchInput.addEventListener("input", handleInput);
  domElements.themeToggle.addEventListener("change", toggleTheme);
});

// Funzioni core
function initializeApp() {
  loadThemePreference();
  handleGeolocation();
}

function updateRealTime() {
  const now = new Date();
  domElements.time.textContent = now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

async function handleGeolocation() {
  try {
    const position = await getGeolocation();
    const { latitude, longitude } = position.coords;
    await fetchWeather(latitude, longitude);
    await updateLocationName(latitude, longitude);
  } catch (error) {
    OPENTOMORROW_DEBUG && console.error("Geolocation Error:", error);
    handleGeoError(error);
  }
}

async function fetchWeather(lat, lon) {
  try {
    showLoading();
    
    const url = new URL("https://api.tomorrow.io/v4/timelines");
    const params = {
      location: `${lat},${lon}`,
      fields: ["temperature", "temperatureApparent", "humidity", "windSpeed", "weatherCode", "precipitationProbability", "pressureSurfaceLevel", "uvIndex", "particulateMatter25", "particulateMatter10"],
      timesteps: ["current", "1h", "1d"],
      units: "metric",
      apikey: TOMORROW_API_KEY
    };

    // Convert params to query string manually
    const queryParams = new URLSearchParams();
    queryParams.append("location", params.location);
    params.fields.forEach(field => queryParams.append("fields", field));
    params.timesteps.forEach(step => queryParams.append("timesteps", step));
    queryParams.append("units", params.units);
    queryParams.append("apikey", params.apikey);

    url.search = queryParams.toString();

    OPENTOMORROW_DEBUG && console.log("API Request:", url.toString());

    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "API Error");
    }

    const data = await response.json();
    OPENTOMORROW_DEBUG && console.log("API Response:", data);
    
    processWeatherData(data.data.timelines, lat, lon);
  } catch (error) {
    OPENTOMORROW_DEBUG && console.error("Fetch Error:", error);
    showError(`Errore: ${error.message}`);
  }
}

function processWeatherData(timelines, lat, lon) {
  const currentData = extractCurrentData(timelines);
  const hourlyData = extractHourlyData(timelines);
  const dailyData = extractDailyData(timelines);

  updateCurrentWeather(currentData, lat, lon);
  updateHourlyForecast(hourlyData);
  updateDailyForecast(dailyData);
  updateAirQuality(currentData.airQuality);
}

// Funzioni di rendering
function updateCurrentWeather(data, lat, lon) {
  const weatherCode = data.weatherCode;
  
  domElements.currentWeather.innerHTML = `
    <div class="location-time">
      <div class="location">
        <h2>${domElements.searchInput.value || "Posizione Attuale"}</h2>
        <p>${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</p>
      </div>
      <div class="current-date">
        ${new Date().toLocaleDateString("it-IT", { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long'
        })}
      </div>
    </div>
    <div class="current-main">
      <div class="temperature">
        <span class="temp-value">${Math.round(data.temperature)}</span>
        <span class="temp-unit">°C</span>
      </div>
      <div class="weather-condition">
        <i class="fas ${weatherMappings.icons[weatherCode]} condition-icon"></i>
        <div class="condition-text">${weatherMappings.descriptions[weatherCode]}</div>
      </div>
      <div class="weather-details">
        ${createDetailCard("fa-wind", "Vento", `${data.windSpeed} km/h`)}
        ${createDetailCard("fa-tint", "Umidità", `${data.humidity}%`)}
        ${createDetailCard("fa-umbrella", "Pioggia", `${data.precipitationProbability}%`)}
        ${createDetailCard("fa-thermometer-half", "Percepiti", `${Math.round(data.temperatureApparent)}°C`)}
      </div>
    </div>
  `;
}

// Funzioni helper
function createDetailCard(icon, title, value) {
  return `
    <div class="detail-card">
      <i class="fas ${icon}"></i>
      <div class="detail-title">${title}</div>
      <div class="detail-value">${value}</div>
    </div>
  `;
}

function showLoading(message = "Caricamento dati...") {
  domElements.currentWeather.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i>
      ${message}
    </div>
  `;
}

function showError(message) {
  domElements.currentWeather.innerHTML = `
    <div class="error">
      <i class="fas fa-exclamation-triangle"></i>
      ${message}
    </div>
  `;
}

// Gestione errori
function handleGeoError(error) {
  const errors = {
    1: "Permesso di geolocalizzazione negato",
    2: "Posizione non disponibile",
    3: "Timeout della richiesta"
  };
  showError(errors[error.code] || "Errore di geolocalizzazione");
  fallbackToDefaultLocation();
}

function fallbackToDefaultLocation() {
  fetchWeather(41.9028, 12.4964); // Fallback a Roma
  domElements.searchInput.value = "Roma, Italia";
}

// Alcune funzioni come extractCurrentData, extractHourlyData, ecc. 
// sembrano mancanti. Dovrai implementarle.
function extractCurrentData(timelines) {
  const currentTimeline = timelines.find(timeline => timeline.timestep === "current");
  if (!currentTimeline) throw new Error("No current timeline data");
  
  return {
    temperature: currentTimeline.intervals[0].values.temperature,
    temperatureApparent: currentTimeline.intervals[0].values.temperatureApparent,
    humidity: currentTimeline.intervals[0].values.humidity,
    windSpeed: currentTimeline.intervals[0].values.windSpeed,
    weatherCode: currentTimeline.intervals[0].values.weatherCode,
    precipitationProbability: currentTimeline.intervals[0].values.precipitationProbability,
  };
}

function extractHourlyData(timelines) {
  // Implementa la logica per estrarre i dati orari
  return [];
}

function extractDailyData(timelines) {
  // Implementa la logica per estrarre i dati giornalieri
  return [];
}

function updateHourlyForecast(hourlyData) {
  // Implementa l'aggiornamento delle previsioni orarie
}

function updateDailyForecast(dailyData) {
  // Implementa l'aggiornamento delle previsioni giornaliere
}

function updateAirQuality(airQualityData) {
  // Implementa l'aggiornamento della qualità dell'aria
}

// Funzioni mancanti
function getGeolocation() {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    } else {
      reject(new Error("Geolocation non supportata"));
    }
  });
}

function handleSearch() {
  // TODO: Implementa la ricerca per nome città
}

function handleInput() {
  // TODO: Implementa l'autocompletamento
}

// Inizializza il tema
function loadThemePreference() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  domElements.themeToggle.checked = savedTheme === "dark";
}

function toggleTheme() {
  const newTheme = domElements.themeToggle.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}
