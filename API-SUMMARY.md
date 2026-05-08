# DIGITAL SIGNAGE WIDGET

## API QUICK REFERENCE

### WEATHER API
Open-Meteo (free, no key)
```
https://api.open-meteo.com/v1/forecast
?latitude=39.7385&longitude=-104.9849
&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code
&daily=temperature_2m_max,temperature_2m_min,weather_code
&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Denver&forecast_days=7
```

### RSS API
rss2json.com (shared key)
```
https://api.rss2json.com/v1/api.json?apikey={KEY}&rss_url={ENCODED_URL}
```

### NEWS FEEDS
NPR | BBC | Investing.com | Yahoo Finance
(Combined, shuffled, 5 articles per view, 20 sec rotation)

### FEATURED PRESETS
[BBC News] [NPR]

### CONFIG
- VISIBLE_COUNT: 5 articles
- CYCLE_MS: 20000 (20 sec)
- Weather refresh: 10 min

### FILES
sign.html | sign.js | weather.js | sign.css | weather.css

### RUN
npx serve . -p 8080