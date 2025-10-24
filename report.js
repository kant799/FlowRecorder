// report.js - v1.4 (最终快照渲染版)

document.addEventListener('DOMContentLoaded', () => {
  const stepsContainer = document.getElementById('steps-container');
  const STORAGE_KEY = 'recordedSteps';

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const steps = result[STORAGE_KEY];
    if (!steps || steps.length === 0) {
      stepsContainer.innerHTML = '<p>没有录制到任何操作步骤。</p>';
      return;
    }

    steps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.className = 'step';

      // 【核心修改】generateStepDescription 现在能处理 final_state
      const { description, details, isFinal } = generateStepDescription(step, index, steps.length);

      // 根据是否为最终步骤，使用不同的标题
      const headerTitle = isFinal ? "最终页面状态" : `步骤 ${index + 1}`;
      
      stepElement.innerHTML = `
        <div class="step-header">${headerTitle}</div>
        <div class="step-details">
          <p>${description}</p>
          <p>${details}</p>
        </div>
      `;

      if (step.action.type === 'scroll' && step.screenshot_start) {
        const startLabel = document.createElement('h4');
        startLabel.textContent = '滚动前:';
        stepElement.appendChild(startLabel);
        const startCanvas = createCanvasWithImage(step.screenshot_start, (ctx, img, dpr) => {
            drawScrollArrow(ctx, img, step.action.direction, dpr);
        });
        stepElement.appendChild(startCanvas);

        const endLabel = document.createElement('h4');
        endLabel.style.marginTop = '20px';
        endLabel.textContent = '滚动后:';
        stepElement.appendChild(endLabel);
        const endCanvas = createCanvasWithImage(step.screenshot_end);
        stepElement.appendChild(endCanvas);

      } else {
        // 最终快照和常规步骤都走这里
        const screenshot = step.screenshot || step.screenshot_end;
        if (screenshot) {
            // 最终快照不画任何标记
            const drawingFn = isFinal ? null : (ctx, img, dpr) => {
                const rect = step.action.rect;
                if (rect) {
                    ctx.strokeStyle = '#FF0000';
                    ctx.lineWidth = 3 * dpr;
                    ctx.strokeRect(rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr);
                }
            };
            const canvas = createCanvasWithImage(screenshot, drawingFn);
            stepElement.appendChild(canvas);
        }
      }

      stepsContainer.appendChild(stepElement);
    });
  });
});

// createCanvasWithImage, drawScrollArrow, escapeHtml 函数保持不变
function createCanvasWithImage(imgSrc, drawingFn) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const dpr = window.devicePixelRatio;
        if (drawingFn) {
            drawingFn(ctx, img, dpr);
        }
    };
    img.src = imgSrc;
    return canvas;
}
function drawScrollArrow(ctx, img, direction, dpr) {
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
            startX = centerX; startY = centerY - arrowLength / 2; endX = centerX; endY = centerY + arrowLength / 2;
            ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
            ctx.moveTo(endX - arrowWidth / 2, endY - arrowWidth / 2); ctx.lineTo(endX, endY); ctx.lineTo(endX + arrowWidth / 2, endY - arrowWidth / 2);
            break;
        case 'up':
            startX = centerX; startY = centerY + arrowLength / 2; endX = centerX; endY = centerY - arrowLength / 2;
            ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
            ctx.moveTo(endX - arrowWidth / 2, endY + arrowWidth / 2); ctx.lineTo(endX, endY); ctx.lineTo(endX + arrowWidth / 2, endY + arrowWidth / 2);
            break;
    }
    ctx.stroke();
}
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


/**
 * 【核心修改】generateStepDescription 现在能处理 final_state
 * @param {object} step
 * @param {number} index
 * @param {number} totalSteps
 * @returns {{description: string, details: string, isFinal: boolean}}
 */
function generateStepDescription(step, index, totalSteps) {
    const action = step.action;
    let description = '未知操作';
    let details = `CSS选择器: <code>${action.selector || 'N/A'}</code>`;
    let isFinal = false;

    switch (action.type) {
        case 'click':
            description = `点击了 <strong>${action.tagName}</strong> 元素。`;
            if (action.innerText) { description += ` (文本: "<em>${escapeHtml(action.innerText)}</em>")`; }
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
    return { description, details, isFinal };
}