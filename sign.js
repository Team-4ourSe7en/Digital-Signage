const RSS2JSON_KEY = "wuw4rxqjg1nthslkkjckgnvuewudnbe0robixltc";

const NEWS_FEEDS = [
    "https://feeds.npr.org/1001/rss.xml",
    "https://feeds.bbci.co.uk/news/rss.xml",
];

const MARKET_FEEDS = [
    "https://www.investing.com/rss/news_25.rss",
    "https://finance.yahoo.com/news/rss",
];

function addProxy(url) {
    const proxyPrefix = `https://api.rss2json.com/v1/api.json?api_key=${RSS2JSON_KEY}&rss_url=`;
    return `${proxyPrefix}${encodeURIComponent(url)}`;
}

function formatTime(date, timezone) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    }).format(date);
}

function formatDate(date) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString(undefined, options);
}

function buildArticleHTML(item) {
    return `
            <a href="${item.link}" target="_blank" style="display:block; margin-bottom: 8px;">
                <strong>${item.title}</strong>
            </a>
            `;
}

async function fetchRSS(url, targetElement) {
    const response = await fetch(addProxy(url));
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== "ok") {
        throw new Error("Feed returned bad status");
    }
    targetElement.innerHTML = "";
    data.items.forEach((item) => {
        const article = document.createElement("div");
        article.innerHTML = buildArticleHTML(item);
        targetElement.appendChild(article);
    });
}

// Try each feed in order until one succeeds.
async function loadFirstWorkingFeed(feeds, targetElement) {
    for (const url of feeds) {
        try {
            await fetchRSS(url, targetElement);
            return;
        } catch {
            continue;
        }
    }
}

function startSignage() {
    const selector = document.getElementById("timezoneSelection");
    const clockDisplay = document.getElementById("clockDisplay");
    const dateDisplay = document.getElementById("date-display");

    function updateTime() {
        clockDisplay.textContent = formatTime(new Date(), selector.value);
    }
    setInterval(updateTime, 1000);
    updateTime();

    function updateDate() {
        dateDisplay.textContent = formatDate(new Date());
    }
    setInterval(updateDate, 3600000);
    updateDate();

    const newsTarget = document.getElementById("newsFeed");
    const marketTarget = document.getElementById("marketFeed");
    if (newsTarget) loadFirstWorkingFeed(NEWS_FEEDS, newsTarget);
    if (marketTarget) loadFirstWorkingFeed(MARKET_FEEDS, marketTarget);
}

/* istanbul ignore next */
if (typeof document !== "undefined" && typeof window !== "undefined" && !window.__JEST__) {
    document.addEventListener("DOMContentLoaded", startSignage);
}

/* istanbul ignore else */
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        RSS2JSON_KEY,
        NEWS_FEEDS,
        MARKET_FEEDS,
        addProxy,
        formatTime,
        formatDate,
        buildArticleHTML,
        fetchRSS,
        loadFirstWorkingFeed,
        startSignage,
    };
}
