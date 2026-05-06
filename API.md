# Digital Signage API Documentation

## Overview

A dynamic digital signage widget displaying real-time weather forecasts, news headlines, market updates, and custom RSS feeds. Features a cyberpunk-themed UI with auto-rotating content.

---

## External APIs

### Open-Meteo Weather API

**Base URL:** `https://api.open-meteo.com/v1/forecast`

**Request Method:** `GET`

**Parameters:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `latitude` | `39.7385` | Denver, CO |
| `longitude` | `-104.9849` | Denver, CO |
| `current` | `temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code` | Current conditions |
| `daily` | `temperature_2m_max,temperature_2m_min,weather_code` | 7-day forecast |
| `temperature_unit` | `fahrenheit` | Temperature scale |
| `wind_speed_unit` | `mph` | Wind speed unit |
| `timezone` | `America/Denver` | Timezone |
| `forecast_days` | `7` | Number of forecast days |

**Response Format:**
```json
{
  "current": {
    "temperature_2m": 72,
    "apparent_temperature": 70,
    "relative_humidity_2m": 45,
    "wind_speed_10m": 8,
    "wind_direction_10m": 180,
    "weather_code": 1
  },
  "daily": {
    "time": ["2026-05-06", ...],
    "temperature_2m_max": [75, ...],
    "temperature_2m_min": [52, ...],
    "weather_code": [1, 2, ...]
  }
}
```

**Rate Limit:** None (free, no API key required)

**Documentation:** https://open-meteo.com/en/docs

---

### rss2json API

**Base URL:** `https://api.rss2json.com/v1/api.json`

**Request Method:** `GET`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `apikey` | API key (shared key for all feeds) |
| `rss_url` | URL-encoded RSS feed URL |

**Response Format:**
```json
{
  "status": "ok",
  "feed": { "title": "Feed Name", "url": "...", "link": "..." },
  "items": [
    {
      "title": "Article Title",
      "link": "https://example.com/article",
      "description": "Article summary...",
      "pubDate": "2026-05-06 12:00:00"
    }
  ]
}
```

**Rate Limit:** Free tier has limits; premium available

**Documentation:** https://rss2json.com/docs

---

### Default RSS Feeds

| Feed Name | URL | Content |
|-----------|-----|---------|
| NPR News | `https://feeds.npr.org/1001/rss.xml` | National/international news |
| BBC News | `https://feeds.bbci.co.uk/news/rss.xml` | World news |
| Investing.com | `https://www.investing.com/rss/news_25.rss` | Market news |
| Yahoo Finance | `https://finance.yahoo.com/news/rss` | Financial news |

---

## Module Functions

### weather.js

#### `fetchWeather()`
Fetches current conditions and 7-day forecast from Open-Meteo.

**Returns:** `Promise<Object>` - Weather data JSON

**Throws:** `Error` if HTTP status is not OK

---

#### `shortDayFromISO(iso)`
Converts ISO date string (YYYY-MM-DD) to 3-letter day abbreviation.

**Parameters:**
- `iso` (string): Date in ISO format

**Returns:** `string` - Day name (e.g., "Mon", "Tue")

---

#### `weatherCodeToDescription(code)`
Converts WMO weather code to human-readable description.

**Parameters:**
- `code` (number): WMO weather code (0-99)

**Returns:** `string` - Description (e.g., "Clear", "Rain", "Thunderstorm")

**Weather Code Reference:**
- 0: Clear, 1: Mostly Clear, 2: Partly Cloudy, 3: Overcast
- 45, 48: Foggy
- 51-57: Drizzle
- 61-65: Rain
- 71-75: Snow
- 95-99: Thunderstorm

---

#### `weatherCodeToEmoji(code)`
Converts WMO weather code to emoji icon.

**Parameters:**
- `code` (number): WMO weather code

**Returns:** `string` - Emoji (e.g., "☀️", "🌧️", "⛈️")

---

#### `degreesToCardinal(deg)`
Converts wind direction degrees to cardinal direction.

**Parameters:**
- `deg` (number): Degrees (0-360)

**Returns:** `string` - Cardinal direction (N, NE, E, SE, S, SW, W, NW)

---

#### `buildDays(daily)`
Transforms raw API data into day objects.

**Parameters:**
- `daily` (Object): Contains `time`, `temperature_2m_max`, `temperature_2m_min`, `weather_code` arrays

**Returns:** `Array<Object>` - Each with `label`, `high`, `low`, `code` properties

---

#### `renderCurrent(currentTempF)`
Generates HTML for current temperature display.

**Parameters:**
- `currentTempF` (number|null): Temperature in Fahrenheit

**Returns:** `string` - HTML with temperature

---

#### `renderHero(current, todayCode)`
Generates full weather hero section with current conditions.

**Parameters:**
- `current` (Object): Current weather data
- `todayCode` (number): Today's weather code

**Returns:** `string` - HTML for hero section including:
- Temperature with emoji
- Weather description
- Stats (feels like, humidity, wind speed/direction)

---

#### `forecastLabel(day, index)`
Formats day label for forecast rows.

**Parameters:**
- `day` (Object): Day object with `label`
- `index` (number): Position in forecast (0 = today)

**Returns:** `string` - "Today", "Tomorrow", or day label

---

#### `renderForecast(days)`
Generates HTML for 7-day forecast display.

**Parameters:**
- `days` (Array): Array of day objects

**Returns:** `string` - HTML with forecast title and rows for each day

---

#### `loadWeather()`
Fetches and renders weather data to DOM elements:
- `#weather-display` - Current temperature (header)
- `#weather-forecast` - Full hero + 7-day forecast

**Auto-refresh:** Every 10 minutes

---

### sign.js

#### `addProxy(url)`
Wraps URL with rss2json proxy and API key.

**Parameters:**
- `url` (string): Raw RSS feed URL

**Returns:** `string` - Proxy URL with encoded feed

---

#### `formatTime(date, timezone)`
Formats time using Intl.DateTimeFormat.

**Parameters:**
- `date` (Date): JavaScript Date object
- `timezone` (string): IANA timezone identifier

**Returns:** `string` - Formatted time (e.g., "02:30:00 PM")

---

#### `formatDate(date)`
Formats date in long format.

**Parameters:**
- `date` (Date): JavaScript Date object

**Returns:** `string` - Formatted date (e.g., "Wednesday, May 6, 2026")

---

#### `formatTimeAgo(pubDate)`
Formats publication date as relative time.

**Parameters:**
- `pubDate` (string): Publication date string

**Returns:** `string` - Relative time (e.g., "3H AGO", "1D AGO", "JUST NOW")

---

#### `buildArticleHTML(item, index, source)`
Generates HTML for article display with styling.

**Parameters:**
- `item` (Object): Article with `title`, `link`, `pubDate`
- `index` (number): Article number (1-3)
- `source` (string): Feed source name

**Returns:** `string` - HTML anchor element with:
- Number badge (e.g., "01")
- Title
- Source label + time ago meta

---

#### `renderArticles(items, source, offset)`
Renders visible articles with cycling support.

**Parameters:**
- `items` (Array): Array of article items
- `source` (string): Feed source name
- `offset` (number): Starting index for cycling

**Returns:** `string` - HTML for VISIBLE_COUNT articles

---

#### `fetchFeed(url)`
Fetches and parses RSS feed via proxy.

**Parameters:**
- `url` (string): RSS feed URL

**Returns:** `Promise<Object>` - `{ items, source }`

**Throws:** `Error` on HTTP error or bad status

---

#### `fetchRSS(url, targetElement)`
Fetches feed and renders to DOM element.

**Parameters:**
- `url` (string): RSS feed URL
- `targetElement` (HTMLElement): Container element

**Returns:** `Promise<Object>` - `{ items, source }`

---

#### `startCycling(items, source, targetElement, intervalMs)`
Starts auto-cycling of visible articles.

**Parameters:**
- `items` (Array): Article items
- `source` (string): Feed source name
- `targetElement` (HTMLElement): Container element
- `intervalMs` (number): Cycle interval (default: 20000ms)

**Returns:** `number|null` - Interval ID or null if < VISIBLE_COUNT items

---

#### `loadFirstWorkingFeed(feeds, targetElement)`
Tries feeds in order until one succeeds.

**Parameters:**
- `feeds` (Array): Array of RSS feed URLs
- `targetElement` (HTMLElement): Container element

---

#### `loadCustomFeed(url, targetElement)`
Loads custom RSS feed with proxy fallback.

**Parameters:**
- `url` (string): RSS feed URL
- `targetElement` (HTMLElement): Container element

**Note:** Falls back through multiple CORS proxies. Requires local server for full functionality.

---

#### `startSignage()`
Initializes all components on page load.

**Updates:**
- Clock: Every second
- Date: Every hour
- News feed: First working feed from NEWS_FEEDS
- Markets feed: First working feed from MARKET_FEEDS
- Featured section: User input or preset buttons

---

## Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `RSS2JSON_KEY` | `"wuw4rxqjg1nthslkkjckgnvuewudnbe0robixltc"` | rss2json API key |
| `NEWS_FEEDS` | NPR, BBC URLs | News RSS sources |
| `MARKET_FEEDS` | Investing, Yahoo URLs | Market RSS sources |
| `VISIBLE_COUNT` | `3` | Articles shown at once |
| `CYCLE_MS` | `20000` | Article rotation interval (20 sec) |
| `DAY_NAMES` | `["Sun", "Mon", ...]` | Day abbreviations |
| `CARDINALS` | `["N", "NE", "E", ...]` | Wind direction labels |

---

## DOM Elements

| ID | Location | Purpose |
|----|----------|---------|
| `date-display` | Header (time-card) | Current date |
| `clockDisplay` | Header (time-card) | Live time |
| `timezoneSelection` | Header (time-card) | Timezone selector |
| `weather-display` | Header (info-bar) | Current temperature |
| `weather-forecast` | Header (forecast) | Full weather widget |
| `newsFeed` | Main (ticker-wrapper-news) | News articles |
| `marketFeed` | Main (ticker-wrapper-market) | Market articles |
| `customFeed` | Main (ticker-wrapper-custom) | Custom RSS/Featured |
| `customRssUrl` | Featured section | RSS URL input |
| `loadCustomFeed` | Featured section | Load button |
| `.preset-btn` | Featured section | Quick feed buttons |

---

## CSS Classes

### Layout
| Class | Description |
|-------|-------------|
| `.grid-bg` | Cyberpunk grid background with glow effects |
| `.header-container` | Not used (now uses `.time-card` + `.forecast`) |
| `.time-card` | Clock/date container with corner brackets |
| `.forecast` | Weather widget container |

### Weather
| Class | Description |
|-------|-------------|
| `.weather-hero` | Current conditions display |
| `.weather-icon-large` | Weather emoji (4rem) |
| `.weather-temp-large` | Temperature display (4.5rem) |
| `.weather-description` | Weather condition text |
| `.weather-stats` | Stats container (feels/humidity/wind) |
| `.stat-row` | Individual stat row |
| `.stat-label` | Stat label text |
| `.stat-value` | Stat value (cyan color) |
| `.forecast-title` | "7-Day Forecast" header |
| `.forecast-row` | Individual day row (grid layout) |
| `.forecast-day` | Day label (uppercase) |
| `.forecast-icon` | Weather emoji for day |
| `.forecast-temps` | High/low temperature display |
| `.forecast-temps .high` | High temp (cyan, bold) |
| `.forecast-temps .low` | Low temp (muted) |

### Articles
| Class | Description |
|-------|-------------|
| `.news-article` | Article link container |
| `.news-num` | Article number badge |
| `.news-content` | Title and meta container |
| `.news-title` | Article title |
| `.news-meta` | Source and time container |
| `.news-source` | Feed source label (cyan) |
| `.news-divider` | Separator dot |
| `.news-time` | Relative time (amber) |

### Custom Feed
| Class | Description |
|-------|-------------|
| `.custom-input-row` | Input + button container |
| `.custom-rss-input` | URL input field |
| `.custom-rss-btn` | Load button |
| `.feed-presets` | Preset buttons container |
| `.preset-btn` | Individual preset button |
| `.demo-note` | Server requirement note |

### Card Styling
| Class | Description |
|-------|-------------|
| `.card-corners` | Corner bracket decoration |
| `.section-title` | Section header (e.g., "News") |
| `.ticker-track` | Article container |

---

## Fonts (Google Fonts)

| Font | Use |
|------|-----|
| **Orbitron** | Clock display, temperature, section titles |
| **JetBrains Mono** | Date, timezone, meta info, inputs |
| **Inter** | Body text, article titles |

---

## Dependencies

- **No build step required** - Vanilla JavaScript
- **No external JS libraries** - Native fetch + DOMParser
- **Google Fonts** - Orbitron, JetBrains Mono, Inter

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `fetch` API and `Intl` object
- Works in Node.js for testing (Jest)

---

## Local Server Setup (Optional)

For full custom RSS functionality, run a local server:

```bash
npm run server
```

Or with Python:
```bash
python -m http.server 8080
```

Access at: `http://localhost:8080/sign.html`

Without server, custom URL input has limited functionality due to CORS restrictions.