class URLInspector {
    constructor() {
        this.extractedData = null;
        this.sitemapData = null;
        this.selectedPages = new Set();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const inspectBtn = document.getElementById('inspectBtn');
        const urlInput = document.getElementById('urlInput');
        const parseManualBtn = document.getElementById('parseManualBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const crawlBtn = document.getElementById('crawlBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const selectNoneBtn = document.getElementById('selectNoneBtn');
        const formatRadios = document.querySelectorAll('input[name="export_format"]');

        inspectBtn.addEventListener('click', () => this.inspectURL());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.inspectURL();
        });
        parseManualBtn.addEventListener('click', () => this.parseManualHTML());
        downloadBtn.addEventListener('click', () => this.downloadData());
        crawlBtn.addEventListener('click', () => this.crawlSite());
        selectAllBtn.addEventListener('click', () => this.selectAllPages());
        selectNoneBtn.addEventListener('click', () => this.selectNoPages());

        // Show/hide RAG options based on format selection
        formatRadios.forEach(radio => {
            radio.addEventListener('change', () => this.toggleRAGOptions());
        });

        // Update export info when selection changes
        formatRadios.forEach(radio => {
            radio.addEventListener('change', () => this.updateExportInfo());
        });
    }

    async crawlSite() {
        if (!this.extractedData) {
            this.showError('Please inspect a URL first before crawling');
            return;
        }

        const crawlBtn = document.getElementById('crawlBtn');
        const crawlStatus = document.getElementById('crawlStatus');
        const crawlStatusText = document.getElementById('crawlStatusText');
        const sitemapContainer = document.getElementById('sitemapContainer');
        const maxDepth = document.getElementById('maxDepth').value;
        const maxPages = document.getElementById('maxPages').value;

        // Reset UI state
        crawlBtn.disabled = true;
        crawlStatus.classList.remove('hidden');
        sitemapContainer.classList.add('hidden');
        this.selectedPages.clear();
        this.updateSelectionCount();

        try {
            crawlStatusText.textContent = `🔍 Crawl initiated for up to ${maxPages} pages at depth ${maxDepth}. This may take a few moments depending on site size and server response times...`;

            const response = await fetch('/api/crawl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: this.extractedData.final_url,
                    maxDepth: parseInt(maxDepth),
                    maxPages: parseInt(maxPages)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            this.sitemapData = result.sitemap;
            this.renderSitemap(result.sitemap, result.stats);
            sitemapContainer.classList.remove('hidden');
            
            // Update export info
            this.updateExportInfo();

        } catch (error) {
            console.error('Crawl error:', error);
            this.showError(`Crawling failed: ${error.message}`);
        } finally {
            crawlBtn.disabled = false;
            crawlStatus.classList.add('hidden');
        }
    }

    renderSitemap(sitemap, stats) {
        const sitemapTree = document.getElementById('sitemapTree');
        const crawlSummary = document.getElementById('crawlSummary');
        sitemapTree.innerHTML = '';
        
        // Display crawl statistics
        const successfulPages = Object.values(sitemap).filter(page => !page.error).length;
        const failedPages = Object.values(sitemap).filter(page => page.error).length;
        const avgDepth = Math.round(Object.values(sitemap).reduce((sum, page) => sum + page.depth, 0) / Object.keys(sitemap).length * 10) / 10;
        
        crawlSummary.innerHTML = `
            <div class="crawl-stats">
                <div class="stat-item">
                    <span class="stat-value">${stats.totalPages}</span>
                    <span class="stat-label">Total Pages Found</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${successfulPages}</span>
                    <span class="stat-label">Successfully Crawled</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${failedPages}</span>
                    <span class="stat-label">Failed to Load</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.maxDepth}</span>
                    <span class="stat-label">Max Depth Reached</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${avgDepth}</span>
                    <span class="stat-label">Average Depth</span>
                </div>
            </div>
        `;

        // Sort URLs by depth and then alphabetically
        const sortedUrls = Object.keys(sitemap).sort((a, b) => {
            const depthDiff = sitemap[a].depth - sitemap[b].depth;
            if (depthDiff !== 0) return depthDiff;
            return a.localeCompare(b);
        });

        sortedUrls.forEach(url => {
            const data = sitemap[url];
            const node = this.createSitemapNode(url, data);
            sitemapTree.appendChild(node);
        });

        // Show crawl statistics
        console.log(`Crawl completed: Found ${stats.totalPages} pages (${successfulPages} successful, ${failedPages} failed)`);
    }

    createSitemapNode(url, data) {
        const node = document.createElement('div');
        node.className = `sitemap-node depth-${data.depth}`;

        const item = document.createElement('div');
        item.className = `sitemap-item ${data.error ? 'error' : ''}`;

        if (!data.error) {
            // Successful page - add checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'sitemap-checkbox';
            checkbox.value = url;
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedPages.add(url);
                } else {
                    this.selectedPages.delete(url);
                }
                this.updateSelectionCount();
                this.updateExportInfo();
            });
            item.appendChild(checkbox);
        }

        const content = document.createElement('div');
        content.className = 'sitemap-content';

        if (data.error) {
            const title = document.createElement('div');
            title.className = 'sitemap-title';
            title.textContent = 'Failed to load page';

            const urlLink = document.createElement('a');
            urlLink.className = 'sitemap-url';
            urlLink.href = url;
            urlLink.target = '_blank';
            urlLink.rel = 'noopener noreferrer';
            urlLink.textContent = url;

            const error = document.createElement('div');
            error.className = 'sitemap-error';
            error.textContent = data.error;

            content.appendChild(title);
            content.appendChild(urlLink);
            content.appendChild(error);
        } else {
            const title = document.createElement('div');
            title.className = 'sitemap-title';
            title.textContent = data.title || 'Untitled Page';

            const urlLink = document.createElement('a');
            urlLink.className = 'sitemap-url';
            urlLink.href = url;
            urlLink.target = '_blank';
            urlLink.rel = 'noopener noreferrer';
            urlLink.textContent = url;

            const meta = document.createElement('div');
            meta.className = 'sitemap-meta';
            
            const contentLength = data.main_content ? data.main_content.length : 0;
            const headingCount = (data.headings?.h1?.length || 0) + 
                               (data.headings?.h2?.length || 0) + 
                               (data.headings?.h3?.length || 0);
            const linkCount = data.links?.length || 0;
            
            meta.innerHTML = `
                <span>📄 ${contentLength} chars</span>
                <span>📝 ${headingCount} headings</span>
                <span>🔗 ${linkCount} links</span>
            `;

            content.appendChild(title);
            content.appendChild(urlLink);
            content.appendChild(meta);
        }

        item.appendChild(content);
        node.appendChild(item);
        return node;
    }

    selectAllPages() {
        if (!this.sitemapData) return;

        document.querySelectorAll('.sitemap-checkbox').forEach(checkbox => {
            checkbox.checked = true;
            this.selectedPages.add(checkbox.value);
        });
        
        this.updateSelectionCount();
        this.updateExportInfo();
    }

    selectNoPages() {
        document.querySelectorAll('.sitemap-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.selectedPages.clear();
        this.updateSelectionCount();
        this.updateExportInfo();
    }

    updateSelectionCount() {
        const selectionCount = document.getElementById('selectionCount');
        const count = this.selectedPages.size;
        selectionCount.textContent = `${count} page${count !== 1 ? 's' : ''} selected`;
    }

    updateExportInfo() {
        const exportInfo = document.getElementById('exportInfo');
        if (!exportInfo) return;

        const selectedFormat = document.querySelector('input[name="export_format"]:checked')?.value;
        let infoText = '';

        if (this.selectedPages.size > 0) {
            if (selectedFormat === 'rag_jsonl') {
                const chunkSize = parseInt(document.getElementById('chunkSize')?.value) || 300;
                const totalWords = Array.from(this.selectedPages).reduce((total, url) => {
                    const data = this.sitemapData?.[url];
                    if (data?.main_content) {
                        return total + data.main_content.split(/\s+/).length;
                    }
                    return total;
                }, 0);
                const estimatedChunks = Math.ceil(totalWords / chunkSize);
                infoText = `Multi-page export: ${this.selectedPages.size} pages, ~${totalWords.toLocaleString()} words, ~${estimatedChunks} chunks`;
            } else {
                infoText = `Multi-page export: ${this.selectedPages.size} pages selected`;
            }
        } else if (this.extractedData) {
            if (selectedFormat === 'rag_jsonl') {
                const chunkSize = parseInt(document.getElementById('chunkSize')?.value) || 300;
                const words = this.extractedData.main_content?.split(/\s+/).length || 0;
                const chunks = Math.ceil(words / chunkSize);
                infoText = `Single page: ~${words.toLocaleString()} words, ~${chunks} chunks`;
            } else {
                infoText = 'Single page export';
            }
        }

        exportInfo.textContent = infoText;
    }

    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        successMessage.textContent = message;
        successMessage.classList.remove('hidden');
        
        // Show sitemap section after successful URL inspection
        const sitemapSection = document.getElementById('sitemapSection');
        console.log('sitemapSection element:', sitemapSection);
        if (sitemapSection) {
            sitemapSection.classList.remove('hidden');
            console.log('Removed hidden class from sitemapSection');
        } else {
            console.log('sitemapSection element not found!');
        }
    }

    toggleRAGOptions() {
        const selectedFormat = document.querySelector('input[name="export_format"]:checked').value;
        const ragOptions = document.getElementById('ragOptions');
        
        if (selectedFormat === 'rag_jsonl') {
            ragOptions.classList.remove('hidden');
        } else {
            ragOptions.classList.add('hidden');
        }
    }

    async inspectURL() {
        const urlInput = document.getElementById('urlInput');
        const inspectBtn = document.getElementById('inspectBtn');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const resultsSection = document.getElementById('resultsSection');

        let url = urlInput.value.trim();
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }

        // Add https:// if no protocol specified
        if (!url.match(/^https?:\/\//)) {
            url = 'https://' + url;
        }

        // Reset UI state
        this.hideMessages();
        inspectBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');
        resultsSection.classList.add('hidden');

        try {
            // Call the backend API instead of client-side fetching
            const response = await fetch('/api/inspect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                this.showError(data.error);
            } else {
                this.extractedData = data;
                this.showSuccess(`✅ Content extracted from: ${data.final_url}`);
                this.populateResults(data);
                resultsSection.classList.remove('hidden');
            }
        } catch (error) {
            this.showError(`Failed to fetch URL: ${error.message}`);
        } finally {
            inspectBtn.disabled = false;
            loadingIndicator.classList.add('hidden');
        }
    }

    parseManualHTML() {
        const manualHtml = document.getElementById('manualHtml').value.trim();
        const manualUrl = document.getElementById('manualUrl').value.trim() || 'manual-input';
        
        if (!manualHtml) {
            this.showError('Please paste HTML content to parse');
            return;
        }
        
        const loadingIndicator = document.getElementById('loadingIndicator');
        const resultsSection = document.getElementById('resultsSection');
        
        // Reset UI state
        this.hideMessages();
        loadingIndicator.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(manualHtml, 'text/html');
            const data = this.parseDocument(doc, manualUrl);
            
            this.extractedData = data;
            this.showSuccess(`✅ Content parsed from manual input`);
            this.populateResults(data);
            resultsSection.classList.remove('hidden');
            
        } catch (error) {
            this.showError(`Failed to parse HTML: ${error.message}`);
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    populateResults(data) {
        // Update checkboxes based on available data
        document.getElementById('check_title').checked = Boolean(data.title);
        document.getElementById('check_meta_description').checked = Boolean(data.meta_description);
        document.getElementById('check_main_content').checked = Boolean(data.main_content);
        document.getElementById('check_links').checked = Boolean(data.links?.length);

        // Update heading checkboxes and labels
        ['h1', 'h2', 'h3'].forEach(level => {
            const checkbox = document.getElementById(`check_${level}`);
            const label = document.getElementById(`${level}Label`);
            const count = data.headings?.[level]?.length || 0;
            
            checkbox.checked = count > 0;
            label.textContent = `${level.toUpperCase()} (${count})`;
        });

        // Update links label
        const linksLabel = document.getElementById('linksLabel');
        const linksCount = data.links?.length || 0;
        linksLabel.textContent = `Links (${linksCount})`;

        // Populate previews
        this.populatePreviews(data);

        // Show/hide sections based on available data
        this.toggleSections(data);
    }

    populatePreviews(data) {
        const basicPreviews = document.getElementById('basicPreviews');
        const headingPreviews = document.getElementById('headingPreviews');
        const contentPreview = document.getElementById('contentPreview');
        const linksPreview = document.getElementById('linksPreview');

        // Basic information previews
        basicPreviews.innerHTML = '';
        
        if (data.title) {
            basicPreviews.appendChild(this.createPreviewItem('Title', data.title, 'content'));
        }
        
        if (data.meta_description) {
            basicPreviews.appendChild(this.createPreviewItem('Meta Description', data.meta_description, 'content'));
        }

        // Heading previews
        headingPreviews.innerHTML = '';
        ['h1', 'h2', 'h3'].forEach(level => {
            const headings = data.headings?.[level] || [];
            if (headings.length > 0) {
                const preview = headings.slice(0, 5).join(', ');
                const suffix = headings.length > 5 ? `, ... and ${headings.length - 5} more` : '';
                headingPreviews.appendChild(this.createPreviewItem(
                    `${level.toUpperCase()} Preview`, 
                    preview + suffix, 
                    'content'
                ));
            }
        });

        // Content preview
        contentPreview.innerHTML = '';
        if (data.main_content) {
            const preview = data.main_content.length > 500 
                ? data.main_content.substring(0, 500) + '...'
                : data.main_content;
            contentPreview.appendChild(this.createPreviewItem('Content Preview', preview, 'content'));
        }

        // Links preview
        linksPreview.innerHTML = '';
        if (data.links?.length > 0) {
            const linksList = data.links.slice(0, 10).map(link => 
                `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a></li>`
            ).join('');
            
            const moreText = data.links.length > 10 
                ? `<li><em>... and ${data.links.length - 10} more links</em></li>`
                : '';
                
            linksPreview.appendChild(this.createPreviewItem(
                'Links Preview', 
                `<ul>${linksList}${moreText}</ul>`, 
                'list'
            ));
        }
    }

    createPreviewItem(label, content, type = 'content') {
        const item = document.createElement('div');
        item.className = 'preview-item';
        
        const labelEl = document.createElement('span');
        labelEl.className = 'preview-label';
        labelEl.textContent = label + ':';
        
        const contentEl = document.createElement('div');
        contentEl.className = type === 'list' ? 'preview-list' : 'preview-content';
        
        if (type === 'list') {
            contentEl.innerHTML = content;
        } else {
            contentEl.textContent = content;
        }
        
        item.appendChild(labelEl);
        item.appendChild(contentEl);
        
        return item;
    }

    toggleSections(data) {
        // Show/hide sections based on available data
        const headingsExpander = document.getElementById('headingsExpander');
        const contentExpander = document.getElementById('contentExpander');
        const linksExpander = document.getElementById('linksExpander');

        const hasHeadings = ['h1', 'h2', 'h3'].some(level => data.headings?.[level]?.length > 0);
        headingsExpander.style.display = hasHeadings ? 'block' : 'none';

        contentExpander.style.display = data.main_content ? 'block' : 'none';
        linksExpander.style.display = data.links?.length > 0 ? 'block' : 'none';
    }

    downloadData() {
        if (!this.extractedData) return;

        const selectedFormat = document.querySelector('input[name="export_format"]:checked').value;
        const selectedFields = this.getSelectedFields();

        let exportData, filename, mimeType;

        switch (selectedFormat) {
            case 'json':
                exportData = this.createJSONExport(selectedFields);
                filename = `url_content_${Date.now()}.json`;
                mimeType = 'application/json';
                break;

            case 'rag_jsonl':
                exportData = this.createRAGJSONLExport(selectedFields);
                filename = `rag_content_${Date.now()}.jsonl`;
                mimeType = 'application/jsonl';
                break;

            case 'txt':
                exportData = this.createTextExport(selectedFields);
                filename = `content_${Date.now()}.txt`;
                mimeType = 'text/plain';
                break;
        }

        this.downloadFile(exportData, filename, mimeType);
    }

    getSelectedFields() {
        const fields = {};
        const checkboxes = [
            'source_url', 'title', 'meta_description', 'main_content', 
            'h1', 'h2', 'h3', 'links'
        ];

        checkboxes.forEach(field => {
            const checkbox = document.getElementById(`check_${field}`);
            if (checkbox && checkbox.checked) {
                fields[field] = true;
            }
        });

        return fields;
    }

    createJSONExport(selectedFields) {
        const data = {};

        if (selectedFields.source_url) data.source_url = this.extractedData.final_url;
        if (selectedFields.title) data.title = this.extractedData.title || '';
        if (selectedFields.meta_description) data.meta_description = this.extractedData.meta_description || '';
        if (selectedFields.main_content) data.main_content = this.extractedData.main_content || '';
        if (selectedFields.links) data.links = this.extractedData.links || [];

        // Add headings
        ['h1', 'h2', 'h3'].forEach(level => {
            if (selectedFields[level]) {
                data[level] = this.extractedData.headings?.[level] || [];
            }
        });

        return JSON.stringify(data, null, 2);
    }

    createRAGJSONLExport(selectedFields) {
        const chunkSize = parseInt(document.getElementById('chunkSize').value) || 300;
        const overlap = parseInt(document.getElementById('overlap').value) || 50;
        const includeHeadings = document.getElementById('includeHeadings').checked;

        const lines = [];
        const finalUrl = this.extractedData.final_url;
        const title = this.extractedData.title || '';

        // Base metadata
        const baseMetadata = { source: finalUrl };
        if (includeHeadings) {
            baseMetadata.h1 = this.extractedData.headings?.h1 || [];
            baseMetadata.h2 = this.extractedData.headings?.h2 || [];
            baseMetadata.h3 = this.extractedData.headings?.h3 || [];
        }

        let chunkIndex = 0;

        // Add title as separate entry
        if (selectedFields.title && title) {
            const metadata = { ...baseMetadata, type: 'title' };
            lines.push({
                id: this.generateChunkId(finalUrl, chunkIndex, title),
                title: title,
                chunk: title,
                metadata: metadata
            });
            chunkIndex++;
        }

        // Add meta description
        if (selectedFields.meta_description && this.extractedData.meta_description) {
            const metadata = { ...baseMetadata, type: 'description' };
            lines.push({
                id: this.generateChunkId(finalUrl, chunkIndex, this.extractedData.meta_description),
                title: title,
                chunk: this.extractedData.meta_description,
                metadata: metadata
            });
            chunkIndex++;
        }

        // Chunk main content
        if (selectedFields.main_content && this.extractedData.main_content) {
            const chunks = this.chunkText(this.extractedData.main_content, chunkSize, overlap);
            chunks.forEach(chunk => {
                const metadata = { ...baseMetadata, type: 'text' };
                lines.push({
                    id: this.generateChunkId(finalUrl, chunkIndex, chunk),
                    title: title,
                    chunk: chunk,
                    metadata: metadata
                });
                chunkIndex++;
            });
        }

        return lines.map(line => JSON.stringify(line)).join('\n');
    }

    createMultiPageJSONExport() {
        const pages = {};
        
        for (const url of this.selectedPages) {
            const data = this.sitemapData[url];
            if (data && !data.error) {
                pages[url] = {
                    source_url: url,
                    title: data.title || '',
                    meta_description: data.meta_description || '',
                    headings: data.headings || { h1: [], h2: [], h3: [] },
                    main_content: data.main_content || '',
                    links: data.links || [],
                    depth: data.depth
                };
            }
        }
        
        return JSON.stringify({
            export_type: 'multi_page',
            total_pages: this.selectedPages.size,
            exported_at: new Date().toISOString(),
            pages
        }, null, 2);
    }

    createMultiPageRAGJSONLExport() {
        const chunkSize = parseInt(document.getElementById('chunkSize').value) || 300;
        const overlap = parseInt(document.getElementById('overlap').value) || 50;
        const includeHeadings = document.getElementById('includeHeadings').checked;
        
        const lines = [];
        let globalChunkIndex = 0;
        
        for (const url of this.selectedPages) {
            const data = this.sitemapData[url];
            if (data && !data.error) {
                const title = data.title || '';
                
                // Base metadata for this page
                const baseMetadata = { 
                    source: url,
                    depth: data.depth
                };
                
                if (includeHeadings) {
                    baseMetadata.h1 = data.headings?.h1 || [];
                    baseMetadata.h2 = data.headings?.h2 || [];
                    baseMetadata.h3 = data.headings?.h3 || [];
                }
                
                // Add title as separate entry
                if (title) {
                    const metadata = { ...baseMetadata, type: 'title' };
                    lines.push({
                        id: this.generateChunkId(url, globalChunkIndex, title),
                        title: title,
                        chunk: title,
                        metadata: metadata
                    });
                    globalChunkIndex++;
                }
                
                // Add meta description
                if (data.meta_description) {
                    const metadata = { ...baseMetadata, type: 'description' };
                    lines.push({
                        id: this.generateChunkId(url, globalChunkIndex, data.meta_description),
                        title: title,
                        chunk: data.meta_description,
                        metadata: metadata
                    });
                    globalChunkIndex++;
                }
                
                // Chunk main content
                if (data.main_content) {
                    const chunks = this.chunkText(data.main_content, chunkSize, overlap);
                    chunks.forEach(chunk => {
                        const metadata = { ...baseMetadata, type: 'text' };
                        lines.push({
                            id: this.generateChunkId(url, globalChunkIndex, chunk),
                            title: title,
                            chunk: chunk,
                            metadata: metadata
                        });
                        globalChunkIndex++;
                    });
                }
            }
        }
        
        return lines.map(line => JSON.stringify(line)).join('\n');
    }

    createMultiPageTextExport() {
        const parts = [`Multi-page Content Export`];
        parts.push(`Generated: ${new Date().toISOString()}`);
        parts.push(`Total Pages: ${this.selectedPages.size}`);
        parts.push('='.repeat(80));
        
        let pageIndex = 1;
        for (const url of this.selectedPages) {
            const data = this.sitemapData[url];
            if (data && !data.error) {
                parts.push(`\nPage ${pageIndex}: ${data.title || 'Untitled'}`);
                parts.push(`URL: ${url}`);
                parts.push(`Depth: ${data.depth}`);
                parts.push('-'.repeat(40));
                
                if (data.meta_description) {
                    parts.push(`Description: ${data.meta_description}`);
                }
                
                // Add headings
                ['h1', 'h2', 'h3'].forEach(level => {
                    const headings = data.headings?.[level];
                    if (headings?.length > 0) {
                        parts.push(`${level.toUpperCase()} Headings: ${headings.join(', ')}`);
                    }
                });
                
                if (data.main_content) {
                    parts.push(`\nContent:\n${data.main_content}`);
                }
                
                parts.push('='.repeat(80));
                pageIndex++;
            }
        }
        
        return parts.join('\n');
    }

    createTextExport(selectedFields) {
        const parts = [];
        
        if (selectedFields.source_url) {
            parts.push(`Source: ${this.extractedData.final_url}`);
        }
        
        if (selectedFields.title && this.extractedData.title) {
            parts.push(`Title: ${this.extractedData.title}`);
        }
        
        if (selectedFields.meta_description && this.extractedData.meta_description) {
            parts.push(`Description: ${this.extractedData.meta_description}`);
        }

        // Add headings
        ['h1', 'h2', 'h3'].forEach(level => {
            if (selectedFields[level] && this.extractedData.headings?.[level]?.length > 0) {
                parts.push(`${level.toUpperCase()} Headings:\n${this.extractedData.headings[level].map(h => `- ${h}`).join('\n')}`);
            }
        });

        if (selectedFields.main_content && this.extractedData.main_content) {
            parts.push(`Content:\n${this.extractedData.main_content}`);
        }

        if (selectedFields.links && this.extractedData.links?.length > 0) {
            const linksList = this.extractedData.links.map(link => `- ${link.text}: ${link.url}`).join('\n');
            parts.push(`Links:\n${linksList}`);
        }

        return parts.join('\n\n');
    }

    chunkText(text, chunkSize, overlap) {
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

    generateChunkId(url, chunkIndex, chunkText) {
        const content = `${url}_${chunkIndex}_${chunkText.substring(0, 50)}`;
        // Simple hash function for ID generation
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
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

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = `❌ ${message}`;
        errorMessage.classList.remove('hidden');
    }

    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        successMessage.textContent = message;
        successMessage.classList.remove('hidden');
        
        // Show sitemap section after successful URL inspection
        const sitemapSection = document.getElementById('sitemapSection');
        console.log('sitemapSection element:', sitemapSection);
        if (sitemapSection) {
            sitemapSection.classList.remove('hidden');
            console.log('Removed hidden class from sitemapSection');
        } else {
            console.log('sitemapSection element not found!');
        }
    }

    hideMessages() {
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('successMessage').classList.add('hidden');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new URLInspector();
});