
var queryString = {};
if (location.search)
    location.search.substr(1).split('&').forEach(function(token) {
        var pair = token.split('=');
        queryString[decodeURIComponent(pair[0])] = pair.length > 1 ? decodeURIComponent(pair[1]) : true;
    })

var smileyCollections = [
    {name: "orange", count: 94, desc: "Orange"},
    {name: "animals", count: 64, desc: "Animals"},
    {name: "cute", count: 29, desc: "Cute"},
    {name: "trundle", count: 36, desc: "Ugly"},
    {name: "shiny", count: 142, desc: "Shiny"},
    {name: "mad", count: 93, desc: "Mad"},
    {name: "avatar", count: 876, desc: "Small"},
    {name: "anime", count: 971, desc: "Korean"},
]
var smileysPerPage = 20;
var smileyRoot = "https://support2.lsdsoftware.com/diepkhuc-content/smileys/";

document.addEventListener("DOMContentLoaded", onDocumentReady);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                // Registration was successful
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(function(err) {
                // registration failed :(
                console.log('ServiceWorker registration failed: ', err);
            })
    })
}



/* UTILS */

function getSettings(names) {
    var items = {};
    names.forEach(function(name) {
        var value = localStorage.getItem(name);
        if (value != null) items[name] = JSON.parse(value);
    })
    return Promise.resolve(items);
}

function updateSettings(items) {
    for (var name in items) {
        if (items[name] != null) localStorage.setItem(name, JSON.stringify(items[name]));
        else localStorage.removeItem(name);
    }
    return Promise.resolve();
}

function getCommonSuffix(s1, s2) {
    for (var i=0; i<s1.length; i++) if (s1.charAt(s1.length-1-i) != s2.charAt(s2.length-1-i)) return s1.substring(s1.length-i);
    return s1;
}

function sendCommand(data) {
    window.parent.postMessage(data, queryString.url);
}



/* SERVICE */

var sb = new ServiceBroker("wss://service.lsdsoftware.com", {
    error: console.error,
    trace: console.log
})
sb.setHandler("side-chatter-client", function(req) {
    var data = JSON.parse(req.payload);
    switch (data.method) {
        case "chatMessage": return onChatMessage(data);
        default: console.error("Unhandled", data.method);
    }
})
sb.addConnectListener(function() {
    getSettings(["myName"])
        .then(function(settings) {
            return request(["join-1.0"], {method: "join", myName: settings.myName, url: queryString.url, title: queryString.title})
        })
        .then(onJoined)
        .catch(console.error)
})
function request(capabilities, data) {
    return sb.request({name: "side-chatter", capabilities: capabilities}, {payload: JSON.stringify(data)})
        .then(function(res) {
            return res.payload && JSON.parse(res.payload);
        })
}




/* ACTIONS */

function sendChat(message) {
    request(["message-1.0"], {method: "message", message: message})
        .catch(console.error)
}

function changeName(newName) {
    request(["changeName-1.0"], {method: "changeName", newName: newName})
        .then(function() {
            document.getElementById("my-name").innerText = newName;
            return updateSettings({myName: newName});
        })
        .catch(console.error)
}



/* HANDLERS */

function onDocumentReady() {
    var composeForm = document.getElementById("compose-form");
    composeForm.addEventListener("submit", function(ev) {
        sendChat(composeForm.message.value);
        composeForm.message.value = "";
        ev.preventDefault();
        ev.stopPropagation();
    })
    composeForm.message.addEventListener("keypress", function(ev) {
        if (ev.which == 13 && !ev.shiftKey) {
            sendChat(composeForm.message.value);
            composeForm.message.value = "";
            ev.preventDefault();
            ev.stopPropagation();
        }
    })

    var smileyBrowser = document.getElementById("smiley-browser");
    smileyBrowser.getElementsByClassName("close-button")[0].addEventListener("click", function() {
        smileyBrowser.style.display = "none";
    })

    var smileyButton = document.getElementById("smiley-button");
    smileyButton.addEventListener("click", function() {
        smileyBrowser.style.display = "block";
        if (!smileyList.firstChild) showSmileyGroup(0, 0);
    })

    var editNameForm = document.getElementById("edit-name-form");
    editNameForm.addEventListener("submit", function(ev) {
        changeName(editNameForm.theName.value);
        editNameForm.style.display = "none";
        myName.style.display = "block";
        ev.preventDefault();
        ev.stopPropagation();
    })

    var myName = document.getElementById("my-name");
    myName.addEventListener("click", function() {
        editNameForm.style.display = "block";
        myName.style.display = "none";
    })

    var fontSize = 1;
    var chatLog = document.getElementById("chat-log");
    getSettings(["fontSize"])
        .then(function(settings) {
            if (settings.fontSize) {
                fontSize = settings.fontSize;
                chatLog.style.fontSize = fontSize + "em";
            }
        })

    var fontSizeButton = document.getElementById("fontsize-button");
    fontSizeButton.addEventListener("click", function() {
        fontSize += .125;
        if (fontSize > 1.26) fontSize = .75;
        chatLog.style.fontSize = fontSize + "em";
        updateSettings({fontSize: fontSize});
    })

    var smileyGroupSelect = document.getElementById("smiley-group");
    smileyCollections.forEach(function(collection, collectionIndex) {
        var optGroup = document.createElement("OPTGROUP");
        optGroup.setAttribute("label", collection.desc);
        smileyGroupSelect.appendChild(optGroup);
        var numPages = Math.ceil(collection.count / smileysPerPage);
        for (var pageIndex=0; pageIndex<numPages; pageIndex++) {
            var opt = document.createElement("OPTION");
            opt.value = collectionIndex + "-" + pageIndex;
            opt.innerText = "Page " + (pageIndex+1);
            optGroup.appendChild(opt);
        }
    })
    smileyGroupSelect.addEventListener("change", function() {
        var tokens = smileyGroupSelect.value.split("-");
        showSmileyGroup(Number(tokens[0]), Number(tokens[1]));
    })

    var smileyList = document.getElementById("smiley-list");
    smileyList.addEventListener("click", function(ev) {
        if (ev.target.tagName == "IMG") {
            var smileyId = ev.target.getAttribute("data-smiley-id");
            composeForm.message.value += "[s:" + smileyId + "]";
        }
    })

    var optionsLink = document.getElementById("options-link");
    optionsLink.addEventListener("click", function() {
        sendCommand({method: "openOptionsPage"});
    })

    var closeButton = document.getElementById("close-button");
    closeButton.addEventListener("click", function() {
        sendCommand({method: "closeChat"});
    })

    var announcement = document.getElementById("announcement");
    getSettings(["hideAnnouncement"])
        .then(function(settings) {
            if (!settings.hideAnnouncement) announcement.style.display = "flex";
        })

    var hideAnnouncementButton = document.getElementById("hide-announcement-button");
    hideAnnouncementButton.addEventListener("click", function() {
        announcement.style.display = "none";
        updateSettings({hideAnnouncement: true});
    })
}

function onJoined(data) {
    var myName = document.getElementById("my-name");
    myName.innerText = data.myName;
    var chatLog = document.getElementById("chat-log");
    chatLog.innerHTML = "";
    data.chatLog.forEach(appendChatEntry);
}

function onChatMessage(data) {
    appendChatEntry(data.message);
}


function appendChatEntry(entry) {
    var chatLog = document.getElementById("chat-log");

    var chatEntry = document.createElement("DIV");
    chatEntry.className = "chat-entry";
    chatLog.appendChild(chatEntry);

    var chatterInfo = document.createElement("DIV");
    chatterInfo.className = "chatter-info";
    chatEntry.appendChild(chatterInfo);

    var userName = document.createElement("SPAN");
    userName.className = "user-name";
    userName.innerText = entry.user.name;
    chatterInfo.appendChild(userName);

    var path = entry.user.title || entry.user.url;
    var myPath = queryString.title || queryString.url;
    var commonSuffix = getCommonSuffix(path, myPath);
    var relativePath = path.substring(0, path.length-commonSuffix.length);
    if (relativePath) {
        var roomPath = document.createElement("SPAN");
        roomPath.className = "room-path";
        roomPath.innerText = relativePath;
        roomPath.setAttribute("title", entry.user.url);
        roomPath.addEventListener("click", function() {
            sendCommand({method: "redirectTo", url: entry.user.url});
        })
        chatterInfo.appendChild(roomPath);
    }

    var chatMessage = document.createElement("DIV");
    chatMessage.className = "chat-message";
    entry.message.split(/\[s:(.*?)\]/)
        .forEach(function(token, index) {
            if (index %2 == 1) {
                var img = document.createElement("IMG");
                img.src = smileyRoot + token;
                chatMessage.appendChild(img);
            }
            else if (token) {
                var span = document.createElement("SPAN");
                span.innerText = token;
                chatMessage.appendChild(span);
            }
        })
    chatEntry.appendChild(chatMessage);
}

function showSmileyGroup(collectionIndex, pageIndex) {
    var smileyList = document.getElementById("smiley-list");
    smileyList.innerHTML = "";
    var collection = smileyCollections[collectionIndex];
    for (var i=pageIndex*smileysPerPage; i<Math.min((pageIndex+1)*smileysPerPage, collection.count); i++) {
        var smileyId = collection.name + "/" + (i+1) + ".gif";
        var img = document.createElement("IMG");
        img.src = smileyRoot + smileyId;
        img.setAttribute("data-smiley-id", smileyId);
        smileyList.appendChild(img);
    }
}
