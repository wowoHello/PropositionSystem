// --- 3. 新增使用者 Modal 邏輯 ---
function openAddUserModal() {
    // 取得 Modal 實體
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));

    // 清空欄位
    document.getElementById('addUserName').value = '';
    document.getElementById('addUserEmail').value = '';
    document.getElementById('addUserOrg').value = '';
    document.getElementById('addUserTitle').value = '';

    modal.show();
}

// --- 4. 編輯使用者 Modal 邏輯 ---
// ⚠️ 注意：此函式在 edituser.js 中也有定義，應確保只載入一個版本。
// 若同一頁面同時載入兩個檔案，後載入的版本會覆蓋前者。
function openEditUserModal(index) {
    const user = mockUsers[index];
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));

    // 填入 [基本帳號資料] — 快取 DOM 引用避免重複查詢
    const editUserId = document.getElementById('editUserId');
    const modalEditTitleName = document.getElementById('modalEditTitleName');
    const editRealName = document.getElementById('editRealName');
    const editEmail = document.getElementById('editEmail');
    const editOrg = document.getElementById('editOrg');
    const editTitle = document.getElementById('editTitle');
    const editPhone = document.getElementById('editPhone');
    const accountStatus = document.getElementById('accountStatus');

    editUserId.value = user.id;
    modalEditTitleName.innerText = user.name;
    editRealName.value = user.name;
    editEmail.value = user.email;
    editOrg.value = user.org;
    editTitle.value = user.title;
    editPhone.value = user.phone;
    accountStatus.checked = (user.status === 'active');

    // 填入 [參與梯次與身分] (唯讀列表)
    const projectListDiv = document.getElementById('userProjectHistory');

    const userProjects = projectsData.filter(p => p.members.some(m => m.userId === user.id));

    if (userProjects.length === 0) {
        projectListDiv.innerHTML = '<div class="text-center text-muted py-4">此使用者目前未參與任何命題專案</div>';
    } else {
        // ✅ 效能修復：先收集 HTML 片段再一次性寫入，避免 innerHTML += 迴圈觸發反覆 DOM 重建
        const fragments = userProjects.map(p => {
            const memberInfo = p.members.find(m => m.userId === user.id);
            // 翻譯角色
            const roleBadges = memberInfo.roles.map(r => {
                if (r === 'teacher') return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 me-1">命題教師</span>';
                if (r === 'reviewer') return '<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 me-1">審題委員</span>';
                return '';
            }).join('');

            const statusText = p.status === 'active'
                ? '<span class="text-success"><i class="bi bi-circle-fill" style="font-size:6px; vertical-align:middle"></i> 進行中</span>'
                : '已結束';

            return `
                <div class="d-flex align-items-center justify-content-between p-3 border-bottom">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-secondary bg-opacity-10 text-secondary">${p.year}</span>
                            <span class="fw-bold text-dark">${p.name}</span>
                        </div>
                        <div class="mt-1 small">
                            ${roleBadges}
                        </div>
                    </div>
                    <div class="text-secondary small">
                        ${statusText}
                    </div>
                </div>
            `;
        });

        projectListDiv.innerHTML = fragments.join('');
    }

    modal.show();
}