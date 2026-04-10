// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WorkChainEscrow is ReentrancyGuard, Pausable, Ownable {

    // ─── Enums ───────────────────────────────────────────────
    enum ContractStatus { Proposed, Active, Completed, Disputed, Resolved, Cancelled, Expired }
    enum PaymentType { OneTime, Milestone, Recurring }
    enum ContractType { Direct, Open }

    // ─── Structs ─────────────────────────────────────────────
    struct Milestone {
        string description;
        uint256 amount;
        uint256 deadline;
        bool released;
        bool disputed;
    }

    struct Application {
        address freelancer;
        string coverNote;
        uint256 proposedRate;
        uint256 appliedAt;
        bool selected;
    }

    struct WorkContract {
        address client;
        address freelancer;
        string title;
        string description;
        string deliverables;
        string category;
        PaymentType paymentType;
        ContractType contractType;
        ContractStatus status;
        uint256 totalAmount;
        uint256 createdAt;
        uint256 deadline;
        bool clientSigned;
        bool freelancerSigned;
        uint256 recurringAmount;
        uint256 recurringInterval;
        uint256 lastPaymentAt;
        uint256 recurringCount;
        uint256 recurringPaid;
        uint256 extensionRequestedBy;
        uint256 proposedDeadline;
    }

    // ─── State ────────────────────────────────────────────────
    IERC20 public immutable USDC;
    uint256 public contractCount;
    string public constant BUILDER_CODE = "bc_v1ampve4";

    // Security: oracle address for dispute resolution
    address public oracle;

    // Security: maximum amount per contract (10,000 USDC during beta)
    uint256 public maxContractAmount = 10_000 * 1e6;

    mapping(uint256 => WorkContract) public contracts;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(uint256 => Application[]) public applications;

    // ─── Events ───────────────────────────────────────────────
    event ContractProposed(uint256 indexed contractId, address indexed client, string title, uint8 contractType);
    event ApplicationSubmitted(uint256 indexed contractId, address indexed freelancer);
    event FreelancerSelected(uint256 indexed contractId, address indexed freelancer);
    event ContractActivated(uint256 indexed contractId);
    event MilestoneReleased(uint256 indexed contractId, uint256 milestoneIndex, uint256 amount);
    event RecurringPaymentReleased(uint256 indexed contractId, uint256 amount, uint256 periodNumber);
    event ExtensionRequested(uint256 indexed contractId, address requester, uint256 proposedDeadline);
    event ExtensionApproved(uint256 indexed contractId, uint256 newDeadline);
    event ContractDisputed(uint256 indexed contractId);
    event ContractResolved(uint256 indexed contractId, address winner, uint256 amount);
    event ContractCancelled(uint256 indexed contractId);
    event ContractExpired(uint256 indexed contractId);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event MaxAmountUpdated(uint256 oldMax, uint256 newMax);

    // ─── Constructor ──────────────────────────────────────────
    constructor(address _usdc, address _oracle) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        oracle = _oracle;
    }

    // ─── Modifiers ────────────────────────────────────────────
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can resolve disputes");
        _;
    }

    // ─── Admin functions ──────────────────────────────────────
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle address");
        emit OracleUpdated(oracle, _newOracle);
        oracle = _newOracle;
    }

    function setMaxContractAmount(uint256 _newMax) external onlyOwner {
        require(_newMax > 0, "Max must be > 0");
        emit MaxAmountUpdated(maxContractAmount, _newMax);
        maxContractAmount = _newMax;
    }

    // ─── 1. Post an open job ──────────────────────────────────
    function postOpenJob(
        string calldata _title,
        string calldata _description,
        string calldata _deliverables,
        string calldata _category,
        PaymentType _paymentType,
        uint256 _totalAmount,
        uint256 _deadline,
        uint256 _recurringAmount,
        uint256 _recurringInterval,
        uint256 _recurringCount
    ) external whenNotPaused returns (uint256) {
        require(_totalAmount > 0, "Amount must be > 0");
        require(_totalAmount <= maxContractAmount, "Exceeds maximum contract amount");
        require(_deadline > block.timestamp, "Deadline must be in future");

        uint256 contractId = ++contractCount;
        WorkContract storage c = contracts[contractId];
        c.client = msg.sender;
        c.freelancer = address(0);
        c.title = _title;
        c.description = _description;
        c.deliverables = _deliverables;
        c.category = _category;
        c.paymentType = _paymentType;
        c.contractType = ContractType.Open;
        c.status = ContractStatus.Proposed;
        c.totalAmount = _totalAmount;
        c.createdAt = block.timestamp;
        c.deadline = _deadline;
        c.clientSigned = true;

        if (_paymentType == PaymentType.Recurring) {
            require(_recurringAmount > 0, "Recurring amount required");
            require(_recurringInterval > 0, "Recurring interval required");
            require(_recurringCount > 0, "Recurring count required");
            c.recurringAmount = _recurringAmount;
            c.recurringInterval = _recurringInterval;
            c.recurringCount = _recurringCount;
        }

        emit ContractProposed(contractId, msg.sender, _title, uint8(ContractType.Open));
        return contractId;
    }

    // ─── 2. Propose a direct contract ────────────────────────
    function proposeDirectContract(
        address _freelancer,
        string calldata _title,
        string calldata _description,
        string calldata _deliverables,
        string calldata _category,
        PaymentType _paymentType,
        uint256 _totalAmount,
        uint256 _deadline,
        uint256 _recurringAmount,
        uint256 _recurringInterval,
        uint256 _recurringCount
    ) external whenNotPaused returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer");
        require(_freelancer != msg.sender, "Cannot hire yourself");
        require(_totalAmount > 0, "Amount must be > 0");
        require(_totalAmount <= maxContractAmount, "Exceeds maximum contract amount");
        require(_deadline > block.timestamp, "Deadline must be in future");

        uint256 contractId = ++contractCount;
        WorkContract storage c = contracts[contractId];
        c.client = msg.sender;
        c.freelancer = _freelancer;
        c.title = _title;
        c.description = _description;
        c.deliverables = _deliverables;
        c.category = _category;
        c.paymentType = _paymentType;
        c.contractType = ContractType.Direct;
        c.status = ContractStatus.Proposed;
        c.totalAmount = _totalAmount;
        c.createdAt = block.timestamp;
        c.deadline = _deadline;
        c.clientSigned = true;

        if (_paymentType == PaymentType.Recurring) {
            c.recurringAmount = _recurringAmount;
            c.recurringInterval = _recurringInterval;
            c.recurringCount = _recurringCount;
        }

        emit ContractProposed(contractId, msg.sender, _title, uint8(ContractType.Direct));
        return contractId;
    }

    // ─── 3. Apply for an open job ─────────────────────────────
    function applyForJob(
        uint256 _contractId,
        string calldata _coverNote,
        uint256 _proposedRate
    ) external whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(c.contractType == ContractType.Open, "Not an open job");
        require(c.status == ContractStatus.Proposed, "Job not open");
        require(c.client != msg.sender, "Client cannot apply");

        Application[] storage apps = applications[_contractId];
        for (uint256 i = 0; i < apps.length; i++) {
            require(apps[i].freelancer != msg.sender, "Already applied");
        }

        applications[_contractId].push(Application({
            freelancer: msg.sender,
            coverNote: _coverNote,
            proposedRate: _proposedRate,
            appliedAt: block.timestamp,
            selected: false
        }));

        emit ApplicationSubmitted(_contractId, msg.sender);
    }

    // ─── 4. Client selects a freelancer ──────────────────────
    function selectFreelancer(uint256 _contractId, address _freelancer) external whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.client, "Only client");
        require(c.contractType == ContractType.Open, "Not an open job");
        require(c.status == ContractStatus.Proposed, "Job not open");

        Application[] storage apps = applications[_contractId];
        bool found = false;
        for (uint256 i = 0; i < apps.length; i++) {
            if (apps[i].freelancer == _freelancer) {
                apps[i].selected = true;
                found = true;
                break;
            }
        }
        require(found, "Freelancer did not apply");

        c.freelancer = _freelancer;
        emit FreelancerSelected(_contractId, _freelancer);
    }

    // ─── 5. Freelancer signs and activates ───────────────────
    function signAndActivate(uint256 _contractId) external nonReentrant whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.freelancer, "Only assigned freelancer");
        require(c.status == ContractStatus.Proposed, "Not proposed");
        require(c.clientSigned, "Client not signed");
        require(c.freelancer != address(0), "No freelancer assigned");

        c.freelancerSigned = true;
        c.status = ContractStatus.Active;
        c.lastPaymentAt = block.timestamp;

        require(USDC.transferFrom(c.client, address(this), c.totalAmount), "USDC lock failed");

        emit ContractActivated(_contractId);
    }

    // ─── 6. Add milestones ────────────────────────────────────
    function addMilestones(
        uint256 _contractId,
        string[] calldata _descriptions,
        uint256[] calldata _amounts,
        uint256[] calldata _deadlines
    ) external whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.client, "Only client");
        require(c.status == ContractStatus.Proposed, "Not proposed");
        require(_descriptions.length == _amounts.length && _amounts.length == _deadlines.length, "Array mismatch");

        uint256 total = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            total += _amounts[i];
            milestones[_contractId].push(Milestone({
                description: _descriptions[i],
                amount: _amounts[i],
                deadline: _deadlines[i],
                released: false,
                disputed: false
            }));
        }
        require(total == c.totalAmount, "Milestone amounts must equal total");
    }

    // ─── 7. Release milestone ─────────────────────────────────
    function releaseMilestone(uint256 _contractId, uint256 _milestoneIndex) external nonReentrant whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.client, "Only client");
        require(c.status == ContractStatus.Active, "Not active");

        Milestone storage m = milestones[_contractId][_milestoneIndex];
        require(!m.released, "Already released");
        require(!m.disputed, "Milestone disputed");

        m.released = true;
        require(USDC.transfer(c.freelancer, m.amount), "Transfer failed");

        emit MilestoneReleased(_contractId, _milestoneIndex, m.amount);
        _checkAllMilestonesReleased(_contractId);
    }

    // ─── 8. Release recurring payment ─────────────────────────
    function releaseRecurringPayment(uint256 _contractId) external nonReentrant whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Not active");
        require(c.paymentType == PaymentType.Recurring, "Not recurring");
        require(block.timestamp >= c.lastPaymentAt + c.recurringInterval, "Too early");
        require(c.recurringPaid < c.recurringCount, "All paid");

        c.lastPaymentAt = block.timestamp;
        c.recurringPaid++;

        require(USDC.transfer(c.freelancer, c.recurringAmount), "Transfer failed");
        emit RecurringPaymentReleased(_contractId, c.recurringAmount, c.recurringPaid);

        if (c.recurringPaid == c.recurringCount) {
            c.status = ContractStatus.Completed;
        }
    }

    // ─── 9. Request extension ─────────────────────────────────
    function requestExtension(uint256 _contractId, uint256 _newDeadline) external whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Not active");
        require(msg.sender == c.client || msg.sender == c.freelancer, "Not a party");
        require(_newDeadline > c.deadline, "Must be later");
        require(c.extensionRequestedBy == 0, "Extension pending");

        c.extensionRequestedBy = uint256(uint160(msg.sender));
        c.proposedDeadline = _newDeadline;

        emit ExtensionRequested(_contractId, msg.sender, _newDeadline);
    }

    // ─── 10. Approve extension ────────────────────────────────
    function approveExtension(uint256 _contractId) external whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Not active");
        require(c.extensionRequestedBy != 0, "No extension pending");
        require(msg.sender == c.client || msg.sender == c.freelancer, "Not a party");
        require(uint256(uint160(msg.sender)) != c.extensionRequestedBy, "Cannot approve own request");

        c.deadline = c.proposedDeadline;
        c.extensionRequestedBy = 0;
        c.proposedDeadline = 0;

        emit ExtensionApproved(_contractId, c.deadline);
    }

    // ─── 11. Mark expired ─────────────────────────────────────
    function markExpired(uint256 _contractId) external nonReentrant whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Not active");
        require(block.timestamp > c.deadline, "Not expired");
        require(msg.sender == c.client || msg.sender == c.freelancer, "Not a party");

        c.status = ContractStatus.Expired;
        uint256 remaining = _getRemainingBalance(_contractId);
        if (remaining > 0) {
            require(USDC.transfer(c.client, remaining), "Refund failed");
        }

        emit ContractExpired(_contractId);
    }

    // ─── 12. Raise dispute ────────────────────────────────────
    function raiseDispute(uint256 _contractId) external whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Not active");
        require(msg.sender == c.client || msg.sender == c.freelancer, "Not a party");

        c.status = ContractStatus.Disputed;
        emit ContractDisputed(_contractId);
    }

    // ─── 13. Resolve dispute (oracle only) ────────────────────
    function resolveDispute(uint256 _contractId, address _winner, uint256 _amount) external nonReentrant onlyOracle {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Disputed, "Not disputed");
        require(_winner == c.client || _winner == c.freelancer, "Invalid winner");
        require(_amount <= c.totalAmount, "Amount exceeds contract total");

        c.status = ContractStatus.Resolved;
        require(USDC.transfer(_winner, _amount), "Transfer failed");

        // Refund remainder to client if partial
        uint256 remainder = c.totalAmount - _amount;
        if (remainder > 0) {
            require(USDC.transfer(c.client, remainder), "Remainder refund failed");
        }

        emit ContractResolved(_contractId, _winner, _amount);
    }

    // ─── 14. Cancel contract ──────────────────────────────────
    function cancelContract(uint256 _contractId) external nonReentrant whenNotPaused {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.client || msg.sender == c.freelancer, "Not a party");
        require(c.status == ContractStatus.Proposed || c.status == ContractStatus.Active, "Cannot cancel");

        ContractStatus prevStatus = c.status;
        c.status = ContractStatus.Cancelled;

        if (prevStatus == ContractStatus.Active) {
            uint256 remaining = _getRemainingBalance(_contractId);
            if (remaining > 0) {
                require(USDC.transfer(c.client, remaining), "Refund failed");
            }
        }

        emit ContractCancelled(_contractId);
    }

    // ─── Read functions ───────────────────────────────────────
    function getContract(uint256 _contractId) external view returns (WorkContract memory) {
        return contracts[_contractId];
    }

    function getMilestones(uint256 _contractId) external view returns (Milestone[] memory) {
        return milestones[_contractId];
    }

    function getApplications(uint256 _contractId) external view returns (Application[] memory) {
        return applications[_contractId];
    }

    function getApplicationCount(uint256 _contractId) external view returns (uint256) {
        return applications[_contractId].length;
    }

    // ─── Internal helpers ─────────────────────────────────────
    function _checkAllMilestonesReleased(uint256 _contractId) internal {
        Milestone[] storage ms = milestones[_contractId];
        for (uint256 i = 0; i < ms.length; i++) {
            if (!ms[i].released) return;
        }
        contracts[_contractId].status = ContractStatus.Completed;
    }

    function _getRemainingBalance(uint256 _contractId) internal view returns (uint256) {
        WorkContract storage c = contracts[_contractId];
        if (c.paymentType == PaymentType.Milestone) {
            Milestone[] storage ms = milestones[_contractId];
            uint256 released = 0;
            for (uint256 i = 0; i < ms.length; i++) {
                if (ms[i].released) released += ms[i].amount;
            }
            return c.totalAmount - released;
        } else if (c.paymentType == PaymentType.Recurring) {
            return c.totalAmount - (c.recurringPaid * c.recurringAmount);
        }
        return c.totalAmount;
    }
}