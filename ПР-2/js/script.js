
    const buttons = document.querySelectorAll(".filter-buttons button");
    const gallery = document.querySelector(".gallery");
    const form = document.getElementById("upload-form");
    const imageUpload = document.getElementById("image-upload");
    const titleInput = document.getElementById("image-title");
    const descriptionInput = document.getElementById("image-description");
    const categorySelect = document.getElementById("image-category");

    // Загрузка сохраненных изображений
    const savedImages = JSON.parse(localStorage.getItem("galleryImages")) || [];
    savedImages.forEach(image => addImageToGallery(image, false));

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const filter = button.getAttribute("data-filter");
            const filteredImages = filter === "all" ? savedImages : savedImages.filter(img => img.category === filter);
            animateGalleryUpdate(filteredImages);
        });
    });

    form.addEventListener("submit", (event) => {

        event.preventDefault();
        const file = imageUpload.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const newImage = {
                src: reader.result,
                title: titleInput.value,
                description: descriptionInput.value,
                category: categorySelect.value
            };
            savedImages.push(newImage);
            localStorage.setItem("galleryImages", JSON.stringify(savedImages));
            animateGalleryUpdate(savedImages);
            form.reset();
        };
        reader.readAsDataURL(file);
    });

    function animateGalleryUpdate(images) {
        const cards = document.querySelectorAll(".card");
        cards.forEach(card => {
            card.style.opacity = "0";
            card.style.transform = "scale(0.9)";
        });
        setTimeout(() => {
            gallery.innerHTML = "";
            images.forEach(image => addImageToGallery(image, true));
        }, 300);
    }

    function addImageToGallery(image, animate) {
        const newCard = document.createElement("div");
        newCard.classList.add("card");
        newCard.setAttribute("data-category", image.category);
        newCard.innerHTML = `
            <img src="${image.src}" alt="${image.title}">
            <h3>${image.title}</h3>
            <p>${image.description}</p>
        `;
        newCard.style.opacity = "0";
        newCard.style.transform = "scale(0.9)";
        gallery.appendChild(newCard);
        setTimeout(() => {
            newCard.style.opacity = "1";
            newCard.style.transform = "scale(1)";
        }, 100);
    }

