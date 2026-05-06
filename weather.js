const FORECAST_URL =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=39.7385&longitude=-104.9849" +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
    "&temperature_unit=fahrenheit" +
    "&wind_speed_unit=mph" +
    "&timezone=America/Denver" +
    "&forecast_days=7";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

async function fetchWeather() {
    const response = await fetch(FORECAST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

// Parse "YYYY-MM-DD" as a *local* date so the day name doesn't drift in
// timezones west of UTC (where `new Date("YYYY-MM-DD")` rolls back a day).
function shortDayFromISO(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

// WMO weather codes (https://open-meteo.com/en/docs#weather_variable_documentation)
function weatherCodeToDescription(code) {
    if (code === 0) return "Clear";
    if (code === 1) return "Mostly Clear";
    if (code === 2) return "Partly Cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Foggy";
    if (code >= 51 && code <= 55) return "Drizzle";
    if (code === 56 || code === 57) return "Freezing Drizzle";
    if (code >= 61 && code <= 65) return "Rain";
    if (code === 66 || code === 67) return "Freezing Rain";
    if (code >= 71 && code <= 75) return "Snow";
    if (code === 77) return "Snow Grains";
    if (code >= 80 && code <= 82) return "Rain Showers";
    if (code === 85 || code === 86) return "Snow Showers";
    if (code === 95) return "Thunderstorm";
    if (code === 96 || code === 99) return "Severe Thunderstorm";
    return "Unknown";
}

function weatherCodeToEmoji(code) {
    if (code === 0) return "☀️";
    if (code === 1) return "🌤️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 57) return "🌦️";
    if (code >= 61 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "🌨️";
    if (code >= 80 && code <= 82) return "🌧️";
    if (code === 85 || code === 86) return "❄️";
    if (code >= 95 && code <= 99) return "⛈️";
    return "❔";
}

function degreesToCardinal(deg) {
    return CARDINALS[Math.round(deg / 45) % 8];
}

function buildDays(daily) {
    return daily.time.map((iso, i) => ({
        label: shortDayFromISO(iso),
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        code: daily.weather_code[i],
    }));
}

function renderCurrent(currentTempF) {
    if (currentTempF == null) return "Weather unavailable";
    return `<span class="current-temp">${Math.round(currentTempF)}&deg;F</span>`;
}

function renderHero(current, todayCode) {
    if (!current) return "";
    const code = todayCode ?? current.weather_code;
    const temp = Math.round(current.temperature_2m);
    const feels = Math.round(current.apparent_temperature);
    const humidity = Math.round(current.relative_humidity_2m);
    const wind = Math.round(current.wind_speed_10m);
    const cardinal = current.wind_direction_10m != null
        ? degreesToCardinal(current.wind_direction_10m)
        : "";

    return `
        <div class="weather-hero">
            <div class="weather-hero-top">
                <span class="weather-icon-large">${weatherCodeToEmoji(code)}</span>
                <span class="weather-temp-large">${temp}<span class="weather-unit">&deg;F</span></span>
            </div>
            <div class="weather-description">${weatherCodeToDescription(code)}</div>
            <div class="weather-stats">
                <div class="stat-row"><span class="stat-label">Feels</span><span class="stat-value">${feels}&deg;F</span></div>
                <div class="stat-row"><span class="stat-label">Humidity</span><span class="stat-value">${humidity}%</span></div>
                <div class="stat-row"><span class="stat-label">Wind</span><span class="stat-value">${wind} mph ${cardinal}</span></div>
            </div>
        </div>
    `;
}

function forecastLabel(day, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return day.label;
}

function renderForecast(days) {
    const upcoming = days.slice(0, 7);
    const rows = upcoming.map((d, i) => `
        <div class="forecast-row">
            <span class="forecast-day">${forecastLabel(d, i)}</span>
            <span class="forecast-icon">${weatherCodeToEmoji(d.code)}</span>
            <span class="forecast-temps">
                <span class="high">${d.high}&deg;</span>
                <span class="low">${d.low}&deg;</span>
            </span>
        </div>
    `).join("");

    return `
        <h3 class="forecast-title">7-Day Forecast</h3>
        ${rows}
    `;
}

async function loadWeather() {
    const currentEl = document.getElementById("weather-display");
    const forecastEl = document.getElementById("weather-forecast");

    try {
        const data = await fetchWeather();
        const days = buildDays(data.daily);
        if (days.length < 7) throw new Error("Forecast data too short");

        if (currentEl) currentEl.innerHTML = renderCurrent(data.current?.temperature_2m);
        if (forecastEl) {
            forecastEl.innerHTML = renderHero(data.current, days[0]?.code) + renderForecast(days);
        }
    } catch (err) {
        const msg = `Weather unavailable: ${err.message}`;
        if (currentEl) currentEl.textContent = msg;
        if (forecastEl) forecastEl.innerHTML = `<div class="weather-error">${msg}</div>`;
    }
}

/* istanbul ignore next */
if (typeof window !== "undefined" && !window.__JEST__) {
    loadWeather();
    setInterval(loadWeather, 10 * 60 * 1000);
}

/* istanbul ignore else */
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        FORECAST_URL,
        fetchWeather,
        shortDayFromISO,
        weatherCodeToDescription,
        weatherCodeToEmoji,
        degreesToCardinal,
        buildDays,
        renderCurrent,
        renderHero,
        forecastLabel,
        renderForecast,
        loadWeather,
    };
}
