/**
 * 整合版 Javascript (原 app.js + global.js)
 * 包含：專案切換、角色管理、試題 CRUD、表格篩選、字體調整
 */

// ==========================================
//  1. 全域設定 (Configs & Constants)
// ==========================================
// --- 註冊 Quill 自訂字體 ---
// 標點符號工具列 HTML 模板 (確保全站一致)
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

    // B. 初始化 Common Editor (如果存在)
    if (typeof CommonEditorManager !== 'undefined' && CommonEditorManager.init) {
        CommonEditorManager.init();
    }

    // C. 啟動各功能模組
    initProjectHeader();    // 原 app.js 的專案切換功能
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


