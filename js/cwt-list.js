/**
 * CWT 命題任務列表 - 整合版 JS (V3 修正版)
 * 修正：
 * 1. 子題編輯器缺標點符號工具列
 * 2. 子題手風琴與綠勾勾邏輯
 * 3. 確保所有 Quill 工具列一致
 */

// ==========================================
//  0. 設定資料 (Config)
// ==========================================

// 定義各題型允許的等級
const LevelConstraints = {
    'default': ['初級', '中級', '中高級', '高級', '優級'],
    '短文題組': ['高級', '優級'],
    '聽力題目': ['難度一', '難度二', '難度三', '難度四', '難度五'],
    '聽力題組': ['難度一', '難度二', '難度三', '難度四', '難度五']
};

/**
 * 根據題型更新 [共用等級] 下拉選單
 */
function updateCommonLevelOptions(type) {
    const levelSelect = document.getElementById('commonLevel');
    if (!levelSelect) return;

    // 1. 取得該題型允許的等級列表 (若無設定則使用預設)
    const allowedLevels = LevelConstraints[type] || LevelConstraints['default'];

    // 2. 暫存當前選中的值 (避免切換時被清空，如果該值在新清單中合法則保留)
    const currentVal = levelSelect.value;

    // 3. 清空並重建選項
    levelSelect.innerHTML = '<option value="">請選擇...</option>';
    allowedLevels.forEach(lvl => {
        levelSelect.add(new Option(lvl, lvl));
    });

    // 4. 嘗試回填值
    if (allowedLevels.includes(currentVal)) {
        levelSelect.value = currentVal;
    } else {
        levelSelect.value = ''; // 如果原值不合法（例如從初級切換到短文題組），則重置
    }
}

// ==========================================
//  1. 全域設定與工具 (Globals & Utils)
// ==========================================
// 新增同步難度的 Helper 函數
window.syncDifficulty = function (val) {
    const select = document.getElementById('gDifficulty');
    if (select) select.value = val;
};

// --- 註冊 Quill 自訂字體 ---
if (typeof Quill !== 'undefined') {
    try {
        const Font = Quill.import('attributors/class/font') || Quill.import('formats/font');
        Font.whitelist = ['microsoft-jhenghei', 'kaiu', 'times-new-roman', 'arial', 'comic-sans-ms'];
        Quill.register(Font, true);
    } catch (e) {
        console.warn("Quill 字體註冊失敗，將使用預設字體", e);
    }
}

// --- Quill 工具列設定 ---
// 設定 A：全功能 (用於：共用編輯器)
window.mainToolbar = [
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': ['kaiu', 'times-new-roman'] }],
    [{ 'color': [] }, { 'background': [] }], // 補回背景色
    [{ 'align': [] }],
    ['bold', 'underline', 'strike'],
    ['link'], // 移除 image，因改用附檔上傳
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['clean']
];

// 角色對照表
const RoleMapping = { admin: "系統管理員", reviewer: "審題委員", teacher: "命題教師" };
const RoleClassMapping = { admin: "role-admin", reviewer: "role-reviewer", teacher: "role-teacher" };

// 全域變數
let propModal;
let toastInstance;
let currentZoom = 100;

// ==========================================
//  2. 題型 Handlers
// ==========================================

// 1. 共用編輯器管理員 (手機輸入模式)
const CommonEditorManager = {
    quill: null,
    activePreview: null,
    activeHidden: null,
    backdrop: null,

    init: function () {
        // 初始化共用實例
        this.quill = new Quill('#common-quill-editor', {
            theme: 'snow',
            modules: { toolbar: window.mainToolbar }
        });

        this.backdrop = document.getElementById('common-editor-backdrop');

        // 點擊遮罩層時關閉編輯器
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => {
                this.close();
            });
        }

        // 監聽文字變更：即時計算字數與同步預覽
        this.quill.on('text-change', () => {
            const text = this.quill.getText().trim();
            document.getElementById('common-word-count').innerText = text.length;

            if (this.activePreview && this.activeHidden) {
                const html = this.quill.root.innerHTML === '<p><br></p>' ? '' : this.quill.root.innerHTML;
                this.activePreview.innerHTML = html;
                this.activeHidden.value = encodeURIComponent(html);
            }
        });

        // 綁定標點符號列按鈕 (沿用原邏輯)
        document.querySelectorAll('#common-editor-wrapper .punc-btn').forEach(btn => {
            btn.onclick = (e) => {
                // 1. 取得符號與回退數值
                const char = btn.getAttribute('data-char');
                // 如果沒有 data-back 屬性，預設為 0
                const moveBack = parseInt(btn.getAttribute('data-back') || '0');

                // 2. 取得當前游標位置
                const range = this.quill.getSelection(true);

                if (range) {
                    // 3. 插入文字
                    this.quill.insertText(range.index, char);

                    // 4. 設定新游標位置：原本位置 + 文字長度 - 回退量
                    this.quill.setSelection(range.index + char.length - moveBack);
                }
            };
        });
    },

    open: function (el) {
        this.activePreview = el;
        this.activeHidden = document.getElementById('hidden-' + el.getAttribute('data-field'));

        const wrapper = document.getElementById('common-editor-wrapper');

        // 1. 先顯示元素 (此時還在螢幕下方)
        wrapper.style.display = 'block';
        if (this.backdrop) this.backdrop.style.display = 'block';

        // 2. 載入內容
        const content = this.activeHidden.value ? decodeURIComponent(this.activeHidden.value) : '';
        this.quill.setText('');
        this.quill.clipboard.dangerouslyPasteHTML(0, content);

        // 3. ★ 關鍵：稍微延遲後加上 .show class，觸發 CSS 滑動動畫
        // 同時這也解決了 addRange 的錯誤，因為這時候 DOM 已經長出來了
        setTimeout(() => {
            wrapper.classList.add('show');
            if (this.backdrop) this.backdrop.style.opacity = '1';
            // 等動畫稍微跑一下再 Focus (體驗較好)，或立即 Focus 也可以
            this.quill.focus();

            // 游標移到最後
            const len = this.quill.getLength();
            this.quill.setSelection(len, len);
        }, 50);
    },

    close: function () {
        const wrapper = document.getElementById('common-editor-wrapper');

        // 1. 移除 .show，觸發 CSS 下滑動畫
        wrapper.classList.remove('show');
        if (this.backdrop) this.backdrop.style.opacity = '0'; // 遮罩變透明
        // 2. 等待動畫時間 (300ms) 結束後，再真正隱藏元素
        setTimeout(() => {
            wrapper.style.display = 'none';
            if (this.backdrop) this.backdrop.style.display = 'none';

            this.activePreview = null;
            this.activeHidden = null;
        }, 300);
    }
};

// 全域喚起函式
window.openCommonEditor = function (el) {
    CommonEditorManager.open(el);
};

// 修改後的 GeneralHandler
const GeneralHandler = (function () {
    // 定義類別資料 (從原代碼提取)
    const categoryData = {
        "文字": ["字音", "字型", "造字原則"],
        "語詞": ["辭義辨識", "詞彙辨析", "詞性分辨", "語詞應用"],
        "成語短語": ["短語辨識", "語詞使用", "文義取得"],
        "造句標點": ["句義", "句法辨析", "標點符號"],
        "修辭技巧": ["修辭類型", "語態變化"],
        "語文知識": ["語文知識"],
        "文意判讀": ["段義辨析"]
    };

    return {
        // 初始化：綁定下拉選單邏輯
        init: function () {
            const mainSelect = document.getElementById('gMainCategory');
            const subSelect = document.getElementById('gSubCategory');

            if (mainSelect) {
                // 重置並填入主類選項
                mainSelect.innerHTML = '<option value="">請選擇...</option>';
                Object.keys(categoryData).forEach(key => mainSelect.add(new Option(key, key)));

                // 綁定連動事件
                mainSelect.addEventListener('change', function () {
                    subSelect.innerHTML = '<option value="">請選擇...</option>';
                    if (this.value && categoryData[this.value]) {
                        subSelect.disabled = false;
                        subSelect.classList.remove('readonly-field');
                        categoryData[this.value].forEach(sub => subSelect.add(new Option(sub, sub)));
                    } else {
                        subSelect.disabled = true;
                        subSelect.classList.add('readonly-field');
                        subSelect.innerHTML = '<option value="">請先選擇主類</option>';
                    }
                });
            }

            // 同步 Radio Button 到隱藏的 Select (供 JS 讀取)
            window.syncDifficulty = function (val) {
                const select = document.getElementById('gDifficulty');
                if (select) select.value = val;
            };

            // 綁定答案選擇連動
            const ansSelect = document.getElementById('gCorrectAnswer');
            if (ansSelect) {
                ansSelect.addEventListener('change', function () {
                    // 移除所有選項的高亮
                    ['A', 'B', 'C', 'D'].forEach(opt => {
                        const card = document.getElementById(`optionCard${opt}`);
                        if (card) card.classList.remove('is-correct-answer');
                    });

                    // 加入目前選中的高亮
                    if (this.value) {
                        const targetCard = document.getElementById(`optionCard${this.value}`);
                        if (targetCard) targetCard.classList.add('is-correct-answer');
                    }
                });
            }
        },

        // 清除表單
        clear: function () {
            // 清除共用欄位
            ['commonLevel'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const elDate = document.getElementById('commonLastModified');
            if (elDate) elDate.value = getCurrentTime();
            // 命題者通常預設不變，或重置為當前使用者
            document.getElementById('commonPropositioner').value = '沈雅茹';

            // 清除一般欄位
            ['gDifficulty', 'gMainCategory', 'gCorrectAnswer', 'hidden-g-content', 'hidden-g-optA', 'hidden-g-optB', 'hidden-g-optC', 'hidden-g-optD', 'hidden-g-explanation'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // 重置 Radio
            const defaultRadio = document.getElementById('gDiff2'); // 預設中
            if (defaultRadio) defaultRadio.checked = true;

            // 清空預覽區
            ['preview-g-content', 'preview-g-optA', 'preview-g-optB', 'preview-g-optC', 'preview-g-optD', 'preview-g-explanation'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

            // 重置次類
            const sub = document.getElementById('gSubCategory');
            if (sub) {
                sub.innerHTML = '<option value="">請先選擇主類</option>';
                sub.disabled = true;
            }

            // ★ FIX: 重置 View Mode 鎖定狀態 (preview box inline style + Radio)
            document.querySelectorAll('#form-general .editor-preview-box').forEach(el => {
                el.style.pointerEvents = 'auto';
                el.style.backgroundColor = '#fff';
                el.style.borderColor = '#dee2e6';
            });
            document.querySelectorAll('input[name="gDifficultyRadio"]').forEach(r => r.disabled = false);
            const lvl = document.getElementById('commonLevel');
            if (lvl) lvl.disabled = false;
        },

        // 回填資料 (編輯模式)
        fill: function (data, isViewMode) {
            // 1. 回填共用欄位 (.top-section)
            const elLevel = document.getElementById('commonLevel');
            if (elLevel) elLevel.value = data.level || '';

            // 回填最後修訂日 (假設 data.time 是修訂時間，或 data.lastModified)
            const elDate = document.getElementById('commonLastModified');
            if (elDate) elDate.value = data.time ? data.time.split(' ')[0] : getCurrentTime().split(' ')[0]; // 只取日期

            // 2. 回填一般欄位
            // 同步難度 Radio
            const diff = data.difficulty || '中';
            const radio = document.querySelector(`input[name="gDifficultyRadio"][value="${diff}"]`);
            if (radio) radio.checked = true;
            // 同步 hidden select (以防萬一)
            const diffSelect = document.getElementById('gDifficulty');
            if (diffSelect) diffSelect.value = diff;

            const main = document.getElementById('gMainCategory');
            if (main) {
                main.value = data.mainCat || '';
                main.dispatchEvent(new Event('change'));
            }
            const sub = document.getElementById('gSubCategory');
            if (sub && data.subCat) sub.value = data.subCat;

            // 3. 回填內容
            const setContent = (key, val) => {
                const hidden = document.getElementById(`hidden-g-${key}`);
                const preview = document.getElementById(`preview-g-${key}`);
                if (hidden && preview) {
                    const decoded = val ? decodeURIComponent(val) : '';
                    hidden.value = decoded;
                    preview.innerHTML = decoded;
                }
            };

            setContent('content', data.content);
            setContent('explanation', data.explanation);
            ['A', 'B', 'C', 'D'].forEach(opt => setContent(`opt${opt}`, data[`opt${opt}`]));

            // 4. 回填答案
            const ans = document.getElementById('gCorrectAnswer');
            if (ans) {
                ans.value = data.ans || '';
                ans.dispatchEvent(new Event('change'));
            }

            // 5. 處理 isViewMode (鎖定)
            const previews = document.querySelectorAll('#form-general .editor-preview-box');
            previews.forEach(el => {
                if (isViewMode) {
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#f3f4f6';
                    el.style.borderColor = '#e5e7eb';
                } else {
                    el.style.pointerEvents = 'auto';
                    el.style.backgroundColor = '#fff';
                    el.style.borderColor = '#dee2e6';
                }
            });

            // 鎖定 Radio
            document.querySelectorAll('input[name="gDifficultyRadio"]').forEach(r => {
                r.disabled = isViewMode;
            });
            // 鎖定共用欄位 (雖然 toggleGlobalEditable 會處理，但這裡顯式處理更安全)
            if (elLevel) elLevel.disabled = isViewMode;
        },

        // 收集資料 (儲存時)
        collect: function () {
            // 從 Radio 取得難度
            const diffRadio = document.querySelector('input[name="gDifficultyRadio"]:checked');

            return {
                // 從 .top-section 取得等級
                level: document.getElementById('commonLevel').value,

                mainCat: document.getElementById('gMainCategory').value,
                subCat: document.getElementById('gSubCategory').value,
                difficulty: diffRadio ? diffRadio.value : '中',

                content: document.getElementById('hidden-g-content').value,
                optA: document.getElementById('hidden-g-optA').value,
                optB: document.getElementById('hidden-g-optB').value,
                optC: document.getElementById('hidden-g-optC').value,
                optD: document.getElementById('hidden-g-optD').value,
                explanation: document.getElementById('hidden-g-explanation').value,

                summary: document.getElementById('preview-g-content').innerText.trim().substring(0, 20) + '...',
                ans: document.getElementById('gCorrectAnswer').value
            };
        }
    };
})();

/* --- GeneralHandler (一般/精選) --- */
// const GeneralHandler = (function () {
//     const quills = {};
//     const categoryData = {
//         "文字": ["字音", "字型", "造字原則"], "語詞": ["辭義辨識", "詞彙辨析", "詞性分辨", "語詞應用"],
//         "成語短語": ["短語辨識", "語詞使用", "文義取得"], "造句標點": ["句義", "句法辨析", "標點符號"],
//         "修辭技巧": ["修辭類型", "語態變化"], "語文知識": ["語文知識"], "文意判讀": ["段義辨析"]
//     };

//     function updateCorrectAnswerDisplay(val) {
//         ['A', 'B', 'C', 'D'].forEach(opt => {
//             const card = document.getElementById(`optionCard${opt}`);
//             if (card) val === opt ? card.classList.add('is-correct-answer') : card.classList.remove('is-correct-answer');
//         });
//         const dropdown = document.getElementById('gCorrectAnswer');
//         if (dropdown) val ? dropdown.classList.add('has-answer') : dropdown.classList.remove('has-answer');
//     }

//     return {
//         init: function () {
//             const mainSelect = document.getElementById('gMainCategory');
//             const subSelect = document.getElementById('gSubCategory');
//             if (mainSelect) {
//                 mainSelect.innerHTML = '<option value="">請選擇...</option>';
//                 Object.keys(categoryData).forEach(key => mainSelect.add(new Option(key, key)));
//                 mainSelect.addEventListener('change', function () {
//                     subSelect.innerHTML = '<option value="">請選擇...</option>';
//                     if (this.value && categoryData[this.value]) {
//                         subSelect.disabled = false;
//                         categoryData[this.value].forEach(sub => subSelect.add(new Option(sub, sub)));
//                     } else {
//                         subSelect.disabled = true;
//                         subSelect.innerHTML = '<option value="">請先選擇主類</option>';
//                     }
//                 });
//             }

//             // Init Quills
//             const configs = [
//                 { id: 'q-editor-content', key: 'content', tb: window.mainToolbar },
//                 { id: 'q-editor-explanation', key: 'explanation', tb: window.mainToolbar },
//                 { id: 'q-editor-optA', key: 'optA', tb: window.optionToolbar },
//                 { id: 'q-editor-optB', key: 'optB', tb: window.optionToolbar },
//                 { id: 'q-editor-optC', key: 'optC', tb: window.optionToolbar },
//                 { id: 'q-editor-optD', key: 'optD', tb: window.optionToolbar }
//             ];

//             configs.forEach(c => {
//                 const el = document.getElementById(c.id);
//                 if (el && !quills[c.key] && !el.classList.contains('ql-container')) {
//                     quills[c.key] = new Quill('#' + c.id, { theme: 'snow', modules: { toolbar: c.tb }, placeholder: '請輸入...' });
//                     bindQuillHelpers(quills[c.key], c.id);
//                 }
//             });

//             const ans = document.getElementById('gCorrectAnswer');
//             if (ans) {
//                 const newAns = ans.cloneNode(true);
//                 ans.parentNode.replaceChild(newAns, ans);
//                 newAns.addEventListener('change', function () { updateCorrectAnswerDisplay(this.value); });
//             }
//         },
//         clear: function () {
//             ['gLevel', 'gDifficulty', 'gMainCategory', 'gCorrectAnswer'].forEach(id => {
//                 const el = document.getElementById(id); if (el) el.value = '';
//             });
//             const sub = document.getElementById('gSubCategory');
//             if (sub) { sub.innerHTML = '<option value="">請先選擇主類</option>'; sub.disabled = true; }
//             Object.values(quills).forEach(q => q.setText(''));
//             updateCorrectAnswerDisplay('');
//             this.toggleEditable(true);
//         },
//         fill: function (data, isViewMode) {
//             ['gLevel', 'gDifficulty'].forEach(id => { const el = document.getElementById(id); if (el) el.value = data[id.replace('g', '').toLowerCase()] || ''; });
//             const main = document.getElementById('gMainCategory');
//             if (main) { main.value = data.mainCat || ''; main.dispatchEvent(new Event('change')); }
//             const sub = document.getElementById('gSubCategory');
//             if (sub && data.subCat) sub.value = data.subCat;

//             const setQ = (k, v) => { if (quills[k]) { quills[k].setText(''); if (v) quills[k].clipboard.dangerouslyPasteHTML(0, decodeURIComponent(v)); } };
//             setQ('content', data.content); setQ('explanation', data.explanation);
//             ['A', 'B', 'C', 'D'].forEach(o => setQ(`opt${o}`, data[`opt${o}`]));

//             const ans = document.getElementById('gCorrectAnswer');
//             if (ans) { ans.value = data.ans || ''; updateCorrectAnswerDisplay(data.ans || ''); }
//             this.toggleEditable(!isViewMode);
//         },
//         collect: function () {
//             return {
//                 level: document.getElementById('gLevel').value,
//                 mainCat: document.getElementById('gMainCategory').value,
//                 subCat: document.getElementById('gSubCategory').value,
//                 content: encodeURIComponent(quills.content.root.innerHTML),
//                 summary: quills.content.getText().trim().substring(0, 20) + '...',
//                 ans: document.getElementById('gCorrectAnswer').value
//             };
//         },
//         toggleEditable: function (editable) {
//             Object.values(quills).forEach(q => q.enable(editable));
//             document.querySelectorAll('#form-general input, #form-general select').forEach(el => {
//                 if (el.id !== 'gPropositioner' && el.id !== 'gSubCategory') el.disabled = !editable;
//             });
//             const sub = document.getElementById('gSubCategory');
//             if (sub && editable && document.getElementById('gMainCategory').value) sub.disabled = false;
//             document.querySelectorAll('#form-general .punc-btn').forEach(b => b.disabled = !editable);
//         }
//     };
// })();

/* --- LongArticleHandler (長文題目) --- */
const LongArticleHandler = (function () {
    return {
        init: function () {
            // 定義長文專用的難度同步函式
            window.syncDifficultyL = function (val) {
                const select = document.getElementById('lDifficulty');
                if (select) select.value = val;
            };
        },
        clear: function () {
            // 1. 清空一般欄位
            ['lType', 'lDifficulty'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // 2. 清空隱藏欄位與預覽區 (內容、解析、標題)
            ['content', 'explanation', 'Topic'].forEach(key => {
                const hidden = document.getElementById(key === 'Topic' ? 'hidden-lTopic' : `hidden-l-${key}`);
                const preview = document.getElementById(`preview-l${key}`);
                if (hidden) hidden.value = '';
                if (preview) preview.innerHTML = '';
            });

            // 3. 清空附檔
            const file = document.getElementById('lAttachment');
            if (file) file.value = '';

            // 4. 重置 Radio (預設中)
            const defaultRadio = document.getElementById('lDiff2');
            if (defaultRadio) defaultRadio.checked = true;

            // ★ FIX: 重置 View Mode 鎖定狀態 (preview box inline style + Radio)
            document.querySelectorAll('#form-longarticle .editor-preview-box').forEach(el => {
                el.style.pointerEvents = 'auto';
                el.style.backgroundColor = '#fff';
                el.style.borderColor = '#dee2e6';
            });
            document.querySelectorAll('input[name="lDifficultyRadio"]').forEach(r => r.disabled = false);
        },
        fill: function (data, isViewMode) {
            // 1. 回填共用欄位 (Level)
            const elLevel = document.getElementById('commonLevel');
            if (elLevel) elLevel.value = data.level || '';

            // 2. 回填長文專屬欄位
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };
            setVal('lType', data.subType); // JSON 中儲存為 subType

            // lTopic 改為 editor box
            const hTopic = document.getElementById('hidden-lTopic');
            const pTopic = document.getElementById('preview-lTopic');
            if (hTopic && pTopic) {
                hTopic.value = data.topic || '';
                pTopic.innerHTML = data.topic ? decodeURIComponent(data.topic) : '';
            }

            // 3. 同步難度 Radio
            const diff = data.difficulty || '中';
            const radio = document.querySelector(`input[name="lDifficultyRadio"][value="${diff}"]`);
            if (radio) radio.checked = true;
            // 同步 hidden select
            const diffSelect = document.getElementById('lDifficulty');
            if (diffSelect) diffSelect.value = diff;

            // 4. 回填編輯器內容
            const setContent = (key, val) => {
                const hidden = document.getElementById(`hidden-l-${key}`);
                const preview = document.getElementById(`preview-l-${key}`);
                if (hidden && preview) {
                    const decoded = val ? decodeURIComponent(val) : '';
                    hidden.value = decoded; // 保持解碼後的值 (或根據您的後端需求保持編碼)
                    // 注意: 這裡 hidden.value 應該存編碼還是解碼視您 collect 的邏輯
                    // 根據 GeneralHandler，我們這裡存 decoded 到 value 似乎怪怪的？
                    // 修正：依照 collect 邏輯，這裡 hidden 應該存 "值"，preview 顯示 HTML
                    // 如果 data.content 是 URL Encoded 的，這裡解碼顯示
                    hidden.value = val || '';
                    preview.innerHTML = decoded;
                }
            };
            setContent('content', data.content);
            setContent('explanation', data.explanation);

            // 5. 處理 View Mode 鎖定
            const previews = document.querySelectorAll('#form-longarticle .editor-preview-box');
            previews.forEach(el => {
                if (isViewMode) {
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#f3f4f6';
                    el.style.borderColor = '#e5e7eb';
                } else {
                    el.style.pointerEvents = 'auto';
                    el.style.backgroundColor = '#fff';
                    el.style.borderColor = '#dee2e6';
                }
            });

            // 鎖定 Radio
            document.querySelectorAll('input[name="lDifficultyRadio"]').forEach(r => {
                r.disabled = isViewMode;
            });
            // 鎖定一般 Input (lTopic 已改為 editor box，由上方 previews 迴圈處理)
            // const lTopic = document.getElementById('lTopic');
            // if (lTopic) lTopic.disabled = isViewMode;
        },
        collect: function () {
            // 從 Radio 取得難度
            const diffRadio = document.querySelector('input[name="lDifficultyRadio"]:checked');

            return {
                mainCat: '長文題目',

                // 從共用欄位取得等級
                level: document.getElementById('commonLevel').value,

                subType: document.getElementById('lType').value,
                difficulty: diffRadio ? diffRadio.value : '中',
                topic: document.getElementById('hidden-lTopic').value,

                content: document.getElementById('hidden-l-content').value,
                explanation: document.getElementById('hidden-l-explanation').value,

                // 摘要使用標題 (去除 HTML 標籤)
                summary: (function () {
                    const t = document.getElementById('preview-lTopic').innerText.trim();
                    return t ? (t.substring(0, 20) + (t.length > 20 ? '...' : '')) : '未命名長文題目';
                })()
            };
        }
    };
})();

/* --- ListenHandler (聽力題目) --- */
const ListenHandler = (function () {
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
            if (card) {
                const icon = card.querySelector('.correct-mark');
                if (val === opt) {
                    card.classList.add('is-correct-answer');
                    if (icon) icon.classList.remove('d-none');
                } else {
                    card.classList.remove('is-correct-answer');
                    if (icon) icon.classList.add('d-none');
                }
            }
        });
        const d = document.getElementById('liCorrectAnswer');
        if (d) val ? d.classList.add('has-answer') : d.classList.remove('has-answer');
    }

    return {
        init: function () {
            // 綁定等級連動核心能力與指標
            const commonLvl = document.getElementById('commonLevel');
            if (commonLvl) {
                const updateCoreIndicator = () => {
                    // 只有在當前題型是「聽力題目」時才執行連動
                    const mType = document.getElementById('mType');
                    if (mType && mType.value !== '聽力題目') return;

                    const c = document.getElementById('liCore');
                    const i = document.getElementById('liIndicator');
                    const val = commonLvl.value; // 例如 "難度一"

                    if (!c || !i) return;

                    if (val && levelData[val]) {
                        // 直接帶入對應的第一個值
                        c.value = levelData[val].cores[0];
                        i.value = levelData[val].indicators[0];
                        // 更新顯示欄位
                        const display = document.getElementById('liCoreIndicatorDisplay');
                        if (display) {
                            const text = levelData[val].cores[0] + ' / ' + levelData[val].indicators[0];
                            display.value = text;
                            display.title = text; // Add tooltip for long text
                        }
                    } else {
                        // 若無選擇或無對應資料，顯示預設提示
                        c.value = '';
                        i.value = '';
                        const display = document.getElementById('liCoreIndicatorDisplay');
                        if (display) display.value = '請先選擇難度';
                    }
                };

                // 綁定事件
                commonLvl.addEventListener('change', updateCoreIndicator);

                // 初次載入時若已經是聽力題目，也要初始化
                // 但因為 ListenHandler.init 可能在 mType change 之前或之後，這裡暫不強制執行，
                // 而是依賴 mType change 時會觸發 updateCommonLevelOptions -> 進而可能連動
                // 或者我們可以公開一個 update 方法供外部調用
                // 簡單作法：將此函式掛載到 window 或實例上，以便切換題型時呼叫
                this.updateCoreIndicator = updateCoreIndicator;
            }

            // 綁定正確答案連動
            const ans = document.getElementById('liCorrectAnswer');
            if (ans) {
                const newAns = ans.cloneNode(true);
                ans.parentNode.replaceChild(newAns, ans);
                newAns.addEventListener('change', function () { updateCorrectAnswerDisplay(this.value); });
            }
        },
        clear: function () {
            // 清空 Sidebar Inputs
            ['liLevel', 'liCore', 'liIndicator', 'liVoiceType', 'liMaterial', 'liCorrectAnswer'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // 重置唯讀欄位
            const c = document.getElementById('liCore');
            const i = document.getElementById('liIndicator');
            const d = document.getElementById('liCoreIndicatorDisplay');
            if (c) c.value = '';
            if (i) i.value = '';
            if (d) d.value = '請先選擇難度';

            // 清空 Main Inputs
            // const topic = document.getElementById('liTopic');
            // if (topic) topic.value = '';

            const attach = document.getElementById('liAttachment');
            if (attach) attach.value = '';

            // 清空 Preview Boxes & Hidden Inputs
            ['listen-content', 'listen-optA', 'listen-optB', 'listen-optC', 'listen-optD', 'listen-explanation'].forEach(key => {
                const h = document.getElementById(`hidden-${key}`);
                const p = document.getElementById(`preview-${key}`);
                if (h) h.value = '';
                if (p) p.innerHTML = '';
            });
            // 清空 liTopic
            const hTopic = document.getElementById('hidden-liTopic');
            const pTopic = document.getElementById('preview-liTopic');
            if (hTopic) hTopic.value = '';
            if (pTopic) pTopic.innerHTML = '';

            // 清空選項附檔
            ['A', 'B', 'C', 'D'].forEach(opt => {
                const f = document.getElementById(`file-listen-opt${opt}`);
                if (f) f.value = '';
            });

            // 重置連動狀態
            // const core = document.getElementById('liCore');
            // const ind = document.getElementById('liIndicator');
            // if (core) { core.innerHTML = '<option value="">請先選擇難度</option>'; core.disabled = true; }
            // if (ind) { ind.innerHTML = '<option value="">請先選擇難度</option>'; ind.disabled = true; }

            updateCorrectAnswerDisplay('');

            // ★ FIX: 重置 View Mode 鎖定狀態 (preview box + inputs)
            this.toggleEditable(true);
        },
        fill: function (data, isViewMode) {
            // 回填 Level (使用 commonLevel) 並手動觸發連動
            // 注意：聽力題目使用的是上方的 commonLevel，但 init 綁定的是它
            // fill 執行時，commonLevel 可能已經由 updateCommonLevelOptions 設定好值了
            const lvl = document.getElementById('commonLevel');
            if (lvl) {
                lvl.value = data.level || '';
            }
            // 為了保險，我們手動執行一次 updateCoreIndicator 邏輯
            if (data.level && levelData[data.level]) {
                const c = document.getElementById('liCore');
                const i = document.getElementById('liIndicator');
                if (c) c.value = levelData[data.level].cores[0];
                if (i) i.value = levelData[data.level].indicators[0];
                if (c) c.value = levelData[data.level].cores[0];
                if (i) i.value = levelData[data.level].indicators[0];
                const display = document.getElementById('liCoreIndicatorDisplay');
                if (display && c && i) {
                    const text = c.value + ' / ' + i.value;
                    display.value = text;
                    display.title = text;
                }
            } else {
                // 如果沒有資料，試著從 saved data 回填 (以此為優先)
                const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
                setVal('liCore', data.core);
                setVal('liIndicator', data.indicator);

                // 手動組合顯示
                const display = document.getElementById('liCoreIndicatorDisplay');
                if (display) {
                    if (data.core || data.indicator) {
                        const text = (data.core || '') + ' / ' + (data.indicator || '');
                        display.value = text;
                        display.title = text;
                    } else {
                        display.value = '請先選擇難度';
                        display.title = '';
                    }
                }
            }

            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
            setVal('hidden-liTopic', data.topic); // 保留，但 liTopic 已經變 hidden，所以這行其實是設值給 hidden input，是正確的

            // 設定 preview
            const pTopic = document.getElementById('preview-liTopic');
            if (pTopic) pTopic.innerHTML = data.topic ? decodeURIComponent(data.topic) : '';
            setVal('liVoiceType', data.voiceType);
            setVal('liMaterial', data.material);
            setVal('liCorrectAnswer', data.ans);

            updateCorrectAnswerDisplay(data.ans || '');

            // 回填 Preview Boxes
            const fillBox = (key, val) => {
                const h = document.getElementById(`hidden-${key}`);
                const p = document.getElementById(`preview-${key}`);
                if (h && p) {
                    h.value = val || '';
                    p.innerHTML = val ? decodeURIComponent(val) : '';
                }
            };

            fillBox('listen-content', data.content);
            fillBox('listen-optA', data.optA);
            fillBox('listen-optB', data.optB);
            fillBox('listen-optC', data.optC);
            fillBox('listen-optD', data.optD);
            fillBox('listen-explanation', data.explanation);

            // 處理 View Mode (鎖定)
            const previews = document.querySelectorAll('#form-listen .editor-preview-box');
            previews.forEach(el => {
                if (isViewMode) {
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#f3f4f6';
                    el.style.borderColor = '#e5e7eb';
                } else {
                    el.style.pointerEvents = 'auto';
                    el.style.backgroundColor = '#fff';
                    el.style.borderColor = '#dee2e6';
                }
            });

            // 鎖定 Inputs
            const inputs = document.querySelectorAll('#form-listen input, #form-listen select');
            inputs.forEach(el => {
                // Core/Indicator 的鎖定狀態由 Level 決定，先不強制覆蓋
                if (el.id !== 'liCore' && el.id !== 'liIndicator' && el.id !== 'liCoreIndicatorDisplay') {
                    el.disabled = isViewMode;
                }
            });
            // 若是 View Mode，強制鎖定所有
            if (isViewMode) {
                inputs.forEach(el => el.disabled = true);
            }
        },
        collect: function () {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

            return {
                mainCat: '聽力題目', // 補上主類別方便辨識
                level: document.getElementById('commonLevel').value,
                core: getVal('liCore'),
                indicator: getVal('liIndicator'),
                voiceType: getVal('liVoiceType'),
                material: getVal('liMaterial'),
                topic: getVal('hidden-liTopic'), // liTopic 現在是 hidden input，取值正確


                content: getVal('hidden-listen-content'),
                optA: getVal('hidden-listen-optA'),
                optB: getVal('hidden-listen-optB'),
                optC: getVal('hidden-listen-optC'),
                optD: getVal('hidden-listen-optD'),
                ans: getVal('liCorrectAnswer'),
                explanation: getVal('hidden-listen-explanation'),

                summary: (function () {
                    const p = document.getElementById('preview-liTopic');
                    const t = p ? p.innerText.trim() : '';
                    return t ? (t.substring(0, 20) + (t.length > 20 ? '...' : '')) : '未命名聽力題目';
                })()
            };
        },
        toggleEditable: function (editable) {
            // Preview Boxes state
            const previews = document.querySelectorAll('#form-listen .editor-preview-box');
            previews.forEach(el => {
                if (!editable) {
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#f8f9fa';
                    el.style.borderColor = '#e9ecef';
                } else {
                    el.style.pointerEvents = 'auto';
                    el.style.backgroundColor = '#fff';
                    el.style.borderColor = '#dee2e6';
                }
            });

            document.querySelectorAll('#form-listen input, #form-listen select').forEach(el => {
                // 關鍵：只有不是 liCore 和 liIndicator 的欄位才根據 editable 開關
                // 且不包含 .readonly-field (雙重保險)
                if (el.id !== 'liCore' && el.id !== 'liIndicator' && el.id !== 'liCoreIndicatorDisplay' && !el.classList.contains('readonly-field')) {
                    el.disabled = !editable;
                }
            });
        }
    };
})();

/* --- ListenGroupHandler (聽力題組) --- */
const ListenGroupHandler = (function () {
    // 定義目前活動中的子題 ID
    let activeSubUid = null;
    // 定義兩題子題的固定規格
    const subConfigs = [
        {
            index: 0,
            title: "第一小題：難度三",
            level: "難度三",
            cores: ["推斷訊息"],
            indicators: ["推斷訊息邏輯性"]
        },
        {
            index: 1,
            title: "第二小題：難度四",
            level: "難度四",
            cores: ["歸納分析訊息"],
            indicators: ["歸納或總結訊息內容"]
        }
    ];

    // 更新子題選項卡片的正確答案標示 (綠色邊框)
    function updateSubCorrectAnswerDisplay(uid, selectedValue) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`lgOptCard-${uid}-${opt}`);
            if (card) {
                const mark = card.querySelector('.correct-mark');
                if (opt === selectedValue) {
                    card.classList.add('is-correct-answer');
                    if (mark) mark.classList.remove('d-none');
                } else {
                    card.classList.remove('is-correct-answer');
                    if (mark) mark.classList.add('d-none');
                }
            }
        });
        const dropdown = document.getElementById(`lg-ans-select-${uid}`);
        if (dropdown) {
            if (selectedValue) dropdown.classList.add('has-answer');
            else dropdown.classList.remove('has-answer');
        }
    }

    // 產生選項 HTML (改為 Preview Box + 附檔輸入框)
    // 改為與 ReadingHandler 相同的樣式結構
    function generateOptionHTML(uid, opt) {
        return `
        <div class="col-md-6">
            <div class="card option-card h-100 shadow-sm" id="lgOptCard-${uid}-${opt}">
                <div class="card-header py-1 px-2 bg-light border-bottom text-muted small fw-bold d-flex justify-content-between">
                    <span>選項 ${opt}</span><i class="bi bi-check-circle-fill text-success correct-mark d-none"></i>
                </div>
                <div class="editor-preview-box p-3 border-0 h-100" 
                        id="preview-${uid}-opt${opt}" 
                        data-field="${uid}-opt${opt}" 
                        data-placeholder="點擊輸入選項 ${opt}..."
                        onclick="openCommonEditor(this)"></div>
                <input type="hidden" id="hidden-${uid}-opt${opt}">
                <div class="card-footer p-1 bg-white border-top">
                    <input class="form-control form-control-sm border-0" type="file" id="file-${uid}-opt${opt}">
                </div>
            </div>
        </div>`;
    }

    return {
        init: function () {
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
                    <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center collapsed" 
                         data-bs-toggle="collapse" data-bs-target="#collapse-${uid}" aria-expanded="false" style="cursor:pointer">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-chevron-down accordion-arrow"></i>
                            <span class="fw-bold text-primary sub-index-label">子題代碼：${idx + 1} (${config.title})</span>
                            <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${uid}" title="內容完整"></i>
                        </div>
                    </div>
                    <div id="collapse-${uid}" class="collapse border border-top-0 rounded-bottom" data-bs-parent="#listengroup-sub-container">
                        <div class="card-body bg-light p-4">
                            <div class="row g-2 mb-3 p-3 bg-white border rounded">
                                <div class="col-md-12 mb-2">
                                     <span class="badge bg-info text-dark"><i class="bi bi-lock-fill me-1"></i>固定屬性</span>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-secondary">核心能力</label>
                                    <select class="form-select form-select-sm" id="lg-core-${uid}" disabled>
                                        ${config.cores.map(c => `<option value="${c}">${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-secondary">細目指標</label>
                                    <select class="form-select form-select-sm" id="lg-ind-${uid}" disabled>
                                        ${config.indicators.map(i => `<option value="${i}">${i}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-bold small text-secondary border-start border-4 border-primary ps-2 mb-2 required-star">子題題目</label>
                                <div class="editor-preview-box border rounded-3 p-3 mb-2" 
                                     id="preview-${uid}-content" 
                                     data-field="${uid}-content" 
                                     data-placeholder="點擊輸入子題題目..." 
                                     onclick="openCommonEditor(this)"></div>
                                <input type="hidden" id="hidden-${uid}-content">
                            </div>

                            <hr class="border-secondary opacity-10 my-3">

                            <div class="mb-4">
                                <label class="form-label fw-bold small text-secondary border-start border-4 border-primary ps-2 mb-3 required-star">選項與正確答案</label>
                                <div class="alert-hint">
                                    <i class="bi bi-exclamation-circle-fill"></i>
                                    請避免選項長短、語氣明顯差異，以免影響鑑別度
                                </div>

                                <div class="row g-3">
                                    ${['A', 'B', 'C', 'D'].map(opt => generateOptionHTML(uid, opt)).join('')}
                                </div>
                            </div>
                            
                            <select class="d-none" id="lg-ans-select-${uid}">
                                <option value="">請選擇...</option>
                                <option value="A">選項 A</option>
                                <option value="B">選項 B</option>
                                <option value="C">選項 C</option>
                                <option value="D">選項 D</option>
                            </select>

                            <div class="mt-3">
                                <label class="form-label fw-bold small text-secondary border-start border-4 border-secondary ps-2 mb-2">試題解析</label>
                                <div class="editor-preview-box border rounded-3 p-3 bg-white" 
                                     id="preview-${uid}-explanation" 
                                     data-field="${uid}-explanation" 
                                     data-placeholder="點擊輸入解析..." 
                                     onclick="openCommonEditor(this)"></div>
                                <input type="hidden" id="hidden-${uid}-explanation">
                            </div>
                        </div>
                    </div>`;
                container.appendChild(card);

                // 綁定 Accordion 展開事件
                const collapseEl = document.getElementById(`collapse-${uid}`);
                if (collapseEl) {
                    collapseEl.addEventListener('show.bs.collapse', () => {
                        this.setActiveSub(uid, idx + 1);
                    });
                }
            });

            // 預設展開第一題
            // setTimeout(() => this.setActiveSub('lgsub-0', 1), 100);

            // 監聽 Sidebar Answer 本身
            const sidebarAns = document.getElementById('lgSidebarAnswer');
            if (sidebarAns) {
                sidebarAns.addEventListener('change', function () {
                    if (activeSubUid) {
                        updateSubCorrectAnswerDisplay(activeSubUid, this.value);
                        // 同步回隱藏的 Select
                        const hiddenSelect = document.getElementById(`lg-ans-select-${activeSubUid}`);
                        if (hiddenSelect) hiddenSelect.value = this.value;
                    }
                });
            }
        },

        setActiveSub: function (uid, idx) {
            activeSubUid = uid;
            const badge = document.getElementById('lgSidebarSubLabel');
            const text = document.getElementById('lgSidebarSubText');
            const sidebarSelect = document.getElementById('lgSidebarAnswer');

            if (badge && text && sidebarSelect) {
                // Update badge visibility and text
                badge.style.display = 'inline-block';
                // Note: The text is now inside a span with id lgSidebarSubText
                text.innerText = `子題代碼：${idx}`;

                // 只有綁定子題後，才開啟選單
                sidebarSelect.disabled = false;

                // Sync value
                const ans = document.getElementById(`lg-ans-select-${uid}`).value;
                sidebarSelect.value = ans;
            }
        },

        // onSubAnswerChange: function (uid, val) {
        //     updateSubCorrectAnswerDisplay(uid, val);
        // },




        checkCompletion: function (uid) {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
            const hasContent = getVal(`hidden-${uid}-content`).length > 0;
            const ans = getVal(`lg-ans-select-${uid}`);
            let hasAllOptions = true;
            ['A', 'B', 'C', 'D'].forEach(opt => {
                if (getVal(`hidden-${uid}-opt${opt}`).length === 0) hasAllOptions = false;
            });

            const checkIcon = document.getElementById(`check-icon-${uid}`);
            if (checkIcon) {
                if (hasContent && ans && hasAllOptions) checkIcon.classList.remove('d-none');
                else checkIcon.classList.add('d-none');
            }
        },

        clear: function () {
            // 重置活動子題狀態
            activeSubUid = null;

            // 重置並鎖定 Sidebar 選單
            const sidebarSelect = document.getElementById('lgSidebarAnswer');
            const sidebarLabel = document.getElementById('lgSidebarSubLabel');
            if (sidebarSelect) {
                sidebarSelect.value = '';
                sidebarSelect.disabled = true; // 預設鎖定
            }
            if (sidebarLabel) sidebarLabel.style.display = 'none';

            // 清空主欄位
            ['lgLevel', 'lgVoiceType', 'lgMaterial', 'lgAttachment'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            // 清空主語音內容 Preview Box
            const hMain = document.getElementById('hidden-lg-content');
            const pMain = document.getElementById('preview-lg-content');
            if (hMain) hMain.value = '';
            if (pMain) pMain.innerHTML = '';

            // 清空子題
            subConfigs.forEach(conf => {
                const uid = `lgsub-${conf.index}`;

                // Clear Preview Boxes for Sub
                ['content', 'explanation', 'optA', 'optB', 'optC', 'optD'].forEach(key => {
                    const h = document.getElementById(`hidden-${uid}-${key}`);
                    const p = document.getElementById(`preview-${uid}-${key}`);
                    if (h) h.value = '';
                    if (p) p.innerHTML = '';
                });

                // Clear Sub File Inputs
                ['A', 'B', 'C', 'D'].forEach(opt => {
                    const f = document.getElementById(`file-${uid}-opt${opt}`);
                    if (f) f.value = '';
                });

                // Clear Answer
                const ans = document.getElementById(`lg-ans-select-${uid}`);
                if (ans) ans.value = '';
                updateSubCorrectAnswerDisplay(uid, '');
            });

            // 確保子題手風琴全部收起
            document.querySelectorAll('#listengroup-sub-container .collapse').forEach(el => {
                el.classList.remove('show');
            });

            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };

            setVal('lgLevel', data.level);
            setVal('lgVoiceType', data.voiceType);
            setVal('lgMaterial', data.material);

            // Main Content
            const hMain = document.getElementById('hidden-lg-content');
            const pMain = document.getElementById('preview-lg-content');
            if (hMain) hMain.value = data.content || '';
            if (pMain) pMain.innerHTML = data.content ? decodeURIComponent(data.content) : '';

            // Subs (假設 data.subs 是一個 array)
            if (data.subs && Array.isArray(data.subs)) {
                data.subs.forEach((subData, idx) => {
                    const uid = `lgsub-${idx}`; // 假設順序對應 0, 1

                    // Fill Preview Boxes
                    const fillBox = (key, val) => {
                        const h = document.getElementById(`hidden-${uid}-${key}`);
                        const p = document.getElementById(`preview-${uid}-${key}`);
                        if (h && p) {
                            h.value = val || '';
                            p.innerHTML = val ? decodeURIComponent(val) : '';
                        }
                    };
                    fillBox('content', subData.content);
                    fillBox('explanation', subData.explanation);
                    ['A', 'B', 'C', 'D'].forEach(opt => fillBox(`opt${opt}`, subData[`opt${opt}`]));

                    // Fill Answer
                    const ans = document.getElementById(`lg-ans-select-${uid}`);
                    if (ans) {
                        ans.value = subData.ans || '';
                        updateSubCorrectAnswerDisplay(uid, subData.ans || '');
                    }
                });
            }

            this.toggleEditable(!isViewMode);

            // Sync initial state to sidebar if exists
            setTimeout(() => {
                if (subConfigs.length > 0) this.setActiveSub(`lgsub-0`, 1);
            }, 200);
        },

        collect: function () {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

            const subs = subConfigs.map(conf => {
                const uid = `lgsub-${conf.index}`;
                return {
                    core: getVal(`lg-core-${uid}`),
                    indicator: getVal(`lg-ind-${uid}`),
                    content: getVal(`hidden-${uid}-content`),
                    explanation: getVal(`hidden-${uid}-explanation`),
                    ans: getVal(`lg-ans-select-${uid}`), // This hidden select is synced by sidebar
                    optA: getVal(`hidden-${uid}-optA`),
                    optB: getVal(`hidden-${uid}-optB`),
                    optC: getVal(`hidden-${uid}-optC`),
                    optD: getVal(`hidden-${uid}-optD`)
                };
            });

            return {
                level: getVal('lgLevel'),
                voiceType: getVal('lgVoiceType'),
                material: getVal('lgMaterial'),
                content: getVal('hidden-lg-content'),
                summary: '聽力題組...', // 示意
                subs: subs
            };
        },

        toggleEditable: function (editable) {
            // 處理 main form inputs
            document.querySelectorAll('#form-listengroup > .section-card input, #form-listengroup > .section-card select').forEach(el => {
                if (!el.classList.contains('readonly-field')) el.disabled = !editable;
            });

            // 處理 dynamic subquestion inputs
            document.querySelectorAll('#listengroup-sub-container input, #listengroup-sub-container select').forEach(el => {
                if (!el.id.startsWith('lg-core-') && !el.id.startsWith('lg-ind-')) {
                    el.disabled = !editable;
                }
            });

            // Handle All Preview Boxes in this form
            const previews = document.querySelectorAll('#form-listengroup .editor-preview-box');
            previews.forEach(el => {
                if (!editable) {
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#f8f9fa';
                    el.style.borderColor = '#e9ecef';
                } else {
                    el.style.pointerEvents = 'auto';
                    el.style.backgroundColor = '#fff';
                    el.style.borderColor = '#dee2e6';
                }
            });
            // 處理 Sidebar 選單的鎖定狀態
            const sidebarSelect = document.getElementById('lgSidebarAnswer');
            if (sidebarSelect) {
                if (!editable) {
                    sidebarSelect.disabled = true; // 檢視模式全鎖
                } else {
                    // 編輯模式下，只有當有選中子題時才開啟
                    sidebarSelect.disabled = (activeSubUid === null);
                }
            }
        }
    };
})();

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

/* --- ReadingHandler (閱讀題組) --- */
const ReadingHandler = (function () {
    const generateId = () => 'rsub_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    let displaySequence = 0;

    // ★ 記錄目前「展開中」的子題 ID (用於 Sidebar 連動)
    let activeSubUid = null;

    // 難度同步
    window.syncDifficultyR = function (val) {
        const select = document.getElementById('rDifficulty');
        if (select) select.value = val;
    };

    // ★ 更新子題 UI (綠色邊框) + 同步 Sidebar
    // 參數 fromSidebar: 避免無窮迴圈 (如果是 Sidebar 觸發的，就不需要再回寫 Sidebar)
    function updateSubCorrectAnswerDisplay(uid, selectedValue, fromSidebar = false) {
        // 1. 更新右側選項卡片樣式
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`optCard-${uid}-${opt}`);
            if (card) {
                const mark = card.querySelector('.correct-mark');
                if (opt === selectedValue) {
                    card.classList.add('is-correct-answer');
                    if (mark) mark.classList.remove('d-none');
                } else {
                    card.classList.remove('is-correct-answer');
                    if (mark) mark.classList.add('d-none');
                }
            }
        });

        // 2. 更新右側子題內部的隱藏 Select (如果有的話，保持資料一致)
        const subSelect = document.getElementById(`ans-${uid}`);
        if (subSelect && subSelect.value !== selectedValue) {
            subSelect.value = selectedValue;
        }

        // 3. ★ 如果此題是「當前展開」的題目，且不是 Sidebar 觸發的，則同步更新 Sidebar
        if (activeSubUid === uid && !fromSidebar) {
            const sidebarSelect = document.getElementById('rSidebarAnswer');
            if (sidebarSelect) sidebarSelect.value = selectedValue;
        }
    }

    // 檢查子題完成狀態
    function checkSubCompletion(id) {
        const getVal = (fieldId) => {
            const el = document.getElementById(fieldId);
            return el && el.value.trim().length > 0;
        };
        const hasContent = getVal(`hidden-${id}_content`);
        const hasAllOpts = ['A', 'B', 'C', 'D'].every(opt => getVal(`hidden-${id}_opt${opt}`));
        const ans = document.getElementById(`ans-${id}`).value;
        const checkIcon = document.getElementById(`check-icon-${id}`);

        if (checkIcon) {
            if (hasContent && hasAllOpts && ans) checkIcon.classList.remove('d-none');
            else checkIcon.classList.add('d-none');
        }
    }

    return {
        init: function () {
            window.syncDifficultyR = (val) => {
                const select = document.getElementById('rDifficulty');
                if (select) select.value = val;
            };

            const addBtn = document.getElementById('btn-add-reading-sub');
            if (addBtn) {
                const newBtn = addBtn.cloneNode(true);
                addBtn.replaceWith(newBtn);
                newBtn.addEventListener('click', () => this.addSubQuestion(null, false));
            }
            window.Reading_RemoveSub = (id) => this.removeSub(id);

            // 綁定 Sidebar 下拉選單事件
            const sidebarAns = document.getElementById('rSidebarAnswer');
            if (sidebarAns) {
                sidebarAns.addEventListener('change', function () {
                    if (activeSubUid) {
                        // 將 Sidebar 的值寫入當前子題
                        updateSubCorrectAnswerDisplay(activeSubUid, this.value, true);
                        checkSubCompletion(activeSubUid);
                    }
                });
            }
        },

        addSubQuestion: function (data = null, isOpen = false) {
            const container = document.getElementById('reading-sub-container');
            const id = generateId();
            displaySequence++;

            // 產生 HTML
            container.insertAdjacentHTML('beforeend', this.createSubQuestionHTML(id, displaySequence, data || {}, isOpen));

            // --- 事件綁定 ---

            // 1. 內部 Select 變更 (雙向綁定)
            const ansSelect = document.getElementById(`ans-${id}`);
            if (ansSelect) {
                ansSelect.addEventListener('change', function () {
                    updateSubCorrectAnswerDisplay(id, this.value);
                    checkSubCompletion(id);
                });
                if (data && data.ans) {
                    updateSubCorrectAnswerDisplay(id, data.ans);
                }
            }

            // 2. 監聽 Preview Box 變化
            ['content', 'optA', 'optB', 'optC', 'optD', 'explanation'].forEach(key => {
                const box = document.getElementById(`preview-${id}_${key}`);
                if (box) {
                    const observer = new MutationObserver(() => checkSubCompletion(id));
                    observer.observe(box, { childList: true, subtree: true, characterData: true });
                }
            });

            // 3. ★★★ 關鍵：監聽 Accordion 展開事件，切換 Sidebar 綁定 ★★★
            const collapseEl = document.getElementById(`collapse-${id}`);
            if (collapseEl) {
                collapseEl.addEventListener('show.bs.collapse', () => {
                    this.setActiveSub(id, displaySequence);
                });

                // 如果初始化時就是展開的 (新增時)，手動觸發一次設定
                if (isOpen) {
                    setTimeout(() => this.setActiveSub(id, displaySequence), 100); // 延遲確保 DOM 生成
                }
            }

            this.checkEmptyState();
            checkSubCompletion(id);
        },

        // ★ 設定當前活動子題 (綁定 Sidebar)
        setActiveSub: function (id) {
            activeSubUid = id;

            // 1. 更新 Sidebar 標籤顯示
            const badge = document.getElementById('rSidebarSubLabel');
            const text = document.getElementById('rSidebarSubText');
            const sidebarSelect = document.getElementById('rSidebarAnswer');

            if (badge && text && sidebarSelect) {
                badge.style.display = 'inline-block';
                // 這裡我們需要重新獲取正確的序號，因為刪除中間項目會導致 seqNum 不連續
                // 簡單作法：直接查找該卡片在容器中的 index + 1
                const allCards = document.querySelectorAll('#reading-sub-container .sub-question-card');
                let realIndex = Array.from(allCards).findIndex(c => c.id === `card-${id}`) + 1;

                text.innerText = `子題代碼：${realIndex}`;
                sidebarSelect.disabled = false;

                // 2. 讀取該子題目前的答案，回填 Sidebar
                const subAns = document.getElementById(`ans-${id}`).value;
                sidebarSelect.value = subAns;
            }
        },

        // HTML 產生器 (獨立出來比較整潔)
        createSubQuestionHTML: function (id, seqNum, data, isOpen) {
            const buildStandardField = (fieldKey, placeholder, label = '', showAttachment = false) => {
                const uniqueFieldId = `${id}_${fieldKey}`;
                const valDecoded = data[fieldKey] ? decodeURIComponent(data[fieldKey]) : '';
                return `
                    <div class="mb-3">
                        ${label ? `<label class="form-label fw-bold small text-secondary border-start border-4 border-primary ps-2 mb-2 required-star">${label}</label>` : ''}                    
                        <div class="editor-preview-box border rounded-top-3 p-3 bg-white" 
                                id="preview-${uniqueFieldId}" data-field="${uniqueFieldId}" data-placeholder="${placeholder}" onclick="openCommonEditor(this)">${valDecoded}</div>
                        <input type="hidden" id="hidden-${uniqueFieldId}" value="${data[fieldKey] || ''}">                    
                        ${showAttachment ? `<div class="attachment-wrapper p-2 border rounded bg-light d-flex align-items-center gap-2">
                            <label class="small fw-bold text-muted text-nowrap">附檔 (圖片)</label><input class="form-control form-control-sm" type="file" id="file-${uniqueFieldId}"></div>` : ''}
                    </div>`;
            };

            const buildOptionCard = (optLabel, fieldKey) => {
                const uniqueFieldId = `${id}_${fieldKey}`;
                const valDecoded = data[fieldKey] ? decodeURIComponent(data[fieldKey]) : '';
                return `
                    <div class="col-md-6">
                        <div class="card option-card h-100 shadow-sm" id="optCard-${id}-${optLabel}" data-option="${optLabel}">
                            <div class="card-header py-1 px-2 bg-light border-bottom text-muted small fw-bold d-flex justify-content-between">
                                <span>選項 ${optLabel}</span><i class="bi bi-check-circle-fill text-success correct-mark d-none"></i>
                            </div>
                            <div class="editor-preview-box p-3 border-0 h-100" id="preview-${uniqueFieldId}" data-field="${uniqueFieldId}" data-placeholder="點擊輸入選項 ${optLabel}..." onclick="openCommonEditor(this)">${valDecoded}</div>
                            <input type="hidden" id="hidden-${uniqueFieldId}" value="${data[fieldKey] || ''}">
                            <div class="card-footer p-1 bg-white border-top"><input class="form-control form-control-sm border-0" type="file" id="file-${uniqueFieldId}"></div>
                        </div>
                    </div>`;
            };

            return `
                <div class="card mb-3 sub-question-card border-0 shadow-sm" id="card-${id}">
                    <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center ${isOpen ? '' : 'collapsed'}"
                         data-bs-toggle="collapse" data-bs-target="#collapse-${id}" aria-expanded="${isOpen}" style="cursor:pointer">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-chevron-down accordion-arrow"></i>
                            <span class="fw-bold text-primary sub-index-label">子題代碼：${seqNum}</span>
                            <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${id}" title="已完成"></i>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger border-0 sub-remove-btn" onclick="event.stopPropagation(); Reading_RemoveSub('${id}')"><i class="bi bi-trash"></i></button>
                    </div>

                    <div id="collapse-${id}" class="collapse ${isOpen ? 'show' : ''} border border-top-0 rounded-bottom" data-bs-parent="#reading-sub-container">
                        <div class="card-body bg-light p-4">
                            ${buildStandardField('content', '點擊輸入子題題目...', '題目內容', true)}
                            <hr class="border-secondary opacity-10 my-3">
                            <div class="mb-4">
                                <label class="form-label fw-bold small text-secondary border-start border-4 border-primary ps-2 mb-3 required-star">選項與正確答案</label>
                                <div class="alert-hint">
                                    <i class="bi bi-exclamation-circle-fill"></i>
                                    請避免選項長短、語氣明顯差異，以免影響鑑別度
                                </div>
                                <div class="row g-3">
                                    ${buildOptionCard('A', 'optA')} ${buildOptionCard('B', 'optB')}
                                    ${buildOptionCard('C', 'optC')} ${buildOptionCard('D', 'optD')}
                                </div>
                                <select class="d-none" id="ans-${id}">
                                    <option value="">請選擇...</option>
                                    <option value="A" ${data.ans === 'A' ? 'selected' : ''}>A</option>
                                    <option value="B" ${data.ans === 'B' ? 'selected' : ''}>B</option>
                                    <option value="C" ${data.ans === 'C' ? 'selected' : ''}>C</option>
                                    <option value="D" ${data.ans === 'D' ? 'selected' : ''}>D</option>
                                </select>
                            </div>
                            <hr class="border-secondary opacity-10 my-3">
                            <div class="mb-2">
                                <label class="form-label fw-bold small text-secondary border-start border-4 border-secondary ps-2 mb-2">試題解析 (紀錄答案理由)</label>
                                <div class="editor-preview-box border rounded-3 p-3 bg-white" id="preview-${id}_explanation" data-field="${id}_explanation" data-placeholder="請簡要說明正確答案的判斷依據，並簡述其他選項錯誤原因..." onclick="openCommonEditor(this)">${data.explanation ? decodeURIComponent(data.explanation) : ''}</div>
                                <input type="hidden" id="hidden-${id}_explanation" value="${data.explanation || ''}">
                            </div>
                        </div>
                    </div>
                </div>`;
        },

        removeSub: function (id) {
            Swal.fire({
                title: '確定刪除此子題？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '刪除'
            }).then((result) => {
                if (result.isConfirmed) {
                    const el = document.getElementById(`card-${id}`);
                    if (el) el.remove();

                    // 移除後若該題是當前活動題，重置 Sidebar
                    if (activeSubUid === id) {
                        activeSubUid = null;
                        document.getElementById('rSidebarAnswer').value = '';
                        document.getElementById('rSidebarAnswer').disabled = true;
                        document.getElementById('rSidebarSubLabel').style.display = 'none';
                    }
                    this.checkEmptyState();
                    // 重新計算編號顯示 (Optional)
                    document.querySelectorAll('#reading-sub-container .sub-index-label').forEach((el, idx) => el.innerText = `子題 ${idx + 1}`);
                }
            });
        },

        checkEmptyState: function () {
            const container = document.getElementById('reading-sub-container');
            const emptyMsg = document.getElementById('reading-sub-empty');
            if (container && emptyMsg) emptyMsg.style.display = container.children.length === 0 ? 'block' : 'none';
        },

        clear: function () {
            ['rDifficulty', 'rGenre'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            ['rTopic', 'rArticle'].forEach(k => {
                document.getElementById(`hidden-${k}`).value = '';
                document.getElementById(`preview-${k}`).innerHTML = '';
            });
            document.getElementById('file-rArticle').value = '';

            document.getElementById('reading-sub-container').innerHTML = '';
            displaySequence = 0;

            // 重置活動子題狀態
            activeSubUid = null;

            // 重置並鎖定 Sidebar
            const sidebarSelect = document.getElementById('rSidebarAnswer');
            const sidebarLabel = document.getElementById('rSidebarSubLabel');

            if (sidebarSelect) {
                sidebarSelect.value = '';
                sidebarSelect.disabled = true; // 確保清空後鎖定
            }
            if (sidebarLabel) {
                sidebarLabel.style.display = 'none';
            }

            const defaultRadio = document.getElementById('rDiff2'); if (defaultRadio) defaultRadio.checked = true;
            this.checkEmptyState();

            // ★ FIX: 重置 View Mode 鎖定狀態 (preview box + inputs + radio)
            document.querySelectorAll('#form-reading .editor-preview-box').forEach(el => {
                el.style.pointerEvents = 'auto';
                el.style.backgroundColor = '#fff';
                el.style.borderColor = '#dee2e6';
            });
            document.querySelectorAll('input[name="rDifficultyRadio"]').forEach(r => r.disabled = false);
            document.querySelectorAll('#form-reading input:not(.readonly-field), #form-reading select').forEach(el => el.disabled = false);
        },

        fill: function (data, isViewMode) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('rGenre', data.genre);

            const diff = data.difficulty || '中';
            const radio = document.querySelector(`input[name="rDifficultyRadio"][value="${diff}"]`);
            if (radio) radio.checked = true;
            const diffSelect = document.getElementById('rDifficulty');
            if (diffSelect) diffSelect.value = diff;

            // 回填母題
            const hTopic = document.getElementById('hidden-rTopic');
            const pTopic = document.getElementById('preview-rTopic');
            if (hTopic && pTopic) {
                hTopic.value = data.topic || '';
                pTopic.innerHTML = data.topic ? decodeURIComponent(data.topic) : '';
            }

            const hMain = document.getElementById('hidden-rArticle');
            const pMain = document.getElementById('preview-rArticle');
            if (hMain && pMain) {
                hMain.value = data.article || '';
                pMain.innerHTML = data.article ? decodeURIComponent(data.article) : '';
            }

            // 回填子題
            const container = document.getElementById('reading-sub-container');
            container.innerHTML = '';
            displaySequence = 0;

            if (data.subQuestions && Array.isArray(data.subQuestions)) {
                // 回填時也預設收起
                data.subQuestions.forEach(q => this.addSubQuestion(q, false));
            }

            this.checkEmptyState();
            this.toggleEditable(!isViewMode);
        },

        collect: function () {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
            const diffRadio = document.querySelector('input[name="rDifficultyRadio"]:checked');

            const result = {
                mainCat: '文義判讀',
                subCat: '閱讀題組',
                level: document.getElementById('commonLevel').value,
                difficulty: diffRadio ? diffRadio.value : '中',
                genre: document.getElementById('rGenre').value,
                topic: getVal('hidden-rTopic'),
                article: getVal('hidden-rArticle'),
                summary: (function () {
                    const el = document.getElementById('preview-rTopic');
                    const text = el ? el.innerText.trim() : '';
                    return text ? (text.substring(0, 20) + (text.length > 20 ? '...' : '')) : '未命名閱讀題組';
                })(),
                subQuestions: []
            };

            document.querySelectorAll('#reading-sub-container .sub-question-card').forEach(card => {
                const id = card.id.replace('card-', '');
                result.subQuestions.push({
                    content: getVal(`hidden-${id}_content`),
                    optA: getVal(`hidden-${id}_optA`),
                    optB: getVal(`hidden-${id}_optB`),
                    optC: getVal(`hidden-${id}_optC`),
                    optD: getVal(`hidden-${id}_optD`),
                    ans: document.getElementById(`ans-${id}`).value,
                    explanation: getVal(`hidden-${id}_explanation`)
                });
            });

            return result;
        },

        toggleEditable: function (editable) {
            const addBtn = document.getElementById('btn-add-reading-sub');
            if (addBtn) addBtn.hidden = !editable;

            document.querySelectorAll('#reading-sub-container .sub-remove-btn').forEach(btn => btn.hidden = !editable);
            document.querySelectorAll('input[name="rDifficultyRadio"]').forEach(r => r.disabled = !editable);

            const inputs = document.querySelectorAll('#form-reading input:not(.readonly-field):not([type=radio]), #form-reading select');
            inputs.forEach(el => el.disabled = !editable);

            const previews = document.querySelectorAll('#form-reading .editor-preview-box');
            previews.forEach(el => {
                if (!editable) {
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#f3f4f6';
                    el.style.borderColor = '#e5e7eb';
                } else {
                    el.style.pointerEvents = 'auto';
                    el.style.backgroundColor = '#fff';
                    el.style.borderColor = '#dee2e6';
                }
            });
            // 額外鎖定 Sidebar
            const sidebarAns = document.getElementById('rSidebarAnswer');
            if (sidebarAns && !editable) sidebarAns.disabled = true;
            else if (sidebarAns && editable && activeSubUid) sidebarAns.disabled = false; // 只有在編輯模式且有選中子題時才開啟
        }
    };
})();

/* --- ShortArticleHandler (短文題組) --- */
const ShortArticleHandler = (function () {
    const generateId = () => 'ssub_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    // ★ 定義顯示用的題號計數器 (只增不減)
    let displaySequence = 0;

    // ★ Short Article Dimension Data
    const dimensionData = {
        "條列敘述": [
            "1-1 條列敘述人、事、物特徵與特質",
            "1-2 條列敘述人、事、物起始原因、發生情況、結論等時空先後順序",
            "1-3 條列敘述人、事、物的差異"
        ],
        "歸納統整": [
            "2-1 歸納作者主張",
            "2-2 歸納文章主旨",
            "2-3 歸納共同特點"
        ],
        "分析推理": [
            "3-1 分析線索",
            "3-2 推論緣由",
            "3-3 判斷結果",
            "3-4 判斷詞性、主語",
            "3-5 判斷字句的解釋、文意說明是否正確",
            "3-6 推測行為的原因或用意、說明如何達成行為",
            "3-7 推測寫作手法的目的",
            "3-8 判斷文體、格律、風格"
        ]
    };

    // ★ 檢查子題完成狀態 (僅檢查題目內容)
    function checkSubCompletion(id) {
        // 1. 檢查題目是否有內容
        const contentEl = document.getElementById(`hidden-${id}_content`);
        const hasContent = contentEl && contentEl.value.trim().length > 0;

        // 2. 顯示綠色勾勾
        const checkIcon = document.getElementById(`check-icon-${id}`);
        if (checkIcon) {
            if (hasContent) {
                checkIcon.classList.remove('d-none');
            } else {
                checkIcon.classList.add('d-none');
            }
        }
    }

    // 產生子題 HTML
    const createSubQuestionHTML = (id, seqNum, data = {}, isOpen = false) => {
        // 預設 isOpen = false (收起)

        const contentVal = data.content ? decodeURIComponent(data.content) : '';
        const contentHidden = data.content || '';

        const explanationVal = data.explanation ? decodeURIComponent(data.explanation) : '';
        const explanationHidden = data.explanation || '';

        // Generate options for Main Dimension
        const dimOptions = ['<option value="">請選擇...</option>'];
        for (const dim in dimensionData) {
            const selected = (data.dimension === dim) ? 'selected' : '';
            dimOptions.push(`<option value="${dim}" ${selected}>${dim}</option>`);
        }

        // Generate options for Capability Indicator (if dimension exists)
        const indOptions = ['<option value="">請先選擇主向度</option>'];
        if (data.dimension && dimensionData[data.dimension]) {
            dimensionData[data.dimension].forEach(ind => {
                const selected = (data.indicator === ind) ? 'selected' : '';
                indOptions.push(`<option value="${ind}" ${selected}>${ind}</option>`);
            });
        }

        return `
            <div class="card mb-3 sub-question-card border-0 shadow-sm" id="card-${id}">
                <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center ${isOpen ? '' : 'collapsed'}"
                     data-bs-toggle="collapse" data-bs-target="#collapse-${id}" aria-expanded="${isOpen}" style="cursor:pointer">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-chevron-down accordion-arrow"></i>
                        <span class="fw-bold text-primary sub-index-label">子題代碼：${seqNum}</span>
                        <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${id}" title="內容已填寫"></i>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger border-0 sub-remove-btn" onclick="event.stopPropagation(); ShortArticle_RemoveSub('${id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>

                <div id="collapse-${id}" class="collapse ${isOpen ? 'show' : ''} border border-top-0 rounded-bottom" data-bs-parent="#s-sub-questions-container">
                    <div class="card-body bg-light p-4">
                        
                        <!-- New Dimension and Indicator Fields -->
                        <div class="row g-2 mb-3 p-3 bg-white border rounded">
                             <div class="col-md-6">
                                <label class="form-label small fw-bold text-secondary required-star">主向度</label>
                                <select class="form-select form-select-sm" id="s-sub-dimension-${id}" onchange="ShortArticleHandler.onDimensionChange('${id}', this.value)">
                                    ${dimOptions.join('')}
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-secondary required-star">能力指標</label>
                                <select class="form-select form-select-sm" id="s-sub-indicator-${id}" ${data.dimension ? '' : 'disabled'}>
                                    ${indOptions.join('')}
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary border-start border-4 border-primary ps-2 mb-2 required-star">題目內容</label>
                            <div class="editor-preview-box border rounded-top-3 p-3" 
                                    id="preview-${id}_content" 
                                    data-field="${id}_content" 
                                    data-placeholder="點擊輸入子題題目..."
                                    onclick="openCommonEditor(this)">${contentVal}</div>
                            <input type="hidden" id="hidden-${id}_content" value="${contentHidden}">
                            
                            <div class="attachment-wrapper p-2 border rounded bg-light d-flex align-items-center gap-2">
                                <label class="small fw-bold text-muted text-nowrap">附檔 (圖片)</label>
                                <input class="form-control form-control-sm" type="file" id="file-${id}_content">
                            </div>
                        </div>

                        <hr class="border-secondary opacity-10 my-3">

                        <div class="mb-2">
                             <label class="form-label fw-bold small text-secondary border-start border-4 border-secondary ps-2 mb-2">試題解析 (批說)</label>
                            <div class="editor-preview-box border rounded-3 p-3 bg-white" 
                                    id="preview-${id}_explanation" 
                                    data-field="${id}_explanation" 
                                    data-placeholder="請簡要說明短文子題解析..."
                                    onclick="openCommonEditor(this)">${explanationVal}</div>
                            <input type="hidden" id="hidden-${id}_explanation" value="${explanationHidden}">
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    return {
        init: function () {
            window.syncDifficultyS = function (val) {
                const select = document.getElementById('sDifficulty');
                if (select) select.value = val;
            };

            const addBtn = document.getElementById('btn-add-s-sub');
            if (addBtn) {
                const newBtn = addBtn.cloneNode(true);
                addBtn.replaceWith(newBtn);
                newBtn.addEventListener('click', () => {
                    this.addSubQuestion(null, false); // ★ 新增時設定為 false (收起)
                });
            }
            window.ShortArticle_RemoveSub = (id) => this.removeSub(id);
        },

        addSubQuestion: function (data = null, isOpen = false) {
            const container = document.getElementById('s-sub-questions-container');
            const id = generateId();

            displaySequence++;
            // 傳入 isOpen 參數控制展開狀態
            container.insertAdjacentHTML('beforeend', createSubQuestionHTML(id, displaySequence, data || {}, isOpen));

            // 監聽 Preview Box 變化
            ['content', 'explanation'].forEach(key => {
                const box = document.getElementById(`preview-${id}_${key}`);
                if (box) {
                    const observer = new MutationObserver(() => checkSubCompletion(id));
                    observer.observe(box, { childList: true, subtree: true, characterData: true });
                }
            });

            this.checkEmptyState();
            checkSubCompletion(id);
        },

        removeSub: function (id) {
            Swal.fire({
                title: '確定刪除此子題？',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: '刪除',
                cancelButtonText: '取消'
            }).then((result) => {
                if (result.isConfirmed) {
                    const el = document.getElementById(`card-${id}`);
                    if (el) el.remove();
                    this.checkEmptyState();
                }
            });
        },

        checkEmptyState: function () {
            const container = document.getElementById('s-sub-questions-container');
            const emptyMsg = document.getElementById('short-sub-empty');
            if (container && emptyMsg) {
                emptyMsg.style.display = container.children.length === 0 ? 'block' : 'none';
            }
        },

        clear: function () {
            // 清除左側
            ['sDifficulty', 'sGenre'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });

            // 清空母題
            const hTopic = document.getElementById('hidden-sTopic');
            const pTopic = document.getElementById('preview-sTopic');
            if (hTopic) hTopic.value = '';
            if (pTopic) pTopic.innerHTML = '';

            const hMain = document.getElementById('hidden-s-article');
            const pMain = document.getElementById('preview-s-article');
            if (hMain) hMain.value = '';
            if (pMain) pMain.innerHTML = '';

            const fMain = document.getElementById('file-s-article');
            if (fMain) fMain.value = '';

            // 清空子題
            document.getElementById('s-sub-questions-container').innerHTML = '';

            // 重置 Radio (預設中)
            const defaultRadio = document.getElementById('sDiff2');
            if (defaultRadio) defaultRadio.checked = true;

            displaySequence = 0;
            this.checkEmptyState();

            // ★ FIX: 重置 View Mode 鎖定狀態 (preview box + inputs + radio)
            document.querySelectorAll('#form-shortarticle .editor-preview-box').forEach(el => {
                el.style.pointerEvents = 'auto';
                el.style.backgroundColor = '#fff';
                el.style.borderColor = '#dee2e6';
            });
            document.querySelectorAll('input[name="sDifficultyRadio"]').forEach(r => r.disabled = false);
            document.querySelectorAll('#form-shortarticle input:not(.readonly-field), #form-shortarticle select').forEach(el => el.disabled = false);
        },

        fill: function (data, isViewMode) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('sGenre', data.genre);

            const diff = data.difficulty || '中';
            const radio = document.querySelector(`input[name="sDifficultyRadio"][value="${diff}"]`);
            if (radio) radio.checked = true;
            const diffSelect = document.getElementById('sDifficulty');
            if (diffSelect) diffSelect.value = diff;

            // 回填母題
            const hTopic = document.getElementById('hidden-sTopic');
            const pTopic = document.getElementById('preview-sTopic');
            if (hTopic && pTopic) {
                hTopic.value = data.topic || '';
                pTopic.innerHTML = data.topic ? decodeURIComponent(data.topic) : '';
            }

            const hMain = document.getElementById('hidden-s-article');
            const pMain = document.getElementById('preview-s-article');
            if (hMain && pMain) {
                hMain.value = data.article || '';
                pMain.innerHTML = data.article ? decodeURIComponent(data.article) : '';
            }

            // 回填子題
            const container = document.getElementById('s-sub-questions-container');
            container.innerHTML = '';
            displaySequence = 0;

            if (data.questions && Array.isArray(data.questions)) {
                // 回填時也預設收起 (false)
                data.questions.forEach(q => this.addSubQuestion(q, false));
            }

            this.checkEmptyState();
            this.toggleEditable(!isViewMode);
        },

        collect: function () {
            const getVal = (id) => {
                const el = document.getElementById(id);
                return el ? el.value : '';
            };
            const diffRadio = document.querySelector('input[name="sDifficultyRadio"]:checked');

            const result = {
                mainCat: '文義判讀',
                subCat: '篇章辨析',
                level: document.getElementById('commonLevel').value, // 從頂部共用區取值
                difficulty: diffRadio ? diffRadio.value : '中',
                genre: document.getElementById('sGenre').value,
                topic: getVal('hidden-sTopic'),
                article: getVal('hidden-s-article'),
                summary: (function () {
                    const el = document.getElementById('preview-sTopic');
                    const text = el ? el.innerText.trim() : '';
                    return text ? (text.substring(0, 20) + (text.length > 20 ? '...' : '')) : '未命名短文題組';
                })(),
                questions: []
            };

            document.querySelectorAll('#s-sub-questions-container .sub-question-card').forEach((card, index) => {
                const id = card.id.replace('card-', '');
                // Add new dimension and indicator to result
                const dim = document.getElementById(`s-sub-dimension-${id}`);
                const ind = document.getElementById(`s-sub-indicator-${id}`);

                result.questions.push({
                    id: id,
                    seqNum: index + 1,
                    content: getVal(`hidden-${id}_content`),
                    explanation: getVal(`hidden-${id}_explanation`),
                    dimension: dim ? dim.value : '',
                    indicator: ind ? ind.value : ''
                    // ★ 移除 optA, ans 等不必要欄位
                });
            });

            return result;
        },

        // Helper for dimension change
        onDimensionChange: function (id, val) {
            const indSelect = document.getElementById(`s-sub-indicator-${id}`);
            if (!indSelect) return;

            indSelect.innerHTML = '<option value="">請選擇...</option>';
            if (val && dimensionData[val]) {
                indSelect.disabled = false;
                dimensionData[val].forEach(ind => {
                    const opt = document.createElement('option');
                    opt.value = ind;
                    opt.text = ind;
                    indSelect.appendChild(opt);
                });
            } else {
                indSelect.disabled = true;
                indSelect.innerHTML = '<option value="">請先選擇主向度</option>';
            }
        },

        toggleEditable: function (editable) {
            const addBtn = document.getElementById('btn-add-s-sub');
            if (addBtn) addBtn.hidden = !editable;

            document.querySelectorAll('#s-sub-questions-container .sub-remove-btn').forEach(btn => btn.hidden = !editable);
            document.querySelectorAll('input[name="sDifficultyRadio"]').forEach(r => r.disabled = !editable);

            const inputs = document.querySelectorAll('#form-shortarticle input:not(.readonly-field):not([type=radio]), #form-shortarticle select');
            inputs.forEach(el => el.disabled = !editable);

            const previews = document.querySelectorAll('#form-shortarticle .editor-preview-box');
            previews.forEach(el => {
                if (!editable) {
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#f3f4f6';
                    el.style.borderColor = '#e5e7eb';
                } else {
                    el.style.pointerEvents = 'auto';
                    el.style.backgroundColor = '#fff';
                    el.style.borderColor = '#dee2e6';
                }
            });
        }
    };
})();

// 題型對照表 (Manager)
const TypeHandlers = {
    '一般題目': GeneralHandler, '精選題目': GeneralHandler, '閱讀題組': ReadingHandler,
    '長文題目': LongArticleHandler, '短文題組': ShortArticleHandler,
    '聽力題目': ListenHandler, '聽力題組': ListenGroupHandler
};

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
    Object.values(TypeHandlers).forEach(h => { if (h && h.clear) h.clear(); });

    if (mode === 'create') {
        document.getElementById('editRowFrom').value = '';
        typeSelect.value = '一般題目';
        updateCommonLevelOptions('一般題目');
        typeSelect.disabled = false;
        statusBadge.innerText = '未儲存';
        statusBadge.className = 'badge-outline badge-unsaved';

        // 1. 先全域解鎖所有欄位
        toggleGlobalEditable(true);

        // ★★★ FIX: 強制鎖定 Sidebar 正確答案選單 (等待子題綁定) ★★★
        const rSidebar = document.getElementById('rSidebarAnswer');
        const lgSidebar = document.getElementById('lgSidebarAnswer');
        if (rSidebar) rSidebar.disabled = true;
        if (lgSidebar) lgSidebar.disabled = true;
        // ★★★ FIX END ★★★

        typeSelect.dispatchEvent(new Event('change'));
    } else {
        const row = btn.closest('tr');
        document.getElementById('editRowFrom').value = row.rowIndex;
        const type = row.getAttribute('data-type');
        const status = row.getAttribute('data-status');
        const jsonData = JSON.parse(row.getAttribute('data-json') || '{}');

        typeSelect.value = type;

        // 初始化等級選單 (依據該筆資料的題型)
        updateCommonLevelOptions(type);

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

    const rowData = { type: type, status: targetStatus, time: getCurrentTime(), ...specificData };
    writeToTable(rowData);
    showToast(`已儲存：${targetStatus}`);
    propModal.hide();
};

window.deleteRow = function (btn) {
    Swal.fire({ title: '確定刪除?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '刪除' }).then((r) => {
        if (r.isConfirmed) { btn.closest('tr').remove(); checkEmptyState(); showToast('已刪除', 'error'); }
    });
};

// 批次刪除按鈕 ※先註解取消
// window.batchAction = function (action) {
//     if (action !== '刪除') return;
//     const checks = document.querySelectorAll('tbody .data-row input:checked:not(:disabled)');
//     if (checks.length === 0) return Swal.fire({ icon: 'warning', text: '請先勾選' });
//     Swal.fire({ title: `刪除 ${checks.length} 筆?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then((r) => {
//         if (r.isConfirmed) { checks.forEach(c => c.closest('tr').remove()); resetSelection(); checkEmptyState(); showToast('已批次刪除'); }
//     });
// };

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
    // 有效總計 (排除不採用)
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


window.changeFontSize = function (dir) {
    if (dir === 1 && currentZoom < 150) currentZoom += 10;
    else if (dir === -1 && currentZoom > 80) currentZoom -= 10;
    document.documentElement.style.fontSize = `${currentZoom}%`;
    document.getElementById('fontSizeDisplay').innerText = `${currentZoom}%`;
};
window.resetFontSize = function () { currentZoom = 100; changeFontSize(0); };



// ==========================================
//  7. 初始化與事件綁定 (Initialization)
// ==========================================

// --- [補回] Missing Utils (Previously Overwritten) ---
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

// --- Type Switcher ---
function initTypeSwitcher() {
    const s = document.getElementById('mType');
    if (!s) return;
    s.addEventListener('change', function () {
        const v = this.value;

        // 切換題型時，同步更新等級下拉選單
        updateCommonLevelOptions(v);

        // 聽力題型時，將「適用等級」改為「難度」
        const lblLevel = document.getElementById('lblCommonLevel');
        if (lblLevel) {
            lblLevel.innerText = v.includes('聽力') ? '難度' : '適用等級';
        }

        // 若切換為聽力題目，觸發一次難度連動
        if (v === '聽力題目' && ListenHandler.updateCoreIndicator) {
            // 延遲執行，確保 updateCommonLevelOptions 已經完成回填
            setTimeout(() => ListenHandler.updateCoreIndicator(), 50);
        }

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

// --- [補回] Auto Select ---
function initAutoSelect() {
    document.querySelectorAll('select').forEach(sel => {
        if (!sel.multiple && sel.options.length > 0) {
            const valid = Array.from(sel.options).filter(o => o.value && !o.disabled);
            if (valid.length === 1 && sel.value !== valid[0].value) sel.value = valid[0].value;
        }
    });
}

// --- [補回] Tab-aware Filter ---
function initFilter() {
    const tabState = { current: 'working' };
    const statusGroups = {
        'working': ['命題草稿', '命題完成', '命題送審'],
        'review': ['採用', '改後再審', '不採用']
    };

    // 1. 更新狀態下拉選單
    const updateStatusDropdown = (group) => {
        const select = document.getElementById('filterStatus');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '<option value="all" selected>全部狀態</option>';
        statusGroups[group].forEach(status => {
            select.add(new Option(status, status));
        });
        if (!statusGroups[group].includes(currentVal)) select.value = 'all';
        else select.value = currentVal;
    };

    // 2. 更新等級下拉選單
    const updateLevelDropdown = () => {
        const typeSelect = document.getElementById('filterType');
        const levelSelect = document.getElementById('filterLevel');
        if (!typeSelect || !levelSelect) return;

        const currentType = typeSelect.value;
        const oldVal = levelSelect.value;

        levelSelect.innerHTML = '<option value="all">全部等級</option>';

        let opts = ['初級', '中級', '中高級', '高級', '優級'];
        if (currentType.includes('聽力')) {
            opts = ['難度一', '難度二', '難度三', '難度四'];
        }

        opts.forEach(o => levelSelect.add(new Option(o, o)));

        if (opts.includes(oldVal)) levelSelect.value = oldVal;
        else levelSelect.value = 'all';
    };

    // 3. 核心篩選與 UI 切換
    const doFilter = () => {
        const typeSelect = document.getElementById('filterType');
        const statusSelect = document.getElementById('filterStatus');
        const levelSelect = document.getElementById('filterLevel');
        const searchInput = document.getElementById('searchInput'); // 假設有這個 ID

        const type = typeSelect ? typeSelect.value : 'all';
        const status = statusSelect ? statusSelect.value : 'all';
        const level = levelSelect ? levelSelect.value : 'all';
        const key = searchInput ? searchInput.value.toLowerCase() : '';
        const allowedStatuses = statusGroups[tabState.current];

        let visibleCount = 0;
        document.querySelectorAll('.data-row').forEach(row => {
            const rt = row.getAttribute('data-type');
            const rs = row.getAttribute('data-status');
            const rl = row.getAttribute('data-level');
            const txt = row.cells[1] ? row.cells[1].textContent.toLowerCase() : '';

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
            if (targetType) {
                tabState.current = targetType;

                // UI 切換邏輯
                const workingStats = document.getElementById('stats-working');
                const reviewStats = document.getElementById('stats-review');
                const hint = document.getElementById('operationHint');

                if (workingStats) {
                    if (targetType === 'working') workingStats.classList.remove('d-none');
                    else workingStats.classList.add('d-none');
                }
                if (reviewStats) {
                    if (targetType === 'review') reviewStats.classList.remove('d-none');
                    else reviewStats.classList.add('d-none');
                }
                if (hint) {
                    if (targetType === 'working') hint.classList.remove('d-none');
                    else hint.classList.add('d-none');
                }

                updateStatusDropdown(targetType);
                doFilter();
            }
        });
    });

    // 篩選器監聽
    ['filterStatus', 'filterLevel', 'searchInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', doFilter);
    });

    // 題型篩選
    const filterType = document.getElementById('filterType');
    if (filterType) {
        filterType.addEventListener('change', function () {
            updateLevelDropdown();
            doFilter();
        });
    }

    // 初始化
    updateLevelDropdown();
    updateStatusDropdown('working');
    doFilter();

    // 綁定全域 Filter (供外部呼叫)
    window.filterByStatus = function (targetStatus) {
        if (targetStatus === 'all') {
            const select = document.getElementById('filterStatus');
            if (select) {
                select.value = 'all';
                select.dispatchEvent(new Event('change'));
            }
            return;
        }

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

// --- Row Locking Logic (From cwt-list.html) ---
function initRowLocking() {
    // 1. 處理既有的鎖定列
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const badge = row.querySelector('.badge-outline');
        if (badge) {
            const statusText = badge.innerText.trim();
            if (isLockedStatus(statusText)) {
                row.classList.add('row-locked');
                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.disabled = true;
            }
        }
    });

    // 2. 修正全選功能
    const selectAllBtn = document.getElementById('selectAll');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('change', function () {
            const isChecked = this.checked;
            const allCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]');
            allCheckboxes.forEach(cb => {
                if (!cb.disabled) cb.checked = isChecked;
            });
        });
    }
}

// Helper: 判斷是否鎖定
function isLockedStatus(status) {
    return (status === '命題送審' || status === '不採用');
}


// ==========================================
//  ★ 主要初始化入口 (DOMContentLoaded)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // 1. 初始化 Bootstrap 元件
    const modalEl = document.getElementById('propModal');
    if (modalEl) propModal = new bootstrap.Modal(modalEl);

    const toastEl = document.getElementById('liveToast');
    if (toastEl) toastInstance = new bootstrap.Toast(toastEl);

    // 2. 初始化 Common Editor
    if (typeof CommonEditorManager !== 'undefined' && CommonEditorManager.init) {
        CommonEditorManager.init();
    }

    // 3. 初始化 Handlers
    Object.values(TypeHandlers).forEach(h => { if (h && h.init) h.init(); });

    // 4. 啟動各功能模組
    if (typeof initProjectHeader === 'function') initProjectHeader();
    if (typeof initCheckboxLogic === 'function') initCheckboxLogic();

    initFilter();           // 表格篩選 (含 Tab)
    initTypeSwitcher();     // Modal 內題型切換
    initAutoSelect();       // 自動選取
    initRowLocking();       // 鎖定列處理

    if (typeof updateStats === 'function') updateStats();
    if (typeof sortPropList === 'function') sortPropList();
});

