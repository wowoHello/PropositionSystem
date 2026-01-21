const PERMISSION_MAP = {
  "perm_1": { label: "今日提醒", style: "tag-reminder" },
  "perm_2": { label: "命題儀表板", style: "tag-dashboard" },
  "perm_3": { label: "我的命題任務", style: "tag-mytask" },
  "perm_4": { label: "審題清單", style: "tag-review" },
  "perm_5": { label: "教師管理系統", style: "tag-teacher" },
  "perm_6": { label: "角色與權限管理", style: "tag-role" },
  "perm_7": { label: "系統公告/使用說明", style: "tag-notice" },
  "perm_8": { label: "命題專案管理", style: "tag-project" }
};

let rolesData = [
  {
    id: "admin",
    name: "系統管理員",
    description: "負責系統設定、使用者管理、權限分配與整體平台維護工作。",
    icon: "bi-gear-fill",
    theme: "admin",
    type: "internal", // Added type
    permissions: ["perm_1", "perm_2", "perm_3", "perm_4", "perm_5", "perm_6", "perm_7", "perm_8"], // All Visible
    tags: [], // Deprecated: generated from permissions
    details: {
       "perm_3": "edit",
       "perm_4": "edit" 
    }
  },
  {
    id: "teacher",
    name: "命題教師",
    description: "負責試題設計、題庫管理，以及配合審題委員進行題目修正。",
    icon: "bi-pencil-square",
    theme: "teacher",
    type: "external", // Default external for teacher? Let's say internal for now as per user request to set it manually, or default all to internal first. 
    // User asked to split internal/external. Let's make Teacher External for demo.
    permissions: ["perm_1", "perm_3", "perm_7"],
    tags: [],
    details: {
       "perm_3": "edit", 
       "perm_4": "none"
    }
  },
  {
    id: "reviewer",
    name: "審題委員",
    description: "審核題目品質、提供專業建議，確保試題符合學術標準與規範。",
    icon: "bi-search",
    theme: "reviewer",
    type: "external",
    permissions: ["perm_1", "perm_4", "perm_7"],
    tags: [],
    details: {
       "perm_3": "none",
       "perm_4": "edit"
    }
  },
  {
    id: "assistant",
    name: "專案助理",
    description: "協助檢視專案進度與內容，但無編輯權限。",
    icon: "bi-person-badge",
    theme: "staff",
    type: "internal",
    permissions: ["perm_1", "perm_2", "perm_3", "perm_4", "perm_7"],
    tags: [],
    details: {
       "perm_3": "view",
       "perm_4": "view"
    }
  },
];

const mockUsers = [
  {
    id: "U001",
    name: "陳言綸",
    email: "test@mail.com",
    account: "guray_chen", // Added account
    role: "admin",
    title: "網維經理",
    phone: "0912-345-678",
    status: "active",
  },
];

const projectsData = [
  {
    id: "P001",
    year: "2024",
    name: "進行中梯次範例一",
    status: "active",
    members: [{ userId: "U001", roles: ["admin", "reviewer"] }],
  },
  {
    id: "P002",
    year: "2023",
    name: "已結束梯次範例一",
    status: "finished",
    members: [{ userId: "U001", roles: ["teacher"] }],
  },
];

// ------------------------------------------
// 2. Tab Switching Logic (動態分頁切換)
// ------------------------------------------
function switchTab(index, targetId) {
  const indicator = document.getElementById("segmentIndicator");
  const items = document.querySelectorAll(".nav-segment-item");

  // 計算滑動位置
  if (index === 0) {
    indicator.style.transform = "translateX(0)";
  } else if (index === 1) {
    indicator.style.transform = "translateX(100%) translateX(4px)";
    renderRoles(); // Switch to Roles tab -> Re-render roles
  }

  // 更新按鈕樣式
  items.forEach((item) => item.classList.remove("active"));
  items[index].classList.add("active");

  // 切換內容顯示
  document.querySelectorAll(".tab-pane").forEach((el) => {
    el.classList.remove("show", "active");
  });
  const target = document.querySelector(targetId);
  if (target) {
    target.classList.add("show", "active");
  }
}

// ------------------------------------------
// 3. Permission Modal Logic (權限設定)
// ------------------------------------------
function updateCardStyles() {
  document
    .querySelectorAll('.permission-item-card input[type="checkbox"]')
    .forEach((input) => {
      const card = input.closest(".permission-item-card");
      if (input.checked) {
        card.classList.add("checked");
      } else {
        card.classList.remove("checked");
      }
    });
}

function renderPermissions(role) {
    // 1. Reset all checkboxes
    document.querySelectorAll('#permissionModal input[type="checkbox"]').forEach(c => c.checked = false);
    document.querySelectorAll('input[name="prop_access"]').forEach(r => r.disabled = true);
    document.querySelectorAll('input[name="review_access"]').forEach(r => r.disabled = true);
    document.getElementById("prop_view").checked = true; // reset to view only default
    document.getElementById("review_view").checked = true; 

    // 2. Set Role Type
    const type = role.type || "internal";
    if(document.getElementById(`permType_${type}`)) {
        document.getElementById(`permType_${type}`).checked = true;
    }

    // 3. Set Visible Blocks (Top Section)
    if(role.permissions) {
        role.permissions.forEach(permId => {
            const el = document.getElementById(permId);
            if(el) el.checked = true;
        });
    }

    // 4. Set Detail Permissions (Edit/View)
    
    // Proposition (perm_3)
    const hasProp = document.getElementById("perm_3").checked;
    const propRadios = document.querySelectorAll('input[name="prop_access"]');
    propRadios.forEach(r => r.disabled = !hasProp);
    if(hasProp && role.details && role.details["perm_3"] === "edit") {
        document.getElementById("prop_edit").checked = true;
    } else {
         document.getElementById("prop_view").checked = true;
    }

    // Review (perm_4)
    const hasReview = document.getElementById("perm_4").checked;
    const reviewRadios = document.querySelectorAll('input[name="review_access"]');
    reviewRadios.forEach(r => r.disabled = !hasReview);
    if(hasReview && role.details && role.details["perm_4"] === "edit") {
        document.getElementById("review_edit").checked = true;
    } else {
        document.getElementById("review_view").checked = true;
    }

    updateCardStyles();
}

function openPermissionModal(roleName) {
  const modalObj = new bootstrap.Modal(
    document.getElementById("permissionModal")
  );
  
  // 設定標題
  document.getElementById("modalRoleTitle").innerText = roleName;

  // Find Role Data
  const role = rolesData.find(r => r.name === roleName);
  if(role) {
      currentEditingRole = role; 
      renderPermissions(role);
  }

  modalObj.show();
}

function setupPermissionListeners() {
    document.getElementById("perm_3").addEventListener("change", (e) => {
        const enabled = e.target.checked;
        document.querySelectorAll('input[name="prop_access"]').forEach(r => r.disabled = !enabled);
    });
    document.getElementById("perm_4").addEventListener("change", (e) => {
        const enabled = e.target.checked;
        document.querySelectorAll('input[name="review_access"]').forEach(r => r.disabled = !enabled);
    });
    
    // Auto-save logic could go here or on a button
    // For this demo, we might want to attach a listener to the Save button in the modal
    const saveBtn = document.querySelector('#permissionModal .btn-primary');
    if(saveBtn) {
        saveBtn.onclick = () => savePermissions();
    }
}

function savePermissions() {
    if(!currentEditingRole) return;

    // 1. Collect Type
    const typeEl = document.querySelector('input[name="permRoleType"]:checked');
    if(typeEl) {
        currentEditingRole.type = typeEl.value;
    }

    // 2. Collect Visible Blocks
    const newPermissions = [];
    for(let i=1; i<=8; i++) {
        const pid = `perm_${i}`;
        const el = document.getElementById(pid);
        if(el && el.checked) {
            newPermissions.push(pid);
        }
    }
    
    // 3. Collect Details
    const details = {};
    if(newPermissions.includes("perm_3")) {
        details["perm_3"] = document.getElementById("prop_edit").checked ? "edit" : "view";
    } else {
        details["perm_3"] = "none";
    }
    
    if(newPermissions.includes("perm_4")) {
        details["perm_4"] = document.getElementById("review_edit").checked ? "edit" : "view";
    } else {
        details["perm_4"] = "none";
    }
    
    // 4. Update Data
    currentEditingRole.permissions = newPermissions;
    currentEditingRole.details = details;

    // 5. Update UI & Close
    renderRoles();
    bootstrap.Modal.getInstance(document.getElementById("permissionModal")).hide();
    alert(`權限已儲存：${currentEditingRole.name}`);
}

let currentEditingRole = null; 

function openAddRoleModal() {
  const modal = new bootstrap.Modal(document.getElementById("addRoleModal"));
  
  // 重置表單
  document.getElementById("newRoleName").value = "";
  document.getElementById("newRoleDesc").value = "";
  
  // Reset Preview
  document.getElementById("selectedIconPreview").innerText = "?";
  
  // Reset Type
  document.getElementById("roleType_internal").checked = true;

  if (typeof selectedIcon !== 'undefined') selectedIcon = null; 
  
  selectTheme('admin'); 
  modal.show();
}

// ------------------------------------------
// 4. User Management (新增/編輯使用者)
// ------------------------------------------

// 開啟新增使用者 Modal
function openAddUserModal() {
  const modal = new bootstrap.Modal(document.getElementById("addUserModal"));
  // ... (clearing fields) ...
  document.getElementById("addUserName").value = "";
  document.getElementById("addUserAccount").value = ""; 
  document.getElementById("addUserEmail").value = "";
  if(document.getElementById("addUserTitle")) document.getElementById("addUserTitle").value = "";

  populateRoleSelects();
  
  modal.show();
}

function populateRoleSelects() {
    const addSelect = document.getElementById("addUserRole");
    const editSelect = document.getElementById("editRole");
    
    // Generate Options HTML - Filter INTERNAL only
    let options = '<option selected disabled>請選擇身分...</option>';
    rolesData
        .filter(r => r.type === "internal" || !r.type) // Default internal if undefined
        .forEach(role => {
            options += `<option value="${role.id}">${role.name}</option>`;
        });

    if(addSelect) addSelect.innerHTML = options;
    if(editSelect) editSelect.innerHTML = options;
}


// 開啟編輯使用者 Modal (核心邏輯)
function openEditUserModal(index) {
  const user = mockUsers[index];
  if (!user) {
    console.error("User not found for index:", index);
    return;
  }

  const modal = new bootstrap.Modal(document.getElementById("editUserModal"));

  // 填入 [基本帳號資料]
  // Ensure options are populated
  populateRoleSelects();

  if(document.getElementById("editUserId")) document.getElementById("editUserId").value = user.id;
  if(document.getElementById("editRealName")) document.getElementById("editRealName").value = user.name;
  
  // Split Account and Email
  if(document.getElementById("editAccount")) document.getElementById("editAccount").value = user.account || "";
  if(document.getElementById("editEmail")) document.getElementById("editEmail").value = user.email;
  
  if(document.getElementById("editRole")) document.getElementById("editRole").value = user.role || "admin";
  if(document.getElementById("editTitle")) document.getElementById("editTitle").value = user.title;
  if(document.getElementById("editPhone")) document.getElementById("editPhone").value = user.phone;
  
  // Set Modal Title Name
  const titleNameEl = document.getElementById("modalEditTitleName");
  if (titleNameEl) {
      titleNameEl.innerText = user.name;
  }

  if(document.getElementById("accountStatus")) {
      document.getElementById("accountStatus").checked = (user.status === "active");
  }

  // --- 填入指派區塊的專案下拉選單 ---
  const assignSelect = document.getElementById("assignProjectSelect");
  if (assignSelect) {
    assignSelect.innerHTML = '<option selected disabled>請選擇梯次...</option>';
    projectsData
      .filter((p) => p.status === "active")
      .forEach((p) => {
        assignSelect.innerHTML += `<option value="${p.id}">${p.year} ${p.name}</option>`;
      });
  }

  // --- 渲染已參與專案列表 ---
  renderUserProjectList(user.id);

  modal.show();
}

// 渲染列表的獨立函式
function renderUserProjectList(userId) {
  const projectListDiv = document.getElementById("userProjectHistory");
  if (!projectListDiv) return;

  projectListDiv.innerHTML = "";

  // 找出該使用者參與的所有專案
  const userProjects = projectsData.filter((p) =>
    p.members.some((m) => m.userId === userId)
  );

  if (userProjects.length === 0) {
    projectListDiv.innerHTML =
      '<div class="text-center text-muted py-4">此使用者目前未參與任何命題專案</div>';
    return;
  }

  userProjects.forEach((p) => {
    const memberInfo = p.members.find((m) => m.userId === userId);

    // 翻譯角色標籤
    const roleBadges = memberInfo.roles
      .map((r) => {
        if (r === "teacher")
          return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 me-1">命題教師</span>';
        if (r === "reviewer")
          return '<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 me-1">審題委員</span>';
        if (r === "admin")
          return '<span class="badge bg-dark me-1">系統管理員</span>';
        return "";
      })
      .join("");

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
                        ${
                          p.status === "active"
                            ? '<span class="text-success"><i class="bi bi-circle-fill" style="font-size:6px; vertical-align:middle"></i> 進行中</span>'
                            : '<span class="text-muted">已封存</span>'
                        }
                    </div>
                </div>
            </div>
        `;
    projectListDiv.innerHTML += html;
  });
}

function addProjectRoleMock() {
  const projectSelect = document.getElementById("assignProjectSelect");
  const roleSelect = document.getElementById("assignRoleSelect");

  if (!projectSelect || projectSelect.value === "請選擇梯次...") {
    alert("請選擇一個梯次");
    return;
  }
  
  const projectName = projectSelect.options[projectSelect.selectedIndex].text;
  const roleName = roleSelect.options[roleSelect.selectedIndex].text;

  alert(`(模擬) 已將使用者加入「${projectName}」擔任「${roleName}」`);
}


// ------------------------------------------
// 5. Icon Picker & Theme Logic (圖示與主題)
// ------------------------------------------
function selectTheme(theme) {
    // 雖然沒有全域變數 selectedThemeValue，但這裡可以直接操作 DOM
    document.getElementById("selectedTheme").value = theme;
    
    const preview = document.getElementById("selectedIconPreview");
    // 清除舊主題 class (正規表達式太麻煩，直接重置)
    preview.className = "icon-preview theme-" + theme;
    
    // 更新按鈕樣式
    const buttons = document.querySelectorAll("button[data-theme]");
    buttons.forEach((btn) => {
      btn.style.boxShadow = "none";
      btn.style.transform = "scale(1)";
    });
    
    const activeBtn = document.querySelector(`button[data-theme="${theme}"]`);
    if (activeBtn) {
      activeBtn.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.5)";
      activeBtn.style.transform = "scale(1.1)";
    }
}

function saveNewRole() {
    const roleName = document.getElementById("newRoleName").value.trim();
    if (!roleName) {
      alert("請輸入角色名稱");
      return;
    }

    alert(`角色「${roleName}」已新增成功！`);
    
    // Capture Type
    const typeEl = document.querySelector('input[name="newRoleType"]:checked');
    const roleType = typeEl ? typeEl.value : "internal";

    // Mock Update: Add to rolesData
    rolesData.push({
        id: "custom_" + Date.now(),
        name: roleName,
        description: document.getElementById("newRoleDesc").value,
        icon: "", // Deprecated, using name char
        theme: document.getElementById("selectedTheme").value || "admin",
        type: roleType, 
        permissions: ["perm_1", "perm_7"], // Default to something basic
        tags: [],
        details: {}
    });
    renderRoles(); // Refresh List

    bootstrap.Modal.getInstance(document.getElementById("addRoleModal")).hide();
}


// ------------------------------------------
// 7. Render Role Cards (Dynamic)
// ------------------------------------------
// ... (Render logic is updated above, this just comments)

// ...

function renderRoles() {
  const container = document.getElementById("roleCardsContainer");
  if (!container) return;

  const getCardHtml = (role) => {
    // Generate Tags HTML
    const tagsHtml = (role.permissions || [])
      .map((pid) => {
        const p = PERMISSION_MAP[pid];
        if (!p) return "";

        let suffix = "";
        // Special logic for perm_3 (Proposition) and perm_4 (Review) to show View/Edit icons
        if ((pid === "perm_3" || pid === "perm_4") && role.details) {
            const access = role.details[pid];
            if (access === "edit") {
                suffix = '<i class="bi bi-pencil-square ms-1" style="font-size: 0.8em; opacity: 0.8;" title="可編輯"></i>';
            } else if (access === "view") {
                suffix = '<i class="bi bi-eye-fill ms-1" style="font-size: 0.8em; opacity: 0.8;" title="僅檢視"></i>';
            }
        }
        
        return `<span class="badge-tag-base ${p.style}">${p.label}${suffix}</span>`;
      })
      .join("");

    return `
        <div class="col-md-6 col-lg-4">
          <div class="role-card-v1 theme-${role.theme}">
            <button class="action-button">編輯權限</button>
            <div class="icon-wrapper">
              <span class="h2 mb-0 fw-bold">${role.name.charAt(0)}</span>
            </div>
            <h3 class="role-title">${role.name}</h3>
            <p class="role-description">${role.description}</p>
            <div class="stats-row">
              <div class="stat-item flex-grow-1">
                <span class="stat-label">權限標籤</span>
                <div class="multi-role-badges mt-1">
                    ${tagsHtml}
                </div>
              </div>
            </div>
          </div>
        </div>
        `;
    };

    const internalRoles = rolesData.filter(r => r.type === "internal" || !r.type);
    const externalRoles = rolesData.filter(r => r.type === "external");

    let html = "";

    // 1. Global Action: Add Role Card
    html += `
    <div class="col-md-6 col-lg-4">
      <div class="add-role-card">
        <div class="icon-plus"><i class="bi bi-plus-lg"></i></div>
        <h4 class="add-title">新增角色</h4>
        <p class="add-description">自訂新的身分類別與權限配置</p>
      </div>
    </div>
    `;

    // 2. Section: Internal
    html += `<div class="col-12 mt-3"><h5 class="fw-bold text-primary border-start border-4 border-primary ps-2 mb-2">內部人員 (Internal)</h5></div>`;
    internalRoles.forEach(role => {
        html += getCardHtml(role);
    });

    // 3. Section: External
    if(externalRoles.length > 0) {
        html += `<div class="col-12 mt-4"><h5 class="fw-bold text-success border-start border-4 border-success ps-2 mb-2">外部人員 (External)</h5></div>`;
        externalRoles.forEach(role => {
            html += getCardHtml(role);
        });
    }

    container.innerHTML = html;

    // Re-bind click events
    bindRoleCardEvents();
}

function bindRoleCardEvents() {
    // C. 角色卡片點擊 (開啟權限設定)
  document.querySelectorAll(".role-card-v1").forEach((card) => {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".action-button")) return; 
      const roleTitle = this.querySelector(".role-title").innerText;
      openPermissionModal(roleTitle);
    });
    
    const actionBtn = card.querySelector(".action-button");
    if (actionBtn) {
      actionBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const roleTitle = card.querySelector(".role-title").innerText;
        openPermissionModal(roleTitle);
      });
    }
  });

  // D. 新增角色卡片
  const addRoleCard = document.querySelector(".add-role-card");
  if(addRoleCard) {
      addRoleCard.addEventListener("click", () => {
        openAddRoleModal();
      });
  }
}

function toggleCard(cardElement) {
      // 找到卡片內的 checkbox
      const checkbox = cardElement.querySelector('input[type="checkbox"]');
      
      // 因為我們把 onclick 加在 label 上，瀏覽器會自動切換 checkbox 狀態
      // 我們只需要根據 checkbox 的最終狀態來切換 CSS class
      
      // 使用 setTimeout 確保在瀏覽器完成 checkbox 狀態切換後才執行樣式判斷
      setTimeout(() => {
        if (checkbox.checked) {
          cardElement.classList.add('active');
        } else {
          cardElement.classList.remove('active');
        }
      }, 0);
    }

// ------------------------------------------
// 6. Initialization (初始化事件綁定)
// ------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    
  // A. 權限卡片樣式初始化
  updateCardStyles();
  document.querySelectorAll('.permission-item-card input[type="checkbox"]').forEach((input) => {
      input.addEventListener("change", updateCardStyles);
  });

  // B. Icon Picker 點擊事件
  // B. Icon Picker Logic - Replaced with Name Input Listener
  const newRoleNameInput = document.getElementById("newRoleName");
  if(newRoleNameInput) {
      newRoleNameInput.addEventListener("input", function() {
          const val = this.value.trim();
          const char = val ? val.charAt(0) : "?";
          document.getElementById("selectedIconPreview").innerText = char;
      });
  }

  // C & D moved to bindRoleCardEvents called by renderRoles
  renderRoles(); // Initial Render
  setupPermissionListeners();
});
