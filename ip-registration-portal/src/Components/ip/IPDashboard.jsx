import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../../Constants/constant";
import { useAuthState } from "@campnetwork/origin/react";
import "./IPDashboard.css";

const IPDashboard = () => {
  const [registeredIPs, setRegisteredIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [ipEntries, setIpEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); 
  const [sortBy, setSortBy] = useState("newest"); 
  const { authenticated } = useAuthState();

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

  const iplist = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contractInstance = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );
      const data = await contractInstance.getAllItems();
      
      const entries = data.map((ip, index) => ({
        ipfsHash: ip[0],
        title: ip[1],
        description: ip[2],
        licenseType: ip[3],
        owner: ip[4],
        fileHash: ip[5],
        filename: ip[6],
        category: ip[7] || "Other",
        timestamp: ip[8]?.toNumber?.() || parseInt(ip[8]) || 0,
        id: index,
      }));

      setIpEntries(entries);
      setRegisteredIPs(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching IPs: ", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    iplist();
    const interval = setInterval(iplist, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let results = ipEntries.filter((entry) => {
      const matchesCategory = selectedCategory === "All" || entry.category === selectedCategory;
      const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Sort results
    results = results.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.timestamp - a.timestamp;
        case "oldest":
          return a.timestamp - b.timestamp;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return b.timestamp - a.timestamp;
      }
    });

    setFilteredEntries(results);
  }, [ipEntries, searchTerm, selectedCategory, sortBy]);

  const getShortAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getFileTypeIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'txt': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png': return '��️';
      case 'mp3':
      case 'wav': return '🎵';
      case 'mp4':
      case 'avi': return '🎬';
      default: return '📁';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Writing': return '✍️';
      case 'Design': return '🎨';
      case 'Music': return '🎵';
      case 'Video': return '🕹️';
      case 'Idea': return '💭';
      case 'Photography': return '📸';
      case 'Fashion': return '✂️'
      default: return '��';
    }
  };

  if (!authenticated) {
    return (
      <div className="dashboard-container">
        <div className="auth-required">
          <h2>🔐 Authentication Required</h2>
          <p>Please connect your wallet to view the IP Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📚 IP Registry Dashboard</h1>
          <p>Explore and manage registered intellectual property</p>
        </div>
        <div className="stats">
          <div className="stat-item">
            <span className="stat-number">{filteredEntries.length}</span>
            <span className="stat-label">Total IPs</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{ipEntries.length}</span>
            <span className="stat-label">All IPs</span>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="dashboard-controls">
        <div className="search-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search IPs by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-section">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            {categoryOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-filter"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Alphabetical</option>
          </select>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              📱 Grid
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading IP records...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No IPs Found</h3>
            <p>
              {searchTerm || selectedCategory !== "All" 
                ? "Try adjusting your search or filter criteria."
                : "No IPs have been registered yet. Be the first to register your intellectual property!"
              }
            </p>
          </div>
        ) : (
          <div className={`ip-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {filteredEntries.map((ip, index) => (
              <div key={index} className="ip-card">
                <div className="card-header">
                  <div className="file-icon">
                    {getFileTypeIcon(ip.filename)}
                  </div>
                  <div className="category-badge">
                    {getCategoryIcon(ip.category)} {ip.category}
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="ip-title">{ip.title}</h3>
                  <p className="ip-description">{ip.description}</p>
                  
                  <div className="ip-details">
                    <div className="detail-item">
                      <span className="detail-label">Owner:</span>
                      <span className="detail-value" title={ip.owner}>
                        {getShortAddress(ip.owner)}
                      </span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">License:</span>
                      <span className="detail-value">
                        {ip.licenseType ? (
                          ip.licenseType.trim().startsWith("CUSTOM:") ? (
                            <a
                              href={ip.licenseType.trim().split("CUSTOM:")[1]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="license-link"
                            >
                              Custom License
                            </a>
                          ) : (
                            ip.licenseType
                          )
                        ) : (
                          "Not provided"
                        )}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Registered:</span>
                      <span className="detail-value">
                        {new Date(ip.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${ip.ipfsHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn primary"
                  >
                    📁 View File
                  </a>
                  
                  <button
                    onClick={() => copyToClipboard(ip.fileHash)}
                    className="action-btn secondary"
                    title="Copy file hash"
                  >
                    📋 Copy Hash
                  </button>
                </div>

                {ip.filename && (
                  <div className="file-preview">
                    <img
                      src={`https://gateway.pinata.cloud/ipfs/${ip.ipfsHash}/${ip.filename}`}
                      alt={ip.title}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IPDashboard;