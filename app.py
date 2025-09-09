"""
URL Inspector — checkbox extractor with RAG export (single file)

Quickstart:
pip install -U streamlit requests beautifulsoup4 lxml pandas trafilatura extruct w3lib
streamlit run app.py
"""

import streamlit as st
import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import re
import hashlib
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Optional, Any
import trafilatura
import extruct
from w3lib.html import get_base_url
import time

# Page config
st.set_page_config(
    page_title="URL Inspector",
    page_icon="🔍",
    layout="wide"
)

def generate_chunk_id(url: str, chunk_index: int, chunk_text: str) -> str:
    """Generate stable ID for a chunk"""
    content = f"{url}_{chunk_index}_{chunk_text[:50]}"
    return hashlib.md5(content.encode()).hexdigest()[:12]

def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
    """Chunk text by word count with overlap"""
    if not text or not text.strip():
        return []
    
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = ' '.join(words[start:end])
        chunks.append(chunk)
        
        if end >= len(words):
            break
            
        start = end - overlap
        if start < 0:
            start = 0
    
    return chunks

@st.cache_data(ttl=300)  # Cache for 5 minutes
def fetch_and_parse_url(url: str) -> Dict[str, Any]:
    """Fetch URL and extract all content types"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Fetch with redirect handling
        response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
        response.raise_for_status()
        
        final_url = response.url
        content_type = response.headers.get('Content-Type', '').lower()
        
        if 'html' not in content_type:
            return {
                'error': f'Content type {content_type} is not HTML',
                'final_url': final_url,
                'content_type': content_type
            }
        
        html = response.text
        soup = BeautifulSoup(html, 'lxml')
        
        # Extract basic metadata
        title = soup.find('title')
        title_text = title.get_text().strip() if title else ''
        
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        meta_description = meta_desc.get('content', '').strip() if meta_desc else ''
        
        # Extract headings
        headings = {
            'h1': [h.get_text().strip() for h in soup.find_all('h1') if h.get_text().strip()],
            'h2': [h.get_text().strip() for h in soup.find_all('h2') if h.get_text().strip()],
            'h3': [h.get_text().strip() for h in soup.find_all('h3') if h.get_text().strip()]
        }
        
        # Extract main content using trafilatura
        main_content = ''
        try:
            extracted = trafilatura.extract(html, url=final_url)
            if extracted:
                main_content = extracted.strip()
        except Exception:
            pass
        
        # Fallback to stripped page text
        if not main_content:
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            main_content = soup.get_text().strip()
            # Clean up whitespace
            main_content = re.sub(r'\n\s*\n', '\n\n', main_content)
            main_content = re.sub(r' +', ' ', main_content)
        
        # Extract tables using pandas
        tables = {}
        try:
            dfs = pd.read_html(html)
            for i, df in enumerate(dfs):
                if len(df) > 0:  # Only include non-empty tables
                    table_name = f"table_{i+1}"
                    tables[table_name] = df
        except Exception:
            pass
        
        # Extract links
        links = []
        for a in soup.find_all('a', href=True):
            link_text = a.get_text().strip()
            link_url = urljoin(final_url, a['href'])
            if link_text and link_url.startswith(('http://', 'https://')):
                links.append({'text': link_text, 'url': link_url})
        
        # Limit links preview
        links = links[:200]
        
        # Extract structured data
        structured_data = {}
        try:
            base_url = get_base_url(html, final_url)
            data = extruct.extract(html, base_url=base_url)
            structured_data = data
        except Exception:
            pass
        
        return {
            'success': True,
            'final_url': final_url,
            'content_type': content_type,
            'title': title_text,
            'meta_description': meta_description,
            'headings': headings,
            'main_content': main_content,
            'tables': tables,
            'links': links,
            'structured_data': structured_data
        }
        
    except requests.RequestException as e:
        return {'error': f'Request failed: {str(e)}'}
    except Exception as e:
        return {'error': f'Parsing failed: {str(e)}'}

def create_rag_jsonl(data: Dict[str, Any], selected_fields: Dict[str, bool], 
                     chunk_size: int, overlap: int, include_headings: bool) -> str:
    """Create RAG-ready JSONL format"""
    lines = []
    final_url = data['final_url']
    title = data.get('title', '')
    
    # Prepare metadata
    base_metadata = {'source': final_url}
    if include_headings:
        base_metadata.update({
            'h1': data.get('headings', {}).get('h1', []),
            'h2': data.get('headings', {}).get('h2', []),
            'h3': data.get('headings', {}).get('h3', [])
        })
    
    chunk_index = 0
    
    # Add title as separate entry if selected
    if selected_fields.get('title', False) and title:
        metadata = base_metadata.copy()
        metadata['type'] = 'title'
        lines.append({
            'id': generate_chunk_id(final_url, chunk_index, title),
            'title': title,
            'chunk': title,
            'metadata': metadata
        })
        chunk_index += 1
    
    # Add meta description if selected
    if selected_fields.get('meta_description', False) and data.get('meta_description'):
        metadata = base_metadata.copy()
        metadata['type'] = 'description'
        lines.append({
            'id': generate_chunk_id(final_url, chunk_index, data['meta_description']),
            'title': title,
            'chunk': data['meta_description'],
            'metadata': metadata
        })
        chunk_index += 1
    
    # Chunk main content if selected
    if selected_fields.get('main_content', False) and data.get('main_content'):
        chunks = chunk_text(data['main_content'], chunk_size, overlap)
        for chunk in chunks:
            metadata = base_metadata.copy()
            metadata['type'] = 'text'
            lines.append({
                'id': generate_chunk_id(final_url, chunk_index, chunk),
                'title': title,
                'chunk': chunk,
                'metadata': metadata
            })
            chunk_index += 1
    
    # Add selected tables as chunks
    tables = data.get('tables', {})
    for table_name, df in tables.items():
        if selected_fields.get(f'table_{table_name}', False):
            # Convert table to text
            table_text = df.to_csv(index=False)
            chunks = chunk_text(table_text, chunk_size, overlap)
            for chunk in chunks:
                metadata = base_metadata.copy()
                metadata['type'] = 'table'
                metadata['section'] = table_name
                lines.append({
                    'id': generate_chunk_id(final_url, chunk_index, chunk),
                    'title': title,
                    'chunk': chunk,
                    'metadata': metadata
                })
                chunk_index += 1
    
    return '\n'.join(json.dumps(line) for line in lines)

def main():
    st.title("🔍 URL Inspector")
    st.caption("Extract and export content from web pages with flexible formatting options")
    
    # URL Input
    url = st.text_input("Enter URL to inspect:", placeholder="https://example.com")
    
    if st.button("🔍 Inspect", type="primary"):
        if not url:
            st.error("Please enter a URL")
            return
        
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        with st.spinner("Fetching and analyzing content..."):
            result = fetch_and_parse_url(url)
        
        if 'error' in result:
            st.error(f"❌ {result['error']}")
            if 'final_url' in result:
                st.info(f"Final URL: {result['final_url']}")
                st.info(f"Content Type: {result.get('content_type', 'Unknown')}")
            return
        
        # Store result in session state
        st.session_state['result'] = result
        st.success(f"✅ Content extracted from: {result['final_url']}")
    
    # Display extracted content if available
    if 'result' in st.session_state:
        data = st.session_state['result']
        
        st.markdown("---")
        st.subheader("📋 Select Content to Export")
        
        # Selection checkboxes
        selected_fields = {}
        
        # Basic information
        with st.expander("📄 Basic Information", expanded=True):
            col1, col2 = st.columns(2)
            with col1:
                selected_fields['source_url'] = st.checkbox("Source URL", value=True)
                selected_fields['title'] = st.checkbox("Title", value=bool(data.get('title')))
            with col2:
                selected_fields['meta_description'] = st.checkbox("Meta Description", value=bool(data.get('meta_description')))
            
            # Previews
            if data.get('title'):
                st.text_area("Title Preview:", data['title'], height=50, disabled=True)
            if data.get('meta_description'):
                st.text_area("Meta Description Preview:", data['meta_description'], height=50, disabled=True)
        
        # Headings
        headings = data.get('headings', {})
        if any(headings.values()):
            with st.expander("📝 Headings"):
                col1, col2, col3 = st.columns(3)
                with col1:
                    selected_fields['h1'] = st.checkbox(f"H1 ({len(headings.get('h1', []))})", value=bool(headings.get('h1')))
                with col2:
                    selected_fields['h2'] = st.checkbox(f"H2 ({len(headings.get('h2', []))})", value=bool(headings.get('h2')))
                with col3:
                    selected_fields['h3'] = st.checkbox(f"H3 ({len(headings.get('h3', []))})", value=bool(headings.get('h3')))
                
                # Preview first few headings
                for level in ['h1', 'h2', 'h3']:
                    if headings.get(level):
                        preview = headings[level][:5]  # First 5 headings
                        st.write(f"**{level.upper()} Preview:** {', '.join(preview)}")
        
        # Main content
        main_content = data.get('main_content', '')
        if main_content:
            with st.expander("📄 Main Content"):
                selected_fields['main_content'] = st.checkbox("Main Content", value=True)
                preview_length = min(500, len(main_content))
                st.text_area("Content Preview:", main_content[:preview_length] + 
                           ("..." if len(main_content) > preview_length else ""), 
                           height=150, disabled=True)
        
        # Tables
        tables = data.get('tables', {})
        if tables:
            with st.expander("📊 Tables"):
                for table_name, df in tables.items():
                    selected_fields[f'table_{table_name}'] = st.checkbox(
                        f"{table_name} ({len(df)} rows, {len(df.columns)} columns)", 
                        value=True
                    )
                    st.dataframe(df.head(10), use_container_width=True)
        
        # Links
        links = data.get('links', [])
        if links:
            with st.expander("🔗 Links"):
                selected_fields['links'] = st.checkbox(f"Links ({len(links)})", value=False)
                # Preview first 10 links
                preview_links = links[:10]
                for link in preview_links:
                    st.write(f"• [{link['text']}]({link['url']})")
                if len(links) > 10:
                    st.write(f"... and {len(links) - 10} more links")
        
        # Structured data
        structured_data = data.get('structured_data', {})
        if structured_data and any(structured_data.values()):
            with st.expander("🏗️ Structured Data"):
                selected_fields['structured_data'] = st.checkbox("Structured Data", value=False)
                # Show available types
                available_types = [k for k, v in structured_data.items() if v]
                st.write(f"Available: {', '.join(available_types)}")
        
        # Export section
        st.markdown("---")
        st.subheader("📤 Export Options")
        
        export_format = st.radio(
            "Choose export format:",
            ["JSON", "RAG JSONL", "CSV (tables only)"],
            horizontal=True
        )
        
        # RAG JSONL specific options
        if export_format == "RAG JSONL":
            col1, col2, col3 = st.columns(3)
            with col1:
                chunk_size = st.number_input("Chunk Size (words):", min_value=50, max_value=1000, value=300)
            with col2:
                overlap = st.number_input("Overlap (words):", min_value=0, max_value=200, value=50)
            with col3:
                include_headings = st.checkbox("Include headings in metadata", value=True)
        
        # Generate export data
        selected_table_count = sum(1 for k, v in selected_fields.items() if k.startswith('table_') and v)
        
        if export_format == "CSV (tables only)" and selected_table_count != 1:
            st.warning("⚠️ CSV export requires exactly one table to be selected")
        else:
            # Prepare export data
            if export_format == "JSON":
                export_data = {}
                
                if selected_fields.get('source_url'):
                    export_data['source_url'] = data['final_url']
                if selected_fields.get('title'):
                    export_data['title'] = data.get('title', '')
                if selected_fields.get('meta_description'):
                    export_data['meta_description'] = data.get('meta_description', '')
                
                # Headings
                for level in ['h1', 'h2', 'h3']:
                    if selected_fields.get(level):
                        export_data[level] = headings.get(level, [])
                
                if selected_fields.get('main_content'):
                    export_data['main_content'] = data.get('main_content', '')
                
                if selected_fields.get('links'):
                    export_data['links'] = data.get('links', [])
                
                if selected_fields.get('structured_data'):
                    export_data['structured_data'] = data.get('structured_data', {})
                
                # Tables
                selected_tables = {}
                for table_name, df in tables.items():
                    if selected_fields.get(f'table_{table_name}'):
                        selected_tables[table_name] = df.to_dict('records')
                
                if selected_tables:
                    if len(selected_tables) == 1:
                        export_data['table'] = list(selected_tables.values())[0]
                    else:
                        export_data['tables'] = selected_tables
                
                json_str = json.dumps(export_data, indent=2, ensure_ascii=False)
                
                st.download_button(
                    label="📥 Download JSON",
                    data=json_str,
                    file_name=f"url_content_{int(time.time())}.json",
                    mime="application/json"
                )
            
            elif export_format == "RAG JSONL":
                jsonl_str = create_rag_jsonl(data, selected_fields, chunk_size, overlap, include_headings)
                
                st.download_button(
                    label="📥 Download RAG JSONL",
                    data=jsonl_str,
                    file_name=f"rag_content_{int(time.time())}.jsonl",
                    mime="application/jsonl"
                )
            
            elif export_format == "CSV (tables only)":
                # Find the selected table
                selected_table = None
                table_name = None
                for name, df in tables.items():
                    if selected_fields.get(f'table_{name}'):
                        selected_table = df
                        table_name = name
                        break
                
                if selected_table is not None:
                    csv_str = selected_table.to_csv(index=False)
                    
                    st.download_button(
                        label="📥 Download CSV",
                        data=csv_str,
                        file_name=f"{table_name}_{int(time.time())}.csv",
                        mime="text/csv"
                    )
        
        # Usage notes
        st.markdown("---")
        st.caption("💡 **Note:** This tool respects robots.txt and website terms. JS-heavy sites may not extract complete content. For best results, use on content-rich, server-rendered pages.")

if __name__ == "__main__":
    main()