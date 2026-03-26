# 🔐 Self-Sovereign Core (SSC)
## Professional Cryptographic Identity Engine — The Stateless Foundation for Deterministic & Sovereign Digital Identity (DID)

![Version](https://img.shields.io/badge/version-1.2.2-blue.svg)
![Security](https://img.shields.io/badge/Standard-BIP--39%20%2F%20HKDF-success.svg)
![Privacy](https://img.shields.io/badge/Privacy-Zero--Knowledge-orange.svg)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Self-Sovereign Core (SSC) is a high-performance, name-agnostic cryptographic orchestration engine. It is designed to be the "Root of Trust" for modern decentralized applications. SSC enables a pure Zero-Knowledge architecture where the user is the sole custodian of their cryptographic destiny.

Unlike high-level libraries that hide complexity behind insecure defaults, SSC implements a rigorous deterministic derivation hierarchy based on HKDF (RFC 5869). It allows for the total restoration of an identity—including signing and encryption keys—from a single 256-bit entropy source or a BIP-39 mnemonic phrase.

---

## 🚀 Key Performance Indicators (KPI)

* Zero-Latency Architecture: Static singleton encoding and frozen instances for maximum execution speed.
* Deterministic Key Tree: Derive infinite, context-specific sub-keys (Storage, Cloud, P2P) from one master root.
* Memory Hardening: Automatic Uint8Array sanitization (fill(0)) to mitigate memory-dump vulnerabilities.
* WebCrypto Isolation: Non-extractable CryptoKey objects—keys are generated and used inside the browser's secure boundary.
* Protocol Agility: Native versioning (Protocol v1) to ensure long-term compatibility and algorithm upgrades.

---

## 📦 Installation & Setup

```Javascript
import { SelfSovereignCore } from './SelfSovereignCore.js';
```

---

## 🛠️ Implementation Guide: The Sovereign Path

### 1. Generating a New Identity
Generate a new high-entropy identity. Use the persist option to retrieve the 24-word recovery phrase.

```Javascript
// Direct generation (Instance only)
const identity = await SelfSovereignCore.generate();

// Generation with BIP-39 Recovery Phrase
const { instance, mnemonic } = await SelfSovereignCore.generate({ persist: true });

console.log("Sovereign Public ID:", instance.publicID);
console.log("Recovery Mnemonic:", mnemonic);
```

### 2. Stateless Restoration
Reconstruct the full cryptographic context from a saved mnemonic string or raw entropy.

```Javascript
const mnemonic = "alpha bravo charlie ..."; // 24 words
const identity = await SelfSovereignCore.restore(mnemonic);

console.log("Identity Restored:", identity.publicID);
```

### 3. Authenticated Encryption (AEAD)
Encrypt data with AES-GCM 256. Use AAD (Additional Authenticated Data) to bind the ciphertext to a specific context, preventing replay or substitution attacks.

```Javascript
const data = "Secret sovereign data";
const context = "vault_v1_user_42";

// Encryption
const { ciphertext, iv } = await identity.encrypt(data, SelfSovereignCore.encode(context));

// Decryption (Throws if AAD/context is incorrect)
const plaintextBytes = await identity.decrypt(ciphertext, iv, SelfSovereignCore.encode(context));
const originalText = new TextDecoder().decode(plaintextBytes);
```

### 4. Deterministic Key Derivation (HKDF)
Generate a 256-bit sub-key for any specific use-case without exposing the Master Key.

```Javascript
// Create a key for a specific cloud backup module
const cloudKeyRaw = await identity.derive("module.backup.aws");

// Result is a Uint8Array(32) ready for external cryptographic use.
```

---

## 🔧 Technical API Reference

### Static Methods (Factories)
* `SelfSovereignCore.generate({ persist, protocol })` : Generates a new identity.
* `SelfSovereignCore.restore(source, version)` : Restores from mnemonic string or Uint8Array.
* `SelfSovereignCore.encode(string)` : Optimized UTF-8 to Uint8Array helper.

### Instance Accessors (Read-Only)
* `.publicID` : The URL-safe public string identifier (e.g., "1.base64_hash").
* `.version` : The protocol version used by the instance.
* `.curProto` : The full cryptographic specification of the active protocol.

### Instance Methods
* `.sign(data)` : HMAC-SHA256 digital signature. Returns Promise<ArrayBuffer>.
* `.encrypt(data, [aad])` : AES-GCM encryption. Returns { ciphertext, iv }.
* `.decrypt(ciphertext, iv, [aad])` : AES-GCM decryption.
* `.derive(context)` : Contextual HKDF derivation. Returns Uint8Array(32).
* `.destroy()` : Wipes keys and identifier from the instance.

---

## 🛡️ Security Specification (Protocol v1)

| Feature | Primitive | Implementation |
| :--- | :--- | :--- |
| Root Entropy | BIP-39 | 256-bit (24 words) |
| Derivation (KDF) | HKDF | SHA-256 (RFC 5869) |
| Signing | HMAC | SHA-256 |
| Encryption | AES-GCM | 256-bit Key / 96-bit IV |
| ID Mapping | SHA-256 | Deterministic Public Hash |

---

## 📈 SEO & Developer Keywords
Sovereign Identity Javascript, WebCrypto Wrapper, BIP-39 Implementation, Deterministic Key Derivation JS, HKDF SHA-256, Stateless Identity Recovery, AES-GCM 256 Encryption, Non-custodial Auth Engine.

---

> Built for the Sovereign Web.
> "In math we trust, in sovereignty we live."
