import React, { use, useEffect, useState } from "react";
import { ethers } from "ethers";
import "./RegisterIP.css";
import { contractABI, contractAddress } from "../Constants/constant";
import { useConnect, useAuthState, useProvider } from "@campnetwork/origin/react";

const TestRegisterIP = () => {
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [desc, setDesc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [licenseType, setLicenseType] = useState("");
  const [category, setCategory] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [licenseFile, setLicenseFile] = useState(null);
  const [customLicenseCID, setCustomLicenseCID] = useState("");
  const [isConnectedToCampNetwork, setIsConnectedToCampNetwork] = useState(false);
  const [toasts, setToasts] = useState([]);

  const { authenticated } = useAuthState();
  const { provider } = useProvider();

  const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
  const PINATA_API_SECRET = import.meta.env.VITE_PINATA_API_SECRET;
  const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

  // Camp Network testnet chain ID
  const CAMP_NETWORK_CHAIN_ID = 123420001114;

  // Check if connected to Camp Network testnet
  useEffect(() => {
    const checkNetwork = async () => {
      if (authenticated && window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const chainIdDecimal = parseInt(chainId, 16);
          setIsConnectedToCampNetwork(chainIdDecimal === CAMP_NETWORK_CHAIN_ID);
        } catch (error) {
          console.error("Error checking network:", error);
          setIsConnectedToCampNetwork(false);
        }
      } else {
        setIsConnectedToCampNetwork(false);
      }
    };

    checkNetwork();

    // Listen for chain changes
    if (window.ethereum) {
      const handleChainChanged = () => {
        checkNetwork();
      };

      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [authenticated]);

  // Toast notification functions
  const addToast = (type, title, message, txHash = null) => {
    const id = Date.now();
    const toast = {
      id,
      type,
      title,
      message,
      txHash
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove toast after 8 seconds
    setTimeout(() => {
      removeToast(id);
    }, 8000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const categoryOptions = [
    "All",
    "Writing",
    "Design",
    "Music",
    "Video",
    "Idea",
    "Photography",
    "Other",
  ];

  const licenseOptions = [
    { value: "CC0", label: "CC0 - No Rights Reserved" },
    { value: "BY-SA", label: "CC BY-SA - Attribution + ShareAlike" },
    { value: "BY-NC", label: "CC BY-NC - Attribution + NonCommercial" },
    { value: "CUSTOM", label: "Custom License (linked)" },
  ];

  const isFormValid = () => {
    return (
      authenticated &&
      isConnectedToCampNetwork &&
      file !== null &&
      title.trim() !== "" &&
      desc.trim() !== "" &&
      category.trim() !== "" &&
      licenseType.trim() !== "" &&
      !isLoading
    );
  };


  const ipfsUpload = async (file, metadataJson) => {
    try {
      setStatus("Uploading to IPFS via Pinata...");

      const metadataBlob = new Blob([JSON.stringify(metadataJson)], {
        type: "application/json",
      });

      const fileBlob = new Blob([file], { type: file.type });

      const files = metadataJson?.isLicense
      ? [
          new File([fileBlob], file.name, { type: file.type })
        ]
      : [
          new File([metadataBlob], "metadata.json", { type: "application/json" }),
          new File([fileBlob], file.name, { type: file.type })
        ];

      const formData = new FormData();
      // Append each file to the FormData
      Array.from(files).forEach((file) => {
        formData.append("file", file, `files/${file.name}`);
      });

      const pinataMetadata = JSON.stringify({
        name: "Uploaded IP & Metadata",
      });

      // Append metadata and options as JSON strings
      // This is necessary for Pinata to understand the metadata and options
      formData.append("pinataMetadata", pinataMetadata);

      console.log(formData)


      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PINATA_JWT}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      console.log("Pinata Upload Result:", result);

      if (result.IpfsHash) {
        setStatus("Upload successful.");
        return result.IpfsHash;
      } else {
        throw new Error("Pinata upload failed");
      }
    } catch (err) {
      setStatus("IPFS Upload failed.");
      console.error("IPFS Error:", err);
      return null;
    }
  };

  const handleLicenseUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      setStatus("License file too large. Maximum size is 5MB.");
      return;
    }
    setLicenseFile(file);
    setStatus(""); // Clear any previous status
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!authenticated) {
      setStatus("Please connect your wallet first.");
      return;
    }
    if (!isConnectedToCampNetwork) {
      setStatus("Please connect to the Camp Network testnet.");
      return;
    }
    
    if (!file) {
      setStatus("Please select a file to upload.");
      return;
    }

    if (!title.trim()) {
      setStatus("Please enter a title for your IP.");
      return;
    }
    
    if (!desc.trim()) {
      setStatus("Please enter a description for your IP.");
      return;
    }
    
    if (!category.trim()) {
      setStatus("Please select a category.");
      return;
    }
    
    if (!licenseType.trim()) {
      setStatus("Please select a license type.");
      return;
    }
    if (licenseType === "CUSTOM" && !licenseFile) {
      setStatus("Please upload a custom license document.");
      return;
    }
    
    // Create a Web3Provider from window.ethereum for getting the signer
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    const account = await web3Provider.getSigner().getAddress();
    
    // if (!file || !title || !desc || !category || !licenseType) {
    //   setStatus("Please fill in all fields and select a file.");
    //   return;
    // }

    setIsLoading(true);

    try {
      const metadata = {
        title: `${title}`,
        description: `${desc}`,
        filename: `${fileName}`,
        type: `${file.type}`,
        size: `${file.size}`,
        timestamp: `${new Date().toISOString()}`,
        license: `${licenseType}`,
        category: `${category}`,
        fileHash: `${fileHash}`,
        customLicenseCID: licenseType === "CUSTOM" ? `${customLicenseCID}` : "",
        owner: `${account}`,
      };
  
      setStatus("Uploading file to IPFS...");
      const fileBlob = new Blob([file], { type: file.type });
      const processedFile = new File([fileBlob], file.name, {
        type: file.type,
      });
      // Upload the file to IPFS
      const ipfsHash = await ipfsUpload(processedFile, metadata);
      if (!ipfsHash) {
        setIsLoading(false);
        return;
      }

      const origin = new ethers.Contract(contractAddress, contractABI, web3Provider.getSigner());

      setStatus("Registering IP on-chain...");

      let licenseValue = licenseType;

      if (licenseType === "CUSTOM" && licenseFile) {
        const ipfsCID = await ipfsUpload(licenseFile, null);

        if (!ipfsCID) {
          setStatus("Failed to upload custom license document.");
          alert("Failed to upload custom license document.");
          return;
        }

        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCID}`;
        licenseValue = `CUSTOM:${ipfsUrl}`;
      }
      const tx = await origin.registerIP(
        ipfsHash,
        title,
        desc,
        licenseValue,
        fileHash,
        category,
        fileName
      );
      setStatus("Transaction submitted. Waiting for confirmation...");

      const receipt = await tx.wait();
      addToast(
        'success',
        '✅ Registration Successful!',
        `Your IP "${title}" has been successfully registered on the blockchain.`,
        receipt.transactionHash
      );
      //clear form fields
      setTitle("");
      setDesc("");
      setFile(null);
      setFileName("");
      setFileHash("");
      setLicenseType("");
      setCategory("");
      setLicenseFile(null);
      setCustomLicenseCID("");

      // Optionally, you can reset the status after a delay
      setTimeout(() => {
        setStatus("");
      }, 5000);
    } catch (error) {
      console.error("Registration Error:", error);

      if (error.code === "ACTION_REJECTED") {
        setStatus("Transaction rejected by user.");
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        setStatus("Insufficient funds for gas fees.");
      } else if (error.message?.includes("user rejected")) {
        setStatus("Transaction rejected by user.");
      } else {
        setStatus("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Basic file validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      setStatus("File too large. Maximum size is 10MB.");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      // Use Web Crypto API for SHA-256 hash
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setFileHash(hashHex);
    } catch (error) {
      console.error("Error hashing file:", error);
      setStatus("Failed to process file.");
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setStatus(""); // Clear any previous status
  };

  return (
    <>
    <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-header">
              <div className="toast-title">
                {toast.title}
              </div>
              <button
                className="toast-close"
                onClick={() => removeToast(toast.id)}
              >
                ×
              </button>
            </div>
            <div className="toast-message">
              {toast.message}
              {toast.txHash && (
                <div className="tx-hash">
                  Tx: {toast.txHash}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      
      <div className="register-container">
        <h2 className="header">✨ Register Your IP ✨</h2>
        
        {!authenticated && (
          <div className="status error" style={{ marginBottom: "20px" }}>
            🔗 Please connect your wallet to register IP
          </div>
        )}
        
        {authenticated && !isConnectedToCampNetwork && (
          <div className="status error" style={{ marginBottom: "20px" }}>
            🌐 Please connect to the Camp Network testnet to register IP
          </div>
        )}
        
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="file-input">📁 Select File</label>
            <input
              id="file-input"
              type="file"
              onChange={(e) => {
                setFileName(e.target.files[0].name);
                handleFileChange(e);
              }}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              disabled={!authenticated || !isConnectedToCampNetwork}
            />
            {(!authenticated || !isConnectedToCampNetwork) && (
              <small style={{ color: '#718096', fontStyle: 'italic', marginTop: '0.5rem' }}>
                🔐 Connect your wallet and switch to Camp Network to upload files
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="title-input">📝 Title</label>
            <input
              id="title-input"
              type="text"
              value={title}
              style={{ textTransform: "capitalize", color: "#ffffffff" }}

              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your IP title..."
              required
              disabled={!authenticated || !isConnectedToCampNetwork}
            />
          </div>

          <div className="form-group">
            <label htmlFor="desc-input">📝 Description</label>
            <textarea
              id="desc-input"
              value={desc}
              style={{ textTransform: "capitalize", color: "#ffffffff" }}

              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe your intellectual property..."
              required
              rows={4}
              disabled={!authenticated || !isConnectedToCampNetwork}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">🎨 Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={!authenticated || !isConnectedToCampNetwork}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {categoryOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>⚖️ License Type</label>
            <select
              value={licenseType}
              onChange={(e) => {
                setLicenseType(e.target.value);
                setCustomLicenseCID("");
              }}
              required
              disabled={!authenticated || !isConnectedToCampNetwork}
            >
              <option value="" disabled>
                Select a license
              </option>
              {licenseOptions.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {licenseType === "CUSTOM" && (
              <div className="custom-license">
                <label htmlFor="custom-license-cid">
                  📄 Upload Custom License Document
                </label>
                <input
                  id="custom-license-cid"
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleLicenseUpload}
                  required
                  disabled={!authenticated || !isConnectedToCampNetwork}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`submit-button ${
              !isFormValid || isLoading ? "disabled" : ""
            }`}
          >
            {isLoading 
              ? "⏳ Processing..." 
              : !authenticated 
              ? "🔗 Connect Wallet to Register IP"
              : !isConnectedToCampNetwork 
              ? "🌐 Connect to Camp Network to Register IP"
              : "🚀 Register IP"
            }
          </button>

          {status && (
            <div
              className={`status ${
                status.includes("✅")
                  ? "success"
                  : status.includes("failed")
                  ? "error"
                  : "info"
              }`}
            >
              {status}
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default TestRegisterIP;
