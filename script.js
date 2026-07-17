document.addEventListener('DOMContentLoaded', () => {
    // Preload opened door animation frames
    const openFrames = [
        'https://image.starchandsteel.com/fridgedooropenpng.png',
        'https://image.starchandsteel.com/fridgedooropenpng2.png',
        'https://image.starchandsteel.com/fridgedooropenpng3.png',
        'https://image.starchandsteel.com/fridgedooropenpng4.png'
    ];
    openFrames.forEach(src => {
        const img = new Image();
        img.src = src;
    });

    // Check if URL has #reader hash on load (e.g. user refreshed the page while reading)
    const hasReaderHash = window.location.hash === '#reader';
    const introScreen = document.getElementById('intro-screen');
    const introImage = document.getElementById('intro-image');

    // Keep track of active timeouts for the door animation and screen transition
    let doorOpenTimeout1 = null;
    let doorOpenTimeout2 = null;
    let doorOpenTimeout3 = null;
    let doorFrameTimeout = null;
    let showIntroTimeout1 = null;
    let showIntroTimeout2 = null;

    function clearAllIntroTimeouts() {
        if (doorOpenTimeout1) { clearTimeout(doorOpenTimeout1); doorOpenTimeout1 = null; }
        if (doorOpenTimeout2) { clearTimeout(doorOpenTimeout2); doorOpenTimeout2 = null; }
        if (doorOpenTimeout3) { clearTimeout(doorOpenTimeout3); doorOpenTimeout3 = null; }
        if (doorFrameTimeout) { clearTimeout(doorFrameTimeout); doorFrameTimeout = null; }
        if (showIntroTimeout1) { clearTimeout(showIntroTimeout1); showIntroTimeout1 = null; }
        if (showIntroTimeout2) { clearTimeout(showIntroTimeout2); showIntroTimeout2 = null; }
    }

    if (hasReaderHash) {
        if (introScreen) {
            introScreen.style.display = 'none';
        }
        document.body.style.overflow = ''; // Restore scrolling
    } else {
        // Prevent scrolling while intro is active
        document.body.style.overflow = 'hidden';
    }
    
    if (introImage && introScreen) {
        // Prevent clicks on the intro screen from toggling the comic nav bars behind it
        introScreen.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        introImage.addEventListener('click', () => {
            if (introImage.classList.contains('zoom-fade')) return; // Prevent multiple clicks

            // Clear any active timeouts before starting a new transition
            clearAllIntroTimeouts();

            // Push history state so the browser back button resets to the landing screen
            if (window.location.hash !== '#reader') {
                history.pushState({ page: 'reader' }, '', '#reader');
            }

            // Lock scrolling on intro screen while animating
            introScreen.style.overflowY = 'hidden';
            const introScroll = document.querySelector('.intro-scroll-container');
            if (introScroll) {
                introScroll.style.overflowY = 'hidden';
            }

            // Fade out the landing image and text
            introScreen.classList.add('animating');

            // Cycle through the animation frames slowly
            let frameIndex = 0;
            const animateFrames = () => {
                if (frameIndex < openFrames.length) {
                    introImage.src = openFrames[frameIndex];
                    frameIndex++;
                    doorFrameTimeout = setTimeout(animateFrames, 250); // Cycle every 250ms
                }
            };
            animateFrames();
            
            // Wait slightly for the animation to start, then initiate the zoom-fade CSS transition
            doorOpenTimeout1 = setTimeout(() => {
                introImage.classList.add('zoom-fade');
                
                // After animation, hide intro screen and restore scrolling
                doorOpenTimeout2 = setTimeout(() => {
                    introScreen.classList.add('fade-out');
                    document.body.style.overflow = ''; // Restore scrolling
                    
                    doorOpenTimeout3 = setTimeout(() => {
                        introScreen.style.display = 'none';
                    }, 6000); // Matches the opacity transition on .intro-screen (6s)
                }, 1500); // Wait for the zoom-fade animation
            }, 100);
        });
    }

    function showIntro() {
        // Clear all active timeouts so they don't overwrite the intro screen state
        clearAllIntroTimeouts();

        // Hide ending message when returning to landing page
        const endMessage = document.getElementById('chapter-end-message');
        if (endMessage) {
            endMessage.style.display = 'none';
        }

        // 1. Swap the image source back to the closed door while the screen is still hidden.
        // Keep the 'zoom-fade' class on it so it remains at scale 3 / opacity 0 in the background.
        if (introImage) {
            introImage.src = 'https://image.starchandsteel.com/fridgedoorpng.png';
        }

        // 2. Scroll the main window back to the top
        window.scrollTo(0, 0);

        // 3. Wait a tiny bit (50ms) for the browser to register the image swap and scroll position
        showIntroTimeout1 = setTimeout(() => {
            if (introScreen) {
                introScreen.style.display = '';
                
                // Force layout reflow while the elements are visible but in their starting transition states
                void introScreen.offsetWidth;
                
                // Remove 'fade-out' to start the screen fade-in, but KEEP 'animating' to block hover!
                introScreen.classList.remove('fade-out');
                introScreen.style.opacity = '';
                introScreen.style.overflowY = '';
                
                const introScroll = document.querySelector('.intro-scroll-container');
                if (introScroll) {
                    introScroll.style.overflowY = '';
                }
            }

            if (introImage) {
                introImage.classList.remove('zoom-fade');
            }
        }, 50);

        // 4. Remove 'animating' class only after the 1-second zoom transition completes
        showIntroTimeout2 = setTimeout(() => {
            if (introScreen) {
                introScreen.classList.remove('animating');
            }
        }, 1100);

        // Relock body scrolling
        document.body.style.overflow = 'hidden';
    }

    function hideIntro() {
        // Clear all active timeouts when forcing hide
        clearAllIntroTimeouts();
        if (introScreen) {
            introScreen.style.display = 'none';
        }
        document.body.style.overflow = '';
    }

    // Handle browser back/forward buttons to show/hide the intro screen dynamically
    window.addEventListener('popstate', () => {
        if (window.location.hash !== '#reader') {
            showIntro();
        } else {
            hideIntro();
        }
    });

    // Handle logo link click to transition back to the intro screen animate-in
    const logoLink = document.querySelector('.top-nav a[href="index.html"]');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            if (window.location.hash === '#reader') {
                e.preventDefault();
                // Replace URL state to clean hash, then transition instantly and synchronously
                history.replaceState(null, '', 'index.html');
                showIntro();
            }
        });
    }

    // Handle the end-of-chapter "leave... the fridge" link click
    const leaveLink = document.querySelector('.chapter-end-message a[href="index.html"]');
    if (leaveLink) {
        leaveLink.addEventListener('click', (e) => {
            if (window.location.hash === '#reader') {
                e.preventDefault();
                history.replaceState(null, '', 'index.html');
                showIntro();
            }
        });
    }

    // Set current year in footer
    const currentYearElem = document.getElementById('current-year');
    if (currentYearElem) {
        currentYearElem.textContent = new Date().getFullYear();
    }

    const comicContainer = document.getElementById('comic-container');
    const chapterTitleElement = document.getElementById('chapter-title');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Toggle header and back to top visibility on click/tap
    const topNav = document.querySelector('.top-nav');
    const backToTopBtn = document.getElementById('back-to-top');
    const bottomNav = document.getElementById('bottom-nav');
    const progressBar = document.getElementById('progress-bar');
    document.addEventListener('click', () => {
        const isNowVisible = topNav.classList.toggle('visible');
        if (bottomNav) bottomNav.classList.toggle('visible');
        
        if (isNowVisible && window.scrollY > 500) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    // Prevent clicks on bottom-nav from bubbling up and toggling the panels
    if (bottomNav) {
        bottomNav.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Character Selector dropdown toggle and selection logic
    const charTrigger = document.getElementById('char-selector-trigger');
    const charDropdown = document.getElementById('bottom-char-dropdown');
    const charContainer = document.querySelector('.char-selector-container');
    const bottomCharSprite = document.getElementById('bottom-char-sprite');

    if (charTrigger && charDropdown && charContainer) {
        charTrigger.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent document click listener from hiding nav bar
            charContainer.classList.toggle('open');
        });

        // Close dropdown when clicking anywhere else on document
        document.addEventListener('click', () => {
            charContainer.classList.remove('open');
        });

        // Handle item selection
        const dropdownItems = charDropdown.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent document click listener from hiding nav bar
                
                const charId = item.getAttribute('data-char');
                const charSprite = item.querySelector('img').src;
                const charName = item.querySelector('span').textContent;

                // Update trigger image
                if (bottomCharSprite) {
                    bottomCharSprite.src = charSprite;
                    bottomCharSprite.alt = charName;
                }

                // Update active state in list
                dropdownItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Save choice in localStorage
                localStorage.setItem('selectedBottomChar', charId);

                // Close dropdown
                charContainer.classList.remove('open');
            });
        });

        // Load saved selection from localStorage on load
        const savedChar = localStorage.getItem('selectedBottomChar');
        if (savedChar) {
            const activeItem = charDropdown.querySelector(`.dropdown-item[data-char="${savedChar}"]`);
            if (activeItem) {
                const charSprite = activeItem.querySelector('img').src;
                const charName = activeItem.querySelector('span').textContent;
                if (bottomCharSprite) {
                    bottomCharSprite.src = charSprite;
                    bottomCharSprite.alt = charName;
                }
                dropdownItems.forEach(i => i.classList.remove('active'));
                activeItem.classList.add('active');
            }
        }
    }

    // Handle back to top click
    backToTopBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the document click listener from hiding it immediately
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Update reading progress bar on scroll
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = scrollPercent + '%';

        if (scrollTop < 500) {
            backToTopBtn.classList.remove('visible');
        } else if (topNav.classList.contains('visible')) {
            backToTopBtn.classList.add('visible');
        }
    });

    // Parallax Transition Sizing
    function resizeParallax() {
        const containers = document.querySelectorAll('.parallax-container');
        containers.forEach(container => {
            const bgContainer = container.querySelector('.parallax-sticky-bg');
            if (bgContainer) {
                const bgH = bgContainer.offsetHeight;
                const viewportH = document.documentElement.clientHeight;
                if (bgH > 0) {
                    // STICKY_OFFSET pushes the freeze position lower down the screen (closer to the bottom)
                    // This accounts for browser toolbars and safe-area nav indicators
                    const STICKY_OFFSET = 40; // in pixels
                    bgContainer.style.top = (viewportH - bgH + STICKY_OFFSET) + 'px';
                }
            }
        });
    }

    window.addEventListener('resize', resizeParallax);

    // Function to fetch the comic data
    async function fetchComicData() {
        try {
            const response = await fetch('data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            renderComic(data);
            
        } catch (error) {
            console.error('Error fetching comic data:', error);
            loadingIndicator.innerHTML = `
                <p style="color: #ef4444;">Failed to load chapter data.</p>
                <p style="font-size: 0.875rem;">Please check your connection or try again later.</p>
            `;
        }
    }

    // Function to render the comic panels
    function renderComic(data) {
        // Update chapter title
        if (data.chapterTitle) {
            chapterTitleElement.textContent = data.chapterTitle;
            document.title = `Starch & Steel - ${data.chapterTitle}`;
        }

        // Remove loading indicator
        loadingIndicator.style.display = 'none';

        // Show ending message
        const endMessage = document.getElementById('chapter-end-message');
        if (endMessage) {
            endMessage.style.display = 'block';
        }

        // Iterate through the image URLs and create img elements
        if (data.images && Array.isArray(data.images)) {
            for (let i = 0; i < data.images.length; i++) {
                const imageUrl = data.images[i];
                
                // Special check: Parallax transition between (1.1 Draft3-18.jpg + 1.1 Draft3-19.jpg) and 1.2.1 Draft2-0.png
                if (imageUrl.includes('1.1 Draft3-18.jpg') && 
                    i + 2 < data.images.length && 
                    data.images[i + 1].includes('1.1 Draft3-19.jpg') && 
                    data.images[i + 2].includes('1.2.1 Draft2-0.png')) {
                    
                    const bg1Url = imageUrl;
                    const bg2Url = data.images[i + 1];
                    const fgUrl = data.images[i + 2];
                    
                    // Create parallax container
                    const container = document.createElement('div');
                    container.className = 'parallax-container';
                    
                    // Sticky background wrapper containing BOTH 1.1 Draft3-18.jpg and 1.1 Draft3-19.jpg
                    const stickyBg = document.createElement('div');
                    stickyBg.className = 'parallax-sticky-bg';
                    
                    // First background image (1.1 Draft3-18.jpg)
                    const bgImg1 = document.createElement('img');
                    bgImg1.src = bg1Url;
                    bgImg1.alt = `Comic Panel ${i + 1} (Background Part 1)`;
                    bgImg1.loading = 'lazy';
                    bgImg1.className = 'comic-panel';
                    bgImg1.onload = () => {
                        bgImg1.classList.add('loaded');
                        resizeParallax();
                    };
                    bgImg1.onerror = () => {
                        console.error(`Failed to load background image: ${bg1Url}`);
                        bgImg1.classList.add('loaded');
                        resizeParallax();
                    };
                    stickyBg.appendChild(bgImg1);
                    
                    // Second background image (1.1 Draft3-19.jpg)
                    const bgImg2 = document.createElement('img');
                    bgImg2.src = bg2Url;
                    bgImg2.alt = `Comic Panel ${i + 2} (Background Part 2)`;
                    bgImg2.loading = 'lazy';
                    bgImg2.className = 'comic-panel';
                    bgImg2.onload = () => {
                        bgImg2.classList.add('loaded');
                        resizeParallax();
                    };
                    bgImg2.onerror = () => {
                        console.error(`Failed to load background image: ${bg2Url}`);
                        bgImg2.classList.add('loaded');
                        resizeParallax();
                    };
                    stickyBg.appendChild(bgImg2);
                    container.appendChild(stickyBg);
                    
                    // Scrolling foreground wrapper containing 1.2.1 Draft2-0.png AND all remaining panels
                    const scrollingFg = document.createElement('div');
                    scrollingFg.className = 'parallax-scrolling-fg';
                    
                    const fgImg = document.createElement('img');
                    fgImg.src = fgUrl;
                    fgImg.alt = `Comic Panel ${i + 3} (Foreground)`;
                    fgImg.loading = 'lazy';
                    fgImg.className = 'comic-panel';
                    fgImg.onload = () => fgImg.classList.add('loaded');
                    fgImg.onerror = () => {
                        console.error(`Failed to load foreground image: ${fgUrl}`);
                        fgImg.classList.add('loaded');
                    };
                    scrollingFg.appendChild(fgImg);
                    
                    // Append all remaining images of Chapter 1 directly into the scrolling foreground
                    // wrapper so that they scroll up with zero gap and keep the background frozen.
                    for (let j = i + 3; j < data.images.length; j++) {
                        const nextUrl = data.images[j];
                        const nextImg = document.createElement('img');
                        nextImg.src = nextUrl;
                        nextImg.alt = `Comic Panel ${j + 1}`;
                        nextImg.loading = 'lazy';
                        nextImg.className = 'comic-panel';
                        nextImg.onload = () => nextImg.classList.add('loaded');
                        nextImg.onerror = () => {
                            console.error(`Failed to load image: ${nextUrl}`);
                            nextImg.classList.add('loaded');
                        };
                        scrollingFg.appendChild(nextImg);
                    }
                    
                    container.appendChild(scrollingFg);
                    comicContainer.appendChild(container);
                    
                    // Call resizeParallax immediately if the images are already cached
                    if (bgImg1.complete || bgImg2.complete) {
                        resizeParallax();
                    }
                    
                    break; // Exit the main loop since we processed the rest of the chapter inside the container
                }
                
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = `Comic Panel ${i + 1}`;
                
                // CRITICAL: Native lazy loading
                img.loading = 'lazy';
                
                // Add class for styling
                img.className = 'comic-panel';

                // Add load event listener to handle fade-in effect
                img.onload = () => {
                    img.classList.add('loaded');
                };
                
                // Error handling for individual images
                img.onerror = () => {
                    console.error(`Failed to load image: ${imageUrl}`);
                    // Optionally set a fallback image or styling
                    img.style.minHeight = '200px';
                    img.style.backgroundColor = 'rgba(255,0,0,0.1)';
                    img.alt = `Failed to load Panel ${i + 1}`;
                    img.classList.add('loaded'); // Still fade it in to show the error alt text
                };

                // Append to container
                comicContainer.appendChild(img);
            }

        } else {
            console.error('Invalid data format: Expected an array of images.');
            comicContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">No comic panels found.</p>';
        }
    }

    // Initialize fetching
    fetchComicData();
});

