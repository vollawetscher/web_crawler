# 🔍 URL Inspector & Web Crawler

## Project Description

The URL Inspector & Web Crawler is a comprehensive web-based tool designed to extract, analyze, and export content from web pages and entire websites. It provides intelligent content parsing, systematic website crawling capabilities, and flexible export options optimized for various use cases including AI/RAG systems, content analysis, and data collection.

## ✨ Key Features

### 🔍 **Smart URL Inspection**
- **Single Page Analysis**: Fetch and parse content from any publicly accessible URL
- **Intelligent Content Extraction**:
  - Page titles and meta descriptions
  - Hierarchical heading structure (H1, H2, H3) with section organization  
  - Main content with advanced section-based parsing
  - Internal and external link discovery
  - Contact information and date extraction
- **Fallback HTML Parser**: Manual HTML input when direct URL access fails

### 🕷️ **Systematic Website Crawling**
- **Multi-level Discovery**: Crawl websites up to 3 levels deep
- **Batch Processing**: Process large sites in manageable chunks with resume capability
- **Respectful Crawling**: Built-in delays and rate limiting to avoid server overload
- **Job Management**: Pause, resume, and track crawling progress with unique job IDs
- **Visual Sitemap**: Interactive tree view of discovered pages with metadata

### ✅ **Granular Content Control**
- **Flexible Selection**: Choose exactly which content types to export
- **Live Previews**: Review extracted content before export
- **Multi-page Exports**: Combine content from multiple crawled pages
- **Quality Filtering**: Automatically skip pages with extraction errors

### 📤 **Advanced Export Formats**

#### **JSON Export**
- Structured data format for programmatic use
- Preserves all extracted metadata and relationships
- Perfect for data analysis and integration

#### **RAG JSONL Export** ⭐
- **AI-Optimized**: Purpose-built for Retrieval-Augmented Generation systems
- **Intelligent Chunking**: Configurable chunk size and overlap for optimal context windows
- **Rich Metadata**: Includes source URLs, content types, headings, and volatility indicators
- **Stable IDs**: Consistent chunk identification for version tracking
- **Content Classification**: Automatic categorization (announcements, facility info, FAQs, etc.)

#### **Plain Text Export**
- Clean, readable text format
- Organized by sections and headings
- Ideal for simple analysis and review

### 🧠 **Content Intelligence**
- **Section-Based Parsing**: Organizes content into logical sections with headings
- **Content Type Classification**: Automatically identifies announcements, facility information, FAQs, and general content
- **Volatility Assessment**: Classifies content stability (high/medium/low volatility)
- **Contact & Date Extraction**: Identifies email addresses, phone numbers, and dates
- **Boilerplate Filtering**: Removes navigation, footers, and other non-content elements

### 🎨 **User Experience**
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Progress**: Live status updates during crawling operations  
- **Error Handling**: Graceful recovery from network issues and parsing failures
- **Intuitive Interface**: Clean, organized layout with collapsible sections

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   Or alternatively:
   ```bash
   npm start
   ```

3. **Access the application**:
   - Open your web browser
   - Navigate to `http://localhost:3000`
   - The URL Inspector interface will load and be ready to use

## 🛠️ Technologies Used

### **Backend**
- **Node.js**: JavaScript runtime for server-side processing
- **Express.js**: Web framework for RESTful API endpoints
- **node-fetch**: HTTP client for web page retrieval
- **cheerio**: Server-side HTML parsing and DOM manipulation
- **File-based Storage**: JSON persistence for crawl state management

### **Frontend**
- **HTML5**: Semantic markup with modern web standards
- **CSS3**: Responsive design with flexbox and grid layouts
- **Vanilla JavaScript**: Modern ES6+ with async/await and DOM APIs

### **Architecture**
- **RESTful API**: Clean separation between frontend and backend
- **Modular Design**: Organized code structure for maintainability
- **Stateful Crawling**: Persistent job management with resume capability

## 📖 Usage Guide

### **Basic URL Inspection**
1. Enter the target URL in the main input field
2. Click **"🔍 Inspect"** to analyze the page
3. Review the extracted content in organized sections
4. Select desired content types using checkboxes
5. Choose your preferred export format
6. Click **"📥 Download"** to save your data

### **Website Crawling**
1. Configure crawl settings:
   - **Max Depth**: How many link levels to follow (1-3)
   - **Max Pages**: Total page limit for the crawl
   - **Pages per Batch**: Processing batch size
2. Click **"🕷️ Discover & Crawl Links"** to start
3. Monitor real-time progress and statistics
4. Use **Job ID** to resume interrupted crawls
5. Select specific pages from the sitemap for export

### **RAG JSONL Configuration**
1. Select **"RAG JSONL"** as your export format
2. Configure chunking parameters:
   - **Chunk Size**: Words per chunk (recommended: 200-500)
   - **Overlap**: Words to overlap between chunks (recommended: 25-100)
   - **Include Headings**: Add heading structure to metadata
3. Export creates AI-ready chunks with stable IDs and rich metadata

### **Manual HTML Processing**
1. Expand **"📝 Or paste HTML content manually"**
2. Paste your HTML content into the textarea
3. Optionally provide the original URL for context
4. Click **"📄 Parse HTML"** to process locally

## 🎯 Use Cases

- **🤖 AI/RAG System Training**: Create chunked, metadata-rich datasets for AI training
- **📊 Content Analysis**: Analyze website structure, content quality, and organization
- **🔍 Competitive Research**: Study competitor websites and content strategies  
- **📚 Knowledge Base Creation**: Build structured information repositories
- **🎓 Academic Research**: Collect data from institutional and government websites
- **⚡ SEO Analysis**: Extract and analyze page titles, descriptions, and heading structures
- **📈 Content Auditing**: Review and catalog existing website content

## 🔧 Technical Notes

- **CORS Handling**: Proper cross-origin request management
- **Rate Limiting**: Built-in delays prevent server overload during crawling
- **Error Recovery**: Robust handling of network issues and parsing failures
- **Memory Management**: Efficient processing through batch operations
- **Content Intelligence**: Advanced parsing with section-based organization
- **Boilerplate Filtering**: Smart removal of navigation and non-content elements

## ⚠️ Limitations & Best Practices

- **JavaScript-Heavy Sites**: Limited extraction from heavily client-side rendered pages
- **Access Restrictions**: Some sites may block automated requests
- **Content Quality**: Best results with well-structured, semantic HTML
- **Respectful Usage**: Built-in delays help maintain good server relationships

---

## 🚨 **Current Development Status - Updated Dec 2024**

### ✅ **Recently Implemented (Latest Session)**
- **✅ Frontend State Persistence**: Automatic save/restore of inspection results and crawl progress
- **✅ Improved Content Extraction**: Better boilerplate filtering and semantic content detection
- **✅ Fixed Export Logic**: Checkbox selections now properly control export content
- **✅ Enhanced RAG JSONL**: Boilerplate sections filtered from AI-ready exports
- **✅ Session Recovery**: Page refreshes won't lose your work anymore
- **✅ Error Handling**: Fixed parsing errors and improved stability

### ✅ **Stable Working Components**
- **✅ URL Fetching & Parsing**: Successfully processes HTML pages with improved content extraction
- **✅ Multi-level Crawling**: Website crawling with batch processing and resume capability
- **✅ Export Formats**: JSON, RAG JSONL, and Plain Text with proper content filtering
- **✅ State Management**: Persistent crawl jobs and inspection results across sessions
- **✅ Frontend Interface**: Complete UI with multi-page selection and real-time progress
- **✅ Selective Export**: Checkbox-controlled content inclusion/exclusion

### 🔧 **Known Issues & Limitations**

#### **Content Extraction Quality**
- **Partial Success**: Content extraction significantly improved but may still miss some main content
- **Complex Layouts**: Some websites with unusual DOM structures may not extract optimally
- **Boilerplate Residue**: Occasional cookie/legal text may still appear in exports

#### **Network & Crawling**
- **Timeout Issues**: Some pages timeout during crawling (30-second limit)
- **No robots.txt Support**: Crawler doesn't read or respect robots.txt files
- **Rate Limiting**: Some servers may block requests despite 1-second delays

#### **User Experience**
- **Crawl Speed**: Intentionally slow (1-second delays) for server respect
- **Complex Sites**: JavaScript-heavy or dynamically-loaded content may be missed

---

## 🎯 **Development Priorities for Next Session**

### **Priority 1: Content Extraction Optimization**
- **Test on various website types**: Government sites, news articles, documentation
- **Fine-tune boilerplate detection**: Reduce false positives while keeping filtering effective
- **Improve section organization**: Better heading-based content structuring
- **Add content validation**: Verify extracted content length vs expected content

### **Priority 2: Responsible Crawling Features**
- **Implement robots.txt parsing**: Respect website crawling policies
- **Add configurable delays**: Allow users to set crawl delays (1-5 seconds)
- **Improve timeout handling**: Retry logic for failed URLs
- **Rate limit awareness**: Better detection and handling of server limitations

### **Priority 3: User Experience Improvements**
- **Real-time content preview**: Show extraction quality during crawling
- **Content quality metrics**: Display extraction success rates and content scores
- **Export preview**: Let users see what will be exported before downloading
- **Crawl resume improvements**: Better job management and status tracking

### **Priority 4: Advanced Features**
- **Content deduplication**: Identify and merge similar sections across pages
- **Smart chunking**: Improve RAG JSONL chunk boundaries for better AI performance
- **Metadata enhancement**: Extract more structured data (tables, lists, contact info)
- **Export customization**: More granular control over what gets included

---

## 🧪 **Testing Checklist for Next Session**

### **Content Extraction Testing**
1. **Government Sites**: Test on `landkreis-*.de` domains
2. **News Articles**: Content-rich journalism sites
3. **Documentation**: Technical docs with nested content  
4. **Corporate Sites**: Marketing pages with mixed content types
5. **Complex Layouts**: Sites with sidebars, widgets, complex navigation

### **Export Quality Testing**
1. **Checkbox Functionality**: Verify all checkboxes properly control exports
2. **Boilerplate Filtering**: Ensure cookie/legal text doesn't dominate exports
3. **RAG JSONL Quality**: Check chunk sizes, metadata accuracy, content relevance
4. **Multi-page Exports**: Test combined exports with various page selections

### **Persistence & Recovery Testing**  
1. **Page Refresh**: Verify state restoration after browser refresh
2. **Long Crawls**: Test job resumption after interruption
3. **Session Management**: Validate inspection result persistence
4. **Error Recovery**: Ensure graceful handling of corrupted states

---

## 🔄 **Session Handoff Notes**

### **What Was Fixed Today**
- ✅ **State Persistence**: Frontend now automatically saves and restores work
- ✅ **Export Logic**: Checkboxes now properly control what gets exported  
- ✅ **Content Quality**: Improved filtering of boilerplate/cookie content
- ✅ **Error Handling**: Fixed parsing errors and improved stability

### **Current Data Files**
- **Crawl States**: Stored in `data/crawl_states/*.json`
- **Inspection Results**: Stored in `data/inspections/*.json`  
- **Active Job IDs**: Check existing files for resumeable crawl jobs

### **Quick Start for Next Session**
1. **Start Server**: `npm run dev`
2. **Test State Persistence**: Inspect a URL, refresh page, verify restoration
3. **Resume Existing Crawls**: Use job IDs from `data/crawl_states/` directory
4. **Focus Areas**: Content extraction quality and robots.txt implementation

---

💡 **Pro Tip**: The tool now persistently saves your work! Inspect URLs and start crawls confidently - your progress won't be lost. Focus next session on content extraction quality and responsible crawling practices.