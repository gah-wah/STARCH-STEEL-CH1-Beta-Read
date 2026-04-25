document.addEventListener('DOMContentLoaded', () => {
    // Cloudflare R2 bucket base URL
    const baseUrl = 'https://pub-aa22273331a84637a8fa5617ac53d5a0.r2.dev/';

    // State and configuration for all categories
    // Helper to generate options
    const generateOptions = (prefix, maxCount, includeNone = true) => {
        const opts = [];
        if (includeNone) opts.push({ name: 'None', file: null });
        for (let i = 1; i <= maxCount; i++) {
            opts.push({ name: `${prefix} ${i}`, file: `${prefix}${i}.png` });
        }
        return opts;
    };

    const categories = {
        body: {
            layerId: 'layer-body',
            options: generateOptions('Body', 5, false),
            currentIndex: 0
        },
        face: {
            layerId: 'layer-face',
            options: generateOptions('Face', 19, true),
            currentIndex: 0
        },
        hat: {
            layerId: 'layer-hat',
            options: generateOptions('Hat', 16, true),
            currentIndex: 0
        },
        acc1: {
            layerId: 'layer-acc1',
            options: generateOptions('Accessory', 17, true),
            currentIndex: 0
        },
        acc2: {
            layerId: 'layer-acc2',
            options: generateOptions('Accessory', 17, true),
            currentIndex: 0
        }
    };

    // Global z-index counter for dynamic layering
    let topZIndex = 10;

    function bringToFront(categoryKey) {
        if (categoryKey === 'body') return; // Body is the base and must stay at the bottom
        const category = categories[categoryKey];
        const layerImg = document.getElementById(category.layerId);
        topZIndex++;
        layerImg.style.zIndex = topZIndex;
    }

    // 1x1 transparent gif to prevent broken image icon
    const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    function updateLayer(categoryKey, animate = true) {
        const category = categories[categoryKey];
        const option = category.options[category.currentIndex];
        
        const layerImg = document.getElementById(category.layerId);

        if (option.file) {
            const newSrc = baseUrl + option.file;

            if (animate) {
                // Preload image to prevent clunky animation of old image
                const tempImg = new Image();
                tempImg.onload = () => {
                    layerImg.src = newSrc;
                    layerImg.classList.add('visible');
                    bringToFront(categoryKey);
                    
                    // Re-trigger CSS animation
                    layerImg.classList.remove('pop-animation');
                    void layerImg.offsetWidth; // trigger reflow
                    layerImg.classList.add('pop-animation');
                };
                tempImg.src = newSrc;
            } else {
                layerImg.src = newSrc;
                layerImg.classList.add('visible');
            }
        } else {
            // Hide layer if "None" is selected
            layerImg.classList.remove('visible');
            // Remove source and replace with transparent pixel after fade out transition (0.3s)
            setTimeout(() => {
                if (!layerImg.classList.contains('visible')) {
                    layerImg.src = transparentPixel;
                }
            }, 300);
        }
    }

    function setupControls(categoryKey) {
        const prevBtn = document.getElementById(`btn-${categoryKey}-prev`);
        const nextBtn = document.getElementById(`btn-${categoryKey}-next`);
        const refreshBtn = document.getElementById(`btn-${categoryKey}-refresh`);

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                updateLayer(categoryKey);
            });
        }

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
