const CLIENT_ID = 'swluqqmuvlat8dyvfb3dlkuzt7m1lk';
let allEmotes = [];









document.addEventListener('DOMContentLoaded', async () => {
    const loadBtn = document.getElementById('load-btn');
    const clearBtn = document.getElementById('clear-btn');
    const searchBox = document.getElementById('search-box');
    const userInput = document.getElementById('user-input');
	const logoutBtn = document.getElementById('logoutBtn'); //Logout


	//1. Log-out button for Twitch OAuth	
    // Check if we already have a token from a previous session
    chrome.storage.local.get('twitchToken', (data) => {
        if (data.twitchToken) {
            logoutBtn.style.display = 'block';
        }
    });
	
	

    // Add the listener here
    logoutBtn.addEventListener('click', () => {
        chrome.storage.local.remove('twitchToken', () => {
            console.log("Token removed");
            logoutBtn.style.display = 'none'; // Hide button after logout
            setStatus("Logged out! Press 'Load' to login again.");
        });
    });




    // 2. Initial Focus
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


    // 3. Global Focus Trap
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

    // 4. Button Listeners
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
		
		// 1.  Endpoint for Twitch ID via Decapi
		const idResponse = await fetch(`https://decapi.me/twitch/id/${username}`);
        const twitchId = await idResponse.text();

        if (!twitchId || twitchId.includes("not found")) throw new Error("User not found");



		// 2.  Endpoint for 7TV Channel Emotes (v3 API)
        const response7tv = await fetch(`https://7tv.io/v3/users/twitch/${twitchId}`);
        if (!response7tv.ok) throw new Error('No 7TV profile');
		
	   const data7tv = response7tv.ok ? await response7tv.json() : { emote_set: { emotes: [] } };
        
	
        // 3. Map 7TV emotes
        let combined = (data7tv.emote_set?.emotes || []).map(e => ({
            name: e.name,
            url: `https:${e.data.host.url}/2x.webp`,
            source: '7tv'
        }));
		

      // 4. Get official Twitch emotes if logged in
		const token = await checkTwitchLogin(); 

		if (token) {
	
			try {
				// Use the Helix API domain (api.twitch.tv)
				const userRes = await fetch('https://api.twitch.tv/helix/users', {
					headers: { 
						'Client-ID': CLIENT_ID, 
						'Authorization': `Bearer ${token}` 
					}
				});
				
				
				const userData = await userRes.json();
				
				if (userData.data && userData.data.length > 0) {
			
					const myId = userData.data[0].id; 
				
					// Helix API URL with the required query parameter
					const url = `https://api.twitch.tv/helix/chat/emotes/user?user_id=${myId}`;

					const twitchRes = await fetch(url, {
						headers: { 
							'Client-Id': CLIENT_ID, 
							'Authorization': `Bearer ${token}` 
						}
					});


				let cursor = "";
				let hasMore = true;

				while (hasMore) {
					// Append the cursor to the URL
					const pagedUrl = cursor ? `${url}&after=${cursor}` : url;

					try {
						const twitchRes = await fetch(pagedUrl, {
							headers: { 
								'Client-Id': CLIENT_ID, 
								'Authorization': `Bearer ${token}` 
							}
						});

						const twitchData = await twitchRes.json();

						if (twitchData.data && twitchData.data.length > 0) {
							const officialOnes = twitchData.data.map(e => ({
								name: e.name,
								url: `https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/default/dark/1.0`,
								source: 'twitch'
							}));

							// Add this page's emotes to your combined list
							combined = [...officialOnes, ...combined];
						}

						// Check if there is another page
						if (twitchData.pagination && twitchData.pagination.cursor) {
							cursor = twitchData.pagination.cursor;
						} else {
							hasMore = false; // No cursor means we're done
						}
					} catch (err) {
						console.error("Pagination fetch failed:", err);
						hasMore = false;
					}
				}
				
				
				
				
				}
			} catch (err) {
				console.error("Twitch fetch failed:", err);
			}
		}

        allEmotes = combined;
        renderEmotes(allEmotes);
        setStatus(`${allEmotes.length} emotes found.`);
        searchBox.focus();
    } catch (err) {
        setStatus(`Error: ${err.message}`, true);
        document.getElementById('emote-grid').innerHTML = '';
        searchBox.focus();
    }
}




// Helper to trigger the login popup
async function checkTwitchLogin() {
    const data = await chrome.storage.local.get('twitchToken');
    
    // 1. If we have a token, return it
    if (data.twitchToken) return data.twitchToken;
    
    // 2. Otherwise, ask background to start the flow
    console.log("Requesting login flow...");
    chrome.runtime.sendMessage({ type: 'START_LOGIN' }, (response) => {
        if (response?.status === 'success') {
            console.log("Logged in!");
			document.getElementById('logoutBtn').style.display = 'block';
			// AUTO-RESUME: Run the fetch now that we have the token
			//handleLoad(); //Without this, the user must press "Load" to see twitch emotes.
        } else if (response?.status === 'pending') {
            console.log("Login already in progress...");
        }
    });

    setStatus("Login window opened. Please authorize!");
    return null; 
}




function renderEmotes(emotesToDisplay) {
    //const searchBox = document.getElementById('search-box');
	const container = document.getElementById('emote-grid');
    container.innerHTML = '';

    emotesToDisplay.forEach(emote => {
        const card = document.createElement('div');
        card.className = `emote-card ${emote.source === 'twitch' ? 'twitch-border' : ''}`;
        
        card.onclick = () => {
            window.parent.postMessage({ type: 'SEND_EMOTE', emoteName: emote.name }, '*');
            //searchBox.focus();
        };

        const img = document.createElement('img');
        img.className = 'emote-image';
        img.src = emote.url;
        
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