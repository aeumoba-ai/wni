import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { COLOR_GROUPS, formatShortRupiah, getTileById } from '../shared/boardData.js';
import { cryptoRandomToken } from '../shared/security.js';
import { RoomClient } from './net/RoomClient.js';
import { Scene3D } from './game/Scene3D.js';
import { soundEngine } from './game/SoundEngine.js';
import LobbyModal from './components/LobbyModal.jsx';
import RoomWaitingModal from './components/RoomWaitingModal.jsx';
import HowToPlayModal from './components/HowToPlayModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import GameHUD from './components/GameHUD.jsx';
import ActionModals from './components/ActionModals.jsx';
import PortoModal from './components/PortoModal.jsx';
import TradeModal, { IncomingTradeModal } from './components/TradeModal.jsx';
import { ChatDrawer, LogDrawer } from './components/SideDrawers.jsx';
import CutsceneOverlay from './components/CutsceneOverlay.jsx';
import { DEFAULT_GRAPHICS_SETTINGS, GRAPHICS_STORAGE_KEY, loadGraphicsSettings, normalizeGraphicsSettings } from './game/GraphicsSettings.js';

const SMOOTH_ANIM_STORAGE_KEY = 'monopoli_konoha_smooth_anim_v1';

function loadSmoothAnimationPref() {
  try {
    return localStorage.getItem(SMOOTH_ANIM_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getOrCreateGuestId() {
  let id = sessionStorage.getItem('konoha_guest_id');
  if (!id || !/^guest_[a-zA-Z0-9_-]{8,48}$/.test(id)) {
    id = `guest_${cryptoRandomToken(10)}`;
    sessionStorage.setItem('konoha_guest_id', id);
  }
  return id;
}

function getInviteCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room') || params.get('code') || '';
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  } catch {
    return '';
  }
}

export default function App() {
  const [guestId] = useState(getOrCreateGuestId);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('konoha_guest_name') || 'Miko');
  const [characterId, setCharacterId] = useState(() => localStorage.getItem('konoha_guest_char') || 'ojol');
  const [initialInviteCode] = useState(getInviteCodeFromUrl);

  const [room, setRoom] = useState(null);
  const [netStatus, setNetStatus] = useState('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPorto, setShowPorto] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState(null);
  const [unreadChat, setUnreadChat] = useState(0);

  const [audioSettings, setAudioSettings] = useState(() => soundEngine.getSettings());
  const [smoothAnimation, setSmoothAnimation] = useState(loadSmoothAnimationPref);
  const [graphicsSettings, setGraphicsSettings] = useState(loadGraphicsSettings);
  const [activeCutscene, setActiveCutscene] = useState(null);
  const [cinematicActive, setCinematicActive] = useState(false);
  const [dialogues, setDialogues] = useState({});
  const [moneyDeltas, setMoneyDeltas] = useState({});

  const canvasMountRef = useRef(null);
  const sceneRef = useRef(null);
  const clientRef = useRef(null);
  const cutsceneTimerRef = useRef(null);
  const cutsceneKeyRef = useRef(null);
  const smoothAnimRef = useRef(smoothAnimation);
  smoothAnimRef.current = smoothAnimation;
  const showChatRef = useRef(showChat);
  showChatRef.current = showChat;

  const dismissCutscene = useCallback(() => {
    if (cutsceneTimerRef.current) {
      clearTimeout(cutsceneTimerRef.current);
      cutsceneTimerRef.current = null;
    }
    if (cutsceneKeyRef.current) {
      sceneRef.current?.endCinematic(cutsceneKeyRef.current);
      cutsceneKeyRef.current = null;
    }
    setActiveCutscene(null);
  }, []);

  const triggerCutscene = useCallback(
    (payload, force = false) => {
      if (!force && !smoothAnimRef.current) return;
      if (!payload || !payload.kind) return;
      if (cutsceneTimerRef.current) {
        clearTimeout(cutsceneTimerRef.current);
      }
      const duration = payload.duration || 1800;
      const item = { ...payload, id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, duration };
      setActiveCutscene(item);

      // One cinematic session per cutscene: hides obstructing UI temporarily and
      // lets the 3D camera choreograph, then restores the previous camera exactly.
      if (cutsceneKeyRef.current) sceneRef.current?.endCinematic(cutsceneKeyRef.current);
      const key = `cutscene:${item.id}`;
      cutsceneKeyRef.current = key;
      sceneRef.current?.beginCinematic(key, {
        duration: duration + 260,
        kind: 'cutscene',
        focus:
          typeof payload.tileId === 'number'
            ? { kind: 'tile', tileId: payload.tileId, radius: 27, strength: 0.6, phi: 0.78 }
            : null,
      });

      sceneRef.current?.playCutsceneCamera(payload.kind, payload.tileId ?? null, payload.accent);
      cutsceneTimerRef.current = setTimeout(() => {
        cutsceneTimerRef.current = null;
        if (cutsceneKeyRef.current === key) {
          cutsceneKeyRef.current = null;
          sceneRef.current?.endCinematic(key);
        }
        setActiveCutscene((prev) => (prev?.id === item.id ? null : prev));
      }, duration);
    },
    []
  );

  const handleToggleSmoothAnimation = useCallback(
    (nextVal) => {
      const enabled = Boolean(nextVal);
      setSmoothAnimation(enabled);
      smoothAnimRef.current = enabled;
      try {
        localStorage.setItem(SMOOTH_ANIM_STORAGE_KEY, String(enabled));
      } catch {
        // ignore
      }
      sceneRef.current?.setSmoothAnimation(enabled);
      if (!enabled) {
        dismissCutscene();
      }
    },
    [dismissCutscene]
  );

  const handleSetGraphicsPreset = useCallback((preset) => {
    setGraphicsSettings((current) => normalizeGraphicsSettings({ ...current, preset }));
  }, []);

  const handleSetVisualStyle = useCallback((visualStyle) => {
    setGraphicsSettings((current) => normalizeGraphicsSettings({ ...current, visualStyle }));
  }, []);

  const handleUpdateGraphicsCustom = useCallback((patch) => {
    setGraphicsSettings((current) =>
      normalizeGraphicsSettings({ ...current, preset: 'custom', custom: { ...current.custom, ...patch } })
    );
  }, []);

  const handleResetGraphics = useCallback(() => {
    setGraphicsSettings((current) =>
      normalizeGraphicsSettings({ ...DEFAULT_GRAPHICS_SETTINGS, visualStyle: current.visualStyle })
    );
  }, []);

  const handlePreviewCutscene = useCallback(() => {
    sceneRef.current?.setSmoothAnimation(true);
    soundEngine.playJackpot();
    triggerCutscene(
      {
        kind: 'jackpot',
        title: 'MODE SMOOTH & CUTSCENE AKTIF!',
        subtitle: 'Animasi 3D sinematik, partikel emas & seluruh transisi halus siap dimainkan!',
        badge: 'PRATINJAU CUTSCENE',
        characterId,
        accent: '#eab308',
        duration: 2400,
      },
      true
    );
  }, [characterId, triggerCutscene]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? '' : prev));
    }, 3200);
  }, []);

  useEffect(() => {
    localStorage.setItem('konoha_guest_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('konoha_guest_char', characterId);
  }, [characterId]);

  // Mount Three.js 3D Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;
    const scene = new Scene3D(
      canvasMountRef.current,
      (tileId) => {
        setSelectedTileId(tileId);
      },
      (active) => setCinematicActive(Boolean(active))
    );
    scene.setSmoothAnimation(smoothAnimRef.current);
    scene.setGraphicsSettings(loadGraphicsSettings());
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Keep Three.js scene synced with Smooth Animation setting
  useEffect(() => {
    sceneRef.current?.setSmoothAnimation(smoothAnimation);
  }, [smoothAnimation]);

  // Graphics apply locally only (not synchronized across players), and persist per device.
  useEffect(() => {
    sceneRef.current?.setGraphicsSettings(graphicsSettings);
    try {
      localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(graphicsSettings));
    } catch {
      // Ignore storage restrictions (e.g. private browsing quota).
    }
  }, [graphicsSettings]);

  // Sync 3D Scene with active room state
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    if (room?.status === 'playing' && room.game) {
      sc.setMode('game');
      sc.syncGameState(room.game);
    } else {
      sc.setMode('lobby');
      sc.syncGameState(null);
    }
  }, [room]);

  // Initialize Vercel-Ready PeerJS + BroadcastChannel RoomClient
  useEffect(() => {
    const client = new RoomClient({
      guestId,
      onNetStatus: (st) => setNetStatus(st),
      onRoomUpdate: (updatedRoom) => {
        setRoom(updatedRoom);
      },
      onChatMessage: (msg) => {
        setRoom((prev) => {
          if (!prev) return prev;
          const exists = prev.chat.some((m) => m.id === msg.id);
          if (exists) return prev;
          return { ...prev, chat: [...prev.chat, msg].slice(-60) };
        });
        if (!showChatRef.current && !msg.system) {
          setUnreadChat((n) => n + 1);
        }
      },
      onKicked: (message) => {
        setRoom(null);
        setSelectedTileId(null);
        window.history.replaceState(null, '', window.location.pathname);
        setError(message || 'Terputus dari ruangan.');
      },
      onGameEvent: (event, data) => {
        if (event === 'dice_rolled') {
          sceneRef.current?.animateDiceAndMove(data);
        } else if (event === 'teleport_pawn') {
          sceneRef.current?.teleportPawn(data.playerId, data.toPos);
        } else if (event === 'sfx') {
          soundEngine.playByName(data.sound);
        } else if (event === 'turn_started') {
          if (data.playerId === guestId) {
            soundEngine.playTurnChime();
          }
        } else if (event === 'dialogue') {
          setDialogues((prev) => ({ ...prev, [data.playerId]: data }));
          setTimeout(() => {
            setDialogues((prev) => {
              if (prev[data.playerId]?.ts !== data.ts) return prev;
              const copy = { ...prev };
              delete copy[data.playerId];
              return copy;
            });
          }, 3800);
        } else if (event === 'cutscene') {
          triggerCutscene(data);
        } else if (event === 'money_delta') {
          setMoneyDeltas((prev) => ({ ...prev, [data.playerId]: data }));
          setTimeout(() => {
            setMoneyDeltas((prev) => {
              if (prev[data.playerId]?.ts !== data.ts) return prev;
              const copy = { ...prev };
              delete copy[data.playerId];
              return copy;
            });
          }, 2100);
        }
      },
    });
    clientRef.current = client;

    return () => {
      dismissCutscene();
      client.destroy();
      clientRef.current = null;
    };
  }, [guestId, triggerCutscene, dismissCutscene]);

  const emitAction = useCallback(
    async (action, payload = {}) => {
      const client = clientRef.current;
      if (!client) return;
      const res = await client.sendAction(action, payload);
      if (res?.error) {
        showToast(res.error);
      }
    },
    [showToast]
  );

  const handleCreateRoom = async (opts) => {
    setBusy(true);
    setError('');
    soundEngine.playClick();
    const res = await clientRef.current?.createRoom(opts);
    setBusy(false);
    if (res?.error) {
      setError(res.error);
    } else if (res?.room) {
      setRoom(res.room);
      const nextUrl = `${window.location.pathname}?room=${res.room.code}`;
      window.history.replaceState(null, '', nextUrl);
    }
  };

  const handleJoinRoom = async (opts) => {
    setBusy(true);
    setError('');
    soundEngine.playClick();
    const res = await clientRef.current?.joinRoom(opts);
    setBusy(false);
    if (res?.error) {
      setError(res.error);
    } else if (res?.room) {
      setRoom(res.room);
      const nextUrl = `${window.location.pathname}?room=${res.room.code}`;
      window.history.replaceState(null, '', nextUrl);
    }
  };

  const handlePreviewRoom = useCallback((code) => {
    return clientRef.current ? clientRef.current.previewRoom(code) : Promise.resolve(null);
  }, []);

  const handleListPublicRooms = useCallback(() => {
    return clientRef.current ? clientRef.current.listPublicRooms() : Promise.resolve([]);
  }, []);

  const handleLeaveRoom = () => {
    soundEngine.playClick();
    clientRef.current?.leaveRoom();
    window.history.replaceState(null, '', window.location.pathname);
    setRoom(null);
    setSelectedTileId(null);
    setShowPorto(false);
    setShowTrade(false);
    setShowChat(false);
    setShowLog(false);
  };

  const handleToggleMute = () => {
    soundEngine.toggleMute();
    setAudioSettings(soundEngine.getSettings());
  };

  const handleToggleBgm = () => {
    soundEngine.toggleBgm();
    setAudioSettings(soundEngine.getSettings());
  };

  const handleUpdateVolume = (channel, percent) => {
    const next = soundEngine.setVolume(channel, percent);
    setAudioSettings(next);
  };

  const handleApplyAudioPreset = (masterPct) => {
    const next = soundEngine.applySettings({
      muted: masterPct === 0,
      master: masterPct,
    });
    setAudioSettings(next);
    if (masterPct > 0) soundEngine.playTurnChime();
  };

  const handleResetAudio = () => {
    const next = soundEngine.resetSettings();
    setAudioSettings(next);
    soundEngine.playTurnChime();
  };

  // Global subtle UI click SFX on every enabled button (respects Suara Klik & UI volume %)
  useEffect(() => {
    const onDocClick = (e) => {
      const btn = e.target?.closest?.('button:not(:disabled)');
      if (!btn) return;
      if (btn.classList.contains('settings-test-btn')) return;
      soundEngine.playClick();
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, []);

  const isPlaying = room?.status === 'playing' && room?.game;
  const incomingTrade =
    isPlaying && room.game.pendingTrade && room.game.pendingTrade.toId === guestId
      ? room.game.pendingTrade
      : null;

  return (
    <div
      className={`app-root ${smoothAnimation ? 'smooth-anim-on' : ''} ${
        cinematicActive ? 'cinematic-active' : ''
      } ${activeCutscene ? 'has-cutscene' : ''} ${
        graphicsSettings.visualStyle === 'pixel' ? 'pixel-style-on' : ''
      }`}
    >
      <div ref={canvasMountRef} className="scene-canvas-container" />

      {toast && <div className="global-toast">{toast}</div>}

      {!room && (
        <LobbyModal
          playerName={playerName}
          setPlayerName={setPlayerName}
          characterId={characterId}
          setCharacterId={setCharacterId}
          initialInviteCode={initialInviteCode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onPreviewRoom={handlePreviewRoom}
          onListPublicRooms={handleListPublicRooms}
          onOpenSettings={() => setShowSettings(true)}
          smoothAnimation={smoothAnimation}
          audioMaster={audioSettings.muted ? 0 : audioSettings.master}
        graphicsPreset={graphicsSettings.preset}
        visualStyle={graphicsSettings.visualStyle}
        busy={busy}
          error={error}
        />
      )}

      {room && room.status === 'waiting' && (
        <RoomWaitingModal
          room={room}
          myId={guestId}
          netStatus={netStatus}
          onAddBot={() => emitAction('add_bot')}
          onRemovePlayer={(targetId) => emitAction('remove_player', { targetId })}
          onUpdateProfile={(p) => emitAction('update_profile', p)}
          onUpdateSettings={(s) => emitAction('update_settings', s)}
          onStartGame={() => emitAction('start_game')}
          onLeaveRoom={handleLeaveRoom}
          onSendChat={(text) => emitAction('send_chat', { text })}
          onOpenSettings={() => setShowSettings(true)}
          error={error}
        />
      )}

      {isPlaying && (
        <>
          <GameHUD
            room={room}
            game={room.game}
            myId={guestId}
            dialogues={dialogues}
            moneyDeltas={moneyDeltas}
            unreadChat={unreadChat}
            onResetCamera={() => sceneRef.current?.resetCamera()}
            onOpenChat={() => {
              setShowLog(false);
              setShowChat((v) => !v);
              setUnreadChat(0);
            }}
            onOpenLog={() => {
              setShowChat(false);
              setShowLog((v) => !v);
            }}
            onOpenSettings={() => setShowSettings(true)}
            onOpenPorto={() => setShowPorto(true)}
            onOpenTrade={() => setShowTrade(true)}
            onRollDice={(mode) => emitAction('game_roll', { mode })}
            onPayBail={() => emitAction('game_pay_bail')}
            onUseJailCard={() => emitAction('game_use_jail_card')}
          />

          <ActionModals
            game={room.game}
            room={room}
            myId={guestId}
            onBuyDecision={(buy) => emitAction('game_buy_decision', { buy })}
            onUpgradeDecision={(upgrade) => emitAction('game_upgrade_decision', { upgrade })}
            onAckCard={() => emitAction('game_ack_card')}
            onOpenPorto={() => setShowPorto(true)}
            onDeclareBankruptcy={() => emitAction('game_declare_bankruptcy')}
            onReturnToLobby={() => emitAction('return_to_lobby')}
            onLeaveRoom={handleLeaveRoom}
          />

          {showPorto && (
            <PortoModal
              game={room.game}
              myId={guestId}
              onUpgrade={(tileId) => emitAction('game_upgrade_property', { tileId })}
              onSell={(tileId) => emitAction('game_sell_property', { tileId })}
              onClose={() => setShowPorto(false)}
            />
          )}

          {showTrade && (
            <TradeModal
              game={room.game}
              myId={guestId}
              onPropose={(payload) => emitAction('game_propose_trade', payload)}
              onClose={() => setShowTrade(false)}
            />
          )}

          {incomingTrade && (
            <IncomingTradeModal
              trade={incomingTrade}
              board={room.game.board}
              onRespond={(accept) => emitAction('game_respond_trade', { accept })}
            />
          )}

          <ChatDrawer
            open={showChat}
            messages={room.chat || []}
            onSend={(text) => emitAction('send_chat', { text })}
            onClose={() => setShowChat(false)}
          />

          <LogDrawer
            open={showLog}
            logs={room.game.logs || []}
            onClose={() => setShowLog(false)}
          />

          {selectedTileId !== null && (() => {
            const tile = getTileById(selectedTileId, room.game.board);
            const prop = room.game.properties?.[tile.id];
            const owner = prop ? room.game.players.find((p) => p.id === prop.ownerId) : null;
            const grp = COLOR_GROUPS[tile.group];
            const lvlNames = ['Tanah', 'Lv.1 Ruko', 'Lv.2 Gedung', 'Lv.3 Landmark'];
            return (
              <div className="tile-inspector-card kraft-card">
                <div className="tile-insp-head" style={{ background: tile.color || '#334155' }}>
                  <div>
                    <div className="tile-insp-sub">
                      {grp?.label || tile.type.toUpperCase()}{tile.province ? ` · ${tile.province}` : ''}
                    </div>
                    <div className="tile-insp-name">{tile.name}</div>
                  </div>
                  <button className="tile-insp-x" onClick={() => setSelectedTileId(null)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="tile-insp-body">
                  {tile.flavor && (
                    <div style={{ display: 'block', fontSize: 11.5, opacity: 0.85, marginBottom: 6, lineHeight: 1.35 }}>
                      {tile.flavor}
                    </div>
                  )}
                  {tile.price && (
                    <div>
                      <span>Harga</span>
                      <strong>{formatShortRupiah(tile.price)}</strong>
                    </div>
                  )}
                  {owner ? (
                    <>
                      <div>
                        <span>Pemilik</span>
                        <strong>{owner.name}</strong>
                      </div>
                      {tile.type === 'property' && (
                        <div>
                          <span>Status</span>
                          <strong>{lvlNames[prop.level || 0]}</strong>
                        </div>
                      )}
                      {tile.rents && (
                        <div>
                          <span>Sewa</span>
                          <strong>{formatShortRupiah(tile.rents[Math.min(prop.level || 0, tile.rents.length - 1)])}</strong>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <span>Info</span>
                      <strong>{tile.price ? 'Belum dimiliki' : tile.subtitle || 'Petak Khusus'}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}

      <SettingsModal
        open={showSettings}
        room={room}
        audioSettings={audioSettings}
        smoothAnimation={smoothAnimation}
        onToggleSmoothAnimation={handleToggleSmoothAnimation}
        onPreviewCutscene={handlePreviewCutscene}
        graphicsSettings={graphicsSettings}
        onSetVisualStyle={handleSetVisualStyle}
        onSetGraphicsPreset={handleSetGraphicsPreset}
        onUpdateGraphicsCustom={handleUpdateGraphicsCustom}
        onResetGraphics={handleResetGraphics}
        onUpdateVolume={handleUpdateVolume}
        onToggleMute={handleToggleMute}
        onToggleBgm={handleToggleBgm}
        onApplyPreset={handleApplyAudioPreset}
        onResetAudio={handleResetAudio}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onLeaveRoom={handleLeaveRoom}
        onClose={() => setShowSettings(false)}
      />

      {smoothAnimation && (
        <CutsceneOverlay cutscene={activeCutscene} onDismiss={dismissCutscene} />
      )}

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
}
