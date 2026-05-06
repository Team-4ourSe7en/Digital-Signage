/**
 * @jest-environment jsdom
 */

window.__JEST__ = true;

const weather = require("./weather");
const sign = require("./sign");

afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = "";
});

const sampleCurrent = {
    temperature_2m: 30,
    apparent_temperature: 27,
    relative_humidity_2m: 87,
    wind_speed_10m: 2,
    wind_direction_10m: 45,
    weather_code: 3,
};

const sampleDailyData = {
    time: [
        "2026-05-06", "2026-05-07", "2026-05-08", "2026-05-09",
        "2026-05-10", "2026-05-11", "2026-05-12",
    ],
    temperature_2m_max: [40, 65, 71, 77, 71, 85, 87],
    temperature_2m_min: [27, 41, 46, 45, 46, 52, 55],
    weather_code: [3, 2, 1, 0, 2, 61, 95],
};

describe("weather.shortDayFromISO", () => {
    test("returns the correct 3-letter day name", () => {
        expect(weather.shortDayFromISO("2026-05-07")).toBe("Thu");
    });

    test("doesn't drift across timezones (parses local, not UTC)", () => {
        expect(weather.shortDayFromISO("2026-01-01")).toBe("Thu");
    });
});

describe("weather.weatherCodeToDescription", () => {
    const cases = [
        [0, "Clear"],
        [1, "Mostly Clear"],
        [2, "Partly Cloudy"],
        [3, "Overcast"],
        [45, "Foggy"],
        [48, "Foggy"],
        [51, "Drizzle"],
        [55, "Drizzle"],
        [56, "Freezing Drizzle"],
        [57, "Freezing Drizzle"],
        [61, "Rain"],
        [65, "Rain"],
        [66, "Freezing Rain"],
        [67, "Freezing Rain"],
        [71, "Snow"],
        [75, "Snow"],
        [77, "Snow Grains"],
        [80, "Rain Showers"],
        [82, "Rain Showers"],
        [85, "Snow Showers"],
        [86, "Snow Showers"],
        [95, "Thunderstorm"],
        [96, "Severe Thunderstorm"],
        [99, "Severe Thunderstorm"],
        [12345, "Unknown"],
    ];
    test.each(cases)("code %i maps to '%s'", (code, expected) => {
        expect(weather.weatherCodeToDescription(code)).toBe(expected);
    });
});

describe("weather.weatherCodeToEmoji", () => {
    const cases = [
        [0, "☀️"],
        [1, "🌤️"],
        [2, "⛅"],
        [3, "☁️"],
        [45, "🌫️"],
        [48, "🌫️"],
        [51, "🌦️"],
        [57, "🌦️"],
        [61, "🌧️"],
        [67, "🌧️"],
        [71, "🌨️"],
        [77, "🌨️"],
        [80, "🌧️"],
        [82, "🌧️"],
        [85, "❄️"],
        [86, "❄️"],
        [95, "⛈️"],
        [99, "⛈️"],
        [12345, "❔"],
    ];
    test.each(cases)("code %i maps to an emoji", (code, expected) => {
        expect(weather.weatherCodeToEmoji(code)).toBe(expected);
    });
});

describe("weather.degreesToCardinal", () => {
    test.each([
        [0, "N"],
        [45, "NE"],
        [90, "E"],
        [135, "SE"],
        [180, "S"],
        [225, "SW"],
        [270, "W"],
        [315, "NW"],
        [360, "N"],
    ])("%i° → %s", (deg, expected) => {
        expect(weather.degreesToCardinal(deg)).toBe(expected);
    });
});

describe("weather.buildDays", () => {
    test("maps each ISO date into a label/high/low/code object", () => {
        const days = weather.buildDays(sampleDailyData);
        expect(days).toHaveLength(7);
        expect(days[0]).toEqual({ label: "Wed", high: 40, low: 27, code: 3 });
        expect(days[1]).toEqual({ label: "Thu", high: 65, low: 41, code: 2 });
    });

    test("rounds temperatures to integers", () => {
        const fractional = {
            time: ["2026-05-06"],
            temperature_2m_max: [40.4],
            temperature_2m_min: [27.6],
            weather_code: [3],
        };
        const [day] = weather.buildDays(fractional);
        expect(day.high).toBe(40);
        expect(day.low).toBe(28);
    });
});

describe("weather.renderCurrent", () => {
    test("renders the rounded current temp in an HTML span", () => {
        const html = weather.renderCurrent(72.6);
        expect(html).toContain("73");
        expect(html).toContain("current-temp");
        expect(html).toContain("&deg;F");
    });

    test("returns an unavailable message when temp is null/undefined", () => {
        expect(weather.renderCurrent(null)).toBe("Weather unavailable");
        expect(weather.renderCurrent(undefined)).toBe("Weather unavailable");
    });
});

describe("weather.renderHero", () => {
    test("renders icon, temp, description, and stats", () => {
        const html = weather.renderHero(sampleCurrent, 3);
        expect(html).toContain("☁️");
        expect(html).toContain("30");
        expect(html).toContain("&deg;F");
        expect(html).toContain("Overcast");
        expect(html).toContain("Feels");
        expect(html).toContain("27");
        expect(html).toContain("Humidity");
        expect(html).toContain("87%");
        expect(html).toContain("Wind");
        expect(html).toContain("2 mph NE");
    });

    test("falls back to current.weather_code when todayCode is not provided", () => {
        const html = weather.renderHero(sampleCurrent);
        expect(html).toContain("Overcast");
    });

    test("returns empty string when current is missing", () => {
        expect(weather.renderHero(null, 3)).toBe("");
    });

    test("omits cardinal direction when wind_direction is missing", () => {
        const noDir = { ...sampleCurrent, wind_direction_10m: null };
        const html = weather.renderHero(noDir, 3);
        expect(html).toContain("2 mph");
        expect(html).not.toMatch(/2 mph [NSEW]/);
    });
});

describe("weather.forecastLabel", () => {
    test("returns 'Today' for index 0", () => {
        expect(weather.forecastLabel({ label: "Wed" }, 0)).toBe("Today");
    });
    test("returns 'Tomorrow' for index 1", () => {
        expect(weather.forecastLabel({ label: "Thu" }, 1)).toBe("Tomorrow");
    });
    test("returns the day's short label for any later index", () => {
        expect(weather.forecastLabel({ label: "Fri" }, 2)).toBe("Fri");
    });
});

describe("weather.renderForecast", () => {
    const days = weather.buildDays(sampleDailyData);

    test("includes the forecast title", () => {
        expect(weather.renderForecast(days)).toContain("7-Day Forecast");
    });

    test("renders 7 rows starting with Today and Tomorrow", () => {
        const html = weather.renderForecast(days);
        const rowCount = (html.match(/forecast-row/g) || []).length;
        expect(rowCount).toBe(7);
        expect(html).toContain("Today");
        expect(html).toContain("Tomorrow");
        expect(html).toContain("65&deg;");
    });

    test("includes a weather icon for each row", () => {
        const html = weather.renderForecast(days);
        expect(html).toContain("forecast-icon");
        expect(html).toContain("☁️");
    });
});

describe("weather.fetchWeather", () => {
    test("parses JSON when the response is OK", async () => {
        const fakeData = { current: sampleCurrent, daily: sampleDailyData };
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => fakeData,
        });
        const result = await weather.fetchWeather();
        expect(result).toEqual(fakeData);
        expect(global.fetch).toHaveBeenCalledWith(weather.FORECAST_URL);
    });

    test("throws when the response is not OK", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
        await expect(weather.fetchWeather()).rejects.toThrow("HTTP 500");
    });
});

describe("weather.loadWeather", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="weather-display"></div>
            <div id="weather-forecast"></div>
        `;
    });

    test("populates the DOM with current temp, hero, and forecast on success", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ current: sampleCurrent, daily: sampleDailyData }),
        });

        await weather.loadWeather();

        expect(document.getElementById("weather-display").innerHTML).toContain("30");
        const forecastHTML = document.getElementById("weather-forecast").innerHTML;
        expect(forecastHTML).toContain("Overcast");
        expect(forecastHTML).toContain("7-Day Forecast");
    });

    test("shows an error message when the fetch fails", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

        await weather.loadWeather();

        expect(document.getElementById("weather-display").textContent).toContain("Weather unavailable");
        expect(document.getElementById("weather-forecast").innerHTML).toContain("weather-error");
    });

    test("shows an error when the forecast data is too short", async () => {
        const tooShort = {
            current: sampleCurrent,
            daily: {
                time: ["2026-05-06", "2026-05-07"],
                temperature_2m_max: [40, 65],
                temperature_2m_min: [27, 41],
                weather_code: [3, 2],
            },
        };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => tooShort });

        await weather.loadWeather();

        expect(document.getElementById("weather-forecast").innerHTML).toContain("too short");
    });

    test("doesn't crash when target elements are missing on success", async () => {
        document.body.innerHTML = "";
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ current: sampleCurrent, daily: sampleDailyData }),
        });
        await expect(weather.loadWeather()).resolves.toBeUndefined();
    });

    test("doesn't crash when target elements are missing on error", async () => {
        document.body.innerHTML = "";
        global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
        await expect(weather.loadWeather()).resolves.toBeUndefined();
    });
});

/* ============================================================ */
/*                          sign.js                             */
/* ============================================================ */

describe("sign.addProxy", () => {
    test("wraps the feed URL with the rss2json proxy and key", () => {
        const proxied = sign.addProxy("https://example.com/rss.xml");
        expect(proxied).toContain("api.rss2json.com");
        expect(proxied).toContain(`api_key=${sign.RSS2JSON_KEY}`);
        expect(proxied).toContain(encodeURIComponent("https://example.com/rss.xml"));
    });

    test("URL-encodes feeds with query strings", () => {
        const proxied = sign.addProxy("https://example.com/feed?x=1&y=2");
        expect(proxied).toContain("%3Fx%3D1%26y%3D2");
    });
});

describe("sign.formatTime", () => {
    test("formats a known instant in a 12-hour AM/PM clock", () => {
        const noonUTC = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
        const result = sign.formatTime(noonUTC, "UTC");
        expect(result).toMatch(/^12:00:00\s?PM$/i);
    });

    test("respects the timezone parameter", () => {
        const noonUTC = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
        const denver = sign.formatTime(noonUTC, "America/Denver");
        expect(denver).toMatch(/^05:00:00\s?AM$/i);
    });
});

describe("sign.formatDate", () => {
    test("returns a long-form weekday/month/day/year string", () => {
        const date = new Date(2026, 4, 6); // Wednesday May 6, 2026
        const formatted = sign.formatDate(date);
        expect(formatted).toContain("Wednesday");
        expect(formatted).toContain("May");
        expect(formatted).toContain("2026");
    });
});

describe("sign.formatTimeAgo", () => {
    test("returns 'JUST NOW' for very recent dates", () => {
        const recent = new Date(Date.now() - 30 * 1000).toISOString();
        expect(sign.formatTimeAgo(recent)).toBe("JUST NOW");
    });

    test("returns minutes for under an hour", () => {
        const t = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        expect(sign.formatTimeAgo(t)).toBe("5M AGO");
    });

    test("returns hours for under a day", () => {
        const t = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        expect(sign.formatTimeAgo(t)).toBe("3H AGO");
    });

    test("returns days for one or more days", () => {
        const t = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        expect(sign.formatTimeAgo(t)).toBe("2D AGO");
    });

    test("returns empty string for missing dates", () => {
        expect(sign.formatTimeAgo(undefined)).toBe("");
        expect(sign.formatTimeAgo("")).toBe("");
    });

    test("returns empty string for unparseable dates", () => {
        expect(sign.formatTimeAgo("not a date")).toBe("");
    });
});

describe("sign.buildArticleHTML", () => {
    test("includes link, title, number, source, and time-ago in the markup", () => {
        const html = sign.buildArticleHTML(
            {
                link: "https://news.example/story",
                title: "Big news today",
                pubDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            },
            1,
            "Ars Technica"
        );
        expect(html).toContain('href="https://news.example/story"');
        expect(html).toContain("Big news today");
        expect(html).toContain('target="_blank"');
        expect(html).toContain("01");
        expect(html).toContain("ARS TECHNICA");
        expect(html).toContain("1H AGO");
    });

    test("zero-pads the number to two digits", () => {
        const html = sign.buildArticleHTML({ link: "x", title: "y" }, 7, "Source");
        expect(html).toContain("07");
    });

    test("omits source label when not provided", () => {
        const html = sign.buildArticleHTML({ link: "x", title: "y" }, 1, "");
        expect(html).not.toContain("news-source");
    });

    test("omits time-ago when pubDate is missing", () => {
        const html = sign.buildArticleHTML({ link: "x", title: "y" }, 1, "Source");
        expect(html).not.toContain("news-time");
    });
});

describe("sign.renderArticles", () => {
    const items = [
        { link: "https://a", title: "A", pubDate: new Date().toISOString() },
        { link: "https://b", title: "B", pubDate: new Date().toISOString() },
        { link: "https://c", title: "C", pubDate: new Date().toISOString() },
        { link: "https://d", title: "D", pubDate: new Date().toISOString() },
        { link: "https://e", title: "E", pubDate: new Date().toISOString() },
    ];

    test("renders exactly the visible-count starting at offset 0", () => {
        const html = sign.renderArticles(items, "Source", 0);
        expect(html).toContain(">A</h3>");
        expect(html).toContain(">B</h3>");
        expect(html).toContain(">C</h3>");
        expect(html).not.toContain(">D</h3>");
    });

    test("renders the next slice when offset advances", () => {
        const html = sign.renderArticles(items, "Source", 3);
        expect(html).toContain(">D</h3>");
        expect(html).toContain(">E</h3>");
    });

    test("wraps around the end of the list", () => {
        const html = sign.renderArticles(items, "Source", 4);
        expect(html).toContain(">E</h3>");
        expect(html).toContain(">A</h3>");
        expect(html).toContain(">B</h3>");
    });

    test("returns empty string when there are no items", () => {
        expect(sign.renderArticles([], "Source", 0)).toBe("");
    });
});

describe("sign.fetchFeed", () => {
    test("returns items and source title on a successful response", async () => {
        const fakeData = {
            status: "ok",
            feed: { title: "Source Name" },
            items: [{ link: "https://a", title: "A" }],
        };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => fakeData });

        const result = await sign.fetchFeed("https://feed.example");
        expect(result.items).toHaveLength(1);
        expect(result.source).toBe("Source Name");
    });

    test("falls back to empty source when feed metadata is missing", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: "ok", items: [] }),
        });
        const result = await sign.fetchFeed("https://feed.example");
        expect(result.source).toBe("");
        expect(result.items).toEqual([]);
    });

    test("falls back to empty array/string when items and feed are absent", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: "ok" }),
        });
        const result = await sign.fetchFeed("https://feed.example");
        expect(result.items).toEqual([]);
        expect(result.source).toBe("");
    });

    test("falls back to empty source when feed has no title", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: "ok", feed: {}, items: [] }),
        });
        const result = await sign.fetchFeed("https://feed.example");
        expect(result.source).toBe("");
    });

    test("throws when the HTTP response is not OK", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
        await expect(sign.fetchFeed("https://feed.example")).rejects.toThrow("HTTP error: 503");
    });

    test("throws when the feed status is not 'ok'", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: "error", items: [] }),
        });
        await expect(sign.fetchFeed("https://feed.example")).rejects.toThrow("bad status");
    });
});

describe("sign.fetchRSS", () => {
    let target;
    beforeEach(() => {
        target = document.createElement("div");
        document.body.appendChild(target);
    });

    test("renders up to 3 articles on success", async () => {
        const fakeData = {
            status: "ok",
            feed: { title: "Source" },
            items: [
                { link: "https://a", title: "Story A", pubDate: new Date().toISOString() },
                { link: "https://b", title: "Story B", pubDate: new Date().toISOString() },
                { link: "https://c", title: "Story C", pubDate: new Date().toISOString() },
                { link: "https://d", title: "Story D", pubDate: new Date().toISOString() },
            ],
        };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => fakeData });

        await sign.fetchRSS("https://feed.example", target);

        expect(target.querySelectorAll("a")).toHaveLength(3);
        expect(target.innerHTML).toContain("Story A");
        expect(target.innerHTML).toContain("Story C");
        expect(target.innerHTML).not.toContain("Story D");
    });

    test("propagates errors from fetchFeed", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
        await expect(sign.fetchRSS("https://feed.example", target)).rejects.toThrow("HTTP error: 500");
    });
});

describe("sign.startCycling", () => {
    let target;
    beforeEach(() => {
        jest.useFakeTimers();
        target = document.createElement("div");
        document.body.appendChild(target);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("rotates to the next slice after the interval elapses", () => {
        const items = [
            { link: "https://a", title: "A" }, { link: "https://b", title: "B" },
            { link: "https://c", title: "C" }, { link: "https://d", title: "D" },
            { link: "https://e", title: "E" }, { link: "https://f", title: "F" },
        ];
        const id = sign.startCycling(items, "Source", target, 1000);
        expect(id).not.toBeNull();

        jest.advanceTimersByTime(1000);
        expect(target.innerHTML).toContain(">D</h3>");
        expect(target.innerHTML).toContain(">F</h3>");

        clearInterval(id);
    });

    test("returns null and skips cycling when the feed is too short", () => {
        const items = [{ link: "https://a", title: "A" }];
        expect(sign.startCycling(items, "Source", target, 1000)).toBeNull();
    });
});

describe("sign.loadFirstWorkingFeed", () => {
    let target;
    beforeEach(() => {
        target = document.createElement("div");
        document.body.appendChild(target);
    });

    test("falls back to the next feed if the first one throws", async () => {
        const fakeData = {
            status: "ok",
            feed: { title: "Source" },
            items: [{ link: "https://ok", title: "Worked" }],
        };
        global.fetch = jest
            .fn()
            .mockRejectedValueOnce(new Error("first feed down"))
            .mockResolvedValueOnce({ ok: true, json: async () => fakeData });

        await sign.loadFirstWorkingFeed(["https://bad", "https://good"], target);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(target.innerHTML).toContain("Worked");
    });

    test("returns silently when every feed fails", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("everything down"));
        await expect(
            sign.loadFirstWorkingFeed(["https://a", "https://b"], target)
        ).resolves.toBeUndefined();
    });
});

describe("sign.startSignage", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = `
            <select id="timezoneSelection"><option value="UTC" selected>UTC</option></select>
            <div id="clockDisplay"></div>
            <div id="date-display"></div>
            <div id="newsFeed"></div>
            <div id="marketFeed"></div>
        `;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: "ok", items: [] }),
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("populates the clock and date elements on startup", () => {
        sign.startSignage();
        expect(document.getElementById("clockDisplay").textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
        expect(document.getElementById("date-display").textContent.length).toBeGreaterThan(0);
    });

    test("doesn't crash when the news/market feed elements are missing", () => {
        document.body.innerHTML = `
            <select id="timezoneSelection"><option value="UTC" selected>UTC</option></select>
            <div id="clockDisplay"></div>
            <div id="date-display"></div>
        `;
        expect(() => sign.startSignage()).not.toThrow();
    });
});
