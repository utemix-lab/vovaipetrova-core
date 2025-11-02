#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${1:-$PWD}"

EXPORT_ZIP="${2:-/tmp/notion_[export.zip](http://export.zip)}"

EXPORT_DIR="${3:-/tmp/notion_export}"

ROOT_PAGE="Вова и Петрова"

if [ ! -f "$EXPORT_ZIP" ]; then

echo "Не найден ZIP экспорт Notion: $EXPORT_ZIP" >&2; exit 1

fi

rm -rf "$EXPORT_DIR" && mkdir -p "$EXPORT_DIR"

unzip -q "$EXPORT_ZIP" -d "$EXPORT_DIR"

mkdir -p "$REPO_DIR/docs/project" "$REPO_DIR/docs/think-tank" "$REPO_DIR/docs/kb" "$REPO_DIR/docs/portfolio" "$REPO_DIR/docs/nav" "$REPO_DIR/scripts"

rsync -a "$EXPORT_DIR/$ROOT_PAGE/Описание — литературная версия"/ "$REPO_DIR/docs/project/" || true

rsync -a "$EXPORT_DIR/$ROOT_PAGE/Think Tank — компактное ядро"/ "$REPO_DIR/docs/think-tank/" || true

rsync -a "$EXPORT_DIR/$ROOT_PAGE/База знаний"/ "$REPO_DIR/docs/kb/" || true

rsync -a "$EXPORT_DIR/$ROOT_PAGE/Портфолио — корень"/ "$REPO_DIR/docs/portfolio/" || true

rsync -a "$EXPORT_DIR/$ROOT_PAGE/Навигация (пользовательская)"/ "$REPO_DIR/docs/nav/" || true

echo "Готово: файлы разложены в docs/*"
