export const ASSETS = {
  dashboardHero: '/assets/images/dashboard-hero.webp',
  dashboardAtmosphere: '/assets/images/dashboard-atmosphere.webp',
  profileHero: '/assets/images/profile-hero.webp',
  profileAtmosphere: '/assets/images/profile-atmosphere.webp',
  nexusIdle: '/assets/nexus/nexus-idle.webp',
  nexusThinking: '/assets/nexus/nexus-thinking.webp',
  nexusSpeaking: '/assets/nexus/nexus-speaking.webp',
  levelupRune: '/assets/images/levelup-rune.webp',
  levelupEnergy: '/assets/images/levelup-energy.webp',
  quests: {
    Health: '/assets/images/quest-health.webp',
    Learning: '/assets/images/quest-learning.webp',
    College: '/assets/images/quest-college.webp',
    Finance: '/assets/images/quest-finance.webp',
    Productivity: '/assets/images/quest-productivity.webp',
    'Personal Development': '/assets/images/quest-personal.webp',
  },
  operations: {
    Health: '/assets/images/operation-health.webp',
    Learning: '/assets/images/operation-learning.webp',
    College: '/assets/images/operation-college.webp',
    Finance: '/assets/images/operation-finance.webp',
    Productivity: '/assets/images/operation-productivity.webp',
    'Personal Development': '/assets/images/operation-personal.webp',
  },
  video: {
    dashboardLoop: '/assets/video/dashboard-loop.mp4',
    nexusLoop: '/assets/video/nexus-loop.mp4',
  },
  audio: {
    click: '/assets/audio/click.mp3',
    hover: '/assets/audio/hover.mp3',
    open: '/assets/audio/open.mp3',
    close: '/assets/audio/close.mp3',
    success: '/assets/audio/success.mp3',
    levelup: '/assets/audio/levelup.mp3',
  },
}

export function getQuestAsset(section = 'Productivity') {
  return ASSETS.quests[section] || ASSETS.quests.Productivity
}

export function getOperationAsset(name = 'Productivity') {
  return ASSETS.operations[name] || ASSETS.operations.Productivity
}
