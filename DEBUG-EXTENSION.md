# Диагностика проблемы с расширением

## Проблема
Функция `autoCopyDeliveryData` не определена (`undefined`), хотя файл `content.js` содержит её определение.

## Возможные причины

### 1. Расширение не загружено
Проверьте в консоли браузера (F12) на странице PlayerOk:

```javascript
// Проверить, загружены ли другие функции из content.js
typeof createPanel
typeof showMiniStatus
typeof insertTextIntoChat
```

Если все возвращают `undefined`, значит **весь content.js не загружен**.

### 2. Ошибка при загрузке content.js
Откройте `chrome://extensions/` и проверьте:
- Есть ли красная кнопка "Ошибки" у расширения?
- Если да, нажмите и посмотрите ошибки

### 3. Файл content.js не обновился
Возможно, браузер кэшировал старую версию файла.

**Решение:**
1. Откройте `chrome://extensions/`
2. Включите "Режим разработчика" (Developer mode) в правом верхнем углу
3. Нажмите "Удалить" (Remove) для расширения
4. Нажмите "Загрузить распакованное расширение" (Load unpacked)
5. Выберите папку с расширением

### 4. Manifest.json не включает content.js
Проверили - manifest.json правильный, content.js включён.

## Пошаговая диагностика

### Шаг 1: Проверить загрузку других функций
В консоли на странице PlayerOk выполните:

```javascript
console.log('createPanel:', typeof createPanel);
console.log('showMiniStatus:', typeof showMiniStatus);
console.log('insertTextIntoChat:', typeof insertTextIntoChat);
console.log('autoCopyDeliveryData:', typeof autoCopyDeliveryData);
```

**Если все `undefined`** → content.js не загружен вообще → переходите к Шагу 2

**Если некоторые `function`** → content.js загружен частично → переходите к Шагу 3

### Шаг 2: Проверить ошибки расширения
1. Откройте `chrome://extensions/`
2. Найдите "Отдел Продаж - Распределение"
3. Посмотрите, есть ли кнопка "Ошибки" (красная)
4. Если есть, нажмите и скопируйте текст ошибок

### Шаг 3: Полная переустановка расширения
1. Откройте `chrome://extensions/`
2. Включите "Режим разработчика" (Developer mode)
3. Нажмите "Удалить" для расширения
4. Нажмите "Загрузить распакованное расширение"
5. Выберите папку: `${WORKSPACE_PATH}`
6. Перезагрузите страницу PlayerOk
7. Проверьте снова: `typeof autoCopyDeliveryData`

### Шаг 4: Проверить путь к расширению
Убедитесь, что вы загружаете расширение из правильной папки, где находятся обновлённые файлы.

В консоли выполните:

```javascript
// Это покажет, откуда загружен content.js
chrome.runtime.getManifest()
```

## Временное решение

Пока расширение не работает, можно вручную скопировать функцию в консоль:

```javascript
function autoCopyDeliveryData() {
  if (!location.href.includes('/deal/')) return;
  if (document.visibilityState !== 'visible') return;
  
  const autoCopyEnabled = localStorage.getItem('dist_autocopy_enabled');
  if (autoCopyEnabled === 'false') return;

  let poluchenieBlock = null;
  const allElements = document.querySelectorAll('div, span, h2, h3, h4, p');
  for (const el of allElements) {
    if (el.closest('[id^="dist-"]')) continue;
    const ownText = el.textContent.trim();
    if (ownText.includes('Получение') && ownText.length < 40 && el.offsetParent !== null) {
      let container = el.parentElement;
      for (let i = 0; i < 5; i++) {
        if (!container || container === document.body) break;
        const containerText = container.innerText || "";
        if (containerText.includes('Получение') && 
            (containerText.includes('Показать') || containerText.includes('Скрыть') || container.querySelector('svg'))) {
          poluchenieBlock = container;
          break;
        }
        container = container.parentElement;
      }
      if (poluchenieBlock) break;
    }
  }

  if (!poluchenieBlock) return;

  let clickedShow = false;
  poluchenieBlock.querySelectorAll('div, span, a, button').forEach(el => {
    const t = el.textContent.trim();
    if (t === 'Показать' && el.offsetParent !== null && el.children.length === 0) {
      el.click();
      clickedShow = true;
    }
  });
  if (clickedShow) return;

  const blockText = poluchenieBlock.innerText || "";
  const lines = blockText.split('\n').map(l => l.trim()).filter(Boolean);
  const foundValues = [];

  const labels = [
    'id игрока', 'игровой id', 'player id', 'user id', 'uid', 
    'zone id', 'id сервера', 'server id', 'сервер',
    'username', 'юзернейм', 'telegram username', '@username', 'имя пользователя', 'введите @username'
  ];
  const skipWords = ['получение', 'показать', 'скрыть', 'комментарий'];

  const pageText = document.body.innerText.toLowerCase();
  const isGenshinFamily = 
    pageText.includes('genshin') || pageText.includes('геншин') ||
    pageText.includes('honkai') || pageText.includes('хонкай') ||
    pageText.includes('zenless') || pageText.includes('зенлесс');

  let grabNext = false;
  for (const line of lines) {
    const low = line.toLowerCase();

    if (skipWords.some(w => low === w)) continue;

    const isRegionLabel = ['регион', 'region'].some(lbl => 
      low === lbl || low === lbl + ':' || low.startsWith(lbl + ' ') || low.startsWith(lbl + ':')
    );
    const isServerLabel = low === 'сервер' || low === 'сервер:' || low.startsWith('сервер ') || low.startsWith('сервер:');
    
    if (isGenshinFamily && (isRegionLabel || isServerLabel)) {
      grabNext = false;
      continue;
    }

    if (grabNext) {
      if (/^\d{3,}$/.test(line) || /^@?[A-Za-z0-9\-_]{4,}$/.test(line)) {
        foundValues.push(line);
      }
      grabNext = false;
      continue;
    }

    if (labels.some(lbl => low === lbl || low === lbl + ':' || low.startsWith(lbl + ' ') || low.startsWith(lbl + ':'))) {
      let cleaned = line;
      labels.forEach(lbl => {
        cleaned = cleaned.replace(new RegExp('^' + lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':?\\s*', 'i'), '').trim();
      });
      if (cleaned && (/^\d{3,}$/.test(cleaned) || /^@?[A-Za-z0-9\-_]{4,}$/.test(cleaned))) {
        foundValues.push(cleaned);
      } else {
        grabNext = true;
      }
      continue;
    }

    if (/^\d{5,}$/.test(line)) {
      foundValues.push(line);
    }
  }

  if (foundValues.length > 0) {
    const hasKeys = foundValues.some(v => /[A-Za-z0-9]+-[A-Za-z0-9]+/.test(v));
    const hasUsernames = foundValues.some(v => /^@?[A-Za-z0-9_-]{4,}$/.test(v) && !/^\d+$/.test(v));
    
    let valuesToCopy = foundValues;
    
    if (hasKeys || hasUsernames) {
      valuesToCopy = foundValues.filter(v => {
        if (/[A-Za-z0-9]+-[A-Za-z0-9]+/.test(v)) return true;
        if (/^@?[A-Za-z0-9_-]{4,}$/.test(v) && /[A-Za-z]/.test(v)) return true;
        return false;
      });
    }
    
    const textToCopy = valuesToCopy.join(' ');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      console.log("✅ Скопировано:", textToCopy);
      alert("✅ Скопировано: " + textToCopy);
    }).catch(() => {
      console.log("❌ Ошибка копирования");
    });
  } else {
    console.log("❌ Значения не найдены");
  }
}

// Вызвать функцию
autoCopyDeliveryData();
```

Скопируйте весь этот код в консоль и нажмите Enter. Это должно скопировать username.

## Следующие шаги

После того как вы выполните диагностику, сообщите:
1. Результат проверки других функций (Шаг 1)
2. Есть ли ошибки в расширении (Шаг 2)
3. Помогла ли переустановка (Шаг 3)
4. Сработало ли временное решение (ручное копирование функции)
