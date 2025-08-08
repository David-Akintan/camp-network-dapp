import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../../Constants/constant";
import {
  useAuthState,
  useProvider,
  useConnect,
} from "@campnetwork/origin/react";
import "./TicketClaimer.css";

const TicketClaimer = () => {
  const [status, setStatus] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectedToCampNetwork, setIsConnectedToCampNetwork] =
    useState(false);
  const [toasts, setToasts] = useState([]);

  // Event and ticket states
  const [availableEvents, setAvailableEvents] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [purchasingMap, setPurchasingMap] = useState({});
  const [eventImageUrl, setEventImageUrl] = useState(null);
  const [eventImageUrls, setEventImageUrls] = useState({});
  
  // New state for event filtering
  const [eventFilter, setEventFilter] = useState('all'); // 'all' or 'my-events'
  const [filteredEvents, setFilteredEvents] = useState([]);

  // Contract and connection states
  const { authenticated, account } = useAuthState();
  const { provider } = useConnect();
  const [contract, setContract] = useState(null);
  const [userAccount, setUserAccount] = useState(null);

  const CAMP_NETWORK_CHAIN_ID = 123420001114;

  // Initialize contract
  useEffect(() => {
    const initializeContractAndAccount = async () => {
      if (authenticated) {
        try {
          console.log("Initializing contract and getting account...");

          // Try to get account from window.ethereum first
          let currentAccount = null;
          let contractInstance = null;

          if (window.ethereum) {
            try {
              // Request accounts
              const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
              });
              currentAccount = accounts[0];
              setUserAccount(currentAccount);
              console.log("Account from window.ethereum:", currentAccount);

              // Create provider and contract
              const web3Provider = new ethers.providers.Web3Provider(
                window.ethereum
              );
              const signer = web3Provider.getSigner();
              contractInstance = new ethers.Contract(
                contractAddress,
                contractABI,
                signer
              );

              console.log("Contract initialized with window.ethereum");
            } catch (error) {
              console.error("Error with window.ethereum:", error);
            }
          }

          // Set the contract and account
          if (contractInstance) {
            setContract(contractInstance);
            setUserAccount(currentAccount);
            console.log("Final contract and account set:", {
              contract: !!contractInstance,
              account: currentAccount,
            });
          } else {
            console.error("Failed to initialize contract");
          }
        } catch (error) {
          console.error("Error in contract initialization:", error);
        }
      }
    };

    initializeContractAndAccount();
  }, [provider, authenticated]);

  // Check network connection
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
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
      }
    };

    if (authenticated) {
      checkNetwork();
    }
  }, [authenticated]);

  useEffect(() => {
    if (contract && account) {
      contract.getUserTickets(account).then((ids) => {
        console.log(
          "Raw ticket IDs:",
          ids.map((i) => i.toString())
        );
      });
    }
  }, [contract, account]);

  useEffect(() => {
    const fetchAllEventMetadata = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(
          contractAddress,
          contractABI,
          provider
        );

        const totalEvents = await contract.getEventCount(); // Assuming this exists

        const imageUrls = {};

        for (let i = 0; i < totalEvents; i++) {
          try {
            const event = await contract.getEvent(i);
            const ipfsHash = event.ipfsHash;
            const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}/metadata.json`;

            const response = await fetch(metadataUrl);
            if (!response.ok) {
              console.warn(
                `Failed to fetch metadata for event ${i}:`,
                response.status
              );
              continue;
            }

            const metadata = await response.json();
            if (metadata?.eventImageHash && metadata?.eventImageName) {
              const imageUrl = `https://gateway.pinata.cloud/ipfs/${metadata.eventImageHash}/${metadata.eventImageName}`;
              imageUrls[i] = imageUrl;
            } else {
              console.warn(`Metadata missing image for event ${i}`);
            }
          } catch (err) {
            console.error(`Error processing event ${i}:`, err);
          }
        }

        setEventImageUrls(imageUrls); // You need to define this as a state
      } catch (err) {
        console.error("Failed to fetch all event metadata:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllEventMetadata();
  }, []);


  // Filter events based on selected filter
  useEffect(() => {
    if (eventFilter === 'all') {
      setFilteredEvents(availableEvents);
    } else if (eventFilter === 'my-events' && userAccount) {
      const myEvents = availableEvents.filter(event => 
        event.organizer.toLowerCase() === userAccount.toLowerCase()
      );
      setFilteredEvents(myEvents);
    }
  }, [eventFilter, availableEvents, userAccount]);

  // Load data when contract is ready
  useEffect(() => {
    if (contract && authenticated && isConnectedToCampNetwork) {
      fetchAvailableEvents();
      fetchUserTickets();
    }
  }, [contract, authenticated, isConnectedToCampNetwork, account]);

  // Fetch available events from blockchain
  const fetchAvailableEvents = async () => {
    if (!contract) {
      console.log("No contract available for fetching events");
      return;
    }

    try {
      setLoadingEvents(true);
      console.log("Fetching active events...");

      // First, get the total event count
      const eventCount = await contract.getEventCount();
      console.log("Total events:", eventCount.toString());

      if (eventCount.toString() === "0") {
        console.log("No events found");
        setAvailableEvents([]);
        setLoadingEvents(false);
        return;
      }

      // Get current timestamp
      const currentBlock = await contract.provider.getBlock("latest");
      const now = currentBlock.timestamp;
      console.log("Current timestamp:", now);

      // Get all events and filter active ones
      const activeEvents = [];
      for (let i = 0; i < eventCount; i++) {
        try {
          const event = await contract.getEvent(i);
          const ipfsHash = event.ipfsHash;

          const metadataResponse = await fetch(
            `https://gateway.pinata.cloud/ipfs/${ipfsHash}/metadata.json`
          );
          console.log(`Fetching metadata for event ${i} from IPFS:`, ipfsHash);
          const metadata = await metadataResponse.json();
          console.log(`Fetched metadata for event ${i}:`, metadata);
          const eventImageHash = metadata.eventImageHash;
          const eventImageName = metadata.eventImageName;
          const eventImageUrl = `https://gateway.pinata.cloud/ipfs/${eventImageHash}/${eventImageName}`;

          console.log(`Event ${i}:`, {
            title: event.title,
            isActive: event.isActive,
            eventDate: event.eventDate.toString(),
            currentTime: now,
            isFuture: event.eventDate.gt(now),
            ipfsHash: event.ipfsHash,
          });

          // Check if event is active and in the future
          if (event.isActive && event.eventDate.gt(now)) {
            activeEvents.push({
              id: i,
              ...event,
              eventImageUrl: eventImageUrl,
            });
          }
        } catch (error) {
          console.error(`Error fetching event ${i}:`, error);
        }
      }

      console.log("Active events found:", activeEvents.length);

      const eventsWithDetails = await Promise.all(
        activeEvents.map(async (event) => {
          // Check if current user has ticket for this event
          let hasTicket = false;
          if (userAccount) {
            try {
              console.log(
                "Checking ticket for:",
                userAccount,
                "Event ID:",
                event.id
              );
              hasTicket = await contract.hasTicketForEvent(
                userAccount,
                event.id
              );
              console.log("hasTicket result:", hasTicket);
            } catch (error) {
              console.error("Error checking ticket ownership:", error);
            }
          }

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location,
            eventDate: new Date(event.eventDate * 1000),
            ticketPrice: ethers.utils.formatEther(event.ticketPrice),
            ticketPriceWei: event.ticketPrice,
            maxTickets: event.maxTickets.toString(),
            soldTickets: event.soldTickets.toString(),
            organizer: event.organizer,
            category: event.category,
            isActive: event.isActive,
            ipfsHash: event.ipfsHash,
            hasTicket: hasTicket,
            remainingTickets: event.maxTickets
              .sub(event.soldTickets)
              .toString(),
          };
        })
      );

      console.log("Processed events:", eventsWithDetails);
      setAvailableEvents(eventsWithDetails);
    } catch (error) {
      console.error("Error fetching events:", error);
      setStatus("Error fetching events: " + error.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch user's tickets
  const fetchUserTickets = async () => {
    if (!contract || !userAccount) return;

    try {
      setLoadingTickets(true);
      console.log("Fetching tickets for account:", userAccount);

      const ticketIds = await contract.getUserTickets(userAccount);
      console.log("Ticket IDs:", ticketIds);

      if (!ticketIds || ticketIds.length === 0) {
        console.log("No tickets found for user");
        setUserTickets([]); // Ensure we clear old state
        return;
      }

      const ticketsWithDetails = await Promise.all(
        ticketIds.map(async (ticketIdBN) => {
          try {
            const ticketId = ticketIdBN.toNumber(); // Ensure correct format

            const ticket = await contract.getTicket(ticketId);

            // Check if ticket is valid and belongs to an event
            if (!ticket || ticket.eventId === undefined) {
              console.warn("Skipping invalid ticket:", ticketId);
              return null;
            }
            const event = await contract.getEvent(ticket.eventId);

            return {
              ticketId: ticket.ticketId.toString(),
              eventId: ticket.eventId.toString(),
              purchaseTime: new Date(ticket.purchaseTime.toNumber() * 1000),
              isValid: ticket.isValid,
              eventTitle: event.title,
              eventDate: new Date(event.eventDate.toNumber() * 1000),
              eventLocation: event.location,
              eventDescription: event.description,
              ticketPrice: ethers.utils.formatEther(event.ticketPrice),
            };
          } catch (err) {
            console.error(
              "Error fetching ticket or event data for ticket ID:",
              ticketIdBN.toString(),
              err
            );
            return null;
          }
        })
      );

      const filteredTickets = ticketsWithDetails.filter((t) => t !== null);
      console.log("Fetched tickets:", filteredTickets.length);
      setUserTickets(filteredTickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Purchase ticket function
  const handlePurchaseTicket = async (eventId, ticketPriceWei) => {
    if (!contract || !authenticated) {
      addToast({
        type: "error",
        message: "Please connect your wallet first",
      });
      return;
    }

    if (!isConnectedToCampNetwork) {
      addToast({
        type: "error",
        message: "Please connect to Camp Network testnet",
      });
      return;
    }

    try {
      setIsLoading(true);
      setPurchasingMap((prev) => ({ ...prev, [eventId]: true }));

      console.log("Purchasing ticket for event:", eventId);
      console.log("Ticket price (wei):", ticketPriceWei.toString());
      console.log(
        "Ticket price (ETH):",
        ethers.utils.formatEther(ticketPriceWei)
      );

      const tx = await contract.purchaseTicket(eventId, {
        value: ticketPriceWei,
      });

      const receipt = await tx.wait();

      // Show success notification
      addToast({
        type: "success",
        message: `Ticket purchased successfully! Transaction: ${receipt.transactionHash}`,
        hash: receipt.transactionHash,
      });

      // Refresh data
      setTimeout(() => {
        fetchAvailableEvents();
        fetchUserTickets();
      }, 2000);
    } catch (error) {
      console.error("Purchase error:", error);

      let errorMessage = "Failed to purchase ticket";
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      }

      addToast({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setPurchasingMap((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  // Toast notification functions
  const addToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Format date helper
  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const canvasRef = useRef(null);

  // Generate QR Code for ticket
  const generateQRCode = async (ticketData) => {
    try {
      // Create QR code data with event information
      const qrData = {
        ticketId: ticketData.ticketId,
        eventTitle: ticketData.eventTitle,
        eventDate: ticketData.eventDate,
        eventLocation: ticketData.eventLocation,
        ticketPrice: ticketData.ticketPrice,
        purchaseTime: ticketData.purchaseTime,
        isValid: ticketData.isValid
      };
      
      // Convert to JSON string and encode for QR code
      const qrString = JSON.stringify(qrData);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrString)}`;
      
      return qrCodeUrl;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  };

  // Download ticket as image
  const downloadTicketAsImage = async (ticket) => {
    try {
      // Create canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = 800;
      canvas.height = 600;
      
      // Set background
      ctx.fillStyle = '#F9F6F2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#FF6D01');
      gradient.addColorStop(1, '#FF9160');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, 100);
      
      // Add title
      ctx.fillStyle = '#2B2B2B';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Camp Network Event Ticket', canvas.width / 2, 60);
      
      // Add event title
      ctx.fillStyle = '#2D5A66';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Event Title: ${ticket.eventTitle}`, canvas.width / 2, 120);
      
      // Add ticket details
      ctx.fillStyle = '#2B2B2B';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      
      const details = [
        `Ticket ID: #${ticket.ticketId}`,
        `Event Date: ${formatDate(ticket.eventDate)}`,
        `Location: ${ticket.eventLocation}`,
        `Price: ${ticket.ticketPrice} ETH`,
        `Purchase Date: ${formatDate(ticket.purchaseTime)}`,
        `Status: ${ticket.isValid ? 'Valid' : 'Invalid'}`,
        
      ];
      
      let yPosition = 180;
      details.forEach(detail => {
        ctx.fillText(detail, 50, yPosition);
        yPosition += 30;
      });
      
      // Generate and add QR code
      const qrCodeUrl = await generateQRCode(ticket);
      if (qrCodeUrl) {
        const qrImage = new Image();
        qrImage.crossOrigin = 'anonymous';
        qrImage.onload = () => {
          ctx.drawImage(qrImage, canvas.width - 250, canvas.height - 250, 200, 200);
          
          // Add QR code label
          ctx.fillStyle = '#2D5A66';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Scan for event details', canvas.width - 150, canvas.height - 30);
          
          // Download the image
          const link = document.createElement('a');
          link.download = `ticket-${ticket.ticketId}.png`;
          link.href = canvas.toDataURL();
          link.click();
        };
        qrImage.src = qrCodeUrl;
      } else {
        // Download without QR code if generation fails
        const link = document.createElement('a');
        link.download = `ticket-${ticket.ticketId}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
      
    } catch (error) {
      console.error("Error downloading ticket:", error);
      addToast({
        id: Date.now(),
        type: 'error',
        message: 'Failed to download ticket'
      });
    }
  };

  return (
    <div className="ticket-claimer-container">
      <div className="ticket-claimer-header">
        <h1>🎟️ Ticket Marketplace</h1>
        <p>Claim tickets for upcoming events on Camp Network</p>
      </div>

      {/* Debug Information */}
      {/* <div className="debug-info">
        <p>
          <strong>Debug Info:</strong>
        </p>
        <p>Authenticated: {authenticated ? "Yes" : "No"}</p>
        <p>
          Connected to Camp Network: {isConnectedToCampNetwork ? "Yes" : "No"}
        </p>
        <p>Contract: {contract ? "Loaded" : "Not loaded"}</p>
        <p>Account: {userAccount || "Not connected"}</p>
        <p>Loading Events: {loadingEvents ? "Yes" : "No"}</p>
        <p>Available Events: {availableEvents.length}</p>
        <p>
          <strong>Owned Tickets:</strong> {userTickets.length}
        </p>
      </div> */}

      {!authenticated && (
        <div className="ticket-auth-required">
          <h2>🔐 Authentication Required</h2>
          <p>Please connect your wallet to view and purchase tickets.</p>
        </div>
      )}

      {authenticated && !isConnectedToCampNetwork && (
        <div className="status error">
          <h3>🔗 Connect to Camp Network Testnet</h3>
          <p>
            You need to be connected to the Camp Network testnet to view and
            purchase tickets.
          </p>
          <p>Please switch your network to Camp Network testnet to continue.</p>
        </div>
      )}

      {/* Available Events Section - Only show when connected to Camp Network */}
      {authenticated && isConnectedToCampNetwork && (
        <div className="events-section">
          <div className="events-header">
            <h2>🎪 Available Events</h2>
            
            {/* Event Filter Toggle */}
            <div className="event-filter-toggle">
              <button
                className={`filter-btn ${eventFilter === 'all' ? 'active' : ''}`}
                onClick={() => setEventFilter('all')}
              >
                All Events ({availableEvents.length})
              </button>
              <button
                className={`filter-btn ${eventFilter === 'my-events' ? 'active' : ''}`}
                onClick={() => setEventFilter('my-events')}
              >
                My Events ({availableEvents.filter(event => 
                  event.organizer.toLowerCase() === userAccount?.toLowerCase()
                ).length})
              </button>
            </div>
          </div>

          {loadingEvents ? (
            <div className="loading">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="no-events">
              <p>
                {eventFilter === 'all' 
                  ? 'No active events available at the moment.'
                  : 'You haven\'t created any events yet.'
                }
              </p>
              <p>Check back later for new events!</p>
            </div>
          ) : (
            <div className="events-grid">
              {filteredEvents.map((event) => (
                <div key={event.id} className="event-card">
                  <div className="event-image">
                    {eventImageUrls[event.id] ? (
                      <img
                        src={eventImageUrls[event.id]}
                        alt={event.title}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="event-image-placeholder">
                        <span>📷</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="event-content">
                    <div className="event-header">
                      <h3>{event.title}</h3>
                      <span className="event-category">{event.category}</span>
                    </div>
                    
                    <div className="event-details">
                      <p>
                        <strong>📍 Location: </strong> {event.location}
                      </p>
                      <p>
                        <strong>📅 Date:</strong> {formatDate(event.eventDate)}
                      </p>
                      <p>
                        <strong>💰 Price:</strong> {event.ticketPrice} ETH
                      </p>
                      <p>
                        <strong>🎟️ Available:</strong> {event.remainingTickets} /{" "}
                        {event.maxTickets}
                      </p>
                      {eventFilter === 'all' && (
                        <p>
                          <strong>👤 Organizer:</strong> {event.organizer.slice(0, 6)}...{event.organizer.slice(-4)}
                        </p>
                      )}
                    </div>

                    {event.hasTicket ? (
                      <div className="ticket-status owned">
                        ✅ You own a ticket for this event
                      </div>
                    ) : (
                      <button
                        className="purchase-button"
                        onClick={() =>
                          handlePurchaseTicket(event.id, event.ticketPriceWei)
                        }
                        disabled={purchasingMap[event.id]}
                      >
                        {purchasingMap[event.id]
                          ? "Processing..."
                          : `Purchase Ticket (${event.ticketPrice} ETH)`}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User's Tickets Section - Show even if not on Camp Network */}
      {authenticated && (
        <div className="my-tickets-section">
          <div className="tickets-header">
            <h2>🎫 My Tickets</h2>
            <div className="tickets-count">
              <span className="tickets-badge">{userTickets.length} Tickets</span>
            </div>
          </div>

          {loadingTickets ? (
            <div className="loading">Loading your tickets...</div>
          ) : userTickets.length === 0 ? (
            <div className="no-tickets">
              <div className="no-tickets-icon">🎫</div>
              <h3>No Tickets Yet</h3>
              <p>You don't have any tickets yet.</p>
              {!isConnectedToCampNetwork ? (
                <p>Connect to Camp Network testnet to purchase tickets!</p>
              ) : (
                <p>Purchase tickets from the available events above!</p>
              )}
            </div>
          ) : (
            <div className="tickets-grid">
              {userTickets.map((ticket) => (
                <div key={ticket.ticketId} className="ticket-card">
                  <div className="ticket-header">
                    <h3>{ticket.eventTitle}</h3>
                    <span className="ticket-id">#{ticket.ticketId}</span>
                  </div>

                  <div className="ticket-details">
                    <p>
                      <strong>📅 Event Date:</strong>{" "}
                      {formatDate(ticket.eventDate)}
                    </p>
                    <p>
                      <strong>📍 Location:</strong> {ticket.eventLocation}
                    </p>
                    <p>
                      <strong>💰 Paid:</strong> {ticket.ticketPrice} ETH
                    </p>
                    <p>
                      <strong>📝 Description:</strong> {ticket.eventDescription}
                    </p>
                    <p>
                      <strong>🕒 Purchased:</strong>{" "}
                      {formatDate(ticket.purchaseTime)}
                    </p>
                  </div>

                  <div className="ticket-actions">
                    <div className="ticket-status">
                      {ticket.isValid ? (
                        <span className="valid" style={{color: "#000000"}}>✅ Valid Ticket</span>
                      ) : (
                        <span className="invalid" style={{color: "#000000"}}>❌ Invalid Ticket</span>
                      )}
                    </div>
                    
                    <button
                      className="download-ticket-btn"
                      onClick={() => downloadTicketAsImage(ticket)}
                      title="Download ticket as image"
                    >
                      📥 Download Ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-content">
              <span className="toast-message">{toast.message}</span>
              {toast.hash && (
                <a
                  href={`https://basecamp.cloud.blockscout.com/tx/${toast.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="toast-link"
                >
                  View Transaction
                </a>
              )}
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketClaimer;
