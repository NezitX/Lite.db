const {
  isObject,
  LiteError,
  convertDataStyleToObject,
  convertDataStyleToArray,
  DatabaseEvents,
  encrypt,
  decrypt
} = require("../utils.js");
const Element = require("../database/element.js");
const EventEmitter = require("events");

module.exports = class keyValueCache extends EventEmitter {
  #options;
  #db;
  /**
     * @description create a new cache database
     * @param options options to create cache database
     *
     * @example
     * ```js
     * const db = new KeyValueCache({
     *  dataStyle: 
     *  encryptionConfig:{
     *  encriptData:true,
     *  securityKey:"a-32-characters-long-string-here"
     *  }
     * })
     * ```
     */
  
  constructor(options) {
    super();
    if (options === undefined) options = {}; //return LiteError('Argument Not Found, json "options" required.');
    if (!isObject(options))
      return LiteError('Invalid Format, "options" must be Object.');
    this.#options = this.#finalizeOptions(options);
    this.#db = {};
  }

  /**
     * @private
     * @description finalize options
     * @param options options to finalize
     * @returns
     */
  
  #finalizeOptions(options) {
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
  };
  
  /**
     * @private
     * @description get table data
     * @param table name
     * @returns
     */
  
  #getTable(table) {
    this.connect();
    const tables = this.#options.tables;
    if (table === undefined)
      return LiteError(`Table Undefined, table required.`);
    if (!tables.includes(table))
      return LiteError(
        `Table Not Found, "${table}" does exist in tables.`
      );
    return this.#db[table];
  };

  /**
     * @description connect to cache database
     *
     *
     * @example
     * ```js
     * <KeyValueCache>.connect()
     * ```
     */
  
  connect() {
    const tables = this.#options.tables;
    for (const table of tables) {
      const data = this.#db[table];
      if (!data) {
        this.#db[table] = this.#options.dataStyle === "object" ? {} : [];
      }
      if (this.#options.dataStyle === "object" && Array.isArray(data)) {
        this.#db[table] = convertDataStyleToObject(data);
      } else if (this.#options.dataStyle === "array" && isObject(data)) {
        this.#db[table] = convertDataStyleToArray(data);
      }
    }
    this.emit(DatabaseEvents.Ready, this);
  };

  /**
     * @description get cache database options
     * @static
     * @returns database options
     */

  get options() {
    return this.#options;
  };

  /**
     * @description get database limit 
     * @static
     * @returns database limit
     */

  get limit() {
    return this.#options.limit;
  };

  /**
     * @description get database size
     * @static
     * @returns database size
     */

  get size() {
    let length = 0;
    for (const table of this.#options.tables) {
      const tablePropertys = this.#getTable(table);
      const data =
        this.#options.dataStyle === "object" ?
        Object.keys(tablePropertys) :
        tablePropertys;
      length += data.length;
    }
    return length;
  };

  /**
     * @description set element to database
     * @param table where element will be saved
     * @param key the key of element
     * @param value the value of element
     * @param id the id of element
     * @param ttl the time of when the element delete from database 
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.set("table", "key", "value", "id", ttl);
     * // OR
     * <KeyValueCache>.set({
     * table: "table", 
     * key: "key", 
     * value: "value", 
     * id: "id", 
     * ttl: ttl});
     * ```
     */

  set(...pro) {
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
    
    const data =  this.#getTable(table);
    
    if (!key) {
      return LiteError(`Argument Not Found, cannot set value "key" required.`);
    }
    if (typeof key !== "string") {
      return LiteError(
        `Invalid Format, cannot set value "key" must be string.`
      );
    }
    if (this.size === this.#options.limit) {
      return LiteError(
        `Database At Limit, cannot set more data ... the database at limit: ${this.size}`
      );
    }
    
    const elementOptions = {
      randomId: this.#options.elementOptions.randomId,
      type: this.#options.elementOptions.type,
      key: this.#options.dataStyle === 'array' ?
        true : this.#options.elementOptions.key
    }
    
    let element = new Element({ key, id, value, ttl }, elementOptions);
    const old = this.get({ table, key, id });
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
      
    if (old === undefined) {
      this.emit(DatabaseEvents.New, element);
    } else {
      this.emit(DatabaseEvents.Update, old, element);
    }
    return element;
  };

  /**
     * @description delete element from database
     * @param table where element will be deleted
     * @param key the key of element
     * @param id the id of element 
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.delete("table", "key", "id");
     * // OR
     * <KeyValueCache>.delete({
     * table: "table", 
     * key: "key", 
     * id: "id" });
     * ```
     */


  delete(...pro) {
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
    const data = this.#getTable(table);
    if (!key) {
      return LiteError(`Argument Not Found, cannot set value "key" required.`);
    }
    if (typeof key !== "string") {
      return LiteError(
        `Invalid Format, cannot set value "key" must be string.`
      );
    }
    
    const element =  this.get({ table, key, id });
    
    if (element !== undefined) {
      if (this.#options.dataStyle === "object") {
        delete data[this.#options.encryptOptions.encrypt ? encrypt(
          element.key,
          this.#options.encryptOptions.secretKey,
          this.#options.encryptOptions.initVector
        ) : key];
      } else {
        data.splice(data.findIndex((e) => e.key === this.#options.encryptOptions.encrypt ?
          encrypt(
            element.key,
            this.#options.encryptOptions.secretKey,
            this.#options.encryptOptions.initVector
          ) :
          key), 1);
      }
      this.emit(DatabaseEvents.Remove, element);
      return true;
    }
    return undefined;
  }

  /**
     * @description get element from database
     * @param table where element will be getting
     * @param key the key of element
     * @param id the id of element
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.get("table", "key", "id");
     * // OR
     * <KeyValueCache>.get({
     * table: "table", 
     * key: "key", 
     * id: "id" });
     * ```
     */

  get(...pro) {
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
    const data = this.#getTable(table);
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
    let res;
    if (this.#options.dataStyle === 'object') {
      res = data[key];
    } else {
      res = data.find((k) => k.key === key);
    }
    let elementResult = res ? { ...res } : undefined;
    
    if (elementResult) {
      if (this.#options.encryptOptions.encrypt === true) {
        if (this.#options.encryptOptions.encryptType === "value") {
          if (elementResult.hasOwnProperty('value') && elementResult.value !== undefined) {
            elementResult.value = decrypt(elementResult.value, this.#options.encryptOptions.secretKey);
          }
          if (elementResult.hasOwnProperty('type')) {
            elementResult.type = decrypt(elementResult.type, this.#options.encryptOptions.secretKey);
          }
        } else if (this.#options.encryptOptions.encryptType === "key") {
          if (elementResult.hasOwnProperty('key')) {
            elementResult.key = decrypt(elementResult.key, this.#options.encryptOptions.secretKey);
          }
        } else {
          if (elementResult.hasOwnProperty('key')) {
            elementResult.key = decrypt(elementResult.key, this.#options.encryptOptions.secretKey);
          }
          if (elementResult.hasOwnProperty('value') && elementResult.value !== undefined) {
            elementResult.value = decrypt(elementResult.value, this.#options.encryptOptions.secretKey);
          }
          if (elementResult.hasOwnProperty('type')) {
            elementResult.type = decrypt(elementResult.type, this.#options.encryptOptions.secretKey);
          }
        }
      }
      return elementResult;
    } else return undefined;
  }

  /**
     * @description check element exist in database
     * @param table where element will be checking
     * @param key the key of element
     * @param id the id of element
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.has("table", "key", "id");
     * // OR
     * <KeyValueCache>.has({
     * table: "table", 
     * key: "key", 
     * id: "id" });
     * ```
     */

  has(...pro) {
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
    return (this.get({ table, key, id })) !== undefined;
  }

  /**
     * @description get all elements from database
     * @param table where elements will be getting
     * @returns
     * @example
     * ```js
     * <KeyValueCache>.all("table");
     * // OR
     * <KeyValueCache>.all({
     * table: "table" 
     * });
     * ```
     */

  all(...pro) {
    let table;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
    } else {
      table = pro[0];
    }
    const data =  this.#getTable(table);
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
      }
    }
    return res;
  }

  /**
     * @description clear all elements from database
     * @param table where element will be cleared
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.clear("table");
     * // OR
     * <KeyValueCache>.clear({
     * table: "table"
     * });
     * ```
     */

  clear(...pro) {
    let table;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
    } else {
      table = pro[0];
    }
    let data =  this.#getTable(table);
    data = this.#options.dataStyle === "object" ? {} : [];
    this.emit(DatabaseEvents.Clear, table);
    return true;
  }

  /**
     * @description clear all elements from all databases
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.clearAll();
     * ```
     */

  clearAll() {
    for (const table of this.#options.tables) {
       this.clear(table);
    }
    return true;
  }

  /**
     * @description clean database from all elements with undefined value
     * @param table where elements will be cleaned
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.clean("table");
     * // OR
     * <KeyValueCache>.clean({
     * table: "table"
     * });
     * ```
     */

  clean(...pro) {
    let table;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
    } else {
      table = pro[0];
    }
    const data =  this.#getTable(table);
    for (const e of Object.keys(data)) {
      if (data[e]?.value === undefined) {
        if (this.#options.dataStyle === "object") {
          delete data[e];
        } else {
          data.splice(e, 1);
        }
      }
    }
    this.emit(DatabaseEvents.Clean, table);
    return true;
  }

  /**
     * @description clean all databases from all elements with undefined value
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.cleanAll();
     * // OR
     * <KeyValueCache>.cleanAll();
     * ```
     */

  cleanAll() {
    for (const table of this.#options.tables) {
       this.clean(table);
    }
    return true;
  }

  /**
     * @description set many elements to database
     * @param table where elements will be saved
     * @param values the elements
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.set("table", ["key", "value", "id", ttl], ...);
     * // OR
     * <KeyValueCache>.set({
     * table: "table",
     * values: [["key", "value", "id", ttl], ...]
     * });
     * ```
     */

  setMany(...pro) {
    let table, values;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      values = pro[0]?.values;
    } else {
      table = pro[0];
      values = pro[1];
    }
    for (const [key, value, id, ttl] of values) {
       this.set(table, key, value, id, ttl);
    }
    return true;
  }

  /**
     * @description delete many elements to database
     * @param table where elements will be deleted
     * @param keys the elements
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.set("table", ["key", "id"], ...);
     * // OR
     * <KeyValueCache>.set({
     * table: "table",
     * keys: [["key", "id"], ...]
     * });
     * ```
     */

  deleteMany(...pro) {
    let table, keys;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      keys = pro[0]?.keys;
    } else {
      table = pro.shift();
      keys = pro;
    }
    for (const [key, id] of keys) {
      this.delete(table, key, id);
    }
    return true;
  }

  /**
     * @description get many elements to database
     * @param table where elements will be getting
     * @param keys the elements
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.get("table", ["key", "id"], ...);
     * // OR
     * <KeyValueCache>.set({
     * table: "table",
     * keys: [["key", "id"], ...]
     * });
     * ```
     */
  
  getMany(...pro) {
    let table, keys;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      keys = pro[0]?.keys;
    } else {
      table = pro.shift();
      keys = pro;
    }
    return keys.map(([key, id]) => this.get(table, key, id));
  }

  /**
     * @description check many elements from database
     * @param table where elements will be checking
     * @param keys the elements
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.has("table", ["key", "id"], ...);
     * // OR
     * <KeyValueCache>.has({
     * table: "table",
     * keys: [["key", "id"], ...]
     * });
     * ```
     */
  
  hasMany(...pro) {
    let table, keys;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      keys = pro[0]?.keys;
    } else {
      table = pro.shift();
      keys = pro;
    }
    return keys.map(([key, id]) => this.has(table, key, id));
  }

  /**
     * @description find element to database
     * @param table where elements will be find
     * @param values the elements
     * @returns
     *
     * @example
     * ```js
     * <KeyValueCache>.set("table", ["key", "value", "id", ttl], ...);
     * // OR
     * <KeyValueCache>.set({
     * table: "table",
     * value: [["key", "value", "id", ttl], ...]
     * });
     * ```
     */

  find(...pro) {
    let table, callback;
    if (isObject(pro[0])) {
      table = pro[0]?.table;
      callback = pro[0]?.callback;
    } else {
      table = pro[0];
      callback = pro[1];
    }
    const data =  this.#getTable(table);
    for (const e of Object.keys(data)) {
      const element = data[e];
      if (callback(element)) {
        return element;
      }
    }
  }
};
