document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

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
