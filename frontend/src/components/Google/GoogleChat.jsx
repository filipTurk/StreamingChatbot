import React from "react";
import styles from "./GoogleChat.module.css";
import { useState, useEffect, useRef } from "react";

const GoogleChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const typingQueueRef = useRef("");
  const animationFrameRef = useRef(null);
  const chatWindowRef = useRef(null);

  useEffect(() => {
    const typewriterLoop = () => {
      if (typingQueueRef.current.length > 0) {
        const charsToType = typingQueueRef.current.length > 100 ? 3 : 1;

        const textToAppend = typingQueueRef.current.substring(0, charsToType);
        typingQueueRef.current = typingQueueRef.current.substring(charsToType);

        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1
              ? { ...msg, text: msg.text + textToAppend }
              : msg
          )
        );
      }
      animationFrameRef.current = requestAnimationFrame(typewriterLoop);
    };

    animationFrameRef.current = requestAnimationFrame(typewriterLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage, { sender: "bot", text: "" }]);
    const messageToSend = input;
    setInput("");
    setIsStreaming(true);
    typingQueueRef.current = "";

    try {
      const response = await fetch("http://localhost:8000/stream-chat-genai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!response.body) {
        throw new Error("Response has no body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        typingQueueRef.current += chunk;
      }
    } catch (error) {
      console.error("Failed to fetch stream:", error);
      typingQueueRef.current += "\n\nError: Could not connect to the server.";
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-window" ref={chatWindowRef}>
        <p>Typewriter effect with google api </p>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
            {isStreaming &&
              msg.sender === "bot" &&
              index === messages.length - 1 && (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming}>
          {isStreaming ? "Generating..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default GoogleChat;
