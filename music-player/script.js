const songs = [
    {
        title: "Thanos",
        artist: "Saviour",
        src: "music/song1.mp3",
        cover: "https://i.pinimg.com/736x/ba/e1/72/bae17232ca156a99a0508b8067db64e4.jpg",
        dateAdded: "2024-01-10"
    },
    {
        title: "Conquest",
        artist: "Saviour",
        src: "music/song2.mp3",
        cover: "https://i.pinimg.com/736x/e3/ac/3d/e3ac3d73e61e4a5aa8bf2c335c114a83.jpg",
        dateAdded: "2024-06-15"
    },
    {
        title: "Ultron",
        artist: "Saviour",
        src: "music/song3.mp3",
        cover: "https://i.pinimg.com/1200x/f1/2c/95/f12c95942085381759e9517abe06ab6d.jpg",
        dateAdded: "2025-03-02"
    },
    {
        title: "Undisciplined",
        artist: "Saviour",
        src: "music/song4.mp3",
        cover: "https://i.pinimg.com/736x/f9/89/25/f9892546250bd9910d0030cdbb403dfd.jpg",
        dateAdded: "2025-05-02"
    },
    {
        title: "Lockdown",
        artist: "Saviour",
        src: "music/song5.mp3",
        cover: "https://i.pinimg.com/736x/0d/d0/57/0dd057efe1b320d2222030a47d874e35.jpg",
        dateAdded: "2025-09-02"
    }
];

const STORAGE_KEY = "musicPlayerState";
const PLAYCOUNT_KEY = "musicPlayerPlayCounts";

let currentSongIndex = 0;
let isPlaying = false;
let repeatMode = 0;
let isShuffle = false;
let lastVolume = 1;
let preloadedAudio = null;
let currentSort = "default";
let playCounts = songs.map(() => 0);
let hasCountedPlay = false;

const audioPlayer = document.querySelector("#audioPlayer");
const playBtn = document.querySelector("#playBtn");
const playIcon = document.querySelector("#playIcon");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const repeatBtn = document.querySelector("#repeatBtn");
const shuffleBtn = document.querySelector("#shuffleBtn");

const songTitle = document.querySelector("#songTitle");
const artistName = document.querySelector("#artistName");
const albumArt = document.querySelector("#albumArt");
const artOverlay = document.querySelector("#artOverlay");
const errorMsg = document.querySelector("#errorMsg");

const progressBar = document.querySelector("#progressBar");
const currentTime = document.querySelector("#currentTime");
const duration = document.querySelector("#duration");

const volumeBar = document.querySelector("#volumeBar");
const volumeIcon = document.querySelector("#volumeIcon");

const playlistEl = document.querySelector("#playlist");
const sortSelect = document.querySelector("#sortSelect");
const liveRegion = document.querySelector("#liveRegion");

const PLAY_ICON = '<path d="M8 5v14l11-7z"></path>';
const PAUSE_ICON = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"></path>';
const VOLUME_ICON = '<path d="M3 9v6h4l5 5V4L7 9H3z"></path><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z"></path>';
const MUTE_ICON = '<path d="M3 9v6h4l5 5V4L7 9H3z"></path><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"></line><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"></line>';

function announce(msg) {
    liveRegion.textContent = msg;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSongIndex,
            repeatMode,
            isShuffle,
            currentSort,
            volume: volumeBar.value,
            currentTime: audioPlayer.currentTime || 0
        }));
    } catch (e) {
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function loadPlayCounts() {
    try {
        const raw = localStorage.getItem(PLAYCOUNT_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length === songs.length) {
            playCounts = stored;
        }
    } catch (e) {
    }
}

function savePlayCounts() {
    try {
        localStorage.setItem(PLAYCOUNT_KEY, JSON.stringify(playCounts));
    } catch (e) {
    }
}

function registerPlay(index) {
    playCounts[index] = (playCounts[index] || 0) + 1;
    savePlayCounts();
    if (currentSort === "mostPlayed") {
        renderPlaylist();
    }
}

function getSortedIndices() {
    const indices = songs.map((_, i) => i);

    switch (currentSort) {
        case "alpha":
            return indices.sort((a, b) => songs[a].title.localeCompare(songs[b].title));
        case "newest":
            return indices.sort((a, b) => new Date(songs[b].dateAdded) - new Date(songs[a].dateAdded));
        case "mostPlayed":
            return indices.sort((a, b) => (playCounts[b] || 0) - (playCounts[a] || 0));
        default:
            return indices;
    }
}

function renderPlaylist() {
    playlistEl.innerHTML = "";
    const order = getSortedIndices();

    order.forEach((index) => {
        const song = songs[index];
        const li = document.createElement("li");
        li.className = "playlist-item" + (index === currentSongIndex ? " active" : "");
        li.tabIndex = 0;
        li.setAttribute("role", "button");
        li.setAttribute("aria-label", `Play ${song.title} by ${song.artist}`);
        li.dataset.index = index;

        li.innerHTML = `
            <img src="${song.cover}" alt="" loading="lazy">
            <span class="pl-meta">
                <span class="pl-title">${song.title}</span>
                <span class="pl-artist">${song.artist}</span>
            </span>
        `;

        li.addEventListener("click", () => selectSong(index));
        li.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectSong(index);
            }
        });

        playlistEl.appendChild(li);
    });
}

function updatePlaylistActive() {
    [...playlistEl.children].forEach((li, index) => {
        li.classList.toggle("active", index === currentSongIndex);
    });
}

function selectSong(index) {
    currentSongIndex = index;
    loadSong(currentSongIndex);
    playSong();
}

function loadSong(index, resumeTime) {
    const song = songs[index];

    songTitle.textContent = song.title;
    artistName.textContent = song.artist;

    hideError();
    audioPlayer.src = song.src;
    albumArt.src = song.cover;

    progressBar.value = 0;
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";

    if (resumeTime) {
        audioPlayer.addEventListener("loadedmetadata", function setTime() {
            audioPlayer.currentTime = resumeTime;
            audioPlayer.removeEventListener("loadedmetadata", setTime);
        });
    }

    hasCountedPlay = false;
    updatePlaylistActive();
    updateMediaSessionMetadata(song);
    preloadNextTrack();
    announce(`Now loaded: ${song.title} by ${song.artist}`);
}

function playSong() {
    audioPlayer.play().then(() => {
        if (!hasCountedPlay) {
            hasCountedPlay = true;
            registerPlay(currentSongIndex);
        }
    }).catch(() => {
        showError("Couldn't play this track. It may be missing or blocked.");
    });
    isPlaying = true;
    playIcon.innerHTML = PAUSE_ICON;
    playBtn.title = "Pause";
    playBtn.setAttribute("aria-label", "Pause");
    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
    }
}

function pauseSong() {
    audioPlayer.pause();
    isPlaying = false;
    playIcon.innerHTML = PLAY_ICON;
    playBtn.title = "Play";
    playBtn.setAttribute("aria-label", "Play");
    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }
    saveState();
}

function togglePlay() {
    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
}

function getNextIndex() {
    if (isShuffle && songs.length > 1) {
        let next;
        do {
            next = Math.floor(Math.random() * songs.length);
        } while (next === currentSongIndex);
        return next;
    }
 
    const order = getSortedIndices();
    const pos = order.indexOf(currentSongIndex);
    return order[(pos + 1) % order.length];
}

function getPrevIndex() {
    if (isShuffle && songs.length > 1) {
        let prev;
        do {
            prev = Math.floor(Math.random() * songs.length);
        } while (prev === currentSongIndex);
        return prev;
    }
    const order = getSortedIndices();
    const pos = order.indexOf(currentSongIndex);
    return order[(pos - 1 + order.length) % order.length];
}

function playNext() {
    currentSongIndex = getNextIndex();
    loadSong(currentSongIndex);
    if (isPlaying) playSong();
    saveState();
}

function playPrev() {
    currentSongIndex = getPrevIndex();
    loadSong(currentSongIndex);
    if (isPlaying) playSong();
    saveState();
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    const labels = ["off", "all", "one"];
    repeatBtn.dataset.mode = labels[repeatMode];
    repeatBtn.classList.toggle("active", repeatMode !== 0);
    repeatBtn.setAttribute(
        "aria-label",
        repeatMode === 0 ? "Repeat off" : repeatMode === 1 ? "Repeat all" : "Repeat one"
    );
    announce(`Repeat ${labels[repeatMode]}`);
    saveState();
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("active", isShuffle);
    shuffleBtn.setAttribute("aria-label", isShuffle ? "Shuffle on" : "Shuffle off");
    announce(isShuffle ? "Shuffle on" : "Shuffle off");
    preloadNextTrack();
    saveState();
}

function toggleMute() {
    if (audioPlayer.volume > 0) {
        lastVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
        volumeBar.value = 0;
        updateRangeFill(volumeBar);
        volumeIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">${MUTE_ICON}</svg>`;
    } else {
        audioPlayer.volume = lastVolume || 1;
        volumeBar.value = audioPlayer.volume;
        updateRangeFill(volumeBar);
        volumeIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">${VOLUME_ICON}</svg>`;
    }
    saveState();
}

function updateRangeFill(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const pct = ((input.value - min) / (max - min)) * 100;
    input.style.setProperty("--fill", pct + "%");
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.hidden = false;
    artOverlay.hidden = true;
}

function hideError() {
    errorMsg.hidden = true;
}

function showLoading() {
    artOverlay.hidden = false;
}

function hideLoading() {
    artOverlay.hidden = true;
}

function preloadNextTrack() {
    const nextIndex = getNextIndex();
    const nextSong = songs[nextIndex];
    if (!nextSong) return;
    preloadedAudio = new Audio();
    preloadedAudio.preload = "auto";
    preloadedAudio.src = nextSong.src;
}

function updateMediaSessionMetadata(song) {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork: [
            { src: song.cover, sizes: "512x512", type: "image/jpeg" }
        ]
    });
}

function setupMediaSessionHandlers() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", playSong);
    navigator.mediaSession.setActionHandler("pause", pauseSong);
    navigator.mediaSession.setActionHandler("previoustrack", playPrev);
    navigator.mediaSession.setActionHandler("nexttrack", playNext);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
            audioPlayer.currentTime = details.seekTime;
        }
    });
}

playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);
repeatBtn.addEventListener("click", toggleRepeat);
shuffleBtn.addEventListener("click", toggleShuffle);
volumeIcon.addEventListener("click", toggleMute);
sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    renderPlaylist();
    announce(`Playlist sorted: ${sortSelect.options[sortSelect.selectedIndex].text}`);
    saveState();
});
volumeIcon.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleMute();
    }
});

audioPlayer.addEventListener("loadedmetadata", () => {
    progressBar.max = audioPlayer.duration;
    duration.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
    progressBar.value = audioPlayer.currentTime;
    updateRangeFill(progressBar);
    currentTime.textContent = formatTime(audioPlayer.currentTime);
    if ("mediaSession" in navigator && audioPlayer.duration) {
        try {
            navigator.mediaSession.setPositionState({
                duration: audioPlayer.duration,
                playbackRate: audioPlayer.playbackRate,
                position: audioPlayer.currentTime
            });
        } catch (e) {
        }
    }
});

progressBar.addEventListener("input", () => {
    audioPlayer.currentTime = progressBar.value;
    updateRangeFill(progressBar);
});

audioPlayer.addEventListener("waiting", showLoading);
audioPlayer.addEventListener("canplay", hideLoading);
audioPlayer.addEventListener("playing", hideLoading);
audioPlayer.addEventListener("error", () => {
    hideLoading();
    showError(`Couldn't load "${songs[currentSongIndex].title}". Check the file path or try another track.`);
});

audioPlayer.addEventListener("ended", () => {
    if (repeatMode === 2) {
        audioPlayer.currentTime = 0;
        playSong();
        return;
    }

    const atLastSong = currentSongIndex === songs.length - 1;
    if (atLastSong && repeatMode === 0 && !isShuffle) {
        pauseSong();
        return;
    }

    playNext();
});

volumeBar.addEventListener("input", () => {
    audioPlayer.volume = volumeBar.value;
    updateRangeFill(volumeBar);
    volumeIcon.innerHTML = volumeBar.value == 0
        ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">${MUTE_ICON}</svg>`
        : `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">${VOLUME_ICON}</svg>`;
});
volumeBar.addEventListener("change", saveState);

document.addEventListener("keydown", (e) => {
    const tag = document.activeElement.tagName;
    if (tag === "INPUT" && document.activeElement !== progressBar && document.activeElement !== volumeBar) return;

    switch (e.code) {
        case "Space":
            e.preventDefault();
            togglePlay();
            break;
        case "ArrowRight":
            if (document.activeElement !== progressBar) {
                audioPlayer.currentTime = Math.min(audioPlayer.currentTime + 5, audioPlayer.duration || 0);
            }
            break;
        case "ArrowLeft":
            if (document.activeElement !== progressBar) {
                audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 5, 0);
            }
            break;
    }
});


window.addEventListener("beforeunload", saveState);

function init() {
    loadPlayCounts();

    const saved = loadState();
    if (saved) {
        currentSongIndex = saved.currentSongIndex ?? 0;
        repeatMode = saved.repeatMode ?? 0;
        isShuffle = saved.isShuffle ?? false;
        currentSort = saved.currentSort ?? "default";
        lastVolume = saved.volume ?? 1;

        const labels = ["off", "all", "one"];
        repeatBtn.dataset.mode = labels[repeatMode];
        repeatBtn.classList.toggle("active", repeatMode !== 0);
        shuffleBtn.classList.toggle("active", isShuffle);
        sortSelect.value = currentSort;
        volumeBar.value = saved.volume ?? 1;

        renderPlaylist();
        loadSong(currentSongIndex, saved.currentTime);
    } else {
        renderPlaylist();
        loadSong(currentSongIndex);
    }

    audioPlayer.volume = volumeBar.value;
    updateRangeFill(volumeBar);
    updateRangeFill(progressBar);
    setupMediaSessionHandlers();
}

init();