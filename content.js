// content.js

function injectEmoteButton() {
    // Target the absolute, immutable structural text input area element
    const chatInputBox = document.querySelector('[data-a-target="chat-input"]');
    const chatInputSection = document.querySelector('.chat-input');

    if (!chatInputBox || !chatInputSection) return;

    // Locate the text box wrapper container inside Twitch's white border frame
    const textContainerWrapper = chatInputBox.closest('.chat-input__textarea') || chatInputBox.parentElement;
    if (!textContainerWrapper) return;

    // Only run if our target button isn't already actively rendering in the row
    if (!document.getElementById('my-custom-7tv-btn')) {
        
        // --- CLEANUP: Remove any "ghost" elements from previous injections ---
        const oldWrapper = document.getElementById('my-custom-7tv-wrapper');
        const oldFrame = document.getElementById('my-7tv-menu');
        const oldResizer = document.getElementById('my-7tv-resizer');
        if (oldWrapper) oldWrapper.remove();
        if (oldFrame) oldFrame.remove();
        if (oldResizer) oldResizer.remove();

        // Lock the parent container wrapper layout to act as a coordinate grid anchor
        textContainerWrapper.style.position = 'relative';

        // 1. Create a Self-Contained Wrapper (Positions the button cleanly left of 7TV)
        const myBtnContainer = document.createElement('div');
        myBtnContainer.id = 'my-custom-7tv-wrapper';
        myBtnContainer.style.setProperty('position', 'absolute', 'important');
        myBtnContainer.style.setProperty('right', '64px', 'important'); // Sits line-aligned next to 7TV
        myBtnContainer.style.setProperty('top', '50%', 'important');
        myBtnContainer.style.setProperty('transform', 'translateY(-50%)', 'important');
        myBtnContainer.style.setProperty('z-index', '10', 'important');
        myBtnContainer.style.setProperty('display', 'inline-flex', 'important');
        myBtnContainer.style.setProperty('align-items', 'center', 'important');
        myBtnContainer.style.setProperty('justify-content', 'center', 'important');

         const btn = document.createElement('button');
        btn.id = 'my-custom-7tv-btn';
        btn.className = 'inject-7tv-button';
        btn.style.setProperty('display', 'flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('width', '20px', 'important');   // Slid footprint down from 24px to 20px
        btn.style.setProperty('height', '20px', 'important');  // Made perfectly square and compact
        btn.style.setProperty('background', 'transparent', 'important');
        btn.style.setProperty('border', 'none', 'important');
        btn.style.setProperty('padding', '0', 'important');
        btn.style.setProperty('cursor', 'pointer', 'important');
		
        // 3. Create the Sleek Icon Image Element with Micro-Transitions
        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('icons/icon48.png'); 
        icon.style.setProperty('width', '20px', 'important');  // Reduced icon size from 18px to a crisp 14px
        icon.style.setProperty('height', '20px', 'important');
        icon.style.setProperty('display', 'block', 'important');
        icon.style.setProperty('transition', 'transform 0.15s ease, filter 0.15s ease', 'important'); // Smoother timing profile
        
        // Native Twitch Icon Behavior Rules: Muted gray state that scales up slightly on mouse hover
        icon.style.setProperty('filter', 'brightness(0.65)', 'important'); // Muted opacity frame matching Twitch idle state
        btn.addEventListener('mouseenter', () => {
            icon.style.setProperty('filter', 'brightness(1)', 'important');
            icon.style.setProperty('transform', 'scale(1.1)', 'important'); // Adds a premium subtle micro-grow on hover
        });
        btn.addEventListener('mouseleave', () => {
            icon.style.setProperty('filter', 'brightness(0.65)', 'important');
            icon.style.setProperty('transform', 'scale(1)', 'important');
        });

        // Assemble the button tree
        btn.appendChild(icon);
        myBtnContainer.appendChild(btn);
		
        const channelName = window.location.pathname.split('/')[1];

        // 4. Create the Menu Frame
        const frame = document.createElement('iframe');
        frame.id = 'my-7tv-menu';
        frame.src = chrome.runtime.getURL(`popup.html?channel=${encodeURIComponent(channelName)}`);
        frame.className = 'my-7tv-iframe-hidden';

        // 5. Create the Resizer Handle
        const resizer = document.createElement('div');
        resizer.id = 'my-7tv-resizer';
        resizer.style.height = '5px';
        resizer.style.cursor = 'ns-resize';
        resizer.style.width = '100%';
        resizer.style.background = 'transparent'; 

        // CRUCIAL EMBEDMENT CHANGE: Expand the internal horizontal typing container boundaries.
        // This compresses the text field width, creating a structural safety lane inside the white box bounds
        chatInputBox.style.paddingRight = '115px'; 

        btn.onclick = (event) => {
            event.stopPropagation();
            event.preventDefault(); // Blocks Twitch input selection interruptions

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

        // --- Final Injection Using the Fixed Absolute Overlay Method ---
        textContainerWrapper.appendChild(myBtnContainer);
	
        // Ensure resizer is initially hidden like the iframe frame
        resizer.style.display = 'none'; 
        
        chatInputSection.insertAdjacentElement('beforebegin', resizer);
        chatInputSection.insertAdjacentElement('beforebegin', frame);
    }
}

// Twitch is a Single Page App, so we watch the body for component loads
const observer = new MutationObserver(() => {
    // Only call our function if the button disappeared but the typing frame is active
    if (!document.getElementById('my-custom-7tv-btn') && document.querySelector('[data-a-target="chat-input"]')) {
        injectEmoteButton();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial run fallback step
injectEmoteButton();

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

    // 2. Use a DataTransfer object to force Slate calculation updates
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text + ' ');

    const event = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
    });

    editor.dispatchEvent(event);
}
