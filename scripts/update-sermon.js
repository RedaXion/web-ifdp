const fs = require('fs');
const https = require('https');
const path = require('path');

const CHANNEL_ID = 'UCcgpamwj34bvCGeYdbRsHMw';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const INDEX_HTML_PATH = path.join(__dirname, '../index.html');

https.get(FEED_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let xml = '';
  res.on('data', (chunk) => xml += chunk);
  res.on('end', () => {
    try {
      const entryMatch = xml.match(/<entry>(.*?)<\/entry>/s);
      if (!entryMatch) {
        console.error('No video entries found in YouTube feed.');
        process.exit(1);
      }
      
      const entry = entryMatch[1];
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      
      if (!videoIdMatch || !titleMatch) {
        console.error('Could not parse video ID or title.');
        process.exit(1);
      }
      
      const videoId = videoIdMatch[1].trim();
      const title = titleMatch[1].trim();
      
      console.log(`Latest video found: ${title} (${videoId})`);
      
      let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
      
      // Replace iframe src
      const iframeRegex = /src="https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]+(\?[^"]+)?"/;
      html = html.replace(iframeRegex, `src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1"`);
      
      // Replace sermon title
      const titleRegex = /<h3 class="sermon-title">[^<]+<\/h3>/;
      html = html.replace(titleRegex, `<h3 class="sermon-title">${title}</h3>`);
      
      // Replace button link
      const btnLinkRegex = /href="https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+([^"]+)?"/;
      html = html.replace(btnLinkRegex, `href="https://www.youtube.com/watch?v=${videoId}"`);
      
      fs.writeFileSync(INDEX_HTML_PATH, html, 'utf8');
      console.log('Successfully updated index.html');
      
    } catch (error) {
      console.error('Error parsing feed:', error);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching feed:', err);
  process.exit(1);
});
