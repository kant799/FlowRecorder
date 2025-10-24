// report.js - v1.8 (最终UI同步 & 功能完整版)

document.addEventListener('DOMContentLoaded', () => {
    const stepsContainer = document.getElementById('steps-container');
    const STORAGE_KEY = 'recordedSteps';

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

    chrome.storage.local.get(STORAGE_KEY, (result) => {
        const steps = result[STORAGE_KEY];
        if (!steps || steps.length === 0) {
            stepsContainer.innerHTML = '<p>没有录制到任何操作步骤。</p>';
            return;
        }

        steps.forEach((step) => {
            const cardElement = document.createElement('div');
            // 【关键】确保这个 class 与 CSS 匹配
            cardElement.className = 'step-card';
            cardElement.dataset.stepType = step.action.type;

            const {
                description,
                details
            } = generateStepDescription(step);

            // 【关键】确保这个 innerHTML 结构与 CSS 匹配
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

            const screenshotContainer = cardElement.querySelector('.screenshot-container');
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
                const screenshot = step.screenshot || step.screenshot_end;
                if (screenshot) {
                    const canvas = createCanvasWithImage(screenshot, (ctx, img) => {
                        if (step.action.type !== 'final_state' && step.action.rect) {
                            drawHighlightAndMagnifier(ctx, img, step.action.rect, step.action.devicePixelRatio);
                        }
                    });
                    screenshotContainer.appendChild(canvas);
                }
            }

            const deleteButton = cardElement.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => {
                cardElement.remove();
                updateStepNumbers();
            });

            stepsContainer.appendChild(cardElement);
        });

        updateStepNumbers();
    });
});

// ... (所有绘图和辅助函数 drawHighlightAndMagnifier, createCanvasWithImage, etc. 保持最新版本不变)
function drawHighlightAndMagnifier(ctx, img, rect, dpr = 1) {
    const physicalRect = {
        x: rect.x * dpr,
        y: rect.y * dpr,
        width: rect.width * dpr,
        height: rect.height * dpr
    };
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3 * dpr;
    ctx.strokeRect(physicalRect.x, physicalRect.y, physicalRect.width, physicalRect.height);
    const MAGNIFICATION = 2.5;
    const PADDING = 10 * dpr;
    const BORDER_WIDTH = 2 * dpr;
    let magnifiedWidth = physicalRect.width * MAGNIFICATION;
    let magnifiedHeight = physicalRect.height * MAGNIFICATION;
    const MAX_MAGNIFIER_SIZE = 250 * dpr;
    if (magnifiedWidth > MAX_MAGNIFIER_SIZE || magnifiedHeight > MAX_MAGNIFIER_SIZE) {
        const ratio = Math.min(MAX_MAGNIFIER_SIZE / magnifiedWidth, MAX_MAGNIFIER_SIZE / magnifiedHeight);
        magnifiedWidth *= ratio;
        magnifiedHeight *= ratio;
    }
    const magnifierDest = {
        x: img.width - magnifiedWidth - PADDING - BORDER_WIDTH * 2,
        y: PADDING,
        width: magnifiedWidth,
        height: magnifiedHeight
    };
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10 * dpr;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(magnifierDest.x, magnifierDest.y, magnifierDest.width + BORDER_WIDTH * 2, magnifierDest.height + BORDER_WIDTH * 2);
    ctx.restore();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeRect(magnifierDest.x, magnifierDest.y, magnifierDest.width + BORDER_WIDTH * 2, magnifierDest.height + BORDER_WIDTH * 2);
    ctx.drawImage(img, physicalRect.x, physicalRect.y, physicalRect.width, physicalRect.height, magnifierDest.x + BORDER_WIDTH, magnifierDest.y + BORDER_WIDTH, magnifierDest.width, magnifierDest.height);
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

function drawScrollArrow(ctx, img, direction) {
    const dpr = window.devicePixelRatio;
    const arrowLength = 80 * dpr;
    const arrowWidth = 40 * dpr;
    const lineWidth = 8 * dpr;
    const centerX = img.width / 2;
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
}

function generateStepDescription(step, index, totalSteps) {
    const action = step.action;
    let description = '未知操作';
    let details = `CSS选择器: <code>${action.selector || 'N/A'}</code>`;
    let isFinal = false;
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