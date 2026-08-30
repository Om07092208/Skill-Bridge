/**
 * SkillBridge Aptitude Arena - Real-Time Backend & Client Controller
 * Full Socket.IO multiplayer with offline simulation fallback
 *
 * Game Rules Preserved:
 *  - 10 questions per round
 *  - 4 options per question
 *  - Categories: Quantitative Aptitude, Logical Reasoning, Verbal Ability
 *  - Dynamic Timers: Easy (30s), Medium (60s), Hard (90s)
 *  - Live Leaderboard with Server-Authoritative Scoring (+60 speed bonus, +40 standard)
 *  - Timeout = 0 pts with auto-advance
 *  - Play Again in same room with clean reset
 */

const ArenaApp = (() => {
  // ==========================================
  // 1. CONFIGURATION & STATE
  // ==========================================
  const CONFIG = {
    USE_REALTIME_BACKEND: true,
    BACKEND_URL: (window.location.hostname && window.location.hostname !== 'localhost')
      ? `http://${window.location.hostname}:3000`
      : 'http://localhost:3000'
  };

  const state = {
    // Connection
    socket: null,
    isRealtimeActive: false,
    currentView: 'home',
    soundEnabled: true,
    roomCode: '7K4P9',
    userName: 'Rahul (YOU)',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    playerId: null,
    isHost: true,
    isUserReady: true,
    isPlayer4Ready: false,

    // Instructions Modal Countdown
    instructionsTimer: null,
    instructionsSecondsLeft: 3,

    // Gameplay state
    currentQuestionIndex: 0,
    currentQuestionData: null,
    questionTimeLimit: 30,
    timeRemaining: 30,
    timerInterval: null,
    questionStartTime: 0,
    questionLocked: false,
    matchInProgress: false,
    userAnswers: [],
    finalResults: null,

    // Participants (starts with only the real user, dynamically updates on join)
    players: [
      { id: 'user', name: 'Rahul (Host)', isUser: true, isHost: true, isReady: true, score: 0, rank: 1, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', correct: 0, totalTime: 0 }
    ],

    // Offline question bank fallback
    fallbackQuestions: [
      { id: 'Q01', category: 'Quantitative Aptitude', difficulty: 'Easy',   timeLimit: 30, prompt: 'If a train travels at 60 km/h, how long does it take to cover a distance of 150 km?', options: ['2 hours', '2.5 hours', '3 hours', '3.5 hours'], correctIndex: 1, explanation: 'Time = Distance / Speed = 150 / 60 = 2.5 hours (2 hours 30 mins).' },
      { id: 'Q02', category: 'Logical Reasoning',     difficulty: 'Easy',   timeLimit: 30, prompt: 'Find the missing number in the series: 4, 9, 19, 39, 79, ?', options: ['119', '149', '159', '169'], correctIndex: 2, explanation: 'Pattern: Each term is (previous term * 2) + 1. 79 * 2 + 1 = 159.' },
      { id: 'Q03', category: 'Verbal Ability',        difficulty: 'Easy',   timeLimit: 30, prompt: 'Select the word that is most opposite in meaning (Antonym) to "CANDID":', options: ['Deceptive', 'Blunt', 'Frank', 'Sincere'], correctIndex: 0, explanation: 'Candid means truthful and straightforward; deceptive is the direct antonym.' },
      { id: 'Q04', category: 'Quantitative Aptitude', difficulty: 'Easy',   timeLimit: 30, prompt: 'A shirt originally priced at $80 is on sale for 25% off. What is the sale price?', options: ['$55', '$60', '$65', '$70'], correctIndex: 1, explanation: 'Discount = 25% of 80 = $20. Sale Price = 80 - 20 = $60.' },
      { id: 'Q05', category: 'Logical Reasoning',     difficulty: 'Medium', timeLimit: 60, prompt: 'If "APPLE" is coded as "EQTPI" in a certain language, what does "ORANGE" code to?', options: ['SVCPKI', 'SVERKI', 'SVEOKI', 'TUERLI'], correctIndex: 1, explanation: 'Each letter is shifted forward by 4 positions in the alphabet: O->S, R->V, A->E, N->R, G->K, E->I.' },
      { id: 'Q06', category: 'Verbal Ability',        difficulty: 'Medium', timeLimit: 60, prompt: 'Choose the correct grammatical completion: "Neither the manager nor the employees _____ present at the briefing."', options: ['was', 'were', 'is', 'has been'], correctIndex: 1, explanation: 'In "neither...nor" constructions, the verb agrees with the closer subject ("employees", plural).' },
      { id: 'Q07', category: 'Quantitative Aptitude', difficulty: 'Medium', timeLimit: 60, prompt: 'Pipe A can fill a tank in 6 hours, while Pipe B can fill it in 3 hours. How long will it take if both operate together?', options: ['1.5 hours', '2 hours', '2.5 hours', '4.5 hours'], correctIndex: 1, explanation: 'Combined rate = 1/6 + 1/3 = 1/2 tank/hr. Thus, 2 hours to fill completely.' },
      { id: 'Q08', category: 'Logical Reasoning',     difficulty: 'Hard',   timeLimit: 90, prompt: 'Statements: All roses are flowers. Some flowers fade quickly. Conclusion: Some roses fade quickly.', options: ['Definitely True', 'Definitely False', 'Cannot be determined', 'Logically invalid'], correctIndex: 2, explanation: 'We know roses are flowers and some flowers fade, but we cannot deduce if those specific flowers are roses.' },
      { id: 'Q09', category: 'Quantitative Aptitude', difficulty: 'Hard',   timeLimit: 90, prompt: 'What is the compound interest on $1,000 for 2 years at 10% per annum compounded annually?', options: ['$200', '$210', '$220', '$250'], correctIndex: 1, explanation: 'Amount = 1000 * (1.1)^2 = 1210. CI = 1210 - 1000 = $210.' },
      { id: 'Q10', category: 'Verbal Ability',        difficulty: 'Medium', timeLimit: 60, prompt: 'Identify the idiom meaning "to face a difficult situation with courage and fortitude":', options: ['Bite the bullet', 'Spill the beans', 'Break the ice', 'Burn bridges'], correctIndex: 0, explanation: '"Bite the bullet" means to endure a painful or difficult situation that is seen as unavoidable.' }
    ]
  };

  // ==========================================
  // 2. SOCKET.IO REAL-TIME CLIENT
  // ==========================================
  const initSocket = () => {
    if (!CONFIG.USE_REALTIME_BACKEND || typeof io === 'undefined') {
      console.log('[ARENA] Running in local simulation mode.');
      state.isRealtimeActive = false;
      return;
    }

    try {
      state.socket = io(CONFIG.BACKEND_URL, {
        reconnectionAttempts: 5,
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      state.socket.on('connect', () => {
        state.isRealtimeActive = true;
        console.log(`[SOCKET] Connected to backend on ${CONFIG.BACKEND_URL} (${state.socket.id})`);
        showToast('Connected to Real-Time Matchmaker');
      });

      state.socket.on('disconnect', () => {
        state.isRealtimeActive = false;
        console.log('[SOCKET] Disconnected from backend.');
        showToast('Disconnected from server (Fallback enabled)');
      });

      state.socket.on('connect_error', (err) => {
        state.isRealtimeActive = false;
        console.warn('[SOCKET] Connection error:', err.message);
      });

      // --- Room Events ---
      state.socket.on('room:created', (data) => {
        state.roomCode = data.roomCode;
        state.isHost = true;
        state.isUserReady = true;
        state.playerId = data.player?.id || state.playerId;
        try {
          sessionStorage.setItem('arena_player_id', state.playerId);
          sessionStorage.setItem('arena_room_code', data.roomCode);
        } catch (e) {}
        syncPlayersFromBackend(data.players);
        showToast(`Room created: ${data.roomCode}`);
        switchView('waiting-room');
      });

      state.socket.on('room:joined', (data) => {
        state.roomCode = data.roomCode;
        state.isHost = data.player?.isHost || false;
        state.isUserReady = data.player?.isReady || false;
        state.playerId = data.player?.id || state.playerId;
        try {
          sessionStorage.setItem('arena_player_id', state.playerId);
          sessionStorage.setItem('arena_room_code', data.roomCode);
        } catch (e) {}
        syncPlayersFromBackend(data.players);

        if (data.isReconnect && data.gameState) {
          showToast(`Reconnected to active match (Q${data.gameState.questionNumber})!`);
          state.matchInProgress = true;
          state.currentQuestionIndex = data.gameState.questionNumber - 1;
          state.currentQuestionData = data.gameState.question;
          state.questionTimeLimit = data.gameState.timeLimit;
          state.timeRemaining = data.gameState.timeRemaining;
          state.questionLocked = data.gameState.isAnswered;
          switchView('live');
          if (data.gameState.question) {
            renderServerQuestion({
              questionNumber: data.gameState.questionNumber,
              totalQuestions: data.gameState.totalQuestions,
              question: data.gameState.question,
              timeLimit: data.gameState.timeLimit,
              startedAt: Date.now() - (data.gameState.timeLimit - data.gameState.timeRemaining) * 1000
            });
            if (data.gameState.isAnswered) {
              document.querySelectorAll('.option-btn').forEach(btn => btn.setAttribute('disabled', 'true'));
            }
          }
        } else {
          showToast(`Joined room: ${data.roomCode}`);
          switchView('waiting-room');
        }
      });

      state.socket.on('room:players', (data) => {
        if (data.roomCode === state.roomCode) {
          syncPlayersFromBackend(data.players);
          if (state.currentView === 'waiting-room') {
            renderWaitingRoom();
          }
        }
      });

      // --- Match Progression Events ---
      state.socket.on('game:starting', (data) => {
        if (data.roomCode === state.roomCode) {
          showInstructionsModal();
        }
      });

      state.socket.on('game:started', (data) => {
        if (data.roomCode === state.roomCode) {
          closeInstructionsModal();
          showToast('Arena Battle in progress!');
          switchView('live');
        }
      });

      state.socket.on('question:started', (data) => {
        state.currentQuestionIndex = data.questionNumber - 1;
        state.currentQuestionData = data.question;
        state.questionTimeLimit = data.timeLimit;
        state.timeRemaining = data.timeLimit;
        state.questionStartTime = data.startedAt || Date.now();
        state.questionLocked = false;

        renderServerQuestion(data);
      });

      state.socket.on('answer:result', (data) => {
        handleServerAnswerResult(data);
      });

      state.socket.on('leaderboard:update', (data) => {
        syncPlayersFromBackend(data.players);
        if (state.currentView === 'live') {
          updateLiveStandings();
        }
      });

      state.socket.on('game:finished', (data) => {
        state.finalResults = data;
        state.matchInProgress = false;
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        playBeep('correct');
        showToast('Match completed! Generating standings...');
        setTimeout(() => switchView('results'), 800);
      });

      state.socket.on('round:reset', (data) => {
        state.matchInProgress = false;
        state.userAnswers = [];
        state.currentQuestionIndex = 0;
        state.questionLocked = false;
        syncPlayersFromBackend(data.players);
        showToast('Room reset for new round!');
        switchView('waiting-room');
      });

      state.socket.on('server:error', (data) => {
        showToast(`Server: ${data.message || data.error}`);
      });

    } catch (e) {
      console.error('[SOCKET INIT FAILED]', e);
      state.isRealtimeActive = false;
    }
  };

  const syncPlayersFromBackend = (backendPlayers) => {
    if (!backendPlayers || !Array.isArray(backendPlayers)) return;

    state.players = backendPlayers.map((p, idx) => {
      const isSelf = (p.socketId && state.socket && p.socketId === state.socket.id) ||
                     (p.id && state.playerId && p.id === state.playerId) ||
                     (p.isHost && state.isHost && !state.socket);

      if (isSelf) {
        state.isHost = !!p.isHost;
        state.isUserReady = !!p.isReady;
      }

      const rawName = p.name || p.playerName || 'Player';
      const cleanName = rawName.replace(/\s*\(YOU\)/gi, '').trim();

      return {
        id: p.id || p.playerId || `p_${idx}`,
        name: cleanName,
        isUser: isSelf,
        isHost: !!p.isHost,
        isReady: !!p.isReady,
        score: p.score || 0,
        rank: p.rank || idx + 1,
        avatar: p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        correct: p.correctCount || p.correct || 0,
        totalTime: p.totalTime || 0,
        isDisconnected: !!p.isDisconnected
      };
    });
  };

  // ==========================================
  // 3. AUDIO SYNTHESIS (Web Audio API)
  // ==========================================
  const playBeep = (type) => {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'tick') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      }
    } catch (e) {}
  };

  // ==========================================
  // 4. VIEW MANAGEMENT & NAVIGATION
  // ==========================================
  const switchView = (viewName) => {
    playBeep('click');
    state.currentView = viewName;

    if (viewName !== 'live') {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      if (state.matchInProgress && viewName !== 'results') {
        state.matchInProgress = false;
      }
    }
    clearInterval(state.instructionsTimer);
    state.instructionsTimer = null;

    document.querySelectorAll('.arena-view').forEach(view => {
      view.classList.remove('active');
      view.classList.add('hidden');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    document.querySelectorAll('.view-pill').forEach(pill => {
      if (pill.getAttribute('data-view') === viewName) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    if (viewName === 'waiting-room') {
      renderWaitingRoom();
    } else if (viewName === 'live') {
      if (!state.isRealtimeActive && !state.matchInProgress) {
        initOfflineLiveMatch();
      }
    } else if (viewName === 'results') {
      renderResults();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSound = () => {
    state.soundEnabled = !state.soundEnabled;
    const icon = document.getElementById('sound-icon');
    const label = document.getElementById('sound-label');
    if (icon && label) {
      icon.textContent = state.soundEnabled ? 'volume_up' : 'volume_off';
      label.textContent = state.soundEnabled ? 'Audio ON' : 'Audio OFF';
    }
    showToast(state.soundEnabled ? 'Audio cues enabled' : 'Audio muted');
  };

  const toggleDemoBar = () => {
    const bar = document.getElementById('demo-bar');
    const restoreBtn = document.getElementById('restore-demo-bar');
    const sidebar = document.getElementById('desktop-sidebar');
    const main = document.getElementById('main-content');
    if (bar.classList.contains('-translate-y-full')) {
      bar.classList.remove('-translate-y-full');
      restoreBtn.classList.add('hidden');
      if (sidebar) sidebar.classList.add('pt-14');
      if (main) main.classList.add('pt-14');
    } else {
      bar.classList.add('-translate-y-full');
      restoreBtn.classList.remove('hidden');
      if (sidebar) sidebar.classList.remove('pt-14');
      if (main) main.classList.remove('pt-14');
    }
  };

  const showToast = (message) => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-xl shadow-xl border border-white/10 text-xs font-semibold flex items-center gap-2 pointer-events-auto';
    toast.innerHTML = `<span class="material-symbols-outlined text-secondary-container text-base">info</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  };

  // ==========================================
  // 5. SCREEN 1: ARENA HOME ACTIONS
  // ==========================================
  const createRoom = () => {
    if (!state.playerId) {
      state.playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    }
    state.userName = 'Rahul (Host)';

    if (state.isRealtimeActive && state.socket) {
      state.socket.emit('room:create', {
        playerName: state.userName,
        avatar: state.userAvatar,
        playerId: state.playerId
      });
    } else {
      // Local fallback
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      state.roomCode = code;
      state.isHost = true;
      state.isUserReady = true;
      showToast(`New room created: ${code}`);
      switchView('waiting-room');
    }
  };

  const joinRoomFromInput = () => {
    const codeInput = document.getElementById('home-room-code-input');
    const code = (codeInput ? codeInput.value : '').trim().toUpperCase();
    if (!code || code.length < 4) {
      showToast('Please enter a valid room code (e.g. 7K4P9)');
      return;
    }

    const nameInput = document.getElementById('home-player-name-input');
    const enteredName = nameInput ? nameInput.value.trim() : '';
    const defaultGuestNames = ['Ananya Deshmukh', 'Arjun Nair', 'Priya Patel', 'Vikram Singh', 'Rohan Mehra'];
    const chosenName = enteredName || defaultGuestNames[Math.floor(Math.random() * defaultGuestNames.length)];
    state.userName = chosenName;

    // Generate distinct player ID for joining player
    state.playerId = 'p_' + Math.random().toString(36).substring(2, 9);

    if (state.isRealtimeActive && state.socket) {
      state.socket.emit('room:join', {
        roomCode: code,
        playerName: chosenName,
        avatar: state.userAvatar,
        playerId: state.playerId
      });
    } else {
      state.roomCode = code;
      showToast(`Joined room: ${code}`);
      switchView('waiting-room');
    }
  };

  const startQuickMatch = () => {
    if (state.isRealtimeActive && state.socket) {
      state.socket.emit('room:create', {
        playerName: state.userName,
        avatar: state.userAvatar,
        playerId: state.playerId
      });
    } else {
      state.roomCode = 'QM-' + Math.floor(100 + Math.random() * 900);
      showInstructionsModal();
    }
  };

  const filterCategory = (cat) => { showToast(`Filtering challenges for ${cat}...`); };
  const showMatchHistoryModal = async () => {
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/api/history`);
      if (res.ok) {
        const data = await res.json();
        const matches = data.matches || [];
        const wins = matches.filter(m => m.winner?.name?.includes('YOU') || m.winner?.name?.includes(state.userName)).length;
        showToast(`Match History (${matches.length} recorded): ${wins} Wins. Database active!`);
      } else {
        showToast('Past 10 matches: 8 Wins, 2 Podiums.');
      }
    } catch (e) {
      showToast('Past 10 matches: 8 Wins, 2 Podiums.');
    }
  };

  // ==========================================
  // 6. SCREEN 2: WAITING ROOM & INSTRUCTIONS
  // ==========================================
  const renderWaitingRoom = () => {
    const codeDisplay = document.getElementById('lobby-room-code-display');
    if (codeDisplay) codeDisplay.textContent = state.roomCode;

    const countDisplay = document.getElementById('lobby-player-count');
    if (countDisplay) {
      countDisplay.innerHTML = `<span class="material-symbols-outlined text-base">group</span> ${state.players.length} / 8 Players Connected`;
    }

    // Render dynamic player cards if real players joined
    const grid = document.getElementById('lobby-players-grid');
    if (grid && state.players.length > 0) {
      let cardsHtml = state.players.map((p, idx) => {
        const isSelf = p.isUser;
        const isReady = p.isReady;
        const borderColor = isReady ? 'border-secondary' : 'border-outline-variant';
        const readyBadge = isReady
          ? `<div class="absolute -bottom-1 -right-1 bg-secondary text-white rounded-full w-5 h-5 flex items-center justify-center shadow"><span class="material-symbols-outlined text-xs">check</span></div>`
          : `<div class="absolute -bottom-1 -right-1 bg-surface-container-highest text-on-surface-variant rounded-full w-5 h-5 flex items-center justify-center shadow"><span class="material-symbols-outlined text-xs">hourglass_empty</span></div>`;

        const statusText = isReady
          ? `<p class="text-xs text-secondary font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-sm">check_circle</span> Ready</p>`
          : `<p class="text-xs text-on-surface-variant font-medium flex items-center gap-1"><span class="material-symbols-outlined text-sm animate-spin">sync</span> Waiting...</p>`;

        const hostBadge = p.isHost
          ? `<span class="bg-primary-container text-on-primary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">${isSelf ? 'Host (You)' : 'Host'}</span>`
          : (isSelf ? `<span class="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">You</span>` : '');

        const toggleBtn = isSelf
          ? `<button onclick="ArenaApp.toggleUserReady()" id="user-ready-toggle-btn" class="text-xs font-semibold px-3 py-1.5 rounded-lg border ${isReady ? 'border-secondary text-secondary hover:bg-secondary hover:text-white' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'} transition shrink-0 ml-auto">${isReady ? 'Ready' : 'Not Ready'}</button>`
          : '';

        return `
          <div class="player-card bg-surface-container-lowest border-2 ${borderColor} rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 relative overflow-hidden shadow-sm">
            <div class="absolute left-0 top-0 bottom-0 w-1.5 ${isReady ? 'bg-secondary' : 'bg-outline-variant'}"></div>
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="relative shrink-0">
                <img class="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-surface-container-lowest shadow" src="${p.avatar}" alt="${p.name}" />
                ${readyBadge}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 mb-1">
                  <h4 class="font-bold text-sm sm:text-base text-on-surface truncate">${p.name}</h4>
                  ${hostBadge}
                </div>
                ${statusText}
              </div>
            </div>
            ${toggleBtn}
          </div>
        `;
      }).join('');

      // When only 1 player is in room, show clean waiting invitation slot
      if (state.players.length < 2) {
        cardsHtml += `
          <div class="border-2 border-dashed border-outline-variant/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 bg-surface-container-low/40">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-primary bg-surface-container-lowest shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-2xl animate-pulse">person_add</span>
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-sm text-on-surface">Waiting for Contender to Join...</h4>
                <p class="text-xs text-on-surface-variant mt-0.5">Share room code <span class="font-mono font-bold text-primary">${state.roomCode}</span> with a friend</p>
              </div>
            </div>
            <button onclick="ArenaApp.copyRoomCode()" class="text-xs font-semibold px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant text-primary hover:bg-primary hover:text-white transition shrink-0 flex items-center gap-1 shadow-sm active:scale-95">
              <span class="material-symbols-outlined text-xs">content_copy</span> Copy Code
            </button>
          </div>
        `;
      }

      grid.innerHTML = cardsHtml;
    }

    updateLobbyStatus();
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(state.roomCode)
      .then(() => showToast(`Copied room code "${state.roomCode}" to clipboard!`))
      .catch(() => showToast(`Room code: ${state.roomCode}`));
  };

  const toggleUserReady = () => {
    state.isUserReady = !state.isUserReady;
    if (state.isRealtimeActive && state.socket) {
      state.socket.emit('player:ready', {
        roomCode: state.roomCode,
        isReady: state.isUserReady
      });
    }
    renderWaitingRoom();
  };

  const simulatePlayer4Ready = () => {
    state.isPlayer4Ready = true;
    const p4 = state.players.find(p => p.id === 'p3');
    if (p4) p4.isReady = true;
    showToast('Priya Patel is now ready!');
    renderWaitingRoom();
  };

  const updateLobbyStatus = () => {
    const startBtn = document.getElementById('start-game-btn');
    const statusMsg = document.getElementById('lobby-status-msg');

    const count = state.players.length;
    const allReady = state.players.every(p => p.isReady);

    // Rule: Room quiz cannot start solo (minimum 2 players required)
    if (count < 2) {
      if (startBtn) {
        startBtn.setAttribute('disabled', 'true');
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (statusMsg) {
        statusMsg.innerHTML = '<span class="text-amber-600 font-semibold flex items-center justify-center sm:justify-end gap-1"><span class="material-symbols-outlined text-sm">group_add</span> Waiting for at least 1 more contender to join (1/2 min)...</span>';
      }
    } else if (!allReady) {
      if (startBtn) {
        startBtn.setAttribute('disabled', 'true');
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (statusMsg) {
        statusMsg.textContent = state.isHost
          ? 'Waiting for all players to mark Ready...'
          : 'Waiting for host to launch the match...';
      }
    } else {
      if (startBtn) {
        startBtn.removeAttribute('disabled');
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      if (statusMsg) {
        statusMsg.textContent = 'All players ready! Host can start the match.';
      }
    }
  };

  const showInstructionsModal = () => {
    playBeep('click');
    const modal = document.getElementById('instructions-modal');
    if (!modal) {
      confirmStartMatchNow();
      return;
    }
    modal.classList.remove('hidden');
    state.instructionsSecondsLeft = 3;
    const btnLabel = document.getElementById('instructions-start-btn-label');
    if (btnLabel) btnLabel.textContent = `Begin Arena Battle (${state.instructionsSecondsLeft}s)`;

    clearInterval(state.instructionsTimer);
    state.instructionsTimer = setInterval(() => {
      state.instructionsSecondsLeft--;
      if (btnLabel) {
        btnLabel.textContent = state.instructionsSecondsLeft > 0
          ? `Begin Arena Battle (${state.instructionsSecondsLeft}s)`
          : 'Begin Arena Battle (Starting...)';
      }
      if (state.instructionsSecondsLeft <= 0) {
        clearInterval(state.instructionsTimer);
        state.instructionsTimer = null;
        confirmStartMatchNow();
      }
    }, 1000);
  };

  const closeInstructionsModal = () => {
    clearInterval(state.instructionsTimer);
    state.instructionsTimer = null;
    const modal = document.getElementById('instructions-modal');
    if (modal) modal.classList.add('hidden');
  };

  const confirmStartMatchNow = () => {
    closeInstructionsModal();
    if (state.isRealtimeActive && state.socket && state.isHost) {
      state.socket.emit('game:start', { roomCode: state.roomCode });
    } else {
      startLiveMatch();
    }
  };

  const startLiveMatch = () => {
    playBeep('correct');
    showToast('Launching Arena Battle with Dynamic Timers...');
    state.matchInProgress = false;
    setTimeout(() => switchView('live'), 300);
  };

  // ==========================================
  // 7. SCREEN 3: LIVE MATCH & QUESTION ENGINE
  // ==========================================

  const renderServerQuestion = (data) => {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.questionLocked = false;

    const q = data.question;
    state.currentQuestionData = q;
    state.questionTimeLimit = data.timeLimit;
    state.timeRemaining = data.timeLimit;

    const catBadge   = document.getElementById('live-category-badge');
    const diffBadge  = document.getElementById('live-difficulty-badge');
    const indexBadge = document.getElementById('live-question-index-badge');
    const title      = document.getElementById('live-question-title');
    const optsCont   = document.getElementById('live-options-container');
    const timerText  = document.getElementById('live-countdown');
    const timerBox   = document.getElementById('live-timer-container');
    const timeBar    = document.getElementById('question-time-bar');
    const roomTag    = document.getElementById('live-room-code-tag');

    if (roomTag)    roomTag.textContent = state.roomCode;
    if (catBadge)   catBadge.textContent = q.category;
    if (indexBadge) indexBadge.textContent = `Question ${data.questionNumber} of ${data.totalQuestions}`;
    if (title)      title.textContent = q.prompt;

    if (diffBadge) {
      if (q.difficulty === 'Easy') {
        diffBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm badge-easy';
        diffBadge.innerHTML = '<span>🟢</span> Easy • 30s';
      } else if (q.difficulty === 'Medium') {
        diffBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm badge-medium';
        diffBadge.innerHTML = '<span>🟡</span> Medium • 1 min (60s)';
      } else {
        diffBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm badge-hard';
        diffBadge.innerHTML = '<span>🔴</span> Hard • 90s (1.5 min)';
      }
    }

    if (timerText) {
      const m = Math.floor(state.timeRemaining / 60);
      const s = state.timeRemaining % 60;
      timerText.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    if (timerBox) timerBox.className = 'bg-primary text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-all';
    if (timeBar)  {
      timeBar.style.width = '100%';
      timeBar.className = 'h-full bg-primary rounded-r-full';
    }

    const letters = ['A', 'B', 'C', 'D'];
    if (optsCont) {
      optsCont.innerHTML = q.options.map((opt, i) => `
        <button onclick="ArenaApp.selectOption(${i})" id="opt-btn-${i}" class="option-btn w-full text-left p-4 rounded-xl border-2 border-outline-variant bg-surface-container-lowest flex items-center justify-between group active:scale-98">
          <div class="flex items-center gap-3.5">
            <div id="opt-badge-${i}" class="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface font-bold text-xs flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">${letters[i]}</div>
            <span class="text-sm font-semibold text-on-surface">${opt}</span>
          </div>
          <span id="opt-status-${i}" class="hidden text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"></span>
        </button>
      `).join('');
    }

    renderQuestionDots();
    state.timerInterval = setInterval(handleTimerTick, 1000);
  };

  const handleTimerTick = () => {
    if (state.questionLocked) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      return;
    }
    state.timeRemaining--;

    const timerText = document.getElementById('live-countdown');
    const timerBox  = document.getElementById('live-timer-container');
    const timeBar   = document.getElementById('question-time-bar');

    if (timerText) {
      const m = Math.floor(Math.max(0, state.timeRemaining) / 60);
      const s = Math.max(0, state.timeRemaining) % 60;
      timerText.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    if (timeBar) {
      const pct = Math.max(0, (state.timeRemaining / state.questionTimeLimit) * 100);
      timeBar.style.width = `${pct}%`;
      timeBar.className = pct <= 25
        ? 'h-full bg-error rounded-r-full'
        : pct <= 50
          ? 'h-full bg-amber-500 rounded-r-full'
          : 'h-full bg-primary rounded-r-full';
    }
    if (state.timeRemaining <= 8 && state.timeRemaining > 0) {
      if (timerBox) timerBox.className = 'bg-error text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-all animate-pulse';
      playBeep('tick');
    }
    if (state.timeRemaining <= 0) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      handleQuestionTimeout();
    }
  };

  const selectOption = (index) => {
    if (state.questionLocked) return;
    state.questionLocked = true;
    clearInterval(state.timerInterval);
    state.timerInterval = null;

    document.querySelectorAll('.option-btn').forEach(btn => btn.setAttribute('disabled', 'true'));

    if (state.isRealtimeActive && state.socket && state.currentQuestionData) {
      state.socket.emit('answer:submit', {
        roomCode: state.roomCode,
        questionId: state.currentQuestionData.id,
        selectedOption: index
      });
    } else {
      // Offline fallback handling
      handleOfflineSelectOption(index);
    }
  };

  const handleServerAnswerResult = (data) => {
    const isCorrect = data.isCorrect;
    const index = data.selectedOption;
    const correctIndex = data.correctIndex;
    const points = data.points;
    const isSpeedBonus = data.isSpeedBonus;

    const selBtn    = document.getElementById(`opt-btn-${index}`);
    const selBadge  = document.getElementById(`opt-badge-${index}`);
    const selStatus = document.getElementById(`opt-status-${index}`);

    if (isCorrect) {
      playBeep('correct');
      if (selBtn)   selBtn.classList.add('correct');
      if (selBadge) {
        selBadge.className = 'w-8 h-8 rounded-lg bg-secondary text-white font-bold text-xs flex items-center justify-center';
        selBadge.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
      }
      if (selStatus) {
        selStatus.textContent = isSpeedBonus ? `Correct (+${points} Speed!)` : `Correct (+${points})`;
        selStatus.className = 'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-white';
        selStatus.classList.remove('hidden');
      }
    } else {
      playBeep('wrong');
      if (selBtn && index >= 0) selBtn.classList.add('wrong');
      if (selBadge && index >= 0) {
        selBadge.className = 'w-8 h-8 rounded-lg bg-error text-white font-bold text-xs flex items-center justify-center';
        selBadge.innerHTML = '<span class="material-symbols-outlined text-sm">close</span>';
      }
      if (selStatus && index >= 0) {
        selStatus.textContent = 'Incorrect';
        selStatus.className = 'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-error text-white';
        selStatus.classList.remove('hidden');
      }
      const correctBtn = document.getElementById(`opt-btn-${correctIndex}`);
      if (correctBtn) correctBtn.classList.add('correct');
    }

    state.userAnswers.push({
      questionIndex: state.currentQuestionIndex,
      questionId: data.questionId,
      category: state.currentQuestionData?.category || '',
      selectedOption: index,
      isCorrect,
      timeSpent: data.timeSpent || 0,
      timedOut: !!data.timedOut
    });

    renderQuestionDots();
  };

  const handleQuestionTimeout = () => {
    if (state.questionLocked) return;
    state.questionLocked = true;
    playBeep('wrong');

    document.querySelectorAll('.option-btn').forEach(btn => btn.setAttribute('disabled', 'true'));
    showToast(`Time's up for this question (0 pts)`);

    if (state.isRealtimeActive && state.socket && state.currentQuestionData) {
      state.socket.emit('question:timeout', {
        roomCode: state.roomCode,
        questionId: state.currentQuestionData.id
      });
    } else {
      // Offline fallback
      handleOfflineTimeout();
    }
  };

  const skipQuestion = () => {
    handleQuestionTimeout();
  };

  const nextQuestion = () => {
    if (!state.questionLocked) {
      skipQuestion();
    }
  };

  // ==========================================
  // 8. OFFLINE FALLBACK ENGINE
  // ==========================================
  const initOfflineLiveMatch = () => {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.currentQuestionIndex = 0;
    state.userAnswers = [];
    state.questionLocked = false;
    state.matchInProgress = true;
    state.players.forEach(p => {
      p.score = 0;
      p.correct = 0;
      p.totalTime = 0;
      p.rank = 0;
    });

    const roomCodeTag = document.getElementById('live-room-code-tag');
    if (roomCodeTag) roomCodeTag.textContent = state.roomCode;

    renderOfflineQuestion();
    updateLiveStandings();
  };

  const renderOfflineQuestion = () => {
    const q = state.fallbackQuestions[state.currentQuestionIndex];
    if (!q) {
      endOfflineMatch();
      return;
    }

    renderServerQuestion({
      questionNumber: state.currentQuestionIndex + 1,
      totalQuestions: state.fallbackQuestions.length,
      question: q,
      timeLimit: q.timeLimit,
      startedAt: Date.now()
    });

    simulateOfflineOpponents(q);
  };

  const handleOfflineSelectOption = (index) => {
    const q = state.fallbackQuestions[state.currentQuestionIndex];
    if (!q) return;

    const timeSpent = Math.max(1, Math.round((Date.now() - state.questionStartTime) / 1000));
    const isCorrect = (index === q.correctIndex);
    const speedLimit = Math.round(state.questionTimeLimit * 0.30);
    const isSpeedBonus = isCorrect && (timeSpent < speedLimit);
    const pts = isCorrect ? (isSpeedBonus ? 60 : 40) : 0;

    const user = state.players.find(p => p.isUser);
    if (user) {
      user.score += pts;
      user.totalTime += timeSpent;
      if (isCorrect) user.correct++;
    }

    handleServerAnswerResult({
      questionId: q.id,
      selectedOption: index,
      isCorrect,
      correctIndex: q.correctIndex,
      points: pts,
      isSpeedBonus,
      timeSpent
    });

    updateLiveStandings();
    setTimeout(() => advanceOfflineQuestion(), 1100);
  };

  const handleOfflineTimeout = () => {
    const q = state.fallbackQuestions[state.currentQuestionIndex];
    if (!q) return;

    const correctBtn = document.getElementById(`opt-btn-${q.correctIndex}`);
    if (correctBtn) correctBtn.classList.add('correct');

    state.userAnswers.push({
      questionIndex: state.currentQuestionIndex,
      selectedOption: -1,
      isCorrect: false,
      timeSpent: state.questionTimeLimit,
      timedOut: true
    });

    renderQuestionDots();
    setTimeout(() => advanceOfflineQuestion(), 1200);
  };

  const simulateOfflineOpponents = (q) => {
    const profiles = [
      { id: 'p1', correctRate: 0.80, speedFactor: 0.45 },
      { id: 'p2', correctRate: 0.70, speedFactor: 0.55 },
      { id: 'p3', correctRate: 0.60, speedFactor: 0.65 }
    ];

    profiles.forEach(profile => {
      const player = state.players.find(p => p.id === profile.id);
      if (!player) return;
      const isCorrect = Math.random() < profile.correctRate;
      const minTime = Math.max(3, Math.round(q.timeLimit * 0.15));
      const maxTime = Math.round(q.timeLimit * profile.speedFactor);
      const timeSpent = Math.floor(minTime + Math.random() * (maxTime - minTime + 1));
      const speedLimit = Math.round(q.timeLimit * 0.30);
      const isSpeedBonus = isCorrect && (timeSpent < speedLimit);
      const pts = isCorrect ? (isSpeedBonus ? 60 : 40) : 0;

      player.score += pts;
      player.totalTime += timeSpent;
      if (isCorrect) player.correct++;
    });

    updateLiveStandings();
  };

  const advanceOfflineQuestion = () => {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    if (state.currentQuestionIndex < state.fallbackQuestions.length - 1) {
      state.currentQuestionIndex++;
      renderOfflineQuestion();
    } else {
      endOfflineMatch();
    }
  };

  const endOfflineMatch = () => {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.matchInProgress = false;
    playBeep('correct');
    showToast('Match completed! Generating results...');
    setTimeout(() => switchView('results'), 900);
  };

  // ==========================================
  // 9. SCREEN 4: RESULTS & LEADERBOARD
  // ==========================================
  const renderQuestionDots = () => {
    const container = document.getElementById('question-dots-container');
    if (!container) return;
    const totalQ = 10;
    const dots = [];

    for (let i = 0; i < totalQ; i++) {
      const answered = state.userAnswers.find(a => a.questionIndex === i);
      if (answered) {
        dots.push(answered.isCorrect
          ? `<div class="w-3 h-3 rounded-full bg-secondary" title="Q${i+1}: Correct"></div>`
          : `<div class="w-3 h-3 rounded-full bg-error" title="Q${i+1}: ${answered.timedOut ? 'Timed Out' : 'Incorrect'}"></div>`
        );
      } else if (i === state.currentQuestionIndex) {
        dots.push(`<div class="w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-primary/40 ring-offset-2 animate-pulse" title="Q${i+1}: Active"></div>`);
      } else {
        dots.push(`<div class="w-3 h-3 rounded-full border border-outline-variant bg-surface-container-high" title="Q${i+1}: Pending"></div>`);
      }
    }
    container.innerHTML = dots.join('');
  };

  const updateLiveStandings = () => {
    const list = document.getElementById('live-standings-list');
    if (!list) return;
    const sorted = [...state.players].sort((a, b) => b.score !== a.score ? b.score - a.score : a.totalTime - b.totalTime);

    list.innerHTML = sorted.map((p, idx) => {
      p.rank = idx + 1;
      const medals = ['bg-amber-100 text-amber-800', 'bg-slate-200 text-slate-700', 'bg-amber-700/20 text-amber-900'];
      const rankClass = medals[idx] || 'bg-surface-container-high text-on-surface-variant';
      if (p.isUser) {
        return `
          <div class="flex items-center justify-between p-3 rounded-xl bg-primary text-white shadow-md relative overflow-hidden transition-all duration-300">
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-shimmer"></div>
            <div class="flex items-center gap-3 relative z-10">
              <div class="w-7 h-7 rounded-full bg-white text-primary flex items-center justify-center text-xs font-extrabold shadow">${p.rank}</div>
              <div class="flex flex-col"><span class="text-xs font-bold leading-none">${p.name}</span><span class="text-[10px] opacity-85 mt-0.5">Your Position</span></div>
            </div>
            <span class="font-mono text-sm font-extrabold relative z-10">${p.score}</span>
          </div>`;
      }
      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition border border-outline-variant/40">
          <div class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-full ${rankClass} flex items-center justify-center text-xs font-bold">${p.rank}</div>
            <span class="text-xs font-semibold text-on-surface">${p.name}</span>
          </div>
          <span class="font-mono text-xs font-bold text-on-surface-variant">${p.score}</span>
        </div>`;
    }).join('');
  };

  const renderResults = () => {
    clearInterval(state.timerInterval);
    state.timerInterval = null;

    // Use backend final results if available, else local
    const finalData = state.finalResults;
    const sorted = finalData?.leaderboard || [...state.players].sort((a, b) => b.score !== a.score ? b.score - a.score : a.totalTime - b.totalTime);

    const userSelf = sorted.find(p => (state.socket && p.socketId === state.socket.id) || (state.playerId && p.playerId === state.playerId) || p.isUser);
    const userRank = userSelf ? (userSelf.rank || sorted.indexOf(userSelf) + 1) : 1;
    const userScore = userSelf ? userSelf.score : 0;

    const totalQ = 10;
    const correctCount = state.userAnswers.filter(a => a.isCorrect).length;
    const answeredCount = state.userAnswers.length;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const totalTime = state.userAnswers.reduce((acc, a) => acc + a.timeSpent, 0);
    const avgTime = answeredCount > 0 ? Math.round(totalTime / answeredCount) : 0;

    if (document.getElementById('results-final-rank')) document.getElementById('results-final-rank').textContent = userRank;
    const rSub = document.getElementById('results-rank-subtitle');
    if (rSub) {
      if (userRank === 1) {
        rSub.textContent = 'Arena Champion!';
        rSub.className = 'text-[10px] text-amber-600 font-bold mt-1';
      } else if (userRank <= 3) {
        rSub.textContent = 'Podium Finish!';
        rSub.className = 'text-[10px] text-secondary font-bold mt-1';
      } else {
        rSub.textContent = 'Top 4 Finish';
        rSub.className = 'text-[10px] text-on-surface-variant font-bold mt-1';
      }
    }
    const fsEl = document.getElementById('results-final-score');
    if (fsEl) fsEl.textContent = userScore;
    const acEl = document.getElementById('results-accuracy');
    if (acEl) acEl.textContent = `${accuracy}%`;
    const coEl = document.getElementById('results-correct-count');
    if (coEl) coEl.innerHTML = `${correctCount}<span class="text-base text-on-surface-variant font-normal">/${totalQ}</span>`;
    const mistEl = document.getElementById('results-mistakes-count');
    const mistakes = Math.max(0, totalQ - correctCount);
    if (mistEl) mistEl.textContent = `${mistakes} ${mistakes === 1 ? 'Mistake' : 'Mistakes'}`;
    const atEl = document.getElementById('results-avg-time');
    if (atEl) atEl.innerHTML = `${avgTime}<span class="text-base text-on-surface-variant font-normal">s</span>`;

    // Category breakdown directly from userAnswers
    const logA = state.userAnswers.filter(a => a.category === 'Logical Reasoning');
    const verA = state.userAnswers.filter(a => a.category === 'Verbal Ability');
    const quaA = state.userAnswers.filter(a => a.category === 'Quantitative Aptitude');
    const pct  = (arr) => arr.length > 0 ? Math.round((arr.filter(a => a.isCorrect).length / arr.length) * 100) : 0;

    const lp = pct(logA); const vp = pct(verA); const qp = pct(quaA);
    const lPct = document.getElementById('results-logical-pct'); const lBar = document.getElementById('results-logical-bar');
    if (lPct && lBar) { lPct.textContent = `${lp}%`; lBar.style.width = `${lp}%`; }
    const vPct = document.getElementById('results-verbal-pct'); const vBar = document.getElementById('results-verbal-bar');
    if (vPct && vBar) { vPct.textContent = `${vp}%`; vBar.style.width = `${vp}%`; }
    const qPct = document.getElementById('results-quant-pct'); const qBar = document.getElementById('results-quant-bar');
    if (qPct && qBar) { qPct.textContent = `${qp}%`; qBar.style.width = `${qp}%`; }

    const tbody = document.getElementById('results-leaderboard-tbody');
    if (tbody) {
      tbody.innerHTML = sorted.map((p, idx) => {
        const isSelf = (state.socket && p.socketId === state.socket.id) || (state.playerId && p.playerId === state.playerId) || p.isUser;
        const rank = p.rank || (idx + 1);
        const name = p.name || p.playerName;
        const rowClass = isSelf ? 'bg-primary-container/10 font-bold border-l-4 border-l-primary' : 'hover:bg-surface-container-low transition';
        const pAccuracy = p.accuracy !== undefined ? `${p.accuracy}%` : `${Math.round(((p.correctCount || p.correct || 0) / totalQ) * 100)}%`;
        const pAvgTime  = p.averageResponseTime !== undefined ? `${p.averageResponseTime}s` : `${p.totalTime > 0 ? Math.round(p.totalTime / totalQ) : 0}s`;
        const avatar = p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

        return `
          <tr class="${rowClass}">
            <td class="p-3.5 pl-5 font-bold ${rank <= 3 ? 'text-primary' : 'text-on-surface-variant'}">#${rank}</td>
            <td class="p-3.5 flex items-center gap-2.5">
              <img src="${avatar}" class="w-6 h-6 rounded-full object-cover border border-outline-variant" alt="${name}" />
              <span class="text-on-surface">${name} ${isSelf ? '<span class="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded ml-1">YOU</span>' : ''}</span>
            </td>
            <td class="p-3.5 text-right font-mono font-bold text-on-surface">${p.score}</td>
            <td class="p-3.5 text-right text-secondary font-semibold">${pAccuracy}</td>
            <td class="p-3.5 pr-5 text-right text-on-surface-variant font-mono">${pAvgTime}</td>
          </tr>`;
      }).join('');
    }
  };

  const playAgain = () => {
    if (state.isRealtimeActive && state.socket) {
      state.socket.emit('round:playAgain', { roomCode: state.roomCode });
    } else {
      showToast('Starting a new round in the same room...');
      state.currentQuestionIndex = 0;
      state.userAnswers = [];
      state.questionLocked = false;
      state.matchInProgress = false;
      state.players.forEach(p => {
        p.score = 0;
        p.correct = 0;
        p.totalTime = 0;
        p.rank = 0;
      });
      switchView('waiting-room');
    }
  };

  // ==========================================
  // 10. INITIALIZATION
  // ==========================================
  const init = () => {
    initSocket();
    switchView('home');
  };

  document.addEventListener('DOMContentLoaded', init);

  return {
    switchView,
    toggleSound,
    toggleDemoBar,
    showToast,
    createRoom,
    joinRoomFromInput,
    startQuickMatch,
    filterCategory,
    showMatchHistoryModal,
    copyRoomCode,
    toggleUserReady,
    simulatePlayer4Ready,
    showInstructionsModal,
    closeInstructionsModal,
    confirmStartMatchNow,
    startLiveMatch,
    selectOption,
    skipQuestion,
    nextQuestion,
    playAgain
  };
})();
