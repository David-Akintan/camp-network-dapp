import { useState, useEffect } from "react";
import "./styles/App.css";
import useWallet from "./hooks/useWallet";
import RegisterIP from "./Components/ip/RegisterIP";
import IPDashboard from "./Components/ip/IPDashboard";
import WalletConnect from "./Components/common/WalletConnect";
import EventCreatorForm from "./Components/event/EventCreatorForm";
import TicketClaimer from "./Components/ticket/TicketClaimer";
import ThemeToggle from "./Components/common/ThemeToggle";
import { CampModal } from "@campnetwork/origin/react";

function App() {
  const {
    provider,
    signer,
    account,
    isConnected,
    connectWallet,
    disconnectWallet,
  } = useWallet();
  const [currentPage, setCurrentPage] = useState("register");

  useEffect(() => {
    connectWallet();
  }, []);

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <h1>🏕️ Dayve Camp Project</h1>
            </div>
          </div>
          
          <nav className="header-nav">
            <button
              className={`nav-link ${currentPage === "register" ? "active" : ""}`}
              onClick={() => setCurrentPage("register")}
            >
              📝 Register IP
            </button>
            <button
              className={`nav-link ${currentPage === "dashboard" ? "active" : ""}`}
              onClick={() => setCurrentPage("dashboard")}
            >
              📚 Dashboard
            </button>
            <button
              className={`nav-link ${currentPage === "events" ? "active" : ""}`}
              onClick={() => setCurrentPage("events")}
            >
              🎫 Create Events
            </button>
            <button
              className={`nav-link ${currentPage === "tickets" ? "active" : ""}`}
              onClick={() => setCurrentPage("tickets")}
            >
              🎟️ Claim Tickets
            </button>
          </nav>

          <div className="header-right">
            <ThemeToggle />
            {/* <WalletConnect /> */}
            <CampModal />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {currentPage === "register" ? (
          <>
            <h2 style={{ marginBottom: "2rem" }}>
              Camp Network IP Registration Portal
            </h2>
            <RegisterIP />
          </>
        ) : currentPage === "dashboard" ? (
          <IPDashboard />
        ) : currentPage === "events" ? (
          <EventCreatorForm />
        ) : currentPage === "tickets" ? (
          <TicketClaimer />
        ) : (
          <RegisterIP />
        )}
      </main>
    </div>
  );
}

export default App;
