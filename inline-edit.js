// inline-edit.js - v1.0
// 为报告页面提供动态内联编辑功能

(function() {
    // 确保在 DOM 加载完成后再执行脚本
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('steps-container');

        // 获取主标题内容
        const mainTitle = document.querySelector('.main-title');

        if (!container) {
            console.error('未能找到 #steps-container 元素，内联编辑功能无法初始化。');
            return;
        }
        if (!mainTitle) {
            console.error('未能找到 .main-title 元素，内联编辑功能无法初始化。');
            return;
        }

        let originalContent = ''; // 用于存储开始编辑前的原始内容，方便用户取消

        /**
         * 将指定元素转换为可编辑状态
         * @param {HTMLElement} element - 需要变为可编辑的段落元素
         */
        function enterEditMode(element) {
            // 避免重复为正在编辑的元素添加事件
            if (element.isContentEditable) {
                return;
            }

            // 存储原始 HTML 内容，以便按 Escape 键时恢复
            originalContent = element.innerHTML;

            // 开启 contentEditable 模式
            element.contentEditable = true;
            element.classList.add('is-editing'); // 添加样式钩子

            // 自动聚焦并选中所有文本
            element.focus();
            // 使用 setTimeout 确保选中在聚焦后执行
            setTimeout(() => {
                document.execCommand('selectAll', false, null);
            });

            // 绑定“失焦”和“按键”事件监听
            element.addEventListener('blur', exitEditMode);
            element.addEventListener('keydown', handleKeyDown);
        }

        /**
         * 退出编辑状态，并保存更改
         * @param {Event} event - 通常是 blur 事件对象
         */
        function exitEditMode(event) {
            const element = event.target;

            // 关闭 contentEditable 模式
            element.contentEditable = false;
            element.classList.remove('is-editing');

            // 添加同步 document.title 数据的逻辑
            if (element.tagName === 'H1' && element.classList.contains('main-title')) {
                // 使用 innerText.trim() 获取纯文本内容，去除多余空格
                const newTitle = element.innerText.trim();
                if (newTitle) { // 确保标题不为空
                    document.title = newTitle;
                } else {
                    // 如果标题为空，恢复原始内容
                    element.innerHTML = originalContent;
                    document.title = originalContent.replace(/<[^>]+>/g, '').trim(); // 从原始内容提取纯文本
                }
            }
            // 关键：移除事件监听，防止内存泄漏和重复绑定
            element.removeEventListener('blur', exitEditMode);
            element.removeEventListener('keydown', handleKeyDown);
        }
        /**
         * 处理编辑时的键盘事件
         * @param {KeyboardEvent} event - 键盘事件对象
         */
        function handleKeyDown(event) {
            const element = event.target;

            // 当用户按下 Enter 键 (非 Shift+Enter) 时，保存并退出编辑
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // 阻止默认的换行行为
                element.blur(); // 触发 blur 事件，从而调用 exitEditMode 保存内容
            }

            // 当用户按下 Escape 键时，恢复原始内容并退出编辑
            if (event.key === 'Escape') {
                element.innerHTML = originalContent; // 恢复原始内容
                element.blur(); // 触发 blur 事件以退出编辑状态
            }
        }

        // --- 事件委托与绑定 ---

        //步骤描述锻炼的编辑---事件委托--用于处理双击事件
        if (container) {
            container.addEventListener('dblclick', (event) => {
                // 使用 .closest() 查找被双击的元素是否是或其内部是 .step-details 下的 p 标签
                const targetParagraph = event.target.closest('.step-details p');
                if (targetParagraph) {
                    enterEditMode(targetParagraph);
                }
            });
        }
        // 主标题的编辑---使用直接绑定
        if (mainTitle) {
            mainTitle.addEventListener('dblclick', () => {
                enterEditMode(mainTitle);
            });
            // 为主标题添加样式钩子
            const titleStyle = document.createElement('style');
            titleStyle.textContent = `
                .main-title.is-editing {
                    background-color: #fffcee;
                    outline: 2px solid #bdecff;
                    border-radius: 4px;
                    cursor: text;
                    padding: 4px;
                }
            `;
            document.head.appendChild(titleStyle);
        }
    });
})();