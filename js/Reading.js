// js/Reading.js
const ReadingHandler = (function () {
    const quills = { main: null, subs: {} };
    let subQuestionCounter = 0;

    return {
        init: function () {
            // 母題 Quill
            if (document.getElementById('q-reading-main')) {
                quills.main = new window.Quill('#q-reading-main', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '文章內容...' });
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

            if (status === '已確認') {
                let err = [];
                if (!level) err.push("請選擇等級");
                if (!genre) err.push("請選擇文體");
                if (mainText.length === 0) err.push("請輸入文章");
                if (subKeys.length === 0) err.push("至少要有一題子題");
                if (err.length > 0) {
                    Swal.fire({
                        icon: 'error',
                        title: '錯誤',
                        html: err.join('<br>')
                    });
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

            // 收集子題
            const subsData = subKeys.map(uid => {
                const q = quills.subs[uid];
                const card = document.getElementById(`card-${uid}`);
                const ansEl = card.querySelector(`input[type="radio"]:checked`);
                return {
                    content: encodeURIComponent(q.content.root.innerHTML),
                    optA: encodeURIComponent(q.optA.root.innerHTML),
                    optB: encodeURIComponent(q.optB.root.innerHTML),
                    optC: encodeURIComponent(q.optC.root.innerHTML),
                    optD: encodeURIComponent(q.optD.root.innerHTML),
                    ans: ansEl ? ansEl.value : '',
                    explanation: encodeURIComponent(q.explanation.root.innerHTML),
                    isCompleted: card.classList.contains('sub-completed') // 簡單標記是否完成，可選
                };
            });

            return {
                level: level,
                mainCat: genre,
                difficulty: difficulty,
                propositioner: propositioner,
                content: encodeURIComponent(quills.main.root.innerHTML),
                summary: `[閱讀] ${mainText.substring(0, 15)}... (${subsData.length}子題)`,
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
                            <label class="form-label fw-bold text-dark">子題內容(題目)</label>
                            <div id="q-${uid}-content" class="bg-white" style="height:120px"></div>
                        </div>
                        
                        <label class="form-label fw-bold text-secondary mb-2">選項設定</label>
                        <div class="d-flex flex-column gap-2 mb-4">
                            ${['A', 'B', 'C', 'D'].map(opt => `
                                <div class="card option-card shadow-sm mb-2">
                                    <label class="option-header-styled w-100" for="radio-${uid}-${opt}">
                                        
                                        <div class="form-check m-0 d-flex align-items-center gap-2">
                                            <input class="form-check-input" type="radio" 
                                                name="ans-${uid}" 
                                                value="${opt}" 
                                                id="radio-${uid}-${opt}" 
                                                style="cursor:pointer">
                                            
                                            <span class="small text-secondary fw-bold" style="cursor:pointer">
                                                設為正確答案
                                            </span>
                                        </div>

                                        <span class="badge bg-light text-secondary border">選項 ${opt}</span>
                                    </label>
                                    
                                    <div style="border-top: 1px solid #eee;">
                                        <div id="q-${uid}-opt${opt}" style="height:150px;"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="mb-2">
                             <label class="form-label fw-bold text-muted">解析(紀錄答案理由)</label>
                             <div id="q-${uid}-explanation" class="bg-white" style="height:120px"></div>
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
                explanation: new Quill(`#q-${uid}-explanation`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '請輸入解析...' })
            };

            // 綁定自動檢查事件
            const checkFn = () => this.checkCompletion(uid);

            // 監聽所有 Quill 的 text-change
            Object.values(quills.subs[uid]).forEach(q => {
                q.on('text-change', checkFn);
            });

            // 監聽 Radio change (使用事件代理或直接綁定)
            const radios = card.querySelectorAll(`input[name="ans-${uid}"]`);
            radios.forEach(radio => {
                radio.addEventListener('change', checkFn);
            });

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

                const radio = card.querySelector(`input[value="${data.ans}"]`);
                if (radio) radio.checked = true;

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
                    if (card) card.remove();
                    delete quills.subs[uid];

                    // 檢查空狀態
                    const container = document.getElementById('sub-questions-container');
                    if (container && container.children.length === 0) {
                        document.getElementById('sub-questions-empty').classList.remove('d-none');
                    } else {
                        // 移除後重新排序流水號 (1, 2, 3...)
                        this.reindexSubQuestions();
                    }
                }
            });
        },

        reindexSubQuestions: function () {
            const labels = document.querySelectorAll('.sub-index-label');
            labels.forEach((label, index) => {
                label.innerText = `子題代碼：${index + 1}`;
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

            // 檢查是否選取答案
            const card = document.getElementById(`card-${uid}`);
            const hasAns = card.querySelector(`input[name="ans-${uid}"]:checked`) !== null;

            const isComplete = hasContent && hasOptA && hasOptB && hasOptC && hasOptD && hasExp && hasAns;

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

        // 切換選項編輯器顯示/隱藏 (簡單的 JS toggle)
        toggleOptionBody: function (containerId) {
            const el = document.getElementById(containerId);
            if (el) {
                if (el.style.display === 'none') {
                    el.style.display = 'block';
                } else {
                    el.style.display = 'none';
                }
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
        }
    };
})();