# OneTwoRecorder

[中文版本](README.md) | English

## Description

This is a browser extension that can record and log web operations. It captures your clicks, inputs, and other interactions on web pages and generates a detailed report.

## Features

*   **Action Recording:** Records all your interactions on a web page.
*   **Report Generation:** Generates a detailed report of your actions.
*   **Snapshot Functionality:** Captures the state of the web page at specific moments.

## Installation

1.  Download or clone this repository from GitHub.
2.  Open Chrome browser and go to `chrome://extensions/`.
3.  Enable "Developer mode".
4.  Click "Load unpacked" and select the downloaded repository folder.

> Alternatively, download the pre-packaged crx file from Releases for installation.

## Usage

1.  Click the OneTwoRecorder extension icon in the Chrome browser.
2.  In the popup window, click the "Start Recording" button.
3.  Perform the actions you want to record on the web page.
4.  After finishing recording, click the extension icon again, then click the "Stop Recording" button.
5.  You will be automatically redirected to the "Generate Report" page to view your recorded actions.

## File Structure

*   `manifest.json`: Configuration file for the extension.
*   `popup.html` / `popup.js`: Interface and logic for the extension popup window.
*   `background.js`: Background script for the extension.
*   `content.js`: Script injected into web pages for interaction recording.
*   `report.html` / `report.js`: Page and script for displaying the recording report.
*   `snap-init.js`: Script for initializing the snapshot functionality.
*   `icons/`: Icon files for the extension.
*   `libs/`: Third-party libraries.

## Contributing

Contributions to this project are welcome! Please feel free to submit a Pull Request or open an Issue.

## TODO
- [ ] Add real-time customization of report text
- [ ] Add more report export formats `html, markdown`

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## About Me
**Contact Me**: Email: kant799@163.com

**Support Me**: [Afdian](https://afdian.com/a/cyan7)

## Acknowledgments
[snapDOM](https://github.com/zumerlab/snapdom) for providing the page snapshot functionality.

[Sortable](https://github.com/SortableJS/Sortable) for providing the dynamic list sorting component.