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
                        subSelect.innerHTML = '<option value="">請先選擇主題</option>';
                    }
                });
            }

            // 初始化 Quill (如果有定義全域 toolbar 設定，可直接用，或是這裡再定義一次)
            // 假設 mainToolbar 和 optionToolbar 在 app.js 定義為全域
            if (document.getElementById('q-editor-content')) {
                quills.content = new Quill('#q-editor-content', { theme: 'snow', modules: { toolbar: window.mainToolbar }, placeholder: '請輸入題幹...' });

                ['A', 'B', 'C', 'D'].forEach(opt => {
                    quills[`opt${opt}`] = new Quill(`#q-editor-opt${opt}`, { theme: 'snow', modules: { toolbar: window.optionToolbar }, placeholder: `選項 ${opt}` });

                    // UI 重繪邏輯
                    const editorEl = document.getElementById(`q-editor-opt${opt}`);
                    const container = editorEl.closest('.mb-3');

                    if (container) {
                        container.className = 'mb-3 option-card rounded';

                        const header = container.querySelector('.option-header');
                        if (header) {
                            header.className = 'option-header-styled';

                            // ★★★ 新增：點擊整個 Header 時觸發 Radio ★★★
                            header.onclick = function (e) {
                                // 如果點到的不是 radio 本身 (避免重複觸發)，就手動點擊 radio
                                if (e.target.type !== 'radio') {
                                    document.getElementById(`radio${opt}`).click();
                                }
                            };

                            header.innerHTML = `
                                <div class="form-check m-0 d-flex align-items-center gap-2">
                                    <input class="form-check-input" type="radio" name="correctAnswer" value="${opt}" id="radio${opt}" style="cursor:pointer">
                                    <span class="small text-secondary fw-bold">
                                        設為正確答案
                                    </span>
                                </div>
                                <span class="badge bg-light text-secondary border">選項 ${opt}</span>
                            `;
                        }
                    }
                });
            }
        },

        // 2. 清空表單
        clear: function () {
            document.getElementById('gLevel').value = '';
            const mainSelect = document.getElementById('gMainCategory');
            if (mainSelect) {
                mainSelect.value = '';
                mainSelect.dispatchEvent(new Event('change'));
            }
            // Clear Sub Category explicitly just in case
            const subSelect = document.getElementById('gSubCategory');
            if (subSelect) {
                subSelect.value = '';
                subSelect.innerHTML = '<option value="">請先選擇主題</option>';
                subSelect.disabled = true;
            }

            if (quills.content) quills.content.setText('');
            ['A', 'B', 'C', 'D'].forEach(opt => { if (quills[`opt${opt}`]) quills[`opt${opt}`].setText(''); });

            document.querySelectorAll('input[name="correctAnswer"]').forEach(el => el.checked = false);
            this.toggleEditable(true);
        },

        // 3. 回填資料
        fill: function (data, isViewMode) {
            document.getElementById('gLevel').value = data.level || '';
            const mainSelect = document.getElementById('gMainCategory');
            if (mainSelect) {
                mainSelect.value = data.mainCat || '';
                // 觸發 change 事件以填充次類選項
                mainSelect.dispatchEvent(new Event('change'));

                // 填充次類的值 (必須在 change 事件後執行)
                const subSelect = document.getElementById('gSubCategory');
                if (subSelect && data.subCat) {
                    subSelect.value = data.subCat;
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
            const contentText = quills.content.getText().trim();
            const answerEl = document.querySelector('input[name="correctAnswer"]:checked');

            if (status === '已確認') {
                let errorMsg = [];
                if (!level) errorMsg.push("請選擇「適用等級」");
                if (!mainCat) errorMsg.push("請選擇「主題」");
                if (!subCat) errorMsg.push("請選擇「次類」");
                if (contentText.length === 0) errorMsg.push("請輸入「題幹」");
                if (!answerEl) errorMsg.push("請設定「正確答案」");

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
                content: encodeURIComponent(quills.content.root.innerHTML), // 存 HTML
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
            Object.values(quills).forEach(q => q.enable(editable));
            // Input 鎖定邏輯可由 app.js 統一處理，或這裡處理特例
        }
    };
})();