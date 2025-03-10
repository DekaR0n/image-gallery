const taskField = document.querySelector(".task-input input"),
      clearBtn = document.querySelector(".clear-btn"),
      taskContainer = document.querySelector(".task-box");

taskContainer.style.maxHeight = "300px";
taskContainer.style.overflowY = "auto";

let editIndex = null,
    isEditing = false,
    taskList = JSON.parse(localStorage.getItem("tasks")) || [];

const renderTasks = () => {
    taskContainer.innerHTML = "";
    
    if (taskList.length === 0) {
        taskContainer.innerHTML = `<span>No tasks available</span>`;
    } else {
      taskList.forEach((task, index) => {
            let isChecked = task.status === "completed" ? "checked" : "";
            let taskElement = document.createElement("li");
            taskElement.classList.add("task");
            taskElement.innerHTML = `
                <label>
                    <input type="checkbox" ${isChecked} onclick="toggleStatus(${index})">
                    <p class="${isChecked}">${task.name}</p>
                </label>
                <div class="actions">
                    <button onclick="editTask(${index}, '${task.name}')" class="ed-btn">Edit</button>
                    <button onclick="removeTask(${index})" class="ed-btn">Delete</button>
                </div>
            `;
            taskContainer.appendChild(taskElement);
        });
    }
    clearBtn.classList.toggle("active", taskList.length > 0);
};

const toggleStatus = (index) => {
    taskList[index].status = taskList[index].status === "completed" ? "pending" : "completed";
    localStorage.setItem("tasks", JSON.stringify(taskList));
    renderTasks(document.querySelector("span.active").id);
};

const editTask = (index, name) => {
    editIndex = index;
    isEditing = true;
    taskField.value = name;
    taskField.focus();
};

const removeTask = (index) => {
    taskList.splice(index, 1);
    localStorage.setItem("tasks", JSON.stringify(taskList));
    renderTasks("all");
};

clearBtn.addEventListener("click", () => {
    taskList = [];
    localStorage.clear();
    renderTasks("all");
});

taskField.addEventListener("keyup", (e) => {
    let newTask = taskField.value.trim();
    if (e.key === "Enter" && newTask) {
        if (!isEditing) {
            taskList.push({ name: newTask, status: "pending" });
        } else {
            isEditing = false;
            taskList[editIndex].name = newTask;
        }
        taskField.value = "";
        localStorage.setItem("tasks", JSON.stringify(taskList));
        renderTasks(document.querySelector("span.active").id);
    }
});

renderTasks("all");