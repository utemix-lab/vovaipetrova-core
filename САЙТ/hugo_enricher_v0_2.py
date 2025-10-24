import requests
from bs4 import BeautifulSoup
import re
import os
import json
from urllib.parse import urlparse

def get_first_image_url(soup, base_url):
    # 1. Try to find og:image
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        return og_image["content"]

    # 2. Fallback to first <img>
    img = soup.find("img")
    if img and img.get("src"):
        src = img["src"]
        if src.startswith("http"):
            return src
        else:
            parsed_base = urlparse(base_url)
            return f"{parsed_base.scheme}://{parsed_base.netloc}{src}"
    return None

def download_image(img_url, save_path):
    try:
        r = requests.get(img_url, stream=True, timeout=10)
        if r.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in r.iter_content(1024):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"Failed to download image: {e}")
    return False

def enrich_single_model(hf_url, model_id):
    result = {
        "source": hf_url,
        "external_links": [],
        "meta": {},
        "detected_tags": [],
        "image_saved": False
    }

    try:
        print(f"Fetching: {hf_url}")
        response = requests.get(hf_url, timeout=10)
        response.raise_for_status()
    except Exception as e:
        result["error"] = str(e)
        return result

    soup = BeautifulSoup(response.text, "html.parser")

    # Collect external links
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("http") and "huggingface.co" not in href:
            result["external_links"].append(href)
    result["external_links"] = list(set(result["external_links"]))

    # Meta
    result["meta"]["title"] = soup.title.string.strip() if soup.title else ""
    for meta in soup.find_all("meta"):
        if meta.get("property") == "og:title":
            result["meta"]["og_title"] = meta.get("content", "")
        elif meta.get("property") == "og:description":
            result["meta"]["og_description"] = meta.get("content", "")
        elif meta.get("name") == "description":
            result["meta"]["meta_description"] = meta.get("content", "")

    # Keyword tagging
    text_content = soup.get_text().lower()
    keywords = ["3d", "reconstruction", "mesh", "image-to-3d", "glb", "upload image", "textured", "render"]
    detected_tags = [kw for kw in keywords if kw in text_content]
    result["detected_tags"] = list(set(detected_tags))

    # Try to get preview image
    img_url = get_first_image_url(soup, hf_url)
    if img_url:
        os.makedirs(f"output/assets/{model_id}", exist_ok=True)
        save_path = f"output/assets/{model_id}/preview.jpg"
        if download_image(img_url, save_path):
            result["image_saved"] = True
            result["image_path"] = save_path
            result["image_url"] = img_url

    # Save JSON
    os.makedirs("output", exist_ok=True)
    with open(f"output/enriched_{model_id}.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # Save Markdown
    md = f"# {result['meta'].get('og_title') or result['meta'].get('title') or model_id}\n\n"
    md += f"**Источник:** [HuggingFace]({hf_url})\n\n"
    if result['detected_tags']:
        md += f"**Теги:** {', '.join(result['detected_tags'])}\n\n"
    if result['meta'].get('og_description') or result['meta'].get('meta_description'):
        md += f"## Описание\n{result['meta'].get('og_description') or result['meta'].get('meta_description')}\n\n"
    if result['external_links']:
        md += f"## Внешние ссылки\n"
        for link in result['external_links']:
            md += f"- {link}\n"
    if result.get("image_path"):
        md += f"\n![preview](./assets/{model_id}/preview.jpg)\n"

    with open(f"output/enriched_{model_id}.md", "w", encoding="utf-8") as f:
        f.write(md)

    print(f"✅ {model_id} enriched.")

if __name__ == "__main__":
    # Тестовая модель
    hf_url = "https://huggingface.co/spaces/tencent/Hunyuan3D-2"
    model_id = "hunyuan3d"
    enrich_single_model(hf_url, model_id)
