
import os
import re

def unify_tag(tag):
    # разбиваем по подчеркиваниям или по смене регистра
    parts = re.split(r'_+|(?<=[a-zа-я])(?=[A-ZА-Я])', tag)
    return '_'.join([p.capitalize() for p in parts if p])

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as file:
        content = file.read()

    def replacer(match):
        raw_tag = match.group(1)
        unified = unify_tag(raw_tag)
        return f"#{unified}"

    new_content = re.sub(r'#([A-Za-zА-Яа-я0-9_-]+)', replacer, content)

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(new_content)

if __name__ == "__main__":
    root_folder = "/opt/knowledge-base"
    for dirpath, _, filenames in os.walk(root_folder):
        for f in filenames:
            if f.endswith(".md"):
                full_path = os.path.join(dirpath, f)
                process_file(full_path)

    print("Все теги во всех файлах унифицированы в Title_Underscore формате.")
