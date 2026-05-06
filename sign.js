const RSS2JSON_KEY = "wuw4rxqjg1nthslkkjckgnvuewudnbe0robixltc";

const PROXY_URL = "https://api.allorigins.win/raw?url=";

const NEWS_FEEDS = [
    "https://feeds.npr.org/1001/rss.xml",
    "https://feeds.bbci.co.uk/news/rss.xml",
];

const MARKET_FEEDS = [
    "https://www.investing.com/rss/news_25.rss",
    "https://finance.yahoo.com/news/rss",
];

function addProxy(url) {
    return PROXY_URL + encodeURIComponent(url);
}

async function parseRss(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const items = xml.querySelectorAll("item");
    const feedTitle = xml.querySelector("channel > title")?.textContent || "";
    
    const articles = Array.from(items).slice(0, 20).map(item => ({
        title: item.querySelector("title")?.textContent || "",
        link: item.querySelector("link")?.textContent || "",
        description: item.querySelector("description, summary")?.textContent || "",
        pubDate: item.querySelector("pubDate")?.textContent || ""
    }));
    
    return { items: articles, source: feedTitle };
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
        throw new Error(`HTTP ${response.status}`);
    }
    const xmlText = await response.text();
    return parseRss(xmlText);
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

async function loadCustomFeed(url, targetElement) {
    targetElement.innerHTML = '<div class="ticker-item">Loading feed...</div>';
    try {
        const response = await fetch(addProxy(url));
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const xmlText = await response.text();
        
        if (xmlText.includes("<error>") || xmlText.includes("Exception")) {
            throw new Error("Invalid RSS feed");
        }
        
        const { items, source } = parseRss(xmlText);
        if (items.length === 0) {
            targetElement.innerHTML = '<div class="ticker-item">No articles found</div>';
            return;
        }
        targetElement.innerHTML = renderArticles(items.slice(0, 5), source, 0);
    } catch (err) {
        console.error("Feed load error:", err);
        targetElement.innerHTML = '<div class="ticker-item">Failed to load feed</div>';
    }
}

function isValidRssUrl(url) {
    const rssExtensions = [".rss", ".xml", "rss", "feed", "atom"];
    const lowerUrl = url.toLowerCase();
    return rssExtensions.some(ext => lowerUrl.includes(ext));
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
    const customFeedTarget = document.getElementById("customFeed");
    const customRssInput = document.getElementById("customRssUrl");
    const loadCustomBtn = document.getElementById("loadCustomFeed");

    if (newsTarget) loadFirstWorkingFeed(NEWS_FEEDS, newsTarget);
    if (marketTarget) loadFirstWorkingFeed(MARKET_FEEDS, marketTarget);

    function handleCustomFeedLoad() {
        const url = customRssInput.value.trim();
        if (!url) {
            customFeedTarget.innerHTML = '<div class="ticker-item">Please enter a URL</div>';
            return;
        }
        if (!isValidRssUrl(url)) {
            customFeedTarget.innerHTML = '<div class="ticker-item">Please enter a valid RSS feed URL</div>';
            return;
        }
        loadCustomFeed(url, customFeedTarget);
    }

    if (loadCustomBtn) {
        loadCustomBtn.addEventListener("click", handleCustomFeedLoad);
    }
    if (customRssInput) {
        customRssInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                handleCustomFeedLoad();
            }
        });
    }
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
        loadCustomFeed,
        loadFirstWorkingFeed,
        startSignage,
    };
}
