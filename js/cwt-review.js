/**
 * js/cwt-review.js
 * 審題清單頁面專屬邏輯 (獨立整合版 - V2)
 * 包含：Quill 編輯器、標點符號工具列動態生成、篩選功能、彈窗控制、模擬數據互動
 */

// ==========================================
//  1. 全域變數與設定
// ==========================================
let reviewModal = null;
let currentStage = 'mutual'; // 當前開啟的審題階段 (mutual/expert/final)
let currentRow = null;       // 當前編輯的 Table Row

// Quill 編輯器實體
const editors = {
    mutual: null,
    expert: null,
    final: null
};

// 標點符號工具列 HTML 模板 (已移至 app.js)

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
    if (modalEl) reviewModal = bootstrap.Modal.getOrCreateInstance(modalEl);

    // B. 先渲染標點符號工具列 (必須在 Init Quill 之前)
    renderPunctuationToolbars();

    // C. 初始化 Quill 編輯器
    initQuillEditors();

    // D. 初始化篩選器監聽
    initFilters();

    // E. 初始化統計數據
    updateStats();

    // 初始化 Tab 功能
    initReviewTabs();

    // 預設載入時，先執行一次篩選 (預設為 working_all)
    filterByStatus('working_all');
});

// ==========================================
//  3. 標點符號與 Quill 編輯器邏輯
// ==========================================

// 動態渲染標點符號工具列
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
// ✅ 效能修復：移除 cloneNode+replaceChild 反模式，改用事件委派避免重複綁定
function bindPunctuationButtons(editorContainer, quillInstance) {
    const wrapper = editorContainer.closest('.quill-master-container');
    if (!wrapper) return;

    // 使用事件委派：在父層監聽 click，透過 e.target 判斷是否為 .punc-btn
    const toolbar = wrapper.querySelector('.punctuation-toolbar');
    if (!toolbar || toolbar.dataset.bound) return; // 避免重複綁定
    toolbar.dataset.bound = 'true';

    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.punc-btn');
        if (!btn) return;
        e.preventDefault();

        const char = btn.getAttribute('data-char');
        const back = parseInt(btn.getAttribute('data-back') || 0);

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
}

// 快速插入罐頭訊息 (HTML onclick 呼叫用)
window.insertQuickTextQuill = function (editorKeyRef, text) {
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

// ==========================================
//  4a. 題目內容渲染 (支援 7 種題型)
// ==========================================
function renderQuestionContent(rowData) {
    const type = rowData.type || '';
    const isGroupType = ['閱讀題組', '短文題組', '聽力題組'].includes(type);
    const isListeningType = ['聽力題目', '聽力題組'].includes(type);
    const isEssayType = type === '長文題目';

    // ---------- 1. 題幹 ----------
    const stemEl = document.getElementById('reviewQuestionContent');
    stemEl.innerHTML = '';

    // 聽力音檔 placeholder
    if (isListeningType || rowData.hasAudio) {
        stemEl.innerHTML += `
            <div class="review-audio-player">
                <i class="bi bi-volume-up-fill"></i>
                <div style="flex:1">
                    <div class="fw-bold small mb-1">聽力音檔</div>
                    <audio controls style="width:100%;height:32px"><source src="#" type="audio/mpeg"></audio>
                </div>
            </div>`;
    }

    // 文章段落（閱讀/短文題組）
    if (rowData.article) {
        const articleHtml = escapeHtml(rowData.article).replace(/\n/g, '<br>');
        stemEl.innerHTML += `
            <div class="review-article-box mb-3">
                <div class="review-article-label"><i class="bi bi-book me-1"></i>文本 / 資料</div>
                <div class="review-article-content">${articleHtml}</div>
            </div>`;
    }

    // 題幹文字
    const stemHtml = (rowData.stem ? escapeHtml(rowData.stem).replace(/\n/g, '<br>') : '（無題幹內容）');
    stemEl.innerHTML += `<p style="line-height:1.8">${stemHtml}</p>`;

    // ---------- 2. 選項 ----------
    const optWrapper = document.getElementById('reviewOptionsWrapper');
    const optContainer = document.getElementById('reviewOptionsContainer');
    optContainer.innerHTML = '';

    if (!isGroupType && !isEssayType && rowData.options && rowData.options.length > 0) {
        // 一般 / 精選 / 聽力題目：平面選項
        optWrapper.style.display = '';
        rowData.options.forEach((opt, idx) => {
            const label = String.fromCharCode(65 + idx);
            const isCorrect = rowData.analysis && rowData.analysis.includes(label);
            optContainer.innerHTML += `
                <div class="option-display ${isCorrect ? 'correct-answer' : ''}">
                    <span class="option-label">${label}</span>
                    <span class="option-content">${escapeHtml(opt)}</span>
                </div>`;
        });
    } else if (isEssayType) {
        // 長文題目：寫作引導
        optWrapper.style.display = '';
        optContainer.innerHTML = `
            <div class="review-essay-prompt">
                <i class="bi bi-pencil-square me-1"></i>
                論述題（自由作答）
                ${rowData.wordLimit ? '<span class="ms-2 text-muted">建議字數：' + escapeHtml(rowData.wordLimit) + '</span>' : ''}
            </div>`;
    } else {
        // 題組類型：選項由子題各自呈現
        optWrapper.style.display = 'none';
    }

    // ---------- 3. 子題（題組類型） ----------
    const subContainer = document.getElementById('reviewSubQuestionsContainer');
    subContainer.innerHTML = '';

    if (isGroupType && rowData.subQuestions && rowData.subQuestions.length > 0) {
        let subHtml = '<div class="review-sub-questions">';
        subHtml += '<label class="form-label fw-bold small text-secondary mb-2">子題</label>';

        rowData.subQuestions.forEach((sub, i) => {
            subHtml += `<div class="review-sub-question">
                <div class="review-sub-number">第 ${i + 1} 題</div>
                <div class="review-sub-stem">${escapeHtml(sub.stem).replace(/\n/g, '<br>')}</div>`;

            if (sub.options && sub.options.length > 0) {
                // 選擇題子題
                sub.options.forEach((opt, j) => {
                    const label = String.fromCharCode(65 + j);
                    const isAns = sub.answer === label;
                    subHtml += `
                        <div class="option-display ${isAns ? 'correct-answer' : ''}" style="margin-left:0.5rem">
                            <span class="option-label">${label}</span>
                            <span class="option-content">${escapeHtml(opt)}</span>
                        </div>`;
                });
            } else {
                // 論述題子題
                subHtml += `
                    <div class="review-essay-prompt" style="margin-left:0.5rem">
                        <i class="bi bi-pencil-square me-1"></i>論述題（自由作答）
                    </div>`;
            }

            if (sub.explanation) {
                subHtml += `
                    <div class="review-sub-explanation">
                        <i class="bi bi-lightbulb me-1"></i>${escapeHtml(sub.explanation)}
                    </div>`;
            }
            subHtml += '</div>';
        });

        subHtml += '</div>';
        subContainer.innerHTML = subHtml;
    }

    // ---------- 4. 解析 ----------
    const explainDiv = document.getElementById('reviewExplanation');
    if (rowData.analysis) {
        explainDiv.innerHTML = `<p>${escapeHtml(rowData.analysis).replace(/\n/g, '<br>')}</p>`;
    } else {
        explainDiv.innerHTML = '<p class="text-muted">無解析資料</p>';
    }
}

// ==========================================
//  4b. 彈窗與業務邏輯 (Modal Logic)
// ==========================================

// 開啟審題彈窗 (HTML onclick 呼叫用)
window.openReviewModal = function (btn, stage) {
    currentStage = stage;
    currentRow = btn.closest('tr'); // 記錄當前操作的行

    // 1. 讀取行資料
    const jsonStr = currentRow.getAttribute('data-json');
    const rowData = jsonStr ? safeJsonParse(jsonStr, {}) : {};

    // 2. 設定 Modal Header 樣式
    const header = document.getElementById('reviewModalHeader');
    const title = document.getElementById('reviewModalTitle');
    const reviewActions = document.querySelector('.review-actions');
    const isHistory = (stage === 'history');

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
    } else if (isHistory) {
        header.classList.add('review-history');
        title.innerHTML = '<i class="bi bi-clock-history"></i> 檢視 - 審題紀錄';
        // 歷史模式：隱藏所有意見編輯區，僅保留題目內容 + 試題比對 + 審題決策紀錄
        document.getElementById('mutualOpinionSection').classList.add('d-none');
        document.getElementById('expertOpinionSection').classList.add('d-none');
        document.getElementById('finalOpinionSection').classList.add('d-none');
    }

    // 歷史模式隱藏決策按鈕，審題模式恢復顯示
    if (reviewActions) {
        reviewActions.classList.toggle('d-none', isHistory);
    }

    // 依據 PRD 規則設定各階段決策按鈕顯示
    const btnSubmitOpinion = document.getElementById('btnSubmitOpinion');
    const btnAdopt = document.getElementById('btnAdopt');
    const btnAdoptModify = document.getElementById('btnAdoptModify');
    const btnReject = document.getElementById('btnReject');

    if (!isHistory) {
        if (stage === 'mutual') {
            // 互審：僅提供意見，無任何決策按鈕
            if (btnSubmitOpinion) btnSubmitOpinion.classList.remove('d-none');
            if (btnAdopt) btnAdopt.classList.add('d-none');
            if (btnAdoptModify) btnAdoptModify.classList.add('d-none');
            if (btnReject) btnReject.classList.add('d-none');
        } else if (stage === 'expert') {
            // 專審：僅「採用」與「改後再審」，無「不採用」
            if (btnSubmitOpinion) btnSubmitOpinion.classList.add('d-none');
            if (btnAdopt) btnAdopt.classList.remove('d-none');
            if (btnAdoptModify) btnAdoptModify.classList.remove('d-none');
            if (btnReject) btnReject.classList.add('d-none');
        } else if (stage === 'final') {
            // 總審：「採用」「改後再審」「不採用」三種決策
            if (btnSubmitOpinion) btnSubmitOpinion.classList.add('d-none');
            if (btnAdopt) btnAdopt.classList.remove('d-none');
            if (btnAdoptModify) btnAdoptModify.classList.remove('d-none');
            if (btnReject) btnReject.classList.remove('d-none');
        }
    }

    // 3. 填充唯讀資料 (題目內容) — 支援 7 種題型
    document.getElementById('reviewQuestionType').innerText = rowData.type || '-';
    document.getElementById('reviewQuestionLevel').innerText = rowData.grade || '-';

    // 從 tr 取得送審時間
    const submitTimeCell = currentRow.cells[5];
    if (submitTimeCell) {
        document.getElementById('reviewSubmitTime').innerText = submitTimeCell.innerText.trim();
    }

    // 呼叫統一渲染函式
    renderQuestionContent(rowData);

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
window.submitReview = function (action) {
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

    if (action === 'opinion-only') { actionText = '提交意見'; }
    else if (action === 'adopt') { actionText = '採用'; statusText = '採用'; }
    else if (action === 'adopt-modify') { actionText = '改後再審'; statusText = '改後再審'; }
    else if (action === 'reject') { actionText = '不採用'; statusText = '不採用'; }

    Swal.fire({
        title: `確定要${actionText}？`,
        text: action === 'opinion-only' ? '提交後將記錄您的互審意見' : '提交後將進入下一流程',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonText: '取消',
        confirmButtonText: '確定提交'
    }).then((result) => {
        if (result.isConfirmed) {
            // [Blazor Migration Note] The following DOM updates for the table row (updating status badges and buttons)
            // simulate state changes. In Blazor, this will be handled automatically by data binding to the model.
            // 1. 更新前端 Table 狀態 (DEMO 用)
            if (currentRow) {
                let badgeClass = 'badge-completed';
                let finalStatusText = statusText;

                // 根據 PRD 七階段審題流程規則處理狀態流轉
                if (currentStage === 'mutual') {
                    // 互審僅提供意見 → 進入互審修題（教師依意見修改）
                    finalStatusText = '互審修題';
                    badgeClass = 'badge-expert';
                } else if (currentStage === 'expert') {
                    if (action === 'adopt') {
                        // 專審採用 → 進入總召審題
                        finalStatusText = '總審中';
                        badgeClass = 'badge-final';
                    } else {
                        // 專審改後再審 → 進入專審修題，教師修改後直接進總審
                        finalStatusText = '專審修題';
                        badgeClass = 'badge-returned';
                    }
                } else if (currentStage === 'final') {
                    // 總審階段 → 追蹤退回次數
                    const returnCount = parseInt(currentRow.getAttribute('data-return-count') || '0');

                    if (action === 'adopt') {
                        finalStatusText = '採用';
                        badgeClass = 'badge-approved';
                    } else if (action === 'reject') {
                        finalStatusText = '不採用';
                        badgeClass = 'badge-rejected';
                    } else if (action === 'adopt-modify') {
                        const newCount = returnCount + 1;
                        currentRow.setAttribute('data-return-count', newCount);

                        if (newCount >= 3) {
                            // 第三次不通過：由總審自行修改並裁決
                            finalStatusText = '總審修題';
                            badgeClass = 'badge-final';
                            // 提示總審需自行修改
                            Swal.fire({
                                icon: 'info',
                                title: '已達退回上限',
                                text: '此題已退回 3 次，將由總審自行修改試題並給予最終裁決。',
                                confirmButtonColor: '#2563eb'
                            });
                        } else {
                            // 第 1-2 次退回：回到總審修題，教師修改後再回到總審
                            finalStatusText = '總審修題';
                            badgeClass = 'badge-returned';
                        }
                    }
                }

                // 更新第 4 欄 (狀態)
                currentRow.cells[3].innerHTML = `<span class="badge-outline ${badgeClass}">${finalStatusText}</span>`;
                currentRow.setAttribute('data-status', finalStatusText);

                // 更新操作按鈕 (鎖定顯示已決策)
                currentRow.querySelector('.action-links').innerHTML = `
                    <button class="btn btn-link p-0 text-decoration-none fw-bold text-secondary" disabled>
                        <i class="bi bi-check2-circle me-1"></i>已決策
                    </button>
                `;
            }

            // 2. 顯示成功訊息
            showToast(`已提交：${actionText}`, 'success');

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
// ★ 新增：Tab 切換邏輯
function initReviewTabs() {
    window.currentTab = 'working'; // 預設 Tab

    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            const targetType = event.target.getAttribute('data-tab-type');
            window.currentTab = targetType;

            const workingStats = document.getElementById('stats-working');
            const historyStats = document.getElementById('stats-history');
            const searchArea = document.querySelector('.search-area');
            const workingHint = document.getElementById('workingHint');
            // 1. 切換統計卡片顯示
            if (targetType === 'working') {
                if (workingStats) workingStats.classList.remove('d-none');
                if (historyStats) historyStats.classList.add('d-none');
                if (workingHint) workingHint.classList.remove('d-none');
                // 2. 切換時自動重置篩選為該區塊的「全部」
                filterByStatus('working_all');

                // (選用) 視覺微調：讓 Search Area 圓角變化
                if (searchArea) searchArea.style.borderTopLeftRadius = '0';
            } else {
                if (workingStats) workingStats.classList.add('d-none');
                if (historyStats) historyStats.classList.remove('d-none');
                if (workingHint) workingHint.classList.add('d-none');
                filterByStatus('history_all');

                if (searchArea) searchArea.style.borderTopLeftRadius = '12px'; // 恢復圓角(視Tab位置而定)
            }
        });
    });
}

function initFilters() {
    const inputs = ['filterType', 'filterLevel', 'filterReviewStatus', 'searchInput'];
    let searchTimeout;
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(id === 'searchInput' ? 'input' : 'change', (e) => {
                if (e.target.id === 'searchInput') {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(filterTable, 300);
                } else {
                    filterTable();
                }
            });
        }
    });
}

// [Blazor Migration Note] The filtering functions here hide/show HTML elements via CSS. 
// In Blazor, this should be handled by filtering the data collection and letting the UI re-render.
// 點擊統計卡片快速篩選
window.filterByStatus = function (status) {
    const rows = document.querySelectorAll('tbody tr.data-row');
    let visibleCount = 0;

    // 更新下拉選單 UI (如果是從卡片點擊觸發)
    const statusSelect = document.getElementById('filterReviewStatus');
    if (statusSelect) {
        if (status === 'working_all' || status === 'history_all') {
            statusSelect.value = 'all';
        } else if (status !== 'all') { // 避免 'all' 覆蓋掉具體狀態
            statusSelect.value = status;
        }
    }

    // 七階段審題流程狀態分組
    const workingStatuses = ['互審中', '專審中', '總審中', '交互審題', '互審修題', '專審修題', '總審修題'];
    const historyStatuses = ['採用', '不採用'];

    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        let show = false;

        if (status === 'working_all') {
            // 顯示所有作業區狀態
            if (workingStatuses.includes(rowStatus)) show = true;
        } else if (status === 'history_all') {
            // 顯示所有歷史區狀態（僅採用/不採用，題目判決後才進入）
            if (historyStatuses.includes(rowStatus)) show = true;
        } else if (status === 'all') {
            // 視當前 Tab 決定顯示哪些
            if (window.currentTab === 'working') {
                if (workingStatuses.includes(rowStatus)) show = true;
            } else {
                if (historyStatuses.includes(rowStatus)) show = true;
            }
        } else {
            // 單一狀態
            if (rowStatus === status) show = true;
        }

        // 這裡可以加上原本的文字搜尋與下拉篩選的綜合判斷...
        // 為了簡化，這裡假設卡片點擊擁有最高優先權

        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });

    // 更新數字
    const countEl = document.getElementById('visibleCount');
    if (countEl) countEl.innerText = visibleCount;

    // 更新後方文字
    const labelEl = document.getElementById('countLabel');
    if (labelEl) {
        // 判斷目前是在哪個 Tab (變數來自 initReviewTabs)
        if (window.currentTab === 'history') {
            labelEl.innerText = '筆審核歷史';
        } else {
            labelEl.innerText = '筆待審題目';
        }
    }

    const noDataRow = document.getElementById('noDataRow');
    if (noDataRow) {
        noDataRow.style.display = visibleCount === 0 ? 'table-row' : 'none';
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
    let counts = {
        mutual: 0, expert: 0, final: 0, // Working（審題中）
        adopt: 0, reject: 0             // History（僅採用/不採用）
    };
    let totalWorkingPending = 0; // 只計算含有「審題」按鈕的數量

    // 七階段審題流程中，屬於「作業中」的所有狀態
    const workingStatuses = ['互審中', '專審中', '總審中', '交互審題', '互審修題', '專審修題', '總審修題'];

    const rows = document.querySelectorAll('tbody tr.data-row');
    rows.forEach(row => {
        const status = row.getAttribute('data-status');

        // 判斷按鈕文字是否包含「審題」
        const actionBtn = row.querySelector('.action-links button');
        const isPendingReview = actionBtn && actionBtn.textContent.includes('審題');

        if (status === '互審中' || status === '交互審題') counts.mutual++;
        else if (status === '專審中') counts.expert++;
        else if (status === '總審中') counts.final++;
        else if (status === '採用') counts.adopt++;
        else if (status === '不採用') counts.reject++;
        // 互審修題/專審修題/總審修題 屬於修題狀態，不計入審題統計卡片

        if (workingStatuses.includes(status) && isPendingReview) {
            totalWorkingPending++;
        }
    });

    const totalHistory = counts.adopt + counts.reject;

    // Helper
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    // Group A（審題作業區）
    setTxt('stat-total-working', totalWorkingPending);
    setTxt('stat-mutual', counts.mutual);
    setTxt('stat-expert', counts.expert);
    setTxt('stat-final', counts.final);

    // Group B（審核結果與歷史 - 僅採用/不採用）
    setTxt('stat-total-history', totalHistory);
    setTxt('stat-adopt', counts.adopt);
    setTxt('stat-reject', counts.reject);
    // 移除「改後再審」的獨立統計（改後再審為中間狀態，不進入歷史區）
}

// ==========================================
//  6. UI 工具 (已移至 app.js)
// ==========================================

// showToast() 已移至 app.js 共用