class URLInspector {
    constructor() {
        this.extractedData = null;
        this.currentSitemap = null;
        this.currentJobId = null;
        this.isProcessing = false;
        
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
        } finally {
            this.hideLoading();
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
        } finally {
            this.hideLoading();
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
                this.showCrawlStatus(false);
                this.crawlBtn.disabled = false;
                this.showError(`Crawling failed: ${data.error}`);
                return;
            }
            
            this.currentSitemap = data.sitemap;
            this.currentJobId = data.jobId;
            this.updateCrawlInfo(data);
            this.populateSitemap();
            
            if (!data.isComplete) {
                this.showResumeOption();
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
        if (!this.currentJobId) {
            this.showError('No job ID available for resuming');
            return;
        }

        const pagesPerBatch = parseInt(this.pagesPerBatchInput.value);

        // Clear the previous sitemap display
        this.clearSitemapDisplay();
        
        this.showCrawlStatus(true);
        this.resumeCrawlBtn.disabled = true;
        
        try {
            const response = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: this.currentJobId,
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
        // Extract headings from sections
        const sections = this.extractedData.sections || [];
        const headings = { h1: [], h2: [], h3: [] };
        
        sections.forEach(section => {
            if (section.heading_level === 'h1' && !headings.h1.includes(section.heading)) {
                headings.h1.push(section.heading);
            } else if (section.heading_level === 'h2' && !headings.h2.includes(section.heading)) {
                headings.h2.push(section.heading);
            } else if (section.heading_level === 'h3' && !headings.h3.includes(section.heading)) {
                headings.h3.push(section.heading);
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
        const links = this.extractedData.links || [];
        const expander = document.getElementById('linksExpander');
        
        if (links.length === 0) {
            expander.style.display = 'none';
            return;
        }
        
        expander.style.display = 'block';
        
        document.getElementById('linksLabel').textContent = `Links (${links.length})`;
        document.getElementById('check_links').checked = false;
        
        const container = document.getElementById('linksPreview');
        container.innerHTML = '';
        
        const previewDiv = document.createElement('div');
        previewDiv.className = 'preview-list';
        
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
        
        previewDiv.appendChild(ul);
        
        if (links.length > 10) {
            const more = document.createElement('p');
            more.textContent = `... and ${links.length - 10} more links`;
            previewDiv.appendChild(more);
        }
        
        container.appendChild(previewDiv);
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

    showCrawlStatus(show) {
        console.log(`[DEBUG] showCrawlStatus(${show}) called`);
        if (show) {
            this.crawlStatus.classList.remove('hidden');
            this.loadingIndicator.classList.add('hidden');
        } else {
            this.crawlStatus.classList.add('hidden');
        }
    }

    updateCrawlInfo(data) {
        this.currentJobIdSpan.textContent = data.jobId;
        this.crawlProgressStatus.textContent = data.isComplete ? 'Complete' : 'In Progress';
        this.batchInfo.classList.remove('hidden');
    }

    showResumeOption() {
        this.resumeCrawlBtn.classList.remove('hidden');
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
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sitemap-checkbox';
        checkbox.value = url;
        checkbox.addEventListener('change', () => this.updateSelectionCount());
        
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
        // Calculate total content length from sections
        let totalContentLength = 0;
        if (data.sections && data.sections.length > 0) {
            totalContentLength = data.sections.reduce((sum, section) => sum + section.content_text.length, 0);
        }
        
        meta.innerHTML = `
            <span>Content: ${Math.round(totalContentLength / 100) * 100} chars</span>
            <span>Sections: ${data.sections ? data.sections.length : 0}</span>
        `;
        meta.className = 'sitemap-meta';
        content.appendChild(title);
        content.appendChild(urlLink);
        content.appendChild(meta);
        
        if (data.error) {
            const error = document.createElement('div');
            error.className = 'sitemap-error';
            error.textContent = data.error;
            content.appendChild(error);
        }
        
        item.appendChild(checkbox);
        item.appendChild(content);
        node.appendChild(item);
        
        return node;
    }

    selectAllPages() {
        const checkboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox');
        checkboxes.forEach(cb => {
            const data = this.currentSitemap[cb.value];
            cb.checked = !data.error; // Only select successful pages
        });
        this.updateSelectionCount();
    }

    selectNoPages() {
        const checkboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const checkboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox:checked');
        this.selectionCount.textContent = `${checkboxes.length} pages selected`;
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
        
        const totalSections = selectedPages.reduce((sum, page) => {
            const sections = page.data.sections || [];
            return sum + sections.length;
        }, 0);
        
        let info = '';
        if (totalPages > 0) {
            info = `Ready to export ${totalSections} sections from ${totalPages} page(s) in ${format.toUpperCase()} format`;
        } else if (this.extractedData && this.extractedData.sections) {
            const currentSections = this.extractedData.sections.length;
            info = `Ready to export ${currentSections} sections from current page in ${format.toUpperCase()} format`;
        } else {
            info = 'No content available for export';
        }
        
        this.exportInfo.textContent = info;
    }

    getSelectedPages() {
        const checkboxes = this.sitemapTree.querySelectorAll('.sitemap-checkbox:checked');
        return Array.from(checkboxes).map(cb => ({
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
            links: []
        };
        
        selectedPages.forEach(({ url, data }) => {
            if (data.success) {
                // Combine sections
                if (data.sections) {
                    combined.sections.push(...data.sections);
                }
                
                // Combine links
                if (data.links) {
                    combined.links.push(...data.links);
                }
            }
        });
        
        // Remove duplicate links
        const linkUrls = new Set();
        combined.links = combined.links.filter(link => {
            if (linkUrls.has(link.url)) return false;
            linkUrls.add(link.url);
            return true;
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
        const exportData = this.getSelectedContent(data);
        const jsonStr = JSON.stringify(exportData, null, 2);
        const filename = `${isMultiPage ? 'multi_page' : 'url'}_content_${timestamp}.json`;
        return [jsonStr, filename, 'application/json'];
    }

    createRAGJSONLExport(data, timestamp, isMultiPage) {
        const jsonlStr = this.createRAGJSONL(data);
        const filename = `${isMultiPage ? 'multi_page' : 'rag'}_content_${timestamp}.jsonl`;
        return [jsonlStr, filename, 'application/jsonl'];
    }

    createTextExport(data, timestamp, isMultiPage) {
        const sections = data.sections || [];
        let textStr = '';
        
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

    getSelectedContent(data) {
        const result = {};
        
        if (document.getElementById('check_source_url')?.checked) {
            result.source_url = data.final_url || data.urls;
        }
        
        if (document.getElementById('check_title')?.checked && data.title) {
            result.title = data.title;
        }
        
        if (document.getElementById('check_meta_description')?.checked && data.meta_description) {
            result.meta_description = data.meta_description;
        }
        
        // Include sections if main content is checked
        if (document.getElementById('check_main_content')?.checked && data.sections) {
            result.sections = data.sections;
        }
        
        if (document.getElementById('check_links')?.checked && data.links?.length) {
            result.links = data.links;
        }
        
        return result;
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
        this.crawlStatus.classList.add('hidden');
        this.inspectBtn.disabled = true;
        this.parseManualBtn.disabled = true;
    }

    hideLoading() {
        this.loadingIndicator.classList.add('hidden');
        this.inspectBtn.disabled = false;
        this.parseManualBtn.disabled = false;
    }

    showError(message) {
        this.errorMessage.textContent = `❌ ${message}`;
        this.errorMessage.classList.remove('hidden');
        this.successMessage.classList.add('hidden');
        this.loadingIndicator.classList.add('hidden');
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