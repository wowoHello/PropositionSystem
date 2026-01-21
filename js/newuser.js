// --- 3. 新增使用者 Modal 邏輯 ---
function openAddUserModal() {
    // 取得 Modal 實體
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    
    // 清空欄位 (這裡假設 input 都有對應 ID，實作時要對應 HTML)
    document.getElementById('addUserName').value = '';
    document.getElementById('addUserEmail').value = '';
    document.getElementById('addUserOrg').value = '';
    document.getElementById('addUserTitle').value = '';
    
    modal.show();
}

// --- 4. 編輯使用者 Modal 邏輯 ---
function openEditUserModal(index) {
    const user = mockUsers[index];
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));

    // 填入 [基本帳號資料]
    document.getElementById('editUserId').value = user.id;
    document.getElementById('modalEditTitleName').innerText = user.name;
    document.getElementById('editRealName').value = user.name;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editOrg').value = user.org;
    document.getElementById('editTitle').value = user.title;
    document.getElementById('editPhone').value = user.phone;
    document.getElementById('accountStatus').checked = (user.status === 'active');

    // 填入 [參與梯次與身分] (唯讀列表)
    // 這裡我們去撈 projectsData 看看這個人參加了哪些專案
    const projectListDiv = document.getElementById('userProjectHistory');
    projectListDiv.innerHTML = '';
    
    const userProjects = projectsData.filter(p => p.members.some(m => m.userId === user.id));
    
    if(userProjects.length === 0) {
        projectListDiv.innerHTML = '<div class="text-center text-muted py-4">此使用者目前未參與任何命題專案</div>';
    } else {
        userProjects.forEach(p => {
            const memberInfo = p.members.find(m => m.userId === user.id);
            // 翻譯角色
            const roleBadges = memberInfo.roles.map(r => {
                if(r === 'teacher') return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 me-1">命題教師</span>';
                if(r === 'reviewer') return '<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 me-1">審題委員</span>';
                return '';
            }).join('');
            
            const html = `
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
                        ${p.status === 'active' ? '<span class="text-success"><i class="bi bi-circle-fill" style="font-size:6px; vertical-align:middle"></i> 進行中</span>' : '已結束'}
                    </div>
                </div>
            `;
            projectListDiv.innerHTML += html;
        });
    }

    modal.show();
}