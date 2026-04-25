# Security Spec - Escala BM

## Data Invariants
1. A military record must have a valid name, rank (posto), and assignment (ala/regime).
2. An absence must belong to an existing military record.
3. Users must be authenticated and email-verified to read/write data.
4. Users can only modify data they are authorized for (in this case, we assume any verified user of the organization can manage the roster, or we could restrict to admins if needed. For now, we'll allow all verified users to manage, but restrict PII if any).

## The Dirty Dozen Payloads

### 1. Identity Spoofing (Create military with fake owner/id)
```json
{
  "nome": "Hacker",
  "posto": "SGT",
  "ala": "A",
  "regime": "Ala",
  "status": "Pronto",
  "shadowField": "I am admin" 
}
```
**Expected**: REJECTED (Shadow field detected).

### 2. ID Poisoning (Injection in document ID)
**Path**: `/militaries/../admins/root`
**Expected**: REJECTED (Invalid ID pattern).

### 3. Type Sabotage (Regime as boolean)
```json
{
  "nome": "Silva",
  "posto": "SGT",
  "ala": "A",
  "regime": true,
  "status": "Pronto"
}
```
**Expected**: REJECTED (Invalid type for regime).

### 4. Boundary Violation (Name too long)
```json
{
  "nome": "A".repeat(2000),
  "posto": "SGT",
  "ala": "A",
  "regime": "Ala",
  "status": "Pronto"
}
```
**Expected**: REJECTED (String size limit exceeded).

### 5. State Shortcutting (Setting Inativo without absence)
```json
{
  "nome": "Silva",
  "posto": "SGT",
  "ala": "A",
  "regime": "Ala",
  "status": "Inativo"
}
```
**Expected**: REJECTED (Business logic constraint - status must be valid).

### 6. Relational Orphan (Absence for non-existent military)
**Expected**: REJECTED (Relational integrity check via `exists()`).

### 7. PII Leak (Read military info as unauthenticated)
**Expected**: REJECTED (Auth check failed).

### 8. Denial of Wallet (Large array injection)
```json
{
  "nome": "Silva",
  "posto": "SGT",
  "ala": "A",
  "regime": "Ala",
  "status": "Pronto",
  "tags": ["A"].repeat(1000)
}
```
**Expected**: REJECTED (Shadow field / Size limit).

### 9. Unauthorized Update (Changing immutable fields)
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
**Expected**: REJECTED (Immutability check).

### 10. Temporal Corruption (Client-provided server timestamp)
```json
{
  "updatedAt": "2099-01-01T00:00:00Z"
}
```
**Expected**: REJECTED (Must use `request.time`).

### 11. Array Poisoning (Injecting object into string list)
**Expected**: REJECTED (Type safety check on list elements).

### 12. Query Scraping (Listing all militaries without proper authentication)
**Expected**: REJECTED (Auth check failed).
