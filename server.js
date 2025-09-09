import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Create directories for data storage if they don't exist
const DATA_DIR = path.join(__dirname, 'data');
const CRAWL_STATES_DIR = path.join(DATA_DIR, 'crawl_states');

async function initializeDataDirectories() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(CRAWL_STATES_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to initialize data directories:', error);
    }
}

// Initialize data directories on startup
initializeDataDirectories();

// Middleware to parse JSON
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Helper function to normalize URLs
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Remove fragment and trailing slash
        urlObj.hash = '';
        return urlObj.href.replace(/\/$/, '') || urlObj.href;
    } catch {
        return url;
    }
}

// Helper function to check if URL is internal (same domain)
function isInternalUrl(url, baseUrl) {
    try {
        const urlObj = new URL(url, baseUrl);
        const baseObj = new URL(baseUrl);
        return urlObj.hostname === baseObj.hostname;
    } catch {
        return false;
    }
}

// Parse document with Cheerio (server-side)
function parseDocument(html, url) {
    try {
        const $ = cheerio.load(html);
        
        // Extract basic metadata
        const title = $('title').text().trim() || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        
        // Extract headings
        const headings = {
            h1: $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean),
            h2: $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean),
            h3: $('h3').map((_, el) => $(el).text().trim()).get().filter(Boolean)
        };
        
        // Extract main content
        $('script, style, nav, header, footer, aside').remove();
        const mainElement = $('main, article, .content, #content').first();
        let mainContent = '';
        
        if (mainElement.length) {
            mainContent = mainElement.text();
        } else {
            mainContent = $('body').text();
        }
        
        // Clean up whitespace
        mainContent = mainContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
        
        // Extract links
        const links = $('a[href]')
            .map((_, el) => {
                const $el = $(el);
                const href = $el.attr('href');
                const text = $el.text().trim();
                
                if (!href || !text) return null;
                
                try {
                    const absoluteUrl = new URL(href, url).href;
                    return { text, url: absoluteUrl };
                } catch {
                    return null;
                }
            })
            .get()
            .filter(Boolean)
            .filter(link => link.url.startsWith('http'))
            .slice(0, 200); // Limit to 200 links
        
        // Extract internal links for crawling
        const internalLinks = links
            .filter(link => isInternalUrl(link.url, url))
            .map(link => normalizeUrl(link.url))
            .filter((url, index, array) => array.indexOf(url) === index); // Remove duplicates
        
        return {
            success: true,
            final_url: url,
            title,
            meta_description: metaDescription,
            headings,
            main_content: mainContent,
            links,
            internal_links: internalLinks
        };
        
    } catch (error) {
        return { error: `Parsing failed: ${error.message}` };
    }
}

// Fetch and parse a single URL
async function fetchAndParseUrl(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000,
            follow: 10 // Handle redirects
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('html')) {
            throw new Error(`Content type ${contentType} is not HTML`);
        }
        
        const html = await response.text();
        return parseDocument(html, response.url);
        
    } catch (error) {
        return { error: error.message };
    }
}

// Crawl website with depth limit
async function crawlWebsite(startUrl, maxDepth = 2, maxPages = 50, pagesPerBatch = 10, existingState = null) {
    let visited, sitemap, queue, pageCount, jobId;
    
    if (existingState) {
        // Resume from existing state
        visited = new Set(existingState.visited);
        sitemap = existingState.sitemap;
        queue = existingState.queue;
        pageCount = existingState.pageCount;
        jobId = existingState.jobId;
    } else {
        // Start new crawl
        visited = new Set();
        sitemap = {};
        queue = [{ url: normalizeUrl(startUrl), depth: 0, parent: null }];
        pageCount = 0;
        jobId = Math.random().toString(36).substr(2, 9);
    }
    
    let pagesProcessedInBatch = 0;
    const maxPagesThisBatch = Math.min(pagesPerBatch, maxPages - pageCount);
    
    while (queue.length > 0 && pageCount < maxPages) {
        if (pagesProcessedInBatch >= maxPagesThisBatch) {
            // Save state and break for this batch
            const state = {
                jobId,
                visited: Array.from(visited),
                sitemap,
                queue,
                pageCount,
                maxDepth,
                maxPages,
                startUrl,
                lastUpdated: new Date().toISOString()
            };
            await saveCrawlState(jobId, state);
            return {
                jobId,
                sitemap,
                stats: {
                    totalPages: pageCount,
                    maxDepth,
                    startUrl,
                    isComplete: false,
                    remaining: queue.length
                },
                isComplete: false
            };
        }
        
        const { url, depth, parent } = queue.shift();
        
        if (visited.has(url) || depth > maxDepth) {
            continue;
        }
        
        visited.add(url);
        pageCount++;
        pagesProcessedInBatch++;
        
        console.log(`Crawling: ${url} (depth: ${depth})`);
        
        const result = await fetchAndParseUrl(url);
        
        sitemap[url] = {
            ...result,
            depth,
            parent,
            children: []
        };
        
        // If parsing was successful and we haven't reached max depth, add internal links to queue
        if (result.success && depth < maxDepth && result.internal_links) {
            for (const childUrl of result.internal_links) {
                if (!visited.has(childUrl)) {
                    queue.push({ url: childUrl, depth: depth + 1, parent: url });
                    // Track parent-child relationship
                    if (!sitemap[url].children.includes(childUrl)) {
                        sitemap[url].children.push(childUrl);
                    }
                }
            }
        }
        
        // Add small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Crawl is complete
    const state = {
        jobId,
        visited: Array.from(visited),
        sitemap,
        queue,
        pageCount,
        maxDepth,
        maxPages,
        startUrl,
        lastUpdated: new Date().toISOString(),
        completed: true
    };
    await saveCrawlState(jobId, state);
    
    return {
        jobId,
        sitemap,
        stats: {
            totalPages: pageCount,
            maxDepth,
            startUrl,
            isComplete: true,
            remaining: 0
        },
        isComplete: true
    };
}

// Save crawl state to file
async function saveCrawlState(jobId, state) {
    try {
        const filePath = path.join(CRAWL_STATES_DIR, `${jobId}.json`);
        await fs.writeFile(filePath, JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('Failed to save crawl state:', error);
    }
}

// Load crawl state from file
async function loadCrawlState(jobId) {
    try {
        const filePath = path.join(CRAWL_STATES_DIR, `${jobId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load crawl state:', error);
        return null;
    }
}

// API endpoint for single URL inspection
app.post('/api/inspect', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        console.log(`Inspecting URL: ${url}`);
        
        const result = await fetchAndParseUrl(url);
        
        res.json(result);
        
    } catch (error) {
        console.error('Inspect error:', error);
        res.status(500).json({ error: `Inspection failed: ${error.message}` });
    }
});

// API endpoint for crawling
app.post('/api/crawl', async (req, res) => {
    try {
        const { url, maxDepth = 2, maxPages = 50, pagesPerBatch = 10, jobId } = req.body;
        
        let existingState = null;
        if (jobId) {
            existingState = await loadCrawlState(jobId);
            if (!existingState) {
                return res.status(404).json({ error: 'Crawl job not found' });
            }
        }
        
        if (!url && !existingState) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate URL if starting new crawl
        if (!existingState) {
            try {
                new URL(url);
            } catch {
                return res.status(400).json({ error: 'Invalid URL format' });
            }
        }
        
        const crawlUrl = existingState ? existingState.startUrl : url;
        console.log(`${existingState ? 'Resuming' : 'Starting'} crawl of ${crawlUrl} with max depth ${maxDepth}`);
        
        const result = await crawlWebsite(
            crawlUrl, 
            parseInt(maxDepth), 
            parseInt(maxPages),
            parseInt(pagesPerBatch),
            existingState
        );
        
        res.json({ success: true, ...result });
        
    } catch (error) {
        console.error('Crawl error:', error);
        res.status(500).json({ error: `Crawling failed: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`URL Inspector running at http://localhost:${port}`);
});