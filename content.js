function injectEmoteButton() {
    const chatInputButtons = document.querySelector('.chat-input__buttons-container');
    const chatInputSection = document.querySelector('.chat-input');

    // Only run if the buttons container exists and the button isn't already there
    if (chatInputButtons && !document.getElementById('my-custom-7tv-btn')) {
        
        // --- CLEANUP: Remove any "ghost" elements from previous injections ---
        const oldFrame = document.getElementById('my-7tv-menu');
        const oldResizer = document.getElementById('my-7tv-resizer');
        if (oldFrame) oldFrame.remove();
        if (oldResizer) oldResizer.remove();

        // 1. Create the Button
        const btn = document.createElement('button');
        btn.id = 'my-custom-7tv-btn';
        btn.style.flexShrink = '0'; 

		// Ensure the button itself has a defined width so it doesn't default to 0
		btn.style.width = '30px'; 
		btn.style.height = '30px';
		btn.style.order = '999';
		
		// Create the icon image element
		const icon = document.createElement('img');
		icon.src = chrome.runtime.getURL('icons/icon48.png'); // Path to your icon
		icon.style.width = '20px';  // Standard Twitch button icon size
		icon.style.height = '20px';
		icon.style.display = 'block';

		// Add icon to button instead of text
		btn.appendChild(icon);
        btn.className = 'inject-7tv-button';
		
        const channelName = window.location.pathname.split('/')[1];
        // 2. Create the Frame
        const frame = document.createElement('iframe');
        frame.id = 'my-7tv-menu';
		frame.src = chrome.runtime.getURL(`popup.html?channel=${encodeURIComponent(channelName)}`);
        frame.className = 'my-7tv-iframe-hidden';

        // 3. Create the Resizer Handle
        const resizer = document.createElement('div');
        resizer.id = 'my-7tv-resizer';
        // Add CSS to make it visible and distinct
        resizer.style.height = '5px';
        resizer.style.cursor = 'ns-resize';
        resizer.style.width = '100%';
        resizer.style.background = 'transparent'; // Change to 'red' to debug position

        btn.onclick = () => {
            const isHidden = frame.classList.contains('my-7tv-iframe-hidden');
            frame.classList.toggle('my-7tv-iframe-visible');
            frame.classList.toggle('my-7tv-iframe-hidden');
            
            // Toggle resizer visibility with the frame
            resizer.style.display = isHidden ? 'block' : 'none';

            if (isHidden) {
                frame.focus();
                frame.contentWindow.postMessage('focus-search', '*');
            }
        };

        // --- Drag Logic ---
        let isResizing = false;
        let startY, startHeight;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = parseInt(window.getComputedStyle(frame).height, 10);
            
            frame.style.pointerEvents = 'none';
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResizing);
        });

        function handleMouseMove(e) {
            if (!isResizing) return;
            const deltaY = startY - e.clientY;
            const newHeight = startHeight + deltaY;

            if (newHeight > 100 && newHeight < 800) { 
                frame.style.height = `${newHeight}px`;
            }
        }

        function stopResizing() {
            isResizing = false;
            frame.style.pointerEvents = 'auto';
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        }

        // --- Final Injection ---
        chatInputButtons.appendChild(btn);
	
		
        // Ensure resizer is initially hidden like the frame
        resizer.style.display = 'none'; 
        
        chatInputSection.insertAdjacentElement('beforebegin', resizer);
        chatInputSection.insertAdjacentElement('beforebegin', frame);
    }
}





// Twitch is a Single Page App, so we need to check often if the chat loaded
const observer = new MutationObserver(injectEmoteButton);
observer.observe(document.body, { childList: true, subtree: true });



window.addEventListener('message', (event) => {
    // Only listen for our specific message type
    if (event.data && event.data.type === 'SEND_EMOTE') {
        const emoteName = event.data.emoteName;
        insertTextIntoTwitchChat(emoteName);
    }
});

function insertTextIntoTwitchChat(text) {
    // 1. Target by the class name you found + the Slate attribute
    // This is more reliable than data-a-target because classes are harder to miss
    const chatEditor = document.querySelector('.chat-wysiwyg-input__editor[data-slate-editor="true"]');

    if (chatEditor) {
        chatEditor.focus();

        // 2. Use the 'beforeinput' event - this is the "secret sauce" for Slate.js
        // It tells the editor: "Hey, someone just typed this, please update your state"
        const inputEvent = new InputEvent('beforeinput', {
            inputType: 'insertText',
            data: text + " ",
            bubbles: true,
            cancelable: true
        });
        chatEditor.dispatchEvent(inputEvent);

        // 3. Fallback: execCommand
        // If the event above doesn't show the text, this will force it into the UI
        document.execCommand('insertText', false, text + " ");

    } else {
        // 4. Debugging: If it still fails, let's see what IS there
        console.error("Editor not found. Search results for class:", 
            document.getElementsByClassName('chat-wysiwyg-input__editor').length);
    }
}