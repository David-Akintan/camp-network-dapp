import { useState } from 'react';
import { ethers } from 'ethers';

const useWallet = () => {

    const [provider, setProvider] = useState(null);
    const [account, setAccount] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [signer, setSigner] = useState(null);

    const baseCampChainId = 123420001114; // replace with your correct chain ID
    const baseCampRpc = "https://rpc-campnetwork.xyz"; // replace with your actual RPC URL

    async function connectWallet() {
        if (window.ethereum) {
            try {
                const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                const network = await web3Provider.getNetwork();
                if (network.chainId !== baseCampChainId) {
                    alert(`Please switch to the Base Camp Network (Chain ID: ${baseCampChainId})`);
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: ethers.utils.hexValue(baseCampChainId) }],
                    });
                }
                
                const accounts = await web3Provider.send("eth_requestAccounts", []);
                const signer = web3Provider.getSigner();
                const address = await signer.getAddress();
                setProvider(web3Provider)
                setAccount(address)
                setIsConnected(true)
                setSigner(signer)
            } catch (error) {
                console.error('Error connecting to wallet: ', error)
            }

        } else {
      alert('Please install MetaMask!');
    }
    }

    function disconnectWallet() {
        setProvider(null);
        setAccount(null);
        setIsConnected(false);
    }

    return {
        provider,
        account,
        signer,
        isConnected, 
        connectWallet,
        disconnectWallet
    };
}

export default useWallet;