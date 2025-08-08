// SPDX-License-Identifier: MIT
// File: @openzeppelin/contracts/utils/Context.sol


// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// File: @openzeppelin/contracts/access/Ownable.sol


// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;


/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File: @openzeppelin/contracts/security/ReentrancyGuard.sol


// OpenZeppelin Contracts (last updated v4.9.0) (security/ReentrancyGuard.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be _NOT_ENTERED
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == _ENTERED;
    }
}

// File: contracts/Camp.sol


pragma solidity ^0.8.20;



contract IPRegistry is Ownable, ReentrancyGuard {
    constructor() Ownable(msg.sender) {}

    struct IPItem {
        string ipfsHash;
        string title;
        string description;
        string licenseType;
        address owner;
        string fileHash;
        string filename;
        string category;
        uint256 timestamp;
    }

    struct Event {
        string ipfsHash;
        string title;
        string description;
        string location;
        uint256 eventDate;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 soldTickets;
        address organizer;
        string category;
        uint256 timestamp;
        bool isActive;
    }

    struct Ticket {
        uint256 eventId;
        address owner;
        uint256 ticketId;
        uint256 purchaseTime;
        bool isValid;
    }

    mapping(uint256 => IPItem) private entries;
    uint256 public entryCount;

    IPItem[] private registeredItems; // Array to store all registered IPs

    mapping(uint256 => Event) private events;
    uint256 public eventCount;

    Event[] private registeredEvents;

    mapping(uint256 => Ticket) private tickets;
    mapping(address => uint256[]) private userTickets;
    mapping(uint256 => uint256[]) private eventTickets;
    uint256 public ticketCount;

    // Events
    event IPRegistered(address indexed owner, uint256 indexed id, string ipfsHash, string title, string description, uint256 timestamp);
    event EventCreated(address indexed organizer, uint256 indexed eventId, string title, uint256 ticketPrice, uint256 maxTickets, uint256 timestamp);
    event TicketPurchased(address indexed buyer, uint256 indexed eventId, uint256 indexed ticketId, uint256 price, uint256 timestamp);
    event EventDeactivated(uint256 indexed eventId);
    event EventUpdated(uint256 indexed eventId);

    // IP Functions
    function registerIP(
        string memory _ipfsHash,
        string memory _title,
        string memory _description,
        string memory _licenseType,
        string memory _hash,
        string memory _category,
        string memory _filename
    ) external {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");

        IPItem memory newEntry = IPItem({
            ipfsHash: _ipfsHash,
            title: _title,
            description: _description,
            licenseType: _licenseType,
            owner: msg.sender,
            fileHash: _hash,
            category: _category,
            timestamp: block.timestamp,
            filename: _filename
        });
        entries[entryCount] = newEntry;
        registeredItems.push(newEntry);

        emit IPRegistered(msg.sender, entryCount, _ipfsHash, _title, _description, block.timestamp);
        entryCount++;
    }

    function getIP(uint256 _id) external view returns (IPItem memory) {
        require(_id < registeredItems.length, "IP item does not exist");
        return registeredItems[_id];
    }

    function getIPCount() external view returns (uint256) {
        return registeredItems.length;
    }

    /**
     * @notice Get all registered IP entries
     * @return An array of all registered IP items
     */
    function getAllItems() public view returns (IPItem[] memory) {
        return registeredItems;
    }

    // Event Functions
    function createEvent(
        string memory _ipfsHash,
        string memory _title,
        string memory _description,
        string memory _location,
        uint256 _eventDate,
        uint256 _ticketPrice,
        uint256 _maxTickets,
        string memory _category
    ) external {
        require(_eventDate > block.timestamp, "Date must be in future");
        require(_maxTickets > 0, "Max tickets > 0");
        require(bytes(_title).length > 0, "Title required");

        Event memory newEvent = Event({
            ipfsHash: _ipfsHash,
            title: _title,
            description: _description,
            location: _location,
            eventDate: _eventDate,
            ticketPrice: _ticketPrice,
            maxTickets: _maxTickets,
            soldTickets: 0,
            organizer: msg.sender,
            category: _category,
            timestamp: block.timestamp,
            isActive: true
        });

        events[eventCount] = newEvent;
        registeredEvents.push(newEvent);

        emit EventCreated(msg.sender, eventCount, _title, _ticketPrice, _maxTickets, block.timestamp);
        eventCount++;
    }

    function getEvent(uint256 _eventId) external view returns (Event memory) {
        require(_eventId < eventCount, "Event does not exist");
        return events[_eventId];
    }

    function getEventCount() external view returns (uint256) {
        return eventCount;
    }

    function getActiveEvents() external view returns (Event[] memory) {
        uint256 count;
        for (uint256 i = 0; i < eventCount; i++) {
            if (events[i].isActive && events[i].eventDate > block.timestamp) {
                count++;
            }
        }

        Event[] memory active = new Event[](count);
        uint256 idx;

        for (uint256 i = 0; i < eventCount; i++) {
            if (events[i].isActive && events[i].eventDate > block.timestamp) {
                active[idx++] = events[i];
            }
        }

        return active;
    }

    function deactivateEvent(uint256 _eventId) external onlyOwner {
        require(_eventId < eventCount, "Invalid event ID");
        require(events[_eventId].organizer == msg.sender, "Only organizer");
        require(events[_eventId].isActive, "Already inactive");

        events[_eventId].isActive = false;
        emit EventDeactivated(_eventId);
    }

    function updateEventDetails(
        uint256 _eventId,
        string memory _description,
        string memory _location
    ) external {
        require(_eventId < eventCount, "Event does not exist");
        require(events[_eventId].organizer == msg.sender, "Only organizer");
        require(events[_eventId].isActive, "Event not active");

        events[_eventId].description = _description;
        events[_eventId].location = _location;

        emit EventUpdated(_eventId);
    }

    // Ticketing Functions
    function purchaseTicket(uint256 _eventId) external payable nonReentrant {
        require(_eventId < eventCount, "Event not found");

        Event storage eventData = events[_eventId];
        require(eventData.isActive, "Event inactive");
        require(eventData.eventDate > block.timestamp, "Event passed");
        require(eventData.soldTickets < eventData.maxTickets, "Sold out");
        require(msg.value == eventData.ticketPrice, "Incorrect payment");
        require(msg.sender != eventData.organizer, "Organizer cannot buy");

        tickets[ticketCount] = Ticket({
            eventId: _eventId,
            owner: msg.sender,
            ticketId: ticketCount,
            purchaseTime: block.timestamp,
            isValid: true
        });

        userTickets[msg.sender].push(ticketCount);
        eventTickets[_eventId].push(ticketCount);

        eventData.soldTickets++;
        ticketCount++;

        (bool sent, ) = payable(eventData.organizer).call{value: msg.value}("");
        require(sent, "Payment transfer failed");
        
        emit TicketPurchased(msg.sender, _eventId, ticketCount - 1, msg.value, block.timestamp);
    }

    function getTicket(uint256 _ticketId) external view returns (Ticket memory) {
        require(_ticketId < ticketCount, "Invalid ticket ID");
        return tickets[_ticketId];
    }

    function getUserTickets(address _user) external view returns (uint256[] memory) {
        return userTickets[_user];
    }

    function getEventTickets(uint256 _eventId) external view returns (uint256[] memory) {
        require(_eventId < eventCount, "Invalid event ID");
        return eventTickets[_eventId];
    }

    function getUserTicketCount(address _user) external view returns (uint256) {
        return userTickets[_user].length;
    }

    function hasTicketForEvent(address _user, uint256 _eventId) external view returns (bool) {
        uint256[] memory owned = userTickets[_user];
        for (uint256 i = 0; i < owned.length; i++) {
            Ticket memory t = tickets[owned[i]];
            if (t.eventId == _eventId && t.isValid) {
                return true;
            }
        }
        return false;
    }
}
