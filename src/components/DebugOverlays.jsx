import React from "react";

export default function DebugOverlays({
  isCameraInfoVisible,
  isPlayerStatsVisible,
  stats,
}) {
  return (
    <>
      {isCameraInfoVisible && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 10,
            color: "white",
            background: "rgba(0,0,0,0.5)",
            padding: "5px",
            borderRadius: "4px",
            pointerEvents: "none",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
        >
          <div>
            <strong>Camera Pos:</strong> X={stats.camPos.x.toFixed(2)}, Y=
            {stats.camPos.y.toFixed(2)}, Z={stats.camPos.z.toFixed(2)}
          </div>
          <div>
            <strong>Difficulty:</strong> {stats.difficulty}
          </div>
          <div>
            <strong>Total Time:</strong> {stats.elapsedTime.toFixed(2)} s
          </div>
        </div>
      )}

      {isPlayerStatsVisible && (
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 10,
            color: "white",
            background: "rgba(0,0,0,0.5)",
            padding: "5px",
            borderRadius: "4px",
            pointerEvents: "none",
            fontFamily: "monospace",
            fontSize: "14px",
            maxWidth: "300px",
          }}
        >
          <div>
            <strong>Health:</strong> {stats.player.health}
          </div>
          <div>
            <strong>Speed:</strong> {stats.player.speed}
          </div>
          <div>
            <strong>Damage:</strong> {stats.player.damage}
          </div>
          <div>
            <strong>Attack Speed:</strong> {stats.player.attackSpeed.toFixed(2)}
          </div>
          <div>
            <strong>Sharpening:</strong> {stats.player.sharpening}
          </div>
          <div>
            <strong>Health Regen:</strong> {stats.player.healthRegen}
          </div>
          <div>
            <strong>Critical Damage:</strong> {stats.player.criticalDamage}
          </div>
          <div>
            <strong>Critical Chance:</strong>{" "}
            {(stats.player.criticalChance * 100).toFixed(1)}%
          </div>
          <div>
            <strong>Life Steal:</strong> {stats.player.lifeSteal}
          </div>
          <div>
            <strong>Level:</strong> {stats.player.level}
          </div>
          <div>
            <strong>XP:</strong> {stats.player.currentXP.toFixed(1)} /{" "}
            {stats.player.xpToLevelUp.toFixed(1)}
          </div>

          <div>
            <strong>Skills:</strong>
          </div>
          <ul>
            <li>
              Dash: {stats.player.active_skills.dash?.enabled ? "Yes" : "No"}{" "}
              (CD: {stats.player.active_skills.dash?.cooldown}s)
            </li>
            <li>
              Energy Explosion:{" "}
              {stats.player.active_skills.energyExplosion?.enabled
                ? "Yes"
                : "No"}{" "}
              (CD: {stats.player.active_skills.energyExplosion?.cooldown}s, DMG:{" "}
              {stats.player.active_skills.energyExplosion?.damage})
            </li>
            <li>
              Freeze Explosion:{" "}
              {stats.player.active_skills.freezeExplosion?.enabled
                ? "Yes"
                : "No"}{" "}
              (CD: {stats.player.active_skills.freezeExplosion?.cooldown}s,
              Duration:{" "}
              {stats.player.active_skills.freezeExplosion?.freezeDuration}s)
            </li>
            <li>
              Force Field:{" "}
              {stats.player.active_skills.forceField?.enabled ? "Yes" : "No"}{" "}
              (Shields: {stats.player.active_skills.forceField?.shieldCount})
            </li>
            <li>
              Thorns:{" "}
              {stats.player.active_skills.thorns?.enabled ? "Yes" : "No"} (DMG:{" "}
              {stats.player.active_skills.thorns?.damage?.toFixed(1)})
            </li>
            <li>
              Glowing:{" "}
              {stats.player.active_skills.glowing?.enabled ? "Yes" : "No"}
            </li>
            <li>
              Project Glowing:{" "}
              {stats.player.active_skills.projectGlowing?.enabled
                ? "Yes"
                : "No"}
            </li>
          </ul>
        </div>
      )}
    </>
  );
}
