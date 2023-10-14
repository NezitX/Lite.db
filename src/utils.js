const { createCipheriv, createDecipheriv, randomBytes } = require("crypto");

function isObject(obj) {
  if (!Array.isArray(obj) && typeof obj === "object" && obj !== null)
    return true;
  return false;
}
function LiteError(text) {
  throw new Error(`[Lite.db]: ${text}`);
}
function convertDataStyleToObject(dataToConvert) {
  return dataToConvert.reduce((obj, data) => {
    obj[data.key] = data;
    return obj;
  }, {});
}
function convertDataStyleToArray(data) {
  return Object.entries(data).map(([key, value]) => value);
}
const DatabaseEvents = {
  Ready: "ready",
  New: "new",
  Update: "update",
  Remove: "remove",
  Clear: "clear",
  Clean: "Clean",
};
function encrypt(data, key, initVector) {
  const algorithm = "aes-256-ctr";
  const cipher = createCipheriv(algorithm, key, initVector);

  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return `${initVector.toString("hex")}:${encrypted.toString("hex")}`;
}
function decrypt(encryptData, key) {
  const algorithm = "aes-256-ctr";
  const enc = encryptData.split(':');
  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(enc[0], "hex"),
  );

  const decrpyted = Buffer.concat([
    decipher.update(Buffer.from(enc[1], "hex")),
    decipher.final(),
  ]);

  return JSON.parse(decrpyted.toString());
}


module.exports = {
  isObject,
  LiteError,
  convertDataStyleToObject,
  convertDataStyleToArray,
  DatabaseEvents,
  encrypt,
  decrypt
};
