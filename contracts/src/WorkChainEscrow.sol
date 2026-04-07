// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract WorkChainEscrow is ReentrancyGuard {

    // ─── Enums ───────────────────────────────────────────────
    enum ContractStatus { Proposed, Active, Completed, Disputed, Resolved, Cancelled, Expired }
    enum PaymentType { OneTime, Milestone, Recurring }

    // ─── Structs ─────────────────────────────────────────────
    struct Milestone {
        string description;
        uint256 amount;
        uint256 deadline;
        bool released;
        bool disputed;
    }

    struct WorkContract {
        address client;
        address freelancer;
        string title;
        string description;
        PaymentType paymentType;
        ContractStatus status;
        uint256 totalAmount;
        uint256 createdAt;
        uint256 deadline;
        bool clientSigned;
        bool freelancerSigned;
        // Recurring fields
        uint256 recurringAmount;
        uint256 recurringInterval;
        uint256 lastPaymentAt;
        uint256 recurringCount;
        uint256 recurringPaid;
        // Extension
        uint256 extensionRequestedBy;
        uint256 proposedDeadline;
    }

    // ─── State ────────────────────────────────────────────────
    IERC20 public immutable USDC;
    uint256 public contractCount;
    string public constant BUILDER_CODE = "bc_v1ampve4";

    mapping(uint256 => WorkContract) public contracts;
    mapping(uint256 => Milestone[]) public milestones;

    // ─── Events ───────────────────────────────────────────────
    event ContractProposed(uint256 indexed contractId, address indexed client, address indexed freelancer, string title);
    event ContractSigned(uint256 indexed contractId, address signer);
    event ContractActivated(uint256 indexed contractId);
    event MilestoneReleased(uint256 indexed contractId, uint256 milestoneIndex, uint256 amount);
    event MilestoneDisputed(uint256 indexed contractId, uint256 milestoneIndex);
    event RecurringPaymentReleased(uint256 indexed contractId, uint256 amount, uint256 periodNumber);
    event ExtensionRequested(uint256 indexed contractId, address requester, uint256 proposedDeadline);
    event ExtensionApproved(uint256 indexed contractId, uint256 newDeadline);
    event ContractDisputed(uint256 indexed contractId);
    event ContractResolved(uint256 indexed contractId, address winner, uint256 amount);
    event ContractCancelled(uint256 indexed contractId);
    event ContractExpired(uint256 indexed contractId);

    constructor(address _usdc) {
        USDC = IERC20(_usdc);
    }

    // ─── 1. Propose a contract ────────────────────────────────
    function proposeContract(
        address _freelancer,
        string calldata _title,
        string calldata _description,
        PaymentType _paymentType,
        uint256 _totalAmount,
        uint256 _deadline,
        // Recurring params (0 if not recurring)
        uint256 _recurringAmount,
        uint256 _recurringInterval,
        uint256 _recurringCount
    ) external returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer");
        require(_freelancer != msg.sender, "Cannot hire yourself");
        require(_totalAmount > 0, "Amount must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in future");

        uint256 contractId = ++contractCount;
        WorkContract storage c = contracts[contractId];
        c.client = msg.sender;
        c.freelancer = _freelancer;
        c.title = _title;
        c.description = _description;
        c.paymentType = _paymentType;
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

        emit ContractProposed(contractId, msg.sender, _freelancer, _title);
        return contractId;
    }

    // ─── 2. Add milestones (client only, before activation) ──
    function addMilestones(
        uint256 _contractId,
        string[] calldata _descriptions,
        uint256[] calldata _amounts,
        uint256[] calldata _deadlines
    ) external {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.client, "Only client");
        require(c.status == ContractStatus.Proposed, "Contract already active");
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

    // ─── 3. Freelancer signs + activates contract ─────────────
    function signAndActivate(uint256 _contractId) external nonReentrant {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.freelancer, "Only freelancer can sign");
        require(c.status == ContractStatus.Proposed, "Not in proposed state");
        require(c.clientSigned, "Client has not signed");

        c.freelancerSigned = true;
        c.status = ContractStatus.Active;
        c.lastPaymentAt = block.timestamp;

        // Lock funds from client
        require(USDC.transferFrom(c.client, address(this), c.totalAmount), "USDC lock failed");

        emit ContractSigned(_contractId, msg.sender);
        emit ContractActivated(_contractId);
    }

    // ─── 4. Release milestone payment ─────────────────────────
    function releaseMilestone(uint256 _contractId, uint256 _milestoneIndex) external nonReentrant {
        WorkContract storage c = contracts[_contractId];
        require(msg.sender == c.client, "Only client");
        require(c.status == ContractStatus.Active, "Contract not active");

        Milestone storage m = milestones[_contractId][_milestoneIndex];
        require(!m.released, "Already released");
        require(!m.disputed, "Milestone disputed");

        m.released = true;
        require(USDC.transfer(c.freelancer, m.amount), "Transfer failed");

        emit MilestoneReleased(_contractId, _milestoneIndex, m.amount);

        // Check if all milestones released
        _checkAllMilestonesReleased(_contractId);
    }

    // ─── 5. Release recurring payment ─────────────────────────
    function releaseRecurringPayment(uint256 _contractId) external nonReentrant {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Contract not active");
        require(c.paymentType == PaymentType.Recurring, "Not a recurring contract");
        require(
            block.timestamp >= c.lastPaymentAt + c.recurringInterval,
            "Payment interval not reached"
        );
        require(c.recurringPaid < c.recurringCount, "All payments made");

        c.lastPaymentAt = block.timestamp;
        c.recurringPaid++;

        require(USDC.transfer(c.freelancer, c.recurringAmount), "Transfer failed");

        emit RecurringPaymentReleased(_contractId, c.recurringAmount, c.recurringPaid);

        if (c.recurringPaid == c.recurringCount) {
            c.status = ContractStatus.Completed;
        }
    }

    // ─── 6. Request deadline extension ────────────────────────
    function requestExtension(uint256 _contractId, uint256 _newDeadline) external {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Contract not active");
        require(
            msg.sender == c.client || msg.sender == c.freelancer,
            "Not a party"
        );
        require(_newDeadline > c.deadline, "New deadline must be later");
        require(c.extensionRequestedBy == 0, "Extension already pending");

        c.extensionRequestedBy = uint256(uint160(msg.sender));
        c.proposedDeadline = _newDeadline;

        emit ExtensionRequested(_contractId, msg.sender, _newDeadline);
    }

    // ─── 7. Approve extension ─────────────────────────────────
    function approveExtension(uint256 _contractId) external {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Contract not active");
        require(c.extensionRequestedBy != 0, "No extension pending");
        require(
            msg.sender == c.client || msg.sender == c.freelancer,
            "Not a party"
        );
        require(
            uint256(uint160(msg.sender)) != c.extensionRequestedBy,
            "Cannot approve own request"
        );

        c.deadline = c.proposedDeadline;
        c.extensionRequestedBy = 0;
        c.proposedDeadline = 0;

        emit ExtensionApproved(_contractId, c.deadline);
    }

    // ─── 8. Mark contract expired ─────────────────────────────
    function markExpired(uint256 _contractId) external {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Contract not active");
        require(block.timestamp > c.deadline, "Deadline not passed");
        require(
            msg.sender == c.client || msg.sender == c.freelancer,
            "Not a party"
        );

        c.status = ContractStatus.Expired;
        // Refund remaining unlocked funds to client
        uint256 remaining = _getRemainingBalance(_contractId);
        if (remaining > 0) {
            require(USDC.transfer(c.client, remaining), "Refund failed");
        }

        emit ContractExpired(_contractId);
    }

    // ─── 9. Raise dispute ─────────────────────────────────────
    function raiseDispute(uint256 _contractId) external {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Active, "Contract not active");
        require(
            msg.sender == c.client || msg.sender == c.freelancer,
            "Not a party"
        );

        c.status = ContractStatus.Disputed;
        emit ContractDisputed(_contractId);
    }

    // ─── 10. Resolve dispute (AI oracle) ──────────────────────
    function resolveDispute(uint256 _contractId, address _winner, uint256 _amount) external nonReentrant {
        WorkContract storage c = contracts[_contractId];
        require(c.status == ContractStatus.Disputed, "Not disputed");
        require(
            _winner == c.client || _winner == c.freelancer,
            "Winner must be a party"
        );

        c.status = ContractStatus.Resolved;
        require(USDC.transfer(_winner, _amount), "Transfer failed");

        emit ContractResolved(_contractId, _winner, _amount);
    }

    // ─── 11. Cancel contract ──────────────────────────────────
    function cancelContract(uint256 _contractId) external nonReentrant {
        WorkContract storage c = contracts[_contractId];
        require(
            msg.sender == c.client || msg.sender == c.freelancer,
            "Not a party"
        );
        require(
            c.status == ContractStatus.Proposed || c.status == ContractStatus.Active,
            "Cannot cancel"
        );

        c.status = ContractStatus.Cancelled;

        if (c.status == ContractStatus.Active) {
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

    function getMilestoneCount(uint256 _contractId) external view returns (uint256) {
        return milestones[_contractId].length;
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