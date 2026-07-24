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

    // Helper to calculate required set repeats so short lists (like Food with 6 options) have enough scroll width
    const getNumSets = (optionCount) => {
        const setWidth = optionCount * 62;
        let sets = Math.ceil(3600 / setWidth);
        if (sets < 3) sets = 3;
        if (sets % 2 === 0) sets += 1;
        return sets;
    };

    function bringToFront(categoryKey) {
        if (categoryKey === 'body') return; // Body is the base and must stay at the bottom
        const category = categories[categoryKey];
        const layerImg = document.getElementById(category.layerId);
        topZIndex++;
        layerImg.style.zIndex = topZIndex;
    }

    // 1x1 transparent gif to prevent broken image icon
    const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // Image Cache to eliminate unloaded texture gaps and network latency
    const imageCache = {};

    function getAssetUrl(file) {
        if (!file) return transparentPixel;
        return baseUrl + file;
    }

    function preloadCategoryAssets(categoryKey) {
        const category = categories[categoryKey];
        category.options.forEach(opt => {
            if (opt.file && !imageCache[opt.file]) {
                const img = new Image();
                img.decoding = 'async';
                img.src = getAssetUrl(opt.file);
                imageCache[opt.file] = img;
            }
        });
    }

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

        if (option.file) {
            const targetSrc = baseUrl + option.file;
            layerImg.crossOrigin = "anonymous";
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

    // --- Infinite Expandable Carousel Tray Controller ---
    let activeCategoryKey = null;

    function openCarousel(categoryKey) {
        const wrapper = document.getElementById(`wrapper-${categoryKey}`);
        if (!wrapper) return;
        if (!wrapper.classList.contains('active')) {
            wrapper.classList.add('active');
            renderCarousel(categoryKey);
            requestAnimationFrame(() => centerCarouselItem(categoryKey, false));
        }
        activeCategoryKey = categoryKey;
    }

    function toggleCarousel(categoryKey) {
        const wrapper = document.getElementById(`wrapper-${categoryKey}`);
        if (!wrapper) return;
        if (wrapper.classList.contains('active')) {
            wrapper.classList.remove('active');
            if (activeCategoryKey === categoryKey) {
                activeCategoryKey = null;
            }
        } else {
            openCarousel(categoryKey);
        }
    }

    function renderCarousel(categoryKey) {
        const strip = document.getElementById(`carousel-strip-${categoryKey}`);
        if (!strip) return;
        const category = categories[categoryKey];
        const hasNone = category.options[0].name === 'None';
        const numSets = getNumSets(category.options.length);

        strip.innerHTML = '';
        strip.dataset.categoryKey = categoryKey;

        // Render numSets identical sets of thumbnails to create a 100% seamless infinite loop
        for (let setIndex = 0; setIndex < numSets; setIndex++) {
            category.options.forEach((opt, optIndex) => {
                const thumb = document.createElement('div');
                thumb.className = 'carousel-thumb' + (optIndex === category.currentIndex ? ' active' : '');
                thumb.dataset.setIndex = setIndex;
                thumb.dataset.index = optIndex;

                const itemNum = hasNone ? optIndex : optIndex + 1;
                const numSpan = `<span class="carousel-thumb-number">${itemNum}</span>`;

                if (!opt.file) {
                    thumb.innerHTML = `<span class="carousel-thumb-none">NONE</span>${numSpan}`;
                } else {
                    const img = document.createElement('img');
                    img.src = baseUrl + opt.file;
                    img.alt = opt.name;
                    img.loading = 'eager';
                    img.decoding = 'async';
                    thumb.appendChild(img);
                    thumb.insertAdjacentHTML('beforeend', numSpan);
                }

                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (strip.dataset.isDragging === 'true') return; // Ignore drag clicks
                    
                    const clickedSetIndex = parseInt(thumb.dataset.setIndex, 10);
                    if (category.currentIndex === optIndex) {
                        // Clicking already active thumbnail -> Refresh pop-in animation & bring to front!
                        bringToFront(categoryKey);
                        const layerImg = document.getElementById(category.layerId);
                        if (layerImg && opt.file) {
                            layerImg.classList.remove('pop-in', 'pop-out');
                            void layerImg.offsetWidth;
                            layerImg.classList.add('pop-in');
                        }
                    } else {
                        category.currentIndex = optIndex;
                        updateLayer(categoryKey, true);
                        updateCarouselActiveState(categoryKey, true);
                    }
                });

                strip.appendChild(thumb);
            });
        }

        // 1:1 Desktop Mouse Drag with Momentum & Native Mobile Touch Panning
        if (!strip.dataset.dragBound) {
            strip.dataset.dragBound = 'true';
            let isDragging = false;
            let startX = 0;
            let startScrollLeft = 0;
            let lastX = 0;
            let velocity = 0;
            let animFrame = null;

            let scrollEndTimer = null;

            const handleScrollNormalize = () => {
                if (scrollEndTimer) clearTimeout(scrollEndTimer);
                scrollEndTimer = setTimeout(() => {
                    normalizeCarouselScroll(strip);
                }, 150);
            };

            strip.addEventListener('scroll', handleScrollNormalize, { passive: true });
            if ('onscrollend' in window) {
                strip.addEventListener('scrollend', () => normalizeCarouselScroll(strip), { passive: true });
            }

            const onPointerDown = (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                // Allow mobile touchscreens to use native 60fps hardware-accelerated touch panning
                if (e.pointerType === 'touch') return;

                isDragging = true;
                strip.dataset.isDragging = 'false';
                startX = e.clientX;
                startScrollLeft = strip.scrollLeft;
                lastX = e.clientX;
                velocity = 0;
                if (animFrame) cancelAnimationFrame(animFrame);
            };

            const onPointerMove = (e) => {
                if (!isDragging || e.pointerType === 'touch') return;
                const dx = e.clientX - startX;
                if (Math.abs(dx) > 10) {
                    strip.dataset.isDragging = 'true';
                }
                strip.scrollLeft = startScrollLeft - dx;
                velocity = e.clientX - lastX;
                lastX = e.clientX;
            };

            const onPointerUp = (e) => {
                if (!isDragging || e.pointerType === 'touch') return;
                isDragging = false;

                const applyMomentum = () => {
                    if (Math.abs(velocity) > 0.5) {
                        strip.scrollLeft -= velocity;
                        velocity *= 0.90;
                        animFrame = requestAnimationFrame(applyMomentum);
                    } else {
                        setTimeout(() => {
                            strip.dataset.isDragging = 'false';
                        }, 50);
                    }
                };
                applyMomentum();
            };

            strip.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        }
    }

    function normalizeCarouselScroll(strip, categoryKey) {
        if (!strip || strip.scrollWidth <= 0) return;
        const key = categoryKey || strip.dataset.categoryKey;
        const category = categories[key];
        if (!category) return;

        const numSets = getNumSets(category.options.length);
        const midSet = Math.floor(numSets / 2);
        const setWidth = strip.scrollWidth / numSets;
        if (setWidth <= 0) return;

        const minBound = midSet * setWidth - (setWidth * 0.4);
        const maxBound = (midSet + 1) * setWidth - (setWidth * 0.4);

        if (strip.scrollLeft > maxBound) {
            const count = Math.floor((strip.scrollLeft - maxBound) / setWidth) + 1;
            strip.scrollLeft -= count * setWidth;
        } else if (strip.scrollLeft < minBound) {
            const count = Math.floor((minBound - strip.scrollLeft) / setWidth) + 1;
            strip.scrollLeft += count * setWidth;
        }
    }

    function updateCarouselActiveState(categoryKey, smooth = true, direction = 0) {
        const strip = document.getElementById(`carousel-strip-${categoryKey}`);
        if (!strip || !strip.children.length) return;
        const category = categories[categoryKey];
        const thumbs = strip.querySelectorAll('.carousel-thumb');
        thumbs.forEach(t => {
            const idx = parseInt(t.dataset.index, 10);
            if (idx === category.currentIndex) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        centerCarouselItem(categoryKey, smooth, direction);
    }

    function centerCarouselItem(categoryKey, smooth = true, direction = 0) {
        const strip = document.getElementById(`carousel-strip-${categoryKey}`);
        if (!strip) return;

        normalizeCarouselScroll(strip, categoryKey);

        const category = categories[categoryKey];
        const numSets = getNumSets(category.options.length);
        const midSet = Math.floor(numSets / 2);
        const targetIndex = category.currentIndex;
        const maxIndex = category.options.length - 1;

        let targetThumb = null;

        if (direction === 1 && targetIndex === 0) {
            // Moving NEXT and wrapping to 0 -> target (midSet + 1) Index 0 to animate RIGHT
            targetThumb = strip.querySelector(`.carousel-thumb[data-set-index="${midSet + 1}"][data-index="0"]`);
        } else if (direction === -1 && targetIndex === maxIndex) {
            // Moving PREV and wrapping to maxIndex -> target (midSet - 1) Index maxIndex to animate LEFT
            targetThumb = strip.querySelector(`.carousel-thumb[data-set-index="${midSet - 1}"][data-index="${maxIndex}"]`);
        }

        if (!targetThumb) {
            const thumbs = Array.from(strip.querySelectorAll(`.carousel-thumb[data-index="${targetIndex}"]`));
            if (!thumbs.length) return;

            const stripRect = strip.getBoundingClientRect();
            if (stripRect.width <= 0) return;
            const stripCenter = stripRect.left + (stripRect.width / 2);

            let minDistance = Infinity;
            thumbs.forEach(thumb => {
                const thumbRect = thumb.getBoundingClientRect();
                const thumbCenter = thumbRect.left + (thumbRect.width / 2);
                const dist = Math.abs(thumbCenter - stripCenter);
                if (dist < minDistance) {
                    minDistance = dist;
                    targetThumb = thumb;
                }
            });
        }

        if (targetThumb) {
            const stripRect = strip.getBoundingClientRect();
            const closestRect = targetThumb.getBoundingClientRect();
            if (stripRect.width <= 0 || closestRect.width <= 0) return;

            const thumbCenter = closestRect.left + (closestRect.width / 2);
            const stripCenter = stripRect.left + (stripRect.width / 2);
            const diff = thumbCenter - stripCenter;
            const targetScroll = strip.scrollLeft + diff;

            if (smooth) {
                strip.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
            } else {
                strip.scrollLeft = Math.max(0, targetScroll);
            }
        }
    }

    function setupControls(categoryKey) {
        const wrapper = document.getElementById(`wrapper-${categoryKey}`);
        const prevBtn = document.getElementById(`btn-${categoryKey}-prev`);
        const nextBtn = document.getElementById(`btn-${categoryKey}-next`);
        const refreshBtn = document.getElementById(`btn-${categoryKey}-refresh`);
        const numInput = document.getElementById(`input-${categoryKey}`);

        // Dice Button: Randomizes ONLY this single category attribute & smoothly scrolls carousel
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = categories[categoryKey];
                const max = category.options.length;
                category.currentIndex = Math.floor(Math.random() * max);
                openCarousel(categoryKey);
                updateLayer(categoryKey, true);
                updateCarouselActiveState(categoryKey, 1);
            });
        }

        // Control Label Name (FOOD/FACE/etc): Toggles Carousel Menu open/close
        if (prevBtn && prevBtn.parentElement) {
            const labelEl = prevBtn.parentElement.querySelector('.control-label');
            if (labelEl) {
                labelEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleCarousel(categoryKey);
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

                if (isNaN(val) || val < minVal || val > maxVal) {
                    val = 0;
                    if (!hasNone && val < minVal) {
                        val = minVal;
                    }
                }

                category.currentIndex = hasNone ? val : val - 1;
                numInput.value = val;
                openCarousel(categoryKey);
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

        // Click-and-Hold Arrow Buttons (Seamless infinite loop with synchronized speed)
        function bindHoldButton(btn, stepCallback) {
            if (!btn) return;
            let holdTimeout = null;
            let holdInterval = null;
            let isHolding = false;

            const stopHold = (e) => {
                if (!isHolding) return;
                isHolding = false;
                if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
                if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
            };

            const startHold = (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                e.stopPropagation();
                if (e.cancelable) e.preventDefault();
                if (isHolding) return;
                isHolding = true;

                openCarousel(categoryKey);
                stepCallback();

                if (holdTimeout) clearTimeout(holdTimeout);
                if (holdInterval) clearInterval(holdInterval);

                holdTimeout = setTimeout(() => {
                    if (!isHolding) return;
                    holdInterval = setInterval(() => {
                        if (!isHolding) return;
                        stepCallback();
                    }, 180); // Synchronized, comfortable repeat speed
                }, 350);
            };

            btn.addEventListener('pointerdown', startHold);
            window.addEventListener('pointerup', stopHold);
            window.addEventListener('pointercancel', stopHold);
            btn.addEventListener('mouseleave', stopHold);
        }

        bindHoldButton(prevBtn, () => {
            const category = categories[categoryKey];
            category.currentIndex--;
            if (category.currentIndex < 0) {
                category.currentIndex = category.options.length - 1; // Wrap left
            }
            updateLayer(categoryKey, true);
            updateCarouselActiveState(categoryKey, true, -1);
        });

        bindHoldButton(nextBtn, () => {
            const category = categories[categoryKey];
            category.currentIndex++;
            if (category.currentIndex >= category.options.length) {
                category.currentIndex = 0; // Wrap right
            }
            updateLayer(categoryKey, true);
            updateCarouselActiveState(categoryKey, true, 1);
        });
    }

    // Randomize all categories
    function randomizeAll() {
        for (const key in categories) {
            const category = categories[key];
            const max = category.options.length;
            category.currentIndex = Math.floor(Math.random() * max);
            updateLayer(key, true); // Enable bounce animations on randomize
            updateCarouselActiveState(key, 1);
        }
    }

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
                await new Promise((resolve) => {
                    const tempImg = new Image();
                    tempImg.crossOrigin = "anonymous";
                    tempImg.onload = () => {
                        ctx.drawImage(tempImg, 0, 0, size, size);
                        resolve();
                    };
                    tempImg.onerror = (e) => {
                        console.warn("Failed to load layer image for canvas export:", layer.src, e);
                        resolve(); // Skip failed layer gracefully
                    };
                    const srcUrl = layer.src;
                    tempImg.src = srcUrl.includes('?') ? `${srcUrl}&cors=1` : `${srcUrl}?cors=1`;
                });
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

