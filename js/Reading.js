// js/Reading.js
const ReadingHandler = (function () {
    const quills = { main: null, subs: {} };
    let subQuestionCounter = 0;

    // ★ 更新子題選項卡片的正確答案標示
    function updateSubCorrectAnswerDisplay(uid, selectedValue) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`optCard-${uid}-${opt}`);
            if (card) {
                if (opt === selectedValue) {
                    card.classList.add('is-correct-answer');
                } else {
                    card.classList.remove('is-correct-answer');
                }
            }
        });

        const dropdown = document.getElementById(`ans-select-${uid}`);
        if (dropdown) {
            if (selectedValue) {
                dropdown.classList.add('has-answer');
            } else {
                dropdown.classList.remove('has-answer');
            }
        }
    }

    // 產生選項 HTML (抽出成函式避免重複)
    function generateOptionHTML(uid, opt) {
        return `
            <div class="card option-card mb-2" id="optCard-${uid}-${opt}" data-option="${opt}">
                <div class="option-header-styled">
                    <span class="badge bg-secondary">選項 ${opt}</span>
                </div>
                <div class="quill-master-container border-0">
                    <div class="punctuation-toolbar d-flex flex-wrap gap-2 p-2 border-bottom bg-light">
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
                    </div>
                    <div id="q-${uid}-opt${opt}" class="option-editor border-0"></div>
                    <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary rounded-bottom-3">
                        <span>字數：<span class="count-num" id="count-q-${uid}-opt${opt}">0</span></span>
                    </div>
                </div>
            </div>
        `;
    }

    return {
        init: function () {
            // 母題 Quill
            if (document.getElementById('q-reading-main')) {
                quills.main = new window.Quill('#q-reading-main', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '文章內容...' });

                if (typeof bindQuillHelpers === 'function') {
                    bindQuillHelpers(quills.main, 'q-reading-main');
                }
            }

            // 綁定全域函式
            window.Reading_AddSub = () => this.addSubQuestion(null, false); // 手動新增預設展開
            window.Reading_RemoveSub = (uid) => this.removeSubQuestion(uid);
            // 移除手動完成按鈕綁定 window.Reading_ToggleComplete
        },

        clear: function () {
            document.getElementById('rLevel').value = '';
            document.getElementById('rGenre').value = '';
            document.getElementById('rDifficulty').value = ''; // 默認空白

            // 同步命題者
            const userNameEl = document.querySelector('.user-name');
            const propInput = document.getElementById('rPropositioner');
            if (propInput && userNameEl) {
                propInput.value = userNameEl.innerText.trim();
            }

            document.getElementById('rAttachment').value = '';
            if (quills.main) quills.main.setText('');

            document.getElementById('sub-questions-container').innerHTML = '';
            document.getElementById('sub-questions-empty').classList.remove('d-none');
            quills.subs = {};
            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            document.getElementById('rLevel').value = data.level || '';
            document.getElementById('rGenre').value = data.mainCat || '';
            document.getElementById('rDifficulty').value = data.difficulty || '';

            const propInput = document.getElementById('rPropositioner');
            if (propInput) {
                propInput.value = data.propositioner || (document.querySelector('.user-name')?.innerText.trim() || '系統管理員');
            }

            // 修正點：使用 API 填入母題內容
            if (quills.main) {
                quills.main.setText(''); // 清空
                if (data.content) {
                    quills.main.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(data.content));
                }
            }

            // 清空舊子題並回填
            document.getElementById('sub-questions-container').innerHTML = '';
            quills.subs = {};

            if (data.subQuestions && data.subQuestions.length > 0) {
                // 回填時，所有子題預設都收合 (false)
                data.subQuestions.forEach(sub => this.addSubQuestion(sub, false));
            } else {
                document.getElementById('sub-questions-empty').classList.remove('d-none');
            }

            this.toggleEditable(!isViewMode);
        },

        collect: function (status) {
            const level = document.getElementById('rLevel').value;
            const genre = document.getElementById('rGenre').value;
            const difficulty = document.getElementById('rDifficulty').value;
            const propositioner = document.getElementById('rPropositioner').value;
            const mainText = quills.main.getText().trim();
            const subKeys = Object.keys(quills.subs);

            // 篩選出「未刪除」的子題 key，用於驗證
            const activeSubKeys = subKeys.filter(uid => {
                const card = document.getElementById(`card-${uid}`);
                return card && !card.classList.contains('sub-is-deleted');
            });

            if (status === '已確認') {
                let err = [];
                if (!level) err.push("請選擇等級");
                if (!genre) err.push("請選擇文體");
                if (mainText.length === 0) err.push("請輸入文章");
                // 驗證：至少要有一題「未刪除」的子題
                if (activeSubKeys.length === 0) err.push("至少要有一題子題");
                if (err.length > 0) {
                    Swal.fire({ icon: 'error', title: '錯誤', html: err.join('<br>') });
                    return null;
                }
            } else {
                if (mainText.length === 0 && !genre) {
                    Swal.fire({
                        icon: 'warning',
                        title: '提示',
                        text: '請輸入內容'
                    });
                    return null;
                }
            }

            // 收集子題 (包含已刪除的，但在物件中標記)
            const subsData = subKeys.map(uid => {
                const card = document.getElementById(`card-${uid}`);
                const isDeleted = card.classList.contains('sub-is-deleted'); // 判斷是否軟刪除

                // 如果已刪除，我們仍收集資料，但可以跳過必填檢查
                // 或者直接回傳簡易物件告訴後端 update status

                const q = quills.subs[uid];
                const ansSelect = document.getElementById(`ans-select-${uid}`);
                const selectedAns = ansSelect ? ansSelect.value : '';

                // 驗證單一子題 (只驗證未刪除的)
                if (status === '已確認' && !isDeleted) {
                    // 這裡可以加子題內部的防呆 (如 content, ans 必填)
                    if (q.content.getText().trim().length === 0) {
                        // err... 但這裡架構是回傳物件，通常在上方 activeSubKeys 檢查
                    }
                }
                return {
                    content: encodeURIComponent(q.content.root.innerHTML),
                    optA: encodeURIComponent(q.optA.root.innerHTML),
                    optB: encodeURIComponent(q.optB.root.innerHTML),
                    optC: encodeURIComponent(q.optC.root.innerHTML),
                    optD: encodeURIComponent(q.optD.root.innerHTML),
                    ans: selectedAns,
                    explanation: encodeURIComponent(q.explanation.root.innerHTML),
                    isCompleted: card.classList.contains('sub-completed'),

                    // ★ 新增標記：告訴後端這題被刪了
                    isDeleted: isDeleted
                };
            });

            return {
                level: level,
                mainCat: genre,
                difficulty: difficulty,
                propositioner: propositioner,
                content: encodeURIComponent(quills.main.root.innerHTML),
                summary: `${mainText.substring(0, 15)}... (${subsData.length}子題)`,
                subQuestions: subsData
            };
        },

        // --- 內部邏輯 ---
        addSubQuestion: function (data = null, isOpen = false) {
            const container = document.getElementById('sub-questions-container');
            if (!container) return;

            document.getElementById('sub-questions-empty').classList.add('d-none');
            const uid = `sub-${Date.now()}-${subQuestionCounter++}`;
            const currentSeq = container.children.length + 1;

            const card = document.createElement('div');
            card.className = 'card mb-3 sub-question-card shadow-sm border-0';
            card.id = `card-${uid}`;

            // 移除手動完成按鈕
            card.innerHTML = `
                <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center ${isOpen ? '' : 'collapsed'}" 
                        id="header-${uid}"
                        style="cursor: pointer;"
                        data-bs-toggle="collapse" 
                        data-bs-target="#collapse-${uid}" 
                        aria-expanded="${isOpen}" 
                        aria-controls="collapse-${uid}">
                    
                    <div class="d-flex align-items-center gap-2">
                        <img src="ICON/arrow-down.svg" 
                            class="accordion-arrow" 
                            alt="展開/收合"
                            style="width: 16px; height: 16px;">
                        
                        <span class="fw-bold text-primary sub-index-label">子題代碼：${currentSeq}</span>
                        <!-- 完成勾勾圖示 (預設隱藏，由 CSS/JS 控制顯示) -->
                        <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${uid}"></i>
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-outline-danger border-0 z-index-2" 
                                onclick="event.stopPropagation(); Reading_RemoveSub('${uid}')"
                                title="移除子題">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>

                <div id="collapse-${uid}" 
                     class="collapse sub-question-body-collapse ${isOpen ? 'show' : ''} border border-top-0 rounded-bottom" 
                     data-bs-parent="#sub-questions-container">
                    
                    <div class="card-body bg-light">
                        <div class="mb-4">
                            <label class="form-label fw-bold text-dark required-star">子題內容(題目)</label>
                            <div class="quill-master-container border rounded-3 bg-white">
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
                                </div>
                                <div id="q-${uid}-content"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary rounded-bottom-3">
                                    <span>字數：<span class="count-num" id="count-q-${uid}-content">0</span></span>
                                </div>
                            </div>
                        </div>
                        
                        <label class="form-label fw-bold text-secondary mb-2 required-star">選項與正確答案</label>
                        <div class="alert-hint">
                            <i class="bi bi-exclamation-circle-fill"></i>
                            請避免選項長短、語氣明顯差異，以免影響鑑別度
                        </div>
                        <div class="d-flex flex-column gap-2 mb-4">
                            ${['A', 'B', 'C', 'D'].map(opt => generateOptionHTML(uid, opt)).join('')}
                        </div>

                        <!-- 答案選擇區 -->
                        <div class="answer-selector-section">
                            <span class="selector-label"><i class="bi bi-check-circle"></i> 正確答案</span>
                            <select class="answer-dropdown" id="ans-select-${uid}">
                                <option value="">請選擇...</option>
                                <option value="A">選項 A</option>
                                <option value="B">選項 B</option>
                                <option value="C">選項 C</option>
                                <option value="D">選項 D</option>
                            </select>
                            <span class="selector-hint"><i class="bi bi-info-circle me-1"></i>選擇後會在對應選項顯示標記</span>
                        </div>

                        <div class="mb-2 mt-4">
                             <label class="form-label fw-bold text-muted">解析(紀錄答案理由)</label>
                             <div class="quill-master-container border rounded-3 bg-white">
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
                                </div>
                                <div id="q-${uid}-explanation"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary rounded-bottom-3">
                                    <span>字數：<span class="count-num" id="count-q-${uid}-explanation">0</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Init Quills (確保 toolbar 存在)
            const toolbar = window.optionToolbar || [];
            quills.subs[uid] = {
                content: new Quill(`#q-${uid}-content`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '子題敘述...' }),
                optA: new Quill(`#q-${uid}-optA`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 A' }),
                optB: new Quill(`#q-${uid}-optB`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 B' }),
                optC: new Quill(`#q-${uid}-optC`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 C' }),
                optD: new Quill(`#q-${uid}-optD`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 D' }),
                explanation: new Quill(`#q-${uid}-explanation`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '請簡要說明正確答案的判斷依據，並簡述其他選項錯誤原因...' })
            };

            // 綁定子題輔助功能
            if (typeof bindQuillHelpers === 'function') {
                bindQuillHelpers(quills.subs[uid].content, `q-${uid}-content`);
                bindQuillHelpers(quills.subs[uid].optA, `q-${uid}-optA`);
                bindQuillHelpers(quills.subs[uid].optB, `q-${uid}-optB`);
                bindQuillHelpers(quills.subs[uid].optC, `q-${uid}-optC`);
                bindQuillHelpers(quills.subs[uid].optD, `q-${uid}-optD`);
                bindQuillHelpers(quills.subs[uid].explanation, `q-${uid}-explanation`);
            }

            // 綁定自動檢查事件
            const checkFn = () => this.checkCompletion(uid);

            // 監聽所有 Quill 的 text-change
            Object.values(quills.subs[uid]).forEach(q => {
                q.on('text-change', checkFn);
            });

            // 綁定答案下拉選單 change 事件
            const ansSelect = document.getElementById(`ans-select-${uid}`);
            if (ansSelect) {
                ansSelect.addEventListener('change', function () {
                    updateSubCorrectAnswerDisplay(uid, this.value);
                    checkFn();
                });
            }

            // 回填資料
            if (data) {
                const safePaste = (q, html) => {
                    if (!q) return;
                    q.setText('');
                    if (html) q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(html));
                };

                safePaste(quills.subs[uid].content, data.content);
                safePaste(quills.subs[uid].optA, data.optA);
                safePaste(quills.subs[uid].optB, data.optB);
                safePaste(quills.subs[uid].optC, data.optC);
                safePaste(quills.subs[uid].optD, data.optD);
                safePaste(quills.subs[uid].explanation, data.explanation);

                // 回填下拉選單
                if (ansSelect && data.ans) {
                    ansSelect.value = data.ans;
                    updateSubCorrectAnswerDisplay(uid, data.ans);
                }

                // 回填後檢查一次狀態
                checkFn();
            }
        },

        removeSubQuestion: function (uid) {
            Swal.fire({
                title: '確定要移除此子題嗎？',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: '刪除',
                cancelButtonText: '取消'
            }).then((result) => {
                if (result.isConfirmed) {
                    const card = document.getElementById(`card-${uid}`);
                    if (card) {
                        // A. 視覺上隱藏
                        card.classList.add('d-none');

                        // B. 加上刪除標記 (讓 collect 知道它被刪了)
                        card.classList.add('sub-is-deleted');

                        // C. 顯示空狀態提示 (如果全部都刪光了)
                        // 計算「未刪除」的子題數量
                        const container = document.getElementById('sub-questions-container');
                        const visibleCount = container.querySelectorAll('.sub-question-card:not(.sub-is-deleted)').length;
                        if (visibleCount === 0) {
                            document.getElementById('sub-questions-empty').classList.remove('d-none');
                        }
                    }
                }
            });
        },

        checkCompletion: function (uid) {
            const q = quills.subs[uid];
            if (!q) return;

            // 檢查所有編輯器是否有內容 (getText().trim().length > 0)
            // 注意：Quill 空白時預設是 '\n'，長度為 1，所以要 trim
            const hasContent = q.content.getText().trim().length > 0;
            const hasOptA = q.optA.getText().trim().length > 0;
            const hasOptB = q.optB.getText().trim().length > 0;
            const hasOptC = q.optC.getText().trim().length > 0;
            const hasOptD = q.optD.getText().trim().length > 0;
            const hasExp = q.explanation.getText().trim().length > 0;

            // 從下拉選單檢查是否有選答案
            const ansSelect = document.getElementById(`ans-select-${uid}`);
            const hasAns = ansSelect && ansSelect.value !== '';

            const isComplete = hasContent && hasOptA && hasOptB && hasOptC && hasOptD && hasExp && hasAns;

            const card = document.getElementById(`card-${uid}`);
            const cardHeader = document.getElementById(`header-${uid}`);
            const checkIcon = document.getElementById(`check-icon-${uid}`);

            if (isComplete) {
                card.classList.add('sub-completed');
                cardHeader.classList.add('bg-success', 'bg-opacity-10');
                if (checkIcon) checkIcon.classList.remove('d-none');
            } else {
                card.classList.remove('sub-completed');
                cardHeader.classList.remove('bg-success', 'bg-opacity-10');
                if (checkIcon) checkIcon.classList.add('d-none');
            }
        },

        toggleEditable: function (editable) {
            // 1. 鎖定所有編輯器
            if (quills.main) quills.main.enable(editable);
            Object.values(quills.subs).forEach(s => {
                s.content.enable(editable);
                s.optA.enable(editable);
                s.optB.enable(editable);
                s.optC.enable(editable);
                s.optD.enable(editable);
                if (s.explanation) s.explanation.enable(editable);
            });

            // 2. 鎖定「新增子題」按鈕 (直接隱藏)
            const addBtn = document.querySelector('#form-reading button[onclick*="Reading_AddSub"]');
            if (addBtn) addBtn.hidden = !editable;

            // 3. 鎖定每個子題的「移除」按鈕 (直接隱藏)
            const removeBtns = document.querySelectorAll('.sub-remove-btn');
            removeBtns.forEach(btn => btn.hidden = !editable);

            // 4. 鎖定所有輸入框 (包含 Radio, File Input, Select)，但排除命題者
            const formInputs = document.querySelectorAll('#form-reading input, #form-reading select');
            formInputs.forEach(input => {
                if (input.id !== 'rPropositioner') {
                    input.disabled = !editable;
                }
            });
            // 新增：切換標點符號按鈕
            const puncBtns = document.querySelectorAll('#form-reading .punc-btn');
            puncBtns.forEach(btn => {
                btn.disabled = !editable;
            });

            // 答案下拉選單的禁用控制
            const ansSelects = document.querySelectorAll('#form-reading .answer-dropdown');
            ansSelects.forEach(sel => { sel.disabled = !editable; });
        }
    };
})();