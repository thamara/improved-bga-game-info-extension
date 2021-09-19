# Improved BGA game information

This is a Chrome extension that will display more information about a given game on [Board Game Arena](https://boardgamearena.com). This includes the weigth, rating, ranking and also the the category and mechanisms of the game.
You'll also have a link to quickly look into the game in [Board Game Geek](https://boardgamegeek.com).

![Extension example](example.png)

The extension will include the extended information when in page for games, that is, pages starting with `https://boardgamearena.com/gamepanel`.

**Tip**: It works best if you set BGA language to English.

## Install and development

1. Clone the repository
2. Go to `chrome://extensions`
3. Click `Load unpacked` and select the path for the cloned repository
4. When developing, after making and saving changes, click refresh on the extension

## Suggestions and feedbacks
Feedbacks are more than welcome! Feel free to fill an [issue](https://github.com/thamara/improved-bga-game-info-extension/issues/new) suggesting new fields to be shown, reporting bugs, or any other feedback.

## Known issues
This extension is considered **work in progress**, so a few issues are know:
- Not maching game names: As we do a text based search, some games might not be found. Example: On BGA, the game is called [LLAMA](https://boardgamearena.com/gamepanel?game=lama), while in BGG it's [L.L.A.M.A](https://boardgamegeek.com/boardgame/266083/llm).
- Localization issues: Some games have their names translated in BGA, but BGG API is English based. Example: Using the Portuguese language, the game [6 nimmt!](https://boardgamearena.com/gamepanel?game=sechsnimmt) is translated as "Pega em 6". 

## Credits
All the game information is based [BGG XML API](https://boardgamegeek.com/wiki/page/BGG_XML_API2). The code for parsing the API return is based on [roderickwoodman/boardgameinator](https://github.com/roderickwoodman/boardgameinator).