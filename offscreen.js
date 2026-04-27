const textarea = document.createElement('textarea');
textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
document.body.appendChild(textarea);

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'offscreen-port') return;
  port.onMessage.addListener(async message => {
    if (message.type !== 'COPY_TO_CLIPBOARD') return;
    try {
      textarea.value = message.text;
      textarea.select();
      const ok = document.execCommand('copy');
      if (ok) {
        console.log('✅ Текст скопирован в системный буфер (execCommand):', message.text);
      } else {
        console.warn('⚠️ execCommand вернул false, пробуем clipboard API');
        await navigator.clipboard.writeText(message.text);
        console.log('✅ Текст скопирован в системный буфер (clipboard API):', message.text);
      }
    } catch (e) {
      console.error('❌ Ошибка копирования:', e);
      try {
        await navigator.clipboard.writeText(message.text);
        console.log('✅ Текст скопирован в системный буфер (fallback):', message.text);
      } catch (_) {}
    }
  });
});
