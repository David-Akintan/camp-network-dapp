import React, { useState, useRef, useEffect } from "react";
import {
  useConnect,
  useAuthState,
  useAuth,
  useModal,
  useProvider,
  CampModal,
} from "@campnetwork/origin/react";

const WalletConnect = () => {
  const { connect, disconnect } = useConnect();
  const { authenticated, loading } = useAuthState();
  const { setProvider } = useProvider();
  const { openModal } = useModal();

  const [walletAddress, setWalletAddress] = useState(""); // Local wallet state
  const [dropdownOpen, setDropdownOpen] = useState(false); // Dropdown state

  const dropdownRef = useRef();

  const getShortAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
      }

      setProvider({
        provider: window.ethereum,
        info: { name: "RainbowKit" },
      });

      const res = await connect();
      console.log(res);
      if (res.success) {
        setWalletAddress(res.walletAddress); // Save it to local state
      }
    } catch (err) {
      console.error("Connect error:", err);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
      setWalletAddress(""); // Clear address
      setDropdownOpen(false); // Close dropdown
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const handleClick = () => {
    if (authenticated) {
      setDropdownOpen((prev) => !prev);
    } else {
      connectWallet();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      ref={dropdownRef}
    >
      <CampModal injectButton={false} />
      <button
        onClick={handleClick}
        style={{
          padding: "10px 16px",
          borderRadius: "8px",
          backgroundColor: authenticated ? "rgb(255 109 1/1)" : "rgb(255 109 1/1)",
          color: authenticated ? "#fff" : "#fff",
          border: "1px solid #ccc",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {/* {renderButtonText()} */}
        {loading
          ? "Connecting..."
          : authenticated
          ? getShortAddress(walletAddress)
          : "Connect Wallet"}
      </button>

      {authenticated && dropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 1000,
            minWidth: "160px",
            padding: "8px 0",
          }}
        >
          <div
            onClick={() => {
              openModal();
              setDropdownOpen(false);
            }}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
              fontWeight: 500,
              color: "#d00",
            }}
          >
            Check Origin
            {/* <button onClick={disconnectWallet}>Disconnect</button> */}
          </div>
          <div
            onClick={disconnectWallet}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              color: "#d00",
              fontWeight: 500,
            }}
          >
            Disconnect
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
