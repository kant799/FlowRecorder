// background.js - v1.6 (最终快照版)

// Service Worker 启动时检查录制状态并设置正确的图标
chrome.runtime.onStartup.addListener(checkAndSetIcon);
chrome.runtime.onInstalled.addListener(checkAndSetIcon);

async function checkAndSetIcon() {
    const data = await chrome.storage.local.get('isRecording'); // 假设您也将 isRecording 状态存入了 storage
    const recordingState = data.isRecording || false;

    const iconPaths = recordingState ? {
        "16": "icons/recording-16.png",
        "32": "icons/recording-32.png",
        "48": "icons/recording-48.png",
        "128": "icons/recording-128.png"
    } : {
        "16": "icons/default-16.png",
        "32": "icons/default-32.png",
        "48": "icons/default-48.png",
        "128": "icons/default-128.png"
    };

    chrome.action.setIcon({ path: iconPaths });
}

// 别忘了在开始/结束录制时，也要更新 storage 中的 isRecording 状态
// case 'START_RECORDING':
//   chrome.storage.local.set({ isRecording: true });
//
// case 'END_RECORDING':
//   chrome.storage.local.set({ isRecording: false });

let isRecording = false;
const STORAGE_KEY = 'recordedSteps';
let tempScrollStartScreenshot = null;

// 注入脚本的辅助函数 (保持不变)
function injectContentScript(tabId, url) {
    if (isRecording && url && (url.startsWith('http://') || url.startsWith('https://'))) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).catch(err => {
            console.warn(`[注入] 部署侦察兵到 Tab ${tabId} 失败:`, err.message);
        });
    }
}

// 导航监听器 (保持不变)
const tabUpdateListener = (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        injectContentScript(tabId, tab.url);
    }
};
const webNavigationListener = (details) => {
    if (details.frameId === 0) {
        injectContentScript(details.tabId, details.url);
    }
};

// 消息处理器 (保持不变)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING':
      chrome.storage.local.set({ isRecording: true });
      handleStartRecording();
      isRecording = true;
      chrome.storage.local.set({ recordedSteps: [] });

      // 新增图标切换为录制中状态
      chrome.action.setIcon({
        path: {
          "16": "icons/recording16.png",
          "48": "icons/recording48.png",
          "36": "icons/recording36.png",
          "128": "icons/recording128.png"
        }
      });
      break;
    case 'PAUSE_RECORDING':
      isRecording = false;
      break;
    case 'END_RECORDING':
      chrome.storage.local.set({ isRecording: false });
      handleEndRecordingAndShowReport(); 
      isRecording = false;

      // 恢复图标为默认状态
      chrome.action.setIcon({
        path: {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "36": "icons/icon36.png",
          "128": "icons/icon128.png"
        }
      });
      break;
    case 'ACTION_IN_PROGRESS':
      if (isRecording && message.actionType === 'scroll_start') {
        handleScrollStart(sender.tab);
      }
      break;
    case 'ACTION_RECORDED':
      if (isRecording) {
        handleActionRecorded(message.data, sender.tab);
      }
      break;
  }
  return true;
});


// =================================================================
// 【核心修改】结束录制并添加最终快照
// =================================================================
async function handleEndRecordingAndShowReport() {
    console.log('Received: END_RECORDING');
    if (!isRecording) return; // 防止重复点击
    isRecording = false;

    // 1. 关闭所有监控，节省资源
    chrome.tabs.onUpdated.removeListener(tabUpdateListener);
    chrome.webNavigation.onHistoryStateUpdated.removeListener(webNavigationListener);
    console.log('[传感器] 所有导航监控已关闭。');

    // 2. 主动获取当前标签页以进行最后一次截图
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
        try {
            console.log('捕获最终状态截图...');
            const finalScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'jpeg',
                quality: 90
            });

            // 3. 创建一个特殊的“最终状态”步骤对象
            const finalStep = {
                action: {
                    type: 'final_state', // 自定义一个类型
                    selector: 'N/A'
                },
                screenshot: finalScreenshot,
                timestamp: new Date().toISOString(),
                url: tab.url,
                title: tab.title
            };

            // 4. 将这个最终步骤追加到存储中
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const currentSteps = result[STORAGE_KEY] || [];
            currentSteps.push(finalStep);
            await chrome.storage.local.set({ [STORAGE_KEY]: currentSteps });

            console.log('✅ 最终状态快照已保存。');

        } catch(error) {
            console.error('捕获最终状态截图失败:', error);
        }
    } else {
        console.warn('未找到活动标签页来捕获最终快照。');
    }
    
    // 5. 所有操作完成后，打开报告页面
    console.log('录制结束，正在打开报告页面...');
    chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
}


// 其他主要功能函数保持不变
async function handleStartRecording() {
    isRecording = true;
    tempScrollStartScreenshot = null;
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    console.log('开始录制...');
    chrome.tabs.onUpdated.addListener(tabUpdateListener);
    chrome.webNavigation.onHistoryStateUpdated.addListener(webNavigationListener);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        injectContentScript(tab.id, tab.url);
    }
}

async function handleScrollStart(tab) {
    if (!tab || !tab.id) return;
    try {
        tempScrollStartScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 90
        });
    } catch (error) {
        console.error('捕获滚动开始截图失败:', error);
        tempScrollStartScreenshot = null;
    }
}

async function handleActionRecorded(actionData, tab) {
    if (!tab || !tab.id) return;
    try {
        const endScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 90
        });

        let newStep;

        if (actionData.type === 'scroll') {
            if (tempScrollStartScreenshot) {
                newStep = {
                    action: actionData,
                    screenshot_start: tempScrollStartScreenshot,
                    screenshot_end: endScreenshot,
                    timestamp: new Date().toISOString(),
                    url: tab.url,
                    title: tab.title
                };
                tempScrollStartScreenshot = null;
            } else {
                 newStep = {
                    action: actionData,
                    screenshot_end: endScreenshot,
                    timestamp: new Date().toISOString(),
                    url: tab.url,
                    title: tab.title
                };
            }
        } else {
            newStep = {
                action: actionData,
                screenshot: endScreenshot,
                timestamp: new Date().toISOString(),
                url: tab.url,
                title: tab.title
            };
        }

        const result = await chrome.storage.local.get(STORAGE_KEY);
        const currentSteps = result[STORAGE_KEY] || [];
        currentSteps.push(newStep);
        await chrome.storage.local.set({ [STORAGE_KEY]: currentSteps });

        console.log(`✅ Step ${currentSteps.length} (${actionData.type}) saved.`);

    } catch (error) {
        console.error('记录步骤时出错:', error);
    }
}