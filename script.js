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
                    setTimeout(animateFrames, 250); // Cycle every 250ms
                }
            };
            animateFrames();
            
            // Wait slightly for the animation to start, then initiate the zoom-fade CSS transition
            setTimeout(() => {
                introImage.classList.add('zoom-fade');
                
                // After animation, hide intro screen and restore scrolling
                setTimeout(() => {
                    introScreen.classList.add('fade-out');
                    document.body.style.overflow = ''; // Restore scrolling
                    
                    setTimeout(() => {
                        introScreen.style.display = 'none';
                    }, 800); // Matches the opacity transition on .intro-screen
                }, 1500); // Wait for the zoom-fade animation
            }, 100);
        });
    }

    // Handle browser back/forward buttons to show/hide the intro screen dynamically
    window.addEventListener('popstate', () => {
        if (window.location.hash !== '#reader') {
            // Restore the intro screen to its initial state
            if (introScreen) {
                introScreen.style.display = '';
                // Force layout recalculation to ensure smooth re-entry
                void introScreen.offsetWidth;
                introScreen.classList.remove('fade-out', 'animating');
                introScreen.style.opacity = '';
                introScreen.style.overflowY = '';
                
                const introScroll = document.querySelector('.intro-scroll-container');
                if (introScroll) {
                    introScroll.style.overflowY = '';
                }
            }

            if (introImage) {
                introImage.src = 'https://image.starchandsteel.com/fridgedoorpng.png';
                introImage.classList.remove('zoom-fade');
            }

            // Relock body scrolling
            document.body.style.overflow = 'hidden';
        } else {
            // Hide the intro screen immediately
            if (introScreen) {
                introScreen.style.display = 'none';
            }
            document.body.style.overflow = '';
        }
    });

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
            data.images.forEach((imageUrl, index) => {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = `Comic Panel ${index + 1}`;
                
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
                    img.alt = `Failed to load Panel ${index + 1}`;
                    img.classList.add('loaded'); // Still fade it in to show the error alt text
                };

                // Append to container
                comicContainer.appendChild(img);
            });
        } else {
            console.error('Invalid data format: Expected an array of images.');
            comicContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">No comic panels found.</p>';
        }
    }

    // Initialize fetching
    fetchComicData();
});

