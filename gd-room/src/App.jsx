import { BrowserRouter, Routes, Route } from "react-router-dom";
import PWS from "./pages/PWS/PWS";
import GD from "./pages/GD/GD";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PWS />} />
        <Route path="/gd" element={<GD />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;