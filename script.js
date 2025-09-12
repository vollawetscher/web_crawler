class URLInspector {
    constructor() {
        this.extractedData = null;
        this.currentSitemap = null;
        this.currentJobId = null;
        this.isProcessing = false;
        this.progressPollingInterval = null;
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Main input elements
        this.urlInput = document.getElementById('urlInput');
        this.inspectBtn = document.getElementById('inspectBtn');
        this.manualHtml = document.getElementById('manualHtml');
        this.manualUrl = document.getElementById('manualUrl');
        this.parseManualBtn = document.getElementById('parseManualBtn');
        
        // Status elements
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        this.resultsSection = document.getElementById('resultsSection');
        
        // Export elements
        this.downloadBtn = document.getElementById('downloadBtn');
        this.ragOptions = document.getElementById('ragOptions');
        this.exportInfo = document.getElementById('exportInfo');
        
        // Crawling elements
        this.sitemapSection = document.getElementById('sitemapSection');
        this.crawlBtn = document.getElementById('crawlBtn');
        this.resumeCrawlBtn = document.getElementById('resumeCrawlBtn');
        this.crawlStatus = document.getElementById('crawlStatus');
        this.crawlStatusText = document.getElementById('crawlStatusText');
        this.sitemapContainer = document.getElementById('sitemapContainer');
        this.sitemapTree = document.getElementById('sitemapTree');
        this.selectAllBtn = document.getElementById('selectAllBtn');
        this.selectNoneBtn = document.getElementById('selectNoneBtn');
        this.selectionCount = document.getElementById('selectionCount');
        this.batchInfo = document.getElementById('batchInfo');
        this.currentJobIdSpan = document.getElementById('currentJobId');
        this.crawlProgressStatus = document.getElementById('crawlProgressStatus');
        
        // Form inputs
        this.jobIdInput = document.getElementById('jobId');
        this.maxDepthSelect = document.getElementById('maxDepth');
        this.maxPagesInput = document.getElementById('maxPages');
        this.pagesPerBatchInput = document.getElementById('pagesPerBatch');
        this.chunkSizeInput = document.getElementById('chunkSize');
        this.overlapInput = document.getElementById('overlap');
        this.includeHeadingsCheckbox = document.getElementById('includeHeadings');
    }

    attachEventListeners() {
        // Main inspection
        this.inspectBtn.addEventListener('click', () => this.inspectURL());
        this.parseManualBtn.addEventListener('click', () => this.parseManualHTML());
        
        // Export format change
        document.querySelectorAll('input[name="export_format"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleFormatChange());
        });
        
        // Download
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        
        // Crawling
        this.crawlBtn.addEventListener('click', () => this.startCrawl());
        this.resumeCrawlBtn.addEventListener('click', () => this.resumeCrawl());
        
        // Sitemap selection
        this.selectAllBtn.addEventListener('click', () => this.selectAllPages());
        this.selectNoneBtn.addEventListener('click', () => this.selectNoPages());
        
        // Enter key support
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.inspectURL();
        });
    }

    async inspectURL() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }

        this.showLoading();
        
        try {
            const response = await fetch('/api/inspect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (data.error) {
                this.showError(data.error);
                return;
            }
            
            this.extractedData = data;
            this.showSuccess(`Content extracted from: ${data.final_url}`);
            this.populateResults();
            
        } catch (error) {
            this.showError(`Inspection failed: ${error.message}`);
        }
    }

    parseManualHTML() {
        const html = this.manualHtml.value.trim();
        const url = this.manualUrl.value.trim() || 'http://example.com';
        
        if (!html) {
            this.showError('Please paste HTML content');
            return;
        }

        this.showLoading();
        
        try {
            // Parse HTML using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract basic data
            const title = doc.querySelector('title')?.textContent?.trim() || '';
            const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            
            // Extract headings
            const headings = {
                h1: Array.from(doc.querySelectorAll('h1')).map(h => h.textContent.trim()).filter(Boolean),
                h2: Array.from(doc.querySelectorAll('h2')).map(h => h.textContent.trim()).filter(Boolean),
                h3: Array.from(doc.querySelectorAll('h3')).map(h => h.textContent.trim()).filter(Boolean)
            };
            
            // Extract main content (simplified)
            const bodyText = doc.body ? doc.body.textContent : '';
            const mainContent = bodyText.replace(/\s+/g, ' ').trim();
            
            // Extract links
            const links = Array.from(doc.querySelectorAll('a[href]'))
                .map(a => ({
                    text: a.textContent.trim(),
                    url: a.href
                }))
                .filter(link => link.text && link.url)
                .slice(0, 200);
            
            this.extractedData = {
                success: true,
                final_url: url,
                title,
                meta_description: metaDesc,
                headings,
                main_content: mainContent,
                links
            };
            
            this.showSuccess('HTML content parsed successfully');
            this.populateResults();
            
        } catch (error) {
            this.showError(`HTML parsing failed: ${error.message}`);
        }
    }

    async startCrawl() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showError('Please enter a URL to crawl');
            return;
        }

        const maxDepth = parseInt(this.maxDepthSelect.value);
        const maxPages = parseInt(this.maxPagesInput.value);
        const pagesPerBatch = parseInt(this.pagesPerBatchInput.value);
        const jobId = this.jobIdInput.value.trim();

        this.showCrawlStatus(true);
        this.crawlBtn.disabled = true;
        
        try {
            const response = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    maxDepth,
                    maxPages,
                    pagesPerBatch,
                    jobId: jobId || undefined
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                this.showCrawlStatus(false, '');
                this.crawlBtn.disabled = false;
                this.showError(`Crawling failed: ${data.error}`);
                return;
            }
            
            this.currentSitemap = data.sitemap;
            this.currentJobId = data.jobId;
            this.updateCrawlInfo(data);
            this.populateSitemap();
            
            if (!data.isComplete) {
                this.showResumeOption('Continue Crawl');
            }
            
        } catch (error) {
            this.showCrawlStatus(false);
            this.crawlBtn.disabled = false;
            this.showError(`Crawling failed: ${error.message}`);
        }
        
        this.showCrawlStatus(false);
        this.crawlBtn.disabled = false;
    }

    async resumeCrawl() {
        // Use current job ID if available, otherwise check input field
        const jobId = this.currentJobId || this.jobIdInput.value.trim();
        
        if (!jobId) {
            this.showError('Please enter a Job ID to resume or start a new crawl first');
            return;
        }

        const pagesPerBatch = parseInt(this.pagesPerBatchInput.value);

        // Clear the previous sitemap display
        this.clearSitemapDisplay();
        
        this.showCrawlStatus(true, 'Resuming crawl...');
        this.resumeCrawlBtn.disabled = true;
        
        try {
            const response = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: jobId,
                    pagesPerBatch
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                this.showCrawlStatus(false);
                this.resumeCrawlBtn.disabled = false;
                this.showError(`Resume failed: ${data.error}`);
                return;
            }
            
            this.currentSitemap = data.sitemap;
            this.currentJobId = data.jobId; // Update current job ID
            this.saveStateToStorage(); // Save current state
            this.updateCrawlInfo(data);
            this.populateSitemap();
            
            if (data.isComplete) {
                this.hideResumeOption();
            }
            
        } catch (error) {
            this.showCrawlStatus(false);
            this.resumeCrawlBtn.disabled = false;
            this.showError(`Resume failed: ${error.message}`);
        }
        
        this.showCrawlStatus(false);
        this.resumeCrawlBtn.disabled = false;
    }

    populateResults() {
        this.hideMessages();
        this.resultsSection.classList.remove('hidden');
        
        // Update basic information checkboxes
        document.getElementById('check_title').checked = !!this.extractedData.title;
        document.getElementById('check_meta_description').checked = !!this.extractedData.meta_description;
        
        // Update basic previews
        this.updateBasicPreviews();
        
        // Update headings
        this.updateHeadingsPreviews();
        
        // Update main content
        this.updateMainContentPreview();
        
        // Update links
        this.updateLinksPreview();
        
        // Show sitemap section for crawling
        this.sitemapSection.classList.remove('hidden');
        
        // Update export info
        this.updateExportInfo();
    }

    updateBasicPreviews() {
        const container = document.getElementById('basicPreviews');
        container.innerHTML = '';
        
        if (this.extractedData.title) {
            this.addPreview(container, 'Title', this.extractedData.title);
        }
        
        if (this.extractedData.meta_description) {
            this.addPreview(container, 'Meta Description', this.extractedData.meta_description);
        }
    }

    updateHeadingsPreviews() {
        const sections = this.extractedData.sections || [];
        
        // Extract unique headings from sections and group by level
        const headings = { h1: [], h2: [], h3: [] };
        const seenHeadings = new Set();
        
        sections.forEach(section => {
            const key = `${section.heading_level}-${section.heading}`;
            if (!seenHeadings.has(key)) {
                seenHeadings.add(key);
                if (section.heading_level === 'h1') {
                    headings.h1.push(section.heading);
                } else if (section.heading_level === 'h2') {
                    headings.h2.push(section.heading);
                } else if (section.heading_level === 'h3') {
                    headings.h3.push(section.heading);
                }
            }
        });
        
        const hasHeadings = Object.values(headings).some(arr => arr.length > 0);
        
        const expander = document.getElementById('headingsExpander');
        if (!hasHeadings) {
            expander.style.display = 'none';
            return;
        }
        
        expander.style.display = 'block';
        
        // Update labels
        document.getElementById('h1Label').textContent = `H1 (${headings.h1?.length || 0})`;
        document.getElementById('h2Label').textContent = `H2 (${headings.h2?.length || 0})`;
        document.getElementById('h3Label').textContent = `H3 (${headings.h3?.length || 0})`;
        
        // Update checkboxes
        document.getElementById('check_h1').checked = !!(headings.h1?.length);
        document.getElementById('check_h2').checked = !!(headings.h2?.length);
        document.getElementById('check_h3').checked = !!(headings.h3?.length);
        
        // Update previews
        const container = document.getElementById('headingPreviews');
        container.innerHTML = '';
        
        ['h1', 'h2', 'h3'].forEach(level => {
            if (headings[level]?.length) {
                const preview = headings[level].slice(0, 5).join(', ');
                this.addPreview(container, `${level.toUpperCase()} Preview`, preview);
            }
        });
    }

    updateMainContentPreview() {
        const sections = this.extractedData.sections || [];
        const expander = document.getElementById('contentExpander');
        
        if (sections.length === 0) {
            expander.style.display = 'none';
            return;
        }
        
        expander.style.display = 'block';
        
        // Enable main content checkbox if there are sections
        document.getElementById('check_main_content').checked = sections.length > 0;
        
        const container = document.getElementById('contentPreview');
        container.innerHTML = '';
        
        // Show preview of first few sections
        const previewSections = sections.slice(0, 3);
        previewSections.forEach((section, index) => {
            const preview = section.content_text.substring(0, 200) + (section.content_text.length > 200 ? '...' : '');
            this.addPreview(container, `Section ${index + 1}: ${section.heading}`, preview);
        });
        
        if (sections.length > 3) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'preview-item';
            moreDiv.innerHTML = `<div class="preview-label">... and ${sections.length - 3} more sections</div>`;
            container.appendChild(moreDiv);
        }
    }
    
    updateLinksPreview() {
        const categorizedLinks = this.extractedData.categorized_links || {};
        const expander = document.getElementById('linksExpander');
        
        const totalLinks = Object.values(categorizedLinks).reduce((sum, links) => sum + links.length, 0);
        
        if (totalLinks === 0) {
            expander.style.display = 'none';
            return;
        }
        
        expander.style.display = 'block';
        
        // Update labels with counts
        document.getElementById('linksContentInternalLabel').textContent = 
            `Content Links (${categorizedLinks.content_internal?.length || 0})`;
        document.getElementById('linksExternalLabel').textContent = 
            `External Links (${categorizedLinks.external?.length || 0})`;
        document.getElementById('linksNavigationLabel').textContent = 
            `Navigation Links (${categorizedLinks.navigation?.length || 0})`;
        document.getElementById('linksLegalContactLabel').textContent = 
            `Legal/Contact Links (${categorizedLinks.legal_or_contact?.length || 0})`;
        
        // Set default checkboxes (only content links checked by default)
        document.getElementById('check_links_content_internal').checked = (categorizedLinks.content_internal?.length || 0) > 0;
        document.getElementById('check_links_external').checked = false;
        document.getElementById('check_links_navigation').checked = false;
        document.getElementById('check_links_legal_or_contact').checked = false;
        
        const container = document.getElementById('linksPreview');
        container.innerHTML = '';
        
        // Show preview for each category
        Object.keys(categorizedLinks).forEach(category => {
            const links = categorizedLinks[category] || [];
            if (links.length === 0) return;
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'preview-item';
            
            const categoryLabel = document.createElement('div');
            categoryLabel.className = 'preview-label';
            const categoryNames = {
                content_internal: 'Content Links',
                external: 'External Links', 
                navigation: 'Navigation Links',
                legal_or_contact: 'Legal/Contact Links'
            };
            categoryLabel.textContent = `${categoryNames[category]}:`;
            
            const previewDiv = document.createElement('div');
            previewDiv.className = 'preview-list';
            
            const ul = document.createElement('ul');
            links.slice(0, 5).forEach(link => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = link.url;
                a.textContent = link.text;
                a.target = '_blank';
                li.appendChild(a);
                ul.appendChild(li);
            });
            
            previewDiv.appendChild(ul);
            
            if (links.length > 5) {
                const more = document.createElement('p');
                more.textContent = `... and ${links.length - 5} more links`;
                previewDiv.appendChild(more);
            }
            
            categoryDiv.appendChild(categoryLabel);
            categoryDiv.appendChild(previewDiv);
            container.appendChild(categoryDiv);
        });
    }

    addPreview(container, label, content) {
        const item = document.createElement('div');
        item.className = 'preview-item';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'preview-label';
        labelEl.textContent = label + ':';
        
        const contentEl = document.createElement('div');
        contentEl.className = 'preview-content';
        contentEl.textContent = content;
        
        item.appendChild(labelEl);
        item.appendChild(contentEl);
        container.appendChild(item);
    }

    showCrawlStatus(show, message = '', currentUrl = '') {
        this.crawlStatus.classList.toggle('hidden', !show);
        if (show) {
            // Update status message
            this.crawlStatusText.textContent = message;
            
            // Show current URL if provided
            let statusHtml = `<span>${message}</span>`;
            if (currentUrl) {
                statusHtml += `<br><small>Currently processing: <strong>${currentUrl}</strong></small>`;
            }
            this.crawlStatusText.innerHTML = statusHtml;
            
            // Show progress indicator instead of spinner
            const spinner = this.crawlStatus.querySelector('.spinner');
            if (spinner) {
                spinner.style.display = currentUrl ? 'none' : 'block';
            }
        }
    }

    updateCrawlInfo(data) {
        this.currentJobIdSpan.textContent = data.jobId;
        this.crawlProgressStatus.textContent = data.isComplete ? 'Complete' : 'Ready to Continue';
        this.batchInfo.classList.remove('hidden');
        
        // Show stats
        const totalPages = Object.keys(data.sitemap || {}).length;
        const successfulPages = Object.values(data.sitemap || {}).filter(page => page.success).length;
        
        // Update job info display
        const batchInfoElement = this.batchInfo;
        const existingStats = batchInfoElement.querySelector('.batch-stats');
        if (existingStats) {
            existingStats.remove();
        }
        
        const statsDiv = document.createElement('div');
        statsDiv.className = 'batch-stats';
        statsDiv.innerHTML = `
            <p><strong>Pages Crawled:</strong> ${totalPages} | <strong>Successful:</strong> ${successfulPages}</p>
        `;
        batchInfoElement.appendChild(statsDiv);
    }

    showResumeOption(buttonText = '▶️ Resume Crawl') {
        this.resumeCrawlBtn.classList.remove('hidden');
        this.resumeCrawlBtn.textContent = buttonText;
    }

    hideResumeOption() {
        this.resumeCrawlBtn.classList.add('hidden');
    }

    clearSitemapDisplay() {
        this.sitemapTree.innerHTML = '';
        this.sitemapContainer.classList.add('hidden');
        this.selectionCount.textContent = '0 pages selected';
        
        // Clear crawl summary
        const summary = document.getElementById('crawlSummary');
        if (summary) {
            summary.innerHTML = '';
        }
    }

    populateSitemap() {
        if (!this.currentSitemap) return;
        
        const urls = Object.keys(this.currentSitemap);
        
        // Update summary
        const summary = document.getElementById('crawlSummary');
        summary.innerHTML = `
            <div class="crawl-stats">
                <div class="stat-item">
                    <span class="stat-value">${urls.length}</span>
                    <span class="stat-label">Pages Found</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${urls.filter(url => this.currentSitemap[url].success).length}</span>
                    <span class="stat-label">Successfully Crawled</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${urls.filter(url => this.currentSitemap[url].error).length}</span>
                    <span class="stat-label">Errors</span>
                </div>
            </div>
        `;
        
        // Build tree structure
        this.sitemapTree.innerHTML = '';
        
        urls.forEach(url => {
            const data = this.currentSitemap[url];
            const node = this.createSitemapNode(url, data);
            this.sitemapTree.appendChild(node);
        });
        
        this.sitemapContainer.classList.remove('hidden');
        this.updateSelectionCount();
    }

    createSitemapNode(url, data) {
        const node = document.createElement('div');
        node.className = `sitemap-node depth-${data.depth || 0}`;
        
        const item = document.createElement('div');
        item.className = `sitemap-item ${data.error ? 'error' : ''}`;
        
        // Create checkboxes container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'sitemap-checkboxes';
        
        // Export selection checkbox (existing)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sitemap-checkbox';
        checkbox.value = url;
        checkbox.addEventListener('change', () => this.updateSelectionCount());
        
        // Relevance checkbox (new)
        const relevanceCheckbox = document.createElement('input');
        relevanceCheckbox.type = 'checkbox';
        relevanceCheckbox.className = 'sitemap-relevance-checkbox';
        relevanceCheckbox.value = url;
        relevanceCheckbox.checked = data.is_relevant !== undefined ? data.is_relevant : true;
        relevanceCheckbox.addEventListener('change', (e) => {
            // Update the relevance status in the current sitemap
            if (this.currentSitemap && this.currentSitemap[url]) {
                this.currentSitemap[url].is_relevant = e.target.checked;
                
                // Update visual styling of the item
                item.classList.toggle('irrelevant', !e.target.checked);
                
                // If marked as irrelevant, uncheck the export selection
                if (!e.target.checked) {
                    checkbox.checked = false;
                }
                
                this.updateSelectionCount();
            }
        });
        
        // Add labels for clarity
        const exportLabel = document.createElement('label');
        exportLabel.className = 'checkbox-label export-label';
        exportLabel.textContent = 'Export';
        exportLabel.title = 'Select for export';
        
        const relevanceLabel = document.createElement('label');
        relevanceLabel.className = 'checkbox-label relevance-label';
        relevanceLabel.textContent = 'Relevant';
        relevanceLabel.title = 'Mark as relevant content';
        
        checkboxContainer.appendChild(relevanceCheckbox);
        checkboxContainer.appendChild(relevanceLabel);
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(exportLabel);
        
        const content = document.createElement('div');
        content.className = 'sitemap-content';
        
        const title = document.createElement('div');
        title.className = 'sitemap-title';
        title.textContent = data.title || 'Untitled';
        
        const urlLink = document.createElement('a');
        urlLink.className = 'sitemap-url';
        urlLink.href = url;
        urlLink.target = '_blank';
        urlLink.textContent = url;
        
        const meta = document.createElement('div');
        meta.className = 'sitemap-meta';
        meta.innerHTML = `
            <span>Depth: ${data.depth}</span>
            <span>Content: ${data.main_content ? Math.round(data.main_content.length / 100) * 100 : 0} chars</span>
        `;
        
        content.appendChild(title);
        content.appendChild(urlLink);
        content.appendChild(meta);
        
        if (data.error) {
            const error = document.createElement('div');
            error.className = 'sitemap-error';
            error.textContent = data.error;
            content.appendChild(error);
        }
        
        // Set initial visual state based on relevance
        if (data.is_relevant === false) {
            item.classList.add('irrelevant');
        }
        
        item.appendChild(checkboxContainer);
        item.appendChild(content);
        node.appendChild(item);
        
        return node;
    }

    selectAllPages() {
        const checkboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox');
        checkboxes.forEach(cb => {
            const data = this.currentSitemap[cb.value];
            // Only select pages that are relevant and don't have errors
            cb.checked = !data.error && data.is_relevant !== false;
        });
        this.updateSelectionCount();
    }

    selectNoPages() {
        const checkboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const exportCheckboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox:checked');
        const relevantCheckboxes = this.sitemapTree.querySelectorAll('.sitemap-relevance-checkbox:checked');
        
        this.selectionCount.innerHTML = `
            <span class="selection-stat">${exportCheckboxes.length} pages selected for export</span>
            <span class="relevance-stat">${relevantCheckboxes.length} pages marked as relevant</span>
        `;
    }

    handleFormatChange() {
        const format = document.querySelector('input[name="export_format"]:checked').value;
        this.ragOptions.classList.toggle('hidden', format !== 'rag_jsonl');
        this.updateExportInfo();
    }

    updateExportInfo() {
        const format = document.querySelector('input[name="export_format"]:checked').value;
        const selectedPages = this.getSelectedPages();
        const totalPages = selectedPages.length;
        const totalSections = selectedPages.reduce((sum, page) => sum + (page.data.sections?.length || 1), 0);
        
        let info = '';
        if (totalPages > 0) {
            info = `Ready to export ${totalSections} sections from ${totalPages} page(s) in ${format.toUpperCase()} format`;
        } else if (this.extractedData) {
            const currentSections = this.extractedData.sections?.length || 1;
            info = `Ready to export ${currentSections} sections from current page in ${format.toUpperCase()} format`;
        } else {
            info = 'No content available for export';
        }
        
        this.exportInfo.textContent = info;
    }

    getSelectedPages() {
        const checkboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox:checked');
        return Array.from(checkboxes)
            .filter(cb => {
                const data = this.currentSitemap[cb.value];
                // Only include pages that are marked as relevant
                return data.is_relevant !== false;
            })
            .map(cb => ({
                url: cb.value,
                data: this.currentSitemap[cb.value]
            }));
    }

    async handleDownload() {
        const format = document.querySelector('input[name="export_format"]:checked').value;
        const selectedPages = this.getSelectedPages();
        
        let exportData, filename, mimeType;
        
        if (selectedPages.length > 0) {
            // Multi-page export
            const combinedData = this.combinePageData(selectedPages);
            [exportData, filename, mimeType] = this.createExport(format, combinedData, true);
        } else if (this.extractedData) {
            // Single page export
            [exportData, filename, mimeType] = this.createExport(format, this.extractedData, false);
        } else {
            this.showError('No content available for export');
            return;
        }
        
        this.downloadFile(exportData, filename, mimeType);
    }

    combinePageData(selectedPages) {
        const combined = {
            success: true,
            pages: selectedPages.length,
            urls: selectedPages.map(p => p.url),
            title: `Combined Export (${selectedPages.length} pages)`,
            meta_description: '',
            sections: [],
            categorized_links: {
                content_internal: [],
                external: [],
                navigation: [],
                legal_or_contact: []
            }
        };
        
        selectedPages.forEach(({ url, data }) => {
            if (data.success) {
                // Combine sections
                if (data.sections) {
                    combined.sections.push(...data.sections);
                }
                
                // Combine categorized links
                if (data.categorized_links) {
                    Object.keys(data.categorized_links).forEach(category => {
                        if (combined.categorized_links[category] && data.categorized_links[category]) {
                            combined.categorized_links[category].push(...data.categorized_links[category]);
                        }
                    });
                }
            }
        });
        
        // Remove duplicate links from each category
        Object.keys(combined.categorized_links).forEach(category => {
            const linkUrls = new Set();
            combined.categorized_links[category] = combined.categorized_links[category].filter(link => {
                if (linkUrls.has(link.url)) return false;
                linkUrls.add(link.url);
                return true;
            });
        });
        
        return combined;
    }

    createExport(format, data, isMultiPage) {
        const timestamp = Math.floor(Date.now() / 1000);
        
        switch (format) {
            case 'json':
                return this.createJSONExport(data, timestamp, isMultiPage);
            case 'rag_jsonl':
                return this.createRAGJSONLExport(data, timestamp, isMultiPage);
            case 'txt':
                return this.createTextExport(data, timestamp, isMultiPage);
            default:
                throw new Error('Unknown export format');
        }
    }

    createJSONExport(data, timestamp, isMultiPage) {
        const exportData = {
            ...this.getSelectedContent(data),
            _metadata: this.getExportMetadata(data, isMultiPage, 'json')
        };
        const jsonStr = JSON.stringify(exportData, null, 2);
        const filename = `${isMultiPage ? 'multi_page' : 'url'}_content_${timestamp}.json`;
        return [jsonStr, filename, 'application/json'];
    }

    createRAGJSONLExport(data, timestamp, isMultiPage) {
        const jsonlStr = this.createRAGJSONL(data);
        
        // Add metadata as first line for JSONL files
        const metadata = {
            _metadata: this.getExportMetadata(data, isMultiPage, 'rag_jsonl')
        };
        const metadataLine = JSON.stringify(metadata);
        const finalJsonl = metadataLine + '\n' + jsonlStr;
        
        const filename = `${isMultiPage ? 'multi_page' : 'rag'}_content_${timestamp}.jsonl`;
        return [finalJsonl, filename, 'application/jsonl'];
    }

    createTextExport(data, timestamp, isMultiPage) {
        const metadata = this.getExportMetadata(data, isMultiPage, 'txt');
        let textStr = this.formatMetadataAsText(metadata);
        
        const sections = data.sections || [];
        
        if (data.title) textStr += `Title: ${data.title}\n\n`;
        if (data.meta_description) textStr += `Description: ${data.meta_description}\n\n`;
        
        // Add sections
        sections.forEach((section, index) => {
            textStr += `Section ${index + 1}: ${section.heading}\n`;
            textStr += `${section.content_text}\n\n`;
        });
        
        if (data.links?.length) {
            textStr += `Links:\n${data.links.map(l => `${l.text}: ${l.url}`).join('\n')}\n\n`;
        }
        
        const filename = `${isMultiPage ? 'multi_page' : 'url'}_content_${timestamp}.txt`;
        return [textStr, filename, 'text/plain'];
    }

    getExportMetadata(data, isMultiPage, format) {
        const selectedPages = this.getSelectedPages();
        
        return {
            export_info: {
                format: format,
                timestamp: new Date().toISOString(),
                is_multi_page: isMultiPage,
                pages_exported: isMultiPage ? selectedPages.length : 1,
                total_sections: data.sections ? data.sections.length : 0
            },
            crawl_info: this.currentJobId ? {
                job_id: this.currentJobId,
                start_url: this.extractedData?.final_url || data.final_url || data.urls?.[0],
                max_depth: parseInt(this.maxDepthSelect?.value) || 'unknown',
                max_pages: parseInt(this.maxPagesInput?.value) || 'unknown',
                pages_crawled: this.currentSitemap ? Object.keys(this.currentSitemap).length : 1
            } : {
                single_page_inspection: true,
                url: data.final_url || data.urls?.[0] || 'unknown'
            },
            selection_criteria: {
                include_title: document.getElementById('check_title')?.checked || false,
                include_meta_description: document.getElementById('check_meta_description')?.checked || false,
                include_h1: document.getElementById('check_h1')?.checked || false,
                include_h2: document.getElementById('check_h2')?.checked || false,
                include_h3: document.getElementById('check_h3')?.checked || false,
                include_main_content: document.getElementById('check_main_content')?.checked || false,
                include_content_internal_links: document.getElementById('check_links_content_internal')?.checked || false,
                include_external_links: document.getElementById('check_links_external')?.checked || false,
                include_navigation_links: document.getElementById('check_links_navigation')?.checked || false,
                include_legal_contact_links: document.getElementById('check_links_legal_or_contact')?.checked || false,
                selected_pages: isMultiPage ? selectedPages.map(p => ({
                    url: p.url,
                    title: p.data.title || 'Untitled',
                    sections: p.data.sections?.length || 0,
                    content_length: p.data.main_content?.length || 0
                })) : []
            },
            format_options: format === 'rag_jsonl' ? {
                chunk_size: parseInt(this.chunkSizeInput?.value) || 300,
                overlap: parseInt(this.overlapInput?.value) || 50,
                include_headings_in_metadata: this.includeHeadingsCheckbox?.checked || false
            } : {}
        };
    }

    formatMetadataAsText(metadata) {
        let text = "=== EXPORT METADATA ===\n\n";
        
        text += `Export Format: ${metadata.export_info.format.toUpperCase()}\n`;
        text += `Export Date: ${new Date(metadata.export_info.timestamp).toLocaleString()}\n`;
        text += `Multi-page Export: ${metadata.export_info.is_multi_page ? 'Yes' : 'No'}\n`;
        text += `Pages Exported: ${metadata.export_info.pages_exported}\n`;
        text += `Total Sections: ${metadata.export_info.total_sections}\n\n`;
        
        if (metadata.crawl_info.single_page_inspection) {
            text += `Single Page URL: ${metadata.crawl_info.url}\n\n`;
        } else {
            text += `Crawl Job ID: ${metadata.crawl_info.job_id}\n`;
            text += `Start URL: ${metadata.crawl_info.start_url}\n`;
            text += `Max Depth: ${metadata.crawl_info.max_depth}\n`;
            text += `Max Pages: ${metadata.crawl_info.max_pages}\n`;
            text += `Pages Crawled: ${metadata.crawl_info.pages_crawled}\n\n`;
        }
        
        text += "Selected Content Types:\n";
        const selections = metadata.selection_criteria;
        if (selections.include_title) text += "✓ Title\n";
        if (selections.include_meta_description) text += "✓ Meta Description\n";
        if (selections.include_h1) text += "✓ H1 Headings\n";
        if (selections.include_h2) text += "✓ H2 Headings\n";
        if (selections.include_h3) text += "✓ H3 Headings\n";
        if (selections.include_main_content) text += "✓ Main Content\n";
        if (selections.include_content_internal_links) text += "✓ Content Links\n";
        if (selections.include_external_links) text += "✓ External Links\n";
        if (selections.include_navigation_links) text += "✓ Navigation Links\n";
        if (selections.include_legal_contact_links) text += "✓ Legal/Contact Links\n";
        
        if (selections.selected_pages && selections.selected_pages.length > 0) {
            text += "\nSelected Pages:\n";
            selections.selected_pages.forEach((page, index) => {
                text += `${index + 1}. ${page.title}\n`;
                text += `   URL: ${page.url}\n`;
                text += `   Sections: ${page.sections}, Content: ${page.content_length} chars\n`;
            });
        }
        
        if (metadata.format_options.chunk_size) {
            text += `\nRAG Options:\n`;
            text += `Chunk Size: ${metadata.format_options.chunk_size} words\n`;
            text += `Overlap: ${metadata.format_options.overlap} words\n`;
            text += `Include Headings: ${metadata.format_options.include_headings_in_metadata ? 'Yes' : 'No'}\n`;
        }
        
        text += "\n" + "=".repeat(50) + "\n\n";
        
        return text;
    }

    getSelectedContent(data) {
        const result = {};
        
        // Check if we're in multi-page mode or single-page mode
        const selectedPages = this.getSelectedPages();
        const isMultiPage = selectedPages.length > 0;
        
        if (document.getElementById('check_source_url')?.checked !== false) {
            result.source_url = data.final_url || data.urls;
        }
        
        if (document.getElementById('check_title')?.checked !== false && data.title) {
            result.title = data.title;
        }
        
        if (document.getElementById('check_meta_description')?.checked !== false && data.meta_description) {
            result.meta_description = data.meta_description;
        }
        
        // For headings - only include if explicitly checked
        const headings = {};
        if (document.getElementById('check_h1')?.checked) {
            headings.h1 = this.extractHeadingsFromSections(data.sections, 'h1');
        }
        if (document.getElementById('check_h2')?.checked) {
            headings.h2 = this.extractHeadingsFromSections(data.sections, 'h2');
        }
        if (document.getElementById('check_h3')?.checked) {
            headings.h3 = this.extractHeadingsFromSections(data.sections, 'h3');
        }
        
        if (Object.keys(headings).length > 0) {
            result.headings = headings;
        }
        
        // Include sections if main content is checked
        if (document.getElementById('check_main_content')?.checked !== false && data.sections) {
            result.sections = data.sections;
        }
        
        // Handle categorized links - only include selected categories
        const categorizedLinks = data.categorized_links || {};
        const selectedLinks = [];
        
        // Check each category checkbox and include only selected categories
        if (document.getElementById('check_links_content_internal')?.checked && categorizedLinks.content_internal) {
            selectedLinks.push(...categorizedLinks.content_internal);
        }
        if (document.getElementById('check_links_external')?.checked && categorizedLinks.external) {
            selectedLinks.push(...categorizedLinks.external);
        }
        if (document.getElementById('check_links_navigation')?.checked && categorizedLinks.navigation) {
            selectedLinks.push(...categorizedLinks.navigation);
        }
        if (document.getElementById('check_links_legal_or_contact')?.checked && categorizedLinks.legal_or_contact) {
            selectedLinks.push(...categorizedLinks.legal_or_contact);
        }
        
        // Only add links to result if some were selected
        if (selectedLinks.length > 0) {
            result.links = selectedLinks;
        }
        
        return result;
    }

    extractHeadingsFromSections(sections, level) {
        if (!sections) return [];
        
        const headings = [];
        const seenHeadings = new Set();
        
        sections.forEach(section => {
            if (section.heading_level === level && section.heading) {
                const heading = section.heading.trim();
                if (!seenHeadings.has(heading)) {
                    seenHeadings.add(heading);
                    headings.push(heading);
                }
            }
        });
        
        return headings;
    }

    createRAGJSONL(data) {
        const lines = [];
        const sections = data.sections || [];
        const title = data.title || '';
        const baseUrl = data.final_url || data.urls?.[0] || 'unknown';
        
        // Add title
        if (document.getElementById('check_title')?.checked && title && sections.length === 0) {
            lines.push({
                id: this.generateChunkId(baseUrl, 0, title),
                title,
                chunk: title,
                metadata: { 
                    source: baseUrl, 
                    type: 'title',
                    content_type: 'general',
                    volatility: 'stable'
                }
            });
        }
        
        // Add meta description
        if (document.getElementById('check_meta_description')?.checked && data.meta_description && sections.length === 0) {
            lines.push({
                id: this.generateChunkId(baseUrl, 1, data.meta_description),
                title,
                chunk: data.meta_description,
                metadata: { 
                    source: baseUrl, 
                    type: 'description',
                    content_type: 'general',
                    volatility: 'stable'
                }
            });
        }
        
        // Add sections directly (no chunking needed - they're already properly sized)
        if (document.getElementById('check_main_content')?.checked && sections.length > 0) {
            sections.forEach(section => {
                // Filter out sections that are mostly boilerplate
                if (this.isBoilerplateSection(section)) {
                    return; // Skip this section
                }
                
                lines.push({
                    id: section.section_id,
                    title,
                    chunk: section.content_text,
                    metadata: {
                        source: section.page_url,
                        type: 'section',
                        section_order: section.section_order,
                        heading: section.heading,
                        heading_level: section.heading_level,
                        content_type: section.content_type,
                        volatility: section.volatility,
                        breadcrumbs: section.breadcrumbs || [],
                        last_modified: section.last_modified,
                        extracted_contacts: section.extracted_contacts || [],
                        extracted_dates: section.extracted_dates || [],
                        extracted_links: section.extracted_links || [],
                        hash: section.hash,
                        has_changed: section.has_changed,
                        last_seen: section.last_seen
                    }
                });
            });
        }
        
        return lines.map(line => JSON.stringify(line)).join('\n');
    }

    isBoilerplateSection(section) {
        if (!section.content_text) return true;
        
        const content = section.content_text.toLowerCase();
        const heading = section.heading.toLowerCase();
        
        // Skip sections that are primarily boilerplate
        const boilerplateIndicators = [
            'cookie-einstellungen',
            'copyrightinformationen', 
            'cookie',
            'datenschutz',
            'matomo',
            'piwik',
            'opt-out-cookie',
            'browser',
            'sitzungscookie',
            'asp.net_sessionid',
            '__requestverificationtoken'
        ];
        
        // Check if heading contains boilerplate terms
        if (boilerplateIndicators.some(term => heading.includes(term))) {
            return true;
        }
        
        // Check if content is primarily boilerplate (more than 50% boilerplate terms)
        const boilerplateMatches = boilerplateIndicators.filter(term => content.includes(term)).length;
        if (boilerplateMatches >= 3) {
            return true;
        }
        
        // Skip sections that are too short or mostly symbols
        if (section.content_text.length < 100) {
            return true;
        }
        
        return false;
    }

    chunkText(text, chunkSize, overlap) {
        if (!text?.trim()) return [];
        
        const words = text.split(/\s+/);
        if (words.length <= chunkSize) return [text];
        
        const chunks = [];
        let start = 0;
        
        while (start < words.length) {
            const end = Math.min(start + chunkSize, words.length);
            const chunk = words.slice(start, end).join(' ');
            chunks.push(chunk);
            
            if (end >= words.length) break;
            start = Math.max(0, end - overlap);
        }
        
        return chunks;
    }

    generateChunkId(url, chunkIndex, chunkText) {
        const content = `${url}_${chunkIndex}_${chunkText.substring(0, 50)}`;
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 12);
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    showLoading() {
        this.hideMessages();
        this.loadingIndicator.classList.remove('hidden');
        // Ensure crawl status is hidden when showing main loading
        this.showCrawlStatus(false);
        this.inspectBtn.disabled = true;
        this.parseManualBtn.disabled = true;
    }

    hideLoading() {
        this.loadingIndicator.classList.add('hidden');
        this.inspectBtn.disabled = false;
        this.parseManualBtn.disabled = false;
    }

    showError(message) {
        this.hideLoading();
        this.errorMessage.textContent = `❌ ${message}`;
        this.errorMessage.classList.remove('hidden');
        this.successMessage.classList.add('hidden');
    }

    showSuccess(message) {
        this.hideLoading();
        this.successMessage.textContent = `✅ ${message}`;
        this.successMessage.classList.remove('hidden');
        this.errorMessage.classList.add('hidden');
    }

    hideMessages() {
        this.errorMessage.classList.add('hidden');
        this.successMessage.classList.add('hidden');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new URLInspector();
});