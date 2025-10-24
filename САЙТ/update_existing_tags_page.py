
import os
import re

tags_page_path = "/opt/knowledge-base/DU/ТЕГИ.md"
vault_root = "/opt/knowledge-base"

def find_tags_in_file(filepath):
    tags = set()
    with open(filepath, "r", encoding="utf-8") as file:
        content = file.read()
        tags.update(re.findall(r'#([A-Za-zА-Яа-я0-9_]+)', content))
    return tags

def build_vault_tags(root_path):
    tag_set = set()
    for dirpath, _, filenames in os.walk(root_path):
        for f in filenames:
            if f.endswith(".md"):
                full_path = os.path.join(dirpath, f)
                file_tags = find_tags_in_file(full_path)
                tag_set.update(file_tags)
    return tag_set

def find_existing_tags_in_page(page_path):
    existing_tags = set()
    if os.path.exists(page_path):
        with open(page_path, "r", encoding="utf-8") as file:
            for line in file:
                match = re.match(r'##\s+#([A-Za-zА-Яа-я0-9_]+)', line)
                if match:
                    existing_tags.add(match.group(1))
    return existing_tags

if __name__ == "__main__":
    vault_tags = build_vault_tags(vault_root)
    existing_tags = find_existing_tags_in_page(tags_page_path)

    new_tags = sorted(vault_tags - existing_tags, key=lambda s: s.lower())

    if new_tags:
        with open(tags_page_path, "a", encoding="utf-8") as out_file:
            out_file.write("\n\n# === Добавленные теги ===\n\n")
            for tag in new_tags:
                out_file.write(f"## #{tag}\n")
                out_file.write("*(описание будет добавлено позже)*\n\n")

        print(f"Добавлены {len(new_tags)} новых тегов в ТЕГИ.md")
    else:
        print("Все теги уже присутствуют в ТЕГИ.md — новых нет.")
