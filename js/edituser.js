// --- 4. 編輯使用者 Modal 邏輯 ---
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

    // --- 填入指派區塊的專案下拉選單 (過濾掉已結束的) ---
    // ✅ 效能修復：先收集 HTML 字串再一次性寫入，避免 innerHTML += 迴圈觸發 O(n²) DOM 重建
    const assignSelect = document.getElementById('assignProjectSelect');
    const activeProjects = projectsData.filter(p => p.status === 'active');
    const optionsHtml = activeProjects
        .map(p => `<option value="${p.id}">${p.year} ${p.name}</option>`)
        .join('');
    assignSelect.innerHTML = `<option selected disabled>請選擇梯次...</option>${optionsHtml}`;

    // --- 渲染已參與專案列表 ---
    renderUserProjectList(user.id);

    modal.show();
}

// 渲染列表的獨立函式 (方便新增後重刷)
// ✅ 效能修復：使用陣列收集 HTML 後一次性寫入
function renderUserProjectList(userId) {
    const projectListDiv = document.getElementById('userProjectHistory');
    projectListDiv.innerHTML = '';

    // 找出該使用者參與的所有專案
    const userProjects = projectsData.filter(p => p.members.some(m => m.userId === userId));

    if (userProjects.length === 0) {
        projectListDiv.innerHTML = '<div class="text-center text-muted py-4">此使用者目前未參與任何命題專案</div>';
        return;
    }

    // ✅ 先收集所有 HTML 片段，最後一次性寫入 DOM
    const fragments = userProjects.map(p => {
        const memberInfo = p.members.find(m => m.userId === userId);

        // 翻譯角色標籤
        const roleBadges = memberInfo.roles.map(r => {
            if (r === 'teacher') return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 me-1">命題教師</span>';
            if (r === 'reviewer') return '<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 me-1">審題委員</span>';
            if (r === 'admin') return '<span class="badge bg-dark me-1">系統管理員</span>';
            return '';
        }).join('');

        const statusHtml = p.status === 'active'
            ? '<span class="text-success"><i class="bi bi-circle-fill" style="font-size:6px; vertical-align:middle"></i> 進行中</span>'
            : '<span class="text-muted">已封存</span>';

        const actionBtn = p.status === 'active'
            ? `<button class="btn btn-sm btn-outline-danger border-0" onclick="Swal.fire('移除功能待實作')" title="移除身分"><i class="bi bi-trash"></i></button>`
            : `<button class="btn btn-sm btn-light disabled border-0"><i class="bi bi-trash"></i></button>`;

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
                <div class="d-flex align-items-center gap-3">
                    <div class="text-secondary small">
                        ${statusHtml}
                    </div>
                    ${actionBtn}
                </div>
            </div>
        `;
    });

    projectListDiv.innerHTML = fragments.join('');
}

// 模擬新增指派
function addProjectRoleMock() {
    const projectSelect = document.getElementById('assignProjectSelect');
    const roleSelect = document.getElementById('assignRoleSelect');

    if (projectSelect.value === "請選擇梯次...") {
        Swal.fire({
            icon: 'warning',
            title: '提示',
            text: '請選擇一個梯次'
        });
        return;
    }

    // 這裡僅做前端畫面演示，實際會呼叫 API
    Swal.fire({
        icon: 'success',
        title: '成功',
        text: `已將使用者加入「${projectSelect.options[projectSelect.selectedIndex].text}」擔任「${roleSelect.options[roleSelect.selectedIndex].text}」`
    });
}