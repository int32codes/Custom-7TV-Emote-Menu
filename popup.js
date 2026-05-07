let allEmotes = [];

document.addEventListener('DOMContentLoaded', async () => {
    const loadBtn = document.getElementById('load-btn');
    const clearBtn = document.getElementById('clear-btn');
    const searchBox = document.getElementById('search-box');
    const userInput = document.getElementById('user-input');

    // 1. Initial Focus
    searchBox.focus();

	// Listen for the "focus-search" message from the content script
	window.addEventListener('message', (event) => {
		if (event.data === 'focus-search') {
			const searchBox = document.getElementById('search-box');
			if (searchBox) {
				searchBox.focus({ preventScroll: true });
			}
		}
	});


    // 2. Global Focus Trap
    // If user clicks empty space, return focus to search box
    document.addEventListener('mousedown', (e) => {
        // List of elements that ARE allowed to have focus
        const focusableElements = ['INPUT', 'BUTTON', 'A'];
        
        // If we didn't click a focusable element, and we aren't currently in the User Input
        if (!focusableElements.includes(e.target.tagName)) {
            // Prevent the default "unfocus" behavior and force focus to search
            setTimeout(() => {
                if (document.activeElement !== userInput) {
                    searchBox.focus();
                }
            }, 0);
        }
    });
	

    // 3. Button Listeners
    loadBtn.onclick = () => {
        handleLoad();
        searchBox.focus();
    };

    clearBtn.onclick = () => {
        clearSearch();
        searchBox.focus();
    };

    searchBox.oninput = filterEmotes;

    userInput.onkeypress = (e) => { 
        if (e.key === 'Enter') {
            handleLoad();
            searchBox.focus();
        }
    };

	// 4. Auto-detect Twitch Channel from the Iframe URL
	const urlParams = new URLSearchParams(window.location.search);
	const channelName = urlParams.get('channel');

	const ignoredPages = ['directory', 'home', 'popout', 'videos', 'u'];

	if (channelName && !ignoredPages.includes(channelName.toLowerCase())) {
		userInput.value = channelName;
		handleLoad();
	} else {
		// If it's opened via the Toolbar, just let the user type the name manually
		console.log("Please enter a username to load emotes.");
	}

});

async function handleLoad() {
    const username = document.getElementById('user-input').value.trim().toLowerCase();
    const searchBox = document.getElementById('search-box');
    if (!username) return;

    setStatus(`Fetching ${username}...`);
    
    try {
        const idResponse = await fetch(`https://decapi.me/twitch/id/${username}`);
        const twitchId = await idResponse.text();

        if (!twitchId || twitchId.includes("not found")) throw new Error("User not found");

        const response = await fetch(`https://7tv.io/v3/users/twitch/${twitchId}`);
        if (!response.ok) throw new Error('No 7TV profile');
        
        const data = await response.json();
        allEmotes = data.emote_set.emotes;
        
        renderEmotes(allEmotes);
        setStatus(`${allEmotes.length} emotes found.`);
        searchBox.focus();
    } catch (err) {
        setStatus(`Error: ${err.message}`, true);
        document.getElementById('emote-grid').innerHTML = '';
        searchBox.focus();
    }
}

function renderEmotes(emotesToDisplay) {
    const container = document.getElementById('emote-grid');
    const searchBox = document.getElementById('search-box');
    container.innerHTML = '';

    emotesToDisplay.forEach(emote => {
        const card = document.createElement('div');
        card.className = 'emote-card';
        
        card.onclick = (e) => {
            //navigator.clipboard.writeText(emote.name);
            
			// 2. Send the emote to the Twitch page (the parent)
			window.parent.postMessage({
				type: 'SEND_EMOTE',
				emoteName: emote.name
			}, '*');
			
            // Visual Feedback
            const oldBg = card.style.background;
            card.style.background = "#9147ff";
            setTimeout(() => card.style.background = oldBg, 200);
            
            searchBox.focus();
        };

        const img = document.createElement('img');
        img.className = 'emote-image';
        img.src = `https:${emote.data.host.url}/2x.webp`;
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'emote-name';
        nameLabel.textContent = emote.name;

        card.appendChild(img);
        card.appendChild(nameLabel);
        container.appendChild(card);
    });
}

function filterEmotes() {
    const term = document.getElementById('search-box').value.toLowerCase();
    renderEmotes(allEmotes.filter(e => e.name.toLowerCase().includes(term)));
}

function clearSearch() {
    const searchBox = document.getElementById('search-box');
    searchBox.value = '';
    renderEmotes(allEmotes);
    searchBox.focus();
}

function setStatus(msg, isError = false) {
    const el = document.getElementById('status-display');
    el.textContent = msg;
    el.style.color = isError ? "#ff8282" : "#adadb8";
}