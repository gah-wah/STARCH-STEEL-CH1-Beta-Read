document.addEventListener('DOMContentLoaded', () => {
    // Cloudflare R2 bucket base URL
    const baseUrl = 'https://pub-aa22273331a84637a8fa5617ac53d5a0.r2.dev/';

    // State and configuration for all categories
    const categories = {
        body: {
            layerId: 'layer-body',
            nameId: 'name-body',
            options: [
                { name: 'Body 1', file: 'Body1.png' },
                { name: 'Body 2', file: 'Body2.png' },
                { name: 'Body 3', file: 'Body3.png' }
            ],
            currentIndex: 0
        },
        face: {
            layerId: 'layer-face',
            nameId: 'name-face',
            options: [
                { name: 'None', file: null },
                { name: 'Face 1', file: 'Face1.png' },
                { name: 'Face 2', file: 'Face2.png' },
                { name: 'Face 3', file: 'Face3.png' },
                { name: 'Face 4', file: 'Face4.png' }
            ],
            currentIndex: 0
        },
        hat: {
            layerId: 'layer-hat',
            nameId: 'name-hat',
            options: [
                { name: 'None', file: null },
                { name: 'Hat 1', file: 'Hat1.png' },
                { name: 'Hat 2', file: 'Hat2.png' }
            ],
            currentIndex: 0
        },
        acc1: {
            layerId: 'layer-acc1',
            nameId: 'name-acc1',
            options: [
                { name: 'None', file: null },
                { name: 'Accessory 1', file: 'Accessory1.png' },
                { name: 'Accessory 2', file: 'Accessory2.png' }
            ],
            currentIndex: 0
        },
        acc2: {
            layerId: 'layer-acc2',
            nameId: 'name-acc2',
            options: [
                { name: 'None', file: null },
                { name: 'Accessory 1', file: 'Accessory1.png' },
                { name: 'Accessory 2', file: 'Accessory2.png' }
            ],
            currentIndex: 0
        }
    };

    function updateLayer(categoryKey, animate = true) {
        const category = categories[categoryKey];
        const option = category.options[category.currentIndex];
        
        const layerImg = document.getElementById(category.layerId);

        if (option.file) {
            // Set image source
            layerImg.src = baseUrl + option.file;
            layerImg.classList.add('visible');
            
            if (animate) {
                // Re-trigger CSS animation
                layerImg.classList.remove('pop-animation');
                void layerImg.offsetWidth; // trigger reflow
                layerImg.classList.add('pop-animation');
            }
        } else {
            // Hide layer if "None" is selected
            layerImg.classList.remove('visible');
            // Remove source after fade out transition (0.3s)
            setTimeout(() => {
                if (!layerImg.classList.contains('visible')) {
                    layerImg.src = '';
                }
            }, 300);
        }
    }

    function setupControls(categoryKey) {
        const prevBtn = document.getElementById(`btn-${categoryKey}-prev`);
        const nextBtn = document.getElementById(`btn-${categoryKey}-next`);

        prevBtn.addEventListener('click', () => {
            const category = categories[categoryKey];
            category.currentIndex--;
            if (category.currentIndex < 0) {
                category.currentIndex = category.options.length - 1; // loop to end
            }
            updateLayer(categoryKey);
        });

        nextBtn.addEventListener('click', () => {
            const category = categories[categoryKey];
            category.currentIndex++;
            if (category.currentIndex >= category.options.length) {
                category.currentIndex = 0; // loop to start
            }
            updateLayer(categoryKey);
        });
    }

    // Initialize all controls and layers on load
    for (const key in categories) {
        setupControls(key);
        updateLayer(key, false); // Initialize without pop animation
    }
});
