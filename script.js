const modeBtns = document.querySelectorAll(".mode-btn"); 
const timerDisplay = document.getElementById("time");
const statusMassege = document.getElementById("status");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const skipBtn = document.getElementById("skip");
const focusInput = document.getElementById("focusInput");
const shortInput = document.getElementById("shortInput");
const longInput = document.getElementById("longInput");
const year = document.getElementById("year");

let timer = null;
let timeLeft = 25 * 60;
let mode = "focus";

function updateScreen() {
    const minutes = Math.floor(timeLeft/60);
    const seconds = timeLeft%60;
    timerDisplay.textContent = `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

function modes(newMode) {
    mode = newMode;
    modeBtns.forEach(btn => btn.classList.remove("active"));
    document.querySelector(`[data-mode=${newMode}]`).classList.add("active");

    if (newMode === "focus") {
        timeLeft = Number(focusInput.value) * 60;
        statusMassege.textContent = "Ready to focus";
    } else if (newMode === "short") {
        timeLeft = Number(shortInput.value) * 60;
        statusMassege.textContent = "Short break"
    } else {
        timeLeft = Number(longInput.value) * 60;
        statusMassege.textContent = "Long Break"
    }
    updateScreen();
}

function startTimer() {
    if (timer) return;

    timer = setInterval(() => {
        timeLeft--;
        updateScreen();

    if (timeLeft == 0) {
        clearInterval(timer);
        timer = null;
        statusMassege.textContent = "Time Up!..."
    }    
    }, 1000)
}

function pauseTimer() {
    clearInterval(timer);
    timer = null;
}

function resetTimer() {
    clearInterval(timer);
    timer = null;

    if (mode === "focus") {
        timeLeft = Number(focusInput.value) * 60;
        updateScreen();
    } else if (mode === "short") {
        timeLeft = Number(shortInput.value) * 60;
        updateScreen();
    } else {
        timeLeft = Number(longInput.value) * 60;
        updateScreen();
    }
}

function skipTimer() {
    clearInterval(timer);
    timer = null;

    if (mode === "focus") {
        modes("short");
    } else {
        modes("focus");
    }
}


const tomatoSpan = document.getElementById("tomato");

// Add the tomato emoji
tomatoSpan.textContent = "🍅";

// Parse it with Twemoji to show the color emoji on all devices
twemoji.parse(tomatoSpan, {
  folder: 'svg',
  ext: '.svg'
});



year.textContent = new Date().getFullYear();
modeBtns.forEach(btn => btn.addEventListener("click", () => modes(btn.dataset.mode)));
startBtn.addEventListener("click",startTimer);
pauseBtn.addEventListener("click",pauseTimer);
resetBtn.addEventListener("click",resetTimer);
skipBtn.addEventListener("click",skipTimer)
