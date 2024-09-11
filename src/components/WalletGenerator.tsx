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
import { Input } from "./ui/input";
import { ChevronDown, ChevronUp, Copy, Grid2X2, List, WholeWord } from "lucide-react";
import { AlertDialog } from "@radix-ui/react-alert-dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

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
                        {pathTypes.length !== 0 && (
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
                                    <h1 className="tracking-tighter text-4xl md:text5xl font-black ">
                                        Secret Recovery Phrase
                                    </h1>
                                    <p className="text-primary/80 font-semibold text-lg md:text-xl">
                                    Save thes words in a safe place.</p>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Input
                                        type="password"
                                        placeholder="Enter your secret phrase (or leave blank to generate)"
                                        onChange={(e) => setMnemonicInput(e.target.value)}
                                        value={mnemonicInput}
                                    />
                                    <Button size={"lg"} onClick={() => handleGenerateWallet()}>
                                        {mnemonicInput ? "Add Wallet" : "Generate Wallet"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Display Secret Phrase */}
            {mnemonicWords && wallets.length > 0 && (
                <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.3,
                    ease: "easeInOut"
                }}
                className="group flex flex-col items-center gap-4 cursor-pointer rounded-lg border border-primary/10 p-8"
                >
                    <div 
                    className="flex w-full justify-between items-center"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    >
                        <h2 className="text-2xl w-full justify-between items-center">
                            Your Secret Phrase
                        </h2>
                        <Button 
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        variant="ghost"
                        >
                            {showMnemonic ? (
                                <ChevronUp className="size-4" />
                            ) : (
                                <ChevronDown className="size-4" />
                            )}
                        </Button>
                    </div>
                    {showMnemonic && (
                        <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.3,
                            ease: "easeInOut"
                        }}
                        className="flex flex-col w-full items-center justify-center"
                        onClick={() => copyToClipboard(mnemonicWords.join(" "))}
                        >
                            <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut"
                            }}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 justify-center mx-auto my-8"
                            >
                                {mnemonicWords.map((word, index) => (
                                    <p
                                      key={index} 
                                      className="md:text-lg bg-foreground/5 hover:bg-foreground/10 transition-all duration-300 rounded-lg p-4"
                                    >
                                      {word}
                                    </p>
                                ))}
                            </motion.div>
                            <div className="text-sm md:text-base text-primary/50 flex w-full gap-2 items-center group-hover:text-primary/80 transition-all duration-300">
                                <Copy className="size-4" /> Click Anywhere to Copy
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}

            {/* Display wallet pairs */}
            {wallets.length > 0 && (
                <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    delay: 0.3,
                    duration: 0.3,
                    ease: "easeInOut"
                }}
                className="flex flex-col gap-8 mt-6"
                >
                    <div className="flex md:flex-row flex-col justify-between w-full gap-4 md:items-center">
                        <h2 className="tracking-tighter text-3xl md:text-4xl font-extrabold">
                        {pathTypeName} Wallet
                        </h2>
                        <div className="flex gap-2">
                            {wallets.length > 1 && (
                                <Button 
                                variant={"ghost"}
                                onClick={() => setGridView(!gridView)}
                                className="hidden md:block"
                                >
                                    {gridView ? <Grid2X2 /> : <List />}
                                </Button>
                            )}
                            <Button onClick={() => handleAddWallet()}>Add Wallet</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant={"destructive"} className="self-end">
                                        Clear Wallets
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Are you want to delete all wallets?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete 
                                            your wallets and keys from local storage.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleClearWallets()}>
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <div className={`grid gap-6 grid-cols-1 col-span-1 ${
                        gridView ? "md:grid-cols-2 lg:grid-cols-3" : ""
                    }`}>
                        {wallets.map((wallet: any, index: number) => (
                            <motion.div 
                              initial={{ opacity: 0, y:-20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: 0.3 + index * 0.1,
                                duration: 0.3,
                                ease: "easeInOut"
                              }}
                              className="flex flex-col rounded-2xl border border-primary/10"
                            >
                                <div></div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    )
}