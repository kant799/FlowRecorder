// popup.js - 负责与用户交互并向background发送指令

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const endButton = document.getElementById('endButton');

  // 点击“开始录制”按钮
  startButton.addEventListener('click', () => {
    // 向background script发送开始录制的指令
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    console.log('Sent: START_RECORDING');
    window.close(); // 发送消息后自动关闭popup，提升用户体验
  });

  // 点击“暂停录制”按钮 (当前里程碑仅发送消息)
  pauseButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
    console.log('Sent: PAUSE_RECORDING');
    window.close();
  });

  // 点击“结束录制”按钮 (当前里程碑仅发送消息)
  endButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'END_RECORDING' });
    console.log('Sent: END_RECORDING');
    window.close();
  });
});