import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../../Constants/constant";
import { useAuthState, useProvider } from "@campnetwork/origin/react";
import "./EventCreatorForm.css";

const EventCreatorForm = () => {
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectedToCampNetwork, setIsConnectedToCampNetwork] =
    useState(false);
  const [toasts, setToasts] = useState([]);

  // Event form states
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    venue: "",
    organizer: "",
    category: "",
    ticketPrice: "",
    maxTickets: "",
    eventImage: null,
    eventImageName: "",
    eventImageHash: "",
    eventBanner: null,
    eventBannerName: "",
    eventBannerHash: "",
  });

  const { authenticated } = useAuthState();
  const { provider } = useProvider();

  const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
  const PINATA_API_SECRET = import.meta.env.VITE_PINATA_API_SECRET;
  const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

  // Camp Network testnet chain ID
  const CAMP_NETWORK_CHAIN_ID = 123420001114;

  // Event categories
  const eventCategories = [
    "Music",
    "Technology",
    "Business",
    "Education",
    "Sports",
    "Arts",
    "Food",
    "Health",
    "Comedy",
    "Networking",
    "Workshop",
    "Conference",
    "Fashion",
    "Festival",
    "Other",
  ];

  // Check if connected to Camp Network testnet
  useEffect(() => {
    const checkNetwork = async () => {
      if (authenticated && window.ethereum) {
        try {
          const chainId = await window.ethereum.request({
            method: "eth_chainId",
          });
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

    if (window.ethereum) {
      const handleChainChanged = () => {
        checkNetwork();
      };

      window.ethereum.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
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
      txHash,
    };

    setToasts((prev) => [...prev, toast]);

    // Auto remove toast after 8 seconds
    setTimeout(() => {
      removeToast(id);
    }, 8000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Form validation
  const isFormValid = () => {
    return (
      authenticated &&
      isConnectedToCampNetwork &&
      eventData.title.trim() !== "" &&
      eventData.description.trim() !== "" &&
      eventData.date !== "" &&
      eventData.time !== "" &&
      eventData.location.trim() !== "" &&
      eventData.venue.trim() !== "" &&
      eventData.organizer.trim() !== "" &&
      eventData.category !== "" &&
      eventData.ticketPrice !== "" &&
      eventData.maxTickets !== "" &&
      eventData.eventImage !== null &&
      !isLoading
    );
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file uploads
  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    // File validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setStatus(`${fileType} file too large. Maximum size is 5MB.`);
      return;
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setStatus(`${fileType} must be an image file (JPEG, PNG, WebP).`);
      return;
    }

    try {
      // Generate file hash
      const buffer = await file.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setEventData((prev) => ({
        ...prev,
        [fileType]: file,
        [`${fileType}Name`]: file.name,
        [`${fileType}Hash`]: hashHex,
      }));

      setStatus(""); // Clear any previous status
    } catch (error) {
      console.error("Error processing file:", error);
      setStatus(`Failed to process ${fileType.toLowerCase()}.`);
    }
  };
  // IPFS upload function - Updated for event creation
  const ipfsUpload = async (file, metadataJson) => {
    try {
      setStatus("Uploading to IPFS via Pinata...");

      // Create metadata blob
      const metadataBlob = new Blob([JSON.stringify(metadataJson)], {
        type: "application/json",
      });

      // Create file blob
      const fileBlob = new Blob([file], { type: file.type });

      // For event creation, we upload either:
      // 1. Event image + metadata (when uploading event image)
      // 2. Just metadata (when uploading metadata only)
      const files = metadataJson?.isEventImage
        ? [
            new File([fileBlob], file.name, { type: file.type }),
            new File([metadataBlob], "metadata.json", {
              type: "application/json",
            }),
          ]
        : [
            new File([metadataBlob], "metadata.json", {
              type: "application/json",
            }),
          ];

      const formData = new FormData();

      // Add files to form data
      Array.from(files).forEach((file) => {
        formData.append("file", file, `files/${file.name}`);
      });

      // Pinata metadata
      const pinataMetadata = JSON.stringify({
        name: metadataJson?.isEventImage
          ? "Event Image & Metadata"
          : "Event Metadata",
        keyvalues: {
          type: metadataJson?.isEventImage ? "event-image" : "event-metadata",
          timestamp: new Date().toISOString(),
        },
      });

      formData.append("pinataMetadata", pinataMetadata);

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
      // console.log("Pinata Upload Result:", result);

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

  // Create event and register as IP
  const handleCreateEvent = async (e) => {
    e.preventDefault();

    // Validation
    if (!authenticated) {
      setStatus("Please connect your wallet first.");
      return;
    }

    if (!isConnectedToCampNetwork) {
      setStatus("Please connect to the Camp Network testnet.");
      return;
    }

    if (!eventData.title.trim()) {
      setStatus("Please enter an event title.");
      return;
    }

    if (!eventData.description.trim()) {
      setStatus("Please enter an event description.");
      return;
    }

    if (!eventData.date) {
      setStatus("Please select an event date.");
      return;
    }

    if (!eventData.time) {
      setStatus("Please select an event time.");
      return;
    }

    if (!eventData.location.trim()) {
      setStatus("Please enter an event location.");
      return;
    }

    if (!eventData.venue.trim()) {
      setStatus("Please enter a venue name.");
      return;
    }

    if (!eventData.organizer.trim()) {
      setStatus("Please enter organizer information.");
      return;
    }

    if (!eventData.category) {
      setStatus("Please select an event category.");
      return;
    }

    if (!eventData.ticketPrice || parseFloat(eventData.ticketPrice) < 0) {
      setStatus("Please enter a valid ticket price.");
      return;
    }

    if (!eventData.maxTickets || parseInt(eventData.maxTickets) <= 0) {
      setStatus("Please enter a valid maximum number of tickets.");
      return;
    }

    if (!eventData.eventImage) {
      setStatus("Please upload an event image.");
      return;
    }

    setIsLoading(true);

    try {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const account = await web3Provider.getSigner().getAddress();

      // Create event metadata
      const eventMetadata = {
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        venue: eventData.venue,
        organizer: eventData.organizer,
        category: eventData.category,
        ticketPrice: parseFloat(eventData.ticketPrice),
        maxTickets: parseInt(eventData.maxTickets),
        eventImageName: eventData.eventImageName,
        eventImageHash: eventData.eventImageHash,
        eventBannerName: eventData.eventBannerName,
        eventBannerHash: eventData.eventBannerHash,
        owner: account,
        timestamp: new Date().toISOString(),
        type: "event",
        status: "active",
      };

      setStatus("Uploading event image and metadata to IPFS...");

      // Upload event image
      const eventImageHash = await ipfsUpload(eventData.eventImage, {
        isEventImage: true,
        ...eventMetadata,
      });
      if (!eventImageHash) {
        setIsLoading(false);
        return;
      }

      // Upload event banner if provided
      let eventBannerHash = null;
      if (eventData.eventBanner) {
        setStatus("Uploading event banner to IPFS...");
        eventBannerHash = await ipfsUpload(eventData.eventBanner, {
          isEventImage: true,
          ...eventMetadata,
          isBanner: true,
        });
        if (!eventBannerHash) {
          setIsLoading(false);
          return;
        }
      }

      // Create final metadata for blockchain registration
      const finalMetadata = {
        ...eventMetadata,
        eventImageHash: eventImageHash,
        eventBannerHash: eventBannerHash,
        ipfsHash: eventImageHash, // Main IPFS hash for the event
      };

      // Upload event metadata
      setStatus("Uploading event metadata to IPFS...");
      const metadataFile = new File(
        [JSON.stringify(finalMetadata)],
        "event-metadata.json",
        {
          type: "application/json",
        }
      );
      const metadataHash = await ipfsUpload(metadataFile, finalMetadata);

      if (!metadataHash) {
        setIsLoading(false);
        return;
      }

      // Register event as IP on blockchain
      const origin = new ethers.Contract(
        contractAddress,
        contractABI,
        web3Provider.getSigner()
      );

      setStatus("Registering event as IP on-chain...");

      // Convert ticket price to wei
      const ticketPriceWei = ethers.utils.parseEther(eventData.ticketPrice);

      // Convert event date to timestamp
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
      const eventTimestamp = Math.floor(eventDateTime.getTime() / 1000);

      const tx = await origin.createEvent(
        metadataHash, // IPFS hash for metadata
        eventData.title,
        eventData.description,
        eventData.location,
        eventTimestamp,
        ticketPriceWei,
        parseInt(eventData.maxTickets),
        eventData.category
      );

      setStatus("Transaction submitted. Waiting for confirmation...");

      const receipt = await tx.wait();

      // Show success notification
      addToast(
        "success",
        "🎉 Event Created Successfully!",
        `Your event "${eventData.title}" has been created and registered as IP on the blockchain.`,
        `${receipt.transactionHash}`
      );

      // Reset form
      setEventData({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        venue: "",
        organizer: "",
        category: "",
        ticketPrice: "",
        maxTickets: "",
        eventImage: null,
        eventImageName: "",
        eventImageHash: "",
        eventBanner: null,
        eventBannerName: "",
        eventBannerHash: "",
      });

      setStatus("");
    } catch (error) {
      console.error("Event Creation Error:", error);

      let errorMessage = "Event creation failed. Please try again.";

      if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction rejected by user.";
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient funds for gas fees.";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user.";
      }

      addToast("error", "❌ Event Creation Failed", errorMessage);
      setStatus(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      <div className="event-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`event-toast ${toast.type}`}>
            <div className="event-toast-header">
              <div className="event-toast-title">{toast.title}</div>
              <button
                className="event-toast-close"
                onClick={() => removeToast(toast.id)}
              >
                ×
              </button>
            </div>
            <div className="event-toast-message">
              {toast.message}
              {toast.txHash && (
                <div className="event-tx-hash"><a
  href={`https://basecamp.cloud.blockscout.com/tx/${toast.txHash}`}
  target="_blank"
  rel="noopener noreferrer"
>
  View on Explorer
</a></div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="event-creator-form-container">
        <div className="event-creator-form-header">
          <h1>🎫 Create Event & Register as IP</h1>
          <p>
            Create your event and register it as intellectual property on Camp
            Network
          </p>
        </div>

        {!authenticated && (
          <div className="event-auth-required">
            <h2>🔐 Authentication Required</h2>
            <p>Please connect your wallet to create events.</p>
          </div>
        )}

        {authenticated && !isConnectedToCampNetwork && (
          <div className="event-network-warning">
            <h2> Network Required</h2>
            <p>Please connect to the Camp Network testnet to create events.</p>
          </div>
        )}

        {authenticated && isConnectedToCampNetwork && (
          <form onSubmit={handleCreateEvent} className="event-form">
            <div className="event-form-section">
              <h3>📋 Event Information</h3>

              <div className="event-form-row">
                <div className="event-form-group">
                  <label htmlFor="title">Event Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    style={{ textTransform: "capitalize", color: "#ffffffff" }}
                    value={eventData.title}
                    onChange={handleInputChange}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div className="event-form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={eventData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select category</option>
                    {eventCategories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="event-form-group">
                <label htmlFor="description">Event Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={eventData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your event..."
                  rows={4}
                  required
                />
              </div>

              <div className="event-form-row">
                <div className="event-form-group">
                  <label htmlFor="date">Event Date *</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={eventData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="event-form-group">
                  <label htmlFor="time">Event Time *</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={eventData.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="event-form-row">
                <div className="event-form-group">
                  <label htmlFor="location">Location *</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={eventData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                    required
                  />
                </div>

                <div className="event-form-group">
                  <label htmlFor="venue">Venue *</label>
                  <input
                    type="text"
                    id="venue"
                    name="venue"
                    value={eventData.venue}
                    onChange={handleInputChange}
                    placeholder="Venue name"
                    required
                  />
                </div>
              </div>

              <div className="event-form-group">
                <label htmlFor="organizer">Organizer *</label>
                <input
                  type="text"
                  id="organizer"
                  name="organizer"
                  value={eventData.organizer}
                  onChange={handleInputChange}
                  placeholder="Organizer name or organization"
                  required
                />
              </div>
            </div>

            <div className="event-form-section">
              <h3>💰 Ticketing Information</h3>

              <div className="event-form-row">
                <div className="event-form-group">
                  <label htmlFor="ticketPrice">Ticket Price (ETH) *</label>
                  <input
                    type="number"
                    id="ticketPrice"
                    name="ticketPrice"
                    value={eventData.ticketPrice}
                    onChange={handleInputChange}
                    placeholder="0.01"
                    step="0.001"
                    min="0"
                    required
                  />
                </div>

                <div className="event-form-group">
                  <label htmlFor="maxTickets">Maximum Tickets *</label>
                  <input
                    type="number"
                    id="maxTickets"
                    name="maxTickets"
                    value={eventData.maxTickets}
                    onChange={handleInputChange}
                    placeholder="100"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="event-form-section">
              <h3>️ Event Media</h3>

              <div className="event-form-group">
                <label htmlFor="eventImage">Event Image *</label>
                <input
                  type="file"
                  id="eventImage"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "eventImage")}
                  required
                />
                <small>
                  Upload a high-quality image for your event (max 5MB)
                </small>
                {eventData.eventImageName && (
                  <div className="event-file-preview">
                    <span>

                      <img
                      src={URL.createObjectURL(eventData.eventImage)}
                      alt="Event Preview"
                      className="event-image-preview"
                      width="100"
                    />
                    <br />
                    ✅ {eventData.eventImageName}
                    </span>
                    
                    
                  </div>
                )}
              </div>

              <div className="event-form-group">
                <label htmlFor="eventBanner">Event Banner (Optional)</label>
                <input
                  type="file"
                  id="eventBanner"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "eventBanner")}
                />
                <small>Upload a banner image for your event (max 5MB)</small>
                {eventData.eventBannerName && (
                  <div className="event-file-preview">
                    <span><img
                      src={URL.createObjectURL(eventData.eventImage)}
                      alt="Event Preview"
                      className="event-image-preview"
                      width="100"
                    />
                    <br />
                    ✅ {eventData.eventImageName}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className={`event-submit-button ${
                !isFormValid() || isLoading ? "disabled" : ""
              }`}
            >
              {isLoading
                ? "⏳ Creating Event..."
                : !authenticated
                ? "🔗 Connect Wallet to Create Event"
                : !isConnectedToCampNetwork
                ? "🌐 Connect to Camp Network to Create Event"
                : "🚀 Create Event & Register as IP"}
            </button>

            {status && (
              <div
                className={`event-status ${
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
        )}
      </div>
    </>
  );
};

export default EventCreatorForm;
