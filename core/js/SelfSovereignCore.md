# Self-Sovereign Core (SSC)
## Empowering Digital Autonomy through Cryptographic Identity

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)]
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)]
[![Security](https://img.shields.io/badge/Security-AES--GCM%20%7C%20ED25519-orange.svg)]

**Self-Sovereign Core (SSC)** is the foundational layer of the uRTC ecosystem. It provides a robust, developer-friendly interface for managing **Decentralized Identities (DID)**, cryptographic keys, and secure data persistence directly within the browser or Node.js environment.

In an era where data privacy is paramount, SSC allows you to build applications where the user—and only the user—owns their cryptographic keys and identity. No central authority, no middleman, just pure sovereign math.

---

## 🚀 Key Features

* **Sovereign Identity Generation:** Create unique, deterministic cryptographic identities in seconds.
* **Plug-and-Play Storage:** Abstracted storage layer (LocalStorage, IndexedDB, or Memory) with automatic encryption at rest.
* **WebCrypto Native:** Built on the hardware-accelerated Web Cryptography API for maximum performance and security.
* **Session Management:** Seamlessly handle temporary session keys and long-term identity keys.
* **Universal Compatibility:** Designed to integrate perfectly with uRTC and uSignaler.

---

## 📦 Installation

```Javascript
import { SelfSovereignCore } from './SelfSovereignCore.js';
```
---

## 🛠️ Getting Started: The Basics

### 1. Initializing the Core
Initialize SSC with your preferred storage strategy. For persistent web apps, use indexeddb. For temporary testing, use memory.

```Javascript
const ssc = new SelfSovereignCore({
    storage: "indexeddb", // Options: 'memory', 'localstorage', 'indexeddb'
    identity: {
        alias: "Alice",
        seed: "optional-high-entropy-seed-phrase" 
    }
});

// Wait for the cryptographic engine to prime
await ssc.initialize();
console.log("Sovereign Identity Ready:", ssc.id);
```

### 2. Generating a Secure Communication Key
SSC excels at managing keys for other protocols (like uRTC). Here is how you generate a 256-bit AES-GCM key for a private session:

```Javascript
// Generate a high-entropy session key
const sessionKey = await ssc.generateSessionKey("AES-GCM", 256);

console.log("New Session Key Created:", sessionKey);
```
---

## 💡 Advanced Use Cases

### Case A: Encrypting Local Sensitive Data
Use SSC to protect user data before saving it to a database or local storage.

```Javascript
const sensitiveData = "This is a private note only I should see.";

// SSC handles the encryption using the internal Identity Key
const encryptedBlob = await ssc.encryptLocal(sensitiveData);

// Later, retrieve and decrypt
const originalText = await ssc.decryptLocal(encryptedBlob);
console.log(originalText); // "This is a private note..."
```

### Case B: Digital Signatures for Message Integrity
Prove that a message was sent by you without revealing your private keys.

```Javascript
const message = "I authorize the transfer of 500 uTokens.";

// Sign the message using ED25519 / ECDSA
const signature = await ssc.sign(message);

// Send the message + signature to a peer
// The peer can verify using your public ID
const isValid = await ssc.verify(message, signature, ssc.id);
console.log("Is authenticity verified?", isValid);
```
---

## 🏗️ Architecture Detail

SSC operates on a **Three-Tier Security Model**:

| Layer | Function | Algorithm |
| :--- | :--- | :--- |
| **Identity** | Long-term sovereign proof of personhood | ED25519 / RSA-PSS |
| **Session** | Ephemeral keys for high-speed P2P transport | AES-GCM (256-bit) |
| **Vault** | Secure storage of keys and user settings | PBKDF2 + AES-KW |

---

## 🔧 API Documentation (Quick Reference)

### constructor(options)
* options.storage: The backend used for persistence (memory, localstorage, indexeddb).
* options.identity: Object containing alias and optional seed for deterministic keys.

### async initialize()
Primes the WebCrypto engine, recovers keys from storage, or generates new ones if none exist.

### async exportPublicKey()
Returns the public portion of the identity key in a shareable format (JWK or Raw).

### async encryptLocal(data) / async decryptLocal(blob)
Standard methods for Identity-Locked data encryption, ensuring local privacy.

---

## 🌟 Why Use SSC?

1. **Zero Trust:** You don't have to trust your server. All encryption happens client-side.
2. **Performance:** Offloads heavy crypto to the browser's native C++ implementation via WebCrypto.
3. **Future-Proof:** Modular design allows for switching algorithms (e.g., Post-Quantum) without breaking your app logic.

---

## ⚖️ License

Copyright © 2026 **Hold'inCorp**. Distributed under the Apache-2.0 License.

---

> **Ready to take control?**
> Integrate SSC today and give your users the sovereignty they deserve.
> *“My Keys, My Identity, My Data.”*
