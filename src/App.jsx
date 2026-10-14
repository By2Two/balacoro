import React, { useEffect, useRef, useState } from "react";
import { Game } from "./threejs/Game";
import BootScreen from "./components/BootScreen.jsx";
import MenuScreen from "./components/MenuScreen.jsx";
import CustomizeMenu from "./components/CustomizeMenu.jsx";
import MonsterLabMenu from "./components/MonsterLabMenu.jsx";
import OptionsMenu from "./components/OptionsMenu.jsx";
import PowersMenu from "./components/PowersMenu.jsx";
import UpgradesMenu from "./components/UpgradesMenu.jsx";
import LevelUpModal from "./components/LevelUpModal.jsx";
import SkillChoiceModal from "./components/SkillChoiceModal.jsx";
import Banner from "./components/Banner.jsx";
import AchievementToasts, {
  ACHIEVEMENT_TOAST_DURATION,
} from "./components/AchievementToasts.jsx";
import DifficultySkull from "./components/DifficultySkull.jsx";
import DebugOverlays from "./components/DebugOverlays.jsx";
import VitalsHud from "./components/VitalsHud.jsx";
import SkillHud from "./components/SkillHud.jsx";
import PauseOverlay from "./components/PauseOverlay.jsx";
import ConfirmLeaveModal from "./components/ConfirmLeaveModal.jsx";
import GameOverOverlay from "./components/GameOverOverlay.jsx";
import RotateDeviceOverlay from "./components/RotateDeviceOverlay.jsx";
import MobilePauseButton from "./components/MobilePauseButton.jsx";
import { addCoins as bankCoins } from "./core/wallet.js";
import { isDebugMode } from "./core/debug.js";
import {
  saveRun,
  loadRun,
  clearRun,
  hasRun,
  isAutoSaveEnabled,
} from "./core/saveGame.js";
import TouchJoystick from "./components/TouchJoystick.jsx";
import { addRunToHistory } from "./core/history.js";
import { audio } from "./core/AudioEngine.js";

export default function App() {
  const threeRef = useRef(null);
  const [screen, setScreen] = useState("boot");
  const [gameOver, setGameOver] = useState(false);
  const [gameOverStats, setGameOverStats] = useState({
    level: 1,
    elapsedTime: 0,
  });
  const [isCameraInfoVisible, setIsCameraInfoVisible] = useState(false);
  const [isPlayerStatsVisible, setIsPlayerStatsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(0);
  const [skillChoices, setSkillChoices] = useState(null);
  const [skillRerolls, setSkillRerolls] = useState(0);
  const [banner, setBanner] = useState(null);
  const [achievementToasts, setAchievementToasts] = useState([]);
  const [continuePrompt, setContinuePrompt] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const pendingLoadRef = useRef(null);
  const [isTouchDevice] = useState(
    () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  );
  const [isPortrait, setIsPortrait] = useState(
    () =>
      typeof window !== "undefined" &&
      window.innerHeight > window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const updateOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  const blockedByOrientation = isTouchDevice && isPortrait;

  useEffect(() => {
    if (
      screen === "game" &&
      blockedByOrientation &&
      !isPaused &&
      gameRef.current
    ) {
      gameRef.current.scene.togglePause();
    }
  }, [blockedByOrientation, screen, isPaused]);

  useEffect(() => {
    if (screen !== "game") {
      return undefined;
    }
    const onVisibilityChange = () => {
      const scene = gameRef.current?.scene;
      if (document.hidden && scene && !scene.isPaused) {
        scene.togglePause();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [screen]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    const request =
      el.requestFullscreen ??
      el.webkitRequestFullscreen ??
      el.msRequestFullscreen;
    request?.call(el)?.catch?.(() => {});
  };

  const handleJoystickChange = (x, z) => {
    gameRef.current?.scene?.player?.input?.setMoveVector(x, z);
  };

  const handleAimJoystickChange = (x, z) => {
    gameRef.current?.scene?.player?.input?.setAimVector(x, z);
  };

  const tapSkillKey = (code) => {
    gameRef.current?.scene?.player?.input?.tapKey(code);
  };

  const [stats, setStats] = useState({
    camPos: { x: 0, y: 0, z: 0 },
    difficulty: 0,
    elapsedTime: 0,
    clock: "12:00",
    power: 0,
    powerProgress: 0,
    player: {
      health: 100,
      maxHealth: 100,
      attackSpeed: 1,
      speed: 5,
      sharpening: 1,
      glowing: false,
      healthRegen: 0,
      criticalDamage: 0,
      criticalChance: 0,
      lifeSteal: 0,
      thorns: false,
      thornsDamage: 0,
      level: 1,
      currentXP: 0,
      xpToLevelUp: 10,
      active_skills: {
        dash: { enabled: false, cooldown: 0 },
        forceField: { enabled: false, shieldCount: 0 },
      },
      slotPowers: { q: null, e: null },
      powerCooldowns: { q: 0, e: 0 },
    },
  });

  const gameRef = useRef(null);

  useEffect(() => {
    if (screen !== "boot") {
      return undefined;
    }
    const enter = () => {
      audio.play("gameStart");
      setScreen("menu");
    };
    window.addEventListener("keydown", enter);
    window.addEventListener("pointerdown", enter);
    return () => {
      window.removeEventListener("keydown", enter);
      window.removeEventListener("pointerdown", enter);
    };
  }, [screen]);

  useEffect(() => {
    if (screen === "boot") {
      return undefined;
    }
    if (screen !== "game") {
      audio.playMusic("musicMenu");
      return undefined;
    }

    const game = new Game(threeRef.current, pendingLoadRef.current);
    pendingLoadRef.current = null;
    gameRef.current = game;
    game.scene.onGameOver = (finalStats) => {
      setGameOver(true);
      setGameOverStats(finalStats);
      bankCoins(game.scene.takeUnbankedCoins());
      clearRun();
      addRunToHistory({
        level: finalStats.level ?? 1,
        time: finalStats.elapsedTime ?? 0,
        coins: Math.floor(finalStats.coins ?? 0),
        power: finalStats.power ?? 0,
        date: Date.now(),
      });
      audio.setPaused(true);
      audio.playMusic("musicGameOver");
    };
    game.scene.onPauseChange = (paused) => {
      setIsPaused(paused);
      if (paused) {
        audio.play("uiPause");
        audio.setPaused(true);
      } else {
        audio.setPaused(false);
        audio.play("uiPause");
      }
    };
    game.scene.onShowLevelUp = (pending = 1) => {
      setLevelUpOpen(Math.max(pending, 1));
      audio.setPaused(true);
    };
    game.scene.onShowSkillChoices = (skills, rerolls = 0) => {
      setSkillChoices(skills);
      setSkillRerolls(rerolls);
      audio.setPaused(true);
    };
    game.scene.onBanner = (nextBanner) => {
      setBanner(nextBanner);
    };
    game.scene.onAchievement = (achievement) => {
      const toast = { ...achievement, key: `${achievement.id}-${Date.now()}` };
      setAchievementToasts((list) => [...list, toast]);
      setTimeout(() => {
        setAchievementToasts((list) => list.filter((entry) => entry.key !== toast.key));
      }, ACHIEVEMENT_TOAST_DURATION);
    };
    let animationFrameId;

    function updateStats() {
      if (gameRef.current && gameRef.current.camera) {
        const { x, y, z } = gameRef.current.camera.position;
        const difficulty = gameRef.current.scene.currentDifficulty || 0;
        const elapsedTime = gameRef.current.scene.elapsedTime || 0;
        const clock = gameRef.current.clockText ?? "12:00";
        const coins = gameRef.current.scene.coinsEarned ?? 0;
        const power = gameRef.current.scene.currentPower ?? 0;
        const powerProgress = gameRef.current.scene.currentPowerContinuous ?? 0;
        const player = gameRef.current.scene.player;

        setStats({
          camPos: { x, y, z },
          difficulty,
          elapsedTime,
          clock,
          coins,
          power,
          powerProgress,
          player: {
            health: player?.health ?? 100,
            maxHealth: player?.maxHealth ?? 100,
            attackSpeed: player?.attackSpeed ?? 1,
            speed: player?.speed ?? 5,
            damage: player?.damage ?? 1,
            sharpening: player?.sharpening ?? 1,
            glowing: player?.glowing ?? false,
            healthRegen: player?.healthRegen ?? 0,
            criticalDamage: player?.criticalDamage ?? 0,
            criticalChance: player?.criticalChance ?? 0,
            lifeSteal: player?.lifeSteal ?? 0,
            thorns: player?.thorns ?? false,
            thornsDamage: player?.thornsDamage ?? 0,
            level: player?.level ?? 1,
            currentXP: player?.currentXP ?? 0,
            xpToLevelUp: player?.getXPToLevelUp?.() ?? 10,
            active_skills: player?.active_skills ?? {},
            shieldCount: player?.shieldCount ?? 0,
            slotPowers: player?.slotPowers ?? { q: null, e: null },
            powerCooldowns: player?.powerCooldowns ?? { q: 0, e: 0 },
            secondWindUsed: player?.secondWindUsed ?? false,
            dashCooldownTimer: player?.dashCooldownTimer ?? 0,
            dashCharges: player?.dashCharges ?? 0,
            forceFieldCooldownTimer: player?.forceFieldCooldownTimer ?? 0,
          },
        });
      }
      animationFrameId = requestAnimationFrame(updateStats);
    }

    updateStats();

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [screen]);

  useEffect(() => {
    const debugHotkeys = {
      Digit2: () => setIsCameraInfoVisible((previousValue) => !previousValue),
      Digit3: () => setIsPlayerStatsVisible((previousValue) => !previousValue),
      Digit4: () => gameRef.current?.scene?.player?.gainXP(10),
      Digit5: () => gameRef.current?.scene?.debugAdjustDifficulty(1),
      Digit6: () => gameRef.current?.scene?.debugAdjustDifficulty(-1),
      Digit7: () => gameRef.current?.scene?.player?.debugGodMode(),
      Digit0: () => gameRef.current?.scene?.debugSpawnItemNearby(),
    };

    function onKeyDown(event) {
      if (event.code === "Escape") {
        if (gameRef.current && gameRef.current.scene) {
          gameRef.current.scene.togglePause();
        }
        return;
      }

      if (!isDebugMode()) {
        return;
      }

      const runDebugHotkey = debugHotkeys[event.code];
      if (runDebugHotkey) {
        runDebugHotkey();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const returnToMenu = () => {
    if (!gameOver) {
      bankCoins(gameRef.current?.scene?.takeUnbankedCoins() ?? 0);
      if (gameRef.current && isAutoSaveEnabled()) {
        saveRun(gameRef.current.createSaveSnapshot());
      }
    }
    setScreen("menu");
    setIsPaused(false);
    setGameOver(false);
    setLevelUpOpen(0);
    setSkillChoices(null);
    setBanner(null);
    setConfirmLeaveOpen(false);
  };

  if (screen === "boot") {
    return (
      <>
        <BootScreen />
        {blockedByOrientation && <RotateDeviceOverlay />}
      </>
    );
  }

  if (screen === "menu") {
    const savedGame = continuePrompt ? loadRun() : null;
    return (
      <>
        <MenuScreen
          onPlay={() => {
            if (hasRun()) {
              setContinuePrompt(true);
            } else {
              setScreen("game");
            }
          }}
          onCustomize={() => setScreen("customize")}
          onMonsterLab={() => setScreen("monsterlab")}
          onOptions={() => setScreen("options")}
          onPowers={() => setScreen("powers")}
          onUpgrades={() => setScreen("upgrades")}
          continuePrompt={continuePrompt}
          savedGame={savedGame}
          onContinueGame={() => {
            pendingLoadRef.current = loadRun();
            setContinuePrompt(false);
            setScreen("game");
          }}
          onNewGame={() => {
            clearRun();
            setContinuePrompt(false);
            setScreen("game");
          }}
          isTouchDevice={isTouchDevice}
          onRequestFullscreen={requestFullscreen}
        />
        {blockedByOrientation && <RotateDeviceOverlay />}
      </>
    );
  }

  if (screen === "customize") {
    return (
      <>
        <CustomizeMenu onBack={() => setScreen("menu")} />
        {blockedByOrientation && <RotateDeviceOverlay />}
      </>
    );
  }

  if (screen === "options") {
    return (
      <>
        <OptionsMenu onBack={() => setScreen("menu")} />
        {blockedByOrientation && <RotateDeviceOverlay />}
      </>
    );
  }

  if (screen === "powers") {
    return (
      <>
        <PowersMenu onBack={() => setScreen("menu")} />
        {blockedByOrientation && <RotateDeviceOverlay />}
      </>
    );
  }

  if (screen === "upgrades") {
    return (
      <>
        <UpgradesMenu onBack={() => setScreen("menu")} />
        {blockedByOrientation && <RotateDeviceOverlay />}
      </>
    );
  }

  if (screen === "monsterlab") {
    return (
      <>
        <MonsterLabMenu onBack={() => setScreen("menu")} />
        {blockedByOrientation && <RotateDeviceOverlay />}
      </>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={threeRef} style={{ width: "100%", height: "100%" }} />

      <VitalsHud
        player={stats.player}
        coins={stats.coins}
        clock={stats.clock}
      />

      <DebugOverlays
        isCameraInfoVisible={isCameraInfoVisible}
        isPlayerStatsVisible={isPlayerStatsVisible}
        stats={stats}
      />

      <DifficultySkull power={stats.power} progress={stats.powerProgress} />
      <Banner banner={banner} />
      <AchievementToasts toasts={achievementToasts} />

      {isTouchDevice && !isPaused && !gameOver && (
        <>
          <TouchJoystick side="left" onChange={handleJoystickChange} />
          <TouchJoystick
            side="right"
            knobColor="rgba(0, 229, 255, 0.85)"
            knobGlow="rgba(0, 229, 255, 0.55)"
            onChange={handleAimJoystickChange}
          />
          <MobilePauseButton
            onPress={() => gameRef.current?.scene?.togglePause()}
          />
        </>
      )}

      {levelUpOpen > 0 && (
        <LevelUpModal
          pending={levelUpOpen}
          onChoose={(passive) => {
            setLevelUpOpen(0);
            audio.setPaused(false);
            gameRef.current?.scene.choosePassive(passive);
          }}
        />
      )}

      {skillChoices && (
        <SkillChoiceModal
          skills={skillChoices}
          activeSkills={stats.player.active_skills}
          isTouchDevice={isTouchDevice}
          rerolls={skillRerolls}
          onReroll={() => gameRef.current?.scene.rerollSkillChoices()}
          onChoose={(skill) => {
            setSkillChoices(null);
            audio.setPaused(false);
            gameRef.current?.scene.chooseSkill(skill);
          }}
        />
      )}

      <SkillHud player={stats.player} tapSkillKey={tapSkillKey} />

      {isPaused && !gameOver && (
        <PauseOverlay
          onResume={() => {
            if (gameRef.current) {
              gameRef.current.scene.togglePause();
            }
          }}
          onSaveQuit={() => {
            if (gameRef.current) {
              saveRun(gameRef.current.createSaveSnapshot());
              returnToMenu();
            }
          }}
          onBackToMenu={() => setConfirmLeaveOpen(true)}
        />
      )}

      {isPaused && !gameOver && confirmLeaveOpen && (
        <ConfirmLeaveModal
          onSaveLeave={() => {
            if (gameRef.current) {
              saveRun(gameRef.current.createSaveSnapshot());
            }
            setConfirmLeaveOpen(false);
            returnToMenu();
          }}
          onLeaveWithoutSaving={() => {
            setConfirmLeaveOpen(false);
            returnToMenu();
          }}
          onCancel={() => setConfirmLeaveOpen(false)}
        />
      )}

      {gameOver && (
        <GameOverOverlay
          stats={gameOverStats}
          onRestart={() => location.reload()}
        />
      )}

      {blockedByOrientation && <RotateDeviceOverlay />}
    </div>
  );
}
