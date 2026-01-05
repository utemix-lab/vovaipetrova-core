#!/usr/bin/env node
/**
 * Скрипт для синхронизации Playbook из Notion в GitHub репозиторий
 * 
 * Использование:
 *   node scripts/sync-playbook-from-notion.mjs [--dry-run]
 * 
 * Требует переменные окружения:
 *   NOTION_TOKEN - токен Notion API
 */

import { Client } from "@notionhq/client";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PAGE_ID = "fee878a9-9503-4df5-9f10-572df92aaf06"; // Single Source Playbook
const PLAYBOOK_PATH = join(REPO_ROOT, "docs", "SINGLE-SOURCE-PLAYBOOK.md");

const DRY_RUN = process.argv.includes("--dry-run");

if (!NOTION_TOKEN) {
  console.error("❌ NOTION_TOKEN не установлен в переменных окружения");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

/**
 * Конвертирует блоки Notion в Markdown
 */
function blocksToMarkdown(blocks) {
  let markdown = "";
  
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        if (block.paragraph?.rich_text?.length > 0) {
          markdown += richTextToMarkdown(block.paragraph.rich_text) + "\n\n";
        } else {
          markdown += "\n";
        }
        break;
        
      case "heading_1":
        markdown += "# " + richTextToMarkdown(block.heading_1.rich_text) + "\n\n";
        break;
        
      case "heading_2":
        markdown += "## " + richTextToMarkdown(block.heading_2.rich_text) + "\n\n";
        break;
        
      case "heading_3":
        markdown += "### " + richTextToMarkdown(block.heading_3.rich_text) + "\n\n";
        break;
        
      case "bulleted_list_item":
        markdown += "- " + richTextToMarkdown(block.bulleted_list_item.rich_text) + "\n";
        break;
        
      case "numbered_list_item":
        markdown += "1. " + richTextToMarkdown(block.numbered_list_item.rich_text) + "\n";
        break;
        
      case "code":
        markdown += "```" + (block.code.language || "") + "\n";
        markdown += richTextToMarkdown(block.code.rich_text) + "\n";
        markdown += "```\n\n";
        break;
        
      case "quote":
        markdown += "> " + richTextToMarkdown(block.quote.rich_text) + "\n\n";
        break;
        
      case "divider":
        markdown += "---\n\n";
        break;
        
      case "toggle":
        markdown += "<details>\n<summary>" + richTextToMarkdown(block.toggle.rich_text) + "</summary>\n\n";
        if (block.children) {
          markdown += blocksToMarkdown(block.children);
        }
        markdown += "</details>\n\n";
        break;
        
      default:
        // Для неизвестных типов блоков просто пропускаем
        break;
    }
    
    // Обрабатываем дочерние блоки (если есть)
    if (block.children && block.children.length > 0) {
      markdown += blocksToMarkdown(block.children);
    }
  }
  
  return markdown;
}

/**
 * Конвертирует rich text Notion в Markdown
 */
function richTextToMarkdown(richText) {
  if (!richText || richText.length === 0) return "";
  
  return richText.map(text => {
    let content = text.plain_text;
    
    // Применяем форматирование
    if (text.annotations) {
      if (text.annotations.bold) content = `**${content}**`;
      if (text.annotations.italic) content = `*${content}*`;
      if (text.annotations.code) content = `\`${content}\``;
      if (text.annotations.strikethrough) content = `~~${content}~~`;
    }
    
    // Обрабатываем ссылки
    if (text.href) {
      content = `[${content}](${text.href})`;
    }
    
    return content;
  }).join("");
}

/**
 * Извлекает front matter из существующего файла
 */
function extractFrontMatter(content) {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontMatterRegex);
  
  if (match) {
    return {
      frontMatter: match[0],
      body: content.slice(match[0].length)
    };
  }
  
  return { frontMatter: null, body: content };
}

/**
 * Обновляет last_edited_time в front matter
 */
function updateFrontMatterTime(frontMatter, lastEditedTime) {
  if (!frontMatter) return frontMatter;
  
  // Ищем существующее поле last_edited_time
  const timeRegex = /^last_edited_time:\s*.*$/m;
  
  if (timeRegex.test(frontMatter)) {
    // Заменяем существующее значение
    return frontMatter.replace(timeRegex, `last_edited_time: "${lastEditedTime}"`);
  } else {
    // Добавляем новое поле перед закрывающим ---
    return frontMatter.replace(/\n---\n$/, `\nlast_edited_time: "${lastEditedTime}"\n---\n`);
  }
}

async function main() {
  try {
    console.log("📖 Получение страницы Playbook из Notion...");
    
    // Получаем страницу
    const page = await notion.pages.retrieve({ page_id: NOTION_PAGE_ID });
    
    // Получаем все блоки страницы
    const blocks = await notion.blocks.children.list({
      block_id: NOTION_PAGE_ID,
    });
    
    // Рекурсивно получаем все дочерние блоки
    async function getAllBlocks(blockList) {
      const allBlocks = [];
      
      for (const block of blockList.results) {
        allBlocks.push(block);
        
        if (block.has_children) {
          const children = await notion.blocks.children.list({
            block_id: block.id,
          });
          const nestedBlocks = await getAllBlocks(children);
          allBlocks.push(...nestedBlocks);
        }
      }
      
      return allBlocks;
    }
    
    const allBlocks = await getAllBlocks(blocks);
    
    // Конвертируем в Markdown
    const markdownBody = blocksToMarkdown(allBlocks);
    
    // Читаем существующий файл для сохранения front matter
    let frontMatter = "";
    if (existsSync(PLAYBOOK_PATH)) {
      const existingContent = readFileSync(PLAYBOOK_PATH, "utf8");
      const extracted = extractFrontMatter(existingContent);
      frontMatter = extracted.frontMatter || "";
    }
    
    // Обновляем last_edited_time
    const lastEditedTime = page.last_edited_time;
    if (frontMatter) {
      frontMatter = updateFrontMatterTime(frontMatter, lastEditedTime);
    } else {
      // Если front matter нет, создаём минимальный
      frontMatter = `---
title: Single Source Playbook — «священный документ» (Notion↔Repo)
slug: single-source-playbook
notion_page_id: "${NOTION_PAGE_ID}"
last_edited_time: "${lastEditedTime}"
---

`;
    }
    
    const fullContent = frontMatter + markdownBody;
    
    if (DRY_RUN) {
      console.log("\n[DRY-RUN] Содержимое, которое будет записано:\n");
      console.log(fullContent.substring(0, 500) + "...\n");
      console.log(`✅ [DRY-RUN] Файл не был изменён`);
    } else {
      writeFileSync(PLAYBOOK_PATH, fullContent, "utf8");
      console.log(`✅ Playbook синхронизирован: ${PLAYBOOK_PATH}`);
      console.log(`   Последнее обновление в Notion: ${lastEditedTime}`);
    }
    
  } catch (error) {
    console.error("❌ Ошибка при синхронизации:", error.message);
    if (error.code === "object_not_found") {
      console.error("   Страница не найдена в Notion. Проверьте NOTION_PAGE_ID.");
    }
    process.exit(1);
  }
}

main();

