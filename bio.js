document.addEventListener('DOMContentLoaded', () => {
    // 1. Parse character ID from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const charId = urlParams.get('char');

    if (!charId) {
        // Fallback: Redirect to landing page if parameter is missing
        window.location.href = 'index.html';
        return;
    }

    // 2. Fetch bios database
    fetch('bios.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load character bio data.');
            }
            return response.json();
        })
        .then(data => {
            const charData = data[charId.toLowerCase()];

            if (!charData) {
                // Fallback: Redirect if character ID is invalid
                window.location.href = 'index.html';
                return;
            }

            // 3. Populate page content
            populateCharacterCard(charData);
        })
        .catch(error => {
            console.error('Error fetching character bio:', error);
            // Fallback to landing page on critical error
            window.location.href = 'index.html';
        });
});

function populateCharacterCard(data) {
    // Set basic text details
    const charName = document.getElementById('char-name');
    if (charName) charName.textContent = data.name;

    const supporterName = document.getElementById('supporter-name');
    if (supporterName) supporterName.textContent = data.supporter;

    const supporterTier = document.getElementById('supporter-tier');
    if (supporterTier) supporterTier.textContent = data.tier;

    const charClass = document.getElementById('char-class');
    if (charClass) charClass.textContent = `CLASS: ${data.class ? data.class.toUpperCase() : ''}`;

    const charBio = document.getElementById('char-bio');
    if (charBio) charBio.textContent = data.bio;

    // Set sprite image
    const spriteImg = document.getElementById('char-sprite');
    if (spriteImg) {
        spriteImg.src = data.sprite;
        spriteImg.alt = data.name;
    }

    // Animate stats progress bars
    if (data.stats) {
        animateStatBar('starch', data.stats.STARCH || 0);
        animateStatBar('steel', data.stats.STEEL || 0);
        animateStatBar('spiciness', data.stats.SPICINESS || 0);
        animateStatBar('sweetness', data.stats.SWEETNESS || 0);
    }
}

function animateStatBar(statId, value) {
    const bar = document.getElementById(`bar-${statId}`);
    const valText = document.getElementById(`val-${statId}`);

    if (bar && valText) {
        // Set visual text value immediately
        valText.textContent = value;

        // Animate width expansion after a short layout paint delay
        setTimeout(() => {
            bar.style.width = `${value}%`;
        }, 100);
    }
}
