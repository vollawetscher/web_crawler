// URL Inspector Frontend Script

let currentData = null;
let currentCrawlData = null;
let currentJobId = null;
let crawlProgressInterval = null;
let generatedJsonExport = null;
let generatedRagJsonlExport = null;
let generatedTextExport = null;
let crawlLog = [];

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
const crawlControlsSection = document.getElementById('crawlControlsSection');
const crawlResultsSection = document.getElementById('crawlResultsSection');
const crawlBtn = document.getElementById('crawlBtn');
const stopCrawlBtn = document.getElementById('stopCrawlBtn');
const crawlStatus = document.getElementById('crawlStatus');
const crawlStatusText = document.getElementById('crawlStatusText');
const jobInfo = document.getElementById('jobInfo');
const currentJobIdSpan = document.getElementById('currentJobId');
const crawlProgressStatus = document.getElementById('crawlProgressStatus');
const jobIdInput = document.getElementById('jobId');
const crawlLogContainer = document.getElementById('crawlLog');

// Export format elements
const exportFormatRadios = document.querySelectorAll('input[name="export_format"]');
const ragOptions = document.getElementById('ragOptions');

// Session restoration
let sessionData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeExportFormatHandlers();
    restoreSessionIfExists();
});

function initializeEventListeners() {
    inspectBtn.addEventListener('click', handleInspect);
    parseManualBtn.addEventListener('click', handleManualParse);
    crawlBtn.addEventListener('click', handleCrawl);
    stopCrawlBtn.addEventListener('click', handleStopCrawl);
    
    // Download button listeners
    document.getElementById('downloadJsonBtn')?.addEventListener('click', () => downloadFormat('json'));
    document.getElementById('downloadRagBtn')?.addEventListener('click', () => downloadFormat('rag_jsonl'));
    document.getElementById('downloadTxtBtn')?.addEventListener('click', () => downloadFormat('txt'));
    
    // URL input enter key
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleInspect();
        }
    });
    
    // Sitemap selection handlers
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('sitemap-checkbox') || 
            e.target.classList.contains('sitemap-relevance-checkbox')) {
            updateSelectionCount();
            updateExportInfo();
        }
    });
    
    // Select all/none buttons
    document.getElementById('selectAllBtn')?.addEventListener('click', function() {
        document.querySelectorAll('.sitemap-checkbox').forEach(cb => cb.checked = true);
        updateSelectionCount();
        updateExportInfo();
    });
    
    document.getElementById('selectNoneBtn')?.addEventListener('click', function() {
        document.querySelectorAll('.sitemap-checkbox').forEach(cb => cb.checked = false);
        updateSelectionCount();
        updateExportInfo();
    });
}

function initializeExportFormatHandlers() {
    exportFormatRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'rag_jsonl') {
                ragOptions.classList.remove('hidden');
            } else {
                ragOptions.classList.add('hidden');
            }
            updateExportInfo();
        });
    });
    
    // Initialize RAG options visibility
    const selectedFormat = document.querySelector('input[name="export_format"]:checked');
    if (selectedFormat && selectedFormat.value === 'rag_jsonl') {
        ragOptions.classList.remove('hidden');
    }
}

function showLoading(message = 'Processing...') {
    loadingIndicator.querySelector('span').textContent = message;
    loadingIndicator.classList.remove('hidden');
    hideMessages();
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
    hideLoading();
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    hideLoading();
}

function hideMessages() {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
}

async function handleInspect() {
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a URL');
        return;
    }
    
    // Add protocol if missing
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    
    showLoading('Fetching and analyzing content...');
    inspectBtn.disabled = true;
    
    try {
        const response = await fetch('/api/inspect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: finalUrl })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentData = data;
            showSuccess(`✅ Content extracted from: ${data.final_url}`);
            displayResults(data);
            saveSessionData();
        } else {
            showError(`❌ ${data.error}`);
        }
        
    } catch (error) {
        showError(`Network error: ${error.message}`);
    } finally {
        inspectBtn.disabled = false;
        hideLoading();
    }
}

async function handleManualParse() {
    const html = manualHtml.value.trim();
    const url = manualUrl.value.trim();
    
    if (!html) {
        showError('Please paste HTML content');
        return;
    }
    
    showLoading('Parsing HTML content...');
    parseManualBtn.disabled = true;
    
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
            showSuccess(`✅ Content parsed successfully`);
            displayResults(data);
            saveSessionData();
        } else {
            showError(`❌ ${data.error}`);
        }
        
    } catch (error) {
        showError(`Network error: ${error.message}`);
    } finally {
        parseManualBtn.disabled = false;
        hideLoading();
    }
}

function displayResults(data) {
    // Show results section
    resultsSection.classList.remove('hidden');
    
    // Show crawl controls section
    crawlControlsSection.classList.remove('hidden');
    
    // Display basic information
    displayBasicInfo(data);
    
    // Display headings
    displayHeadings(data);
    
    // Display main content
    displayMainContent(data);
    
    // Display links
    displayLinks(data);
    
    // Update export info
    updateExportInfo();
}

function displayBasicInfo(data) {
    const previews = document.getElementById('basicPreviews');
    previews.innerHTML = '';
    
    if (data.title) {
        document.getElementById('check_title').checked = true;
        const titlePreview = createPreviewItem('Title Preview:', data.title);
        previews.appendChild(titlePreview);
    }
    
    if (data.meta_description) {
        document.getElementById('check_meta_description').checked = true;
        const descPreview = createPreviewItem('Meta Description Preview:', data.meta_description);
        previews.appendChild(descPreview);
    }
}

function displayHeadings(data) {
    const headingsExpander = document.getElementById('headingsExpander');
    const previews = document.getElementById('headingPreviews');
    
    if (!data.headings || (!data.headings.h1?.length && !data.headings.h2?.length && !data.headings.h3?.length)) {
        headingsExpander.style.display = 'none';
        return;
    }
    
    headingsExpander.style.display = 'block';
    previews.innerHTML = '';
    
    ['h1', 'h2', 'h3'].forEach(level => {
        const headings = data.headings[level] || [];
        const label = document.getElementById(`${level}Label`);
        const checkbox = document.getElementById(`check_${level}`);
        
        if (headings.length > 0) {
            label.textContent = `${level.toUpperCase()} (${headings.length})`;
            checkbox.checked = true;
            
            const preview = createPreviewItem(
                `${level.toUpperCase()} Preview:`,
                headings.slice(0, 5).join(', ') + (headings.length > 5 ? '...' : '')
            );
            previews.appendChild(preview);
        } else {
            label.textContent = level.toUpperCase();
            checkbox.checked = false;
        }
    });
}

function displayMainContent(data) {
    const contentExpander = document.getElementById('contentExpander');
    const preview = document.getElementById('contentPreview');
    
    if (!data.main_content) {
        contentExpander.style.display = 'none';
        return;
    }
    
    contentExpander.style.display = 'block';
    document.getElementById('check_main_content').checked = true;
    
    const previewLength = Math.min(500, data.main_content.length);
    const previewText = data.main_content.substring(0, previewLength) + 
                       (data.main_content.length > previewLength ? '...' : '');
    
    preview.innerHTML = '';
    const contentPreview = createPreviewItem('Content Preview:', previewText);
    preview.appendChild(contentPreview);
}

function displayLinks(data) {
    const linksExpander = document.getElementById('linksExpander');
    const preview = document.getElementById('linksPreview');
    
    if (!data.categorized_links) {
        linksExpander.style.display = 'none';
        return;
    }
    
    linksExpander.style.display = 'block';
    preview.innerHTML = '';
    
    const categories = {
        'content_internal': 'Content Links',
        'external': 'External Links', 
        'navigation': 'Navigation Links',
        'legal_or_contact': 'Legal/Contact Links'
    };
    
    Object.entries(categories).forEach(([key, label]) => {
        const links = data.categorized_links[key] || [];
        const labelElement = document.getElementById(`links${key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Label`);
        const checkbox = document.getElementById(`check_links_${key}`);
        
        if (labelElement) {
            labelElement.textContent = `${label} (${links.length})`;
        }
        
        if (checkbox) {
            checkbox.checked = key === 'content_internal' && links.length > 0;
        }
        
        if (links.length > 0) {
            const linksList = document.createElement('div');
            linksList.className = 'preview-item';
            
            const linkLabel = document.createElement('span');
            linkLabel.className = 'preview-label';
            linkLabel.textContent = `${label} Preview:`;
            linksList.appendChild(linkLabel);
            
            const linkContent = document.createElement('div');
            linkContent.className = 'preview-list';
            
            const ul = document.createElement('ul');
            links.slice(0, 10).forEach(link => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = link.url;
                a.textContent = link.text;
                a.target = '_blank';
                li.appendChild(a);
                ul.appendChild(li);
            });
            
            if (links.length > 10) {
                const li = document.createElement('li');
                li.textContent = `... and ${links.length - 10} more links`;
                ul.appendChild(li);
            }
            
            linkContent.appendChild(ul);
            linksList.appendChild(linkContent);
            preview.appendChild(linksList);
        }
    });
}

function createPreviewItem(label, content) {
    const item = document.createElement('div');
    item.className = 'preview-item';
    
    const labelEl = document.createElement('span');
    labelEl.className = 'preview-label';
    labelEl.textContent = label;
    item.appendChild(labelEl);
    
    const contentEl = document.createElement('div');
    contentEl.className = 'preview-content';
    contentEl.textContent = content;
    item.appendChild(contentEl);
    
    return item;
}

async function handleCrawl() {
    const url = urlInput.value.trim();
    const maxDepth = parseInt(document.getElementById('maxDepth').value);
    const maxPages = parseInt(document.getElementById('maxPages').value);
    const respectRobotsTxt = document.getElementById('respectRobotsTxt').checked;
    const providedJobId = jobIdInput.value.trim();
    
    if (!url && !providedJobId) {
        showError('Please enter a URL or provide a Job ID to resume');
        return;
    }
    
    showCrawlStatus('Starting crawl...', 'starting');
    crawlBtn.disabled = true;
    stopCrawlBtn.classList.remove('hidden');
    
    try {
        const requestBody = {
            maxDepth,
            maxPages,
            respectRobotsTxt
        };
        
        if (providedJobId) {
            requestBody.jobId = providedJobId;
            currentJobId = providedJobId;
        } else {
            requestBody.url = url.startsWith('http') ? url : `https://${url}`;
        }
        
        const response = await fetch('/api/crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentJobId = data.jobId;
            currentJobIdSpan.textContent = currentJobId;
            jobIdInput.value = currentJobId;
            jobInfo.classList.remove('hidden');
            crawlProgressStatus.textContent = 'Starting crawl...';
            
            // Start polling immediately
            showCrawlStatus('Crawling in progress...', 'crawling');
            startProgressPolling();
            
            saveSessionData();
        } else {
            showError(`❌ ${data.error}`);
            hideCrawlStatus();
        }
        
    } catch (error) {
        showError(`Network error: ${error.message}`);
        hideCrawlStatus();
    } finally {
        crawlBtn.disabled = false;
    }
}

async function handleStopCrawl() {
    if (!currentJobId) {
        showError('No job ID available to stop');
        return;
    }
    
    showCrawlStatus('Stopping crawl...', 'stopping');
    stopCrawlBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/crawl-stop/${currentJobId}`, {
            method: 'POST',
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Stop signal sent. Crawl will stop after current page.');
        } else {
            showError(`Failed to stop crawl: ${data.error}`);
        }
        
    } catch (error) {
        showError(`Network error: ${error.message}`);
    } finally {
        stopCrawlBtn.disabled = false;
    }
}

function showCrawlStatus(message, status = 'crawling') {
    crawlStatus.classList.remove('hidden');
    crawlStatus.className = `crawl-status ${status}`;
    crawlStatusText.textContent = message;
}

function hideCrawlStatus() {
    crawlStatus.classList.add('hidden');
}

function displayCrawlResults(data) {
    crawlResultsSection.classList.remove('hidden');
    
    // Display crawl summary
    const stats = data.stats || data;
    displayCrawlSummary(stats);
    
    // Display sitemap
    displaySitemap(data.sitemap || {});
    
    // Update selection count
    updateSelectionCount();
    
    // Update export info
    updateExportInfo();
}

function displayCrawlSummary(stats) {
    const summaryContainer = document.getElementById('crawlSummary');
    
    const remaining = stats.remaining !== undefined ? stats.remaining : Math.max(0, (stats.maxPages || 0) - (stats.totalPages || stats.pageCount || 0));
    
    summaryContainer.innerHTML = `
        <div class="crawl-stats">
            <div class="stat-item">
                <span class="stat-value">${stats.totalPages || stats.pageCount || 0}</span>
                <span class="stat-label">Pages Found</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.maxDepth || 0}</span>
                <span class="stat-label">Max Depth</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.isComplete ? 'Complete' : 'In Progress'}</span>
                <span class="stat-label">Status</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${remaining}</span>
                <span class="stat-label">Remaining</span>
            </div>
        </div>
    `;
}

function displaySitemap(sitemap) {
    const sitemapTree = document.getElementById('sitemapTree');
    sitemapTree.innerHTML = '';
    
    // Group pages by depth
    const pagesByDepth = {};
    Object.entries(sitemap).forEach(([url, data]) => {
        const depth = data.depth || 0;
        if (!pagesByDepth[depth]) {
            pagesByDepth[depth] = [];
        }
        pagesByDepth[depth].push({ url, ...data });
    });
    
    // Display pages by depth
    Object.keys(pagesByDepth).sort((a, b) => parseInt(a) - parseInt(b)).forEach(depth => {
        const pages = pagesByDepth[depth];
        pages.forEach(page => {
            const nodeElement = createSitemapNode(page, parseInt(depth));
            sitemapTree.appendChild(nodeElement);
        });
    });
}

function createSitemapNode(page, depth) {
    const node = document.createElement('div');
    node.className = `sitemap-node depth-${depth}`;
    
    const item = document.createElement('div');
    item.className = 'sitemap-item';
    
    if (page.error) {
        item.classList.add('error');
    } else if (page.skipped_due_to_depth) {
        item.classList.add('skipped-depth');
    } else if (!page.is_relevant) {
        item.classList.add('irrelevant');
    }
    
    // Checkboxes
    const checkboxes = document.createElement('div');
    checkboxes.className = 'sitemap-checkboxes';
    
    const exportCheckbox = document.createElement('input');
    exportCheckbox.type = 'checkbox';
    exportCheckbox.className = 'sitemap-checkbox';
    exportCheckbox.dataset.url = page.url;
    exportCheckbox.checked = page.success && page.is_relevant;
    
    const exportLabel = document.createElement('label');
    exportLabel.className = 'checkbox-label export-label';
    exportLabel.appendChild(exportCheckbox);
    exportLabel.appendChild(document.createTextNode('Export'));
    
    const relevanceCheckbox = document.createElement('input');
    relevanceCheckbox.type = 'checkbox';
    relevanceCheckbox.className = 'sitemap-relevance-checkbox';
    relevanceCheckbox.dataset.url = page.url;
    relevanceCheckbox.checked = page.is_relevant;
    
    const relevanceLabel = document.createElement('label');
    relevanceLabel.className = 'checkbox-label relevance-label';
    relevanceLabel.appendChild(relevanceCheckbox);
    relevanceLabel.appendChild(document.createTextNode('Relevant'));
    
    checkboxes.appendChild(exportLabel);
    checkboxes.appendChild(relevanceLabel);
    
    // Content
    const content = document.createElement('div');
    content.className = 'sitemap-content';
    
    const title = document.createElement('div');
    title.className = 'sitemap-title';
    title.textContent = page.title || 'Untitled Page';
    
    const url = document.createElement('a');
    url.className = 'sitemap-url';
    url.href = page.url;
    url.textContent = page.url;
    url.target = '_blank';
    
    const meta = document.createElement('div');
    meta.className = 'sitemap-meta';
    
    if (page.error) {
        const error = document.createElement('div');
        error.className = 'sitemap-error';
        error.textContent = `Error: ${page.error}`;
        meta.appendChild(error);
    } else if (page.skipped_due_to_depth) {
        const skipped = document.createElement('div');
        skipped.className = 'sitemap-skipped-depth';
        skipped.textContent = 'Skipped: Max depth reached';
        meta.appendChild(skipped);
    } else {
        meta.innerHTML = `
            <span>Depth: ${depth}</span>
            <span>Sections: ${page.sections ? page.sections.length : 0}</span>
            <span>Links: ${page.internal_links ? page.internal_links.length : 0}</span>
        `;
    }
    
    content.appendChild(title);
    content.appendChild(url);
    content.appendChild(meta);
    
    item.appendChild(checkboxes);
    item.appendChild(content);
    node.appendChild(item);
    
    return node;
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

function startProgressPolling() {
    if (crawlProgressInterval) {
        clearInterval(crawlProgressInterval);
    }
    
    crawlProgressInterval = setInterval(checkCrawlProgress, 2000);
}

function stopProgressPolling() {
    if (crawlProgressInterval) {
        clearInterval(crawlProgressInterval);
        crawlProgressInterval = null;
    }
}

async function checkCrawlProgress() {
    if (!currentJobId) {
        stopProgressPolling();
        return;
    }
    
    try {
        const response = await fetch(`/api/crawl-progress/${currentJobId}`);
        
        // Handle 404 - job not found, stop polling
        if (response.status === 404) {
            console.warn(`Crawl job ${currentJobId} not found (404), stopping progress polling`);
            showCrawlStatus('Job not found. The crawl may have expired or been deleted.', 'paused');
            resumeCrawlBtn.classList.add('hidden');
            stopProgressPolling();
            return;
        }
        
        // Handle other HTTP errors
        if (!response.ok) {
            console.warn(`Progress check failed with status ${response.status}, stopping polling`);
            stopProgressPolling();
            return;
        }
        
        const progress = await response.json();
        
        if (progress.success) {
            const remaining = Math.max(0, progress.maxPages - progress.pageCount);
            
            // Add current page to crawl log
            if (progress.currentUrl) {
                const currentPath = new URL(progress.currentUrl).pathname;
                addToCrawlLog(`Crawling: ${currentPath}`, 'info');
            }
            
            const statusText = `Status: ${progress.status} | Pages: ${progress.pageCount}/${progress.maxPages} | Remaining: ${remaining} | Queue: ${progress.queueLength}`;
            crawlStatusText.textContent = statusText;
            crawlProgressStatus.textContent = progress.status;
            
            // Update live sitemap if available
            if (progress.sitemap) {
                displayCrawlResults({
                    sitemap: progress.sitemap,
                    stats: {
                        totalPages: progress.pageCount,
                        maxDepth: progress.depth,
                        isComplete: progress.isComplete,
                        remaining: remaining
                    }
                });
            }
            
            if (progress.isComplete) {
                const statusMessage = progress.stoppedByUser ? 'Crawl stopped by user!' : 'Crawl completed!';
                showCrawlStatus(statusMessage, 'complete');
                addToCrawlLog(statusMessage, 'success');
                stopCrawlBtn.classList.add('hidden');
                crawlBtn.disabled = false;
                stopProgressPolling();
                
                // Store crawl data with complete sitemap
                currentCrawlData = {
                    sitemap: progress.sitemap,
                    stats: {
                        totalPages: progress.pageCount,
                        maxDepth: progress.depth,
                        isComplete: true,
                        remaining: remaining
                    }
                };
                
                // Generate all export formats
                addToCrawlLog('Generating export formats...', 'info');
                generateAllExportFormats();
                addToCrawlLog('All export formats ready!', 'success');
                
                // Show export section
                const exportSection = document.querySelector('.export-section');
                if (exportSection) {
                    exportSection.style.display = 'block';
                    addToCrawlLog('Export options now available', 'info');
                }
                
                saveSessionData();
            } else {
                // Update display with current progress
                if (progress.sitemap) {
                    currentCrawlData = {
                        sitemap: progress.sitemap,
                        stats: {
                            totalPages: progress.pageCount,
                            maxDepth: progress.depth,
                            isComplete: false,
                            remaining: remaining
                        }
                    };
                }
            }
        } else {
            console.warn('Progress check returned unsuccessful response, stopping polling');
            addToCrawlLog('Progress check failed', 'error');
            stopProgressPolling();
        }
    } catch (error) {
        console.error('Progress polling error:', error);
        showCrawlStatus('Connection error during progress check', 'paused');
        addToCrawlLog(`Connection error: ${error.message}`, 'error');
        stopProgressPolling();
    }
}

function generateAllExportFormats() {
    console.log('Generating all export formats...');
    
    // Generate JSON export
    generatedJsonExport = generateJSONExport();
    
    // Generate RAG JSONL export
    const chunkSize = parseInt(document.getElementById('chunkSize').value) || 300;
    const overlap = parseInt(document.getElementById('overlap').value) || 50;
    const includeHeadings = document.getElementById('includeHeadings').checked;
    generatedRagJsonlExport = generateRAGJSONLExportData(chunkSize, overlap, includeHeadings);
    
    // Generate text export
    generatedTextExport = generateTextExport();
    
    console.log('Export formats generated:', {
        json: generatedJsonExport ? 'ready' : 'empty',
        rag: generatedRagJsonlExport ? 'ready' : 'empty',
        text: generatedTextExport ? 'ready' : 'empty'
    });
    
    // Update download buttons to show they're ready
    const downloadButtons = document.querySelectorAll('.download-btn');
    downloadButtons.forEach(btn => {
        btn.disabled = false;
    });
}

function updateExportInfo() {
    const exportInfo = document.getElementById('exportInfo');
    const selectedFormat = document.querySelector('input[name="export_format"]:checked')?.value || 'json';
    
    let info = '';
    
    if (selectedFormat === 'json') {
        info = 'JSON format: Structured data with all selected content types and metadata.';
    } else if (selectedFormat === 'rag_jsonl') {
        const chunkSize = document.getElementById('chunkSize').value;
        const overlap = document.getElementById('overlap').value;
        info = `RAG JSONL format: AI-optimized chunks (${chunkSize} words, ${overlap} overlap) with metadata for retrieval systems.`;
    } else if (selectedFormat === 'txt') {
        info = 'Plain text format: Clean, readable text organized by sections and headings.';
    }
    
    // Add multi-page info if crawl data exists
    if (currentCrawlData) {
        const selectedPages = document.querySelectorAll('.sitemap-checkbox:checked').length;
        if (selectedPages > 0) {
            info += ` Multi-page export: ${selectedPages} pages selected.`;
        }
    }
    
    exportInfo.textContent = info;
}

function downloadFormat(format) {
    let exportData;
    let filename;
    let mimeType;
    
    if (format === 'json') {
        exportData = generatedJsonExport;
        filename = `url_content_${Date.now()}.json`;
        mimeType = 'application/json';
    } else if (format === 'rag_jsonl') {
        exportData = generatedRagJsonlExport;
        filename = `rag_content_${Date.now()}.jsonl`;
        mimeType = 'application/jsonl';
    } else if (format === 'txt') {
        exportData = generatedTextExport;
        filename = `content_${Date.now()}.txt`;
        mimeType = 'text/plain';
    }
    
    if (!exportData) {
        showError('No content selected for export');
        return;
    }
    
    // Create and trigger download
    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess(`✅ Downloaded ${filename}`);
}

function generateJSONExport() {
    const exportData = {};
    
    // Single page data
    if (currentData) {
        if (document.getElementById('check_source_url').checked) {
            exportData.source_url = currentData.final_url;
        }
        
        if (document.getElementById('check_title').checked && currentData.title) {
            exportData.title = currentData.title;
        }
        
        if (document.getElementById('check_meta_description').checked && currentData.meta_description) {
            exportData.meta_description = currentData.meta_description;
        }
        
        if (document.getElementById('check_main_content').checked && currentData.main_content) {
            exportData.main_content = currentData.main_content;
        }
        
        // Add selected link categories
        if (currentData.categorized_links) {
            const selectedLinks = {};
            ['content_internal', 'external', 'navigation', 'legal_or_contact'].forEach(category => {
                const checkbox = document.getElementById(`check_links_${category}`);
                if (checkbox && checkbox.checked) {
                    selectedLinks[category] = currentData.categorized_links[category] || [];
                }
            });
            
            if (Object.keys(selectedLinks).length > 0) {
                exportData.links = selectedLinks;
            }
        }
    }
    
    // Multi-page data from crawl
    if (currentCrawlData) {
        const selectedPages = [];
        document.querySelectorAll('.sitemap-checkbox:checked').forEach(checkbox => {
            const url = checkbox.dataset.url;
            const pageData = currentCrawlData.sitemap[url];
            if (pageData && pageData.success) {
                selectedPages.push({
                    url: pageData.final_url || url,
                    title: pageData.title,
                    meta_description: pageData.meta_description,
                    sections: pageData.sections || [],
                    links: pageData.categorized_links || {}
                });
            }
        });
        
        if (selectedPages.length > 0) {
            exportData.pages = selectedPages;
        }
    }
    
    return Object.keys(exportData).length > 0 ? JSON.stringify(exportData, null, 2) : null;
}

function generateRAGJSONLExport() {
    const chunkSize = parseInt(document.getElementById('chunkSize').value);
    const overlap = parseInt(document.getElementById('overlap').value);
    const includeHeadings = document.getElementById('includeHeadings').checked;
    
    return generateRAGJSONLExportData(chunkSize, overlap, includeHeadings);
}

function generateRAGJSONLExportData(chunkSize, overlap, includeHeadings) {
    
    const lines = [];
    
    // Process single page data
    if (currentData && document.getElementById('check_main_content').checked) {
        const chunks = chunkText(currentData.main_content, chunkSize, overlap);
        chunks.forEach((chunk, index) => {
            const metadata = {
                source: currentData.final_url,
                type: 'text',
                chunk_index: index
            };
            
            if (includeHeadings && currentData.headings) {
                metadata.headings = currentData.headings;
            }
            
            lines.push({
                id: generateChunkId(currentData.final_url, index, chunk),
                title: currentData.title || '',
                chunk: chunk,
                metadata: metadata
            });
        });
    }
    
    // Process multi-page data from crawl
    if (currentCrawlData) {
        document.querySelectorAll('.sitemap-checkbox:checked').forEach(checkbox => {
            const url = checkbox.dataset.url;
            const pageData = currentCrawlData.sitemap[url];
            
            if (pageData && pageData.success && pageData.sections) {
                pageData.sections.forEach(section => {
                    const chunks = chunkText(section.content_text, chunkSize, overlap);
                    chunks.forEach((chunk, chunkIndex) => {
                        const metadata = {
                            source: section.page_url,
                            type: section.content_type || 'text',
                            section_id: section.section_id,
                            heading: section.heading,
                            heading_level: section.heading_level,
                            volatility: section.volatility,
                            chunk_index: chunkIndex
                        };
                        
                        if (includeHeadings && section.breadcrumbs) {
                            metadata.breadcrumbs = section.breadcrumbs;
                        }
                        
                        lines.push({
                            id: `${section.section_id}_${chunkIndex}`,
                            title: section.page_title || '',
                            chunk: chunk,
                            metadata: metadata
                        });
                    });
                });
            }
        });
    }
    
    return lines.length > 0 ? lines.map(line => JSON.stringify(line)).join('\n') : null;
}

function generateTextExport() {
    let content = '';
    
    // Single page data
    if (currentData) {
        if (document.getElementById('check_title').checked && currentData.title) {
            content += `# ${currentData.title}\n\n`;
        }
        
        if (document.getElementById('check_source_url').checked) {
            content += `Source: ${currentData.final_url}\n\n`;
        }
        
        if (document.getElementById('check_meta_description').checked && currentData.meta_description) {
            content += `Description: ${currentData.meta_description}\n\n`;
        }
        
        if (document.getElementById('check_main_content').checked && currentData.main_content) {
            content += `## Content\n\n${currentData.main_content}\n\n`;
        }
    }
    
    // Multi-page data from crawl
    if (currentCrawlData) {
        const selectedPages = [];
        document.querySelectorAll('.sitemap-checkbox:checked').forEach(checkbox => {
            const url = checkbox.dataset.url;
            const pageData = currentCrawlData.sitemap[url];
            if (pageData && pageData.success) {
                selectedPages.push(pageData);
            }
        });
        
        selectedPages.forEach(page => {
            content += `\n# ${page.title || 'Untitled Page'}\n`;
            content += `Source: ${page.final_url || page.url}\n\n`;
            
            if (page.sections && page.sections.length > 0) {
                page.sections.forEach(section => {
                    content += `## ${section.heading}\n\n`;
                    content += `${section.content_text}\n\n`;
                });
            }
        });
    }
    
    return content.trim() || null;
}

function chunkText(text, chunkSize, overlap) {
    if (!text || !text.trim()) {
        return [];
    }
    
    const words = text.split(/\s+/);
    if (words.length <= chunkSize) {
        return [text];
    }
    
    const chunks = [];
    let start = 0;
    
    while (start < words.length) {
        const end = Math.min(start + chunkSize, words.length);
        const chunk = words.slice(start, end).join(' ');
        chunks.push(chunk);
        
        if (end >= words.length) {
            break;
        }
        
        start = end - overlap;
        if (start < 0) {
            start = 0;
        }
    }
    
    return chunks;
}

function generateChunkId(url, chunkIndex, chunkText) {
    const content = `${url}_${chunkIndex}_${chunkText.substring(0, 50)}`;
    return btoa(content).substring(0, 12);
}

function saveSessionData() {
    const sessionData = {
        currentData,
        currentCrawlData,
        currentJobId,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('urlInspectorSession', JSON.stringify(sessionData));
    } catch (error) {
        console.warn('Failed to save session data:', error);
    }
}

function restoreSessionIfExists() {
    try {
        const saved = localStorage.getItem('urlInspectorSession');
        if (saved) {
            const sessionData = JSON.parse(saved);
            
            // Check if session is recent (within 24 hours)
            const age = Date.now() - sessionData.timestamp;
            if (age < 24 * 60 * 60 * 1000) {
                showRestorationNotice();
                
                if (sessionData.currentData) {
                    currentData = sessionData.currentData;
                    displayResults(currentData);
                    urlInput.value = currentData.final_url || '';
                }
                
                if (sessionData.currentCrawlData) {
                    currentCrawlData = sessionData.currentCrawlData;
                    displayCrawlResults(currentCrawlData);
                    
                    // If crawl was complete, generate exports and show section
                    if (currentCrawlData.stats?.isComplete) {
                        generateAllExportFormats();
                        exportSection.classList.remove('hidden');
                    }
                }
                
                if (sessionData.currentJobId) {
                    currentJobId = sessionData.currentJobId;
                    jobIdInput.value = currentJobId;
                    currentJobIdSpan.textContent = currentJobId;
                    jobInfo.classList.remove('hidden');
                }
            }
        }
    } catch (error) {
        console.warn('Failed to restore session data:', error);
    }
}

function showRestorationNotice() {
    const notice = document.createElement('div');
    notice.className = 'restoration-notice';
    notice.innerHTML = `
        <div class="restoration-content">
            <span>🔄 Previous session restored</span>
            <button class="clear-session-btn" onclick="clearSession()">Clear Session</button>
        </div>
    `;
    
    document.querySelector('.container').insertBefore(notice, document.querySelector('.input-section'));
}

function clearSession() {
    localStorage.removeItem('urlInspectorSession');
    location.reload();
}

// Make clearSession available globally
window.clearSession = clearSession;