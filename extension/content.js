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
        if (game.getElementsByTagName("yearpublished")[0]) {
            game_release_year_bgg = game.getElementsByTagName("yearpublished")[0].attributes.item(0).value;
            if (game_release_year_bgg == game_release_year_bga) {
                return parseInt(game.id);
            }
        }
    }
    return -1;
}

function parseGamedataApiXml(str) {
    let game = {
        "attributes": {
            "categories": [],
            "mechanics": []
        },
        "bestPlayerCount": {}
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
                    if (node.tagName === "playingtime") {
                        game.attributes["playingtime"] = parseInt(node.getAttribute("value"))
                    }
                    if ((node.tagName === "link") &&
                        (node.getAttribute("type") === "boardgamecategory")) {
                        game.attributes.categories.push(node.getAttribute("value"))
                    }
                    if ((node.tagName === "link") &&
                        (node.getAttribute("type") === "boardgamemechanic")) {
                        game.attributes.mechanics.push(node.getAttribute("value"))
                    }
                    if (node.tagName === "poll" && node.getAttribute("name") === "suggested_numplayers") {
                        node.childNodes.forEach(
                            function (childNode) {
                                if (childNode.tagName !== "results") {
                                    return;
                                }
                                const numPlayers = childNode.getAttribute("numplayers");
                                let suggestedNumPlayersVotes = {};
                                childNode.childNodes.forEach(
                                    function (grandchildNode) {
                                        if (grandchildNode.tagName !== "result") {
                                            return;
                                        }
                                        suggestedNumPlayersVotes[grandchildNode.getAttribute("value")] = parseInt(grandchildNode.getAttribute("numvotes"))
                                    }
                                );
                                game.bestPlayerCount[numPlayers] = suggestedNumPlayersVotes;
                            }
                        );
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

function getBGAAPIUrl() {
    return "https://www.boardgamegeek.com/xmlapi2"
}

function getBGGGameQuery(gameName, isExact) {
    const queryFriendlyGameName = String(gameName).replaceAll(' ', '+').replaceAll(':', '+');
    const exactSearch = isExact ? '&exact=1' : '';
    return `${getBGAAPIUrl()}/search?query=${queryFriendlyGameName}&type=boardgame${exactSearch}`
}

function findExactBGGGameId(gameName) {
    return (
        fetch(getBGGGameQuery(gameName, true))
            .then(searchResponse => searchResponse.text())
            .then(searchText => parseExactSearchApiXml(searchText))
    )
}

function getGameReleaseYearFromBGA() {
    let game_info_col = document.getElementsByClassName("bga-game-panel-description-meta")[0];
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
    query = `${getBGAAPIUrl()}/thing?stats=1&id=${gameId}`;
    return (
        fetch(query)
            .then(searchResponse => searchResponse.text())
            .then(searchText => parseGamedataApiXml(searchText))
    )
}

function getBestPlayerCount(game) {
    const bestPlayerCount = game.bestPlayerCount;
    const numOfPlayers = Object.keys(bestPlayerCount);
    
    let bestVoteCount = [];
    numOfPlayers.forEach(item => {
        bestVoteCount.push([item, bestPlayerCount[item].Best])
    });

    bestVoteCount.sort(function(a, b) {
        return b[1] - a[1];
    });
    return bestVoteCount[0][0];
}

function getPlayingTime(game) {
    const playingTime = game.attributes.playingtime;
    const minPlaytime = game.attributes.minPlaytime;
    const maxPlaytime = game.attributes.maxPlaytime;
    if (playingTime === minPlaytime && playingTime === maxPlaytime) {
        return `${playingTime}`;
    }
    return `${minPlaytime}-${maxPlaytime}`;
}

function getBGANewTableQuery(gameId) {
    return `https://boardgamearena.com/table/table/createnew.html?game=${gameId}&gamemode=realtime&forceManual=true&is_meeting=false`
}

function parseNewTableResponse(response) {
    const result = JSON.parse(response)
    if (result.status == 1) {
        return `https://boardgamearena.com/table?table=${result.data.table}`
    }
    return '#'
}

function findNewTableId(gameId) {
    return (
        fetch(getBGANewTableQuery(gameId))
            .then(searchResponse => searchResponse.text())
            .then(searchText => parseNewTableResponse(searchText))
    )
}

function getGameId() {
    const buttonHref = document.getElementById("create_new_table").href;
    return buttonHref.substring(buttonHref.lastIndexOf('=') + 1);
}

async function startTable() {
    const currentGameId = getGameId();
    const newURL = await findNewTableId(currentGameId)
    window.location.href = newURL;
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

    let outterDiv = document.createElement("div");
    var div = document.createElement("div");
    div.className = 'bgg-info';
    div.innerHTML = `<div class="row"> \
                    <div style="display:inline-block; padding-left:10px;"><b>Weight:</b> ${Number(gameInfo.attributes.averageWeight).toFixed(2)} / 5</div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><b>Rating:</b> ${Number(gameInfo.attributes.average).toFixed(2)} / 10</div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><b>Ranking:</b> ${gameInfo.attributes.overallRank}</div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><b>Best with </b> ${getBestPlayerCount(gameInfo)}<b> players</b></div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><b>Playing time </b> ${getPlayingTime(gameInfo)} <b>min</b></div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                    <div style="display:inline-block;"><a href="https://boardgamegeek.com/boardgame/${gameInfo.id}" target="_blank">See + on <b>BGG</b></a></div> \
                    <div style="display:inline-block; width: 20px;"></div> \
                 </div> \
                <div class="row"> \
                    <ul id="categories-mechanics">${categories} ${mechanics}</ul> \
                </div> \
                 `;

    outterDiv.appendChild(div);
    var gameInfoHeader = document.getElementsByClassName("panel-header")[0].parentElement;
    if (document.getElementsByClassName("bgg-info").length == 0) {
        gameInfoHeader.insertAdjacentHTML('beforebegin', outterDiv.innerHTML);
    }

    // const newButtonDiv = '<a style="display:block;" class="bgabutton bgabutton_big bgabutton_green bgabutton_small_margin" href="#" id="start-table">Start a table</a>';
    // var gameButtonsElm = document.getElementsByClassName("gameimage")[0].nextElementSibling.nextElementSibling.children[0].children[0]
    // gameButtonsElm.innerHTML = newButtonDiv + gameButtonsElm.innerHTML;
    
    // document.getElementById("start-table").addEventListener("click", function() {
    //     startTable();
    // });
}

// The page might not have loaded yet, so we need to wait for it to do so.
// This will poll every 100ms until the information is available.
var initializeInfo = setInterval(function () {
    if (document.getElementsByClassName("bgg-info").length > 0) {
        // The information is already available, so we can stop polling.
        clearInterval(initializeInfo);
        return;
    }
    const game_name_field = document.getElementById("game_name");
    // Play XXXXXXXXX online from your browser
    const page_title = document.title;
    const pattern = /.*Play (.*) online from.*/;
    const match = page_title.match(pattern);
    if (match && match.length > 1) {
    // if (game_name_field && game_name_field.textContent && game_name_field.textContent.length > 0) {
        const gameName = match[1];
        displayGameInfo(gameName);
        clearInterval(initializeInfo);
    }
}, 500);