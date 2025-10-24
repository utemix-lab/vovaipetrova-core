import os

def make_dirs(base="/home/Hugo"):
    subdirs = [
        "scripts",
        "output",
        "output/assets",
        "logs",
        "config",
        "venv"  # виртуальное окружение будет тут, если нужно
    ]

    for sub in subdirs:
        path = os.path.join(base, sub)
        os.makedirs(path, exist_ok=True)
        print(f"📁 Created: {path}")

if __name__ == "__main__":
    make_dirs()
