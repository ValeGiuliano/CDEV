import { cinematicState } from '../state/index.js';
import { ui } from '../utils/dom.js';

let camera = null;
let canvas = null;
let playCinematicSoundFn = null;

export function initCinematicEngine(options) {
  camera = options.camera;
  canvas = options.canvas;
  playCinematicSoundFn = options.playCinematicSound;
}

export function startCinematic(sequence, onEnd) {
  if (canvas && document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  cinematicState.active = true;
  cinematicState.currentStep = 0;
  cinematicState.timer = 0;
  cinematicState.sequence = sequence;
  cinematicState.waitingForSpace = false;
  cinematicState.onEnd = onEnd || null;

  cinematicState.savedCamPos.copy(camera.position);
  cinematicState.savedCamQuat.copy(camera.quaternion);

  document.body.classList.add('cinematic-active');

  if (ui.cinematicOverlay) {
    ui.cinematicOverlay.setAttribute('aria-hidden', 'false');
  }
  if (ui.cinematicPrompt) {
    ui.cinematicPrompt.classList.remove('is-visible');
  }

  const firstStep = sequence[0];
  if (firstStep) {
    if (firstStep.onStart) firstStep.onStart();
    if (firstStep.dialogue) {
      if (ui.cinematicSpeaker) ui.cinematicSpeaker.textContent = firstStep.dialogue.speaker;
      if (ui.cinematicText) ui.cinematicText.textContent = firstStep.dialogue.text;
    }
    if (firstStep.sound && typeof playCinematicSoundFn === 'function') {
      playCinematicSoundFn(firstStep.sound);
    }
  }
}

export function advanceCinematicStep() {
  if (!cinematicState.active || !cinematicState.sequence) return;

  const currentStepObj = cinematicState.sequence[cinematicState.currentStep];
  if (currentStepObj && currentStepObj.action) {
    currentStepObj.action(1.0, 0);
  }

  cinematicState.currentStep++;
  cinematicState.timer = 0;
  cinematicState.waitingForSpace = false;

  const nextStep = cinematicState.sequence[cinematicState.currentStep];
  if (nextStep) {
    if (nextStep.onStart) nextStep.onStart();
    if (nextStep.dialogue) {
      if (ui.cinematicSpeaker) ui.cinematicSpeaker.textContent = nextStep.dialogue.speaker;
      if (ui.cinematicText) ui.cinematicText.textContent = nextStep.dialogue.text;
    }
    if (nextStep.sound && typeof playCinematicSoundFn === 'function') {
      playCinematicSoundFn(nextStep.sound);
    }
    if (ui.cinematicPrompt) ui.cinematicPrompt.classList.remove('is-visible');
  } else {
    endCinematic();
  }
}

export function endCinematic() {
  cinematicState.active = false;
  cinematicState.waitingForSpace = false;
  document.body.classList.remove('cinematic-active');
  if (ui.cinematicOverlay) ui.cinematicOverlay.setAttribute('aria-hidden', 'true');
  if (ui.cinematicPrompt) ui.cinematicPrompt.classList.remove('is-visible');

  camera.position.copy(cinematicState.savedCamPos);
  camera.quaternion.copy(cinematicState.savedCamQuat);

  if (cinematicState.onEnd) {
    const cb = cinematicState.onEnd;
    cinematicState.onEnd = null;
    cb();
  }
}

export function updateCinematic(dt) {
  if (!cinematicState.active || !cinematicState.sequence) return;

  const step = cinematicState.sequence[cinematicState.currentStep];
  if (!step) {
    endCinematic();
    return;
  }

  if (!cinematicState.waitingForSpace) {
    cinematicState.timer += dt;
    const progress = Math.min(1, cinematicState.timer / step.duration);

    if (step.action) step.action(progress, dt);

    if (cinematicState.timer >= step.duration) {
      if (step.autoAdvance) {
        advanceCinematicStep();
      } else {
        cinematicState.waitingForSpace = true;
        if (ui.cinematicPrompt) ui.cinematicPrompt.classList.add('is-visible');
      }
    }
  }
}
