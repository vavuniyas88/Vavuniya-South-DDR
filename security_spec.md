# Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied for both read and write.
2. **One-Time Admin Bootstrap**: `/system/init` can be created only once, atomically alongside the first admin's `/users/{uid}` document (`existsAfter` check). No second user can self-assign `admin` once `/system/init` exists.
3. **Strict User Profile Isolation**: Unauthenticated visitors cannot read `/users` or `/duties`. Officers can read only their own `/users/{uid}` profile; only Admins can list/create/edit/delete other user profiles and cannot delete or demote themselves.
4. **Ownership & Role Integrity on Duties**: A duty entry's `userId` must match `request.auth.uid`, and `officerRole` must match the creator's role in `/users/{request.auth.uid}`.
5. **Approval Immutability**: Once a duty reaches `status == 'approved'`, officers cannot edit or delete it. Only Admins can transition `submitted` -> `approved` for officers (`officerRole == 'officer'`).
6. **Officer-Only Admin Reports**: Admin queries (`get`/`list`) on `/duties` are restricted by rule to `officerRole == 'officer'` unless reading the user's own `userId`.

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Self-Admin Escalation after Init**: Authenticated officer attempts `setDoc(/users/{uid}, { role: 'admin', ... })` after `/system/init` exists -> **DENIED**.
2. **Unauthenticated User Listing**: `getDocs(/users)` with `request.auth == null` -> **DENIED**.
3. **Cross-Officer Duty Read**: Officer A attempts `getDoc(/duties/{officerBDuty})` -> **DENIED**.
4. **Officer Direct Approval**: Officer creates duty with `status: 'approved'` -> **DENIED**.
5. **Officer Self-Approval Update**: Officer updates saved duty directly to `status: 'approved'` -> **DENIED**.
6. **Approved Duty Tampering**: Officer attempts `updateDoc` on an `approved` duty -> **DENIED**.
7. **Approved Duty Deletion**: Officer attempts `deleteDoc` on an `approved` duty -> **DENIED**.
8. **Shadow Field Injection**: Payload adds `isSuperUser: true` to `/users` or `/duties` -> **DENIED** via `hasOnly`.
9. **Time Inversion**: Duty payload has `endTime <= startTime` -> **DENIED**.
10. **Oversized ID Poisoning**: Document ID > 128 chars or with invalid characters -> **DENIED** via `isValidId`.
11. **Admin Self-Deletion**: Admin attempts `deleteDoc(/users/{ownUid})` -> **DENIED**.
12. **Client Timestamp Forgery**: Payload uses client clock instead of `request.time` for `createdAt` / `updatedAt` -> **DENIED**.
