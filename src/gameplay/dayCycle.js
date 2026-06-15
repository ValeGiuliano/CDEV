import {
  gameState,
  missionsState,
  cinematicState,
  dayTransitionState,
  phoneState,
} from '../state/index.js';
import { ui } from '../utils/dom.js';

let deps = null;
let day2StartInProgress = false;

export function initDayCycle(dependencies) {
  deps = dependencies;
}

function areAllMissionsComplete() {
  return missionsState.completed === true;
}

function showDaysBlockedModal() {
  if (ui.daysBlockedModal) {
    ui.daysBlockedModal.setAttribute('aria-hidden', 'false');
  }
}

export function hideDaysBlockedModal() {
  if (ui.daysBlockedModal) {
    ui.daysBlockedModal.setAttribute('aria-hidden', 'true');
  }
}

function startDayTransition(onEnd) {
  if (cinematicState.active) return;
  if (!areAllMissionsComplete()) {
    showDaysBlockedModal();
    return;
  }
  dayTransitionState.active = true;
  dayTransitionState.progress = 0;
  dayTransitionState.phase = 'fade-in';
  dayTransitionState.onEnd = onEnd;
  cinematicState.active = true;
}

export function updateDayTransition(dt) {
  if (!dayTransitionState.active) return;

  const speed = 1.8;
  dayTransitionState.progress += dt * speed;

  if (dayTransitionState.phase === 'fade-in') {
    if (dayTransitionState.progress >= 1) {
      dayTransitionState.progress = 1;
      if (dayTransitionState.onEnd) dayTransitionState.onEnd();
      dayTransitionState.phase = 'fade-out';
      dayTransitionState.progress = 0;
    }
  } else if (dayTransitionState.phase === 'fade-out') {
    if (dayTransitionState.progress >= 1) {
      dayTransitionState.progress = 1;
      dayTransitionState.active = false;
      cinematicState.active = false;
    }
  }
}

export function getDayTransitionOpacity() {
  if (!dayTransitionState.active) return 0;
  if (dayTransitionState.phase === 'fade-in') {
    return dayTransitionState.progress;
  } else {
    return 1 - dayTransitionState.progress;
  }
}

export function sleepToNextDay() {
  if (!deps) return;
  startDayTransition(() => {
    gameState.currentDay++;
    if (ui.dayCounter) ui.dayCounter.textContent = 'Día ' + gameState.currentDay;
    missionsState.currentMissionId = null;
    missionsState.active = false;
    missionsState.completed = false;
    if (gameState.currentDay === 2) {
      startDay2();
    } else if (gameState.currentDay === 3) {
      startDay3();
    }
  });
}

export function startDay2() {
  if (!deps) return;
  if (day2StartInProgress) return;
  day2StartInProgress = true;
  const {
    camera,
    lookEuler,
    canvas,
    startCinematic,
    day2WakeUpSequence,
    setDayRestarted,
    playNotificationSound,
    startClaraBirthdayMission,
    switchPhoneView,
    renderContactList,
    openContactChat,
    startClaraBirthdayFlow,
  } = deps;

  camera.position.set(4.2, 0.72, 3.45);
  lookEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);

  function waitForTransition() {
    if (dayTransitionState.active) {
      requestAnimationFrame(waitForTransition);
      return;
    }

    startCinematic(day2WakeUpSequence, () => {
      camera.position.set(4.2, 1.48, 3.8);
      lookEuler.set(0, Math.PI, 0);
      camera.quaternion.setFromEuler(lookEuler);

      setDayRestarted(false);

      setTimeout(() => {
        playNotificationSound();
        phoneState.active = true;
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock();
        }
        if (ui.phonePrompt) {
          ui.phonePrompt.textContent = 'T Guardar teléfono';
          ui.phonePrompt.classList.add('is-active');
        }
        startClaraBirthdayMission();
        switchPhoneView('phoneMessagesView');
        setTimeout(() => {
          renderContactList();
          openContactChat('camilo');
          setTimeout(() => {
            startClaraBirthdayFlow();
            day2StartInProgress = false;
          }, 500);
        }, 200);
      }, 5000);
    });
  }

  waitForTransition();
}

export function startDay3() {
  if (ui.missionsContainer) {
    ui.missionsContainer.setAttribute('aria-hidden', 'false');
    if (ui.missionTitle) ui.missionTitle.textContent = 'Fin del Día 2';
    if (ui.missionText) ui.missionText.textContent = 'Marta se acuesta tranquila. La Barbie llegará mañana y Clara estará feliz. ❤️';
    if (ui.missionCard) ui.missionCard.classList.add('is-completed');
  }
}
