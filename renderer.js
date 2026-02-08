import { storage } from './storage-adapter.js';

let commanders = [];
let myDecks = [];
let selectedCommander = null;
let showArchivedDecks = false;
let podBuddies = [];

// Login Screen Management (PWA only)
async function initLoginScreen() {
    // Skip for Electron desktop app
    if (window.process) {
        return;
    }

    const loginScreen = document.getElementById('login-screen');
    if (!loginScreen) return;

    const loginForm = document.getElementById('login-form');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const loginError = document.getElementById('login-error');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const loginTabs = document.querySelectorAll('.login-tab');

    let isRegisterMode = false;

    // Wait for storage to be ready before checking Firebase
    await storage.ready();

    // Check if Firebase is available
    if (!storage.isFirebaseAvailable()) {
        loginScreen.style.display = 'none';
        return;
    }

    // Show login screen initially (will be hidden by auth listener if already signed in)
    loginScreen.style.display = 'flex';

    // Helper: Firebase error messages
    function getAuthErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Email already in use',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password must be at least 6 characters',
            'auth/user-not-found': 'No account with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many attempts. Try again later.',
            'auth/invalid-credential': 'Invalid email or password'
        };
        return messages[code] || 'Authentication failed. Please try again.';
    }

    // Listen for auth state - hide login screen when signed in
    storage.onAuthStateChange((user) => {
        if (user) {
            loginScreen.style.display = 'none';
        } else {
            loginScreen.style.display = 'flex';
        }
    });

    // Tab switching
    loginTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            loginTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            isRegisterMode = tab.dataset.tab === 'register';
            loginSubmitBtn.textContent = isRegisterMode ? 'Create Account' : 'Login';
            loginError.textContent = '';
            loginError.classList.remove('success');
        });
    });

    // Toggle password visibility
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            loginPassword.type = loginPassword.type === 'password' ? 'text' : 'password';
        });
    }

    // Form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        loginError.textContent = '';
        loginError.classList.remove('success');
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = isRegisterMode ? 'Creating...' : 'Logging in...';

        try {
            if (isRegisterMode) {
                await storage.createAccountWithEmail(email, password);
            } else {
                await storage.signInWithEmailPassword(email, password);
            }
            // Reload page to fetch user data
            window.location.reload();
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = getAuthErrorMessage(error.code);
        } finally {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = isRegisterMode ? 'Create Account' : 'Login';
        }
    });

    // Google sign in
    googleLoginBtn.addEventListener('click', async () => {
        loginError.textContent = '';
        googleLoginBtn.disabled = true;
        googleLoginBtn.textContent = 'Signing in...';

        try {
            await storage.signInWithGoogle();
            // Reload page to fetch user data
            window.location.reload();
        } catch (error) {
            console.error('Google sign in error:', error);
            loginError.textContent = 'Google sign in failed. Please try again.';
        } finally {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
            `;
        }
    });

    // Forgot password
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = loginEmail.value.trim();
        if (!email) {
            loginError.classList.remove('success');
            loginError.textContent = 'Enter your email first';
            return;
        }
        try {
            await storage.sendPasswordReset(email);
            loginError.classList.add('success');
            loginError.textContent = 'Password reset email sent!';
        } catch (error) {
            loginError.classList.remove('success');
            loginError.textContent = getAuthErrorMessage(error.code);
        }
    });
}

// Initialize login screen on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initLoginScreen();
});

// Pod Buddies Management
function loadPodBuddies() {
    const saved = localStorage.getItem('podBuddies');
    podBuddies = saved ? JSON.parse(saved) : [];
    return podBuddies;
}

function savePodBuddies() {
    localStorage.setItem('podBuddies', JSON.stringify(podBuddies));
}

function addPodBuddy(name) {
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    if (podBuddies.some(b => b.toLowerCase() === trimmedName.toLowerCase())) {
        return false; // Already exists
    }
    podBuddies.push(trimmedName);
    savePodBuddies();
    return true;
}

function removePodBuddy(name) {
    podBuddies = podBuddies.filter(b => b !== name);
    savePodBuddies();
}

function renderBuddiesList() {
    const container = document.getElementById('buddies-list');
    if (podBuddies.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No buddies added yet</p>';
        return;
    }

    container.innerHTML = podBuddies.map(buddy => {
        const safeBuddy = escapeHtml(buddy);
        return `
        <div class="buddy-item">
            <span class="buddy-name">${safeBuddy}</span>
            <button type="button" class="delete-buddy-btn" data-buddy="${safeBuddy}">✕ Remove</button>
        </div>
    `;
    }).join('');

    // Add delete handlers
    container.querySelectorAll('.delete-buddy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const buddyName = e.target.dataset.buddy;
            removePodBuddy(buddyName);
            renderBuddiesList();
            populateBuddyFilter();
        });
    });
}

function renderBuddySelectList() {
    const container = document.getElementById('buddy-select-list');
    if (podBuddies.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No buddies available. Add some in Pod Buddies first!</p>';
        return;
    }

    container.innerHTML = podBuddies.map(buddy => `
        <div class="buddy-select-item" data-buddy="${buddy}">
            <span class="buddy-name">${buddy}</span>
            <span style="color: var(--accent);">→</span>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.buddy-select-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const buddyName = e.currentTarget.dataset.buddy;
            addOpponentFieldWithBuddy(buddyName);
            closeBuddySelectModal();
        });
    });
}

// Pod Buddies Tab - Online Friends Management
let userProfile = null;
let onlineFriends = [];

async function initUserProfile() {
    if (!storage.isSignedIn()) {
        userProfile = null;
        return;
    }

    try {
        // Initialize profile (creates Friend ID if needed)
        userProfile = await storage.initUserProfile();
        console.log('User profile loaded:', userProfile);
    } catch (error) {
        console.error('Error initializing user profile:', error);
    }
}

async function initPodBuddiesTab() {
    // Load user profile
    if (!userProfile && storage.isSignedIn()) {
        await initUserProfile();
    }

    // Update profile display
    updateProfileDisplay();

    // Load and display online friends
    await loadOnlineFriends();

    // Load and display offline buddies
    loadPodBuddies();
    renderOfflineBuddiesList();
}

function updateProfileDisplay() {
    const friendIdEl = document.getElementById('your-friend-id');
    const usernameInput = document.getElementById('profile-username');

    if (!storage.isSignedIn() || !userProfile) {
        friendIdEl.textContent = 'Sign in to get your Friend ID';
        friendIdEl.style.fontSize = '14px';
        usernameInput.value = '';
        usernameInput.disabled = true;
        document.getElementById('save-username-btn').disabled = true;
        document.getElementById('copy-friend-id-btn').disabled = true;
        document.getElementById('add-online-friend-btn').disabled = true;
        return;
    }

    friendIdEl.textContent = userProfile.friendId || 'Loading...';
    friendIdEl.style.fontSize = '';
    usernameInput.value = userProfile.username || '';
    usernameInput.disabled = false;
    document.getElementById('save-username-btn').disabled = false;
    document.getElementById('copy-friend-id-btn').disabled = false;
    document.getElementById('add-online-friend-btn').disabled = false;
}

async function loadOnlineFriends() {
    if (!storage.isSignedIn()) {
        onlineFriends = [];
        renderOnlineFriendsList();
        return;
    }

    try {
        onlineFriends = await storage.getOnlineFriends();
        renderOnlineFriendsList();
    } catch (error) {
        console.error('Error loading online friends:', error);
        onlineFriends = [];
        renderOnlineFriendsList();
    }
}

function renderOnlineFriendsList() {
    const container = document.getElementById('online-friends-list');
    if (!container) return;

    if (!storage.isSignedIn()) {
        container.innerHTML = '<p class="empty-list-message">Sign in to connect with friends online</p>';
        return;
    }

    if (onlineFriends.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No online friends yet. Share your Friend ID with friends to connect!</p>';
        return;
    }

    container.innerHTML = onlineFriends.map(friend => `
        <div class="friend-item" data-friend-id="${friend.friendId}">
            <div class="friend-info">
                <span class="friend-username">${escapeHtml(friend.username)}</span>
                <span class="friend-id-small">${friend.friendId}</span>
            </div>
            <div class="friend-actions">
                <button type="button" class="view-stats-btn" data-friend-id="${friend.friendId}">View Stats</button>
                <button type="button" class="remove-friend-btn" data-friend-id="${friend.friendId}">Remove</button>
            </div>
        </div>
    `).join('');

    // Add event handlers
    container.querySelectorAll('.view-stats-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const friendId = e.target.dataset.friendId;
            showFriendStats(friendId);
        });
    });

    container.querySelectorAll('.remove-friend-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const friendId = e.target.dataset.friendId;
            const friend = onlineFriends.find(f => f.friendId === friendId);
            const confirmed = await showConfirmModal(
                'Remove Friend',
                `Are you sure you want to remove ${friend?.username || friendId} from your friends?`,
                'Remove'
            );
            if (confirmed) {
                await removeOnlineFriend(friendId);
            }
        });
    });
}

function renderOfflineBuddiesList() {
    const container = document.getElementById('offline-buddies-list');
    if (!container) return;

    if (podBuddies.length === 0) {
        container.innerHTML = '<p class="empty-list-message">No buddies added yet</p>';
        return;
    }

    container.innerHTML = podBuddies.map(buddy => `
        <div class="buddy-item">
            <span class="buddy-name">${escapeHtml(buddy)}</span>
            <button type="button" class="delete-buddy-btn" data-buddy="${escapeHtml(buddy)}">Remove</button>
        </div>
    `).join('');

    // Add delete handlers
    container.querySelectorAll('.delete-buddy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const buddyName = e.target.dataset.buddy;
            removePodBuddy(buddyName);
            renderOfflineBuddiesList();
            populateBuddyFilter();
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function removeOnlineFriend(friendId) {
    try {
        await storage.removeFriend(friendId);
        await loadOnlineFriends();
    } catch (error) {
        console.error('Error removing friend:', error);
        alert('Failed to remove friend. Please try again.');
    }
}

async function showFriendStats(friendId) {
    const modal = document.getElementById('friend-stats-modal');
    const usernameEl = document.getElementById('friend-stats-username');
    const idEl = document.getElementById('friend-stats-id');

    // Show loading state
    usernameEl.textContent = 'Loading...';
    idEl.textContent = friendId;
    document.getElementById('friend-total-games').textContent = '-';
    document.getElementById('friend-wins').textContent = '-';
    document.getElementById('friend-win-rate').textContent = '-';
    document.getElementById('friend-active-decks').textContent = '-';
    document.getElementById('friend-decks-list').innerHTML = '<p class="empty-list-message">Loading...</p>';
    document.getElementById('friend-games-list').innerHTML = '<p class="empty-list-message">Loading...</p>';

    modal.style.display = 'flex';

    try {
        const friendData = await storage.getFriendPublicData(friendId);

        usernameEl.textContent = friendData.username;

        // Calculate stats
        const games = friendData.games || [];
        const decks = friendData.decks || [];
        const totalGames = games.length;
        const wins = games.filter(g => g.won).length;
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
        const activeDecks = decks.filter(d => !d.archived).length;

        document.getElementById('friend-total-games').textContent = totalGames;
        document.getElementById('friend-wins').textContent = wins;
        document.getElementById('friend-win-rate').textContent = winRate + '%';
        document.getElementById('friend-active-decks').textContent = activeDecks;

        // Render decks list
        const decksContainer = document.getElementById('friend-decks-list');
        if (decks.length === 0) {
            decksContainer.innerHTML = '<p class="empty-list-message">No decks</p>';
        } else {
            decksContainer.innerHTML = decks.slice(0, 10).map(deck => `
                <div class="friend-deck-item">
                    <div>
                        <div class="friend-deck-name">${escapeHtml(deck.name)}</div>
                        <div class="friend-deck-commander">${escapeHtml(deck.commander?.name || 'Unknown')}</div>
                    </div>
                    ${deck.archived ? '<span style="color: var(--text-muted); font-size: 11px;">Archived</span>' : ''}
                </div>
            `).join('');
        }

        // Render recent games list (last 10)
        const gamesContainer = document.getElementById('friend-games-list');
        if (games.length === 0) {
            gamesContainer.innerHTML = '<p class="empty-list-message">No games logged</p>';
        } else {
            const recentGames = games.slice(-10).reverse();
            gamesContainer.innerHTML = recentGames.map(game => `
                <div class="friend-game-item">
                    <div>
                        <div class="friend-deck-name">${escapeHtml(game.myDeck?.name || 'Unknown Deck')}</div>
                        <div class="friend-game-date">${game.date || 'No date'}</div>
                    </div>
                    <span class="friend-game-result ${game.won ? 'win' : 'loss'}">${game.won ? 'Win' : 'Loss'}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading friend stats:', error);
        usernameEl.textContent = 'Error loading data';
        document.getElementById('friend-decks-list').innerHTML = '<p class="empty-list-message">Failed to load</p>';
        document.getElementById('friend-games-list').innerHTML = '<p class="empty-list-message">Failed to load</p>';
    }
}

// Copy Friend ID to clipboard
document.getElementById('copy-friend-id-btn')?.addEventListener('click', async () => {
    const friendId = document.getElementById('your-friend-id').textContent;
    if (!friendId || friendId === 'Loading...' || friendId.includes('Sign in')) return;

    try {
        await navigator.clipboard.writeText(friendId);
        const btn = document.getElementById('copy-friend-id-btn');
        btn.classList.add('copied');
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
    }
});

// Save username
document.getElementById('save-username-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('profile-username');
    const btn = document.getElementById('save-username-btn');
    const newUsername = input.value.trim();

    if (!newUsername) {
        alert('Please enter a username');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        await storage.updateUsername(newUsername);
        userProfile.username = newUsername;
        btn.textContent = 'Saved!';
        setTimeout(() => {
            btn.textContent = 'Save';
            btn.disabled = false;
        }, 1500);
    } catch (error) {
        console.error('Error saving username:', error);
        alert(error.message || 'Failed to save username');
        btn.textContent = 'Save';
        btn.disabled = false;
    }
});

// Add Online Friend Modal
document.getElementById('add-online-friend-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('add-friend-modal');
    const input = document.getElementById('add-friend-id-input');
    const error = document.getElementById('add-friend-error');
    input.value = '';
    error.style.display = 'none';
    modal.style.display = 'flex';
    input.focus();
});

document.getElementById('add-friend-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('add-friend-modal').style.display = 'none';
});

document.getElementById('add-friend-confirm-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('add-friend-id-input');
    const error = document.getElementById('add-friend-error');
    const btn = document.getElementById('add-friend-confirm-btn');
    const friendId = input.value.trim().toUpperCase();

    error.style.display = 'none';

    if (friendId.length !== 8) {
        error.textContent = 'Friend ID must be 8 characters';
        error.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
        await storage.addFriendByFriendId(friendId);
        document.getElementById('add-friend-modal').style.display = 'none';
        await loadOnlineFriends();
    } catch (err) {
        error.textContent = err.message || 'Failed to add friend';
        error.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Friend';
    }
});

// Close add friend modal on overlay click
document.getElementById('add-friend-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-friend-modal') {
        document.getElementById('add-friend-modal').style.display = 'none';
    }
});

// Close friend stats modal
document.getElementById('friend-stats-close')?.addEventListener('click', () => {
    document.getElementById('friend-stats-modal').style.display = 'none';
});

document.getElementById('friend-stats-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'friend-stats-modal') {
        document.getElementById('friend-stats-modal').style.display = 'none';
    }
});

// Add Offline Buddy Modal
document.getElementById('add-offline-buddy-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('add-offline-buddy-modal');
    const input = document.getElementById('offline-buddy-name-input');
    const error = document.getElementById('add-offline-buddy-error');
    input.value = '';
    error.style.display = 'none';
    modal.style.display = 'flex';
    input.focus();
});

document.getElementById('add-offline-buddy-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('add-offline-buddy-modal').style.display = 'none';
});

document.getElementById('add-offline-buddy-confirm-btn')?.addEventListener('click', () => {
    const input = document.getElementById('offline-buddy-name-input');
    const error = document.getElementById('add-offline-buddy-error');
    const name = input.value.trim();

    error.style.display = 'none';

    if (!name) {
        error.textContent = 'Please enter a name';
        error.style.display = 'block';
        return;
    }

    if (addPodBuddy(name)) {
        document.getElementById('add-offline-buddy-modal').style.display = 'none';
        renderOfflineBuddiesList();
        populateBuddyFilter();
    } else {
        error.textContent = 'Buddy already exists';
        error.style.display = 'block';
    }
});

document.getElementById('add-offline-buddy-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-offline-buddy-modal') {
        document.getElementById('add-offline-buddy-modal').style.display = 'none';
    }
});

// Initialize Pod Buddies tab when switching to it
document.querySelector('.sidebar-nav-item[data-tab="pod-buddies"]')?.addEventListener('click', () => {
    initPodBuddiesTab();
});

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'true-dark';
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
    const signOutBtn = document.getElementById('sign-out-btn');
    const userAvatar = document.getElementById('user-avatar');
    const userEmail = document.getElementById('user-email');
    const syncStatus = document.getElementById('sync-status');

    // Google sign-in elements
    const googleSignInBtn = document.getElementById('google-sign-in-btn');
    const signInOptions = document.getElementById('sign-in-options');

    // Email sign-in elements
    const emailToggleBtn = document.getElementById('email-sign-in-toggle');
    const emailFormContainer = document.getElementById('email-form-container');
    const emailForm = document.getElementById('email-auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const emailSubmitBtn = document.getElementById('email-submit-btn');
    const authToggleMode = document.getElementById('auth-toggle-mode');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const authBackBtn = document.getElementById('auth-back-btn');
    const authError = document.getElementById('auth-error');

    let isCreateMode = false;

    // Only show cloud sync in PWA mode
    if (!storage.isFirebaseAvailable()) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    // Helper: Convert Firebase error codes to user-friendly messages
    function getAuthErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Email already in use',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password must be at least 6 characters',
            'auth/user-not-found': 'No account with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many attempts. Try again later.',
            'auth/invalid-credential': 'Invalid email or password'
        };
        return messages[code] || 'Sign in failed. Please try again.';
    }

    // Update UI based on auth state
    async function updateAuthUI(user) {
        if (user) {
            signInContainer.style.display = 'none';
            userContainer.style.display = 'flex';
            userAvatar.src = user.photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 4v2h16v-2c0-1-2-4-8-4z"/></svg>';
            if (syncStatus) {
                syncStatus.textContent = 'Synced';
                syncStatus.classList.remove('syncing');
            }

            // Initialize user profile (creates Friend ID if needed)
            await initUserProfile();

            // Show username instead of email
            const displayName = userProfile?.username || user.email.split('@')[0];
            userEmail.textContent = displayName;

            // Reload data after sign in
            reloadData();
        } else {
            signInContainer.style.display = 'block';
            userContainer.style.display = 'none';
            // Reset to sign-in options view
            signInOptions.style.display = 'flex';
            emailFormContainer.style.display = 'none';
            // Clear user profile
            userProfile = null;
            onlineFriends = [];
        }
    }

    // Listen for auth state changes
    storage.onAuthStateChange(updateAuthUI);

    // Google sign in button
    googleSignInBtn.addEventListener('click', async () => {
        try {
            googleSignInBtn.disabled = true;
            googleSignInBtn.textContent = 'Signing in...';
            await storage.signInWithGoogle();
            window.location.reload();
        } catch (error) {
            console.error('Sign in error:', error);
            alert('Sign in failed. Please try again.');
        } finally {
            googleSignInBtn.disabled = false;
            googleSignInBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
            `;
        }
    });

    // Show email form
    emailToggleBtn.addEventListener('click', () => {
        signInOptions.style.display = 'none';
        emailFormContainer.style.display = 'block';
        authError.textContent = '';
        authError.style.color = 'var(--danger)';
    });

    // Back button
    authBackBtn.addEventListener('click', () => {
        emailFormContainer.style.display = 'none';
        signInOptions.style.display = 'flex';
        authError.textContent = '';
        isCreateMode = false;
        emailSubmitBtn.textContent = 'Sign In';
        authToggleMode.textContent = 'Create Account';
    });

    // Toggle between sign in and create account
    authToggleMode.addEventListener('click', () => {
        isCreateMode = !isCreateMode;
        emailSubmitBtn.textContent = isCreateMode ? 'Create Account' : 'Sign In';
        authToggleMode.textContent = isCreateMode ? 'Sign In Instead' : 'Create Account';
        authError.textContent = '';
        authError.style.color = 'var(--danger)';
    });

    // Handle email form submission
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmail.value.trim();
        const password = authPassword.value;

        authError.textContent = '';
        authError.style.color = 'var(--danger)';
        emailSubmitBtn.disabled = true;
        emailSubmitBtn.textContent = isCreateMode ? 'Creating...' : 'Signing in...';

        try {
            if (isCreateMode) {
                await storage.createAccountWithEmail(email, password);
            } else {
                await storage.signInWithEmailPassword(email, password);
            }
            window.location.reload();
        } catch (error) {
            console.error('Email auth error:', error);
            authError.textContent = getAuthErrorMessage(error.code);
        } finally {
            emailSubmitBtn.disabled = false;
            emailSubmitBtn.textContent = isCreateMode ? 'Create Account' : 'Sign In';
        }
    });

    // Forgot password
    forgotPasswordBtn.addEventListener('click', async () => {
        const email = authEmail.value.trim();
        if (!email) {
            authError.style.color = 'var(--danger)';
            authError.textContent = 'Enter your email first';
            return;
        }
        try {
            await storage.sendPasswordReset(email);
            authError.style.color = 'var(--success)';
            authError.textContent = 'Password reset email sent!';
        } catch (error) {
            console.error('Password reset error:', error);
            authError.style.color = 'var(--danger)';
            authError.textContent = getAuthErrorMessage(error.code);
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
        // Extract deck ID from URL or raw ID
        // Supports: full URL, short URL, or just the deck ID
        let deckId;
        if (deckUrl.includes('/decks/')) {
            deckId = deckUrl.split('/decks/')[1]?.split('?')[0]?.split('#')[0]?.split('/')[0];
        } else {
            // Assume raw deck ID was entered
            deckId = deckUrl.trim().split('?')[0].split('#')[0].split('/').pop();
        }

        if (!deckId) {
            throw new Error('Invalid Moxfield URL. Please use a URL like: https://www.moxfield.com/decks/DECK_ID');
        }

        const apiUrl = `https://api2.moxfield.com/v2/decks/all/${deckId}`;

        let data;

        // Try direct fetch first (works in Electron), then CORS proxies
        try {
            const directResponse = await fetch(apiUrl);
            if (directResponse.ok) {
                data = await directResponse.json();
            } else {
                throw new Error(`HTTP ${directResponse.status}`);
            }
        } catch (directError) {
            console.log('Direct Moxfield fetch failed, trying CORS proxies...');

            // Try multiple CORS proxies in order
            const proxies = [
                `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`,
                `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`,
            ];

            let proxySuccess = false;
            for (const proxyUrl of proxies) {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 15000);

                    const proxyResponse = await fetch(proxyUrl, { signal: controller.signal });
                    clearTimeout(timeout);

                    if (!proxyResponse.ok) continue;

                    const contentType = proxyResponse.headers.get('content-type') || '';

                    if (proxyUrl.includes('allorigins.win')) {
                        // allorigins wraps response in {contents: "..."}
                        const wrapper = await proxyResponse.json();
                        data = JSON.parse(wrapper.contents);
                    } else {
                        data = await proxyResponse.json();
                    }

                    proxySuccess = true;
                    break;
                } catch (proxyError) {
                    console.log(`Proxy failed: ${proxyUrl}`, proxyError.message);
                    continue;
                }
            }

            if (!proxySuccess) {
                throw new Error('Unable to fetch deck from Moxfield. Make sure the deck is public and try again later.');
            }
        }

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
// Sidebar Toggle
function initSidebar() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function closeSidebar() {
        hamburgerBtn?.classList.remove('active');
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
    }

    hamburgerBtn?.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay?.addEventListener('click', closeSidebar);

    // Close sidebar when clicking a nav item on mobile
    document.querySelectorAll('.sidebar-nav-item').forEach(navItem => {
        navItem.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

// Initialize sidebar on load
document.addEventListener('DOMContentLoaded', initSidebar);

// Tab switching (works with sidebar nav items)
document.querySelectorAll('.sidebar-nav-item').forEach(navItem => {
    navItem.addEventListener('click', () => {
        const tabName = navItem.dataset.tab;

        // Update active nav item
        document.querySelectorAll('.sidebar-nav-item').forEach(t => t.classList.remove('active'));
        navItem.classList.add('active');

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

// Add Deck Modal handlers
function initAddDeckModal() {
    const addDeckBtn = document.getElementById('add-deck-btn');
    const modal = document.getElementById('add-deck-modal');
    const closeBtn = document.getElementById('add-deck-modal-close');
    const cancelBtn = document.getElementById('add-deck-cancel');

    function openModal() {
        modal.style.display = 'flex';
        document.getElementById('deck-name').focus();
    }

    function closeModal() {
        modal.style.display = 'none';
        document.getElementById('add-deck-form').reset();
        selectedCommander = null;
        commanderResults.classList.remove('show');
    }

    addDeckBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Close on overlay click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.style.display === 'flex') {
            closeModal();
        }
    });
}

// Initialize Add Deck Modal
document.addEventListener('DOMContentLoaded', initAddDeckModal);

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

    // Close the modal
    document.getElementById('add-deck-modal').style.display = 'none';

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
        deckList.innerHTML = '<p style="color: var(--text-muted);">No decks added yet. Click "+ Add Deck" to get started!</p>';
        return;
    }

    // Filter decks based on showArchivedDecks toggle
    const decksToShow = showArchivedDecks ? myDecks : activeDecks;

    // Build controls row with toggle and organize button
    const toggleHtml = archivedDecks.length > 0 ? `
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); text-transform: none; font-size: 14px;">
            <input type="checkbox" id="show-archived-toggle" ${showArchivedDecks ? 'checked' : ''}
                   style="width: 18px; height: 18px; cursor: pointer;">
            Show retired decks (${archivedDecks.length})
        </label>
    ` : '';

    const organizeBtn = myDecks.length > 1 ? `<button id="organize-library-btn" class="secondary" style="padding: 8px 16px; font-size: 14px;">Organize Library</button>` : '';

    const controlsHtml = (toggleHtml || organizeBtn) ? `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            ${toggleHtml}
            ${organizeBtn}
        </div>
    ` : '';

    deckList.innerHTML = controlsHtml + '<p>Loading deck images...</p>';

    // Re-attach toggle listener
    const toggleEl = document.getElementById('show-archived-toggle');
    if (toggleEl) {
        toggleEl.addEventListener('change', (e) => {
            showArchivedDecks = e.target.checked;
            displayDecks();
        });
    }

    if (decksToShow.length === 0) {
        deckList.innerHTML = controlsHtml + '<p style="color: var(--text-muted);">No active decks. Check "Show retired decks" to see archived commanders.</p>';
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
        const decklistButtonText = hasDecklist ? 'Decklist' : 'Moxfield';
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

    // Rebuild controls HTML for final render
    const finalToggleHtml = archivedDecks.length > 0 ? `
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); text-transform: none; font-size: 14px;">
            <input type="checkbox" id="show-archived-toggle" ${showArchivedDecks ? 'checked' : ''}
                   style="width: 18px; height: 18px; cursor: pointer;">
            Show retired decks (${archivedDecks.length})
        </label>
    ` : '';

    const finalOrganizeBtn = myDecks.length > 1 ? `<button id="organize-library-btn" class="secondary" style="padding: 8px 16px; font-size: 14px;">Organize Library</button>` : '';

    const finalControlsHtml = (finalToggleHtml || finalOrganizeBtn) ? `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            ${finalToggleHtml}
            ${finalOrganizeBtn}
        </div>
    ` : '';

    deckList.innerHTML = finalControlsHtml + `<div class="deck-grid">${decksHtml.join('')}</div>`;

    // Re-attach toggle listener after final render
    const finalToggleEl = document.getElementById('show-archived-toggle');
    if (finalToggleEl) {
        finalToggleEl.addEventListener('change', (e) => {
            showArchivedDecks = e.target.checked;
            displayDecks();
        });
    }

    // Attach organize library button listener
    const organizeBtnEl = document.getElementById('organize-library-btn');
    if (organizeBtnEl) {
        organizeBtnEl.addEventListener('click', openOrganizeLibraryModal);
    }
}

// Organize Library Modal
let tempDeckOrder = [];

function openOrganizeLibraryModal() {
    const modal = document.getElementById('organize-library-modal');
    const listContainer = document.getElementById('organize-decks-list');

    // Create a copy of deck order for editing
    tempDeckOrder = [...myDecks];

    renderOrganizeList();
    modal.style.display = 'flex';
}

function renderOrganizeList() {
    const listContainer = document.getElementById('organize-decks-list');

    listContainer.innerHTML = tempDeckOrder.map((deck, index) => {
        const isFirst = index === 0;
        const isLast = index === tempDeckOrder.length - 1;
        const archivedBadge = deck.archived ? '<span style="color: var(--text-muted); font-size: 12px; margin-left: 8px;">(Retired)</span>' : '';
        const safeDeckName = escapeHtml(deck.name);
        const safeCommanderName = escapeHtml(deck.commander.name);

        return `
            <div class="organize-deck-item" data-index="${index}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin-bottom: 8px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeDeckName}${archivedBadge}</div>
                    <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeCommanderName}</div>
                </div>
                <div style="display: flex; gap: 4px; margin-left: 10px;">
                    <button onclick="moveDeckUp(${index})" ${isFirst ? 'disabled' : ''} style="padding: 6px 10px; font-size: 16px; ${isFirst ? 'opacity: 0.3; cursor: not-allowed;' : ''}">&#9650;</button>
                    <button onclick="moveDeckDown(${index})" ${isLast ? 'disabled' : ''} style="padding: 6px 10px; font-size: 16px; ${isLast ? 'opacity: 0.3; cursor: not-allowed;' : ''}">&#9660;</button>
                </div>
            </div>
        `;
    }).join('');
}

window.moveDeckUp = function(index) {
    if (index <= 0) return;
    const temp = tempDeckOrder[index];
    tempDeckOrder[index] = tempDeckOrder[index - 1];
    tempDeckOrder[index - 1] = temp;
    renderOrganizeList();
};

window.moveDeckDown = function(index) {
    if (index >= tempDeckOrder.length - 1) return;
    const temp = tempDeckOrder[index];
    tempDeckOrder[index] = tempDeckOrder[index + 1];
    tempDeckOrder[index + 1] = temp;
    renderOrganizeList();
};

async function saveOrganizedDecks() {
    // Update myDecks with the new order
    myDecks = [...tempDeckOrder];

    // Save to storage - we need to save each deck's position
    // The simplest way is to update all decks
    for (let i = 0; i < myDecks.length; i++) {
        myDecks[i].sortOrder = i;
    }

    // Save the reordered decks array
    await storage.saveDecksOrder(myDecks);

    // Close modal and refresh display
    document.getElementById('organize-library-modal').style.display = 'none';
    displayDecks();
}

// Organize Library Modal Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('organize-library-modal');
    const saveBtn = document.getElementById('organize-library-save');
    const cancelBtn = document.getElementById('organize-library-cancel');

    saveBtn?.addEventListener('click', saveOrganizedDecks);

    cancelBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

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
        statusDiv.innerHTML = `<p style="color: var(--danger);">Error: ${escapeHtml(error.message)}</p>`;
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

// Detect if running as installed PWA
function isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

// Install Help Modal
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-help-btn');
    const installModal = document.getElementById('install-help-modal');
    const installClose = document.getElementById('install-modal-close');

    // Hide install button if running as installed PWA
    if (isRunningAsPWA() && installBtn) {
        installBtn.style.display = 'none';
    }

    if (installBtn && installModal) {
        installBtn.addEventListener('click', () => {
            installModal.style.display = 'flex';
        });
    }

    if (installClose && installModal) {
        installClose.addEventListener('click', () => {
            installModal.style.display = 'none';
        });
    }

    if (installModal) {
        installModal.addEventListener('click', (e) => {
            if (e.target === installModal) {
                installModal.style.display = 'none';
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
        statusDiv.innerHTML = `<p style="color: #ff6b6b;">Error: ${escapeHtml(error.message)}</p>`;
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

// Add opponent field with buddy name pre-attached
function addOpponentFieldWithBuddy(buddyName) {
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
    <label for="opponent-${opponentCount}-input">
        <span style="color: var(--accent); font-weight: bold;">${buddyName}'s</span> Commander
    </label>
    <div class="autocomplete-container">
      <input type="text"
             id="opponent-${opponentCount}-input"
             class="opponent-input"
             data-opponent="${opponentCount}"
             data-buddy="${buddyName}"
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

// Update add opponent/buddy button visibility
function updateAddOpponentButton() {
    const addButton = document.getElementById('add-opponent');
    const addBuddyBtn = document.getElementById('add-buddy-btn');
    if (opponentCount >= maxOpponents) {
        addButton.style.display = 'none';
        if (addBuddyBtn) addBuddyBtn.style.display = 'none';
    } else {
        addButton.style.display = 'inline-block';
        if (addBuddyBtn) addBuddyBtn.style.display = 'inline-block';
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

// Pod Buddies Modal Functions
function openPodBuddiesModal() {
    loadPodBuddies();
    renderBuddiesList();
    document.getElementById('pod-buddies-modal').style.display = 'flex';
    document.getElementById('new-buddy-name').value = '';
    document.getElementById('new-buddy-name').focus();
}

function closePodBuddiesModal() {
    document.getElementById('pod-buddies-modal').style.display = 'none';
}

function openBuddySelectModal() {
    loadPodBuddies();
    renderBuddySelectList();
    document.getElementById('add-buddy-modal').style.display = 'flex';
}

function closeBuddySelectModal() {
    document.getElementById('add-buddy-modal').style.display = 'none';
}

// Pod Buddies Event Listeners
document.getElementById('pod-buddies-close-btn').addEventListener('click', closePodBuddiesModal);

document.getElementById('pod-buddies-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closePodBuddiesModal();
    }
});

document.getElementById('add-new-buddy-btn').addEventListener('click', () => {
    const input = document.getElementById('new-buddy-name');
    const name = input.value.trim();
    if (name) {
        if (addPodBuddy(name)) {
            renderBuddiesList();
            populateBuddyFilter();
            input.value = '';
            input.focus();
        } else {
            alert('Buddy already exists or name is invalid');
        }
    }
});

document.getElementById('new-buddy-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('add-new-buddy-btn').click();
    }
});

// Add Buddy to Game Modal
document.getElementById('add-buddy-btn').addEventListener('click', () => {
    loadPodBuddies();
    if (podBuddies.length === 0) {
        alert('No Pod Buddies yet! Add some first using the Pod Buddies button.');
        return;
    }
    if (opponentCount >= maxOpponents) {
        alert('Maximum 5 opponents allowed');
        return;
    }
    openBuddySelectModal();
});

document.getElementById('add-buddy-cancel-btn').addEventListener('click', closeBuddySelectModal);

document.getElementById('add-buddy-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeBuddySelectModal();
    }
});

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

    // Collect opponents (including buddy name if present)
    const opponents = [];
    for (let i = 1; i <= opponentCount; i++) {
        const input = document.getElementById(`opponent-${i}-input`);
        if (input && input.dataset.selected) {
            const opponent = JSON.parse(input.dataset.selected);
            // Add buddy name if this opponent was added via Pod Buddy
            if (input.dataset.buddy) {
                opponent.buddyName = input.dataset.buddy;
            }
            opponents.push(opponent);
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
document.querySelector('.sidebar-nav-item[data-tab="log-game"]').addEventListener('click', () => {
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
          <button class="secondary" onclick="editGame(${game.id})" style="padding: 6px 12px; font-size: 14px; margin-right: 5px;">Edit</button>
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

// Edit Game
let editOpponentCount = 0;
const editMaxOpponents = 5;
let editSelectedWinningCommander = null;

window.editGame = async function(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

    const modal = document.getElementById('edit-game-modal');
    const dateInput = document.getElementById('edit-game-date');
    const deckSelect = document.getElementById('edit-game-deck');
    const wonRadio = document.getElementById('edit-i-won');
    const lostRadio = document.getElementById('edit-i-lost');
    const winningCommanderGroup = document.getElementById('edit-winning-commander-group');
    const winningCommanderInput = document.getElementById('edit-winning-commander');
    const gameIdInput = document.getElementById('edit-game-id');
    const winnerColorsInput = document.getElementById('edit-winner-colors');
    const opponentsContainer = document.getElementById('edit-opponents-container');

    // Populate deck selector
    deckSelect.innerHTML = '<option value="">Select your deck...</option>';
    myDecks.filter(d => !d.archived).forEach(deck => {
        const option = document.createElement('option');
        option.value = deck.id;
        option.textContent = `${deck.name} (${deck.commander.name})`;
        deckSelect.appendChild(option);
    });

    // Pre-fill form with game data
    dateInput.value = game.date;
    deckSelect.value = game.myDeck.id;
    gameIdInput.value = game.id;

    if (game.won) {
        wonRadio.checked = true;
        winningCommanderGroup.style.display = 'none';
        winnerColorsInput.value = game.winnerColorIdentity;
    } else {
        lostRadio.checked = true;
        winningCommanderGroup.style.display = 'block';
        winningCommanderInput.value = game.winningCommander || '';
        winnerColorsInput.value = game.winnerColorIdentity;
        editSelectedWinningCommander = game.winningCommander ? { name: game.winningCommander, colorIdentity: game.winnerColorIdentity?.split('') || [] } : null;
    }

    // Populate opponents
    opponentsContainer.innerHTML = '';
    editOpponentCount = 0;
    game.opponents.forEach((opponent, index) => {
        addEditOpponentField(opponent.name);
    });

    // Show modal
    modal.style.display = 'flex';
};

function addEditOpponentField(prefillName = '') {
    if (editOpponentCount >= editMaxOpponents) {
        alert('Maximum 5 opponents allowed');
        return;
    }

    editOpponentCount++;
    const container = document.getElementById('edit-opponents-container');

    const opponentDiv = document.createElement('div');
    opponentDiv.className = 'form-group';
    opponentDiv.id = `edit-opponent-${editOpponentCount}`;
    opponentDiv.innerHTML = `
    <label for="edit-opponent-${editOpponentCount}-input">Opponent ${editOpponentCount} Commander</label>
    <div class="autocomplete-container">
      <input type="text"
             id="edit-opponent-${editOpponentCount}-input"
             class="edit-opponent-input"
             data-opponent="${editOpponentCount}"
             autocomplete="off"
             placeholder="Start typing commander name..."
             value="${prefillName}">
      <div id="edit-opponent-${editOpponentCount}-results" class="autocomplete-results"></div>
    </div>
    <button type="button" onclick="removeEditOpponent(${editOpponentCount})" style="margin-top: 10px; background: #e74c3c;">Remove</button>
  `;

    container.appendChild(opponentDiv);
    setupEditOpponentAutocomplete(editOpponentCount);
    updateEditAddOpponentButton();
}

window.removeEditOpponent = function(num) {
    const opponentDiv = document.getElementById(`edit-opponent-${num}`);
    if (opponentDiv) {
        opponentDiv.remove();
        editOpponentCount--;
        updateEditAddOpponentButton();
    }
};

function updateEditAddOpponentButton() {
    const addButton = document.getElementById('edit-add-opponent');
    if (editOpponentCount >= editMaxOpponents) {
        addButton.style.display = 'none';
    } else {
        addButton.style.display = 'inline-block';
    }
}

function setupEditOpponentAutocomplete(num) {
    const input = document.getElementById(`edit-opponent-${num}-input`);
    const results = document.getElementById(`edit-opponent-${num}-results`);
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

    results.addEventListener('click', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            const commander = JSON.parse(e.target.dataset.commander);
            input.value = commander.name;
            results.classList.remove('show');
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(() => results.classList.remove('show'), 200);
    });
}

function setupEditWinningCommanderAutocomplete() {
    const input = document.getElementById('edit-winning-commander');
    const results = document.getElementById('edit-winning-commander-results');
    let selectedIndex = -1;
    let currentMatches = [];

    input.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        selectedIndex = -1;
        editSelectedWinningCommander = null;

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

    results.addEventListener('click', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            const commander = JSON.parse(e.target.dataset.commander);
            input.value = commander.name;
            editSelectedWinningCommander = commander;
            document.getElementById('edit-winner-colors').value = commander.colorIdentity.join('') || 'C';
            results.classList.remove('show');
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(() => results.classList.remove('show'), 200);
    });
}

// Edit Game Modal Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('edit-game-modal');
    const saveBtn = document.getElementById('edit-game-save');
    const cancelBtn = document.getElementById('edit-game-cancel');
    const addOpponentBtn = document.getElementById('edit-add-opponent');
    const wonRadio = document.getElementById('edit-i-won');
    const lostRadio = document.getElementById('edit-i-lost');
    const winningCommanderGroup = document.getElementById('edit-winning-commander-group');
    const deckSelect = document.getElementById('edit-game-deck');

    // Setup autocomplete for winning commander
    setupEditWinningCommanderAutocomplete();

    // Toggle winning commander field based on result
    wonRadio?.addEventListener('change', () => {
        winningCommanderGroup.style.display = 'none';
        // Set winner colors from selected deck
        const selectedDeckId = parseInt(deckSelect.value);
        const selectedDeck = myDecks.find(d => d.id === selectedDeckId);
        if (selectedDeck?.commander?.colorIdentity) {
            document.getElementById('edit-winner-colors').value = selectedDeck.commander.colorIdentity.join('') || 'C';
        }
    });

    lostRadio?.addEventListener('change', () => {
        winningCommanderGroup.style.display = 'block';
    });

    // Add opponent button
    addOpponentBtn?.addEventListener('click', () => {
        addEditOpponentField();
    });

    // Save button
    saveBtn?.addEventListener('click', async () => {
        const gameId = parseInt(document.getElementById('edit-game-id').value);
        const date = document.getElementById('edit-game-date').value;
        const deckId = parseInt(document.getElementById('edit-game-deck').value);
        const won = document.getElementById('edit-i-won').checked;
        const winningCommanderInput = document.getElementById('edit-winning-commander');
        const winnerColors = document.getElementById('edit-winner-colors').value;

        // Validation
        if (!date || !deckId) {
            alert('Please fill in all required fields');
            return;
        }

        const selectedDeck = myDecks.find(d => d.id === deckId);
        if (!selectedDeck) {
            alert('Please select a valid deck');
            return;
        }

        // Determine winner color identity
        let winnerColorIdentity;
        if (won) {
            winnerColorIdentity = selectedDeck.commander.colorIdentity.join('') || 'C';
        } else {
            if (!winningCommanderInput.value) {
                alert('Please enter the winning commander');
                return;
            }
            winnerColorIdentity = winnerColors || 'C';
        }

        // Collect opponents
        const opponents = [];
        const opponentInputs = document.querySelectorAll('.edit-opponent-input');
        opponentInputs.forEach(input => {
            if (input.value.trim()) {
                opponents.push({ name: input.value.trim() });
            }
        });

        // Find and update the game
        const gameIndex = allGames.findIndex(g => g.id === gameId);
        if (gameIndex === -1) {
            alert('Game not found');
            return;
        }

        const updatedGame = {
            ...allGames[gameIndex],
            date,
            myDeck: selectedDeck,
            won,
            winningCommander: won ? selectedDeck.commander.name : winningCommanderInput.value,
            winnerColorIdentity,
            opponents,
            totalPlayers: opponents.length + 1
        };

        // Save to storage
        allGames = await storage.updateGame(updatedGame);
        displayGameHistory();

        // Close modal and show success
        modal.style.display = 'none';
        const successMsg = document.getElementById('history-success');
        successMsg.textContent = '✓ Game updated successfully!';
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 3000);
    });

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close on overlay click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

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

// Download template for importing games
document.getElementById('download-template-btn').addEventListener('click', () => {
    const template = {
        "_instructions": "Fill in your games below. Delete this _instructions field before importing.",
        "_colorIdentityCodes": "W=White, U=Blue, B=Black, R=Red, G=Green, C=Colorless. Combine for multicolor (e.g., UB, WUR, WUBRG)",
        "games": [
            {
                "date": "2024-01-15",
                "myDeck": {
                    "name": "Your Deck Name",
                    "commander": {
                        "name": "Your Commander Name",
                        "colorIdentity": ["U", "B"]
                    }
                },
                "won": true,
                "winningCommander": "Your Commander Name",
                "winnerColorIdentity": "UB",
                "opponents": [
                    { "name": "Opponent 1 Commander" },
                    { "name": "Opponent 2 Commander" }
                ],
                "totalPlayers": 3
            },
            {
                "date": "2024-01-20",
                "myDeck": {
                    "name": "Your Deck Name",
                    "commander": {
                        "name": "Your Commander Name",
                        "colorIdentity": ["W", "U", "B", "R", "G"]
                    }
                },
                "won": false,
                "winningCommander": "Winning Commander Name",
                "winnerColorIdentity": "RG",
                "opponents": [
                    { "name": "Opponent 1 Commander" },
                    { "name": "Opponent 2 Commander" },
                    { "name": "Opponent 3 Commander" }
                ],
                "totalPlayers": 4
            }
        ],
        "decks": []
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-import-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Import functionality
let importedData = null;
let importMode = 'merge';

document.getElementById('import-data-btn').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const content = await file.text();
        const isJson = file.name.endsWith('.json');

        if (isJson) {
            importedData = JSON.parse(content);
            // Validate JSON structure
            if (!importedData.games || !Array.isArray(importedData.games)) {
                throw new Error('Invalid JSON format: missing games array');
            }
        } else {
            // Parse CSV
            importedData = parseCSVtoGames(content);
        }

        // Show modal with preview
        const modal = document.getElementById('import-modal');
        document.getElementById('import-file-name').textContent = `File: ${file.name}`;
        document.getElementById('import-game-count').textContent = `Games found: ${importedData.games.length}`;
        document.getElementById('import-preview').style.display = 'block';
        document.getElementById('import-confirm-btn').disabled = false;

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Import error:', error);
        const successMsg = document.getElementById('history-success');
        successMsg.style.background = '#e74c3c';
        successMsg.textContent = '✗ Error reading file: ' + error.message;
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 4000);
    }

    // Reset file input
    e.target.value = '';
});

function parseCSVtoGames(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');

    const games = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 7) continue;

        const [date, deckName, commander, result, winnerColorIdentity, opponents, totalPlayers] = values;

        // Reconstruct game object
        const game = {
            id: Date.now() + i, // Generate unique ID
            date: date,
            myDeck: {
                name: deckName.replace(/^"|"$/g, ''),
                commander: {
                    name: commander.replace(/^"|"$/g, ''),
                    colorIdentity: winnerColorIdentity || ''
                }
            },
            won: result.toLowerCase() === 'win',
            winnerColorIdentity: winnerColorIdentity || '',
            opponents: opponents.replace(/^"|"$/g, '').split('; ').filter(o => o).map(name => ({ name })),
            totalPlayers: parseInt(totalPlayers) || 4
        };

        games.push(game);
    }

    return { games, decks: [] };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

// Import option selection
document.querySelectorAll('.import-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.import-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        option.querySelector('input[type="radio"]').checked = true;
        importMode = option.dataset.mode;

        // Show/hide warning for replace mode
        document.getElementById('import-replace-warning').style.display =
            importMode === 'replace' ? 'block' : 'none';
    });
});

// Import confirm
document.getElementById('import-confirm-btn').addEventListener('click', async () => {
    if (!importedData) return;

    try {
        const existingGames = await storage.getGames();

        if (importMode === 'replace') {
            // Delete all existing games first
            for (const game of existingGames) {
                await storage.deleteGame(game.id);
            }
        }

        // Import games
        let importedCount = 0;
        let skippedCount = 0;

        for (const game of importedData.games) {
            // Check for duplicates when merging
            if (importMode === 'merge') {
                const isDuplicate = existingGames.some(existing =>
                    existing.date === game.date &&
                    existing.myDeck?.name === game.myDeck?.name &&
                    existing.won === game.won
                );

                if (isDuplicate) {
                    skippedCount++;
                    continue;
                }
            }

            // Save game with new ID to avoid conflicts
            const newGame = { ...game, id: Date.now() + importedCount };
            await storage.saveGame(newGame);
            importedCount++;
        }

        // Import decks if available (JSON only)
        if (importedData.decks && importedData.decks.length > 0) {
            const existingDecks = await storage.getDecks();

            for (const deck of importedData.decks) {
                const isDuplicate = existingDecks.some(existing =>
                    existing.name === deck.name
                );

                if (!isDuplicate) {
                    await storage.saveDeck({ ...deck, id: Date.now() + Math.random() });
                }
            }
        }

        // Close modal and show success
        document.getElementById('import-modal').style.display = 'none';
        importedData = null;

        const successMsg = document.getElementById('history-success');
        successMsg.style.background = '#27ae60';
        let message = `✓ Imported ${importedCount} game(s)`;
        if (skippedCount > 0) {
            message += ` (${skippedCount} duplicate(s) skipped)`;
        }
        successMsg.textContent = message;
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 4000);

        // Reload game history
        loadGameHistory();

    } catch (error) {
        console.error('Import error:', error);
        const successMsg = document.getElementById('history-success');
        successMsg.style.background = '#e74c3c';
        successMsg.textContent = '✗ Import failed: ' + error.message;
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 4000);
    }
});

// Import cancel
document.getElementById('import-cancel-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
    importedData = null;
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-confirm-btn').disabled = true;
});

// Close import modal on overlay click
document.getElementById('import-modal').addEventListener('click', (e) => {
    if (e.target.id === 'import-modal') {
        document.getElementById('import-modal').style.display = 'none';
        importedData = null;
    }
});

// Load game history when switching to game history tab
document.querySelector('.sidebar-nav-item[data-tab="game-history"]').addEventListener('click', () => {
    loadGameHistory();
});

// Statistics functionality
let chartInstances = {};
let selectedYear = 'lifetime';
let selectedBuddy = 'all';

async function loadStatistics() {
    allGames = await storage.getGames();
    populateYearFilter();
    populateBuddyFilter();
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

function populateBuddyFilter() {
    const buddyFilter = document.getElementById('buddy-filter');
    loadPodBuddies();

    // Also collect buddies from past games that might not be in the current list
    const buddiesInGames = new Set();
    allGames.forEach(game => {
        if (game.opponents) {
            game.opponents.forEach(opp => {
                if (opp.buddyName) {
                    buddiesInGames.add(opp.buddyName);
                }
            });
        }
    });

    // Combine pod buddies and game buddies
    const allBuddies = new Set([...podBuddies, ...buddiesInGames]);
    const sortedBuddies = Array.from(allBuddies).sort((a, b) => a.localeCompare(b));

    // Build options
    let options = '<option value="all">All Opponents</option>';
    sortedBuddies.forEach(buddy => {
        options += `<option value="${buddy}">${buddy}</option>`;
    });

    buddyFilter.innerHTML = options;
    buddyFilter.value = selectedBuddy;
}

function filterGamesByBuddy(games, buddy) {
    if (buddy === 'all') {
        return games;
    }

    return games.filter(game => {
        if (!game.opponents) return false;
        return game.opponents.some(opp => opp.buddyName === buddy);
    });
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

    // Filter games by selected year and buddy
    let filteredGames = filterGamesByYear(allGames, selectedYear);
    filteredGames = filterGamesByBuddy(filteredGames, selectedBuddy);

    // Update filter info display
    const filterInfo = selectedBuddy !== 'all' ? ` (vs ${selectedBuddy})` : '';

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

    // Show buddy-specific stats if filtering by buddy
    displayBuddyStats(filteredGames, selectedBuddy);

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

// Buddy filter change handler
document.getElementById('buddy-filter').addEventListener('change', (e) => {
    selectedBuddy = e.target.value;
    calculateAndDisplayStats();
});

// Load statistics when switching to statistics tab
document.querySelector('.sidebar-nav-item[data-tab="statistics"]').addEventListener('click', () => {
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

// Display buddy-specific stats when filtering by a buddy
function displayBuddyStats(games, buddy) {
    const section = document.getElementById('buddy-stats-section');
    const nameEl = document.getElementById('buddy-stats-name');
    const listEl = document.getElementById('buddy-commanders-list');

    if (buddy === 'all') {
        section.style.display = 'none';
        return;
    }

    // Show the section
    section.style.display = 'block';
    nameEl.textContent = buddy;

    // Collect commanders this buddy has played
    const buddyCommanders = {};

    games.forEach(game => {
        if (game.opponents) {
            game.opponents.forEach(opp => {
                if (opp.buddyName === buddy) {
                    const cmdName = opp.name;
                    if (!buddyCommanders[cmdName]) {
                        buddyCommanders[cmdName] = {
                            name: cmdName,
                            count: 0,
                            colorIdentity: opp.colorIdentity || [],
                            wins: 0,
                            losses: 0
                        };
                    }
                    buddyCommanders[cmdName].count++;
                    if (game.won) {
                        buddyCommanders[cmdName].wins++;
                    } else {
                        buddyCommanders[cmdName].losses++;
                    }
                }
            });
        }
    });

    const sortedCommanders = Object.values(buddyCommanders).sort((a, b) => b.count - a.count);

    if (sortedCommanders.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No commander data for this buddy</p>';
        return;
    }

    // Helper to render color symbols
    function getColorSymbols(colorIdentity) {
        if (!colorIdentity || colorIdentity.length === 0) {
            return '<i class="ms ms-c mana"></i>';
        }
        const colorMap = { 'W': 'w', 'U': 'u', 'B': 'b', 'R': 'r', 'G': 'g' };
        return colorIdentity.map(c => `<i class="ms ms-${colorMap[c]} mana"></i>`).join('');
    }

    listEl.innerHTML = sortedCommanders.map(cmd => {
        const winRate = cmd.count > 0 ? ((cmd.wins / cmd.count) * 100).toFixed(0) : 0;
        const winRateColor = winRate >= 50 ? '#00b894' : '#ff6b6b';
        return `
            <div style="background: var(--bg-primary); padding: 15px; border-radius: 10px; border: 1px solid var(--border-color);">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">${cmd.name}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="mana-cost">${getColorSymbols(cmd.colorIdentity)}</div>
                    <div style="text-align: right;">
                        <span style="color: var(--text-muted); font-size: 0.85em;">${cmd.count} games</span>
                        <span style="color: ${winRateColor}; font-weight: bold; margin-left: 10px;">Your WR: ${winRate}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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

    // Create cards for top 3 (styled like deck cards)
    const cardsHtml = await Promise.all(topCommanders.map(async (commander, index) => {
        const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        const medal = ['🥇', '🥈', '🥉'][index];
        const colorSymbols = getColorSymbols(commander.colorIdentity);

        // Get commander image
        const imageUrl = await getCommanderImage(commander.name);
        const backgroundStyle = imageUrl
            ? `background-image: url('${imageUrl}'); background-size: cover; background-position: top center;`
            : `background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 179, 71, 0.2));`;

        return `
            <div class="faced-commander-card" style="
                position: relative;
                border-radius: 16px;
                overflow: hidden;
                border: 2px solid ${medalColors[index]};
                aspect-ratio: 1 / 1;
                transition: all 0.3s ease;
                cursor: default;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    ${backgroundStyle}
                    z-index: 1;
                "></div>
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, transparent 0%, transparent 20%, rgba(10, 14, 39, 0.85) 70%);
                    z-index: 2;
                "></div>
                <div style="
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    z-index: 3;
                    font-size: 1.8em;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
                ">${medal}</div>
                <div style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 3;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                ">
                    <div style="
                        font-size: 1.1em;
                        font-weight: 700;
                        color: #e8eaf6;
                        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.9);
                    ">${commander.name}</div>
                    <div class="mana-cost" style="justify-content: flex-start; gap: 4px;">${colorSymbols}</div>
                    <div style="
                        font-size: 1.4em;
                        font-weight: 700;
                        color: ${medalColors[index]};
                        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
                    ">${commander.count} <span style="font-size: 0.6em; font-weight: 400; color: #b0b3c1;">games faced</span></div>
                </div>
            </div>
        `;
    }));

    container.innerHTML = cardsHtml.join('');

    // If less than 3, fill remaining slots
    while (topCommanders.length < 3) {
        container.innerHTML += `
            <div style="
                position: relative;
                border-radius: 16px;
                overflow: hidden;
                border: 2px solid rgba(255, 255, 255, 0.1);
                aspect-ratio: 1 / 1;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.4;
            ">
                <div style="text-align: center; color: #888;">
                    <div style="font-size: 2em; margin-bottom: 8px;">?</div>
                    <div style="font-size: 0.85em;">Not enough data</div>
                </div>
            </div>
        `;
        topCommanders.push(null);
    }
}
// Life Counter functionality
let lifeCounterState = {
    playerCount: 4,
    players: [],
    initialized: false,
    colorScheme: 'classic'
};

const STARTING_LIFE = 40;
const COMMANDER_DAMAGE_LETHAL = 21;

function initLifeCounter() {
    lifeCounterState.players = [];
    for (let i = 1; i <= lifeCounterState.playerCount; i++) {
        lifeCounterState.players.push({
            id: i,
            name: `Player ${i}`,
            life: STARTING_LIFE,
            commanderDamage: {}, // { fromPlayerId: amount }
            manualRotate: false // track manual rotation override
        });
    }
    lifeCounterState.initialized = true;
    renderLifeCounter();
}

function renderLifeCounter() {
    const container = document.querySelector('.life-counter-container');
    if (!container) return;

    container.setAttribute('data-players', lifeCounterState.playerCount);
    container.setAttribute('data-scheme', lifeCounterState.colorScheme);

    // Determine which players are rotated based on player count
    const rotatedPlayers = getRotatedPlayers(lifeCounterState.playerCount);

    container.innerHTML = lifeCounterState.players.map(player => {
        // Default rotation XOR manual rotation (toggle behavior)
        const defaultRotated = rotatedPlayers.includes(player.id);
        const isRotated = player.manualRotate ? !defaultRotated : defaultRotated;
        const totalCommanderDamage = Object.values(player.commanderDamage).reduce((a, b) => a + b, 0);
        const isEliminated = player.life <= 0 || Object.values(player.commanderDamage).some(dmg => dmg >= COMMANDER_DAMAGE_LETHAL);

        let eliminatedClass = isEliminated ? 'eliminated' : '';
        let rotatedClass = isRotated ? 'rotated' : '';

        return `
            <div class="player-card ${rotatedClass} ${eliminatedClass}" data-player="${player.id}">
                <button class="rotate-player-btn" onclick="event.stopPropagation(); togglePlayerRotation(${player.id})" title="Rotate player">&#8635;</button>
                <div class="life-row">
                    <button class="life-btn minus" onclick="event.stopPropagation(); adjustLife(${player.id}, -1)">-</button>
                    <div class="life-total">${player.life}</div>
                    <button class="life-btn plus" onclick="event.stopPropagation(); adjustLife(${player.id}, 1)">+</button>
                </div>
                <button class="commander-damage-btn" onclick="openCommanderDamagePopup(${player.id})">
                    <i class="ms ms-ability-commander"></i>
                    <span>Commander Damage</span>
                </button>
            </div>
        `;
    }).join('');

    // Update center button player count display
    const countDisplay = document.querySelector('.player-count-display');
    if (countDisplay) {
        countDisplay.textContent = lifeCounterState.playerCount;
    }
}

function getRotatedPlayers(playerCount) {
    switch (playerCount) {
        case 2:
            return [1]; // Top player rotated
        case 3:
            return [1, 2]; // Top row rotated
        case 4:
            return [1, 2]; // Top row rotated
        case 5:
            return [1, 2, 5]; // Players 1, 2 (second row) and 5 (head of table) rotated
        case 6:
            return [1, 2, 3]; // Top row rotated
        default:
            return [];
    }
}

window.adjustLife = function(playerId, delta) {
    const player = lifeCounterState.players.find(p => p.id === playerId);
    if (player) {
        player.life += delta;
        renderLifeCounter();
    }
};

window.togglePlayerRotation = function(playerId) {
    const player = lifeCounterState.players.find(p => p.id === playerId);
    if (player) {
        player.manualRotate = !player.manualRotate;
        renderLifeCounter();
    }
};

window.openCommanderDamagePopup = function(playerId) {
    const player = lifeCounterState.players.find(p => p.id === playerId);
    if (!player) return;

    const modal = document.getElementById('commander-damage-modal');
    const playerNameEl = document.getElementById('cdm-player-name');
    const opponentsEl = document.getElementById('cdm-opponents');

    playerNameEl.textContent = `Damage to ${player.name}`;

    // Get all other players as commander damage sources
    const opponents = lifeCounterState.players.filter(p => p.id !== playerId);

    opponentsEl.innerHTML = opponents.map(opponent => {
        const damage = player.commanderDamage[opponent.id] || 0;
        const isLethal = damage >= COMMANDER_DAMAGE_LETHAL;

        return `
            <div class="cdm-opponent ${isLethal ? 'lethal' : ''}">
                <span class="cdm-opponent-name">${opponent.name}'s Commander</span>
                <div class="cdm-opponent-controls">
                    <button class="cdm-btn minus" onclick="adjustCommanderDamage(${playerId}, ${opponent.id}, -1)">-</button>
                    <span class="cdm-damage-value ${isLethal ? 'lethal' : ''}">${damage}</span>
                    <button class="cdm-btn plus" onclick="adjustCommanderDamage(${playerId}, ${opponent.id}, 1)">+</button>
                </div>
            </div>
        `;
    }).join('');

    modal.style.display = 'flex';
};

window.adjustCommanderDamage = function(targetPlayerId, sourcePlayerId, delta) {
    const player = lifeCounterState.players.find(p => p.id === targetPlayerId);
    if (!player) return;

    // Initialize if not exists
    if (!player.commanderDamage[sourcePlayerId]) {
        player.commanderDamage[sourcePlayerId] = 0;
    }

    const newDamage = player.commanderDamage[sourcePlayerId] + delta;

    // Don't allow negative damage
    if (newDamage < 0) return;

    // If adding damage, also reduce life total
    if (delta > 0) {
        player.life -= delta;
    } else if (delta < 0) {
        // If removing commander damage, restore life
        player.life -= delta; // delta is negative, so this adds to life
    }

    player.commanderDamage[sourcePlayerId] = newDamage;

    // Re-render both the modal and the main view
    renderLifeCounter();
    window.openCommanderDamagePopup(targetPlayerId);
};

function resetLifeCounter() {
    lifeCounterState.players = [];
    for (let i = 1; i <= lifeCounterState.playerCount; i++) {
        lifeCounterState.players.push({
            id: i,
            name: `Player ${i}`,
            life: STARTING_LIFE,
            commanderDamage: {},
            manualRotate: false
        });
    }
    renderLifeCounter();
}

function setPlayerCount(count) {
    lifeCounterState.playerCount = count;
    initLifeCounter();

    // Update active button in settings
    document.querySelectorAll('.player-count-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
    });
}

function setColorScheme(scheme) {
    lifeCounterState.colorScheme = scheme;
    renderLifeCounter();

    // Update active button in settings
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scheme === scheme);
    });
}

// Life Counter event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Settings button
    const settingsBtn = document.getElementById('life-counter-settings-btn');
    const settingsModal = document.getElementById('life-counter-settings-modal');
    const settingsClose = document.getElementById('life-counter-settings-close');
    const resetBtn = document.getElementById('life-counter-reset-btn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // Show/hide exit fullscreen button based on current mode
            const exitFullscreenBtn = document.getElementById('life-counter-exit-fullscreen-btn');
            if (exitFullscreenBtn) {
                exitFullscreenBtn.style.display = document.body.classList.contains('life-counter-fullscreen') ? 'inline-block' : 'none';
            }
            settingsModal.style.display = 'flex';
        });
    }

    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetLifeCounter();
            settingsModal.style.display = 'none';
        });
    }

    // Player count buttons
    document.querySelectorAll('.player-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const count = parseInt(btn.dataset.count);
            setPlayerCount(count);
        });
    });

    // Color scheme buttons
    document.querySelectorAll('.scheme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scheme = btn.dataset.scheme;
            setColorScheme(scheme);
        });
    });

    // Commander damage modal close
    const cdmModal = document.getElementById('commander-damage-modal');
    const cdmClose = document.getElementById('commander-damage-close');

    if (cdmClose) {
        cdmClose.addEventListener('click', () => {
            cdmModal.style.display = 'none';
        });
    }

    if (cdmModal) {
        cdmModal.addEventListener('click', (e) => {
            if (e.target === cdmModal) {
                cdmModal.style.display = 'none';
            }
        });
    }
});

// Initialize life counter when tab is shown and enter fullscreen
document.querySelector('.sidebar-nav-item[data-tab="life-counter"]')?.addEventListener('click', () => {
    if (!lifeCounterState.initialized) {
        initLifeCounter();
    }
    // Enter fullscreen mode
    document.body.classList.add('life-counter-fullscreen');
});

// Exit life counter fullscreen mode
function exitLifCounterFullscreen() {
    document.body.classList.remove('life-counter-fullscreen');
    // Switch to My Decks tab
    document.querySelectorAll('.sidebar-nav-item').forEach(t => t.classList.remove('active'));
    document.querySelector('.sidebar-nav-item[data-tab="my-decks"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('my-decks').classList.add('active');
}

document.getElementById('life-counter-exit-fullscreen-btn')?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal(
        'Exit Life Counter',
        'Are you sure you want to leave? Your current game will be preserved until you reset.',
        'Exit'
    );
    if (confirmed) {
        // Close the settings modal first
        document.getElementById('life-counter-settings-modal').style.display = 'none';
        exitLifCounterFullscreen();
    }
});

// Initialize app
init();