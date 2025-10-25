// content.js
// 内容脚本，负责在网页中捕获用户操作并发送给后台脚本

console.log('智能操作录制器 content script已注入。');

// 需要记录的特殊按键
const INTERESTING_KEYS = ['Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];

// =================================================================
// 滚动处理逻辑
// =================================================================

// 滚动相关变量
let scrollTimeout; // 滚动防抖计时器
let isScrolling = false; // 滚动状态标志
let scrollStartPosition = null; // 滚动开始位置
const SCROLL_DEBOUNCE_TIME = 500; // 防抖时间：500毫秒内无新滚动，则认为本次滚动结束

/**
 * 处理滚动事件：实现智能滚动录制功能
 * 采用防抖机制，在滚动停止后记录完整的滚动信息
 * @param {Event} e - 滚动事件对象
 */
function handleScroll(e) {
    // 确定滚动目标：如果是文档对象，则使用根元素
    const target = e.target === document ? document.documentElement : e.target;

    // 滚动开始处理
    if (!isScrolling) {
        isScrolling = true;
        
        // 记录滚动开始时的位置
        scrollStartPosition = {
            scrollTop: target.scrollTop,
            scrollLeft: target.scrollLeft
        };
        
        // 通知后台脚本开始处理滚动，准备第一次截图
        chrome.runtime.sendMessage({
            type: 'ACTION_IN_PROGRESS',
            actionType: 'scroll_start'
        });
    }

    // 防抖处理：重置计时器，等待滚动停止
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        // 滚动结束处理
        isScrolling = false;

        // 记录滚动结束时的位置
        const scrollEndPosition = {
            scrollTop: target.scrollTop,
            scrollLeft: target.scrollLeft
        };

        // 计算滚动方向
        const deltaY = scrollEndPosition.scrollTop - scrollStartPosition.scrollTop;
        const deltaX = scrollEndPosition.scrollLeft - scrollStartPosition.scrollLeft;
        let direction = '';
        
        // 根据主要滚动轴确定方向
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            direction = deltaY > 0 ? 'down' : 'up';
        } else {
            direction = deltaX > 0 ? 'right' : 'left';
        }

        // 构建滚动操作数据
        const actionData = {
            type: 'scroll',
            selector: getCssSelector(target),
            startPosition: scrollStartPosition,
            endPosition: scrollEndPosition,
            direction: direction,
            devicePixelRatio: window.devicePixelRatio || 1
        };

        // 发送完整的滚动信息给后台脚本，请求第二次截图
        chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });

    }, SCROLL_DEBOUNCE_TIME);
}

// =================================================================
// 其他操作捕获功能
// =================================================================

/**
 * 生成元素的CSS选择器路径
 * 用于唯一标识页面中的元素，便于后续回放时定位
 * @param {Element} el - 目标元素
 * @returns {string} CSS选择器路径
 */
function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            // 优先使用ID选择器（最精确）
            selector += '#' + el.id;
            path.unshift(selector);
            break;
        } else {
            // 使用类型和位置选择器
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
 * 捕获点击和变化事件
 * 记录用户的基本交互操作
 * @param {Event} e - 事件对象
 */
function captureAction(e) {
    const target = e.target;
    
    // 忽略录制器自身的元素（避免循环录制）
    if (target.id && target.id.startsWith('my-recorder-')) return;
    
    const rect = target.getBoundingClientRect();
    const actionData = {
        type: e.type,
        selector: getCssSelector(target),
        tagName: target.tagName.toLowerCase(),
        value: e.type === 'change' ? target.value : undefined, // 仅对变化事件记录值
        innerText: target.innerText ? target.innerText.trim().slice(0, 200) : '', // 限制文本长度
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        devicePixelRatio: window.devicePixelRatio || 1 // 记录设备像素比用于坐标转换
    };
    chrome.runtime.sendMessage({ type: 'ACTION_RECORDED', data: actionData });
}

/**
 * 处理文本选择事件
 * 记录用户选择的文本内容
 */
function handleSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // 仅在有选中文本时记录
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

/**
 * 处理特殊按键事件
 * 仅记录预定义的重要按键
 * @param {KeyboardEvent} e - 键盘事件对象
 */
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
// 注册事件监听器
// =================================================================

// 使用捕获阶段确保能监听到所有事件
document.addEventListener('click', captureAction, true);        // 点击事件
document.addEventListener('change', captureAction, true);      // 表单变化事件
document.addEventListener('mouseup', handleSelection, true);   // 文本选择事件
document.addEventListener('keydown', handleKeyPress, true);    // 按键事件
// 【新增】监听滚动事件 - 支持智能滚动录制
document.addEventListener('scroll', handleScroll, true);
