import {
  INITIAL_KAS_NEGARA,
  JAIL_BAIL_AMOUNT,
  JAIL_TILE_ID,
  PASS_START_BONUS,
  STARTING_MONEY,
  TOTAL_TILES,
  formatShortRupiah,
  generateRandomBoard,
  getGroupTiles,
  getTileById,
} from './boardData.js';
import { pickDialogue } from './characters.js';
import { drawRandomCard } from './cards.js';
import { cryptoRandomInt, safeNonNegInt } from './security.js';

const MAX_TRADES_PER_TURN = 3;

function rollTwoDice(mode = 'acak') {
  // mode: 'acak' | 'ganjil' | 'genap' — uses CSPRNG so dice cannot be predicted/manipulated
  if (mode === 'ganjil' || mode === 'genap') {
    const wantOdd = mode === 'ganjil';
    for (let i = 0; i < 32; i++) {
      const d1 = cryptoRandomInt(6) + 1;
      const d2 = cryptoRandomInt(6) + 1;
      const isOdd = (d1 + d2) % 2 === 1;
      if (isOdd === wantOdd) {
        return [d1, d2];
      }
    }
  }
  return [cryptoRandomInt(6) + 1, cryptoRandomInt(6) + 1];
}

export class GameEngine {
  constructor(room, emitState, emitEvent) {
    this.room = room;
    this.emitState = emitState;
    this.emitEvent = emitEvent;

    this.maxRounds = room.settings.maxRounds || 25;
    this.speed = room.settings.speed || 'normal'; // 'normal' | 'fast'
    this.turnDurationSec = this.speed === 'fast' ? 14 : 22;
    this.actionDurationSec = this.speed === 'fast' ? 14 : 20;

    this.round = 1;
    this.turnIndex = 0;
    this.phase = 'WAITING_ROLL'; // WAITING_ROLL | MOVING | ACTION_PENDING | DEBT_RESOLUTION | GAME_OVER
    this.kasNegara = INITIAL_KAS_NEGARA;

    // Generate a brand-new randomized 40-tile 100%-Indonesian board for EVERY game (frozen against tampering!)
    const randomBoard = generateRandomBoard();
    this.boardSeed = randomBoard.seed;
    this.board = Object.freeze(randomBoard.tiles.map((t) => Object.freeze({ ...t })));

    this.consecutiveDoubles = 0;
    this.tradesThisTurn = 0;
    this.lastDice = [1, 1];
    this.lastRollMode = 'acak';
    this.pendingAction = null;
    this.activeCard = null;
    this.pendingTrade = null;
    this.statusText = '';
    this.logs = [];
    this.winner = null;
    this.rankings = [];

    // Tile ownership map: tileId -> { ownerId, level (0..3) }
    this.properties = {};

    // Initialize player game fields
    this.players = room.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      isBot: !!p.isBot,
      connected: p.isBot ? true : p.connected !== false,
      seatIndex: idx,
      money: STARTING_MONEY,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailFreeCards: 0,
      bankrupt: false,
      turnsTaken: 0,
      debtAmount: 0,
      debtCreditorId: null, // null = bank / Kas Negara
      debtToKas: false,
    }));

    this.timerHandle = null;
    this.timerInterval = null;
    this.botTimeout = null;
    this.moveTimeout = null;
    this.turnDeadline = 0;
    this.destroyed = false;

    this.addLog('Peta 40 petak Nusantara diacak baru untuk game ini! Semua pemain mulai dengan modal Rp15.000.000.');
    this.emitEvent('cutscene', {
      kind: 'game_start',
      title: 'MONOPOLI NEGERI KONOHA',
      subtitle: `40 Petak Nusantara Acak • ${this.players.length} Pemain Siap Berebut Aset!`,
      badge: 'PERMAINAN DIMULAI',
      accent: '#f59e0b',
      duration: 2100,
    });
    this.startTurn();
  }

  destroy() {
    this.destroyed = true;
    this.clearTimers();
  }

  clearTimers() {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.botTimeout) {
      clearTimeout(this.botTimeout);
      this.botTimeout = null;
    }
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }
  }

  get currentPlayer() {
    return this.players[this.turnIndex];
  }

  getPlayer(id) {
    return this.players.find((p) => p.id === id);
  }

  getActivePlayers() {
    return this.players.filter((p) => !p.bankrupt);
  }

  addLog(text, type = 'info') {
    this.logs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text,
      type,
    });
    if (this.logs.length > 80) this.logs.length = 80;
  }

  speak(player, category, customText = null) {
    const text = customText || pickDialogue(player.characterId, category);
    this.emitEvent('dialogue', {
      playerId: player.id,
      text,
      ts: Date.now(),
    });
  }

  floatMoney(playerId, delta, label = null) {
    this.emitEvent('money_delta', {
      playerId,
      delta,
      label: label || `${delta >= 0 ? '+' : ''}${formatShortRupiah(delta)}`,
      ts: Date.now(),
    });
  }

  computeNetWorth(player) {
    if (player.bankrupt) return 0;
    let total = player.money;
    for (const [tileIdStr, prop] of Object.entries(this.properties)) {
      if (prop.ownerId === player.id) {
        const tile = getTileById(Number(tileIdStr), this.board);
        total += (tile.price || 0) + (prop.level || 0) * (tile.upgradeCost || 0);
      }
    }
    return total;
  }

  serialize() {
    const now = Date.now();
    const timeLeft = this.turnDeadline > now ? Math.ceil((this.turnDeadline - now) / 1000) : 0;
    return {
      boardSeed: this.boardSeed,
      board: this.board,
      round: this.round,
      maxRounds: this.maxRounds,
      speed: this.speed,
      turnIndex: this.turnIndex,
      currentPlayerId: this.currentPlayer?.id || null,
      phase: this.phase,
      kasNegara: this.kasNegara,
      lastDice: this.lastDice,
      lastRollMode: this.lastRollMode,
      pendingAction: this.pendingAction,
      activeCard: this.activeCard,
      pendingTrade: this.pendingTrade,
      statusText: this.statusText,
      timeLeft,
      turnDurationSec: this.turnDurationSec,
      properties: this.properties,
      players: this.players.map((p) => ({
        ...p,
        netWorth: this.computeNetWorth(p),
      })),
      logs: this.logs.slice(0, 40),
      winner: this.winner,
      rankings: this.rankings,
    };
  }

  broadcast() {
    if (this.destroyed) return;
    this.emitState(this.serialize());
  }

  scheduleCountdown(seconds, onExpire) {
    if (this.timerHandle) clearTimeout(this.timerHandle);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.turnDeadline = Date.now() + seconds * 1000;
    this.timerHandle = setTimeout(() => {
      if (this.destroyed) return;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      onExpire();
    }, seconds * 1000);
  }

  startTurn() {
    if (this.destroyed) return;
    this.clearTimers();

    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.finishGame();
      return;
    }

    // Ensure turnIndex points to non-bankrupt player
    let guard = 0;
    while (this.players[this.turnIndex]?.bankrupt && guard < this.players.length) {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      guard++;
    }

    const player = this.currentPlayer;
    this.phase = 'WAITING_ROLL';
    this.pendingAction = null;
    this.activeCard = null;
    this.pendingTrade = null;
    this.tradesThisTurn = 0;
    this.statusText = player.inJail
      ? `${player.name} berada di Rutan KPK (sisa ${player.jailTurns} giliran)`
      : `${player.name} menunggu lemparan dadu`;

    this.emitEvent('turn_started', { playerId: player.id, round: this.round });
    this.broadcast();

    if (player.isBot || !player.connected) {
      const delay = this.speed === 'fast' ? 850 : 1200;
      this.botTimeout = setTimeout(() => {
        if (this.destroyed || this.phase !== 'WAITING_ROLL') return;
        this.botTakeTurn(player);
      }, delay);
    } else {
      this.scheduleCountdown(this.turnDurationSec, () => {
        if (this.phase === 'WAITING_ROLL' && this.currentPlayer?.id === player.id) {
          this.addLog(`Waktu habis! Dadu ${player.name} dilempar otomatis.`, 'system');
          this.handleRoll(player.id, 'acak', true);
        }
      });
    }
  }

  botTakeTurn(player) {
    // If in jail, use card or pay bail if wealthy
    if (player.inJail) {
      if (player.jailFreeCards > 0) {
        this.handleUseJailCard(player.id);
        return;
      }
      if (player.money >= 5_000_000 && Math.random() < 0.65) {
        this.handlePayBail(player.id);
        return;
      }
    }

    // Opportunistically upgrade a property if rich
    if (player.money > 6_000_000) {
      const ownedProps = Object.entries(this.properties)
        .filter(([, prop]) => prop.ownerId === player.id)
        .map(([tid, prop]) => ({ tile: getTileById(Number(tid), this.board), prop }))
        .filter(({ tile, prop }) => tile.type === 'property' && prop.level < 3 && player.money - tile.upgradeCost >= 3_500_000);
      if (ownedProps.length > 0 && Math.random() < 0.5) {
        const pick = ownedProps[Math.floor(Math.random() * ownedProps.length)];
        this.handleUpgradeProperty(player.id, pick.tile.id, true);
      }
    }

    const modes = ['acak', 'acak', 'ganjil', 'genap'];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    this.handleRoll(player.id, mode);
  }

  handlePayBail(playerId) {
    if (this.phase !== 'WAITING_ROLL') return { error: 'Bukan fase lempar dadu.' };
    const player = this.currentPlayer;
    if (!player || player.id !== playerId || player.bankrupt) return { error: 'Bukan giliranmu.' };
    if (!player.inJail) return { error: 'Kamu tidak sedang di Rutan KPK.' };
    if (player.money < JAIL_BAIL_AMOUNT) return { error: 'Uang tidak cukup untuk tebusan Rp1 jt.' };

    this.pendingTrade = null;
    player.money -= JAIL_BAIL_AMOUNT;
    this.kasNegara += JAIL_BAIL_AMOUNT;
    player.inJail = false;
    player.jailTurns = 0;

    this.floatMoney(player.id, -JAIL_BAIL_AMOUNT);
    this.addLog(`${player.name} membayar tebusan ${formatShortRupiah(JAIL_BAIL_AMOUNT)} dan bebas dari Rutan KPK!`, 'jail');
    this.speak(player, 'roll', 'Akhirnya hirup udara bebas lagi!');
    this.emitEvent('sfx', { sound: 'cash' });
    this.statusText = `${player.name} bebas dari Rutan KPK! Lempar dadu.`;
    this.broadcast();

    if (player.isBot || !player.connected) {
      this.botTimeout = setTimeout(() => {
        if (!this.destroyed && this.phase === 'WAITING_ROLL') {
          this.handleRoll(player.id, 'acak');
        }
      }, 700);
    }
    return { ok: true };
  }

  handleUseJailCard(playerId) {
    if (this.phase !== 'WAITING_ROLL') return { error: 'Bukan fase lempar dadu.' };
    const player = this.currentPlayer;
    if (!player || player.id !== playerId || player.bankrupt) return { error: 'Bukan giliranmu.' };
    if (!player.inJail || player.jailFreeCards <= 0) return { error: 'Tidak punya Kartu Orang Dalam.' };

    this.pendingTrade = null;
    player.jailFreeCards -= 1;
    player.inJail = false;
    player.jailTurns = 0;

    this.addLog(`${player.name} memakai Kartu Kenalan Orang Dalam dan langsung bebas dari Rutan KPK!`, 'card');
    this.speak(player, 'roll', 'Untung punya kenalan orang dalam!');
    this.emitEvent('sfx', { sound: 'card' });
    this.statusText = `${player.name} bebas pakai Kartu Orang Dalam! Lempar dadu.`;
    this.broadcast();

    if (player.isBot || !player.connected) {
      this.botTimeout = setTimeout(() => {
        if (!this.destroyed && this.phase === 'WAITING_ROLL') {
          this.handleRoll(player.id, 'acak');
        }
      }, 700);
    }
    return { ok: true };
  }

  handleRoll(playerId, mode = 'acak', isAuto = false) {
    if (this.phase !== 'WAITING_ROLL') return { error: 'Sedang tidak menunggu lemparan dadu.' };
    const player = this.currentPlayer;
    if (!player || player.id !== playerId) return { error: 'Bukan giliran Anda.' };

    this.pendingTrade = null;
    this.clearTimers();

    const safeMode = ['acak', 'ganjil', 'genap'].includes(mode) ? mode : 'acak';
    const [d1, d2] = rollTwoDice(safeMode);
    const total = d1 + d2;
    const isDouble = d1 === d2;

    this.lastDice = [d1, d2];
    this.lastRollMode = safeMode;
    this.phase = 'MOVING';

    if (!isAuto && Math.random() < 0.55) {
      this.speak(player, 'roll');
    }

    // Handle jail roll
    if (player.inJail) {
      this.emitEvent('dice_rolled', {
        playerId: player.id,
        dice: [d1, d2],
        mode: safeMode,
        fromPos: player.position,
        toPos: player.position,
        steps: 0,
        passedStart: false,
      });

      if (isDouble) {
        player.inJail = false;
        player.jailTurns = 0;
        this.addLog(`${player.name} melempar dadu kembar [${d1}+${d2}] dan langsung bebas dari Rutan KPK!`, 'jail');
        // Proceed with moving after short dice animation
        this.executeMovement(player, d1, d2, false);
        return { ok: true };
      } else {
        player.jailTurns -= 1;
        if (player.jailTurns <= 0) {
          player.inJail = false;
          this.addLog(`${player.name} mendapat [${d1}+${d2}]. Masa tahanan selesai — giliran berikutnya bebas!`, 'jail');
        } else {
          this.addLog(`${player.name} mendapat [${d1}+${d2}], masih ditahan di Rutan KPK (${player.jailTurns} giliran lagi).`, 'jail');
        }
        this.statusText = `${player.name} gagal dadu kembar di Rutan KPK.`;
        this.broadcast();
        this.moveTimeout = setTimeout(() => {
          this.endTurn(false);
        }, 1400);
        return { ok: true };
      }
    }

    // Check 3 consecutive doubles -> Rutan KPK
    if (isDouble) {
      this.consecutiveDoubles += 1;
      if (this.consecutiveDoubles >= 3) {
        this.consecutiveDoubles = 0;
        this.emitEvent('dice_rolled', {
          playerId: player.id,
          dice: [d1, d2],
          mode: safeMode,
          fromPos: player.position,
          toPos: JAIL_TILE_ID,
          steps: 0,
          passedStart: false,
          toJail: true,
        });
        this.addLog(`${player.name} dapat dadu kembar 3x berturut-turut! Dicurigai KPK dan masuk Rutan!`, 'jail');
        this.sendToJail(player);
        this.broadcast();
        this.moveTimeout = setTimeout(() => {
          this.endTurn(false);
        }, 1600);
        return { ok: true };
      }
    } else {
      this.consecutiveDoubles = 0;
    }

    this.executeMovement(player, d1, d2, isDouble);
    return { ok: true };
  }

  executeMovement(player, d1, d2, canRollAgain) {
    const steps = d1 + d2;
    const fromPos = player.position;
    const rawPos = fromPos + steps;
    const passedStart = rawPos >= TOTAL_TILES;
    const toPos = rawPos % TOTAL_TILES;

    player.position = toPos;

    this.emitEvent('dice_rolled', {
      playerId: player.id,
      dice: [d1, d2],
      mode: this.lastRollMode,
      fromPos,
      toPos,
      steps,
      passedStart,
    });

    if (canRollAgain) {
      this.emitEvent('cutscene', {
        kind: 'dice_double',
        title: `DADU KEMBAR ${d1} + ${d2}!`,
        subtitle: `${player.name} dapat bonus lempar dadu lagi!`,
        badge: 'DOUBLE BONUS',
        characterId: player.characterId,
        playerName: player.name,
        tileId: toPos,
        accent: '#f59e0b',
        duration: 1550,
      });
    }

    this.statusText = `${player.name} melempar ${d1} + ${d2} = ${steps} langkah...`;
    const modeLabel = this.lastRollMode === 'acak' ? '' : ` [${this.lastRollMode.toUpperCase()}]`;
    this.addLog(`${player.name} melempar dadu [${d1}+${d2}=${steps}]${modeLabel} menuju ${getTileById(toPos, this.board).name}.`);

    if (passedStart) {
      player.money += PASS_START_BONUS;
      this.addLog(`${player.name} melewati Gapura Mulai dan menerima gaji ${formatShortRupiah(PASS_START_BONUS)}!`, 'money');
      this.floatMoney(player.id, PASS_START_BONUS);
    }

    this.broadcast();

    const stepMs = this.speed === 'fast' ? 145 : 210;
    const animMs = 950 + steps * stepMs;
    this.moveTimeout = setTimeout(() => {
      if (this.destroyed) return;
      this.resolveLanding(player, canRollAgain);
    }, animMs);
  }

  sendToJail(player) {
    player.position = JAIL_TILE_ID;
    player.inJail = true;
    player.jailTurns = 2;
    this.consecutiveDoubles = 0;
    this.speak(player, 'jail');
    this.emitEvent('sfx', { sound: 'siren' });
    this.emitEvent('cutscene', {
      kind: 'jail_ott',
      title: 'TERKENA OTT KPK!',
      subtitle: `${player.name} langsung digelandang menuju Rutan KPK!`,
      badge: 'OPERASI TANGKAP TANGAN',
      characterId: player.characterId,
      playerName: player.name,
      tileId: JAIL_TILE_ID,
      accent: '#dc2626',
      duration: 2100,
    });
  }

  calculateRent(tile, prop, diceTotal = 7) {
    const ownerId = prop.ownerId;
    if (tile.type === 'transport') {
      const ownedCount = getGroupTiles('transport', this.board).filter(
        (t) => this.properties[t.id]?.ownerId === ownerId
      ).length;
      return tile.rents[Math.min(Math.max(ownedCount - 1, 0), tile.rents.length - 1)];
    }
    if (tile.type === 'utility') {
      const ownedCount = getGroupTiles('utility', this.board).filter(
        (t) => this.properties[t.id]?.ownerId === ownerId
      ).length;
      return ownedCount >= 2 ? diceTotal * 250_000 : diceTotal * 120_000;
    }
    if (tile.type === 'property') {
      const level = prop.level || 0;
      let rent = tile.rents[Math.min(level, tile.rents.length - 1)];
      if (level === 0) {
        const groupTiles = getGroupTiles(tile.group, this.board);
        const ownsAll = groupTiles.every((t) => this.properties[t.id]?.ownerId === ownerId);
        if (ownsAll) {
          rent = Math.round(rent * 1.5);
        }
      }
      return rent;
    }
    return 0;
  }

  resolveLanding(player, canRollAgain) {
    if (this.destroyed) return;
    const tile = getTileById(player.position, this.board);
    const diceSum = this.lastDice[0] + this.lastDice[1];

    // 1. START
    if (tile.type === 'start') {
      this.statusText = `${player.name} berhenti di Gapura Mulai!`;
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 700);
      return;
    }

    // 2. JAIL (just visiting)
    if (tile.type === 'jail') {
      this.statusText = `${player.name} cuma mampir lihat-lihat di Rutan KPK.`;
      this.addLog(`${player.name} mampir berkunjung di Rutan KPK (aman!).`);
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 750);
      return;
    }

    // 3. GO TO JAIL (OTT KPK)
    if (tile.type === 'gotojail') {
      this.sendToJail(player);
      this.statusText = `${player.name} terkena OTT KPK! Langsung masuk Rutan KPK!`;
      this.addLog(`🚨 ${player.name} kena OTT KPK dan langsung digelandang ke Rutan KPK!`, 'jail');
      this.emitEvent('teleport_pawn', { playerId: player.id, toPos: JAIL_TILE_ID });
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(false), 1500);
      return;
    }

    // 4. FREE PARKING / KAS NEGARA JACKPOT
    if (tile.type === 'freeparking') {
      const payout = this.kasNegara;
      player.money += payout;
      this.kasNegara = INITIAL_KAS_NEGARA;
      this.floatMoney(player.id, payout);
      this.emitEvent('sfx', { sound: 'jackpot' });
      this.emitEvent('cutscene', {
        kind: 'jackpot',
        title: `JACKPOT ${formatShortRupiah(payout)}!`,
        subtitle: `${player.name} mencairkan seluruh Dana Kas Negara!`,
        badge: 'KAS NEGARA CAIR',
        characterId: player.characterId,
        playerName: player.name,
        tileId: tile.id,
        accent: '#eab308',
        duration: 2200,
      });
      this.addLog(`💰 JACKPOT! ${player.name} mencairkan Kas Negara sebesar ${formatShortRupiah(payout)}!`, 'money');
      this.speak(player, 'rentReceive', `Cair! Kas Negara ${formatShortRupiah(payout)} masuk kantong!`);
      this.statusText = `${player.name} memenangkan jackpot Kas Negara ${formatShortRupiah(payout)}!`;
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 1300);
      return;
    }

    // 5. TAX (PBB / PAJAK JALAN)
    if (tile.type === 'tax') {
      const tax = tile.taxAmount || 500_000;
      this.statusText = `${player.name} harus bayar ${tile.name} (${formatShortRupiah(tax)}).`;
      this.chargePlayer(player, tax, null, true, `${tile.name}`, () => {
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 900);
      });
      return;
    }

    // 6. POLICY OR LOBBY CARD
    if (tile.type === 'policy' || tile.type === 'lobby') {
      const card = drawRandomCard(tile.type);
      this.activeCard = {
        ...card,
        playerId: player.id,
        playerName: player.name,
      };
      this.phase = 'ACTION_PENDING';
      this.pendingAction = {
        type: 'card_ack',
        playerId: player.id,
        card,
        canRollAgain,
      };
      this.emitEvent('sfx', { sound: 'card' });
      this.emitEvent('cutscene', {
        kind: 'card_draw',
        title: card.title,
        subtitle: `${player.name} membuka Kartu ${tile.type === 'policy' ? 'Kebijakan' : 'Lobi Orang Dalam'}`,
        badge: tile.type === 'policy' ? 'KARTU KEBIJAKAN' : 'KARTU LOBI',
        characterId: player.characterId,
        playerName: player.name,
        tileId: tile.id,
        accent: tile.type === 'policy' ? '#2563eb' : '#d97706',
        duration: 1550,
      });
      this.speak(player, 'card');
      this.statusText = `${player.name} membuka kartu ${tile.type === 'policy' ? 'Kebijakan' : 'Lobi Orang Dalam'}: ${card.title}`;
      this.addLog(`🃏 ${player.name} mendapat kartu "${card.title}" — ${card.description}`, 'card');
      this.broadcast();

      if (player.isBot || !player.connected) {
        this.botTimeout = setTimeout(() => {
          this.handleAcknowledgeCard(player.id);
        }, this.speed === 'fast' ? 1600 : 2300);
      } else {
        this.scheduleCountdown(12, () => {
          if (this.pendingAction?.type === 'card_ack') {
            this.handleAcknowledgeCard(player.id);
          }
        });
      }
      return;
    }

    // 7. PROPERTY / TRANSPORT / UTILITY
    const prop = this.properties[tile.id];

    // Unowned -> Offer to buy
    if (!prop) {
      if (player.money >= tile.price) {
        this.phase = 'ACTION_PENDING';
        this.pendingAction = {
          type: 'buy_property',
          playerId: player.id,
          tileId: tile.id,
          price: tile.price,
          canRollAgain,
        };
        this.statusText = `${player.name} mempertimbangkan membeli ${tile.name} (${formatShortRupiah(tile.price)})`;
        this.broadcast();

        if (player.isBot || !player.connected) {
          this.botTimeout = setTimeout(() => {
            // Bot buys aggressively if it keeps a safety buffer or is cheap
            const shouldBuy = player.money - tile.price >= 1_200_000 || tile.price <= 2_200_000;
            this.handleBuyDecision(player.id, shouldBuy);
          }, this.speed === 'fast' ? 900 : 1300);
        } else {
          this.scheduleCountdown(this.actionDurationSec, () => {
            if (this.pendingAction?.type === 'buy_property') {
              this.handleBuyDecision(player.id, false);
            }
          });
        }
      } else {
        this.statusText = `${player.name} tidak cukup uang untuk membeli ${tile.name}.`;
        this.addLog(`${player.name} mampir di ${tile.name}, tapi saldo belum cukup.`);
        this.broadcast();
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 850);
      }
      return;
    }

    // Owned by self -> Offer upgrade if property & level < 3
    if (prop.ownerId === player.id) {
      if (tile.type === 'property' && prop.level < 3 && player.money >= tile.upgradeCost) {
        this.phase = 'ACTION_PENDING';
        this.pendingAction = {
          type: 'upgrade_property',
          playerId: player.id,
          tileId: tile.id,
          level: prop.level,
          cost: tile.upgradeCost,
          canRollAgain,
        };
        this.statusText = `${player.name} bisa mengembangkan ${tile.name} ke Level ${prop.level + 1}!`;
        this.broadcast();

        if (player.isBot || !player.connected) {
          this.botTimeout = setTimeout(() => {
            const shouldUpgrade = player.money - tile.upgradeCost >= 2_500_000;
            this.handleUpgradeDecision(player.id, shouldUpgrade);
          }, this.speed === 'fast' ? 850 : 1200);
        } else {
          this.scheduleCountdown(this.actionDurationSec, () => {
            if (this.pendingAction?.type === 'upgrade_property') {
              this.handleUpgradeDecision(player.id, false);
            }
          });
        }
      } else {
        this.statusText = `${player.name} bersantai di properti miliknya sendiri (${tile.name}).`;
        this.broadcast();
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 700);
      }
      return;
    }

    // Owned by opponent -> Pay rent!
    const owner = this.getPlayer(prop.ownerId);
    if (!owner || owner.bankrupt) {
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 600);
      return;
    }

    const rent = this.calculateRent(tile, prop, diceSum);
    this.statusText = `${player.name} membayar sewa ${formatShortRupiah(rent)} ke ${owner.name} di ${tile.name}!`;
    this.chargePlayer(player, rent, owner.id, false, `sewa ${tile.name} ke ${owner.name}`, () => {
      this.speak(player, 'rentPay');
      setTimeout(() => {
        if (!this.destroyed) this.speak(owner, 'rentReceive');
      }, 650);
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 1150);
    });
  }

  chargePlayer(player, amount, creditorId, toKas, reason, onPaid) {
    if (player.money >= amount) {
      player.money -= amount;
      this.floatMoney(player.id, -amount);
      if (creditorId) {
        const creditor = this.getPlayer(creditorId);
        if (creditor && !creditor.bankrupt) {
          creditor.money += amount;
          this.floatMoney(creditor.id, amount);
        }
      } else if (toKas) {
        this.kasNegara += amount;
      }
      this.emitEvent('sfx', { sound: amount >= 1_500_000 ? 'ouch' : 'pay' });
      this.addLog(`💸 ${player.name} membayar ${formatShortRupiah(amount)} (${reason}).`, 'money');
      this.broadcast();
      onPaid();
      return;
    }

    // Not enough cash! Check if player has assets to liquidate
    const ownedIds = Object.entries(this.properties)
      .filter(([, p]) => p.ownerId === player.id)
      .map(([tid]) => Number(tid));

    if (ownedIds.length === 0) {
      // Immediate bankruptcy
      this.declareBankruptcy(player, creditorId, toKas, reason);
      return;
    }

    // Enter DEBT_RESOLUTION
    this.phase = 'DEBT_RESOLUTION';
    player.debtAmount = amount;
    player.debtCreditorId = creditorId;
    player.debtToKas = toKas;
    this.pendingAction = {
      type: 'debt_resolution',
      playerId: player.id,
      amount,
      creditorId,
      toKas,
      reason,
      canRollAgain: false,
    };
    this.statusText = `${player.name} kekurangan dana (${formatShortRupiah(amount)})! Jual aset atau nyatakan bangkrut.`;
    this.addLog(`⚠️ Saldo ${player.name} tidak cukup untuk membayar ${formatShortRupiah(amount)} (${reason})!`, 'warn');
    this.broadcast();

    if (player.isBot || !player.connected) {
      this.botTimeout = setTimeout(() => {
        this.botResolveDebt(player);
      }, 1100);
    } else {
      this.scheduleCountdown(35, () => {
        if (this.phase === 'DEBT_RESOLUTION' && this.currentPlayer?.id === player.id) {
          this.botResolveDebt(player);
        }
      });
    }
  }

  botResolveDebt(player) {
    // Sell cheapest properties until debt covered, otherwise declare bankruptcy
    const owned = Object.entries(this.properties)
      .filter(([, p]) => p.ownerId === player.id)
      .map(([tid, p]) => ({ tile: getTileById(Number(tid), this.board), prop: p }))
      .sort((a, b) => (a.tile.price || 0) - (b.tile.price || 0));

    for (const item of owned) {
      if (player.money >= player.debtAmount) break;
      this.sellPropertyInternal(player, item.tile.id);
    }

    if (player.money >= player.debtAmount) {
      this.settleDebt(player);
    } else {
      this.declareBankruptcy(player, player.debtCreditorId, player.debtToKas, this.pendingAction?.reason || 'utang');
    }
  }

  settleDebt(player) {
    if (this.phase !== 'DEBT_RESOLUTION') return;
    const amount = player.debtAmount;
    const creditorId = player.debtCreditorId;
    const toKas = player.debtToKas;
    const reason = this.pendingAction?.reason || 'kewajiban';

    // Immediately lock phase to prevent double-settle or post-settle sell/bankrupt race exploits!
    this.phase = 'RESOLVING';
    player.money = Math.max(0, player.money - amount);
    player.debtAmount = 0;
    player.debtCreditorId = null;
    player.debtToKas = false;
    this.pendingAction = null;

    this.floatMoney(player.id, -amount);
    if (creditorId) {
      const creditor = this.getPlayer(creditorId);
      if (creditor && !creditor.bankrupt) {
        creditor.money += amount;
        this.floatMoney(creditor.id, amount);
      }
    } else if (toKas) {
      this.kasNegara += amount;
    }

    this.addLog(`✅ ${player.name} berhasil melunasi ${formatShortRupiah(amount)} (${reason})!`, 'money');
    this.emitEvent('sfx', { sound: 'pay' });
    this.broadcast();
    this.moveTimeout = setTimeout(() => this.endTurn(false), 850);
  }

  declareBankruptcy(player, creditorId, toKas, reason) {
    if (!player || player.bankrupt || this.phase === 'GAME_OVER') return;
    this.clearTimers();
    this.phase = 'RESOLVING';
    this.pendingTrade = null;
    const remainingCash = Math.max(0, player.money);
    player.money = 0;
    player.bankrupt = true;
    player.debtAmount = 0;
    player.debtCreditorId = null;
    this.pendingAction = null;

    if (creditorId) {
      const creditor = this.getPlayer(creditorId);
      if (creditor && !creditor.bankrupt) {
        creditor.money += remainingCash;
        // Transfer properties to creditor at level 0
        for (const [tid, prop] of Object.entries(this.properties)) {
          if (prop.ownerId === player.id) {
            this.properties[tid] = { ownerId: creditor.id, level: 0 };
          }
        }
      }
    } else {
      if (toKas) this.kasNegara += remainingCash;
      for (const [tid, prop] of Object.entries(this.properties)) {
        if (prop.ownerId === player.id) {
          delete this.properties[tid];
        }
      }
    }

    this.emitEvent('sfx', { sound: 'bankrupt' });
    this.emitEvent('cutscene', {
      kind: 'bankrupt',
      title: `${player.name.toUpperCase()} BANGKRUT!`,
      subtitle: `Seluruh aset disita karena gagal membayar ${reason}`,
      badge: 'SITA ASET BANK',
      characterId: player.characterId,
      playerName: player.name,
      accent: '#991b1b',
      duration: 2100,
    });
    this.addLog(`💀 BANGKRUT! ${player.name} disita bank karena gagal membayar ${reason}!`, 'warn');
    this.speak(player, 'rentPay', 'Asetku disita semua... saya bangkrut!');
    this.statusText = `${player.name} dinyatakan BANGKRUT!`;
    this.broadcast();

    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.moveTimeout = setTimeout(() => this.finishGame(), 1500);
    } else {
      this.moveTimeout = setTimeout(() => this.endTurn(false), 1500);
    }
  }

  handleDeclareBankruptcy(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || player.bankrupt) return { error: 'Pemain tidak valid.' };
    if (this.phase === 'DEBT_RESOLUTION' && this.currentPlayer?.id === playerId) {
      this.declareBankruptcy(player, player.debtCreditorId, player.debtToKas, this.pendingAction?.reason || 'utang');
      return { ok: true };
    }
    return { error: 'Hanya bisa menyatakan bangkrut saat tidak mampu melunasi tagihan.' };
  }

  handleAcknowledgeCard(playerId) {
    if (this.phase !== 'ACTION_PENDING' || !this.pendingAction || this.pendingAction.type !== 'card_ack') {
      return { error: 'Tidak ada kartu aktif.' };
    }
    if (this.pendingAction.playerId !== playerId) return { error: 'Bukan giliran Anda.' };

    this.clearTimers();
    const { card, canRollAgain } = this.pendingAction;
    const player = this.getPlayer(playerId);
    this.phase = 'RESOLVING';
    this.pendingAction = null;
    this.activeCard = null;

    const eff = card.effect;
    if (eff.type === 'money') {
      player.money += eff.amount;
      this.floatMoney(player.id, eff.amount);
      this.emitEvent('sfx', { sound: 'cash' });
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 850);
      return { ok: true };
    }

    if (eff.type === 'tax') {
      this.chargePlayer(player, eff.amount, null, true, card.title, () => {
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 850);
      });
      return { ok: true };
    }

    if (eff.type === 'per_property') {
      const count = Object.values(this.properties).filter((p) => p.ownerId === player.id).length;
      const total = count * eff.amount;
      if (total === 0) {
        this.addLog(`${player.name} belum punya properti, efek kartu tidak berpengaruh.`);
        this.broadcast();
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 750);
      } else if (total > 0) {
        player.money += total;
        this.floatMoney(player.id, total);
        this.emitEvent('sfx', { sound: 'cash' });
        this.addLog(`${player.name} menerima total ${formatShortRupiah(total)} dari ${count} properti!`, 'money');
        this.broadcast();
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 850);
      } else {
        this.chargePlayer(player, Math.abs(total), null, !!eff.toKas, `${card.title} (${count} properti)`, () => {
          this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 850);
        });
      }
      return { ok: true };
    }

    if (eff.type === 'jail_free_card') {
      player.jailFreeCards += 1;
      this.addLog(`${player.name} menyimpan 1 Kartu Kenalan Orang Dalam!`, 'card');
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 800);
      return { ok: true };
    }

    if (eff.type === 'go_to_jail') {
      this.sendToJail(player);
      this.emitEvent('teleport_pawn', { playerId: player.id, toPos: JAIL_TILE_ID });
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(false), 1200);
      return { ok: true };
    }

    if (eff.type === 'kas_half') {
      const gain = Math.max(500_000, Math.floor(this.kasNegara / 2));
      this.kasNegara = Math.max(INITIAL_KAS_NEGARA, this.kasNegara - gain);
      player.money += gain;
      this.floatMoney(player.id, gain);
      this.emitEvent('sfx', { sound: 'jackpot' });
      this.addLog(`${player.name} menerima ${formatShortRupiah(gain)} dari Kas Negara!`, 'money');
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 900);
      return { ok: true };
    }

    if (eff.type === 'collect_all') {
      let collected = 0;
      for (const other of this.getActivePlayers()) {
        if (other.id === player.id) continue;
        const paid = Math.max(0, Math.min(other.money, eff.amount));
        other.money -= paid;
        collected += paid;
        if (paid > 0) this.floatMoney(other.id, -paid);
      }
      player.money += collected;
      if (collected > 0) this.floatMoney(player.id, collected);
      this.emitEvent('sfx', { sound: 'cash' });
      this.addLog(`${player.name} mengumpulkan total ${formatShortRupiah(collected)} dari semua pemain!`, 'money');
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 900);
      return { ok: true };
    }

    if (eff.type === 'pay_all') {
      const others = this.getActivePlayers().filter((o) => o.id !== player.id);
      const total = others.length * eff.amount;
      if (total === 0) {
        this.broadcast();
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 700);
        return { ok: true };
      }
      if (player.money >= total) {
        player.money -= total;
        this.floatMoney(player.id, -total);
        for (const other of others) {
          other.money += eff.amount;
          this.floatMoney(other.id, eff.amount);
        }
        this.emitEvent('sfx', { sound: 'pay' });
        this.broadcast();
        this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 900);
      } else {
        this.chargePlayer(player, total, null, true, card.title, () => {
          this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 900);
        });
      }
      return { ok: true };
    }

    if (eff.type === 'move_to' || eff.type === 'move_to_random_property' || eff.type === 'move_to_nearest_transport') {
      const fromPos = player.position;
      let toPos = eff.tileId ?? 0;

      if (eff.type === 'move_to_random_property') {
        const propTiles = this.board.filter((t) => t.type === 'property');
        const pick = propTiles[Math.floor(Math.random() * propTiles.length)];
        toPos = pick ? pick.id : 1;
        this.addLog(`✈️ ${player.name} terbang dinas menuju ${getTileById(toPos, this.board).name}!`, 'card');
      } else if (eff.type === 'move_to_nearest_transport') {
        const transportIds = this.board.filter((t) => t.type === 'transport').map((t) => t.id);
        const ahead = transportIds.find((id) => id > fromPos);
        toPos = ahead !== undefined ? ahead : (transportIds[0] ?? 5);
        this.addLog(`🚆 ${player.name} meluncur cepat menuju ${getTileById(toPos, this.board).name}!`, 'card');
      }

      const passedStart = eff.collectStart && (toPos === 0 || toPos < fromPos);
      player.position = toPos;
      if (passedStart) {
        player.money += PASS_START_BONUS;
        this.floatMoney(player.id, PASS_START_BONUS);
        this.addLog(`${player.name} melewati Gapura Mulai (+${formatShortRupiah(PASS_START_BONUS)})!`, 'money');
      }
      this.emitEvent('teleport_pawn', { playerId: player.id, toPos });
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.resolveLanding(player, canRollAgain), 900);
      return { ok: true };
    }

    if (eff.type === 'move_rel') {
      const toPos = ((player.position + eff.steps) % TOTAL_TILES + TOTAL_TILES) % TOTAL_TILES;
      player.position = toPos;
      this.emitEvent('teleport_pawn', { playerId: player.id, toPos });
      this.broadcast();
      this.moveTimeout = setTimeout(() => this.resolveLanding(player, canRollAgain), 900);
      return { ok: true };
    }

    this.broadcast();
    this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 700);
    return { ok: true };
  }

  handleBuyDecision(playerId, buy) {
    if (this.phase !== 'ACTION_PENDING' || !this.pendingAction || this.pendingAction.type !== 'buy_property') {
      return { error: 'Tidak ada penawaran beli aktif.' };
    }
    if (this.pendingAction.playerId !== playerId) return { error: 'Bukan giliran Anda.' };

    this.clearTimers();
    const { tileId, price, canRollAgain } = this.pendingAction;
    const player = this.getPlayer(playerId);
    const tile = getTileById(tileId, this.board);
    this.phase = 'RESOLVING';
    this.pendingAction = null;

    if (buy && player.money >= price && !this.properties[tileId]) {
      player.money -= price;
      this.properties[tileId] = { ownerId: player.id, level: 0 };
      this.floatMoney(player.id, -price);
      this.emitEvent('sfx', { sound: 'buy' });
      this.emitEvent('cutscene', {
        kind: 'buy_property',
        title: tile.name.toUpperCase(),
        subtitle: `${player.name} resmi membeli aset seharga ${formatShortRupiah(price)}!`,
        badge: 'ASET BARU',
        characterId: player.characterId,
        playerName: player.name,
        tileId,
        accent: tile.color || '#16a34a',
        duration: 1650,
      });
      this.speak(player, 'buy');
      this.addLog(`🏠 ${player.name} membeli ${tile.name} seharga ${formatShortRupiah(price)}!`, 'buy');
      this.statusText = `${player.name} resmi memiliki ${tile.name}!`;
    } else {
      this.addLog(`${player.name} memilih tidak membeli ${tile.name}.`);
      this.statusText = `${player.name} melewatkan ${tile.name}.`;
    }

    this.broadcast();
    this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 850);
    return { ok: true };
  }

  handleUpgradeDecision(playerId, upgrade) {
    if (this.phase !== 'ACTION_PENDING' || !this.pendingAction || this.pendingAction.type !== 'upgrade_property') {
      return { error: 'Tidak ada penawaran upgrade aktif.' };
    }
    if (this.pendingAction.playerId !== playerId) return { error: 'Bukan giliran Anda.' };

    this.clearTimers();
    const { tileId, canRollAgain } = this.pendingAction;
    this.phase = 'RESOLVING';
    this.pendingAction = null;

    if (upgrade) {
      this.handleUpgradeProperty(playerId, tileId, true);
    }

    this.broadcast();
    this.moveTimeout = setTimeout(() => this.endTurn(canRollAgain), 800);
    return { ok: true };
  }

  handleUpgradeProperty(playerId, tileId, silentTurnCheck = false) {
    const player = this.getPlayer(playerId);
    if (!player || player.bankrupt) return { error: 'Pemain tidak valid.' };
    if (!silentTurnCheck) {
      if (this.currentPlayer?.id !== playerId) {
        return { error: 'Hanya bisa mengembangkan properti saat giliran Anda.' };
      }
      if (this.phase !== 'WAITING_ROLL') {
        return { error: 'Upgrade manual hanya bisa dilakukan sebelum melempar dadu.' };
      }
    }
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= TOTAL_TILES) {
      return { error: 'ID petak tidak valid.' };
    }

    const tile = getTileById(tileId, this.board);
    const prop = this.properties[tileId];
    if (!prop || prop.ownerId !== playerId) return { error: 'Anda bukan pemilik properti ini.' };
    if (tile.type !== 'property') return { error: 'Properti ini tidak bisa di-upgrade.' };
    if (prop.level >= 3) return { error: 'Properti sudah di level maksimal (Landmark).' };
    if (player.money < tile.upgradeCost) return { error: 'Saldo tidak cukup untuk upgrade.' };

    if (!silentTurnCheck) this.pendingTrade = null;
    player.money -= tile.upgradeCost;
    prop.level += 1;
    const levelNames = ['Tanah', 'Ruko', 'Gedung', 'Landmark'];
    this.floatMoney(player.id, -tile.upgradeCost);
    this.emitEvent('sfx', { sound: 'upgrade' });
    this.emitEvent('cutscene', {
      kind: 'upgrade_property',
      title: `${levelNames[prop.level].toUpperCase()} DI ${tile.name.toUpperCase()}!`,
      subtitle: `${player.name} mengembangkan properti (${formatShortRupiah(tile.upgradeCost)})`,
      badge: `UPGRADE LV.${prop.level}`,
      characterId: player.characterId,
      playerName: player.name,
      tileId,
      accent: tile.color || '#0284c7',
      duration: 1700,
    });
    this.addLog(
      `🏗️ ${player.name} membangun ${levelNames[prop.level]} di ${tile.name} (${formatShortRupiah(tile.upgradeCost)})!`,
      'buy'
    );
    if (!silentTurnCheck) this.broadcast();
    return { ok: true };
  }

  sellPropertyInternal(player, tileId) {
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= TOTAL_TILES) return 0;
    const prop = this.properties[tileId];
    if (!prop || prop.ownerId !== player.id) return 0;
    const tile = getTileById(tileId, this.board);
    const invested = (tile.price || 0) + (prop.level || 0) * (tile.upgradeCost || 0);
    const refund = Math.round(invested * 0.7);
    delete this.properties[tileId];
    player.money += refund;
    this.floatMoney(player.id, refund);
    this.emitEvent('sfx', { sound: 'cash' });
    this.addLog(`🏷️ ${player.name} menjual ${tile.name} ke bank seharga ${formatShortRupiah(refund)}.`, 'money');
    return refund;
  }

  handleSellProperty(playerId, tileId) {
    const player = this.getPlayer(playerId);
    if (!player || player.bankrupt) return { error: 'Pemain tidak valid.' };
    if (this.currentPlayer?.id !== playerId) {
      return { error: 'Hanya bisa menjual properti saat giliran Anda.' };
    }
    if (this.phase !== 'WAITING_ROLL' && this.phase !== 'DEBT_RESOLUTION') {
      return { error: 'Tidak bisa menjual properti pada fase ini.' };
    }
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= TOTAL_TILES) {
      return { error: 'ID petak tidak valid.' };
    }
    const prop = this.properties[tileId];
    if (!prop || prop.ownerId !== playerId) return { error: 'Bukan pemilik properti ini.' };

    // Cancel any open trade offer to prevent asset-disappearing trade exploits!
    this.pendingTrade = null;
    this.sellPropertyInternal(player, tileId);

    // If resolving debt and now has enough money, settle immediately!
    if (this.phase === 'DEBT_RESOLUTION' && player.money >= player.debtAmount) {
      this.clearTimers();
      this.settleDebt(player);
      return { ok: true };
    }

    this.broadcast();
    return { ok: true };
  }

  handleProposeTrade(fromId, rawPayload = {}) {
    if (this.phase !== 'WAITING_ROLL') {
      return { error: 'Dagang hanya bisa dilakukan sebelum melempar dadu pada giliran Anda.' };
    }
    if (this.currentPlayer?.id !== fromId) return { error: 'Hanya bisa mengajukan dagang saat giliran Anda.' };
    if (this.pendingTrade) return { error: 'Masih ada penawaran dagang yang sedang diproses.' };
    if (this.tradesThisTurn >= MAX_TRADES_PER_TURN) {
      return { error: `Maksimal ${MAX_TRADES_PER_TURN} tawaran dagang per giliran.` };
    }

    const { toId, offerTiles = [], requestTiles = [], offerMoney = 0, requestMoney = 0 } = rawPayload || {};
    const fromPlayer = this.getPlayer(fromId);
    const toPlayer = this.getPlayer(toId);
    if (!fromPlayer || fromPlayer.bankrupt || !toPlayer || toPlayer.bankrupt || fromId === toId) {
      return { error: 'Target pemain tidak valid.' };
    }

    const safeOfferMoney = safeNonNegInt(offerMoney, fromPlayer.money);
    const safeRequestMoney = safeNonNegInt(requestMoney, toPlayer.money);
    if (Number(offerMoney) > fromPlayer.money) return { error: 'Uang tawaran melebihi saldo Anda.' };
    if (Number(requestMoney) > toPlayer.money) return { error: 'Uang permintaan melebihi saldo lawan.' };

    // Strict array validation + deduplication via Set (blocks duplicate-tile infinite money exploit!)
    const rawOfferArr = Array.isArray(offerTiles) ? offerTiles : [];
    const rawRequestArr = Array.isArray(requestTiles) ? requestTiles : [];
    const validOfferTiles = Array.from(
      new Set(
        rawOfferArr
          .map((x) => Number(x))
          .filter((tid) => Number.isInteger(tid) && tid >= 0 && tid < TOTAL_TILES && this.properties[tid]?.ownerId === fromId)
      )
    );
    const validRequestTiles = Array.from(
      new Set(
        rawRequestArr
          .map((x) => Number(x))
          .filter((tid) => Number.isInteger(tid) && tid >= 0 && tid < TOTAL_TILES && this.properties[tid]?.ownerId === toId)
      )
    );

    if (
      validOfferTiles.length === 0 &&
      validRequestTiles.length === 0 &&
      safeOfferMoney === 0 &&
      safeRequestMoney === 0
    ) {
      return { error: 'Isi minimal satu properti atau nominal uang.' };
    }

    this.tradesThisTurn += 1;

    const trade = {
      id: `tr_${Date.now()}`,
      fromId,
      fromName: fromPlayer.name,
      toId,
      toName: toPlayer.name,
      offerTiles: validOfferTiles,
      requestTiles: validRequestTiles,
      offerMoney: safeOfferMoney,
      requestMoney: safeRequestMoney,
    };

    // Bot anti-farming valuation: must receive at least 105% of fair value & refuses pure cash begging!
    if (toPlayer.isBot || !toPlayer.connected) {
      const valueOf = (tids, money) =>
        money +
        tids.reduce((acc, tid) => {
          const t = getTileById(tid, this.board);
          const lvl = this.properties[tid]?.level || 0;
          return acc + (t.price || 0) + lvl * (t.upgradeCost || 0);
        }, 0);

      const botGets = valueOf(validOfferTiles, safeOfferMoney);
      const botGives = valueOf(validRequestTiles, safeRequestMoney);

      if (botGives > 0 && botGets >= Math.ceil(botGives * 1.05)) {
        this.executeTrade(trade);
        this.speak(toPlayer, 'buy', 'Deal! Penawaran yang menarik nih!');
      } else {
        this.addLog(`🤝 ${toPlayer.name} menolak tawaran dagang dari ${fromPlayer.name}.`);
        this.speak(toPlayer, 'rentPay', 'Nggak dulu deh, rugi bandar!');
        this.broadcast();
      }
      return { ok: true };
    }

    this.pendingTrade = trade;
    this.addLog(`🤝 ${fromPlayer.name} mengirim tawaran dagang ke ${toPlayer.name}.`);
    this.broadcast();
    return { ok: true };
  }

  handleRespondTrade(playerId, accept) {
    if (this.phase !== 'WAITING_ROLL' || !this.pendingTrade) return { error: 'Tidak ada tawaran dagang.' };
    if (this.pendingTrade.toId !== playerId) return { error: 'Tawaran ini bukan untuk Anda.' };

    const trade = this.pendingTrade;
    this.pendingTrade = null;

    if (!accept) {
      this.addLog(`🤝 ${trade.toName} menolak tawaran dagang dari ${trade.fromName}.`);
      this.broadcast();
      return { ok: true };
    }

    const ok = this.executeTrade(trade);
    if (!ok) {
      this.addLog(`⚠️ Transaksi dagang dibatalkan karena saldo/kepemilikan aset berubah.`, 'warn');
      this.broadcast();
      return { error: 'Transaksi dibatalkan karena aset/saldo berubah.' };
    }
    return { ok: true };
  }

  executeTrade(trade) {
    const fromP = this.getPlayer(trade.fromId);
    const toP = this.getPlayer(trade.toId);
    if (!fromP || !toP || fromP.bankrupt || toP.bankrupt) return false;
    if (fromP.money < trade.offerMoney || toP.money < trade.requestMoney) return false;

    // Atomic precondition verification: ALL promised tiles must still belong to their owners!
    for (const tid of trade.offerTiles) {
      if (this.properties[tid]?.ownerId !== fromP.id) return false;
    }
    for (const tid of trade.requestTiles) {
      if (this.properties[tid]?.ownerId !== toP.id) return false;
    }

    fromP.money = fromP.money - trade.offerMoney + trade.requestMoney;
    toP.money = toP.money - trade.requestMoney + trade.offerMoney;

    for (const tid of trade.offerTiles) {
      this.properties[tid].ownerId = toP.id;
    }
    for (const tid of trade.requestTiles) {
      this.properties[tid].ownerId = fromP.id;
    }

    this.emitEvent('sfx', { sound: 'buy' });
    this.emitEvent('cutscene', {
      kind: 'trade_deal',
      title: 'DEAL DAGANG SAH!',
      subtitle: `${fromP.name} & ${toP.name} menuntaskan pertukaran aset!`,
      badge: 'TRANSAKSI BERHASIL',
      characterId: fromP.characterId,
      playerName: fromP.name,
      accent: '#059669',
      duration: 1600,
    });
    this.addLog(`🤝 DEAL! ${fromP.name} dan ${toP.name} menyelesaikan transaksi dagang!`, 'buy');
    this.broadcast();
    return true;
  }

  endTurn(canRollAgain) {
    if (this.destroyed) return;
    this.clearTimers();

    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.finishGame();
      return;
    }

    const curr = this.currentPlayer;
    if (canRollAgain && curr && !curr.bankrupt && !curr.inJail) {
      this.addLog(`🎲 Dadu kembar! ${curr.name} mendapat giliran bonus!`);
      this.startTurn();
      return;
    }

    if (curr) curr.turnsTaken += 1;
    this.consecutiveDoubles = 0;

    // Advance to next non-bankrupt player
    const prevIndex = this.turnIndex;
    let nextIndex = (this.turnIndex + 1) % this.players.length;
    let wrapped = nextIndex <= prevIndex;
    let guard = 0;
    while (this.players[nextIndex].bankrupt && guard < this.players.length) {
      const nextNext = (nextIndex + 1) % this.players.length;
      if (nextNext <= nextIndex) wrapped = true;
      nextIndex = nextNext;
      guard++;
    }

    this.turnIndex = nextIndex;
    if (wrapped) {
      this.round += 1;
      if (this.round > this.maxRounds) {
        this.round = this.maxRounds;
        this.finishGame();
        return;
      }
    }

    this.startTurn();
  }

  finishGame() {
    if (this.destroyed) return;
    this.clearTimers();
    this.phase = 'GAME_OVER';
    this.pendingAction = null;
    this.activeCard = null;
    this.pendingTrade = null;

    this.rankings = [...this.players]
      .map((p) => ({
        id: p.id,
        name: p.name,
        characterId: p.characterId,
        isBot: p.isBot,
        bankrupt: p.bankrupt,
        money: p.money,
        netWorth: this.computeNetWorth(p),
        propertyCount: Object.values(this.properties).filter((pr) => pr.ownerId === p.id).length,
      }))
      .sort((a, b) => {
        if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
        return b.netWorth - a.netWorth;
      });

    this.winner = this.rankings[0] || null;
    if (this.winner) {
      this.statusText = `🏆 ${this.winner.name} memenangkan Monopoli Negeri Konoha!`;
      this.addLog(`🏆 PERMAINAN SELESAI! Pemenangnya adalah ${this.winner.name} (${formatShortRupiah(this.winner.netWorth)})!`, 'money');
      const winPlayer = this.getPlayer(this.winner.id);
      if (winPlayer) this.speak(winPlayer, 'win');
    }
    this.emitEvent('sfx', { sound: 'jackpot' });
    if (this.winner) {
      this.emitEvent('cutscene', {
        kind: 'victory',
        title: `${this.winner.name.toUpperCase()} JUARA!`,
        subtitle: `Sultan Terkaya Negeri Konoha — Kekayaan ${formatShortRupiah(this.winner.netWorth)}`,
        badge: 'PEMENANG MUTLAK',
        characterId: this.winner.characterId,
        playerName: this.winner.name,
        accent: '#eab308',
        duration: 2800,
      });
    }
    this.broadcast();
  }

  setPlayerConnection(playerId, connected) {
    const p = this.getPlayer(playerId);
    if (!p || p.isBot) return;
    p.connected = connected;
    if (!connected && this.currentPlayer?.id === playerId && this.phase === 'WAITING_ROLL') {
      // Auto play after short grace period if disconnected on their turn
      this.clearTimers();
      this.botTimeout = setTimeout(() => {
        if (!this.destroyed && !p.connected && this.phase === 'WAITING_ROLL' && this.currentPlayer?.id === playerId) {
          this.addLog(`${p.name} terputus sementara — dadu dilempar otomatis.`, 'system');
          this.handleRoll(playerId, 'acak', true);
        }
      }, 4000);
    }
    this.broadcast();
  }
}
