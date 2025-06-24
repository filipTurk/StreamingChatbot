import { useState, useEffect, useRef, use } from "react";
import "./App.css";
import OpenAIChat from "./components/OpenAI/OpenAIChat";
import GoogleChat from "./components/Google/GoogleChat";
import LangchainChat from "./components/Langchain/LangchainChat";

function App() {
  const [selectedModel, setSelectedModel] = useState("Langchain");

  return (
    <div>
      <div className="button-container">
      <button onClick={() => setSelectedModel("Langchain")}>Langchain API</button>
      {/* <button onClick={() => setSelectedModel("OpenAI")}>OpenAI</button> */}
      <button onClick={() => setSelectedModel("Google")}>Google API</button>
      </div>

      {selectedModel === "Langchain" && <LangchainChat />}
      {selectedModel === "OpenAI" && <OpenAIChat />}
      {selectedModel === "Google" && <GoogleChat />}
    </div>
  );
}

export default App;
