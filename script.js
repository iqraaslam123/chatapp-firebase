// app.js
// ----- Imports (Firebase modular SDK) -----
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onChildAdded,
  onChildChanged,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";

// ----- Firebase config ----- (keep your values)
const firebaseConfig = {
  apiKey: "AIzaSyChcPXUPwvlzuac1ZILn3qCem6SfD6eMO4",
  authDomain: "real-time-data-base-1a8fb.firebaseapp.com",
  databaseURL: "https://real-time-data-base-1a8fb-default-rtdb.firebaseio.com",
  projectId: "real-time-data-base-1a8fb",
  storageBucket: "real-time-data-base-1a8fb.firebasestorage.app",
  messagingSenderId: "632165690035",
  appId: "1:632165690035:web:bf8e9a757c29e03d60dec6",
  measurementId: "G-J32TRZG6TK"
};

// ----- Initialize Firebase -----
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

// ----- Helper: get DOM -----
const $ = (id) => document.getElementById(id);

// ----- AUTH: Signup/Login/Google/Logout -----
// Sign Up
$("signup-btn")?.addEventListener("click", () => {
  const email = $("email").value;
  const password = $("password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("✅ Sign Up Successful!");
      window.location.href = "user.html";
    })
    .catch((err) => alert("Error: " + err.message));
});

// Login
$("login-btn")?.addEventListener("click", () => {
  const email = $("email").value;
  const password = $("password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("✅ Login Successful!");
      window.location.href = "user.html";
    })
    .catch((err) => alert("Error: " + err.message));
});

// Google sign-in
$("google-btn")?.addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then(() => {
      alert("😊 Login Successful!");
      window.location.href = "user.html";
    })
    .catch((err) => alert(err.message));
});

// Logout

$("logout-btn")?.addEventListener("click", () => {
  const confirmLogout = confirm("Are you sure you want to log out?");
  if (!confirmLogout) return;

  signOut(auth).then(() => {
    alert("✅ Logout Successful!");
    window.location.href = "index.html";
  });
});

// Optional: track auth state (if you want to redirect users based on auth)
onAuthStateChanged(auth, (user) => {
  // you can redirect or show/hide UI here
});

// ----- USERNAME PAGE -----
// Save username to localStorage and redirect
$("username-btn")?.addEventListener("click", () => {
  const usernameInput = $("username");
  if (!usernameInput) return;
  const usernameVal = usernameInput.value.trim();
  if (!usernameVal) {
    alert("⚠️ Please enter a username.");
    return;
  }
  localStorage.setItem("username", usernameVal);
  alert(`Welcome, ${usernameVal}!`);
  window.location.href = "chat.html";
});

// ----- CHAT PAGE: Setup -----
// Current username (from localStorage)
let username = localStorage.getItem("username") || "Guest";

// Display username
const nameDisplay = $("display-name");
if (nameDisplay) nameDisplay.textContent = username;

// ----- Send message function (generates unique id, timestamp) -----
window.sendMessage = function () {
  const msgInput = $("message");
  if (!msgInput) return;
  const message = msgInput.value.trim();
  if (message === "") {
    alert("Please type a message before sending.");
    return;
  }

  // Generate new message ref
  const newMsgRef = push(ref(db, "messages"));
  const now = Date.now();
  const msgObj = {
    id: newMsgRef.key,
    name: username || "Guest",
    text: message,
    timestamp: now,
    edited: false,
    deleted: false,
  };

  set(newMsgRef, msgObj)
    .then(() => {
      msgInput.value = "";
    })
    .catch((err) => console.error("Push error:", err));
};

// ----- Utility: escapeHtml to avoid injection -----
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ----- Utility: create message DOM node -----
// takes message key and message data
function createMessageElement(key, data) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message");
  wrapper.dataset.id = key;

  if (data.name === username) wrapper.classList.add("sent");
  else wrapper.classList.add("received");

  // format time
  const time = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  // If deleted in DB, show deleted text style
  const isDeleted = data.deleted === true;

  wrapper.innerHTML = `
    <div class="bubble" data-id="${key}">
      <div class="msg-header">
        <strong class="username">${escapeHtml(data.name)}</strong>
        <div class="msg-actions">
          ${
            data.name === username
              ? `<i class="edit-icon" title="Edit">✏️</i>
                 <i class="delete-icon" title="Delete">🗑️</i>`
              : `<i class="copy-icon" title="Copy">📋</i>
                 <i class="mic-icon" title="Listen">🎤</i>`
          }
        </div>
      </div>

      <div class="msg-body">
        ${
          data.replyTo
            ? `<div class="reply-preview">Replying to: <em>${escapeHtml(data.replyTo.text)}</em></div>`
            : ""
        }
        <div class="msg-text ${isDeleted ? "deleted" : ""}">${escapeHtml(data.text)}</div>
      </div>

      <span class="time">${time}${data.edited ? " (edited)" : ""}</span>
    </div>
  `;

  return wrapper;
}

// ----- Realtime: Add new messages -----
const messagesRef = ref(db, "messages");
const messageBox = $("messages");

onChildAdded(messagesRef, (snapshot) => {
  const data = snapshot.val();
  const key = snapshot.key;
  if (!data) return;

  const elem = createMessageElement(key, data);
  if (!messageBox) return;
  messageBox.appendChild(elem);
  messageBox.scrollTop = messageBox.scrollHeight;

  // Attach handlers (edit/delete or copy/mic) for this element
  // Use delegated selectors on the element to avoid duplicate listeners globally
  // For owner (edit/delete)
  if (data.name === username) {
    const editBtn = elem.querySelector(".edit-icon");
    const delBtn = elem.querySelector(".delete-icon");

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        if (data.deleted) return alert("Cannot edit a deleted message.");
        const currentText = data.text || "";
        const newText = prompt("✏️ Edit your message:", currentText);
        if (newText === null) return; // cancelled
        const trimmed = newText.trim();
        if (trimmed === "") {
          alert("Message cannot be empty.");
          return;
        }

        // Immediately update UI for snappy feel
        const bubble = document.querySelector(`.bubble[data-id='${key}']`);
        if (bubble) {
          const msgText = bubble.querySelector(".msg-text");
          if (msgText) msgText.textContent = trimmed;
        }

        // Update DB (this will notify others)
        update(ref(db, "messages/" + key), {
          text: trimmed,
          edited: true,
          timestamp: Date.now(),
        }).catch((err) => console.error("Edit error:", err));
      });
    }

    if (delBtn) {
      delBtn.addEventListener("click", () => {
        const confirmEveryone = confirm(
          "🗑️ Do you want to delete this message FOR EVERYONE?\n\nPress OK = Delete for everyone\nPress Cancel = Delete just for you (remove from your view only)."
        );

        if (confirmEveryone) {
          // 1) Instant local UI update
          const bubble = document.querySelector(`.bubble[data-id='${key}']`);
          if (bubble) {
            const msgText = bubble.querySelector(".msg-text");
            const actions = bubble.querySelector(".msg-actions");
            if (msgText) {
              msgText.textContent = "💔 Message deleted ♥";
              msgText.classList.add("deleted");
            }
            if (actions) actions.style.display = "none";
          }

          // 2) Update DB with timestamp to force onChildChanged
          update(ref(db, "messages/" + key), {
            text: "💔 Message deleted ♥",
            deleted: true,
            edited: false,
            timestamp: Date.now(),
          })
            .then(() => {
              // success
            })
            .catch((err) => console.error("Delete everyone error:", err));
        } else {
          // Delete for me (remove DOM only)
          const myElem = document.querySelector(`.message[data-id='${key}']`);
          if (myElem) myElem.remove();
        }
      });
    }
  } else {
    // For others' messages: attach copy & mic
    const copyBtn = elem.querySelector(".copy-icon");
    const micBtn = elem.querySelector(".mic-icon");

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(data.text || "")
          .then(() => {
            // small visual feedback

            alert("✅ Message copied to clipboard!");
          })
          .catch(() => alert("Copy failed"));
      });

      // Show icons only on hover — ensure style works (CSS)
      const otherActions = elem.querySelector(".msg-actions");
      elem.addEventListener("mouseenter", () => {
        if (otherActions) otherActions.style.opacity = "1";
      });
      elem.addEventListener("mouseleave", () => {
        if (otherActions) otherActions.style.opacity = "";
      });
    }

    if (micBtn) {
      micBtn.addEventListener("click", () => {
        try {
          const utterance = new SpeechSynthesisUtterance(data.text || "");
          // optional tweaks (voice rate/pitch)
          utterance.rate = 1;
          utterance.pitch = 1;
          speechSynthesis.speak(utterance);
        } catch (err) {
          console.error("Speech error:", err);
        }
      });
    }
  }
});

// ----- Realtime: When a child message is changed (edited/deleted) -----
onChildChanged(messagesRef, (snapshot) => {
  const updated = snapshot.val();
  const key = snapshot.key;
  if (!updated) return;

  // Find the element in DOM
  const bubble = document.querySelector(`.bubble[data-id='${key}']`);
  if (!bubble) return;

  const msgTextEl = bubble.querySelector(".msg-text");
  const actionsEl = bubble.querySelector(".msg-actions");
  const timeEl = bubble.querySelector(".time");

  // Update text
  if (msgTextEl) {
    msgTextEl.textContent = updated.text;
    // apply deleted class if deleted
    if (updated.deleted) {
      msgTextEl.classList.add("deleted");
      if (actionsEl) actionsEl.style.display = "none";
    } else {
      msgTextEl.classList.remove("deleted");
    }
  }

  // If edited -> show (edited) in time or text
  if (updated.edited && timeEl) {
    // append (edited) to the time text to avoid modifying DB text again
    timeEl.textContent = new Date(updated.timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }) + " (edited)";
  } else if (timeEl) {
    timeEl.textContent = new Date(updated.timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
});

// ----- Extras: make Enter key send message when typing in the input -----
const messageInput = $("message");
if (messageInput) {
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      window.sendMessage();
    }
  });
}

// ----- Done -----
// This file now supports:
// - signup/login/google/logout
// - username flow
// - sending messages with unique id + timestamp
// - edit (updates DB + marks edited, UI updates instantly)
// - delete for everyone (instant UI update + DB update with timestamp) and delete for me
// - realtime updates for edits/deletes/time
// - copy and speech for received messages
// 🎨 THEME TOGGLE FUNCTIONALITY

const themeBtn = document.getElementById("theme-toggle");

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    // 🎨 Softer but visible pastel generator
    const pastel = () => {
      const hue = Math.floor(Math.random() * 360);
      return `hsl(${hue}, 65%, 75%)`; // deeper than before
    };

    const color1 = pastel();
    const color2 = pastel();
    const containerColor = `hsl(${Math.floor(Math.random() * 360)}, 50%, 88%)`;

    // 🌈 Background gradient for body
    document.body.style.background = `linear-gradient(120deg, ${color1}, ${color2})`;
    document.body.style.transition = "background 0.8s ease-in-out, color 0.6s ease";

    // 🎁 Chat container color
    const container = document.querySelector(".chat-container") || document.querySelector(".container");
    if (container) {
      container.style.background = containerColor;
      container.style.transition = "background 0.6s ease-in-out, box-shadow 0.4s ease";
      container.style.boxShadow = "0 6px 24px rgba(0,0,0,0.15)";
      container.style.borderRadius = "20px";
    }

    // ✨ Dynamic text color (always readable)
    const darkText = "#1f2937";
    const lightText = "#ffffff";
    const textColor = Math.random() > 0.5 ? darkText : lightText;
    document.body.style.color = textColor;

    // 💬 Message bubbles recolor with soft contrast
    document.querySelectorAll(".message.sent").forEach(msg => {
      msg.style.background = `hsl(${Math.floor(Math.random() * 360)}, 60%, 65%)`;
      msg.style.color = "#fff";
      msg.style.transition = "all 0.6s ease";
    });

    document.querySelectorAll(".message.received").forEach(msg => {
      msg.style.background = `hsl(${Math.floor(Math.random() * 360)}, 55%, 90%)`;
      msg.style.color = "#111";
      msg.style.transition = "all 0.6s ease";
    });

    // 🌟 Button animation
    themeBtn.style.transform = "rotate(360deg)";
    themeBtn.style.transition = "transform 0.8s ease";
    setTimeout(() => (themeBtn.style.transform = "rotate(0deg)"), 800);
  });
}


function renderMessage(userName, messageText, userPhotoURL) {
  const msgContainer = document.createElement("div");
  msgContainer.classList.add("message");

  // Avatar logic
  const avatar = document.createElement("div");
  avatar.classList.add("avatar");

  if (userPhotoURL) {
    const img = document.createElement("img");
    img.src = userPhotoURL;
    avatar.appendChild(img);
  } else {
    const initial = document.createElement("span");
    initial.textContent = userName ? userName.charAt(0).toUpperCase() : "?";
    avatar.appendChild(initial);
  }

  // Message text
  const msgText = document.createElement("div");
  msgText.classList.add("text");
  msgText.textContent = messageText;

  msgContainer.appendChild(avatar);
  msgContainer.appendChild(msgText);

  document.getElementById("messages").appendChild(msgContainer);
}

