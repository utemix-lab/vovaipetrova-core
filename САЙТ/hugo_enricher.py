import requests
from bs4 import BeautifulSoup
import re
import json
import os

def enrich_hf_space(space_url):
    result = {
        "source": space_url,
        "external_links": [],
        "meta": {},
        "detected_tags": [],
    }

    try:
        print(f"Fetching: {space_url}")
        response = requests.get(space_url, timeout=10)
        response.raise_for_status()
    except Exception as e:
        result["error"] = str(e)
        return result

    soup = BeautifulSoup(response.text, "html.parser")

    # External links
    external_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("http") and "huggingface.co" not in href:
            external_links.append(href)
    result["external_links"] = list(set(external_links))

    # Meta info
    result["meta"]["title"] = soup.title.string.strip() if soup.title else ""

    for meta in soup.find_all("meta"):
        if meta.get("property") == "og:title":
            result["meta"]["og_title"] = meta.get("content", "")
        elif meta.get("property") == "og:description":
            result["meta"]["og_description"] = meta.get("content", "")
        elif meta.get("name") == "description":
            result["meta"]["meta_description"] = meta.get("content", "")

    # Keyword detection
    text_content = soup.get_text().lower()
    keywords = ["3d", "reconstruction", "mesh", "image-to-3d", "glb", "upload image", "textured", "render"]
    detected_tags = [kw for kw in keywords if kw in text_content]
    result["detected_tags"] = list(set(detected_tags))

    return result

if __name__ == "__main__":
    # Example usage
    url = "https://huggingface.co/spaces/tencent/Hunyuan3D-2"
    enriched_data = enrich_hf_space(url)

    # Save result
    os.makedirs("output", exist_ok=True)
    with open("output/enriched_hunyuan3d.json", "w", encoding="utf-8") as f:
        json.dump(enriched_data, f, ensure_ascii=False, indent=2)

    print("✅ Done! Saved to output/enriched_hunyuan3d.json")
