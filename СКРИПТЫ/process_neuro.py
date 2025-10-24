import os
import re

def snake_case(s):
    return s.replace(".", "_").replace(" ", "_")

def process_line(line):
    page_match = re.search(r'\[\[([^\]]+)\]\]', line)
    link_match = re.search(r'\[([^\]]+)\]\((https?://[^\)]+)\)', line)

    if page_match and link_match:
        page_name = page_match.group(1)
        tag = "#" + snake_case(page_name)
        if tag not in line:
            return re.sub(r'(\[[^\]]+\]\(https?://[^\)]+\))', r'\1 ' + tag, line)
    return line

# 📁 путь к твоей папке на сервере
input_folder = "/opt/knowledge-base/DU/НЕЙРОСЕТИ"

for filename in os.listdir(input_folder):
    input_path = os.path.join(input_folder, filename)

    if os.path.isfile(input_path) and filename.endswith(".md"):
        with open(input_path, "r", encoding="utf-8") as f_in:
            lines = f_in.readlines()

        with open(input_path, "w", encoding="utf-8") as f_out:
            for line in lines:
                f_out.write(process_line(line) + "\n")


print("✅ Готово! Все файлы перезаписаны в той же папке.")
