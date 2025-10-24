// content.js - v1.2 (新增文本选择和功能键录制)

console.log('智能操作录制器 content script已注入。');

// 定义我们感兴趣的功能键列表
const INTERESTING_KEYS = [
  'Enter',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab'
];

/**
 * 为给定的DOM元素生成一个唯一的、稳定的CSS选择器
 * (此函数保持不变)
 */
function getCssSelector(el) {
    // ... (代码与上一版本完全相同)
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + el.id;
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector) nth++;
            }
            if (nth != 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(' > ');
}

/**
 * 捕获常规操作 (click, change)
 * (此函数保持不变)
 */
function captureAction(e) {
  // ... (代码与上一版本完全相同, 包含 devicePixelRatio)
  const target = e.target;
  if (target.id.startsWith('my-recorder-')) return;
  const rect = target.getBoundingClientRect();
  const actionData = {
    type: e.type,
    selector: getCssSelector(target),
    tagName: target.tagName.toLowerCase(),
    value: e.type === 'change' ? target.value : undefined,
    innerText: target.innerText ? target.innerText.trim().slice(0, 200) : '',
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    devicePixelRatio: window.devicePixelRatio || 1
  };
  chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
}

/**
 * 【新增】处理文本选择的函数
 */
function handleSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // 只有当确实选中文本时才记录
  if (selectedText) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect(); // 获取选区的位置和尺寸

    const actionData = {
      type: 'selection',
      selectedText: selectedText,
      // 对于选区，我们没有单一的目标元素，但我们可以记录其父元素
      selector: getCssSelector(range.commonAncestorContainer.parentElement),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      devicePixelRatio: window.devicePixelRatio || 1
    };
    chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
  }
}

/**
 * 【新增】处理功能键按下的函数
 */
function handleKeyPress(e) {
  // 只记录我们感兴趣的功能键
  if (INTERESTING_KEYS.includes(e.key)) {
    const target = e.target;
    const rect = target.getBoundingClientRect();

    const actionData = {
      type: 'keypress',
      key: e.key,
      selector: getCssSelector(target),
      tagName: target.tagName.toLowerCase(),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      devicePixelRatio: window.devicePixelRatio || 1
    };
    chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
  }
}

// 保持原有的监听器
document.addEventListener('click', captureAction, true);
document.addEventListener('change', captureAction, true);

// 【新增】添加新的监听器
document.addEventListener('mouseup', handleSelection, true);
document.addEventListener('keydown', handleKeyPress, true);