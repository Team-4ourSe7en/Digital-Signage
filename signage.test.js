/**
 * @jest-environment jsdom
 */

// Tell the modules they're being loaded by Jest so their browser bootstrap
// code doesn't fire on require.
window.__JEST__ = true;

const weather = require("./weather");
const sign = require("./sign");

afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = "";
});

describe("weather.shortDayFromISO", () => {
    test("returns the correct 3-letter day name", () => {
        // 2026-05-07 is a Thursday
        expect(weather.shortDayFromISO("2026-05-07")).toBe("Thu");
    });

    test("doesn't drift across timezones (parses local, not UTC)", () => {
        // 2026-01-01 is a Thursday locally regardless of timezone offset
        expect(weather.shortDayFromISO("2026-01-01")).toBe("Thu");
    });
});

describe("weather.buildDays", () => {
    const sample = {
        time: ["2026-05-06", "2026-05-07", "2026-05-08"],
        temperature_2m_max: [40.4, 65.2, 71.6],
        temperature_2m_min: [27.1, 41.9, 46.4],
    };

    test("maps each ISO date into a label/high/low object", () => {
        const days = weather.buildDays(sample);
        expect(days).toHaveLength(3);
        expect(days[0]).toEqual({ label: "Wed", high: 40, low: 27 });
        expect(days[1]).toEqual({ label: "Thu", high: 65, low: 42 });
    });

    test("rounds temperatures to integers", () => {
        const days = weather.buildDays(sample);
        days.forEach((d) => {
            expect(Number.isInteger(d.high)).toBe(true);
            expect(Number.isInteger(d.low)).toBe(true);
        });
    });
});

describe("weather.renderCurrent", () => {
    test("renders the rounded current temp in an HTML span", () => {
        const html = weather.renderCurrent(72.6);
        expect(html).toContain("73");
        expect(html).toContain("current-temp");
        expect(html).toContain("&deg;F");
    });

    test("returns an unavailable message when temp is null", () => {
        expect(weather.renderCurrent(null)).toBe("Weather unavailable");
    });

    test("returns an unavailable message when temp is undefined", () => {
        expect(weather.renderCurrent(undefined)).toBe("Weather unavailable");
    });
});

describe("weather.renderForecast", () => {
    const days = [
        { label: "Wed", high: 40, low: 27 }, // today (skipped)
        { label: "Thu", high: 65, low: 41 },
        { label: "Fri", high: 71, low: 46 },
        { label: "Sat", high: 77, low: 45 },
        { label: "Sun", high: 71, low: 46 },
        { label: "Mon", high: 85, low: 52 },
        { label: "Tue", high: 87, low: 55 },
        { label: "Wed", high: 80, low: 50 },
    ];

    test("includes the forecast title", () => {
        expect(weather.renderForecast(days)).toContain("7-Day Forecast");
    });

    test("skips today and renders 7 rows", () => {
        const html = weather.renderForecast(days);
        const rowCount = (html.match(/forecast-row/g) || []).length;
        expect(rowCount).toBe(7);
        expect(html).not.toContain(">Wed<\/span>\n            <span class=\"forecast-temps\">\n                <span class=\"high\">40");
        expect(html).toContain("Thu");
        expect(html).toContain("65&deg;");
    });
});

describe("weather.fetchWeather", () => {
    test("parses JSON when the response is OK", async () => {
        const fakeData = { current: { temperature_2m: 50 }, daily: { time: [] } };
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

    test("populates the DOM with current temp and forecast on success", async () => {
        const fakeData = {
            current: { temperature_2m: 30 },
            daily: {
                time: [
                    "2026-05-06", "2026-05-07", "2026-05-08", "2026-05-09",
                    "2026-05-10", "2026-05-11", "2026-05-12", "2026-05-13",
                ],
                temperature_2m_max: [40, 65, 71, 77, 71, 85, 87, 80],
                temperature_2m_min: [27, 41, 46, 45, 46, 52, 55, 50],
            },
        };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => fakeData });

        await weather.loadWeather();

        expect(document.getElementById("weather-display").innerHTML).toContain("30");
        expect(document.getElementById("weather-forecast").innerHTML).toContain("7-Day Forecast");
    });

    test("shows an error message when the fetch fails", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

        await weather.loadWeather();

        expect(document.getElementById("weather-display").textContent).toContain("Weather unavailable");
        expect(document.getElementById("weather-forecast").innerHTML).toContain("weather-error");
    });

    test("shows an error when the forecast data is too short", async () => {
        const tooShort = {
            current: { temperature_2m: 30 },
            daily: {
                time: ["2026-05-06", "2026-05-07"],
                temperature_2m_max: [40, 65],
                temperature_2m_min: [27, 41],
            },
        };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => tooShort });

        await weather.loadWeather();

        expect(document.getElementById("weather-forecast").innerHTML).toContain("too short");
    });

    test("doesn't crash when the target elements are missing on success", async () => {
        document.body.innerHTML = "";
        const fakeData = {
            current: { temperature_2m: 30 },
            daily: {
                time: [
                    "2026-05-06", "2026-05-07", "2026-05-08", "2026-05-09",
                    "2026-05-10", "2026-05-11", "2026-05-12", "2026-05-13",
                ],
                temperature_2m_max: [40, 65, 71, 77, 71, 85, 87, 80],
                temperature_2m_min: [27, 41, 46, 45, 46, 52, 55, 50],
            },
        };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => fakeData });

        await expect(weather.loadWeather()).resolves.toBeUndefined();
    });

    test("doesn't crash when the target elements are missing on error", async () => {
        document.body.innerHTML = "";
        global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

        await expect(weather.loadWeather()).resolves.toBeUndefined();
    });
});

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
        // Expect something like "12:00:00 PM"
        expect(result).toMatch(/^12:00:00\s?PM$/i);
    });

    test("respects the timezone parameter", () => {
        const noonUTC = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
        const denver = sign.formatTime(noonUTC, "America/Denver");
        // Denver is UTC-7 in January (MST)
        expect(denver).toMatch(/^05:00:00\s?AM$/i);
    });
});

describe("sign.formatDate", () => {
    test("returns a long-form weekday/month/day/year string", () => {
        const date = new Date(2026, 4, 6); // May 6, 2026 - a Wednesday
        const formatted = sign.formatDate(date);
        expect(formatted).toContain("Wednesday");
        expect(formatted).toContain("May");
        expect(formatted).toContain("2026");
    });
});

describe("sign.buildArticleHTML", () => {
    test("includes the link and title in an anchor tag", () => {
        const html = sign.buildArticleHTML({
            link: "https://news.example/story",
            title: "Big news today",
        });
        expect(html).toContain('href="https://news.example/story"');
        expect(html).toContain("<strong>Big news today</strong>");
        expect(html).toContain('target="_blank"');
    });
});

describe("sign.fetchRSS", () => {
    let target;
    beforeEach(() => {
        target = document.createElement("div");
        document.body.appendChild(target);
    });

    test("renders one anchor per item on a successful response", async () => {
        const fakeData = {
            status: "ok",
            items: [
                { link: "https://a.example", title: "Story A" },
                { link: "https://b.example", title: "Story B" },
            ],
        };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => fakeData });

        await sign.fetchRSS("https://feed.example/rss", target);

        expect(target.querySelectorAll("a")).toHaveLength(2);
        expect(target.innerHTML).toContain("Story A");
        expect(target.innerHTML).toContain("Story B");
    });

    test("throws when the HTTP response is not OK", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
        await expect(sign.fetchRSS("https://feed.example/rss", target)).rejects.toThrow("HTTP error: 503");
    });

    test("throws when the feed status is not 'ok'", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: "error", items: [] }),
        });
        await expect(sign.fetchRSS("https://feed.example/rss", target)).rejects.toThrow("bad status");
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
            items: [{ link: "https://ok.example", title: "Worked" }],
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
