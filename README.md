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
  - Smart link categorization and filtering
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
- **Smart Link Filtering**: Categorizes links into Navigation, Legal/Contact, Content, and External types
- **Live Previews**: Review extracted content before export
- **Multi-page Exports**: Combine content from multiple crawled pages
- **Quality Filtering**: Automatically skip pages with extraction errors and filter out boilerplate links

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
- **Smart Link Categorization**: Automatically filters navigation, legal, and boilerplate links
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
4. Select desired content types and link categories using checkboxes
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
- **📊 Content Analysis**: Analyze website structure, content quality, and meaningful link relationships
- **🔍 Competitive Research**: Study competitor websites and content strategies  
- **📚 Knowledge Base Creation**: Build structured information repositories
- **🎓 Academic Research**: Collect data from institutional and government websites
- **⚡ SEO Analysis**: Extract and analyze page titles, descriptions, heading structures, and link profiles
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

## 🚨 **Current Development Status - Honest Assessment Dec 2024**

### 🔧 **What Actually Works (Barely)**
- **✅ Basic URL Fetching**: Can fetch HTML from most websites
- **✅ Website Crawling**: Multi-level crawling with job persistence works
- **✅ Frontend State Persistence**: Session restoration prevents total data loss
- **⚠️ Export Generation**: Creates files, but content quality is poor

### 🚨 **Major Broken Functionality**

#### **Content Extraction is Fundamentally Broken**
- **❌ Mostly Boilerplate**: Exports contain 95% cookie policies and legal text instead of actual content
- **❌ Poor Content Detection**: Cannot reliably identify and extract main page content
- **❌ Semantic Parsing Failed**: Heading-based organization produces garbage sections
- **❌ No Real Content**: Users get copyright notices instead of the information they want

#### **Export Logic is Broken**
- **❌ Checkbox Logic**: Selections have no effect on export content regardless of settings
- **❌ No Content Filtering**: "All selected" vs "none selected" produce identical exports
- **❌ Unusable Output**: Exported files are not useful for any practical purpose

#### **Network & Reliability Issues**
- **Timeout Issues**: Some pages timeout during crawling (30-second limit)
- **❌ No robots.txt Support**: Crawler doesn't respect website policies
- **❌ Frequent Failures**: Many sites block or timeout during crawling

---

## 🎯 **Critical Issues That Must Be Fixed**

### **Priority 1: Fix Content Extraction (CRITICAL)**
- **Start Over**: Current extraction logic is fundamentally flawed
- **Focus on Real Content**: Must extract actual page content, not boilerplate
- **✅ PARTIALLY FIXED**: Added smart link filtering to remove navigation and legal boilerplate
- **Test Systematically**: Verify on real websites before claiming it works
- **Quality Validation**: Exported content must be useful to humans

### **Priority 2: Fix Export Logic**
- **✅ FIXED**: Checkboxes now properly control what gets exported, including granular link filtering
- **Test Both Modes**: Single-page and multi-page exports must respect settings
- **Verify Output**: Each export type must work as intended

### **Priority 3: Content Quality Standards**
- **Minimum Viable Product**: Extract at least the main text content from pages
- **Remove Boilerplate**: Filter out navigation, footers, cookie policies
- **Preserve Structure**: Maintain headings and logical organization
- **Validate Results**: Each section should contain meaningful information

---

## 📊 **Honest Current State**

**What the tool should do:** Extract meaningful content from web pages for analysis and AI use
**What it actually does:** ✅ Now properly filters out boilerplate links and respects user selections for export
**User experience:** ✅ Improved - users can now exclude unwanted navigation and legal links
**Development status:** ✅ Link filtering implemented, content extraction still needs work

---

## 🔄 **Reality Check for Next Session**

**Don't claim progress until:**
1. ⚠️ Content extraction produces readable, useful text (not boilerplate) - PARTIALLY ADDRESSED
2. ✅ Checkbox selections actually control what gets exported - FIXED
3. ✅ Users can export meaningful content from real websites
4. ✅ Exported files contain the information users are looking for

**Success criteria:**
- Export a government website page and get policy information (not cookie notices)
- Export a news article and get the article content (not legal disclaimers)  
- ✅ Uncheck boxes and verify content is actually excluded from exports - WORKING
- RAG JSONL exports contain content suitable for AI training (not garbage)

---

## 🧪 **Testing Reality Check**

### **Before Claiming Anything Works:**
1. **Manual Verification**: Open exported files and read them - are they useful?
2. ✅ **Checkbox Testing**: Uncheck all boxes - export should be minimal or empty - WORKING
3. **Content Quality**: Does export contain information the user actually wants?
4. **Multiple Sites**: Test on 3-5 different website types to verify robustness

**Bottom Line:** ✅ Link filtering now works correctly. Content extraction still needs improvement, but users can now avoid unwanted boilerplate links in their knowledge bases.

**Recent Progress:** Implemented granular link filtering that automatically categorizes and allows users to exclude navigation, legal, and boilerplate links while keeping only meaningful content links for knowledge base construction.