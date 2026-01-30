/**
 * js/review.js
 * 審題清單頁面專屬邏輯 (重構版)
 * 
 * 此檔案負責管理 cwt-review.html 頁面的審題專屬 JavaScript 邏輯，
 * 包含篩選、統計、Modal 開啟與審題提交等功能。
 * 
 * 注意：專案切換、字體縮放等共用功能由 app.js 處理
 */

// ==========================================
//  全域變數 (使用 var 避免與 app.js 衝突)
// ==========================================
var reviewModal = null;
var reviewToastInstance = null;  // 改名避免與 app.js 衝突
var currentReviewStage = 'mutual'; // mutual, expert, final
var similarityThreshold = 0.8;

// Quill 編輯器實例
var reviewQuillEditors = {
    mutualOpinion: null,
    expertOpinion: null,
    finalOpinion: null
};

// 審題意見 Quill 工具列設定 (與 app.js 的 mainToolbar 相同)
var reviewMainToolbar = [
    [{ 'size': ['small', false, 'large', 'huge'] }],  // 文字大小
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],        // 標題
    [{ 'font': ['kaiu', 'times-new-roman'] }],        // 字體
    [{ 'color': [] }],                                 // 顏色
    [{ 'align': [] }],                                // 對齊
    ['bold', 'underline', 'strike'],                  // 樣式
    ['link'],                                          // 連結
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['clean']
];

// ==========================================
//  初始化入口
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    initReviewBootstrapComponents();
    initReviewQuillEditors();
    initReviewFilter();
    updateReviewStats();
    initReviewProjectHeader();
});

/**
 * 初始化 Bootstrap 元件 (Modal, Toast)
 */
function initReviewBootstrapComponents() {
    const modalEl = document.getElementById('reviewModal');
    if (modalEl) {
        reviewModal = new bootstrap.Modal(modalEl);
    }

    const toastEl = document.getElementById('liveToast');
    if (toastEl) {
        reviewToastInstance = new bootstrap.Toast(toastEl);
    }
}

/**
 * 初始化審題意見 Quill 編輯器
 */
function initReviewQuillEditors() {
    if (typeof Quill === 'undefined') {
        console.warn('Quill 未載入，審題意見將無法使用富文本編輯');
        return;
    }

    // 互審意見編輯器
    const mutualEditorEl = document.getElementById('mutualOpinionEditor');
    if (mutualEditorEl) {
        reviewQuillEditors.mutualOpinion = new Quill('#mutualOpinionEditor', {
            theme: 'snow',
            modules: { toolbar: reviewMainToolbar },
            placeholder: '請填寫您的審題意見，說明題目的優點或需改進之處...'
        });
        bindQuillHelpersReview(reviewQuillEditors.mutualOpinion, 'mutualOpinionEditor');
    }

    // 專審意見編輯器
    const expertEditorEl = document.getElementById('expertOpinionEditor');
    if (expertEditorEl) {
        reviewQuillEditors.expertOpinion = new Quill('#expertOpinionEditor', {
            theme: 'snow',
            modules: { toolbar: reviewMainToolbar },
            placeholder: '請填寫專業審查意見，確認題目的學科正確性與適切性...'
        });
        bindQuillHelpersReview(reviewQuillEditors.expertOpinion, 'expertOpinionEditor');
    }

    // 總審意見編輯器
    const finalEditorEl = document.getElementById('finalOpinionEditor');
    if (finalEditorEl) {
        reviewQuillEditors.finalOpinion = new Quill('#finalOpinionEditor', {
            theme: 'snow',
            modules: { toolbar: reviewMainToolbar },
            placeholder: '請填寫最終審查意見，確認題目整體適切性...'
        });
        bindQuillHelpersReview(reviewQuillEditors.finalOpinion, 'finalOpinionEditor');
    }
}

/**
 * 綁定 Quill 輔助功能 (標點符號插入 + 字數統計)
 * @param {Quill} quillInstance - Quill 實例
 * @param {string} containerId - 編輯器容器 ID
 */
function bindQuillHelpersReview(quillInstance, containerId) {
    const wrapper = document.getElementById(containerId).closest('.quill-master-container');
    if (!wrapper) return;

    // 1. 標點符號插入邏輯
    const puncButtons = wrapper.querySelectorAll('.punc-btn');
    puncButtons.forEach(btn => {
        btn.onclick = function (e) {
            e.preventDefault();
            if (!quillInstance.isEnabled()) return;

            const char = this.getAttribute('data-char');
            const moveBack = parseInt(this.getAttribute('data-back') || '0');
            const range = quillInstance.getSelection(true);

            if (range) {
                quillInstance.insertText(range.index, char);
                quillInstance.setSelection(range.index + char.length - moveBack);
            }
        };
    });

    // 2. 字數偵測邏輯
    const editorName = containerId.replace('Editor', '');
    const countDisplay = document.getElementById('count-' + editorName);
    quillInstance.on('text-change', function () {
        const text = quillInstance.getText().trim();
        const length = text.length === 0 ? 0 : text.length;
        if (countDisplay) {
            countDisplay.innerText = length;
        }
    });
}

/**
 * 插入罐頭訊息到 Quill 編輯器
 * @param {string} editorName - 編輯器名稱 (mutualOpinion / expertOpinion / finalOpinion)
 * @param {string} text - 要插入的文字
 */
function insertQuickTextQuill(editorName, text) {
    const quill = reviewQuillEditors[editorName];
    if (!quill) return;

    const length = quill.getLength();
    const currentText = quill.getText().trim();

    // 如果已有內容，則換行後加入
    if (currentText) {
        quill.insertText(length - 1, '\n' + text);
    } else {
        quill.setText(text);
    }

    // 聚焦並滾動到底部
    quill.focus();
    quill.setSelection(quill.getLength());
}

/**
 * 初始化專案切換 Header (審題頁面版本)
 */
function initReviewProjectHeader() {
    const projectToggle = document.getElementById("projectToggle");
    const projectDropdown = document.getElementById("projectDropdown");
    const closeDropdown = document.getElementById("closeDropdown");
    const projectSearchInput = document.getElementById("projectSearchInput");
    const projectItems = document.querySelectorAll(".project-item");

    if (!projectToggle || !projectDropdown) return;

    // Toggle 下拉選單
    projectToggle.addEventListener("click", function () {
        projectDropdown.classList.toggle("show");
        projectToggle.classList.toggle("active");
    });

    if (closeDropdown) {
        closeDropdown.addEventListener("click", function (e) {
            e.stopPropagation();
            projectDropdown.classList.remove("show");
            projectToggle.classList.remove("active");
        });
    }

    // 點擊外部關閉
    document.addEventListener("click", function (e) {
        if (!projectToggle.contains(e.target) && !projectDropdown.contains(e.target)) {
            projectDropdown.classList.remove("show");
            projectToggle.classList.remove("active");
        }
    });

    // 搜尋功能
    if (projectSearchInput) {
        projectSearchInput.addEventListener("input", function () {
            const keyword = this.value.toLowerCase();
            projectItems.forEach((item) => {
                const name = item.getAttribute("data-name")?.toLowerCase() || '';
                item.style.display = name.includes(keyword) ? "flex" : "none";
            });
        });
    }

    // 選擇專案
    projectItems.forEach((item) => {
        item.addEventListener("click", function () {
            projectItems.forEach((i) => i.classList.remove("active"));
            this.classList.add("active");

            const year = this.getAttribute("data-year");
            const name = this.getAttribute("data-name");
            const role = this.getAttribute("data-role");

            const yearEl = document.getElementById("currentProjectYear");
            const nameEl = document.getElementById("currentProjectName");
            if (yearEl) yearEl.innerText = year + "年度";
            if (nameEl) nameEl.innerText = name;

            const roleMapping = { admin: "系統管理員", reviewer: "審題委員", teacher: "命題教師" };
            const roleClassMapping = { admin: "role-admin", reviewer: "role-reviewer", teacher: "role-teacher" };

            const roleEl = document.getElementById("currentUserRole");
            if (roleEl) {
                roleEl.innerText = roleMapping[role] || role;
                roleEl.className = "role-badge " + (roleClassMapping[role] || "");
            }

            projectDropdown.classList.remove("show");
            projectToggle.classList.remove("active");
        });
    });
}

// ==========================================
//  篩選功能
// ==========================================
/**
 * 初始化篩選功能
 * 監聽篩選條件變更，並即時更新表格顯示
 */
function initReviewFilter() {
    const filterStatus = document.getElementById('filterReviewStatus');
    const filterType = document.getElementById('filterType');
    const filterLevel = document.getElementById('filterLevel');
    const searchInput = document.getElementById('searchInput');

    const doFilter = () => {
        const status = filterStatus?.value || 'all';
        const type = filterType?.value || 'all';
        const level = filterLevel?.value || 'all';
        const keyword = searchInput?.value.toLowerCase() || '';

        const rows = document.querySelectorAll('#reviewTableBody .data-row');
        let visibleCount = 0;

        rows.forEach(row => {
            const rowStatus = row.getAttribute('data-status');
            const rowType = row.getAttribute('data-type');
            const rowLevel = row.getAttribute('data-level');
            const rowText = row.innerText.toLowerCase();

            const matchStatus = status === 'all' || rowStatus === status;
            const matchType = type === 'all' || rowType === type;
            const matchLevel = level === 'all' || rowLevel === level;
            const matchKeyword = keyword === '' || rowText.includes(keyword);

            if (matchStatus && matchType && matchLevel && matchKeyword) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // 顯示/隱藏無資料列
        const noDataRow = document.getElementById('noDataRow');
        if (noDataRow) {
            noDataRow.style.display = visibleCount === 0 ? '' : 'none';
        }

        // 更新可見數量
        const countEl = document.getElementById('visibleCount');
        if (countEl) countEl.innerText = visibleCount;
    };

    // 綁定事件監聽 (安全檢查)
    if (filterStatus) filterStatus.addEventListener('change', doFilter);
    if (filterType) filterType.addEventListener('change', doFilter);
    if (filterLevel) filterLevel.addEventListener('change', doFilter);
    if (searchInput) searchInput.addEventListener('input', doFilter);
}

/**
 * 透過統計卡片快速篩選
 * @param {string} status - 審題狀態 (互審中 / 專審中 / 總審中)
 */
function filterByStatus(status) {
    const filterSelect = document.getElementById('filterReviewStatus');
    if (filterSelect) {
        filterSelect.value = status;
        filterSelect.dispatchEvent(new Event('change'));
    }
}

// ==========================================
//  統計數字更新
// ==========================================
/**
 * 根據表格資料更新統計卡片數字
 */
function updateReviewStats() {
    const rows = document.querySelectorAll('#reviewTableBody .data-row');
    let total = 0, mutual = 0, expert = 0, final = 0;

    rows.forEach(row => {
        const status = row.getAttribute('data-status');
        total++;
        if (status === '互審中') mutual++;
        if (status === '專審中') expert++;
        if (status === '總審中') final++;
    });

    const elTotal = document.getElementById('stat-total');
    const elMutual = document.getElementById('stat-mutual');
    const elExpert = document.getElementById('stat-expert');
    const elFinal = document.getElementById('stat-final');

    if (elTotal) elTotal.innerText = total;
    if (elMutual) elMutual.innerText = mutual;
    if (elExpert) elExpert.innerText = expert;
    if (elFinal) elFinal.innerText = final;
}

// 別名，保持 HTML 呼叫相容
function updateStats() {
    updateReviewStats();
}

// ==========================================
//  審題 Modal 開啟
// ==========================================
function getSimilarityElements() {
    return {
        panel: document.getElementById('similarityPanel'),
        list: document.getElementById('similarityList'),
        warning: document.getElementById('similarityWarning'),
        error: document.getElementById('similarityError'),
        loading: document.getElementById('similarityLoading'),
        empty: document.getElementById('similarityEmpty'),
        statusBadge: document.getElementById('similarityStatusBadge')
    };
}

function resetSimilarityPanel() {
    const elements = getSimilarityElements();
    if (elements.list) elements.list.innerHTML = '';
    if (elements.warning) elements.warning.classList.add('d-none');
    if (elements.error) elements.error.classList.add('d-none');
    if (elements.loading) elements.loading.classList.add('d-none');
    if (elements.empty) elements.empty.classList.remove('d-none');
    if (elements.statusBadge) elements.statusBadge.classList.add('d-none');
}

function setSimilarityLoading(isLoading) {
    const elements = getSimilarityElements();
    if (elements.loading) {
        elements.loading.classList.toggle('d-none', !isLoading);
    }
    if (elements.statusBadge) {
        elements.statusBadge.classList.toggle('d-none', !isLoading);
    }
}

function showSimilarityError(message) {
    const elements = getSimilarityElements();
    if (elements.error) {
        if (message) {
            elements.error.innerText = message;
        }
        elements.error.classList.remove('d-none');
    }
}

function normalizeSimilarityItems(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.matches)) return data.matches;
    return [];
}

function renderSimilarityResults(result) {
    const elements = getSimilarityElements();
    if (!elements.list) return;

    const items = (result && result.items) ? result.items : normalizeSimilarityItems(result);
    const normalized = items.map((item, index) => ({
        title: item.title || item.stem || item.question || `相似題 ${index + 1}`,
        detail: item.detail || item.summary || item.excerpt || '',
        score: Number(item.score ?? item.similarity ?? 0),
        id: item.id
    }));
    const maxScore = normalized.reduce((max, item) => Math.max(max, item.score || 0), 0);

    elements.list.innerHTML = '';
    if (elements.empty) {
        elements.empty.classList.toggle('d-none', normalized.length > 0);
    }
    if (elements.warning) {
        elements.warning.classList.toggle('d-none', maxScore < similarityThreshold);
        if (maxScore >= similarityThreshold) {
            elements.warning.innerHTML = `偵測到相似度 <strong>${Math.round(maxScore * 100)}%</strong> 的題目，請確認是否重複。`;
        }
    }

    normalized.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-start gap-3';
        const detailHtml = item.detail ? `<div class="small text-muted mt-1">${item.detail}</div>` : '';
        const scorePercent = Number.isFinite(item.score) ? Math.round(item.score * 100) : 0;
        li.innerHTML = `
            <div class="flex-grow-1">
                <div class="fw-semibold">${item.title}</div>
                ${detailHtml}
            </div>
            <span class="badge ${scorePercent >= similarityThreshold * 100 ? 'bg-danger' : 'bg-secondary'} similarity-score">
                ${scorePercent}%
            </span>
        `;
        elements.list.appendChild(li);
    });

    return { items: normalized, maxScore };
}

function buildQuestionPayload(row) {
    if (!row) return null;
    const rawJson = row.getAttribute('data-json');
    let payload = null;
    if (rawJson) {
        try {
            payload = JSON.parse(rawJson);
        } catch (error) {
            console.warn('data-json 解析失敗', error);
        }
    }

    if (!payload) {
        payload = {};
    }

    payload.type = payload.type || row.getAttribute('data-type') || '';
    payload.grade = payload.grade || row.getAttribute('data-level') || '';

    return payload;
}

function fetchSimilarity(questionPayload) {
    const elements = getSimilarityElements();
    if (!questionPayload) {
        showSimilarityError('缺少比對資料，請確認題目內容。');
        return Promise.resolve(null);
    }

    if (elements.warning) elements.warning.classList.add('d-none');
    if (elements.error) elements.error.classList.add('d-none');
    if (elements.list) elements.list.innerHTML = '';
    if (elements.empty) elements.empty.classList.add('d-none');

    setSimilarityLoading(true);

    const requestBody = {
        stem: questionPayload.stem || '',
        options: questionPayload.options || [],
        analysis: questionPayload.analysis || '',
        type: questionPayload.type || '',
        grade: questionPayload.grade || ''
    };

    return fetch('/api/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`比對失敗 (${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            const result = renderSimilarityResults({ items: normalizeSimilarityItems(data) });
            setSimilarityLoading(false);
            return result;
        })
        .catch(error => {
            console.error('相似度比對失敗', error);
            setSimilarityLoading(false);
            showSimilarityError('比對服務暫時無法使用，請稍後再試或先完成審題。');
            if (elements.empty) elements.empty.classList.remove('d-none');
            return null;
        });
}

/**
 * 開啟審題 Modal
 * @param {HTMLElement} btn - 觸發按鈕
 * @param {string} stage - 審題階段 (mutual / expert / final)
 */
function openReviewModal(btn, stage) {
    currentReviewStage = stage;

    // 更新 Header 樣式和標題
    const header = document.getElementById('reviewModalHeader');
    const title = document.getElementById('reviewModalTitle');

    if (!header || !title) return;

    header.className = 'modal-header';

    const stageConfig = {
        mutual: {
            headerClass: 'review-mutual',
            titleHtml: '<i class="bi bi-people"></i> 審題 - 互審階段'
        },
        expert: {
            headerClass: 'review-expert',
            titleHtml: '<i class="bi bi-person-badge"></i> 審題 - 專審階段'
        },
        final: {
            headerClass: 'review-final',
            titleHtml: '<i class="bi bi-shield-check"></i> 審題 - 總審階段'
        }
    };

    const config = stageConfig[stage];
    if (config) {
        header.classList.add(config.headerClass);
        title.innerHTML = config.titleHtml;
    }

    // 控制各區塊顯示
    configureSectionVisibility(stage);

    // 清空輸入框
    clearOpinionTextareas();

    // 試題比對
    resetSimilarityPanel();
    const row = btn ? btn.closest('tr') : null;
    const questionPayload = buildQuestionPayload(row);
    if (row && row.dataset.similarityCache) {
        try {
            const cached = JSON.parse(row.dataset.similarityCache);
            renderSimilarityResults(cached);
        } catch (error) {
            console.warn('相似題快取解析失敗', error);
        }
    } else {
        fetchSimilarity(questionPayload).then(result => {
            if (row && result) {
                row.dataset.similarityCache = JSON.stringify(result);
            }
        });
    }
<<<<<<< HEAD
    
=======

>>>>>>> c38ed83e81c5cb7d8bb1ca34e340e971677f4c4c
    // 開啟 Modal
    if (reviewModal) reviewModal.show();
}

/**
 * 根據審題階段配置區塊可見性
 * @param {string} stage - 審題階段
 */
function configureSectionVisibility(stage) {
    const mutualSection = document.getElementById('mutualOpinionSection');
    const expertSection = document.getElementById('expertOpinionSection');
    const finalSection = document.getElementById('finalOpinionSection');

    const mutualEdit = document.getElementById('mutualOpinionEdit');
    const mutualReadonly = document.getElementById('mutualOpinionReadonly');
    const mutualBadge = document.getElementById('mutualOpinionBadge');

    const expertEdit = document.getElementById('expertOpinionEdit');
    const expertReadonly = document.getElementById('expertOpinionReadonly');
    const expertBadge = document.getElementById('expertOpinionBadge');

    // 重置所有區塊
    if (mutualSection) mutualSection.classList.remove('d-none');
    if (expertSection) expertSection.classList.add('d-none');
    if (finalSection) finalSection.classList.add('d-none');

    if (stage === 'mutual') {
        // 互審：只顯示互審意見（可編輯）
        if (mutualEdit) mutualEdit.classList.remove('d-none');
        if (mutualReadonly) mutualReadonly.classList.add('d-none');
        if (mutualBadge) {
            mutualBadge.innerHTML = '<i class="bi bi-pen-fill me-1"></i>必填';
            mutualBadge.className = 'badge bg-purple text-white ms-2';
        }

    } else if (stage === 'expert') {
        // 專審：互審意見唯讀 + 專審意見可編輯
        if (mutualEdit) mutualEdit.classList.add('d-none');
        if (mutualReadonly) mutualReadonly.classList.remove('d-none');
        if (mutualBadge) {
            mutualBadge.innerHTML = '<i class="bi bi-lock-fill me-1"></i>唯讀';
            mutualBadge.className = 'badge bg-primary text-white ms-2';
        }

        if (expertSection) expertSection.classList.remove('d-none');
        if (expertEdit) expertEdit.classList.remove('d-none');
        if (expertReadonly) expertReadonly.classList.add('d-none');
        if (expertBadge) {
            expertBadge.innerHTML = '<i class="bi bi-pen-fill me-1"></i>必填';
            expertBadge.className = 'badge bg-warning text-white ms-2';
        }

    } else if (stage === 'final') {
        // 總審：互審/專審意見唯讀 + 總審意見可編輯
        if (mutualEdit) mutualEdit.classList.add('d-none');
        if (mutualReadonly) mutualReadonly.classList.remove('d-none');
        if (mutualBadge) {
            mutualBadge.innerHTML = '<i class="bi bi-lock-fill me-1"></i>唯讀';
            mutualBadge.className = 'badge bg-primary text-white ms-2';
        }

        if (expertSection) expertSection.classList.remove('d-none');
        if (expertEdit) expertEdit.classList.add('d-none');
        if (expertReadonly) expertReadonly.classList.remove('d-none');
        if (expertBadge) {
            expertBadge.innerHTML = '<i class="bi bi-lock-fill me-1"></i>唯讀';
            expertBadge.className = 'badge bg-primary text-white ms-2';
        }

        if (finalSection) finalSection.classList.remove('d-none');
    }
}

/**
 * 清空所有意見 Quill 編輯器
 */
function clearOpinionTextareas() {
    // 清空所有 Quill 編輯器內容
    Object.keys(reviewQuillEditors).forEach(key => {
        const quill = reviewQuillEditors[key];
        if (quill) {
            quill.setContents([]);  // 清空 Quill 編輯器內容
        }
    });

    // 重設字數顯示
    ['mutualOpinion', 'expertOpinion', 'finalOpinion'].forEach(name => {
        const countEl = document.getElementById('count-' + name);
        if (countEl) countEl.innerText = '0';
    });
}

/**
 * 插入罐頭訊息到指定 textarea
 * @param {string} textareaId - textarea 的 ID
 * @param {string} text - 要插入的文字
 */
function insertQuickText(textareaId, text) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    // 如果已有內容，則換行後加入
    if (textarea.value.trim()) {
        textarea.value += '\n' + text;
    } else {
        textarea.value = text;
    }

    // 聚焦到輸入框
    textarea.focus();
    // 滾動到底部
    textarea.scrollTop = textarea.scrollHeight;
}

// ==========================================
//  提交審題決策
// ==========================================
/**
 * 提交審題決策
 * @param {string} decision - 決策類型 (adopt / adopt-modify / reject)
 */
function submitReview(decision) {
    // 取得當前階段的 Quill 編輯器和標籤
    const stageFieldMap = {
        mutual: { quillKey: 'mutualOpinion', label: '互審意見' },
        expert: { quillKey: 'expertOpinion', label: '專審意見' },
        final: { quillKey: 'finalOpinion', label: '總審意見' }
    };

    const fieldConfig = stageFieldMap[currentReviewStage];
    // 從 Quill 編輯器實例讀取純文字內容
    const quillInstance = reviewQuillEditors[fieldConfig.quillKey];
    const opinionText = quillInstance ? quillInstance.getText().trim() : '';

    // 驗證必填
    if (!opinionText) {
        Swal.fire({
            icon: 'warning',
            title: '請填寫審題意見',
            text: `${fieldConfig.label}為必填欄位`,
            confirmButtonColor: '#2563eb'
        });
        return;
    }

    // 決策設定
    const decisionConfig = {
        adopt: {
            text: '採用',
            icon: 'success',
            color: '#10b981',
            desc: '題目將進入下一審題階段或定稿流程'
        },
        'adopt-modify': {
            text: '改後採用',
            icon: 'warning',
            color: '#f59e0b',
            desc: '題目將退回命題者進行修改'
        },
        reject: {
            text: '不採用',
            icon: 'error',
            color: '#ef4444',
            desc: '題目將退回命題者'
        }
    };

    const config = decisionConfig[decision];

    // 確認對話框
    Swal.fire({
        icon: 'question',
        title: `確定要「${config.text}」此題目？`,
        text: config.desc,
        showCancelButton: true,
        confirmButtonColor: config.color,
        cancelButtonColor: '#6b7280',
        confirmButtonText: `確定${config.text}`,
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            // 模擬提交成功
            if (reviewModal) reviewModal.hide();
            showReviewToast(`審題決策已送出：${config.text}`, 'success');

            // TODO: 實際開發時會呼叫 API
            // updateRowStatus(currentRowId, decision);
        }
    });
}

// ==========================================
//  Toast 通知
// ==========================================
/**
 * 顯示 Toast 通知
 * @param {string} msg - 訊息內容
 * @param {string} type - 類型 (success / error / primary)
 */
function showReviewToast(msg, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl || !reviewToastInstance) return;

    const body = toastEl.querySelector('.toast-body');
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-primary', 'bg-secondary');

    const typeClass = {
        success: 'bg-success',
        error: 'bg-danger',
        primary: 'bg-primary'
    };

    toastEl.classList.add(typeClass[type] || 'bg-primary');
    body.textContent = msg;
    reviewToastInstance.show();
}

// 別名，保持 HTML 呼叫相容
function showToast(msg, type) {
    showReviewToast(msg, type);
}

// ==========================================
//  字體大小調整
// ==========================================
var currentZoom = 100;

/**
 * 調整字體大小
 * @param {number} delta - 調整幅度 (正數放大，負數縮小)
 */
function changeFontSize(delta) {
    currentZoom += delta * 10;
    if (currentZoom < 80) currentZoom = 80;
    if (currentZoom > 150) currentZoom = 150;
    applyZoom();
}

/**
 * 重置字體大小為預設值
 */
function resetFontSize() {
    currentZoom = 100;
    applyZoom();
}

/**
 * 套用縮放設定
 */
function applyZoom() {
    document.body.style.zoom = currentZoom + '%';

    const display = document.getElementById('fontSizeDisplay');
    if (display) {
        display.innerText = `${currentZoom}%`;
        if (currentZoom === 100) {
            display.classList.remove('text-primary');
            display.classList.add('text-secondary');
        } else {
            display.classList.remove('text-secondary');
            display.classList.add('text-primary');
        }
    }
}
