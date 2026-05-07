## 7TV Twitch Chat Emote Picker [1] 
A Google Chrome extension that adds a custom, draggable, and resizable 7TV emote menu to the bottom right of Twitch chat. It automatically resolves the current streamer's 7TV emotes and allows loading other streamers' emotes. [2] 
## ✨ Features

* Auto-Detector: Reads URL to find the streamer's 7TV emotes via decapi.me.
* Toggle Menu: A button in the chat toggles a custom emote menu.
* Search: Quick search textbox to find specific emotes.
* Load Alternative Channels: Load any 7TV emote set by username.
* Click-to-Chat: Click an emote to insert it directly into the chat input.
* Resizable: Vertical resizable bar on top of the menu.

## 🚀 Installation

   1. Download or clone this repository.
   2. Open Chrome and navigate to chrome://extensions/.
   3. Enable "Developer mode" in the top right.
   4. Click "Load unpacked" and select the folder containing the extension files.
   5. Go to any Twitch channel, and the button will appear in the chat. [3, 4] 

## 📸 Screenshots
(Add screenshot here: ![Demo Menu](screenshot.png))
## 🛠️ How It Works

* URL Parsing: Detects streamer name from the URL.
* API Query: Resolves user-id via decapi.me to query 7TV APIs.
* Chat Injection: Adds the 7TV emote name to the textarea of the Twitch chat.
