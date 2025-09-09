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

💡 **Pro Tip**: For optimal results, use on publicly accessible, content-rich pages with good semantic HTML structure. The tool excels at extracting organized content from government sites, documentation, blogs, and news articles.