const RSS2JSON_KEY = "wuw4rxqjg1nthslkkjckgnvuewudnbe0robixltc";

const NEWS_FEEDS = [
    "https://feeds.npr.org/1001/rss.xml",
    "https://feeds.bbci.co.uk/news/rss.xml",
];

const MARKET_FEEDS = [
    "https://www.investing.com/rss/news_25.rss",
    "https://finance.yahoo.com/news/rss",
];

const VISIBLE_COUNT = 3;
const CYCLE_MS = 20000;

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

// Returns a short relative-time label like "3H AGO" / "5M AGO" / "JUST NOW".
function formatTimeAgo(pubDate) {
    if (!pubDate) return "";
    const date = new Date(pubDate);
    if (isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (days > 0) return `${days}D AGO`;
    if (hours > 0) return `${hours}H AGO`;
    if (minutes > 0) return `${minutes}M AGO`;
    return "JUST NOW";
}

function buildArticleHTML(item, index, source) {
    const num = String(index).padStart(2, "0");
    const timeAgo = formatTimeAgo(item.pubDate);
    const sourceLabel = source ? source.toUpperCase() : "";
    const metaParts = [];
    if (sourceLabel) metaParts.push(`<span class="news-source">${sourceLabel}</span>`);
    if (timeAgo) metaParts.push(`<span class="news-time">${timeAgo}</span>`);
    const meta = metaParts.join(`<span class="news-divider">·</span>`);

    return `
        <a href="${item.link}" target="_blank" class="news-article">
            <span class="news-num">${num}</span>
            <div class="news-content">
                <h3 class="news-title">${item.title}</h3>
                <div class="news-meta">${meta}</div>
            </div>
        </a>
    `;
}

// Renders VISIBLE_COUNT articles starting at offset, wrapping around the end
// of the items array so cycling is endless even with short feeds.
function renderArticles(items, source, offset) {
    if (!items.length) return "";
    let html = "";
    for (let i = 0; i < VISIBLE_COUNT; i++) {
        const item = items[(offset + i) % items.length];
        html += buildArticleHTML(item, i + 1, source);
    }
    return html;
}

async function fetchFeed(url) {
    const response = await fetch(addProxy(url));
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== "ok") {
        throw new Error("Feed returned bad status");
    }
    return { items: data.items || [], source: (data.feed && data.feed.title) || "" };
}

async function fetchRSS(url, targetElement) {
    const { items, source } = await fetchFeed(url);
    targetElement.innerHTML = renderArticles(items, source, 0);
    return { items, source };
}

// Rotates the visible 3 articles every intervalMs, wrapping at the end.
function startCycling(items, source, targetElement, intervalMs = CYCLE_MS) {
    if (items.length <= VISIBLE_COUNT) return null;
    let offset = VISIBLE_COUNT;
    return setInterval(() => {
        targetElement.innerHTML = renderArticles(items, source, offset);
        offset = (offset + VISIBLE_COUNT) % items.length;
    }, intervalMs);
}

// Try each feed in order until one succeeds, then start cycling its items.
async function loadFirstWorkingFeed(feeds, targetElement) {
    for (const url of feeds) {
        try {
            const { items, source } = await fetchRSS(url, targetElement);
            startCycling(items, source, targetElement);
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
        VISIBLE_COUNT,
        CYCLE_MS,
        addProxy,
        formatTime,
        formatDate,
        formatTimeAgo,
        buildArticleHTML,
        renderArticles,
        fetchFeed,
        fetchRSS,
        startCycling,
        loadFirstWorkingFeed,
        startSignage,
    };
}
