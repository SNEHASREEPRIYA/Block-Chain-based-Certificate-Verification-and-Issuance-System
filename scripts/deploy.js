const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const CertificateVerification = await hre.ethers.getContractFactory("CertificateVerification");
  
  // Deploy the contract
  const contract = await CertificateVerification.deploy();
  
  // Wait for deployment to finish
  await contract.waitForDeployment();
  
  // Get the contract address
  const address = await contract.getAddress();
  console.log("CertificateVerification deployed to:", address);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });