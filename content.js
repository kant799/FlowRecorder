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
  
  // 忽略对插件自身的交互（如果未来有UI的话）
  if (target.id.startsWith('my-recorder-')) return;
  
  const actionData = {
    type: e.type, // 'click' or 'change'
    selector: getCssSelector(target),
    tagName: target.tagName.toLowerCase(),
    value: e.type === 'change' ? target.value : undefined, // 仅在change事件时记录value
    innerText: target.innerText ? target.innerText.trim().slice(0, 200) : '' // 获取文本内容并做截断
  };
  
  // 将捕获到的操作数据发送给background script
  chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
}

// 监听click和change事件
// 使用捕获阶段(true)，可以更早地捕获到事件
document.addEventListener('click', captureAction, true);
document.addEventListener('change', captureAction, true);