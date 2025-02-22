import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      {/* Logos */}
      <div className="flex space-x-8">
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={viteLogo}
            className="w-20 h-20 transition-transform hover:scale-110"
            alt="Vite logo"
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={reactLogo}
            className="w-20 h-20 transition-transform hover:scale-110"
            alt="React logo"
          />
        </a>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold mt-6">Vite + React</h1>

      {/* Counter Card */}
      <div className="mt-4 p-6 bg-gray-800 rounded-xl shadow-md text-center">
        <button
          className="px-6 py-3 text-lg font-semibold bg-blue-500 hover:bg-blue-600 transition rounded-lg"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
        <p className="mt-4 text-gray-400">
          Edit <code className="bg-gray-700 p-1 rounded">src/App.tsx</code> and
          save to test HMR.
        </p>
      </div>

      {/* Footer Text */}
      <p className="mt-6 text-gray-400 text-sm">
        Click on the Vite and React logos to learn more.
      </p>
    </div>
  );
}

export default App;
