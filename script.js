// Configurazioni
const TOMORROW_API_KEY = "AOSiRYoH04Jkvrb6iZmuNgMqcPredaKw";
const OPENTOMORROW_DEBUG = true;
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
const weatherMappings = { /* ... (rimane invariato) */ };

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
        "pressureSurfaceLevel",
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
    queryParams.append("location", params.location);
    params.fields.forEach(field => queryParams.append("fields", field));
    params.timesteps.forEach(step => queryParams.append("timesteps", step));
    queryParams.append("units", params.units);
    queryParams.append("apikey", params.apikey);
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

// Implementazione funzioni mancanti
async function updateLocationName(lat, lon) {
  const response = await fetch(
    `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=YOUR_API_KEY`
  );
  const data = await response.json();
  domElements.searchInput.value = data[0].name;
}

function extractDailyData(timelines) {
  const dailyTimeline = timelines.find(t => t.timestep === "1d");
  return dailyTimeline.intervals.map(interval => ({
    date: interval.startTime.split("T")[0],
    minTemp: interval.values.temperatureMin,
    maxTemp: interval.values.temperatureMax,
    weatherCode: interval.values.weatherCode,
    precipitation: interval.values.precipitationProbability,
    uvIndex: interval.values.uvIndex,
    sunrise: interval.values.sunriseTime,
    sunset: interval.values.sunsetTime
  }));
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

// Aggiornamento autocomplete
async function handleInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (domElements.searchInput.value.length < 3) return;
    
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${domElements.searchInput.value}&limit=5&appid=YOUR_API_KEY`
    );
    const data = await response.json();
    
    domElements.autocomplete.innerHTML = data.map(city => `
      <div class="autocomplete-item" data-lat="${city.lat}" data-lon="${city.lon}">
        ${city.name}, ${city.country}
      </div>
    `).join('');
    
    domElements.autocomplete.style.display = 'block';
  }, 300);
}

// Aggiornamento orologio
function updateRealTime() {
  const now = new Date();
  domElements.time.textContent = now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Gestione click su risultati autocomplete
domElements.autocomplete.addEventListener('click', (e) => {
  if (e.target.classList.contains('autocomplete-item')) {
    const lat = e.target.dataset.lat;
    const lon = e.target.dataset.lon;
    fetchWeather(lat, lon);
    domElements.autocomplete.style.display = 'none';
  }
});
