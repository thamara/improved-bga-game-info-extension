function isGameUrl(url) {
    return url.startsWith("https://boardgamearena.com/gamepanel?game=");
}

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

function parseSearchApiXml(res) {
    const responseDoc = new DOMParser().parseFromString(res, 'application/xml')
    const gamesHtmlCollection = responseDoc.getElementsByTagName("item")
    if (gamesHtmlCollection.length >= 1) {
        return parseInt(gamesHtmlCollection[0].id);
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
            function(node) {
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
                            function(childNode) {
                                if (childNode.tagName === "ratings") {
                                    childNode.childNodes.forEach(
                                        function(grandchildNode) {
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
                                                    function(grandgrandchildNode) {
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

function findBGGGameId(gameName) {
    query = "https://www.boardgamegeek.com/xmlapi2/search?query=" + String(gameName).replaceAll(' ', '+').replaceAll(':', '+') + "&type=boardgame&exact=1";
    return (
        fetch(query)
        .then(searchResponse => searchResponse.text())
        .then(searchText => parseSearchApiXml(searchText))
    )
}

function findBGGGameInfo(gameId) {
    query = "https://www.boardgamegeek.com/xmlapi2/thing?stats=1&id=" + gameId;
    return (
        fetch(query)
        .then(searchResponse => searchResponse.text())
        .then(searchText => parseGamedataApiXml(searchText))
    )
}

async function displayGameInfo(gameName) {
    const gameId = await findBGGGameId(gameName);
    const gameInfo = await findBGGGameInfo(gameId);

    document.getElementById('game-name').innerText = gameInfo.name;
    document.getElementById('game-img-src').src = gameInfo.thumbnail;
    document.getElementById('weight-value').innerText = Number(gameInfo.attributes.averageWeight).toFixed(2);
    document.getElementById('rating-value').innerText = Number(gameInfo.attributes.average).toFixed(2);
    document.getElementById('see-in-bgg').href = `https://boardgamegeek.com/boardgame/${gameInfo.id}`;

    const categories = gameInfo.attributes.categories.map(category => `<li class="category">${category}</li>`).join('');
    const mechanics = gameInfo.attributes.mechanics.map(mechanic => `<li class="mechanic">${mechanic}</li>`).join('');

    document.getElementById('categories-mechanics').innerHTML = categories + mechanics;

    for (const anchor of document.getElementsByTagName('a')) {
        anchor.onclick = () => {
            chrome.tabs.create({ active: true, url: anchor.href });
        };
    };
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('loaded');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const tabUrl = tab.url;
        if (!isGameUrl(tabUrl)) {
            return;
        }

        chrome.tabs.executeScript(tab.id, {
            code: 'document.getElementById("game_name").textContent'
        }, displayGameInfo);
    });
});