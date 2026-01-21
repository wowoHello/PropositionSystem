// --- 4. 編輯使用者 Modal 邏輯 ---
function openEditUserModal(index) {
    const user = mockUsers[index];
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));

    // 填入 [基本帳號資料]
    document.getElementById('editUserId').value = user.id;
    
    // 修改重點：確保這裡是 user.name (李文華)，而不是 user.avatar (李)
    document.getElementById('modalEditTitleName').innerText = user.name;
    
    document.getElementById('editRealName').value = user.name;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editOrg').value = user.org;
    document.getElementById('editTitle').value = user.title;
    document.getElementById('editPhone').value = user.phone;
    document.getElementById('accountStatus').checked = (user.status === 'active');

    // --- 填入指派區塊的專案下拉選單 (過濾掉已結束的) ---
    const assignSelect = document.getElementById('assignProjectSelect');
    assignSelect.innerHTML = '<option selected disabled>請選擇梯次...</option>';
    projectsData.filter(p => p.status === 'active').forEach(p => {
        assignSelect.innerHTML += `<option value="${p.id}">${p.year} ${p.name}</option>`;
    });

    // --- 渲染已參與專案列表 ---
    renderUserProjectList(user.id);

    modal.show();
}

// 渲染列表的獨立函式 (方便新增後重刷)
function renderUserProjectList(userId) {
    const projectListDiv = document.getElementById('userProjectHistory');
    projectListDiv.innerHTML = '';
    
    // 找出該使用者參與的所有專案
    const userProjects = projectsData.filter(p => p.members.some(m => m.userId === userId));
    
    if(userProjects.length === 0) {
        projectListDiv.innerHTML = '<div class="text-center text-muted py-4">此使用者目前未參與任何命題專案</div>';
        return;
    }

    userProjects.forEach(p => {
        const memberInfo = p.members.find(m => m.userId === userId);
        
        // 翻譯角色標籤
        const roleBadges = memberInfo.roles.map(r => {
            if(r === 'teacher') return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 me-1">命題教師</span>';
            if(r === 'reviewer') return '<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 me-1">審題委員</span>';
            if(r === 'admin') return '<span class="badge bg-dark me-1">系統管理員</span>'; // 雖然下拉選單不能選，但舊資料如果要顯示還是要有
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
                <div class="d-flex align-items-center gap-3">
                    <div class="text-secondary small">
                        ${p.status === 'active' ? '<span class="text-success"><i class="bi bi-circle-fill" style="font-size:6px; vertical-align:middle"></i> 進行中</span>' : '<span class="text-muted">已封存</span>'}
                    </div>
                    ${p.status === 'active' ? 
                        `<button class="btn btn-sm btn-outline-danger border-0" onclick="alert('移除功能待實作')" title="移除身分"><i class="bi bi-trash"></i></button>` : 
                        `<button class="btn btn-sm btn-light disabled border-0"><i class="bi bi-trash"></i></button>`
                    }
                </div>
            </div>
        `;
        projectListDiv.innerHTML += html;
    });
}

// 模擬新增指派
function addProjectRoleMock() {
    const projectSelect = document.getElementById('assignProjectSelect');
    const roleSelect = document.getElementById('assignRoleSelect');
    
    if(projectSelect.value === "請選擇梯次...") {
        alert("請選擇一個梯次");
        return;
    }
    
    // 這裡僅做前端畫面演示，實際會呼叫 API
    alert(`已將使用者加入「${projectSelect.options[projectSelect.selectedIndex].text}」擔任「${roleSelect.options[roleSelect.selectedIndex].text}」`);
    
    // 重新渲染列表 (這裡只是示範，實際上要更新 projectsData)
    // 為了演示效果，我們假裝資料已經寫入，並重刷畫面 (略)
}