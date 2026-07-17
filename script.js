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

    // Scroll listener for parallax transition effects (scroll dampening & bottom-pinning)
    window.addEventListener('scroll', () => {
        const containers = document.querySelectorAll('.parallax-container');
        containers.forEach(container => {
            const bgImg = container.querySelector('.parallax-sticky-bg img');
            if (!bgImg) return;
            
            const containerRect = container.getBoundingClientRect();
            const H = bgImg.offsetHeight || 500;
            const viewportH = window.innerHeight;
            
            // Calculate distance of the bottom of the image from the bottom of the viewport
            // (assuming no active transforms).
            const diff = containerRect.top + H - viewportH;
            
            // Slowing range in pixels (approaching 1.1 Draft3-19.jpg)
            const D = 700;
            
            if (diff > 0 && diff < D) {
                // Deceleration range: apply smooth translation to slow it down
                const t = diff / D;
                // Easing power: 1.3 gives a gentle deceleration with minimal initial speedup
                const easedDiff = D * Math.pow(t, 1.3);
                const offset = easedDiff - diff;
                bgImg.style.transform = `translateY(${offset}px)`;
            } else {
                // Pinned state (or scrolled past / too far down): reset transform
                bgImg.style.transform = '';
            }
        });
    });

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

        // Iterate through the image URLs and create img elements
        if (data.images && Array.isArray(data.images)) {
            for (let i = 0; i < data.images.length; i++) {
                const imageUrl = data.images[i];
                
                // Special check: Parallax transition between 1.1 Draft3-19.jpg and 1.2.1 Draft2-0.png
                if (imageUrl.includes('1.1 Draft3-19.jpg') && i + 1 < data.images.length && data.images[i + 1].includes('1.2.1 Draft2-0.png')) {
                    const nextImageUrl = data.images[i + 1];
                    
                    // Create parallax container
                    const container = document.createElement('div');
                    container.className = 'parallax-container';
                    
                    // Sticky background wrapper
                    const stickyBg = document.createElement('div');
                    stickyBg.className = 'parallax-sticky-bg';
                    
                    const bgImg = document.createElement('img');
                    bgImg.src = imageUrl;
                    bgImg.alt = `Comic Panel ${i + 1} (Background)`;
                    bgImg.loading = 'lazy';
                    bgImg.className = 'comic-panel';
                    bgImg.onload = () => bgImg.classList.add('loaded');
                    bgImg.onerror = () => {
                        console.error(`Failed to load background image: ${imageUrl}`);
                        bgImg.classList.add('loaded');
                    };
                    stickyBg.appendChild(bgImg);
                    container.appendChild(stickyBg);
                    
                    // Scrolling foreground wrapper
                    const scrollingFg = document.createElement('div');
                    scrollingFg.className = 'parallax-scrolling-fg';
                    
                    const fgImg = document.createElement('img');
                    fgImg.src = nextImageUrl;
                    fgImg.alt = `Comic Panel ${i + 2} (Foreground)`;
                    fgImg.loading = 'lazy';
                    fgImg.className = 'comic-panel';
                    fgImg.onload = () => fgImg.classList.add('loaded');
                    fgImg.onerror = () => {
                        console.error(`Failed to load foreground image: ${nextImageUrl}`);
                        fgImg.classList.add('loaded');
                    };
                    scrollingFg.appendChild(fgImg);
                    container.appendChild(scrollingFg);
                    
                    comicContainer.appendChild(container);
                    
                    i++; // Skip the foreground image in the next iteration
                    continue;
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

