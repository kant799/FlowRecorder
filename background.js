// background.js - v1.4 (SPA 导航感知版)

let isRecording = false;
const STORAGE_KEY = 'recordedSteps';

// =================================================================
// 【新增】统一的侦察兵注入函数 (避免代码重复)
// =================================================================
function injectContentScript(tabId, url) {
  // 确认录制正在进行，且URL是我们可以注入的常规网页
  if (isRecording && url && (url.startsWith('http://') || url.startsWith('https://'))) {
    console.log(`[注入] 尝试向 Tab ${tabId} (${url}) 注入侦察兵...`);
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      console.log(`[注入] 侦察兵成功部署到 Tab ${tabId}。`);
    }).catch(err => {
      console.warn(`[注入] 部署侦察兵到 Tab ${tabId} 失败:`, err.message);
    });
  }
}


// =================================================================
// 传感器 1: 监听“推倒重建”式导航 (传统MPA)
// =================================================================
const tabUpdateListener = (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log(`[TabUpdate] 检测到页面完全加载: ${tab.url}`);
    injectContentScript(tabId, tab.url);
  }
};


// =================================================================
// 传感器 2: 监听“室内精装修”式导航 (现代SPA)
// =================================================================
const webNavigationListener = (details) => {
  // 过滤掉子框架(iframe)的导航，我们只关心主页面
  if (details.frameId === 0) {
    console.log(`[WebNavigation] 检测到SPA导航: ${details.url}`);
    injectContentScript(details.tabId, details.url);
  }
};


// =================================================================
// 消息处理和主逻辑
// =================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ... (消息处理 switch 语句保持不变) ...
  switch (message.type) {
    case 'START_RECORDING': handleStartRecording(); break;
    case 'PAUSE_RECORDING': isRecording = false; break;
    case 'END_RECORDING': handleEndRecordingAndShowReport(); break;
    case 'ACTION_RECORDED': if (isRecording) { handleActionRecorded(message.data, sender.tab); } break;
  }
  return true;
});

async function handleStartRecording() {
  isRecording = true;
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  console.log('开始录制... 存储已初始化。');

  // 【修改】同时开启两个传感器
  chrome.tabs.onUpdated.addListener(tabUpdateListener);
  chrome.webNavigation.onHistoryStateUpdated.addListener(webNavigationListener);
  console.log('[传感器] MPA 和 SPA 导航监控已全部开启。');

  // 对当前活动页面进行首次注入
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    injectContentScript(tab.id, tab.url);
  }
}

async function handleEndRecordingAndShowReport() {
  isRecording = false;

  // 【修改】同时关闭两个传感器，节省资源
  chrome.tabs.onUpdated.removeListener(tabUpdateListener);
  chrome.webNavigation.onHistoryStateUpdated.removeListener(webNavigationListener);
  console.log('[传感器] 所有导航监控已关闭。');
  
  chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
}

// handleActionRecorded 函数无需任何改动，它只负责处理到来的数据
async function handleActionRecorded(actionData, tab) {
    // ... (代码与上一版本完全相同)
    if (!tab || !tab.id) return;
    try {
        const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 90 });
        const newStep = {
            action: actionData,
            screenshot: screenshotDataUrl,
            timestamp: new Date().toISOString(),
            url: tab.url,
            title: tab.title
        };
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const currentSteps = result[STORAGE_KEY] || [];
        currentSteps.push(newStep);
        await chrome.storage.local.set({ [STORAGE_KEY]: currentSteps });
        console.log(`✅ Step ${currentSteps.length} saved. Selector: ${actionData.selector}`);
    } catch (error) {
        console.error('Error during step recording:', error);
    }
}