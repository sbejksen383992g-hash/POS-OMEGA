// Nexus app intelligence catalog.
// Common Android launcher package candidates + natural language aliases.
// The native bridge may additionally discover any launcher app installed on the device.

export const NEXUS_APP_CATALOG = [
  { key:'chatgpt', label:'ChatGPT', packages:['com.openai.chatgpt'], aliases:['chatgpt','chat gpt','openai','open ai','my ai app','ai app','the ai app','ai assistant'] },
  { key:'youtube', label:'YouTube', packages:['com.google.android.youtube'], aliases:['youtube','you tube','yt','video app','videos','video platform','watch videos','watch something','the video app','where i watch videos','app for videos'] },
  { key:'whatsapp', label:'WhatsApp', packages:['com.whatsapp'], aliases:['whatsapp','whats app','wa','chat on whatsapp','my whatsapp','my chat app','the chat app','messaging app'] },
  { key:'telegram', label:'Telegram', packages:['org.telegram.messenger'], aliases:['telegram','tg'] },
  { key:'instagram', label:'Instagram', packages:['com.instagram.android'], aliases:['instagram','insta','ig','my instagram','photo social app','the photo app','reels app','the reels app','photo sharing app'] },
  { key:'facebook', label:'Facebook', packages:['com.facebook.katana'], aliases:['facebook','fb'] },
  { key:'gmail', label:'Gmail', packages:['com.google.android.gm'], aliases:['gmail','google mail','mail','my email','email app','email','the mail app','my mail'] },
  { key:'chrome', label:'Chrome', packages:['com.android.chrome'], aliases:['chrome','google chrome','browser','web browser','my browser','internet','the browser','web app'] },
  { key:'maps', label:'Google Maps', packages:['com.google.android.apps.maps'], aliases:['maps','google maps','navigation','navigate','map app','the maps app','navigation app'] },
  { key:'messages', label:'Messages', packages:['com.google.android.apps.messaging','com.android.mms'], aliases:['messages','message app','sms','text messages','texts','my messages','messaging','my texts','texting','the messages app','my texting app'] },
  { key:'spotify', label:'Spotify', packages:['com.spotify.music'], aliases:['spotify','music app','music','my music','listen to music','the music app','where i listen to music'] },
  { key:'clock', label:'Clock', packages:['com.google.android.deskclock','com.oneplus.deskclock','com.oneplus.deskclock2'], aliases:['clock','my clock','the clock','clock app','alarm clock','alarms','alarm app','time app','check the time','show me the time','wake me up','set an alarm','the time app','my alarm'] },
  { key:'calculator', label:'Calculator', packages:['com.google.android.calculator','com.oneplus.calculator','com.android.calculator2'], aliases:['calculator','calc','calculate','my calculator'] },
  { key:'camera', label:'Camera', packages:['com.android.camera2','com.oneplus.camera'], aliases:['camera','the camera','camera app','my camera','take a photo','take a picture','photos camera','the camera app'] },
  { key:'photos', label:'Google Photos', packages:['com.google.android.apps.photos'], aliases:['photos','google photos','gallery','my photos','photo gallery','my gallery','the gallery app','my pictures'] },
  { key:'phone', label:'Phone', packages:['com.google.android.dialer','com.android.dialer','com.oneplus.dialer'], aliases:['phone','dialer','telephone','call app','my phone'] },
  { key:'contacts', label:'Contacts', packages:['com.google.android.contacts','com.android.contacts'], aliases:['contacts','contact app','address book'] },
  { key:'calendar', label:'Calendar', packages:['com.google.android.calendar','com.android.calendar'], aliases:['calendar','google calendar','schedule','my calendar'] },
  { key:'files', label:'Files', packages:['com.google.android.documentsui','com.oneplus.filemanager'], aliases:['files','file manager','my files','documents','file browser','the files app'] },
  { key:'drive', label:'Google Drive', packages:['com.google.android.apps.docs'], aliases:['drive','google drive'] },
  { key:'meet', label:'Google Meet', packages:['com.google.android.apps.meetings'], aliases:['meet','google meet'] },
  { key:'playstore', label:'Google Play Store', packages:['com.android.vending'], aliases:['play store','google play','app store'] },
  { key:'settings', label:'Settings', packages:[], aliases:['settings','device settings','phone settings','my settings'] },
  { key:'recorder', label:'Recorder', packages:['com.oneplus.soundrecorder','com.google.android.apps.recorder'], aliases:['recorder','voice recorder','recording app'] },
  { key:'keep', label:'Google Keep', packages:['com.google.android.keep'], aliases:['keep','google keep','notes'] },
  { key:'linkedin', label:'LinkedIn', packages:['com.linkedin.android'], aliases:['linkedin'] },
  { key:'reddit', label:'Reddit', packages:['com.reddit.frontpage'], aliases:['reddit'] },
  { key:'x', label:'X', packages:['com.twitter.android'], aliases:['x','twitter'] },
  { key:'snapchat', label:'Snapchat', packages:['com.snapchat.android'], aliases:['snapchat','snap'] },
  { key:'discord', label:'Discord', packages:['com.discord'], aliases:['discord'] },
  { key:'amazon', label:'Amazon', packages:['in.amazon.mShop.android.shopping'], aliases:['amazon','shopping'] },
  { key:'flipkart', label:'Flipkart', packages:['com.flipkart.android'], aliases:['flipkart'] },
]

const norm = (v='') => String(v).toLowerCase().trim().replace(/[._-]+/g,' ').replace(/\s+/g,' ')

export function findCatalogApp(query='') {
  const q = norm(query)
  if (!q) return null
  const candidates = NEXUS_APP_CATALOG.flatMap(app => app.aliases.map(alias => ({ app, alias: norm(alias) })))
    .filter(({ alias }) => !!alias)
  const exact = candidates.find(({ alias }) => q === alias)
  if (exact) return exact.app

  const embedded = candidates
    .filter(({ alias }) => q.includes(alias) || alias.includes(q))
    .sort((a, b) => b.alias.length - a.alias.length)
  if (embedded[0]) return embedded[0].app

  const words = q.split(' ').filter(Boolean)
  if (!words.length) return null
  const ranked = NEXUS_APP_CATALOG.map((app) => {
    const all = app.aliases.map(norm).concat(norm(app.label))
    let score = 0
    for (const word of words) {
      if (word.length < 3) continue
      if (all.some(alias => alias === word)) score += 8
      else if (all.some(alias => alias.includes(word))) score += 4
    }
    return { app, score }
  }).sort((a, b) => b.score - a.score)
  return ranked[0]?.score >= Math.max(8, Math.ceil(words.length * 3)) ? ranked[0].app : null
}

export function appKeysForModel() {
  return NEXUS_APP_CATALOG
    .filter(app => app.key !== 'settings')
    .map(app => app.key)
}

export const APP_QUERY_HINTS = NEXUS_APP_CATALOG.map(app => `${app.label}: ${app.aliases.slice(0,4).join(', ')}`).join(' | ')
