import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, Eip1193Provider, ethers } from 'ethers';
import JOB_FACTORY_ABI from '../lib/contracts/JobFactory.json';
import DISPUTE_DAO_ABI from '../lib/contracts/DisputeDAO.json';
import { useEffect, useMemo, useState } from 'react';

export function useContracts() {
    const { address, isConnected } = useAppKitAccount();    
    const { walletProvider } = useAppKitProvider("eip155");
    const provider = useMemo(() => {
        if (!walletProvider) return null;
        return new BrowserProvider(walletProvider as Eip1193Provider);
    }, [walletProvider]);

    const [contracts, setContracts] = useState<{ jobFactory: ethers.Contract, disputeDAO: ethers.Contract } | null>(null);

    useEffect(() => {
        const setupContracts = async () => {
            if (!provider || !address) {
                setContracts(null);
                return;
            }

            const signer = await provider.getSigner(); // Resolve the Promise returned by getSigner()

            const jobFactory = new ethers.Contract(
                process.env.NEXT_PUBLIC_JOBFACTORY_ADDRESS || '',
                JOB_FACTORY_ABI,
                signer
            );

            const disputeDAO = new ethers.Contract(
                process.env.NEXT_PUBLIC_DAO_ADDRESS || '',
                DISPUTE_DAO_ABI,
                signer
            )

            setContracts({ jobFactory, disputeDAO });
        };

        setupContracts();
    }, [provider, address]);

    return { contracts, provider, address, isConnected  };    
}