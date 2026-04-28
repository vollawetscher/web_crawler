import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Create directories for data storage if they don't exist
const DATA_DIR = path.join(__dirname, 'data');
const CRAWL_STATES_DIR = path.join(DATA_DIR, 'crawl_states');
const INSPECTIONS_DIR = path.join(DATA_DIR, 'inspections');

// Track running crawl jobs
const runningCrawlJobs = new Map();

async function initializeDataDirectories() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(CRAWL_STATES_DIR, { recursive: true });
        await fs.mkdir(INSPECTIONS_DIR, { recursive: true });
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
    return createHash('md5').update(content).digest('hex').substring(0, 12);
}

// Helper function to compute content hash
function computeContentHash(content) {
    return createHash('md5').update(content).digest('hex');
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

// Helper function to categorize links
function categorizeLink(linkText, linkUrl, baseUrl) {
    const text = linkText.toLowerCase().trim();
    const url = linkUrl.toLowerCase();
    
    // Navigation links (skip links, jump links, anchors)
    const navigationPatterns = [
        'navigation', 'nav', 'menu', 'menü',
        'jump', 'skip', 'springen', 'anspringen',
        'inhalt', 'content', 'header', 'footer',
        'hauptnavigation', 'hauptmenü', 'inhaltsbereich',
        'zum inhalt', 'zur navigation', 'nach oben'
    ];
    
    if (url.includes('#') || navigationPatterns.some(pattern => text.includes(pattern))) {
        return 'navigation';
    }
    
    // Legal, contact, and administrative links
    const legalContactPatterns = [
        'impressum', 'datenschutz', 'privacy', 'legal',
        'kontakt', 'contact', 'agb', 'terms',
        'cookie', 'disclaimer', 'haftungsausschluss',
        'nutzungsbedingungen', 'rechtliche hinweise',
        'leichte sprache', 'gebärdensprache', 'barrierefreiheit',
        'sitemap', 'hilfe', 'help', 'faq'
    ];
    
    if (legalContactPatterns.some(pattern => text.includes(pattern) || url.includes(pattern))) {
        return 'legal_or_contact';
    }
    
    // Check if external link
    if (!isInternalUrl(linkUrl, baseUrl)) {
        return 'external';
    }
    
    // Everything else that's internal is considered content
    return 'content_internal';
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

function extractHeadingMap($, scope = null) {
    const root = scope || $.root();
    return {
        h1: root.find('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean),
        h2: root.find('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean),
        h3: root.find('h3').map((_, el) => $(el).text().trim()).get().filter(Boolean)
    };
}

function normalizeExtractedText(text) {
    return (text || '')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function collectCategorizedLinks($, scope, baseUrl) {
    const links = [];
    const categorizedLinks = {
        navigation: [],
        legal_or_contact: [],
        content_internal: [],
        external: []
    };

    scope.find('a[href]').each((_, linkEl) => {
        const $link = $(linkEl);
        const href = $link.attr('href');
        const text = $link.text().trim();

        if (!href || !text) return;

        try {
            const absoluteUrl = new URL(href, baseUrl).href;
            if (absoluteUrl.startsWith('http')) {
                const category = categorizeLink(text, absoluteUrl, baseUrl);
                const linkObj = { text, url: absoluteUrl, category };

                links.push(linkObj);
                categorizedLinks[category].push(linkObj);
            }
        } catch {
            // Skip invalid URLs
        }
    });

    return { links, categorizedLinks };
}

function dedupeCategorizedLinks(categorizedLinks, totalLimit = 200) {
    const processedCategorizedLinks = {};
    let totalLinks = 0;

    Object.keys(categorizedLinks).forEach(category => {
        const uniqueLinks = [];
        const seenUrls = new Set();

        for (const link of categorizedLinks[category]) {
            if (!seenUrls.has(link.url) && totalLinks < totalLimit) {
                seenUrls.add(link.url);
                uniqueLinks.push(link);
                totalLinks++;
            }
        }

        processedCategorizedLinks[category] = uniqueLinks;
    });

    return { processedCategorizedLinks, totalLinks };
}

function isUsefulCrawlLink(link, currentUrl) {
    const text = (link.text || '').toLowerCase().trim();
    const genericTexts = [
        'hier', 'mehr', 'weiter', 'alle anzeigen', 'anzeigen', 'details',
        'zurück', 'back', 'weiterlesen', 'read more', 'more', 'link'
    ];

    if (!text || text.length < 4 || genericTexts.includes(text) || /^[a-z0-9]$/i.test(text)) {
        return false;
    }

    try {
        const linkUrl = new URL(link.url);
        const current = new URL(currentUrl);
        linkUrl.hash = '';
        current.hash = '';

        return linkUrl.hostname === current.hostname && normalizeUrl(linkUrl.href) !== normalizeUrl(current.href);
    } catch {
        return false;
    }
}

function isLevel1BranchCandidate(link, seedUrl) {
    if (!isUsefulCrawlLink(link, seedUrl)) {
        return false;
    }

    try {
        const linkUrl = new URL(link.url);
        const seed = new URL(seedUrl);
        const path = linkUrl.pathname.replace(/\/+$/, '') || '/';
        const utilityPathPatterns = [
            /^\/$/,
            /^\/map\//i,
            /^\/v-card\//i,
            /^\/kontakt\/?$/i,
            /^\/impressum\/?$/i,
            /^\/datenschutz/i
        ];

        if (linkUrl.hostname !== seed.hostname) {
            return false;
        }

        return !utilityPathPatterns.some(pattern => pattern.test(path));
    } catch {
        return false;
    }
}

function extractRelevanceKeywords(seedUrl, projectBrief = '') {
    const urlObj = new URL(seedUrl);
    const pathWords = decodeURIComponent(urlObj.pathname)
        .split(/[^a-zA-Z0-9äöüÄÖÜß]+/)
        .filter(word => word.length >= 3);
    const briefWords = projectBrief
        .split(/[^a-zA-Z0-9äöüÄÖÜß]+/)
        .filter(word => word.length >= 4);
    const stopWords = new Set([
        'https', 'http', 'www', 'com', 'de', 'und', 'oder', 'der', 'die', 'das',
        'ein', 'eine', 'für', 'mit', 'von', 'zur', 'zum', 'service', 'verwaltung'
    ]);

    return Array.from(new Set([...pathWords, ...briefWords]
        .map(word => word.toLowerCase())
        .filter(word => !stopWords.has(word))));
}

function scoreBranchCandidate(link, seedUrl, projectBrief = '') {
    const keywords = extractRelevanceKeywords(seedUrl, projectBrief);
    const haystack = `${link.text || ''} ${link.url || ''}`.toLowerCase();
    const matches = keywords.filter(keyword => haystack.includes(keyword));
    const score = keywords.length > 0 ? matches.length / Math.min(keywords.length, 6) : 0;
    const selected = matches.length > 0;

    return {
        ...link,
        relevance_score: Number(Math.min(score, 1).toFixed(2)),
        preselected: selected,
        relevance_reason: selected
            ? `Matched: ${matches.slice(0, 5).join(', ')}`
            : 'No seed or brief keyword match'
    };
}

function createRootCandidate(result, projectBrief = '') {
    const rootLink = {
        text: result.title || result.final_url,
        url: result.final_url,
        category: 'root'
    };
    return {
        ...scoreBranchCandidate(rootLink, result.final_url, projectBrief),
        level: 1,
        is_root: true,
        preselected: true,
        relevance_score: 1,
        relevance_reason: 'Start URL (Level 1 root)'
    };
}

function isRelevantCrawlUrl(candidateUrl, seedUrl, branchRoot = '') {
    try {
        const candidate = new URL(candidateUrl);
        const seed = new URL(seedUrl);
        if (candidate.hostname !== seed.hostname) {
            return false;
        }

        const keywords = extractRelevanceKeywords(seedUrl, branchRoot);
        const haystack = decodeURIComponent(`${candidate.pathname} ${candidate.search}`).toLowerCase();
        if (keywords.some(keyword => haystack.includes(keyword))) {
            return true;
        }

        if (branchRoot) {
            const root = new URL(branchRoot);
            const rootPath = root.pathname.replace(/\/$/, '');
            return rootPath.length > 1 && candidate.pathname.startsWith(rootPath);
        }

        return true;
    } catch {
        return false;
    }
}

// Parse document with Cheerio and create sections (server-side)
function parseDocument(html, url, lastModified = null) {
    try {
        console.log(`[DEBUG] Starting parseDocument for: ${url}`);
        console.log(`[DEBUG] Original HTML length: ${html.length} characters`);
        
        const $ = cheerio.load(html);
        
        // Extract basic metadata FIRST, before any content removal
        const title = $('title').text().trim() || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        
        // Remove scripts and styles but preserve structure for better content extraction
        $('script, style, noscript').remove();
        
        console.log(`[DEBUG] HTML after script/style removal: ${$.html().length} characters`);
        
        // STRATEGY 1: Find main content container using multiple approaches
        let $mainContent = null;
        let contentStrategy = 'none';
        
        // Try semantic HTML5 elements first
        const semanticSelectors = ['main', 'article', '[role="main"]'];
        for (const selector of semanticSelectors) {
            const $candidate = $(selector).first();
            if ($candidate.length && $candidate.text().trim().length > 200) {
                $mainContent = $candidate;
                contentStrategy = `semantic-${selector}`;
                break;
            }
        }
        
        // Try common content class/id selectors
        if (!$mainContent) {
            const contentSelectors = [
                '.content', '#content', '.main-content', '#main-content',
                '.page-content', '#page-content', '.entry-content', '.post-content',
                '.article-content', '.body-content', '.container .content'
            ];
            
            for (const selector of contentSelectors) {
                const $candidate = $(selector).first();
                if ($candidate.length && $candidate.text().trim().length > 200) {
                    $mainContent = $candidate;
                    contentStrategy = `class-${selector}`;
                    break;
                }
            }
        }
        
        // Try to find the largest content-rich element
        if (!$mainContent) {
            let largestElement = null;
            let largestSize = 0;
            
            $('div, section, article').each((_, el) => {
                const $el = $(el);
                const text = $el.text().trim();
                
                // Skip elements that are likely navigation, footer, etc.
                const classList = ($el.attr('class') || '').toLowerCase();
                const id = ($el.attr('id') || '').toLowerCase();
                
                if (classList.includes('nav') || classList.includes('menu') || 
                    classList.includes('footer') || classList.includes('header') ||
                    classList.includes('sidebar') || classList.includes('cookie') ||
                    id.includes('nav') || id.includes('menu') || 
                    id.includes('footer') || id.includes('header')) {
                    return; // Skip this element
                }
                
                if (text.length > largestSize && text.length > 500) {
                    largestSize = text.length;
                    largestElement = el;
                }
            });
            
            if (largestElement) {
                $mainContent = $(largestElement);
                contentStrategy = `largest-element`;
            }
        }
        
        // Final fallback: use body but remove obvious boilerplate
        if (!$mainContent) {
            $mainContent = $('body').clone();
            // Remove common boilerplate elements from the clone
            $mainContent.find([
                'nav', 'header', 'footer', 'aside',
                '.navigation', '.nav', '.menu', '.header', '.footer', '.sidebar',
                '.cookie-banner', '.cookie-modal', '#cookie-consent',
                '.skip-links', '.skiplink'
            ].join(', ')).remove();
            contentStrategy = 'body-fallback';
        }
        
        console.log(`[DEBUG] Content strategy used: ${contentStrategy}`);
        console.log(`[DEBUG] Main content container text length: ${$mainContent.text().length} characters`);
        const headings = extractHeadingMap($, $mainContent);
        
        // Extract breadcrumbs from the full page (before content extraction)
        const breadcrumbs = extractBreadcrumbs($, url);
        
        // STRATEGY 2: Extract ALL meaningful content from the main container
        const sections = [];
        
        // Get all headings within the main content to use for organization
        const headingElements = $mainContent.find('h1, h2, h3, h4, h5, h6').get();
        console.log(`[DEBUG] Found ${headingElements.length} headings in main content`);
        
        if (headingElements.length === 0) {
            console.log(`[DEBUG] No headings found, creating single comprehensive section`);
            
            // No headings - create one comprehensive section with all content
            let contentText = '';
            
            // Extract text preserving paragraph structure
            $mainContent.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, address, div').each((_, el) => {
                const $el = $(el);
                const text = $el.clone().children().remove().end().text().trim();
                
                if (text && text.length > 10) {
                    // Add heading markers for any headings we find
                    const tagName = el.tagName?.toLowerCase();
                    if (tagName?.match(/^h[1-6]$/)) {
                        contentText += `\n\n### ${text}\n\n`;
                    } else {
                        contentText += `${text}\n\n`;
                    }
                }
            });
            
            // If that didn't work well, fall back to getting all text
            if (contentText.trim().length < 500) {
                contentText = $mainContent.text()
                    .replace(/\s+/g, ' ')
                    .replace(/\n\s*\n/g, '\n\n')
                    .trim();
            }
            
            console.log(`[DEBUG] Single section content length: ${contentText.length} characters`);
            
            if (contentText && contentText.length > 50) {
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
                    extracted_addresses: [], 
                    extracted_links: [],
                    extracted_dates: extractDates(contentText),
                    extracted_opening_hours: extractOpeningHours(contentText),
                    last_seen: new Date().toISOString(),
                    prev_hash: null
                };
                sections.push(section);
            }
        } else {
            console.log(`[DEBUG] Processing sections based on ${headingElements.length} headings`);
            
            // Process sections based on headings, but extract ALL content between them
            for (let i = 0; i < headingElements.length; i++) {
                const headingEl = headingElements[i];
                const $heading = $(headingEl);
                const headingText = $heading.text().trim();
                const headingLevel = headingEl.tagName.toLowerCase();
                
                console.log(`[DEBUG] Processing section ${i + 1}: "${headingText}" (${headingLevel})`);
                
                if (!headingText) continue;
                
                // Skip obvious boilerplate headings
                const boilerplateHeadings = [
                    'cookie-einstellungen', 'cookie', 'copyrightinformationen', 
                    'copyright', 'datenschutz', 'impressum'
                ];
                if (boilerplateHeadings.some(bp => headingText.toLowerCase().includes(bp))) {
                    console.log(`[DEBUG] Skipping boilerplate heading: "${headingText}"`);
                    continue;
                }
                
                // Build section content by finding all content until next heading of same/higher level
                let sectionContent = headingText + '\n\n';
                let $current = $heading;
                const nextHeadingIndex = i + 1;
                const $nextHeading = nextHeadingIndex < headingElements.length ? 
                    $(headingElements[nextHeadingIndex]) : null;
                
                // Get all content between this heading and the next one
                let contentElements = [];
                
                // Use DOM traversal to find content between headings
                if ($nextHeading && $nextHeading.length) {
                    // Find all siblings between current heading and next heading
                    let $current = $heading.next();
                    while ($current.length > 0 && !$current.is($nextHeading)) {
                        const text = $current.text().trim();
                        if (text && text.length > 10) {
                            contentElements.push($current.get(0));
                            // Also check for nested content
                            $current.find('*').each((_, nested) => {
                                const nestedText = $(nested).text().trim();
                                if (nestedText && nestedText.length > 10) {
                                    contentElements.push(nested);
                                }
                            });
                        }
                        $current = $current.next();
                    }
                } else {
                    // Last heading - get everything after it
                    let $current = $heading.next();
                    while ($current.length > 0) {
                        const tagName = $current.get(0).tagName.toLowerCase();
                        if (tagName.match(/^h[1-6]$/) && parseInt(tagName.slice(1), 10) <= parseInt(headingLevel.slice(1), 10)) {
                            break;
                        }
                        
                        const text = $current.text().trim();
                        if (text && text.length > 10) {
                            contentElements.push($current.get(0));
                            // Also check for nested content
                            $current.find('*').each((_, nested) => {
                                const nestedText = $(nested).text().trim();
                                if (nestedText && nestedText.length > 10) {
                                    contentElements.push(nested);
                                }
                            });
                        }
                        
                        $current = $current.next();
                    }
                }
                
                // Extract text from content elements
                contentElements.forEach(el => {
                    const text = $(el).text().trim();
                    if (text && text !== headingText) {
                        sectionContent += text + '\n\n';
                    }
                });
                
                // Clean up the content
                sectionContent = sectionContent
                    .replace(/\n{3,}/g, '\n\n')
                    .replace(/\s+/g, ' ')
                    .replace(/ \n/g, '\n')
                    .trim();
                
                console.log(`[DEBUG] Section "${headingText}" content length: ${sectionContent.length} characters`);
                
                // Include section if it has meaningful content beyond just the heading
                const contentWithoutHeading = sectionContent.replace(headingText, '').trim();
                if (contentWithoutHeading.length > 30) {
                    
                    // Extract links from this section content
                    const sectionLinks = [];
                    contentElements.forEach(el => {
                        $(el).find('a[href]').each((_, linkEl) => {
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
                    });
                    
                    const section = {
                        section_id: generateSectionId(url, headingText, i),
                        section_order: i,
                        heading: headingText,
                        heading_level: headingLevel,
                        content_text: sectionContent,
                        page_url: url,
                        page_title: title,
                        breadcrumbs: breadcrumbs,
                        content_type: inferContentType(headingText, sectionContent),
                        volatility: inferVolatility(headingText, sectionContent),
                        last_modified: lastModified,
                        hash: computeContentHash(sectionContent),
                        extracted_contacts: extractContacts(sectionContent),
                        extracted_addresses: [], 
                        extracted_links: sectionLinks,
                        extracted_dates: extractDates(sectionContent),
                        extracted_opening_hours: extractOpeningHours(sectionContent),
                        last_seen: new Date().toISOString(),
                        prev_hash: null
                    };
                    sections.push(section);
                } else {
                    console.log(`[DEBUG] Skipping section "${headingText}" - insufficient content (${contentWithoutHeading.length} chars)`);
                }
            }
        }
        
        // STRATEGY 3: If we still don't have much content, do a comprehensive fallback
        const totalContentLength = sections.reduce((sum, section) => sum + section.content_text.length, 0);
        console.log(`[DEBUG] Total extracted content length: ${totalContentLength} characters`);
        
        if (totalContentLength < 1000) {
            console.log(`[DEBUG] Content extraction seems insufficient, applying comprehensive fallback`);
            
            // Clear existing sections and do a comprehensive text extraction
            sections.length = 0;
            
            // Create a more aggressive boilerplate removal strategy
            const $bodyClone = $('body').clone();
            
            // Remove extensive boilerplate elements
            $bodyClone.find([
                'nav', 'header', 'footer', 'aside', 'script', 'style',
                '.navigation', '.nav', '.menu', '.header', '.footer', '.sidebar',
                '.cookie-banner', '.cookie-modal', '#cookie-consent',
                '[role="navigation"]', '[class*="nav"]', '[id*="nav"]',
                '[class*="menu"]', '[id*="menu"]',
                // More specific boilerplate selectors
                '[class*="cookie"]', '[id*="cookie"]',
                '[class*="copyright"]', '[id*="copyright"]',
                '.breadcrumb', '.breadcrumbs', '[role="navigation"]',
                'form', 'input', 'button', 'select', 'textarea'
            ].join(', ')).remove();
            
            // Also remove any elements that contain primarily boilerplate text
            $bodyClone.find('*').each((_, el) => {
                const $el = $(el);
                const text = $el.text().toLowerCase();
                
                const boilerplateTerms = [
                    'cookie-einstellungen', 'copyrightinformationen', 'cookie',
                    'asp.net_sessionid', 'matomo', 'piwik', 'opt-out',
                    '__requestverificationtoken', 'browsersession'
                ];
                
                const hasBoilerplate = boilerplateTerms.some(term => text.includes(term));
                if (hasBoilerplate && text.length > 50) {
                    $el.remove();
                }
            });
            
            let comprehensiveContent = '';

            // Focus on semantic content elements first
            const contentSelectors = [
                'h1, h2, h3, h4, h5, h6',  // Headings first
                'p',                        // Paragraphs
                'article',                  // Articles
                'section',                  // Sections  
                'blockquote',              // Quotes
                'li',                      // List items
                'address'                  // Addresses
            ];
            
            contentSelectors.forEach(selector => {
                $bodyClone.find(selector).each((_, el) => {
                    const $el = $(el);
                    const text = $el.clone().children().remove().end().text().trim();
                    
                    // Skip very short text or obvious boilerplate
                    if (text.length < 20) return;
                    
                    const textLower = text.toLowerCase();
                    const boilerplateTerms = [
                        'cookie', 'datenschutz', 'copyright', 'impressum',
                        'asp.net', 'matomo', 'piwik', 'browsersession'
                    ];
                    
                    if (boilerplateTerms.some(term => textLower.includes(term))) {
                        return; // Skip boilerplate
                    }
                    
                    const tagName = el.tagName?.toLowerCase();
                    if (tagName?.match(/^h[1-6]$/)) {
                        comprehensiveContent += `\n\n### ${text}\n\n`;
                    } else {
                        comprehensiveContent += `${text}\n\n`;
                    }
                });
            });
            
            // If still not enough content, try div elements but be more selective
            if (comprehensiveContent.length < 500) {
                $bodyClone.find('div').each((_, el) => {
                const $el = $(el);
                const text = $el.clone().children().remove().end().text().trim();
                
                    // Only include divs with substantial, meaningful content
                    if (text.length > 50 && text.length < 2000) {
                        comprehensiveContent += `${text}\n\n`;
                    }
                });
            }
            
            // Final cleanup
            comprehensiveContent = comprehensiveContent
                .replace(/\n{3,}/g, '\n\n')
                .replace(/\s+/g, ' ')
                .replace(/ \n/g, '\n')
                .trim();
            
            console.log(`[DEBUG] Comprehensive fallback content length: ${comprehensiveContent.length} characters`);
            
            if (comprehensiveContent.length > 100) {
                const section = {
                    section_id: generateSectionId(url, 'comprehensive', 0),
                    section_order: 0,
                    heading: title || 'Page Content',
                    heading_level: 'page',
                    content_text: comprehensiveContent,
                    page_url: url,
                    page_title: title,
                    breadcrumbs: breadcrumbs,
                    content_type: 'general',
                    volatility: 'medium',
                    last_modified: lastModified,
                    hash: computeContentHash(comprehensiveContent),
                    extracted_contacts: extractContacts(comprehensiveContent),
                    extracted_addresses: [], 
                    extracted_links: [],
                    extracted_dates: extractDates(comprehensiveContent),
                    extracted_opening_hours: extractOpeningHours(comprehensiveContent),
                    last_seen: new Date().toISOString(),
                    prev_hash: null
                };
                sections.push(section);
            }
        }
        
        console.log(`[DEBUG] Final sections count: ${sections.length}`);
        sections.forEach((section, index) => {
            console.log(`[DEBUG] Section ${index + 1}: "${section.heading}" (${section.content_text.length} chars, type: ${section.content_type})`);
        });
        
        // Keep all links for export previews, but only crawl links found in the selected main content.
        const { links: allLinks, categorizedLinks } = collectCategorizedLinks($, $.root(), url);
        const { categorizedLinks: crawlCategorizedLinks } = collectCategorizedLinks($, $mainContent, url);
        const { processedCategorizedLinks, totalLinks } = dedupeCategorizedLinks(categorizedLinks);
        const { processedCategorizedLinks: processedCrawlLinks } = dedupeCategorizedLinks(crawlCategorizedLinks, 100);
        const sectionCrawlLinks = sections
            .flatMap(section => section.extracted_links || [])
            .filter(link => isUsefulCrawlLink(link, url));
        const crawlSourceLinks = sectionCrawlLinks.length > 0
            ? sectionCrawlLinks
            : processedCrawlLinks.content_internal.filter(link => isUsefulCrawlLink(link, url));
        
        // Extract internal links for crawling
        const internalLinks = crawlSourceLinks
            .map(link => normalizeUrl(link.url))
            .filter((linkUrl, index, array) => array.indexOf(linkUrl) === index); // Remove duplicates
        
        console.log(`[DEBUG] Extracted ${totalLinks} total links (nav: ${processedCategorizedLinks.navigation.length}, legal: ${processedCategorizedLinks.legal_or_contact.length}, content: ${processedCategorizedLinks.content_internal.length}, external: ${processedCategorizedLinks.external.length}), ${internalLinks.length} crawlable main-content internal links`);
        
        // Create main_content field for frontend compatibility
        const main_content = normalizeExtractedText(sections.map(section => section.content_text).join('\n\n'));
        
        return {
            success: true,
            final_url: url,
            title,
            meta_description: metaDescription,
            main_content, // For frontend display compatibility
            normalized_text: main_content,
            headings,
            extracted_facts: {
                contacts: extractContacts(main_content),
                dates: extractDates(main_content),
                opening_hours: extractOpeningHours(main_content)
            },
            sections,
            links: allLinks, // Keep for backward compatibility
            categorized_links: processedCategorizedLinks,
            crawlable_links: crawlSourceLinks,
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
async function crawlWebsite(startUrl, maxDepth = 2, maxPages = 50, existingState = null, respectRobotsTxt = true) {
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
    
    // Get initial startUrl from existing state or parameter
    const initialStartUrl = existingState?.startUrl || startUrl;
    
    // Add to running jobs tracker
    runningCrawlJobs.set(jobId, { status: 'running' });
    
    // Save progress state with more detailed information
    const saveProgress = async (currentUrl = null, status = 'crawling') => {
        const progressState = {
            jobId,
            visited: Array.from(visited),
            sitemap,
            queue,
            pageCount,
            maxDepth,
            maxPages,
            startUrl: initialStartUrl,
            lastUpdated: new Date().toISOString(),
            completed: status === 'completed' || status === 'stopped',
            currentUrl,
            status,
            queueLength: queue.length,
            stopRequested: false
        };
        await saveCrawlState(jobId, progressState);
    };
    
    while (queue.length > 0 && pageCount < maxPages) {
        // Check if stop was requested
        const currentState = await loadCrawlState(jobId);
        if (currentState && currentState.stopRequested) {
            console.log(`Crawl ${jobId} stopped by user request`);
            await saveProgress(null, 'stopped');
            runningCrawlJobs.delete(jobId);
            return {
                jobId,
                sitemap,
                stats: {
                    totalPages: pageCount,
                    maxDepth,
                    startUrl: existingState?.startUrl || startUrl,
                    isComplete: true,
                    remaining: Math.max(0, maxPages - pageCount)
                },
                isComplete: true,
                stoppedByUser: true
            };
        }
        
        const { url, depth, parent, branchRoot } = queue.shift();
        const activeBranchRoot = branchRoot || url;
        
        if (visited.has(url)) {
            continue;
        }
        
        if (depth > maxDepth) {
            // Mark URL as skipped due to depth limitation
            if (!sitemap[url]) {
                sitemap[url] = {
                    success: false,
                    final_url: url,
                    title: '',
                    meta_description: '',
                    main_content: '',
                    sections: [],
                    links: [],
                    categorized_links: {
                        navigation: [],
                        legal_or_contact: [],
                        content_internal: [],
                        external: []
                    },
                    internal_links: [],
                    depth,
                    parent,
                    children: [],
                    is_relevant: false,
                    skipped_due_to_depth: true,
                    error: `Skipped: Max depth (${maxDepth}) reached`
                };
                visited.add(url);
            }
            continue;
        }
        
        visited.add(url);
        pageCount++;
        
        // Save detailed progress with current URL and batch info
        await saveProgress(url, 'crawling');
        
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
                children: [],
                is_relevant: true
            };
        } else {
            sitemap[url] = {
                ...result,
                sections: [],
                depth,
                parent,
                children: [],
                is_relevant: true
            };
        }
        
        // If parsing was successful and we haven't reached max depth, add internal links to queue
        if (result.success && depth < maxDepth && result.internal_links) {
            for (const childUrl of result.internal_links) {
                if (!visited.has(childUrl)) {
                    if (!isRelevantCrawlUrl(childUrl, initialStartUrl, activeBranchRoot)) {
                        continue;
                    }

                    queue.push({ url: childUrl, depth: depth + 1, parent: url, branchRoot: activeBranchRoot });
                    // Track parent-child relationship
                    if (!sitemap[url].children.includes(childUrl)) {
                        sitemap[url].children.push(childUrl);
                    }
                }
            }
        }
        
        // Add small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    // Crawl is complete
    await saveProgress(null, 'completed');
    runningCrawlJobs.delete(jobId);
    
    const state = {
        jobId,
        visited: Array.from(visited),
        sitemap,
        queue,
        pageCount,
        maxDepth,
        maxPages,
        startUrl: initialStartUrl,
        lastUpdated: new Date().toISOString(),
        completed: true,
        currentUrl: null,
        status: 'completed',
        queueLength: 0
    };
    
    return {
        jobId,
        sitemap,
        stats: {
            totalPages: pageCount,
            maxDepth,
            startUrl: initialStartUrl,
            isComplete: true,
            remaining: Math.max(0, maxPages - pageCount)
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
        throw error;
    }
}

// Load crawl state from file
async function loadCrawlState(jobId) {
    try {
        const filePath = path.join(CRAWL_STATES_DIR, `${jobId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Failed to load crawl state:', error);
        }
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

// API endpoint for Level 1 discovery without starting a full crawl
app.post('/api/discover-level1', async (req, res) => {
    try {
        const { url, projectBrief = '' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        console.log(`Discovering Level 1 branches from: ${url}`);
        const result = await fetchAndParseUrl(url);

        if (!result.success) {
            return res.json(result);
        }

        const seen = new Set();
        const childCandidates = (result.crawlable_links || [])
            .filter(link => isLevel1BranchCandidate(link, result.final_url))
            .filter(link => {
                const normalized = normalizeUrl(link.url);
                if (seen.has(normalized)) {
                    return false;
                }
                seen.add(normalized);
                return true;
            })
            .map(link => ({
                ...scoreBranchCandidate(link, result.final_url, projectBrief),
                level: 2,
                is_root: false,
                parent_url: result.final_url
            }))
            .sort((a, b) => b.relevance_score - a.relevance_score || a.url.localeCompare(b.url));
        const candidates = [createRootCandidate(result, projectBrief), ...childCandidates];

        res.json({
            success: true,
            source: {
                final_url: result.final_url,
                title: result.title,
                meta_description: result.meta_description,
                sections: result.sections,
                headings: result.headings,
                main_content: result.main_content
            },
            candidates,
            stats: {
                totalCandidates: candidates.length,
                preselected: candidates.filter(candidate => candidate.preselected).length,
                childCandidates: childCandidates.length
            }
        });
    } catch (error) {
        console.error('Level 1 discovery error:', error);
        res.status(500).json({ error: `Level 1 discovery failed: ${error.message}` });
    }
});

// API endpoint for loading saved inspection results
app.get('/api/load-inspection/:inspectionId', async (req, res) => {
    try {
        const { inspectionId } = req.params;
        
        if (!inspectionId) {
            return res.status(400).json({ error: 'Inspection ID is required' });
        }
        
        const result = await loadInspectionResult(inspectionId);
        
        if (!result) {
            return res.status(404).json({ error: 'Inspection not found' });
        }
        
        res.json({
            success: true,
            ...result,
            inspectionId,
            restored: true
        });
        
    } catch (error) {
        console.error('Load inspection error:', error);
        res.status(500).json({ error: `Failed to load inspection: ${error.message}` });
    }
});

// API endpoint for manual HTML parsing
app.post('/api/parse-manual', async (req, res) => {
    try {
        const { html, url = '' } = req.body;
        
        if (!html || !html.trim()) {
            return res.status(400).json({ error: 'HTML content is required' });
        }
        
        console.log(`Parsing manual HTML content (${html.length} characters)${url ? ` with URL: ${url}` : ''}`);
        
        // Use provided URL or generate a placeholder
        const finalUrl = url || 'manual-input://local';
        
        const result = parseDocument(html, finalUrl);
        
        res.json(result);
        
    } catch (error) {
        console.error('Manual parsing error:', error);
        res.status(500).json({ error: `Parsing failed: ${error.message}` });
    }
});

// API endpoint for crawling
app.post('/api/crawl', async (req, res) => {
    try {
        const { url, maxDepth = 2, maxPages = 50, jobId: providedJobId, respectRobotsTxt = true, selectedUrls = [] } = req.body;
        const hasSelectedUrls = Array.isArray(selectedUrls) && selectedUrls.length > 0;
        
        let existingState = null;
        let jobId = hasSelectedUrls ? null : providedJobId;
        
        if (jobId) {
            existingState = await loadCrawlState(jobId);
            if (!existingState) {
                return res.status(404).json({ error: 'Crawl job not found' });
            }
        } else if (!url) {
            return res.status(400).json({ error: 'URL is required for new crawls' });
        }
        
        // Generate meaningful jobId if not provided (for new crawls)
        if (!jobId && url) {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace(/^www\./, '');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS
            jobId = `${domain}_${timestamp}`;
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
        
        if (respectRobotsTxt) {
            console.log('Robots.txt compliance: ENABLED');
        } else {
            console.log('Robots.txt compliance: DISABLED');
        }

        let initialBranchCount = 0;
        let crawlStateForRun = existingState;
        
        // Save initial job state BEFORE starting background crawl to avoid race condition
        if (!existingState) {
            const selectedQueue = Array.isArray(selectedUrls)
                ? selectedUrls
                    .map(selectedUrl => {
                        try {
                            const absoluteUrl = normalizeUrl(new URL(selectedUrl, crawlUrl).href);
                            return isInternalUrl(absoluteUrl, crawlUrl) ? absoluteUrl : null;
                        } catch {
                            return null;
                        }
                    })
                    .filter(Boolean)
                    .filter((selectedUrl, index, array) => array.indexOf(selectedUrl) === index)
                : [];
            const initialQueue = selectedQueue.length > 0
                ? selectedQueue.map(selectedUrl => ({ url: selectedUrl, depth: 0, parent: crawlUrl, branchRoot: selectedUrl }))
                : [{ url: normalizeUrl(crawlUrl), depth: 0, parent: null }];
            initialBranchCount = selectedQueue.length;
            const initialState = {
                jobId,
                visited: [],
                sitemap: {},
                queue: initialQueue,
                pageCount: 0,
                maxDepth: parseInt(maxDepth),
                maxPages: parseInt(maxPages),
                startUrl: crawlUrl,
                selectedBranchRoots: selectedQueue,
                lastUpdated: new Date().toISOString(),
                completed: false,
                currentUrl: null,
                status: 'starting',
                queueLength: initialQueue.length,
                stopRequested: false
            };
            await saveCrawlState(jobId, initialState);
            crawlStateForRun = initialState;
        }
        
        // Start crawling asynchronously if not already running
        if (!runningCrawlJobs.has(jobId)) {
            console.log(`Starting background crawl for job ${jobId}`);
            
            // Start the crawl in the background
            crawlWebsite(
                crawlUrl, 
                parseInt(maxDepth), 
                parseInt(maxPages),
                crawlStateForRun,
                respectRobotsTxt
            ).catch(error => {
                console.error(`Background crawl error for job ${jobId}:`, error);
                runningCrawlJobs.delete(jobId);
            });
        }
        
        // Return immediately with job info
        res.json({ 
            success: true, 
            jobId,
            isComplete: false,
            message: initialBranchCount > 0
                ? `Crawl started for ${initialBranchCount} selected branch(es)`
                : 'Crawl started in background'
        });
        
    } catch (error) {
        console.error('Crawl error:', error);
        res.status(500).json({ error: `Crawling failed: ${error.message}` });
    }
});

// API endpoint for stopping a crawl
app.post('/api/crawl-stop/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const state = await loadCrawlState(jobId);
        
        if (!state) {
            return res.status(404).json({ error: 'Crawl job not found' });
        }
        
        // Set stop flag
        state.stopRequested = true;
        state.status = 'stop_requested';
        await saveCrawlState(jobId, state);
        
        res.json({ success: true, message: 'Stop signal sent' });
        
    } catch (error) {
        console.error('Stop crawl error:', error);
        res.status(500).json({ error: `Failed to stop crawl: ${error.message}` });
    }
});

// API endpoint for checking crawl progress
app.get('/api/crawl-progress/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        console.log(`📊 Progress request for job: ${jobId}`);
        
        const state = await loadCrawlState(jobId);
        
        if (!state) {
            console.log(`❌ Job ${jobId} not found`);
            return res.status(404).json({ error: 'Crawl job not found' });
        }
        
        const isComplete = state.completed || state.status === 'completed' || state.status === 'stopped';
        
        // Provide detailed progress information
        const progressInfo = {
            success: true,
            jobId,
            status: state.status || 'unknown',
            currentUrl: state.currentUrl || null,
            pageCount: state.pageCount || 0,
            maxPages: state.maxPages || 0,
            queueLength: state.queue ? state.queue.length : 0,
            remaining: Math.max(0, (state.maxPages || 0) - (state.pageCount || 0)),
            isComplete,
            lastUpdated: state.lastUpdated,
            startUrl: state.startUrl || '',
            depth: state.maxDepth || 0,
            stoppedByUser: state.status === 'stopped'
        };
        
        // Include the partial sitemap too, so the browser can preserve useful work if the server restarts.
        progressInfo.sitemap = state.sitemap || {};
        
        res.json(progressInfo);
    } catch (error) {
        console.error('Progress check error:', error);
        res.status(500).json({ error: `Failed to get progress: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`URL Inspector running at http://localhost:${port}`);
});