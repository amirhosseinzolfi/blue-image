import React, { useRef, useState } from 'react';

const ChatInput = ({ onSend }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInputChange = (e) => {
        setInput(e.target.value);
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
        }
    };

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input.trim());
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = '40px';
    };

    return (
        <div className="chat-input-container">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                rows={1}
                placeholder="" // no extra text
                style={{
                    resize: 'none',
                    overflow: 'hidden',
                    width: 'calc(100% - 16px)',
                    boxSizing: 'border-box',
                    background: 'transparent',
                    color: 'inherit',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    borderRadius: '20px',
                    border: 'none',
                    padding: '12px 22px 12px 44px', // shrink left padding
                    fontSize: '1rem',
                    margin: '0 8px' // Add even margins on both sides
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
            />
            <button
                onClick={handleSend}
                className="chat-send-btn"
                aria-label="Send message"
            >
                <svg xmlns="http://www.w3.org/2000/svg"
                     viewBox="0 0 24 24"
                     fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3V10L16 12 2.01 14 2.01 21Z"/>
                </svg>
            </button>
        </div>
    );
};

export default ChatInput;