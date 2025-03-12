document.addEventListener("DOMContentLoaded", () => {
    const DB_NAME = "GalleryDB";
    const DB_VERSION = 4; // Увеличена версия для сброса кэша
    let db;

    // Инициализация IndexedDB
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('images')) {
            const imageStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
            imageStore.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains('categories')) {
            const categoryStore = db.createObjectStore('categories', { keyPath: 'name' });
            categoryStore.createIndex('name', 'name', { unique: true });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        initApp();
    };

    // Основная логика
    async function initApp() {
        await loadCategories();
        await loadImages();
        setupEventListeners();
        setupImagePrewie()
        setupFilterButtons(); // Восстановлен обработчик фильтров
    }

    // Восстановленный функционал: кнопки фильтрации
    function setupFilterButtons() {
        document.querySelector('.filter-buttons').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const filter = e.target.dataset.filter;
                loadImages(filter === 'all' ? 'all' : filter);
                document.querySelectorAll('.filter-buttons button').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
            }
        });
    }

    // Загрузка категорий
    async function loadCategories() {
        return new Promise((resolve) => {
            const tx = db.transaction('categories', 'readonly');
            const store = tx.objectStore('categories');
            const req = store.getAll();

            req.onsuccess = () => {
                updateCategoryUI(req.result);
                resolve();
            };
        });
    }

    // Обновление интерфейса категорий
    function updateCategoryUI(categories) {
        const container = document.querySelector('.categories');
        container.innerHTML = `
            <div class="category all-category active">Все изображения</div>
            <div class="category non-sort" data-name="uncategorized">Неотсортированные</div>
            ${categories.map(c => `
                <div class="category" data-name="${c.name}">
                    ${c.name}
                    <button class="delete-category">×</button>
                </div>
            `).join('')}
            <div class="category add-category">
                <span class="add-text">Добавить категорию</span>
                <input type="text" id="new-category-input" class="hidden">
            </div>
        `;
    
        // Обработчик для "Неотсортированные"
        document.querySelector('.category.non-sort').addEventListener('click', () => {
            loadImages('uncategorized');
            document.querySelectorAll('.category').forEach(cat => cat.classList.remove('active'));
            document.querySelector('.category.non-sort').classList.add('active');
        });

        // Обработчики событий
        document.querySelectorAll('.category').forEach(category => {
            category.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-category')) return;
                const categoryName = category.dataset.name || 'all';
                loadImages(categoryName);
                document.querySelectorAll('.category').forEach(cat => cat.classList.remove('active'));
                category.classList.add('active');
            });
        });

        // Обработчик удаления категории
        document.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', handleDeleteCategory);
        });

        const newCategoryInput = document.getElementById('new-category-input');
        newCategoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && newCategoryInput.value.trim()) {
                addCategory(newCategoryInput.value.trim());
                newCategoryInput.value = '';
                newCategoryInput.classList.add('hidden');
            }
        });

        // Обновление выпадающих списков
        updateSelectOptions(categories);
    }

    // Обновление select-элементов
    function updateSelectOptions(categories) {
        const selects = document.querySelectorAll('select#image-category, select#edit-category');
        selects.forEach(select => {
            select.innerHTML = '<option value="" disabled selected>Выберите категорию</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });
    }

    // Добавление категории
    function addCategory(name) {
        const tx = db.transaction('categories', 'readwrite');
        const store = tx.objectStore('categories');
        const req = store.add({ name });

        req.onsuccess = () => loadCategories();
        req.onerror = () => alert('Категория уже существует!');
    }

    // Удаление категории
    function handleDeleteCategory(e) {
        const categoryName = e.target.closest('.category').dataset.name;
        const tx = db.transaction(['categories', 'images'], 'readwrite');
        const categoryStore = tx.objectStore('categories');
        const imageStore = tx.objectStore('images');

        // Удаление категории
        categoryStore.delete(categoryName);

        // Перенос изображений в uncategorized
        const cursorRequest = imageStore.openCursor();
        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.category === categoryName) {
                    cursor.update({ ...cursor.value, category: 'uncategorized' });
                }
                cursor.continue();
            }
        };

        tx.oncomplete = () => {
            loadCategories();
            loadImages();
        };
    }

    // Загрузка изображений
    async function loadImages(filter = 'all') {
        return new Promise((resolve) => {
            const tx = db.transaction('images', 'readonly');
            const store = tx.objectStore('images');
            const req = store.getAll();
    
            req.onsuccess = () => {
                let images;
                if (filter === 'all') {
                    images = req.result;
                } else if (filter === 'uncategorized') {
                    images = req.result.filter(img => img.category === 'uncategorized');
                } else {
                    images = req.result.filter(img => img.category === filter);
                }
                updateGalleryUI(images);
                resolve();
            };
        });
    }

    // Обновление галереи
    function updateGalleryUI(images) {
        const gallery = document.querySelector('.gallery');
        gallery.innerHTML = images.map(img => `
            <div class="card" data-id="${img.id}">
                <img src="${img.src}" alt="${img.title}">
                <h3>${img.title}</h3>
                <p>${img.description}</p>
                <p class="category-label">Категория: ${img.category}</p>
                <div class="button-container">
                    <button class="edit-btn">Редактировать</button>
                    <button class="delete-btn">Удалить</button>
                </div>
            </div>
        `).join('');

        // Обработчики событий
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEditImage);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteImage);
        });
    }

    // Обработчик редактирования изображения
    function handleEditImage(e) {
        const card = e.target.closest('.card');
        const id = parseInt(card.dataset.id);

        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        const req = store.get(id);

        req.onsuccess = () => {
            const image = req.result;
            openEditModal(image);
        };
    }

    // Открытие модального окна редактирования
    function openEditModal(image) {
        document.getElementById('edit-image-preview').src = image.src; 
        const modal = document.getElementById('edit-modal');
        document.getElementById('edit-image-preview').src = image.src;
        document.getElementById('edit-title').value = image.title;
        document.getElementById('edit-description').value = image.description;
        document.getElementById('edit-category').value = image.category;
        modal.style.display = 'block';

        // Обработчик сохранения изменений
        document.getElementById('save-changes').onclick = () => {
            const updatedImage = {
                id: image.id,
                title: document.getElementById('edit-title').value,
                description: document.getElementById('edit-description').value,
                category: document.getElementById('edit-category').value,
                src: image.src
            };

            const tx = db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            store.put(updatedImage);

            tx.oncomplete = () => {
                loadImages();
                modal.style.display = 'none';
            };
        };

        // Обработчик отмены
        document.getElementById('cancel-changes').onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Обработчик удаления изображения
    function handleDeleteImage(e) {
        const card = e.target.closest('.card');
        const id = parseInt(card.dataset.id);

        const confirmModal = document.getElementById('confirm-modal');
        confirmModal.style.display = 'block';

        document.getElementById('confirm-delete').onclick = () => {
            const tx = db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            store.delete(id);

            tx.oncomplete = () => {
                loadImages();
                confirmModal.style.display = 'none';
            };
        };

        document.getElementById('cancel-delete').onclick = () => {
            confirmModal.style.display = 'none';
        };
    }

    // Обработчик добавления изображения
    function setupEventListeners() {
        document.getElementById('upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const file = document.getElementById('image-upload').files[0];
            const title = document.getElementById('image-title').value;
            const description = document.getElementById('image-description').value;
            const category = document.getElementById('image-category').value;

            if (!file || !title || !description || !category) {
                alert('Заполните все поля!');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const image = {
                    src: reader.result,
                    title,
                    description,
                    category
                };

                const tx = db.transaction('images', 'readwrite');
                const store = tx.objectStore('images');
                store.add(image);

                tx.oncomplete = () => {
                    loadImages();
                    document.getElementById('upload-form').reset();
                };

            };
            document.querySelector(".image-preview").style.height = "50%";
            document.querySelector(".image-preview").style.width = "50%";
            document.getElementById("preview").src = "images/no_image.png";
            reader.readAsDataURL(file);
        });
    }

    function setupImagePrewie() {
        document.getElementById("image-upload").addEventListener("change", function(event) {
            const file = event.target.files[0]; 
            if (file) {
                document.querySelector(".image-preview").style.height = "400px";
                document.querySelector(".image-preview").style.width = "100%";
                
                const reader = new FileReader(); 
        
                reader.onload = function(e) {
                    document.getElementById("preview").src = e.target.result; 
                };
        
                reader.readAsDataURL(file); 
            }
            else{
                if (document.getElementById("image-upload").files.length){
                    document.querySelector(".image-preview").style.height = "100%";
                    document.querySelector(".image-preview").style.width = "100%";
                    
                    document.getElementById("preview").src = e.target.result; 
                }
                else{
                    document.querySelector(".image-preview").style.height = "50%";
                    document.querySelector(".image-preview").style.width = "50%";
                    
                    document.getElementById("preview").src = "images/no_image.png";
                }
            }
        });
    }
});
