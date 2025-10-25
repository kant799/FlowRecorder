// snap-init.js
// 快照功能初始化脚本，负责生成和下载操作报告的快照

/**
 * 页面加载完成后初始化快照下载功能
 */
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-report-btn');
    const containerToCapture = document.querySelector('.container');

    // 检查必要的DOM元素是否存在
    if (downloadBtn && containerToCapture) {
        /**
         * 下载按钮点击事件处理
         * 使用 snapdom 库生成容器快照并下载为图片
         */
        downloadBtn.addEventListener('click', async () => {
            // 更新按钮状态，防止重复点击
            downloadBtn.textContent = '正在生成快照...';
            downloadBtn.disabled = true;

            try {
                // 使用 snapdom 库生成快照，设置缩放比例为1.5以获得更高清图片
                const result = await snapdom(containerToCapture, { scale: 1.5 });
                
                // 生成带时间戳的文件名
                const now = new Date();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');

                // 拼接日期格式：月-日-时-分-秒
                const timestamp = `${month}-${day}-${hours}-${minutes}-${seconds}`;
                
                // 下载生成的快照图片，格式为PNG
                await result.download({ 
                    format: 'png', 
                    filename: `操作步骤报告_${timestamp}.png` 
                });
            } catch (error) {
                // 错误处理：记录错误并提示用户
                console.error('生成快照失败:', error);
                alert('抱歉，生成快照时遇到问题，请稍后重试。');
            } finally {
                // 无论成功与否，都恢复按钮状态
                downloadBtn.textContent = '下载快照';
                downloadBtn.disabled = false;
            }
        });
    } else {
        // 如果必要的DOM元素不存在，记录警告信息
        console.warn('未找到下载按钮或截图容器，功能无法初始化。');
    }
});
