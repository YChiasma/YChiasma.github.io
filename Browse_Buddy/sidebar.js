// sidebar.js

const nameInput = document.getElementById('nameInput');
let userName = localStorage.getItem('chatUserName') || 'Anon';
nameInput.value = userName;

// Save name on change
nameInput.addEventListener('input', () => {
  userName = nameInput.value.trim() || 'Anon';
  localStorage.setItem('chatUserName', userName);
});

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBD_UwLsrZd_At8pItS5I1qoU7KYdWRdRk",
  authDomain: "browse-buddy.firebaseapp.com",
  databaseURL: "https://browse-buddy-default-rtdb.firebaseio.com",
  projectId: "browse-buddy",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
let idToken = null;

const firebaseBaseURL = 'https://browse-buddy-default-rtdb.firebaseio.com';
const unsentMessages = {}; // { url: unsentText }

const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const chatroomUrlInput = document.getElementById('chatroomUrl');

let chatroomKey = null;
let fullURL = '';

// Sign in anonymously and retrieve ID token
async function initFirebaseAuth() {
  try {
    await auth.signInAnonymously();
    const user = auth.currentUser;
    if (user) {
      idToken = await user.getIdToken();
    } else {
      console.error('Failed to authenticate with Firebase.');
    }
  } catch (err) {
    console.error('Firebase auth error:', err);
  }
}

// Clip URL at first ? or # (if any), encode as key
function encodeKey(key) {
  key = key.toString();
  let clip = Math.min(...[key.indexOf("#"), key.indexOf("?")].filter(x => x !== -1));
  clip = isFinite(clip) ? clip : key.length;
  return encodeURIComponent(key.slice(0, clip) || "unknown").replaceAll("_", "___").replaceAll("-", "_dash_").replaceAll(".", "_dot_").replaceAll("%", "_percent_");
}

function decodeKey(key) {
  return decodeURIComponent(key.replaceAll("_percent_", "%").replaceAll("_dot_", ".").replaceAll("_dash_", "-").replaceAll("___", "_"));
}

// Get active tab's URL
async function getCurrentTabURL() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.url || '';
}

// Load messages from Firebase
async function loadMessages() {
  if (!chatroomKey || !idToken) return;

  try {
    const res = await fetch(
      `${firebaseBaseURL}/chatrooms/${chatroomKey}/messages.json?orderBy="timestamp"&auth=${idToken}`
    );
    const data = await res.json();

    messagesDiv.innerHTML = '';
    if (data) {
      Object.values(data).forEach(msg => addMessageToDOM(msg));
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  } catch (err) {
    console.error('Failed to load messages:', err);
  }
}

// Add a message to the DOM
function addMessageToDOM({ sender, text, timestamp }) {
  const msg = document.createElement('div');
  const time = new Date(timestamp).toLocaleString();
  
  const isMine = sender === userName;

  const userNameSpan = document.createElement('span');
  if (isMine) userNameSpan.className = "you";
  userNameSpan.textContent = sender+": ";

  const messageText = document.createTextNode(text);

  msg.appendChild(userNameSpan);
  msg.appendChild(messageText);
  msg.title = time;

  messagesDiv.appendChild(msg);
}

// Send a message to Firebase
async function sendMessage(text) {
  if (!chatroomKey || !idToken) return;

  const message = {
    sender: userName,
    text,
    timestamp: Date.now()
  };

  try {
    const res = await fetch(
      `${firebaseBaseURL}/chatrooms/${chatroomKey}/messages.json?auth=${idToken}`,
      {
        method: 'POST',
        body: JSON.stringify(message),
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!res.ok) {
      console.error('Failed to send message:', await res.text());
    }
  } catch (err) {
    console.error('Message send error:', err);
  }
}

// Polling for new messages
let pollInterval = null;
function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadMessages, 3000);
}

// Main function for switching chatroom
async function initChatForCurrentTab() {
  await initFirebaseAuth();

  const url = await getCurrentTabURL();
  if (!url) return;

  fullURL = url;
  chatroomKey = encodeKey(url);
  chatroomUrlInput.value = decodeKey(chatroomKey);

  msgInput.value = unsentMessages[fullURL] || '';
  loadMessages();
  startPolling();
}

async function initChatForUrl(url) {
  await initFirebaseAuth();

  fullURL = url;
  chatroomKey = encodeKey(url);
  chatroomUrlInput.value = decodeKey(chatroomKey);

  msgInput.value = unsentMessages[fullURL] || '';
  loadMessages();
  startPolling();
}

// Event listeners
msgInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && msgInput.value.trim()) {
    sendMessage(msgInput.value.trim());
    msgInput.value = '';
    unsentMessages[fullURL] = '';
  }
});

msgInput.addEventListener('input', () => {
  unsentMessages[fullURL] = msgInput.value;
});

chatroomUrlInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    initChatForUrl(chatroomUrlInput.value.trim());
  }
});

if("undefined" != typeof(browser)) {
  // Listen for tab changes
  browser.tabs.onActivated.addListener(initChatForCurrentTab);
  browser.tabs.onUpdated.addListener((_, info) => {
    if (info.status === 'complete') initChatForCurrentTab();
  });
}

// Initial load
initChatForCurrentTab();
