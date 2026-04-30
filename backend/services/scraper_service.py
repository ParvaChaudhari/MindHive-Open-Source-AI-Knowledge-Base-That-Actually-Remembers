import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from typing import List, Dict
import re

class ScraperService:
    def scrape_web_url(self, url: str) -> Dict:
        """Scrapes text content from a web URL."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text
            text = soup.get_text(separator=' ')
            
            # Basic cleanup
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Get title
            title = soup.title.string if soup.title else url
            
            return {
                "title": title.strip(),
                "content": clean_text,
                "url": url
            }
        except Exception as e:
            print(f"Error scraping web URL: {e}")
            raise e

    def get_youtube_transcript(self, url: str) -> Dict:
        video_id = None
        try:
            video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
            if not video_id_match:
                raise ValueError("Invalid YouTube URL")

            video_id = video_id_match.group(1)

            # Best-effort: get a nicer title even if transcript fails.
            title = f"YouTube Video ({video_id})"
            try:
                oembed = requests.get(
                    "https://www.youtube.com/oembed",
                    params={"url": url, "format": "json"},
                    timeout=10,
                )
                if oembed.ok:
                    title = (oembed.json().get("title") or title).strip()
            except Exception:
                pass

            ytt = YouTubeTranscriptApi()
            transcript = ytt.fetch(video_id)

            full_text = " ".join([snippet.text for snippet in transcript])
            if not full_text.strip():
                return {
                    "title": title,
                    "content": "",
                    "url": url,
                    "error": "Transcript empty or unavailable"
                }

            return {
                "title": title,
                "content": full_text,
                "url": url
            }

        except Exception as e:
            msg = str(e)
            lowered = msg.lower()

            # Collapse extremely long library error dumps into a user-friendly message.
            if (
                "youtube is blocking requests" in lowered
                or "ip has been blocked" in lowered
                or "could not retrieve a transcript for the video" in lowered
                or "requestblocked" in lowered
                or "ipblocked" in lowered
                or "no element found" in lowered
            ):
                msg = "YouTube transcript unavailable (requests blocked). Try a different network (VPN/residential), wait a bit, or use a different video."

            print(f"Error fetching YouTube transcript: {msg}")

            return {
                "title": f"YouTube Video ({video_id})" if video_id else "YouTube Video",
                "content": "",
                "url": url,
                "error": msg
            }