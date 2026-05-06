const RSS2JSON_KEY = "wuw4rxqjg1nthslkkjckgnvuewudnbe0robixltc";

const TOPIC_FEEDS = {
    world: {
        title: "World",
        feeds: [
            "https://feeds.bbci.co.uk/news/rss.xml",
            "https://feeds.npr.org/1001/rss.xml"
        ]
    },
    politics: {
        title: "Politics",
        feeds: [
            "https://feeds.bbci.co.uk/news/politics/rss.xml",
            "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"
        ]
    },
    stock: {
        title: "Stock Market",
        feeds: [
            "https://www.investing.com/rss/news_25.rss",
            "https://finance.yahoo.com/news/rss"
        ]
    },
    culture: {
        title: "Culture",
        feeds: [
            "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
            "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml"
        ]
    },
    science: {
        title: "Science",
        feeds: [
            "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
            "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml"
        ]
    }
};

const VISIBLE_COUNT = 3;
const CYCLE_MS = 20000;

function addProxy(url) {
    return `https://api.rss2json.com/v1/api.json?apikey=${RSS2JSON_KEY}&rss_url=${encodeURIComponent(url)}`;
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
    
    const description = item.description || item.content || '';
    const cleanDesc = description.replace(/<[^>]*>/g, '').substring(0, 200);
    const summary = cleanDesc.length > 0 ? `<p class="article-summary">${cleanDesc}${cleanDesc.length >= 200 ? '...' : ''}</p>` : '';

    return `
        <div class="news-article">
            <span class="news-num">${num}</span>
            <div class="news-content">
                <h3 class="news-title">${item.title}</h3>
                <div class="news-meta">${meta}</div>
                ${summary}
            </div>
        </div>
    `;
}

function renderArticles(items, source, offset) {
    if (!items.length) return "";
    let html = "";
    for (let i = 0; i < VISIBLE_COUNT; i++) {
        const item = items[(offset + i) % items.length];
        html += buildArticleHTML(item, i + 1, source);
    }
    return html;
}

function renderArticlesWithTags(items, offset) {
    if (!items.length) return "";
    let html = "";
    for (let i = 0; i < Math.min(VISIBLE_COUNT, items.length); i++) {
        const item = items[(offset + i) % items.length];
        html += buildArticleHTMLWithTag(item, i + 1);
    }
    return html;
}

function buildArticleHTMLWithTag(item, index) {
    const num = String(index).padStart(2, "0");
    const timeAgo = formatTimeAgo(item.pubDate);
    const topicLabel = item.topicLabel || '';
    const sourceLabel = item.source || '';
    
    const metaParts = [];
    if (topicLabel) metaParts.push(`<span class="news-topic">${topicLabel}</span>`);
    if (timeAgo) metaParts.push(`<span class="news-time">${timeAgo}</span>`);
    if (sourceLabel) metaParts.push(`<span class="news-source">${sourceLabel.toUpperCase()}</span>`);
    const meta = metaParts.join(`<span class="news-divider">·</span>`);
    
    const description = item.description || item.content || '';
    const cleanDesc = description.replace(/<[^>]*>/g, '').substring(0, 200);
    const summary = cleanDesc.length > 0 ? `<p class="article-summary">${cleanDesc}${cleanDesc.length >= 200 ? '...' : ''}</p>` : '';

    return `
        <div class="news-article">
            <span class="news-num">${num}</span>
            <div class="news-content">
                <h3 class="news-title">${item.title}</h3>
                <div class="news-meta">${meta}</div>
                ${summary}
            </div>
        </div>
    `;
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

function startCycling(items, source, targetElement, intervalMs = CYCLE_MS) {
    if (items.length <= VISIBLE_COUNT) return null;
    let offset = VISIBLE_COUNT;
    return setInterval(() => {
        targetElement.innerHTML = renderArticles(items, source, offset);
        offset = (offset + VISIBLE_COUNT) % items.length;
    }, intervalMs);
}

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

function loadCustomFeed(url, targetElement) {
    targetElement.innerHTML = '<div class="ticker-item">Loading feed...</div>';
    
    fetch(addProxy(url))
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ok' && data.items?.length > 0) {
                targetElement.innerHTML = renderArticles(data.items.slice(0, 5), data.feed?.title || '', 0);
            } else {
                targetElement.innerHTML = '<div class="ticker-item">No articles found</div>';
            }
        })
        .catch(() => {
            targetElement.innerHTML = '<div class="ticker-item">Feed unavailable (needs server)</div>';
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
        newsTarget.innerHTML = '<div class="ticker-item">Loading headlines…</div>';
        Promise.all(
            Object.keys(TOPIC_FEEDS).map(topic => 
                loadFirstWorkingFeed(TOPIC_FEEDS[topic].feeds, null)
                    .then(result => result ? { ...result, topic } : null)
                    .catch(() => null)
            )
        ).then(results => {
            const allItems = results
                .filter(r => r && r.items.length > 0)
                .map(r => ({
                    ...r,
                    topicLabel: TOPIC_FEEDS[r.topic]?.title || r.topic
                }));
            
            if (allItems.length > 0) {
                const shuffled = allItems.sort(() => Math.random() - 0.5);
                const shuffledItems = shuffled.flatMap(r => r.items.map(item => ({
                    ...item,
                    topicLabel: r.topicLabel
                })));
                newsTarget.innerHTML = renderArticlesWithTags(shuffledItems.slice(0, 10), 0);
            }
        });
    }

    const customFeedTarget = document.getElementById("customFeed");
    const customRssInput = document.getElementById("customRssUrl");
    const loadCustomBtn = document.getElementById("loadCustomFeed");

    function handleCustomFeedLoad() {
        const url = customRssInput.value.trim();
        if (url) {
            loadCustomFeed(url, customFeedTarget);
        }
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            if (url) {
                customRssInput.value = url;
                loadCustomFeed(url, customFeedTarget);
            }
        });
    });
}

/* istanbul ignore next */
if (typeof document !== "undefined" && typeof window !== "undefined" && !window.__JEST__) {
    document.addEventListener("DOMContentLoaded", startSignage);
}

/* istanbul ignore else */
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        RSS2JSON_KEY,
        TOPIC_FEEDS,
        VISIBLE_COUNT,
        CYCLE_MS,
        addProxy,
        formatTime,
        formatDate,
        formatTimeAgo,
        buildArticleHTMLWithTag,
        renderArticles,
        renderArticlesWithTags,
        fetchFeed,
        fetchRSS,
        startCycling,
        loadCustomFeed,
        loadFirstWorkingFeed,
        startSignage,
    };
}