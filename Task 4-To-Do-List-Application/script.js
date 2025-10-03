document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const addButton = document.getElementById('addButton');
    const taskList = document.getElementById('taskList');
    const clearAllButton = document.getElementById('clearAllButton');
    const clearCompletedButton = document.getElementById('clearCompletedButton');
    const themeToggle = document.getElementById('themeToggle');
    const searchInput = document.getElementById('searchInput');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const prioritySelect = document.getElementById('prioritySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const emptyState = document.getElementById('emptyState');
    
    // Stats elements
    const totalTasksEl = document.getElementById('totalTasks');
    const completedTasksEl = document.getElementById('completedTasks');
    const activeTasksEl = document.getElementById('activeTasks');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // State
    let tasks = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let draggedElement = null;

    // Load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem('kannantech_tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
    }

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('kannantech_tasks', JSON.stringify(tasks));
    }

    // Load theme preference
    function loadTheme() {
        const savedTheme = localStorage.getItem('kannantech_theme');
        if (savedTheme) {
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
                themeToggle.textContent = '☀️';
            } else {
                themeToggle.textContent = '🌙';
            }
        } else {
            // Default to system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
                themeToggle.textContent = '☀️';
                localStorage.setItem('kannantech_theme', 'dark');
            } else {
                themeToggle.textContent = '🌙';
                localStorage.setItem('kannantech_theme', 'light');
            }
        }
    }

    // Toggle theme
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('kannantech_theme', isDark ? 'dark' : 'light');
    }

    // Update statistics
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const active = total - completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        totalTasksEl.textContent = total;
        completedTasksEl.textContent = completed;
        activeTasksEl.textContent = active;
        progressFill.style.width = percentage + '%';
        progressText.textContent = percentage + '% Complete';

        // Show/hide empty state
        if (total === 0) {
            emptyState.classList.add('show');
        } else {
            emptyState.classList.remove('show');
        }
    }

    // Check if date is overdue
    function isOverdue(dueDate) {
        if (!dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        return due < today;
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    // Filter and search tasks
    function getFilteredTasks() {
        return tasks.filter(task => {
            // Filter by status
            const statusMatch = 
                currentFilter === 'all' ||
                (currentFilter === 'completed' && task.completed) ||
                (currentFilter === 'active' && !task.completed);

            // Filter by search query
            const searchMatch = task.text.toLowerCase().includes(searchQuery.toLowerCase());

            return statusMatch && searchMatch;
        });
    }

    // Get drag after element for reordering
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Render tasks
    function renderTasks() {
        taskList.innerHTML = '';
        const filteredTasks = getFilteredTasks();
        const canDrag = currentFilter === 'all' && searchQuery === '';

        filteredTasks.forEach((task) => {
            const listItem = document.createElement('li');
            listItem.className = 'task-item';
            listItem.dataset.id = task.id;
            
            if (task.completed) {
                listItem.classList.add('completed');
            }
            
            listItem.classList.add(`priority-${task.priority}`);

            if (canDrag) {
                listItem.draggable = true;
                listItem.addEventListener('dragstart', handleDragStart);
                listItem.addEventListener('dragend', handleDragEnd);
            }

            // Task Content
            const taskContent = document.createElement('div');
            taskContent.className = 'task-content';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleComplete(task.id));

            const taskDetails = document.createElement('div');
            taskDetails.className = 'task-details';

            const taskText = document.createElement('div');
            taskText.className = 'task-text';
            taskText.textContent = task.text;

            const taskMeta = document.createElement('div');
            taskMeta.className = 'task-meta';

            // Priority Badge
            const priorityBadge = document.createElement('span');
            priorityBadge.className = `priority-badge ${task.priority}`;
            priorityBadge.textContent = task.priority;
            taskMeta.appendChild(priorityBadge);

            // Due Date Badge
            if (task.dueDate) {
                const dueDateBadge = document.createElement('span');
                dueDateBadge.className = 'due-date-badge';
                if (isOverdue(task.dueDate) && !task.completed) {
                    dueDateBadge.classList.add('overdue');
                    dueDateBadge.textContent = '⚠️ ' + formatDate(task.dueDate);
                } else {
                    dueDateBadge.textContent = '📅 ' + formatDate(task.dueDate);
                }
                taskMeta.appendChild(dueDateBadge);
            }

            taskDetails.appendChild(taskText);
            taskDetails.appendChild(taskMeta);
            taskContent.appendChild(checkbox);
            taskContent.appendChild(taskDetails);

            // Task Actions
            const taskActions = document.createElement('div');
            taskActions.className = 'task-actions';

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'task-btn edit-btn';
            editButton.addEventListener('click', () => editTask(task.id));

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'task-btn delete-btn';
            deleteButton.addEventListener('click', () => deleteTask(task.id));

            taskActions.appendChild(editButton);
            taskActions.appendChild(deleteButton);

            listItem.appendChild(taskContent);
            listItem.appendChild(taskActions);

            taskList.appendChild(listItem);
        });

        updateStats();
        saveTasks();
    }

    // Add new task
    function addTask() {
        const taskText = taskInput.value.trim();
        const priority = prioritySelect.value;
        const dueDate = dueDateInput.value;

        if (taskText === '') {
            alert('Please enter a task!');
            return;
        }

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            priority: priority,
            dueDate: dueDate,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        taskInput.value = '';
        dueDateInput.value = '';
        prioritySelect.value = 'medium';
        taskInput.focus();
        renderTasks();
    }

    // Toggle task completion
    function toggleComplete(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            renderTasks();
        }
    }

    // Edit task
    function editTask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const newText = prompt('Edit your task:', task.text);
            if (newText !== null && newText.trim() !== '') {
                task.text = newText.trim();
                renderTasks();
            }
        }
    }

    // Delete task
    function deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            tasks = tasks.filter(t => t.id !== taskId);
            renderTasks();
        }
    }

    // Clear all tasks
    function clearAllTasks() {
        if (tasks.length === 0) {
            alert('No tasks to clear!');
            return;
        }
        if (confirm('Are you sure you want to delete ALL tasks?')) {
            tasks = [];
            renderTasks();
        }
    }

    // Clear completed tasks
    function clearCompletedTasks() {
        const completedCount = tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            alert('No completed tasks to clear!');
            return;
        }
        if (confirm(`Delete ${completedCount} completed task(s)?`)) {
            tasks = tasks.filter(t => !t.completed);
            renderTasks();
        }
    }

    // Filter tasks
    function setFilter(filter) {
        currentFilter = filter;
        filterButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        renderTasks();
    }

    // Search tasks
    function handleSearch(e) {
        searchQuery = e.target.value;
        renderTasks();
    }

    // Drag and Drop Handlers
    function handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragEnd(e) {
        if (this.classList.contains('dragging')) {
            this.classList.remove('dragging');
        }
        draggedElement = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggedElement);
        } else {
            taskList.insertBefore(draggedElement, afterElement);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        
        // Reorder tasks array based on DOM order
        const taskElements = Array.from(taskList.querySelectorAll('.task-item'));
        const newOrder = taskElements.map(el => parseInt(el.dataset.id));
        tasks.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
        saveTasks();
    }

    // Event Listeners
    addButton.addEventListener('click', addTask);
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    clearAllButton.addEventListener('click', clearAllTasks);
    clearCompletedButton.addEventListener('click', clearCompletedTasks);
    themeToggle.addEventListener('click', toggleTheme);
    searchInput.addEventListener('input', handleSearch);

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setFilter(btn.dataset.filter);
        });
    });

    // Drag and Drop on container
    taskList.addEventListener('dragover', handleDragOver);
    taskList.addEventListener('drop', handleDrop);

    // Initialize app
    loadTheme();
    loadTasks();
    renderTasks();
});