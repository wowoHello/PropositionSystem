// js/ListenGroup.js
const ListenGroupHandler = (function () {
    const quills = {
        main: null,
        subs: {} // 存放子題的 Quill (結構: { 'lgsub-0': {content, optA, optB, optC, optD, explanation}, ... })
    };

    // 定義兩題子題的固定規格
    const subConfigs = [
        {
            index: 0,
            title: "第一小題 (難度三)",
            level: "難度三",
            cores: ["推斷訊息"],
            indicators: ["推斷訊息邏輯性", "能掌握語意轉折", "能推斷語意變化"]
        },
        {
            index: 1,
            title: "第二小題 (難度四)",
            level: "難度四",
            cores: ["歸納分析訊息", "區辨詞語多義性"],
            indicators: ["歸納或總結訊息內容", "分解或辨析訊息內容", "區辨詞語的多義性"]
        }
    ];

    // 更新子題選項卡片的正確答案標示
    function updateSubCorrectAnswerDisplay(uid, selectedValue) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`lgOptCard-${uid}-${opt}`);
            if (card) {
                if (opt === selectedValue) {
                    card.classList.add('is-correct-answer');
                } else {
                    card.classList.remove('is-correct-answer');
                }
            }
        });

        const dropdown = document.getElementById(`lg-ans-select-${uid}`);
        if (dropdown) {
            if (selectedValue) {
                dropdown.classList.add('has-answer');
            } else {
                dropdown.classList.remove('has-answer');
            }
        }
    }

    // 產生選項 HTML
    function generateOptionHTML(uid, opt) {
        return `
            <div class="card option-card mb-2" id="lgOptCard-${uid}-${opt}" data-option="${opt}">
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
            // 1. 初始化母題 Quill
            if (document.getElementById('q-listengroup-content')) {
                quills.main = new Quill('#q-listengroup-content', {
                    theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '請輸入語音內容...'
                });

                if (typeof bindQuillHelpers === 'function') {
                    bindQuillHelpers(quills.main, 'q-listengroup-content');
                }
            }
            // 移除全域解析初始化

            // 2. 自動生成 2 個固定子題
            this.renderFixedSubQuestions();
        },

        renderFixedSubQuestions: function () {
            const container = document.getElementById('listengroup-sub-container');
            if (!container) return;

            // 避免重複生成
            if (container.children.length > 0) return;

            subConfigs.forEach((config, idx) => { // Adding idx for sub-code
                const uid = `lgsub-${config.index}`; // 使用 lgsub-0, lgsub-1 作為 ID
                const subCode = idx + 1; // 子題代碼 1, 2

                const card = document.createElement('div');
                card.className = 'card mb-3 sub-question-card shadow-sm border-0';
                // ID for collapse functionality
                const collapseId = `collapse-${uid}`;
                const headerId = `header-${uid}`;

                // Accordion Header
                // 參考 Reading.js 的 Header 結構，加入 子題代碼
                card.innerHTML = `
                    <div class="card-header sub-accordion-btn bg-white border d-flex justify-content-between align-items-center collapsed" 
                            id="${headerId}"
                            style="cursor: pointer;"
                            data-bs-toggle="collapse" 
                            data-bs-target="#${collapseId}" 
                            aria-expanded="false" 
                            aria-controls="${collapseId}">
                        
                        <div class="d-flex align-items-center gap-2">
                             <img src="ICON/arrow-down.svg" 
                                class="accordion-arrow" 
                                style="width: 16px; height: 16px;">
                            <span class="fw-bold text-primary sub-index-label">子題代碼：${subCode}</span>
                            <span class="badge bg-light text-secondary border ms-2">${config.title}</span>
                             <i class="bi bi-check-circle-fill text-success ms-2 d-none" id="check-icon-${uid}"></i>
                        </div>
                    </div>

                    <div id="${collapseId}" class="collapse sub-question-body-collapse border border-top-0 rounded-bottom" data-bs-parent="#listengroup-sub-container">
                        <div class="card-body bg-light">
                            <!-- Metadata Row -->
                            <div class="row g-2 mb-3">
                                <div class="col-md-3">
                                    <label class="form-label fw-bold small text-secondary">難度 (固定)</label>
                                    <input type="text" class="form-control form-control-sm readonly-field" value="${config.level}" disabled readonly>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-secondary required-star">核心能力</label>
                                    <select class="form-select form-select-sm" id="lg-core-${uid}">
                                        <option value="">請選擇...</option>
                                        ${config.cores.map(c => `<option value="${c}">${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label fw-bold small text-secondary required-star">細目指標</label>
                                    <select class="form-select form-select-sm" id="lg-ind-${uid}">
                                        <option value="">請選擇...</option>
                                        ${config.indicators.map(i => `<option value="${i}">${i}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="form-label fw-bold text-dark required-star">題目</label>
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
                                    <div id="q-${uid}-content"></div>
                                    <div class="word-count-bar d-flex justify-content-between align-items-center p-2 border-top bg-light small text-secondary rounded-bottom-3">
                                        <span>字數：<span class="count-num" id="count-q-${uid}-content">0</span></span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Options Section (Updated styling to match Reading.js somewhat but keep user request) -->
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
                                <select class="answer-dropdown" id="lg-ans-select-${uid}">
                                    <option value="">請選擇...</option>
                                    <option value="A">選項 A</option>
                                    <option value="B">選項 B</option>
                                    <option value="C">選項 C</option>
                                    <option value="D">選項 D</option>
                                </select>
                                <span class="selector-hint"><i class="bi bi-info-circle me-1"></i>選擇後會在對應選項顯示標記</span>
                            </div>

                            <!-- Explanation Section (Moved here from global) -->
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

                // Init Quills for this sub-question
                const toolbar = window.optionToolbar || [];
                quills.subs[uid] = {
                    content: new Quill(`#q-${uid}-content`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '請輸入題目...' }),
                    optA: new Quill(`#q-${uid}-optA`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 A' }),
                    optB: new Quill(`#q-${uid}-optB`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 B' }),
                    optC: new Quill(`#q-${uid}-optC`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 C' }),
                    optD: new Quill(`#q-${uid}-optD`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '選項 D' }),
                    explanation: new Quill(`#q-${uid}-explanation`, { theme: 'snow', modules: { toolbar: toolbar }, placeholder: '請輸入試題解析與答案理由...' })
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

                // 綁定答案下拉選單 change 事件
                const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
                if (ansSelect) {
                    ansSelect.addEventListener('change', function () {
                        updateSubCorrectAnswerDisplay(uid, this.value);
                        checkFn();
                    });
                }

                // Events
                const checkFn = () => this.checkCompletion(uid);
                Object.values(quills.subs[uid]).forEach(q => q.on('text-change', checkFn));
                const radios = card.querySelectorAll(`input[name="ans-${uid}"]`);
                radios.forEach(r => r.addEventListener('change', checkFn));
                document.getElementById(`lg-core-${uid}`).addEventListener('change', checkFn);
                document.getElementById(`lg-ind-${uid}`).addEventListener('change', checkFn);
            });
        },

        checkCompletion: function (uid) {
            const q = quills.subs[uid];
            if (!q) return;
            const hasContent = q.content.getText().trim().length > 0;
            const hasExp = q.explanation.getText().trim().length > 0;
            // 檢查選項
            const hasOptA = q.optA.getText().trim().length > 0;
            const hasOptB = q.optB.getText().trim().length > 0;
            const hasOptC = q.optC.getText().trim().length > 0;
            const hasOptD = q.optD.getText().trim().length > 0;

            const headerBtn = document.querySelector(`[data-bs-target="#collapse-${uid}"]`);
            const checkIcon = headerBtn ? headerBtn.querySelector('.bi-check-circle-fill') : null;

            // 從下拉選單檢查答案
            const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
            const hasAns = ansSelect && ansSelect.value !== '';

            const coreVal = document.getElementById(`lg-core-${uid}`).value;
            const indVal = document.getElementById(`lg-ind-${uid}`).value;

            const isComplete = hasContent && hasExp && hasOptA && hasOptB && hasOptC && hasOptD && hasAns && coreVal && indVal;

            if (headerBtn) {
                if (isComplete) {
                    headerBtn.classList.add('bg-success', 'bg-opacity-10');
                    if (checkIcon) checkIcon.classList.remove('d-none');
                } else {
                    headerBtn.classList.remove('bg-success', 'bg-opacity-10');
                    if (checkIcon) checkIcon.classList.add('d-none');
                }
            }
        },

        clear: function () {
            // 清空基本資料
            document.getElementById('lgLevel').value = '';
            document.getElementById('lgVoiceType').value = '';
            document.getElementById('lgMaterial').value = '';

            const userNameEl = document.querySelector('.user-name');
            const propInput = document.getElementById('lgPropositioner');
            if (propInput && userNameEl) propInput.value = userNameEl.innerText.trim();

            // 附檔
            const attachInput = document.getElementById('lgAttachment');
            const attachLabel = document.getElementById('lgAttachmentName');
            if (attachInput) attachInput.value = '';
            if (attachLabel) {
                attachLabel.innerText = '';
                attachLabel.classList.add('d-none');
            }

            // 清空母題 Quill
            if (quills.main) quills.main.setText('');
            // GLOBAL EXPLANATION REMOVED

            // 清空子題 (2題)
            subConfigs.forEach(config => {
                const uid = `lgsub-${config.index}`;
                // 清空 Quill
                if (quills.subs[uid]) {
                    Object.values(quills.subs[uid]).forEach(q => q.setText(''));
                }

                document.getElementById(`lg-core-${uid}`).value = '';
                document.getElementById(`lg-ind-${uid}`).value = '';

                // 清空下拉選單並重置視覺標示
                const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
                if (ansSelect) {
                    ansSelect.value = '';
                    updateSubCorrectAnswerDisplay(uid, '');
                }

                const checkIcon = document.getElementById(`check-icon-${uid}`);
                if (checkIcon) checkIcon.classList.add('d-none');
                const header = document.getElementById(`header-${uid}`);
                if (header) header.classList.remove('bg-success', 'bg-opacity-10');
            });

            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            document.getElementById('lgLevel').value = data.level || '';
            document.getElementById('lgVoiceType').value = data.subCat || ''; // 這裡 subCat 存語音類型
            document.getElementById('lgMaterial').value = data.material || '';

            const propInput = document.getElementById('lgPropositioner');
            if (propInput) {
                propInput.value = data.propositioner || (document.querySelector('.user-name')?.innerText.trim() || '系統管理員');
            }

            // 附檔
            const attachLabel = document.getElementById('lgAttachmentName');
            if (attachLabel) {
                if (data.attachment) {
                    attachLabel.innerHTML = `<i class="bi bi-paperclip"></i> 目前檔案：${data.attachment}`;
                    attachLabel.classList.remove('d-none');
                } else {
                    attachLabel.classList.add('d-none');
                }
            }

            // 母題內容
            const safePaste = (q, html) => {
                if (!q) return;
                q.setText('');
                if (html) q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(html));
            };

            safePaste(quills.main, data.content);

            // 子題回填
            if (data.subQuestions && data.subQuestions.length > 0) {
                data.subQuestions.forEach((sub, idx) => {
                    const uid = `lgsub-${idx}`;
                    // 確保該子題 Quill 存在 (以防萬一)
                    if (quills.subs[uid]) {
                        document.getElementById(`lg-core-${uid}`).value = sub.core || '';
                        document.getElementById(`lg-ind-${uid}`).value = sub.indicator || '';

                        safePaste(quills.subs[uid].content, sub.content);
                        safePaste(quills.subs[uid].optA, sub.optA);
                        safePaste(quills.subs[uid].optB, sub.optB);
                        safePaste(quills.subs[uid].optC, sub.optC);
                        safePaste(quills.subs[uid].optD, sub.optD);
                        safePaste(quills.subs[uid].explanation, sub.explanation);

                        // 回填下拉選單
                        const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
                        if (ansSelect && sub.ans) {
                            ansSelect.value = sub.ans;
                            updateSubCorrectAnswerDisplay(uid, sub.ans);
                        }

                        this.checkCompletion(uid);
                    }
                });
            }

            this.toggleEditable(!isViewMode);
        },

        collect: function (status) {
            const level = document.getElementById('lgLevel').value;
            const voiceType = document.getElementById('lgVoiceType').value;
            const material = document.getElementById('lgMaterial').value;
            const propositioner = document.getElementById('lgPropositioner').value;
            const contentText = quills.main.getText().trim();

            // 附檔
            const attachInput = document.getElementById('lgAttachment');
            let attachName = '';
            if (attachInput && attachInput.files.length > 0) {
                attachName = attachInput.files[0].name;
            } else {
                const attachLabel = document.getElementById('lgAttachmentName');
                if (attachLabel && !attachLabel.classList.contains('d-none')) {
                    attachName = attachLabel.innerText.replace(' 目前檔案：', '').trim();
                }
            }

            // 收集兩題子題
            let subsData = [];
            let err = [];

            subConfigs.forEach(config => {
                const uid = `lgsub-${config.index}`;
                const core = document.getElementById(`lg-core-${uid}`).value;
                const ind = document.getElementById(`lg-ind-${uid}`).value;
                // 從下拉選單取得答案
                const ansSelect = document.getElementById(`lg-ans-select-${uid}`);
                const selectedAns = ansSelect ? ansSelect.value : '';

                const qObj = quills.subs[uid];
                const qText = qObj.content.getText().trim();

                // 驗證子題
                if (status === '已確認') {
                    if (!core) err.push(`[${config.title}] 請選擇核心能力`);
                    if (!ind) err.push(`[${config.title}] 請選擇細目指標`);
                    if (qText.length === 0) err.push(`[${config.title}] 請輸入題目內容`);
                    if (!selectedAns) err.push(`[${config.title}] 請設定正確答案`);
                }

                subsData.push({
                    level: config.level,
                    core: core,
                    indicator: ind,
                    content: encodeURIComponent(qObj.content.root.innerHTML),
                    optA: encodeURIComponent(qObj.optA.root.innerHTML),
                    optB: encodeURIComponent(qObj.optB.root.innerHTML),
                    optC: encodeURIComponent(qObj.optC.root.innerHTML),
                    optD: encodeURIComponent(qObj.optD.root.innerHTML),
                    explanation: encodeURIComponent(qObj.explanation.root.innerHTML),
                    ans: selectedAns
                });
            });

            // 驗證母題
            if (status === '已確認') {
                if (!level) err.push("請選擇適用等級");
                if (!voiceType) err.push("請選擇語音類型");
                if (!material) err.push("請選擇素材分類");
                if (contentText.length === 0) err.push("請輸入語音內容...");

                if (err.length > 0) {
                    Swal.fire({ icon: 'error', title: '錯誤', html: err.join('<br>') });
                    return null;
                }
            } else {
                if (contentText.length === 0 && !voiceType) {
                    Swal.fire({ icon: 'warning', title: '提示', text: '請至少輸入語音內容或選擇類型' });
                    return null;
                }
            }

            return {
                mainCat: '聽力題組',
                subCat: voiceType, // 語音類型
                level: level,
                material: material,
                propositioner: propositioner,
                content: encodeURIComponent(quills.main.root.innerHTML),
                attachment: attachName,
                summary: contentText.substring(0, 15) + '...',
                subQuestions: subsData
            };
        },

        toggleEditable: function (editable) {
            if (quills.main) quills.main.enable(editable);
            // GLOBAL EXPLANATION REMOVED

            // 子題 Quill 與 下拉
            subConfigs.forEach(config => {
                const uid = `lgsub-${config.index}`;
                if (quills.subs[uid]) {
                    Object.values(quills.subs[uid]).forEach(q => q.enable(editable));
                }
                // 鎖定子題的下拉
                document.getElementById(`lg-core-${uid}`).disabled = !editable;
                document.getElementById(`lg-ind-${uid}`).disabled = !editable;

                // 答案下拉選單的禁用控制
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
            puncBtns.forEach(btn => { btn.disabled = !editable; });
        }
    };
})();