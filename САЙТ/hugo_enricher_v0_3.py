import requests
from bs4 import BeautifulSoup
import os
import json
from urllib.parse import urlparse, urljoin

def download_image(url, save_path):
    try:
        r = requests.get(url, stream=True, timeout=10)
        if r.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in r.iter_content(1024):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"⚠️ Image download failed: {e}")
    return False

def enrich_external_site(external_url, model_id):
    result = {
        "external_url": external_url,
        "site_title": "",
        "site_description": "",
        "site_images": [],
        "site_text_excerpt": ""
    }

    try:
        r = requests.get(external_url, timeout=10)
        r.raise_for_status()
    except Exception as e:
        result["error"] = f"External site error: {e}"
        return result

    soup = BeautifulSoup(r.text, "html.parser")

    # Title and description
    result["site_title"] = soup.title.string.strip() if soup.title else ""
    desc_tag = soup.find("meta", attrs={"name": "description"})
    if desc_tag:
        result["site_description"] = desc_tag.get("content", "").strip()

    # Collect images (up to 5)
    os.makedirs(f"output/assets/{model_id}", exist_ok=True)
    img_tags = soup.find_all("img")
    downloaded = 0
    for img in img_tags:
        if img.get("src") and downloaded < 5:
            src = img["src"]
            if not src.startswith("http"):
                src = urljoin(external_url, src)
            filename = f"site_image_{downloaded+1}.jpg"
            save_path = f"output/assets/{model_id}/{filename}"
            if download_image(src, save_path):
                result["site_images"].append(f"./assets/{model_id}/{filename}")
                downloaded += 1

    # Extract text from body
    all_text = soup.get_text(separator=" ", strip=True)
    result["site_text_excerpt"] = all_text[:1000] + "..."

    return result

def enrich():
    model_id = "hunyuan3d"
    enriched_file = f"output/enriched_{model_id}.json"

    if not os.path.exists(enriched_file):
        print(f"❌ No JSON found for {model_id}")
        return

    with open(enriched_file, "r", encoding="utf-8") as f:
        base_data = json.load(f)

    external_links = base_data.get("external_links", [])
    target_url = None
    for link in external_links:
        if "github.io" in link or "hunyuan" in link:
            target_url = link
            break

    if not target_url:
        print("❌ No valid external site found.")
        return

    print(f"🌐 Visiting external site: {target_url}")
    ext_data = enrich_external_site(target_url, model_id)

    # Merge and update
    base_data["external_site_data"] = ext_data

    # Save updated JSON
    with open(enriched_file, "w", encoding="utf-8") as f:
        json.dump(base_data, f, ensure_ascii=False, indent=2)

    # Append to Markdown
    md_path = f"output/enriched_{model_id}.md"
    with open(md_path, "a", encoding="utf-8") as f:
        f.write("\n\n---\n")
        f.write(f"## 🌐 Внешний сайт: {ext_data['external_url']}\n")
        if ext_data.get("site_title"):
            f.write(f"**Заголовок:** {ext_data['site_title']}\n\n")
        if ext_data.get("site_description"):
            f.write(f"**Описание:** {ext_data['site_description']}\n\n")
        if ext_data.get("site_text_excerpt"):
            f.write(f"**Фрагмент текста:**\n{ext_data['site_text_excerpt']}\n\n")
        if ext_data.get("site_images"):
            f.write("**Превью:**\n")
            for img_path in ext_data["site_images"]:
                f.write(f"![preview]({img_path})\n")

    print("✅ Внешний сайт обогащён.")

if __name__ == "__main__":
    enrich()
