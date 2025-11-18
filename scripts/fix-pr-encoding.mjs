#!/usr/bin/env node
/**
 * Скрипт для исправления моджибаке в описании GitHub PR
 * Использование:
 *   node scripts/fix-pr-encoding.mjs <pr-number> [--check-only]
 *   node scripts/fix-pr-encoding.mjs <pr-number> --body-file <path>
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = join(__dirname, '../../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    return env;
  } catch (err) {
    return {};
  }
}

function detectMojibake(text) {
  // Проверяем на типичные признаки моджибаке (кириллица, отображающаяся как последовательность символов)
  const mojibakePatterns = [
    /Р§С‚Рѕ|РўРµС…|Р¤Р°Р№|РЅР°РІР»РµРЅ|РґРѕР±Р°РІР»РµРЅ|СЃРёРЅС…СЂРѕРЅРёР·РёСЂСѓСЋС‚СЃСЏ/i,
    /вњ|С„РёР»СЊС‚СЂ|РєРѕРїРёСЂРѕРІР°РЅРёСЏ|СЂРµР°Р»РёР·РѕРІР°РЅ/i,
    /СѓР»СѓС‡С€РµРЅ|РІС‹СЂР°РІРЅРёРІР°РЅРёРµ|РѕС‚СЃС‚СѓРї/i
  ];
  
  return mojibakePatterns.some(pattern => pattern.test(text));
}

function getPRBody(prNumber, repo = 'utemix-lab/vovaipetrova-core') {
  try {
    const output = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json body --jq '.body'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return output.trim();
  } catch (error) {
    console.error(`Ошибка при получении PR #${prNumber}:`, error.message);
    process.exit(1);
  }
}

function updatePRBody(prNumber, bodyText, repo = 'utemix-lab/vovaipetrova-core') {
  const env = loadEnv();
  const token = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('Ошибка: GITHUB_TOKEN не найден в .env или переменных окружения');
    process.exit(1);
  }
  
  // Сохраняем тело PR во временный файл для Python скрипта
  const tempFile = join(__dirname, `../../tmp-pr-body-${prNumber}.txt`);
  writeFileSync(tempFile, bodyText, 'utf-8');
  
  // Создаем отдельный Python скрипт для надежной работы с UTF-8
  const pythonScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os
import urllib.request
import sys

token = "${token}"
url = "https://api.github.com/repos/${repo}/pulls/${prNumber}"

with open(r"${tempFile.replace(/\\/g, '/')}", "r", encoding="utf-8") as f:
    body_text = f.read()

data = {
    "body": body_text
}

json_data = json.dumps(data, ensure_ascii=False).encode('utf-8')

req = urllib.request.Request(
    url,
    data=json_data,
    headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json; charset=utf-8'
    },
    method='PATCH'
)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("SUCCESS")
except urllib.error.HTTPError as e:
    error_body = e.read().decode('utf-8')
    print(f"ERROR: {e.code}")
    print(error_body)
    sys.exit(1)
`;
  
  const pythonFile = join(__dirname, `../../tmp-fix-pr-${prNumber}.py`);
  writeFileSync(pythonFile, pythonScript, 'utf-8');
  
  try {
    const result = execSync(`python "${pythonFile}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Удаляем временные файлы
    try {
      unlinkSync(tempFile);
      unlinkSync(pythonFile);
    } catch (e) {
      // Игнорируем ошибки удаления
    }
    
    if (result.includes('SUCCESS')) {
      return true;
    } else {
      console.error('Ошибка при обновлении PR:', result);
      return false;
    }
  } catch (error) {
    console.error('Ошибка выполнения Python скрипта:', error.message);
    // Удаляем временные файлы даже при ошибке
    try {
      unlinkSync(tempFile);
      unlinkSync(pythonFile);
    } catch (e) {
      // Игнорируем ошибки удаления
    }
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const prNumber = args[0];
  const checkOnly = args.includes('--check-only');
  const bodyFileIndex = args.indexOf('--body-file');
  const bodyFile = bodyFileIndex !== -1 ? args[bodyFileIndex + 1] : null;
  
  if (!prNumber) {
    console.log('Использование:');
    console.log('  node scripts/fix-pr-encoding.mjs <pr-number> [--check-only]');
    console.log('  node scripts/fix-pr-encoding.mjs <pr-number> --body-file <path>');
    process.exit(1);
  }
  
  let bodyText;
  
  if (bodyFile) {
    try {
      bodyText = readFileSync(bodyFile, 'utf-8');
      console.log(`📄 Используется файл: ${bodyFile}`);
    } catch (error) {
      console.error(`Ошибка чтения файла ${bodyFile}:`, error.message);
      process.exit(1);
    }
  } else {
    console.log(`📥 Получение описания PR #${prNumber}...`);
    bodyText = getPRBody(prNumber);
  }
  
  const hasMojibake = detectMojibake(bodyText);
  
  if (hasMojibake) {
    console.log(`⚠️  Обнаружен моджибаке в PR #${prNumber}`);
    
    if (checkOnly) {
      console.log('Режим проверки: моджибаке найден, но исправление не выполнено');
      process.exit(1);
    }
    
    console.log('🔧 Исправление моджибаке...');
    
    if (updatePRBody(prNumber, bodyText)) {
      console.log(`✅ PR #${prNumber} успешно обновлен`);
    } else {
      console.error(`❌ Не удалось обновить PR #${prNumber}`);
      process.exit(1);
    }
  } else {
    console.log(`✅ Моджибаке не обнаружен в PR #${prNumber}`);
    if (!checkOnly && bodyFile) {
      // Если передан файл без моджибаке, все равно обновим PR
      console.log('📤 Обновление PR с корректным текстом...');
      if (updatePRBody(prNumber, bodyText)) {
        console.log(`✅ PR #${prNumber} успешно обновлен`);
      } else {
        console.error(`❌ Не удалось обновить PR #${prNumber}`);
        process.exit(1);
      }
    }
    process.exit(0);
  }
}

main();
