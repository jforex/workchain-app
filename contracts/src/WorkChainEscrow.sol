// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract WorkChainEscrow {

    enum JobStatus { Open, Active, Completed, Disputed, Resolved, Cancelled }

    struct Job {
        address client;
        address freelancer;
        uint256 amount;
        JobStatus status;
        string title;
        string description;
        uint256 createdAt;
        uint256 completedAt;
    }

    IERC20 public immutable usdc;
    uint256 public jobCount;
    string public constant BUILDER_CODE = "bc_v1ampve4";

    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed jobId, address indexed client, uint256 amount, string title);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer);
    event JobCompleted(uint256 indexed jobId);
    event JobDisputed(uint256 indexed jobId);
    event JobResolved(uint256 indexed jobId, address indexed winner);
    event JobCancelled(uint256 indexed jobId);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    // Client posts a job and locks USDC
    function createJob(uint256 _amount, string calldata _title, string calldata _description) external returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        require(usdc.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        uint256 jobId = ++jobCount;
        jobs[jobId] = Job({
            client: msg.sender,
            freelancer: address(0),
            amount: _amount,
            status: JobStatus.Open,
            title: _title,
            description: _description,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit JobCreated(jobId, msg.sender, _amount, _title);
        return jobId;
    }

    // Freelancer accepts a job
    function acceptJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Open, "Job not available");
        require(job.client != msg.sender, "Client cannot accept own job");

        job.freelancer = msg.sender;
        job.status = JobStatus.Active;

        emit JobAccepted(_jobId, msg.sender);
    }

    // Client releases payment to freelancer
    function releasePayment(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Active, "Job not active");
        require(job.client == msg.sender, "Only client can release payment");

        job.status = JobStatus.Completed;
        job.completedAt = block.timestamp;

        require(usdc.transfer(job.freelancer, job.amount), "USDC transfer failed");

        emit JobCompleted(_jobId);
    }

    // Either party raises a dispute
    function raiseDispute(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Active, "Job not active");
        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "Not a party to this job"
        );

        job.status = JobStatus.Disputed;
        emit JobDisputed(_jobId);
    }

    // AI oracle resolves dispute — sends funds to winner
    function resolveDispute(uint256 _jobId, address _winner) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Disputed, "Job not disputed");
        require(
            _winner == job.client || _winner == job.freelancer,
            "Winner must be a party to the job"
        );

        job.status = JobStatus.Resolved;
        job.completedAt = block.timestamp;

        require(usdc.transfer(_winner, job.amount), "USDC transfer failed");

        emit JobResolved(_jobId, _winner);
    }

    // Client cancels an open job and gets refund
    function cancelJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Open, "Can only cancel open jobs");
        require(job.client == msg.sender, "Only client can cancel");

        job.status = JobStatus.Cancelled;

        require(usdc.transfer(job.client, job.amount), "USDC transfer failed");

        emit JobCancelled(_jobId);
    }

    // Read a job
    function getJob(uint256 _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }
}