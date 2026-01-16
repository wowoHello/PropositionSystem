const projectToggle = document.getElementById("projectToggle");
const projectDropdown = document.getElementById("projectDropdown");
const closeDropdown = document.getElementById("closeDropdown");
const projectSearchInput = document.getElementById("projectSearchInput");
const projectList = document.getElementById("projectList");
const currentUserRole = document.getElementById("currentUserRole");

const roleMapping = {
  admin: "系統管理員",
  reviewer: "審題委員",
  teacher: "命題教師",
};

const roleClassMapping = {
  admin: "role-admin",
  reviewer: "role-reviewer",
  teacher: "role-teacher",
};

projectToggle.addEventListener("click", function () {
  projectDropdown.classList.toggle("show");
  projectToggle.classList.toggle("active");
});

closeDropdown.addEventListener("click", function (e) {
  e.stopPropagation();
  projectDropdown.classList.remove("show");
  projectToggle.classList.remove("active");
});

document.addEventListener("click", function (e) {
  if (
    !projectToggle.contains(e.target) &&
    !projectDropdown.contains(e.target)
  ) {
    projectDropdown.classList.remove("show");
    projectToggle.classList.remove("active");
  }
});

const projectItems = document.querySelectorAll(".project-item");
projectItems.forEach((item) => {
  item.addEventListener("click", function () {
    projectItems.forEach((i) => i.classList.remove("active"));
    this.classList.add("active");

    const projectYear = this.getAttribute("data-year");
    const projectName = this.getAttribute("data-name");
    const projectRole = this.getAttribute("data-role");

    document.querySelector(".project-year").textContent = projectYear + "年度";
    document.querySelector(".project-name").textContent = projectName;

    const roleText = roleMapping[projectRole];
    const roleClass = roleClassMapping[projectRole];


    currentUserRole.className = "role-badge";
    currentUserRole.classList.add(roleClass);
    currentUserRole.textContent = roleText;

    // logic to hide/show role based on admin status
    if (projectRole === "admin") {
      currentUserRole.style.display = "inline-block";
    } else {
      currentUserRole.style.display = "none";
    }

    projectDropdown.classList.remove("show");
    projectToggle.classList.remove("active");

    console.log("切換專案:", {
      year: projectYear,
      name: projectName,
      role: projectRole,
      roleText: roleText,
    });
  });
});

projectSearchInput.addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase();
  const categories = projectList.querySelectorAll(".project-category");

  projectItems.forEach((item) => {
    const projectName = item
      .querySelector(".project-item-title")
      .textContent.toLowerCase();
    const isMatch = projectName.includes(searchTerm);
    item.style.display = isMatch ? "flex" : "none";
  });

  categories.forEach((category) => {
    let nextElement = category.nextElementSibling;
    let hasVisibleItems = false;

    while (nextElement && !nextElement.classList.contains("project-category")) {
      if (
        nextElement.classList.contains("project-item") &&
        nextElement.style.display !== "none"
      ) {
        hasVisibleItems = true;
        break;
      }
      nextElement = nextElement.nextElementSibling;
    }

    category.style.display = hasVisibleItems ? "block" : "none";
  });
});
