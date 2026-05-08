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
    const editor = document.querySelector('.chat-wysiwyg-input__editor[data-slate-editor="true"]');
    if (!editor) return;

    editor.focus();

    // 1. Clear the selection to prevent "Path/Offset" mismatches
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // If the editor is empty, Slate likes a fresh range
        if (editor.textContent.length === 0) {
            range.selectNodeContents(editor);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // 2. The "Secret Sauce": Use a DataTransfer object
    // This tells Slate: "A user just pasted this," which forces Slate to 
    // re-calculate the entire path correctly instead of crashing.
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text + ' ');

    const event = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
    });

    editor.dispatchEvent(event);

    // 3. Fallback for the "Chat" button
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}