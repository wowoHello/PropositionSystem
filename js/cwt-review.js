/**
 * js/cwt-review.js
 * 審題清單頁面專屬邏輯 (獨立整合版 - V2)
 * 包含：Quill 編輯器、標點符號工具列動態生成、篩選功能、彈窗控制、模擬數據互動
 */

// ==========================================
//  1. 全域變數與設定
// ==========================================
var reviewModal = null;
var toastInstance = null;
var currentZoom = 100;
var currentStage = 'mutual'; // 當前開啟的審題階段 (mutual/expert/final)
var currentRow = null;       // 當前編輯的 Table Row

// Quill 編輯器實體
var editors = {
    mutual: null,
    expert: null,
    final: null
};

// ★ 新增：標點符號工具列 HTML 模板 (與 cwt-list.js 保持一致)
const PUNCTUATION_BAR_HTML = `
<div class="punctuation-toolbar d-flex flex-wrap gap-2 p-2 border-bottom bg-light rounded-top-3">
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="，">，</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="。">。</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="、">、</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="？">？</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="！">！</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="：">：</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="；">；</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="「」" data-back="1">「」</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="『』" data-back="1">『』</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="（）" data-back="1">（）</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="【】" data-back="1">【】</button>
    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="……">……</button>
</div>`;

// Quill 工具列設定
const reviewToolbarOptions = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': ['kaiu', 'times-new-roman'] }],
    [{ 'color': [] }], [{ 'align': [] }],
    ['bold', 'underline', 'strike'], ['link'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }], ['clean']
];

// ==========================================
//  2. 初始化 (DOMContentLoaded)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // A. 初始化 Bootstrap 元件
    const modalEl = document.getElementById('reviewModal');
    if (modalEl) reviewModal = new bootstrap.Modal(modalEl);

    const toastEl = document.getElementById('liveToast');
    if (toastEl) toastInstance = new bootstrap.Toast(toastEl);

    // ★ B. 先渲染標點符號工具列 (必須在 Init Quill 之前)
    renderPunctuationToolbars();

    // C. 初始化 Quill 編輯器
    initQuillEditors();

    // D. 初始化篩選器監聽
    initFilters();

    // E. 初始化統計數據
    updateStats();

    // F. 初始化專案切換選單 (UI 互動)
    initProjectSwitcher();
    
    // G. 初始化字體顯示
    updateFontSizeDisplay();
});

// ==========================================
//  3. 標點符號與 Quill 編輯器邏輯
// ==========================================

// ★ 新增：動態渲染標點符號工具列
function renderPunctuationToolbars() {
    // 定義需要插入工具列的容器 ID (HTML 中的父層 ID)
    const targetContainers = [
        'mutualOpinionEdit', 
        'expertOpinionEdit', 
        'finalOpinionEdit'
    ];

    targetContainers.forEach(id => {
        const parent = document.getElementById(id);
        if (parent) {
            const wrapper = parent.querySelector('.quill-master-container');
            if (wrapper) {
                // 如果 HTML 裡還有舊的靜態工具列，先移除以免重複
                const oldToolbar = wrapper.querySelector('.punctuation-toolbar');
                if (oldToolbar) oldToolbar.remove();

                // 插入新的 HTML 到最前面
                wrapper.insertAdjacentHTML('afterbegin', PUNCTUATION_BAR_HTML);
            }
        }
    });
}

function initQuillEditors() {
    if (typeof Quill === 'undefined') {
        console.error("Quill JS 尚未載入");
        return;
    }

    // 定義要初始化的編輯器 ID 與對應 key
    const editorConfigs = [
        { id: '#mutualOpinionEditor', key: 'mutual', counter: 'count-mutualOpinion' },
        { id: '#expertOpinionEditor', key: 'expert', counter: 'count-expertOpinion' },
        { id: '#finalOpinionEditor', key: 'final', counter: 'count-finalOpinion' }
    ];

    editorConfigs.forEach(config => {
        const el = document.querySelector(config.id);
        if (el) {
            // 建立 Quill
            editors[config.key] = new Quill(config.id, {
                theme: 'snow',
                modules: { toolbar: reviewToolbarOptions },
                placeholder: '請輸入審查意見...'
            });

            // 綁定字數統計
            editors[config.key].on('text-change', function () {
                const text = editors[config.key].getText().trim();
                const countEl = document.getElementById(config.counter);
                if (countEl) countEl.innerText = text.length;
            });

            // 綁定標點符號按鈕
            bindPunctuationButtons(el, editors[config.key]);
        }
    });
}

// 綁定標點符號按鈕事件
function bindPunctuationButtons(editorContainer, quillInstance) {
    const wrapper = editorContainer.closest('.quill-master-container');
    if (!wrapper) return;

    const btns = wrapper.querySelectorAll('.punc-btn');
    btns.forEach(btn => {
        // 先移除可能存在的舊監聽器 (保險起見)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const char = this.getAttribute('data-char');
            const back = parseInt(this.getAttribute('data-back') || 0);
            
            // 插入文字邏輯
            const range = quillInstance.getSelection(true);
            if (range) {
                quillInstance.insertText(range.index, char);
                quillInstance.setSelection(range.index + char.length - back);
            } else {
                // 如果沒有 focus，則插入到最後
                const length = quillInstance.getLength();
                quillInstance.insertText(length - 1, char);
                quillInstance.setSelection(length - 1 + char.length - back);
            }
        });
    });
}

// 快速插入罐頭訊息 (HTML onclick 呼叫用)
window.insertQuickTextQuill = function(editorKeyRef, text) {
    // editorKeyRef 傳入的是 'mutualOpinion'，需轉為 'mutual'
    const key = editorKeyRef.replace('Opinion', ''); 
    const quill = editors[key];
    
    if (quill) {
        const length = quill.getLength();
        // 判斷是否需要換行 (如果不是開頭)
        const prefix = length > 1 ? '\n' : '';
        quill.insertText(length - 1, prefix + text);
        quill.setSelection(quill.getLength()); // 游標移到最後
    }
};

// ==========================================
//  4. 彈窗與業務邏輯 (Modal Logic)
// ==========================================

// 開啟審題彈窗 (HTML onclick 呼叫用)
window.openReviewModal = function(btn, stage) {
    currentStage = stage;
    currentRow = btn.closest('tr'); // 記錄當前操作的行

    // 1. 讀取行資料
    const jsonStr = currentRow.getAttribute('data-json');
    const rowData = jsonStr ? JSON.parse(jsonStr) : {};

    // 2. 設定 Modal Header 樣式
    const header = document.getElementById('reviewModalHeader');
    const title = document.getElementById('reviewModalTitle');
    
    // 重置 class
    header.className = 'modal-header'; 
    
    if (stage === 'mutual') {
        header.classList.add('review-mutual');
        title.innerHTML = '<i class="bi bi-people"></i> 審題 - 互審階段';
        showSection('mutual');
    } else if (stage === 'expert') {
        header.classList.add('review-expert');
        title.innerHTML = '<i class="bi bi-person-badge"></i> 審題 - 專審階段';
        showSection('expert');
    } else if (stage === 'final') {
        header.classList.add('review-final');
        title.innerHTML = '<i class="bi bi-shield-check"></i> 審題 - 總審階段';
        showSection('final');
    }

    // 3. 填充唯讀資料 (題目內容)
    document.getElementById('reviewQuestionContent').innerHTML = rowData.stem || '（無題幹內容）';
    document.getElementById('reviewQuestionType').innerText = rowData.type || '-';
    document.getElementById('reviewQuestionLevel').innerText = rowData.grade || '-';
    
    // 填充選項 (DOM 產生)
    const optionsContainer = document.getElementById('reviewOptionsContainer');
    optionsContainer.innerHTML = '';
    if (rowData.options && Array.isArray(rowData.options)) {
        rowData.options.forEach((opt, idx) => {
            const label = String.fromCharCode(65 + idx); // A, B, C...
            // 簡單判斷是否為正確答案 (假設 JSON 內有標記 analysis)
            const isCorrect = rowData.analysis && rowData.analysis.includes(label); 
            
            const div = document.createElement('div');
            div.className = `option-display ${isCorrect ? 'correct-answer' : ''}`;
            div.innerHTML = `
                <span class="option-label">${label}</span>
                <span class="option-content">${opt}</span>
            `;
            optionsContainer.appendChild(div);
        });
    }

    // 填充解析
    const explainDiv = document.getElementById('reviewExplanation');
    explainDiv.innerHTML = rowData.analysis ? `<p>${rowData.analysis}</p>` : '<p class="text-muted">無解析資料</p>';

    // 4. 清空並重置編輯器
    Object.values(editors).forEach(q => q && q.setText(''));
    document.querySelectorAll('.count-num').forEach(el => el.innerText = '0');

    // 5. 渲染歷史紀錄
    renderHistory(rowData.reviewHistory || []);

    // 6. 模擬「試題比對」載入
    simulateSimilarityCheck();

    reviewModal.show();
};

// 切換顯示的編輯區塊
function showSection(activeKey) {
    // 隱藏所有 section
    document.getElementById('mutualOpinionSection').classList.add('d-none');
    document.getElementById('expertOpinionSection').classList.add('d-none');
    document.getElementById('finalOpinionSection').classList.add('d-none');

    // 顯示當前 section
    document.getElementById(activeKey + 'OpinionSection').classList.remove('d-none');
    
    // 控制編輯/唯讀狀態
    const editDiv = document.getElementById(activeKey + 'OpinionEdit');
    if (editDiv) editDiv.classList.remove('d-none');
    
    const readonlyDiv = document.getElementById(activeKey + 'OpinionReadonly');
    if (readonlyDiv) readonlyDiv.classList.add('d-none');
}

// 渲染歷史紀錄
function renderHistory(historyArray) {
    const list = document.getElementById('reviewDecisionHistoryList');
    const emptyMsg = document.getElementById('reviewDecisionHistoryEmpty');
    list.innerHTML = '';

    if (!historyArray || historyArray.length === 0) {
        emptyMsg.classList.remove('d-none');
        return;
    }

    emptyMsg.classList.add('d-none');
    historyArray.forEach(item => {
        const stageClass = item.stage || 'mutual'; // mutual, expert
        const decisionClass = item.decision === '採用' ? 'decision-adopt' : 
                              item.decision === '不採用' ? 'decision-reject' : 'decision-adopt-modify';
        
        const html = `
            <div class="history-item">
                <div class="history-stage ${stageClass}">${item.stageLabel || '審題'}</div>
                <div class="history-content">
                    <div class="history-reviewer">
                        <span>${item.reviewer}</span>
                        <span class="history-decision ${decisionClass}">${item.decision}</span>
                    </div>
                    <div class="history-text">${item.comment}</div>
                    <div class="history-time">${item.time}</div>
                </div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    });
}

// 模擬比對功能
function simulateSimilarityCheck() {
    const loading = document.getElementById('similarityLoading');
    const list = document.getElementById('similarityList');
    const empty = document.getElementById('similarityEmpty');
    const warning = document.getElementById('similarityWarning');

    // 重置狀態
    loading.classList.remove('d-none');
    list.innerHTML = '';
    empty.classList.add('d-none');
    warning.classList.add('d-none');

    // 模擬延遲 API 回傳
    setTimeout(() => {
        loading.classList.add('d-none');
        
        // 隨機決定是否有相似題 (DEMO 效果)
        const hasSimilarity = Math.random() > 0.5;

        if (hasSimilarity) {
            warning.classList.remove('d-none');
            warning.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> 系統偵測到 <strong>1</strong> 筆高度相似題目，請確認。';
            
            list.innerHTML = `
                <li class="list-group-item d-flex justify-content-between align-items-start">
                    <div class="ms-2 me-auto">
                        <div class="fw-bold">相似題 #10245</div>
                        <small class="text-muted">題目內容：下列選項何者注音正確...</small>
                    </div>
                    <span class="badge bg-danger rounded-pill">92%</span>
                </li>
            `;
        } else {
            empty.classList.remove('d-none');
            empty.innerText = '系統比對完成，未發現高度相似題目。';
        }
    }, 800);
}

// 提交審題 (HTML onclick 呼叫用)
window.submitReview = function(action) {
    // 檢查是否有填寫意見
    const quill = editors[currentStage];
    const content = quill ? quill.getText().trim() : '';
    
    if (content.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: '請填寫意見',
            text: '審題意見為必填欄位',
            confirmButtonColor: '#2563eb'
        });
        return;
    }

    let actionText = '';
    let statusText = '';
    
    if (action === 'adopt') { actionText = '採用'; statusText = '採用'; }
    else if (action === 'adopt-modify') { actionText = '改後再審'; statusText = '改後再審'; }
    else if (action === 'reject') { actionText = '不採用'; statusText = '不採用'; }

    Swal.fire({
        title: `確定要${actionText}？`,
        text: "提交後將進入下一流程",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonText: '取消',
        confirmButtonText: '確定提交'
    }).then((result) => {
        if (result.isConfirmed) {
            // 1. 更新前端 Table 狀態 (DEMO 用)
            if (currentRow) {
                // 更新狀態 Badge
                let badgeClass = 'badge-completed';
                if (statusText === '改後再審') badgeClass = 'badge-returned';
                if (statusText === '不採用') badgeClass = 'badge-rejected';
                if (statusText === '採用') badgeClass = 'badge-approved';
                
                // 更新第 4 欄 (狀態)
                currentRow.cells[3].innerHTML = `<span class="badge-outline ${badgeClass}">${statusText}</span>`;
                currentRow.setAttribute('data-status', statusText);
                
                // 更新操作按鈕 (鎖定)
                currentRow.querySelector('.action-links').innerHTML = `
                    <button class="btn btn-link p-0 text-decoration-none fw-bold text-secondary" disabled>
                        <i class="bi bi-check2-circle me-1"></i>已決策
                    </button>
                `;
            }

            // 2. 顯示成功訊息
            showToast(`已提交決策：${actionText}`, 'success');
            
            // 3. 關閉 Modal
            reviewModal.hide();

            // 4. 更新統計
            updateStats();
        }
    });
};

// ==========================================
//  5. 篩選與統計邏輯 (Filters & Stats)
// ==========================================

function initFilters() {
    const inputs = ['filterType', 'filterLevel', 'filterReviewStatus', 'searchInput'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(id === 'searchInput' ? 'input' : 'change', filterTable);
        }
    });
}

// 點擊統計卡片快速篩選
window.filterByStatus = function(status) {
    const select = document.getElementById('filterReviewStatus');
    if (select) {
        select.value = status;
        filterTable();
    }
};

function filterTable() {
    const type = document.getElementById('filterType').value;
    const level = document.getElementById('filterLevel').value;
    const status = document.getElementById('filterReviewStatus').value;
    const keyword = document.getElementById('searchInput').value.toLowerCase();

    const rows = document.querySelectorAll('.data-row');
    let count = 0;

    rows.forEach(row => {
        const dType = row.getAttribute('data-type');
        const dLevel = row.getAttribute('data-level');
        const dStatus = row.getAttribute('data-status');
        const text = row.innerText.toLowerCase();

        let show = true;
        if (type !== 'all' && dType !== type) show = false;
        if (level !== 'all' && dLevel !== level) show = false;
        if (status !== 'all' && dStatus !== status) show = false;
        if (keyword && !text.includes(keyword)) show = false;

        row.style.display = show ? '' : 'none';
        if (show) count++;
    });

    document.getElementById('visibleCount').innerText = count;
    
    // 處理查無資料
    const noData = document.getElementById('noDataRow');
    if (noData) noData.style.display = count === 0 ? 'table-row' : 'none';
}

function updateStats() {
    const rows = document.querySelectorAll('.data-row');
    const stats = {
        total: rows.length,
        mutual: 0,
        expert: 0,
        final: 0,
        adopted: 0,
        revise: 0,
        rejected: 0
    };

    rows.forEach(row => {
        const s = row.getAttribute('data-status');
        if (s === '互審中') stats.mutual++;
        else if (s === '專審中') stats.expert++;
        else if (s === '總審中') stats.final++;
        else if (s === '採用') stats.adopted++;
        else if (s === '改後再審') stats.revise++;
        else if (s === '不採用') stats.rejected++;
    });

    // 待審總計 (互審+專審+總審)
    const todoTotal = stats.mutual + stats.expert + stats.final;

    safeSetText('stat-total', todoTotal);
    safeSetText('stat-mutual', stats.mutual);
    safeSetText('stat-expert', stats.expert);
    safeSetText('stat-final', stats.final);
    safeSetText('stat-adopted', stats.adopted);
    safeSetText('stat-revise', stats.revise);
    safeSetText('stat-rejected', stats.rejected);
}

function safeSetText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

// ==========================================
//  6. UI 工具 (字體、Toast、專案切換)
// ==========================================

// 字體大小控制
window.changeFontSize = function(dir) {
    if (dir === 1 && currentZoom < 150) currentZoom += 10;
    if (dir === -1 && currentZoom > 80) currentZoom -= 10;
    updateFontSizeDisplay();
};

window.resetFontSize = function() {
    currentZoom = 100;
    updateFontSizeDisplay();
};

function updateFontSizeDisplay() {
    document.documentElement.style.fontSize = `${currentZoom}%`;
    const display = document.getElementById('fontSizeDisplay');
    if (display) {
        display.innerText = `${currentZoom}%`;
        display.className = currentZoom === 100 ? 
            'small fw-bold text-secondary mx-2 user-select-none' : 
            'small fw-bold text-primary mx-2 user-select-none';
    }
}

// Toast 顯示 helper
function showToast(msg, type = 'primary') {
    const toastEl = document.getElementById('liveToast');
    if (toastEl) {
        toastEl.className = `toast align-items-center text-white border-0 bg-${type}`;
        toastEl.querySelector('.toast-body').innerText = msg;
        if (toastInstance) toastInstance.show();
    }
}

// 專案切換器 (純 UI 互動，不涉及後端)
function initProjectSwitcher() {
    const toggle = document.getElementById('projectToggle');
    const dropdown = document.getElementById('projectDropdown');
    const closeBtn = document.getElementById('closeDropdown');
    const items = document.querySelectorAll('.project-item');

    if (!toggle || !dropdown) return;

    // 開關選單
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        toggle.classList.toggle('active');
    });

    // 關閉按鈕
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.remove('show');
            toggle.classList.remove('active');
        });
    }

    // 點擊項目
    items.forEach(item => {
        item.addEventListener('click', function() {
            // 移除舊 active
            items.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // 更新顯示文字
            const name = this.getAttribute('data-name');
            const year = this.getAttribute('data-year');
            const role = this.getAttribute('data-role'); // admin, reviewer, teacher
            
            document.getElementById('currentProjectName').innerText = name;
            document.getElementById('currentProjectYear').innerText = year + '年度';
            
            // 更新角色 Badge
            const roleEl = document.getElementById('currentUserRole');
            const roleMap = { 'admin': '系統管理員', 'reviewer': '審題委員', 'teacher': '命題教師' };
            const classMap = { 'admin': 'role-admin', 'reviewer': 'role-reviewer', 'teacher': 'role-teacher' };
            
            if (roleEl) {
                roleEl.innerText = roleMap[role];
                roleEl.className = `role-badge ${classMap[role]}`;
            }

            // 關閉選單
            dropdown.classList.remove('show');
            toggle.classList.remove('active');
        });
    });

    // 點擊外部關閉
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
            dropdown.classList.remove('show');
            toggle.classList.remove('active');
        }
    });
}