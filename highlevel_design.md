# eVault Architecture

The initial use case is secure cloud storage for recovery codes.  These codes
are often lost, and users often ignore instructions to print them out and put
them into a safe.  eVaulltApp will reduce the effort to save recovery codes
securely, so they're there when needed.

The system consists of these parts:

* eVault server for cloud storage and management of eVaults
* eVaultApp cliets, initially web-based, with iOS and Android apps later
* OpenADP servers for Ocrypt recovery of long term secrets
* Authentication service for auth tokens (probably OAuth)

See the [OpenADP README](https://github.com/openadp/openadp?tab=readme-ov-file#readme)
for context on OpenADP and its Ocrypt protocol.

Authentication design is TBD.

## eVault server core APIs

* RegisterVaut
* AddEntry
* DeleteEntry
* ListEntries
* GetEntries

Note that there is no OpenVault.  That functionality exists only client-side.
After an Ocrypt recovery, eVaultApp can use the long term secret to decrypt the
eVault entries.

The main database tables are Users and Entries.  Users have the folllowing columns:

#### Users table

* userID: string (primary key)
* email: string (UTF-8?)
* phoneNumber: string (or 64-bit integer if this is more common)
* authProvider: TBD (info needed to find auth proovider)
* verified: Boolean
* evenOcryptMetadata: string
* oddOcryptMetadata: string
* evenIsCurrent: Boolean (true when the most recent metadata from Ocrypt is even)

The userID is probably provided by the authentication provider, and is assumed
to be a unique stable ID.  We also assume it is available on a new device once
the user authenticates.

#### Entries table

* userID: string
* name: string
* hpkeBlob: bytes (see below for details)
* deletionHash

The primary key is (userID, name).

#### [HPKE](https://datatracker.ietf.org/doc/rfc9180/) blobs

In general, eVaultApp clients do not trust eVault servers, so eVault serrvers never see
the public key for the eVault.  If the public key is not available locally, it must be
recovered by Ocrypt recovery, having the user enter their PIN.  Ideally, we do not include
the HPKE public key in the HPKE ciphertext which is uploaded to the eVault servers.

The HPKE public key derived from the HPKE private key, which is derived from
the long term secret.  The public key is stored locally on the device so that
we don't have to ping the OpenADP network for each entry added to the eVault.

The HPKE blobs contain entry data.  There is a 32-bit length prefix for the
length of the following JSON data, followed the HPKE ciphertext.  The JSON data
si AAD for HPKE encryptiong, so it must not be modified in any way.

The metadata contains:

* name
* Creation time (Unix time in seconds)

The decrypted plaintext from the HPKE blob contains:

* secret text, UTF-8, with newlines separating individual items.
* deletionPreHash

For example, recovery codes from Github.com may have a user-chosen name of
"github recovery codes", and a several line secret inside the HPKE encrypted
ciphertext, one per recovery code.

#### RegisterVault

All 'bytes' values are base64 encoded.
```
RegisterVault(userID: string, authToken: bytes email: string, phoneNumber: string,
    eVaultPublicKey: bytes, ocryptMetadata: string) -> err

TThis either succeeds or fails with an error message.  This is called once ever
when a user first registers with eVaulltApp.  Steps taken before calling this include:

* Make sure the userr does not already exist, by calling ListEntries
* Get metadata from auth provider (or self for self-registration): email, phone number.
* Create a random 256-bit long term secret, and register it with Ocrypt.
* Save the public key locally.  Deleted the long term secret from memory if possible.
* Call RegisterVault.

#### AddEntry

AddEntry(userID: string, authToken: bytes, name: string, hpkeBlob: bytes, deletionHash: bytes) -> err

This API either recates or replaces an existing entry in the database.  We have to limit the total database space, so each entry is limited to 1KiB, and each vault is limited to 1024 entries.

#### DeleteEntry

DeleteEntry(userID: string, authToken: bytes, name: string, deletionPreHash: bytes) -> err

Deletion of secrets could be harmeful, and we don't waont someone who simply
has  access to an  unlocked phone to  be  able to detele secets.  To prove that
delietion is intentional, we have a secreet deletion code inside the HPKE blob,
which must be decrypted to get it.  When presented to eVuault server, the
server compares SHA256(deletionPreHash) to deletionHHash, and if equial,
deletes the entry.

#### ListEntries

ListEntries(userID: string, authToken: bytes) -> ([name: string], err)

On success, returns a list of entry names for display in eVaultApp.  Otherwise an error is returned.

#### GetEntries

GetEntries(userID: string, authToken: bytes) -> ([hpkeBlob: bytes], err)

This should only be called after recovery of the long term secret.  Similar to
ListEntries, but returns HPKE blobs for each entry in the eVault.  The
eVaultApp decrypts these and displays the secrets.
