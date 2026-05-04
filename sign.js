
document.addEventListener('DOMContentLoaded', () => {

    const addProxy = (url) => {
        const api_key = `wuw4rxqjg1nthslkkjckgnvuewudnbe0robixltc`
        const proxyPrefix = `https://api.rss2json.com/v1/api.json?api_key=${api_key}&rss_url=`;
        return `${proxyPrefix}${encodeURIComponent(url)}`;
    };


    const selector = document.getElementById('timezoneSelection');
    const clockDisplay = document.getElementById('clockDisplay');

    function updateTime() {
        const now = new Date();
        const selectedTimezone = selector.value;

        const timeString = new Intl.DateTimeFormat('en-US', {
            timeZone: selectedTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);

        clockDisplay.textContent = timeString;


    }
    setInterval(updateTime, 1000);

    updateTime();

    function updateDate () {
        const dateDisplay = document.getElementById('date-display');

        const now = new Date();

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        const formattedDate = now.toLocaleDateString(undefined, options);

        dateDisplay.textContent = formattedDate;
    }
    setInterval(updateDate, 3600000);

    updateDate();

    async function newsRSS () {
        const target = document.getElementById('newsFeed');
        const feeds = [
            'https://feeds.npr.org/1001/rss.xml',
            'https://feeds.bbci.co.uk/news/rss.xml',
        ];
        for (const url of feeds) {
            try {
                await fetchRSS(url, target);
                return;
            } catch {
                continue;
            }
        }       
    }

    newsRSS();

    async function marketRSS () {
        const target = document.getElementById('marketFeed');
        const money_feeds = [
            'https://www.investing.com/rss/news_25.rss',
            'https://finance.yahoo.com/news/rss',
        ];

        for (const url of money_feeds) {
            try {
                await fetchRSS(url, target);
                return;
            } catch {
                continue;
            }
        }
    }
    
    marketRSS();


    async function variableRSS () {
        const target = document.getElementById('customFeed');
    }


    async function fetchRSS(url, targetElement) {
        const proxyApplied = addProxy(url);
        const response = await fetch(proxyApplied);
        if(!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);

        if (data.status !== 'ok') {
            throw new Error('Feed returned bad status')
        }
        
        targetElement.innerHTML = '';

        data.items.forEach(item => {
            const article = document.createElement('div');
            article.innerHTML = `
            <a href="${item.link}" target="_blank" style="display:block; margin-bottom: 8px;">
                <strong>${item.title}</strong>
            </a>
            `;
            targetElement.appendChild(article)

        });   
    }

});