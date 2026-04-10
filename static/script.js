// Global variables
let recognition = null;
let isListening = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.auth-container')) {
        initAuth();
    } else {
        initApp();
    }
});

function showMessage(el, message, type) {
    const msgEl = document.getElementById(el);
    msgEl.textContent = message;
    msgEl.className = `message ${type}`;
    msgEl.style.display = 'block';
    
    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 3000);
}

function showNotification(message, type = 'success') {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = `notification ${type} show`;
    
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// AUTHENTICATION FUNCTIONS
function initAuth() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // Update tabs
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Switch forms
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(tab + '-form').classList.add('active');
        });
    });

    // Login
    document.getElementById('login-btn').addEventListener('click', loginUser);
    
    // Signup
    document.getElementById('signup-btn').addEventListener('click', signupUser);
}

async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('message', 'Please fill all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage('message', data.message, 'success');
            setTimeout(() => window.location.href = '/app', 1000);
        } else {
            showMessage('message', data.message, 'error');
        }
    } catch (error) {
        showMessage('message', 'Network error', 'error');
    }
}

async function signupUser() {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (!username || !email || !password) {
        showMessage('message', 'Please fill all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage('message', data.message, 'success');
            setTimeout(() => window.location.href = '/app', 1500);
        } else {
            showMessage('message', data.message, 'error');
        }
    } catch (error) {
        showMessage('message', 'Network error', 'error');
    }
}

// APP FUNCTIONS
function initApp() {
    // Button event listeners
    document.getElementById('speak-btn').addEventListener('click', toggleSpeechRecognition);
    document.getElementById('play-btn').addEventListener('click', speakText);
    document.getElementById('clear-btn').addEventListener('click', clearText);
    document.getElementById('save-btn').addEventListener('click', saveText);
    document.getElementById('history-btn').addEventListener('click', loadHistory);
    
    // Load history on start
    loadHistory();
}

function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Speech recognition not supported', 'error');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
        isListening = true;
        document.getElementById('speak-btn').textContent = '🔴 Stop';
        document.getElementById('speak-btn').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('main-textarea').value = transcript;
        showNotification('Speech recognized successfully!');
    };
    
    recognition.onend = function() {
        isListening = false;
        document.getElementById('speak-btn').textContent = '🎤 Speak';
        document.getElementById('speak-btn').style.background = '';
    };
    
    recognition.onerror = function(event) {
        isListening = false;
        document.getElementById('speak-btn').textContent = '🎤 Speak';
        document.getElementById('speak-btn').style.background = '';
        showNotification('Speech recognition error: ' + event.error, 'error');
    };
    
    return true;
}

function toggleSpeechRecognition() {
    if (!recognition) {
        if (!initSpeechRecognition()) return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function speakText() {
    const text = document.getElementById('main-textarea').value.trim();
    if (!text) {
        showNotification('No text to speak', 'error');
        return;
    }
    
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
        showNotification('Speaking...');
    } else {
        showNotification('Text-to-speech not supported', 'error');
    }
}

function clearText() {
    document.getElementById('main-textarea').value = '';
    showNotification('Text cleared');
}

async function saveText() {
    const text = document.getElementById('main-textarea').value.trim();
    if (!text) {
        showNotification('No text to save', 'error');
        return;
    }
    
    try {
        const response = await fetch('/save-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification(data.message);
            loadHistory(); // Refresh history
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error saving text', 'error');
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/history');
        const data = await response.json();
        
        const historyList = document.getElementById('history-list');
        if (data.history.length === 0) {
            historyList.innerHTML = '<p>No history yet. Save some text!</p>';
            return;
        }
        
        historyList.innerHTML = data.history.map(item => `
            <div class="history-item">
                <div class="history-text">${item.text}</div>
                <div class="history-time">${item.timestamp}</div>
            </div>
        `).join('');
    } catch (error) {
        showNotification('Error loading history', 'error');
    }
}

// Enter key support for auth forms
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (document.querySelector('.auth-container')) {
            if (document.querySelector('#login-form.active')) {
                loginUser();
            } else {
                signupUser();
            }
        }
    }
});