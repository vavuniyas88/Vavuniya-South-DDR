import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {auth, db, getSecondaryAuth} from '../firebase.ts';
import type {DutyEntry, DutyStatus, User, UserRole} from '../types.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const INTERNAL_EMAIL_DOMAIN = 'vavuniyasouth.local';
const USERNAME_REGEX = /^[a-z0-9._-]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

let setupMutationInProgress = false;

export function isSetupMutationInProgress(): boolean {
  return setupMutationInProgress;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().slice(0, 60);
}

export function toAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

function nullableTimestampToIso(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return timestampToIso(value);
}

function mapUserDoc(id: string, data: Record<string, unknown>): User {
  return {
    id,
    fullName: typeof data.fullName === 'string' ? data.fullName : '',
    username: typeof data.username === 'string' ? data.username : '',
    email: typeof data.email === 'string' ? data.email : '',
    designation: typeof data.designation === 'string' ? data.designation : '',
    role: data.role === 'admin' ? 'admin' : 'officer',
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function mapDutyDoc(id: string, data: Record<string, unknown>): DutyEntry {
  const status: DutyStatus =
    data.status === 'approved' || data.status === 'submitted' ? data.status : 'saved';
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    date: typeof data.date === 'string' ? data.date : '',
    startTime: typeof data.startTime === 'string' ? data.startTime : '',
    endTime: typeof data.endTime === 'string' ? data.endTime : '',
    description: typeof data.description === 'string' ? data.description : '',
    remarks: typeof data.remarks === 'string' ? data.remarks : '',
    status,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    submittedAt: nullableTimestampToIso(data.submittedAt),
    approvedAt: nullableTimestampToIso(data.approvedAt),
    approvedById: typeof data.approvedById === 'string' ? data.approvedById : null,
    approvedByName: typeof data.approvedByName === 'string' ? data.approvedByName : null,
    officerName: typeof data.officerName === 'string' ? data.officerName : '',
    officerUsername: typeof data.officerUsername === 'string' ? data.officerUsername : '',
    officerDesignation:
      typeof data.officerDesignation === 'string' ? data.officerDesignation : '',
    officerRole: data.officerRole === 'admin' ? 'admin' : 'officer',
  };
}

function sortDuties(duties: DutyEntry[]): DutyEntry[] {
  return [...duties].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });
}

export async function checkNeedsInitialSetup(): Promise<boolean> {
  const path = 'system/init';
  try {
    const snap = await Promise.race([
      getDoc(doc(db, 'system', 'init')),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error('Failed to get document because the client is offline.')), 5000),
      ),
    ]);
    return !snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      return null;
    }
    return mapUserDoc(snap.id, snap.data() as Record<string, unknown>);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function setupInitialAdmin(input: {
  fullName: string;
  username: string;
  designation: string;
  password: string;
}): Promise<User> {
  const fullName = input.fullName.trim().slice(0, 120);
  const username = normalizeUsername(input.username);
  const designation = input.designation.trim().slice(0, 120);
  const password = input.password;

  if (!fullName || !username || !designation || password.length < 6) {
    throw new Error('INVALID_SETUP_INPUT');
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new Error('INVALID_USERNAME_FORMAT');
  }

  const email = toAuthEmail(username);
  setupMutationInProgress = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const batch = writeBatch(db);

    batch.set(doc(db, 'system', 'init'), {
      initialized: true,
      adminUid: uid,
      createdAt: serverTimestamp(),
    });

    batch.set(doc(db, 'users', uid), {
      uid,
      fullName,
      username,
      email,
      designation,
      role: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      // Clean up orphaned Auth user if Firestore rules rejected bootstrap
      await cred.user.delete().catch(() => {});
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }

    const nowIso = new Date().toISOString();
    return {
      id: uid,
      fullName,
      username,
      email,
      designation,
      role: 'admin',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  } finally {
    setupMutationInProgress = false;
  }
}

export async function signInWithUsername(usernameInput: string, password: string): Promise<User> {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) {
    throw new Error('REQUIRED_FIELDS');
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const email = toAuthEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchUserProfile(cred.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error('ACCOUNT_DISABLED');
  }
  return profile;
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}

// --- Admin User Management ---
export function subscribeAllUsers(
  onData: (users: User[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapUserDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
      onData(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function createManagedUser(input: {
  fullName: string;
  username: string;
  designation: string;
  role: UserRole;
  password: string;
}): Promise<User> {
  const fullName = input.fullName.trim().slice(0, 120);
  const username = normalizeUsername(input.username);
  const designation = input.designation.trim().slice(0, 120);
  const role: UserRole = input.role === 'admin' ? 'admin' : 'officer';
  const password = input.password;

  if (!fullName || !username || !designation || password.length < 6) {
    throw new Error('INVALID_USER_INPUT');
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new Error('INVALID_USERNAME_FORMAT');
  }

  const email = toAuthEmail(username);
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const newUid = cred.user.uid;
  await signOut(secondaryAuth);

  const path = `users/${newUid}`;
  try {
    await setDoc(doc(db, 'users', newUid), {
      uid: newUid,
      fullName,
      username,
      email,
      designation,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const nowIso = new Date().toISOString();
  return {
    id: newUid,
    fullName,
    username,
    email,
    designation,
    role,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function updateManagedUser(
  targetUid: string,
  input: {
    fullName: string;
    designation: string;
    role: UserRole;
  },
): Promise<void> {
  const fullName = input.fullName.trim().slice(0, 120);
  const designation = input.designation.trim().slice(0, 120);
  const role: UserRole = input.role === 'admin' ? 'admin' : 'officer';

  if (!fullName || !designation) {
    throw new Error('INVALID_USER_INPUT');
  }

  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      fullName,
      designation,
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteManagedUser(targetUid: string): Promise<void> {
  const dutiesSnap = await getDocs(
    query(collection(db, 'duties'), where('userId', '==', targetUid)),
  ).catch((err) => handleFirestoreError(err, OperationType.LIST, 'duties'));

  const batch = writeBatch(db);
  for (const dutyDoc of dutiesSnap.docs) {
    batch.delete(dutyDoc.ref);
  }
  batch.delete(doc(db, 'users', targetUid));

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
  }
}

// --- Officer Duties ---
export function subscribeOfficerDuties(
  officerUid: string,
  onData: (duties: DutyEntry[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = 'duties';
  const q = query(collection(db, path), where('userId', '==', officerUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = sortDuties(
        snapshot.docs.map((d) => mapDutyDoc(d.id, d.data() as Record<string, unknown>)),
      );
      onData(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export function subscribeOfficerDutiesForAdmin(
  onData: (duties: DutyEntry[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = 'duties';
  const q = query(collection(db, path), where('officerRole', '==', 'officer'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = sortDuties(
        snapshot.docs.map((d) => mapDutyDoc(d.id, d.data() as Record<string, unknown>)),
      );
      onData(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function createDutyEntries(
  user: User,
  date: string,
  entries: Array<{
    startTime: string;
    endTime: string;
    description: string;
    remarks: string;
  }>,
): Promise<void> {
  if (!DATE_REGEX.test(date)) {
    throw new Error('INVALID_DATE');
  }
  if (entries.length === 0 || entries.length > 50) {
    throw new Error('INVALID_ENTRY_COUNT');
  }

  const batch = writeBatch(db);
  for (const item of entries) {
    const startTime = item.startTime.trim().slice(0, 5);
    const endTime = item.endTime.trim().slice(0, 5);
    const description = item.description.trim().slice(0, 1000);
    const remarks = item.remarks.trim().slice(0, 500);

    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime) || endTime <= startTime) {
      throw new Error('INVALID_TIME_RANGE');
    }
    if (!description) {
      throw new Error('EMPTY_DESCRIPTION');
    }

    const newRef = doc(collection(db, 'duties'));
    batch.set(newRef, {
      userId: user.id,
      officerName: user.fullName.slice(0, 120),
      officerUsername: user.username.slice(0, 60),
      officerDesignation: user.designation.slice(0, 120),
      officerRole: user.role,
      date,
      startTime,
      endTime,
      description,
      remarks,
      status: 'saved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      submittedAt: null,
      approvedAt: null,
      approvedById: null,
      approvedByName: null,
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'duties');
  }
}

export async function updateDutyEntry(
  dutyId: string,
  input: {
    startTime: string;
    endTime: string;
    description: string;
    remarks: string;
  },
): Promise<void> {
  const startTime = input.startTime.trim().slice(0, 5);
  const endTime = input.endTime.trim().slice(0, 5);
  const description = input.description.trim().slice(0, 1000);
  const remarks = input.remarks.trim().slice(0, 500);

  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime) || endTime <= startTime) {
    throw new Error('INVALID_TIME_RANGE');
  }
  if (!description) {
    throw new Error('EMPTY_DESCRIPTION');
  }

  const path = `duties/${dutyId}`;
  try {
    await updateDoc(doc(db, 'duties', dutyId), {
      startTime,
      endTime,
      description,
      remarks,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteDutyEntry(dutyId: string): Promise<void> {
  const path = `duties/${dutyId}`;
  try {
    await deleteDoc(doc(db, 'duties', dutyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function submitDutyEntries(dutyIds: string[]): Promise<void> {
  if (dutyIds.length === 0) {
    return;
  }
  const batch = writeBatch(db);
  for (const id of dutyIds) {
    batch.update(doc(db, 'duties', id), {
      status: 'submitted',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'duties');
  }
}

export async function approveDutyEntries(dutyIds: string[], adminUser: User): Promise<void> {
  if (dutyIds.length === 0) {
    return;
  }
  const batch = writeBatch(db);
  for (const id of dutyIds) {
    batch.update(doc(db, 'duties', id), {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedById: adminUser.id,
      approvedByName: adminUser.fullName.slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'duties');
  }
}
