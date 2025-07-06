import "./App.css";
import GoogleChat from "./components/GoogleChat.tsx";

function App() {
  return (
    <>
        <div 
        className="min-h-screen min-w-screen bg-cover bg-center flex items-center justify-center p-4 font-sans"
        style={{ backgroundImage: "url('public/2.jpeg')" }}
    >
      <GoogleChat />
    </div>
    </>
  );
}

export default App;
