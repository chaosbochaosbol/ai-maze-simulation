export class UIController {
  constructor() {
    this.elements = {
      episodeTime: document.getElementById("episodeTime"),
      redWins: document.getElementById("redWins"),
      blueWins: document.getElementById("blueWins"),
      speedDisplay: document.getElementById("speedDisplay"),
      epsilon: document.getElementById("epsilon"),
      episodeIndex: document.getElementById("episodeIndex"),
      toggleSim: document.getElementById("toggleSim"),
      resetLearning: document.getElementById("resetLearning"),
      speedButtons: Array.from(document.querySelectorAll(".speed")),
      debugToggle: document.getElementById("debugToggle"),
      redState: document.getElementById("redState"),
      blueState: document.getElementById("blueState"),
    };
  }

  bind({ onToggle, onReset, onSpeedChange, onDebugToggle }) {
    this.elements.toggleSim.addEventListener("click", onToggle);
    this.elements.resetLearning.addEventListener("click", onReset);
    this.elements.speedButtons.forEach((button) => {
      button.addEventListener("click", () => onSpeedChange(Number(button.dataset.speed)));
    });
    this.elements.debugToggle.addEventListener("change", (event) => onDebugToggle(event.target.checked));
  }

  updateStatus({
    episodeTime,
    redWins,
    blueWins,
    speed,
    epsilon,
    episodeIndex,
    running,
    redState,
    blueState,
  }) {
    this.elements.episodeTime.textContent = episodeTime.toFixed(1);
    this.elements.redWins.textContent = redWins;
    this.elements.blueWins.textContent = blueWins;
    this.elements.speedDisplay.textContent = `x${speed}`;
    this.elements.epsilon.textContent = epsilon.toFixed(2);
    this.elements.episodeIndex.textContent = episodeIndex;
    this.elements.toggleSim.textContent = running ? "Pause" : "Start";
    this.elements.redState.textContent = redState;
    this.elements.blueState.textContent = blueState;
  }

  setSpeedActive(speed) {
    this.elements.speedButtons.forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.speed) === speed);
    });
  }
}
