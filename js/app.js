/**
 * 整合版 Javascript (原 app.js + global.js)
 * 包含：專案切換、角色管理、試題 CRUD、表格篩選、字體調整
 */

// ==========================================
//  1. 全域設定 (Configs & Constants)
// ==========================================
// --- 註冊 Quill 自訂字體 ---
// 必須在建立 Quill 實體前執行
if (typeof Quill !== 'undefined') {
    try {
        // 嘗試使用標準路徑或備用路徑
        const Font = Quill.import('attributors/class/font') || Quill.import('formats/font');
        Font.whitelist = [
            'microsoft-jhenghei',
            'kaiu',
            'times-new-roman',
            'arial',
            'comic-sans-ms'
        ];
        Quill.register(Font, true);
    } catch (e) {
        console.warn("Quill 字體註冊失敗，將使用預設字體", e);
    }
}

// --- 統一的 Toolbar 設定 ---
function bindQuillHelpers(quillInstance, containerId) {
    const wrapper = document.getElementById(containerId).closest('.quill-master-container');
    if (!wrapper) return;

    // 1. 標點符號插入邏輯
    const puncButtons = wrapper.querySelectorAll('.punc-btn');
    puncButtons.forEach(btn => {
        btn.onclick = function (e) {
            e.preventDefault(); // 防止按鈕觸發 form submit

            if (!quillInstance.isEnabled()) {
                return;
            }

            // 1. 取得要插入的符號
            const char = this.getAttribute('data-char');

            // ★★★ 2. 新增：取得要「往回退」的格數 (修正點) ★★★
            const moveBack = parseInt(this.getAttribute('data-back') || '0');

            const range = quillInstance.getSelection(true);

            if (range) {
                // 3. 插入文字
                quillInstance.insertText(range.index, char);

                // ★★★ 4. 設定新游標位置 (修正點) ★★★
                // 原本是： range.index + char.length
                // 改為：   range.index + char.length - moveBack
                quillInstance.setSelection(range.index + char.length - moveBack);
            }
        };
    });

    // 2. 字數偵測邏輯
    const countDisplay = wrapper.querySelector('.count-num');
    quillInstance.on('text-change', function () {
        const text = quillInstance.getText().trim();
        // Quill 空白時會回傳 \n，所以要排除
        const length = text.length === 0 ? 0 : text.length;
        if (countDisplay) {
            countDisplay.innerText = length;
        }
    });
}
// 設定 A：全功能 (用於：系統公告、命題題幹、閱讀題組文章)
window.mainToolbar = [
    [{ 'size': ['small', false, 'large', 'huge'] }],  // 文字大小
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],        // 標題
    [{ 'font': ['kaiu', 'times-new-roman'] }], // 字體
    [{ 'color': [] }],          // 顏色
    [{ 'align': [] }],                                // 對齊
    ['bold', 'underline', 'strike'],        // 樣式
    ['link'],                       // 媒體 (選項通常不需要 video，但在主旨需要)
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['clean']
];

// 設定 B：精簡版 (用於：選項 A/B/C/D)
// 去除了影片/圖片與區塊引用，保留標題與連結，避免選項框太擠
window.optionToolbar = [
    [{ 'size': ['small', false, 'large', 'huge'] }],  // 文字大小
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],        // 標題
    [{ 'font': ['kaiu', 'times-new-roman'] }], // 字體
    [{ 'color': [] }],          // 顏色
    [{ 'align': [] }],                                // 對齊
    ['bold', 'underline', 'strike'],        // 樣式
    ['link'],                       // 媒體 (選項通常不需要 video，但在主旨需要)
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['clean']
];

// 模擬專案資料 (原本在 global.js)
const mockProjects = [
    { id: 1, name: "進行中梯次範例一", year: 2024, role: "admin" },
    { id: 2, name: "進行中梯次範例二", year: 2024, role: "reviewer" },
    { id: 3, name: "進行中梯次範例三", year: 2024, role: "teacher" },
    { id: 4, name: "已結束梯次範例一", year: 2023, role: "admin" },
    { id: 5, name: "已結束梯次範例二", year: 2023, role: "teacher" },
    { id: 6, name: "已結束梯次範例三", year: 2023, role: "reviewer" },
    { id: 7, name: "已結束梯次範例四", year: 2022, role: "teacher" },
    { id: 8, name: "已結束梯次範例五", year: 2022, role: "teacher" },
];

// 模擬公告資料
const mockAnnouncements = [
    { id: 1, title: "113年度 命題規範更新說明", category: "命題公告", startDate: "2026-01-20", endDate: "", boundProject: "all", status: "published", content: "...", isPinned: true },
    { id: 2, title: "試題審查重點提示", category: "審題公告", startDate: "2026-01-19", endDate: "2026-02-19", boundProject: "all", status: "published", content: "...", isPinned: false },
    { id: 3, title: "系統維護公告", category: "系統公告", startDate: "2026-01-15", endDate: "2026-01-16", boundProject: "all", status: "offshelf", content: "...", isPinned: false },
    { id: 4, title: "辦公室春節休假通知", category: "其他", startDate: "2026-01-10", endDate: "", boundProject: 1, status: "published", content: "...", isPinned: false },
];

// 角色對照表
const RoleMapping = {
    admin: "系統管理員",
    reviewer: "審題委員",
    teacher: "命題教師",
};
const RoleClassMapping = {
    admin: "role-admin",
    reviewer: "role-reviewer",
    teacher: "role-teacher",
};

// 題型映射表 (Manager Pattern)
const TypeHandlers = {
    '一般題目': typeof GeneralHandler !== 'undefined' ? GeneralHandler : null,
    '精選題目': typeof GeneralHandler !== 'undefined' ? GeneralHandler : null,
    '閱讀題組': typeof ReadingHandler !== 'undefined' ? ReadingHandler : null,
    '長文題目': typeof LongArticleHandler !== 'undefined' ? LongArticleHandler : null,
    '短文題組': typeof ShortArticleHandler !== 'undefined' ? ShortArticleHandler : null,
    '聽力題目': typeof ListenHandler !== 'undefined' ? ListenHandler : null,
    '聽力題組': typeof ListenGroupHandler !== 'undefined' ? ListenGroupHandler : null,
};

// ==========================================
//  2. 全域變數 (Global State)
// ==========================================
let propModal;
let toastInstance;
let currentZoom = 100; // 字體縮放預設值

// ==========================================
//  3. 初始化入口 (DOMContentLoaded)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // A. 初始化 Bootstrap 元件
    const modalEl = document.getElementById('propModal');
    if (modalEl) propModal = new bootstrap.Modal(modalEl);

    const toastEl = document.getElementById('liveToast');
    if (toastEl) toastInstance = new bootstrap.Toast(toastEl);

    // B. 初始化 Handlers (如果有的話)
    if (TypeHandlers['一般題目'] && TypeHandlers['一般題目'].init) TypeHandlers['一般題目'].init();
    if (TypeHandlers['閱讀題組'] && TypeHandlers['閱讀題組'].init) TypeHandlers['閱讀題組'].init();
    if (TypeHandlers['長文題目'] && TypeHandlers['長文題目'].init) TypeHandlers['長文題目'].init();
    if (TypeHandlers['短文題組'] && TypeHandlers['短文題組'].init) TypeHandlers['短文題組'].init();
    if (TypeHandlers['聽力題目'] && TypeHandlers['聽力題目'].init) TypeHandlers['聽力題目'].init();
    if (TypeHandlers['聽力題組'] && TypeHandlers['聽力題組'].init) TypeHandlers['聽力題組'].init();
    // C. 啟動各功能模組
    initProjectHeader();    // 原 app.js 的專案切換功能
    initCheckboxLogic();    // 表格全選/反選
    initFilter();           // 表格篩選功能
    initTypeSwitcher();     // Modal 內的題型切換顯示
    initAutoSelect();       // [新增] 自動選取單一選項
    updateStats();          // [新增] 初始化統計數字
});

// ==========================================
//  4. 專案與頂部導航模組 (Project Header)
//  (原 app.js 邏輯)
// ==========================================
function initProjectHeader() {
    const projectToggle = document.getElementById("projectToggle");
    const projectDropdown = document.getElementById("projectDropdown");
    const closeDropdown = document.getElementById("closeDropdown");
    const projectSearchInput = document.getElementById("projectSearchInput");
    const projectList = document.getElementById("projectList");
    const currentUserRole = document.getElementById("currentUserRole");
    const projectItems = document.querySelectorAll(".project-item");

    // 如果頁面上沒有這些元素，就不執行 (避免報錯)
    if (!projectToggle || !projectDropdown) return;

    // --- [新增] 初始化：讀取 localStorage 設定當前專案 ---
    const storedProjectId = localStorage.getItem("cwt_active_project");
    if (storedProjectId) {
        const targetItem = Array.from(projectItems).find(item => item.getAttribute("data-project-id") === storedProjectId);
        if (targetItem) {
            updateProjectUI(targetItem);
        }
    }

    // Toggle 下拉選單
    projectToggle.addEventListener("click", function () {
        projectDropdown.classList.toggle("show");
        projectToggle.classList.toggle("active");
    });

    closeDropdown.addEventListener("click", function (e) {
        e.stopPropagation();
        projectDropdown.classList.remove("show");
        projectToggle.classList.remove("active");
    });

    // 點擊外部關閉
    document.addEventListener("click", function (e) {
        if (!projectToggle.contains(e.target) && !projectDropdown.contains(e.target)) {
            projectDropdown.classList.remove("show");
            projectToggle.classList.remove("active");
        }
    });

    // 專案項目點擊邏輯
    projectItems.forEach((item) => {
        item.addEventListener("click", function () {
            projectItems.forEach((i) => i.classList.remove("active"));
            this.classList.add("active");

            updateProjectUI(this);

            // 關閉下拉
            projectDropdown.classList.remove("show");
            projectToggle.classList.remove("active");
        });
    });

    // [新增] 抽離原本的 UI 更新邏輯，並加入 Event Dispatch
    function updateProjectUI(item) {
        const projectId = item.getAttribute("data-project-id");
        const projectYear = item.getAttribute("data-year");
        const projectName = item.getAttribute("data-name");
        const projectRole = item.getAttribute("data-role");

        // 更新 UI 文字
        const yearDisplay = document.querySelector(".project-year");
        const nameDisplay = document.querySelector(".project-name");
        if (yearDisplay) yearDisplay.textContent = projectYear + "年度";
        if (nameDisplay) nameDisplay.textContent = projectName;

        // 更新角色徽章
        const roleText = RoleMapping[projectRole];
        const roleClass = RoleClassMapping[projectRole];

        if (currentUserRole) {
            currentUserRole.className = "role-badge";
            currentUserRole.classList.add(roleClass);
            currentUserRole.textContent = roleText;

            if (projectRole === "admin") {
                currentUserRole.style.display = "inline-block";
            } else {
                currentUserRole.style.display = "none";
            }
        }

        // --- [新增] 儲存與發送事件 ---
        localStorage.setItem("cwt_active_project", projectId);
        console.log("切換專案:", { id: projectId, year: projectYear, name: projectName, role: projectRole });

        // 發送自定義事件，讓 firstpage.html 等頁面監聽
        const event = new CustomEvent('projectChanged', {
            detail: { projectId: projectId, role: projectRole }
        });
        document.dispatchEvent(event);
    }

    // 搜尋過濾邏輯
    if (projectSearchInput && projectList) {
        projectSearchInput.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase();
            const categories = projectList.querySelectorAll(".project-category");

            projectItems.forEach((item) => {
                const projectName = item.querySelector(".project-item-title").textContent.toLowerCase();
                item.style.display = projectName.includes(searchTerm) ? "flex" : "none";
            });

            // 隱藏沒有項目的分類標題
            categories.forEach((category) => {
                let nextElement = category.nextElementSibling;
                let hasVisibleItems = false;

                while (nextElement && !nextElement.classList.contains("project-category")) {
                    if (nextElement.classList.contains("project-item") && nextElement.style.display !== "none") {
                        hasVisibleItems = true;
                        break;
                    }
                    nextElement = nextElement.nextElementSibling;
                }
                category.style.display = hasVisibleItems ? "block" : "none";
            });
        });
    }
}

// ==========================================
//  5. 試題管理模組 (Modal & CRUD)
// ==========================================

// 開啟 Modal (Router)
window.openPropModal = function (btn, mode) {
    const titleMap = { 'create': '新增命題', 'edit': '編輯命題', 'view': '檢視命題' };
    const titleEl = document.getElementById('propModalTitle');
    if (titleEl) titleEl.innerText = titleMap[mode];

    const typeSelect = document.getElementById('mType');
    const statusBadge = document.getElementById('mStatusBadge');

    // 1. 新增模式
    if (mode === 'create') {
        document.getElementById('editRowFrom').value = '';
        typeSelect.value = '一般題目'; // 預設值
        typeSelect.disabled = false;
        statusBadge.innerText = '未儲存';
        statusBadge.className = 'badge-outline badge-unsaved';

        // 清空表單
        Object.values(TypeHandlers).forEach(h => { if (h && h.clear) h.clear() });

        toggleGlobalEditable(true);
        typeSelect.dispatchEvent(new Event('change'));
    }
    // 2. 編輯/檢視模式
    else {
        const row = btn.closest('tr');
        document.getElementById('editRowFrom').value = row.rowIndex;

        const type = row.getAttribute('data-type');
        const status = row.getAttribute('data-status');
        const jsonData = JSON.parse(row.getAttribute('data-json') || '{}');

        typeSelect.value = type;
        statusBadge.innerText = status;
        statusBadge.className = `badge-outline badge-${getStatusClass(status)}`;

        // 回填資料
        const handler = TypeHandlers[type];
        if (handler && handler.fill) {
            handler.fill(jsonData, (mode === 'view'));
        } else {
            console.error('未知的題型或 Handler 未載入:', type);
        }

        const isView = (mode === 'view');
        typeSelect.disabled = isView;
        toggleGlobalEditable(!isView);

        // 切換檢視模式樣式
        const paramForm = document.getElementById('propForm');
        if (paramForm) paramForm.classList.toggle('view-mode', isView);

        typeSelect.dispatchEvent(new Event('change'));
    }

    propModal.show();
}

// 儲存邏輯
window.saveProp = function (targetStatus) {
    const type = document.getElementById('mType').value;
    const handler = TypeHandlers[type];

    if (!handler) {
        Swal.fire({
            icon: 'info',
            title: '提示',
            text: '此題型尚未實作儲存邏輯'
        });
        return;
    }

    // 向 Handler 要資料
    const specificData = handler.collect(targetStatus);
    if (!specificData) return; // 驗證失敗

    // 準備共用資料
    const rowData = {
        type: type,
        status: targetStatus,
        time: getCurrentTime(),
        ...specificData // 合併 Handler 回傳的資料
    };

    writeToTable(rowData);
    showToast(`已儲存：${targetStatus}`, 'success');
    propModal.hide();
}

// 刪除單行
window.deleteRow = function (btn) {
    Swal.fire({
        title: '確定要刪除此試題嗎？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: '刪除',
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            const row = btn.closest('tr');
            row.remove();
            checkEmptyState();
            showToast('已刪除試題', 'error');
        }
    });
}

// 批次操作
window.batchAction = function (action) {
    // 這裡只處理 '刪除'，但保留參數結構以便未來擴充
    if (action !== '刪除') return;

    const checkedRows = document.querySelectorAll('tbody .data-row input[type="checkbox"]:checked');
    if (checkedRows.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: '提示',
            text: '請先勾選試題'
        });
        return;
    }

    Swal.fire({
        title: `確定要刪除選取的 ${checkedRows.length} 筆資料嗎？`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: '確定刪除',
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            checkedRows.forEach(cb => {
                // 二次防呆：忽略已禁用的項目
                if (cb.disabled) return;

                const row = cb.closest('tr');
                row.remove();
            });

            if (typeof resetSelection === 'function') resetSelection();
            checkEmptyState(); // 刪除後檢查是否為空並更新統計
            showToast(`已刪除 ${checkedRows.length} 筆資料`, 'success');
        }
    });
}

// 批次更新狀態 (透過 Icon 觸發)
window.batchUpdateStatus = function (targetStatus) {
    const checkedRows = document.querySelectorAll('tbody .data-row input[type="checkbox"]:checked');
    if (checkedRows.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: '提示',
            text: '請先勾選試題'
        });
        return;
    }

    // 根據狀態顯示不同訊息
    let title = `確定將 ${checkedRows.length} 筆資料設為「${targetStatus}」？`;
    let text = "";
    let icon = "question";
    let confirmBtnColor = "#3085d6";

    if (targetStatus === '命題送審') {
        text = "傳送後將進入審題階段，無法再進行編輯。";
        icon = "warning";
        confirmBtnColor = "#2563eb"; // 藍色
    } else if (targetStatus === '不採用') {
        text = "設為不採用後將鎖定試題，僅保留檢視。";
        icon = "warning";
        confirmBtnColor = "#ef4444"; // 紅色
    } else if (targetStatus === '退回修正') {
        text = "退回修正後可再次編輯並重新送審。";
        icon = "info";
        confirmBtnColor = "#f97316"; // 橘色
    } else if (targetStatus === '命題完成') {
        text = "設為命題完成代表題目已完成編輯，也還可再進行編輯。";
        icon = "info";
        confirmBtnColor = "#10b981"; // 綠色
    } else {
        text = "設為命題草稿後可繼續編輯。";
        confirmBtnColor = "#f59e0b"; // 橘色
    }

    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showCancelButton: true,
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        confirmButtonColor: confirmBtnColor
    }).then((result) => {
        if (result.isConfirmed) {
            checkedRows.forEach(cb => {
                const row = cb.closest('tr');

                // 1. 更新狀態顯示 (原本的程式碼)
                const badgeClass = getStatusClass(targetStatus);
                if (row.cells[4]) {
                    row.cells[4].innerHTML = `<span class="badge-outline badge-${badgeClass}">${targetStatus}</span>`;
                }
                row.setAttribute('data-status', targetStatus);

                // 2. 更新隱藏的 JSON 資料 (原本的程式碼)
                let jsonData = JSON.parse(row.getAttribute('data-json') || '{}');
                jsonData.status = targetStatus;
                row.setAttribute('data-json', JSON.stringify(jsonData));

                // 3. 刷新操作按鈕 (原本的程式碼)
                updateRowActionButtons(row, targetStatus);

                // ==========================================
                // ★ 新增邏輯：動態切換鎖定樣式與 Checkbox ★
                // ==========================================
                if (isLockedStatus(targetStatus)) {
                    // 加上鎖定樣式
                    row.classList.add('row-locked');
                    // 禁用 checkbox (防止被再次選取)
                    cb.disabled = true;
                    // 因為 resetSelection() 會在迴圈後執行，這裡只需設 disabled
                } else {
                    // 如果未來允許從命題送審退回命題草稿/命題完成，要記得解鎖
                    row.classList.remove('row-locked');
                    cb.disabled = false;
                }
                // ==========================================
            });

            if (typeof resetSelection === 'function') resetSelection();
            updateStats(); // 更新統計
            if (typeof updateMasterCheckboxState === 'function') {
                updateMasterCheckboxState();
            }
            showToast(`已將 ${checkedRows.length} 筆資料設為${targetStatus}`, 'success');
        }
    });
}

// ==========================================
//  6. 表格操作與 DOM 生成 (Table Logic)
// ==========================================

function writeToTable(data) {
    const editRowIndex = document.getElementById('editRowFrom').value;
    const tableBody = document.querySelector('tbody');

    // 生成操作按鈕
    let actionHtml = getActionHtml(data.status);
    let row;
    const levelText = data.level || '-'; // 等級欄位防呆

    if (editRowIndex) {
        // === 編輯 ===
        row = document.querySelector('table').rows[editRowIndex];

        // 更新欄位 (注意順序：0:Check, 1:Summary, 2:Level, 3:Type, 4:Status, 5:CreateTime, 6:UpdateTime, 7:Action)
        row.cells[1].innerHTML = `<span class="fw-medium text-dark">${data.summary}</span>`;
        row.cells[2].innerHTML = `<span class="badge bg-light text-dark border">${levelText}</span>`;
        row.cells[3].innerText = data.type;

        const badgeClass = getStatusClass(data.status);
        row.cells[4].innerHTML = `<span class="badge-outline badge-${badgeClass}">${data.status}</span>`;

        row.cells[6].innerText = data.time;
        row.cells[7].innerHTML = actionHtml;

    } else {
        // === 新增 ===
        row = tableBody.insertRow(0);
        row.classList.add('data-row');
        const badgeClass = getStatusClass(data.status);
        row.innerHTML = `
            <td><input type="checkbox" class="form-check-input" /></td>
            <td class="text-dark fw-medium">${data.summary}</td>
            <td><span class="badge bg-light text-dark border">${levelText}</span></td> 
            <td>${data.type}</td>
            <td><span class="badge-outline badge-${badgeClass}">${data.status}</span></td>
            <td>${data.time}</td>
            <td>${data.time}</td>
            <td class="action-links">${actionHtml}</td>`;

        // 重新綁定 Checkbox 事件
        initCheckboxLogic();
    }

    if (isLockedStatus(data.status)) {
        row.classList.add('row-locked');
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb) cb.disabled = true;
    } else {
        row.classList.remove('row-locked');
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb) cb.disabled = false;
    }

    // 更新 Data Attributes
    row.setAttribute('data-type', data.type);
    row.setAttribute('data-status', data.status);
    row.setAttribute('data-level', data.level || 'all');
    row.setAttribute('data-json', JSON.stringify(data));

    checkEmptyState();
}

function getActionHtml(status) {
    let html = `<button class="btn btn-link p-0 text-decoration-none fw-bold" onclick="openPropModal(this, 'view')">檢視</button>`;
    if (status !== '命題送審' && status !== '不採用') {
        html += `
            <span class="text-muted mx-1">|</span>
            <button class="btn btn-link p-0 text-decoration-none fw-bold text-success" onclick="openPropModal(this, 'edit')">編輯</button>
            <span class="text-muted mx-1">|</span>
            <button class="btn btn-link p-0 text-decoration-none fw-bold text-danger" onclick="deleteRow(this)">刪除</button>
        `;
    }
    return html;
}

function updateRowActionButtons(row, status) {
    // 自動抓取最後一欄
    const actionCellIndex = row.cells.length - 1;
    if (row.cells.length > actionCellIndex) {
        row.cells[actionCellIndex].innerHTML = getActionHtml(status);
    }
}

function checkEmptyState() {
    const rows = document.querySelectorAll('.data-row');
    const noDataRow = document.getElementById('noDataRow');
    const visibleRows = Array.from(rows).filter(r => r.style.display !== 'none');

    if (noDataRow) {
        noDataRow.style.display = visibleRows.length === 0 ? 'table-row' : 'none';
    }

    // 更新統計數字
    updateStats();
}

function updateStats() {
    // 只計算實際存在的資料列 (不包含 noDataRow)
    const rows = document.querySelectorAll('.data-row');
    const total = rows.length;
    let draft = 0;
    let confirmed = 0;
    let sent = 0;

    rows.forEach(row => {
        const status = row.getAttribute('data-status');
        if (status === '命題草稿') draft++;
        else if (status === '命題完成') confirmed++;
        else if (status === '命題送審') sent++;
    });

    const elTotal = document.getElementById('stat-total');
    const elDraft = document.getElementById('stat-draft');
    const elConfirmed = document.getElementById('stat-confirmed');
    const elSent = document.getElementById('stat-sent');

    if (elTotal) elTotal.innerText = total;
    if (elDraft) elDraft.innerText = draft;
    if (elConfirmed) elConfirmed.innerText = confirmed;
    if (elSent) elSent.innerText = sent;
}

// ==========================================
//  7. 篩選與 Checkbox 邏輯
// ==========================================
function getVisibleSelectableChecks() {
    return Array.from(document.querySelectorAll('tbody .data-row input[type="checkbox"]'))
        .filter(cb => cb.closest('tr').style.display !== 'none' && !cb.disabled);
}

function updateMasterCheckboxState() {
    const masterCheck = document.querySelector('thead input[type="checkbox"]');
    if (!masterCheck) return;

    const selectableChecks = getVisibleSelectableChecks();
    const hasSelectable = selectableChecks.length > 0;

    masterCheck.disabled = !hasSelectable;
    if (!hasSelectable) {
        masterCheck.checked = false;
        return;
    }

    masterCheck.checked = selectableChecks.every(cb => cb.checked);
}

function initCheckboxLogic() {
    const checkAll = document.querySelector('thead input[type="checkbox"]');
    const rowChecks = document.querySelectorAll('tbody .data-row input[type="checkbox"]');

    if (checkAll) {
        const newCheckAll = checkAll.cloneNode(true);
        checkAll.parentNode.replaceChild(newCheckAll, checkAll);

        newCheckAll.addEventListener('change', function () {
            const isChecked = this.checked;
            getVisibleSelectableChecks().forEach(cb => {
                cb.checked = isChecked;
            });
        });
    }

    rowChecks.forEach(cb => {
        cb.addEventListener('change', function () {
            updateMasterCheckboxState();
        });
    });
    updateMasterCheckboxState();
}

function initFilter() {
    const filterType = document.getElementById("filterType");
    const filterStatus = document.getElementById("filterStatus");
    const filterLevel = document.getElementById("filterLevel");
    const searchInput = document.getElementById("searchInput");

    if (!filterType || !filterLevel) return;

    // 1. 定義兩組等級選項資料
    const levelOptions = {
        // 一般/閱讀/寫作用的等級
        'default': ['初級', '中級', '中高級', '高級', '優級'],
        // 聽力專用的等級
        'listening': ['難度一', '難度二', '難度三', '難度四']
    };

    // 2. 定義「更新等級選單」的函式
    const updateLevelOptions = () => {
        const selectedType = filterType.value;
        let targetOptions = levelOptions.default;

        // 判斷是否為聽力題型 (包含 "聽力" 二字)
        if (selectedType.includes('聽力')) {
            targetOptions = levelOptions.listening;
        }

        // 記錄目前選中的等級 (為了切換後試著保留選擇，如果有的話)
        const currentLevel = filterLevel.value;

        // 清空選單，只保留第一項「全部等級」
        filterLevel.innerHTML = '<option value="all">全部等級</option>';

        // 產生新的選項
        targetOptions.forEach(lvl => {
            const option = document.createElement('option');
            option.value = lvl;
            option.textContent = lvl;
            filterLevel.appendChild(option);
        });

        // 如果原本選的等級在新的清單裡也有，就幫他選回去；否則歸零
        if (targetOptions.includes(currentLevel)) {
            filterLevel.value = currentLevel;
        } else {
            filterLevel.value = 'all';
        }
    };

    const doFilter = () => {
        const typeValue = filterType.value;
        const statusValue = filterStatus.value;
        const levelValue = filterLevel ? filterLevel.value : 'all';
        const keyword = searchInput.value.trim().toLowerCase();
        const rows = document.querySelectorAll(".data-row");

        rows.forEach((row) => {
            const rowType = row.getAttribute("data-type");
            const rowStatus = row.getAttribute("data-status");
            const rowLevel = row.getAttribute("data-level");
            // 假設標題在第 2 欄 (nth-child(2))
            const rowTitle = row.cells[1].textContent.toLowerCase();

            let show = true;
            if (typeValue !== "all" && rowType !== typeValue) show = false;
            if (statusValue !== "all" && rowStatus !== statusValue) show = false;
            if (levelValue !== "all" && rowLevel !== levelValue) show = false;
            if (keyword !== "" && !rowTitle.includes(keyword)) show = false;

            row.style.display = show ? "" : "none";
        });

        checkEmptyState();
        // 篩選後重置全選按鈕
        updateMasterCheckboxState();
    };

    // 4. 綁定事件
    // 當「題型」改變時，先更新「等級選單」，再執行篩選
    filterType.addEventListener("change", () => {
        updateLevelOptions();
        doFilter();
    });

    filterStatus.addEventListener("change", doFilter);
    filterLevel.addEventListener("change", doFilter);
    searchInput.addEventListener("input", doFilter);

    // 5. 初始化：頁面載入時先執行一次，確保等級選單正確
    updateLevelOptions();
}

// ==========================================
//  8. UI 工具 (Font, Type Switcher, Toast)
// ==========================================

// 字體調整器 (包含 設計1 的 UI 邏輯)
function changeFontSize(direction) {
    if (direction === -1 && currentZoom > 80) currentZoom -= 10;
    else if (direction === 1 && currentZoom < 150) currentZoom += 10;
    applyFontSize();
}

function resetFontSize() {
    currentZoom = 100;
    applyFontSize();
}

function applyFontSize() {
    document.documentElement.style.fontSize = `${currentZoom}%`;

    // 更新介面數字 (對應設計 1)
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

// 題型表單切換
function initTypeSwitcher() {
    const typeSelect = document.getElementById('mType');
    if (!typeSelect) return;

    typeSelect.addEventListener('change', function () {
        const val = this.value;
        document.querySelectorAll('.question-form-group').forEach(el => el.classList.add('d-none'));

        if (val === '一般題目' || val === '精選題目') {
            const el = document.getElementById('form-general');
            if (el) el.classList.remove('d-none');
        } else if (val === '閱讀題組') {
            const el = document.getElementById('form-reading');
            if (el) el.classList.remove('d-none');
        } else if (val === '長文題目') {
            const el = document.getElementById('form-longarticle');
            if (el) el.classList.remove('d-none');
        } else if (val === '短文題組') {
            const el = document.getElementById('form-shortarticle');
            if (el) el.classList.remove('d-none');
        } else if (val === '聽力題目') {
            const el = document.getElementById('form-listen');
            if (el) el.classList.remove('d-none');
        } else if (val === '聽力題組') {
            const el = document.getElementById('form-listengroup');
            if (el) el.classList.remove('d-none');
        }
    });

    // 觸發一次以初始化正確狀態
    if (typeSelect.value) {
        typeSelect.dispatchEvent(new Event('change'));
    }
}

// ==========================================
//  9. 自動選取單一選項 (Auto Select)
// ==========================================
let autoSelectObserver;
const selectTimers = new Map();

function initAutoSelect() {
    // 1. 定義 MutationObserver
    autoSelectObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                if (mutation.target.tagName === 'SELECT') {
                    // 選項變動
                    debouncedCheck(mutation.target);
                } else {
                    // 節點變動 (檢查新增的 SELECT)
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element
                            if (node.tagName === 'SELECT') debouncedCheck(node);
                            // 檢查子元素是否有 SELECT
                            if (node.querySelectorAll) {
                                node.querySelectorAll('select').forEach(debouncedCheck);
                            }
                        }
                    });
                }
            }
        });
    });

    // 2. 監聽整個 body (subtree: true)
    autoSelectObserver.observe(document.body, { childList: true, subtree: true });

    // 3. 初始檢查頁面上已存在的 SELECT
    document.querySelectorAll('select').forEach(debouncedCheck);
}

function debouncedCheck(select) {
    // 清除舊的計時器
    if (selectTimers.has(select)) {
        clearTimeout(selectTimers.get(select));
    }
    // 設定新的計時器 (50ms 防抖動，等待選項加載完成)
    const timerId = setTimeout(() => {
        checkAndSelect(select);
        selectTimers.delete(select);
    }, 50);
    selectTimers.set(select, timerId);
}

function checkAndSelect(select) {
    if (!select) return;
    // 避免 auto-select 干擾 mType 選單開啟
    if (select.id === 'mType' || document.activeElement === select) return;
    // 忽略多選選單
    if (select.multiple) return;

    // 取得所有選項
    const options = Array.from(select.options);

    // 過濾出有效選項：值不為空 且 未被禁用
    // 通常 "請選擇..." 的 value 會是空字串
    const validOptions = options.filter(opt => opt.value !== "" && !opt.disabled);

    // 如果只有一個有效選項
    if (validOptions.length === 1) {
        const targetValue = validOptions[0].value;
        // 如果當前未選取該值，則自動選取
        if (select.value !== targetValue) {
            select.value = targetValue;
            // 觸發 change 事件以確保連動邏輯正常運作
            select.dispatchEvent(new Event('change', { bubbles: true }));
            // console.log(`[AutoSelect] 自動選取：${select.id || 'unknown'} -> ${targetValue}`);
        }
    }
}


// UI 輔助
function toggleGlobalEditable(editable) {
    const inputs = document.querySelectorAll(
        '#propModal input:not(#mType):not(.readonly-field), ' +
        '#propModal select:not(#mType):not(.readonly-field), ' +
        '#propModal textarea:not(.readonly-field)'
    );

    inputs.forEach(el => el.disabled = !editable);
    const footerBtns = document.querySelectorAll('.modal-footer button:not([data-bs-dismiss])');
    footerBtns.forEach(b => b.hidden = !editable);
}

function getStatusClass(s) {
    if (s === '未儲存') return 'unsaved';
    if (s === '命題草稿') return 'draft';
    if (s === '命題完成') return 'confirmed';
    if (s === '命題送審') return 'sent';
    if (s === '退回修正') return 'returned';
    if (s === '不採用') return 'rejected';
    return 'secondary';
}

function isLockedStatus(status) {
    return status === '命題送審' || status === '不採用';
}

function getCurrentTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function showToast(msg, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;

    const body = toastEl.querySelector('.toast-body');

    // 1. 先移除所有可能的顏色 (補上 bg-secondary)
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-primary', 'bg-secondary');

    // 2. 加入判斷邏輯
    if (type === 'success') {
        toastEl.classList.add('bg-success');
    } else if (type === 'error') {
        toastEl.classList.add('bg-danger');
    } else if (type === 'secondary') {
        // 如果是 secondary 就用灰色
        toastEl.classList.add('bg-secondary');
    } else {
        // 預設 (例如 'info') 還是藍色
        toastEl.classList.add('bg-primary');
    }

    body.textContent = msg;
    // 確保 toastInstance 存在才呼叫 (如果 app.js 初始化有做好的話)
    if (typeof toastInstance !== 'undefined' && toastInstance) {
        toastInstance.show();
    } else {
        // 後備方案：如果還沒初始化，現場 new 一個
        new bootstrap.Toast(toastEl).show();
    }
}

// ==========================================
//  9. 重置選擇功能
// ==========================================
function resetSelection() {
    // 1. 取消全選框 (thead)
    const masterCheck = document.querySelector('thead input[type="checkbox"]');
    if (masterCheck) {
        masterCheck.checked = false;
    }

    // 2. 取消所有資料列的勾選框 (tbody)
    const rowChecks = document.querySelectorAll('tbody .data-row input[type="checkbox"]');
    rowChecks.forEach(cb => {
        cb.checked = false;
    });

    if (typeof updateMasterCheckboxState === 'function') {
        updateMasterCheckboxState();
    }

    // (選用) 如果有 Toast 提示，可以顯示一下
    showToast('已重置所有選取', 'secondary');
}
