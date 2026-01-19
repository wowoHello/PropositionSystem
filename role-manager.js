// ==========================================
// Role Management Page Logic (role-manager.js)
// ==========================================

// ------------------------------------------
// 1. Mock Data (模擬資料)
// ------------------------------------------
const mockUsers = [
  {
    id: "U001",
    name: "陳言綸",
    email: "test@mail.com",
    org: "教務處",
    title: "行政組長",
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

function openPermissionModal(roleName) {
  const modalObj = new bootstrap.Modal(
    document.getElementById("permissionModal")
  );
  
  // 設定標題
  document.getElementById("modalRoleTitle").innerText = roleName;

  // 重置 Checkbox
  const allChecks = document.querySelectorAll(
    '#permissionModal input[type="checkbox"]'
  );
  allChecks.forEach((c) => (c.checked = false));

  // 模擬預設權限勾選
  document.getElementById("perm_1").checked = true; // 基本登入

  if (roleName === "命題教師") {
    document.getElementById("perm_3").checked = true;
  } else if (roleName === "審題委員") {
    document.getElementById("perm_4").checked = true;
  } else {
    // 管理員或其他全開
    allChecks.forEach((c) => (c.checked = true));
  }

  updateCardStyles();
  modalObj.show();
}

function openAddRoleModal() {
  const modal = new bootstrap.Modal(document.getElementById("addRoleModal"));
  
  // 重置表單
  document.getElementById("newRoleName").value = "";
  document.getElementById("newRoleDesc").value = "";
  document.getElementById("selectedIconValue").value = "";
  document.getElementById("selectedIconName").textContent = "未選擇";
  document.getElementById("selectedIconPreview").innerHTML =
    '<i class="bi bi-question-circle"></i>';
  
  document
    .querySelectorAll(".icon-option")
    .forEach((opt) => opt.classList.remove("selected"));
    
  // 重置全域變數 (若有的話)
  if (typeof selectedIcon !== 'undefined') selectedIcon = null; // 防禦性寫法
  
  selectTheme('admin'); // 重置為預設主題
  modal.show();
}

// ------------------------------------------
// 4. User Management (新增/編輯使用者)
// ------------------------------------------

// 開啟新增使用者 Modal
function openAddUserModal() {
  const modal = new bootstrap.Modal(document.getElementById("addUserModal"));
  
  // 清空欄位
  document.getElementById("addUserName").value = "";
  document.getElementById("addUserEmail").value = "";
  // 其他欄位若有 ID 也可以在此清空
  
  modal.show();
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
  // 注意：這裡假設 HTML 中有對應的 ID。若 HTML ID 不同需同步修改。
  // 原本 cwt-role.html 中有 editRealName, editEmail 等
  if(document.getElementById("editUserId")) document.getElementById("editUserId").value = user.id;
  if(document.getElementById("editRealName")) document.getElementById("editRealName").value = user.name;
  if(document.getElementById("editEmail")) document.getElementById("editEmail").value = user.email;
  if(document.getElementById("editOrg")) document.getElementById("editOrg").value = user.org;
  if(document.getElementById("editTitle")) document.getElementById("editTitle").value = user.title;
  if(document.getElementById("editPhone")) document.getElementById("editPhone").value = user.phone;
  
  // 標題名字
  // HTML 中似乎沒有 modalEditTitleName，但 edituser.js 有用到。
  // 我們檢查一下 HTML 結構... (cwt-role.html 並沒有 modalEditTitleName ID，那是 edituser.js 假設的)
  // 為了相容，我們略過不存在的元素，或者補上。

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
    const iconClass = document.getElementById("selectedIconValue").value;
    if (!roleName) {
      alert("請輸入角色名稱");
      return;
    }
    if (!iconClass) {
      alert("請選擇圖示");
      return;
    }
    alert(`角色「${roleName}」已新增成功！`);
    bootstrap.Modal.getInstance(document.getElementById("addRoleModal")).hide();
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
  const iconOptions = document.querySelectorAll(".icon-option");
  const preview = document.getElementById("selectedIconPreview");
  const iconName = document.getElementById("selectedIconName");
  const iconValue = document.getElementById("selectedIconValue");
  
  if(iconOptions.length > 0) {
      iconOptions.forEach((option) => {
        option.addEventListener("click", function () {
          iconOptions.forEach((opt) => opt.classList.remove("selected"));
          this.classList.add("selected");
          
          const iconClass = this.dataset.icon;
          const name = this.dataset.name;
          
          preview.innerHTML = `<i class="${iconClass}"></i>`;
          iconName.textContent = name;
          iconValue.value = iconClass;
        });
      });
  }

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
});
