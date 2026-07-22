document.addEventListener('DOMContentLoaded', () => {
    // Cloudflare R2 bucket base URL
    const baseUrl = 'https://image.starchandsteel.com/';
    // Session-level cache buster to force fresh assets on reload while caching during the session
    const cacheBuster = Date.now();

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
            currentIndex: 0,
            activeTimeout: null
        },
        face: {
            layerId: 'layer-face',
            options: generateOptions('Face', 40, true),
            currentIndex: 0,
            activeTimeout: null
        },
        hat: {
            layerId: 'layer-hat',
            options: generateOptions('Hat', 30, true),
            currentIndex: 0,
            activeTimeout: null
        },
        acc1: {
            layerId: 'layer-acc1',
            options: generateOptions('Accessory', 31, true),
            currentIndex: 0,
            activeTimeout: null
        },
        acc2: {
            layerId: 'layer-acc2',
            options: generateOptions('Accessory', 31, true),
            currentIndex: 0,
            activeTimeout: null
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
        
        // Update the list number input display
        const numInput = document.getElementById(`input-${categoryKey}`);
        if (numInput && document.activeElement !== numInput) {
            // If the first option is 'None', currentIndex 0 is 0. Otherwise it's 1-based.
            const hasNone = category.options[0].name === 'None';
            numInput.value = hasNone ? category.currentIndex : category.currentIndex + 1;
        }

        const layerImg = document.getElementById(category.layerId);
        layerImg.onload = null; // Reset any previous load listener

        // Cancel any active animation timeout for this layer to prevent overlapping state updates
        if (category.activeTimeout) {
            clearTimeout(category.activeTimeout);
            category.activeTimeout = null;
        }

        if (!animate) {
            // Instant update (used for init and randomize)
            if (option.file) {
                layerImg.src = baseUrl + option.file + '?cb=' + cacheBuster;
                layerImg.classList.remove('pop-out', 'pop-in');
                layerImg.classList.add('visible');
                bringToFront(categoryKey);
            } else {
                layerImg.classList.remove('visible', 'pop-out', 'pop-in');
                layerImg.src = transparentPixel;
            }
            return;
        }

        // Animated update: pop out first
        layerImg.classList.remove('pop-in');
        layerImg.classList.add('pop-out');

        // Wait for pop-out animation to complete (200ms)
        category.activeTimeout = setTimeout(() => {
            category.activeTimeout = null;
            if (option.file) {
                // Hide old image and classes immediately so it does not overlay during load
                layerImg.classList.remove('visible', 'pop-out', 'pop-in');
                
                // Clear active listeners
                layerImg.onload = null;
                layerImg.onerror = null;
                
                // Animate ONLY after the new image asset has successfully loaded
                layerImg.onload = () => {
                    layerImg.onload = null;
                    layerImg.onerror = null;
                    
                    layerImg.classList.add('visible');
                    bringToFront(categoryKey);
                    
                    void layerImg.offsetWidth; // trigger reflow to restart animation
                    layerImg.classList.add('pop-in');
                };
                
                layerImg.onerror = () => {
                    layerImg.onload = null;
                    layerImg.onerror = null;
                    layerImg.src = transparentPixel;
                };
                
                layerImg.src = baseUrl + option.file + '?cb=' + cacheBuster;
            } else {
                layerImg.classList.remove('visible', 'pop-out', 'pop-in');
                layerImg.src = transparentPixel;
            }
        }, 200);
    }

    function setupControls(categoryKey) {
        const prevBtn = document.getElementById(`btn-${categoryKey}-prev`);
        const nextBtn = document.getElementById(`btn-${categoryKey}-next`);
        const refreshBtn = document.getElementById(`btn-${categoryKey}-refresh`);
        const numInput = document.getElementById(`input-${categoryKey}`);

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                updateLayer(categoryKey);
            });
        }

        if (numInput) {
            const handleInputChange = () => {
                const category = categories[categoryKey];
                const hasNone = category.options[0].name === 'None';
                const minVal = hasNone ? 0 : 1;
                const maxVal = hasNone ? category.options.length - 1 : category.options.length;

                let val = parseInt(numInput.value, 10);

                // If invalid or out of range, reset to 0 (or 1 for food/body)
                if (isNaN(val) || val < minVal || val > maxVal) {
                    val = 0; // Return to 0 as requested if no corresponding art exists
                    if (!hasNone && val < minVal) {
                        val = minVal; // Body starts at 1 minimum
                    }
                }

                category.currentIndex = hasNone ? val : val - 1;
                numInput.value = val;
                updateLayer(categoryKey, true);
            };

            numInput.addEventListener('change', handleInputChange);
            numInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    numInput.blur();
                }
            });
            numInput.addEventListener('focus', () => {
                numInput.select();
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
            updateLayer(key, true); // Enable bounce animations on randomize
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
            downloadBtn.textContent = "PROCESSING...";
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
            copyBtn.textContent = "COPYING...";
            copyBtn.disabled = true;
            try {
                const blob = await flattenCharacter();
                if (blob) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    copyBtn.textContent = "COPIED!";
                    setTimeout(() => {
                        if (copyBtn.textContent === "COPIED!") {
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

