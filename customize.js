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
            options: generateOptions('Body', 6, false),
            currentIndex: 0,
            activeTimeout: null
        },
        face: {
            layerId: 'layer-face',
            options: generateOptions('Face', 50, true),
            currentIndex: 0,
            activeTimeout: null
        },
        hat: {
            layerId: 'layer-hat',
            options: generateOptions('Hat', 35, true),
            currentIndex: 0,
            activeTimeout: null
        },
        acc1: {
            layerId: 'layer-acc1',
            options: generateOptions('Accessory', 40, true),
            currentIndex: 0,
            activeTimeout: null
        },
        acc2: {
            layerId: 'layer-acc2',
            options: generateOptions('Accessory', 40, true),
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
            const hasNone = category.options[0].name === 'None';
            numInput.value = hasNone ? category.currentIndex : category.currentIndex + 1;
        }

        const layerImg = document.getElementById(category.layerId);
        if (!layerImg) return;

        // Cancel any pending load listeners
        layerImg.onload = null;
        layerImg.onerror = null;

        if (option.file) {
            const targetSrc = baseUrl + option.file + '?cb=' + cacheBuster;
            if (layerImg.src !== targetSrc) {
                layerImg.src = targetSrc;
            }
            layerImg.classList.add('visible');
            bringToFront(categoryKey);

            if (animate) {
                layerImg.classList.remove('pop-in', 'pop-out');
                void layerImg.offsetWidth; // Reflow
                layerImg.classList.add('pop-in');
            }
        } else {
            layerImg.classList.remove('visible', 'pop-in', 'pop-out');
            layerImg.src = transparentPixel;
        }

        updateCarouselActiveState(categoryKey);
    }

    // --- Expandable Carousel Tray Controller ---
    let activeCategoryKey = null;

    function openCarousel(categoryKey) {
        if (activeCategoryKey === categoryKey) return;
        closeAllCarousels();
        activeCategoryKey = categoryKey;
        const wrapper = document.getElementById(`wrapper-${categoryKey}`);
        if (wrapper) {
            wrapper.classList.add('active');
        }
        renderCarousel(categoryKey);
        // Center immediately and re-center after accordion CSS animation completes
        requestAnimationFrame(() => centerCarouselItem(categoryKey));
        setTimeout(() => centerCarouselItem(categoryKey), 200);
        setTimeout(() => centerCarouselItem(categoryKey), 360);
    }

    function closeAllCarousels() {
        activeCategoryKey = null;
        document.querySelectorAll('.control-group-wrapper').forEach(w => {
            w.classList.remove('active');
        });
    }

    function renderCarousel(categoryKey) {
        const strip = document.getElementById(`carousel-strip-${categoryKey}`);
        if (!strip) return;
        const category = categories[categoryKey];
        const hasNone = category.options[0].name === 'None';

        strip.innerHTML = '';
        category.options.forEach((opt, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'carousel-thumb' + (index === category.currentIndex ? ' active' : '');
            thumb.dataset.index = index;

            const itemNum = hasNone ? index : index + 1;
            const numSpan = `<span class="carousel-thumb-number">${itemNum}</span>`;

            if (!opt.file) {
                thumb.innerHTML = `<span class="carousel-thumb-none">NONE</span>${numSpan}`;
            } else {
                const img = document.createElement('img');
                img.src = baseUrl + opt.file + '?cb=' + cacheBuster;
                img.alt = opt.name;
                img.loading = 'lazy';
                thumb.appendChild(img);
                thumb.insertAdjacentHTML('beforeend', numSpan);
            }

            thumb.addEventListener('click', (e) => {
                e.stopPropagation();
                if (strip.dataset.isDragging === 'true') return; // Ignore click if user was dragging!
                if (category.currentIndex !== index) {
                    category.currentIndex = index;
                    updateLayer(categoryKey, true);
                }
            });

            strip.appendChild(thumb);
        });

        // Click-and-Drag / Touch-Drag Panning on Carousel Strip
        if (!strip.dataset.dragBound) {
            strip.dataset.dragBound = 'true';
            let isDown = false;
            let startX = 0;
            let scrollStart = 0;

            const startDrag = (pageX) => {
                isDown = true;
                strip.dataset.isDragging = 'false';
                startX = pageX - strip.offsetLeft;
                scrollStart = strip.scrollLeft;
            };

            const moveDrag = (pageX) => {
                if (!isDown) return;
                const x = pageX - strip.offsetLeft;
                const walk = x - startX;
                if (Math.abs(walk) > 5) {
                    strip.dataset.isDragging = 'true';
                }
                strip.scrollLeft = scrollStart - walk;
            };

            const endDrag = () => {
                isDown = false;
                setTimeout(() => {
                    strip.dataset.isDragging = 'false';
                }, 60);
            };

            // Mouse events
            strip.addEventListener('mousedown', (e) => startDrag(e.pageX));
            window.addEventListener('mousemove', (e) => { if (isDown) moveDrag(e.pageX); });
            window.addEventListener('mouseup', () => { if (isDown) endDrag(); });

            // Touch events
            strip.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) startDrag(e.touches[0].pageX);
            }, { passive: true });

            strip.addEventListener('touchmove', (e) => {
                if (isDown && e.touches.length === 1) moveDrag(e.touches[0].pageX);
            }, { passive: true });

            strip.addEventListener('touchend', endDrag, { passive: true });
            strip.addEventListener('touchcancel', endDrag, { passive: true });
        }
    }

    function updateCarouselActiveState(categoryKey) {
        const strip = document.getElementById(`carousel-strip-${categoryKey}`);
        if (!strip || !strip.children.length) return;
        const category = categories[categoryKey];
        const thumbs = strip.querySelectorAll('.carousel-thumb');
        thumbs.forEach((t, i) => {
            if (i === category.currentIndex) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        if (activeCategoryKey === categoryKey) {
            centerCarouselItem(categoryKey);
        }
    }

    function centerCarouselItem(categoryKey) {
        const strip = document.getElementById(`carousel-strip-${categoryKey}`);
        if (!strip) return;
        const category = categories[categoryKey];
        const activeThumb = strip.querySelector(`.carousel-thumb[data-index="${category.currentIndex}"]`);
        if (activeThumb) {
            const stripWidth = strip.clientWidth || strip.offsetWidth;
            if (stripWidth <= 0) return;
            const thumbLeft = activeThumb.offsetLeft;
            const thumbWidth = activeThumb.offsetWidth || activeThumb.clientWidth || 54;
            const targetScroll = thumbLeft - (stripWidth / 2) + (thumbWidth / 2);
            strip.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
        }
    }

    function setupControls(categoryKey) {
        const wrapper = document.getElementById(`wrapper-${categoryKey}`);
        const prevBtn = document.getElementById(`btn-${categoryKey}-prev`);
        const nextBtn = document.getElementById(`btn-${categoryKey}-next`);
        const refreshBtn = document.getElementById(`btn-${categoryKey}-refresh`);
        const numInput = document.getElementById(`input-${categoryKey}`);

        if (wrapper) {
            wrapper.addEventListener('click', (e) => {
                // Open carousel whenever clicking anywhere inside the control group row
                if (!e.target.closest('.carousel-strip')) {
                    openCarousel(categoryKey);
                }
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCarousel(categoryKey);
                updateLayer(categoryKey);
            });
        }

        // Randomize single category when clicking the label text
        if (prevBtn && prevBtn.parentElement) {
            const labelEl = prevBtn.parentElement.querySelector('.control-label');
            if (labelEl) {
                labelEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openCarousel(categoryKey);
                    const category = categories[categoryKey];
                    const max = category.options.length;
                    category.currentIndex = Math.floor(Math.random() * max);
                    updateLayer(categoryKey, true);
                });
            }
        }

        if (numInput) {
            const category = categories[categoryKey];
            const hasNone = category.options[0].name === 'None';
            const maxVal = hasNone ? category.options.length - 1 : category.options.length;
            numInput.max = maxVal;
            const container = numInput.closest('.list-number-container');
            if (container) {
                const denomEl = container.querySelector('.denom-slash');
                if (denomEl) {
                    denomEl.textContent = `/${maxVal}`;
                }
            }

            const handleInputChange = () => {
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
                openCarousel(categoryKey);
                numInput.select();
            });
        }

        // Click-and-Hold Button Controller for Arrows
        function bindHoldButton(btn, stepCallback) {
            if (!btn) return;
            let holdTimeout = null;
            let holdInterval = null;

            const stopHold = () => {
                if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
                if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
            };

            const startHold = (e) => {
                if (e.button !== undefined && e.button !== 0) return; // Left click only for mouse
                e.stopPropagation();
                openCarousel(categoryKey);
                stepCallback(); // Initial step

                stopHold();
                holdTimeout = setTimeout(() => {
                    holdInterval = setInterval(() => {
                        stepCallback();
                    }, 85); // Repeat every 85ms while held
                }, 280);
            };

            btn.addEventListener('mousedown', startHold);
            btn.addEventListener('touchstart', startHold, { passive: true });

            window.addEventListener('mouseup', stopHold);
            window.addEventListener('touchend', stopHold);
            window.addEventListener('touchcancel', stopHold);
            btn.addEventListener('mouseleave', stopHold);
        }

        bindHoldButton(prevBtn, () => {
            const category = categories[categoryKey];
            category.currentIndex--;
            if (category.currentIndex < 0) {
                category.currentIndex = category.options.length - 1;
            }
            updateLayer(categoryKey, true);
        });

        bindHoldButton(nextBtn, () => {
            const category = categories[categoryKey];
            category.currentIndex++;
            if (category.currentIndex >= category.options.length) {
                category.currentIndex = 0;
            }
            updateLayer(categoryKey, true);
        });
    }

    // Randomize all categories
    function randomizeAll() {
        closeAllCarousels();
        for (const key in categories) {
            const category = categories[key];
            const max = category.options.length;
            category.currentIndex = Math.floor(Math.random() * max);
            updateLayer(key, true); // Enable bounce animations on randomize
        }
    }

    // Collapse open carousel when clicking outside controls container
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.controls-container')) {
            closeAllCarousels();
        }
    });

    // Helper to flash button gold on click (uses inline style burst to override any filters or active states)
    function triggerGoldFlash(el) {
        if (!el) return;
        
        // Instant burst to gold
        el.classList.remove('gold-flash');
        el.style.transition = 'none';
        el.style.backgroundColor = '#ffcc00';
        el.style.color = '#000000';
        el.style.borderColor = '#ffcc00';
        el.style.boxShadow = '0 0 35px rgba(255, 204, 0, 0.9)';

        void el.offsetWidth; // Reflow to register initial state

        // Smooth 1.2s dissolve back to normal
        el.style.transition = 'background-color 1.2s cubic-bezier(0.16, 1, 0.3, 1), color 1.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 1.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.backgroundColor = '';
        el.style.color = '';
        el.style.borderColor = '';
        el.style.boxShadow = '';
        el.classList.add('gold-flash');

        setTimeout(() => {
            el.style.transition = '';
            el.classList.remove('gold-flash');
        }, 1200);
    }

    // Back button handling: return to previous scroll position on index page
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.referrer && document.referrer.includes(window.location.hostname)) {
                window.history.back();
            } else {
                window.location.href = 'index.html#reader';
            }
        });
    }

    const randomBtn = document.getElementById('btn-randomize');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            triggerGoldFlash(randomBtn);
            randomizeAll();
        });
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
            triggerGoldFlash(downloadBtn);
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
            triggerGoldFlash(copyBtn);
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

