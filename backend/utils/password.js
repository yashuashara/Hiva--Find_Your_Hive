// Password hashing with Node's built-in scrypt (memory-hard, no native
// dependency to compile). Parameters follow the OWASP Password Storage Cheat
// Sheet (N=2^15, r=8, p=3) and are stored with each hash so they can be
// raised later without breaking existing accounts.
const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

const PARAMS = { N: 2 ** 15, r: 8, p: 3 };
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEM });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

async function verifyPassword(password, stored) {
  const parts = typeof stored === "string" ? stored.split("$") : [];
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEM,
  });
  return crypto.timingSafeEqual(actual, expected);
}

// A real hash of a random password, used when a login email does not exist so
// that "unknown email" and "wrong password" take the same amount of time.
let dummyHashPromise;
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(crypto.randomBytes(16).toString("hex"));
  return dummyHashPromise;
}

module.exports = { hashPassword, verifyPassword, getDummyHash };
