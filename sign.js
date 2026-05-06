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

function buildArticleSummary(item) {
    const title = item.title || "Untitled";
    let summary = title;
    if (item.description) {
        const textOnly = item.description.replace(/<[^>]*>/g, "").trim();
        if (textOnly.length > 0) {
            summary = textOnly.length > 200 ? textOnly.substring(0, 200) + "..." : textOnly;
        }
    }
    return `<strong>${title}</strong><p class="article-summary">${summary}</p>`;
}

async function fetchFeed(url) {
    const response = await fetch(addProxy(url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status !== "ok") throw new Error("Feed error");
    return data.items || [];
}

async function fetchAllArticles(feeds, maxItems) {
    const allArticles = [];
    for (const url of feeds) {
        try {
            const items = await fetchFeed(url);
            allArticles.push(...items);
        } catch {
            continue;
        }
    }
    return allArticles.slice(0, maxItems);
}

function renderArticles(articles, targetElement) {
    if (articles.length === 0) {
        targetElement.innerHTML = '<div class="feed-item">No articles available</div>';
        return;
    }
    targetElement.innerHTML = "";
    articles.forEach((item) => {
        const div = document.createElement("div");
        div.className = "feed-item";
        div.innerHTML = buildArticleSummary(item);
        targetElement.appendChild(div);
    });
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
    if (newsTarget) {
        Promise.all([
            fetchAllArticles(NEWS_FEEDS, 3),
            fetchAllArticles(MARKET_FEEDS, 3),
        ]).then(([news, market]) => {
            const combined = [...news, ...market];
            renderArticles(combined, newsTarget);
        }).catch(() => {
            newsTarget.innerHTML = '<div class="feed-item">Unable to load articles</div>';
        });
    }
}

if (typeof document !== "undefined" && typeof window !== "undefined" && !window.__JEST__) {
    document.addEventListener("DOMContentLoaded", startSignage);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        RSS2JSON_KEY,
        NEWS_FEEDS,
        MARKET_FEEDS,
        addProxy,
        formatTime,
        formatDate,
        buildArticleSummary,
        fetchFeed,
        fetchAllArticles,
        renderArticles,
        startSignage,
    };
}