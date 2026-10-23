export const games=[
 ['Jeopardy!','jeopardy','VOICE'],['Song Quiz','song-quiz','VOICE'],['Wheel of Fortune','wheel-of-fortune','VOICE'],
 ['Guess the Emoji','guess-the-emoji','TOUCH'],['Werds Pur Minite','werds','VOICE'],['Sketchy AF','sketchy-af','DRAW'],
 ['Spot On','spot-on','MOTION'],["Wit’s End",'wits-end','VOICE'],['CoComelon Sing & Play','cocomelon','VOICE'],
 ['Weekend Poker',null,'TOUCH'],['Discat Hero',null,'MOTION'],['Bingo',null,'TOUCH'],['Twenty Questions',null,'VOICE'],['Karaoke',null,'VOICE'],
 ['Game 15 · Preview',null,'PREVIEW'],['Game 16 · Preview',null,'PREVIEW'],['Game 17 · Preview',null,'PREVIEW'],['Game 18 · Preview',null,'PREVIEW'],['Game 19 · Preview',null,'PREVIEW'],['Game 20 · Preview',null,'PREVIEW']
];
// Both endings hand off to the separately built hub. Keep existing scene IDs
// stable for shared review URLs; Fire TV adds an outro and a paywall entry.
export const phases=['Ident','Welcome','Jeopardy!','Answer reveal','Wheel pairing','Mic setup','Hold to speak','Voice celebration','Weekend plan','Finish on phone','Membership','Game night ready','Fire TV paywall'];
