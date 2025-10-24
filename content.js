// content.js - 注入到页面中，负责捕获用户操作

console.log('智能操作录制器 content script已注入。');

/**
 * 为给定的DOM元素生成一个唯一的、稳定的CSS选择器
 * @param {Element} el - DOM元素
 * @returns {string} - CSS选择器
 */
function getCssSelector(el) {
  if (!(el instanceof Element)) return;
  const path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break; // ID是唯一的，可以直接跳出循环
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
 * 捕获事件并提取关键信息
 * @param {Event} e - DOM事件对象
 */
function captureAction(e) {
  const target = e.target;

  if (target.id.startsWith('my-recorder-')) return;

  const rect = target.getBoundingClientRect();

  const actionData = {
    type: e.type,
    selector: getCssSelector(target),
    tagName: target.tagName.toLowerCase(),
    value: e.type === 'change' ? target.value : undefined,
    innerText: target.innerText ? target.innerText.trim().slice(0, 200) : '',
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    },
    // 【核心新增】捕获设备像素比
    devicePixelRatio: window.devicePixelRatio || 1
  };

  chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
}

// 监听器保持不变
document.addEventListener('click', captureAction, true);
document.addEventListener('change', captureAction, true);