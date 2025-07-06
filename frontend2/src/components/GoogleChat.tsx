import React, { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";

interface Message {
  sender: "user" | "bot";
  text: string;
}

const SparkleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const GoogleChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const typingQueueRef = useRef<string>("");
  const animationFrameRef = useRef<number | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { sender: "user", text: input };
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
        if (done) break;
        
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

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm text-white flex flex-col w-full max-w-3xl h-[90vh] rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
      <header className="p-4 border-b border-gray-700/50 shadow-md flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-200">CatBot</h1>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          Powered by Gemini
          <SparkleIcon className="w-4 h-4 text-purple-400"/>
        </div>
      </header>
      
      <main ref={chatWindowRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-400">
            Your chat history is empty.
            <br/>
            Start the conversation by sending a message.
          </div>
        )}
        {messages.map((msg, index) => {
          // Don't render empty bot messages when streaming
          if (msg.sender === 'bot' && msg.text === '' && isStreaming) {
            return null;
          }
          
          return (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0"></div>}
              <div className={`max-w-[75%] px-5 py-3 rounded-[20px] shadow break-words ${msg.sender === "user" ? "bg-blue-600 rounded-br-none" : "bg-gray-800 rounded-bl-none"}`}>
                <p className="text-white whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0"></div>}
            </div>
          );
        })}
        {isStreaming && messages[messages.length - 1]?.sender === 'bot' && messages[messages.length - 1]?.text === '' && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0"></div>
            <div className="max-w-[75%] px-5 py-3 rounded-[20px] shadow break-words bg-gray-800 rounded-bl-none">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-gray-700/50 bg-gray-900/50 flex-shrink-0">
        {suggestedReplies.length > 0 && !isStreaming && (
          <div className="flex gap-2 mb-3 justify-center flex-wrap">
            {suggestedReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(reply);
                  setSuggestedReplies([]);
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-full transition-colors"
              >
                ✨ {reply}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Ask me anything..." 
            disabled={isStreaming} 
            className="flex-1 w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-white disabled:opacity-50"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as any);
            }}
            disabled={isStreaming || !input.trim()}
            className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/30 backdrop-blur-lg px-6 py-2 text-base font-semibold text-black transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-gray-600/50 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
          >
            {isStreaming ? (
              <div className="w-5 h-5 border-t-2 border-current border-solid rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-lg">Send</span>
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                  <div className="relative h-full w-10 bg-white/20"></div>
                </div>
              </>
            )}
          </button>
          <button 
            onClick={handleClearChat} 
            className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/30 backdrop-blur-lg px-6 py-2 text-base font-semibold text-black transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-gray-600/50 border border-white/20"
          >
            <span className="text-lg">Clear</span>
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
              <div className="relative h-full w-10 bg-white/20"></div>
            </div>
          </button>
        </div>
        {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
      </footer>
    </div>
  );
};

export default GoogleChat;