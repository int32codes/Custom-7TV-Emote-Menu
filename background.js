// background.js
let isAuthFlowActive = false; // Global flag in background
const CLIENT_ID = 'swluqqmuvlat8dyvfb3dlkuzt7m1lk';


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_LOGIN') {
		
		if (isAuthFlowActive) {
            sendResponse({ status: 'pending' });
            return true;
        }
		
		isAuthFlowActive = true;
        const redirectUri = chrome.identity.getRedirectURL();
        
        // This is the OAUTH URL (The Login Page)
        const authUrl = `https://id.twitch.tv/oauth2/authorize` +
                        `?client_id=${CLIENT_ID}` +
                        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                        `&response_type=token` +
                        `&scope=user:read:emotes+user:read:subscriptions`; // Permission to see user emotes
						
						

        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
             isAuthFlowActive = false; // Reset flag when done
            
            if (chrome.runtime.lastError || !redirectUrl) {
                return sendResponse({ status: 'error' });
            }
            
            const token = new URLSearchParams(new URL(redirectUrl).hash.substring(1)).get('access_token');
            chrome.storage.local.set({ twitchToken: token }, () => {
                sendResponse({ status: 'success', token: token });
            });
        });
        return true; 
    }
});
