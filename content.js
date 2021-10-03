// The code for parsing BGG's XML API is based on https://github.com/roderickwoodman/boardgameinator

function makeReadable(str) {
    const paragraphs = str
        .replace(/&amp;/g, '&')
        .replace(/&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”')
        .replace(/&ndash;/g, '–')
        .replace(/&mdash;/g, '–')
        .replace(/&bull;/g, '∙')
        .replace(/&nbsp;/g, ' ')
        .split('&#10;');
    return paragraphs;
}

function parseExactSearchApiXml(res) {
    const responseDoc = new DOMParser().parseFromString(res, 'application/xml')
    const gamesHtmlCollection = responseDoc.getElementsByTagName("item")
    if (gamesHtmlCollection.length >= 1) {
        return parseInt(gamesHtmlCollection[0].id);
    }
    return -1;
}

function parseLooseSearchApiXml(res, game_release_year_bga) {
    const responseDoc = new DOMParser().parseFromString(res, 'application/xml')
    const gamesHtmlCollection = responseDoc.getElementsByTagName("item")
    for (let game of gamesHtmlCollection) {
        game_release_year_bgg = game.getElementsByTagName("yearpublished")[0].attributes.item(0).value;
        if (game_release_year_bgg == game_release_year_bga) {
            return parseInt(game.id);
        }
    }
    return -1;
}

function parseGamedataApiXml(str) {
    let game = {
        "attributes": {
            "categories": [],
            "mechanics": []
        }
    }
    const responseDoc = new DOMParser().parseFromString(str, "application/xml")
    const gamesHtmlCollection = responseDoc.getElementsByTagName("item")
    if (gamesHtmlCollection.length) {
        game["id"] = parseInt(gamesHtmlCollection[0].id)
        gamesHtmlCollection[0].childNodes.forEach(
            function (node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if ((node.tagName === "name") && (node.getAttribute("type") === "primary")) {
                        game["name"] = node.getAttribute("value")
                    }
                    if (node.tagName === "thumbnail") {
                        game["thumbnail"] = node.innerHTML
                    }
                    if (node.tagName === "description") {
                        game["description"] = makeReadable(node.innerHTML)
                    }
                    if (node.tagName === "yearpublished") {
                        game["yearPublished"] = parseInt(node.getAttribute("value"))
                    }
                    if (node.tagName === "minplayers") {
                        game.attributes["minPlayers"] = parseInt(node.getAttribute("value"))
                    }
                    if (node.tagName === "maxplayers") {
                        game.attributes["maxPlayers"] = parseInt(node.getAttribute("value"))
                    }
                    if (node.tagName === "minplaytime") {
                        game.attributes["minPlaytime"] = parseInt(node.getAttribute("value"))
                    }
                    if (node.tagName === "maxplaytime") {
                        game.attributes["maxPlaytime"] = parseInt(node.getAttribute("value"))
                    }
                    if ((node.tagName === "link") &&
                        (node.getAttribute("type") === "boardgamecategory")) {
                        game.attributes.categories.push(node.getAttribute("value"))
                    }
                    if ((node.tagName === "link") &&
                        (node.getAttribute("type") === "boardgamemechanic")) {
                        game.attributes.mechanics.push(node.getAttribute("value"))
                    }
                    if (node.tagName === "statistics") {
                        node.childNodes.forEach(
                            function (childNode) {
                                if (childNode.tagName === "ratings") {
                                    childNode.childNodes.forEach(
                                        function (grandchildNode) {
                                            if (grandchildNode.tagName === "numweights") {
                                                game["numWeights"] = grandchildNode.getAttribute("value")
                                            }
                                            if (grandchildNode.tagName === "averageweight") {
                                                game.attributes["averageWeight"] = grandchildNode.getAttribute("value")
                                            }
                                            if (grandchildNode.tagName === "bayesaverage") {
                                                game.attributes["bayesaverage"] = grandchildNode.getAttribute("value")
                                            }
                                            if (grandchildNode.tagName === "average") {
                                                game.attributes["average"] = grandchildNode.getAttribute("value")
                                            }
                                            if (grandchildNode.tagName === "ranks") {
                                                grandchildNode.childNodes.forEach(
                                                    function (grandgrandchildNode) {
                                                        if (grandgrandchildNode.tagName === "rank" && grandgrandchildNode.getAttribute("type") === "subtype") {
                                                            game.attributes["overallRank"] = grandgrandchildNode.getAttribute("value")
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    )
                                }
                            }
                        )
                    }
                }
            }
        )
    }
    if (Object.keys(game) && (!game.hasOwnProperty("yearPublished") || game["yearPublished"] === 0)) {
        game["yearPublished"] = null
    }
    return game
}

const BGG_API_URL = "https://www.boardgamegeek.com/xmlapi2";

function getBGGGameQuery(gameName, isExact) {
    const queryFriendlyGameName = String(gameName).replaceAll(' ', '+').replaceAll(':', '+');
    const exactSearch = isExact ? '&exact=1' : '';
    return `${BGG_API_URL}/search?query=${queryFriendlyGameName}&type=boardgame${exactSearch}`
}

function findExactBGGGameId(gameName) {
    return (
        fetch(getBGGGameQuery(gameName, true))
            .then(searchResponse => searchResponse.text())
            .then(searchText => parseExactSearchApiXml(searchText))
    )
}

function getGameReleaseYearFromBGA() {
    let game_info_col = document.getElementsByClassName("game_infos_first_col")[0];
    if (!game_info_col) return null;
    let year_row = game_info_col.children[3];
    if (!year_row) return null;
    let year_div = year_row.children[1];
    if (!year_div) return null;
    let year = year_div.innerHTML;
    return year;
}

function findLooseBGGGameId(gameName) {
    game_release_year_bga = getGameReleaseYearFromBGA();
    const gameNameWithoutParentheses = gameName.replace(/\(.*\)/i, '');
    return (
        fetch(getBGGGameQuery(gameNameWithoutParentheses, false))
            .then(searchResponse => searchResponse.text())
            .then(searchText => parseLooseSearchApiXml(searchText, game_release_year_bga))
    )
}

function findBGGGameInfo(gameId) {
    query = `${BGG_API_URL}/thing?stats=1&id=${gameId}`;
    return (
        fetch(query)
            .then(searchResponse => searchResponse.text())
            .then(searchText => parseGamedataApiXml(searchText))
    )
}

async function displayGameInfo(gameName) {
    gameId = await findExactBGGGameId(gameName);
    if (gameId === -1) {
        gameId = await findLooseBGGGameId(gameName);
    }
    if (gameId === -1) {
        return;
    }
    const gameInfo = await findBGGGameInfo(gameId);
    const categories = gameInfo.attributes.categories.map(category => `<li class="category">${category}</li>`).join('');
    const mechanics = gameInfo.attributes.mechanics.map(mechanic => `<li class="mechanic">${mechanic}</li>`).join('');

    var div = document.createElement("div");
    div.className = 'bgg-info';
    div.innerHTML = `<div class="row"> \
                    <div style="display:inline-block; padding-left:10px;"><b>Weight:</b> ${Number(gameInfo.attributes.averageWeight).toFixed(2)} / 5</div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><b>Rating:</b> ${Number(gameInfo.attributes.average).toFixed(2)} / 10</div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><b>Ranking:</b> ${gameInfo.attributes.overallRank}</div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><a href="https://boardgamegeek.com/boardgame/${gameInfo.id}" target="_blank">See + on <b>BGG</b></a></div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                 </div> \
                <div class="row" style="margin: 5px;"> \
                    <ul id="categories-mechanics">${categories} ${mechanics}</ul> \
                </div> \
                 `;

    var gameInfoHeader = document.getElementsByClassName("gameimage")[0].nextElementSibling;
    gameInfoHeader.appendChild(div);
}

// The page might not have loaded yet, so we need to wait for it to do so.
// This will poll every 100ms until the information is available.
var initializeInfo = setInterval(function() {
    const game_name_field = document.getElementById("game_name");
    if (game_name_field && game_name_field.textContent && game_name_field.textContent.length > 0) {
        const gameName = game_name_field.textContent;
        displayGameInfo(gameName);
        clearInterval(initializeInfo);
    }
 }, 500);