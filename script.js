document.addEventListener('DOMContentLoaded', () => {
    // 模擬檔案系統內容
    const fileData = {
        '主要.js': {
            language: 'JavaScript',
            content: `function 你好世界() {
  // 這是 Antigravity 編輯器
  const 訊息 = "歡迎使用繁體中文介面";
  console.log(訊息);
  return true;
}

你好世界();`
        },
        '樣式.css': {
            language: 'CSS',
            content: `:root {
    --bg-dark: #1e1e1e;
    --accent: #007acc;
}

body {
    background-color: var(--bg-dark);
    color: #cccccc;
    font-family: 'Noto Sans TC', sans-serif;
}`
        },
        '說明.md': {
            language: 'Markdown',
            content: `# 歡迎使用

這是一個模擬的程式碼編輯器介面。

## 功能
- 點擊左側檔案瀏覽器切換檔案
- 檢視不同語言的語法標示範例
- 響應式介面設計`
        }
    };

    const files = document.querySelectorAll('.file-item');
    const tabs = document.querySelectorAll('.tab');
    const codeContent = document.querySelector('.code-content');
    const lineNumbers = document.querySelector('.line-numbers');
    const currentFileNameDisplay = document.querySelector('.status-right span:first-child');
    const currentLanguageDisplay = document.querySelector('.status-right span:nth-child(2)');

    // 簡單的 HTML 跳脫函數
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 簡單的語法高亮 (僅為示範，針對特定關鍵字)
    function highlightCode(code, language) {
        let highlighted = escapeHtml(code);

        if (language === 'JavaScript') {
            highlighted = highlighted
                .replace(/const/g, '<span class="keyword">const</span>')
                .replace(/function/g, '<span class="keyword">function</span>')
                .replace(/return/g, '<span class="keyword">return</span>')
                .replace(/"(.*?)"/g, '<span class="string">"$&"</span>') // 簡單字串
                .replace(/\/\/(.*)/g, '<span class="comment">//$1</span>'); // 簡單註解
        } else if (language === 'CSS') {
            highlighted = highlighted
                .replace(/:(.*?);/g, ':<span class="variable-name">$1</span>;')
                .replace(/([a-z-]+)(?=:)/g, '<span class="keyword">$1</span>'); // 屬性名
        } else if (language === 'Markdown') {
            highlighted = highlighted
                .replace(/^# (.*$)/gm, '<span class="keyword"># $1</span>')
                .replace(/^## (.*$)/gm, '<span class="keyword">## $1</span>')
                .replace(/- (.*$)/gm, '<span class="variable">- $1</span>');
        }

        // 將換行符號轉為 <br> 並且保留空白縮排
        return highlighted.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;');
    }

    function updateLineNumbers(code) {
        const lines = code.split('\n').length;
        let numbersHtml = '';
        for (let i = 1; i <= lines; i++) {
            numbersHtml += `${i}<br>`;
        }
        lineNumbers.innerHTML = numbersHtml;
    }

    function updateContent(filename) {
        const file = fileData[filename];
        if (!file) return;

        // 更新程式碼區域
        codeContent.innerHTML = highlightCode(file.content, file.language);
        updateLineNumbers(file.content);

        // 更新狀態列
        const lineCount = file.content.split('\n').length;
        currentFileNameDisplay.textContent = `行 ${lineCount}, 列 1`; // 簡化顯示
        currentLanguageDisplay.textContent = file.language;
    }

    function setActiveFile(target) {
        // 移除所有 active
        files.forEach(f => f.classList.remove('active'));

        // 嘗試在 tab 找到對應項目 (簡化版：假設 tab 名稱匹配檔名)
        const filename = target.querySelector('.filename').textContent;

        // 更新 Sidebar 狀態
        target.classList.add('active');

        // 更新 Tab 狀態
        tabs.forEach(t => {
            const tabName = t.querySelector('.tab-name').textContent;
            if (tabName === filename) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // 更新內容
        updateContent(filename);
    }

    files.forEach(file => {
        file.addEventListener('click', () => {
            setActiveFile(file);
            const filename = file.querySelector('.filename').textContent;
            console.log(`切換到檔案: ${filename}`);
        });
    });

    // 初始化 Tab 點擊 (目前僅支援已存在的 Tab)
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filename = tab.querySelector('.tab-name').textContent;
            // 找到對應的 sidebar item
            files.forEach(f => {
                if (f.querySelector('.filename').textContent === filename) {
                    setActiveFile(f);
                }
            });
        });
    });
});
