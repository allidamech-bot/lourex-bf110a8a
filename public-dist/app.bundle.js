/* src/lib/defaults.js */
const APP_SCHEMA_VERSION = 1;
const KDF_ITERATIONS = 310_000;
function defaultCompany() {
    return {
        nameEn: 'LOUREX', nameAr: '', logoDataUrl: LOUREX_BRAND,
        addressEn: '', addressAr: '', city: '', country: '', phone: '', email: '', website: '',
        vatNumber: '', taxNumber: '', commercialRegistration: '',
        bank: { bankName: '', accountName: 'LOUREX', iban: '', swift: '', currency: 'USD' },
        signatureDataUrl: '', stampDataUrl: '', defaultCurrency: 'USD', defaultLanguage: 'en',
        defaultPaymentTerms: '', defaultIncoterm: '', defaultDeliveryTime: '', defaultValidityDays: 7,
        defaultFooterText: 'LOUREX • Import • Export • International Trade', defaultNotes: ''
    };
}
function defaultAppSettings() {
    return { autoLockMinutes: 15, numbering: { proformaPrefix: 'PI', invoicePrefix: 'INV', proformaLast: 0, invoiceLast: 0, proformaYear: new Date().getFullYear(), invoiceYear: new Date().getFullYear() } };
}
function emptyVault() {
    return { schemaVersion: APP_SCHEMA_VERSION, company: defaultCompany(), appSettings: defaultAppSettings(), customers: [], documents: [] };
}
function customerSnapshotFrom(customer) {
    return {
        sourceCustomerId: customer.id, companyNameEn: customer.companyNameEn, companyNameAr: customer.companyNameAr,
        contactPerson: customer.contactPerson, addressEn: customer.addressEn, addressAr: customer.addressAr, city: customer.city,
        country: customer.country, phone: customer.phone, email: customer.email, vatTaxNumber: customer.vatTaxNumber,
        commercialRegistration: customer.commercialRegistration
    };
}
function companySnapshotFrom(company) {
    return {
        nameEn: company.nameEn, nameAr: company.nameAr, logoDataUrl: company.logoDataUrl,
        addressEn: company.addressEn, addressAr: company.addressAr, city: company.city, country: company.country,
        phone: company.phone, email: company.email, website: company.website, vatNumber: company.vatNumber,
        taxNumber: company.taxNumber, commercialRegistration: company.commercialRegistration,
        bank: { ...company.bank }, signatureDataUrl: company.signatureDataUrl, stampDataUrl: company.stampDataUrl,
        footerText: company.defaultFooterText
    };
}
/* src/lib/id.js */
function makeId(prefix) {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.randomUUID)
        return `${prefix}_${cryptoObj.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
function todayIso() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}
function addDaysIso(iso, days) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}
function displayDate(iso, language) {
    if (!iso)
        return '';
    const locale = language === 'ar' ? 'ar-SA' : 'en-GB';
    try {
        return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
    }
    catch {
        return iso;
    }
}
function safeFilename(value) {
    return value.normalize('NFKD').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'Document';
}
/* src/lib/money.js */
const SCALE = 10000n;
const MONEY_SCALE = 100n;
function pow10(n) { let v = 1n; for (let i = 0; i < n; i += 1)
    v *= 10n; return v; }
function decimalToScaled(input, decimals = 4) {
    const cleaned = (input || '0').trim().replace(/,/g, '');
    if (!/^-?\d*(\.\d*)?$/.test(cleaned))
        return 0n;
    const negative = cleaned.startsWith('-');
    const raw = negative ? cleaned.slice(1) : cleaned;
    const [wholeRaw = '0', fracRaw = ''] = raw.split('.');
    const whole = BigInt(wholeRaw || '0');
    const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
    const result = whole * pow10(decimals) + BigInt(frac || '0');
    return negative ? -result : result;
}
function scaled4ToMoney2(value) {
    const sign = value < 0n ? -1n : 1n;
    const abs = value < 0n ? -value : value;
    const rounded = (abs + 50n) / 100n;
    return rounded * sign;
}
function money2ToString(cents) {
    const sign = cents < 0n ? '-' : '';
    const abs = cents < 0n ? -cents : cents;
    return `${sign}${abs / MONEY_SCALE}.${(abs % MONEY_SCALE).toString().padStart(2, '0')}`;
}
function lineTotal(quantity, unitPrice) {
    const q = decimalToScaled(quantity);
    const p = decimalToScaled(unitPrice);
    const scaled4 = (q * p + SCALE / 2n) / SCALE;
    return money2ToString(scaled4ToMoney2(scaled4));
}
function calculateTotals(items, a) {
    let subtotal = 0n;
    for (const item of items)
        subtotal += decimalToScaled(lineTotal(item.quantity, item.unitPrice), 2);
    let discount = 0n;
    if (a.discountEnabled) {
        if (a.discountMode === 'fixed')
            discount = decimalToScaled(a.discountValue, 2);
        else {
            const percent4 = decimalToScaled(a.discountValue, 4);
            discount = (subtotal * percent4 + 500000n) / 1000000n;
        }
        if (discount < 0n)
            discount = 0n;
        if (discount > subtotal)
            discount = subtotal;
    }
    const shipping = a.shippingEnabled ? decimalToScaled(a.shipping, 2) : 0n;
    const otherCharges = a.otherChargesEnabled ? decimalToScaled(a.otherCharges, 2) : 0n;
    const taxable = subtotal - discount + shipping + otherCharges;
    let tax = 0n;
    if (a.taxEnabled) {
        const percent4 = decimalToScaled(a.taxPercent, 4);
        tax = (taxable * percent4 + 500000n) / 1000000n;
    }
    const grand = taxable + tax;
    return {
        subtotal: money2ToString(subtotal), discount: money2ToString(discount), shipping: money2ToString(shipping),
        otherCharges: money2ToString(otherCharges), tax: money2ToString(tax), grandTotal: money2ToString(grand)
    };
}
function formatMoney(value, currency) {
    const n = Number(value || 0);
    if (!Number.isFinite(n))
        return `${currency} 0.00`;
    try {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ` ${currency}`;
    }
    catch {
        return `${n.toFixed(2)} ${currency}`;
    }
}
/* src/lib/files.js */
function fileToDataUrl(file, maxBytes = 4 * 1024 * 1024) {
    if (file.size > maxBytes)
        return Promise.reject(new Error('Image is too large. Please use a file smaller than 4 MB.'));
    if (!/^image\/(png|webp|jpeg|svg\+xml)$/i.test(file.type))
        return Promise.reject(new Error('Use PNG, WebP, JPEG, or SVG image files.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read image file.'));
        reader.readAsDataURL(file);
    });
}
/* src/storage/db.js */
const DB_NAME = 'lourex-invoice';
const DB_VERSION = 1;
const STORE = 'records';
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE))
                db.createObjectStore(STORE, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
    });
}
async function getRecord(id) {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed.'));
        });
    }
    finally {
        db.close();
    }
}
async function putRecord(record) {
    const db = await openDb();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(record);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed.'));
            tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted.'));
        });
    }
    finally {
        db.close();
    }
}
async function putSecurityAndVault(security, vault) {
    const db = await openDb();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            store.put(security);
            store.put(vault);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('Unable to commit encrypted data.'));
            tx.onabort = () => reject(tx.error ?? new Error('Encrypted data transaction aborted.'));
        });
    }
    finally {
        db.close();
    }
}
async function hasSecurity() { return Boolean(await getRecord('security')); }
async function getSecurity() { return getRecord('security'); }
async function getEncryptedVault() { return getRecord('vault'); }
async function clearDatabase() {
    await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error('Unable to clear local database.'));
        req.onblocked = () => reject(new Error('Database is currently in use.'));
    });
}
/* src/crypto/crypto.js */

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const VERIFY_TEXT = 'LOUREX-VAULT-VERIFIER-v1';
function bytesToB64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1)
        binary += String.fromCharCode(bytes[i] ?? 0);
    return btoa(binary);
}
function b64ToBytes(value) {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1)
        out[i] = binary.charCodeAt(i);
    return out;
}
function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}
async function deriveKey(pin, salt, iterations = KDF_ITERATIONS) {
    const base = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptBytes(key, plain) {
    const iv = randomBytes(12);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain);
    return { iv: bytesToB64(iv), cipher: bytesToB64(new Uint8Array(cipher)) };
}
async function decryptBytes(key, ivB64, cipherB64) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(ivB64) }, key, b64ToBytes(cipherB64));
    return new Uint8Array(plain);
}
async function createSecurity(pin) {
    if (!/^\d{4,12}$/.test(pin))
        throw new Error('PIN must contain 4–12 digits.');
    const salt = randomBytes(24);
    const key = await deriveKey(pin, salt);
    const verification = await encryptBytes(key, encoder.encode(VERIFY_TEXT));
    return {
        metadata: { id: 'security', version: 1, iterations: KDF_ITERATIONS, salt: bytesToB64(salt), verifierIv: verification.iv, verifierCipher: verification.cipher },
        key
    };
}
async function verifyPin(pin, metadata) {
    const key = await deriveKey(pin, b64ToBytes(metadata.salt), metadata.iterations);
    try {
        const plain = await decryptBytes(key, metadata.verifierIv, metadata.verifierCipher);
        if (decoder.decode(plain) !== VERIFY_TEXT)
            throw new Error('Wrong PIN');
        return key;
    }
    catch {
        throw new Error('Wrong PIN');
    }
}
async function encryptVault(key, vault) {
    const payload = await encryptBytes(key, encoder.encode(JSON.stringify(vault)));
    return { id: 'vault', schemaVersion: vault.schemaVersion, iv: payload.iv, cipher: payload.cipher, updatedAt: new Date().toISOString() };
}
async function decryptVault(key, record) {
    const plain = await decryptBytes(key, record.iv, record.cipher);
    return JSON.parse(decoder.decode(plain));
}
async function createEncryptedBackup(pin, vault) {
    if (!pin)
        throw new Error('PIN is required to encrypt the backup.');
    const salt = randomBytes(24);
    const iterations = KDF_ITERATIONS;
    const key = await deriveKey(pin, salt, iterations);
    const encrypted = await encryptBytes(key, encoder.encode(JSON.stringify(vault)));
    return {
        format: 'LOUREX_BACKUP', version: 1, createdAt: new Date().toISOString(),
        kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: bytesToB64(salt) },
        cipher: { name: 'AES-GCM', iv: encrypted.iv, data: encrypted.cipher }
    };
}
async function decryptBackup(pin, file) {
    if (file.format !== 'LOUREX_BACKUP' || file.version !== 1 || file.kdf?.name !== 'PBKDF2' || file.cipher?.name !== 'AES-GCM')
        throw new Error('Invalid LOUREX backup file.');
    const key = await deriveKey(pin, b64ToBytes(file.kdf.salt), file.kdf.iterations);
    try {
        const plain = await decryptBytes(key, file.cipher.iv, file.cipher.data);
        return JSON.parse(decoder.decode(plain));
    }
    catch {
        throw new Error('Backup password/PIN is incorrect or the file is corrupted.');
    }
}
/* src/storage/vault.js */



async function setupVault(pin, initial = emptyVault()) {
    const { metadata, key } = await createSecurity(pin);
    const encrypted = await encryptVault(key, initial);
    await putSecurityAndVault(metadata, encrypted);
    return { key, vault: initial };
}
function migrateVault(vault) {
    if (!vault || typeof vault !== 'object')
        throw new Error('Local data is corrupted.');
    if ((vault.schemaVersion ?? 0) > APP_SCHEMA_VERSION)
        throw new Error('This data was created by a newer LOUREX Invoice version.');
    const defaults = emptyVault();
    const migrated = { ...defaults, ...vault, schemaVersion: APP_SCHEMA_VERSION };
    migrated.company = { ...defaults.company, ...(vault.company ?? {}), bank: { ...defaults.company.bank, ...(vault.company?.bank ?? {}) } };
    migrated.appSettings = { ...defaults.appSettings, ...(vault.appSettings ?? {}), numbering: { ...defaults.appSettings.numbering, ...(vault.appSettings?.numbering ?? {}) } };
    migrated.customers = Array.isArray(vault.customers) ? vault.customers : [];
    migrated.documents = Array.isArray(vault.documents) ? vault.documents : [];
    const unique = (values, label) => {
        const seen = new Set();
        for (const id of values) {
            if (!id || seen.has(id))
                throw new Error(`Local data contains duplicate or invalid ${label} IDs.`);
            seen.add(id);
        }
    };
    for (const customer of migrated.customers) {
        if (!customer || typeof customer !== 'object' || typeof customer.id !== 'string' || (typeof customer.companyNameEn !== 'string' && typeof customer.companyNameAr !== 'string'))
            throw new Error('Local data contains an invalid customer record.');
    }
    for (const document of migrated.documents) {
        if (!document || typeof document !== 'object' || typeof document.id !== 'string' || (document.kind !== 'proforma' && document.kind !== 'invoice') || typeof document.number !== 'string' || !Array.isArray(document.items))
            throw new Error('Local data contains an invalid document record.');
        for (const item of document.items)
            if (!item || typeof item !== 'object' || typeof item.id !== 'string')
                throw new Error('Local data contains an invalid document item.');
    }
    unique(migrated.customers.map(c => c.id), 'customer');
    unique(migrated.documents.map(d => d.id), 'document');
    for (const document of migrated.documents)
        unique(document.items.map(i => i.id), 'item');
    return migrated;
}
async function unlockVault(pin) {
    const security = await getSecurity();
    const encrypted = await getEncryptedVault();
    if (!security || !encrypted)
        throw new Error('LOUREX Invoice has not been set up on this device.');
    const key = await verifyPin(pin, security);
    const vault = migrateVault(await decryptVault(key, encrypted));
    return { key, vault, security };
}
async function saveVault(key, vault) {
    try {
        await putRecord(await encryptVault(key, { ...vault, schemaVersion: APP_SCHEMA_VERSION }));
    }
    catch (error) {
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'UnknownError'))
            throw new Error('Local storage is full. Export a backup and free device storage.');
        throw error;
    }
}
async function restoreVaultWithCurrentKey(key, vault) {
    const migrated = migrateVault(vault);
    await saveVault(key, migrated);
    return migrated;
}
async function changePin(currentPin, newPin) {
    const unlocked = await unlockVault(currentPin);
    const { metadata, key } = await createSecurity(newPin);
    const encrypted = await encryptVault(key, unlocked.vault);
    await putSecurityAndVault(metadata, encrypted);
    return { key, security: metadata };
}
async function replaceVaultWithPin(pin, vault) {
    const migrated = migrateVault(vault);
    const { metadata, key } = await createSecurity(pin);
    const encrypted = await encryptVault(key, migrated);
    await putSecurityAndVault(metadata, encrypted);
    return { key, security: metadata, vault: migrated };
}
/* src/lib/documents.js */


function nextDocumentNumber(vault, kind) {
    const year = new Date().getFullYear();
    const numbering = { ...vault.appSettings.numbering };
    if (kind === 'proforma') {
        if (numbering.proformaYear !== year) {
            numbering.proformaYear = year;
            numbering.proformaLast = 0;
        }
        numbering.proformaLast += 1;
    }
    else {
        if (numbering.invoiceYear !== year) {
            numbering.invoiceYear = year;
            numbering.invoiceLast = 0;
        }
        numbering.invoiceLast += 1;
    }
    const seq = kind === 'proforma' ? numbering.proformaLast : numbering.invoiceLast;
    const prefix = kind === 'proforma' ? numbering.proformaPrefix : numbering.invoicePrefix;
    return {
        number: `${prefix}-${year}-${String(seq).padStart(4, '0')}`,
        vault: { ...vault, appSettings: { ...vault.appSettings, numbering } }
    };
}
function emptyItem() {
    return { id: makeId('item'), descriptionEn: '', descriptionAr: '', hsCode: '', origin: '', packing: '', quantity: '1', unit: 'Carton', unitPrice: '0.00' };
}
function createBlankDocument(kind, number, company) {
    const issueDate = todayIso();
    return {
        id: makeId('doc'), kind, status: 'draft', number, issueDate,
        dueDate: kind === 'proforma' ? addDaysIso(issueDate, company.defaultValidityDays) : '',
        currency: company.defaultCurrency, language: company.defaultLanguage, customerSnapshot: null,
        companySnapshot: companySnapshotFrom(company), items: [emptyItem()],
        terms: { incoterm: company.defaultIncoterm, paymentTerms: company.defaultPaymentTerms, packing: '', deliveryTime: company.defaultDeliveryTime, portOfLoading: '', finalDestination: '', countryOfOrigin: '', validity: '', remarks: '' },
        adjustments: { discountEnabled: false, discountMode: 'fixed', discountValue: '0.00', shippingEnabled: false, shipping: '0.00', otherChargesEnabled: false, otherCharges: '0.00', taxEnabled: false, taxPercent: '0' },
        appearance: { templateId: 'executive', accentColor: '#b58b4f', showBank: true, showSignature: true, showStamp: false, showHsCode: true, showOrigin: true, showPacking: false },
        notes: company.defaultNotes, convertedFromId: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
}
function validateDocument(doc) {
    const errors = {};
    if (!doc.number.trim())
        errors.number = 'Document number is required.';
    if (!doc.issueDate)
        errors.issueDate = 'Issue date is required.';
    if (!doc.customerSnapshot?.companyNameEn.trim() && !doc.customerSnapshot?.companyNameAr.trim())
        errors.customer = 'Select a customer.';
    if (doc.items.length < 1)
        errors.items = 'Add at least one item.';
    doc.items.forEach((item, index) => {
        const desc = doc.language === 'ar' ? item.descriptionAr : item.descriptionEn || item.descriptionAr;
        if (!desc.trim())
            errors[`item-${index}-description`] = 'Description is required.';
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        if (!Number.isFinite(qty) || qty <= 0)
            errors[`item-${index}-quantity`] = 'Quantity must be greater than 0.';
        if (!Number.isFinite(price) || price < 0)
            errors[`item-${index}-price`] = 'Unit price must be 0 or greater.';
    });
    const nonNegative = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
    if (doc.adjustments.discountEnabled && !nonNegative(doc.adjustments.discountValue))
        errors.discount = 'Discount must be 0 or greater.';
    if (doc.adjustments.shippingEnabled && !nonNegative(doc.adjustments.shipping))
        errors.shipping = 'Shipping must be 0 or greater.';
    if (doc.adjustments.otherChargesEnabled && !nonNegative(doc.adjustments.otherCharges))
        errors.otherCharges = 'Other charges must be 0 or greater.';
    if (doc.adjustments.taxEnabled && !nonNegative(doc.adjustments.taxPercent))
        errors.tax = 'Tax must be 0 or greater.';
    return errors;
}
function duplicateDocument(source, number) {
    const now = new Date().toISOString();
    const issueDate = todayIso();
    let dueDate = source.kind === 'invoice' ? '' : source.dueDate;
    if (source.kind === 'proforma' && source.issueDate && source.dueDate) {
        const start = new Date(`${source.issueDate}T12:00:00`).getTime();
        const end = new Date(`${source.dueDate}T12:00:00`).getTime();
        const days = Math.max(0, Math.round((end - start) / 86_400_000));
        dueDate = addDaysIso(issueDate, days);
    }
    return { ...structuredClone(source), id: makeId('doc'), number, issueDate, dueDate, status: 'draft', convertedFromId: '', createdAt: now, updatedAt: now, items: source.items.map(i => ({ ...structuredClone(i), id: makeId('item') })) };
}
function convertToInvoice(source, number) {
    const d = duplicateDocument(source, number);
    return { ...d, kind: 'invoice', convertedFromId: source.id, dueDate: '', status: 'draft' };
}
function refreshCompanySnapshot(doc, company) {
    return { ...doc, companySnapshot: companySnapshotFrom(company), updatedAt: new Date().toISOString() };
}
function paginateItems(items, reserveFinalDetails = true) {
    const pages = [];
    let current = [];
    let used = 0;
    const weightOf = (item) => {
        const text = `${item.descriptionEn} ${item.descriptionAr}`.trim();
        return Math.max(1, Math.ceil(text.length / 95));
    };
    const capacity = () => pages.length === 0 ? 7 : 13;
    for (const item of items) {
        const weight = weightOf(item);
        if (current.length && used + weight > capacity()) {
            pages.push(current);
            current = [];
            used = 0;
        }
        current.push(item);
        used += weight;
    }
    if (current.length || pages.length === 0)
        pages.push(current);
    // The final page also contains totals, terms, notes, bank details and signing.
    // Keep a conservative item budget there so those blocks cannot overlap or be clipped.
    const finalBudget = 6;
    const last = pages[pages.length - 1] ?? [];
    const lastWeight = last.reduce((sum, item) => sum + weightOf(item), 0);
    if (reserveFinalDetails && last.length > 1 && lastWeight > finalBudget) {
        let finalWeight = 0;
        let splitAt = last.length;
        for (let i = last.length - 1; i >= 0; i -= 1) {
            const w = weightOf(last[i]);
            if (finalWeight + w > finalBudget && splitAt < last.length)
                break;
            finalWeight += w;
            splitAt = i;
            if (finalWeight >= finalBudget)
                break;
        }
        if (splitAt > 0) {
            pages[pages.length - 1] = last.slice(0, splitAt);
            pages.push(last.slice(splitAt));
        }
    }
    return pages;
}
/* src/lib/backup.js */

async function exportBackup(pin, vault) {
    const data = await createEncryptedBackup(pin, vault);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/x-lourex-backup' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOUREX-Backup-${new Date().toISOString().slice(0, 10)}.lourex-backup`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function readBackup(file, pin) {
    if (file.size > 50 * 1024 * 1024)
        throw new Error('Backup file is too large.');
    let parsed;
    try {
        parsed = JSON.parse(await file.text());
    }
    catch {
        throw new Error('Backup file is not valid JSON.');
    }
    const candidate = parsed;
    if (candidate.format !== 'LOUREX_BACKUP' || candidate.version !== 1)
        throw new Error('This is not a valid LOUREX backup.');
    return decryptBackup(pin, candidate);
}
/* src/components/UI.js */
const paths = {
    plus: React.createElement("g", null,
        React.createElement("path", { d: "M12 5v14M5 12h14" })), settings: React.createElement("g", null,
        React.createElement("circle", { cx: "12", cy: "12", r: "3" }),
        React.createElement("path", { d: "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.4.6.8 1 1 .3.2.7.3 1.1.3h.1v4h-.1a1.7 1.7 0 0 0-2.1.7Z" })),
    search: React.createElement("g", null,
        React.createElement("circle", { cx: "11", cy: "11", r: "7" }),
        React.createElement("path", { d: "m20 20-4-4" })), file: React.createElement("g", null,
        React.createElement("path", { d: "M6 2h8l4 4v16H6z" }),
        React.createElement("path", { d: "M14 2v5h5" })), users: React.createElement("g", null,
        React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
        React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
        React.createElement("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" })),
    save: React.createElement("g", null,
        React.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" }),
        React.createElement("path", { d: "M17 21v-8H7v8M7 3v5h8" })), download: React.createElement("g", null,
        React.createElement("path", { d: "M12 3v12m0 0 5-5m-5 5-5-5" }),
        React.createElement("path", { d: "M5 21h14" })), share: React.createElement("g", null,
        React.createElement("circle", { cx: "18", cy: "5", r: "3" }),
        React.createElement("circle", { cx: "6", cy: "12", r: "3" }),
        React.createElement("circle", { cx: "18", cy: "19", r: "3" }),
        React.createElement("path", { d: "m8.6 10.5 6.8-4M8.6 13.5l6.8 4" })), copy: React.createElement("g", null,
        React.createElement("rect", { x: "9", y: "9", width: "12", height: "12", rx: "2" }),
        React.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })), trash: React.createElement("g", null,
        React.createElement("path", { d: "M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" })), edit: React.createElement("g", null,
        React.createElement("path", { d: "M12 20h9" }),
        React.createElement("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" })), lock: React.createElement("g", null,
        React.createElement("rect", { x: "4", y: "10", width: "16", height: "11", rx: "2" }),
        React.createElement("path", { d: "M8 10V7a4 4 0 0 1 8 0v3" })), x: React.createElement("g", null,
        React.createElement("path", { d: "m6 6 12 12M18 6 6 18" })), chevronDown: React.createElement("g", null,
        React.createElement("path", { d: "m6 9 6 6 6-6" })), chevronUp: React.createElement("g", null,
        React.createElement("path", { d: "m18 15-6-6-6 6" })), arrowLeft: React.createElement("g", null,
        React.createElement("path", { d: "M19 12H5M12 19l-7-7 7-7" })), printer: React.createElement("g", null,
        React.createElement("path", { d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
        React.createElement("rect", { x: "6", y: "14", width: "12", height: "8" })),
    check: React.createElement("g", null,
        React.createElement("path", { d: "m5 12 4 4L19 6" })), more: React.createElement("g", null,
        React.createElement("circle", { cx: "5", cy: "12", r: "1" }),
        React.createElement("circle", { cx: "12", cy: "12", r: "1" }),
        React.createElement("circle", { cx: "19", cy: "12", r: "1" })), eye: React.createElement("g", null,
        React.createElement("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" }),
        React.createElement("circle", { cx: "12", cy: "12", r: "3" })), upload: React.createElement("g", null,
        React.createElement("path", { d: "M12 16V4m0 0L7 9m5-5 5 5" }),
        React.createElement("path", { d: "M5 20h14" })), backup: React.createElement("g", null,
        React.createElement("path", { d: "M4 7v4h4M20 17v-4h-4" }),
        React.createElement("path", { d: "M6.1 16A7 7 0 1 0 5 8.3M17.9 8A7 7 0 0 0 19 15.7" })), restore: React.createElement("g", null,
        React.createElement("path", { d: "M3 12a9 9 0 1 0 3-6.7L3 8" }),
        React.createElement("path", { d: "M3 3v5h5M12 7v5l3 2" })), refresh: React.createElement("g", null,
        React.createElement("path", { d: "M20 11a8 8 0 0 0-14.9-4L3 10M4 13a8 8 0 0 0 14.9 4L21 14" }),
        React.createElement("path", { d: "M3 4v6h6M21 20v-6h-6" })), invoice: React.createElement("g", null,
        React.createElement("path", { d: "M6 2h9l4 4v16H6z" }),
        React.createElement("path", { d: "M15 2v5h5M9 11h7M9 15h7M9 19h4" })), proforma: React.createElement("g", null,
        React.createElement("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
        React.createElement("path", { d: "M7 8h10M7 12h5M7 16h3" })), menu: React.createElement("g", null,
        React.createElement("path", { d: "M4 6h16M4 12h16M4 18h16" }))
};
function Icon({ name, size = 18, className = '' }) {
    return React.createElement("svg", { className: `icon ${className}`, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, paths[name]);
}
function Button({ children, icon, variant = 'secondary', className = '', ...rest }) {
    return React.createElement("button", { className: `btn btn-${variant} ${className}`, ...rest },
        icon ? React.createElement(Icon, { name: icon }) : null,
        React.createElement("span", null, children));
}
function IconButton({ icon, label, variant = 'ghost', ...rest }) {
    return React.createElement("button", { className: `icon-btn icon-btn-${variant}`, "aria-label": label, title: label, ...rest },
        React.createElement(Icon, { name: icon }));
}
function Field({ label, error, hint, children, className = '' }) {
    return React.createElement("label", { className: `field ${className}` },
        React.createElement("span", { className: "field-label" }, label),
        children,
        error ? React.createElement("span", { className: "field-error" }, error) : hint ? React.createElement("span", { className: "field-hint" }, hint) : null);
}
function Input(props) { return React.createElement("input", { className: `input ${props.className ?? ''}`, ...props }); }
function Select(props) { return React.createElement("select", { className: `input select ${props.className ?? ''}`, ...props }); }
function Textarea(props) { return React.createElement("textarea", { className: `input textarea ${props.className ?? ''}`, ...props }); }
function Toggle({ checked, onChange, label }) {
    return React.createElement("label", { className: "toggle-row" },
        React.createElement("button", { type: "button", role: "switch", "aria-checked": checked, className: `toggle ${checked ? 'on' : ''}`, onClick: () => onChange(!checked) },
            React.createElement("span", null)),
        React.createElement("span", null, label));
}
function Modal({ open, title, children, onClose, size = 'md', footer }) {
    if (!open)
        return null;
    return React.createElement("div", { className: "modal-backdrop", role: "presentation", onMouseDown: (e) => { if (e.target === e.currentTarget)
            onClose(); } },
        React.createElement("section", { className: `modal modal-${size}`, role: "dialog", "aria-modal": "true", "aria-label": title },
            React.createElement("header", { className: "modal-header" },
                React.createElement("h2", null, title),
                React.createElement(IconButton, { icon: "x", label: "Close", onClick: onClose })),
            React.createElement("div", { className: "modal-body" }, children),
            footer ? React.createElement("footer", { className: "modal-footer" }, footer) : null));
}
function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', destructive = true, onCancel, onConfirm }) {
    return React.createElement(Modal, { open: open, title: title, size: "sm", onClose: onCancel, footer: React.createElement("div", { className: "modal-footer-actions" },
            React.createElement(Button, { onClick: onCancel }, "Cancel"),
            React.createElement(Button, { variant: destructive ? 'danger' : 'primary', onClick: onConfirm }, confirmLabel)) },
        React.createElement("p", { className: "modal-message" }, message));
}
function Segmented({ value, options, onChange }) {
    return React.createElement("div", { className: "segmented" }, options.map(o => React.createElement("button", { type: "button", key: o.value, className: value === o.value ? 'active' : '', onClick: () => onChange(o.value) }, o.label)));
}
function Brand({ compact = false }) {
    return React.createElement("div", { className: `brand official-brand ${compact ? 'compact' : ''}` },
        React.createElement("span", { className: "brand-mark" },
            React.createElement("img", { src: LOUREX_BRAND, alt: "" })),
        React.createElement("span", { className: "brand-words" },
            React.createElement("strong", null, "LOUREX"),
            compact ? null : React.createElement("small", null, "IMPORT \u2022 EXPORT \u2022 INTERNATIONAL TRADE")));
}
function Toast({ text, tone = 'default' }) {
    if (!text)
        return null;
    return React.createElement("div", { className: `toast toast-${tone}`, role: "status" },
        tone === 'success' ? React.createElement(Icon, { name: "check" }) : null,
        React.createElement("span", null, text));
}
/* src/components/AuthScreens.js */


class SetupScreen extends React.Component {
    state = { welcome: true, step: 1, pin: '', confirm: '', company: this.props.initialCompany, error: '', busy: false };
    updateCompany = (key, value) => this.setState({ company: { ...this.state.company, [key]: value } });
    updateBank = (key, value) => this.setState({ company: { ...this.state.company, bank: { ...this.state.company.bank, [key]: value } } });
    upload = async (field, file) => {
        if (!file)
            return;
        try {
            const data = await fileToDataUrl(file);
            this.updateCompany(field, data);
        }
        catch (e) {
            this.setState({ error: e instanceof Error ? e.message : 'Unable to read image.' });
        }
    };
    next = () => {
        if (this.state.step === 1) {
            if (!/^\d{4,12}$/.test(this.state.pin))
                return this.setState({ error: 'Use a 4–12 digit PIN.' });
            if (this.state.pin !== this.state.confirm)
                return this.setState({ error: 'PIN confirmation does not match.' });
            this.setState({ step: 2, error: '' });
            return;
        }
        if (this.state.step === 2) {
            if (!this.state.company.nameEn.trim())
                return this.setState({ error: 'Company name is required.' });
            this.setState({ step: 3, error: '' });
            return;
        }
    };
    finish = async () => {
        this.setState({ busy: true, error: '' });
        try {
            await this.props.onFinish(this.state.pin, this.state.company);
        }
        catch (e) {
            this.setState({ error: e instanceof Error ? e.message : 'Setup failed.', busy: false });
        }
    };
    render() {
        const { step, company, busy, error } = this.state;
        if (this.state.welcome)
            return React.createElement("div", { className: "auth-page" },
                React.createElement("div", { className: "auth-card unlock-card welcome-card" },
                    React.createElement(Brand, null),
                    React.createElement("p", { className: "eyebrow" }, "LOUREX Invoice"),
                    React.createElement("h1", null, "Welcome."),
                    React.createElement("p", { className: "subtle" }, "Create, save and share professional Proforma Invoices and Invoices. Everything stays on this device."),
                    React.createElement(Button, { variant: "primary", onClick: () => this.setState({ welcome: false }) }, "Set Up"),
                    React.createElement("p", { className: "security-note" }, "Local-first \u00B7 Encrypted \u00B7 No cloud account")));
        return React.createElement("div", { className: "auth-page" },
            React.createElement("div", { className: "auth-card setup-card" },
                React.createElement(Brand, null),
                React.createElement("div", { className: "setup-progress" },
                    React.createElement("span", { className: step >= 1 ? 'active' : '' }, "1"),
                    React.createElement("i", null),
                    React.createElement("span", { className: step >= 2 ? 'active' : '' }, "2"),
                    React.createElement("i", null),
                    React.createElement("span", { className: step >= 3 ? 'active' : '' }, "3")),
                step === 1 ? React.createElement("div", { className: "auth-section" },
                    React.createElement("p", { className: "eyebrow" }, "Security"),
                    React.createElement("h1", null, "Set your access PIN"),
                    React.createElement("p", { className: "subtle" }, "Your data stays encrypted on this device. The PIN is never stored as plain text."),
                    React.createElement("div", { className: "form-grid one" },
                        React.createElement(Field, { label: "PIN" },
                            React.createElement(Input, { inputMode: "numeric", autoComplete: "new-password", maxLength: "12", type: "password", value: this.state.pin, onChange: (e) => this.setState({ pin: e.target.value.replace(/\D/g, '') }) })),
                        React.createElement(Field, { label: "Confirm PIN" },
                            React.createElement(Input, { inputMode: "numeric", maxLength: "12", type: "password", value: this.state.confirm, onChange: (e) => this.setState({ confirm: e.target.value.replace(/\D/g, '') }) }))),
                    React.createElement(Button, { variant: "primary", onClick: this.next }, "Continue")) : null,
                step === 2 ? React.createElement("div", { className: "auth-section" },
                    React.createElement("p", { className: "eyebrow" }, "Company"),
                    React.createElement("h1", null, "Company details"),
                    React.createElement("div", { className: "form-grid two" },
                        React.createElement(Field, { label: "Company Name English" },
                            React.createElement(Input, { value: company.nameEn, onChange: (e) => this.updateCompany('nameEn', e.target.value) })),
                        React.createElement(Field, { label: "Company Name Arabic" },
                            React.createElement(Input, { dir: "rtl", value: company.nameAr, onChange: (e) => this.updateCompany('nameAr', e.target.value) })),
                        React.createElement(Field, { label: "Address English" },
                            React.createElement(Input, { value: company.addressEn, onChange: (e) => this.updateCompany('addressEn', e.target.value) })),
                        React.createElement(Field, { label: "Address Arabic" },
                            React.createElement(Input, { dir: "rtl", value: company.addressAr, onChange: (e) => this.updateCompany('addressAr', e.target.value) })),
                        React.createElement(Field, { label: "City" },
                            React.createElement(Input, { value: company.city, onChange: (e) => this.updateCompany('city', e.target.value) })),
                        React.createElement(Field, { label: "Country" },
                            React.createElement(Input, { value: company.country, onChange: (e) => this.updateCompany('country', e.target.value) })),
                        React.createElement(Field, { label: "Phone" },
                            React.createElement(Input, { value: company.phone, onChange: (e) => this.updateCompany('phone', e.target.value) })),
                        React.createElement(Field, { label: "Email" },
                            React.createElement(Input, { type: "email", value: company.email, onChange: (e) => this.updateCompany('email', e.target.value) })),
                        React.createElement(Field, { label: "Website" },
                            React.createElement(Input, { value: company.website, onChange: (e) => this.updateCompany('website', e.target.value) })),
                        React.createElement(Field, { label: "Commercial Registration" },
                            React.createElement(Input, { value: company.commercialRegistration, onChange: (e) => this.updateCompany('commercialRegistration', e.target.value) }))),
                    React.createElement("label", { className: "upload-tile" },
                        React.createElement("span", null, "Company Logo"),
                        React.createElement("img", { src: company.logoDataUrl || LOUREX_BRAND, alt: "Company logo preview" }),
                        React.createElement("input", { type: "file", accept: "image/png,image/webp,image/jpeg,image/svg+xml", onChange: (e) => this.upload('logoDataUrl', e.target.files?.[0]) })),
                    React.createElement("div", { className: "setup-actions" },
                        React.createElement(Button, { onClick: () => this.setState({ step: 1 }) }, "Back"),
                        React.createElement(Button, { variant: "primary", onClick: this.next }, "Continue"))) : null,
                step === 3 ? React.createElement("div", { className: "auth-section" },
                    React.createElement("p", { className: "eyebrow" }, "Optional"),
                    React.createElement("h1", null, "Bank & signing"),
                    React.createElement("div", { className: "form-grid two" },
                        React.createElement(Field, { label: "Bank Name" },
                            React.createElement(Input, { value: company.bank.bankName, onChange: (e) => this.updateBank('bankName', e.target.value) })),
                        React.createElement(Field, { label: "Account Name" },
                            React.createElement(Input, { value: company.bank.accountName, onChange: (e) => this.updateBank('accountName', e.target.value) })),
                        React.createElement(Field, { label: "IBAN" },
                            React.createElement(Input, { value: company.bank.iban, onChange: (e) => this.updateBank('iban', e.target.value) })),
                        React.createElement(Field, { label: "SWIFT / BIC" },
                            React.createElement(Input, { value: company.bank.swift, onChange: (e) => this.updateBank('swift', e.target.value) }))),
                    React.createElement("div", { className: "upload-row" },
                        React.createElement("label", { className: "upload-tile small" },
                            React.createElement("span", null, "Signature"),
                            company.signatureDataUrl ? React.createElement("img", { src: company.signatureDataUrl, alt: "Signature" }) : React.createElement("b", null, "Upload"),
                            React.createElement("input", { type: "file", accept: "image/png,image/webp,image/jpeg", onChange: (e) => this.upload('signatureDataUrl', e.target.files?.[0]) })),
                        React.createElement("label", { className: "upload-tile small" },
                            React.createElement("span", null, "Stamp"),
                            company.stampDataUrl ? React.createElement("img", { src: company.stampDataUrl, alt: "Stamp" }) : React.createElement("b", null, "Upload"),
                            React.createElement("input", { type: "file", accept: "image/png,image/webp,image/jpeg", onChange: (e) => this.upload('stampDataUrl', e.target.files?.[0]) }))),
                    React.createElement("div", { className: "setup-actions" },
                        React.createElement(Button, { onClick: () => this.setState({ step: 2 }) }, "Back"),
                        React.createElement(Button, { variant: "primary", disabled: busy, onClick: this.finish }, busy ? 'Finishing…' : 'Finish'))) : null,
                error ? React.createElement("div", { className: "auth-error" }, error) : null));
    }
}
class UnlockScreen extends React.Component {
    state = { pin: '', error: '', busy: false };
    submit = async (e) => { e.preventDefault(); if (!this.state.pin)
        return; this.setState({ busy: true, error: '' }); try {
        await this.props.onUnlock(this.state.pin);
    }
    catch (err) {
        this.setState({ busy: false, error: err instanceof Error ? err.message : 'Unable to unlock.', pin: '' });
    } };
    render() { return React.createElement("div", { className: "auth-page" },
        React.createElement("form", { className: "auth-card unlock-card", onSubmit: this.submit },
            React.createElement(Brand, null),
            React.createElement("p", { className: "eyebrow" }, "LOUREX Invoice"),
            React.createElement("h1", null, "Enter PIN"),
            React.createElement(Field, { label: "Access PIN" },
                React.createElement(Input, { autoFocus: true, inputMode: "numeric", type: "password", value: this.state.pin, onChange: (e) => this.setState({ pin: e.target.value.replace(/\D/g, '') }) })),
            this.state.error ? React.createElement("div", { className: "auth-error" }, this.state.error) : null,
            React.createElement(Button, { variant: "primary", type: "submit", disabled: this.state.busy }, this.state.busy ? 'Unlocking…' : 'Unlock'),
            React.createElement("p", { className: "security-note" }, "Encrypted local access \u00B7 No cloud account"))); }
}
/* src/components/CustomersPage.js */


function blankCustomer() { const now = new Date().toISOString(); return { id: makeId('customer'), createdAt: now, updatedAt: now, companyNameEn: '', companyNameAr: '', contactPerson: '', addressEn: '', addressAr: '', city: '', country: '', phone: '', email: '', vatTaxNumber: '', commercialRegistration: '', notes: '' }; }
function CustomerForm({ customer, onChange }) {
    const set = (key, value) => onChange({ ...customer, [key]: value, updatedAt: new Date().toISOString() });
    return React.createElement("div", { className: "form-grid two" },
        React.createElement(Field, { label: "Company Name English" },
            React.createElement(Input, { autoFocus: true, value: customer.companyNameEn, onChange: (e) => set('companyNameEn', e.target.value) })),
        React.createElement(Field, { label: "Company Name Arabic" },
            React.createElement(Input, { dir: "rtl", value: customer.companyNameAr, onChange: (e) => set('companyNameAr', e.target.value) })),
        React.createElement(Field, { label: "Contact Person" },
            React.createElement(Input, { value: customer.contactPerson, onChange: (e) => set('contactPerson', e.target.value) })),
        React.createElement(Field, { label: "Email" },
            React.createElement(Input, { type: "email", value: customer.email, onChange: (e) => set('email', e.target.value) })),
        React.createElement(Field, { label: "Address English" },
            React.createElement(Input, { value: customer.addressEn, onChange: (e) => set('addressEn', e.target.value) })),
        React.createElement(Field, { label: "Address Arabic" },
            React.createElement(Input, { dir: "rtl", value: customer.addressAr, onChange: (e) => set('addressAr', e.target.value) })),
        React.createElement(Field, { label: "City" },
            React.createElement(Input, { value: customer.city, onChange: (e) => set('city', e.target.value) })),
        React.createElement(Field, { label: "Country" },
            React.createElement(Input, { value: customer.country, onChange: (e) => set('country', e.target.value) })),
        React.createElement(Field, { label: "Phone" },
            React.createElement(Input, { value: customer.phone, onChange: (e) => set('phone', e.target.value) })),
        React.createElement(Field, { label: "VAT / Tax Number" },
            React.createElement(Input, { value: customer.vatTaxNumber, onChange: (e) => set('vatTaxNumber', e.target.value) })),
        React.createElement(Field, { label: "Commercial Registration" },
            React.createElement(Input, { value: customer.commercialRegistration, onChange: (e) => set('commercialRegistration', e.target.value) })),
        React.createElement(Field, { label: "Notes", className: "span-2" },
            React.createElement(Textarea, { rows: "3", value: customer.notes, onChange: (e) => set('notes', e.target.value) })));
}
class CustomersPage extends React.Component {
    state = { query: '', editing: null, deleting: null, error: '', busy: false };
    filtered() { const q = this.state.query.trim().toLowerCase(); return this.props.customers.filter(c => !q || c.companyNameEn.toLowerCase().includes(q) || c.companyNameAr.includes(this.state.query.trim()) || c.contactPerson.toLowerCase().includes(q)).sort((a, b) => a.companyNameEn.localeCompare(b.companyNameEn)); }
    save = async () => { const c = this.state.editing; if (!c)
        return; if (!c.companyNameEn.trim() && !c.companyNameAr.trim()) {
        this.setState({ error: 'Company name is required.' });
        return;
    } this.setState({ busy: true, error: '' }); try {
        await this.props.onSave(c);
        this.setState({ editing: null, busy: false });
    }
    catch (e) {
        this.setState({ error: e instanceof Error ? e.message : 'Unable to save customer.', busy: false });
    } };
    render() {
        const customers = this.filtered();
        return React.createElement("section", { className: "page customers-page" },
            React.createElement("div", { className: "page-heading" },
                React.createElement("div", null,
                    React.createElement("p", { className: "eyebrow" }, "Address book"),
                    React.createElement("h1", null, "Customers")),
                React.createElement(Button, { icon: "plus", variant: "primary", onClick: () => this.setState({ editing: blankCustomer() }) }, "Add Customer")),
            React.createElement("div", { className: "list-toolbar customers-toolbar" },
                React.createElement("div", { className: "search-box" },
                    React.createElement(Icon, { name: "search" }),
                    React.createElement(Input, { placeholder: "Search customers", value: this.state.query, onChange: (e) => this.setState({ query: e.target.value }) }))),
            customers.length ? React.createElement("div", { className: "customer-list" }, customers.map(c => React.createElement("article", { className: "customer-card", key: c.id },
                React.createElement("div", { className: "customer-avatar" }, (c.companyNameEn || c.companyNameAr || 'C').trim().charAt(0).toUpperCase()),
                React.createElement("div", { className: "customer-info" },
                    React.createElement("strong", null, c.companyNameEn || c.companyNameAr),
                    c.companyNameAr && c.companyNameEn ? React.createElement("span", { dir: "rtl" }, c.companyNameAr) : null,
                    React.createElement("small", null, [c.city, c.country].filter(Boolean).join(', ') || 'No location'),
                    React.createElement("small", null, [c.email, c.phone].filter(Boolean).join(' · '))),
                React.createElement("div", { className: "customer-actions" },
                    React.createElement(IconButton, { icon: "edit", label: "Edit", onClick: () => this.setState({ editing: structuredClone(c) }) }),
                    React.createElement(IconButton, { icon: "trash", label: "Delete", variant: "danger", onClick: () => this.setState({ deleting: c }) }))))) : React.createElement("div", { className: "empty-state" },
                React.createElement("span", { className: "empty-mark" },
                    React.createElement(Icon, { name: "users", size: 28 })),
                React.createElement("h2", null, "No customers yet"),
                React.createElement("p", null, "Add your first customer."),
                React.createElement(Button, { icon: "plus", variant: "primary", onClick: () => this.setState({ editing: blankCustomer() }) }, "Add Customer")),
            React.createElement(Modal, { open: Boolean(this.state.editing), title: this.state.editing && this.props.customers.some(c => c.id === this.state.editing?.id) ? 'Edit Customer' : 'Add Customer', size: "lg", onClose: () => this.setState({ editing: null, error: '' }), footer: React.createElement("div", { className: "modal-footer-actions" },
                    React.createElement(Button, { onClick: () => this.setState({ editing: null, error: '' }) }, "Cancel"),
                    React.createElement(Button, { variant: "primary", disabled: this.state.busy, onClick: this.save }, this.state.busy ? 'Saving…' : 'Save Customer')) },
                this.state.editing ? React.createElement(CustomerForm, { customer: this.state.editing, onChange: (editing) => this.setState({ editing }) }) : null,
                this.state.error ? React.createElement("div", { className: "inline-error" }, this.state.error) : null),
            React.createElement(ConfirmDialog, { open: Boolean(this.state.deleting), title: `Delete ${this.state.deleting?.companyNameEn || 'customer'}?`, message: "This removes the customer from your address book. Existing documents keep their saved customer snapshot.", onCancel: () => this.setState({ deleting: null }), onConfirm: async () => { const c = this.state.deleting; if (c) {
                    await this.props.onDelete(c);
                    this.setState({ deleting: null });
                } } }));
    }
}
/* src/templates/TemplateRenderer.js */



function localized(doc, en, ar) {
    if (doc.language === 'en')
        return React.createElement("span", null, en);
    if (doc.language === 'ar')
        return React.createElement("span", { dir: "rtl" }, ar);
    return React.createElement("span", { className: "bi-label" },
        React.createElement("span", null, en),
        React.createElement("span", { dir: "rtl" }, ar));
}
function valuePair(doc, en, ar) {
    if (doc.language === 'en')
        return React.createElement("span", null, en || '—');
    if (doc.language === 'ar')
        return React.createElement("span", { dir: "rtl" }, ar || en || '—');
    return React.createElement("span", { className: "bi-value" },
        React.createElement("span", null, en || '—'),
        ar ? React.createElement("span", { dir: "rtl" }, ar) : null);
}
function companyName(doc) { return valuePair(doc, doc.companySnapshot.nameEn, doc.companySnapshot.nameAr); }
function customerName(doc) { const c = doc.customerSnapshot; return valuePair(doc, c?.companyNameEn ?? '', c?.companyNameAr ?? ''); }
function LogoBlock({ document: doc, inverse = false }) {
    const src = doc.companySnapshot.logoDataUrl || LOUREX_BRAND;
    const official = src.includes('icon-512.jpg');
    return React.createElement("div", { className: `doc-logo ${inverse ? 'inverse' : ''} ${official ? 'official-doc-logo' : ''}` }, official ? React.createElement("span", { className: "official-doc-logo-inner" },
        React.createElement("span", { className: "doc-logo-mark" },
            React.createElement("img", { src: src, alt: "" })),
        React.createElement("span", { className: "doc-logo-words" },
            React.createElement("strong", null, doc.companySnapshot.nameEn || 'LOUREX'),
            React.createElement("small", null, "IMPORT \u2022 EXPORT \u2022 INTERNATIONAL TRADE"))) : React.createElement("img", { src: src, alt: doc.companySnapshot.nameEn || 'LOUREX' }));
}
function MetaBlock({ document: doc }) {
    return React.createElement("div", { className: "doc-meta" },
        React.createElement("div", null,
            React.createElement("b", null, localized(doc, 'No.', 'الرقم')),
            React.createElement("span", null, doc.number)),
        React.createElement("div", null,
            React.createElement("b", null, localized(doc, 'Issue Date', 'تاريخ الإصدار')),
            React.createElement("span", null, displayDate(doc.issueDate, doc.language))),
        doc.dueDate ? React.createElement("div", null,
            React.createElement("b", null, localized(doc, doc.kind === 'proforma' ? 'Valid Until' : 'Due Date', doc.kind === 'proforma' ? 'صالح حتى' : 'تاريخ الاستحقاق')),
            React.createElement("span", null, displayDate(doc.dueDate, doc.language))) : null,
        React.createElement("div", null,
            React.createElement("b", null, localized(doc, 'Currency', 'العملة')),
            React.createElement("span", null, doc.currency)));
}
function PartyBlock({ document: doc, type }) {
    const c = doc.customerSnapshot;
    const isSeller = type === 'seller';
    const name = isSeller ? companyName(doc) : customerName(doc);
    const addressEn = isSeller ? doc.companySnapshot.addressEn : (c?.addressEn ?? '');
    const addressAr = isSeller ? doc.companySnapshot.addressAr : (c?.addressAr ?? '');
    const city = isSeller ? doc.companySnapshot.city : (c?.city ?? '');
    const country = isSeller ? doc.companySnapshot.country : (c?.country ?? '');
    const phone = isSeller ? doc.companySnapshot.phone : (c?.phone ?? '');
    const email = isSeller ? doc.companySnapshot.email : (c?.email ?? '');
    const tax = isSeller ? (doc.companySnapshot.vatNumber || doc.companySnapshot.taxNumber) : (c?.vatTaxNumber ?? '');
    return React.createElement("section", { className: `party-block party-${type}` },
        React.createElement("div", { className: "section-kicker" }, localized(doc, isSeller ? 'Seller / From' : 'Buyer / Customer', isSeller ? 'البائع / من' : 'المشتري / العميل')),
        React.createElement("div", { className: "party-name" }, name),
        (addressEn || addressAr) ? React.createElement("div", { className: "party-address" }, valuePair(doc, addressEn, addressAr)) : null,
        (city || country) ? React.createElement("div", null, [city, country].filter(Boolean).join(', ')) : null,
        (phone || email) ? React.createElement("div", null, [phone, email].filter(Boolean).join(' • ')) : null,
        tax ? React.createElement("div", { className: "party-tax" },
            localized(doc, 'VAT / Tax', 'الضريبة'),
            " ",
            React.createElement("span", null, tax)) : null);
}
function ItemsTable({ document: doc, items, continued }) {
    const showHs = doc.appearance.showHsCode && doc.items.some(i => i.hsCode.trim());
    const showOrigin = doc.appearance.showOrigin && doc.items.some(i => i.origin.trim());
    const showPacking = doc.appearance.showPacking && doc.items.some(i => i.packing.trim());
    return React.createElement("div", { className: "items-wrap" },
        continued ? React.createElement("div", { className: "continued-label" }, localized(doc, 'Items — continued', 'البنود — تابع')) : null,
        React.createElement("table", { className: "items-table" },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", { className: "col-num" }, "#"),
                    React.createElement("th", null, localized(doc, 'Description', 'الوصف')),
                    showHs ? React.createElement("th", null, localized(doc, 'HS Code', 'الرمز الجمركي')) : null,
                    showOrigin ? React.createElement("th", null, localized(doc, 'Origin', 'المنشأ')) : null,
                    showPacking ? React.createElement("th", null, localized(doc, 'Packing', 'التعبئة')) : null,
                    React.createElement("th", null, localized(doc, 'Qty', 'الكمية')),
                    React.createElement("th", null, localized(doc, 'Unit', 'الوحدة')),
                    React.createElement("th", null,
                        localized(doc, 'Unit Price', 'سعر الوحدة'),
                        React.createElement("small", null, doc.currency)),
                    React.createElement("th", null,
                        localized(doc, 'Total', 'الإجمالي'),
                        React.createElement("small", null, doc.currency)))),
            React.createElement("tbody", null, items.map((item, index) => React.createElement("tr", { key: item.id },
                React.createElement("td", { className: "col-num" }, doc.items.findIndex(source => source.id === item.id) + 1),
                React.createElement("td", { className: "description-cell" }, valuePair(doc, item.descriptionEn, item.descriptionAr)),
                showHs ? React.createElement("td", null, item.hsCode || '—') : null,
                showOrigin ? React.createElement("td", null, item.origin || '—') : null,
                showPacking ? React.createElement("td", null, item.packing || '—') : null,
                React.createElement("td", null, item.quantity),
                React.createElement("td", null, item.unit),
                React.createElement("td", { className: "money-cell" }, item.unitPrice),
                React.createElement("td", { className: "money-cell strong" }, lineTotal(item.quantity, item.unitPrice)))))));
}
function Terms({ document: doc }) {
    const t = doc.terms;
    const rows = [
        ['Incoterm', 'الإنكوترم', t.incoterm], ['Payment Terms', 'شروط الدفع', t.paymentTerms], ['Packing', 'التعبئة', t.packing],
        ['Delivery Time', 'مدة التسليم', t.deliveryTime], ['Port of Loading', 'ميناء التحميل', t.portOfLoading], ['Final Destination', 'الوجهة النهائية', t.finalDestination],
        ['Country of Origin', 'بلد المنشأ', t.countryOfOrigin], ['Validity', 'الصلاحية', t.validity], ['Remarks', 'ملاحظات تجارية', t.remarks]
    ].filter((row) => Boolean(row[2]?.trim()));
    if (!rows.length)
        return null;
    return React.createElement("section", { className: "terms-block" },
        React.createElement("h3", null, localized(doc, 'Commercial Terms', 'الشروط التجارية')),
        React.createElement("div", { className: "terms-grid" }, rows.map(row => React.createElement("div", { className: "term-row", key: row[0] },
            React.createElement("b", null, localized(doc, row[0], row[1])),
            React.createElement("span", null, row[2])))));
}
function Totals({ document: doc }) {
    const t = calculateTotals(doc.items, doc.adjustments);
    const rows = [
        ['Subtotal', 'المجموع الفرعي', t.subtotal, true],
        ['Discount', 'الخصم', t.discount, doc.adjustments.discountEnabled],
        ['Shipping', 'الشحن', t.shipping, doc.adjustments.shippingEnabled],
        ['Other Charges', 'رسوم أخرى', t.otherCharges, doc.adjustments.otherChargesEnabled],
        [`Tax ${doc.adjustments.taxEnabled ? doc.adjustments.taxPercent + '%' : ''}`, 'الضريبة', t.tax, doc.adjustments.taxEnabled]
    ];
    return React.createElement("section", { className: "totals-block" },
        rows.filter(r => r[3]).map(r => React.createElement("div", { className: "total-row", key: r[0] },
            React.createElement("span", null, localized(doc, r[0], r[1])),
            React.createElement("strong", null, formatMoney(r[2], doc.currency)))),
        React.createElement("div", { className: "grand-total" },
            React.createElement("span", null, localized(doc, 'Grand Total', 'الإجمالي النهائي')),
            React.createElement("strong", null, formatMoney(t.grandTotal, doc.currency))));
}
function Bank({ document: doc }) {
    if (!doc.appearance.showBank)
        return null;
    const b = doc.companySnapshot.bank;
    const rows = [['Bank Name', 'اسم البنك', b.bankName], ['Account Name', 'اسم الحساب', b.accountName], ['IBAN', 'آيبان', b.iban], ['SWIFT / BIC', 'سويفت', b.swift], ['Currency', 'العملة', b.currency]].filter((r) => Boolean(r[2]?.trim()));
    if (!rows.length)
        return null;
    return React.createElement("section", { className: "bank-block" },
        React.createElement("h3", null, localized(doc, 'Bank Details', 'التفاصيل البنكية')),
        rows.map(r => React.createElement("div", { key: r[0] },
            React.createElement("b", null, localized(doc, r[0], r[1])),
            React.createElement("span", null, r[2]))));
}
function Signature({ document: doc }) {
    const showSig = doc.appearance.showSignature && doc.companySnapshot.signatureDataUrl;
    const showStamp = doc.appearance.showStamp && doc.companySnapshot.stampDataUrl;
    if (!showSig && !showStamp)
        return null;
    return React.createElement("section", { className: "signature-block" },
        React.createElement("h3", null, localized(doc, 'Authorized Signature', 'التوقيع المعتمد')),
        React.createElement("div", { className: "signature-media" },
            showSig ? React.createElement("img", { src: doc.companySnapshot.signatureDataUrl, alt: "Signature" }) : null,
            showStamp ? React.createElement("img", { src: doc.companySnapshot.stampDataUrl, alt: "Stamp" }) : null));
}
function FinalDetails({ document: doc }) {
    return React.createElement("div", { className: "final-details" },
        React.createElement("div", { className: "lower-grid" },
            React.createElement(Terms, { document: doc }),
            React.createElement(Totals, { document: doc })),
        doc.notes.trim() ? React.createElement("section", { className: "notes-block" },
            React.createElement("h3", null, localized(doc, 'Notes', 'ملاحظات')),
            React.createElement("p", null, doc.notes)) : null,
        React.createElement("div", { className: "bottom-grid" },
            React.createElement(Bank, { document: doc }),
            React.createElement(Signature, { document: doc })));
}
function Page({ document: doc, items, pageIndex, totalPages, finalPage, variant, compact }) {
    const typeEn = doc.kind === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE';
    const typeAr = doc.kind === 'proforma' ? 'فاتورة أولية' : 'فاتورة';
    return React.createElement("article", { className: `invoice-page template-${variant} lang-${doc.language} ${compact ? 'compact-preview' : ''}`, style: { '--accent': doc.appearance.accentColor } },
        React.createElement("div", { className: "page-accent" }),
        variant === 'executive' ? React.createElement("header", { className: "header-executive" },
            React.createElement(LogoBlock, { document: doc, inverse: true }),
            React.createElement("div", { className: "doc-title inverse" },
                React.createElement("span", null, typeEn),
                doc.language !== 'en' ? React.createElement("em", { dir: "rtl" }, typeAr) : null),
            React.createElement(MetaBlock, { document: doc })) : null,
        variant === 'minimal' ? React.createElement("header", { className: "header-minimal" },
            React.createElement(LogoBlock, { document: doc }),
            React.createElement("div", null,
                React.createElement("div", { className: "doc-title" },
                    React.createElement("span", null, typeEn),
                    doc.language !== 'en' ? React.createElement("em", { dir: "rtl" }, typeAr) : null),
                React.createElement(MetaBlock, { document: doc }))) : null,
        variant === 'trade' ? React.createElement("header", { className: "header-trade" },
            React.createElement("div", { className: "trade-bar" },
                React.createElement(LogoBlock, { document: doc, inverse: true })),
            React.createElement("div", { className: "trade-title" },
                React.createElement("div", { className: "doc-title" },
                    React.createElement("span", null, typeEn),
                    doc.language !== 'en' ? React.createElement("em", { dir: "rtl" }, typeAr) : null),
                React.createElement(MetaBlock, { document: doc }))) : null,
        variant === 'signature' ? React.createElement("header", { className: "header-signature" },
            React.createElement(LogoBlock, { document: doc }),
            React.createElement("div", { className: "signature-title" },
                React.createElement("small", null, localized(doc, 'COMMERCIAL DOCUMENT', 'مستند تجاري')),
                React.createElement("div", { className: "doc-title" },
                    React.createElement("span", null, typeEn),
                    doc.language !== 'en' ? React.createElement("em", { dir: "rtl" }, typeAr) : null)),
            React.createElement(MetaBlock, { document: doc })) : null,
        React.createElement("main", { className: "doc-body" },
            pageIndex === 0 ? React.createElement("div", { className: "party-grid" },
                React.createElement(PartyBlock, { document: doc, type: "seller" }),
                React.createElement(PartyBlock, { document: doc, type: "customer" })) : null,
            items.length ? React.createElement(ItemsTable, { document: doc, items: items, continued: pageIndex > 0 }) : null,
            finalPage ? React.createElement(FinalDetails, { document: doc }) : null),
        React.createElement("footer", { className: "doc-footer" },
            React.createElement("span", null, doc.companySnapshot.footerText || doc.companySnapshot.nameEn),
            React.createElement("span", null,
                pageIndex + 1,
                " / ",
                totalPages)));
}
function shouldUseDetailsPage(doc) {
    const termsCount = Object.values(doc.terms).filter(value => value.trim()).length;
    const bank = doc.appearance.showBank && Object.values(doc.companySnapshot.bank).some(value => value.trim());
    const signing = (doc.appearance.showSignature && Boolean(doc.companySnapshot.signatureDataUrl)) || (doc.appearance.showStamp && Boolean(doc.companySnapshot.stampDataUrl));
    const adjustments = [doc.adjustments.discountEnabled, doc.adjustments.shippingEnabled, doc.adjustments.otherChargesEnabled, doc.adjustments.taxEnabled].filter(Boolean).length;
    const score = termsCount + (doc.notes.trim() ? 3 : 0) + (bank ? 4 : 0) + (signing ? 3 : 0) + adjustments;
    return score >= 10;
}
function TemplateRenderer({ document: doc, scale = 1, compact = false }) {
    const separateDetails = shouldUseDetailsPage(doc);
    const itemPages = paginateItems(doc.items, !separateDetails);
    const pages = separateDetails ? [...itemPages, []] : itemPages;
    return React.createElement("div", { className: "invoice-pages", style: { '--preview-scale': String(scale) } }, pages.map((items, index) => React.createElement(Page, { key: `${doc.id}-${index}`, document: doc, items: items, pageIndex: index, totalPages: pages.length, finalPage: index === pages.length - 1, variant: doc.appearance.templateId, compact: compact })));
}
/* src/templates/TemplateThumbnails.js */

const templates = [
    { id: 'executive', name: 'Executive', sub: 'Navy / Ivory' },
    { id: 'minimal', name: 'Minimal', sub: 'European clean' },
    { id: 'trade', name: 'International Trade', sub: 'Trade detail' },
    { id: 'signature', name: 'Signature', sub: 'Distinctive premium' }
];
function TemplateThumbnails({ document: doc, onSelect }) {
    return React.createElement("div", { className: "template-selector" }, templates.map(t => {
        const preview = { ...doc, appearance: { ...doc.appearance, templateId: t.id } };
        return React.createElement("button", { type: "button", className: `template-card ${doc.appearance.templateId === t.id ? 'selected' : ''}`, onClick: () => onSelect(t.id), key: t.id },
            React.createElement("div", { className: "template-mini" },
                React.createElement(TemplateRenderer, { document: preview, scale: 0.16, compact: true })),
            React.createElement("span", null,
                React.createElement("b", null, t.name),
                React.createElement("small", null, t.sub)));
    }));
}
/* src/components/DocumentsPage.js */



class DocumentsPage extends React.Component {
    state = { tab: 'all', query: '', menuId: '' };
    filtered() {
        const q = this.state.query.trim().toLowerCase();
        return this.props.documents
            .filter(d => this.state.tab === 'all' || d.kind === this.state.tab)
            .filter(d => !q || d.number.toLowerCase().includes(q) || (d.customerSnapshot?.companyNameEn ?? '').toLowerCase().includes(q) || (d.customerSnapshot?.companyNameAr ?? '').includes(this.state.query.trim()))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    render() {
        const docs = this.filtered();
        return React.createElement("section", { className: "page documents-page" },
            React.createElement("div", { className: "page-heading" },
                React.createElement("div", null,
                    React.createElement("p", { className: "eyebrow" }, "LOUREX Invoice"),
                    React.createElement("h1", null, "Documents")),
                React.createElement("div", { className: "heading-actions" },
                    React.createElement(Button, { icon: "plus", variant: "primary", onClick: () => this.props.onNew('proforma') }, "New Proforma"),
                    React.createElement(Button, { icon: "plus", onClick: () => this.props.onNew('invoice') }, "New Invoice"))),
            React.createElement("div", { className: "list-toolbar" },
                React.createElement(Segmented, { value: this.state.tab, onChange: (value) => this.setState({ tab: value }), options: [{ value: 'all', label: 'All' }, { value: 'proforma', label: 'Proforma' }, { value: 'invoice', label: 'Invoices' }] }),
                React.createElement("div", { className: "search-box" },
                    React.createElement(Icon, { name: "search" }),
                    React.createElement(Input, { "aria-label": "Search documents", placeholder: "Search number or customer", value: this.state.query, onChange: (e) => this.setState({ query: e.target.value }) }))),
            docs.length ? React.createElement("div", { className: "document-list" }, docs.map(doc => {
                const totals = calculateTotals(doc.items, doc.adjustments);
                const customer = doc.customerSnapshot?.companyNameEn || doc.customerSnapshot?.companyNameAr || 'No customer';
                return React.createElement("article", { className: "document-card", key: doc.id },
                    React.createElement("button", { className: "document-main", onClick: () => this.props.onOpen(doc) },
                        React.createElement("span", { className: `document-type-icon type-${doc.kind}` },
                            React.createElement(Icon, { name: doc.kind === 'proforma' ? 'proforma' : 'invoice' })),
                        React.createElement("span", { className: "document-info" },
                            React.createElement("strong", null, doc.number),
                            React.createElement("b", null, customer),
                            React.createElement("small", null,
                                displayDate(doc.issueDate, doc.language),
                                " \u00B7 ",
                                doc.kind === 'proforma' ? 'Proforma' : 'Invoice')),
                        React.createElement("span", { className: "document-total" },
                            React.createElement("strong", null, formatMoney(totals.grandTotal, doc.currency)))),
                    React.createElement("div", { className: "document-actions desktop-actions" },
                        React.createElement(Button, { variant: "ghost", onClick: () => this.props.onOpen(doc) }, "Open"),
                        React.createElement(IconButton, { icon: "copy", label: "Duplicate", onClick: () => this.props.onDuplicate(doc) }),
                        React.createElement(IconButton, { icon: "download", label: "PDF", onClick: () => this.props.onPrint(doc, 'pdf') }),
                        React.createElement(IconButton, { icon: "share", label: "Share", onClick: () => this.props.onPrint(doc, 'share') }),
                        React.createElement(IconButton, { icon: "trash", label: "Delete", variant: "danger", onClick: () => this.props.onDelete(doc) })),
                    React.createElement("div", { className: "mobile-actions" },
                        React.createElement(IconButton, { icon: "more", label: "Actions", onClick: () => this.setState({ menuId: this.state.menuId === doc.id ? '' : doc.id }) }),
                        this.state.menuId === doc.id ? React.createElement("div", { className: "action-menu" },
                            React.createElement("button", { onClick: () => this.props.onOpen(doc) },
                                React.createElement(Icon, { name: "edit" }),
                                "Open"),
                            React.createElement("button", { onClick: () => this.props.onDuplicate(doc) },
                                React.createElement(Icon, { name: "copy" }),
                                "Duplicate"),
                            React.createElement("button", { onClick: () => this.props.onPrint(doc, 'pdf') },
                                React.createElement(Icon, { name: "download" }),
                                "PDF"),
                            React.createElement("button", { onClick: () => this.props.onPrint(doc, 'share') },
                                React.createElement(Icon, { name: "share" }),
                                "Share"),
                            React.createElement("button", { className: "danger", onClick: () => this.props.onDelete(doc) },
                                React.createElement(Icon, { name: "trash" }),
                                "Delete")) : null));
            })) : React.createElement("div", { className: "empty-state" },
                React.createElement("span", { className: "empty-mark" },
                    React.createElement(Icon, { name: "file", size: 28 })),
                React.createElement("h2", null, "No documents yet"),
                React.createElement("p", null, "Create your first Proforma or Invoice."),
                React.createElement(Button, { icon: "plus", variant: "primary", onClick: () => this.props.onNew('proforma') }, "New Proforma")));
    }
}
/* src/components/SettingsModal.js */


class SettingsModal extends React.Component {
    constructor(props) { super(props); this.state = { tab: 'company', company: structuredClone(props.company), appSettings: structuredClone(props.appSettings), busy: false, message: '', error: '', currentPin: '', newPin: '', confirmPin: '', backupPin: '', restorePin: '', restoreFile: null, confirmRestore: false }; }
    componentDidUpdate(prev) { if (this.props.open && !prev.open)
        this.setState({ company: structuredClone(this.props.company), appSettings: structuredClone(this.props.appSettings), message: '', error: '', currentPin: '', newPin: '', confirmPin: '', backupPin: '', restorePin: '', restoreFile: null, confirmRestore: false }); }
    setCompany = (key, value) => this.setState({ company: { ...this.state.company, [key]: value } });
    setBank = (key, value) => this.setState({ company: { ...this.state.company, bank: { ...this.state.company.bank, [key]: value } } });
    upload = async (field, file) => { if (!file)
        return; try {
        const data = await fileToDataUrl(file);
        this.setCompany(field, data);
    }
    catch (e) {
        this.setState({ error: e instanceof Error ? e.message : 'Image upload failed.' });
    } };
    saveCompany = async () => { if (!this.state.company.nameEn.trim()) {
        this.setState({ error: 'Company Name English is required.' });
        return;
    } this.setState({ busy: true, error: '', message: '' }); try {
        await this.props.onSaveCompany(this.state.company);
        this.setState({ busy: false, message: 'Company settings saved.' });
    }
    catch (e) {
        this.setState({ busy: false, error: e instanceof Error ? e.message : 'Save failed.' });
    } };
    saveDocuments = async () => { this.setState({ busy: true, error: '', message: '' }); try {
        await this.props.onSaveAppSettings(this.state.appSettings);
        this.setState({ busy: false, message: 'Document settings saved.' });
    }
    catch (e) {
        this.setState({ busy: false, error: e instanceof Error ? e.message : 'Save failed.' });
    } };
    changePin = async () => { if (!/^\d{4,12}$/.test(this.state.newPin)) {
        this.setState({ error: 'New PIN must contain 4–12 digits.' });
        return;
    } if (this.state.newPin !== this.state.confirmPin) {
        this.setState({ error: 'New PIN confirmation does not match.' });
        return;
    } this.setState({ busy: true, error: '', message: '' }); try {
        await this.props.onChangePin(this.state.currentPin, this.state.newPin);
        this.setState({ busy: false, message: 'PIN changed and local data re-encrypted.', currentPin: '', newPin: '', confirmPin: '' });
    }
    catch (e) {
        this.setState({ busy: false, error: e instanceof Error ? e.message : 'Unable to change PIN.' });
    } };
    backup = async () => { this.setState({ busy: true, error: '', message: '' }); try {
        await this.props.onBackup(this.state.backupPin);
        this.setState({ busy: false, message: 'Encrypted backup created.', backupPin: '' });
    }
    catch (e) {
        this.setState({ busy: false, error: e instanceof Error ? e.message : 'Backup failed.' });
    } };
    restore = async () => { if (!this.state.restoreFile) {
        this.setState({ error: 'Choose a LOUREX backup file first.' });
        return;
    } this.setState({ busy: true, error: '', message: '' }); try {
        await this.props.onRestore(this.state.restoreFile, this.state.restorePin);
        this.setState({ busy: false, message: 'Backup restored successfully.', restorePin: '', restoreFile: null, confirmRestore: false });
    }
    catch (e) {
        this.setState({ busy: false, error: e instanceof Error ? e.message : 'Restore failed.' });
    } };
    render() {
        const c = this.state.company, s = this.state.appSettings;
        return React.createElement(Modal, { open: this.props.open, title: "Settings", size: "xl", onClose: this.props.onClose },
            React.createElement("div", { className: "settings-layout" },
                React.createElement("nav", { className: "settings-tabs" }, [['company', 'Company'], ['documents', 'Documents'], ['security', 'Security'], ['backup', 'Backup']].map(([id, label]) => React.createElement("button", { key: id, className: this.state.tab === id ? 'active' : '', onClick: () => this.setState({ tab: id, error: '', message: '' }) }, label))),
                React.createElement("div", { className: "settings-panel" },
                    this.state.tab === 'company' ? React.createElement("div", null,
                        React.createElement("div", { className: "settings-title" },
                            React.createElement("div", null,
                                React.createElement("p", { className: "eyebrow" }, "Company"),
                                React.createElement("h3", null, "Company details")),
                            React.createElement(Button, { variant: "primary", disabled: this.state.busy, onClick: this.saveCompany }, "Save")),
                        React.createElement("div", { className: "settings-section" },
                            React.createElement("div", { className: "form-grid two" },
                                React.createElement(Field, { label: "Company Name English" },
                                    React.createElement(Input, { value: c.nameEn, onChange: (e) => this.setCompany('nameEn', e.target.value) })),
                                React.createElement(Field, { label: "Company Name Arabic" },
                                    React.createElement(Input, { dir: "rtl", value: c.nameAr, onChange: (e) => this.setCompany('nameAr', e.target.value) })),
                                React.createElement(Field, { label: "Address English" },
                                    React.createElement(Input, { value: c.addressEn, onChange: (e) => this.setCompany('addressEn', e.target.value) })),
                                React.createElement(Field, { label: "Address Arabic" },
                                    React.createElement(Input, { dir: "rtl", value: c.addressAr, onChange: (e) => this.setCompany('addressAr', e.target.value) })),
                                React.createElement(Field, { label: "City" },
                                    React.createElement(Input, { value: c.city, onChange: (e) => this.setCompany('city', e.target.value) })),
                                React.createElement(Field, { label: "Country" },
                                    React.createElement(Input, { value: c.country, onChange: (e) => this.setCompany('country', e.target.value) })),
                                React.createElement(Field, { label: "Phone" },
                                    React.createElement(Input, { value: c.phone, onChange: (e) => this.setCompany('phone', e.target.value) })),
                                React.createElement(Field, { label: "Email" },
                                    React.createElement(Input, { value: c.email, onChange: (e) => this.setCompany('email', e.target.value) })),
                                React.createElement(Field, { label: "Website" },
                                    React.createElement(Input, { value: c.website, onChange: (e) => this.setCompany('website', e.target.value) })),
                                React.createElement(Field, { label: "VAT Number" },
                                    React.createElement(Input, { value: c.vatNumber, onChange: (e) => this.setCompany('vatNumber', e.target.value) })),
                                React.createElement(Field, { label: "Tax Number" },
                                    React.createElement(Input, { value: c.taxNumber, onChange: (e) => this.setCompany('taxNumber', e.target.value) })),
                                React.createElement(Field, { label: "Commercial Registration" },
                                    React.createElement(Input, { value: c.commercialRegistration, onChange: (e) => this.setCompany('commercialRegistration', e.target.value) }))),
                            React.createElement("div", { className: "asset-settings" },
                                React.createElement("label", null,
                                    React.createElement("span", null, "Logo"),
                                    React.createElement("div", { className: "asset-preview" },
                                        React.createElement("img", { src: c.logoDataUrl || LOUREX_BRAND, alt: "Logo" })),
                                    React.createElement("input", { type: "file", accept: "image/png,image/webp,image/jpeg,image/svg+xml", onChange: (e) => this.upload('logoDataUrl', e.target.files?.[0]) })),
                                React.createElement("label", null,
                                    React.createElement("span", null, "Signature"),
                                    React.createElement("div", { className: "asset-preview" }, c.signatureDataUrl ? React.createElement("img", { src: c.signatureDataUrl, alt: "Signature" }) : React.createElement(Icon, { name: "upload" })),
                                    React.createElement("input", { type: "file", accept: "image/png,image/webp,image/jpeg", onChange: (e) => this.upload('signatureDataUrl', e.target.files?.[0]) })),
                                React.createElement("label", null,
                                    React.createElement("span", null, "Stamp"),
                                    React.createElement("div", { className: "asset-preview" }, c.stampDataUrl ? React.createElement("img", { src: c.stampDataUrl, alt: "Stamp" }) : React.createElement(Icon, { name: "upload" })),
                                    React.createElement("input", { type: "file", accept: "image/png,image/webp,image/jpeg", onChange: (e) => this.upload('stampDataUrl', e.target.files?.[0]) })))),
                        React.createElement("div", { className: "settings-section" },
                            React.createElement("h4", null, "Bank details"),
                            React.createElement("div", { className: "form-grid two" },
                                React.createElement(Field, { label: "Bank Name" },
                                    React.createElement(Input, { value: c.bank.bankName, onChange: (e) => this.setBank('bankName', e.target.value) })),
                                React.createElement(Field, { label: "Account Name" },
                                    React.createElement(Input, { value: c.bank.accountName, onChange: (e) => this.setBank('accountName', e.target.value) })),
                                React.createElement(Field, { label: "IBAN" },
                                    React.createElement(Input, { value: c.bank.iban, onChange: (e) => this.setBank('iban', e.target.value) })),
                                React.createElement(Field, { label: "SWIFT / BIC" },
                                    React.createElement(Input, { value: c.bank.swift, onChange: (e) => this.setBank('swift', e.target.value) })),
                                React.createElement(Field, { label: "Bank Currency" },
                                    React.createElement(Input, { value: c.bank.currency, onChange: (e) => this.setBank('currency', e.target.value) })))),
                        React.createElement("div", { className: "settings-section" },
                            React.createElement("h4", null, "Defaults"),
                            React.createElement("div", { className: "form-grid two" },
                                React.createElement(Field, { label: "Default Currency" },
                                    React.createElement(Input, { value: c.defaultCurrency, onChange: (e) => this.setCompany('defaultCurrency', e.target.value.toUpperCase()) })),
                                React.createElement(Field, { label: "Default Language" },
                                    React.createElement(Select, { value: c.defaultLanguage, onChange: (e) => this.setCompany('defaultLanguage', e.target.value) },
                                        React.createElement("option", { value: "en" }, "English"),
                                        React.createElement("option", { value: "ar" }, "Arabic"),
                                        React.createElement("option", { value: "bilingual" }, "Arabic + English"))),
                                React.createElement(Field, { label: "Default Payment Terms" },
                                    React.createElement(Input, { value: c.defaultPaymentTerms, onChange: (e) => this.setCompany('defaultPaymentTerms', e.target.value) })),
                                React.createElement(Field, { label: "Default Incoterm" },
                                    React.createElement(Input, { value: c.defaultIncoterm, onChange: (e) => this.setCompany('defaultIncoterm', e.target.value) })),
                                React.createElement(Field, { label: "Default Delivery Time" },
                                    React.createElement(Input, { value: c.defaultDeliveryTime, onChange: (e) => this.setCompany('defaultDeliveryTime', e.target.value) })),
                                React.createElement(Field, { label: "Default Validity (days)" },
                                    React.createElement(Input, { type: "number", min: "0", value: String(c.defaultValidityDays), onChange: (e) => this.setCompany('defaultValidityDays', Math.max(0, Number(e.target.value) || 0)) })),
                                React.createElement(Field, { label: "Default Footer Text", className: "span-2" },
                                    React.createElement(Input, { value: c.defaultFooterText, onChange: (e) => this.setCompany('defaultFooterText', e.target.value) })),
                                React.createElement(Field, { label: "Default Notes", className: "span-2" },
                                    React.createElement(Textarea, { rows: "3", value: c.defaultNotes, onChange: (e) => this.setCompany('defaultNotes', e.target.value) }))))) : null,
                    this.state.tab === 'documents' ? React.createElement("div", null,
                        React.createElement("div", { className: "settings-title" },
                            React.createElement("div", null,
                                React.createElement("p", { className: "eyebrow" }, "Documents"),
                                React.createElement("h3", null, "Numbering")),
                            React.createElement(Button, { variant: "primary", disabled: this.state.busy, onClick: this.saveDocuments }, "Save")),
                        React.createElement("div", { className: "settings-section" },
                            React.createElement("div", { className: "form-grid two" },
                                React.createElement(Field, { label: "Proforma Prefix" },
                                    React.createElement(Input, { value: s.numbering.proformaPrefix, onChange: (e) => this.setState({ appSettings: { ...s, numbering: { ...s.numbering, proformaPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) } } }) })),
                                React.createElement(Field, { label: "Invoice Prefix" },
                                    React.createElement(Input, { value: s.numbering.invoicePrefix, onChange: (e) => this.setState({ appSettings: { ...s, numbering: { ...s.numbering, invoicePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) } } }) }))),
                            React.createElement("div", { className: "numbering-preview" },
                                React.createElement("span", null,
                                    s.numbering.proformaPrefix || 'PI',
                                    "-YYYY-0001"),
                                React.createElement("span", null,
                                    s.numbering.invoicePrefix || 'INV',
                                    "-YYYY-0001")),
                            React.createElement("p", { className: "settings-note" }, "Document sequences only move forward. Deleted numbers are never automatically reused."))) : null,
                    this.state.tab === 'security' ? React.createElement("div", null,
                        React.createElement("div", { className: "settings-title" },
                            React.createElement("div", null,
                                React.createElement("p", { className: "eyebrow" }, "Security"),
                                React.createElement("h3", null, "Local access"))),
                        React.createElement("div", { className: "settings-section" },
                            React.createElement("h4", null, "Auto Lock"),
                            React.createElement(Field, { label: "Lock after inactivity" },
                                React.createElement(Select, { value: String(s.autoLockMinutes), onChange: async (e) => { const value = Number(e.target.value); const next = { ...s, autoLockMinutes: value }; this.setState({ appSettings: next }); await this.props.onSaveAppSettings(next); } },
                                    React.createElement("option", { value: "0" }, "Never"),
                                    React.createElement("option", { value: "5" }, "5 minutes"),
                                    React.createElement("option", { value: "15" }, "15 minutes"),
                                    React.createElement("option", { value: "30" }, "30 minutes"))),
                            React.createElement(Button, { icon: "lock", onClick: this.props.onLock }, "Lock App")),
                        React.createElement("div", { className: "settings-section" },
                            React.createElement("h4", null, "Change PIN"),
                            React.createElement("div", { className: "form-grid one" },
                                React.createElement(Field, { label: "Current PIN" },
                                    React.createElement(Input, { inputMode: "numeric", type: "password", value: this.state.currentPin, onChange: (e) => this.setState({ currentPin: e.target.value.replace(/\D/g, '') }) })),
                                React.createElement(Field, { label: "New PIN" },
                                    React.createElement(Input, { inputMode: "numeric", type: "password", value: this.state.newPin, onChange: (e) => this.setState({ newPin: e.target.value.replace(/\D/g, '') }) })),
                                React.createElement(Field, { label: "Confirm New PIN" },
                                    React.createElement(Input, { inputMode: "numeric", type: "password", value: this.state.confirmPin, onChange: (e) => this.setState({ confirmPin: e.target.value.replace(/\D/g, '') }) }))),
                            React.createElement(Button, { variant: "primary", disabled: this.state.busy, onClick: this.changePin }, "Change PIN"),
                            React.createElement("p", { className: "settings-note" }, "Changing the PIN decrypts the current vault in memory and atomically re-encrypts it with a new salt and key."))) : null,
                    this.state.tab === 'backup' ? React.createElement("div", null,
                        React.createElement("div", { className: "settings-title" },
                            React.createElement("div", null,
                                React.createElement("p", { className: "eyebrow" }, "Data Safety"),
                                React.createElement("h3", null, "Backup / Restore"))),
                        React.createElement("div", { className: "backup-cards" },
                            React.createElement("section", { className: "backup-card" },
                                React.createElement("span", { className: "backup-icon" },
                                    React.createElement(Icon, { name: "backup" })),
                                React.createElement("h4", null, "Backup Data"),
                                React.createElement("p", null, "Creates one encrypted .lourex-backup file containing company settings, customers, documents, numbering and preferences."),
                                React.createElement(Field, { label: "Current PIN" },
                                    React.createElement(Input, { inputMode: "numeric", type: "password", value: this.state.backupPin, onChange: (e) => this.setState({ backupPin: e.target.value.replace(/\D/g, '') }) })),
                                React.createElement(Button, { variant: "primary", disabled: this.state.busy || !this.state.backupPin, onClick: this.backup }, "Backup Data")),
                            React.createElement("section", { className: "backup-card danger-zone" },
                                React.createElement("span", { className: "backup-icon" },
                                    React.createElement(Icon, { name: "restore" })),
                                React.createElement("h4", null, "Restore Backup"),
                                React.createElement("p", null, "Validated restore replaces the current encrypted local vault. Existing data is not merged."),
                                React.createElement("label", { className: "file-picker" },
                                    React.createElement("input", { type: "file", accept: ".lourex-backup,application/json", onChange: (e) => this.setState({ restoreFile: e.target.files?.[0] ?? null }) }),
                                    React.createElement("span", null, this.state.restoreFile?.name || 'Choose backup file')),
                                React.createElement(Field, { label: "Backup PIN / Password" },
                                    React.createElement(Input, { inputMode: "numeric", type: "password", value: this.state.restorePin, onChange: (e) => this.setState({ restorePin: e.target.value.replace(/\D/g, '') }) })),
                                React.createElement(Button, { variant: "danger", disabled: this.state.busy || !this.state.restoreFile || !this.state.restorePin, onClick: () => this.setState({ confirmRestore: true }) }, "Restore Data")))) : null,
                    this.state.message ? React.createElement("div", { className: "settings-message success" }, this.state.message) : null,
                    this.state.error ? React.createElement("div", { className: "settings-message error" }, this.state.error) : null)),
            React.createElement(ConfirmDialog, { open: this.state.confirmRestore, title: "Restore data?", message: "This will replace the current local data. The backup file is validated before it is written.", confirmLabel: "Restore", onCancel: () => this.setState({ confirmRestore: false }), onConfirm: () => { this.setState({ confirmRestore: false }); void this.restore(); } }));
    }
}
/* src/components/EditorPage.js */







const currencyPresets = ['USD', 'EUR', 'SAR', 'TRY', 'AED', 'GBP'];
const unitPresets = ['PCS', 'Carton', 'Box', 'Pallet', 'KG', 'Unit', 'Set'];
const incoterms = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
class EditorPage extends React.Component {
    autosaveTimer;
    constructor(props) { super(props); this.state = { doc: structuredClone(props.document), errors: {}, saving: false, saveState: 'saved', customerQuery: '', customerOpen: false, addCustomer: null, addCustomerError: '', previewScale: 0.86, mobilePreview: false, section: 'document', confirmClose: false }; }
    componentDidMount() { window.addEventListener('beforeunload', this.beforeUnload); }
    componentWillUnmount() { window.removeEventListener('beforeunload', this.beforeUnload); if (this.autosaveTimer)
        window.clearTimeout(this.autosaveTimer); }
    beforeUnload = (e) => { if (this.state.saveState === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
    } };
    mutate = (updater) => { const doc = updater(this.state.doc); doc.updatedAt = new Date().toISOString(); this.setState({ doc, saveState: 'unsaved' }, () => this.scheduleAutosave()); };
    scheduleAutosave = () => { if (this.autosaveTimer)
        window.clearTimeout(this.autosaveTimer); if (Object.keys(validateDocument(this.state.doc)).length)
        return; this.autosaveTimer = window.setTimeout(() => void this.save(true), 2500); };
    save = async (auto = false) => { if (this.state.saving)
        return; const errors = validateDocument(this.state.doc); if (Object.keys(errors).length) {
        if (!auto)
            this.setState({ errors });
        return;
    } this.setState({ saving: true, saveState: 'saving', errors: {} }); try {
        await this.props.onSave({ ...this.state.doc, updatedAt: new Date().toISOString() }, auto);
        this.setState({ saving: false, saveState: 'saved' });
    }
    catch (e) {
        this.setState({ saving: false, saveState: 'unsaved', errors: { global: e instanceof Error ? e.message : 'Save failed.' } });
    } };
    setDocField = (key, value) => this.mutate(d => ({ ...d, [key]: value }));
    setTerm = (key, value) => this.mutate(d => ({ ...d, terms: { ...d.terms, [key]: value } }));
    setAdjustment = (key, value) => this.mutate(d => ({ ...d, adjustments: { ...d.adjustments, [key]: value } }));
    setAppearance = (key, value) => this.mutate(d => ({ ...d, appearance: { ...d.appearance, [key]: value } }));
    updateItem = (id, key, value) => this.mutate(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, [key]: value } : i) }));
    deleteItem = (id) => this.mutate(d => ({ ...d, items: d.items.filter(i => i.id !== id) }));
    duplicateItem = (id) => this.mutate(d => { const i = d.items.find(x => x.id === id); if (!i)
        return d; const copy = { ...structuredClone(i), id: emptyItem().id }; const idx = d.items.findIndex(x => x.id === id); const items = [...d.items]; items.splice(idx + 1, 0, copy); return { ...d, items }; });
    moveItem = (id, delta) => this.mutate(d => { const idx = d.items.findIndex(i => i.id === id), to = idx + delta; if (idx < 0 || to < 0 || to >= d.items.length)
        return d; const items = [...d.items]; const moved = items.splice(idx, 1)[0]; if (moved)
        items.splice(to, 0, moved); return { ...d, items }; });
    selectCustomer = (c) => { this.mutate(d => ({ ...d, customerSnapshot: customerSnapshotFrom(c) })); this.setState({ customerQuery: c.companyNameEn || c.companyNameAr, customerOpen: false }); };
    addCustomer = async () => { const c = this.state.addCustomer; if (!c)
        return; if (!c.companyNameEn.trim() && !c.companyNameAr.trim()) {
        this.setState({ addCustomerError: 'Company name is required.' });
        return;
    } try {
        await this.props.onSaveCustomer(c);
        this.selectCustomer(c);
        this.setState({ addCustomer: null, addCustomerError: '' });
    }
    catch (e) {
        this.setState({ addCustomerError: e instanceof Error ? e.message : 'Unable to save customer.' });
    } };
    filteredCustomers() { const q = this.state.customerQuery.trim().toLowerCase(); return this.props.customers.filter(c => !q || c.companyNameEn.toLowerCase().includes(q) || c.companyNameAr.includes(this.state.customerQuery.trim())).slice(0, 8); }
    totals() { return calculateTotals(this.state.doc.items, this.state.doc.adjustments); }
    render() {
        const d = this.state.doc;
        const totals = this.totals();
        const errs = this.state.errors;
        return React.createElement("div", { className: `editor-screen ${this.state.mobilePreview ? 'mobile-preview-open' : ''}` },
            React.createElement("header", { className: "editor-topbar" },
                React.createElement("div", { className: "editor-top-left" },
                    React.createElement(IconButton, { icon: "arrowLeft", label: "Back to Documents", onClick: () => this.state.saveState === 'unsaved' ? this.setState({ confirmClose: true }) : this.props.onClose() }),
                    React.createElement("div", null,
                        React.createElement("strong", null, d.number),
                        React.createElement("span", null, d.kind === 'proforma' ? 'Proforma Invoice' : 'Invoice'))),
                React.createElement("div", { className: `save-indicator state-${this.state.saveState}` }, this.state.saveState === 'saving' ? 'Saving…' : this.state.saveState === 'saved' ? React.createElement("span", { className: "saved-state" },
                    React.createElement(Icon, { name: "check" }),
                    React.createElement("span", null, "Saved")) : 'Unsaved Changes'),
                React.createElement("div", { className: "editor-actions" },
                    React.createElement(Button, { icon: "eye", className: "mobile-preview-button", onClick: () => this.setState({ mobilePreview: true }) }, "Preview"),
                    React.createElement(Button, { icon: "printer", variant: "ghost", onClick: () => this.props.onPrint(d, 'print') }, "Print"),
                    React.createElement(Button, { icon: "download", onClick: () => this.props.onPrint(d, 'pdf') }, "PDF"),
                    React.createElement(Button, { icon: "share", onClick: () => this.props.onPrint(d, 'share') }, "Share"),
                    React.createElement(Button, { icon: "save", variant: "primary", disabled: this.state.saving, onClick: () => void this.save(false) }, "Save"))),
            errs.global ? React.createElement("div", { className: "editor-global-error" }, errs.global) : null,
            React.createElement("div", { className: "editor-layout" },
                React.createElement("aside", { className: "editor-pane" },
                    React.createElement("nav", { className: "editor-section-nav" }, [['document', 'Document'], ['customer', 'Customer'], ['items', 'Items'], ['financials', 'Totals'], ['terms', 'Terms'], ['design', 'Design']].map(([id, label]) => React.createElement("button", { key: id, className: this.state.section === id ? 'active' : '', onClick: () => { this.setState({ section: id }); document.getElementById(`editor-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, label))),
                    React.createElement("div", { className: "editor-scroll" },
                        React.createElement("section", { className: "editor-section", id: "editor-document" },
                            React.createElement("div", { className: "section-heading" },
                                React.createElement("span", null, "01"),
                                React.createElement("h2", null, "Document")),
                            React.createElement("div", { className: "form-grid two compact-grid" },
                                React.createElement(Field, { label: "Document Type" },
                                    React.createElement(Select, { value: d.kind, disabled: true },
                                        React.createElement("option", { value: "proforma" }, "Proforma Invoice"),
                                        React.createElement("option", { value: "invoice" }, "Invoice"))),
                                React.createElement(Field, { label: "Document Number", error: errs.number },
                                    React.createElement(Input, { value: d.number, onChange: (e) => this.setDocField('number', e.target.value) })),
                                React.createElement(Field, { label: "Issue Date", error: errs.issueDate },
                                    React.createElement(Input, { type: "date", value: d.issueDate, onChange: (e) => this.setDocField('issueDate', e.target.value) })),
                                React.createElement(Field, { label: d.kind === 'proforma' ? 'Valid Until' : 'Due Date' },
                                    React.createElement(Input, { type: "date", value: d.dueDate, onChange: (e) => this.setDocField('dueDate', e.target.value) })),
                                React.createElement(Field, { label: "Currency" },
                                    React.createElement(Input, { list: "currency-presets", value: d.currency, onChange: (e) => this.setDocField('currency', e.target.value.toUpperCase()) }),
                                    React.createElement("datalist", { id: "currency-presets" }, currencyPresets.map(x => React.createElement("option", { value: x, key: x })))),
                                React.createElement(Field, { label: "Language" },
                                    React.createElement(Select, { value: d.language, onChange: (e) => this.setDocField('language', e.target.value) },
                                        React.createElement("option", { value: "en" }, "English"),
                                        React.createElement("option", { value: "ar" }, "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"),
                                        React.createElement("option", { value: "bilingual" }, "Arabic + English"))))),
                        React.createElement("section", { className: "editor-section", id: "editor-customer" },
                            React.createElement("div", { className: "section-heading" },
                                React.createElement("span", null, "02"),
                                React.createElement("h2", null, "Customer")),
                            React.createElement("div", { className: "customer-select-wrap" },
                                React.createElement(Field, { label: "Customer", error: errs.customer },
                                    React.createElement("div", { className: "search-select" },
                                        React.createElement(Icon, { name: "search" }),
                                        React.createElement(Input, { placeholder: "Search saved customers", value: this.state.customerQuery, onFocus: () => this.setState({ customerOpen: true }), onChange: (e) => this.setState({ customerQuery: e.target.value, customerOpen: true }) }))),
                                this.state.customerOpen ? React.createElement("div", { className: "customer-dropdown" },
                                    this.filteredCustomers().map(c => React.createElement("button", { key: c.id, onClick: () => this.selectCustomer(c) },
                                        React.createElement("strong", null, c.companyNameEn || c.companyNameAr),
                                        React.createElement("span", null, [c.city, c.country].filter(Boolean).join(', ')))),
                                    React.createElement("button", { className: "new-customer-option", onClick: () => this.setState({ addCustomer: blankCustomer(), customerOpen: false }) },
                                        React.createElement(Icon, { name: "plus" }),
                                        "New Customer")) : null),
                            d.customerSnapshot ? React.createElement("div", { className: "selected-customer" },
                                React.createElement("div", null,
                                    React.createElement("strong", null, d.customerSnapshot.companyNameEn || d.customerSnapshot.companyNameAr),
                                    React.createElement("span", null, [d.customerSnapshot.addressEn, d.customerSnapshot.city, d.customerSnapshot.country].filter(Boolean).join(' · ')),
                                    React.createElement("span", null, [d.customerSnapshot.email, d.customerSnapshot.phone].filter(Boolean).join(' · '))),
                                React.createElement("small", null, "Snapshot saved with this document")) : null),
                        React.createElement("section", { className: "editor-section items-editor", id: "editor-items" },
                            React.createElement("div", { className: "section-heading with-action" },
                                React.createElement("div", null,
                                    React.createElement("span", null, "03"),
                                    React.createElement("h2", null, "Items")),
                                React.createElement(Button, { icon: "plus", onClick: () => this.mutate(doc => ({ ...doc, items: [...doc.items, emptyItem()] })) }, "Add Item")),
                            errs.items ? React.createElement("div", { className: "inline-error" }, errs.items) : null,
                            React.createElement("div", { className: "item-cards" }, d.items.map((item, index) => React.createElement("article", { className: "item-card", key: item.id },
                                React.createElement("header", null,
                                    React.createElement("strong", null,
                                        "Item ",
                                        index + 1),
                                    React.createElement("div", null,
                                        React.createElement(IconButton, { icon: "chevronUp", label: "Move up", disabled: index === 0, onClick: () => this.moveItem(item.id, -1) }),
                                        React.createElement(IconButton, { icon: "chevronDown", label: "Move down", disabled: index === d.items.length - 1, onClick: () => this.moveItem(item.id, 1) }),
                                        React.createElement(IconButton, { icon: "copy", label: "Duplicate item", onClick: () => this.duplicateItem(item.id) }),
                                        React.createElement(IconButton, { icon: "trash", label: "Delete item", variant: "danger", disabled: d.items.length === 1, onClick: () => this.deleteItem(item.id) }))),
                                React.createElement("div", { className: "form-grid two compact-grid" },
                                    d.language !== 'ar' ? React.createElement(Field, { label: "Description English", className: "span-2", error: errs[`item-${index}-description`] },
                                        React.createElement(Textarea, { rows: "2", value: item.descriptionEn, onChange: (e) => this.updateItem(item.id, 'descriptionEn', e.target.value) })) : null,
                                    d.language !== 'en' ? React.createElement(Field, { label: "\u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0639\u0631\u0628\u064A", className: "span-2", error: d.language === 'ar' ? errs[`item-${index}-description`] : undefined },
                                        React.createElement(Textarea, { dir: "rtl", rows: "2", value: item.descriptionAr, onChange: (e) => this.updateItem(item.id, 'descriptionAr', e.target.value) })) : null,
                                    React.createElement(Field, { label: "HS Code" },
                                        React.createElement(Input, { value: item.hsCode, onChange: (e) => this.updateItem(item.id, 'hsCode', e.target.value) })),
                                    React.createElement(Field, { label: "Origin" },
                                        React.createElement(Input, { value: item.origin, onChange: (e) => this.updateItem(item.id, 'origin', e.target.value) })),
                                    React.createElement(Field, { label: "Packing" },
                                        React.createElement(Input, { value: item.packing, onChange: (e) => this.updateItem(item.id, 'packing', e.target.value) })),
                                    React.createElement(Field, { label: "Quantity", error: errs[`item-${index}-quantity`] },
                                        React.createElement(Input, { inputMode: "decimal", value: item.quantity, onChange: (e) => this.updateItem(item.id, 'quantity', e.target.value) })),
                                    React.createElement(Field, { label: "Unit" },
                                        React.createElement(Input, { list: "unit-presets", value: item.unit, onChange: (e) => this.updateItem(item.id, 'unit', e.target.value) }),
                                        React.createElement("datalist", { id: "unit-presets" }, unitPresets.map(x => React.createElement("option", { key: x, value: x })))),
                                    React.createElement(Field, { label: `Unit Price (${d.currency})`, error: errs[`item-${index}-price`] },
                                        React.createElement(Input, { inputMode: "decimal", value: item.unitPrice, onChange: (e) => this.updateItem(item.id, 'unitPrice', e.target.value) }))),
                                React.createElement("footer", null,
                                    React.createElement("span", null, "Line Total"),
                                    React.createElement("strong", null, formatMoney(lineTotal(item.quantity, item.unitPrice), d.currency))))))),
                        React.createElement("section", { className: "editor-section", id: "editor-financials" },
                            React.createElement("div", { className: "section-heading" },
                                React.createElement("span", null, "04"),
                                React.createElement("h2", null, "Financials")),
                            React.createElement("div", { className: "adjustments-list" },
                                React.createElement("div", { className: "adjustment-row" },
                                    React.createElement(Toggle, { checked: d.adjustments.discountEnabled, onChange: v => this.setAdjustment('discountEnabled', v), label: "Discount" }),
                                    d.adjustments.discountEnabled ? React.createElement("div", { className: "adjustment-inputs" },
                                        React.createElement(Select, { value: d.adjustments.discountMode, onChange: (e) => this.setAdjustment('discountMode', e.target.value) },
                                            React.createElement("option", { value: "fixed" }, "Fixed"),
                                            React.createElement("option", { value: "percent" }, "Percentage")),
                                        React.createElement(Input, { inputMode: "decimal", value: d.adjustments.discountValue, onChange: (e) => this.setAdjustment('discountValue', e.target.value) })) : null),
                                React.createElement("div", { className: "adjustment-row" },
                                    React.createElement(Toggle, { checked: d.adjustments.shippingEnabled, onChange: v => this.setAdjustment('shippingEnabled', v), label: "Shipping" }),
                                    d.adjustments.shippingEnabled ? React.createElement(Input, { inputMode: "decimal", value: d.adjustments.shipping, onChange: (e) => this.setAdjustment('shipping', e.target.value) }) : null),
                                React.createElement("div", { className: "adjustment-row" },
                                    React.createElement(Toggle, { checked: d.adjustments.otherChargesEnabled, onChange: v => this.setAdjustment('otherChargesEnabled', v), label: "Other Charges" }),
                                    d.adjustments.otherChargesEnabled ? React.createElement(Input, { inputMode: "decimal", value: d.adjustments.otherCharges, onChange: (e) => this.setAdjustment('otherCharges', e.target.value) }) : null),
                                React.createElement("div", { className: "adjustment-row" },
                                    React.createElement(Toggle, { checked: d.adjustments.taxEnabled, onChange: v => this.setAdjustment('taxEnabled', v), label: "Tax / VAT" }),
                                    d.adjustments.taxEnabled ? React.createElement("div", { className: "suffix-input" },
                                        React.createElement(Input, { inputMode: "decimal", value: d.adjustments.taxPercent, onChange: (e) => this.setAdjustment('taxPercent', e.target.value) }),
                                        React.createElement("span", null, "%")) : null)),
                            errs.discount || errs.shipping || errs.otherCharges || errs.tax ? React.createElement("div", { className: "inline-error" }, errs.discount || errs.shipping || errs.otherCharges || errs.tax) : null,
                            React.createElement("div", { className: "editor-totals" },
                                React.createElement("div", null,
                                    React.createElement("span", null, "Subtotal"),
                                    React.createElement("strong", null, formatMoney(totals.subtotal, d.currency))),
                                d.adjustments.discountEnabled ? React.createElement("div", null,
                                    React.createElement("span", null, "Discount"),
                                    React.createElement("strong", null,
                                        "- ",
                                        formatMoney(totals.discount, d.currency))) : null,
                                d.adjustments.shippingEnabled ? React.createElement("div", null,
                                    React.createElement("span", null, "Shipping"),
                                    React.createElement("strong", null, formatMoney(totals.shipping, d.currency))) : null,
                                d.adjustments.otherChargesEnabled ? React.createElement("div", null,
                                    React.createElement("span", null, "Other"),
                                    React.createElement("strong", null, formatMoney(totals.otherCharges, d.currency))) : null,
                                d.adjustments.taxEnabled ? React.createElement("div", null,
                                    React.createElement("span", null, "Tax"),
                                    React.createElement("strong", null, formatMoney(totals.tax, d.currency))) : null,
                                React.createElement("div", { className: "grand" },
                                    React.createElement("span", null, "Grand Total"),
                                    React.createElement("strong", null, formatMoney(totals.grandTotal, d.currency))))),
                        React.createElement("section", { className: "editor-section", id: "editor-terms" },
                            React.createElement("div", { className: "section-heading" },
                                React.createElement("span", null, "05"),
                                React.createElement("h2", null, "Commercial Terms")),
                            React.createElement("div", { className: "form-grid two compact-grid" },
                                React.createElement(Field, { label: "Incoterm" },
                                    React.createElement(Input, { list: "incoterms", value: d.terms.incoterm, onChange: (e) => this.setTerm('incoterm', e.target.value) }),
                                    React.createElement("datalist", { id: "incoterms" }, incoterms.map(x => React.createElement("option", { value: x, key: x })))),
                                React.createElement(Field, { label: "Payment Terms" },
                                    React.createElement(Input, { value: d.terms.paymentTerms, onChange: (e) => this.setTerm('paymentTerms', e.target.value) })),
                                React.createElement(Field, { label: "Packing" },
                                    React.createElement(Input, { value: d.terms.packing, onChange: (e) => this.setTerm('packing', e.target.value) })),
                                React.createElement(Field, { label: "Delivery Time" },
                                    React.createElement(Input, { value: d.terms.deliveryTime, onChange: (e) => this.setTerm('deliveryTime', e.target.value) })),
                                React.createElement(Field, { label: "Port of Loading" },
                                    React.createElement(Input, { value: d.terms.portOfLoading, onChange: (e) => this.setTerm('portOfLoading', e.target.value) })),
                                React.createElement(Field, { label: "Final Destination" },
                                    React.createElement(Input, { value: d.terms.finalDestination, onChange: (e) => this.setTerm('finalDestination', e.target.value) })),
                                React.createElement(Field, { label: "Country of Origin" },
                                    React.createElement(Input, { value: d.terms.countryOfOrigin, onChange: (e) => this.setTerm('countryOfOrigin', e.target.value) })),
                                React.createElement(Field, { label: "Validity" },
                                    React.createElement(Input, { value: d.terms.validity, onChange: (e) => this.setTerm('validity', e.target.value) })),
                                React.createElement(Field, { label: "Remarks", className: "span-2" },
                                    React.createElement(Textarea, { rows: "2", value: d.terms.remarks, onChange: (e) => this.setTerm('remarks', e.target.value) })),
                                React.createElement(Field, { label: "Notes", className: "span-2" },
                                    React.createElement(Textarea, { rows: "3", value: d.notes, onChange: (e) => this.setDocField('notes', e.target.value) })))),
                        React.createElement("section", { className: "editor-section", id: "editor-design" },
                            React.createElement("div", { className: "section-heading" },
                                React.createElement("span", null, "06"),
                                React.createElement("h2", null, "Design")),
                            React.createElement(TemplateThumbnails, { document: d, onSelect: (id) => this.setAppearance('templateId', id) }),
                            React.createElement("div", { className: "appearance-controls" },
                                React.createElement(Field, { label: "Accent Color" },
                                    React.createElement(Input, { type: "color", className: "color-input", value: d.appearance.accentColor, onChange: (e) => this.setAppearance('accentColor', e.target.value) })),
                                React.createElement(Toggle, { checked: d.appearance.showBank, onChange: v => this.setAppearance('showBank', v), label: "Show Bank Details" }),
                                React.createElement(Toggle, { checked: d.appearance.showSignature, onChange: v => this.setAppearance('showSignature', v), label: "Show Signature" }),
                                React.createElement(Toggle, { checked: d.appearance.showStamp, onChange: v => this.setAppearance('showStamp', v), label: "Show Stamp" }),
                                React.createElement(Toggle, { checked: d.appearance.showHsCode, onChange: v => this.setAppearance('showHsCode', v), label: "Show HS Code" }),
                                React.createElement(Toggle, { checked: d.appearance.showOrigin, onChange: v => this.setAppearance('showOrigin', v), label: "Show Origin" }),
                                React.createElement(Toggle, { checked: d.appearance.showPacking, onChange: v => this.setAppearance('showPacking', v), label: "Show Packing" })),
                            React.createElement(Button, { icon: "refresh", onClick: () => this.mutate(doc => refreshCompanySnapshot(doc, this.props.company)) }, "Refresh Company Details"),
                            d.kind === 'proforma' ? React.createElement(Button, { icon: "invoice", variant: "primary", onClick: () => void this.props.onConvert(d) }, "Convert to Invoice") : null))),
                React.createElement("section", { className: "preview-pane" },
                    React.createElement("div", { className: "preview-toolbar" },
                        React.createElement("span", null, "Live A4 Preview"),
                        React.createElement(Segmented, { value: String(this.state.previewScale), onChange: (v) => this.setState({ previewScale: Number(v) }), options: [{ value: '0.72', label: 'Fit' }, { value: '0.9', label: '90%' }, { value: '1', label: '100%' }] })),
                    React.createElement("div", { className: "preview-stage" },
                        React.createElement(TemplateRenderer, { document: d, scale: this.state.previewScale })))),
            React.createElement("div", { className: "mobile-preview-overlay" },
                React.createElement("header", null,
                    React.createElement("strong", null, "Preview"),
                    React.createElement("div", null,
                        React.createElement(Button, { icon: "download", onClick: () => this.props.onPrint(d, 'pdf') }, "PDF"),
                        React.createElement(IconButton, { icon: "x", label: "Close preview", onClick: () => this.setState({ mobilePreview: false }) }))),
                React.createElement("div", { className: "mobile-preview-stage" },
                    React.createElement(TemplateRenderer, { document: d, scale: 0.48 }))),
            React.createElement(ConfirmDialog, { open: this.state.confirmClose, title: "Discard unsaved changes?", message: "Your latest changes have not been saved.", confirmLabel: "Discard", destructive: true, onCancel: () => this.setState({ confirmClose: false }), onConfirm: () => { this.setState({ confirmClose: false }); this.props.onClose(); } }),
            React.createElement(Modal, { open: Boolean(this.state.addCustomer), title: "New Customer", size: "lg", onClose: () => this.setState({ addCustomer: null, addCustomerError: '' }), footer: React.createElement("div", { className: "modal-footer-actions" },
                    React.createElement(Button, { onClick: () => this.setState({ addCustomer: null, addCustomerError: '' }) }, "Cancel"),
                    React.createElement(Button, { variant: "primary", onClick: () => void this.addCustomer() }, "Save & Select")) },
                this.state.addCustomer ? React.createElement(CustomerForm, { customer: this.state.addCustomer, onChange: addCustomer => this.setState({ addCustomer }) }) : null,
                this.state.addCustomerError ? React.createElement("div", { className: "inline-error" }, this.state.addCustomerError) : null));
    }
}
/* src/app/AuthScreenSelector.js */

function AuthScreenSelector(props) {
    if (props.mode === 'setup')
        return React.createElement(SetupScreen, { initialCompany: props.company, onFinish: props.onFinish });
    return React.createElement(UnlockScreen, { onUnlock: props.onUnlock });
}
/* src/app/App.js */














class App extends React.Component {
    state = { loading: true, firstRun: false, unlocked: false, key: null, vault: null, screen: 'documents', editorDoc: null, settingsOpen: false, newMenu: false, deletingDoc: null, toast: '', toastTone: 'default', printDoc: null };
    lockTimer;
    toastTimer;
    componentDidMount() { void this.initialize(); ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, this.activity, { passive: true })); window.addEventListener('afterprint', this.afterPrint); }
    componentWillUnmount() { ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.removeEventListener(ev, this.activity)); window.removeEventListener('afterprint', this.afterPrint); if (this.lockTimer)
        clearTimeout(this.lockTimer); if (this.toastTimer)
        clearTimeout(this.toastTimer); }
    initialize = async () => { try {
        const configured = await hasSecurity();
        this.setState({ loading: false, firstRun: !configured, unlocked: false });
    }
    catch (e) {
        this.setState({ loading: false });
        this.showToast(e instanceof Error ? e.message : 'Unable to access local storage.', 'error');
    } };
    activity = () => { if (this.state.unlocked)
        this.resetAutoLock(); };
    resetAutoLock = () => { if (this.lockTimer)
        window.clearTimeout(this.lockTimer); const mins = this.state.vault?.appSettings.autoLockMinutes ?? 15; if (mins > 0)
        this.lockTimer = window.setTimeout(() => this.lock(), mins * 60_000); };
    showToast = (toast, tone = 'default') => { if (this.toastTimer)
        clearTimeout(this.toastTimer); this.setState({ toast, toastTone: tone }); this.toastTimer = window.setTimeout(() => this.setState({ toast: '' }), 3600); };
    finishSetup = async (pin, company) => { const vault = { ...emptyVault(), company }; const setup = await setupVault(pin, vault); this.setState({ firstRun: false, unlocked: true, key: setup.key, vault: setup.vault, screen: 'documents' }, this.resetAutoLock); this.showToast('LOUREX Invoice is ready.', 'success'); };
    unlock = async (pin) => { const result = await unlockVault(pin); this.setState({ unlocked: true, key: result.key, vault: result.vault, screen: 'documents', editorDoc: null }, this.resetAutoLock); };
    lock = () => { if (this.lockTimer)
        window.clearTimeout(this.lockTimer); this.setState({ unlocked: false, key: null, vault: null, editorDoc: null, screen: 'documents', settingsOpen: false, newMenu: false }); };
    persist = async (vault) => { if (!this.state.key)
        throw new Error('App is locked.'); await saveVault(this.state.key, vault); this.setState({ vault }); };
    reserveDocument = async (kind) => { const vault = this.requireVault(); const next = nextDocumentNumber(vault, kind); await this.persist(next.vault); return { doc: createBlankDocument(kind, next.number, next.vault.company), vault: next.vault }; };
    newDocument = async (kind) => { try {
        const { doc } = await this.reserveDocument(kind);
        this.setState({ screen: 'editor', editorDoc: doc, newMenu: false });
    }
    catch (e) {
        this.showToast(e instanceof Error ? e.message : 'Unable to create document.', 'error');
    } };
    saveDocument = async (doc, auto = false) => { const vault = this.requireVault(); if (vault.documents.some(d => d.id !== doc.id && d.number.trim().toLowerCase() === doc.number.trim().toLowerCase()))
        throw new Error('Document number already exists.'); const index = vault.documents.findIndex(d => d.id === doc.id); const documents = [...vault.documents]; const updated = { ...doc, updatedAt: new Date().toISOString() }; if (index >= 0)
        documents[index] = updated;
    else
        documents.push(updated); await this.persist({ ...vault, documents }); this.setState({ editorDoc: updated }); if (!auto)
        this.showToast('Document saved.', 'success'); };
    openDocument = (doc) => this.setState({ screen: 'editor', editorDoc: structuredClone(doc) });
    duplicate = async (source) => { try {
        const { doc: blank, vault } = await this.reserveDocument(source.kind);
        const copy = duplicateDocument(source, blank.number);
        const next = { ...vault, documents: [...vault.documents, copy] };
        await this.persist(next);
        this.setState({ screen: 'editor', editorDoc: copy });
        this.showToast('Duplicate created.', 'success');
    }
    catch (e) {
        this.showToast(e instanceof Error ? e.message : 'Duplicate failed.', 'error');
    } };
    convert = async (source) => { try {
        const current = this.requireVault();
        const errors = validateDocument(source);
        if (Object.keys(errors).length)
            throw new Error('Save a valid Proforma before converting it.');
        if (current.documents.some(d => d.id !== source.id && d.number.trim().toLowerCase() === source.number.trim().toLowerCase()))
            throw new Error('Document number already exists.');
        const savedSource = { ...source, updatedAt: new Date().toISOString() };
        const sourceIndex = current.documents.findIndex(d => d.id === source.id);
        const sourceDocuments = [...current.documents];
        if (sourceIndex >= 0)
            sourceDocuments[sourceIndex] = savedSource;
        else
            sourceDocuments.push(savedSource);
        const withSource = { ...current, documents: sourceDocuments };
        const numbered = nextDocumentNumber(withSource, 'invoice');
        const converted = convertToInvoice(savedSource, numbered.number);
        const next = { ...numbered.vault, documents: [...sourceDocuments, converted] };
        await this.persist(next);
        this.setState({ screen: 'editor', editorDoc: converted });
        this.showToast(`Created ${converted.number}.`, 'success');
    }
    catch (e) {
        this.showToast(e instanceof Error ? e.message : 'Conversion failed.', 'error');
    } };
    deleteDocument = async () => { const target = this.state.deletingDoc; if (!target)
        return; try {
        const vault = this.requireVault();
        await this.persist({ ...vault, documents: vault.documents.filter(d => d.id !== target.id) });
        this.setState({ deletingDoc: null });
        this.showToast('Document deleted.', 'success');
    }
    catch (e) {
        this.showToast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    } };
    saveCustomer = async (customer) => { const vault = this.requireVault(); const index = vault.customers.findIndex(c => c.id === customer.id); const customers = [...vault.customers]; if (index >= 0)
        customers[index] = { ...customer, updatedAt: new Date().toISOString() };
    else
        customers.push(customer); await this.persist({ ...vault, customers }); };
    deleteCustomer = async (customer) => { const vault = this.requireVault(); await this.persist({ ...vault, customers: vault.customers.filter(c => c.id !== customer.id) }); this.showToast('Customer deleted.', 'success'); };
    saveCompany = async (company) => { const vault = this.requireVault(); await this.persist({ ...vault, company }); };
    saveAppSettings = async (appSettings) => { const vault = this.requireVault(); await this.persist({ ...vault, appSettings }); this.resetAutoLock(); };
    changePin = async (currentPin, newPin) => { const result = await changePin(currentPin, newPin); this.setState({ key: result.key }); this.showToast('PIN changed.', 'success'); };
    backup = async (pin) => { const security = await getSecurity(); if (!security)
        throw new Error('Security settings are missing.'); await verifyPin(pin, security); await exportBackup(pin, this.requireVault()); };
    restore = async (file, pin) => { if (!this.state.key)
        throw new Error('App is locked.'); const restored = await readBackup(file, pin); const vault = await restoreVaultWithCurrentKey(this.state.key, restored); this.setState({ vault, screen: 'documents', editorDoc: null }, this.resetAutoLock); };
    requireVault() { if (!this.state.vault)
        throw new Error('App is locked.'); return this.state.vault; }
    requestPrint = async (doc, mode) => { try {
        const errors = validateDocument(doc);
        if (Object.keys(errors).length)
            throw new Error('Complete the required document fields before printing or sharing.');
        let target = { ...doc, status: 'final', updatedAt: new Date().toISOString() };
        const vault = this.requireVault();
        if (vault.documents.some(d => d.id !== target.id && d.number.trim().toLowerCase() === target.number.trim().toLowerCase()))
            throw new Error('Document number already exists.');
        const idx = vault.documents.findIndex(d => d.id === target.id);
        const documents = [...vault.documents];
        if (idx >= 0)
            documents[idx] = target;
        else
            documents.push(target);
        await this.persist({ ...vault, documents });
        const customer = target.customerSnapshot?.companyNameEn || target.customerSnapshot?.companyNameAr || 'Customer';
        const prefix = `LOUREX-${safeFilename(target.number)}-${safeFilename(customer)}`;
        document.title = prefix;
        this.setState({ printDoc: target }, () => { document.body.classList.add('printing'); window.setTimeout(() => window.print(), 70); });
        if (mode === 'pdf')
            this.showToast('PDF print view opened — choose “Save as PDF”.', 'default');
        else if (mode === 'share')
            this.showToast('System print view opened — save/share the PDF from your device.', 'default');
    }
    catch (e) {
        this.showToast(e instanceof Error ? e.message : 'Unable to prepare document.', 'error');
    } };
    afterPrint = () => { document.body.classList.remove('printing'); document.title = 'LOUREX Invoice'; this.setState({ printDoc: null }); };
    closeEditor = () => { this.setState({ screen: 'documents', editorDoc: null }); };
    render() {
        if (this.state.loading)
            return React.createElement("div", { className: "loading-screen" },
                React.createElement(Brand, null),
                React.createElement("span", { className: "loading-line" }));
        if (this.state.firstRun)
            return React.createElement(AuthScreenSelector, { mode: "setup", company: defaultCompany(), onFinish: this.finishSetup });
        if (!this.state.unlocked)
            return React.createElement(AuthScreenSelector, { mode: "unlock", onUnlock: this.unlock });
        const vault = this.requireVault();
        return React.createElement("div", { className: "app-root" },
            React.createElement("div", { className: "app-ui" },
                React.createElement("header", { className: "app-header" },
                    React.createElement("button", { className: "header-brand", disabled: this.state.screen === 'editor', onClick: () => this.setState({ screen: 'documents', editorDoc: null }) },
                        React.createElement(Brand, { compact: true })),
                    this.state.screen !== 'editor' ? React.createElement("nav", { className: "main-nav" },
                        React.createElement("button", { className: this.state.screen === 'documents' ? 'active' : '', onClick: () => this.setState({ screen: 'documents', editorDoc: null }) },
                            React.createElement(Icon, { name: "file" }),
                            "Documents"),
                        React.createElement("button", { className: this.state.screen === 'customers' ? 'active' : '', onClick: () => this.setState({ screen: 'customers', editorDoc: null }) },
                            React.createElement(Icon, { name: "users" }),
                            "Customers")) : React.createElement("div", { className: "header-editor-context" }, "Document Editor"),
                    React.createElement("div", { className: "header-actions" },
                        this.state.screen !== 'editor' ? React.createElement("div", { className: "new-doc-menu" },
                            React.createElement(Button, { icon: "plus", variant: "primary", onClick: () => this.setState({ newMenu: !this.state.newMenu }) }, "New Document"),
                            this.state.newMenu ? React.createElement("div", { className: "new-menu" },
                                React.createElement("button", { onClick: () => void this.newDocument('proforma') },
                                    React.createElement(Icon, { name: "proforma" }),
                                    React.createElement("span", null,
                                        React.createElement("strong", null, "Proforma Invoice"),
                                        React.createElement("small", null, "Commercial quotation"))),
                                React.createElement("button", { onClick: () => void this.newDocument('invoice') },
                                    React.createElement(Icon, { name: "invoice" }),
                                    React.createElement("span", null,
                                        React.createElement("strong", null, "Invoice"),
                                        React.createElement("small", null, "Final invoice")))) : null) : null,
                        React.createElement(IconButton, { icon: "settings", label: "Settings", onClick: () => this.setState({ settingsOpen: true }) }))),
                React.createElement("main", { className: this.state.screen === 'editor' ? 'editor-main' : 'main-content' },
                    this.state.screen === 'documents' ? React.createElement(DocumentsPage, { documents: vault.documents, onNew: (k) => void this.newDocument(k), onOpen: this.openDocument, onDuplicate: (d) => void this.duplicate(d), onPrint: (d, m) => void this.requestPrint(d, m), onDelete: (d) => this.setState({ deletingDoc: d }) }) : null,
                    this.state.screen === 'customers' ? React.createElement(CustomersPage, { customers: vault.customers, onSave: this.saveCustomer, onDelete: this.deleteCustomer }) : null,
                    this.state.screen === 'editor' && this.state.editorDoc ? React.createElement(EditorPage, { document: this.state.editorDoc, customers: vault.customers, company: vault.company, onClose: this.closeEditor, onSave: this.saveDocument, onSaveCustomer: this.saveCustomer, onConvert: this.convert, onPrint: (d, m) => void this.requestPrint(d, m) }) : null),
                React.createElement(SettingsModal, { open: this.state.settingsOpen, company: vault.company, appSettings: vault.appSettings, onClose: () => this.setState({ settingsOpen: false }), onSaveCompany: this.saveCompany, onSaveAppSettings: this.saveAppSettings, onChangePin: this.changePin, onLock: this.lock, onBackup: this.backup, onRestore: this.restore }),
                React.createElement(ConfirmDialog, { open: Boolean(this.state.deletingDoc), title: `Delete ${this.state.deletingDoc?.number ?? 'document'}?`, message: "This action cannot be undone.", onCancel: () => this.setState({ deletingDoc: null }), onConfirm: () => void this.deleteDocument() }),
                React.createElement(Toast, { text: this.state.toast, tone: this.state.toastTone })),
            React.createElement("div", { className: "print-portal" }, this.state.printDoc ? React.createElement(TemplateRenderer, { document: this.state.printDoc, scale: 1 }) : null));
    }
}
/* src/app/index.js */

const root = document.getElementById('root');
if (!root)
    throw new Error('Root element not found.');
ReactDOM.render(React.createElement(App, null), root);
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => Promise.resolve());
}