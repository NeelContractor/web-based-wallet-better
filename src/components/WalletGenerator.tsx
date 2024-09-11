"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { ethers } from "ethers"
import { motion } from "framer-motion";
import { Button } from "./ui/button";

interface Wallet {
    publicKey: string,
    privateKey: string,
    mnemonic: string,
    path: string
}

const WalletGenerator = () =>  {
    const [mnemonicWords, setMnemonicWords] = useState<string[]>(
        Array(12).fill(" ")
    );
    const [pathTypes, setPathTypes] = useState<string[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [showMnemonic, setShowMnemonic] = useState<boolean>(false);
    const [mnemonicInput, setMnemonicInput] = useState<string>("");
    const [visiblePrivateKeys, setVisiblePrivateKeys] = useState<boolean[]>([]);
    const [visiblePhrases, setVisiblePhrases] = useState<boolean[]>([]);
    const [gridView, setGridView] = useState<boolean>(false);
    const pathTypeNames: { [key: string]: string } = {
        "501": "Solana",
        "60": "Ethereum",
    }
    const pathTypeName = pathTypeNames[pathTypes[0]] || "";

    useEffect(() => {
        const storedWallets = localStorage.getItem("wallets");
        const storedMnemonic = localStorage.getItem("mnemonic");
        const storedPathTypes = localStorage.getItem("paths");

        if (storedWallets && storedMnemonic && storedPathTypes) {
            setMnemonicWords(JSON.parse(storedMnemonic));
            setWallets(JSON.parse(storedWallets));
            setPathTypes(JSON.parse(storedPathTypes));
            setVisiblePrivateKeys(JSON.parse(storedWallets).map(() => false));
            setVisiblePhrases(JSON.parse(storedWallets).map(() => false));
        }
    }, []);

    const handleDeleteWallet = (index: number) => {
        const updateWallets = wallets.filter((_, i) => i !== index);
        const updatePathTypes = pathTypes.filter((_, i) => i !== index);

        setWallets(updateWallets);
        setPathTypes(updatePathTypes);
        localStorage.setItem("wallets", JSON.stringify(updateWallets));
        localStorage.setItem("paths", JSON.stringify(updatePathTypes));
        setVisiblePrivateKeys(visiblePrivateKeys.filter((_, i) => i !== index));
        setVisiblePhrases(visiblePhrases.filter((_, i) => i !== index));
        toast.success("Wallet deleted successfully!");
    };

    const handleClearWallets = () => {
        localStorage.removeItem("wallets");
        localStorage.removeItem("mnemonic");
        localStorage.removeItem("paths");
        setWallets([]);
        setMnemonicWords([]);
        setPathTypes([]);
        setVisiblePrivateKeys([]);
        setVisiblePhrases([]);
        toast.success("All wallets cleared.");
    }

    const copyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
    };

    const togglePrivateKeyVisibility = (index: number) => {
        setVisiblePrivateKeys(
            visiblePrivateKeys.map((visible, i) => (i === index ? !visible : visible))
        )
    };

    const togglePhraseKeyVisibility = (index: number) => {
        setVisiblePhrases(
            visiblePhrases.map((visible, i) => (i === index ? !visible : visible))
        )
    };

    const generateWalletFromMnemonic = (
        pathType: string,
        mnemonic: string,
        accountIndex: number
    ): Wallet | null => {
        try {
            const seedBuffer = mnemonicToSeedSync(mnemonic);
            const path = `m/44'/${pathType}'/0'/${accountIndex}`;
            const { key: derivedSeed } = derivePath(path, seedBuffer.toString("hex"));

            let publicKeyEncoded: string;
            let privateKeyEncoded: string;

            if (pathType === "501") {
                //Solana
                const { secretKey } = nacl.sign.keyPair.fromSeed(derivedSeed);
                const keypair = Keypair.fromSecretKey(secretKey);

                privateKeyEncoded = bs58.encode(secretKey);
                publicKeyEncoded = keypair.publicKey.toBase58();
            } else if (pathType === "60") {
                const privateKey = Buffer.from(derivedSeed).toString("hex");
                privateKeyEncoded = privateKey;

                const wallet = new ethers.Wallet(privateKey);
                publicKeyEncoded = wallet.address;
            } else {
                toast.error("Unsupported path type.");
                return null;
            }

            return {
                publicKey: publicKeyEncoded,
                privateKey: privateKeyEncoded,
                mnemonic,
                path,
            };
        } catch (error) {
            toast.error("Failed to generate wallet. Please try again.")
            return null;
        }
    };

    const handleGenerateWallet = () => {
        let mnemonic = mnemonicInput.trim();

        if (mnemonic) {
            if (!validateMnemonic(mnemonic)) {
                toast.error("Invalid recovery phrase. Please try again.");
                return;
            }
        } else {
            mnemonic = generateMnemonic();
        }

        const words = mnemonic.split(" ");
        setMnemonicWords(words);

        const wallet = generateWalletFromMnemonic(
            pathTypes[0],
            mnemonic,
            wallets.length
        );
        if (wallet) {
            const updatedWallets = [...wallets, wallet];
            setWallets(updatedWallets);
            localStorage.setItem("wallets", JSON.stringify(updatedWallets));
            localStorage.setItem("mnemonic", JSON.stringify(words));
            localStorage.setItem("paths", JSON.stringify(pathTypes));
            setVisiblePrivateKeys([...visiblePrivateKeys, false]);
            setVisiblePhrases([...visiblePhrases, false]);
            toast.success("Wallet generated successfully!");
        }
    }

    const handleAddWallet = () => {
        if (!mnemonicWords) {
            toast.error("No mnemonic found. Please generate a wallet first.");
            return;
        }

        const wallet = generateWalletFromMnemonic(
            pathTypes[0],
            mnemonicWords.join(" "),
            wallets.length
        );
        if (wallet) {
            const updatedWallets = [...wallets, wallet];
            const updatedPathType = [pathTypes, pathTypes];
            setWallets(updatedWallets);
            localStorage.setItem("wallets", JSON.stringify(updatedWallets));
            localStorage.setItem("pathTypes", JSON.stringify(updatedPathType));
            setVisiblePrivateKeys([...visiblePrivateKeys, false]);
            setVisiblePhrases([...visiblePhrases, false]);
            toast.success("Wallet generated successfully!");
        }
    }; 
    return (
        <div className="flex flex-col gap-4">
            {wallets.length === 0 && (
                <motion.div
                  className="flex flex-col gap-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3,
                    ease: "easeInOut",
                   }}
                >
                    <div className="flex flex-col gap-4">
                        {pathTypes.length === 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.3,
                                ease: "easeInOut"
                              }}
                              className="flex flex-col gap-4 my-12"
                            >
                                <div className="flex flex-col gap-2">
                                    <h1 className="tracking-tighter text-4xl md:text-5xl font-black">
                                        Neel Supports multiple blockchains
                                    </h1>
                                    <p className="text-primary/80 font-semibold text-lg md:text-xl">
                                        Choose a blockchain to get started.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                    size={"lg"}
                                    onClick={() => {
                                        setPathTypes(["501"]);
                                        toast.success(
                                            "Wallet selected. Please generate a wallet to continue."
                                        )
                                    }}
                                    >
                                        Solana
                                    </Button>
                                    <Button 
                                    size={"lg"}
                                    onClick={() => {
                                        setPathTypes(["60"]);
                                        toast.success(
                                            "Wallet selected. Please generate a wallet to continue."
                                        )
                                    }}
                                    >
                                        Ethereum
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                        {pathTypes.length !== 0 && ()}
                    </div>
                </motion.div>
            )}
        </div>
    )
}