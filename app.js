<meta name='viewport' content='width=device-width, initial-scale=1'/>import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, onSnapshot, collection, query, 
    getDocs, addDoc, orderBy, where, limit, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const videoConfig = {
    apiKey: "AIzaSyB3zKexi3a-4WniftHc_00Tc8rcRdda7pY",
    authDomain: "comj-b7bf6.firebaseapp.com",
    projectId: "comj-b7bf6",
    storageBucket: "comj-b7bf6.firebasestorage.app",
    appId: "1:137177672880:web:307a4cec9b901c6e8ddf75"
};

// Initialize Firebase
const vApp = initializeApp(videoConfig);
const vDB = getFirestore(vApp);
const vAuth = getAuth(vApp);

// 1. DATA & THEME SETUP
const realUser = localStorage.getItem('studentName');
const savedTheme = localStorage.getItem('siteTheme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);

window.toggleTheme = function() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('siteTheme', next);
    console.log("Boss, Theme badal di gayi hai!");
};

// 2. AUTHENTICATION SYSTEM (Anonymous Login Fix)
async function handleAuth() {
    onAuthStateChanged(vAuth, async (user) => {
        if (!user) {
            try {
                await signInAnonymously(vAuth);
                console.log("Authenticated Anonymously, Boss!");
            } catch (error) {
                console.error("Auth Error:", error.message);
            }
        }
    });
}

// 3. COMMUNITY CHAT SYSTEM
function setupCommunityChat() {
    const feed = document.getElementById('communityFeed');
    const sendBtn = document.getElementById('postBtn');
    const inp = document.getElementById('doubtInput');
    if (!feed) return;

    const q = query(collection(vDB, "community"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snap) => {
        feed.innerHTML = '';
        snap.forEach(d => {
            const m = d.data();
            feed.innerHTML += `
                <div style="margin-bottom:12px; padding:10px; background:rgba(255,255,255,0.05); border-radius:12px; border-left:4px solid var(--primary);">
                    <b style="color:var(--primary); font-size:0.75rem;">${m.user || 'Guest'}</b>
                    <p style="margin:4px 0; font-size:0.95rem;">${m.text}</p>
                </div>`;
        });
        feed.scrollTop = feed.scrollHeight;
    });

    if (sendBtn) {
        sendBtn.onclick = async () => {
            if (!inp.value.trim()) return;
            await addDoc(collection(vDB, "community"), {
                user: realUser || "Anonymous",
                text: inp.value,
                timestamp: new Date()
            });
            inp.value = '';
        };
    }
}

// 4. VIDEO & PLAYER LOGIC (HTTPS & Template Literal Fix)
async function loadVideos(category, containerId) {
    const box = document.getElementById(containerId);
    if (!box) return;
    
    let q = query(collection(vDB, "contents"), orderBy("timestamp", "desc"));
    if (category !== "All") {
        q = query(collection(vDB, "contents"), where("category", "==", category));
    }

    onSnapshot(q, (snap) => {
        box.innerHTML = '';
        snap.forEach(d => {
            const v = d.data();
            box.innerHTML += `
                <div class="v-card" onclick="window.location.href='player.html?id=${d.id}'" style="cursor:pointer;">
                    <img src="${v.thumbnail}" style="width:100%; border-radius:12px;" onerror="this.src='https://via.placeholder.com/300x168?text=No+Thumbnail'">
                    <div style="padding:10px;">
                        <h4>${v.title}</h4>
                        <p style="color:gray; font-size:0.8rem;">${v.teacher}</p>
                    </div>
                </div>`;
        });
    });
}

async function loadPlayerPage() {
    const vidId = new URLSearchParams(window.location.search).get('id');
    if (!vidId) return;

    onSnapshot(doc(vDB, "contents", vidId), (s) => {
        if (s.exists()) {
            const data = s.data();
            document.title = data.title;
            if (document.getElementById('vidTitle')) document.getElementById('vidTitle').innerText = data.title;
            
            const playerWrapper = document.getElementById('playerWrapper');
            if (playerWrapper) {
                // Fixed YouTube URL and HTTPS
                playerWrapper.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${data.youtubeId}?autoplay=1" 
                        style="width:100%; height:100%; border:none; border-radius:15px;" 
                        allow="autoplay; encrypted-media" allowfullscreen>
                    </iframe>`;
            }
            saveToHistory(vidId);
        }
    });
}

// 5. HISTORY TRACKING
function saveToHistory(id) {
    if (!id) return;
    let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    history = history.filter(item => item !== id);
    history.unshift(id);
    localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 10)));
}

async function showProfileHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    const ids = JSON.parse(localStorage.getItem('watchHistory')) || [];
    if (ids.length === 0) {
        container.innerHTML = "<p style='color:gray; padding:20px;'>No history yet.</p>";
        return;
    }
    container.innerHTML = "<h3>Recently Watched</h3>";
    for (const id of ids) {
        const snap = await getDocs(query(collection(vDB, "contents"), where("__name__", "==", id)));
        snap.forEach(d => {
            const v = d.data();
            container.innerHTML += `
                <div class="v-card-small" onclick="location.href='player.html?id=${d.id}'" style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px; border-radius:12px; margin-bottom:10px; cursor:pointer;">
                    <img src="${v.thumbnail}" style="width:80px; border-radius:8px;">
                    <p style="font-size:0.85rem; margin:0;">${v.title}</p>
                </div>`;
        });
    }
}

// 6. MASTER INIT
const init = () => {
    handleAuth(); // Initialize Anonymous Auth

    if (!realUser && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
        return;
    }

    document.querySelectorAll('#userName').forEach(tag => { tag.innerText = realUser || 'Guest'; });

    const path = window.location.pathname;
    if (path.includes('dashboard.html')) { loadVideos("One Shot", "oneShotRail"); }
    if (path.includes('videos.html')) { loadVideos("All", "mainVideoFeed"); }
    if (path.includes('player.html')) { loadPlayerPage(); }
    if (path.includes('profile.html')) { showProfileHistory(); }
    if (path.includes('community.html')) { setupCommunityChat(); }
};

init();
