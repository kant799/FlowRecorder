// background.js
// 浏览器扩展的后台脚本，负责录制用户操作流程并生成报告

// Service Worker 启动时检查录制状态并设置正确的图标
chrome.runtime.onStartup.addListener(checkAndSetIcon);
chrome.runtime.onInstalled.addListener(checkAndSetIcon);

/**
 * 检查录制状态并设置对应的扩展图标
 * 从本地存储中读取录制状态，根据状态切换图标样式
 */
async function checkAndSetIcon() {
    // 从本地存储中获取录制状态
    const data = await chrome.storage.local.get('isRecording');
    const recordingState = data.isRecording || false;

    // 根据录制状态设置不同的图标路径
    const iconPaths = recordingState ? {
        "16": "icons/recording16.png",
        "32": "icons/recording32.png",
        "48": "icons/recording48.png",
        "128": "icons/recording128.png"
    } : {
        "16": "icons/icon16.png",
        "32": "icons/icon32.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
    };

    // 设置扩展图标
    chrome.action.setIcon({ path: iconPaths });
}

// 全局变量定义
let isRecording = false; // 录制状态标志
const STORAGE_KEY = 'recordedSteps'; // 存储录制步骤的键名
let tempScrollStartScreenshot = null; // 临时存储滚动开始时的截图

/**
 * 向指定标签页注入内容脚本
 * @param {number} tabId - 目标标签页ID
 * @param {string} url - 目标页面URL
 */
function injectContentScript(tabId, url) {
    // 仅在录制状态且为HTTP/HTTPS页面时注入脚本
    if (isRecording && url && (url.startsWith('http://') || url.startsWith('https://'))) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).catch(err => {
            console.warn(`[注入] 部署侦察兵到 Tab ${tabId} 失败:`, err.message);
        });
    }
}

/**
 * 标签页更新监听器 - 在页面加载完成时注入内容脚本
 */
const tabUpdateListener = (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        injectContentScript(tabId, tab.url);
    }
};

/**
 * 网页导航监听器 - 在单页应用路由变化时注入内容脚本
 */
const webNavigationListener = (details) => {
    // 仅处理主框架的导航事件
    if (details.frameId === 0) {
        injectContentScript(details.tabId, details.url);
    }
};

/**
 * 消息处理器 - 处理来自内容脚本和弹出窗口的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_RECORDING':
            // 开始录制：设置状态、初始化存储、启动监听器
            chrome.storage.local.set({ isRecording: true });
            handleStartRecording();
            isRecording = true;
            chrome.storage.local.set({ recordedSteps: [] });

            // 切换为录制中状态的图标
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
            // 暂停录制：仅修改状态标志
            isRecording = false;
            break;
            
        case 'END_RECORDING':
            // 结束录制：重置状态、处理最终数据、恢复图标
            chrome.storage.local.set({ isRecording: false });
            handleEndRecordingAndShowReport(); 
            isRecording = false;

            // 恢复默认状态的图标
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
            // 处理进行中的操作（如滚动开始）
            if (isRecording && message.actionType === 'scroll_start') {
                handleScrollStart(sender.tab);
            }
            break;
            
        case 'ACTION_RECORDED':
            // 处理已记录的操作
            if (isRecording) {
                handleActionRecorded(message.data, sender.tab);
            }
            break;
    }
    return true; // 保持消息通道开放，支持异步响应
});

// =================================================================
// 【核心功能】结束录制并添加最终快照
// =================================================================

/**
 * 处理录制结束流程：捕获最终状态截图并生成报告
 * 此函数确保录制流程的完整性，包含最终页面状态的记录
 */
async function handleEndRecordingAndShowReport() {
    console.log('Received: END_RECORDING');
    
    // 防止重复点击导致的重复处理
    if (!isRecording) return;
    isRecording = false;

    // 1. 关闭所有监控监听器以节省系统资源
    chrome.tabs.onUpdated.removeListener(tabUpdateListener);
    chrome.webNavigation.onHistoryStateUpdated.removeListener(webNavigationListener);
    console.log('[传感器] 所有导航监控已关闭。');

    // 2. 获取当前活动标签页用于最终截图
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
        try {
            console.log('捕获最终状态截图...');
            // 捕获当前可见标签页的截图
            const finalScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'jpeg',
                quality: 90 // 设置图片质量以平衡文件大小和清晰度
            });

            // 3. 创建特殊的"最终状态"步骤对象
            const finalStep = {
                action: {
                    type: 'final_state', // 自定义类型，标识这是录制结束时的状态
                    selector: 'N/A' // 不适用选择器
                },
                screenshot: finalScreenshot,
                timestamp: new Date().toISOString(),
                url: tab.url,
                title: tab.title
            };

            // 4. 将最终步骤追加到存储中
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
    
    // 5. 所有操作完成后，打开报告页面展示录制结果
    console.log('录制结束，正在打开报告页面...');
    chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
}

/**
 * 开始录制：初始化状态并启动监控
 */
async function handleStartRecording() {
    isRecording = true;
    tempScrollStartScreenshot = null; // 重置滚动截图缓存
    await chrome.storage.local.set({ [STORAGE_KEY]: [] }); // 清空之前的录制数据
    console.log('开始录制...');
    
    // 启动页面监控监听器
    chrome.tabs.onUpdated.addListener(tabUpdateListener);
    chrome.webNavigation.onHistoryStateUpdated.addListener(webNavigationListener);
    
    // 向当前活动标签页注入内容脚本
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        injectContentScript(tab.id, tab.url);
    }
}

/**
 * 处理滚动开始事件：捕获滚动前的页面状态
 * @param {object} tab - 目标标签页对象
 */
async function handleScrollStart(tab) {
    if (!tab || !tab.id) return;
    try {
        // 捕获滚动开始时的页面截图
        tempScrollStartScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 90
        });
    } catch (error) {
        console.error('捕获滚动开始截图失败:', error);
        tempScrollStartScreenshot = null;
    }
}

/**
 * 处理记录的操作：保存操作详情和对应的页面截图
 * @param {object} actionData - 操作数据
 * @param {object} tab - 来源标签页对象
 */
async function handleActionRecorded(actionData, tab) {
    if (!tab || !tab.id) return;
    try {
        // 捕获操作结束时的页面截图
        const endScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 90
        });

        let newStep;

        // 根据操作类型构建不同的步骤对象
        if (actionData.type === 'scroll') {
            // 滚动操作需要特殊处理：可能包含开始和结束两张截图
            if (tempScrollStartScreenshot) {
                newStep = {
                    action: actionData,
                    screenshot_start: tempScrollStartScreenshot, // 滚动开始截图
                    screenshot_end: endScreenshot, // 滚动结束截图
                    timestamp: new Date().toISOString(),
                    url: tab.url,
                    title: tab.title
                };
                tempScrollStartScreenshot = null; // 使用后重置
            } else {
                // 如果没有开始截图，只保存结束截图
                newStep = {
                    action: actionData,
                    screenshot_end: endScreenshot,
                    timestamp: new Date().toISOString(),
                    url: tab.url,
                    title: tab.title
                };
            }
        } else {
            // 非滚动操作：保存单张截图
            newStep = {
                action: actionData,
                screenshot: endScreenshot,
                timestamp: new Date().toISOString(),
                url: tab.url,
                title: tab.title
            };
        }

        // 将新步骤保存到本地存储
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const currentSteps = result[STORAGE_KEY] || [];
        currentSteps.push(newStep);
        await chrome.storage.local.set({ [STORAGE_KEY]: currentSteps });

        console.log(`✅ Step ${currentSteps.length} (${actionData.type}) saved.`);

    } catch (error) {
        console.error('记录步骤时出错:', error);
    }
}
