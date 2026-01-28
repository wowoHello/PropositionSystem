// js/LongArticle.js
const LongArticleHandler = (function () {
    const quills = { content: null, explanation: null };

    return {
        init: function () {
            // 初始化 Quill
            if (document.getElementById('q-long-content')) {
                quills.content = new Quill('#q-long-content', {
                    theme: 'snow',
                    modules: { toolbar: window.mainToolbar },
                    placeholder: '請輸入文章內容...'
                });
            }

            if (document.getElementById('q-long-explanation')) {
                quills.explanation = new Quill('#q-long-explanation', {
                    theme: 'snow',
                    modules: { toolbar: window.mainToolbar },
                    placeholder: '請簡要說明正確答案的判斷依據，並簡述其他選項錯誤原因...'
                });
            }
        },

        clear: function () {
            document.getElementById('lType').value = '';
            document.getElementById('lLevel').value = '';
            document.getElementById('lDifficulty').value = '';

            const userNameEl = document.querySelector('.user-name');
            const propInput = document.getElementById('lPropositioner');
            if (propInput && userNameEl) {
                propInput.value = userNameEl.innerText.trim();
            }

            document.getElementById('lTopic').value = '';

            // 清空附檔
            const attachInput = document.getElementById('lAttachment');
            const attachLabel = document.getElementById('lAttachmentName');
            if (attachInput) attachInput.value = '';
            if (attachLabel) {
                attachLabel.innerText = '';
                attachLabel.classList.add('d-none');
            }

            if (quills.content) quills.content.setText('');
            if (quills.explanation) quills.explanation.setText('');

            this.toggleEditable(true);
        },

        fill: function (data, isViewMode) {
            document.getElementById('lType').value = data.subType || '';
            document.getElementById('lLevel').value = data.level || '';
            document.getElementById('lDifficulty').value = data.difficulty || '';
            document.getElementById('lTopic').value = data.topic || '';

            const propInput = document.getElementById('lPropositioner');
            if (propInput) {
                propInput.value = data.propositioner || (document.querySelector('.user-name')?.innerText.trim() || '系統管理員');
            }

            // 回填附檔顯示文字
            const attachLabel = document.getElementById('lAttachmentName');
            if (attachLabel) {
                if (data.attachment) {
                    attachLabel.innerHTML = `<i class="bi bi-paperclip"></i> 目前檔案：${data.attachment}`;
                    attachLabel.classList.remove('d-none');
                } else {
                    attachLabel.innerText = '';
                    attachLabel.classList.add('d-none');
                }
            }

            const setQuill = (q, html) => {
                if (q) {
                    q.setText('');
                    if (html) q.clipboard.dangerouslyPasteHTML(0, decodeURIComponent(html));
                }
            };

            setQuill(quills.content, data.content);
            setQuill(quills.explanation, data.explanation);

            this.toggleEditable(!isViewMode);
        },

        collect: function (status) {
            const type = document.getElementById('lType').value;
            const level = document.getElementById('lLevel').value;
            const difficulty = document.getElementById('lDifficulty').value;
            const topic = document.getElementById('lTopic').value.trim();
            const propositioner = document.getElementById('lPropositioner').value;

            const contentHTML = quills.content.root.innerHTML;
            const contentText = quills.content.getText().trim();
            const explanationHTML = quills.explanation ? quills.explanation.root.innerHTML : '';

            // ★ 新增：處理附檔檔名邏輯
            const attachInput = document.getElementById('lAttachment');
            let attachName = '';
            if (attachInput && attachInput.files.length > 0) {
                // 有新上傳
                attachName = attachInput.files[0].name;
            } else {
                // 沒上傳，檢查是否有舊檔名
                const attachLabel = document.getElementById('lAttachmentName');
                if (attachLabel && !attachLabel.classList.contains('d-none')) {
                    attachName = attachLabel.innerText.replace(' 目前檔案：', '').trim();
                }
            }

            if (status === '已確認') {
                let err = [];
                if (!type) err.push("請選擇題型");
                if (!level) err.push("請選擇適用等級");
                if (contentText.length === 0) err.push("請輸入內容");

                if (err.length > 0) {
                    Swal.fire({
                        icon: 'error',
                        title: '錯誤',
                        html: err.join('<br>')
                    });
                    return null;
                }
            } else {
                if (contentText.length === 0 && !topic) {
                    Swal.fire({
                        icon: 'warning',
                        title: '提示',
                        text: '請至少輸入題目或內容'
                    });
                    return null;
                }
            }

            return {
                mainCat: '長文題目',
                subCat: type,
                subType: type,
                level: level,
                difficulty: difficulty,
                propositioner: propositioner,
                topic: topic,
                attachment: attachName, // ★ 新增：回傳附檔名
                content: encodeURIComponent(contentHTML),
                explanation: encodeURIComponent(explanationHTML),
                summary: topic
            };
        },

        toggleEditable: function (editable) {
            if (quills.content) quills.content.enable(editable);
            if (quills.explanation) quills.explanation.enable(editable);

            const inputs = document.querySelectorAll('#form-longarticle input, #form-longarticle select, #form-longarticle textarea');
            inputs.forEach(input => {
                if (input.id === 'lPropositioner') {
                    input.disabled = true;
                } else {
                    input.disabled = !editable;
                }
            });
        }
    };
})();
