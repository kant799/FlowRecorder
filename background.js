// background.js - 插件的事件和逻辑处理中心 (Service Worker)

// 监听来自popup或content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording(sender);
      break;
    case 'PAUSE_RECORDING':
      console.log('Received: PAUSE_RECORDING');
      // 后续将在这里实现暂停逻辑
      break;
    case 'END_RECORDING':
      console.log('Received: END_RECORDING');
      // 后续将在这里实现结束和数据处理逻辑
      break;
    case 'ACTION_RECORDED':
      handleActionRecorded(message.data, sender);
      break;
    default:
      console.warn('Received unknown message type:', message.type);
  }

  // 返回true表示我们将异步地发送响应（如果需要的话）
  return true; 
});

/**
 * 处理开始录制的逻辑
 */
async function handleStartRecording(sender) {
  console.log('Received: START_RECORDING');
  
  // 获取当前活动的标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    console.log(`Injecting content script into tab: ${tab.id}`);
    // 使用 scripting API 向当前页面注入我们的“侦察兵”
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      console.log('Content script injected successfully.');
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  } else {
    console.error('No active tab found.');
  }
}

/**
 * 处理从content script发来的已记录操作
 * @param {object} actionData - 记录的操作数据
 * @param {object} sender - 消息发送者的信息
 */
function handleActionRecorded(actionData, sender) {
  console.log('===================================');
  console.log('✅ Action Recorded from:', sender.tab.url);
  console.log('-----------------------------------');
  console.log('  - Type:', actionData.type);
  console.log('  - Selector:', actionData.selector);
  console.log('  - Tag:', actionData.tagName);
  if (actionData.type === 'change') {
    console.log('  - Value:', actionData.value);
  }
  if (actionData.innerText) {
    console.log('  - Text:', actionData.innerText);
  }
  console.log('===================================\n');
}

console.log('Background service worker started.');