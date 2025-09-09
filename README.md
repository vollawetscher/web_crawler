# 🔍 URL Inspector & Web Crawler

## Project Description

The URL Inspector & Web Crawler is a web-based tool designed to extract and analyze content from web pages. It allows users to inspect single URLs, parse manual HTML input, and even crawl entire websites to gather structured and unstructured data. The extracted information can then be exported in various formats, including JSON, RAG-ready JSONL, and plain text, making it suitable for data analysis, content management, or populating Retrieval-Augmented Generation (RAG) systems.

## Features

*   **URL Inspection**: Fetch and parse content from any given URL, extracting:
    *   Page Title
    *   Meta Description
    *   Headings (H1, H2, H3)
    *   Main Content
    *   Internal and External Links
*   **Manual HTML Parsing**: Ability to paste raw HTML content for local parsing and extraction, useful for debugging or when direct URL fetching is not possible.
*   **Content Selection**: Granular control over which extracted content types (e.g., title, main content, specific headings, links) are included in the export.
*   **Multiple Export Formats**:
    *   **JSON**: Structured export of selected content.
    *   **RAG JSONL**: Line-delimited JSON format optimized for RAG systems, with configurable chunking (size and overlap) and metadata inclusion (e.g., source URL, headings).
    *   **Plain Text**: Simple text export of selected content.
*   **Site Crawling**: Discover and crawl linked pages within a specified domain, with options to set maximum crawl depth and maximum number of pages.
*   **Multi-page Selection & Export**: Select multiple crawled pages and export their combined content in JSON or RAG JSONL formats.
*   **User-Friendly Interface**: A clean and intuitive web interface for easy interaction.

## How to Run Locally

To run this application on your local machine, follow these steps:

1.  **Clone the repository** (or ensure you have all project files in a directory).
2.  **Install dependencies**: Navigate to the project's root directory in your terminal and install the necessary Node.js packages.
    ```bash
    npm install
    ```
3.  **Start the server**: Run the development server.
    ```bash
    npm run dev
    ```
    The application should now be accessible in your web browser, typically at `http://localhost:3000`.

## Technologies Used

*   **Backend**:
    *   Node.js
    *   Express.js (for API endpoints)
    *   `node-fetch` (for making HTTP requests)
    *   `cheerio` (for server-side HTML parsing)
*   **Frontend**:
    *   HTML5
    *   CSS3
    *   JavaScript (ES6+)
*   **Python (Optional/Alternative)**:
    *   `app.py` provides a Streamlit-based alternative for URL inspection and RAG export, demonstrating similar core functionality using Python libraries like `requests`, `BeautifulSoup4`, `pandas`, `trafilatura`, `extruct`, and `w3lib`.

## Usage

1.  **Inspect a URL**: Enter a URL in the input field and click "Inspect" to fetch and analyze its content.
2.  **Parse Manual HTML**: Alternatively, expand the "Or paste HTML content manually" section, paste your HTML, and click "Parse HTML".
3.  **Select Content**: Use the checkboxes in the "Select Content to Export" section to choose which parts of the extracted data you want to include.
4.  **Choose Export Format**: Select your desired export format (JSON, RAG JSONL, or Plain Text). If choosing RAG JSONL, adjust chunking options as needed.
5.  **Download Data**: Click the "Download" button to save the extracted content to your local machine.
6.  **Crawl a Site**: In the "Site Crawling & Multi-page Selection" section, set your desired crawl depth and max pages, then click "Discover & Crawl Links" to explore linked pages.
7.  **Multi-page Export**: After crawling, select the pages you wish to export from the sitemap tree and download them.
