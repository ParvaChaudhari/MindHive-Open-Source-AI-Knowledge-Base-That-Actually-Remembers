import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict

class PDFService:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            length_function=len,
            is_separator_regex=False,
        )

    async def extract_text_from_bytes(self, file_bytes: bytes) -> List[Dict]:
        """Extracts text from PDF bytes and returns a list of page contents."""
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        for page_num, page in enumerate(doc):
            text = page.get_text()
            if text.strip():
                pages.append({
                    "page_number": page_num + 1,
                    "content": text
                })
        return pages

    def chunk_text(self, pages: List[Dict]) -> List[Dict]:
        """Splits page text into smaller chunks for embedding."""
        all_chunks = []
        for page in pages:
            chunks = self.text_splitter.split_text(page["content"])
            for chunk in chunks:
                all_chunks.append({
                    "content": chunk,
                    "page_number": page["page_number"]
                })
        return all_chunks
