// report.js - v1.2 (能渲染文本选择和功能键操作)

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

      // 【核心修改】使用一个函数来生成更丰富的描述
      const { description, details } = generateStepDescription(step);

      stepElement.innerHTML = `
        <div class="step-header">步骤 ${index + 1}</div>
        <div class="step-details">
          <p>${description}</p>
          <p>${details}</p>
        </div>
      `;

      const canvas = document.createElement('canvas');
      // ... (Canvas 绘图逻辑与上一版本完全相同)
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const rect = step.action.rect;
        const dpr = step.action.devicePixelRatio || 1;
        if (rect) {
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 3 * dpr;
          ctx.strokeRect(rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr);
        }
      };
      img.src = step.screenshot;
      stepElement.appendChild(canvas);
      
      stepsContainer.appendChild(stepElement);
    });
  });
});

/**
 * 【新增】根据不同的操作类型，生成对应的文字描述
 * @param {object} step - 单个步骤对象
 * @returns {{description: string, details: string}}
 */
function generateStepDescription(step) {
  const action = step.action;
  let description = '未知操作';
  let details = `CSS选择器: <code>${action.selector || 'N/A'}</code>`;

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
  }
  
  return { description, details };
}

/**
 * 【新增】一个简单的HTML转义函数，防止XSS攻击和显示问题
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}