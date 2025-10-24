// background.js - v1.2 (职责分离版)

let isRecording = false;
const STORAGE_KEY = 'recordedSteps';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ... (switch 语句和大部分逻辑保持不变) ...
  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording(); 
      break;
    case 'END_RECORDING':
      // 【修改】调用新的结束函数
      handleEndRecordingAndShowReport();
      break;
    case 'ACTION_RECORDED':
      if (isRecording) {
        handleActionRecorded(message.data, sender.tab);
      }
      break;
    // ...
  }
  return true;
});

// ... (handleStartRecording 函数保持不变) ...

/**
 * 【新】处理结束录制并打开报告页面的逻辑
 */
async function handleEndRecordingAndShowReport() {
    console.log('Received: END_RECORDING');
    isRecording = false;
    
    const result = await chrome.storage.local.get(STORAGE_KEY);
    console.log('Recording finished. Opening report page...');
    
    // 【核心】使用 chrome.tabs.create 打开我们的报告页面
    // chrome.runtime.getURL 会返回插件内文件的完整、可访问的URL
    chrome.tabs.create({
      url: chrome.runtime.getURL('report.html')
    });
}


/**
 * 处理记录操作，现在只存储原始数据
 * @param {object} actionData - 包含坐标的记录数据
 * @param {object} tab - 操作发生的标签页对象
 */
async function handleActionRecorded(actionData, tab) {
  if (!tab || !tab.id) return;

  try {
    // 1. 截图，获取原始图片
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 90
    });

    // 2. 创建步骤对象，现在直接包含原始截图和action(内含rect)
    const newStep = {
      action: actionData, // actionData 中已经包含了 rect
      screenshot: screenshotDataUrl, // 存储未经处理的原始截图
      timestamp: new Date().toISOString(),
      url: tab.url,
      title: tab.title
    };

    // 3. 存储
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const currentSteps = result[STORAGE_KEY] || [];
    currentSteps.push(newStep);
    await chrome.storage.local.set({ [STORAGE_KEY]: currentSteps });

    console.log(`✅ Step ${currentSteps.length} (with rect) saved. Selector: ${actionData.selector}`);

  } catch (error) {
    console.error('Error during step recording:', error);
  }
}

// ... (其他函数，如 handleStartRecording, 保持上个版本即可) ...
async function handleStartRecording() {
  console.log('Received: START_RECORDING');
  isRecording = true;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    console.error('No active tab found to start recording.');
    isRecording = false;
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  console.log('Storage initialized for new recording session.');
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    console.log('Content script injected successfully.');
  } catch (error) {
    console.error(`Failed to inject content script into tab ${tab.id}:`, error);
    isRecording = false;
  }
}
console.log('Background service worker started.');