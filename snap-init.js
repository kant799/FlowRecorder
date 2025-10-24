document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-report-btn');
    const containerToCapture = document.querySelector('.container');

    if (downloadBtn && containerToCapture) {
        downloadBtn.addEventListener('click', async () => {
            downloadBtn.textContent = '正在生成快照...';
            downloadBtn.disabled = true;

            try {
                const result = await snapdom(containerToCapture, { scale: 2 });
                // 生成带时间戳的文件名
                const now = new Date();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const secondes = String(now.getSeconds()).padStart(2, '0');

                // 拼接日期格式
                const timestamp = `${month}-${day}-${hours}-${minutes}-${secondes}`;
                // 最终文件名
                await result.download({ format: 'jpg', filename: `操作步骤报告_${timestamp}.jpg` });
            } catch (error) {
                console.error('生成快照失败:', error);
                alert('抱歉，生成快照时遇到问题，请稍后重试。');
            } finally {
                downloadBtn.textContent = '下载报告快照';
                downloadBtn.disabled = false;
            }
        });
    } else {
        console.warn('未找到下载按钮或截图容器，功能无法初始化。');
    }
});