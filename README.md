# 🔍 URL Inspector & Web Crawler

## Project Description

The URL Inspector & Web Crawler is a powerful web-based tool designed to extract, analyze, and export content from web pages and entire websites. It enables users to inspect single URLs, parse manual HTML input, and systematically crawl websites to gather both structured and unstructured data. The extracted information can be exported in multiple formats including JSON, RAG-ready JSONL for AI systems, and plain text, making it ideal for content analysis, data collection, knowledge base creation, and populating Retrieval-Augmented Generation (RAG) systems.

## Features

### 🔍 **URL Inspection**
- **Single Page Analysis**: Fetch and parse content from any given URL
- **Comprehensive Data Extraction**:
  - Page Title and Meta Description
  - Hierarchical Headings (H1, H2, H3)
  - Main Content with intelligent extraction
  - Internal and External Links
  - Structured Data Detection

### 📝 **Manual HTML Parsing**
- **Local Processing**: Parse raw HTML content directly without URL fetching
- **Debug-Friendly**: Useful when direct URL access fails or for offline analysis
- **Same Data Extraction**: Applies the same intelligent parsing to manual input

### ✅ **Granular Content Selection**
- **Flexible Export Control**: Choose exactly which content types to include
- **Preview System**: View extracted content before export
- **Batch Processing**: Select multiple pages for combined exports

### 📤 **Multiple Export Formats**
- **JSON**: Structured export for programmatic use
- **RAG JSONL**: Optimized for AI/ML systems with configurable:
  - Chunk size and overlap for content splitting
  - Metadata inclusion (headings, source URLs)
  - Stable chunk IDs for consistent processing
- **Plain Text**: Clean text export for simple analysis

### 🕷️ **Website Crawling**
- **Intelligent Discovery**: Automatically find and follow internal links
- **Configurable Depth**: Set maximum crawl depth (1-3 levels)
- **Batch Processing**: Process sites in controlled batches to manage resources
- **Resume Capability**: Pause and resume crawls using job IDs
- **Respectful Crawling**: Built-in delays to avoid overwhelming servers

### 🗺️ **Multi-page Management**
- **Visual Sitemap**: Tree-view of discovered pages with metadata
- **Selective Export**: Choose specific pages from crawl results
- **Batch Operations**: Select all, select none, or individual page selection
- **Error Handling**: Clear indication of failed page crawls

### 🎨 **User Experience**
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Real-time Feedback**: Progress indicators and status updates
- **Error Recovery**: Graceful handling of network issues and parsing errors
- **Intuitive Interface**: Clean, organized layout with collapsible sections

## How to Run Locally

To run this application on your local machine:

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation & Setup

1. **Clone or download** the project files to a local directory

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Open your web browser
   - Navigate to `http://localhost:3000`
   - The URL Inspector interface should load

### Alternative Start Command
```bash
npm start
```

## Technologies Used

### **Backend**
- **Node.js**: JavaScript runtime for server-side processing
- **Express.js**: Web framework for API endpoints and static file serving
- **node-fetch**: HTTP client for fetching web pages
- **cheerio**: Server-side HTML parsing and DOM manipulation

### **Frontend**
- **HTML5**: Modern markup with semantic elements
- **CSS3**: Responsive styling with flexbox and grid layouts
- **JavaScript (ES6+)**: Modern JavaScript with async/await, modules, and DOM manipulation

### **Architecture**
- **RESTful API**: Clean separation between frontend and backend
- **File-based Storage**: JSON files for crawl state persistence
- **Modular Design**: Organized code structure for maintainability

## Usage Guide

### **Basic URL Inspection**
1. **Enter URL**: Paste the target URL in the main input field
2. **Click Inspect**: The system will fetch and analyze the page content
3. **Review Results**: Extracted content appears in organized, expandable sections
4. **Select Content**: Use checkboxes to choose which elements to export
5. **Choose Format**: Select JSON, RAG JSONL, or Plain Text
6. **Download**: Generate and save your extracted data

### **Manual HTML Processing**
1. **Expand Manual Section**: Click "Or paste HTML content manually"
2. **Paste Content**: Add your HTML code to the textarea
3. **Optional URL**: Provide the original URL for context
4. **Parse**: Click "Parse HTML" to process the content
5. **Export**: Follow the same selection and export process

### **Website Crawling**
1. **Configure Crawl**: Set maximum depth (1-3 levels) and page limits
2. **Start Crawling**: Click "Discover & Crawl Links"
3. **Monitor Progress**: Watch the real-time status updates
4. **Batch Processing**: Crawls process in configurable batches
5. **Resume if Needed**: Use the generated Job ID to continue interrupted crawls

### **Multi-page Export**
1. **Review Sitemap**: Examine the discovered pages in the tree view
2. **Select Pages**: Choose specific pages or use "Select All/None"
3. **Export Combined**: Download multiple pages as a single file
4. **Format Options**: All export formats support multi-page content

### **RAG JSONL Configuration**
1. **Select Format**: Choose "RAG JSONL" as export format
2. **Adjust Settings**:
   - **Chunk Size**: Words per chunk (50-1000)
   - **Overlap**: Words to overlap between chunks (0-200)
   - **Metadata**: Include headings in chunk metadata
3. **Export**: Generate AI-ready data with stable IDs

## Use Cases

- **Content Analysis**: Analyze website structure and content quality
- **Data Collection**: Gather information from multiple related pages
- **Knowledge Base Creation**: Build structured datasets for AI training
- **RAG System Population**: Create chunked, metadata-rich content for retrieval systems
- **SEO Analysis**: Extract and analyze page titles, descriptions, and headings
- **Competitive Research**: Study competitor website structure and content
- **Academic Research**: Collect data from institutional or government websites

## Technical Notes

- **CORS Handling**: The application handles cross-origin requests appropriately
- **Rate Limiting**: Built-in delays prevent server overload during crawling
- **Error Recovery**: Robust error handling for network issues and parsing failures
- **Memory Management**: Efficient processing of large websites through batch operations
- **Data Persistence**: Crawl states are saved for resumable operations

---

💡 **Tip**: For best results, use the tool on publicly accessible, content-rich pages. Some sites with heavy JavaScript requirements or strict CORS policies may have limited content extraction capabilities.