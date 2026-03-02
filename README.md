# CWT 命題工作平臺 (DEMO)

> 前端展示用 DEMO 網站，以純 HTML + Bootstrap 5 + Vanilla JS 架構建構，未來預計遷移至 Blazor .NET 10。

---

## 技術架構 (Tech Stack)

| 層級       | 技術                                           |
| ---------- | ---------------------------------------------- |
| 結構       | HTML5                                          |
| 樣式       | Bootstrap 5.3.2 + 自訂 CSS (每頁獨立)          |
| 邏輯       | Vanilla JavaScript (ES6+)                      |
| 富文本編輯 | Quill.js (Snow 主題，含自訂中文標點符號工具列)  |
| 對話框     | SweetAlert2                                    |
| 圖示       | Bootstrap Icons                                |
| 字體       | Noto Sans TC (Google Fonts)                    |

---

## 目錄結構

```
命題系統DEMO/
├── index.html              # 登入頁面
├── firstpage.html          # 首頁 (功能導覽 + 今日提醒)
├── cwt-dashboard.html      # 命題儀錶板
├── cwt-prop.html           # 命題專案管理
├── cwt-list.html           # 我的命題任務 (核心頁面)
├── cwt-bank.html           # 題庫總覽 (管理者專用)
├── cwt-review.html         # 審題清單
├── cwt-role.html           # 角色與權限管理
├── cwt-teacher.html        # 教師管理系統
├── cwt-announcement.html   # 系統公告 / 使用說明
│
├── js/
│   ├── app.js              # 全域共用模組 (專案切換、Quill 設定、字體調整)
│   ├── cwt-list.js         # 命題任務頁專屬邏輯 (題型 Handlers、表格篩選)
│   ├── cwt-review.js       # 審題清單頁專屬邏輯 (審題彈窗、篩選統計)
│   ├── role-manager.js     # 角色權限管理頁邏輯 (角色 CRUD、權限設定)
│   ├── edituser.js         # 編輯使用者 Modal 邏輯
│   ├── newuser.js          # 新增使用者 Modal 邏輯
│   ├── quill.min.js        # Quill 富文本編輯器 (本地副本)
│   └── sweetalert2.min.js  # SweetAlert2 對話框 (本地副本)
│
├── css/
│   ├── css-reset.css       # CSS Reset
│   ├── style.css           # 全站共用樣式 (Navbar、專案切換器)
│   ├── index.css           # 登入頁
│   ├── firstpage.css       # 首頁
│   ├── cwt-dashboard.css   # 儀錶板頁
│   ├── cwt-prop.css        # 專案管理頁
│   ├── cwt-list.css        # 命題任務頁 (含 Modal 與編輯器樣式)
│   ├── cwt-list-page.css   # 命題任務頁 (表格與卡片佈局)
│   ├── cwt-review.css      # 審題清單頁 (含 Modal 與編輯器樣式)
│   ├── cwt-review-page.css # 審題清單頁 (表格佈局)
│   ├── cwt-role.css        # 角色權限頁
│   ├── cwt-teacher.css     # 教師管理頁
│   ├── cwt-announcement.css# 系統公告頁
│   ├── quill.snow.css      # Quill 編輯器主題樣式
│   └── sweetalert2.css     # SweetAlert2 樣式
│
└── ICON/                   # 靜態圖片資源 (功能圖示、操作按鈕)
```

---

## 頁面功能說明

### 1. 登入頁 (`index.html`)

- Canvas 動態驗證碼繪製 (含干擾線與噪點)
- 密碼顯示/隱藏切換
- 前端表單驗證 (帳號、密碼、驗證碼)
- 登入成功後跳轉至 `firstpage.html`

### 2. 首頁 (`firstpage.html`)

- **專案切換器**：頂部 Navbar 中央，支援搜尋與切換不同梯次，切換後觸發 `projectChanged` 自訂事件
- **功能導覽卡片**：7 張功能卡片，各自連結至對應子頁面
- **今日提醒側邊欄**：
  - 凍結區：紅色倒數截止提醒
  - 滾動區：系統公告列表 (依專案過濾、置頂排序)
  - 字體縮放控制器 (+/- 與重置)
- **公告 Modal**：點擊公告項目可展開完整內容

### 3. 命題儀錶板 (`cwt-dashboard.html`)

- 命題進度總覽 (統計卡片)
- 題型缺口分析
- 逾期警示與稽核歷程

### 4. 命題專案管理 (`cwt-prop.html`)

- 專案 (梯次) 新增/編輯
- 區間設定與期限管理
- 專案人員指派

### 5. 我的命題任務 (`cwt-list.html`) ⭐ 核心頁面

支援 **6 種題型**，每種題型有獨立的表單結構與 Handler：

| 題型     | Handler 名稱          | 特色                                        |
| -------- | --------------------- | ------------------------------------------- |
| 一般題目 | `GeneralHandler`      | 四選一 (ABCD)、主/子類別連動下拉            |
| 精選題目 | `GeneralHandler`      | 與一般題目共用 Handler                      |
| 長文題目 | `LongArticleHandler`  | 文章內容 + 試題解析                         |
| 聽力題目 | `ListenHandler`       | 難度連動核心能力/指標、四選一               |
| 短文題組 | `ShortArticleHandler` | 動態新增子題 (手風琴)、主向度/能力指標      |
| 閱讀題組 | `ReadingHandler`      | 動態新增子題 (手風琴)、Sidebar 答案同步     |
| 聽力題組 | `ListenGroupHandler`  | 固定兩題子題 (難度三+四)、Sidebar 答案同步  |

**共用機制**：

- **CommonEditorManager**：底部滑入式 Quill 編輯器 (類似手機輸入模式)，所有 `editor-preview-box` 共用同一個 Quill 實體
- **中文標點符號工具列**：頓號、書名號、引號等 12 種常用標點快速插入
- **Preview Box 模式**：點擊 → 開啟編輯器 → 編輯 → 關閉後回寫至 hidden input
- **View Mode 鎖定**：檢視模式下，所有輸入框設為 `pointer-events: none` + 灰底
- **表格篩選**：支援依題型、狀態、關鍵字複合篩選，含 Tab 分頁 (待繳交 / 歷史紀錄)

### 6. 審題清單 (`cwt-review.html`)

- **審題 Modal**：含罐頭訊息快速插入、重複比對模擬
- **審題決策**：採用、不採用、改後再審
- **統計卡片**：即時統計各狀態數量，點擊可快速篩選
- **Tab 分頁**：待處理 / 歷史紀錄，支援表格篩選

### 7. 角色與權限管理 (`cwt-role.html`)

- **角色管理**：動態渲染角色卡片，支援新增/編輯/展開
- **權限矩陣**：8 項功能權限 (今日提醒、命題儀表板等) 搭配勾選開關
- **使用者管理**：新增使用者 (`newuser.js`) / 編輯使用者 (`edituser.js`)
- **專案指派**：在編輯使用者 Modal 中指派梯次與角色

### 8. 教師管理系統 (`cwt-teacher.html`)

- 教師名單維護
- 任教背景檢視
- 命題參與歷程
- 篩選與查詢

### 9. 系統公告 (`cwt-announcement.html`)

- 公告 CRUD (新增/編輯/刪除)
- 分類管理 (系統公告、命題公告、審題公告、其他)
- 置頂功能
- 梯次綁定 (全站通用 or 指定梯次)
- 資料透過 `localStorage` 持久化

### 10. 題庫總覽 (`cwt-bank.html`)

- 統計卡片 (題庫總題數、本梯次新增、題型種類、命題教師數)
- 進階篩選 (梯次/題型/難度/審查狀態/關鍵字)
- 題目列表表格 (編號、題型、難度、主類別、教師、梯次、狀態、日期)
- 檢視 Modal (題幹、選項、正確答案、解析)
- 分頁器

---

## 頁面導航流程

```
index.html (登入)
    │
    ▼
firstpage.html (首頁導覽)
    │
    ├── cwt-dashboard.html     (命題儀錶板)
    ├── cwt-prop.html          (命題專案管理)
    ├── cwt-list.html          (我的命題任務)
    ├── cwt-review.html        (審題清單)
    ├── cwt-role.html          (角色與權限管理)
    ├── cwt-teacher.html       (教師管理系統)
    ├── cwt-announcement.html  (系統公告)
    └── cwt-bank.html          (題庫總覽)
```

所有子頁面共用頂部 Navbar (定義於各自 HTML 中)，包含：
- 左側：Logo 與平台名稱 → 連結回 `firstpage.html`
- 中央：專案切換器 (切換梯次)
- 右側：使用者資訊與登出按鈕 → 連結回 `index.html`

---

## JS 模組依賴關係

```
app.js (全域共用)
  ├── Quill 字體註冊 (kaiu, times-new-roman)
  ├── mainToolbar / optionToolbar (Quill 工具列設定)
  ├── PUNCTUATION_BAR_HTML (標點符號工具列模板)
  ├── bindQuillHelpers() (標點符號按鈕事件綁定)
  ├── mockProjects / mockAnnouncements (模擬資料)
  ├── TypeHandlers 映射表 (題型 → Handler 對照)
  ├── initProjectHeader() (專案切換 UI + 事件)
  ├── CommonEditorManager.init() (共用編輯器初始化)
  └── changeFontSize() / resetFontSize() (字體縮放)

cwt-list.js (命題任務頁)
  ├── CommonEditorManager (共用 Quill 編輯器管理)
  ├── GeneralHandler (一般/精選題目)
  ├── LongArticleHandler (長文題目)
  ├── ListenHandler (聽力題目)
  ├── ShortArticleHandler (短文題組)
  ├── ReadingHandler (閱讀題組)
  ├── ListenGroupHandler (聽力題組)
  ├── initFilter() (表格篩選)
  └── openPropModal() / saveProp() (命題 Modal 控制)

cwt-review.js (審題清單頁)
  ├── initQuillEditors() (審題專用編輯器)
  ├── openReviewModal() (審題彈窗)
  ├── submitReview() (提交審題決策)
  ├── filterByStatus() / filterTable() (篩選邏輯)
  └── updateStats() (統計更新)

role-manager.js (角色權限頁)
  ├── renderRoles() (動態渲染角色卡片)
  ├── openPermissionModal() (權限設定彈窗)
  ├── savePermissions() / saveNewRole() (儲存邏輯)
  └── switchTab() (分頁切換)
```

---

## CSS 對應關係

| HTML 頁面              | 載入的 CSS 檔案                                 |
| ---------------------- | ----------------------------------------------- |
| `index.html`           | `index.css`                                     |
| `firstpage.html`       | `style.css`, `firstpage.css`                    |
| `cwt-dashboard.html`   | `style.css`, `cwt-dashboard.css`                |
| `cwt-prop.html`        | `style.css`, `cwt-prop.css`                     |
| `cwt-list.html`        | `style.css`, `cwt-list-page.css`, `cwt-list.css`|
| `cwt-review.html`      | `style.css`, `cwt-review-page.css`, `cwt-review.css` |
| `cwt-role.html`        | `style.css`, `cwt-role.css`                     |
| `cwt-teacher.html`     | `style.css`, `cwt-teacher.css`                  |
| `cwt-announcement.html`| `style.css`, `cwt-announcement.css`             |
| `cwt-bank.html`        | `style.css`, `cwt-bank.css`                     |

> 所有子頁面皆載入 `quill.snow.css` 與 `sweetalert2.css`。`style.css` 為全站共用樣式 (Navbar、專案切換器等)。

---

## 資料儲存方式

本 DEMO 為純前端展示，所有資料以下列方式處理：

- **模擬資料 (Mock Data)**：定義於 `app.js` 與各頁面 JS 中 (如 `mockProjects`、`mockAnnouncements`、`mockUsers`)
- **localStorage**：公告資料 (`cwt_announcements`)、當前專案 ID (`cwt_active_project`) 使用 `localStorage` 持久化
- **DOM 狀態**：命題表單資料存於 `hidden input` + `editor-preview-box` 的 `innerHTML`

---

## 關鍵設計模式

### 1. Handler Pattern (題型管理)
每種題型實作統一介面：`init()`、`clear()`、`fill(data, isViewMode)`、`collect()`、`toggleEditable(editable)`，透過 `TypeHandlers` 映射表動態分派。

### 2. Preview Box + Common Editor
所有富文本輸入框使用「預覽盒 + 共用編輯器」模式，避免同時初始化多個 Quill 實體造成效能問題。點擊預覽盒 → 滑入編輯器 → 編輯 → 關閉回寫。

### 3. Accordion + Sidebar 雙向綁定
閱讀題組與聽力題組的子題使用 Bootstrap Accordion，展開特定子題時自動同步左側 Sidebar 的正確答案下拉選單。

### 4. Event-Driven 專案切換
專案切換後觸發 `projectChanged` CustomEvent，各頁面監聽此事件更新對應 UI (如首頁的提醒列表過濾)。

---

## 備註

- 本專案為前端 UI DEMO，不包含後端 API 與資料庫
- 所有業務邏輯均為前端模擬，實際部署需對接後端服務
- 預計未來遷移至 **Blazor .NET 10**，程式碼設計保持高內聚、低耦合以利移植
