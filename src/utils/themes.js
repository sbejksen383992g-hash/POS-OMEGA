export const THEMES = [
  { id: 'cyber', name: 'APEX Purple', color: '#a855f7', desc: 'Pure black glass with an electric purple signal', unlock: null },
  { id: 'arctic', name: 'Arctic Glass', color: '#8ed8ff', desc: 'Cool navy surfaces with an ice-blue accent', unlock: { level: 3, label: 'Reach level 3' } },
  { id: 'ember', name: 'Carbon Red', color: '#ff6b5f', desc: 'A serious carbon interface for high-intensity days', unlock: null },
  { id: 'forest', name: 'Emerald Command', color: '#41d69a', desc: 'Graphite depth with a calm emerald signal', unlock: null },
  { id: 'solar', name: 'Solar Gold', color: '#e5b75b', desc: 'Bronze-black surfaces reserved for earned momentum', unlock: { level: 7, label: 'Reach level 7' } },
  { id: 'titanium', name: 'Minimal Titanium', color: '#cbd5e1', desc: 'Neutral graphite with almost no visual noise', unlock: { quests: 25, label: 'Complete 25 quests' } },
  { id: 'royal', name: 'Midnight Violet', color: '#b89cff', desc: 'Controlled violet energy for a higher-rank feel', unlock: null },
]

export function isThemeUnlocked(theme, player, stats) {
  if (!theme.unlock) return true
  if (theme.unlock.level) return player.level >= theme.unlock.level
  if (theme.unlock.streak) return player.streak >= theme.unlock.streak
  if (theme.unlock.bosses) return stats.bossesDefeated >= theme.unlock.bosses
  if (theme.unlock.quests) return stats.questsCompleted >= theme.unlock.quests
  return false
}
