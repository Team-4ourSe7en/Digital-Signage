# Digital Signage API Documentation

## Overview

This application displays a digital signage widget for office environments, featuring real-time weather forecasts, news headlines, and a customizable RSS feed.

## External APIs

### Open-Meteo Weather API

**Base URL:** `https://api.open-meteo.com/v1/forecast`

**Request Method:** `GET`

**Parameters:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `latitude` | `39.7385` | Denver, CO |
| `longitude` | `-104.9849` | Denver, CO |
| `current` | `temperature_2m` | Current temperature |
| `daily` | `temperature_2m_max,temperature_2m_min` | Daily high/low temps |
| `temperature_unit` | `fahrenheit` | Temperature scale |
| `timezone` | `America/Denver` | Timezone |
| `forecast_days` | `8` | Today + 7 days |

**Response Format:**
```json
{
  "current": {
    "temperature_2m": 72
  },
  "daily": {
    "time": ["2025-01-01", "2025-01-02", ...],
    "temperature_2m_max": [75, 78, ...],
    "temperature_2m_min": [52, 48, ...]
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
| `api_key` | Private API key (required) |
| `rss_url` | URL-encoded RSS feed URL |

**Response Format:**
```json
{
  "status": "ok",
  "items": [
    {
      "title": "Article Title",
      "link": "https://example.com/article",
      "description": "Article summary text...",
      "pubDate": "2025-01-01 12:00:00"
    }
  ]
}
```

**Rate Limit:** Depends on subscription tier

**Documentation:** https://rss2json.com/docs

---

### RSS News Feeds

| Source | URL | Content |
|--------|-----|---------|
| NPR News | `https://feeds.npr.org/1001/rss.xml` | National news |
| BBC News | `https://feeds.bbci.co.uk/news/rss.xml` | International news |

---

### RSS Market Feeds

| Source | URL | Content |
|--------|-----|---------|
| Investing.com | `https://www.investing.com/rss/news_25.rss` | Market news |
| Yahoo Finance | `https://finance.yahoo.com/news/rss` | Financial news |

---

## Module Functions

### weather.js

#### `fetchWeather()`

Fetches weather data from Open-Meteo API.

**Returns:** `Promise<Object>` - Weather data JSON

**Throws:** `Error` if HTTP status is not OK

---

#### `shortDayFromISO(iso)`

Converts ISO date string to 3-letter day abbreviation.

**Parameters:**
- `iso` (string): Date in "YYYY-MM-DD" format

**Returns:** `string` - Day name (e.g., "Mon", "Tue")

---

#### `buildDays(daily)`

Transforms raw API data into day objects.

**Parameters:**
- `daily` (Object): Contains `time`, `temperature_2m_max`, `temperature_2m_min` arrays

**Returns:** `Array<Object>` - Each with `label`, `high`, `low` properties

---

#### `renderCurrent(currentTempF)`

Generates HTML for current temperature display.

**Parameters:**
- `currentTempF` (number|null): Temperature in Fahrenheit

**Returns:** `string` - HTML string with current temp

---

#### `renderForecast(days)`

Generates HTML for 7-day forecast display.

**Parameters:**
- `days` (Array): Array of day objects from `buildDays()`

**Returns:** `string` - HTML with forecast rows (skips today, shows next 7 days)

---

#### `loadWeather()`

Fetches and renders weather data to DOM elements:
- `#weather-display` - Current temperature
- `#weather-forecast` - 7-day forecast

**Auto-refresh:** Every 10 minutes

---

### sign.js

#### `addProxy(url)`

Wraps URL with rss2json proxy and API key.

**Parameters:**
- `url` (string): Raw RSS feed URL

**Returns:** `string` - Proxy URL with encoded feed and API key

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

**Returns:** `string` - Formatted date (e.g., "Wednesday, January 1, 2025")

---

#### `buildArticleSummary(item)`

Creates HTML for article display without links.

**Parameters:**
- `item` (Object): RSS item with `title` and optional `description`

**Returns:** `string` - HTML with title and truncated description (max 200 chars)

---

#### `fetchFeed(url)`

Fetches and parses a single RSS feed via proxy.

**Parameters:**
- `url` (string): RSS feed URL

**Returns:** `Promise<Array>` - Array of article items

**Throws:** `Error` on HTTP error or bad status

---

#### `fetchAllArticles(feeds, maxItems)`

Fetches from multiple feeds and combines results.

**Parameters:**
- `feeds` (Array): Array of RSS feed URLs
- `maxItems` (number): Maximum articles to return

**Returns:** `Promise<Array>` - Combined articles (up to maxItems)

---

#### `renderArticles(articles, targetElement)`

Renders articles to a DOM element.

**Parameters:**
- `articles` (Array): Array of article items
- `targetElement` (HTMLElement): Container element

---

#### `startSignage()`

Initializes clock, date, and RSS feeds on page load.

**Updates:**
- Clock: Every second
- Date: Every hour
- News feed: Once on load (3 news + 3 market articles)

---

## Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `RSS2JSON_KEY` | Private key | rss2json API key |
| `DAY_NAMES` | `["Sun", "Mon", ...]` | Day abbreviations |
| `NEWS_FEEDS` | NPR, BBC | News RSS sources |
| `MARKET_FEEDS` | Investing, Yahoo | Market RSS sources |

---

## DOM Elements

| ID | Location | Purpose |
|----|----------|---------|
| `weather-display` | Header | Current temperature |
| `weather-forecast` | Main content | 7-day forecast |
| `clockDisplay` | Header | Live time |
| `date-display` | Header | Current date |
| `timezoneSelection` | Header | Timezone dropdown |
| `newsFeed` | Main content | Combined news/market articles |
| `customFeed` | Main content | User-configurable RSS |

---

## CSS Classes

| Class | Description |
|-------|-------------|
| `.header-container` | Header layout wrapper |
| `.clock` | Time display (4rem) |
| `.forecast-section` | Weather widget container |
| `.forecast-row` | Individual day in forecast |
| `.feed-section` | RSS feed container |
| `.feed-item` | Individual article |
| `.article-summary` | Article description text |

---

## Dependencies

- **No build step required** - Vanilla JavaScript
- **No external JS libraries** - Native fetch API
- **CSS reset** - Normalize.css not required

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `fetch` API and `Intl` object
- Works in Node.js for testing (Jest)