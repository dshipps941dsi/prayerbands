// ============================================================
// Prayer Bands — Verse library (single source of truth)
// /lib/verses.ts
//
// Static reference data: imported wherever verses are shown (band page, etc.).
// To add a verse, add an entry to VERSES with a category that exists in
// CATEGORIES (extra categories like faith/identity/rest still appear in the
// daily "all" rotation even if they have no filter chip).
// ============================================================

export interface Verse {
  ref: string
  text: string
  category: string
}

export const VERSES: Verse[] = [
  { ref: "Joshua 1:9", text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", category: "fear" },
  { ref: "Philippians 4:13", text: "I can do all this through him who gives me strength.", category: "strength" },
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", category: "hope" },
  { ref: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.", category: "fear" },
  { ref: "Psalm 23:1-3", text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", category: "peace" },
  { ref: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", category: "hope" },
  { ref: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest.", category: "rest" },
  { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", category: "trust" },
  { ref: "Psalm 46:1", text: "God is our refuge and strength, an ever-present help in trouble.", category: "strength" },
  { ref: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", category: "love" },
  { ref: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.", category: "hope" },
  { ref: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary.", category: "strength" },
  { ref: "Psalm 34:18", text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", category: "grief" },
  { ref: "2 Corinthians 12:9", text: "My grace is sufficient for you, for my power is made perfect in weakness.", category: "strength" },
  { ref: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", category: "anxiety" },
  { ref: "John 14:27", text: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.", category: "peace" },
  { ref: "Psalm 121:1-2", text: "I lift up my eyes to the mountains -- where does my help come from? My help comes from the Lord, the Maker of heaven and earth.", category: "trust" },
  { ref: "Lamentations 3:22-23", text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.", category: "hope" },
  { ref: "Romans 8:38-39", text: "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God.", category: "love" },
  { ref: "Psalm 27:1", text: "The Lord is my light and my salvation -- whom shall I fear? The Lord is the stronghold of my life -- of whom shall I be afraid?", category: "fear" },
  { ref: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you.", category: "anxiety" },
  { ref: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see.", category: "faith" },
  { ref: "Psalm 139:14", text: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.", category: "identity" },
  { ref: "James 1:2-3", text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.", category: "strength" },
  { ref: "Nahum 1:7", text: "The Lord is good, a refuge in times of trouble. He cares for those who trust in him.", category: "trust" },
  { ref: "Isaiah 43:2", text: "When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you.", category: "fear" },
  { ref: "Psalm 91:1-2", text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, He is my refuge and my fortress, my God, in whom I trust.", category: "trust" },
  { ref: "Colossians 3:15", text: "Let the peace of Christ rule in your hearts, since as members of one body you were called to peace. And be thankful.", category: "peace" },
  { ref: "Zephaniah 3:17", text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", category: "love" },
  { ref: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", category: "fear" },
  { ref: "Psalm 55:22", text: "Cast your cares on the Lord and he will sustain you; he will never let the righteous be shaken.", category: "anxiety" },
  { ref: "Matthew 6:34", text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.", category: "anxiety" },
  { ref: "Psalm 73:26", text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever.", category: "health" },
  { ref: "Jeremiah 17:14", text: "Heal me, Lord, and I will be healed; save me and I will be saved, for you are the one I praise.", category: "health" },
  { ref: "3 John 1:2", text: "Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well.", category: "health" },
  { ref: "Psalm 147:3", text: "He heals the brokenhearted and binds up their wounds.", category: "grief" },
  { ref: "John 11:25", text: "Jesus said to her, I am the resurrection and the life. The one who believes in me will live, even though they die.", category: "grief" },
  { ref: "Revelation 21:4", text: "He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain.", category: "grief" },
  { ref: "Psalm 16:8", text: "I keep my eyes always on the Lord. With him at my right hand, I will not be shaken.", category: "peace" },
  { ref: "Romans 5:3-4", text: "We also glory in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope.", category: "hope" },
  { ref: "Isaiah 26:3", text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.", category: "peace" },
  { ref: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart.", category: "trust" },
  { ref: "Mark 16:15", text: "Go into all the world and preach the gospel to all creation.", category: "purpose" },
  { ref: "Ephesians 2:10", text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.", category: "purpose" },
  { ref: "Micah 6:8", text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.", category: "purpose" },
  { ref: "1 Corinthians 13:4-5", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking.", category: "love" },
  { ref: "Proverbs 17:17", text: "A friend loves at all times, and a brother is born for a time of adversity.", category: "relationships" },
  { ref: "Ecclesiastes 4:9-10", text: "Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up.", category: "relationships" },
  { ref: "Psalm 100:4-5", text: "Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name. For the Lord is good and his love endures forever.", category: "gratitude" },
  { ref: "1 Thessalonians 5:18", text: "Give thanks in all circumstances; for this is God's will for you in Christ Jesus.", category: "gratitude" },
  { ref: "Philippians 4:11", text: "I have learned, in whatsoever state I am, therewith to be content.", category: "gratitude" },
  { ref: "Psalm 22:24", text: "For he has not despised or scorned the suffering of the afflicted one; he has not hidden his face from him but has listened to his cry for help.", category: "loneliness" },
  { ref: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you.", category: "loneliness" },
  { ref: "Hebrews 13:5", text: "Keep your lives free from the love of money and be content with what you have, because God has said, Never will I leave you; never will I forsake you.", category: "loneliness" },
  { ref: "Psalm 56:3", text: "When I am afraid, I put my trust in you.", category: "fear" },
  { ref: "Isaiah 35:4", text: "Say to those with fearful hearts, Be strong, do not fear; your God will come, he will come to save you.", category: "fear" },
  { ref: "Matthew 6:25", text: "Do not worry about your life, what you will eat or drink; or about your body, what you will wear. Is not life more than food, and the body more than clothes?", category: "anxiety" },
  { ref: "John 16:33", text: "I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world.", category: "anxiety" },
  { ref: "Hebrews 6:19", text: "We have this hope as an anchor for the soul, firm and secure.", category: "hope" },
  { ref: "Psalm 33:22", text: "May your unfailing love be with us, Lord, even as we put our hope in you.", category: "hope" },
  { ref: "Exodus 15:2", text: "The Lord is my strength and my defense; he has become my salvation.", category: "strength" },
  { ref: "Habakkuk 3:19", text: "The Sovereign Lord is my strength; he makes my feet like the feet of a deer, he enables me to tread on the heights.", category: "strength" },
  { ref: "2 Thessalonians 3:16", text: "Now may the Lord of peace himself give you peace at all times and in every way.", category: "peace" },
  { ref: "Numbers 6:24-26", text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace.", category: "peace" },
  { ref: "Matthew 5:4", text: "Blessed are those who mourn, for they will be comforted.", category: "grief" },
  { ref: "Psalm 30:5", text: "Weeping may stay for the night, but rejoicing comes in the morning.", category: "grief" },
  { ref: "Proverbs 17:22", text: "A cheerful heart is good medicine, but a crushed spirit dries up the bones.", category: "health" },
  { ref: "Isaiah 53:5", text: "He was pierced for our transgressions, he was crushed for our iniquities; and by his wounds we are healed.", category: "health" },
  { ref: "Psalm 68:6", text: "God sets the lonely in families, he leads out the prisoners with singing.", category: "loneliness" },
  { ref: "Isaiah 41:13", text: "For I am the Lord your God who takes hold of your right hand and says to you, Do not fear; I will help you.", category: "loneliness" },
  { ref: "1 John 4:19", text: "We love because he first loved us.", category: "love" },
  { ref: "John 15:13", text: "Greater love has no one than this: to lay down one's life for one's friends.", category: "love" },
  { ref: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", category: "purpose" },
  { ref: "Jeremiah 1:5", text: "Before I formed you in the womb I knew you, before you were born I set you apart.", category: "purpose" },
  { ref: "Psalm 118:24", text: "This is the day the Lord has made; let us rejoice and be glad in it.", category: "gratitude" },
  { ref: "Colossians 3:17", text: "And whatever you do, whether in word or deed, do it all in the name of the Lord Jesus, giving thanks to God the Father through him.", category: "gratitude" },
  { ref: "Psalm 9:10", text: "Those who know your name trust in you, for you, Lord, have never forsaken those who seek you.", category: "trust" },
  { ref: "Proverbs 16:3", text: "Commit to the Lord whatever you do, and he will establish your plans.", category: "trust" },
  { ref: "Colossians 3:13", text: "Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.", category: "relationships" },
  { ref: "Romans 12:10", text: "Be devoted to one another in love. Honor one another above yourselves.", category: "relationships" },
  { ref: "John 13:34", text: "A new command I give you: Love one another. As I have loved you, so you must love one another.", category: "relationships" },
  { ref: "2 Corinthians 5:7", text: "For we live by faith, not by sight.", category: "faith" },
  { ref: "Mark 11:24", text: "Whatever you ask for in prayer, believe that you have received it, and it will be yours.", category: "faith" },
  { ref: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!", category: "identity" },
  { ref: "1 Peter 2:9", text: "But you are a chosen people, a royal priesthood, a holy nation, God's special possession.", category: "identity" },
  { ref: "Exodus 33:14", text: "My Presence will go with you, and I will give you rest.", category: "rest" },
  { ref: "Psalm 62:1", text: "Truly my soul finds rest in God; my salvation comes from him.", category: "rest" },
]

export const CATEGORIES = [
  { id: 'all', label: "Today's Verse", icon: '✝' },
  { id: 'fear', label: 'Fear', icon: '🛡' },
  { id: 'anxiety', label: 'Anxiety', icon: '🌊' },
  { id: 'hope', label: 'Hope', icon: '🌅' },
  { id: 'strength', label: 'Strength', icon: '⚡' },
  { id: 'peace', label: 'Peace', icon: '🕊' },
  { id: 'grief', label: 'Grief', icon: '🤍' },
  { id: 'health', label: 'Health', icon: '🙏' },
  { id: 'loneliness', label: 'Loneliness', icon: '💛' },
  { id: 'love', label: 'Love', icon: '❤️' },
  { id: 'purpose', label: 'Purpose', icon: '🌟' },
  { id: 'gratitude', label: 'Gratitude', icon: '🌿' },
  { id: 'trust', label: 'Trust', icon: '⚓' },
  { id: 'relationships', label: 'Relationships', icon: '🤝' },
]

export function getDailyVerse(): Verse {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return VERSES[dayOfYear % VERSES.length]
}

export function getVerseForCategory(category: string): Verse {
  if (category === 'all') return getDailyVerse()
  const filtered = VERSES.filter(v => v.category === category)
  if (filtered.length === 0) return getDailyVerse()
  const start = new Date(new Date().getFullYear(), 0, 0)
  const diff = new Date().getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return filtered[dayOfYear % filtered.length]
}
