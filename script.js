// Configurazione
const TOMORROW_API_KEY = "AOSiRYoH04Jkvrb6iZmuNgMqcPredaKw";
let weatherChart = null;
let searchTimeout = null;
let currentLocation = { lat: null, lon: null };

// Elementi DOM
const realTimeElement = document.getElementById("real-time");
const themeToggle = document.getElementById("theme-toggle");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const gpsBtn = document.getElementById("gps-btn");
const autocompleteResults = document.getElementById("autocomplete-results");
const currentWeatherElement = document.getElementById("current-weather");
const hourlyForecastElement = document.getElementById("hourly-forecast");
const dailyForecastElement = document.getElementById("daily-forecast");
const airQualityElement = document.getElementById("air-quality");

// Mappatura icone meteo
const weatherIcons = {
  "clear": "fa-sun",
  "partly-cloudy": "fa-cloud-sun",
  "cloudy": "fa-cloud",
  "overcast": "fa-cloud",
  "fog": "fa-smog",
  "light-rain": "fa-cloud-rain",
  "rain": "fa-cloud-showers-heavy",
  "heavy-rain": "fa-cloud-showers-water",
  "thunderstorm": "fa-bolt",
  "snow": "fa-snowflake",
  "hail": "fa-cloud-meatball"
};

// Inizializzazione
document.addEventListener("DOMContentLoaded", () => {
  updateRealTime();
  setInterval(updateRealTime, 1000);
  loadThemePreference();
  
  // Event listeners
  themeToggle.addEventListener("change", toggleTheme);
  searchBtn.addEventListener("click", searchWeather);
  gpsBtn.addEventListener("click", handleGeolocation);
  
  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchWeather();
  });
  
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      autocompleteResults.style.display = "none";
    }
  });

  // Richiedi geolocalizzazione all'avvio
  handleGeolocation();
});

// Funzioni core
function updateRealTime() {
  const now = new Date();
  realTimeElement.textContent = now.toLocaleTimeString("it-IT");
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggle.checked = savedTheme === "dark";
}

function toggleTheme() {
  const newTheme = themeToggle.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}

function handleSearchInput() {
  clearTimeout(searchTimeout);
  autocompleteResults.innerHTML = "";
  
  if (searchInput.value.length > 2) {
    searchTimeout = setTimeout(() => fetchAutocomplete(searchInput.value), 300);
  } else {
    autocompleteResults.style.display = "none";
  }
}

function searchWeather() {
  const query = searchInput.value.trim();
  if (query) {
    fetch(`https://api.tomorrow.io/v4/geocode?query=${query}&apikey=${TOMORROW_API_KEY}`)
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then(data => {
        if (data.features && data.features.length > 0) {
          const coords = data.features[0].geometry.coordinates;
          currentLocation = { lat: coords[1], lon: coords[0] };
          fetchWeatherByCoords(coords[1], coords[0]);
          searchInput.value = `${data.features[0].properties.name}, ${data.features[0].properties.country}`;
          autocompleteResults.style.display = "none";
        } else {
          throw new Error("Nessun risultato trovato");
        }
      })
      .catch(error => showError(error.message));
  }
}

async function fetchAutocomplete(query) {
  try {
    const response = await fetch(
      `https://api.tomorrow.io/v4/geocode?query=${query}&apikey=${TOMORROW_API_KEY}`
    );
    
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      autocompleteResults.innerHTML = data.features
        .slice(0, 5) // Limita a 5 risultati
        .map(feature => `
          <div class="autocomplete-item" 
               data-lat="${feature.geometry.coordinates[1]}" 
               data-lon="${feature.geometry.coordinates[0]}">
            ${feature.properties.name}, 
            ${feature.properties.region || feature.properties.country}
          </div>
        `).join("");
      
      autocompleteResults.style.display = "block";
      
      // Aggiungi event listener agli item
      document.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
          currentLocation = {
            lat: item.dataset.lat,
            lon: item.dataset.lon
          };
          searchInput.value = item.textContent.trim();
          autocompleteResults.style.display = "none";
          fetchWeatherByCoords(item.dataset.lat, item.dataset.lon);
        });
      });
    } else {
      autocompleteResults.style.display = "none";
    }
  } catch (error) {
    console.error("Autocomplete error:", error);
    autocompleteResults.style.display = "none";
  }
}

function handleGeolocation() {
  if (!navigator.geolocation) {
    showError("La geolocalizzazione non è supportata dal tuo browser");
    return;
  }

  showLoading("Rilevamento posizione in corso...");
  
  navigator.geolocation.getCurrentPosition(
    position => {
      currentLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
      reverseGeocode(position.coords.latitude, position.coords.longitude);
    },
    error => {
      console.error("Geolocation error:", error);
      showError("Permesso di localizzazione negato. Usa la ricerca manuale.");
      // Fallback a Roma
      currentLocation = { lat: 41.9028, lon: 12.4964 };
      fetchWeatherByCoords(41.9028, 12.4964);
      searchInput.value = "Roma, Italia";
    },
    { timeout: 10000 }
  );
}

async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://api.tomorrow.io/v4/geocode/reverse?location=${lat},${lon}&apikey=${TOMORROW_API_KEY}`
    );
    
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const location = data.features[0].properties;
      searchInput.value = `${location.name}, ${location.country}`;
    }
  } catch (error) {
    console.error("Reverse geocode error:", error);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    showLoading("Caricamento dati meteo...");
    
    const timesteps = ["current", "1h", "1d"];
    const fields = [
      "temperature", "feelsLike", "humidity", "windSpeed", "windDirection", 
      "pressureSurfaceLevel", "weatherCode", "precipitationProbability", 
      "visibility", "uvIndex", "dewPoint", "sunriseTime", "sunsetTime",
      "moonPhase", "airQuality"
    ];
    
    const url = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=${fields.join(",")}&timesteps=${timesteps.join(",")}&units=metric&apikey=${TOMORROW_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Errore API: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data?.timelines) {
      processWeatherData(data.data.timelines, lat, lon);
    } else {
      throw new Error("Dati meteo non disponibili");
    }
    
  } catch (error) {
    showError(`Errore: ${error.message}`);
    console.error("Fetch error:", error);
  }
}

function processWeatherData(timelines, lat, lon) {
  // Estrai dati dalle timeline
  const currentData = timelines.find(t => t.timestep === "current")?.intervals[0]?.values;
  const hourlyData = timelines.find(t => t.timestep === "1h")?.intervals || [];
  const dailyData = timelines.find(t => t.timestep === "1d")?.intervals || [];
  
  if (!currentData) {
    throw new Error("Dati correnti non disponibili");
  }

  // Mostra dati correnti
  displayCurrentWeather(currentData, lat, lon);
  
  // Mostra previsioni orarie (prossime 12 ore)
  displayHourlyForecast(hourlyData.slice(0, 12));
  
  // Mostra previsioni giornaliere (7 giorni)
  displayDailyForecast(dailyData.slice(0, 7));
  
  // Mostra qualità dell'aria (se disponibile)
  if (currentData.airQuality) {
    displayAirQuality(currentData.airQuality);
  } else {
    airQualityElement.innerHTML = "<div class='error'>Dati qualità aria non disponibili</div>";
  }
}

function displayCurrentWeather(data, lat, lon) {
  const weatherCode = getWeatherCode(data.weatherCode);
  
  currentWeatherElement.innerHTML = `
    <div class="location-time">
      <div class="location">
        <h2>${searchInput.value || "Posizione attuale"}</h2>
        <p>${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</p>
      </div>
      <div class="current-date">
        ${new Date().toLocaleDateString("it-IT", { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long',
          year: 'numeric'
        })}
      </div>
    </div>
    
    <div class="current-main">
      <div class="temperature">
        <span class="temp-value">${Math.round(data.temperature)}</span>
        <span class="temp-unit">°C</span>
      </div>
      
      <div class="weather-condition">
        <i class="fas ${weatherIcons[weatherCode] || "fa-cloud-sun"} condition-icon"></i>
        <div class="condition-text">${getWeatherDescription(weatherCode)}</div>
      </div>
      
      <div class="weather-feelslike">
        <div>Percepiti: ${Math.round(data.feelsLike)}°C</div>
        <div>${getTemperatureDescription(data.temperature)}</div>
      </div>
    </div>
    
    <div class="weather-details">
      <div class="detail-card">
        <i class="fas fa-wind"></i>
        <div class="detail-title">Vento</div>
        <div class="detail-value">${Math.round(data.windSpeed)} km/h</div>
      </div>
      
      <div class="detail-card">
        <i class="fas fa-tint"></i>
        <div class="detail-title">Umidità</div>
        <div class="detail-value">${Math.round(data.humidity)}%</div>
      </div>
      
      <div class="detail-card">
        <i class="fas fa-compass"></i>
        <div class="detail-title">Pressione</div>
        <div class="detail-value">${Math.round(data.pressureSurfaceLevel)} hPa</div>
      </div>
      
      <div class="detail-card">
        <i class="fas fa-umbrella"></i>
        <div class="detail-title">Pioggia</div>
        <div class="detail-value">${Math.round(data.precipitationProbability || 0)}%</div>
      </div>
    </div>
  `;
}

function displayHourlyForecast(hourlyData) {
  if (hourlyData.length === 0) {
    hourlyForecastElement.innerHTML = "<div class='error'>Dati orari non disponibili</div>";
    return;
  }

  hourlyForecastElement.innerHTML = hourlyData.map(hour => {
    const time = new Date(hour.startTime);
    const weatherCode = getWeatherCode(hour.values.weatherCode);
    
    return `
      <div class="hour-card">
        <div class="hour-time">${time.getHours()}:00</div>
        <i class="fas ${weatherIcons[weatherCode] || "fa-cloud-sun"} hour-icon"></i>
        <div class="hour-temp">${Math.round(hour.values.temperature)}°</div>
        ${hour.values.precipitationProbability ? `
          <div class="hour-precipitation">
            <i class="fas fa-umbrella"></i> ${Math.round(hour.values.precipitationProbability)}%
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
}

function displayDailyForecast(dailyData) {
  if (dailyData.length === 0) {
    dailyForecastElement.innerHTML = "<div class='error'>Dati giornalieri non disponibili</div>";
    return;
  }

  dailyForecastElement.innerHTML = dailyData.map((day, index) => {
    const date = new Date(day.startTime);
    const weatherCode = getWeatherCode(day.values.weatherCode);
    
    return `
      <div class="day-card">
        <div class="day-info">
          <div class="day-name">
            ${index === 0 ? 'Oggi' : date.toLocaleDateString("it-IT", { weekday: 'short' })}
          </div>
          <i class="fas ${weatherIcons[weatherCode] || "fa-cloud-sun"} day-icon"></i>
          <div class="day-text">${getWeatherDescription(weatherCode)}</div>
        </div>
        
        <div class="day-temps">
          <span class="temp-max">${Math.round(day.values.temperatureMax)}°</span>
          <span class="temp-min">${Math.round(day.values.temperatureMin)}°</span>
        </div>
        
        <div class="day-details">
          <div class="day-detail">
            <i class="fas fa-tint"></i>
            <span>${Math.round(day.values.humidity)}%</span>
          </div>
          <div class="day-detail">
            <i class="fas fa-umbrella"></i>
            <span>${Math.round(day.values.precipitationProbability || 0)}%</span>
          </div>
          <div class="day-detail">
            <i class="fas fa-wind"></i>
            <span>${Math.round(day.values.windSpeed)} km/h</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
  
  // Renderizza il grafico
  renderTemperatureChart(dailyData);
}

function displayAirQuality(aqiData) {
  const aqi = Math.round(aqiData.epaIndex || 0);
  const level = getAQILevel(aqi);
  
  airQualityElement.innerHTML = `
    <div class="aqi-value" style="color: ${level.color}">${aqi}</div>
    <div class="aqi-level" style="color: ${level.color}">${level.text}</div>
    <div class="aqi-description">${level.description}</div>
    
    <div class="pollutants">
      <div class="pollutant">
        <span class="pollutant-name">PM2.5</span>
        <span class="pollutant-value">${aqiData.pm25?.toFixed(1) || '--'} µg/m³</span>
      </div>
      <div class="pollutant">
        <span class="pollutant-name">PM10</span>
        <span class="pollutant-value">${aqiData.pm10?.toFixed(1) || '--'} µg/m³</span>
      </div>
      <div class="pollutant">
        <span class="pollutant-name">NO₂</span>
        <span class="pollutant-value">${aqiData.no2?.toFixed(1) || '--'} µg/m³</span>
      </div>
      <div class="pollutant">
        <span class="pollutant-name">O₃</span>
        <span class="pollutant-value">${aqiData.o3?.toFixed(1) || '--'} µg/m³</span>
      </div>
    </div>
  `;
}

function renderTemperatureChart(dailyData) {
  const ctx = document.getElementById("weather-chart").getContext("2d");
  
  const labels = dailyData.map(day => 
    new Date(day.startTime).toLocaleDateString("it-IT", { weekday: 'short' })
  );
  
  const maxTemps = dailyData.map(day => day.values.temperatureMax);
  const minTemps = dailyData.map(day => day.values.temperatureMin);
  const avgTemps = dailyData.map(day => (day.values.temperatureMax + day.values.temperatureMin) / 2);
  
  if (weatherChart) weatherChart.destroy();
  
  weatherChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Massima",
          data: maxTemps,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.3,
          fill: true
        },
        {
          label: "Media",
          data: avgTemps,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          tension: 0.3,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: "Minima",
          data: minTemps,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.1)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: { 
          mode: "index", 
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}°C`;
            }
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return value + "°C";
            }
          }
        }
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false
      }
    }
  });
}

// Funzioni helper
function getWeatherCode(code) {
  const codes = {
    1000: "clear",
    1100: "partly-cloudy",
    1101: "partly-cloudy",
    1102: "partly-cloudy",
    1001: "cloudy",
    2000: "fog",
    2100: "fog",
    4000: "light-rain",
    4001: "rain",
    4200: "light-rain",
    4201: "rain",
    5000: "snow",
    5001: "snow",
    5100: "snow",
    5101: "snow",
    6000: "hail",
    6001: "hail",
    6200: "hail",
    6201: "hail",
    7000: "thunderstorm",
    7101: "thunderstorm",
    7102: "thunderstorm",
    8000: "thunderstorm"
  };
  return codes[code