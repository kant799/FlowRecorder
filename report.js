// report.js - v1.8
// 报告页面脚本，负责展示录制的操作步骤并提供交互功能

/**
 * 初始化拖拽排序功能
 * 使用 SortableJS 库实现步骤卡片的拖拽重新排序
 */
function initializeDragAndDrop() {
    const container = document.getElementById('steps-container');
    if (!container) return;

    /**
     * 更新所有卡片的步骤编号
     * 在拖拽排序后重新计算并显示正确的步骤顺序
     */
    const updateStepNumbers = () => {
        const cards = container.querySelectorAll('.step-card');
        cards.forEach((card, index) => {
            const stepNumberEl = card.querySelector('.step-number');
            if (stepNumberEl) {
                stepNumberEl.textContent = index + 1;
            }
        });
    };

    // 使用 SortableJS 初始化拖拽功能
    new Sortable(container, {
        animation: 350, // 动画时长，单位毫秒
        
        // 自定义CSS类名，用于实现拖拽时的视觉效果
        ghostClass: 'sortable-ghost',  // 拖拽时占位符的类名
        dragClass: 'sortable-drag',    // 被拖拽项的类名

        /**
         * 拖拽开始时的回调函数
         */
        onStart: function () {
            // 给容器添加类名，实现"所有卡片缩小"的视觉效果
            container.classList.add('is-dragging');
        },

        /**
         * 拖拽结束时的回调函数
         * @param {Object} evt - 拖拽事件对象
         */
        onEnd: function (evt) {
            // 移除容器的特殊类名
            container.classList.remove('is-dragging');
            // 重新计算并更新所有卡片的步骤编号
            updateStepNumbers();
        }
    });
}

/**
 * 页面加载完成后初始化报告内容
 */
document.addEventListener('DOMContentLoaded', () => {
    const stepsContainer = document.getElementById('steps-container');
    const STORAGE_KEY = 'recordedSteps';

    /**
     * 更新所有步骤卡片的编号显示
     * 特殊处理最终状态卡片，显示"最终页面状态"而非数字编号
     */
    function updateStepNumbers() {
        const allCards = document.querySelectorAll('.step-card');
        allCards.forEach((card, index) => {
            const stepNumberElement = card.querySelector('.step-number');
            if (stepNumberElement) {
                if (card.dataset.stepType === 'final_state') {
                    stepNumberElement.textContent = '最终页面状态';
                } else {
                    stepNumberElement.textContent = `步骤 ${index + 1}`;
                }
            }
        });
    }

    // 从本地存储中获取录制的步骤数据
    chrome.storage.local.get(STORAGE_KEY, (result) => {
        const steps = result[STORAGE_KEY];
        
        // 检查是否有录制数据
        if (!steps || steps.length === 0) {
            stepsContainer.innerHTML = '<p>没有录制到任何操作步骤。</p>';
            return;
        }

        // 遍历所有步骤数据，创建对应的卡片元素
        steps.forEach((step) => {
            const cardElement = document.createElement('div');
            // 设置卡片类名和数据类型属性
            cardElement.className = 'step-card';
            cardElement.dataset.stepType = step.action.type;

            // 生成步骤描述信息
            const {
                description,
                details
            } = generateStepDescription(step);

            // 构建卡片HTML结构
            cardElement.innerHTML = `
                <div class="card-header">
                  <span class="step-number"></span>
                  <button class="delete-btn">删除此步</button>
                </div>
                <div class="card-body">
                  <div class="step-details">
                    <p>${description}</p>
                    <p>${details}</p>
                  </div>
                  <div class="screenshot-container"></div>
                </div>
            `;

            // 处理截图显示
            const screenshotContainer = cardElement.querySelector('.screenshot-container');
            
            // 滚动操作特殊处理：显示滚动前后的两张截图
            if (step.action.type === 'scroll' && step.screenshot_start) {
                const startLabel = document.createElement('h4');
                startLabel.textContent = '滚动前:';
                screenshotContainer.appendChild(startLabel);
                const startCanvas = createCanvasWithImage(step.screenshot_start, (ctx, img) => {
                    drawScrollArrow(ctx, img, step.action.direction);
                });
                screenshotContainer.appendChild(startCanvas);

                const endLabel = document.createElement('h4');
                endLabel.textContent = '滚动后:';
                screenshotContainer.appendChild(endLabel);
                const endCanvas = createCanvasWithImage(step.screenshot_end);
                screenshotContainer.appendChild(endCanvas);
            } else {
                // 其他操作：显示单张截图
                const screenshot = step.screenshot || step.screenshot_end;
                if (screenshot) {
                    const canvas = createCanvasWithImage(screenshot, (ctx, img) => {
                        // 非最终状态的操作需要添加高亮和放大镜效果
                        if (step.action.type !== 'final_state' && step.action.rect) {
                            drawHighlightAndMagnifier(ctx, img, step.action.rect, step.action.devicePixelRatio);
                        }
                    });
                    screenshotContainer.appendChild(canvas);
                }
            }

            // 添加删除按钮事件监听
            const deleteButton = cardElement.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => {
                cardElement.remove();
                updateStepNumbers();
            });

            stepsContainer.appendChild(cardElement);
        });

        // 初始化步骤编号显示
        updateStepNumbers();

        // 初始化拖拽排序功能
        initializeDragAndDrop();
    });
});

// =================================================================
// 绘图和辅助函数
// =================================================================

/**
 * 在截图上绘制高亮框和放大镜效果
 * 用于突出显示用户操作的目标元素
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLImageElement} img - 截图图像
 * @param {Object} rect - 元素位置和尺寸信息
 * @param {number} dpr - 设备像素比
 */
function drawHighlightAndMagnifier(ctx, img, rect, dpr = 1) {
    // 转换为物理像素坐标
    const physicalRect = {
        x: rect.x * dpr,
        y: rect.y * dpr,
        width: rect.width * dpr,
        height: rect.height * dpr
    };
    
    // 计算并应用内边距以确保高亮框不紧贴元素
    const padding = 5 * dpr;
    const borderRadius = 8 * dpr;
    const paddedRect = {
        x: physicalRect.x - padding,
        y: physicalRect.y - padding,
        width: physicalRect.width + padding * 2,
        height: physicalRect.height + padding * 2,
    };

    // 绘制高亮边框
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.roundRect(paddedRect.x, paddedRect.y, paddedRect.width, paddedRect.height, [borderRadius]);
    ctx.stroke();
    
    // 定义放大镜的参数和尺寸
    const MAGNIFICATION = 5;
    const PADDING = 20 * dpr;
    const BORDER_WIDTH = 2 * dpr;
    let magnifiedWidth = physicalRect.width * MAGNIFICATION;
    let magnifiedHeight = physicalRect.height * MAGNIFICATION;
    const MAX_MAGNIFIER_SIZE = 250 * dpr;
    
    // 限制放大镜最大尺寸
    if (magnifiedWidth > MAX_MAGNIFIER_SIZE || magnifiedHeight > MAX_MAGNIFIER_SIZE) {
        const ratio = Math.min(MAX_MAGNIFIER_SIZE / magnifiedWidth, MAX_MAGNIFIER_SIZE / magnifiedHeight);
        magnifiedWidth *= ratio;
        magnifiedHeight *= ratio;
    }
    
    // 放大镜的最终位置
    const magnifierDest = {
        x: img.width - magnifiedWidth - PADDING - BORDER_WIDTH * 2,
        y: PADDING,
        width: magnifiedWidth,
        height: magnifiedHeight
    };
    
    // 绘制放大镜背景、阴影、边框
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10 * dpr;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(magnifierDest.x, magnifierDest.y, magnifierDest.width + BORDER_WIDTH * 2, magnifierDest.height + BORDER_WIDTH * 2);
    ctx.restore();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeRect(magnifierDest.x, magnifierDest.y, magnifierDest.width + BORDER_WIDTH * 2, magnifierDest.height + BORDER_WIDTH * 2);
    
    // 绘制放大后的图像内容
    ctx.drawImage(img, physicalRect.x, physicalRect.y, physicalRect.width, physicalRect.height, 
                  magnifierDest.x + BORDER_WIDTH, magnifierDest.y + BORDER_WIDTH, 
                  magnifiedWidth, magnifiedHeight);

    // 绘制高亮框和放大镜的连接线
    const rectCorners = {
        topRight: {
            x: physicalRect.x + physicalRect.width,
            y: physicalRect.y
        },
        bottomRight: {
            x: physicalRect.x + physicalRect.width,
            y: physicalRect.y + physicalRect.height
        }
    };
    const magnifierCorners = {
        topLeft: {
            x: magnifierDest.x,
            y: magnifierDest.y
        },
        bottomLeft: {
            x: magnifierDest.x,
            y: magnifierDest.y + magnifierDest.height + BORDER_WIDTH * 2
        }
    };
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([5 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(rectCorners.topRight.x, rectCorners.topRight.y);
    ctx.lineTo(magnifierCorners.topLeft.x, magnifierCorners.topLeft.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rectCorners.bottomRight.x, rectCorners.bottomRight.y);
    ctx.lineTo(magnifierCorners.bottomLeft.x, magnifierCorners.bottomLeft.y);
    ctx.stroke();
    ctx.setLineDash([]);
}

/**
 * 创建画布并加载图像
 * @param {string} imgSrc - 图像源地址
 * @param {Function} drawingFn - 可选的绘图函数
 * @returns {HTMLCanvasElement} 包含图像的画布元素
 */
function createCanvasWithImage(imgSrc, drawingFn) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        if (drawingFn) {
            drawingFn(ctx, img);
        }
    };
    img.src = imgSrc;
    return canvas;
}

/**
 * 在滚动截图上绘制箭头指示滚动方向
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLImageElement} img - 截图图像
 * @param {string} direction - 滚动方向 ('up' 或 'down')
 */
function drawScrollArrow(ctx, img, direction) {
    const dpr = window.devicePixelRatio;
    const arrowLength = 200 * dpr;
    const arrowWidth = 60 * dpr;
    const lineWidth = 8 * dpr;
    const centerX = img.width * 0.8;
    const centerY = img.height / 2;
    
    ctx.strokeStyle = '#FF0000';
    ctx.fillStyle = '#FF0000';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    let startX, startY, endX, endY;
    switch (direction) {
        case 'down':
            startX = centerX;
            startY = centerY - arrowLength / 2;
            endX = centerX;
            endY = centerY + arrowLength / 2;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.moveTo(endX - arrowWidth / 2, endY - arrowWidth / 2);
            ctx.lineTo(endX, endY);
            ctx.lineTo(endX + arrowWidth / 2, endY - arrowWidth / 2);
            break;
        case 'up':
            startX = centerX;
            startY = centerY + arrowLength / 2;
            endX = centerX;
            endY = centerY - arrowLength / 2;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.moveTo(endX - arrowWidth / 2, endY + arrowWidth / 2);
            ctx.lineTo(endX, endY);
            ctx.lineTo(endX + arrowWidth / 2, endY + arrowWidth / 2);
            break;
    }
    ctx.stroke();

    // 添加"页面滚动"文字说明
    const text = "页面滚动";
    const fontSize = 48 * dpr;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#FF0000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 添加文字阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15 * dpr;
    ctx.shadowOffsetX = 2 * dpr;
    ctx.shadowOffsetY = 2 * dpr;

    const textPadding = 25 * dpr;
    const textX = centerX + (arrowWidth / 2) + textPadding;
    const textY = centerY;

    ctx.fillText(text, textX, textY);

    // 清除阴影效果
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

/**
 * 生成步骤的描述信息
 * @param {Object} step - 步骤数据对象
 * @returns {Object} 包含描述和详情的对象
 */
function generateStepDescription(step) {
    const action = step.action;
    let description = '未知操作';
    let details = `CSS选择器: <code>${action.selector || 'N/A'}</code>`;
    let isFinal = false;
    
    // 根据操作类型生成对应的描述
    switch (action.type) {
        case 'click':
            description = `点击了 <strong>${action.tagName}</strong> 元素。`;
            if (action.innerText) {
                description += ` (文本: "<em>${escapeHtml(action.innerText)}</em>")`;
            }
            break;
        case 'change':
            description = `在 <strong>${action.tagName}</strong> 输入框中输入了内容。`;
            break;
        case 'selection':
            description = `选择了文本: "<strong><em>${escapeHtml(action.selectedText)}</em></strong>"`;
            break;
        case 'keypress':
            description = `在 <strong>${action.tagName}</strong> 元素上按下了 <strong>${action.key}</strong> 键。`;
            break;
        case 'scroll':
            description = `向<strong>${action.direction}</strong>方向滚动了页面。`;
            details = `从位置 (top: ${action.startPosition.scrollTop}, left: ${action.startPosition.scrollLeft}) 滚动到 (top: ${action.endPosition.scrollTop}, left: ${action.endPosition.scrollLeft})`;
            break;
        case 'final_state':
            description = `这是所有操作完成后的最终页面状态。`;
            details = `页面URL: <a href="${step.url}" target="_blank">${step.url}</a>`;
            isFinal = true;
            break;
    }
    return {
        description,
        details,
        isFinal
    };
}

/**
 * HTML转义函数，防止XSS攻击
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的安全文本
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) {
        return map[m];
    });
}
