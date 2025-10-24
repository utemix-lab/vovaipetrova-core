import os
import re
from duckduckgo_search import DDGS
import requests

# 📁 Папки
input_folder = "/opt/knowledge-base/DU/НЕЙРОСЕТИ"
output_folder = "/opt/knowledge-base/DU/ИКОНКИ"
os.makedirs(output_folder, exist_ok=True)

# 🔍 Собираем все имена из [[...]] в md-файлах
names = set()

for filename in os.listdir(input_folder):
    if filename.endswith(".md"):
        with open(os.path.join(input_folder, filename), "r", encoding="utf-8") as f:
            lines = f.readlines()
            for line in lines:
                matches = re.findall(r"\[\[([^\]]+)\]\]", line)
                for m in matches:
                    names.add(m.strip())

print(f"📝 Найдено {len(names)} нейросетей/программ для поиска логотипов.")

# 🔥 Ищем и качаем лого
with DDGS() as ddgs:
    for name in names:
        query = f"{name} logo PNG transparent"
        print(f"🔍 Ищу для: {name}")
        results = ddgs.images(query, max_results=1)

        result = results[0] if results else None

        if result:
            img_url = result["image"]
            ext = os.path.splitext(img_url)[-1]
            if len(ext) > 5 or not ext:
                ext = ".png"
            filename = f"{name.replace('.', '_')}{ext}"
            img_path = os.path.join(output_folder, filename)

            try:
                response = requests.get(img_url)
                with open(img_path, "wb") as f:
                    f.write(response.content)
                print(f"✅ Скачал: {img_path}")
            except Exception as e:
                print(f"⚠ Ошибка при скачивании для {name}: {e}")
        else:
            print(f"⚠ Не нашёл картинку для: {name}")

print("🚀 Все лого обработаны.")
