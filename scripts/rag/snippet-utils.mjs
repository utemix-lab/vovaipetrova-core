#!/usr/bin/env node
/**
 * Утилиты для работы со сниппетами в RAG
 *
 * Функции для извлечения безопасных сниппетов с подсветкой токенов запроса
 * и правильными границами контекста.
 */

/**
 * Находит позиции токенов запроса в тексте (без учета регистра)
 */
function findQueryTokens(text, queryTokens) {
  const normalizedText = text.toLowerCase();
  const positions = [];

  for (const token of queryTokens) {
    const normalizedToken = token.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = normalizedText.indexOf(normalizedToken, startIndex);
      if (index === -1) break;

      positions.push({
        start: index,
        end: index + normalizedToken.length,
        token: token,
      });

      startIndex = index + 1;
    }
  }

  return positions.sort((a, b) => a.start - b.start);
}

/**
 * Извлекает безопасный сниппет из текста с подсветкой токенов запроса
 */
export function extractSnippet(text, query, options = {}) {
  const {
    maxLength = 300,
    contextBefore = 50,
    contextAfter = 50,
    highlight = true,
  } = options;

  if (!text || !query) {
    return {
      snippet: text ? text.substring(0, maxLength) : '',
      highlighted: false,
    };
  }

  // Токенизация запроса (простые слова)
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2); // Игнорируем очень короткие токены

  if (queryTokens.length === 0) {
    return {
      snippet: text.substring(0, maxLength) + (text.length > maxLength ? '...' : ''),
      highlighted: false,
    };
  }

  // Находим позиции токенов
  const positions = findQueryTokens(text, queryTokens);

  if (positions.length === 0) {
    // Если токены не найдены, возвращаем начало текста
    return {
      snippet: text.substring(0, maxLength) + (text.length > maxLength ? '...' : ''),
      highlighted: false,
    };
  }

  // Определяем область сниппета вокруг первого найденного токена
  const firstMatch = positions[0];
  let snippetStart = Math.max(0, firstMatch.start - contextBefore);
  let snippetEnd = Math.min(text.length, firstMatch.end + contextAfter);

  // Расширяем до maxLength, если возможно
  const currentLength = snippetEnd - snippetStart;
  if (currentLength < maxLength) {
    const extra = maxLength - currentLength;
    snippetStart = Math.max(0, snippetStart - Math.floor(extra / 2));
    snippetEnd = Math.min(text.length, snippetEnd + Math.ceil(extra / 2));
  }

  // Обрезаем до maxLength
  if (snippetEnd - snippetStart > maxLength) {
    snippetEnd = snippetStart + maxLength;
  }

  // Находим безопасные границы (не режем слова)
  snippetStart = findWordBoundary(text, snippetStart, 'backward');
  snippetEnd = findWordBoundary(text, snippetEnd, 'forward');

  let snippet = text.substring(snippetStart, snippetEnd);

  // Добавляем многоточие, если текст обрезан
  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < text.length) snippet = snippet + '...';

  // Подсветка токенов запроса
  if (highlight) {
    for (const token of queryTokens) {
      const regex = new RegExp(`(${token})`, 'gi');
      snippet = snippet.replace(regex, '**$1**');
    }
  }

  return {
    snippet,
    highlighted: highlight && positions.length > 0,
    matchPosition: firstMatch.start - snippetStart,
  };
}

/**
 * Находит границу слова (не режет слова пополам)
 */
function findWordBoundary(text, position, direction) {
  if (direction === 'backward') {
    // Ищем начало слова назад
    for (let i = position; i >= 0; i--) {
      if (i === 0) return 0;
      const char = text[i];
      if (/\s/.test(char) || /[.,!?;:]/.test(char)) {
        return i + 1;
      }
    }
    return 0;
  } else {
    // Ищем конец слова вперед
    for (let i = position; i < text.length; i++) {
      if (i === text.length - 1) return text.length;
      const char = text[i];
      if (/\s/.test(char) || /[.,!?;:]/.test(char)) {
        return i;
      }
    }
    return text.length;
  }
}

/**
 * Проверяет, не рвёт ли сниппет разметку Markdown
 */
export function validateMarkdownIntegrity(snippet) {
  // Подсчитываем открывающие и закрывающие теги/символы
  const openBrackets = (snippet.match(/\[/g) || []).length;
  const closeBrackets = (snippet.match(/\]/g) || []).length;
  const openParens = (snippet.match(/\(/g) || []).length;
  const closeParens = (snippet.match(/\)/g) || []).length;
  const codeBlocks = (snippet.match(/```/g) || []).length;

  // Проверяем баланс
  const issues = [];
  if (openBrackets !== closeBrackets) {
    issues.push('Несбалансированные квадратные скобки');
  }
  if (openParens !== closeParens) {
    issues.push('Несбалансированные круглые скобки');
  }
  if (codeBlocks % 2 !== 0) {
    issues.push('Незакрытый code block');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
