// js/ShortArticle.js
const ShortArticleHandler = (function () {
    const quills = { main: null, subs: {} };
    let subQuestionCounter = 0;

    // 定義向度與能力指標資料
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

    return {
        init: function () {
            // 母題 Quill
            if (document.getElementById('q-short-main')) {
                quills.main = new window.Quill('#q-short-main', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '請輸入文章內容...' });

                if (typeof bindQuillHelpers === 'function') {
                    bindQuillHelpers(quills.main, 'q-short-main');
                }
            }

            // 綁定全域新增子題函式
            window.Short_AddSub = () => this.addSubQuestion(null, false);
            window.Short_RemoveSub = (uid) => this.removeSubQuestion(uid);
        },

        clear: function () {
            // 固定欄位
            document.getElementById('sMainCat').value = '文義判讀';
            document.getElementById('sSubCat').value = '篇章辨析';

            document.getElementById('sLevel').value = '';
            document.getElementById('sDifficulty').value = '';
            document.getElementById('sGenre').value = '';
            document.getElementById('sTopic').value = '';

            // 同步命題者
            const userNameEl = document.querySelector('.user-name');
            const propInput = document.getElementById('sPropositioner');
            if (propInput && userNameEl) {
                propInput.value = userNameEl.innerText.trim();
            }

            // 清空附檔
            const attachInput = document.getElementById('sAttachment');
            const attachLabel = document.getElementById('sAttachmentName');
            if (attachInput) attachInput.value = '';
            if (attachLabel) {
                attachLabel.innerText = '';
                attachLabel.classList.add('d-none');
            }

            if (quills.main) quills.main.setText('');

            document.getElementById('short-sub-container').innerHTML = '';
            document.getElementById('short-sub-empty').classList.remove('d-none');
            quills.subs = {};

            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            document.getElementById('sMainCat').value = '文義判讀';
            document.getElementById('sSubCat').value = '篇章辨析';
            document.getElementById('sLevel').value = data.level || '';
            document.getElementById('sDifficulty').value = data.difficulty || '';
            document.getElementById('sGenre').value = data.subType || ''; // 這裡用 subType 存語體文等
            document.getElementById('sTopic').value = data.topic || '';

            const propInput = document.getElementById('sPropositioner');
            if (propInput) {
                propInput.value = data.propositioner || (document.querySelector('.user-name')?.innerText.trim() || '系統管理員');
            }

            // 回填附檔顯示文字
            const attachLabel = document.getElementById('sAttachmentName');
            if (attachLabel) {
                if (data.attachment) {
                    attachLabel.innerHTML = `<i class="bi bi-paperclip"></i> 目前檔案：${data.attachment}`;
                    attachLabel.classList.remove('d-none');
                } else {
                    attachLabel.innerText = '';
                    attachLabel.classList.add('d-none');
                }
            }

            if (quills.main) {
                quills.main.setText('');
                if (data.content) quills.main.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(data.content));
            }

            document.getElementById('short-sub-container').innerHTML = '';
            quills.subs = {};

            if (data.subQuestions && data.subQuestions.length > 0) {
                document.getElementById('short-sub-empty').classList.add('d-none');
                data.subQuestions.forEach(sub => this.addSubQuestion(sub, false));
            } else {
                document.getElementById('short-sub-empty').classList.remove('d-none');
            }

            this.toggleEditable(!isViewMode);
        },

        collect: function (status) {
            const level = document.getElementById('sLevel').value;
            const difficulty = document.getElementById('sDifficulty').value;
            const genre = document.getElementById('sGenre').value;
            const topic = document.getElementById('sTopic').value.trim();
            const propositioner = document.getElementById('sPropositioner').value;
            const mainText = quills.main.getText().trim();
            const contentHTML = quills.main.root.innerHTML;

            // 處理附檔
            const attachInput = document.getElementById('sAttachment');
            let attachName = '';
            if (attachInput && attachInput.files.length > 0) {
                attachName = attachInput.files[0].name;
            } else {
                const attachLabel = document.getElementById('sAttachmentName');
                if (attachLabel && !attachLabel.classList.contains('d-none')) {
                    attachName = attachLabel.innerText.replace(' 目前檔案：', '').trim();
                }
            }

            const subKeys = Object.keys(quills.subs);

            // 篩選有效子題
            const activeSubKeys = subKeys.filter(uid => {
                const card = document.getElementById(`card-${uid}`);
                return card && !card.classList.contains('sub-is-deleted');
            });

            if (status === '已確認') {
                let err = [];
                if (!level) err.push("請選擇等級");
                if (!genre) err.push("請選擇文體");
                if (topic.length === 0) err.push("請輸入題目");
                if (mainText.length === 0) err.push("請輸入內容");
                // 只檢查有效子題
                if (activeSubKeys.length === 0) err.push("至少要有一題子題");
                if (err.length > 0) {
                    Swal.fire({ icon: 'error', title: '錯誤', html: err.join('<br>') });
                    return null;
                }
            } else {
                if (mainText.length === 0 && topic.length === 0) {
                    Swal.fire({ icon: 'warning', title: '提示', text: '請至少輸入題目或內容' });
                    return null;
                }
            }

            const subsData = subKeys.map(uid => {
                const q = quills.subs[uid];
                const card = document.getElementById(`card-${uid}`);
                const isDeleted = card.classList.contains('sub-is-deleted');

                // 抓取 Metadata
                const dimEl = document.getElementById(`dim-${uid}`);
                const indEl = document.getElementById(`ind-${uid}`);
                const scoreEl = document.getElementById(`score-${uid}`);

                return {
                    dimension: dimEl ? dimEl.value : '',
                    indicator: indEl ? indEl.value : '',
                    score: scoreEl ? scoreEl.value : '',
                    content: encodeURIComponent(q.content.root.innerHTML),
                    optA: '',
                    optB: '',
                    optC: '',
                    optD: '',
                    ans: '',
                    explanation: encodeURIComponent(q.explanation.root.innerHTML),
                    isCompleted: card.classList.contains('sub-completed'),
                    isDeleted: isDeleted // 加上刪除標記
                };
            });

            return {
                mainCat: '文義判讀',
                subCat: '篇章辨析',
                subType: genre, // 文體 (文言文/應用文/語體文)
                level: level,
                difficulty: difficulty,
                propositioner: propositioner,
                topic: topic,
                attachment: attachName,
                content: encodeURIComponent(contentHTML),
                summary: topic,
                subQuestions: subsData
            };
        },

        addSubQuestion: function (data = null, isOpen = false) {
            const container = document.getElementById('short-sub-container');
            if (!container) return;

            document.getElementById('short-sub-empty').classList.add('d-none');
            const uid = `ssub-${Date.now()}-${subQuestionCounter++}`;
            const currentSeq = container.children.length + 1;

            const card = document.createElement('div');
            card.className = 'card mb-3 sub-question-card shadow-sm border-0';
            card.id = `card-${uid}`;

            card.innerHTML = `
                <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center ${isOpen ? '' : 'collapsed'}" 
                        id="header-${uid}"
                        style="cursor: pointer;"
                        data-bs-toggle="collapse" 
                        data-bs-target="#collapse-${uid}" 
                        aria-expanded="${isOpen}" 
                        aria-controls="collapse-${uid}">
                    
                    <div class="d-flex align-items-center gap-2">
                        <img src="ICON/arrow-down.svg" class="accordion-arrow" style="width: 16px; height: 16px;">
                        <span class="fw-bold text-primary sub-index-label">子題代碼：${currentSeq}</span>
                        <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${uid}"></i>
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-outline-danger border-0 sub-remove-btn" 
                                onclick="event.stopPropagation(); Short_RemoveSub('${uid}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>

                <div id="collapse-${uid}" class="collapse sub-question-body-collapse ${isOpen ? 'show' : ''} border border-top-0 rounded-bottom" data-bs-parent="#short-sub-container">
                    <div class="card-body bg-light">
                        <!-- Metadata Row (Dimension, Indicator, Score) -->
                        <div class="row g-2 mb-3">
                            <div class="col-md-4">
                                <label class="form-label fw-bold small text-secondary required-star">主向度</label>
                                <select class="form-select form-select-sm" id="dim-${uid}">
                                    <option value="">請選擇...</option>
                                    ${Object.keys(dimensionData).map(k => `<option value="${k}">${k}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-5">
                                <label class="form-label fw-bold small text-secondary required-star">能力指標</label>
                                <select class="form-select form-select-sm" id="ind-${uid}" disabled>
                                    <option value="">請先選擇主向度</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label fw-bold small text-secondary required-star">記分</label>
                                <input type="number" class="form-control form-control-sm" id="score-${uid}" placeholder="分數">
                            </div>
                        </div>

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
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="「」"
                                    data-back="1">「」</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="『』"
                                    data-back="1">『』</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="（）"
                                    data-back="1">（）</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="【】"
                                    data-back="1">【】</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn"
                                    data-char="……">……</button>
                                </div>
                                <div id="qs-${uid}-content"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary rounded-bottom-3">
                                    <span>字數：<span class="count-num" id="count-qs-${uid}-content">0</span></span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 選項設定已移除 -->

                        <div class="mb-2">
                             <label class="form-label fw-bold text-muted">批說(可略)</label>
                             <div class="quill-master-container border rounded-3 bg-white">
                                <div class="punctuation-toolbar d-flex flex-wrap gap-2 p-2 border-bottom bg-light rounded-top-3">
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="，">，</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="。">。</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="、">、</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="？">？</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="！">！</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="：">：</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="；">；</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="「」"
                                    data-back="1">「」</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="『』"
                                    data-back="1">『』</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="（）"
                                    data-back="1">（）</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn" data-char="【】"
                                    data-back="1">【】</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary punc-btn"
                                    data-char="……">……</button>
                                </div>
                                <div id="qs-${uid}-explanation"></div>
                                <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary rounded-bottom-3">
                                    <span>字數：<span class="count-num" id="count-qs-${uid}-explanation">0</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Init Quills
            const toolbar = window.optionToolbar || [];
            quills.subs[uid] = {
                content: new Quill(`#qs-${uid}-content`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '子題敘述...' }),
                explanation: new Quill(`#qs-${uid}-explanation`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '請輸入批說...' })
            };

            if (typeof bindQuillHelpers === 'function') {
                bindQuillHelpers(quills.subs[uid].content, `qs-${uid}-content`);
                bindQuillHelpers(quills.subs[uid].explanation, `qs-${uid}-explanation`);
            }

            // 綁定 Cascading Dropdown
            const dimSelect = document.getElementById(`dim-${uid}`);
            const indSelect = document.getElementById(`ind-${uid}`);

            dimSelect.addEventListener('change', function () {
                const val = this.value;
                indSelect.innerHTML = '<option value="">請選擇...</option>';
                if (val && dimensionData[val]) {
                    indSelect.disabled = false;
                    dimensionData[val].forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item;
                        opt.textContent = item;
                        indSelect.appendChild(opt);
                    });
                } else {
                    indSelect.disabled = true;
                    indSelect.innerHTML = '<option value="">請先選擇主向度</option>';
                }
            });

            // 綁定自動檢查
            const checkFn = () => this.checkCompletion(uid);
            Object.values(quills.subs[uid]).forEach(q => q.on('text-change', checkFn));
            dimSelect.addEventListener('change', checkFn);
            indSelect.addEventListener('change', checkFn);
            document.getElementById(`score-${uid}`).addEventListener('input', checkFn);

            // 回填資料
            if (data) {
                const safePaste = (q, html) => {
                    if (!q) return;
                    q.setText('');
                    if (html) q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(html));
                };

                safePaste(quills.subs[uid].content, data.content);
                safePaste(quills.subs[uid].explanation, data.explanation);

                // 回填 Metadata
                if (data.dimension) {
                    dimSelect.value = data.dimension;
                    dimSelect.dispatchEvent(new Event('change')); // 觸發連動
                    if (data.indicator) indSelect.value = data.indicator;
                }
                if (data.score) document.getElementById(`score-${uid}`).value = data.score;

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
                        card.classList.add('d-none');
                        card.classList.add('sub-is-deleted'); // 標記刪除

                        const container = document.getElementById('short-sub-container');
                        const visibleCount = container.querySelectorAll('.sub-question-card:not(.sub-is-deleted)').length;
                        if (visibleCount === 0) {
                            document.getElementById('short-sub-empty').classList.remove('d-none');
                        }
                    }
                }
            });
        },

        checkCompletion: function (uid) {
            const q = quills.subs[uid];
            if (!q) return;

            const hasContent = q.content.getText().trim().length > 0;

            // Metadata check
            const dimVal = document.getElementById(`dim-${uid}`).value;
            const indVal = document.getElementById(`ind-${uid}`).value;
            const scoreVal = document.getElementById(`score-${uid}`).value;
            const hasMeta = dimVal && indVal && scoreVal;

            const isComplete = hasContent && hasMeta;

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
            if (quills.main) quills.main.enable(editable);

            Object.values(quills.subs).forEach(s => {
                s.content.enable(editable);
                s.explanation.enable(editable);
            });

            // 按鈕
            const addBtn = document.querySelector('#form-shortarticle button[onclick*="Short_AddSub"]');
            if (addBtn) addBtn.hidden = !editable;

            document.querySelectorAll('#form-shortarticle .sub-remove-btn').forEach(btn => btn.hidden = !editable);

            // Inputs
            const inputs = document.querySelectorAll('#form-shortarticle input, #form-shortarticle select');
            inputs.forEach(input => {
                // 固定欄位永遠鎖定
                if (['sPropositioner', 'sMainCat', 'sSubCat'].includes(input.id)) {
                    input.disabled = true;
                } else {
                    input.disabled = !editable;
                }
            });

            // 特別處理：如果是在 Edit Mode，能力指標要看主向度是否有值
            if (editable) {
                Object.keys(quills.subs).forEach(uid => {
                    const dimVal = document.getElementById(`dim-${uid}`).value;
                    const indSel = document.getElementById(`ind-${uid}`);
                    if (!dimVal) indSel.disabled = true;
                });
            }

            const puncBtns = document.querySelectorAll('#form-shortarticle .punc-btn');
            puncBtns.forEach(btn => {
                btn.disabled = !editable;
            });
        }
    };
})();
