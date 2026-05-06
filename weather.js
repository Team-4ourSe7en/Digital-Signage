// Open-Meteo: free, keyless, returns up to 16 days of daily highs/lows in
// Fahrenheit plus a current observation. forecast_days=8 = today + the next 7
// days, which is exactly what we want for the widget.
const FORECAST_URL =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=39.7385&longitude=-104.9849" +
    "&current=temperature_2m" +
    "&daily=temperature_2m_max,temperature_2m_min" +
    "&temperature_unit=fahrenheit" +
    "&timezone=America/Denver" +
    "&forecast_days=8";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function fetchWeather() {
    const response = await fetch(FORECAST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

// Convert "YYYY-MM-DD" into a 3-letter day name. Parsing the parts manually
// avoids the timezone shifts you get from `new Date("YYYY-MM-DD")`, which is
// interpreted as UTC midnight and can roll back a day in local time.
function shortDayFromISO(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function buildDays(daily) {
    return daily.time.map((iso, i) => ({
        label: shortDayFromISO(iso),
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
    }));
}

function renderCurrent(currentTempF) {
    if (currentTempF == null) return "Weather unavailable";
    return `<span class="current-temp">${Math.round(currentTempF)}&deg;F</span>`;
}

function renderForecast(days) {
    // Skip index 0 (today) and render the next 7 days.
    const upcoming = days.slice(1, 8);
    const rows = upcoming.map((d) => `
        <div class="forecast-row">
            <span class="forecast-day">${d.label}</span>
            <span class="forecast-temps">
                <span class="high">${d.high}&deg;</span>
                <span class="low">${d.low}&deg;</span>
            </span>
        </div>
    `).join("");

    return `
        <h2 class="forecast-title">7-Day Forecast</h2>
        ${rows}
    `;
}

async function loadWeather() {
    const currentEl = document.getElementById("weather-display");
    const forecastEl = document.getElementById("weather-forecast");

    try {
        const data = await fetchWeather();
        const days = buildDays(data.daily);
        if (days.length < 8) throw new Error("Forecast data too short");

        if (currentEl) currentEl.innerHTML = renderCurrent(data.current?.temperature_2m);
        if (forecastEl) forecastEl.innerHTML = renderForecast(days);
    } catch (err) {
        const msg = `Weather unavailable: ${err.message}`;
        if (currentEl) currentEl.textContent = msg;
        if (forecastEl) forecastEl.innerHTML = `<div class="weather-error">${msg}</div>`;
    }
}

loadWeather();
// Refresh every 10 minutes.
setInterval(loadWeather, 10 * 60 * 1000);
