const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateVerification", function () {
    let CertificateVerification;
    let contract;
    let owner;
    let issuer;
    let student;

    beforeEach(async function () {
        [owner, issuer, student] = await ethers.getSigners();
        CertificateVerification = await ethers.getContractFactory("CertificateVerification");
        contract = await CertificateVerification.deploy();
        // Remove the await contract.deployed() line as it's not needed in ethers v6
    });

    it("Should grant ISSUER_ROLE to a new address", async function () {
        await contract.grantRole(await contract.ISSUER_ROLE(), issuer.address);
        expect(await contract.hasRole(await contract.ISSUER_ROLE(), issuer.address)).to.be.true;
    });

    it("Should issue a certificate", async function () {
        await contract.grantRole(await contract.ISSUER_ROLE(), issuer.address);
        const certificateId = "CERT001";
        const ipfsHash = "QmTest...";
        const metadata = "{}";

        await contract.connect(issuer).issueCertificate(
            certificateId,
            student.address,
            ipfsHash,
            metadata
        );

        const [isValid, certificate] = await contract.verifyCertificate(certificateId);
        expect(isValid).to.be.true;
        expect(certificate.studentAddress).to.equal(student.address);
    });

    it("Should revoke a certificate", async function () {
        await contract.grantRole(await contract.ISSUER_ROLE(), issuer.address);
        const certificateId = "CERT001";
        
        await contract.connect(issuer).issueCertificate(
            certificateId,
            student.address,
            "QmTest...",
            "{}"
        );

        await contract.connect(issuer).revokeCertificate(certificateId);
        const [isValid, certificate] = await contract.verifyCertificate(certificateId);
        expect(isValid).to.be.false;
        expect(certificate.isRevoked).to.be.true;
    });

    it("Should pause and unpause operations", async function () {
        await contract.pause();
        expect(await contract.paused()).to.be.true;

        await contract.unpause();
        expect(await contract.paused()).to.be.false;
    });
});