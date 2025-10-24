import os

icons_folder = "/opt/knowledge-base/DU/ИКОНКИ"
output_file = os.path.join(icons_folder, "index.html")

# Находим все картинки PNG/JPG/JPEG
files = [f for f in os.listdir(icons_folder)
         if f.lower().endswith((".png", ".jpg", ".jpeg"))]

# Генерируем HTML
with open(output_file, "w", encoding="utf-8") as f:
    f.write("<html><head><title>Галерея иконок</title></head><body>\n")
    f.write("<h1>Галерея иконок</h1>\n")
    for img in files:
        f.write(f'<div style="display:inline-block; margin:10px; text-align:center;">')
        f.write(f'<img src="{img}" style="max-height:150px;"><br>{img}</div>\n')
    f.write("</body></html>")

print(f"✅ Галерея создана: {output_file}")
