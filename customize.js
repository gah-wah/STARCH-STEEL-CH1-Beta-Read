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
            options: generateOptions('Face', 26, true),
            currentIndex: 0
        },
        hat: {
            layerId: 'layer-hat',
            options: generateOptions('Hat', 22, true),
            currentIndex: 0
        },
        acc1: {
            layerId: 'layer-acc1',
            options: generateOptions('Accessory', 28, true),
            currentIndex: 0
        },
        acc2: {
            layerId: 'layer-acc2',
            options: generateOptions('Accessory', 28, true),
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
        
        // Update the list number display
        const numDisplay = document.getElementById(`num-${categoryKey}`);
        if (numDisplay) {
            // If the first option is 'None', currentIndex 0 is 0. Otherwise it's 1-based.
            const hasNone = category.options[0].name === 'None';
            numDisplay.textContent = hasNone ? category.currentIndex : category.currentIndex + 1;
        }

        const layerImg = document.getElementById(category.layerId);

        if (option.file) {
            const newSrc = baseUrl + option.file;

            if (animate) {
                // Preload image to prevent clunky animation of old image
                const tempImg = new Image();
                tempImg.crossOrigin = "anonymous";
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

    // Randomize all categories
    function randomizeAll() {
        for (const key in categories) {
            const category = categories[key];
            const max = category.options.length;
            category.currentIndex = Math.floor(Math.random() * max);
            updateLayer(key);
        }
    }

    const randomBtn = document.getElementById('btn-randomize');
    if (randomBtn) {
        randomBtn.addEventListener('click', randomizeAll);
    }

    // --- Export Functionality ---
    async function flattenCharacter() {
        const canvas = document.createElement('canvas');
        const size = 800; // Output size
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; // Keep pixel art crisp

        // Get all layers, sort by z-index
        const layers = Array.from(document.querySelectorAll('.character-layer'))
            .filter(img => img.classList.contains('visible') && img.src && !img.src.startsWith('data:image/gif'))
            .sort((a, b) => {
                return (parseInt(getComputedStyle(a).zIndex) || 0) - (parseInt(getComputedStyle(b).zIndex) || 0);
            });

        for (const layer of layers) {
            try {
                // Draw the DOM image directly. Since the images have crossorigin="anonymous" in HTML,
                // and the CORS headers are set on the bucket, this will not taint the canvas.
                // We use a small timeout fallback just in case the image hasn't fully rendered its latest source,
                // though the load event in updateLayer usually guarantees it.
                if (layer.complete && layer.naturalHeight !== 0) {
                    ctx.drawImage(layer, 0, 0, size, size);
                } else {
                    await new Promise((resolve) => {
                        const tempImg = new Image();
                        tempImg.crossOrigin = "anonymous";
                        tempImg.onload = () => {
                            ctx.drawImage(tempImg, 0, 0, size, size);
                            resolve();
                        };
                        tempImg.onerror = resolve; // Skip on error
                        tempImg.src = layer.src;
                    });
                }
            } catch (err) {
                console.error("Error drawing layer:", layer.id, err);
            }
        }

        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/png');
        });
    }

    const downloadBtn = document.getElementById('btn-download');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const originalText = downloadBtn.innerHTML;
            downloadBtn.textContent = "Processing...";
            downloadBtn.disabled = true;
            try {
                const blob = await flattenCharacter();
                if (blob) {
                    // Generate character code
                    const codeParts = ['body', 'face', 'hat', 'acc1', 'acc2'].map(key => {
                        const category = categories[key];
                        const hasNone = category.options[0].name === 'None';
                        return hasNone ? category.currentIndex : category.currentIndex + 1;
                    });
                    const charCode = codeParts.join('_');

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `starchandsteelcustomcharacter_${charCode}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            } catch (e) {
                console.error("Export failed", e);
                alert("Failed to export. Please check CORS settings.");
            }
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        });
    }

    const copyBtn = document.getElementById('btn-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const originalText = copyBtn.innerHTML;
            copyBtn.textContent = "Copying...";
            copyBtn.disabled = true;
            try {
                const blob = await flattenCharacter();
                if (blob) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => {
                        if (copyBtn.textContent === "Copied!") {
                            copyBtn.innerHTML = originalText;
                            copyBtn.disabled = false;
                        }
                    }, 2000);
                    return; // exit early so we don't reset disabled below
                }
            } catch (e) {
                console.error("Copy failed", e);
                alert("Failed to copy. Please check CORS settings or browser permissions.");
            }
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        });
    }

    // Initialize all controls and layers on load
    for (const key in categories) {
        setupControls(key);
        updateLayer(key, false); // Initialize without pop animation
    }
});
