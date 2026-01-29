// js/Listen.js
const ListenHandler = (function () {
    const quills = {
        content: null,
        optA: null, optB: null, optC: null, optD: null,
        explanation: null,
        refAnswer: null
    };

    // 定義難度與指標的對照表
    const levelData = {
        "難度一": {
            cores: ["提取訊息"],
            indicators: ["提取對話與訊息主旨", "回應訊息內容", "轉述訊息內容"]
        },
        "難度二": {
            cores: ["理解訊息"],
            indicators: ["理解訊息意圖或細節", "理解說話者語氣或態度變化", "理解慣用語的意義"]
        },
        "難度三": {
            cores: ["推斷訊息"],
            indicators: ["推斷訊息邏輯性", "能掌握語意轉折", "能推斷語意變化"]
        },
        "難度四": {
            cores: ["歸納分析訊息", "區辨詞語多義性"],
            indicators: ["歸納或總結訊息內容", "分解或辨析訊息內容", "區辨詞語的多義性"]
        },
        "難度五": {
            cores: ["統整、闡述或評鑑訊息", "思辨、推衍訊息"],
            indicators: ["摘要、條列、統整訊息關鍵字、要點、主旨", "闡述訊息涵義或評鑑訊息適切性", "思辨、推衍訊息言外意、抽象義"]
        }
    };

    // 更新選項卡片的正確答案標示
    function updateCorrectAnswerDisplay(selectedValue) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const card = document.getElementById(`liOptionCard${opt}`);
            if (card) {
                if (opt === selectedValue) {
                    card.classList.add('is-correct-answer');
                } else {
                    card.classList.remove('is-correct-answer');
                }
            }
        });

        const dropdown = document.getElementById('liCorrectAnswer');
        if (dropdown) {
            if (selectedValue) {
                dropdown.classList.add('has-answer');
            } else {
                dropdown.classList.remove('has-answer');
            }
        }
    }

    return {
        init: function () {
            // 1. 初始化 Quill 編輯器
            // 語音內容
            if (document.getElementById('q-listen-content')) {
                quills.content = new Quill('#q-listen-content', {
                    theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '請輸入語音內容...'
                });
                if (typeof bindQuillHelpers === 'function') bindQuillHelpers(quills.content, 'q-listen-content');
            }

            // 解析
            if (document.getElementById('q-listen-explanation')) {
                quills.explanation = new Quill('#q-listen-explanation', {
                    theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '請簡要說明正確答案的判斷依據，並簡述其他選項錯誤原因...'
                });
                if (typeof bindQuillHelpers === 'function') bindQuillHelpers(quills.explanation, 'q-listen-explanation');
            }

            // 參考答案 (隱藏欄位)
            if (document.getElementById('q-listen-ref-answer')) {
                quills.refAnswer = new Quill('#q-listen-ref-answer', {
                    theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '請輸入參考答案...'
                });
                if (typeof bindQuillHelpers === 'function') bindQuillHelpers(quills.refAnswer, 'q-listen-ref-answer');
            }

            // 選項 A-D
            ['A', 'B', 'C', 'D'].forEach(opt => {
                if (document.getElementById(`q-listen-opt${opt}`)) {
                    quills[`opt${opt}`] = new Quill(`#q-listen-opt${opt}`, {
                        theme: 'snow', modules: { toolbar: window.optionToolbar }, placeholder: `選項 ${opt}`
                    });
                    if (typeof bindQuillHelpers === 'function') bindQuillHelpers(quills[`opt${opt}`], `q-listen-opt${opt}`);
                }
            });

            // 2. 綁定難度連動事件
            const levelSelect = document.getElementById('liLevel');
            const coreSelect = document.getElementById('liCore');
            const indSelect = document.getElementById('liIndicator');
            const refDiv = document.getElementById('div-ref-answer');

            if (levelSelect) {
                levelSelect.addEventListener('change', function () {
                    const val = this.value;
                    coreSelect.innerHTML = '<option value="">請選擇...</option>';
                    indSelect.innerHTML = '<option value="">請選擇...</option>';

                    // 控制難度五的參考答案欄位顯示
                    if (val === '難度五') {
                        refDiv.classList.remove('d-none');
                    } else {
                        refDiv.classList.add('d-none');
                    }

                    if (val && levelData[val]) {
                        coreSelect.disabled = false;
                        indSelect.disabled = false;
                        levelData[val].cores.forEach(c => coreSelect.add(new Option(c, c)));
                        levelData[val].indicators.forEach(i => indSelect.add(new Option(i, i)));
                    } else {
                        coreSelect.disabled = true;
                        indSelect.disabled = true;
                        coreSelect.innerHTML = '<option value="">請先選擇難度</option>';
                        indSelect.innerHTML = '<option value="">請先選擇難度</option>';
                    }
                });
            }

            // 綁定答案下拉選單的 change 事件
            const answerSelect = document.getElementById('liCorrectAnswer');
            if (answerSelect) {
                answerSelect.addEventListener('change', function () {
                    updateCorrectAnswerDisplay(this.value);
                });
            }
        },

        clear: function () {
            // 清空下拉與輸入
            document.getElementById('liLevel').value = '';
            document.getElementById('liLevel').dispatchEvent(new Event('change')); // 觸發連動重置
            document.getElementById('liVoiceType').value = '';
            document.getElementById('liMaterial').value = '';
            document.getElementById('liTopic').value = '';

            // 命題者
            const userNameEl = document.querySelector('.user-name');
            const propInput = document.getElementById('liPropositioner');
            if (propInput && userNameEl) propInput.value = userNameEl.innerText.trim();

            // 附檔
            const attachInput = document.getElementById('liAttachment');
            const attachLabel = document.getElementById('liAttachmentName');
            if (attachInput) attachInput.value = '';
            if (attachLabel) {
                attachLabel.innerText = '';
                attachLabel.classList.add('d-none');
            }

            // 清空 Quills
            Object.values(quills).forEach(q => { if (q) q.setText(''); });

            // 清空下拉選單並重置視覺標示
            const answerSelect = document.getElementById('liCorrectAnswer');
            if (answerSelect) {
                answerSelect.value = '';
                updateCorrectAnswerDisplay('');
            }

            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            // 回填欄位
            const levelSelect = document.getElementById('liLevel');
            levelSelect.value = data.level || '';
            levelSelect.dispatchEvent(new Event('change')); // 重要：觸發連動以產生 Core/Indicator 選項

            // 延遲一點點確保 Option 產生後再賦值 (或直接賦值因為是同步的)
            document.getElementById('liCore').value = data.core || '';
            document.getElementById('liIndicator').value = data.indicator || '';

            document.getElementById('liVoiceType').value = data.voiceType || '';
            document.getElementById('liMaterial').value = data.material || '';
            document.getElementById('liTopic').value = data.topic || '';

            const propInput = document.getElementById('liPropositioner');
            if (propInput) {
                propInput.value = data.propositioner || (document.querySelector('.user-name')?.innerText.trim() || '系統管理員');
            }

            // 附檔
            const attachLabel = document.getElementById('liAttachmentName');
            if (attachLabel) {
                if (data.attachment) {
                    attachLabel.innerHTML = `<i class="bi bi-paperclip"></i> 目前檔案：${data.attachment}`;
                    attachLabel.classList.remove('d-none');
                } else {
                    attachLabel.classList.add('d-none');
                }
            }

            // 回填 Quills
            const safePaste = (q, html) => {
                if (q) {
                    q.setText('');
                    if (html) q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(html));
                }
            };
            safePaste(quills.content, data.content);
            safePaste(quills.explanation, data.explanation);
            safePaste(quills.refAnswer, data.refAnswer); // 難度五參考答案

            ['A', 'B', 'C', 'D'].forEach(opt => {
                safePaste(quills[`opt${opt}`], data[`opt${opt}`]);
            });

            // 回填下拉選單並更新視覺標示
            const answerSelect = document.getElementById('liCorrectAnswer');
            if (answerSelect) {
                answerSelect.value = data.ans || '';
                updateCorrectAnswerDisplay(data.ans || '');
            }

            this.toggleEditable(!isViewMode);
        },

        collect: function (status) {
            const level = document.getElementById('liLevel').value;
            const core = document.getElementById('liCore').value;
            const indicator = document.getElementById('liIndicator').value;
            const voiceType = document.getElementById('liVoiceType').value;
            const material = document.getElementById('liMaterial').value;
            const topic = document.getElementById('liTopic').value.trim();
            const propositioner = document.getElementById('liPropositioner').value;

            // 附檔
            const attachInput = document.getElementById('liAttachment');
            let attachName = '';
            if (attachInput && attachInput.files.length > 0) {
                attachName = attachInput.files[0].name;
            } else {
                const attachLabel = document.getElementById('liAttachmentName');
                if (attachLabel && !attachLabel.classList.contains('d-none')) {
                    attachName = attachLabel.innerText.replace(' 目前檔案：', '').trim();
                }
            }

            // 從下拉選單取得答案
            const answerSelect = document.getElementById('liCorrectAnswer');
            const selectedAnswer = answerSelect ? answerSelect.value : '';
            const contentText = quills.content.getText().trim();
            const refAnswerText = quills.refAnswer ? quills.refAnswer.getText().trim() : '';

            // 驗證
            if (status === '已確認') {
                let err = [];
                if (!level) err.push("請選擇難度");
                if (!core) err.push("請選擇核心能力");
                if (!indicator) err.push("請選擇細目指標");
                if (!voiceType) err.push("請選擇語音類型");
                if (!material) err.push("請選擇素材分類");
                if (!topic) err.push("請輸入題目");
                if (contentText.length === 0) err.push("請輸入語音內容...");
                if (!selectedAnswer) err.push("請設定正確答案");

                // 難度五特殊驗證
                if (level === '難度五' && refAnswerText.length === 0) {
                    err.push("難度五必須填寫「參考答案」");
                }

                if (err.length > 0) {
                    Swal.fire({ icon: 'error', title: '錯誤', html: err.join('<br>') });
                    return null;
                }
            } else {
                if (!topic && contentText.length === 0) {
                    Swal.fire({ icon: 'warning', title: '提示', text: '請至少輸入題目或語音內容' });
                    return null;
                }
            }

            return {
                mainCat: '聽力題目',
                subCat: voiceType, // 用語音類型當作次類
                level: level,
                core: core,
                indicator: indicator,
                voiceType: voiceType,
                material: material,
                propositioner: propositioner,
                topic: topic,
                attachment: attachName,
                content: encodeURIComponent(quills.content.root.innerHTML),
                explanation: encodeURIComponent(quills.explanation.root.innerHTML),
                refAnswer: encodeURIComponent(quills.refAnswer ? quills.refAnswer.root.innerHTML : ''),
                optA: encodeURIComponent(quills.optA.root.innerHTML),
                optB: encodeURIComponent(quills.optB.root.innerHTML),
                optC: encodeURIComponent(quills.optC.root.innerHTML),
                optD: encodeURIComponent(quills.optD.root.innerHTML),
                ans: selectedAnswer,
                summary: topic
            };
        },

        toggleEditable: function (editable) {
            Object.values(quills).forEach(q => { if (q) q.enable(editable); });

            const inputs = document.querySelectorAll('#form-listen input, #form-listen select, #form-listen textarea');
            inputs.forEach(input => {
                if (input.classList.contains('readonly-field')) {
                    input.disabled = true;
                } else {
                    input.disabled = !editable;
                }
            });

            // 特殊處理：連動選單在開啟編輯時，若上層沒選，下層要鎖住
            if (editable) {
                const level = document.getElementById('liLevel').value;
                if (!level) {
                    document.getElementById('liCore').disabled = true;
                    document.getElementById('liIndicator').disabled = true;
                }
            }

            // 鎖定標點符號按鈕
            const puncBtns = document.querySelectorAll('#form-listen .punc-btn');
            puncBtns.forEach(btn => {
                btn.disabled = !editable;
            });

            // 答案下拉選單的禁用控制
            const answerSelect = document.getElementById('liCorrectAnswer');
            if (answerSelect) {
                answerSelect.disabled = !editable;
            }
        }
    };
})();