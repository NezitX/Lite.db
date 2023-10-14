module.exports = class Element {
  constructor(objectData, options = {}) {
    const { key, id, value, ttl } = objectData;
    const data = {};
    const type = Element.checkType(value);
    data['type'] = type;
    data['key'] = `${key}${id ? `_${id}` : options.randomId ? Element.generateId(key) : ''}`;
    data['value'] = value;
    data['ttl'] = ttl ? Date.now() + ttl : undefined;
    return this.#clean(data);
  }

  #clean(obj) {
    for (const property in obj) 
      if (!obj[property]) 
        delete obj[property];
    return obj;
  }

  static generateId(key) {
    let time = Date.now() % 10000;
    let result = 0;
    for (let i = 0; i < key.length; i++) result += key.charCodeAt(i);
    return `${result}${time}`;
  }
  
  static checkType(o) {
    if (typeof o === "string") return "string";
    else if (typeof o === "number") return "number";
    else if (typeof o === "boolean") return "boolean";
    else if (Array.isArray(o)) return "array";
    else if (o instanceof Map) return "map";
    else if (o instanceof Set) return "set";
    else if (o instanceof Date) return "date";
    else if (o instanceof RegExp) return "regexp";
    else if (typeof o === "function") return "function";
    else if (typeof o === "object") return "object";
    else return undefined;
  }
};
