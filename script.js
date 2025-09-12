// Global state
let currentData = null;
let currentCrawlJobId = null;
let crawlProgressInterval = null;

// DOM Elements
const urlInput = document.getElementById('urlInput');
const inspectBtn = document.getElementById('inspectBtn');
const manualHtml = document.getElementById('manualHtml');
const manualUrl = document.getElementById('manualUrl');
const parseManualBtn = document.getElementById('parseManualBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const resultsSection = document.getElementById('resultsSection');
const downloadBtn = document.getElementById('downloadBtn');

// Crawl elements
const jobIdInput = document.getElementById('jobId');
const maxDepthSelect = document.getElementById('maxDepth');
const maxPagesInput = document.getElementById('maxPages');
const pagesPerBatchInput = document.getElementById('pagesPerBatch');
const crawlBtn = document.getElementById('crawlBtn');
const resumeCrawlBtn = document.getElementById('resumeCrawlBtn');
const crawlStatus = document.getElementById('crawlStatus');
const crawlStatusText = document.getElementById('crawlStatusText');
const batchInfo = document.getElementById('batchInfo');
const currentJobIdSpan = document.getElementById('currentJobId');
const crawlProgressStatus = document.getElementById('crawlProgressStatus');
const sitemapSection = document.getElementById('sitemapSection');
const sitemapContainer = document.getElementById('sitemapContainer');
const sitemapTree = document.getElementById('sitemapTree');
const crawlSummary = document.getElementById('crawlSummary');
const selectAllBtn = document.getElementById('selectAllBtn');
const selectNoneBtn = document.getElementById('selectNoneBtn');
const selectionCount = document.getElementById('selectionCount');

// Session restoration
window.addEventListener('load', () => {
    const savedData = sessionStorage.getItem('urlInspectorData');
    const savedJobId = sessionStorage.getItem('currentCrawlJobId');
    
    if (savedData) {
        try {
            currentData = JSON.parse(savedData);
            displayResults(currentData);
            showRestorationNotice();
        } catch (e) {
            console.error('Failed to restore session data:', e);
            sessionStorage.removeItem('urlInspectorData');
        }
    }
    
    if (savedJobId) {
        currentCrawlJobId = savedJobId;
        checkCrawlProgress(savedJobId, true);
    }
});

function showRestorationNotice() {
    const notice = document.createElement('div');
    notice.className = 'restoration-notice';
    notice.innerHTML = `
        <div class="restoration-content">
            <span>🔄 Session restored with previous inspection results</span>
            <button class="clear-session-btn" onclick="clearSession()">Clear Session</button>
        </div>
    `;
    document.querySelector('.input-section').appendChild(notice);
}

function clearSession() {
    sessionStorage.removeItem('urlInspectorData');
    sessionStorage.removeItem('currentCrawlJobId');
    location.reload();
}

// Utility functions
function showError(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
}

function showSuccess(message) {
    successMessage.textContent = `✅ ${message}`;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
        inspectBtn.disabled = true;
        parseManualBtn.disabled = true;
    } else {
        loadingIndicator.classList.add('hidden');
        inspectBtn.disabled = false;
        parseManualBtn.disabled = false;
    }
}

function showCrawlStatus(show, message = '', isDetailed = false) {
    if (show) {
        crawlStatus.classList.remove('hidden');
        crawlStatusText.textContent = message;
        
        // Only show spinner for simple messages, hide for detailed status
        const spinner = crawlStatus.querySelector('.spinner');
        if (isDetailed) {
            spinner.style.display = 'none';
            crawlStatus.classList.add('crawling');
        } else {
            spinner.style.display = 'block';
            crawlStatus.classList.remove('crawling', 'complete');
        }
    } else {
        crawlStatus.classList.add('hidden');
        crawlStatus.classList.remove('crawling', 'complete');
    }
}

function showBatchInfo(show, jobId = '', status = '') {
    if (show) {
        batchInfo.classList.remove('hidden');
        if (jobId) currentJobIdSpan.textContent = jobId;
        if (status) crawlProgressStatus.textContent = status;
    } else {
        batchInfo.classList.add('hidden');
    }
}

// Main inspection function
async function inspectUrl(url) {
    showLoading(true);
    
    try {
        const response = await fetch('/api/inspect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentData = data;
            sessionStorage.setItem('urlInspectorData', JSON.stringify(data));
            displayResults(data);
            showSuccess(`Content extracted from: ${data.final_url}`);
        } else {
            showError(data.error || 'Failed to inspect URL');
        }
    } catch (error) {
        console.error('Inspection error:', error);
        showError(`Network error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Manual HTML parsing function
async function parseManualHtml(html, url = '') {
    showLoading(true);
    
    try {
        const response = await fetch('/api/parse-manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ html, url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentData = data;
            sessionStorage.setItem('urlInspectorData', JSON.stringify(data));
            displayResults(data);
            showSuccess('HTML content parsed successfully');
        } else {
            showError(data.error || 'Failed to parse HTML');
        }
    } catch (error) {
        console.error('Parsing error:', error);
        showError(`Network error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Display results
function displayResults(data) {
    resultsSection.classList.remove('hidden');
    
    // Basic Information
    updateBasicInfo(data);
    
    // Headings
    updateHeadings(data);
    
    // Main Content
    updateMainContent(data);
    
    // Links with categorization
    updateLinks(data);
    
    // Update export format visibility
    updateExportFormatOptions();
}

function updateBasicInfo(data) {
    const basicPreviews = document.getElementById('basicPreviews');
    let html = '';
    
    if (data.title) {
        document.getElementById('check_title').checked = true;
        html += `<div class="preview-item">
            <span class="preview-label">Title:</span>
            <div class="preview-content">${escapeHtml(data.title)}</div>
        </div>`;
    }
    
    if (data.meta_description) {
        document.getElementById('check_meta_description').checked = true;
        html += `<div class="preview-item">
            <span class="preview-label">Meta Description:</span>
            <div class="preview-content">${escapeHtml(data.meta_description)}</div>
        </div>`;
    }
    
    basicPreviews.innerHTML = html;
}

function updateHeadings(data) {
    const headings = data.headings || { h1: [], h2: [], h3: [] };
    const hasHeadings = headings.h1.length > 0 || headings.h2.length > 0 || headings.h3.length > 0;
    
    const headingsExpander = document.getElementById('headingsExpander');
    if (!hasHeadings) {
        headingsExpander.style.display = 'none';
        return;
    }
    
    headingsExpander.style.display = 'block';
    
    // Update labels with counts
    document.getElementById('h1Label').textContent = `H1 (${headings.h1.length})`;
    document.getElementById('h2Label').textContent = `H2 (${headings.h2.length})`;
    document.getElementById('h3Label').textContent = `H3 (${headings.h3.length})`;
    
    // Set checkboxes
    document.getElementById('check_h1').checked = headings.h1.length > 0;
    document.getElementById('check_h2').checked = headings.h2.length > 0;
    document.getElementById('check_h3').checked = headings.h3.length > 0;
    
    // Update previews
    const headingPreviews = document.getElementById('headingPreviews');
    let html = '';
    
    ['h1', 'h2', 'h3'].forEach(level => {
        if (headings[level] && headings[level].length > 0) {
            const preview = headings[level].slice(0, 5);
            html += `<div class="preview-item">
                <span class="preview-label">${level.toUpperCase()}:</span>
                <div class="preview-list">
                    <ul>
                        ${preview.map(heading => `<li>${escapeHtml(heading)}</li>`).join('')}
                        ${headings[level].length > 5 ? `<li><em>... and ${headings[level].length - 5} more</em></li>` : ''}
                    </ul>
                </div>
            </div>`;
        }
    });
    
    headingPreviews.innerHTML = html;
}

function updateMainContent(data) {
    const contentExpander = document.getElementById('contentExpander');
    const contentPreview = document.getElementById('contentPreview');
    
    if (!data.main_content || data.main_content.trim().length === 0) {
        contentExpander.style.display = 'none';
        return;
    }
    
    contentExpander.style.display = 'block';
    document.getElementById('check_main_content').checked = true;
    
    const previewLength = Math.min(500, data.main_content.length);
    const preview = data.main_content.substring(0, previewLength);
    
    contentPreview.innerHTML = `<div class="preview-item">
        <span class="preview-label">Content Preview:</span>
        <div class="preview-content">${escapeHtml(preview)}${data.main_content.length > previewLength ? '...' : ''}</div>
    </div>`;
}

function updateLinks(data) {
    const linksExpander = document.getElementById('linksExpander');
    const linksPreview = document.getElementById('linksPreview');
    
    // Use categorized links if available, fallback to regular links
    const categorizedLinks = data.categorized_links || {};
    const regularLinks = data.links || [];
    
    // If we have categorized links, use them
    if (Object.keys(categorizedLinks).length > 0) {
        const categories = {
            content_internal: 'Content Links',
            external: 'External Links',
            navigation: 'Navigation Links',
            legal_or_contact: 'Legal/Contact Links'
        };
        
        let totalLinks = 0;
        let hasAnyLinks = false;
        
        // Update labels with counts and set default selections
        Object.keys(categories).forEach(category => {
            const links = categorizedLinks[category] || [];
            const count = links.length;
            totalLinks += count;
            
            const labelElement = document.getElementById(`links${category.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)).join('')}Label`);
            if (labelElement) {
                labelElement.textContent = `${categories[category]} (${count})`;
            }
            
            const checkboxElement = document.getElementById(`check_links_${category}`);
            if (checkboxElement) {
                // Default selections: content links and external links checked, navigation and legal unchecked
                checkboxElement.checked = (category === 'content_internal' || category === 'external') && count > 0;
            }
            
            if (count > 0) hasAnyLinks = true;
        });
        
        if (!hasAnyLinks) {
            linksExpander.style.display = 'none';
            return;
        }
        
        linksExpander.style.display = 'block';
        
        // Create preview
        let html = '';
        Object.keys(categories).forEach(category => {
            const links = categorizedLinks[category] || [];
            if (links.length > 0) {
                const preview = links.slice(0, 10);
                html += `<div class="preview-item">
                    <span class="preview-label">${categories[category]}:</span>
                    <div class="preview-list">
                        <ul>
                            ${preview.map(link => `<li><a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.text)}</a></li>`).join('')}
                            ${links.length > 10 ? `<li><em>... and ${links.length - 10} more</em></li>` : ''}
                        </ul>
                    </div>
                </div>`;
            }
        });
        
        linksPreview.innerHTML = html;
    } 
    // Fallback to regular links display
    else if (regularLinks.length > 0) {
        linksExpander.style.display = 'block';
        
        // Set only the general links checkbox (if it exists)
        const generalLinksCheckbox = document.getElementById('check_links');
        if (generalLinksCheckbox) {
            generalLinksCheckbox.checked = false; // Default to unchecked for privacy
        }
        
        const preview = regularLinks.slice(0, 10);
        linksPreview.innerHTML = `<div class="preview-item">
            <span class="preview-label">Links (${regularLinks.length}):</span>
            <div class="preview-list">
                <ul>
                    ${preview.map(link => {
                        const url = typeof link === 'object' ? link.url : link;
                        const text = typeof link === 'object' ? link.text : link;
                        return `<li><a href="${escapeHtml(url)}" target="_blank">${escapeHtml(text)}</a></li>`;
                    }).join('')}
                    ${regularLinks.length > 10 ? `<li><em>... and ${regularLinks.length - 10} more</em></li>` : ''}
                </ul>
            </div>
        </div>`;
    }
    // No links at all
    else {
        linksExpander.style.display = 'none';
    }
}

// Crawling functions
async function startCrawl() {
    const url = urlInput.value.trim();
    const jobId = jobIdInput.value.trim();
    const maxDepth = parseInt(maxDepthSelect.value);
    const maxPages = parseInt(maxPagesInput.value);
    const pagesPerBatch = parseInt(pagesPerBatchInput.value);
    
    if (!url && !jobId) {
        showError('Please enter a URL to crawl or a Job ID to resume');
        return;
    }
    
    try {
        crawlBtn.disabled = true;
        showCrawlStatus(true, 'Initializing crawl...');
        
        const response = await fetch('/api/crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                jobId: jobId || undefined,
                maxDepth,
                maxPages,
                pagesPerBatch
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentCrawlJobId = result.jobId;
            sessionStorage.setItem('currentCrawlJobId', currentCrawlJobId);
            
            // Start polling for progress
            startCrawlProgressPolling(result.jobId);
            
            showBatchInfo(true, result.jobId, 'In Progress');
            sitemapSection.classList.remove('hidden');
            
            if (result.isComplete) {
                displayCrawlResults(result);
            }
        } else {
            showError(result.error || 'Failed to start crawl');
            showCrawlStatus(false);
        }
    } catch (error) {
        console.error('Crawl error:', error);
        showError(`Network error: ${error.message}`);
        showCrawlStatus(false);
    } finally {
        crawlBtn.disabled = false;
    }
}

function startCrawlProgressPolling(jobId) {
    // Clear any existing interval
    if (crawlProgressInterval) {
        clearInterval(crawlProgressInterval);
    }
    
    // Start polling every 2 seconds
    crawlProgressInterval = setInterval(() => {
        checkCrawlProgress(jobId);
    }, 2000);
    
    // Do an immediate check
    checkCrawlProgress(jobId);
}

async function checkCrawlProgress(jobId, isRestoredSession = false) {
    try {
        const response = await fetch(`/api/crawl-progress/${jobId}`);
        const progress = await response.json();
        
        if (progress.success) {
            updateProgressDisplay(progress, isRestoredSession);
            
            if (progress.isComplete) {
                stopCrawlProgressPolling();
                // Fetch final results
                const crawlResponse = await fetch('/api/crawl', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jobId: jobId,
                        maxDepth: progress.depth,
                        maxPages: progress.maxPages,
                        pagesPerBatch: 50
                    })
                });
                
                const finalResult = await crawlResponse.json();
                if (finalResult.success) {
                    displayCrawlResults(finalResult);
                }
            }
        } else if (!isRestoredSession) {
            console.error('Progress check failed:', progress.error);
            stopCrawlProgressPolling();
        }
    } catch (error) {
        if (!isRestoredSession) {
            console.error('Progress polling error:', error);
        }
    }
}

function updateProgressDisplay(progress, isRestoredSession = false) {
    let statusMessage = '';
    let isDetailed = false;
    
    // Show sitemap section and batch info
    sitemapSection.classList.remove('hidden');
    showBatchInfo(true, progress.jobId, progress.status);
    
    if (isRestoredSession) {
        statusMessage = `Session restored - Job: ${progress.jobId}`;
        if (progress.status === 'completed') {
            statusMessage += ` (Completed: ${progress.pageCount} pages)`;
        } else {
            statusMessage += ` (Status: ${progress.status})`;
        }
        isDetailed = true;
    } else {
        switch (progress.status) {
            case 'starting':
            case 'initializing':
                statusMessage = 'Initializing crawl...';
                break;
            case 'crawling':
                if (progress.currentUrl) {
                    const urlPath = new URL(progress.currentUrl).pathname || '/';
                    statusMessage = `Processing: ${urlPath}\n\nBatch Progress: ${progress.pagesProcessedInBatch}/${progress.maxPagesThisBatch} pages\nTotal: ${progress.pageCount} pages crawled, ${progress.queueLength} in queue`;
                    isDetailed = true;
                } else {
                    statusMessage = `Crawling in progress... (${progress.pageCount}/${progress.maxPages} pages)`;
                    isDetailed = true;
                }
                break;
            case 'batch_complete':
                statusMessage = `Batch complete! Processed ${progress.pagesProcessedInBatch} pages.\n\nTotal crawled: ${progress.pageCount} pages\nRemaining in queue: ${progress.queueLength}`;
                isDetailed = true;
                showResumeCrawlButton(true);
                break;
            case 'completed':
                statusMessage = `Crawl complete!\n\nTotal pages processed: ${progress.pageCount}`;
                isDetailed = true;
                crawlStatus.classList.remove('crawling');
                crawlStatus.classList.add('complete');
                break;
            default:
                statusMessage = `Status: ${progress.status} (${progress.pageCount}/${progress.maxPages} pages)`;
                isDetailed = true;
        }
    }
    
    showCrawlStatus(true, statusMessage, isDetailed);
    
    // Update resume button visibility
    if (progress.status === 'batch_complete' || progress.batchComplete) {
        showResumeCrawlButton(true);
    } else if (progress.status === 'completed') {
        showResumeCrawlButton(false);
    }
}

function stopCrawlProgressPolling() {
    if (crawlProgressInterval) {
        clearInterval(crawlProgressInterval);
        crawlProgressInterval = null;
    }
}

function showResumeCrawlButton(show) {
    if (show) {
        resumeCrawlBtn.classList.remove('hidden');
    } else {
        resumeCrawlBtn.classList.add('hidden');
    }
}

async function resumeCrawl() {
    if (!currentCrawlJobId) {
        showError('No active crawl job to resume');
        return;
    }
    
    try {
        resumeCrawlBtn.disabled = true;
        showCrawlStatus(true, 'Resuming crawl...');
        showResumeCrawlButton(false);
        
        const response = await fetch('/api/crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jobId: currentCrawlJobId,
                maxDepth: parseInt(maxDepthSelect.value),
                maxPages: parseInt(maxPagesInput.value),
                pagesPerBatch: parseInt(pagesPerBatchInput.value)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            startCrawlProgressPolling(currentCrawlJobId);
            
            if (result.isComplete) {
                displayCrawlResults(result);
            }
        } else {
            showError(result.error || 'Failed to resume crawl');
            showCrawlStatus(false);
        }
    } catch (error) {
        console.error('Resume crawl error:', error);
        showError(`Network error: ${error.message}`);
        showCrawlStatus(false);
    } finally {
        resumeCrawlBtn.disabled = false;
    }
}

function displayCrawlResults(result) {
    showCrawlStatus(false);
    sitemapContainer.classList.remove('hidden');
    
    // Display crawl summary
    displayCrawlSummary(result.stats);
    
    // Display sitemap
    displaySitemap(result.sitemap);
}

function displayCrawlSummary(stats) {
    const totalPages = Object.keys(window.currentSitemap || {}).length;
    const successfulPages = Object.values(window.currentSitemap || {}).filter(page => page.success).length;
    const errorPages = totalPages - successfulPages;
    const relevantPages = Object.values(window.currentSitemap || {}).filter(page => page.is_relevant !== false).length;
    
    crawlSummary.innerHTML = `
        <div class="crawl-stats">
            <div class="stat-item">
                <span class="stat-value">${totalPages}</span>
                <span class="stat-label">Total Pages</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${successfulPages}</span>
                <span class="stat-label">Successful</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${errorPages}</span>
                <span class="stat-label">Errors</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${relevantPages}</span>
                <span class="stat-label">Relevant</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.maxDepth}</span>
                <span class="stat-label">Max Depth</span>
            </div>
        </div>
    `;
}

function displaySitemap(sitemap) {
    window.currentSitemap = sitemap;
    const tree = buildSitemapTree(sitemap);
    sitemapTree.innerHTML = tree;
    updateSelectionCount();
}

function buildSitemapTree(sitemap) {
    const urls = Object.keys(sitemap);
    const processed = new Set();
    let html = '';
    
    // Build tree structure starting from depth 0
    function buildLevel(currentDepth) {
        let levelHtml = '';
        
        urls.forEach(url => {
            const page = sitemap[url];
            if (page.depth === currentDepth && !processed.has(url)) {
                processed.add(url);
                levelHtml += buildSitemapNode(url, page, sitemap);
            }
        });
        
        return levelHtml;
    }
    
    // Build all levels
    for (let depth = 0; depth <= 5; depth++) {
        html += buildLevel(depth);
    }
    
    return html;
}

function buildSitemapNode(url, page, sitemap) {
    const isError = !page.success;
    const isIrrelevant = page.is_relevant === false;
    const nodeClass = `sitemap-node depth-${Math.min(page.depth, 2)}`;
    const itemClass = `sitemap-item ${isError ? 'error' : ''} ${isIrrelevant ? 'irrelevant' : ''}`;
    
    // Generate unique IDs for checkboxes
    const urlHash = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    const exportCheckboxId = `export_${urlHash}`;
    const relevanceCheckboxId = `relevance_${urlHash}`;
    
    let sectionsInfo = '';
    if (page.sections && page.sections.length > 0) {
        sectionsInfo = `${page.sections.length} sections`;
    }
    
    return `
        <div class="${nodeClass}">
            <div class="${itemClass}">
                <div class="sitemap-checkboxes">
                    <label class="checkbox-label export-label">
                        <input type="checkbox" 
                               class="sitemap-checkbox" 
                               id="${exportCheckboxId}"
                               data-url="${escapeHtml(url)}"
                               onchange="updateSelectionCount()"
                               ${!isError && !isIrrelevant ? 'checked' : ''}>
                        Export
                    </label>
                    <label class="checkbox-label relevance-label">
                        <input type="checkbox" 
                               class="sitemap-relevance-checkbox" 
                               id="${relevanceCheckboxId}"
                               data-url="${escapeHtml(url)}"
                               onchange="toggleRelevance('${escapeHtml(url)}'); updateSelectionCount()"
                               ${!isIrrelevant ? 'checked' : ''}>
                        Relevant
                    </label>
                </div>
                <div class="sitemap-content">
                    <div class="sitemap-title">${escapeHtml(page.title || 'Untitled')}</div>
                    <a href="${escapeHtml(url)}" target="_blank" class="sitemap-url">${escapeHtml(url)}</a>
                    <div class="sitemap-meta">
                        <span>Depth: ${page.depth}</span>
                        ${sectionsInfo ? `<span>${sectionsInfo}</span>` : ''}
                        ${page.meta_description ? `<span>Has description</span>` : ''}
                    </div>
                    ${isError ? `<div class="sitemap-error">${escapeHtml(page.error)}</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function toggleRelevance(url) {
    if (window.currentSitemap && window.currentSitemap[url]) {
        const currentValue = window.currentSitemap[url].is_relevant;
        window.currentSitemap[url].is_relevant = currentValue === false ? true : false;
        
        // Update the visual state
        const urlHash = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
        const sitemapItem = document.querySelector(`#relevance_${urlHash}`).closest('.sitemap-item');
        
        if (window.currentSitemap[url].is_relevant === false) {
            sitemapItem.classList.add('irrelevant');
            // Uncheck export checkbox when marked irrelevant
            const exportCheckbox = document.querySelector(`#export_${urlHash}`);
            if (exportCheckbox) {
                exportCheckbox.checked = false;
            }
        } else {
            sitemapItem.classList.remove('irrelevant');
            // Check export checkbox when marked relevant (if not error)
            if (window.currentSitemap[url].success) {
                const exportCheckbox = document.querySelector(`#export_${urlHash}`);
                if (exportCheckbox) {
                    exportCheckbox.checked = true;
                }
            }
        }
    }
}

function selectAllPages() {
    const checkboxes = document.querySelectorAll('.sitemap-checkbox');
    checkboxes.forEach(checkbox => {
        const url = checkbox.dataset.url;
        const page = window.currentSitemap[url];
        // Only select if successful and relevant
        if (page && page.success && page.is_relevant !== false) {
            checkbox.checked = true;
        }
    });
    updateSelectionCount();
}

function selectNonePages() {
    const checkboxes = document.querySelectorAll('.sitemap-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectionCount();
}

function updateSelectionCount() {
    const selectedCheckboxes = document.querySelectorAll('.sitemap-checkbox:checked');
    const relevantCheckboxes = document.querySelectorAll('.sitemap-relevance-checkbox:checked');
    
    const selectionStat = document.querySelector('.selection-stat');
    const relevanceStat = document.querySelector('.relevance-stat');
    
    if (selectionStat) {
        selectionStat.textContent = `${selectedCheckboxes.length} pages selected for export`;
    }
    
    if (relevanceStat) {
        relevanceStat.textContent = `${relevantCheckboxes.length} pages marked as relevant`;
    }
}

// Export functions
function updateExportFormatOptions() {
    const exportFormat = document.querySelector('input[name="export_format"]:checked').value;
    const ragOptions = document.getElementById('ragOptions');
    
    if (exportFormat === 'rag_jsonl') {
        ragOptions.classList.remove('hidden');
    } else {
        ragOptions.classList.add('hidden');
    }
}

function getSelectedContent() {
    const selected = {};
    
    // Basic information
    selected.source_url = document.getElementById('check_source_url').checked;
    selected.title = document.getElementById('check_title').checked;
    selected.meta_description = document.getElementById('check_meta_description').checked;
    
    // Headings
    selected.h1 = document.getElementById('check_h1')?.checked || false;
    selected.h2 = document.getElementById('check_h2')?.checked || false;
    selected.h3 = document.getElementById('check_h3')?.checked || false;
    
    // Content
    selected.main_content = document.getElementById('check_main_content').checked;
    
    // Links - check for categorized link checkboxes
    selected.links_content_internal = document.getElementById('check_links_content_internal')?.checked || false;
    selected.links_external = document.getElementById('check_links_external')?.checked || false;
    selected.links_navigation = document.getElementById('check_links_navigation')?.checked || false;
    selected.links_legal_or_contact = document.getElementById('check_links_legal_or_contact')?.checked || false;
    
    return selected;
}

function getSelectedPages() {
    const selectedPages = [];
    const checkboxes = document.querySelectorAll('.sitemap-checkbox:checked');
    
    checkboxes.forEach(checkbox => {
        const url = checkbox.dataset.url;
        if (window.currentSitemap && window.currentSitemap[url]) {
            selectedPages.push(window.currentSitemap[url]);
        }
    });
    
    return selectedPages;
}

async function downloadExport() {
    if (!currentData) {
        showError('No data to export');
        return;
    }
    
    const exportFormat = document.querySelector('input[name="export_format"]:checked').value;
    const selectedContent = getSelectedContent();
    
    // Check if we have multi-page data
    const selectedPages = window.currentSitemap ? getSelectedPages() : [];
    const isMultiPage = selectedPages.length > 0;
    
    let exportData, filename, mimeType;
    
    try {
        if (exportFormat === 'json') {
            const result = createJsonExport(selectedContent, isMultiPage ? selectedPages : [currentData]);
            exportData = JSON.stringify(result, null, 2);
            filename = `${isMultiPage ? 'multi_page' : 'url'}_content_${Date.now()}.json`;
            mimeType = 'application/json';
        } else if (exportFormat === 'rag_jsonl') {
            const chunkSize = parseInt(document.getElementById('chunkSize').value);
            const overlap = parseInt(document.getElementById('overlap').value);
            const includeHeadings = document.getElementById('includeHeadings').checked;
            
            exportData = createRagJsonlExport(selectedContent, isMultiPage ? selectedPages : [currentData], chunkSize, overlap, includeHeadings);
            filename = `${isMultiPage ? 'multi_page' : 'rag'}_content_${Date.now()}.jsonl`;
            mimeType = 'application/jsonl';
        } else if (exportFormat === 'txt') {
            exportData = createTextExport(selectedContent, isMultiPage ? selectedPages : [currentData]);
            filename = `${isMultiPage ? 'multi_page' : 'url'}_content_${Date.now()}.txt`;
            mimeType = 'text/plain';
        }
        
        // Create and download file
        const blob = new Blob([exportData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        showSuccess(`Export downloaded: ${filename}`);
        
    } catch (error) {
        console.error('Export error:', error);
        showError(`Export failed: ${error.message}`);
    }
}

function createJsonExport(selectedContent, pages) {
    const result = {};
    
    if (pages.length === 1) {
        // Single page export
        const data = pages[0];
        
        if (selectedContent.source_url) result.source_url = data.final_url;
        if (selectedContent.title && data.title) result.title = data.title;
        if (selectedContent.meta_description && data.meta_description) result.meta_description = data.meta_description;
        
        // Headings
        if (data.headings) {
            if (selectedContent.h1 && data.headings.h1) result.h1 = data.headings.h1;
            if (selectedContent.h2 && data.headings.h2) result.h2 = data.headings.h2;
            if (selectedContent.h3 && data.headings.h3) result.h3 = data.headings.h3;
        }
        
        if (selectedContent.main_content && data.main_content) result.main_content = data.main_content;
        
        // Export links based on selection
        const exportLinks = {};
        if (data.categorized_links) {
            if (selectedContent.links_content_internal && data.categorized_links.content_internal) {
                exportLinks.content_internal = data.categorized_links.content_internal;
            }
            if (selectedContent.links_external && data.categorized_links.external) {
                exportLinks.external = data.categorized_links.external;
            }
            if (selectedContent.links_navigation && data.categorized_links.navigation) {
                exportLinks.navigation = data.categorized_links.navigation;
            }
            if (selectedContent.links_legal_or_contact && data.categorized_links.legal_or_contact) {
                exportLinks.legal_or_contact = data.categorized_links.legal_or_contact;
            }
            
            if (Object.keys(exportLinks).length > 0) {
                result.links = exportLinks;
            }
        }
        
    } else {
        // Multi-page export
        result.pages = pages.map(data => {
            const pageResult = {};
            
            if (selectedContent.source_url) pageResult.source_url = data.final_url;
            if (selectedContent.title && data.title) pageResult.title = data.title;
            if (selectedContent.meta_description && data.meta_description) pageResult.meta_description = data.meta_description;
            
            if (selectedContent.main_content && data.main_content) pageResult.main_content = data.main_content;
            
            // Export links based on selection for each page
            const exportLinks = {};
            if (data.categorized_links) {
                if (selectedContent.links_content_internal && data.categorized_links.content_internal) {
                    exportLinks.content_internal = data.categorized_links.content_internal;
                }
                if (selectedContent.links_external && data.categorized_links.external) {
                    exportLinks.external = data.categorized_links.external;
                }
                if (selectedContent.links_navigation && data.categorized_links.navigation) {
                    exportLinks.navigation = data.categorized_links.navigation;
                }
                if (selectedContent.links_legal_or_contact && data.categorized_links.legal_or_contact) {
                    exportLinks.legal_or_contact = data.categorized_links.legal_or_contact;
                }
                
                if (Object.keys(exportLinks).length > 0) {
                    pageResult.links = exportLinks;
                }
            }
            
            return pageResult;
        });
    }
    
    return result;
}

function createRagJsonlExport(selectedContent, pages, chunkSize, overlap, includeHeadings) {
    const lines = [];
    
    pages.forEach(data => {
        const baseMetadata = { source: data.final_url };
        if (includeHeadings && data.headings) {
            baseMetadata.h1 = data.headings.h1 || [];
            baseMetadata.h2 = data.headings.h2 || [];
            baseMetadata.h3 = data.headings.h3 || [];
        }
        
        let chunkIndex = 0;
        
        // Title
        if (selectedContent.title && data.title) {
            const metadata = { ...baseMetadata, type: 'title' };
            lines.push({
                id: generateChunkId(data.final_url, chunkIndex, data.title),
                title: data.title,
                chunk: data.title,
                metadata
            });
            chunkIndex++;
        }
        
        // Meta description
        if (selectedContent.meta_description && data.meta_description) {
            const metadata = { ...baseMetadata, type: 'description' };
            lines.push({
                id: generateChunkId(data.final_url, chunkIndex, data.meta_description),
                title: data.title || '',
                chunk: data.meta_description,
                metadata
            });
            chunkIndex++;
        }
        
        // Main content
        if (selectedContent.main_content && data.main_content) {
            const chunks = chunkText(data.main_content, chunkSize, overlap);
            chunks.forEach(chunk => {
                const metadata = { ...baseMetadata, type: 'text' };
                lines.push({
                    id: generateChunkId(data.final_url, chunkIndex, chunk),
                    title: data.title || '',
                    chunk,
                    metadata
                });
                chunkIndex++;
            });
        }
    });
    
    return lines.map(line => JSON.stringify(line)).join('\n');
}

function createTextExport(selectedContent, pages) {
    let text = '';
    
    pages.forEach((data, pageIndex) => {
        if (pages.length > 1) {
            text += `\n${'='.repeat(80)}\n`;
            text += `PAGE ${pageIndex + 1}\n`;
            text += `${'='.repeat(80)}\n\n`;
        }
        
        if (selectedContent.source_url) {
            text += `Source URL: ${data.final_url}\n\n`;
        }
        
        if (selectedContent.title && data.title) {
            text += `Title: ${data.title}\n\n`;
        }
        
        if (selectedContent.meta_description && data.meta_description) {
            text += `Meta Description: ${data.meta_description}\n\n`;
        }
        
        if (selectedContent.main_content && data.main_content) {
            text += `Main Content:\n${'-'.repeat(50)}\n${data.main_content}\n\n`;
        }
        
        // Export selected link categories
        if (data.categorized_links) {
            const linkCategories = {
                content_internal: 'Content Links',
                external: 'External Links', 
                navigation: 'Navigation Links',
                legal_or_contact: 'Legal/Contact Links'
            };
            
            Object.keys(linkCategories).forEach(category => {
                if (selectedContent[`links_${category}`] && data.categorized_links[category] && data.categorized_links[category].length > 0) {
                    text += `${linkCategories[category]}:\n${'-'.repeat(30)}\n`;
                    data.categorized_links[category].forEach(link => {
                        text += `• ${link.text}: ${link.url}\n`;
                    });
                    text += '\n';
                }
            });
        }
    });
    
    return text.trim();
}

// Utility functions
function generateChunkId(url, chunkIndex, chunkText) {
    const content = `${url}_${chunkIndex}_${chunkText.substring(0, 50)}`;
    return btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
}

function chunkText(text, chunkSize, overlap) {
    if (!text || !text.trim()) return [];
    
    const words = text.split(/\s+/);
    if (words.length <= chunkSize) return [text];
    
    const chunks = [];
    let start = 0;
    
    while (start < words.length) {
        const end = Math.min(start + chunkSize, words.length);
        const chunk = words.slice(start, end).join(' ');
        chunks.push(chunk);
        
        if (end >= words.length) break;
        
        start = end - overlap;
        if (start < 0) start = 0;
    }
    
    return chunks;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    inspectBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            let fullUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                fullUrl = 'https://' + url;
            }
            inspectUrl(fullUrl);
        }
    });
    
    parseManualBtn.addEventListener('click', () => {
        const html = manualHtml.value.trim();
        const url = manualUrl.value.trim();
        if (html) {
            parseManualHtml(html, url);
        }
    });
    
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            inspectBtn.click();
        }
    });
    
    downloadBtn.addEventListener('click', downloadExport);
    
    // Export format change handler
    document.querySelectorAll('input[name="export_format"]').forEach(radio => {
        radio.addEventListener('change', updateExportFormatOptions);
    });
    
    // Crawl event listeners
    crawlBtn.addEventListener('click', startCrawl);
    resumeCrawlBtn.addEventListener('click', resumeCrawl);
    selectAllBtn.addEventListener('click', selectAllPages);
    selectNoneBtn.addEventListener('click', selectNonePages);
});