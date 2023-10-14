const fs = require("node:fs").promises;
const {
  isObject,
  LiteError,
  convertDataStyleToObject,
  convertDataStyleToArray,
  DatabaseEvents,
  encrypt,
  decrypt
} = require("../utils.js");
const { randomBytes } = require("crypto");
const Element = require("../database/element.js");
const EventEmitter = require("events");

module.exports = class keyValueJson extends EventEmitter {
  #options;
  constructor(options) {
    super();
    if (options === undefined) options = {}; //return LiteError('Argument Not Found, json "options" required.');
    if (!isObject(options))
      return LiteError('Invalid Format, "options" must be Object.');
    this.#options = this.#finalizeOptions(options);
    this.cache = {};
  }

  #finalizeOptions(options) {
    if (options.path === undefined) options.path = "./database";
    if (typeof options.path !== "string")
      return LiteError('Invalid Format, options > "path" must be String.');
    if (options.dataStyle === undefined) options.dataStyle = "object";
    if (options.dataStyle !== "object" && options.dataStyle !== "array")
      return LiteError(
        'Invalid Choose Format, options > "dataStyle" must be "object" or "array".'
      );
    if (options.tables === undefined) options.tables = ["main"];
    if (!Array.isArray(options.tables))
      return LiteError(`Invalid Format, options > "tables" must be Array.`);
    if (options.tables.length < 1) options.tables = ["main"];
    if (!options.tables.includes("main")) options.tables.push("main");
    if (options.limit === undefined) options.limit = 100;
    if (typeof options.limit !== "number")
      return LiteError('Invalid Format, options > "limit" must be Number.');
    if (options.encryptOptions === undefined) options.encryptOptions = {};
    if (!isObject(options.encryptOptions))
      return LiteError('Invalid Format, options > "encryptOptions" must be Object.');
    if (options.encryptOptions.encrypt === undefined) options.encryptOptions.encrypt = false;
    if (typeof options.encryptOptions.encrypt !== 'boolean')
      return LiteError('Invalid Format, options > encryptOptions > "encrypt" must be Boolean.');
    if (options.encryptOptions.encrypt === true && options.encryptOptions.secretKey === undefined)
      return LiteError(`Undefined Property, options > encryptOptions > "secretKey" required.`)
    if (options.encryptOptions.encrypt === true && typeof options.encryptOptions.secretKey !== 'string')
      return LiteError('Invalid Format, options > encryptOptions > "secretKey" must be String.');
    if (options.encryptOptions.encrypt === true && options.encryptOptions.secretKey.length < 32)
      return LiteError(`Worng Format, options > encryptOptions > "secretKey" length must be 32 character.`);
    if (options.encryptOptions.encrypt === true && !options.encryptOptions.initVector) 
      return LiteError('Invalid Format, options > encryptOptions > "initVector" must be String.');
    console.log(options.encryptOptions.initVector)

    if (options.encryptOptions.encryptType === undefined) options.encryptOptions.encryptType = "value";
    if (typeof options.encryptOptions.encryptType !== 'string')
      return LiteError('Invalid Format, options > encryptOptions > "encryptType" must be String.');
    if (options.elementOptions === undefined) options.elementOptions = {};
    if (!isObject(options.elementOptions))
      return LiteError('Invalid Format, options > "elementOptions" must be Object.');
    if (options.elementOptions.randomId === undefined) options.elementOptions.randomId = false;
    if (typeof options.elementOptions.id !== "boolean")
      return LiteError('Invalid Format, options > elementOptions > "id" must be Boolean.');
    if (options.elementOptions.key === undefined) options.elementOptions.key = true;
    if (typeof options.elementOptions.key !== "boolean")
      return LiteError('Invalid Format, options > elementOptions > "key" must be Boolean.');
    if (options.elementOptions.type === undefined) options.elementOptions.type = true;
    if (typeof options.elementOptions.type !== "boolean")
      return LiteError('Invalid Format, options > elementOptions > "type" must be Boolean.');

    return options;
  }

  async #saveTable(data, table) {
    try {
      const tablePath = `${this.#options.path}/${table}/${table}-litedb.json`;
      await fs.writeFile(tablePath, JSON.stringify(data));
    } catch (error) {
      LiteError(error);
    }
  };

  async #readTable(table) {
    try {
      const tablePath = `${this.#options.path}/${table}/${table}-litedb.json`;
      const data = await fs.readFile(tablePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      LiteError(error);
    }
  };

  async #getTable(table) {
    await this.connect();
    const tables = this.#options.tables;
    if (table === undefined)
      return LiteError(`Table Undefined, table required.`);
    if (!tables.includes(table))
      return LiteError(
        `Table Not Found, "${table}" does exist in tables.`
      );
    const data = await this.#readTable(table);
    return data;
  };

  async connect() {
    const tables = this.#options.tables;
    for (const table of tables) {
      const tablePath = `${this.#options.path}/${table}/`;
      try {
        await fs.access(tablePath);
      } catch (error) {
        await fs.mkdir(tablePath, { recursive: true });
        await this.#saveTable(
          this.#options.dataStyle === "object" ? {} : [],
          table
        );
      }
      const data = await this.#readTable(table);
      if (!data) {
        data = this.#options.dataStyle === "object" ? {} : [];
        await this.#saveTable(data, table);
      }
      if (this.#options.dataStyle === "object" && Array.isArray(data)) {
        const newData = convertDataStyleToObject(data);
        data = newData;
        await this.#saveTable(data, table);
      } else if (this.#options.dataStyle === "array" && isObject(data)) {
        const newData = convertDataStyleToArray(data);
        data = newData;
        await this.#saveTable(data, table);
      }
    }
    this.emit(DatabaseEvents.Ready, this);
  };

  get options() {
    return this.#options;
  };

  get limit() {
    return this.#options.limit;
  };

  async size() {
    try {
      let length = 0;
      for (const table of this.#options.tables) {
        const tablePropertys = await this.#getTable(table);
        const data =
          this.#options.dataStyle === "object" ?
          Object.keys(tablePropertys) :
          tablePropertys;
        length += data.length;
      }
      return length;
    } catch (error) {
      LiteError(error);
    }
  };

  async set(...pro) {
    let table, key, value, id, ttl;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      key = pro[0]?.key;
      value = pro[0]?.value;
      id = pro[0]?.id;
      ttl = pro[0]?.ttl;
    } else {
      table = pro[0];
      key = pro[1];
      value = pro[2];
      id = pro[3];
      ttl = pro[4];
    }
    const data = await this.#getTable(table);
    if (!key)
      return LiteError(`Argument Not Found, cannot set value "key" required.`);
    if (typeof key !== "string")
      return LiteError(
        `Invalid Format, cannot set value "key" must be string.`
      );
    if (this.size === this.#options.limit)
      return LiteError(
        `Database At Limit, cannot set more data ... the database at limit: ${this.size}`
      );
    const elementOptions = {
      randomId: this.#options.elementOptions.randomId,
      type: this.#options.elementOptions.type,
      key: this.#options.dataStyle === 'array' ?
        true : this.#options.elementOptions.key
    }
    let element = new Element({ key, id, value, ttl }, elementOptions);
    const old = await this.get({ table, key, id });
    key = element.key;
    if (elementOptions.type === false && element.hasOwnProperty('type')) {
      delete element['type'];
    };
    if (elementOptions.key === false && this.#options.dataStyle === "object" && element.hasOwnProperty('key')) {
      delete element['key'];
    };
    if (this.#options.encryptOptions.encrypt === true) {
      if (this.#options.encryptOptions.encryptType === "value") {
        if (element.hasOwnProperty('value') && element.value !== undefined)
          element.value = encrypt(
            element.value, 
            this.#options.encryptOptions.secretKey,
            this.#options.encryptOptions.initVector
          );
        if (element.hasOwnProperty('type'))
          element.type = encrypt(
            element.type, 
            this.#options.encryptOptions.secretKey,
            this.#options.encryptOptions.initVector
          );
      } else if (this.#options.encryptOptions.encryptType === "key") {
        key = encrypt(
          key, 
          this.#options.encryptOptions.secretKey,
          this.#options.encryptOptions.initVector
        );
        if (element.hasOwnProperty('key'))
          element.key = encrypt(
            element.key, 
            this.#options.encryptOptions.secretKey,
            this.#options.encryptOptions.initVector
          );
      } else {
        key = encrypt(
          key, 
          this.#options.encryptOptions.secretKey,
          this.#options.encryptOptions.initVector
        );
        if (element.hasOwnProperty('key'))
          element.key = encrypt(
            element.key, 
            this.#options.encryptOptions.secretKey,
            this.#options.encryptOptions.initVector
          );
        if (element.hasOwnProperty('value') && element.value !== undefined)
          element.value = encrypt(
            element.value, 
            this.#options.encryptOptions.secretKey,
            this.#options.encryptOptions.initVector
          );
        if (element.hasOwnProperty('type'))
          element.type = encrypt(
            element.type, 
            this.#options.encryptOptions.secretKey,
            this.#options.encryptOptions.initVector
          );
      }
    };
    this.#options.dataStyle === 'object' ?
      data[key] = element :
      data.push(element);
    await this.#saveTable(data, table);
    
    if (old === undefined) {
      this.emit(DatabaseEvents.New, element);
    } else {
      this.emit(DatabaseEvents.Update, old, element);
    }
    return element;
  };

  async delete(...pro) {
    let table, key, id;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      key = pro[0]?.key;
      id = pro[0]?.id;
    } else {
      table = pro[0];
      key = pro[1];
      id = pro[2];
    }
    const data = await this.#getTable(table);
    if (!key)
      return LiteError(`Argument Not Found, cannot set value "key" required.`);
    if (typeof key !== "string")
      return LiteError(
        `Invalid Format, cannot set value "key" must be string.`
      );
    const element = await this.get({ table, key, id });
    if (element !== undefined) {
      if (this.#options.dataStyle === "object") {  
        this.cache[element.key] = element;
        setTimeout(() => {
          delete this.cache[element.key];
        }, 3600000);
        delete data[this.#options.encryptOptions.encrypt ? encrypt(
          element.key, 
          this.#options.encryptOptions.secretKey,
          this.#options.encryptOptions.initVector
        ) : key];
      } else {
        data.splice(data.findIndex((e) => e.key === this.#options.encryptOptions.encrypt 
          ? encrypt(
              element.key, 
              this.#options.encryptOptions.secretKey,
              this.#options.encryptOptions.initVector
            ) 
          : key), 1);
      }
      await this.#saveTable(data, table);
      this.emit(DatabaseEvents.Remove, element);
      return true; 
    }
    return undefined;
  }

  async get(...pro) {
    let table, key, id;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      key = pro[0]?.key;
      id = pro[0]?.id;
    } else {
      table = pro[0];
      key = pro[1];
      id = pro[2];
    }
    
    if (!key)
      return LiteError(`Argument Not Found, cannot set value "key" required.`);
    if (typeof key !== "string")
      return LiteError(
        `Invalid Format, cannot set value "key" must be string.`
      );
    const elementOptions = {
      randomId: this.#options.elementOptions.randomId,
      type: this.#options.elementOptions.type,
      key: this.#options.dataStyle === 'array' ?
        true : this.#options.elementOptions.key
    }
    const element = new Element({ key, id }, elementOptions);

    let notCached = false;
    if (this.cache[element.key] !== undefined) {
      return this.cache[element.key]
    } else {
      notCached = true;
    }
    
    if (this.#options.encryptOptions.encrypt === true) {
      if (
        this.#options.encryptOptions.encryptType === "key" || 
        this.#options.encryptOptions.encryptType === "both"
      ) {
        key = encrypt(
          element.key, 
          this.#options.encryptOptions.secretKey,
          this.#options.encryptOptions.initVector
        );
      }
    } else {
      key = element.key;
    }
    let res = null;
    const data = await this.#getTable(table);
    if (this.#options.dataStyle === 'object') {
      res = data[key];
    } else {
      res = data.find((k) => k.key === key);
    }
    let elementResult = res ? { ...res } : undefined;
    if (elementResult) {
      if (this.#options.encryptOptions.encrypt === true) {
        if (this.#options.encryptOptions.encryptType === "value") {
          if (elementResult.hasOwnProperty('value') && elementResult.value !== undefined)
            elementResult.value = decrypt(elementResult.value, this.#options.encryptOptions.secretKey);
          if (elementResult.hasOwnProperty('type'))
            elementResult.type = decrypt(elementResult.type, this.#options.encryptOptions.secretKey);
        } else if (this.#options.encryptOptions.encryptType === "key") {
          if (elementResult.hasOwnProperty('key'))
            elementResult.key = decrypt(elementResult.key, this.#options.encryptOptions.secretKey);
        } else {
          if (elementResult.hasOwnProperty('key'))
            elementResult.key = decrypt(elementResult.key, this.#options.encryptOptions.secretKey);
          if (elementResult.hasOwnProperty('value') && elementResult.value !== undefined)
             elementResult.value = decrypt(elementResult.value, this.#options.encryptOptions.secretKey);
          if (elementResult.hasOwnProperty('type'))
            elementResult.type = decrypt(elementResult.type, this.#options.encryptOptions.secretKey);
        } 
      }
      this.cache[elementResult.key] = elementResult;
      setTimeout(() => {
        delete this.cache[elementResult.key];
      }, 3600000);
      return elementResult;
    } else return undefined;
  }

  async has(...pro) {
    let table, key, id;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      key = pro[0]?.key;
      id = pro[0]?.id;
    } else {
      table = pro[0];
      key = pro[1];
      id = pro[2];
    }
    return (await this.get({ table, key, id })) !== undefined;
  }

  async all(...pro) {
    let table;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
    } else {
      table = pro[0];
    }
    const data = await this.#getTable(table);
    const res = this.#options.dataStyle === 'object' ? {} : [];
    if (this.#options.encryptOptions.encrypt === true) {
      for (const e of Object.keys(data)) {
        const element = data[e];
        if (this.#options.encryptOptions.encryptType === "value") {
          element.value = decrypt(the.value, this.#options.encryptOptions.secretKey);
          if (element.hasOwnProperty('type'))
            element.type = decrypt(element.type, this.#options.encryptOptions.secretKey);
        } else if (this.#options.encryptOptions.encryptType === "key") {
          if (element.hasOwnProperty('key'))
            element.key = decrypt(element.key, this.#options.encryptOptions.secretKey);
        } else {
          element.value = decrypt(element.value, this.#options.encryptOptions.secretKey);
          if (element.hasOwnProperty('key'))
            element.key = decrypt(element.key, this.#options.encryptOptions.secretKey);
          if (element.hasOwnProperty('type'))
            element.type = decrypt(element.type, this.#options.encryptOptions.secretKey);
        }
        this.#options.dataStyle === 'object' 
          ? res[element.key] = element
          : res.push(element);
        
        this.cache[element.key] = element;
        setTimeout(() => {
          delete this.cache[element.key];
        }, 3600000);
      }
    }
    
    return res;
  }

  async clear(...pro) {
    let table;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
    } else {
      table = pro[0];
    }
    let data = await this.#getTable(table);
    const date = Date.now();
    const cd = this.cache[`CLEARED_DATA_${date}`] = data;
    setTimeout(() => {
      delete this.cache[`CLEARED_DATA_${date}`];
    }, 3600000);
    data = this.#options.dataStyle === "object" ? {} : [];
    await this.#saveTable(data, table);
    this.emit(DatabaseEvents.Clear, table);
    return true;
  };

  async clearAll() {
    for (const table of this.#options.tables) {
      await this.clear(table);
    }
    return true;
  };

  async clean(...pro) {
    let table;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
    } else {
      table = pro[0];
    }
    const data = await this.#getTable(table);
    const date = Date.now();
    const cd = this.cache[`CLEANED_DATA_${date}`] = {};
    for (const e of Object.keys(data)) {
      if (data[e]?.value === undefined) {
        if (this.#options.dataStyle === "object") {
          cd[e] = data[e];
          delete data[e];
        } else {
          cd[e.key] = e;
          data.splice(e, 1);
        }
      }
    }
    setTimeout(() => {
      delete this.cache[`CLENED_DATA_${date}`];
    }, 3600000);
    await this.#saveTable(data, table);
    this.emit(DatabaseEvents.Clean, table);
    return true;
  };

  async cleanAll() {
    for (const table of this.#options.tables) {
      await this.clean(table);
    }
    return true;
  };

  async setMany(...pro) {
    let table, values;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      values = pro[0]?.values;
    } else {
      table = pro[0];
      values = pro[1];
    }
    for (const [key, value, id, ttl] of values) {
      await this.set(table, key, value, id, ttl);
    }
    return true;
  };

  async deleteMany(...pro) {
    let table, keys;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      keys = pro[0]?.keys;
    } else {
      table = pro[0];
      keys = pro[1];
    }
    for (const [key, id] of keys) {
      await this.delete(table, key, id);
    }
    return true;
  };

  async getMany(...pro) {
    let table, keys;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      keys = pro[0]?.keys;
    } else {
      table = pro[0];
      keys = pro[1];
    }
    return keys.map(async ([key, id]) => await this.get(table, key, id));
  };

  async hasMany(...pro) {
    let table, keys;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      keys = pro[0]?.keys;
    } else {
      table = pro[0];
      keys = pro[1];
    }
    return keys.map(async ([key, id]) => await this.has(table, key, id));
  };

  async find(...pro) {
    let table, callback;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      callback = pro[0]?.callback;
    } else {
      table = pro[0];
      callback = pro[1];
    }
    const data = await this.#getTable(table);
    for (const e of Object.keys(data)) {
      const element = data[e];
      if (callback(element)) {
        return element;
      }
    }
  };
};