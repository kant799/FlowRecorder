// export-report.js - v1.1
// 为报告页面提供 HTML 和页面快照等格式的导出功能

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const mainButton = document.getElementById('share-btn');
        if (!mainButton) return;

        // --- 1. 创建并管理导出菜单 ---

        // 创建菜单容器
        const menu = document.createElement('div');
        menu.id = 'export-menu';
        menu.style.display = 'none'; // 默认隐藏
        menu.innerHTML = `
            <button data-format="snapshot" id="download-report-btn">导出为图片</button>
            <button data-format="html">导出为 HTML</button>
            <!-- <button data-format="markdown" disabled>导出为 Markdown (即将推出)</button> -->
        `;
        document.body.appendChild(menu);

        // 为菜单添加样式
        const menuStyle = document.createElement('style');
        menuStyle.textContent = `
            #export-menu {
                position: absolute;
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 8px;
                z-index: 1000;
                display: none; /* JS会控制显示 */
            }
            #export-menu button {
                display: block;
                width: 100%;
                background: none;
                border: none;
                padding: 10px 15px;
                text-align: left;
                cursor: pointer;
                border-radius: 4px;
                font-size: 15px;
                white-space: nowrap;
            }
            #export-menu button:hover {
                background-color: #f0f0f0;
            }
            #export-menu button:disabled {
                color: #999;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(menuStyle);

        // 主按钮点击事件：显示/隐藏菜单
        mainButton.addEventListener('click', (event) => {
            event.stopPropagation(); // 阻止事件冒泡，避免触发document的click事件
            const rect = mainButton.getBoundingClientRect();
            menu.style.display = 'block';
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.left = `${rect.right - menu.offsetWidth}px`;
        });

        // 点击页面其他地方隐藏菜单
        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
        
        // 【修改】菜单点击事件，增加对 snapshot 的处理
        menu.addEventListener('click', (event) => {
            const format = event.target.dataset.format;
            if (format === 'html') {
                generateAndDownloadHtml();
            } else if (format === 'snapshot') {
                generateAndDownloadSnapshot();
            }
            // 未来可在这里添加 'markdown' 的处理逻辑
            
            // 点击后自动隐藏菜单
            menu.style.display = 'none';
        });

        // --- 2. 核心导出逻辑 ---

        /**
         * 【新增】生成并下载页面快照图片
         * 调用 snapdom 库恢复原有功能
         */
        async function generateAndDownloadSnapshot() {
            const targetElement = document.querySelector('.container');
            if (!targetElement) {
                alert('无法找到需要截图的内容区域！');
                return;
            }
             if (typeof snapdom === 'undefined') {
                alert('截图库 (snapdom.js) 未加载，无法生成快照。');
                return;
            }

            console.log('开始生成页面快照...');
            
            try {
                // 调用 snapdom 库生成 canvas
                const canvas = await snapdom.toCanvas(targetElement, {
                    // 这里可以添加一些 snapdom 的配置项，例如背景色、缩放等
                    backgroundColor: '#f4f7f9' // 与 body 背景色一致
                });

                // 将 canvas 转换为 data URL
                const dataUrl = canvas.toDataURL('image/png');
                
                // 触发下载
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `页面快照-${timestamp}.png`;
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                console.log(`快照 ${filename} 已开始下载。`);

            } catch (error) {
                console.error('生成页面快照失败:', error);
                alert('生成页面快照时发生错误，请查看控制台获取更多信息。');
            }
        }


        /**
         * 生成并下载包含完整内容的HTML文件
         */
        async function generateAndDownloadHtml() {
            console.log('开始生成HTML文件...');

            const contentContainer = document.querySelector('.container').cloneNode(true);
            const originalCanvases = document.querySelectorAll('.step-card canvas');
            const clonedCanvases = contentContainer.querySelectorAll('.step-card canvas');

            clonedCanvases.forEach((clonedCanvas, index) => {
                const originalCanvas = originalCanvases[index];
                if (originalCanvas) {
                    try {
                        const dataUrl = originalCanvas.toDataURL('image/png');
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.style.maxWidth = '100%';
                        img.style.border = '1px solid #e0e0e0';
                        img.style.borderRadius = '8px';
                        clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
                    } catch (error) {
                        console.error('转换Canvas到图片时出错:', error);
                        const errorMsg = document.createElement('p');
                        errorMsg.textContent = '[截图转换失败]';
                        errorMsg.style.color = 'red';
                        clonedCanvas.parentNode.replaceChild(errorMsg, clonedCanvas);
                    }
                }
            });

            const styles = document.querySelector('style').innerHTML;
            const title = document.querySelector('title').innerText;

            const htmlContent = `
                <!DOCTYPE html>
                <html lang="zh">
                <head>
                  <meta charset="UTF-8">
                  <title>${title}</title>
                  <style>
                    ${styles}
                    /* 导出文件专属样式：移除不必要的按钮 */
                    .delete-btn, .download-btn, #export-menu { display: none !important; }
                  </style>
                </head>
                <body>
                  ${contentContainer.outerHTML}
                </body>
                </html>
            `;

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadFile(`操作指南-${timestamp}.html`, htmlContent, 'text/html');
        }

        /**
         * 辅助函数：触发文件下载 (用于文本内容)
         * @param {string} filename - 下载的文件名
         * @param {string} content - 文件内容
         * @param {string} mimeType - 文件的MIME类型
         */
        function downloadFile(filename, content, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`文件 ${filename} 已开始下载。`);
        }
    });
})();