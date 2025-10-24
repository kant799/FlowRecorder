// content.js - v1.3 (智能滚动录制版)

console.log('智能操作录制器 content script已注入。');

const INTERESTING_KEYS = ['Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];

// =================================================================
// 滚动处理逻辑
// =================================================================
let scrollTimeout;
let isScrolling = false;
let scrollStartPosition = null;
const SCROLL_DEBOUNCE_TIME = 1000; // 1秒内无新滚动，则认为本次滚动结束

function handleScroll(e) {
  // 如果事件的目标是整个窗口或文档，我们才关心
  const target = e.target === document ? document.documentElement : e.target;

  if (!isScrolling) {
    // 滚动开始
    isScrolling = true;
    
    // 记录起始位置
    scrollStartPosition = {
      scrollTop: target.scrollTop,
      scrollLeft: target.scrollLeft
    };
    
    // 请求“大脑”进行第一次截图
    chrome.runtime.sendMessage({
      type: 'ACTION_IN_PROGRESS',
      actionType: 'scroll_start'
    });
  }

  // 防抖处理：如果用户在持续滚动，则重置计时器
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    // 滚动结束
    isScrolling = false;

    // 记录结束位置
    const scrollEndPosition = {
      scrollTop: target.scrollTop,
      scrollLeft: target.scrollLeft
    };

    // 确定滚动方向
    const deltaY = scrollEndPosition.scrollTop - scrollStartPosition.scrollTop;
    const deltaX = scrollEndPosition.scrollLeft - scrollStartPosition.scrollLeft;
    let direction = '';
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
        direction = deltaY > 0 ? 'down' : 'up';
    } else {
        direction = deltaX > 0 ? 'right' : 'left';
    }

    // 打包最终的滚动情报
    const actionData = {
      type: 'scroll',
      selector: getCssSelector(target),
      startPosition: scrollStartPosition,
      endPosition: scrollEndPosition,
      direction: direction,
      devicePixelRatio: window.devicePixelRatio || 1
    };

    // 将完整情报发送给“大脑”，请求第二次截图
    chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });

  }, SCROLL_DEBOUNCE_TIME);
}


// =================================================================
// 其他操作捕获 (保持不变)
// =================================================================

function getCssSelector(el) {
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
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        devicePixelRatio: window.devicePixelRatio || 1
    };
    chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
}

function handleSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const actionData = {
            type: 'selection',
            selectedText: selectedText,
            selector: getCssSelector(range.commonAncestorContainer.parentElement),
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            devicePixelRatio: window.devicePixelRatio || 1
        };
        chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
    }
}

function handleKeyPress(e) {
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

// =================================================================
// 注册所有监听器
// =================================================================
document.addEventListener('click', captureAction, true);
document.addEventListener('change', captureAction, true);
document.addEventListener('mouseup', handleSelection, true);
document.addEventListener('keydown', handleKeyPress, true);
// 【新增】监听滚动事件
document.addEventListener('scroll', handleScroll, true);