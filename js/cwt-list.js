/**
 * CWT 命題任務列表 - 整合版 JS (V3 修正版)
 * 修正：
 * 1. 子題編輯器缺標點符號工具列
 * 2. 子題手風琴與綠勾勾邏輯
 * 3. 確保所有 Quill 工具列一致
 */

// ==========================================
//  1. 全域設定與工具 (Globals & Utils)
// ==========================================

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

// 註冊 Quill 字體
if (typeof Quill !== 'undefined') {
    try {
        const Font = Quill.import('attributors/class/font') || Quill.import('formats/font');
        Font.whitelist = ['microsoft-jhenghei', 'kaiu', 'times-new-roman', 'arial', 'comic-sans-ms'];
        Quill.register(Font, true);
    } catch (e) { console.warn("Quill 字體註冊失敗", e); }
}

// 統一的 Toolbar 設定
window.mainToolbar = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': ['kaiu', 'times-new-roman'] }],
    [{ 'color': [] }], [{ 'align': [] }],
    ['bold', 'underline', 'strike'], ['link'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }], ['clean']
];

window.optionToolbar = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': ['kaiu', 'times-new-roman'] }],
    [{ 'color': [] }], [{ 'align': [] }],
    ['bold', 'underline', 'strike'], ['link'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }], ['clean']
];

// 綁定標點符號與字數統計
function bindQuillHelpers(quillInstance, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const wrapper = el.closest('.quill-master-container');
    if (!wrapper) return;

    // 1. 標點符號
    const puncButtons = wrapper.querySelectorAll('.punc-btn');
    puncButtons.forEach(btn => {
        btn.onclick = null; // 清除舊事件
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

    // 2. 字數偵測
    const countDisplay = wrapper.querySelector('.count-num');
    if (countDisplay) {
        const updateCount = () => {
            const text = quillInstance.getText().trim();
            countDisplay.innerText = text.length;
        };
        updateCount(); // Init
        quillInstance.on('text-change', updateCount);
    }
}

// 角色對照
const RoleMapping = { admin: "系統管理員", reviewer: "審題委員", teacher: "命題教師" };
const RoleClassMapping = { admin: "role-admin", reviewer: "role-reviewer", teacher: "role-teacher" };

// 全域變數
let propModal;
let toastInstance;
let currentZoom = 100;

// ==========================================
//  2. 題型 Handlers
// ==========================================

/* --- GeneralHandler (一般/精選) --- */
const GeneralHandler = (function () {
    const quills = {};
    const categoryData = {
        "文字": ["字音", "字型", "造字原則"], "語詞": ["辭義辨識", "詞彙辨析", "詞性分辨", "語詞應用"],
        "成語短語": ["短語辨識", "語詞使用", "文義取得"], "造句標點": ["句義", "句法辨析", "標點符號"],
        "修辭技巧": ["修辭類型", "語態變化"], "語文知識": ["語文知識"], "文意判讀": ["段義辨析"]
    };

    function updateCorrectAnswerDisplay(val) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`optionCard${opt}`);
            if (card) val === opt ? card.classList.add('is-correct-answer') : card.classList.remove('is-correct-answer');
        });
        const dropdown = document.getElementById('gCorrectAnswer');
        if (dropdown) val ? dropdown.classList.add('has-answer') : dropdown.classList.remove('has-answer');
    }

    return {
        init: function () {
            const mainSelect = document.getElementById('gMainCategory');
            const subSelect = document.getElementById('gSubCategory');
            if (mainSelect) {
                mainSelect.innerHTML = '<option value="">請選擇...</option>';
                Object.keys(categoryData).forEach(key => mainSelect.add(new Option(key, key)));
                mainSelect.addEventListener('change', function () {
                    subSelect.innerHTML = '<option value="">請選擇...</option>';
                    if (this.value && categoryData[this.value]) {
                        subSelect.disabled = false;
                        categoryData[this.value].forEach(sub => subSelect.add(new Option(sub, sub)));
                    } else {
                        subSelect.disabled = true;
                        subSelect.innerHTML = '<option value="">請先選擇主類</option>';
                    }
                });
            }

            // Init Quills
            const configs = [
                { id: 'q-editor-content', key: 'content', tb: window.mainToolbar },
                { id: 'q-editor-explanation', key: 'explanation', tb: window.mainToolbar },
                { id: 'q-editor-optA', key: 'optA', tb: window.optionToolbar },
                { id: 'q-editor-optB', key: 'optB', tb: window.optionToolbar },
                { id: 'q-editor-optC', key: 'optC', tb: window.optionToolbar },
                { id: 'q-editor-optD', key: 'optD', tb: window.optionToolbar }
            ];

            configs.forEach(c => {
                const el = document.getElementById(c.id);
                if (el && !quills[c.key] && !el.classList.contains('ql-container')) {
                    quills[c.key] = new Quill('#' + c.id, { theme: 'snow', modules: { toolbar: c.tb }, placeholder: '請輸入...' });
                    bindQuillHelpers(quills[c.key], c.id);
                }
            });

            const ans = document.getElementById('gCorrectAnswer');
            if (ans) {
                const newAns = ans.cloneNode(true);
                ans.parentNode.replaceChild(newAns, ans);
                newAns.addEventListener('change', function () { updateCorrectAnswerDisplay(this.value); });
            }
        },
        clear: function () {
            ['gLevel', 'gDifficulty', 'gMainCategory', 'gCorrectAnswer'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            const sub = document.getElementById('gSubCategory');
            if (sub) { sub.innerHTML = '<option value="">請先選擇主類</option>'; sub.disabled = true; }
            Object.values(quills).forEach(q => q.setText(''));
            updateCorrectAnswerDisplay('');
            this.toggleEditable(true);
        },
        fill: function (data, isViewMode) {
            ['gLevel', 'gDifficulty'].forEach(id => { const el = document.getElementById(id); if (el) el.value = data[id.replace('g', '').toLowerCase()] || ''; });
            const main = document.getElementById('gMainCategory');
            if (main) { main.value = data.mainCat || ''; main.dispatchEvent(new Event('change')); }
            const sub = document.getElementById('gSubCategory');
            if (sub && data.subCat) sub.value = data.subCat;

            const setQ = (k, v) => { if (quills[k]) { quills[k].setText(''); if (v) quills[k].clipboard.dangerouslyPasteHTML(0, decodeURIComponent(v)); } };
            setQ('content', data.content); setQ('explanation', data.explanation);
            ['A', 'B', 'C', 'D'].forEach(o => setQ(`opt${o}`, data[`opt${o}`]));

            const ans = document.getElementById('gCorrectAnswer');
            if (ans) { ans.value = data.ans || ''; updateCorrectAnswerDisplay(data.ans || ''); }
            this.toggleEditable(!isViewMode);
        },
        collect: function () {
            return {
                level: document.getElementById('gLevel').value,
                mainCat: document.getElementById('gMainCategory').value,
                subCat: document.getElementById('gSubCategory').value,
                content: encodeURIComponent(quills.content.root.innerHTML),
                summary: quills.content.getText().trim().substring(0, 20) + '...',
                ans: document.getElementById('gCorrectAnswer').value
            };
        },
        toggleEditable: function (editable) {
            Object.values(quills).forEach(q => q.enable(editable));
            document.querySelectorAll('#form-general input, #form-general select').forEach(el => {
                if (el.id !== 'gPropositioner' && el.id !== 'gSubCategory') el.disabled = !editable;
            });
            const sub = document.getElementById('gSubCategory');
            if (sub && editable && document.getElementById('gMainCategory').value) sub.disabled = false;
            document.querySelectorAll('#form-general .punc-btn').forEach(b => b.disabled = !editable);
        }
    };
})();

/* --- LongArticleHandler (長文題目) --- */
const LongArticleHandler = (function () {
    const quills = { content: null, explanation: null };
    return {
        init: function () {
            if (document.getElementById('q-long-content') && !document.getElementById('q-long-content').classList.contains('ql-container')) {
                quills.content = new Quill('#q-long-content', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '文章內容...' });
                bindQuillHelpers(quills.content, 'q-long-content');
            }
            if (document.getElementById('q-long-explanation') && !document.getElementById('q-long-explanation').classList.contains('ql-container')) {
                quills.explanation = new Quill('#q-long-explanation', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '解析...' });
                bindQuillHelpers(quills.explanation, 'q-long-explanation');
            }
        },
        clear: function () {
            ['lType', 'lLevel', 'lDifficulty', 'lTopic'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            if (quills.content) quills.content.setText('');
            if (quills.explanation) quills.explanation.setText('');
            this.toggleEditable(true);
        },
        fill: function (data, isViewMode) {
            document.getElementById('lType').value = data.subType || '';
            document.getElementById('lLevel').value = data.level || '';
            document.getElementById('lTopic').value = data.topic || '';
            if (quills.content) { quills.content.setText(''); if (data.content) quills.content.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(data.content)); }
            this.toggleEditable(!isViewMode);
        },
        collect: function () {
            return {
                mainCat: '長文題目',
                subType: document.getElementById('lType').value,
                level: document.getElementById('lLevel').value,
                topic: document.getElementById('lTopic').value,
                content: encodeURIComponent(quills.content.root.innerHTML),
                summary: document.getElementById('lTopic').value
            };
        },
        toggleEditable: function (editable) {
            if (quills.content) quills.content.enable(editable);
            if (quills.explanation) quills.explanation.enable(editable);
            document.querySelectorAll('#form-longarticle input, #form-longarticle select').forEach(el => {
                if (el.id !== 'lPropositioner') el.disabled = !editable;
            });
            document.querySelectorAll('#form-longarticle .punc-btn').forEach(b => b.disabled = !editable);
        }
    };
})();

/* --- ListenHandler (聽力題目) --- */
const ListenHandler = (function () {
    const quills = {};
    const levelData = {
        "難度一": { cores: ["提取訊息"], indicators: ["提取對話與訊息主旨"] },
        "難度二": { cores: ["理解訊息"], indicators: ["理解訊息意圖"] },
        "難度三": { cores: ["推斷訊息"], indicators: ["推斷訊息邏輯性"] },
        "難度四": { cores: ["歸納分析訊息"], indicators: ["歸納或總結訊息內容"] },
        "難度五": { cores: ["統整、闡述或評鑑訊息"], indicators: ["摘要、條列、統整訊息"] }
    };
    function updateCorrectAnswerDisplay(val) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`liOptionCard${opt}`);
            if (card) val === opt ? card.classList.add('is-correct-answer') : card.classList.remove('is-correct-answer');
        });
        const d = document.getElementById('liCorrectAnswer');
        if (d) val ? d.classList.add('has-answer') : d.classList.remove('has-answer');
    }
    return {
        init: function () {
            if (document.getElementById('q-listen-content') && !document.getElementById('q-listen-content').classList.contains('ql-container')) {
                quills.content = new Quill('#q-listen-content', { theme: 'snow', modules: { toolbar: window.mainToolbar } });
                bindQuillHelpers(quills.content, 'q-listen-content');
            }
            if (document.getElementById('q-listen-explanation') && !document.getElementById('q-listen-explanation').classList.contains('ql-container')) {
                quills.explanation = new Quill('#q-listen-explanation', { theme: 'snow', modules: { toolbar: window.mainToolbar } });
                bindQuillHelpers(quills.explanation, 'q-listen-explanation');
            }
            ['A', 'B', 'C', 'D'].forEach(o => {
                if (document.getElementById(`q-listen-opt${o}`) && !document.getElementById(`q-listen-opt${o}`).classList.contains('ql-container')) {
                    quills[`opt${o}`] = new Quill(`#q-listen-opt${o}`, { theme: 'snow', modules: { toolbar: window.optionToolbar } });
                    bindQuillHelpers(quills[`opt${o}`], `q-listen-opt${o}`);
                }
            });

            const lvl = document.getElementById('liLevel');
            if (lvl) {
                const newLvl = lvl.cloneNode(true);
                lvl.parentNode.replaceChild(newLvl, lvl);
                newLvl.addEventListener('change', function () {
                    const c = document.getElementById('liCore'), i = document.getElementById('liIndicator');
                    c.innerHTML = '<option value="">請選擇...</option>'; i.innerHTML = '<option value="">請選擇...</option>';
                    if (this.value && levelData[this.value]) {
                        c.disabled = false; i.disabled = false;
                        levelData[this.value].cores.forEach(v => c.add(new Option(v, v)));
                        levelData[this.value].indicators.forEach(v => i.add(new Option(v, v)));
                    } else { c.disabled = true; i.disabled = true; }
                });
            }
            const ans = document.getElementById('liCorrectAnswer');
            if (ans) {
                const newAns = ans.cloneNode(true);
                ans.parentNode.replaceChild(newAns, ans);
                newAns.addEventListener('change', function () { updateCorrectAnswerDisplay(this.value); });
            }
        },
        clear: function () {
            ['liLevel', 'liTopic', 'liCorrectAnswer'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            Object.values(quills).forEach(q => q.setText(''));
            updateCorrectAnswerDisplay('');
            this.toggleEditable(true);
        },
        fill: function (data, isViewMode) {
            document.getElementById('liLevel').value = data.level || '';
            document.getElementById('liLevel').dispatchEvent(new Event('change'));
            document.getElementById('liTopic').value = data.topic || '';
            if (quills.content) { quills.content.setText(''); if (data.content) quills.content.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(data.content)); }
            this.toggleEditable(!isViewMode);
        },
        collect: function () {
            return { level: document.getElementById('liLevel').value, summary: document.getElementById('liTopic').value };
        },
        toggleEditable: function (editable) {
            Object.values(quills).forEach(q => q.enable(editable));
            document.querySelectorAll('#form-listen input, #form-listen select').forEach(el => { if (!el.classList.contains('readonly-field')) el.disabled = !editable; });
            document.querySelectorAll('#form-listen .punc-btn').forEach(b => b.disabled = !editable);
        }
    };
})();


const ListenGroupHandler = (function () {
    const quills = { main: null, subs: {} };

    // 定義兩題子題的固定規格
    const subConfigs = [
        {
            index: 0,
            title: "第一小題：難度三",
            level: "難度三",
            cores: ["推斷訊息"],
            indicators: ["推斷訊息邏輯性", "能掌握語意轉折", "能推斷語意變化"]
        },
        {
            index: 1,
            title: "第二小題：難度四",
            level: "難度四",
            cores: ["歸納分析訊息", "區辨詞語多義性"],
            indicators: ["歸納或總結訊息內容", "分解或辨析訊息內容", "區辨詞語的多義性"]
        }
    ];

    // 更新子題選項卡片的正確答案標示 (綠色邊框)
    function updateSubCorrectAnswerDisplay(uid, selectedValue) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`lgOptCard-${uid}-${opt}`);
            if (card) {
                if (opt === selectedValue) card.classList.add('is-correct-answer');
                else card.classList.remove('is-correct-answer');
            }
        });
        const dropdown = document.getElementById(`lg-ans-select-${uid}`);
        if (dropdown) {
            if (selectedValue) dropdown.classList.add('has-answer');
            else dropdown.classList.remove('has-answer');
        }
    }

    // 產生選項 HTML
    function generateOptionHTML(uid, opt) {
        return `<div class="card option-card mb-2" id="lgOptCard-${uid}-${opt}">
                <div class="option-header-styled"><span class="badge bg-secondary">選項 ${opt}</span></div>
                <div class="quill-master-container border-0">
                    ${PUNCTUATION_BAR_HTML}
                    <div id="q-${uid}-opt${opt}" class="option-editor border-0"></div>
                    <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary">
                        <span>字數：<span class="count-num">0</span></span>
                    </div>
                </div>
            </div>`;
    }

    return {
        init: function () {
            // 初始化母題編輯器
            if (document.getElementById('q-listengroup-content') && !document.getElementById('q-listengroup-content').classList.contains('ql-container')) {
                quills.main = new Quill('#q-listengroup-content', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '請輸入語音內容...' });
                bindQuillHelpers(quills.main, 'q-listengroup-content');
            }
            // 渲染固定子題
            this.renderFixedSubQuestions();
        },

        renderFixedSubQuestions: function () {
            const container = document.getElementById('listengroup-sub-container');
            if (!container || container.children.length > 0) return; // 避免重複渲染

            subConfigs.forEach((config, idx) => {
                const uid = `lgsub-${config.index}`;

                // 建立卡片
                const card = document.createElement('div');
                card.className = 'card mb-3 sub-question-card shadow-sm border-0';
                card.innerHTML = `
                    <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center" 
                         data-bs-toggle="collapse" data-bs-target="#collapse-${uid}" aria-expanded="true" style="cursor:pointer">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-chevron-down accordion-arrow"></i>
                            <span class="fw-bold text-primary sub-index-label">子題代碼：${idx + 1} (${config.title})</span>
                            <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${uid}" title="內容完整"></i>
                        </div>
                    </div>
                    <div id="collapse-${uid}" class="collapse show border border-top-0 rounded-bottom" data-bs-parent="#listengroup-sub-container">
                        <div class="card-body bg-light">
                            
                            <div class="row g-2 mb-3 p-3 bg-white border rounded">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-secondary">核心能力</label>
                                    <select class="form-select form-select-sm" id="lg-core-${uid}">
                                        ${config.cores.map(c => `<option value="${c}">${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-secondary">細目指標</label>
                                    <select class="form-select form-select-sm" id="lg-ind-${uid}">
                                        ${config.indicators.map(i => `<option value="${i}">${i}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="form-label fw-bold small text-secondary required-star">子題內容 (語音腳本)</label>
                                <div class="quill-master-container border rounded bg-white">
                                    ${PUNCTUATION_BAR_HTML}
                                    <div id="q-${uid}-content" class="bg-white"></div>
                                    <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary">
                                        <span>字數：<span class="count-num">0</span></span>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="form-label fw-bold small text-secondary required-star">選項與正確答案</label>
                                ${['A', 'B', 'C', 'D'].map(opt => generateOptionHTML(uid, opt)).join('')}
                                
                                <div class="answer-selector-section mt-2">
                                    <span class="selector-label"><i class="bi bi-check-circle"></i> 正確答案</span>
                                    <select class="answer-dropdown" id="lg-ans-select-${uid}">
                                        <option value="">請選擇...</option>
                                        <option value="A">選項 A</option><option value="B">選項 B</option><option value="C">選項 C</option><option value="D">選項 D</option>
                                    </select>
                                </div>
                            </div>

                            <div class="mb-2">
                                <label class="form-label fw-bold small text-secondary">解析</label>
                                <div class="quill-master-container border rounded bg-white">
                                    ${PUNCTUATION_BAR_HTML}
                                    <div id="q-${uid}-explanation" class="bg-white"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);

                // 初始化 Quill
                const tb = window.optionToolbar;
                const mainTb = window.mainToolbar;

                quills.subs[uid] = {
                    content: new Quill(`#q-${uid}-content`, { theme: 'snow', modules: { toolbar: mainTb }, placeholder: '請輸入子題語音內容...' }),
                    optA: new Quill(`#q-${uid}-optA`, { theme: 'snow', modules: { toolbar: tb } }),
                    optB: new Quill(`#q-${uid}-optB`, { theme: 'snow', modules: { toolbar: tb } }),
                    optC: new Quill(`#q-${uid}-optC`, { theme: 'snow', modules: { toolbar: tb } }),
                    optD: new Quill(`#q-${uid}-optD`, { theme: 'snow', modules: { toolbar: tb } }),
                    explanation: new Quill(`#q-${uid}-explanation`, { theme: 'snow', modules: { toolbar: mainTb } })
                };

                // ★ 修改：綁定所有編輯器的輔助功能 (標點 & 字數)
                bindQuillHelpers(quills.subs[uid].content, `q-${uid}-content`);
                bindQuillHelpers(quills.subs[uid].explanation, `q-${uid}-explanation`);
                ['A', 'B', 'C', 'D'].forEach(opt => {
                    bindQuillHelpers(quills.subs[uid][`opt${opt}`], `q-${uid}-opt${opt}`);
                });

                // 綁定檢查事件 (綠勾勾 & 選項高亮)
                const checkFn = () => this.checkCompletion(uid);

                // 監聽文字變更
                quills.subs[uid].content.on('text-change', checkFn);
                ['A', 'B', 'C', 'D'].forEach(opt => {
                    quills.subs[uid][`opt${opt}`].on('text-change', checkFn);
                });

                // 監聽下拉選單
                const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
                ansSelect.addEventListener('change', function () {
                    updateSubCorrectAnswerDisplay(uid, this.value);
                    checkFn();
                });
            });
        },

        // 檢查單一子題是否完成 (題目+選項+答案)
        checkCompletion: function (uid) {
            const q = quills.subs[uid];
            if (!q) return;

            // 1. 題目要有字
            const hasContent = q.content.getText().trim().length > 0;

            // 2. 答案要有選
            const ans = document.getElementById(`lg-ans-select-${uid}`).value;

            // 3. 所有選項 (A, B, C, D) 都要有字
            let hasAllOptions = true;
            ['A', 'B', 'C', 'D'].forEach(opt => {
                if (q[`opt${opt}`].getText().trim().length === 0) hasAllOptions = false;
            });

            const checkIcon = document.getElementById(`check-icon-${uid}`);

            // 綜合判斷
            if (hasContent && ans && hasAllOptions) {
                checkIcon.classList.remove('d-none');
            } else {
                checkIcon.classList.add('d-none');
            }
        },

        clear: function () {
            if (quills.main) quills.main.setText('');
            document.getElementById('lgLevel').value = '';
            document.getElementById('lgVoiceType').value = '';
            document.getElementById('lgMaterial').value = '';
            document.getElementById('lgAttachment').value = '';

            // 清空所有子題
            Object.keys(quills.subs).forEach(uid => {
                const s = quills.subs[uid];
                s.content.setText('');
                s.optA.setText('');
                s.optB.setText('');
                s.optC.setText('');
                s.optD.setText('');
                s.explanation.setText('');

                // 重置下拉
                const ans = document.getElementById(`lg-ans-select-${uid}`);
                if (ans) {
                    ans.value = '';
                    updateSubCorrectAnswerDisplay(uid, '');
                }
                document.getElementById(`check-icon-${uid}`).classList.add('d-none');
            });

            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            document.getElementById('lgLevel').value = data.level || '';
            // 回填其他屬性... (略，視實際資料結構)

            if (quills.main) {
                quills.main.setText('');
                if (data.content) quills.main.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(data.content));
            }

            // 回填子題資料
            if (data.subQuestions && Array.isArray(data.subQuestions)) {
                data.subQuestions.forEach((subData, index) => {
                    // 根據 index 對應到 lgsub-0 或 lgsub-1
                    const uid = `lgsub-${index}`;
                    if (quills.subs[uid]) {
                        const s = quills.subs[uid];
                        const safePaste = (q, h) => { if (q && h) { q.setText(''); q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(h)); } };

                        safePaste(s.content, subData.content);
                        safePaste(s.optA, subData.optA);
                        safePaste(s.optB, subData.optB);
                        safePaste(s.optC, subData.optC);
                        safePaste(s.optD, subData.optD);
                        safePaste(s.explanation, subData.explanation);

                        const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
                        if (ansSelect) {
                            ansSelect.value = subData.ans || '';
                            updateSubCorrectAnswerDisplay(uid, subData.ans || '');
                        }

                        // 觸發檢查以顯示綠勾勾
                        this.checkCompletion(uid);
                    }
                });
            }

            this.toggleEditable(!isViewMode);
        },

        collect: function () {
            // 收集子題資料
            const subsData = [];
            subConfigs.forEach((config, idx) => {
                const uid = `lgsub-${config.index}`;
                const q = quills.subs[uid];
                const ans = document.getElementById(`lg-ans-select-${uid}`).value;
                const core = document.getElementById(`lg-core-${uid}`).value;
                const ind = document.getElementById(`lg-ind-${uid}`).value;

                subsData.push({
                    index: idx,
                    title: config.title,
                    core: core,
                    indicator: ind,
                    content: encodeURIComponent(q.content.root.innerHTML),
                    optA: encodeURIComponent(q.optA.root.innerHTML),
                    optB: encodeURIComponent(q.optB.root.innerHTML),
                    optC: encodeURIComponent(q.optC.root.innerHTML),
                    optD: encodeURIComponent(q.optD.root.innerHTML),
                    explanation: encodeURIComponent(q.explanation.root.innerHTML),
                    ans: ans
                });
            });

            return {
                mainCat: '聽力題組',
                level: document.getElementById('lgLevel').value,
                content: encodeURIComponent(quills.main.root.innerHTML),
                summary: quills.main.getText().trim().substring(0, 15) + '...',
                subQuestions: subsData
            };
        },

        toggleEditable: function (editable) {
            if (quills.main) quills.main.enable(editable);

            // 子題 Quill 與 下拉
            subConfigs.forEach(config => {
                const uid = `lgsub-${config.index}`;
                if (quills.subs[uid]) {
                    Object.values(quills.subs[uid]).forEach(q => q.enable(editable));
                }

                // 鎖定子題的屬性下拉
                document.getElementById(`lg-core-${uid}`).disabled = !editable;
                document.getElementById(`lg-ind-${uid}`).disabled = !editable;

                // 答案下拉選單
                const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
                if (ansSelect) ansSelect.disabled = !editable;
            });

            // 母題 Inputs
            const inputs = document.querySelectorAll('#form-listengroup input, #form-listengroup select');
            inputs.forEach(input => {
                if (input.classList.contains('readonly-field')) {
                    input.disabled = true;
                } else {
                    input.disabled = !editable;
                }
            });

            // 切換標點符號按鈕
            const puncBtns = document.querySelectorAll('#form-listengroup .punc-btn');
            puncBtns.forEach(btn => {
                btn.disabled = !editable;
            });
        }
    };
})();

/* --- ReadingHandler (閱讀題組) --- */
const ReadingHandler = (function () {
    const quills = { main: null, subs: {} };
    // 用於 DOM ID 的唯一計數 (不顯示給使用者，確保程式不衝突)
    let subQuestionUidCounter = 0;
    // ★ 新增：用於顯示的題號計數器 (只增不減，刪除不回補)
    let displaySequence = 0;
    // 選項 HTML 生成器 (保持原檔邏輯，但配合 CSS class)
    function generateOptionHTML(uid, opt) {
        return `<div class="card option-card mb-2" id="optCard-${uid}-${opt}">
                <div class="option-header-styled"><span class="badge bg-secondary">選項 ${opt}</span></div>
                <div class="quill-master-container border-0">
                    ${PUNCTUATION_BAR_HTML} 
                    <div id="q-${uid}-opt${opt}" class="option-editor border-0"></div>
                    <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary">
                        <span>字數：<span class="count-num">0</span></span>
                    </div>
                </div>
            </div>`;
    }

    // ★ 功能：更新子題選項卡片的正確答案標示 (綠色邊框)
    function updateSubCorrectAnswerDisplay(uid, selectedValue) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`optCard-${uid}-${opt}`);
            if (card) {
                if (opt === selectedValue) card.classList.add('is-correct-answer');
                else card.classList.remove('is-correct-answer');
            }
        });
        const dropdown = document.getElementById(`ans-select-${uid}`);
        if (dropdown) {
            if (selectedValue) dropdown.classList.add('has-answer');
            else dropdown.classList.remove('has-answer');
        }
    }

    return {
        init: function () {
            // 防止重複初始化
            if (document.getElementById('q-reading-main') && !document.getElementById('q-reading-main').classList.contains('ql-container')) {
                quills.main = new window.Quill('#q-reading-main', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '文章內容...' });
                bindQuillHelpers(quills.main, 'q-reading-main');
            }
            // 綁定全域函式供 HTML onclick 使用
            window.Reading_AddSub = () => this.addSubQuestion(null, false);
            window.Reading_RemoveSub = (uid) => this.removeSubQuestion(uid);
        },
        clear: function () {
            ['rLevel', 'rGenre', 'rDifficulty'].forEach(id => document.getElementById(id).value = '');
            if (quills.main) quills.main.setText('');
            document.getElementById('sub-questions-container').innerHTML = '';
            quills.subs = {};
            displaySequence = 0;
            this.toggleEditable(true);
            this.checkEmptyState();
        },
        fill: function (data, isViewMode) {
            document.getElementById('rLevel').value = data.level || '';
            if (quills.main) { quills.main.setText(''); if (data.content) quills.main.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(data.content)); }
            document.getElementById('sub-questions-container').innerHTML = '';
            quills.subs = {};
            // ★ 重置顯示編號 (讀取舊資料時，從頭開始發號碼牌)
            displaySequence = 0;
            // 回填子題
            if (data.subQuestions) data.subQuestions.forEach(sub => this.addSubQuestion(sub, false));
            this.checkEmptyState();
            this.toggleEditable(!isViewMode);
        },
        collect: function () {
            return {
                level: document.getElementById('rLevel').value,
                content: encodeURIComponent(quills.main.root.innerHTML),
                summary: '閱讀題組...' // 實際應從內容擷取
            };
        },
        addSubQuestion: function (data = null, isOpen = false) {
            const container = document.getElementById('sub-questions-container');
            const uid = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            // ★ 修改：題號使用獨立計數器，只加不減
            displaySequence++;
            const currentSeq = displaySequence;

            const card = document.createElement('div');
            card.className = 'card mb-3 sub-question-card shadow-sm border-0';
            card.id = `card-${uid}`;

            // ★ 修正重點 1 & 3：手風琴結構 + 綠勾勾 + 刪除按鈕
            card.innerHTML = `
                <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center ${isOpen ? '' : 'collapsed'}" 
                     data-bs-toggle="collapse" data-bs-target="#collapse-${uid}" aria-expanded="${isOpen}" style="cursor:pointer">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-chevron-down accordion-arrow"></i>
                        <span class="fw-bold text-primary sub-index-label">子題代碼：${currentSeq}</span>
                        <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${uid}" title="內容與答案皆已填寫"></i>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger border-0 sub-remove-btn" onclick="event.stopPropagation(); Reading_RemoveSub('${uid}')"><i class="bi bi-trash"></i></button>
                </div>
                
                <div id="collapse-${uid}" class="collapse ${isOpen ? 'show' : ''} border border-top-0 rounded-bottom" data-bs-parent="#sub-questions-container">
                    <div class="card-body bg-light">
                        <div class="mb-4">
                            <label class="form-label fw-bold small text-secondary required-star">題目</label>
                            <div class="quill-master-container border rounded bg-white">
                                ${PUNCTUATION_BAR_HTML} <div id="q-${uid}-content" class="bg-white"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary">
                                    <span>字數：<span class="count-num">0</span></span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <label class="form-label fw-bold small text-secondary required-star">選項與正確答案</label>
                            ${['A', 'B', 'C', 'D'].map(opt => generateOptionHTML(uid, opt)).join('')}
                            
                            <div class="answer-selector-section mt-2">
                                <span class="selector-label"><i class="bi bi-check-circle"></i> 正確答案</span>
                                <select class="answer-dropdown" id="ans-select-${uid}">
                                    <option value="">請選擇...</option>
                                    <option value="A">選項 A</option><option value="B">選項 B</option><option value="C">選項 C</option><option value="D">選項 D</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="mb-2">
                            <label class="form-label fw-bold small text-secondary">解析</label>
                            <div class="quill-master-container border rounded bg-white">
                                ${PUNCTUATION_BAR_HTML} <div id="q-${uid}-explanation" class="bg-white"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary">
                                    <span>字數：<span class="count-num">0</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
            this.checkEmptyState();

            // 初始化 Quill
            const tb = window.optionToolbar;
            const mainTb = window.mainToolbar;

            quills.subs[uid] = {
                content: new Quill(`#q-${uid}-content`, { theme: 'snow', modules: { toolbar: mainTb }, placeholder: '題目...' }),
                optA: new Quill(`#q-${uid}-optA`, { theme: 'snow', modules: { toolbar: tb } }),
                optB: new Quill(`#q-${uid}-optB`, { theme: 'snow', modules: { toolbar: tb } }),
                optC: new Quill(`#q-${uid}-optC`, { theme: 'snow', modules: { toolbar: tb } }),
                optD: new Quill(`#q-${uid}-optD`, { theme: 'snow', modules: { toolbar: tb } }),
                explanation: new Quill(`#q-${uid}-explanation`, { theme: 'snow', modules: { toolbar: mainTb } })
            };

            // 綁定標點符號功能與字數
            bindQuillHelpers(quills.subs[uid].content, `q-${uid}-content`);
            bindQuillHelpers(quills.subs[uid].explanation, `q-${uid}-explanation`);

            // 綁定檢查事件
            const checkFn = () => this.checkCompletion(uid);

            // 監聽題目變更
            quills.subs[uid].content.on('text-change', checkFn);

            ['A', 'B', 'C', 'D'].forEach(opt => {
                quills.subs[uid][`opt${opt}`].on('text-change', checkFn);
                // ★ 修正：綁定選項的標點符號工具列
                bindQuillHelpers(quills.subs[uid][`opt${opt}`], `q-${uid}-opt${opt}`);
            });

            // 監聽下拉選單變更 (同時觸發高亮與綠勾勾檢查)
            const ansSelect = document.getElementById(`ans-select-${uid}`);
            ansSelect.addEventListener('change', function () {
                updateSubCorrectAnswerDisplay(uid, this.value);
                checkFn();
            });

            // 如果有資料則回填
            if (data) {
                const safePaste = (q, h) => { if (q && h) { q.setText(''); q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(h)); } };
                safePaste(quills.subs[uid].content, data.content);
                // ... 其他回填邏輯
            }
        },
        // ★ 修正重點 4：綠勾勾邏輯 (必須題目有內容 且 答案已選)
        checkCompletion: function (uid) {
            const q = quills.subs[uid];
            if (!q) return;

            // 1. 題目要有字
            const hasTopic = q.content.getText().trim().length > 0;

            // 2. 答案要有選
            const ans = document.getElementById(`ans-select-${uid}`).value;

            // 3. 所有選項 (A, B, C, D) 都要有字
            let hasAllOptions = true;
            ['A', 'B', 'C', 'D'].forEach(opt => {
                if (q[`opt${opt}`].getText().trim().length === 0) {
                    hasAllOptions = false;
                }
            });

            const checkIcon = document.getElementById(`check-icon-${uid}`);

            // 綜合判斷
            if (hasTopic && ans && hasAllOptions) {
                checkIcon.classList.remove('d-none');
            } else {
                checkIcon.classList.add('d-none');
            }
        },
        // ★ 修正重點 2：刪除確認 (SweetAlert)
        removeSubQuestion: function (uid) {
            Swal.fire({
                title: '確定刪除此子題？',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: '刪除',
                cancelButtonText: '取消'
            }).then((result) => {
                if (result.isConfirmed) {
                    const el = document.getElementById(`card-${uid}`);
                    if (el) el.remove();
                    if (quills.subs[uid]) delete quills.subs[uid];
                    this.checkEmptyState();
                    // 重新編號
                    // const cards = document.querySelectorAll('#sub-questions-container .sub-question-card');
                    // cards.forEach((card, idx) => {
                    //     const label = card.querySelector('.sub-index-label');
                    //     if (label) label.innerText = `子題代碼：${idx + 1}`;
                    // });
                }
            });
        },
        checkEmptyState: function () {
            const container = document.getElementById('sub-questions-container');
            const emptyMsg = document.getElementById('sub-questions-empty');
            if (container && emptyMsg) {
                emptyMsg.style.display = container.children.length === 0 ? 'block' : 'none';
            }
        },
        toggleEditable: function (editable) {
            if (quills.main) quills.main.enable(editable);
            Object.values(quills.subs).forEach(s => Object.values(s).forEach(q => q.enable(editable)));

            // 鎖定新增按鈕
            const addBtn = document.getElementById('btn-add-reading-sub');
            if (addBtn) addBtn.hidden = !editable;

            // 鎖定移除按鈕
            document.querySelectorAll('#form-reading .sub-remove-btn').forEach(btn => btn.hidden = !editable);

            // 鎖定輸入框
            document.querySelectorAll('#form-reading input, #form-reading select').forEach(el => {
                if (el.id !== 'rPropositioner') el.disabled = !editable;
            });
            // 鎖定標點符號
            document.querySelectorAll('#form-reading .punc-btn').forEach(b => b.disabled = !editable);
        }
    };
})();

/* --- ShortArticleHandler (短文題組) --- */
const ShortArticleHandler = (function () {
    const quills = { main: null, subs: {} };
    // 用於 DOM ID 的唯一計數 (內部識別用)
    let subQuestionUidCounter = 0;
    // ★ 新增：顯示用的題號計數器 (只增不減，刪除不回補)
    let displaySequence = 0;
    return {
        init: function () {
            if (document.getElementById('q-short-main') && !document.getElementById('q-short-main').classList.contains('ql-container')) {
                quills.main = new window.Quill('#q-short-main', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '文章內容...' });
                bindQuillHelpers(quills.main, 'q-short-main');
            }
            window.Short_AddSub = () => this.addSubQuestion(null, false);
            window.Short_RemoveSub = (uid) => this.removeSubQuestion(uid);
        },
        clear: function () {
            document.getElementById('sLevel').value = '';
            if (quills.main) quills.main.setText('');
            document.getElementById('short-sub-container').innerHTML = '';
            quills.subs = {};
            // ★ 重置顯示編號
            displaySequence = 0;
            this.toggleEditable(true);
            this.checkEmptyState();
        },
        fill: function (data, isViewMode) {
            document.getElementById('sLevel').value = data.level || '';
            if (quills.main) { quills.main.setText(''); if (data.content) quills.main.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(data.content)); }
            document.getElementById('short-sub-container').innerHTML = '';
            quills.subs = {};
            // ★ 重置顯示編號 (讀取舊資料時從頭開始)
            displaySequence = 0;
            if (data.subQuestions) data.subQuestions.forEach(sub => this.addSubQuestion(sub, false));
            this.checkEmptyState();
            this.toggleEditable(!isViewMode);
        },
        collect: function () {
            return {
                level: document.getElementById('sLevel').value,
                content: encodeURIComponent(quills.main.root.innerHTML),
                summary: '短文題組...'
            };
        },
        addSubQuestion: function (data = null, isOpen = false) {
            const container = document.getElementById('short-sub-container');
            const uid = `ssub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            // ★ 修改：題號使用獨立計數器，只加不減
            displaySequence++;
            const currentSeq = displaySequence;

            const card = document.createElement('div');
            card.className = 'card mb-3 sub-question-card shadow-sm border-0';
            card.id = `card-${uid}`;
            card.innerHTML = `
                <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center ${isOpen ? '' : 'collapsed'}" 
                     data-bs-toggle="collapse" data-bs-target="#collapse-${uid}" aria-expanded="${isOpen}" style="cursor:pointer">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-chevron-down accordion-arrow"></i>
                        <span class="fw-bold text-primary sub-index-label">子題代碼：${currentSeq}</span>
                        <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${uid}"></i>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger border-0 sub-remove-btn" onclick="event.stopPropagation(); Short_RemoveSub('${uid}')"><i class="bi bi-trash"></i></button>
                </div>
                <div id="collapse-${uid}" class="collapse ${isOpen ? 'show' : ''} border border-top-0 rounded-bottom" data-bs-parent="#short-sub-container">
                    <div class="card-body bg-light">
                        <div class="mb-3">
                        <label class="form-label fw-bold small text-secondary required-star">題目</label>
                            <div class="quill-master-container border rounded bg-white">
                                ${PUNCTUATION_BAR_HTML}
                                <div id="qs-${uid}-content" class="bg-white"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary">
                                    <span>字數：<span class="count-num">0</span></span>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="form-label fw-bold small text-secondary">批說:</label> 
                            <div class="quill-master-container border rounded bg-white">
                                ${PUNCTUATION_BAR_HTML}
                                <div id="qs-${uid}-explanation" class="bg-white"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary">
                                    <span>字數：<span class="count-num">0</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
            this.checkEmptyState();

            const tb = window.mainToolbar;
            quills.subs[uid] = {
                content: new Quill(`#qs-${uid}-content`, { theme: 'snow', modules: { toolbar: tb }, placeholder: '子題敘述...' }),
                explanation: new Quill(`#qs-${uid}-explanation`, { theme: 'snow', modules: { toolbar: tb }, placeholder: '批說...' })
            };

            bindQuillHelpers(quills.subs[uid].content, `qs-${uid}-content`);
            bindQuillHelpers(quills.subs[uid].explanation, `qs-${uid}-explanation`);

            // 綠勾勾檢查 (短文：只要「子題敘述」有字就算完成)
            const checkFn = () => {
                const hasContent = quills.subs[uid].content.getText().trim().length > 0;
                const icon = document.getElementById(`check-icon-${uid}`);
                if (hasContent) icon.classList.remove('d-none');
                else icon.classList.add('d-none');
            };
            quills.subs[uid].content.on('text-change', checkFn);

            if (data) {
                const safePaste = (q, h) => { if (q && h) { q.setText(''); q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(h)); } };
                safePaste(quills.subs[uid].content, data.content);
                safePaste(quills.subs[uid].explanation, data.explanation);
                checkFn(); // 觸發一次檢查
            }
        },
        removeSubQuestion: function (uid) {
            Swal.fire({
                title: '確定刪除此子題？',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: '刪除',
                cancelButtonText: '取消'
            }).then((result) => {
                if (result.isConfirmed) {
                    const el = document.getElementById(`card-${uid}`);
                    if (el) el.remove();
                    if (quills.subs[uid]) delete quills.subs[uid];
                    this.checkEmptyState();

                    // ★ 修改：移除重新編號的邏輯
                    // 這樣刪除中間的項目後，後面的代號不會遞補，保留原代號
                }
            });
        },
        checkEmptyState: function () {
            const container = document.getElementById('short-sub-container');
            const emptyMsg = document.getElementById('short-sub-empty');
            if (container && emptyMsg) {
                emptyMsg.style.display = container.children.length === 0 ? 'block' : 'none';
            }
        },
        toggleEditable: function (editable) {
            if (quills.main) quills.main.enable(editable);
            Object.values(quills.subs).forEach(s => Object.values(s).forEach(q => q.enable(editable)));

            const addBtn = document.getElementById('btn-add-short-sub');
            if (addBtn) addBtn.hidden = !editable;

            document.querySelectorAll('#form-shortarticle .sub-remove-btn').forEach(btn => btn.hidden = !editable);
            document.querySelectorAll('#form-shortarticle input, #form-shortarticle select').forEach(el => {
                if (['sPropositioner', 'sMainCat', 'sSubCat'].includes(el.id)) el.disabled = true;
                else el.disabled = !editable;
            });
            document.querySelectorAll('#form-shortarticle .punc-btn').forEach(b => b.disabled = !editable);
        }
    };
})();

// --- Handler 映射表 ---
const TypeHandlers = {
    '一般題目': GeneralHandler,
    '精選題目': GeneralHandler,
    '閱讀題組': ReadingHandler,
    '長文題目': LongArticleHandler,
    '短文題組': ShortArticleHandler,
    '聽力題目': ListenHandler,
    '聽力題組': ListenGroupHandler
};

// ==========================================
//  3. 核心邏輯 (App Logic)
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    const modalEl = document.getElementById('propModal');
    if (modalEl) propModal = new bootstrap.Modal(modalEl);
    const toastEl = document.getElementById('liveToast');
    if (toastEl) toastInstance = new bootstrap.Toast(toastEl);

    Object.values(TypeHandlers).forEach(h => { if (h && h.init) h.init(); });

    initProjectHeader();
    initCheckboxLogic();
    initFilter();
    initTypeSwitcher();
    initAutoSelect();
    updateStats();
    sortPropList();

    document.querySelectorAll('tbody tr').forEach(row => {
        const badge = row.querySelector('.badge-outline');
        if (badge) {
            const txt = badge.innerText.trim();
            if (txt === '命題送審' || txt === '不採用') {
                row.classList.add('row-locked');
                const cb = row.querySelector('input[type="checkbox"]');
                if (cb) cb.disabled = true;
            }
        }
    });
});

// 專案切換
function initProjectHeader() {
    const toggle = document.getElementById("projectToggle");
    const dropdown = document.getElementById("projectDropdown");
    const close = document.getElementById("closeDropdown");
    const items = document.querySelectorAll(".project-item");
    const currentRole = document.getElementById("currentUserRole");

    if (toggle && dropdown) {
        toggle.addEventListener("click", () => { dropdown.classList.toggle("show"); toggle.classList.toggle("active"); });
        close.addEventListener("click", (e) => { e.stopPropagation(); dropdown.classList.remove("show"); toggle.classList.remove("active"); });
        document.addEventListener("click", (e) => { if (!toggle.contains(e.target) && !dropdown.contains(e.target)) { dropdown.classList.remove("show"); toggle.classList.remove("active"); } });

        items.forEach(item => {
            item.addEventListener("click", function () {
                items.forEach(i => i.classList.remove("active"));
                this.classList.add("active");
                const year = this.getAttribute("data-year");
                const name = this.getAttribute("data-name");
                const role = this.getAttribute("data-role");

                document.getElementById("currentProjectYear").innerText = year + "年度";
                document.getElementById("currentProjectName").innerText = name;
                if (currentRole) {
                    currentRole.className = "role-badge " + RoleClassMapping[role];
                    currentRole.innerText = RoleMapping[role];
                    currentRole.style.display = role === 'admin' ? 'inline-block' : 'none';
                }
                dropdown.classList.remove("show");
                toggle.classList.remove("active");
            });
        });
    }
}

// Modal Router
window.openPropModal = function (btn, mode) {
    const titleEl = document.getElementById('propModalTitle');
    if (titleEl) titleEl.innerText = mode === 'create' ? '新增命題' : (mode === 'edit' ? '編輯命題' : '檢視命題');

    const typeSelect = document.getElementById('mType');
    const statusBadge = document.getElementById('mStatusBadge');

    if (mode === 'create') {
        document.getElementById('editRowFrom').value = '';
        typeSelect.value = '一般題目';
        typeSelect.disabled = false;
        statusBadge.innerText = '未儲存';
        statusBadge.className = 'badge-outline badge-unsaved';
        Object.values(TypeHandlers).forEach(h => { if (h.clear) h.clear(); });
        toggleGlobalEditable(true);
        typeSelect.dispatchEvent(new Event('change'));
    } else {
        const row = btn.closest('tr');
        document.getElementById('editRowFrom').value = row.rowIndex;
        const type = row.getAttribute('data-type');
        const status = row.getAttribute('data-status');
        const jsonData = JSON.parse(row.getAttribute('data-json') || '{}');

        typeSelect.value = type;
        statusBadge.innerText = status;
        statusBadge.className = `badge-outline badge-${getStatusClass(status)}`;

        const handler = TypeHandlers[type];
        if (handler && handler.fill) handler.fill(jsonData, mode === 'view');

        typeSelect.disabled = true;
        toggleGlobalEditable(mode !== 'view');
        typeSelect.dispatchEvent(new Event('change'));
    }
    propModal.show();
};

window.saveProp = function (targetStatus) {
    const type = document.getElementById('mType').value;
    const handler = TypeHandlers[type];
    if (!handler) return;

    const specificData = handler.collect(targetStatus);
    if (!specificData) return;

    const rowData = {
        type: type, status: targetStatus, time: getCurrentTime(), ...specificData
    };
    writeToTable(rowData);
    showToast(`已儲存：${targetStatus}`);
    propModal.hide();
};

window.deleteRow = function (btn) {
    Swal.fire({ title: '確定刪除?', icon: 'warning', showCancelButton: true, confirmButtonText: '刪除' }).then((r) => {
        if (r.isConfirmed) { btn.closest('tr').remove(); checkEmptyState(); showToast('已刪除', 'error'); }
    });
};

window.batchAction = function (action) {
    if (action !== '刪除') return;
    const checks = document.querySelectorAll('tbody .data-row input:checked:not(:disabled)');
    if (checks.length === 0) return Swal.fire({ icon: 'warning', text: '請先勾選' });
    Swal.fire({ title: `刪除 ${checks.length} 筆?`, icon: 'warning', showCancelButton: true }).then((r) => {
        if (r.isConfirmed) { checks.forEach(c => c.closest('tr').remove()); resetSelection(); checkEmptyState(); showToast('已批次刪除'); }
    });
};

window.batchUpdateStatus = function (status) {
    const checks = document.querySelectorAll('tbody .data-row input:checked:not(:disabled)');
    if (checks.length === 0) return Swal.fire({ icon: 'warning', text: '請先勾選' });
    Swal.fire({ title: `設為 ${status}?`, icon: 'question', showCancelButton: true }).then((r) => {
        if (r.isConfirmed) {
            checks.forEach(c => {
                const row = c.closest('tr');
                const badge = getStatusClass(status);
                row.cells[4].innerHTML = `<span class="badge-outline badge-${badge}">${status}</span>`;
                row.setAttribute('data-status', status);
                let json = JSON.parse(row.getAttribute('data-json') || '{}');
                json.status = status;
                row.setAttribute('data-json', JSON.stringify(json));

                if (status === '命題送審' || status === '不採用') {
                    row.classList.add('row-locked'); c.disabled = true;
                } else {
                    row.classList.remove('row-locked'); c.disabled = false;
                }
                updateRowActionButtons(row, status);
            });
            resetSelection(); updateStats(); sortPropList(); showToast('已更新狀態');
        }
    });
};

// Utils
function writeToTable(data) {
    const idx = document.getElementById('editRowFrom').value;
    const tbody = document.querySelector('tbody');
    let row;
    const actionHtml = getActionHtml(data.status);

    if (idx) {
        row = document.querySelector('table').rows[idx];
        row.cells[1].innerHTML = `<span class="fw-medium text-dark">${data.summary}</span>`;
        row.cells[2].innerHTML = `<span class="badge bg-light text-dark border">${data.level || '-'}</span>`;
        row.cells[3].innerText = data.type;
        row.cells[4].innerHTML = `<span class="badge-outline badge-${getStatusClass(data.status)}">${data.status}</span>`;
        row.cells[6].innerText = data.time;
        row.cells[7].innerHTML = actionHtml;
    } else {
        row = tbody.insertRow(0);
        row.classList.add('data-row');
        row.innerHTML = `<td><input type="checkbox" class="form-check-input"></td>
            <td class="text-dark fw-medium">${data.summary}</td>
            <td><span class="badge bg-light text-dark border">${data.level || '-'}</span></td>
            <td>${data.type}</td>
            <td><span class="badge-outline badge-${getStatusClass(data.status)}">${data.status}</span></td>
            <td>${data.time}</td><td>${data.time}</td><td class="action-links">${actionHtml}</td>`;
        initCheckboxLogic();
    }

    if (data.status === '命題送審') { row.classList.add('row-locked'); row.querySelector('input').disabled = true; }
    else { row.classList.remove('row-locked'); row.querySelector('input').disabled = false; }

    row.setAttribute('data-type', data.type);
    row.setAttribute('data-status', data.status);
    row.setAttribute('data-level', data.level || 'all');
    row.setAttribute('data-json', JSON.stringify(data));
    checkEmptyState();
}

function getActionHtml(status) {
    let html = `<button class="btn btn-link p-0 text-decoration-none fw-bold" onclick="openPropModal(this, 'view')">檢視</button>`;
    if (status !== '命題送審' && status !== '不採用') {
        html += `<span class="text-muted mx-1">|</span><button class="btn btn-link p-0 text-decoration-none fw-bold text-success" onclick="openPropModal(this, 'edit')">編輯</button>
                 <span class="text-muted mx-1">|</span><button class="btn btn-link p-0 text-decoration-none fw-bold text-danger" onclick="deleteRow(this)">刪除</button>`;
    }
    return html;
}

function updateRowActionButtons(row, status) {
    row.cells[7].innerHTML = getActionHtml(status);
}

function checkEmptyState() {
    const rows = Array.from(document.querySelectorAll('.data-row')).filter(r => r.style.display !== 'none');
    const no = document.getElementById('noDataRow');
    if (no) no.style.display = rows.length === 0 ? 'table-row' : 'none';
    updateStats(); sortPropList();
}

function updateStats() {
    let s = { total: 0, draft: 0, confirmed: 0, sent: 0, adopted: 0, revise: 0, rejected: 0 };
    document.querySelectorAll('.data-row').forEach(r => {
        const st = r.getAttribute('data-status');
        if (st === '命題草稿') s.draft++;
        else if (st === '命題完成') s.confirmed++;
        else if (st === '命題送審') s.sent++;
        else if (st === '採用') s.adopted++;
        else if (st === '改後再審') s.revise++;
        else if (st === '不採用') s.rejected++;
    });
    s.total = s.draft + s.confirmed + s.sent + s.adopted + s.revise;

    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    setT('stat-total', s.total); setT('stat-draft', s.draft); setT('stat-confirmed', s.confirmed);
    setT('stat-sent', s.sent); setT('stat-adopted', s.adopted); setT('stat-revise', s.revise); setT('stat-rejected', s.rejected);
}

function sortPropList() {
    const tbody = document.querySelector('tbody');
    const rows = Array.from(document.querySelectorAll('.data-row'));
    const no = document.getElementById('noDataRow');
    const pri = { '改後再審': 1, '命題草稿': 2, '命題完成': 3, '命題送審': 4, '採用': 5, '不採用': 6 };
    rows.sort((a, b) => {
        const sa = a.getAttribute('data-status'), sb = b.getAttribute('data-status');
        if ((pri[sa] || 99) !== (pri[sb] || 99)) return (pri[sa] || 99) - (pri[sb] || 99);
        return b.cells[5].innerText.localeCompare(a.cells[5].innerText);
    });
    rows.forEach(r => tbody.insertBefore(r, no));
}

function initCheckboxLogic() {
    const all = document.querySelector('thead input[type="checkbox"]');
    if (all) {
        const clone = all.cloneNode(true);
        all.parentNode.replaceChild(clone, all);
        clone.addEventListener('change', function () {
            document.querySelectorAll('tbody .data-row input[type="checkbox"]').forEach(c => {
                if (!c.disabled && c.closest('tr').style.display !== 'none') c.checked = this.checked;
            });
        });
    }
}

// ==========================================
//  ★ 修改：核心篩選邏輯 (修復等級篩選 & Tab 連動)
// ==========================================
function initFilter() {
    const tabState = { current: 'working' };
    const statusGroups = {
        'working': ['命題草稿', '命題完成', '命題送審'],
        'review': ['採用', '改後再審', '不採用']
    };

    // 1. 更新狀態下拉選單
    const updateStatusDropdown = (group) => {
        const select = document.getElementById('filterStatus');
        const currentVal = select.value;
        select.innerHTML = '<option value="all" selected>全部狀態</option>';
        statusGroups[group].forEach(status => {
            select.add(new Option(status, status));
        });
        if (!statusGroups[group].includes(currentVal)) select.value = 'all';
        else select.value = currentVal;
    };

    // 2. ★ 更新等級下拉選單 (修復失效問題)
    const updateLevelDropdown = () => {
        const typeSelect = document.getElementById('filterType');
        const levelSelect = document.getElementById('filterLevel');
        const currentType = typeSelect.value;
        const oldVal = levelSelect.value;

        levelSelect.innerHTML = '<option value="all">全部等級</option>';

        let opts = ['初級', '中級', '中高級', '高級', '優級'];
        if (currentType.includes('聽力')) {
            opts = ['難度一', '難度二', '難度三', '難度四']; // 聽力專用
        }

        opts.forEach(o => levelSelect.add(new Option(o, o)));

        // 嘗試保留原選擇
        if (opts.includes(oldVal)) levelSelect.value = oldVal;
        else levelSelect.value = 'all';
    };

    // 3. 核心篩選與 UI 切換
    const doFilter = () => {
        const type = document.getElementById('filterType').value;
        const status = document.getElementById('filterStatus').value;
        const level = document.getElementById('filterLevel').value;
        const key = document.getElementById('searchInput').value.toLowerCase();
        const allowedStatuses = statusGroups[tabState.current];

        let visibleCount = 0;
        document.querySelectorAll('.data-row').forEach(row => {
            const rt = row.getAttribute('data-type');
            const rs = row.getAttribute('data-status');
            const rl = row.getAttribute('data-level');
            const txt = row.cells[1].textContent.toLowerCase();

            let show = true;
            if (!allowedStatuses.includes(rs)) show = false; // Tab 過濾
            if (show) {
                if (type !== 'all' && rt !== type) show = false;
                if (status !== 'all' && rs !== status) show = false;
                if (level !== 'all' && rl !== level) show = false;
                if (key && !txt.includes(key)) show = false;
            }
            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        const noData = document.getElementById('noDataRow');
        if (noData) noData.style.display = visibleCount === 0 ? 'table-row' : 'none';
    };
    ['filterType', 'filterStatus', 'filterLevel', 'searchInput'].forEach(id => {
        const el = document.getElementById(id); if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', doFilter);
    });
    document.getElementById('filterType').addEventListener('change', function () {
        const lvl = document.getElementById('filterLevel');
        lvl.innerHTML = '<option value="all">全部等級</option>';
        const opts = this.value.includes('聽力') ? ['難度一', '難度二', '難度三', '難度四'] : ['初級', '中級', '中高級', '高級', '優級'];
        opts.forEach(o => lvl.add(new Option(o, o)));
    });
    document.getElementById('filterType').dispatchEvent(new Event('change'));


}

window.filterByStatus = function (s) {
    const el = document.getElementById('filterStatus');
    if (el) { el.value = s; el.dispatchEvent(new Event('change')); }
};

window.changeFontSize = function (dir) {
    if (dir === 1 && currentZoom < 150) currentZoom += 10;
    else if (dir === -1 && currentZoom > 80) currentZoom -= 10;
    document.documentElement.style.fontSize = `${currentZoom}%`;
    document.getElementById('fontSizeDisplay').innerText = `${currentZoom}%`;
};
window.resetFontSize = function () { currentZoom = 100; changeFontSize(0); };

function initTypeSwitcher() {
    const s = document.getElementById('mType');
    if (!s) return;
    s.addEventListener('change', function () {
        const v = this.value;
        document.querySelectorAll('.question-form-group').forEach(el => el.classList.add('d-none'));
        let tid = 'form-general';
        if (v === '長文題目') tid = 'form-longarticle';
        else if (v === '短文題組') tid = 'form-shortarticle';
        else if (v === '閱讀題組') tid = 'form-reading';
        else if (v === '聽力題目') tid = 'form-listen';
        else if (v === '聽力題組') tid = 'form-listengroup';
        const t = document.getElementById(tid); if (t) t.classList.remove('d-none');
    });
}

function initAutoSelect() {
    document.querySelectorAll('select').forEach(sel => {
        if (!sel.multiple && sel.options.length > 0) {
            const valid = Array.from(sel.options).filter(o => o.value && !o.disabled);
            if (valid.length === 1 && sel.value !== valid[0].value) sel.value = valid[0].value;
        }
    });
}

function toggleGlobalEditable(editable) {
    const inputs = document.querySelectorAll('#propModal input:not(#mType):not(.readonly-field), #propModal select:not(#mType):not(.readonly-field), #propModal textarea:not(.readonly-field)');
    inputs.forEach(el => el.disabled = !editable);
    document.querySelectorAll('.modal-footer button:not([data-bs-dismiss])').forEach(b => b.hidden = !editable);
}

function getStatusClass(s) {
    if (s === '命題草稿') return 'draft';
    if (s === '命題完成') return 'confirmed';
    if (s === '命題送審') return 'sent';
    if (s === '改後再審') return 'returned';
    if (s === '不採用') return 'rejected';
    return 'secondary';
}

function getCurrentTime() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

function showToast(msg, type = 'success') {
    const el = document.getElementById('liveToast');
    if (!el) return;
    el.className = `toast align-items-center text-white border-0 bg-${type === 'error' ? 'danger' : (type === 'secondary' ? 'secondary' : 'primary')}`;
    el.querySelector('.toast-body').innerText = msg;
    if (toastInstance) toastInstance.show(); else new bootstrap.Toast(el).show();
}

function resetSelection() {
    const m = document.querySelector('thead input[type="checkbox"]');
    if (m) m.checked = false;
    document.querySelectorAll('tbody input[type="checkbox"]').forEach(c => c.checked = false);
}

// ==========================================
//  ★ 修改：核心篩選邏輯 (修復等級篩選 & Tab 連動)
// ==========================================
function initFilter() {
    const tabState = { current: 'working' };
    const statusGroups = {
        'working': ['命題草稿', '命題完成', '命題送審'],
        'review': ['採用', '改後再審', '不採用']
    };

    // 1. 更新狀態下拉選單
    const updateStatusDropdown = (group) => {
        const select = document.getElementById('filterStatus');
        const currentVal = select.value;
        select.innerHTML = '<option value="all" selected>全部狀態</option>';
        statusGroups[group].forEach(status => {
            select.add(new Option(status, status));
        });
        if (!statusGroups[group].includes(currentVal)) select.value = 'all';
        else select.value = currentVal;
    };

    // 2. ★ 更新等級下拉選單 (修復失效問題)
    const updateLevelDropdown = () => {
        const typeSelect = document.getElementById('filterType');
        const levelSelect = document.getElementById('filterLevel');
        const currentType = typeSelect.value;
        const oldVal = levelSelect.value;

        levelSelect.innerHTML = '<option value="all">全部等級</option>';

        let opts = ['初級', '中級', '中高級', '高級', '優級'];
        if (currentType.includes('聽力')) {
            opts = ['難度一', '難度二', '難度三', '難度四']; // 聽力專用
        }

        opts.forEach(o => levelSelect.add(new Option(o, o)));

        // 嘗試保留原選擇
        if (opts.includes(oldVal)) levelSelect.value = oldVal;
        else levelSelect.value = 'all';
    };

    // 3. 核心篩選與 UI 切換
    const doFilter = () => {
        const type = document.getElementById('filterType').value;
        const status = document.getElementById('filterStatus').value;
        const level = document.getElementById('filterLevel').value;
        const key = document.getElementById('searchInput').value.toLowerCase();
        const allowedStatuses = statusGroups[tabState.current];

        let visibleCount = 0;
        document.querySelectorAll('.data-row').forEach(row => {
            const rt = row.getAttribute('data-type');
            const rs = row.getAttribute('data-status');
            const rl = row.getAttribute('data-level');
            const txt = row.cells[1].textContent.toLowerCase();

            let show = true;
            if (!allowedStatuses.includes(rs)) show = false; // Tab 過濾
            if (show) {
                if (type !== 'all' && rt !== type) show = false;
                if (status !== 'all' && rs !== status) show = false;
                if (level !== 'all' && rl !== level) show = false;
                if (key && !txt.includes(key)) show = false;
            }
            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        const noData = document.getElementById('noDataRow');
        if (noData) noData.style.display = visibleCount === 0 ? 'table-row' : 'none';
    };

    // --- 事件綁定 ---

    // Tab 切換監聽
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            const targetType = event.target.getAttribute('data-tab-type');
            tabState.current = targetType;

            // UI 切換邏輯
            const workingStats = document.getElementById('stats-working');
            const reviewStats = document.getElementById('stats-review');
            const hint = document.getElementById('operationHint');

            if (targetType === 'working') {
                workingStats.classList.remove('d-none');
                reviewStats.classList.add('d-none');
                if (hint) hint.classList.remove('d-none'); // 顯示操作提示 (移除 d-none, 恢復 d-flex)
            } else {
                workingStats.classList.add('d-none');
                reviewStats.classList.remove('d-none');
                if (hint) hint.classList.add('d-none'); // 隱藏操作提示
            }

            updateStatusDropdown(targetType);
            doFilter();
        });
    });

    // 篩選器監聽
    ['filterStatus', 'filterLevel', 'searchInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', doFilter);
    });

    // ★ 題型改變時，連動等級選單 + 觸發篩選
    document.getElementById('filterType').addEventListener('change', function () {
        updateLevelDropdown();
        doFilter();
    });

    // 初始化
    updateLevelDropdown();
    updateStatusDropdown('working');
    doFilter();

    // 綁定全域 Filter
    window.filterByStatus = function (targetStatus) {
        // ★ 修改 4: 支援 "all" (不切換 Tab，只重置篩選)
        if (targetStatus === 'all') {
            const select = document.getElementById('filterStatus');
            if (select) {
                select.value = 'all';
                select.dispatchEvent(new Event('change'));
            }
            return; // 結束
        }

        // 一般狀態切換
        let targetTab = 'working';
        if (statusGroups['review'].includes(targetStatus)) {
            targetTab = 'review';
        }

        const tabBtn = document.querySelector(`button[data-tab-type="${targetTab}"]`);
        if (tabBtn && !tabBtn.classList.contains('active')) {
            const bsTab = new bootstrap.Tab(tabBtn);
            bsTab.show();
        }

        setTimeout(() => {
            const select = document.getElementById('filterStatus');
            if (select) {
                select.value = targetStatus;
                select.dispatchEvent(new Event('change'));
            }
        }, 50);
    };
}

// ==========================================
//  ★ 修改：統計數據更新 (支援雙總計欄位)
// ==========================================
function updateStats() {
    let s = { total: 0, draft: 0, confirmed: 0, sent: 0, adopted: 0, revise: 0, rejected: 0 };
    document.querySelectorAll('.data-row').forEach(r => {
        const st = r.getAttribute('data-status');
        if (st === '命題草稿') s.draft++;
        else if (st === '命題完成') s.confirmed++;
        else if (st === '命題送審') s.sent++;
        else if (st === '採用') s.adopted++;
        else if (st === '改後再審') s.revise++;
        else if (st === '不採用') s.rejected++;
    });
    // 有效總計 (排除不採用) - 根據需求，這裡通常是所有可見命題，或是特定邏輯
    // 這裡維持原本邏輯：有效 = 除了不採用以外的所有
    s.total = s.draft + s.confirmed + s.sent + s.adopted + s.revise;

    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };

    // 更新兩個區域的總計
    setT('stat-total-working', s.total);
    setT('stat-total-review', s.total);

    setT('stat-draft', s.draft);
    setT('stat-confirmed', s.confirmed);
    setT('stat-sent', s.sent);
    setT('stat-adopted', s.adopted);
    setT('stat-revise', s.revise);
    setT('stat-rejected', s.rejected);
}