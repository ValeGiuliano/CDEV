export const dilemmaTutorial = {
  title: 'Respuesta a Camilo',
  description: 'Tu hijo te mandó un mensaje tan bonito. ¿Qué le respondés?',
  optionA: {
    label: 'Enviarle un regalito de agradecimiento',
    successRate: 0,
    positive: {
      description: 'Le mandás un detallito por correo. A Camilo le llega y se emociona mucho.',
      effects: { happiness: 20, money: -30, calm: 5 },
    },
    negative: {
      description: 'Gastás un poco más de lo esperado en el regalo, pero la intención vale.',
      effects: { happiness: 15, money: -50, calm: 5 },
    },
  },
  optionB: {
    label: 'Agradecerle con el corazón',
    successRate: 0,
    positive: {
      description: 'Le contestás con palabras bonitas. Camilo sabe que tu cariño no tiene precio.',
      effects: { happiness: 10, money: 0, calm: -5 },
    },
    negative: {
      description: 'Tu tranquilidad se resiente un poco por no poder darle más.',
      effects: { happiness: 5, money: 0, calm: -10 },
    },
  },
};

export const mlGiftsDilemma = {
  title: '¡Día especial!',
  description: 'Es el cumpleaños de alguien especial. ¿Qué le regalás?',
  optionA: {
    label: '🎮 PlayStation 5',
    successRate: 1,
    positive: {
      description: '¡Le gustó DEMASIADO! No para de agradecer. ¡Todos te admiran!',
      effects: { happiness: 40, calm: -15, money: -200 },
    },
    negative: {
      description: 'Igual le gustó mucho, pero el bolsillo llora.',
      effects: { happiness: 35, calm: -10, money: -200 },
    },
  },
  optionB: {
    label: '⚽ Pelota',
    successRate: 1,
    positive: {
      description: 'Un regalo sencillo pero con cariño. ¡Está feliz!',
      effects: { happiness: 15, calm: 5, money: -30 },
    },
    negative: {
      description: 'No es lo que esperaba, pero la intención vale.',
      effects: { happiness: 10, calm: 0, money: -30 },
    },
  },
  optionC: {
    label: '😢 Nada',
    successRate: 1,
    positive: {
      description: '...se nota la situación. La persona entiende pero está muy triste.',
      effects: { happiness: -30, calm: -5, money: 0 },
    },
    negative: {
      description: 'La persona se pone muy triste. La relación se enfría.',
      effects: { happiness: -40, calm: -10, money: 0 },
    },
  },
};
