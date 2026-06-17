import { day4State, uberState } from '../state/index.js';

const STORAGE_KEY = 'cdev_uber_leaderboard';

// Default list of players
const DEFAULT_LEADERBOARD = [
  { name: 'Camilito', doll: 'Barbie (Marketplace)', time: '58.4s', score: 5712 },
  { name: 'Chofer de Uber', doll: 'Barbie (Marketplace)', time: '76.2s', score: 5312 },
  { name: 'Clarita', doll: 'Barbie Usada', time: '92.5s', score: 4081 },
  { name: 'Vecina de enfrente', doll: 'Barbie Usada', time: '115.0s', score: 3870 },
  { name: 'Vecina Chismosa', doll: 'Barbie Usada (Detalles)', time: '181.8s', score: 2050 }
];

export function calculateScoreDetails(seconds) {
  let dollName = 'Regalo alternativo';
  let dollLabel = 'Regalo alt.';
  let dollScore = 1000;

  const product = day4State.purchasedProduct;
  if (product) {
    if (product.id === 'barbie') {
      dollName = 'Barbie Mundial (MercadoLibre)';
      dollLabel = 'Barbie (ML)';
      dollScore = 5000;
    } else if (product.id === 'alta-real') {
      dollName = 'Barbie Mundial (Marketplace)';
      dollLabel = 'Barbie (Marketplace)';
      dollScore = 4000;
    } else if (product.id === 'media-real') {
      dollName = 'Barbie Usada - Buen estado (Marketplace)';
      dollLabel = 'Barbie Usada';
      dollScore = 3000;
    } else if (product.id === 'baja-real') {
      dollName = 'Barbie Usada - Con detalles (Marketplace)';
      dollLabel = 'Barbie Usada (Detalles)';
      dollScore = 1500;
    }
  }

  // Calculate time score with attempts multiplier: 100,000 / (seconds * attempts)
  const attemptCount = uberState.attempts || 1;
  const effectiveSeconds = seconds * attemptCount;
  const timeScore = Math.max(0, Math.round(100000 / effectiveSeconds));
  const totalScore = dollScore + timeScore;

  return {
    dollName,
    dollLabel,
    dollScore,
    timeScore,
    totalScore,
    seconds: seconds.toFixed(1),
    timeLabel: seconds.toFixed(1) + 's',
    attempts: attemptCount,
    effectiveSeconds: effectiveSeconds.toFixed(1)
  };
}

export function loadLeaderboard() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LEADERBOARD));
    return DEFAULT_LEADERBOARD;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing leaderboard data:', e);
    return DEFAULT_LEADERBOARD;
  }
}

export function saveScore(playerName, scoreDetails) {
  const board = loadLeaderboard();
  
  // Clear previous highlighted player
  board.forEach(entry => {
    delete entry.isCurrentPlayer;
  });

  const newEntry = {
    name: playerName.trim() || 'Marta',
    doll: scoreDetails.dollLabel,
    time: scoreDetails.timeLabel,
    score: scoreDetails.totalScore,
    isCurrentPlayer: true
  };

  board.push(newEntry);
  // Sort descending by score
  board.sort((a, b) => b.score - a.score);
  
  // Keep top 6 positions
  const trimmedBoard = board.slice(0, 6);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedBoard));
  return trimmedBoard;
}

export function renderScoreBreakdown(el, scoreDetails) {
  if (!el) return;
  
  let timeExplanation = `⏱️ Tiempo de viaje (${scoreDetails.timeLabel}):`;
  if (scoreDetails.attempts > 1) {
    timeExplanation = `⏱️ Tiempo (${scoreDetails.timeLabel}) × ${scoreDetails.attempts} intentos:`;
  }

  el.innerHTML = `
    <div class="uber-score-row">
      <span>🎁 ${scoreDetails.dollName}:</span>
      <span style="font-weight: 700;">+${scoreDetails.dollScore} pts</span>
    </div>
    <div class="uber-score-row">
      <span>${timeExplanation}</span>
      <span style="font-weight: 700;">+${scoreDetails.timeScore} pts</span>
    </div>
    <div class="uber-score-row uber-score-row-total">
      <span>PUNTAJE TOTAL:</span>
      <span>${scoreDetails.totalScore} pts</span>
    </div>
  `;
}

export function renderLeaderboardTable(bodyEl, board) {
  if (!bodyEl) return;
  bodyEl.innerHTML = '';
  
  board.forEach((entry, index) => {
    const tr = document.createElement('tr');
    if (entry.isCurrentPlayer) {
      tr.className = 'uber-leaderboard-row-highlight';
    }
    
    // Position column icon/number
    let rankText = `${index + 1}°`;
    if (index === 0) rankText = '🥇';
    else if (index === 1) rankText = '🥈';
    else if (index === 2) rankText = '🥉';

    tr.innerHTML = `
      <td style="padding: 8px 6px; font-weight: 700; text-align: center;">${rankText}</td>
      <td style="padding: 8px 6px;">${escapeHtml(entry.name)}</td>
      <td style="padding: 8px 6px; color: #a1a1aa;">${entry.doll}</td>
      <td style="padding: 8px 6px; font-family: monospace; color: #a1a1aa;">${entry.time}</td>
      <td style="padding: 8px 6px; font-weight: bold; text-align: right; color: #fbbf24;">${entry.score}</td>
    `;
    bodyEl.appendChild(tr);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
