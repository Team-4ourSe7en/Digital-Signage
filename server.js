const express = require('express');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/api/rss', async (req, res) => {
    const feedUrl = req.query.url;
    
    if (!feedUrl) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        const response = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'Digital-Signage/1.0'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `HTTP ${response.status}` });
        }

        const xml = await response.text();
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xml);

        const channel = result.rss?.channel?.[0] || result.feed;
        const items = channel?.item || channel?.entry || [];
        
        const feedItems = items.slice(0, 10).map(item => {
            const title = item.title?.[0] || item['title'] || '';
            const link = item.link?.[0] || item['link']?.$.href || item.link || '';
            const description = item.description?.[0] || item.summary?.[0] || item.content?.[0] || '';
            const pubDate = item.pubDate?.[0] || item.published?.[0] || '';

            return { title, link, description, pubDate };
        });

        res.json({
            status: 'ok',
            items: feedItems,
            feed: { title: channel?.title?.[0] || '' }
        });
    } catch (err) {
        console.error('RSS fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

app.listen(PORT, () => {
    console.log(`RSS proxy server running on http://localhost:${PORT}`);
    console.log(`Usage: http://localhost:${PORT}/api/rss?url=YOUR_RSS_URL`);
});