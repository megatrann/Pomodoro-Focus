const modeBtns = document.querySelectorAll(".mode-btn");
const timerDisplay = document.getElementById("time");
const statusMessage = document.getElementById("status");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const skipBtn = document.getElementById("skip");
const focusInput = document.getElementById("focusInput");
const shortInput = document.getElementById("shortInput");
const longInput = document.getElementById("longInput");
const year = document.getElementById("year");

const alarmSound = new Audio("alarm.mp3");
alarmSound.preload = "auto";

let timer = null;
let mode = "focus";
let timeLeft = 25 * 60;
let endTimeMs = null;
let isRunning = false;
let wakeLock = null;
let completedFocusInCycle = 0;

function clampMinutes(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 180);
}

function getModeDurationSeconds(currentMode) {
    if (currentMode === "focus") return clampMinutes(focusInput.value) * 60;
    if (currentMode === "short") return clampMinutes(shortInput.value) * 60;
    return clampMinutes(longInput.value) * 60;
}

function updateScreen() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    try {
        await Notification.requestPermission();
    } catch (error) {
        console.error("Notification permission request failed:", error);
    }
}

function showNotification() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    new Notification("Pomodoro Timer", {
        body: "Time is up! Start your next session.",
        silent: false
    });
}

function getNextModeAfterCompletion(completedMode) {
    if (completedMode === "focus") {
        completedFocusInCycle += 1;
        return completedFocusInCycle >= 4 ? "long" : "short";
    }

    if (completedMode === "long") {
        completedFocusInCycle = 0;
    }

    return "focus";
}

function getReadyMessage(currentMode) {
    if (currentMode === "focus") return "Ready to focus";
    if (currentMode === "short") return "Short break";
    return "Long break";
}

async function requestWakeLock() {
    if (!("wakeLock" in navigator) || wakeLock) return;

    try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
            wakeLock = null;
        });
    } catch (error) {
        console.warn("Wake lock not available:", error.message);
    }
}

async function releaseWakeLock() {
    if (!wakeLock) return;
    try {
        await wakeLock.release();
    } catch (error) {
        console.warn("Wake lock release failed:", error.message);
    }
    wakeLock = null;
}

async function unlockAudio() {
    try {
        alarmSound.muted = true;
        await alarmSound.play();
        alarmSound.pause();
        alarmSound.currentTime = 0;
    } catch (error) {
        console.warn("Audio unlock blocked until user allows media:", error.message);
    } finally {
        alarmSound.muted = false;
    }
}

function playAlarm() {
    alarmSound.currentTime = 0;
    alarmSound.play().catch((error) => {
        console.warn("Alarm playback blocked:", error.message);
        statusMessage.textContent = "Time up. Tap Start or screen to enable sound.";
    });

    if ("vibrate" in navigator) {
        navigator.vibrate([300, 150, 300]);
    }
}

function stopTicker() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    endTimeMs = null;
}

function onTimerComplete() {
    const completedMode = mode;
    const nextMode = getNextModeAfterCompletion(completedMode);

    stopTicker();
    timeLeft = 0;
    updateScreen();
    statusMessage.textContent = `Time up! Next: ${nextMode === "focus" ? "Focus" : nextMode === "short" ? "Short Break" : "Long Break"}`;
    playAlarm();
    showNotification();

    // Auto-advance through: Focus -> Short -> Focus -> Short -> Focus -> Short -> Focus -> Long
    setTimeout(() => {
        modes(nextMode);
        startTimer();
    }, 800);
}

function tick() {
    if (!isRunning || endTimeMs === null) return;
    const remaining = Math.ceil((endTimeMs - Date.now()) / 1000);
    if (remaining <= 0) {
        onTimerComplete();
        return;
    }

    if (remaining !== timeLeft) {
        timeLeft = remaining;
        updateScreen();
    }
}

async function startTimer() {
    if (isRunning) return;

    await requestNotificationPermission();
    await unlockAudio();
    await requestWakeLock();

    isRunning = true;
    endTimeMs = Date.now() + timeLeft * 1000;
    statusMessage.textContent = mode === "focus" ? "Focusing..." : "Break running...";
    timer = setInterval(tick, 250);
    tick();
}

function pauseTimer() {
    if (!isRunning) return;
    tick();
    stopTicker();
    releaseWakeLock();
    statusMessage.textContent = "Paused";
}

function resetTimer() {
    stopTicker();
    releaseWakeLock();
    timeLeft = getModeDurationSeconds(mode);
    statusMessage.textContent = getReadyMessage(mode);
    updateScreen();
}

function modes(newMode) {
    mode = newMode;
    stopTicker();
    releaseWakeLock();

    modeBtns.forEach((btn) => btn.classList.remove("active"));
    const activeBtn = document.querySelector(`[data-mode="${newMode}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    timeLeft = getModeDurationSeconds(newMode);
    statusMessage.textContent = getReadyMessage(newMode);
    updateScreen();
}

function skipTimer() {
    if (mode === "focus") {
        const nextBreak = completedFocusInCycle >= 3 ? "long" : "short";
        modes(nextBreak);
        return;
    }
    modes("focus");
}

function sanitizeInput(inputEl) {
    const safeValue = clampMinutes(inputEl.value);
    inputEl.value = safeValue;
}

function bindInputValidation(inputEl) {
    inputEl.addEventListener("change", () => {
        sanitizeInput(inputEl);
        if (!isRunning) {
            timeLeft = getModeDurationSeconds(mode);
            updateScreen();
        }
    });
}

document.addEventListener("visibilitychange", async () => {
    if (isRunning) {
        tick();
        if (!document.hidden) {
            await requestWakeLock();
        }
    }
});

window.addEventListener("focus", tick);
window.addEventListener("pageshow", tick);

year.textContent = new Date().getFullYear();
sanitizeInput(focusInput);
sanitizeInput(shortInput);
sanitizeInput(longInput);
modes("focus");

modeBtns.forEach((btn) => btn.addEventListener("click", () => modes(btn.dataset.mode)));
bindInputValidation(focusInput);
bindInputValidation(shortInput);
bindInputValidation(longInput);
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
skipBtn.addEventListener("click", skipTimer);
