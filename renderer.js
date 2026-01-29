import { storage } from './storage-adapter.js';

let commanders = [];
let myDecks = [];
let selectedCommander = null;
let showArchivedDecks = false;

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
    }
});

// Cloud Sync UI Management
function initCloudSync() {
    const container = document.getElementById('cloud-sync-container');
    const signInContainer = document.getElementById('sign-in-container');
    const userContainer = document.getElementById('user-container');
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const userAvatar = document.getElementById('user-avatar');
    const userEmail = document.getElementById('user-email');
    const syncStatus = document.getElementById('sync-status');

    // Only show cloud sync in PWA mode
    if (!storage.isFirebaseAvailable()) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    // Update UI based on auth state
    function updateAuthUI(user) {
        if (user) {
            signInContainer.style.display = 'none';
            userContainer.style.display = 'flex';
            userAvatar.src = user.photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 4v2h16v-2c0-1-2-4-8-4z"/></svg>';
            userEmail.textContent = user.email;
            syncStatus.textContent = 'Synced';
            syncStatus.classList.remove('syncing');

            // Reload data after sign in
            reloadData();
        } else {
            signInContainer.style.display = 'block';
            userContainer.style.display = 'none';
        }
    }

    // Listen for auth state changes
    storage.onAuthStateChange(updateAuthUI);

    // Sign in button
    signInBtn.addEventListener('click', async () => {
        try {
            signInBtn.disabled = true;
            signInBtn.textContent = 'Signing in...';
            await storage.signInWithGoogle();
        } catch (error) {
            console.error('Sign in error:', error);
            alert('Sign in failed. Please try again.');
        } finally {
            signInBtn.disabled = false;
            signInBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Sign in to Sync
            `;
        }
    });

    // Sign out button
    signOutBtn.addEventListener('click', async () => {
        try {
            await storage.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    });
}

// Reload data from storage (after sync)
async function reloadData() {
    myDecks = await storage.getMyDecks();
    displayDecks();
}

// Custom confirmation modal
function showConfirmModal(title, message, confirmText = 'Delete') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const confirmBtn = document.getElementById('confirm-modal-confirm');
        const cancelBtn = document.getElementById('confirm-modal-cancel');

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;

        modal.style.display = 'flex';

        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeydown);
        };

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        const onOverlayClick = (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        };

        const onKeydown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
            } else if (e.key === 'Enter') {
                cleanup();
                resolve(true);
            }
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeydown);

        // Focus the cancel button by default (safer option)
        cancelBtn.focus();
    });
}

// Load data on startup
async function init() {
    await storage.ready();

    // Initialize cloud sync UI (PWA only)
    initCloudSync();

    commanders = await storage.getCommanders();
    myDecks = await storage.getMyDecks();
    console.log(`Loaded ${commanders.length} commanders`);
    displayDecks();
}

// Cache for card images to avoid repeated API calls
const cardImageCache = {};

async function getCommanderImage(commanderName) {
    // Check cache first
    if (cardImageCache[commanderName]) {
        return cardImageCache[commanderName];
    }

    try {
        // Scryfall API to get card image
        const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commanderName)}`);
        const data = await response.json();

        // Get the small image URL (art_crop for nice square images)
        const imageUrl = data.image_uris?.art_crop || data.image_uris?.small || null;

        // Cache it
        cardImageCache[commanderName] = imageUrl;
        return imageUrl;
    } catch (error) {
        console.error(`Failed to fetch image for ${commanderName}:`, error);
        return null;
    }
}
// Fetch decklist from Moxfield
async function fetchMoxfieldDeck(deckUrl) {
    try {
        // Extract deck ID from URL
        // Moxfield URLs: https://www.moxfield.com/decks/DECK_ID
        const deckId = deckUrl.split('/decks/')[1]?.split('?')[0]?.split('#')[0];

        if (!deckId) {
            throw new Error('Invalid Moxfield URL');
        }

        // Fetch from Moxfield API
        const response = await fetch(`https://api2.moxfield.com/v2/decks/all/${deckId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch deck from Moxfield');
        }

        const data = await response.json();

        // Parse the decklist
        const decklist = {
            mainboard: {},
            commander: data.commanders || {},
            sideboard: data.sideboard || {}
        };

        // Group mainboard by card type
        Object.entries(data.mainboard || {}).forEach(([cardName, cardData]) => {
            const type = cardData.card.type_line || 'Other';
            const category = categorizeCard(type);

            if (!decklist.mainboard[category]) {
                decklist.mainboard[category] = [];
            }

            decklist.mainboard[category].push({
                name: cardName,
                quantity: cardData.quantity,
                type: type
            });
        });

        return decklist;
    } catch (error) {
        console.error('Error fetching Moxfield deck:', error);
        throw error;
    }
}

// Helper function to categorize cards
function categorizeCard(typeLine) {
    const lower = typeLine.toLowerCase();

    if (lower.includes('creature')) return 'Creatures';
    if (lower.includes('instant')) return 'Instants';
    if (lower.includes('sorcery')) return 'Sorceries';
    if (lower.includes('enchantment')) return 'Enchantments';
    if (lower.includes('artifact')) return 'Artifacts';
    if (lower.includes('planeswalker')) return 'Planeswalkers';
    if (lower.includes('land')) return 'Lands';

    return 'Other';
}
// Animate number counting
function animateValue(element, start, end, duration) {
    if (start === end) return;

    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }

        // Format based on whether it's a percentage or regular number
        if (element.textContent.includes('%')) {
            element.textContent = Math.abs(current).toFixed(1) + '%';
        } else if (element.textContent.includes('W') || element.textContent.includes('L')) {
            // For streaks, don't animate
            element.textContent = end + (element.textContent.includes('W') ? 'W' : 'L');
            clearInterval(timer);
        } else {
            element.textContent = Math.round(Math.abs(current));
        }
    }, 16);
}
// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    });
});

// Autocomplete for commander search
const commanderInput = document.getElementById('commander-input');
const commanderResults = document.getElementById('commander-results');
let selectedIndex = -1;
let currentMatches = [];

commanderInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    selectedIndex = -1;

    if (searchTerm.length < 2) {
        commanderResults.classList.remove('show');
        currentMatches = [];
        return;
    }

    currentMatches = commanders.filter(cmd =>
        cmd.name.toLowerCase().includes(searchTerm)
    ).slice(0, 10);

    if (currentMatches.length > 0) {
        displayCommanderResults(currentMatches);
        commanderResults.classList.add('show');
    } else {
        commanderResults.classList.remove('show');
    }
});

// Handle keyboard navigation
commanderInput.addEventListener('keydown', (e) => {
    if (!commanderResults.classList.contains('show')) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, currentMatches.length - 1);
        highlightResult(selectedIndex);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        highlightResult(selectedIndex);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        selectCommander(currentMatches[selectedIndex]);
    } else if (e.key === 'Escape') {
        commanderResults.classList.remove('show');
    }
});

function displayCommanderResults(matches) {
    commanderResults.innerHTML = matches.map((cmd, index) => {
        const escapedJson = JSON.stringify(cmd).replace(/'/g, '&#39;');
        return `<div class="autocomplete-item" data-index="${index}" data-commander='${escapedJson}'>${cmd.name}</div>`;
    }).join('');
}

function highlightResult(index) {
    const items = commanderResults.querySelectorAll('.autocomplete-item');
    items.forEach((item, i) => {
        if (i === index) {
            item.style.background = '#f39c12';
            item.style.color = '#1a1a2e';
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.style.background = '';
            item.style.color = '';
        }
    });
}

function selectCommander(commander) {
    selectedCommander = commander;
    commanderInput.value = commander.name;
    commanderResults.classList.remove('show');
    currentMatches = [];
    selectedIndex = -1;
}

// Select commander from autocomplete (click)
commanderResults.addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        const index = parseInt(e.target.dataset.index);
        selectCommander(currentMatches[index]);
    }
});

// Mouse hover updates selection
commanderResults.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        selectedIndex = parseInt(e.target.dataset.index);
        highlightResult(selectedIndex);
    }
});

// Select commander from autocomplete
commanderResults.addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        selectedCommander = JSON.parse(e.target.dataset.commander);
        commanderInput.value = selectedCommander.name;
        commanderResults.classList.remove('show');
    }
});

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (!commanderInput.contains(e.target) && !commanderResults.contains(e.target)) {
        commanderResults.classList.remove('show');
    }
});

// Add deck form submission
document.getElementById('add-deck-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedCommander) {
        alert('Please select a commander from the dropdown');
        return;
    }

    const deckName = document.getElementById('deck-name').value;

    const newDeck = {
        id: Date.now(),
        name: deckName,
        commander: selectedCommander,
        dateAdded: new Date().toISOString()
    };

    myDecks = await storage.saveDeck(newDeck);

    // Show success message
    const successMsg = document.getElementById('deck-success');
    successMsg.textContent = `✓ Deck "${deckName}" added successfully!`;
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);

    // Reset form
    document.getElementById('add-deck-form').reset();
    selectedCommander = null;

    // Refresh deck list
    displayDecks();
});

// Display user's decks
async function displayDecks() {
    const deckList = document.getElementById('deck-list');

    // Count active and archived decks
    const activeDecks = myDecks.filter(d => !d.archived);
    const archivedDecks = myDecks.filter(d => d.archived);

    if (myDecks.length === 0) {
        deckList.innerHTML = '<h2 style="margin-top: 30px;">Your Decks</h2><p>No decks added yet.</p>';
        return;
    }

    // Filter decks based on showArchivedDecks toggle
    const decksToShow = showArchivedDecks ? myDecks : activeDecks;

    // Start with loading state and toggle
    const toggleHtml = archivedDecks.length > 0 ? `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #b0b3c1; text-transform: none; font-size: 14px;">
                <input type="checkbox" id="show-archived-toggle" ${showArchivedDecks ? 'checked' : ''}
                       style="width: 18px; height: 18px; cursor: pointer;">
                Show retired decks (${archivedDecks.length})
            </label>
        </div>
    ` : '';

    deckList.innerHTML = '<h2 style="margin-top: 30px;">Your Decks</h2>' + toggleHtml + '<p>Loading deck images...</p>';

    // Re-attach toggle listener
    const toggleEl = document.getElementById('show-archived-toggle');
    if (toggleEl) {
        toggleEl.addEventListener('change', (e) => {
            showArchivedDecks = e.target.checked;
            displayDecks();
        });
    }

    if (decksToShow.length === 0) {
        deckList.innerHTML = '<h2 style="margin-top: 30px;">Your Decks</h2>' + toggleHtml + '<p>No active decks. Check "Show retired decks" to see archived commanders.</p>';
        return;
    }

    const decksHtml = await Promise.all(decksToShow.map(async deck => {
        // Convert color identity to mana symbols
        let colorSymbols = '';
        if (deck.commander.colorIdentity.length === 0) {
            colorSymbols = '<i class="ms ms-c mana"></i>';
        } else {
            colorSymbols = deck.commander.colorIdentity.map(color => {
                const colorMap = {
                    'W': 'w',
                    'U': 'u',
                    'B': 'b',
                    'R': 'r',
                    'G': 'g'
                };
                return `<i class="ms ms-${colorMap[color]} mana"></i>`;
            }).join('');
        }

        // Get commander image
        const imageUrl = await getCommanderImage(deck.commander.name);

        // Decklist section
        const hasDecklist = deck.decklist && Object.keys(deck.decklist).length > 0;
        const decklistButtonText = hasDecklist ? 'View Decklist' : 'Import from Moxfield';
        const isArchived = deck.archived;
        const archiveButtonText = isArchived ? 'Restore' : 'Retire';
        const archiveButtonStyle = isArchived
            ? 'background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);'
            : 'background: linear-gradient(135deg, #6c757d 0%, #495057 100%);';
        const archivedClass = isArchived ? 'deck-card--archived' : '';
        const archivedBadge = isArchived
            ? '<span class="deck-card__badge">Retired</span>'
            : '';

        return `
            <div class="deck-card ${archivedClass}">
                <div class="deck-card__banner" style="background-image: url('${imageUrl || ''}');">
                    <div class="deck-card__banner-overlay"></div>
                </div>
                <div class="deck-card__content">
                    <div class="deck-card__info">
                        <h3 class="deck-card__name">${deck.name}${archivedBadge}</h3>
                        <p class="deck-card__commander">${deck.commander.name}</p>
                        <div class="deck-card__colors mana-cost">${colorSymbols}</div>
                    </div>
                    <div class="deck-card__actions">
                        <button onclick="toggleDecklist(${deck.id})" class="btn-decklist">
                            ${decklistButtonText}
                        </button>
                        <button onclick="openEDHREC('${deck.commander.name.replace(/'/g, "\\'")}')" class="btn-edhrec">
                            EDHREC
                        </button>
                        <button onclick="toggleDeckArchive(${deck.id})" style="${archiveButtonStyle}">
                            ${archiveButtonText}
                        </button>
                        <button class="danger" onclick="deleteDeck(${deck.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }));

    // Rebuild toggle HTML for final render
    const finalToggleHtml = archivedDecks.length > 0 ? `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #b0b3c1; text-transform: none; font-size: 14px;">
                <input type="checkbox" id="show-archived-toggle" ${showArchivedDecks ? 'checked' : ''}
                       style="width: 18px; height: 18px; cursor: pointer;">
                Show retired decks (${archivedDecks.length})
            </label>
        </div>
    ` : '';

    deckList.innerHTML = `<h2 style="margin-top: 30px;">Your Decks</h2>` + finalToggleHtml + `<div class="deck-grid">${decksHtml.join('')}</div>`;

    // Re-attach toggle listener after final render
    const finalToggleEl = document.getElementById('show-archived-toggle');
    if (finalToggleEl) {
        finalToggleEl.addEventListener('change', (e) => {
            showArchivedDecks = e.target.checked;
            displayDecks();
        });
    }
}

// Render Moxfield input form
function renderMoxfieldInput(deckId) {
    return `
        <div>
            <h3 style="color: #ffd700; margin-bottom: 10px;">Import Decklist from Moxfield</h3>
            <p style="color: #888; margin-bottom: 15px;">Paste your Moxfield deck URL (e.g., https://www.moxfield.com/decks/YOUR_DECK_ID)</p>
            <div style="display: flex; gap: 10px;">
                <input type="text" 
                       id="moxfield-url-${deckId}" 
                       placeholder="https://www.moxfield.com/decks/..." 
                       style="flex: 1;">
                <button onclick="importMoxfieldDeck(${deckId})" 
                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    Import
                </button>
            </div>
            <div id="import-status-${deckId}" style="margin-top: 10px;"></div>
        </div>
    `;
}

// Render decklist
function renderDecklist(decklist) {
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">';
    
    // Commander section
    if (decklist.commander && Object.keys(decklist.commander).length > 0) {
        html += '<div>';
        html += '<h4 style="color: #ffd700; margin-bottom: 10px;">Commander</h4>';
        Object.entries(decklist.commander).forEach(([name, data]) => {
            html += `<div style="padding: 4px 0;">${data.quantity}x ${name}</div>`;
        });
        html += '</div>';
    }
    
    // Mainboard sections
    Object.entries(decklist.mainboard || {}).forEach(([category, cards]) => {
        if (cards.length > 0) {
            html += '<div>';
            html += `<h4 style="color: #ffd700; margin-bottom: 10px;">${category} (${cards.length})</h4>`;
            cards.forEach(card => {
                html += `<div style="padding: 4px 0;">${card.quantity}x ${card.name}</div>`;
            });
            html += '</div>';
        }
    });
    
    html += '</div>';
    return html;
}

// Current deck for copy functionality
let currentDecklistDeck = null;

// Show decklist modal
window.toggleDecklist = function(deckId) {
    const deck = myDecks.find(d => d.id === deckId);
    if (!deck) return;

    currentDecklistDeck = deck;

    const modal = document.getElementById('decklist-modal');
    const titleEl = document.getElementById('decklist-modal-title');
    const commanderEl = document.getElementById('decklist-modal-commander');
    const bodyEl = document.getElementById('decklist-modal-body');
    const copyBtn = document.getElementById('copy-decklist-btn');

    titleEl.textContent = deck.name;
    commanderEl.textContent = deck.commander.name;

    const hasDecklist = deck.decklist && Object.keys(deck.decklist.mainboard || {}).length > 0;

    if (hasDecklist) {
        bodyEl.innerHTML = renderDecklistForModal(deck.decklist);
        copyBtn.style.display = 'inline-block';
    } else {
        bodyEl.innerHTML = renderMoxfieldInputForModal(deck.id);
        copyBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
};

// Render decklist for modal
function renderDecklistForModal(decklist) {
    let html = '<div class="decklist-grid">';

    // Commander section
    if (decklist.commander && Object.keys(decklist.commander).length > 0) {
        html += '<div class="decklist-category">';
        html += '<h4>Commander</h4>';
        html += '<ul>';
        Object.entries(decklist.commander).forEach(([name, data]) => {
            html += `<li>${data.quantity}x ${name}</li>`;
        });
        html += '</ul></div>';
    }

    // Mainboard sections
    const categoryOrder = ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Planeswalkers', 'Lands', 'Other'];

    categoryOrder.forEach(category => {
        const cards = decklist.mainboard?.[category];
        if (cards && cards.length > 0) {
            html += '<div class="decklist-category">';
            html += `<h4>${category} (${cards.length})</h4>`;
            html += '<ul>';
            cards.forEach(card => {
                html += `<li>${card.quantity}x ${card.name}</li>`;
            });
            html += '</ul></div>';
        }
    });

    html += '</div>';
    return html;
}

// Render Moxfield import for modal
function renderMoxfieldInputForModal(deckId) {
    return `
        <div class="decklist-import-container">
            <h4 style="color: var(--accent); margin-bottom: 10px;">Import Decklist from Moxfield</h4>
            <p>Paste your Moxfield deck URL to import your decklist</p>
            <input type="text"
                   id="moxfield-url-${deckId}"
                   placeholder="https://www.moxfield.com/decks/..."
                   style="width: 100%;">
            <div style="margin-top: 15px;">
                <button onclick="importMoxfieldDeckFromModal(${deckId})"
                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    Import Decklist
                </button>
            </div>
            <div id="import-status-${deckId}" style="margin-top: 15px;"></div>
        </div>
    `;
}

// Import from modal
window.importMoxfieldDeckFromModal = async function(deckId) {
    const urlInput = document.getElementById(`moxfield-url-${deckId}`);
    const statusDiv = document.getElementById(`import-status-${deckId}`);
    const url = urlInput.value.trim();

    if (!url) {
        statusDiv.innerHTML = '<p style="color: var(--danger);">Please enter a Moxfield URL</p>';
        return;
    }

    statusDiv.innerHTML = '<p style="color: var(--accent);">Importing decklist...</p>';

    try {
        const decklist = await fetchMoxfieldDeck(url);
        myDecks = await storage.updateDeck(deckId, { decklist });

        statusDiv.innerHTML = '<p style="color: var(--success);">✓ Decklist imported successfully!</p>';

        // Refresh modal content
        setTimeout(() => {
            window.toggleDecklist(deckId);
            displayDecks();
        }, 1000);

    } catch (error) {
        statusDiv.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
};

// Convert decklist to text format for copying
function decklistToText(deck) {
    if (!deck || !deck.decklist) return '';

    let text = `// ${deck.name}\n`;
    text += `// Commander: ${deck.commander.name}\n\n`;

    const decklist = deck.decklist;

    // Commander
    if (decklist.commander && Object.keys(decklist.commander).length > 0) {
        text += '// Commander\n';
        Object.entries(decklist.commander).forEach(([name, data]) => {
            text += `${data.quantity} ${name}\n`;
        });
        text += '\n';
    }

    // Mainboard by category
    const categoryOrder = ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Planeswalkers', 'Lands', 'Other'];

    categoryOrder.forEach(category => {
        const cards = decklist.mainboard?.[category];
        if (cards && cards.length > 0) {
            text += `// ${category}\n`;
            cards.forEach(card => {
                text += `${card.quantity} ${card.name}\n`;
            });
            text += '\n';
        }
    });

    return text.trim();
}

// Close decklist modal and copy functionality
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('decklist-modal');
    const closeBtn = document.getElementById('decklist-modal-close');
    const copyBtn = document.getElementById('copy-decklist-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            if (!currentDecklistDeck) return;

            const text = decklistToText(currentDecklistDeck);
            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// Import Moxfield deck
window.importMoxfieldDeck = async function(deckId) {
    const urlInput = document.getElementById(`moxfield-url-${deckId}`);
    const statusDiv = document.getElementById(`import-status-${deckId}`);
    const url = urlInput.value.trim();
    
    if (!url) {
        statusDiv.innerHTML = '<p style="color: #ff6b6b;">Please enter a Moxfield URL</p>';
        return;
    }
    
    statusDiv.innerHTML = '<p style="color: #ffd700;">Importing decklist...</p>';
    
    try {
        const decklist = await fetchMoxfieldDeck(url);
        
        // Update deck with decklist
        myDecks = await storage.updateDeck(deckId, { decklist });
        
        statusDiv.innerHTML = '<p style="color: #00b894;">✓ Decklist imported successfully!</p>';
        
        // Refresh deck display after a short delay
        setTimeout(() => {
            displayDecks();
        }, 1000);
        
    } catch (error) {
        statusDiv.innerHTML = `<p style="color: #ff6b6b;">Error: ${error.message}</p>`;
    }
};

// Delete deck
window.deleteDeck = async function (deckId) {
    const deck = myDecks.find(d => d.id === deckId);
    const deckName = deck ? deck.name : 'this deck';

    const confirmed = await showConfirmModal(
        'Delete Deck',
        `Are you sure you want to delete "${deckName}"? This will permanently remove the deck but keep your game history. This cannot be undone.`,
        'Delete Deck'
    );

    if (confirmed) {
        myDecks = await storage.deleteDeck(deckId);
        displayDecks();

        const successMsg = document.getElementById('deck-success');
        successMsg.textContent = '✓ Deck deleted successfully!';
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 3000);
    }
};

// Open EDHREC page for a commander
window.openEDHREC = function (commanderName) {
    // Convert commander name to EDHREC URL format
    // e.g., "Atraxa, Praetors' Voice" → "atraxa-praetors-voice"
    const urlName = commanderName
        .toLowerCase()
        .replace(/[,']/g, '')        // Remove commas and apostrophes
        .replace(/\s+/g, '-')        // Replace spaces with hyphens
        .replace(/-+/g, '-')         // Replace multiple hyphens with single
        .replace(/[^a-z0-9-]/g, ''); // Remove any other special characters

    const url = `https://edhrec.com/commanders/${urlName}`;
    storage.openExternal(url);
};

// Toggle deck archive status (retire/restore)
window.toggleDeckArchive = async function (deckId) {
    const deck = myDecks.find(d => d.id === deckId);
    const isCurrentlyArchived = deck?.archived;

    myDecks = await storage.toggleDeckArchive(deckId);
    displayDecks();

    const successMsg = document.getElementById('deck-success');
    successMsg.textContent = isCurrentlyArchived
        ? '✓ Deck restored successfully!'
        : '✓ Deck retired successfully!';
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);
};

// Game logging functionality
let opponentCount = 0;
const maxOpponents = 5;

// Set today's date as default
document.getElementById('game-date').valueAsDate = new Date();

// Load my decks into dropdown (only active decks)
function loadMyDecksDropdown() {
    const deckSelect = document.getElementById('my-deck');
    deckSelect.innerHTML = '<option value="">Select your deck...</option>';

    // Only show active (non-archived) decks for game logging
    const activeDecks = myDecks.filter(deck => !deck.archived);

    activeDecks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck.id;
        option.textContent = `${deck.name} (${deck.commander.name})`;
        deckSelect.appendChild(option);
    });
}

// Add opponent field
function addOpponentField() {
    if (opponentCount >= maxOpponents) {
        alert('Maximum 5 opponents allowed');
        return;
    }

    opponentCount++;
    const container = document.getElementById('opponents-container');

    const opponentDiv = document.createElement('div');
    opponentDiv.className = 'form-group';
    opponentDiv.id = `opponent-${opponentCount}`;
    opponentDiv.innerHTML = `
    <label for="opponent-${opponentCount}-input">Opponent ${opponentCount} Commander</label>
    <div class="autocomplete-container">
      <input type="text" 
             id="opponent-${opponentCount}-input" 
             class="opponent-input" 
             data-opponent="${opponentCount}"
             autocomplete="off" 
             placeholder="Start typing commander name...">
      <div id="opponent-${opponentCount}-results" class="autocomplete-results"></div>
    </div>
    <button type="button" onclick="removeOpponent(${opponentCount})" style="margin-top: 10px; background: #e74c3c;">Remove</button>
  `;

    container.appendChild(opponentDiv);
    setupOpponentAutocomplete(opponentCount);
    updateAddOpponentButton();
}

// Remove opponent field
window.removeOpponent = function (num) {
    const opponentDiv = document.getElementById(`opponent-${num}`);
    if (opponentDiv) {
        opponentDiv.remove();
        opponentCount--;
        updateAddOpponentButton();
    }
};

// Update add opponent button visibility
function updateAddOpponentButton() {
    const addButton = document.getElementById('add-opponent');
    if (opponentCount >= maxOpponents) {
        addButton.style.display = 'none';
    } else {
        addButton.style.display = 'inline-block';
    }
}

// Setup autocomplete for opponent field
function setupOpponentAutocomplete(num) {
    const input = document.getElementById(`opponent-${num}-input`);
    const results = document.getElementById(`opponent-${num}-results`);
    let selectedOpponent = null;
    let selectedIndex = -1;
    let currentMatches = [];

    input.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        selectedIndex = -1;

        if (searchTerm.length < 2) {
            results.classList.remove('show');
            currentMatches = [];
            return;
        }

        currentMatches = commanders.filter(cmd =>
            cmd.name.toLowerCase().includes(searchTerm)
        ).slice(0, 10);

        if (currentMatches.length > 0) {
            results.innerHTML = currentMatches.map((cmd, index) => {
                const escapedJson = JSON.stringify(cmd).replace(/'/g, '&#39;');
                return `<div class="autocomplete-item" data-index="${index}" data-commander='${escapedJson}'>${cmd.name}</div>`;
            }).join('');
            results.classList.add('show');
        } else {
            results.classList.remove('show');
        }
    });

    // Handle keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (!results.classList.contains('show')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, currentMatches.length - 1);
            highlightOpponentResult(results, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            highlightOpponentResult(results, selectedIndex);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectOpponent(input, results, currentMatches[selectedIndex]);
            currentMatches = [];
            selectedIndex = -1;
        } else if (e.key === 'Escape') {
            results.classList.remove('show');
        }
    });

    function highlightOpponentResult(resultsEl, index) {
        const items = resultsEl.querySelectorAll('.autocomplete-item');
        items.forEach((item, i) => {
            if (i === index) {
                item.style.background = '#f39c12';
                item.style.color = '#1a1a2e';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = '';
                item.style.color = '';
            }
        });
    }

    function selectOpponent(inputEl, resultsEl, commander) {
        inputEl.value = commander.name;
        inputEl.dataset.selected = JSON.stringify(commander);
        resultsEl.classList.remove('show');
    }

    results.addEventListener('click', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            const index = parseInt(e.target.dataset.index);
            selectOpponent(input, results, currentMatches[index]);
        }
    });

    // Mouse hover updates selection
    results.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            selectedIndex = parseInt(e.target.dataset.index);
            highlightOpponentResult(results, selectedIndex);
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.remove('show');
        }
    });
}

// Add opponent button
document.getElementById('add-opponent').addEventListener('click', addOpponentField);

// Winning commander selection
let selectedWinningCommander = null;

// Helper function to convert color identity array to string
function colorIdentityToString(colorIdentity) {
    if (!colorIdentity || colorIdentity.length === 0) return 'C';
    return colorIdentity.join('');
}

// Helper function to render mana symbols
function renderManaSymbols(colorIdentity) {
    if (!colorIdentity || colorIdentity.length === 0) {
        return '<i class="ms ms-c mana"></i>';
    }
    const colorMap = { 'W': 'w', 'U': 'u', 'B': 'b', 'R': 'r', 'G': 'g' };
    return colorIdentity.map(c => `<i class="ms ms-${colorMap[c]} mana"></i>`).join('');
}

// Update winner color display
function updateWinnerColorDisplay() {
    const preview = document.getElementById('winner-colors-preview');
    const hiddenInput = document.getElementById('winner-colors');
    const displayGroup = document.getElementById('winner-colors-display');
    const iWon = document.getElementById('i-won').checked;
    const iLost = document.getElementById('i-lost').checked;

    if (!iWon && !iLost) {
        displayGroup.style.display = 'none';
        return;
    }

    displayGroup.style.display = 'block';

    if (iWon) {
        const deckId = parseInt(document.getElementById('my-deck').value);
        const myDeck = myDecks.find(d => d.id === deckId);
        if (myDeck) {
            const colorStr = colorIdentityToString(myDeck.commander.colorIdentity);
            hiddenInput.value = colorStr;
            preview.innerHTML = renderManaSymbols(myDeck.commander.colorIdentity);
        } else {
            hiddenInput.value = '';
            preview.innerHTML = '<span style="color: var(--text-muted);">Select your deck first</span>';
        }
    } else if (iLost) {
        if (selectedWinningCommander) {
            const colorStr = colorIdentityToString(selectedWinningCommander.colorIdentity);
            hiddenInput.value = colorStr;
            preview.innerHTML = renderManaSymbols(selectedWinningCommander.colorIdentity);
        } else {
            hiddenInput.value = '';
            preview.innerHTML = '<span style="color: var(--text-muted);">Select the winning commander</span>';
        }
    }
}

// Handle game result radio buttons
document.getElementById('i-won').addEventListener('change', () => {
    document.getElementById('winning-commander-group').style.display = 'none';
    selectedWinningCommander = null;
    document.getElementById('winning-commander-input').value = '';
    updateWinnerColorDisplay();
});

document.getElementById('i-lost').addEventListener('change', () => {
    document.getElementById('winning-commander-group').style.display = 'block';
    updateWinnerColorDisplay();
});

// Update color display when deck changes
document.getElementById('my-deck').addEventListener('change', () => {
    updateWinnerColorDisplay();
});

// Setup winning commander autocomplete
(function setupWinningCommanderAutocomplete() {
    const input = document.getElementById('winning-commander-input');
    const results = document.getElementById('winning-commander-results');
    let selectedIndex = -1;
    let currentMatches = [];

    input.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        selectedIndex = -1;

        if (searchTerm.length < 2) {
            results.classList.remove('show');
            currentMatches = [];
            return;
        }

        currentMatches = commanders.filter(cmd =>
            cmd.name.toLowerCase().includes(searchTerm)
        ).slice(0, 10);

        if (currentMatches.length > 0) {
            results.innerHTML = currentMatches.map((cmd, index) => {
                return `<div class="autocomplete-item" data-index="${index}">${cmd.name}</div>`;
            }).join('');
            results.classList.add('show');
        } else {
            results.classList.remove('show');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (!results.classList.contains('show')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, currentMatches.length - 1);
            highlightResult(selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            highlightResult(selectedIndex);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectWinningCommander(currentMatches[selectedIndex]);
        } else if (e.key === 'Escape') {
            results.classList.remove('show');
        }
    });

    function highlightResult(index) {
        const items = results.querySelectorAll('.autocomplete-item');
        items.forEach((item, i) => {
            if (i === index) {
                item.style.background = 'var(--accent)';
                item.style.color = 'var(--bg-primary)';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = '';
                item.style.color = '';
            }
        });
    }

    function selectWinningCommander(commander) {
        selectedWinningCommander = commander;
        input.value = commander.name;
        results.classList.remove('show');
        currentMatches = [];
        selectedIndex = -1;
        updateWinnerColorDisplay();
    }

    results.addEventListener('click', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            const index = parseInt(e.target.dataset.index);
            selectWinningCommander(currentMatches[index]);
        }
    });

    results.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            selectedIndex = parseInt(e.target.dataset.index);
            highlightResult(selectedIndex);
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.remove('show');
        }
    });
})();

// Log game form submission
document.getElementById('log-game-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const deckId = parseInt(document.getElementById('my-deck').value);
    const myDeck = myDecks.find(d => d.id === deckId);

    if (!myDeck) {
        alert('Please select your deck');
        return;
    }

    const gameDate = document.getElementById('game-date').value;
    const iWon = document.getElementById('i-won').checked;
    const iLost = document.getElementById('i-lost').checked;

    if (!iWon && !iLost) {
        alert('Please select whether you won or lost');
        return;
    }

    // If lost, must have selected a winning commander
    if (iLost && !selectedWinningCommander) {
        alert('Please select the winning commander');
        return;
    }

    const winnerColors = document.getElementById('winner-colors').value;

    if (!winnerColors) {
        alert('Could not determine winning color identity');
        return;
    }

    // Collect opponents
    const opponents = [];
    for (let i = 1; i <= opponentCount; i++) {
        const input = document.getElementById(`opponent-${i}-input`);
        if (input && input.dataset.selected) {
            opponents.push(JSON.parse(input.dataset.selected));
        }
    }

    // If lost, add the winning commander to opponents if not already there
    if (iLost && selectedWinningCommander) {
        const alreadyInOpponents = opponents.some(o => o.name === selectedWinningCommander.name);
        if (!alreadyInOpponents) {
            opponents.unshift(selectedWinningCommander);
        }
    }

    const newGame = {
        id: Date.now(),
        date: gameDate,
        myDeck: myDeck,
        won: iWon,
        winnerColorIdentity: winnerColors,
        opponents: opponents,
        totalPlayers: opponents.length + 1
    };

    await storage.saveGame(newGame);

    // Show success message
    const successMsg = document.getElementById('game-success');
    successMsg.textContent = `✓ Game logged successfully! ${iWon ? 'Victory!' : 'Better luck next time!'}`;
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);

    // Reset form
    document.getElementById('log-game-form').reset();
    document.getElementById('game-date').valueAsDate = new Date();
    document.getElementById('opponents-container').innerHTML = '';
    document.getElementById('winning-commander-group').style.display = 'none';
    document.getElementById('winner-colors-display').style.display = 'none';
    document.getElementById('winning-commander-input').value = '';
    selectedWinningCommander = null;
    opponentCount = 0;
    updateAddOpponentButton();

    console.log('Game logged:', newGame);
});

// Load decks when switching to log game tab
document.querySelector('[data-tab="log-game"]').addEventListener('click', () => {
    loadMyDecksDropdown();
});

// Game History functionality
let allGames = [];
let gameFilters = {
    deck: 'all',
    result: 'all',
    dateFrom: null,
    dateTo: null,
    opponent: ''
};

async function loadGameHistory() {
    allGames = await storage.getGames();
    await populateDeckFilter();
    displayGameHistory();
}

async function populateDeckFilter() {
    const filterDeck = document.getElementById('filter-deck');
    filterDeck.innerHTML = '<option value="all">All Decks</option>';

    myDecks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck.id;
        option.textContent = deck.name;
        filterDeck.appendChild(option);
    });
}

function applyFilters(games) {
    return games.filter(game => {
        // Deck filter
        if (gameFilters.deck !== 'all' && game.myDeck.id !== parseInt(gameFilters.deck)) {
            return false;
        }

        // Result filter
        if (gameFilters.result === 'win' && !game.won) return false;
        if (gameFilters.result === 'loss' && game.won) return false;

        // Date range filter
        const gameDate = new Date(game.date);
        if (gameFilters.dateFrom) {
            const fromDate = new Date(gameFilters.dateFrom);
            if (gameDate < fromDate) return false;
        }
        if (gameFilters.dateTo) {
            const toDate = new Date(gameFilters.dateTo);
            if (gameDate > toDate) return false;
        }

        // Opponent filter
        if (gameFilters.opponent) {
            const opponentSearch = gameFilters.opponent.toLowerCase();
            const hasMatchingOpponent = game.opponents.some(opp =>
                opp.name.toLowerCase().includes(opponentSearch)
            );
            if (!hasMatchingOpponent) return false;
        }

        return true;
    });
}

function displayGameHistory() {
    const historyBody = document.getElementById('game-history-body');

    if (allGames.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center;">No games logged yet</td></tr>';
        return;
    }

    const colorIdentityMap = {
        'W': 'Mono-White',
        'U': 'Mono-Blue',
        'B': 'Mono-Black',
        'R': 'Mono-Red',
        'G': 'Mono-Green',
        'C': 'Colorless',
        'WU': 'Azorius',
        'UB': 'Dimir',
        'BR': 'Rakdos',
        'RG': 'Gruul',
        'GW': 'Selesnya',
        'WB': 'Orzhov',
        'UR': 'Izzet',
        'BG': 'Golgari',
        'RW': 'Boros',
        'GU': 'Simic',
        'WUB': 'Esper',
        'UBR': 'Grixis',
        'BRG': 'Jund',
        'RGW': 'Naya',
        'GWU': 'Bant',
        'WBG': 'Abzan',
        'WUR': 'Jeskai',
        'UBG': 'Sultai',
        'BRW': 'Mardu',
        'URG': 'Temur',
        'WUBR': 'Yore-Tiller',
        'UBRG': 'Glint-Eye',
        'BRGW': 'Dune-Brood',
        'RGWU': 'Ink-Treader',
        'GWUB': 'Witch-Maw',
        'WUBRG': 'Five-Color'
    };

    // Helper function to convert color identity string to mana symbols
    function getColorSymbols(colorStr) {
        if (colorStr === 'C') {
            return '<i class="ms ms-c mana"></i>';
        }

        const colorMap = {
            'W': 'w',
            'U': 'u',
            'B': 'b',
            'R': 'r',
            'G': 'g'
        };

        return colorStr.split('').map(c => {
            const symbol = colorMap[c];
            return symbol ? `<i class="ms ms-${symbol} mana"></i>` : '';
        }).join('');
    }

    // Helper function to get deck color symbols
    function getDeckColorSymbols(deck) {
        if (!deck.commander || !deck.commander.colorIdentity) return '';

        if (deck.commander.colorIdentity.length === 0) {
            return '<i class="ms ms-c mana"></i>';
        }

        const colorMap = {
            'W': 'w',
            'U': 'u',
            'B': 'b',
            'R': 'r',
            'G': 'g'
        };

        return deck.commander.colorIdentity.map(color => {
            return `<i class="ms ms-${colorMap[color]} mana"></i>`;
        }).join('');
    }

    // Apply filters and sort by date (newest first)
    const filteredGames = applyFilters(allGames);
    const sortedGames = [...filteredGames].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedGames.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center;">No games match the current filters</td></tr>';
        return;
    }

    historyBody.innerHTML = sortedGames.map(game => {
        const resultColor = game.won ? '#00b894' : '#ff6b6b';
        const resultText = game.won ? 'WIN' : 'LOSS';
        const opponents = game.opponents.map(o =>
            `<span style="display: inline-block; background: rgba(255, 215, 0, 0.15); padding: 4px 10px; border-radius: 6px; margin: 2px; font-size: 13px; border: 1px solid rgba(255, 215, 0, 0.3);">${o.name}</span>`
        ).join('');
        const colorName = colorIdentityMap[game.winnerColorIdentity] || game.winnerColorIdentity;
        const winnerSymbols = getColorSymbols(game.winnerColorIdentity);
        const deckSymbols = getDeckColorSymbols(game.myDeck);

        return `
      <tr>
        <td>${game.date}</td>
        <td>
          ${game.myDeck.name}<br>
          <small style="color: #888;">${game.myDeck.commander.name}</small><br>
          <div class="mana-cost" style="margin-top: 4px;">${deckSymbols}</div>
        </td>
        <td style="color: ${resultColor}; font-weight: bold;">${resultText}</td>
        <td>
          ${colorName}<br>
          <div class="mana-cost" style="margin-top: 4px;">${winnerSymbols}</div>
        </td>
        <td style="max-width: 300px;">${opponents || 'None'}</td>
        <td>
          <button class="danger" onclick="deleteGame(${game.id})" style="padding: 6px 12px; font-size: 14px;">Delete</button>
        </td>
      </tr>
    `;
    }).join('');
}

// Filter event listeners
document.getElementById('filter-deck').addEventListener('change', (e) => {
    gameFilters.deck = e.target.value;
    displayGameHistory();
});

document.getElementById('filter-result').addEventListener('change', (e) => {
    gameFilters.result = e.target.value;
    displayGameHistory();
});

document.getElementById('filter-date-from').addEventListener('change', (e) => {
    gameFilters.dateFrom = e.target.value;
    displayGameHistory();
});

document.getElementById('filter-date-to').addEventListener('change', (e) => {
    gameFilters.dateTo = e.target.value;
    displayGameHistory();
});

document.getElementById('filter-opponent').addEventListener('input', (e) => {
    gameFilters.opponent = e.target.value;
    displayGameHistory();
});

document.getElementById('clear-filters').addEventListener('click', () => {
    gameFilters = {
        deck: 'all',
        result: 'all',
        dateFrom: null,
        dateTo: null,
        opponent: ''
    };

    document.getElementById('filter-deck').value = 'all';
    document.getElementById('filter-result').value = 'all';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-opponent').value = '';

    displayGameHistory();
});

// Delete game
window.deleteGame = async function (gameId) {
    const game = allGames.find(g => g.id === gameId);
    const gameInfo = game ? `the game from ${game.date} with ${game.myDeck.name}` : 'this game';

    const confirmed = await showConfirmModal(
        'Delete Game',
        `Are you sure you want to delete ${gameInfo}? This will affect your statistics. This cannot be undone.`,
        'Delete Game'
    );

    if (confirmed) {
        allGames = await storage.deleteGame(gameId);
        displayGameHistory();

        const successMsg = document.getElementById('history-success');
        successMsg.textContent = '✓ Game deleted successfully!';
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 3000);
    }
};

// Export functionality
document.getElementById('export-csv').addEventListener('click', async () => {
    const result = await storage.exportToCsv();

    const successMsg = document.getElementById('history-success');
    if (result.success) {
        successMsg.style.background = '#27ae60';
        successMsg.textContent = '✓ ' + result.message;
    } else {
        successMsg.style.background = '#e74c3c';
        successMsg.textContent = '✗ ' + result.message;
    }
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);
});

document.getElementById('export-json').addEventListener('click', async () => {
    const result = await storage.exportToJson();

    const successMsg = document.getElementById('history-success');
    if (result.success) {
        successMsg.style.background = '#27ae60';
        successMsg.textContent = '✓ ' + result.message;
    } else {
        successMsg.style.background = '#e74c3c';
        successMsg.textContent = '✗ ' + result.message;
    }
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);
});

// Load game history when switching to game history tab
document.querySelector('[data-tab="game-history"]').addEventListener('click', () => {
    loadGameHistory();
});

// Statistics functionality
let chartInstances = {};
let selectedYear = 'lifetime';

async function loadStatistics() {
    allGames = await storage.getGames();
    populateYearFilter();
    calculateAndDisplayStats();
}

function populateYearFilter() {
    const yearFilter = document.getElementById('year-filter');
    const years = new Set();

    // Extract years from all games
    allGames.forEach(game => {
        const year = new Date(game.date).getFullYear();
        years.add(year);
    });

    // Convert to sorted array
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // Build options
    let options = '<option value="lifetime">Lifetime</option>';
    sortedYears.forEach(year => {
        options += `<option value="${year}">${year}</option>`;
    });

    yearFilter.innerHTML = options;
    yearFilter.value = selectedYear;
}

function filterGamesByYear(games, year) {
    if (year === 'lifetime') {
        return games;
    }

    return games.filter(game => {
        const gameYear = new Date(game.date).getFullYear();
        return gameYear === parseInt(year);
    });
}

function calculateAndDisplayStats() {
    // Destroy existing charts
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    chartInstances = {};

    // Filter games by selected year
    const filteredGames = filterGamesByYear(allGames, selectedYear);

    if (filteredGames.length === 0) {
        document.getElementById('total-games').textContent = '0';
        document.getElementById('total-wins').textContent = '0';
        document.getElementById('total-losses').textContent = '0';
        document.getElementById('win-rate').textContent = '0%';
        document.getElementById('current-streak').textContent = '-';
        document.getElementById('best-streak').textContent = '-';
        document.getElementById('most-faced-commanders').innerHTML = '<div style="text-align: center; padding: 20px;"><p style="color: #888;">No games logged yet</p></div>';

        // Clear tables
        document.getElementById('deck-stats-body').innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center;">No games logged for this period</td></tr>';
        document.getElementById('color-stats-body').innerHTML = '<tr><td colspan="3" style="padding: 20px; text-align: center;">No games logged for this period</td></tr>';

        return;
    }

    // Overall stats
    const totalGames = filteredGames.length;
    const totalWins = filteredGames.filter(g => g.won).length;
    const totalLosses = totalGames - totalWins;
    const winRate = ((totalWins / totalGames) * 100).toFixed(1);

    // Get previous values for animation
    const totalGamesEl = document.getElementById('total-games');
    const totalWinsEl = document.getElementById('total-wins');
    const totalLossesEl = document.getElementById('total-losses');
    const winRateEl = document.getElementById('win-rate');

    const prevTotalGames = parseInt(totalGamesEl.textContent) || 0;
    const prevTotalWins = parseInt(totalWinsEl.textContent) || 0;
    const prevTotalLosses = parseInt(totalLossesEl.textContent) || 0;
    const prevWinRate = parseFloat(winRateEl.textContent) || 0;

    // Animate the changes
    animateValue(totalGamesEl, prevTotalGames, totalGames, 600);
    animateValue(totalWinsEl, prevTotalWins, totalWins, 600);
    animateValue(totalLossesEl, prevTotalLosses, totalLosses, 600);
    animateValue(winRateEl, prevWinRate, parseFloat(winRate), 600);

    [totalGamesEl, totalWinsEl, totalLossesEl, winRateEl].forEach(el => {
        el.closest('.stat-card').classList.add('updating');
        setTimeout(() => {
            el.closest('.stat-card').classList.remove('updating');
        }, 400);
    });

    // Calculate streaks
    calculateStreaks(filteredGames);

    // Calculate most faced commanders
    calculateMostFacedCommanders(filteredGames);

    // Create Win/Loss Pie Chart
    createWinLossChart(totalWins, totalLosses);

    // Create Games Over Time Chart
    createGamesOverTimeChart(filteredGames);

    // Deck performance stats
    const deckStats = {};

    filteredGames.forEach(game => {
        const deckId = game.myDeck.id;
        if (!deckStats[deckId]) {
            deckStats[deckId] = {
                deck: game.myDeck,
                games: 0,
                wins: 0,
                losses: 0
            };
        }

        deckStats[deckId].games++;
        if (game.won) {
            deckStats[deckId].wins++;
        } else {
            deckStats[deckId].losses++;
        }
    });

    // Create Deck Performance Chart
    createDeckPerformanceChart(deckStats);

    // Display deck stats table
    const deckTableBody = document.getElementById('deck-stats-body');
    const deckStatsArray = Object.values(deckStats);

    if (deckStatsArray.length === 0) {
        deckTableBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center;">No games logged for this period</td></tr>';
    } else {
        deckTableBody.innerHTML = deckStatsArray.map(stat => {
            const winRate = stat.games > 0 ? ((stat.wins / stat.games) * 100).toFixed(1) : '0.0';
            const winRateColor = winRate >= 50 ? '#00b894' : winRate >= 33 ? '#f39c12' : '#ff6b6b';

            return `
        <tr>
          <td>${stat.deck.name}</td>
          <td>${stat.deck.commander.name}</td>
          <td style="text-align: center;">${stat.games}</td>
          <td style="text-align: center; color: #00b894; font-weight: bold;">${stat.wins}</td>
          <td style="text-align: center; color: #ff6b6b;">${stat.losses}</td>
          <td style="text-align: center; color: ${winRateColor}; font-weight: bold;">${winRate}%</td>
        </tr>
      `;
        }).join('');
    }

    // Color identity stats
    const colorIdentityMap = {
        'W': 'Mono-White',
        'U': 'Mono-Blue',
        'B': 'Mono-Black',
        'R': 'Mono-Red',
        'G': 'Mono-Green',
        'C': 'Colorless',
        'WU': 'Azorius',
        'UB': 'Dimir',
        'BR': 'Rakdos',
        'RG': 'Gruul',
        'GW': 'Selesnya',
        'WB': 'Orzhov',
        'UR': 'Izzet',
        'BG': 'Golgari',
        'RW': 'Boros',
        'GU': 'Simic',
        'WUB': 'Esper',
        'UBR': 'Grixis',
        'BRG': 'Jund',
        'RGW': 'Naya',
        'GWU': 'Bant',
        'WBG': 'Abzan',
        'WUR': 'Jeskai',
        'UBG': 'Sultai',
        'BRW': 'Mardu',
        'URG': 'Temur',
        'WUBR': 'Yore-Tiller',
        'UBRG': 'Glint-Eye',
        'BRGW': 'Dune-Brood',
        'RGWU': 'Ink-Treader',
        'GWUB': 'Witch-Maw',
        'WUBRG': 'Five-Color'
    };

    const colorStats = {};
    const totalColorWins = filteredGames.length;

    filteredGames.forEach(game => {
        const color = game.winnerColorIdentity;
        if (!colorStats[color]) {
            colorStats[color] = 0;
        }
        colorStats[color]++;
    });

    // Create Color Wins Chart
    createColorWinsChart(colorStats, colorIdentityMap);

    // Display color stats table
    const colorTableBody = document.getElementById('color-stats-body');
    const colorStatsArray = Object.entries(colorStats).sort((a, b) => b[1] - a[1]);

    // Helper function to get mana symbols for color identity
    function getColorIdentitySymbols(colorStr) {
        if (colorStr === 'C') {
            return '<i class="ms ms-c mana"></i>';
        }

        const colorMap = {
            'W': 'w',
            'U': 'u',
            'B': 'b',
            'R': 'r',
            'G': 'g'
        };

        return colorStr.split('').map(c => {
            const symbol = colorMap[c];
            return symbol ? `<i class="ms ms-${symbol} mana"></i>` : '';
        }).join('');
    }

    if (colorStatsArray.length === 0) {
        colorTableBody.innerHTML = '<tr><td colspan="3" style="padding: 20px; text-align: center;">No games logged for this period</td></tr>';
    } else {
        colorTableBody.innerHTML = colorStatsArray.map(([color, wins]) => {
            const percentage = ((wins / totalColorWins) * 100).toFixed(1);
            const colorName = colorIdentityMap[color] || color;
            const colorSymbols = getColorIdentitySymbols(color);

            return `
        <tr>
          <td>
            ${colorName}
            <div class="mana-cost" style="margin-top: 6px;">${colorSymbols}</div>
          </td>
          <td style="text-align: center; font-weight: bold;">${wins}</td>
          <td style="text-align: center;">${percentage}%</td>
        </tr>
      `;
        }).join('');
    }
}

// Chart creation functions
function createWinLossChart(wins, losses) {
    const ctx = document.getElementById('winLossChart').getContext('2d');
    chartInstances.winLoss = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses'],
            datasets: [{
                data: [wins, losses],
                backgroundColor: ['#27ae60', '#e74c3c'],
                borderColor: ['#1a1a2e', '#1a1a2e'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#eee',
                        font: { size: 14 },
                        padding: 15
                    }
                }
            }
        }
    });
}

function createGamesOverTimeChart(games) {
    // Group games by month
    const gamesByMonth = {};

    games.forEach(game => {
        const date = new Date(game.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!gamesByMonth[monthKey]) {
            gamesByMonth[monthKey] = { wins: 0, losses: 0 };
        }

        if (game.won) {
            gamesByMonth[monthKey].wins++;
        } else {
            gamesByMonth[monthKey].losses++;
        }
    });

    const sortedMonths = Object.keys(gamesByMonth).sort();
    const wins = sortedMonths.map(month => gamesByMonth[month].wins);
    const losses = sortedMonths.map(month => gamesByMonth[month].losses);
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(year, parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    const ctx = document.getElementById('gamesOverTimeChart').getContext('2d');
    chartInstances.gamesOverTime = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Wins',
                    data: wins,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Losses',
                    data: losses,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#eee',
                        font: { size: 14 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#eee',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(238, 238, 238, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#eee'
                    },
                    grid: {
                        color: 'rgba(238, 238, 238, 0.1)'
                    }
                }
            }
        }
    });
}

function createDeckPerformanceChart(deckStats) {
    const decks = Object.values(deckStats);
    const labels = decks.map(d => d.deck.name);
    const wins = decks.map(d => d.wins);
    const losses = decks.map(d => d.losses);

    const ctx = document.getElementById('deckPerformanceChart').getContext('2d');
    chartInstances.deckPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Wins',
                    data: wins,
                    backgroundColor: '#27ae60',
                    borderColor: '#1a1a2e',
                    borderWidth: 1
                },
                {
                    label: 'Losses',
                    data: losses,
                    backgroundColor: '#e74c3c',
                    borderColor: '#1a1a2e',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#eee',
                        font: { size: 14 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#eee',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(238, 238, 238, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#eee'
                    },
                    grid: {
                        color: 'rgba(238, 238, 238, 0.1)'
                    }
                }
            }
        }
    });
}

function createColorWinsChart(colorStats, colorIdentityMap) {
    const sortedColors = Object.entries(colorStats).sort((a, b) => b[1] - a[1]);
    const labels = sortedColors.map(([color]) => colorIdentityMap[color] || color);
    const data = sortedColors.map(([, wins]) => wins);

    // Generate colors for the bars
    const backgroundColors = sortedColors.map(() => {
        return '#f39c12';
    });

    const ctx = document.getElementById('colorWinsChart').getContext('2d');
    chartInstances.colorWins = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Games Won',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#1a1a2e',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#eee',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(238, 238, 238, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#eee',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(238, 238, 238, 0.1)'
                    }
                }
            }
        }
    });
}

// Year filter change handler
document.getElementById('year-filter').addEventListener('change', (e) => {
    selectedYear = e.target.value;
    calculateAndDisplayStats();
});

// Load statistics when switching to statistics tab
document.querySelector('[data-tab="statistics"]').addEventListener('click', () => {
    loadStatistics();
});
// Calculate win/loss streaks
function calculateStreaks(games) {
    if (games.length === 0) {
        document.getElementById('current-streak').textContent = '-';
        document.getElementById('best-streak').textContent = '-';
        return;
    }

    // Sort games by date (oldest first for streak calculation)
    const sortedGames = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));

    let currentStreak = 0;
    let currentStreakType = null;
    let bestWinStreak = 0;
    let bestLossStreak = 0;

    let tempStreak = 0;
    let tempType = null;

    sortedGames.forEach((game, index) => {
        const isWin = game.won;

        if (index === 0) {
            tempStreak = 1;
            tempType = isWin ? 'win' : 'loss';
        } else {
            if ((isWin && tempType === 'win') || (!isWin && tempType === 'loss')) {
                tempStreak++;
            } else {
                // Streak broken
                if (tempType === 'win' && tempStreak > bestWinStreak) {
                    bestWinStreak = tempStreak;
                } else if (tempType === 'loss' && tempStreak > bestLossStreak) {
                    bestLossStreak = tempStreak;
                }

                tempStreak = 1;
                tempType = isWin ? 'win' : 'loss';
            }
        }

        // If last game, update current streak
        if (index === sortedGames.length - 1) {
            currentStreak = tempStreak;
            currentStreakType = tempType;

            // Also check if this is the best streak
            if (tempType === 'win' && tempStreak > bestWinStreak) {
                bestWinStreak = tempStreak;
            } else if (tempType === 'loss' && tempStreak > bestLossStreak) {
                bestLossStreak = tempStreak;
            }
        }
    });

    // Display current streak
    const streakCard = document.getElementById('streak-card');
    const streakElement = document.getElementById('current-streak');

    if (currentStreakType === 'win') {
        streakElement.innerHTML = `${currentStreak}W`;
        streakElement.style.color = '#00b894';
        streakCard.style.borderLeftColor = '#00b894';
    } else {
        streakElement.innerHTML = `${currentStreak}L`;
        streakElement.style.color = '#ff6b6b';
        streakCard.style.borderLeftColor = '#ff6b6b';
    }

    // Display best streak
    const bestStreak = Math.max(bestWinStreak, bestLossStreak);
    const bestStreakType = bestWinStreak >= bestLossStreak ? 'W' : 'L';
    const bestStreakColor = bestWinStreak >= bestLossStreak ? '#00b894' : '#ff6b6b';

    document.getElementById('best-streak').innerHTML = `${bestStreak}${bestStreakType}`;
    document.getElementById('best-streak').style.color = bestStreakColor;
}

// Calculate most faced commanders
async function calculateMostFacedCommanders(games) {
    const commanderCounts = {};

    games.forEach(game => {
        if (game.opponents && game.opponents.length > 0) {
            game.opponents.forEach(opponent => {
                const commanderName = opponent.name;
                if (!commanderCounts[commanderName]) {
                    commanderCounts[commanderName] = {
                        name: commanderName,
                        count: 0,
                        colorIdentity: opponent.colorIdentity || []
                    };
                }
                commanderCounts[commanderName].count++;
            });
        }
    });

    // Sort by count and get top 3
    const topCommanders = Object.values(commanderCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    const container = document.getElementById('most-faced-commanders');

    if (topCommanders.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><p style="color: #888;">No opponents logged yet</p></div>';
        return;
    }

    // Helper function to get mana symbols
    function getColorSymbols(colorIdentity) {
        if (!colorIdentity || colorIdentity.length === 0) {
            return '<i class="ms ms-c mana"></i>';
        }

        const colorMap = {
            'W': 'w',
            'U': 'u',
            'B': 'b',
            'R': 'r',
            'G': 'g'
        };

        return colorIdentity.map(color => {
            return `<i class="ms ms-${colorMap[color]} mana"></i>`;
        }).join('');
    }

    // Create cards for top 3
    const cardsHtml = await Promise.all(topCommanders.map(async (commander, index) => {
        const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        const medal = ['🥇', '🥈', '🥉'][index];
        const colorSymbols = getColorSymbols(commander.colorIdentity);

        // Get commander image
        const imageUrl = await getCommanderImage(commander.name);
        const imageHtml = imageUrl
            ? `<img src="${imageUrl}" style="width: 120px; height: 120px; border-radius: 12px; object-fit: cover; border: 3px solid ${medalColors[index]}; margin-bottom: 12px;" alt="${commander.name}">`
            : `<div style="width: 120px; height: 120px; border-radius: 12px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 179, 71, 0.2)); display: flex; align-items: center; justify-content: center; font-size: 48px; border: 3px solid ${medalColors[index]}; margin-bottom: 12px;">🎴</div>`;

        return `
            <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%); 
                        padding: 20px; 
                        border-radius: 12px; 
                        border-left: 4px solid ${medalColors[index]};
                        text-align: center;">
                <div style="font-size: 2.5em; margin-bottom: 10px;">${medal}</div>
                ${imageHtml}
                <div style="font-size: 1.1em; font-weight: 600; margin-bottom: 8px;">${commander.name}</div>
                <div class="mana-cost" style="justify-content: center; margin-bottom: 10px;">${colorSymbols}</div>
                <div style="font-size: 1.8em; font-weight: 700; color: ${medalColors[index]};">${commander.count}</div>
                <div style="font-size: 0.9em; color: #888;">games faced</div>
            </div>
        `;
    }));

    container.innerHTML = cardsHtml.join('');

    // If less than 3, fill remaining slots
    while (topCommanders.length < 3) {
        container.innerHTML += `
            <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%); 
                        padding: 20px; 
                        border-radius: 12px; 
                        text-align: center;
                        opacity: 0.3;">
                <div style="font-size: 2.5em; margin-bottom: 10px;">-</div>
                <div style="font-size: 0.9em; color: #888;">Not enough data</div>
            </div>
        `;
        topCommanders.push(null);
    }
}
// Initialize app
init();