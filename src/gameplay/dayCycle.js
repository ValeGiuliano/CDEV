import {
  gameState,
  missionsState,
  cinematicState,
  dayTransitionState,
  phoneState,
  installedApps,
  day4State,
  day4InitialMoney,
  statsState,
} from '../state/index.js';
import { ui } from '../utils/dom.js';
import { completeMission, setMission, startDay4BuyMission } from './missions.js';
import { setTimeOfDay } from '../core/renderer.js';
import { updatePhoneHomeApps } from '../phone/index.js';

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
  if (missionsState.currentMissionId === 'goToSleep') {
    completeMission('goToSleep');
  }
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
    } else if (gameState.currentDay === 4) {
      startDay4();
    } else if (gameState.currentDay === 5) {
      startDay5();
    }
  });
}

export function startDay2() {
  if (!deps) return;
  day2StartInProgress = false;
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

  setTimeOfDay('dia', 0.0);

  function waitForTransition() {
    if (dayTransitionState.active) {
      requestAnimationFrame(waitForTransition);
      return;
    }

    startCinematic(day2WakeUpSequence, () => {
      camera.position.set(4.2, 1.48, 3.8);
      lookEuler.set(0, 0, 0);
      camera.quaternion.setFromEuler(lookEuler);

      phoneState.wifiEnabled = false;
      setDayRestarted(false);

      setTimeout(() => {
        playNotificationSound();
        startClaraBirthdayMission();
        switchPhoneView('phoneMessagesView');
        renderContactList();
        openContactChat('camilo');
        startClaraBirthdayFlow();
        day2StartInProgress = false;
      }, 5000);
    });
  }

  waitForTransition();
}

export function startDay3() {
  if (!deps) return;
  const {
    camera,
    lookEuler,
    startCinematic,
    day3WakeUpSequence,
  } = deps;

  camera.position.set(4.2, 0.72, 3.45);
  lookEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);

  setTimeOfDay('dia', 0.0);

  function waitForTransition() {
    if (dayTransitionState.active) {
      requestAnimationFrame(waitForTransition);
      return;
    }

    startCinematic(day3WakeUpSequence, () => {
      camera.position.set(4.2, 1.48, 3.8);
      lookEuler.set(0, 0, 0);
      camera.quaternion.setFromEuler(lookEuler);

      // Unlock Google search app on Day 3 morning
      installedApps.browser = true;
      updatePhoneHomeApps();

      // Start the mission to fix the card
      setMission('fixBankCard', 'Solucionar tarjeta', 'Usa el navegador de tu celular para buscar "Banco Nación" y solucionar el bloqueo de tu tarjeta.');
    });
  }

  waitForTransition();
}

export function startDay4() {
  if (!deps) return;
  const { camera, lookEuler, startCinematic, day4WakeUpSequence, playNotificationSound } = deps;

  camera.position.set(4.2, 0.72, 3.45);
  lookEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);

  day4InitialMoney.value = statsState.money;

  setTimeOfDay('dia', 0.0);

  function waitForTransition() {
    if (dayTransitionState.active) {
      requestAnimationFrame(waitForTransition);
      return;
    }

    startCinematic(day4WakeUpSequence, () => {
      camera.position.set(4.2, 1.48, 3.8);
      lookEuler.set(0, 0, 0);
      camera.quaternion.setFromEuler(lookEuler);

      installedApps.playstore = true;
      installedApps.mercadolibre = true;
      updatePhoneHomeApps();

      setTimeout(() => {
        playNotificationSound();
        startDay4BuyMission();
      }, 4000);
    });
  }

  waitForTransition();
}

export function startDay5() {
  if (!deps) return;
  if (ui.missionsContainer) {
    ui.missionsContainer.setAttribute('aria-hidden', 'false');
    if (ui.missionTitle) ui.missionTitle.textContent = 'Día 5 — Cumpleaños de Clara';
    if (ui.missionText) ui.missionText.textContent = '¡Hoy es el cumpleaños de Clara! Continuará...';
    if (ui.missionCard) ui.missionCard.classList.remove('is-completed');
  }
}
