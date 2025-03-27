const TOMORROW_API_KEY = "AOSiRYoH04Jkvrb6iZmuNgMqcPredaKw";
const OPENWEATHER_API_KEY = "YOUR_API_KEY"; // Inserisci la tua API key di OpenWeatherMap
const OPENTOMORROW_DEBUG = true;
let weatherChart = null;
let searchTimeout = null;

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

const weatherMappings = {
  icons: {
    1000: "fa-sun",
    1100: "fa-cloud-sun",
    1101: "fa-cloud-sun",
    1102: "fa-cloud",
    1001: "fa-cloud",
    2000: "fa-smog",
    2100: "fa-smog",
    4000: "fa-cloud-rain",
    4001: "fa-cloud-showers-heavy",
    4200: "fa-cloud-rain",
    4201: "fa-cloud-showers-water",
    5000: "fa-snowflake",
    5001: "fa-snowflake",
    5100: "fa-icicles",
    5101: "fa-snowflake",
    6000: "fa-cloud-meatball",
    6001: "fa-cloud-meatball",
    6200: "fa-cloud-meatball",
    6201: "fa-poo-storm",
    7000: "fa-bolt",
    7101: "fa-bolt",
    7102: "fa-bolt",
    8000: "fa-bolt"
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

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setInterval(updateRealTime, 1000);
  domElements.gpsBtn.addEventListener("click", handleGeolocation);
  domElements.searchBtn.addEventListener("click", handleSearch);
  domElements.searchInput.addEventListener("input", handleInput);
  domElements.themeToggle.addEventListener("change", toggleTheme);
  domElements.autocomplete.addEventListener("click", handleAutocompleteSelect);
});

async function fetchWeather(lat, lon) {
  try {
    showLoading();
    const url = new URL("https://api.tomorrow.io/v4/timelines");
    const params = {
      location: `${lat},${lon}`,
      fields: [
        "temperature",
        "temperatureApparent",
        "humidity",
        "windSpeed",
        "weatherCode",
        "precipitationProbability",
        "uvIndex",
        "sunriseTime",
        "sunsetTime",
        "particulateMatter25",
        "particulateMatter10"
      ],
      timesteps: ["current", "1h", "1d"],
      units: "metric",
      apikey: TOMORROW_API_KEY
    };

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v));
      } else {
        queryParams.append(key, value);
      }
    });
    url.search = queryParams.toString();

    const response = await fetch(url);
    const data = await response.json();
    processWeatherData(data.data.timelines, lat, lon);
  } catch (error) {
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

function extractCurrentData(timelines) {
  const current = timelines.find(t => t.timestep === "current");
  return {
    temperature: current.intervals[0].values.temperature,
    temperatureApparent: current.intervals[0].values.temperatureApparent,
    humidity: current.intervals[0].values.humidity,
    windSpeed: current.intervals[0].values.windSpeed,
    weatherCode: current.intervals[0].values.weatherCode,
    precipitationProbability: current.intervals[0].values.precipitationProbability,
    airQuality: {
      pm25: current.intervals[0].values.particulateMatter25,
      pm10: current.intervals[0].values.particulateMatter10
    }
  };
}

function extractHourlyData(timelines) {
  return timelines
    .find(t => t.timestep === "1h")
    .intervals.map(interval => ({
      time: interval.startTime,
      temperature: interval.values.temperature,
      weatherCode: interval.values.weatherCode,
      precipitation: interval.values.precipitationProbability
    }));
}

function extractDailyData(timelines) {
  return timelines
    .find(t => t.timestep === "1d")
    .intervals.map(interval => ({
      date: interval.startTime,
      maxTemp: interval.values.temperatureMax,
      minTemp: interval.values.temperatureMin,
      weatherCode: interval.values.weatherCode,
      sunrise: interval.values.sunriseTime,
      sunset: interval.values.sunsetTime,
      uvIndex: interval.values.uvIndex,
      precipitation: interval.values.precipitationProbability
    }));
}

function updateCurrentWeather(data, lat, lon) {
  domElements.currentWeather.innerHTML = `
    <div class="location-time">
      <div class="location">
        <h2>${domElements.searchInput.value || "Posizione attuale"}</h2>
        <p>${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</p>
      </div>
      <div class="current-date">
        ${new Date().toLocaleDateString("it-IT", { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
    <div class="current-main">
      <div class="temperature">
        <span class="temp-value">${Math.round(data.temperature)}</span>
        <span class="temp-unit">°C</span>
      </div>
      <div class="weather-condition">
        <i class="fas ${weatherMappings.icons[data.weatherCode]} condition-icon"></i>
        <div class="condition-text">${weatherMappings.descriptions[data.weatherCode]}</div>
      </div>
      <div class="weather-details">
        ${createDetailCard("fa-thermometer-half", "Percepiti", `${Math.round(data.temperatureApparent)}°C`)}
        ${createDetailCard("fa-wind", "Vento", `${data.windSpeed} km/h`)}
        ${createDetailCard("fa-tint", "Umidità", `${data.humidity}%`)}
        ${createDetailCard("fa-umbrella", "Pioggia", `${data.precipitationProbability}%`)}
      </div>
    </div>
  `;
}

function updateHourlyForecast(hourlyData) {
  domElements.hourlyForecast.innerHTML = `
    <div class="hourly-scroll">
      ${hourlyData.map(hour => `
        <div class="hour-card">
          <div class="hour-time">${new Date(hour.time).toLocaleTimeString('it-IT', { hour: '2-digit' })}</div>
          <i class="fas ${weatherMappings.icons[hour.weatherCode]} hour-icon"></i>
          <div class="hour-temp">${Math.round(hour.temperature)}°C</div>
          <div class="hour-precipitation">${hour.precipitation}%</div>
        </div>
      `).join('')}
    </div>
  `;
}

function updateDailyForecast(dailyData) {
  domElements.dailyForecast.innerHTML = dailyData.map(day => `
    <div class="day-card">
      <div class="day-info">
        <div class="day-name">${new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' })}</div>
        <i class="fas ${weatherMappings.icons[day.weatherCode]} day-icon"></i>
        <div class="day-text">${weatherMappings.descriptions[day.weatherCode]}</div>
      </div>
      <div class="day-temps">
        <span class="temp-max">${Math.round(day.maxTemp)}°</span>
        <span class="temp-min">${Math.round(day.minTemp)}°</span>
      </div>
      <div class="day-details">
        <div class="day-detail">
          <i class="fas fa-sun"></i> ${new Date(day.sunrise).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div class="day-detail">
          <i class="fas fa-moon"></i> ${new Date(day.sunset).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div class="day-detail">
          <i class="fas fa-umbrella"></i> ${day.precipitation}%
        </div>
        <div class="day-detail">
          <i class="fas fa-sun"></i> UV ${day.uvIndex}
        </div>
      </div>
    </div>
  `).join('');
}

function updateAirQuality(airQuality) {
  domElements.airQuality.innerHTML = `
    <div class="aqi-value">${airQuality.pm25}</div>
    <div class="aqi-level">PM2.5: ${getAQILevel(airQuality.pm25)}</div>
    <div class="pollutants">
      <div class="pollutant">
        <div class="pollutant-name">PM10</div>
        <div class="pollutant-value">${airQuality.pm10} µg/m³</div>
      </div>
      <div class="pollutant">
        <div class="pollutant-name">PM2.5</div>
        <div class="pollutant-value">${airQuality.pm25} µg/m³</div>
      </div>
    </div>
  `;
}

function getAQILevel(pm25) {
  if (pm25 <= 12) return "Buono";
  if (pm25 <= 35) return "Moderato";
  if (pm25 <= 55) return "Scadente";
  return "Pericoloso";
}

// Implementazione Autocomplete
async function handleInput() {
  clearTimeout(searchTimeout);
  if (domElements.searchInput.value.length < 3) {
    domElements.autocomplete.style.display = 'none';
    return;
  }

  searchTimeout = setTimeout(async () => {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${domElements.searchInput.value}&limit=5&appid=${OPENWEATHER_API_KEY}`
    );
    const cities = await response.json();
    
    domElements.autocomplete.innerHTML = cities.map(city => `
      <div class="autocomplete-item" data-lat="${city.lat}" data-lon="${city.lon}">
        ${city.name}, ${city.country}
      </div>
    `).join('');
    
    domElements.autocomplete.style.display = cities.length ? 'block' : 'none';
  }, 300);
}

function handleAutocompleteSelect(e) {
  if (!e.target.classList.contains('autocomplete-item')) return;
  const lat = e.target.dataset.lat;
  const lon = e.target.dataset.lon;
  fetchWeather(lat, lon);
  domElements.autocomplete.style.display = 'none';
}

// Gestione posizione
async function handleGeolocation() {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    const { latitude, longitude } = position.coords;
    fetchWeather(latitude, longitude);
    updateLocationName(latitude, longitude);
  } catch (error) {
    fallbackToDefaultLocation();
  }
}

async function updateLocationName(lat, lon) {
  const response = await fetch(
    `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
  );
  const data = await response.json();
  domElements.searchInput.value = data[0]?.name || "Posizione attuale";
}

// Altre funzioni
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
  fetchWeather(41.9028, 12.4964);
  domElements.searchInput.value = "Roma, Italia";
}

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

function updateRealTime() {
  const now = new Date();
  domElements.time.textContent = now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
