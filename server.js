import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';

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

// Helper function to generate section ID
function generateSectionId(url, heading, sectionOrder) {
    const content = `${url}_${heading}_${sectionOrder}`;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
}

// Helper function to compute content hash
function computeContentHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

// Helper function to extract contacts using basic regex
function extractContacts(text) {
    const contacts = [];
    
    // Email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    
    // Phone regex (German format)
    const phoneRegex = /(?:\+49\s?)?(?:\(0\)\s?)?(?:0\d{2,5}[\s\-/]?\d{3,10}|\d{3,5}[\s\-/]?\d{3,10})/g;
    const phones = text.match(phoneRegex) || [];
    
    emails.forEach(email => contacts.push({ type: 'email', value: email }));
    phones.forEach(phone => contacts.push({ type: 'phone', value: phone.replace(/\s/g, '') }));
    
    return contacts;
}

// Helper function to extract dates and convert to ISO 8601
function extractDates(text) {
    const dates = [];
    
    // German date formats: DD.MM.YYYY, DD.MM.YY, DD.MM.
    const dateRegex = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\b/g;
    let match;
    
    while ((match = dateRegex.exec(text)) !== null) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        let year = match[3];
        
        if (year) {
            if (year.length === 2) {
                year = '20' + year; // Assume 21st century for 2-digit years
            }
            try {
                const isoDate = `${year}-${month}-${day}`;
                // Validate date
                if (!isNaN(Date.parse(isoDate))) {
                    dates.push(isoDate);
                }
            } catch (e) {
                // Skip invalid dates
            }
        }
    }
    
    return dates;
}

// Helper function to extract basic opening hours
function extractOpeningHours(text) {
    const hours = [];
    
    // Look for time patterns like "08:00-17:00" or "8-17 Uhr"
    const hourRegex = /(\d{1,2}):?(\d{2})?\s?-\s?(\d{1,2}):?(\d{2})?\s?(Uhr)?/g;
    let match;
    
    while ((match = hourRegex.exec(text)) !== null) {
        const startHour = match[1].padStart(2, '0');
        const startMin = match[2] || '00';
        const endHour = match[3].padStart(2, '0');
        const endMin = match[4] || '00';
        
        hours.push(`${startHour}:${startMin}-${endHour}:${endMin}`);
    }
    
    return hours;
}

// Helper function to extract breadcrumbs
function extractBreadcrumbs($, url) {
    const breadcrumbs = [];
    
    // Try common breadcrumb selectors
    const breadcrumbSelectors = [
        '.breadcrumb a',
        '.breadcrumbs a', 
        'nav.breadcrumb a',
        '[role="navigation"] a',
        '.navigation-path a'
    ];
    
    for (const selector of breadcrumbSelectors) {
        const links = $(selector);
        if (links.length > 0) {
            links.each((_, el) => {
                const text = $(el).text().trim();
                if (text && text !== 'Home' && text !== 'Startseite') {
                    breadcrumbs.push(text);
                }
            });
            break; // Use first matching selector
        }
    }
    
    return breadcrumbs;
}

// Parse document with Cheerio and create sections (server-side)
function parseDocument(html, url, lastModified = null) {
    try {
        console.log(`[DEBUG] Starting parseDocument for: ${url}`);
        console.log(`[DEBUG] Original HTML length: ${html.length} characters`);
        
        const $ = cheerio.load(html);
        
        // Remove boilerplate elements before processing
        const boilerplateSelectors = [
            'script', 'style', 'nav', 'header', 'footer',
            '.cookie-settings', '.cookie-modal', '#cookie-consent',
            '.skip-links', '.skiplink'
        ];
        
        boilerplateSelectors.forEach(selector => {
            $(selector).remove();
        });
        
        // Remove specific German municipal site boilerplate
        $('*:contains("Ihre Suche")').remove();
        $('*:contains("Navigation schließen")').remove();
        $('*:contains("Navigation schliessen")').remove();
        $('*:contains("nach oben")').remove();
        $('*:contains("Zum Inhalt springen")').remove();
        
        // Enhanced text-based boilerplate removal based on analysis
        $('*:contains("Hauptnavigation der Seite anspringen")').remove();
        $('*:contains("Inhaltsbereich der Seite anspringen")').remove();
        $('*:contains("rechte Seitenleiste der Seite anspringen")').remove();
        $('*:contains("Seitenanfang")').remove();
        
        // Remove cookie and copyright sections by heading text
        $('h2:contains("Cookie-Einstellungen"), h3:contains("Cookie-Einstellungen")').parent().remove();
        $('h2:contains("Copyrightinformationen"), h3:contains("Copyrightinformationen")').parent().remove();
        $('h2:contains("Cookie"), h3:contains("Cookie")').parent().remove();
        
        // Remove common German boilerplate headings
        $('*:contains("Wir verwenden Cookies")').remove();
        $('*:contains("Diese Website verwendet Cookies")').remove();
        
        console.log(`[DEBUG] HTML after boilerplate removal: ${$.html().length} characters`);
        
        // Extract basic metadata
        const title = $('title').text().trim() || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        
        // Extract breadcrumbs
        const breadcrumbs = extractBreadcrumbs($, url);
        
        // Find all headings (h2, h3) that will define sections
        const headingElements = $('h2, h3').get();
        console.log(`[DEBUG] Found ${headingElements.length} heading elements (h2, h3)`);
        
        const sections = [];
        
        if (headingElements.length === 0) {
            console.log(`[DEBUG] No headings found, creating single section from main content`);
            
            // No headings found, treat entire content as one section
            const mainElement = $('main, article, .content, #content').first();
            let contentText = '';
            
            if (mainElement.length) {
                console.log(`[DEBUG] Using main element: ${mainElement.get(0).tagName}`);
                contentText = mainElement.text();
            } else {
                console.log(`[DEBUG] Using body element for content`);
                contentText = $('body').text();
            }
            
            // Clean up whitespace
            contentText = contentText
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n\n')
                .trim();
            
            console.log(`[DEBUG] Single section content length: ${contentText.length} characters`);
            
            if (contentText) {
                const section = {
                    section_id: generateSectionId(url, 'main', 0),
                    section_order: 0,
                    heading: title || 'Main Content',
                    heading_level: 'page',
                    content_text: contentText,
                    page_url: url,
                    page_title: title,
                    breadcrumbs: breadcrumbs,
                    content_type: 'general',
                    volatility: 'medium',
                    last_modified: lastModified,
                    hash: computeContentHash(contentText),
                    extracted_contacts: extractContacts(contentText),
                    extracted_addresses: [], // Placeholder for future implementation
                    extracted_links: [],
                    extracted_dates: extractDates(contentText),
                    extracted_opening_hours: extractOpeningHours(contentText),
                    last_seen: new Date().toISOString(),
                    prev_hash: null
                };
                sections.push(section);
            }
        } else {
            // Process sections defined by headings
            console.log(`[DEBUG] Processing ${headingElements.length} sections based on headings`);
            
            headingElements.forEach((headingEl, index) => {
                const $heading = $(headingEl);
                const headingText = $heading.text().trim();
                const headingLevel = headingEl.tagName.toLowerCase();
                
                console.log(`[DEBUG] Processing section ${index + 1}: "${headingText}" (${headingLevel})`);
                
                if (!headingText) return;
                
                // Skip obvious boilerplate sections by heading text
                const boilerplateHeadings = [
                    'cookie-einstellungen', 'cookie', 'copyrightinformationen', 
                    'copyright', 'datenschutz', 'impressum', 'meist gesucht'
                ];
                if (boilerplateHeadings.some(bp => headingText.toLowerCase().includes(bp))) {
                    console.log(`[DEBUG] Skipping boilerplate section: "${headingText}"`);
                    return;
                }
                
                // Find all content until the next heading of same or higher level
                let $content = $();
                let $current = $heading.next();
                
                while ($current.length > 0) {
                    const tagName = $current.get(0).tagName.toLowerCase();
                    
                    // Stop if we hit another heading of same or higher level
                    if ((tagName === 'h2') || 
                        (tagName === 'h3' && headingLevel === 'h3')) {
                        break;
                    }
                    
                    // Include paragraphs, lists, divs, and address elements with text content
                    if (['p', 'ul', 'ol', 'li', 'div', 'address', 'article', 'section'].includes(tagName)) {
                        $content = $content.add($current);
                    }
                    
                    $current = $current.next();
                }
                
                // Extract text content from this section
                let sectionText = headingText + '\n\n';
                $content.each((_, el) => {
                    const text = $(el).text().trim();
                    if (text) {
                        sectionText += text + '\n\n';
                    }
                });
                
                // Clean up whitespace
                sectionText = sectionText
                    .replace(/\s+/g, ' ')
                    .replace(/\n\s*\n/g, '\n\n')
                    .trim();
                
                console.log(`[DEBUG] Section "${headingText}" content length: ${sectionText.length} characters`);
                
                // Only include sections with meaningful content (more than just the heading)
                const contentWithoutHeading = sectionText.replace(headingText, '').trim();
                if (contentWithoutHeading && contentWithoutHeading.length > 50) {
                    // Extract links from this section
                    const sectionLinks = [];
                    $content.find('a[href]').each((_, linkEl) => {
                        const $link = $(linkEl);
                        const linkText = $link.text().trim();
                        const href = $link.attr('href');
                        
                        if (linkText && href) {
                            try {
                                const absoluteUrl = new URL(href, url).href;
                                sectionLinks.push({ text: linkText, url: absoluteUrl });
                            } catch (e) {
                                // Skip invalid URLs
                            }
                        }
                    });
                    
                    const section = {
                        section_id: generateSectionId(url, headingText, index),
                        section_order: index,
                        heading: headingText,
                        heading_level: headingLevel,
                        content_text: sectionText,
                        page_url: url,
                        page_title: title,
                        breadcrumbs: breadcrumbs,
                        content_type: inferContentType(headingText, sectionText),
                        volatility: inferVolatility(headingText, sectionText),
                        last_modified: lastModified,
                        hash: computeContentHash(sectionText),
                        extracted_contacts: extractContacts(sectionText),
                        extracted_addresses: [], // Placeholder for future implementation
                        extracted_links: sectionLinks,
                        extracted_dates: extractDates(sectionText),
                        extracted_opening_hours: extractOpeningHours(sectionText),
                        last_seen: new Date().toISOString(),
                        prev_hash: null
                    };
                    sections.push(section);
                }
            });
        }
        
        console.log(`[DEBUG] Final sections count: ${sections.length}`);
        sections.forEach((section, index) => {
            console.log(`[DEBUG] Section ${index + 1}: "${section.heading}" (${section.content_text.length} chars, type: ${section.content_type})`);
        });
        
        // Extract links
        const links = [];
        $('a[href]').each((_, linkEl) => {
            const $link = $(linkEl);
            const href = $link.attr('href');
            const text = $link.text().trim();
            
            if (!href || !text) return;
            
            try {
                const absoluteUrl = new URL(href, url).href;
                if (absoluteUrl.startsWith('http')) {
                    links.push({ text, url: absoluteUrl });
                }
            } catch {
                // Skip invalid URLs
            }
        });
        
        // Limit to 200 links and remove duplicates
        const uniqueLinks = [];
        const seenUrls = new Set();
        for (const link of links.slice(0, 200)) {
            if (!seenUrls.has(link.url)) {
                seenUrls.add(link.url);
                uniqueLinks.push(link);
            }
        }
        
        // Extract internal links for crawling
        const internalLinks = uniqueLinks
            .filter(link => isInternalUrl(link.url, url))
            .map(link => normalizeUrl(link.url))
            .filter((linkUrl, index, array) => array.indexOf(linkUrl) === index); // Remove duplicates
        
        console.log(`[DEBUG] Extracted ${uniqueLinks.length} total links, ${internalLinks.length} internal links`);
        
        return {
            success: true,
            final_url: url,
            title,
            meta_description: metaDescription,
            sections,
            links: uniqueLinks,
            internal_links: internalLinks
        };
        
    } catch (error) {
        return { error: `Parsing failed: ${error.message}` };
    }
}

// Helper function to infer content type from heading and content
function inferContentType(heading, content) {
    const headingLower = heading.toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (headingLower.includes('aktuell') || headingLower.includes('news') || 
        headingLower.includes('meldung') || contentLower.includes('datum')) {
        return 'announcement';
    }
    
    if (headingLower.includes('öffnungszeit') || headingLower.includes('standort') ||
        headingLower.includes('adresse') || contentLower.includes('uhr')) {
        return 'facility';
    }
    
    if (headingLower.includes('app') || headingLower.includes('online') ||
        headingLower.includes('service')) {
        return 'app_info';
    }
    
    if (headingLower.includes('tipp') || headingLower.includes('hinweis') ||
        headingLower.includes('wie') || headingLower.includes('was')) {
        return 'faq';
    }
    
    if (headingLower.includes('bestell') || headingLower.includes('antrag') ||
        headingLower.includes('formular')) {
        return 'service_info';
    }
    
    return 'general';
}

// Helper function to infer content volatility
function inferVolatility(heading, content) {
    const headingLower = heading.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // High volatility for current events, dates, closures
    if (headingLower.includes('aktuell') || headingLower.includes('geschlossen') ||
        contentLower.includes('2025') || contentLower.includes('datum')) {
        return 'high';
    }
    
    // Low volatility for static service information, tips
    if (headingLower.includes('tipp') || headingLower.includes('information') ||
        headingLower.includes('service') || headingLower.includes('bestell')) {
        return 'stable';
    }
    
    // Medium volatility for everything else
    return 'medium';
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
        
        // Extract Last-Modified header
        const lastModified = response.headers.get('last-modified');
        let lastModifiedISO = null;
        if (lastModified) {
            try {
                lastModifiedISO = new Date(lastModified).toISOString();
            } catch (e) {
                // Invalid date format, ignore
            }
        }
        
        const html = await response.text();
        return parseDocument(html, response.url, lastModifiedISO);
        
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
        
        if (result.success) {
            // Process sections for deduplication and change tracking
            const processedSections = result.sections.map(section => {
                // Check if we have this section from a previous crawl
                const existingPage = sitemap[url];
                let prevHash = null;
                
                if (existingPage && existingPage.sections) {
                    const existingSection = existingPage.sections.find(s => s.section_id === section.section_id);
                    if (existingSection) {
                        prevHash = existingSection.hash;
                    }
                }
                
                return {
                    ...section,
                    prev_hash: prevHash,
                    has_changed: prevHash !== section.hash
                };
            });
            
            sitemap[url] = {
                ...result,
                sections: processedSections,
                depth,
                parent,
                children: []
            };
        } else {
            sitemap[url] = {
                ...result,
                sections: [],
                depth,
                parent,
                children: []
            };
        }
        
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