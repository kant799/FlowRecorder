// popup.js - 弹出窗口脚本
// 负责与用户交互并向后台脚本发送录制控制指令

/**
 * 页面加载完成后初始化事件监听器
 */
document.addEventListener('DOMContentLoaded', () => {
    // 获取页面中的控制按钮元素
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const endButton = document.getElementById('endButton');

    /**
     * 点击"开始录制"按钮的事件处理
     * 启动新的录制会话
     */
    startButton.addEventListener('click', () => {
        // 向后台脚本发送开始录制指令
        chrome.runtime.sendMessage({ type: 'START_RECORDING' });
        console.log('Sent: START_RECORDING');
        
        // 发送消息后自动关闭弹出窗口，提升用户体验
        window.close();
    });

    /**
     * 点击"暂停录制"按钮的事件处理
     * 暂停当前录制但不结束会话
     */
    pauseButton.addEventListener('click', () => {
        // 向后台脚本发送暂停录制指令
        chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
        console.log('Sent: PAUSE_RECORDING');
        
        // 发送消息后自动关闭弹出窗口
        window.close();
    });

    /**
     * 点击"结束录制"按钮的事件处理
     * 结束当前录制会话并生成报告
     */
    endButton.addEventListener('click', () => {
        // 向后台脚本发送结束录制指令
        chrome.runtime.sendMessage({ type: 'END_RECORDING' });
        console.log('Sent: END_RECORDING');
        
        // 发送消息后自动关闭弹出窗口
        window.close();
    });
});
