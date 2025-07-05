# eVault - Secure Personal Data Vault

**Built on OpenADP distributed cryptography for nation-state resistant protection**

eVault is a secure personal data vault that leverages OpenADP's distributed threshold cryptography to protect sensitive information. Unlike traditional password managers or cloud storage, eVault ensures that even if your device is compromised, your secrets remain secure through PIN-protected access and distributed encryption.

## Key Features

- **Frictionless Adding**: Add secrets anytime without entering your PIN
- **PIN-Protected Access**: Secrets can only be retrieved with your PIN
- **Distributed Security**: OpenADP splits your encryption keys across multiple servers in different jurisdictions
- **Nation-State Resistant**: No single point of failure that can be compromised by government pressure
- **Zero Knowledge**: Even eVault operators cannot access your data

## Primary Use Cases

### 1. Recovery Codes - Personal Use

**The Problem**: Most people don't securely store recovery codes from online services (Gmail, GitHub, banking, etc.). These codes end up in screenshots, notes apps, or get lost entirely.

**eVault Solution**:
```
📱 Get recovery codes from Gmail
   ↓
📋 Paste/photo them into eVault (no PIN needed)
   ↓
🔒 OpenADP encrypts & distributes across servers
   ↓
📱 Later: need to recover your account
   ↓
🔑 Enter PIN → get your recovery codes instantly
```

**Value Proposition**: 
- Never lose recovery codes again
- Secure even if your device is stolen
- Simple, fast access when you need them
- No complex setup or learning curve

### 2. Estate Planning & Legacy Information

**The Problem**: Elderly people give estate planners static documents with account information, passwords, and important details. This information becomes stale over time, and most people never update it, leaving heirs with outdated information.

**eVault Solution**:
```
👴 Opens new bank account or changes password
   ↓
📝 Quickly adds info to eVault (no PIN friction)
   ↓
🔒 OpenADP encrypts & distributes across servers
   ↓
📋 Estate planner has same info: eVault account + PIN
   ↓
💀 When needed: heirs get current, complete information
```

**Value Proposition**:
- **Zero friction updates** - encouraging regular maintenance
- **Always current** - information is live when heirs need it
- **Simple inheritance** - just two pieces of info to manage (account + PIN)
- **Secure** - even compromised devices can't reveal secrets
- **Distributed** - no single point of failure for critical estate info

**Market Opportunity**: Estate planning is a massive, established industry serving an aging population with digital accounts they don't know how to pass on.

### 3. Corporate Recovery Codes

**The Problem**: Employees get locked out of corporate systems while traveling or working remotely. Current solutions are either insecure (SMS codes can be accessed by anyone with the phone) or require expensive IT support across timezones.

**eVault Solution**:
```
🏢 IT provisions recovery codes to employee's eVault
   ↓
✈️ Employee travels to client site in different timezone
   ↓
🔒 Gets locked out of corporate systems
   ↓
📱 Opens eVault, enters PIN, gets recovery codes
   ↓
🔑 Self-recovers instantly, securely
```

**Corporate Value Proposition**:
- **Reduced IT burden** - no more 3am lockout calls
- **Global workforce support** - works anywhere, anytime
- **Enhanced security** - PIN protection prevents phone compromise attacks
- **Audit trail** - track when/where recovery codes are used
- **Cost savings** - eliminate expensive IT support tickets

**Market Size**: Every company with remote workers needs this - much larger revenue potential than consumer use cases.

**Enterprise Features Needed**:
- Admin dashboard for IT to manage employee vaults
- Bulk provisioning of recovery codes
- Usage analytics and reporting
- Integration with existing identity systems
- Compliance reporting

### 4. Air-Gapped High-Security Operations

**The Problem**: Ultra-sensitive operations like cryptocurrency transactions and Certificate Authority root key operations need maximum security. Current solutions either expose keys to network-connected machines or require complex HSM infrastructure.

**Target Use Cases**:
- **Crypto wallets**: Private keys for large cryptocurrency holdings
- **Certificate Authorities**: Root keys for signing sub-keys
- **Corporate signing**: Code signing certificates and other high-value keys
- **Government/military**: Any operations requiring air-gap security

**eVault Air-Gapped Solution**:
```
🔒 Ultra-sensitive private key stored in air-gapped eVault
   ↓
🏦 Secure laptop kept in safe, only used for ceremonies
   ↓
📍 User enters PIN on air-gapped machine (PIN never leaves room)
   ↓
🔐 Machine computes U, blinds with r to get blinded point B
   ↓
💾 B transferred via USB to online machine
   ↓
🌐 Online machine follows OpenADP protocol to recover r*S (still 100% blinded!)
   ↓
💾 r*S manually transferred back to air-gapped machine
   ↓
🔓 Air-gapped machine unblinds S (multiply by 1/r)
   ↓
🔑 Air-gapped machine derives enc_key to decrypt private keys
```

**Air-Gapped Value Proposition**:
- **Maximum Security**: PIN and private keys never touch network-connected machines
- **Distributed Trust**: Still benefits from OpenADP's multi-jurisdiction protection
- **Ceremony Security**: Formal air-gapped procedures for high-value operations
- **Compliance Ready**: Meets strictest security requirements for financial/government use
- **Cost Effective**: No expensive HSM infrastructure required

**Market Opportunity**:
- **Cryptocurrency**: $2T+ market with high security requirements
- **Enterprise CA**: Every large corporation needs secure key management
- **Government/Military**: Highest security clearance operations
- **Financial Services**: Payment processing and settlement systems

**Premium Pricing Potential**:
- **Individual Crypto**: $50-200/month for high-net-worth individuals
- **Enterprise CA**: $500-2000/month per organization
- **Government**: $10,000+ per deployment

## Path to Profitability & Scale

### The OpenADP Ecosystem Challenge

OpenADP is live with 4 servers and growing internationally, but needs real applications to demonstrate its value. eVault serves as the flagship application to drive OpenADP adoption while building a sustainable business.

### Go-to-Market Strategy: Paid Advertising

**Target Use Case**: Recovery Codes (Personal Use)
- **Universal problem**: Everyone has lost recovery codes
- **Easy to demonstrate**: 30-second video showing the pain
- **Clear value prop**: "Never lose recovery codes again"
- **Emotional hook**: Getting locked out of Gmail/banking is terrifying
- **Broad targeting**: Anyone who uses online services

**Ad Creative Strategy**:
- Hook: "Got locked out of Gmail because you lost your recovery codes?"
- Demo: Show eVault solving the problem in 10 seconds
- Security benefit: "Even if your phone is stolen, your codes are safe"
- Call to action options:
  - **Early adopter**: "Pay $5 once, secure your recovery codes forever"
  - **Free option**: "Store your recovery codes for free - only pay when you need them"

**Target Audience**:
- Tech-savvy individuals 25-55
- Use multiple online services (Gmail, GitHub, banking, crypto)
- Have been locked out before
- Value security/privacy
- Can afford $5-8/month (or $5 one-time early adopter special)

### Revenue Model

**Flexible Pricing - User's Choice**:

**🚀 Early Adopter Special (Limited Time)**:
- **$5 one-time payment**: Vault free for life
- Unlimited storage and recovery access forever
- **Positioning**: "Be an early adopter - pay $5 once, use your vault forever"
- **Strategy**: Generate immediate revenue to fuel ad campaigns, create urgency

**Option 1: Pay Now (Subscription)**
- Monthly: $4.99/month
- Annual: $49.99/year (2 months free)
- Unlimited storage and recovery access
- **Positioning**: "Less than a coffee per month to never lose recovery codes again"

**Option 2: Pay Later (Per-Recovery)**
- **Free**: Store unlimited recovery codes, passwords, and sensitive data
- **$7.99 per recovery event**: Only pay when you need to access your vault
- **$24.99 annual insurance**: Unlimited recoveries for frequent users
- **Positioning**: "Store for free. Only pay when we save you from being locked out."

**Strategic Benefits**:
- **Zero barrier to entry**: Anyone can try eVault for free
- **Aligns payment with value**: Only pay when eVault actually saves you
- **Captures price-sensitive users**: Expands total addressable market
- **Higher conversion rates**: People in panic situations have high willingness to pay
- **Viral potential**: "Just try it, it's free!" removes adoption friction

**Unit Economics Target**:
- Customer Acquisition Cost (CAC): $5-15 (lower due to free option)
- Average revenue per user: $15-50/year (mix of early adopter, subscription, and per-recovery)
- Customer Lifetime Value (LTV): $50-120 (early adopters provide immediate cash flow)
- **Target: 120% return on ad spend** for sustainable scaling
- **Early adopter cash flow**: Immediate revenue to bootstrap ad campaigns

### Scaling Strategy

**Phase 1: Early Adopter Launch (Months 1-2)**
- Launch recovery codes MVP with $5 early adopter special
- Focus on tech-savvy early adopters who appreciate the value
- Generate immediate revenue to fund ad campaigns
- Target: 500 early adopters ($2,500 initial revenue)

**Phase 2: Proof of Concept (Months 2-4)**
- Launch full pricing options (free, per-recovery, subscription)
- Test ad creative and targeting with multiple pricing hooks
- Achieve 120% return on ad spend
- Target: 1,000 active users

**Phase 3: Scale Consumer (Months 4-12)**
- Expand ad spend with proven creative
- Add estate planning features
- Referral program for viral growth
- Target: 10,000 active users

**Phase 4: Enterprise Expansion (Months 13-24)**
- Launch corporate recovery codes
- Direct sales to mid-market companies
- Partner with IT service providers
- Target: 50,000 active users (mix of consumer + enterprise)

**Phase 5: Premium High-Security (Months 18-36)**
- Launch air-gapped mode for crypto wallets and CA operations
- Target high-net-worth crypto individuals ($50-200/month)
- Enterprise CA and government contracts ($500-10,000/month)
- Target: 1,000 premium users generating $100K+ MRR

### Success Metrics

**Consumer Success**:
- Monthly Active Users (MAU)
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- Net Promoter Score (NPS)

**OpenADP Ecosystem Success**:
- Number of OpenADP API calls
- Geographic distribution of users
- Demonstration of real-world distributed cryptography
- Developer interest in OpenADP integration

### Market Opportunity

**Addressable Market**:
- **Personal Recovery Codes**: 2B+ internet users globally
- **Estate Planning**: 76M Baby Boomers in US alone
- **Corporate Recovery**: 50M+ remote workers globally
- **Air-Gapped High-Security**: $2T+ crypto market + enterprise CA + government/military

**Competitive Advantage**:
- **Unique security model**: Distributed cryptography vs. single points of failure
- **Frictionless adding**: No PIN required to store secrets
- **Nation-state resistance**: OpenADP's key differentiator
- **Air-gapped capability**: Supports highest-security operations without HSM infrastructure
- **First-mover advantage**: No direct competitors using distributed cryptography

### Why This Matters for OpenADP

**Network Effects**:
- More eVault users = more OpenADP API usage
- Demonstrates real-world value of distributed cryptography
- Attracts other developers to build on OpenADP
- Creates sustainable funding model for OpenADP server operators

**Validation**:
- Proves OpenADP can support consumer-scale applications
- Shows distributed cryptography works in practice
- Creates case studies for enterprise adoption
- Generates revenue to reinvest in OpenADP development

**Strategic Impact**:
- If eVault reaches 50,000+ users, it becomes a major demonstration of OpenADP's viability
- Success attracts other applications to the OpenADP ecosystem
- Creates sustainable business model that doesn't depend on government funding or corporate sponsorship

## Technical Architecture

eVault is built on top of OpenADP's distributed threshold cryptography:

- **Client-side encryption**: Data is encrypted before leaving your device
- **Threshold secret sharing**: Encryption keys are split across multiple OpenADP servers
- **Distributed trust**: No single server can decrypt your data
- **PIN-based key derivation**: Your PIN is used to reconstruct encryption keys from server responses
- **Guess limiting**: Built-in brute force protection (typically 10 guesses)

## Why eVault + OpenADP?

Traditional cloud storage and password managers have single points of failure:
- Companies can be forced to create backdoors
- Governments can compel access to user data
- Server compromises expose all user data

eVault eliminates these risks:
- **Distributed across jurisdictions**: Governments must coordinate across multiple countries
- **Open source transparency**: No hidden backdoors possible
- **Threshold security**: Even if some servers are compromised, your data remains secure
- **PIN-only access**: Even physical device access doesn't compromise your secrets

 