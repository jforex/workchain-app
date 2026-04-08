// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WorkChainReputation is ERC721, Ownable {

    uint256 public tokenCount;

    struct Credential {
        address freelancer;
        address client;
        string jobTitle;
        string category;
        uint256 amount;
        uint256 completedAt;
        uint256 contractId;
    }

    mapping(uint256 => Credential) public credentials;
    mapping(address => uint256[]) public freelancerCredentials;

    // Only the escrow contract can mint
    address public escrowContract;

    event CredentialMinted(
        uint256 indexed tokenId,
        address indexed freelancer,
        address indexed client,
        uint256 contractId,
        string jobTitle
    )  ;

    constructor(address _escrowContract) ERC721("WorkChain Reputation", "WCREP") Ownable(msg.sender) {
        escrowContract = _escrowContract;
    }

    modifier onlyEscrow() {
        require(msg.sender == escrowContract, "Only escrow contract");
        _;
    }

    function mintCredential(
        address _freelancer,
        address _client,
        string calldata _jobTitle,
        string calldata _category,
        uint256 _amount,
        uint256 _contractId
    ) external onlyEscrow returns (uint256) {
        uint256 tokenId = ++tokenCount;

        _mint(_freelancer, tokenId);

        credentials[tokenId] = Credential({
            freelancer: _freelancer,
            client: _client,
            jobTitle: _jobTitle,
            category: _category,
            amount: _amount,
            completedAt: block.timestamp,
            contractId: _contractId
        });

        freelancerCredentials[_freelancer].push(tokenId);

        emit CredentialMinted(tokenId, _freelancer, _client, _contractId, _jobTitle);
        return tokenId;
    }

    function getCredential(uint256 _tokenId) external view returns (Credential memory) {
        return credentials[_tokenId];
    }

    function getFreelancerCredentials(address _freelancer) external view returns (uint256[] memory) {
        return freelancerCredentials[_freelancer];
    }

    function getFreelancerCredentialCount(address _freelancer) external view returns (uint256) {
        return freelancerCredentials[_freelancer].length;
    }

    function updateEscrowContract(address _newEscrow) external onlyOwner {
        escrowContract = _newEscrow;
    }

    // Soulbound — non-transferable
    function transferFrom(address, address, uint256) public pure override {
        revert("Credentials are non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Credentials are non-transferable");
    }
}