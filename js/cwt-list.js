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


// 綁定標點符號與字數統計


// 角色對照




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
                        this.classList.add('has-answer');
                    } else {
                        this.classList.remove('has-answer');
                    }
                });
            }
        },

        // 清除表單
        clear: function () {
            ['gLevel', 'gDifficulty', 'gMainCategory', 'gCorrectAnswer', 'hidden-g-content', 'hidden-g-optA', 'hidden-g-optB', 'hidden-g-optC', 'hidden-g-optD'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // 清空預覽區塊
            ['preview-g-content', 'preview-g-optA', 'preview-g-optB', 'preview-g-optC', 'preview-g-optD'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

            // 重置檔案欄位
            document.querySelectorAll('#form-general input[type="file"]').forEach(el => el.value = '');

            const sub = document.getElementById('gSubCategory');
            if (sub) {
                sub.innerHTML = '<option value="">請先選擇主類</option>';
                sub.disabled = true;
            }
        },

        // 回填資料 (編輯模式)
        fill: function (data, isViewMode) {
            // 1. 回填下拉選單
            ['gLevel', 'gDifficulty'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = data[id.replace('g', '').toLowerCase()] || '';
            });

            const main = document.getElementById('gMainCategory');
            if (main) {
                main.value = data.mainCat || '';
                // 觸發 change 以更新次類選單
                main.dispatchEvent(new Event('change'));
            }
            const sub = document.getElementById('gSubCategory');
            if (sub && data.subCat) sub.value = data.subCat;

            // 2. 回填：題幹 + 選項 A~D + 解析
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
            ['A', 'B', 'C', 'D'].forEach(opt => setContent(`opt${opt}`, data[`opt${opt}`]));

            // 3. 回填答案
            const ans = document.getElementById('gCorrectAnswer');
            if (ans) {
                ans.value = data.ans || '';
                ans.dispatchEvent(new Event('change')); // 觸發高亮
            }
        },

        // 收集資料 (儲存時)
        collect: function () {
            // 輔助函數：取得隱藏欄位並編碼
            const getVal = (id) => {
                const el = document.getElementById(id);
                // 共用編輯器已經將內容編碼存入 value 了，所以這裡直接取 value 即可
                return el ? el.value : '';
            };

            return {
                level: document.getElementById('gLevel').value,
                mainCat: document.getElementById('gMainCategory').value,
                subCat: document.getElementById('gSubCategory').value,
                content: getVal('hidden-g-content'),
                optA: getVal('hidden-g-optA'),
                optB: getVal('hidden-g-optB'),
                optC: getVal('hidden-g-optC'),
                optD: getVal('hidden-g-optD'),
                explanation: getVal('hidden-g-explanation'), // 收集解析

                // 這裡摘要只抓文字
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
        init: function () { },
        clear: function () {
            // 1. 清空一般欄位
            ['lLevel', 'lType', 'lDifficulty', 'lTopic'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // 2. 清空隱藏欄位與預覽區 (內容、解析)
            ['content', 'explanation'].forEach(key => {
                const hidden = document.getElementById(`hidden-l-${key}`);
                const preview = document.getElementById(`preview-l-${key}`);
                if (hidden) hidden.value = '';
                if (preview) preview.innerHTML = '';
            });

            // 3. 清空附檔
            const file = document.getElementById('lAttachment');
            if (file) file.value = '';
        },
        fill: function (data, isViewMode) {
            // 1. 回填基本資料
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };
            setVal('lType', data.subType);
            setVal('lLevel', data.level);
            setVal('lDifficulty', data.difficulty);
            setVal('lTopic', data.topic);

            // 修正點：隱藏欄位存編碼，預覽區存 HTML
            const setContent = (key, val) => {
                const hidden = document.getElementById(`hidden-l-${key}`);
                const preview = document.getElementById(`preview-l-${key}`);
                if (hidden && preview) {
                    preview.innerHTML = val ? decodeURIComponent(val) : '';
                    hidden.value = val || ''; // 保持編碼
                }
            };
            setContent('content', data.content);
            setContent('explanation', data.explanation);
        },
        collect: function () {
            // 輔助函數：取得隱藏欄位並編碼
            const getVal = (id) => {
                const el = document.getElementById(id);
                return el ? el.value : '';
            };

            return {
                mainCat: '長文題目',
                subType: document.getElementById('lType').value,
                level: document.getElementById('lLevel').value,
                difficulty: document.getElementById('lDifficulty').value,
                topic: document.getElementById('lTopic').value,
                // 從隱藏欄位取值
                content: getVal('hidden-l-content'),
                explanation: getVal('hidden-l-explanation'),
                // 摘要使用標題
                summary: document.getElementById('lTopic').value || '未命名長文題目'
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
            if (card) val === opt ? card.classList.add('is-correct-answer') : card.classList.remove('is-correct-answer');
        });
        const d = document.getElementById('liCorrectAnswer');
        if (d) val ? d.classList.add('has-answer') : d.classList.remove('has-answer');
    }

    return {
        init: function () {
            // 移除原本 Quill 初始化，改由 HTML 直接綁定 onclick="openCommonEditor(this)"

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

            // 綁定 MutationObserver 監聽 Preview Box 變更 (若需要即時檢查可在此實作，目前保持簡單)
        },
        clear: function () {
            ['liLevel', 'liTopic', 'liCorrectAnswer', 'liCore', 'liIndicator', 'liVoiceType', 'liMaterial', 'liAttachment'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // 清空 Preview Boxes & Hidden Inputs
            ['listen-content', 'listen-optA', 'listen-optB', 'listen-optC', 'listen-optD', 'listen-explanation'].forEach(key => {
                const h = document.getElementById(`hidden-${key}`);
                const p = document.getElementById(`preview-${key}`);
                if (h) h.value = '';
                if (p) p.innerHTML = '';
            });

            // 清空選項附檔 (新增)
            ['A', 'B', 'C', 'D'].forEach(opt => {
                const f = document.getElementById(`file-listen-opt${opt}`);
                if (f) f.value = '';
            });

            updateCorrectAnswerDisplay('');
            this.toggleEditable(true);
        },
        fill: function (data, isViewMode) {
            document.getElementById('liLevel').value = data.level || '';
            document.getElementById('liLevel').dispatchEvent(new Event('change')); // 觸發連動

            document.getElementById('liTopic').value = data.topic || '';
            document.getElementById('liVoiceType').value = data.voiceType || '';
            document.getElementById('liMaterial').value = data.material || '';
            document.getElementById('liCorrectAnswer').value = data.ans || '';
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

            this.toggleEditable(!isViewMode);
        },
        collect: function () {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

            return {
                level: getVal('liLevel'),
                voiceType: getVal('liVoiceType'),
                material: getVal('liMaterial'),
                topic: getVal('liTopic'),
                summary: getVal('liTopic'),
                content: getVal('hidden-listen-content'),
                optA: getVal('hidden-listen-optA'),
                optB: getVal('hidden-listen-optB'),
                optC: getVal('hidden-listen-optC'),
                optD: getVal('hidden-listen-optD'),
                ans: getVal('liCorrectAnswer'),
                explanation: getVal('hidden-listen-explanation')
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
                if (!el.classList.contains('readonly-field')) el.disabled = !editable;
            });
            // 標點符號列已移除，無需處理
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

    // 產生選項 HTML (改為 Preview Box + 附檔輸入框)
    // 注意：外部容器會負責 col-md-6 的佈局
    function generateOptionHTML(uid, opt) {
        return `
        <div class="col-md-6 mb-3">
            <div class="card option-card h-100" id="lgOptCard-${uid}-${opt}">
                <div class="option-header-styled"><span class="badge bg-secondary">選項 ${opt}</span></div>
                
                <div class="editor-preview-box p-3 border-0 bg-white" style="min-height: 80px;"
                     id="preview-${uid}-opt${opt}" 
                     data-field="${uid}-opt${opt}" 
                     data-placeholder="輸入選項 ${opt}..."
                     onclick="openCommonEditor(this)"></div>
                <input type="hidden" id="hidden-${uid}-opt${opt}">

                <div class="attachment-wrapper p-2 border-top bg-light">
                    <input class="form-control form-control-sm" type="file" id="file-${uid}-opt${opt}">
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

                            <div class="mb-4">
                                <label class="form-label fw-bold small text-secondary required-star">子題內容 (語音腳本)</label>
                                <div class="editor-preview-box border rounded-3 p-3 bg-white mb-2" 
                                     id="preview-${uid}-content" 
                                     data-field="${uid}-content" 
                                     data-placeholder="點擊輸入子題語音腳本..." 
                                     onclick="openCommonEditor(this)"></div>
                                <input type="hidden" id="hidden-${uid}-content">
                            </div>

                            <div class="mb-4">
                                <label class="form-label fw-bold small text-secondary required-star">選項與正確答案</label>
                                <div class="row g-3">
                                    ${['A', 'B', 'C', 'D'].map(opt => generateOptionHTML(uid, opt)).join('')}
                                </div>
                            </div>
                            
                            <div class="answer-selector-section">
                                <span class="selector-label"><i class="bi bi-check-circle"></i> 正確答案</span>
                                <select class="answer-dropdown" id="lg-ans-select-${uid}" onchange="ListenGroupHandler.onSubAnswerChange('${uid}', this.value)">
                                    <option value="">請選擇...</option>
                                    <option value="A">選項 A</option>
                                    <option value="B">選項 B</option>
                                    <option value="C">選項 C</option>
                                    <option value="D">選項 D</option>
                                </select>
                            </div>

                            <div class="mt-3">
                                <label class="form-label fw-bold small text-secondary">解析</label>
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
            });
        },

        onSubAnswerChange: function (uid, val) {
            updateSubCorrectAnswerDisplay(uid, val);
        },




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
                    ans: getVal(`lg-ans-select-${uid}`),
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
    // 用於 DOM ID 的唯一計數
    let subQuestionUidCounter = 0;
    // 用於顯示的題號計數器 (只增不減)
    let displaySequence = 0;



    return {
        init: function () {
            // 綁定全域函式供 HTML onclick 使用
            window.Reading_AddSub = () => this.addSubQuestion(null, false);
            window.Reading_RemoveSub = (uid) => this.removeSubQuestion(uid);
        },

        clear: function () {
            ['rLevel', 'rGenre', 'rDifficulty'].forEach(id => document.getElementById(id).value = '');

            // 清除母題文章 (Common Editor)
            const hMain = document.getElementById('hidden-rArticle');
            const pMain = document.getElementById('preview-rArticle');
            if (hMain) hMain.value = '';
            if (pMain) pMain.innerHTML = '';

            document.getElementById('sub-questions-container').innerHTML = '';
            displaySequence = 0;
            this.toggleEditable(true);
            this.checkEmptyState();
        },

        fill: function (data, isViewMode) {
            document.getElementById('rLevel').value = data.level || '';
            document.getElementById('rGenre').value = data.genre || '';
            document.getElementById('rDifficulty').value = data.difficulty || '';

            // 回填母題文章 (Common Editor)
            const hMain = document.getElementById('hidden-rArticle');
            const pMain = document.getElementById('preview-rArticle');
            if (hMain && pMain) {
                hMain.value = data.content || '';
                pMain.innerHTML = data.content ? decodeURIComponent(data.content) : '';
            }

            document.getElementById('sub-questions-container').innerHTML = '';
            // ★ 重置顯示編號
            displaySequence = 0;
            // 回填子題
            if (data.subQuestions) data.subQuestions.forEach(sub => this.addSubQuestion(sub, false));
            this.checkEmptyState();
            this.toggleEditable(!isViewMode);
        },

        collect: function () {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

            const result = {
                level: document.getElementById('rLevel').value,
                genre: document.getElementById('rGenre').value,
                difficulty: document.getElementById('rDifficulty').value,
                content: getVal('hidden-rArticle'), // 改為從 hidden input 取值
                summary: '閱讀題組', // 實際可優化
                subQuestions: []
            };

            document.querySelectorAll('#sub-questions-container .sub-question-card').forEach(card => {
                const uid = card.id.replace('card-', '');
                result.subQuestions.push({
                    content: getVal(`hidden-${uid}_content`),
                    optA: getVal(`hidden-${uid}_optA`),
                    optB: getVal(`hidden-${uid}_optB`),
                    optC: getVal(`hidden-${uid}_optC`),
                    optD: getVal(`hidden-${uid}_optD`),
                    ans: document.getElementById(`ans-select-${uid}`).value,
                    explanation: getVal(`hidden-${uid}_explanation`)
                });
            });

            return result;
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

            // --- 內部 helpers (仿 ShortArticleHandler) ---

            // 1. 一般欄位 (題目、解析)
            const buildStandardField = (fieldKey, placeholder, label = '', showAttachment = false) => {
                const uniqueFieldId = `${uid}_${fieldKey}`;
                const valEncoded = data && data[fieldKey] ? data[fieldKey] : '';
                const valDecoded = valEncoded ? decodeURIComponent(valEncoded) : '';

                const attachmentHTML = showAttachment ? `
                    <div class="attachment-wrapper p-2 border rounded bg-light mt-0">
                        <label class="form-label small fw-bold text-muted mb-1">附檔 (圖片/PNG)</label>
                        <input class="form-control form-control-sm" type="file" id="file-${uniqueFieldId}">
                    </div>
                ` : '';

                return `
                    <div class="mb-3">
                        ${label ? `<label class="form-label fw-bold small text-secondary required-star">${label}</label>` : ''}                    
                        <div class="editor-preview-box border rounded-3 p-3 bg-white mb-2" 
                                id="preview-${uniqueFieldId}" 
                                data-field="${uniqueFieldId}" 
                                data-placeholder="${placeholder}"
                                onclick="openCommonEditor(this)">${valDecoded}</div>
                        <input type="hidden" id="hidden-${uniqueFieldId}" value="${valEncoded}">                    
                        ${attachmentHTML}
                    </div>
                `;
            };

            // 2. 選項卡片 (仿 form-general 結構：Card + Attachment)
            const buildOptionCard = (optLabel, fieldKey) => {
                const uniqueFieldId = `${uid}_${fieldKey}`;
                const valEncoded = data && data[fieldKey] ? data[fieldKey] : '';
                const valDecoded = valEncoded ? decodeURIComponent(valEncoded) : '';

                return `
                    <div class="col-md-6 mb-1">
                        <div class="card option-card" id="optCard-${uid}-${optLabel}" data-option="${optLabel}">
                            <div class="option-header-styled">
                                <span class="badge bg-secondary">選項 ${optLabel}</span>
                            </div>
                            <div class="p-0 d-flex flex-column">
                                 <div class="editor-preview-box p-3"
                                     id="preview-${uniqueFieldId}"
                                     data-field="${uniqueFieldId}"
                                     data-placeholder="輸入選項 ${optLabel}..."
                                     onclick="openCommonEditor(this)">${valDecoded}</div>
                                <input type="hidden" id="hidden-${uniqueFieldId}" value="${valEncoded}">
                                
                                <div class="attachment-wrapper p-2 border-top bg-light">
                                    <input class="form-control form-control-sm" type="file" id="file-${uniqueFieldId}">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            };

            // ★ 修正重點 1 & 3：手風琴結構 + 綠勾勾 + 刪除按鈕 (仿 ShortArticleHandler)
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
                        <!-- 題目 -->
                        ${buildStandardField('content', '輸入子題題目...', '題目', true)}
                        
                        <div class="mb-4">
                            <label class="form-label fw-bold small text-secondary required-star">選項與正確答案</label>
                            <div class="alert-hint small py-2 mb-2">
                                <i class="bi bi-exclamation-circle-fill"></i> 請避免選項長短、語氣明顯差異，以免影響鑑別度
                            </div>
                            <div class="row g-3">
                                ${buildOptionCard('A', 'optA')}
                                ${buildOptionCard('B', 'optB')}
                                ${buildOptionCard('C', 'optC')}
                                ${buildOptionCard('D', 'optD')}
                            </div>
                            
                            <div class="answer-selector-section mt-3">
                                <span class="selector-label"><i class="bi bi-check-circle"></i> 正確答案</span>
                                <select class="answer-dropdown" id="ans-select-${uid}">
                                    <option value="">請選擇...</option>
                                    <option value="A" ${data && data.ans === 'A' ? 'selected' : ''}>選項 A</option>
                                    <option value="B" ${data && data.ans === 'B' ? 'selected' : ''}>選項 B</option>
                                    <option value="C" ${data && data.ans === 'C' ? 'selected' : ''}>選項 C</option>
                                    <option value="D" ${data && data.ans === 'D' ? 'selected' : ''}>選項 D</option>
                                </select>
                                <span class="selector-hint">
                                    <i class="bi bi-info-circle me-1"></i> 選擇後會在對應選項顯示標記
                                </span>
                            </div>
                        </div>
                        
                        <!-- 解析 -->
                        <div class="mb-2">
                             <label class="form-label fw-bold small text-secondary">解析</label>
                            <div class="editor-preview-box border rounded-3 p-3 bg-white" 
                                    id="preview-${uid}_explanation" 
                                    data-field="${uid}_explanation" 
                                    data-placeholder="輸入解析(批說)..."
                                    onclick="openCommonEditor(this)">${data && data.explanation ? decodeURIComponent(data.explanation) : ''}</div>
                            <input type="hidden" id="hidden-${uid}_explanation" value="${data && data.explanation ? data.explanation : ''}">
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
            this.checkEmptyState();

            // 綁定檢查事件
            const checkFn = () => this.checkCompletion(uid);

            // 監聽下拉選單變更
            const ansSelect = document.getElementById(`ans-select-${uid}`);
            ansSelect.addEventListener('change', function () {
                updateSubCorrectAnswerDisplay(uid, this.value);
                checkFn();
            });

            // 監聽 Preview Box 變更 (透過 MutationObserver)
            ['content', 'optA', 'optB', 'optC', 'optD'].forEach(key => {
                const box = document.getElementById(`preview-${uid}_${key}`);
                if (box) {
                    const observer = new MutationObserver(() => {
                        checkFn();
                    });
                    observer.observe(box, { childList: true, subtree: true, characterData: true });
                }
            });

            // 如果有資料則回填正確答案 (內容已在 HTML string 中回填)
            if (data && data.ans) {
                ansSelect.value = data.ans;
                updateSubCorrectAnswerDisplay(uid, data.ans);
            }
            checkFn(); // 初始檢查
        },
        // ★ 修正重點 4：綠勾勾邏輯 (必須題目有內容 且 答案已選)
        // ★ 修正重點 4：綠勾勾邏輯 (必須題目有內容 且 答案已選)
        checkCompletion: function (uid) {
            // 1. 題目要有字
            const hasTopic = (document.getElementById(`hidden-${uid}_content`)?.value || '').trim().length > 0;

            // 2. 答案要有選
            const ans = document.getElementById(`ans-select-${uid}`).value;

            // 3. 所有選項 (A, B, C, D) 都要有字
            let hasAllOptions = true;
            ['A', 'B', 'C', 'D'].forEach(opt => {
                const val = (document.getElementById(`hidden-${uid}_opt${opt}`)?.value || '').trim();
                if (val.length === 0) hasAllOptions = false;
            });

            const checkIcon = document.getElementById(`check-icon-${uid}`);
            if (checkIcon) {
                // 綜合判斷
                if (hasTopic && ans && hasAllOptions) {
                    checkIcon.classList.remove('d-none');
                } else {
                    checkIcon.classList.add('d-none');
                }
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
            // 鎖定新增按鈕
            const addBtn = document.getElementById('btn-add-reading-sub');
            if (addBtn) addBtn.hidden = !editable;

            // 鎖定移除按鈕
            document.querySelectorAll('#form-reading .sub-remove-btn').forEach(btn => btn.hidden = !editable);

            // 鎖定輸入框
            document.querySelectorAll('#form-reading input, #form-reading select').forEach(el => {
                if (el.id !== 'rPropositioner' && !el.classList.contains('readonly-field')) el.disabled = !editable;
            });

            // 鎖定 Preview Box
            const previews = document.querySelectorAll('#form-reading .editor-preview-box');
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
        }
    };
})();

/* --- ShortArticleHandler (短文題組) --- */
const ShortArticleHandler = (function () {
    const generateId = () => 'ssub_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    // ★ 定義顯示用的題號計數器 (只增不減)
    let displaySequence = 0;

    // ★ 檢查子題完成狀態
    function checkSubCompletion(id) {
        // 1. 檢查題目與選項是否有內容
        const checkField = (key) => {
            const el = document.getElementById(`hidden-${id}_${key}`);
            return el && el.value.trim().length > 0;
        };
        const hasContent = checkField('content');
        const hasAllOpts = ['optA', 'optB', 'optC', 'optD'].every(key => checkField(key));

        // 2. 檢查是否已選答案
        const ans = document.getElementById(`ans-${id}`).value;

        // 3. 綜合判斷
        const checkIcon = document.getElementById(`check-icon-${id}`);
        if (checkIcon) {
            if (hasContent && hasAllOpts && ans) {
                checkIcon.classList.remove('d-none');
            } else {
                checkIcon.classList.add('d-none');
            }
        }
    }

    // ★ 更新選項高亮 (完全仿照 ReadingHandler 的 CSS class 操作)
    function updateSubCorrectAnswerDisplay(id, val) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            // 注意：這裡 ID 改為 optCard-${id}-${opt} 配合 HTML
            const card = document.getElementById(`optCard-${id}-${opt}`);
            if (card) {
                if (opt === val) card.classList.add('is-correct-answer');
                else card.classList.remove('is-correct-answer');
            }
        });

        const select = document.getElementById(`ans-${id}`);
        if (select) {
            if (val) select.classList.add('has-answer'); // CSS: .answer-dropdown.has-answer
            else select.classList.remove('has-answer');
        }
    }

    // 產生子題 HTML
    const createSubQuestionHTML = (id, seqNum, data = {}, isOpen = true) => {
        // 1. 一般欄位 (題目、解析)
        // ★ 修改：增加 attachment-wrapper (仿 form-general)
        const buildStandardField = (fieldKey, placeholder, label = '', showAttachment = false) => {
            const uniqueFieldId = `${id}_${fieldKey}`;
            const valEncoded = data[fieldKey] || '';
            const valDecoded = valEncoded ? decodeURIComponent(valEncoded) : '';

            const attachmentHTML = showAttachment ? `
                <div class="attachment-wrapper p-2 border rounded bg-light mt-0">
                    <label class="form-label small fw-bold text-muted mb-1">附檔 (圖片/PNG)</label>
                    <input class="form-control form-control-sm" type="file" id="file-${uniqueFieldId}">
                </div>
            ` : '';

            return `
                <div class="mb-3">
                    ${label ? `<label class="form-label fw-bold small text-secondary required-star">${label}</label>` : ''}                    
                    <div class="editor-preview-box border rounded-3 p-3 bg-white mb-2" 
                            id="preview-${uniqueFieldId}" 
                            data-field="${uniqueFieldId}" 
                            data-placeholder="${placeholder}"
                            onclick="openCommonEditor(this)">${valDecoded}</div>
                    <input type="hidden" id="hidden-${uniqueFieldId}" value="${valEncoded}">                    
                    ${attachmentHTML}
                </div>
            `;
        };

        // 2. 選項卡片 (仿 form-general 結構：Card + Attachment)
        // ★ 修改：包含 attachment-wrapper
        const buildOptionCard = (optLabel, fieldKey) => {
            const uniqueFieldId = `${id}_${fieldKey}`;
            const valEncoded = data[fieldKey] || '';
            const valDecoded = valEncoded ? decodeURIComponent(valEncoded) : '';

            return `
                <div class="col-md-6 mb-1">
                    <div class="card option-card" id="optCard-${id}-${optLabel}" data-option="${optLabel}">
                        <div class="option-header-styled">
                            <span class="badge bg-secondary">選項 ${optLabel}</span>
                        </div>
                        <div class="p-0 d-flex flex-column">
                             <div class="editor-preview-box p-3"
                                 id="preview-${uniqueFieldId}"
                                 data-field="${uniqueFieldId}"
                                 data-placeholder="輸入選項 ${optLabel}..."
                                 onclick="openCommonEditor(this)">${valDecoded}</div>
                            <input type="hidden" id="hidden-${uniqueFieldId}" value="${valEncoded}">
                            
                            <div class="attachment-wrapper p-2 border-top bg-light">
                                <input class="form-control form-control-sm" type="file" id="file-${uniqueFieldId}">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        // ★ 手風琴結構
        return `
            <div class="card mb-3 sub-question-card border-0 shadow-sm" id="card-${id}">
                <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center ${isOpen ? '' : 'collapsed'}"
                     data-bs-toggle="collapse" data-bs-target="#collapse-${id}" aria-expanded="${isOpen}" style="cursor:pointer">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-chevron-down accordion-arrow"></i>
                        <span class="fw-bold text-primary sub-index-label">子題代碼：${seqNum}</span>
                        <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${id}" title="內容與答案皆已填寫"></i>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger border-0 sub-remove-btn" onclick="event.stopPropagation(); ShortArticle_RemoveSub('${id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>

                <div id="collapse-${id}" class="collapse ${isOpen ? 'show' : ''} border border-top-0 rounded-bottom" data-bs-parent="#s-sub-questions-container">
                    <div class="card-body bg-light">
                        <!-- 題目 (仿 form-general: 內容 + 附檔) -->
                        ${buildStandardField('content', '點擊輸入子題題目...', '題目', true)}

                        <!-- 選項 (A, B, C, D) - 2x2 Grid -->
                        <div class="mb-4">
                            <label class="form-label fw-bold small text-secondary required-star">選項與正確答案</label>
                            <div class="alert-hint small py-2 mb-2">
                                <i class="bi bi-exclamation-circle-fill"></i> 請避免選項長短、語氣明顯差異，以免影響鑑別度
                            </div>
                            <div class="row g-3">
                                ${buildOptionCard('A', 'optA')}
                                ${buildOptionCard('B', 'optB')}
                                ${buildOptionCard('C', 'optC')}
                                ${buildOptionCard('D', 'optD')}
                            </div>

                            <!-- 正確答案選擇 (仿 General Form UI) -->
                            <div class="answer-selector-section mt-3">
                                <span class="selector-label"><i class="bi bi-check-circle"></i> 正確答案</span>
                                <select class="answer-dropdown" id="ans-${id}">
                                    <option value="">請選擇...</option>
                                    <option value="A" ${data.ans === 'A' ? 'selected' : ''}>選項 A</option>
                                    <option value="B" ${data.ans === 'B' ? 'selected' : ''}>選項 B</option>
                                    <option value="C" ${data.ans === 'C' ? 'selected' : ''}>選項 C</option>
                                    <option value="D" ${data.ans === 'D' ? 'selected' : ''}>選項 D</option>
                                </select>
                                <span class="selector-hint">
                                    <i class="bi bi-info-circle me-1"></i> 選擇後會在對應選項顯示標記
                                </span>
                            </div>
                        </div>

                        <!-- 解析 -->
                        <div class="mb-2">
                             <label class="form-label fw-bold small text-secondary">解析</label>
                            <div class="editor-preview-box border rounded-3 p-3 bg-white" 
                                    id="preview-${id}_explanation" 
                                    data-field="${id}_explanation" 
                                    data-placeholder="輸入解析(批說)..."
                                    onclick="openCommonEditor(this)">${data.explanation ? decodeURIComponent(data.explanation) : ''}</div>
                            <input type="hidden" id="hidden-${id}_explanation" value="${data.explanation || ''}">
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    return {
        init: function () {
            const addBtn = document.getElementById('btn-add-s-sub');
            if (addBtn) {
                // 清除舊事件
                const newBtn = addBtn.cloneNode(true);
                addBtn.replaceWith(newBtn);
                newBtn.addEventListener('click', () => {
                    this.addSubQuestion(null, false);
                });
            }
            window.ShortArticle_RemoveSub = (id) => this.removeSub(id);
        },

        addSubQuestion: function (data = null, isOpen = false) {
            const container = document.getElementById('s-sub-questions-container');
            const id = generateId();

            // ★ 遞增題號 (不重置)
            displaySequence++;

            container.insertAdjacentHTML('beforeend', createSubQuestionHTML(id, displaySequence, data || {}, isOpen));

            // ★ 綁定事件監聽
            // 1. 下拉選單變更
            const ansSelect = document.getElementById(`ans-${id}`);
            if (ansSelect) {
                ansSelect.addEventListener('change', function () {
                    updateSubCorrectAnswerDisplay(id, this.value);
                    checkSubCompletion(id);
                });
                // 初始化狀態
                if (data && data.ans) {
                    updateSubCorrectAnswerDisplay(id, data.ans);
                }
            }

            // 2. 監聽 Preview Box 的變化 (透過 MutationObserver 監聽 CommonEditor 回填的變化)
            ['content', 'optA', 'optB', 'optC', 'optD'].forEach(key => {
                const box = document.getElementById(`preview-${id}_${key}`);
                if (box) {
                    const observer = new MutationObserver(() => {
                        checkSubCompletion(id);
                    });
                    observer.observe(box, { childList: true, subtree: true, characterData: true });
                }
            });

            this.checkEmptyState();
            checkSubCompletion(id); // 初始檢查
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
                    // ★ 注意：這裡不再重新編號 (符合 ReadingHandler 的新邏輯)
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
            ['sLevel', 'sDifficulty', 'sGenre'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });

            // sTopic (母題標題) 改為 Common Editor
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

            document.getElementById('s-sub-questions-container').innerHTML = '';

            // ★ 重置狀態
            displaySequence = 0;
            this.checkEmptyState();
            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('sLevel', data.level);
            setVal('sDifficulty', data.difficulty);
            setVal('sGenre', data.genre);

            // sTopic (母題標題)
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

            const container = document.getElementById('s-sub-questions-container');
            container.innerHTML = '';

            // ★ 重置並回填
            displaySequence = 0;

            if (data.questions && Array.isArray(data.questions)) {
                data.questions.forEach(q => this.addSubQuestion(q, false)); // 預設收合
            }

            this.checkEmptyState();
            this.toggleEditable(!isViewMode);
        },

        collect: function () {
            const getVal = (id) => {
                const el = document.getElementById(id);
                return el ? el.value : '';
            };

            const result = {
                mainCat: '文義判讀',
                subCat: '篇章辨析',
                level: document.getElementById('sLevel').value,
                difficulty: document.getElementById('sDifficulty').value,
                genre: document.getElementById('sGenre').value,
                topic: getVal('hidden-sTopic'), // 改為從 hidden input 取值
                article: getVal('hidden-s-article'),
                summary: getVal('hidden-sTopic') || '未命名短文題組',
                questions: []
            };

            document.querySelectorAll('#s-sub-questions-container .sub-question-card').forEach(card => {
                const id = card.id.replace('card-', '');

                result.questions.push({
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
            const addBtn = document.getElementById('btn-add-s-sub');
            if (addBtn) addBtn.hidden = !editable;

            document.querySelectorAll('#s-sub-questions-container .sub-remove-btn').forEach(btn => btn.hidden = !editable);

            const inputs = document.querySelectorAll('#form-shortarticle input:not(.readonly-field), #form-shortarticle select');
            inputs.forEach(el => el.disabled = !editable);

            const previews = document.querySelectorAll('#form-shortarticle .editor-preview-box');
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
        }
    };
})();

// --- Handler 映射表 ---




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
    // 修正：無論是新增還是編輯，都先清空所有表單，避免殘留
    Object.values(TypeHandlers).forEach(h => { if (h && h.clear) h.clear(); });

    if (mode === 'create') {
        document.getElementById('editRowFrom').value = '';
        typeSelect.value = '一般題目';
        typeSelect.disabled = false;
        statusBadge.innerText = '未儲存';
        statusBadge.className = 'badge-outline badge-unsaved';
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
                if (hint) hint.classList.remove('d-none');
            } else {
                workingStats.classList.add('d-none');
                reviewStats.classList.remove('d-none');
                if (hint) hint.classList.add('d-none');
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

