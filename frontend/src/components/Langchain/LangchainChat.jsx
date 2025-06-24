import React from 'react'
import { useState, useEffect, useRef } from 'react';
import styles from './LangchainChat.module.css'

const LangchainChat = () => {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false)
  const chatWindowRef = useRef(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage, { sender: 'bot', text: '' }]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('http://localhost:8000/stream-chat-langchain-02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const readChunk = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            setIsStreaming(false);
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((msg, index) =>
              index === prev.length - 1
                ? { ...msg, text: msg.text + chunk }
                : msg
            )
          );
          readChunk();
        });
      };
      readChunk();
    } catch (error) {
      console.error('Failed to fetch stream:', error);
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1
            ? { ...msg, text: "Error: Could not connect to the server." }
            : msg
        )
      );
    }
  };

  return (

    <div className={styles.chatContainer}>
      <div className={styles.chatWindow} ref={chatWindowRef}>
        <p>Langchain api  with whole  chunks</p>
        {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
            <p >{msg.text}</p>
                      {isStreaming && msg.sender === 'bot' && index === messages.length - 1 && (

            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>

                      )}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className={styles.chatInputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming}>
          {isStreaming ? 'Generating...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default LangchainChat