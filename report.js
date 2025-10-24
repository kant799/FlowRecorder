// report.js - v1.1 (应用 devicePixelRatio 进行精准绘制)

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
      // ... (创建 stepElement 和 innerHTML 的部分保持不变) ...
      const stepElement = document.createElement('div');
      stepElement.className = 'step';

      let actionDescription = '';
      if (step.action.type === 'click') {
        actionDescription = `点击了 <strong>${step.action.tagName}</strong> 元素。`;
        if (step.action.innerText) {
            actionDescription += ` (文本: "${step.action.innerText}")`;
        }
      } else if (step.action.type === 'change') {
        actionDescription = `在 <strong>${step.action.tagName}</strong> 输入框中输入了内容。`;
      }

      stepElement.innerHTML = `
        <div class="step-header">步骤 ${index + 1}</div>
        <div class="step-details">
          <p>${actionDescription}</p>
          <p>CSS选择器: <code>${step.action.selector}</code></p>
        </div>
      `;


      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const rect = step.action.rect;
        // 【核心修正】从步骤数据中获取 devicePixelRatio
        const dpr = step.action.devicePixelRatio || 1;

        if (rect) {
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 3 * dpr; // 线宽也应该相应缩放，看起来更协调
          
          // 【核心修正】将所有坐标和尺寸都乘以 dpr
          ctx.strokeRect(
            rect.x * dpr, 
            rect.y * dpr, 
            rect.width * dpr, 
            rect.height * dpr
          );
        }
      };

      img.src = step.screenshot;
      
      stepElement.appendChild(canvas);
      stepsContainer.appendChild(stepElement);
    });
  });
});