// js/General.js
const GeneralHandler = (function () {
    // 私有變數：Quill 實例容器
    const quills = {};

    // 分類資料
    const categoryData = {
        "文字": ["字音", "字型", "造字原則"],
        "語詞": ["辭義辨識", "詞彙辨析", "詞性分辨", "語詞應用"],
        "成語短語": ["短語辨識", "語詞使用", "文義取得"],
        "造句標點": ["句義", "句法辨析", "標點符號"],
        "修辭技巧": ["修辭類型", "語態變化"],
        "語文知識": ["語文知識"],
        "文意判讀": ["段義辨析"]
    };

    // --- 新增：內部輔助函式 ---
    function setupQuillAddons(quill, containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;

        // 向上尋找包裹容器
        const wrapper = el.closest('.quill-master-container');
        if (!wrapper) {
            console.warn(`ID 為 ${containerId} 的編輯器缺少 .quill-master-container 外層，輔助功能將失效。`);
            return;
        }

        // 標點符號按鈕點擊
        const puncButtons = wrapper.querySelectorAll('.punc-btn');
        puncButtons.forEach(btn => {
            btn.onclick = function (e) {
                e.preventDefault();

                if (!quill.isEnabled()) {
                    return;
                }

                // 1. 取得要插入的符號 (例如 "「」")
                const char = this.getAttribute('data-char');

                // 2. 取得要「往回退」的格數，預設為 0
                const moveBack = parseInt(this.getAttribute('data-back') || '0');

                // 3. 取得當前游標位置
                const range = quill.getSelection(true);

                if (range) {
                    // 4. 插入文字
                    quill.insertText(range.index, char);

                    // 5. 設定新游標位置： (原位置 + 插入長度 - 往回退的格數)
                    // 範例：插入 "「」" (長度2)，back 為 1。
                    // 游標會變成： 原index + 2 - 1 = 原index + 1 (即符號中間)
                    quill.setSelection(range.index + char.length - moveBack);
                }
            };
        });

        // 字數偵測監聽
        const countDisplay = wrapper.querySelector('.count-num');
        quill.on('text-change', function () {
            // getText() 會多計入一個末尾換行符，所以 trim 後計算
            const text = quill.getText().trim();
            const length = (quill.getLength() <= 1 && text === '') ? 0 : text.length;
            if (countDisplay) {
                countDisplay.innerText = length;
            }
        });
    }

    return {
        // 1. 初始化
        init: function () {
            // 初始化選單連動
            const mainSelect = document.getElementById('gMainCategory');
            const subSelect = document.getElementById('gSubCategory');

            if (mainSelect) {
                mainSelect.innerHTML = '<option value="">請選擇...</option>';
                Object.keys(categoryData).forEach(key => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = key;
                    mainSelect.appendChild(option);
                });

                mainSelect.addEventListener('change', function () {
                    const selectedMain = this.value;
                    subSelect.innerHTML = '<option value="">請選擇...</option>';
                    if (selectedMain && categoryData[selectedMain]) {
                        subSelect.disabled = false;
                        categoryData[selectedMain].forEach(sub => {
                            const opt = document.createElement('option');
                            opt.value = sub;
                            opt.textContent = sub;
                            subSelect.appendChild(opt);
                        });
                    } else {
                        subSelect.disabled = true;
                        subSelect.innerHTML = '<option value="">請先選擇主類</option>';
                    }
                });
            }

            const quillConfigs = [
                { id: 'q-editor-content', key: 'content', placeholder: '請輸入題幹內容...', toolbar: window.mainToolbar },
                { id: 'q-editor-explanation', key: 'explanation', placeholder: '請輸入題目解析...', toolbar: window.mainToolbar },
                { id: 'q-editor-optA', key: 'optA', placeholder: '選項 A...', toolbar: window.optionToolbar },
                { id: 'q-editor-optB', key: 'optB', placeholder: '選項 B...', toolbar: window.optionToolbar },
                { id: 'q-editor-optC', key: 'optC', placeholder: '選項 C...', toolbar: window.optionToolbar },
                { id: 'q-editor-optD', key: 'optD', placeholder: '選項 D...', toolbar: window.optionToolbar }
            ];

            quillConfigs.forEach(config => {
                const el = document.getElementById(config.id);
                if (el) {
                    // 建立實例並存入私有變數 quills
                    quills[config.key] = new Quill(`#${config.id}`, {
                        theme: 'snow',
                        modules: { toolbar: config.toolbar },
                        placeholder: config.placeholder
                    });

                    // 重要：立即綁定輔助功能
                    setupQuillAddons(quills[config.key], config.id);

                    // 如果是選項 A-D，額外加上點擊 Header 觸發 Radio 的邏輯
                    if (config.key.startsWith('opt')) {
                        const opt = config.key.replace('opt', '');
                        const container = el.closest('.option-card');
                        const header = container?.querySelector('.option-header-styled');
                        if (header) {
                            header.onclick = function (e) {
                                if (e.target.type !== 'radio') {
                                    document.getElementById(`radio${opt}`).click();
                                }
                            };
                        }
                    }
                }
            });
        },

        // 2. 清空表單
        clear: function () {
            document.getElementById('gLevel').value = '';
            document.getElementById('gDifficulty').value = ''; // 默認空白

            // 同步命題者
            const userNameEl = document.querySelector('.user-name');
            const propInput = document.getElementById('gPropositioner');
            if (propInput && userNameEl) {
                propInput.value = userNameEl.innerText.trim();
            }

            const mainSelect = document.getElementById('gMainCategory');
            if (mainSelect) {
                mainSelect.value = '';
                mainSelect.dispatchEvent(new Event('change'));
            }

            // Clear Sub Category explicitly just in case
            const subSelect = document.getElementById('gSubCategory');
            if (subSelect) {
                subSelect.innerHTML = '<option value="">請先選擇主類</option>';
                subSelect.disabled = true;
            }

            // 清空附檔
            const attachInput = document.getElementById('gAttachment');
            const attachLabel = document.getElementById('gAttachmentName');
            if (attachInput) attachInput.value = '';
            if (attachLabel) {
                attachLabel.innerText = '';
                attachLabel.classList.add('d-none');
            }

            if (quills.content) quills.content.setText('');
            if (quills.explanation) quills.explanation.setText('');

            ['A', 'B', 'C', 'D'].forEach(opt => { if (quills[`opt${opt}`]) quills[`opt${opt}`].setText(''); });

            document.querySelectorAll('input[name="correctAnswer"]').forEach(el => el.checked = false);
            this.toggleEditable(true);
        },

        // 3. 回填資料
        fill: function (data, isViewMode) {
            document.getElementById('gLevel').value = data.level || '';
            document.getElementById('gDifficulty').value = data.difficulty || ''; // 回填難度或空白

            // 命題者回填 (如果 data 有存就用 data 的，不然就用當前登入者)
            const propInput = document.getElementById('gPropositioner');
            if (propInput) {
                propInput.value = data.propositioner || (document.querySelector('.user-name')?.innerText.trim() || '系統管理員');
            }

            const mainSelect = document.getElementById('gMainCategory');
            const subSelect = document.getElementById('gSubCategory'); // Define subSelect here

            if (mainSelect) {
                mainSelect.value = data.mainCat || '';
                // 觸發 change 事件以填充次類選項
                mainSelect.dispatchEvent(new Event('change'));

                // 填充次類的值 (必須在 change 事件後執行)
                if (subSelect && data.subCat) {
                    subSelect.value = data.subCat;
                }
            }

            // 回填附檔資訊 (因為無法設定 file input 的 value，改用文字顯示 current file)
            const attachLabel = document.getElementById('gAttachmentName');
            if (attachLabel) {
                if (data.attachment) {
                    attachLabel.innerHTML = `<i class="bi bi-paperclip"></i> 目前檔案：${data.attachment}`;
                    attachLabel.classList.remove('d-none');
                } else {
                    attachLabel.innerText = '';
                    attachLabel.classList.add('d-none');
                }
            }

            // 修正點：定義一個小工具來填入內容，解決重疊問題
            const setQuillContent = (quill, htmlEncoded) => {
                if (!quill) return;
                quill.setText(''); // 先清空，避免殘留
                if (htmlEncoded) {
                    // 使用標準 API 寫入，確保 Placeholder 會消失
                    quill.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(htmlEncoded));
                }
            };

            // 回填題目
            setQuillContent(quills.content, data.content);
            // 回填解析
            setQuillContent(quills.explanation, data.explanation);

            // 回填選項
            ['A', 'B', 'C', 'D'].forEach(opt => {
                setQuillContent(quills[`opt${opt}`], data[`opt${opt}`]);
            });

            const radio = document.querySelector(`input[name="correctAnswer"][value="${data.ans}"]`);
            if (radio) radio.checked = true;

            this.toggleEditable(!isViewMode);
        },

        // 4. 收集並驗證資料
        collect: function (status) {
            const level = document.getElementById('gLevel').value;
            const mainCat = document.getElementById('gMainCategory').value;
            const subCat = document.getElementById('gSubCategory').value;
            const difficulty = document.getElementById('gDifficulty').value;
            const propositioner = document.getElementById('gPropositioner').value;
            const contentText = quills.content.getText().trim();

            // 處理附檔 (若有新上傳則用新檔名，否則保留舊檔名-這裡簡化處理，實務上要判斷)
            const attachInput = document.getElementById('gAttachment');
            let attachName = '';
            if (attachInput && attachInput.files.length > 0) {
                attachName = attachInput.files[0].name;
            } else {
                // 如果沒上傳新檔案，嘗試讀取 old value (但在這個純前端 demo 比較難做，先假設沒選就是沒檔案，或是編輯時保留原值邏輯要再細寫)
                // 簡易作法：讀取 gAttachmentName 的文字來判斷是否已有檔案
                const attachLabel = document.getElementById('gAttachmentName');
                if (attachLabel && !attachLabel.classList.contains('d-none')) {
                    // 格式：目前檔案：xxx.jpg
                    attachName = attachLabel.innerText.replace(' 目前檔案：', '').trim();
                }
            }

            const answerEl = document.querySelector('input[name="correctAnswer"]:checked');

            if (status === '已確認') {
                let errorMsg = [];
                if (!level) errorMsg.push("請選擇「適用等級」");
                if (!mainCat) errorMsg.push("請選擇「主題」");
                if (!subCat) errorMsg.push("請選擇「次類」");
                if (contentText.length === 0) errorMsg.push("請輸入「題幹」");
                if (!answerEl) errorMsg.push("請設定「正確答案」");

                // 解析非必填，但如果有填也可以驗證

                if (errorMsg.length > 0) {
                    Swal.fire({
                        icon: 'error',
                        title: '資料不完整',
                        html: errorMsg.join("<br>")
                    });
                    return null; // 回傳 null 代表失敗
                }
            } else {
                if (contentText.length === 0 && !mainCat) {
                    Swal.fire({
                        icon: 'warning',
                        title: '提示',
                        text: '請至少輸入題幹或選擇主題。'
                    });
                    return null;
                }
            }

            // 打包資料
            return {
                level: level,
                mainCat: mainCat,
                subCat: subCat,
                difficulty: difficulty,
                propositioner: propositioner,
                attachment: attachName,
                content: encodeURIComponent(quills.content.root.innerHTML), // 存 HTML
                explanation: encodeURIComponent(quills.explanation ? quills.explanation.root.innerHTML : ''),
                summary: contentText.length > 20 ? contentText.substring(0, 20) + '...' : contentText,
                optA: encodeURIComponent(quills.optA.root.innerHTML),
                optB: encodeURIComponent(quills.optB.root.innerHTML),
                optC: encodeURIComponent(quills.optC.root.innerHTML),
                optD: encodeURIComponent(quills.optD.root.innerHTML),
                ans: answerEl ? answerEl.value : ''
            };
        },

        // 輔助：切換唯讀
        toggleEditable: function (editable) {
            Object.values(quills).forEach(q => {
                if (q) q.enable(editable);
            });
            // Input 鎖定邏輯
            const formInputs = document.querySelectorAll('#form-general input, #form-general select, #form-general textarea');
            formInputs.forEach(input => {
                // 排除 命題者(gPropositioner) 和 次類(gSubCategory)
                // 次類的鎖定狀態由主類(gMainCategory)連動控制，不應在此被統一開啟
                if (input.id !== 'gPropositioner' && input.id !== 'gSubCategory') {
                    input.disabled = !editable;
                }
            });

            // 如果是開啟編輯模式，且主類已有值，則次類應該要開啟
            const subSelect = document.getElementById('gSubCategory');
            if (subSelect) {
                if (editable) {
                    // 編輯模式：如果有選主類，次類就要解鎖；沒選主類則保持鎖定
                    const mainCat = document.getElementById('gMainCategory').value;
                    subSelect.disabled = !mainCat;
                } else {
                    // 檢視模式 (editable=false) 下，強制鎖定次類
                    subSelect.disabled = true;
                }
            }
            const puncBtns = document.querySelectorAll('#form-general .punc-btn');
            puncBtns.forEach(btn => {
                btn.disabled = !editable; // 當 editable 為 false 時，disabled 為 true
            });
        }
    };
})();