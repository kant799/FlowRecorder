# FlowRecorder

FlowRecorder is a browser extension that allows you to record your interactions on a web page and generate a report of your actions.

## 描述

这是一个可以录制并记录网络操作的浏览器插件。它可以捕捉您在网页上的点击、输入和其他交互，并生成一份详细的报告。

## 特征

*   **操作录制:** 记录您在网页上的所有交互。
*   **报告生成:** 生成一份详细的操作报告。
*   **快照功能:** 捕捉网页在特定时刻的状态。

## 安装

1.  从 GitHub 下载或克隆此仓库。
2.  打开 Chrome 浏览器，进入 `chrome://extensions/`。
3.  开启“开发者模式”。
4.  点击“加载已解压的扩展程序”，然后选择您下载的仓库文件夹。

> 也可从Releases下载已打包的crx文件安装。

## 使用方法

1.  在 Chrome 浏览器中点击 FlowRecorder 扩展图标。
2.  在弹出的窗口中，点击“开始录制”按钮。
3.  在网页上执行您想要录制的操作。
4.  完成录制后，再次点击扩展图标，然后点击“停止录制”按钮。
5.  会自动跳转到“生成报告”页面，查看您录制的操作。

## 文件结构

*   `manifest.json`: 扩展程序的配置文件。
*   `popup.html` / `popup.js`: 扩展程序弹出窗口的界面和逻辑。
*   `background.js`: 扩展程序的后台脚本。
*   `content.js`: 注入到网页中以进行交互录制的脚本。
*   `report.html` / `report.js`: 用于显示录制报告的页面和脚本。
*   `snap-init.js`: 用于初始化快照功能的脚本。
*   `icons/`: 扩展程序的图标文件。
*   `libs/`: 第三方库。

## 贡献

欢迎为此项目做出贡献！请随时提交 Pull Request 或开启 Issue。

## 许可证(License)

该项目采用 MIT 许可证。详情请参阅 LICENSE 文件。

## 关于我
**联系我**：邮箱：kant799@163.com

**支持我**：[爱发电](https://afdian.com/a/cyan7)