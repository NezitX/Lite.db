const { keyValueCache } = require("../src/index.js");
const { DatabaseEvents } = require("../src/utils.js");
const { randomBytes } = require('crypto');
/*
let options = keyValue.defaultOptions();
options.tables.push('user');

const db = new keyValue(options);

(async () => {
  let d = await db.set('hi', 'hello World', 'user');
  let t = await db.get('hi', 'user');
  console.log(t);
})();*/


/* To Do List
--
* Add Encrypt to all methods expected set/get.
--
*/


(async () => {
  const iv = randomBytes(16)/*.toString('hex')*/;
  const tempJson = new keyValueCache({
    tables: ["main"],
    dataStyle: 'object',
    elementOptions: {
      id: true,
      key: true,
      type: true
    },
    encryptOptions: {
      encrypt: true,
      secretKey: 'a03uxnOdyls8rga9quebx9apejfyz9wl',
      encryptType: 'both',
      initVector: iv//`22ee86326c74ceb0a40e03f60760f3bc`
    }
  });

  tempJson.on("ready", async (m) => {
    //console.log("database size: %d", await m.size());
  });

  tempJson.on("update", (m, n) => {
    console.log ("works update");
    //console.log(m, n);
  });
  tempJson.on("new", (m) => {
    console.log("works new");
    //console.log(m);
  });

  tempJson.connect();

  try {
    let time = Date.now();
    console.log(`Starting...`);
    await tempJson.set('main', 'no', 'hii', undefined, 1000)
    //console.log(await tempJson.get('main', 'test', 'thisIsId'));
    setTimeout(async () => {
      await tempJson.set('main', 'no', 'hi', null, 5000)
      //console.log(await tempJson.get('main', 'test', 'thisIsId'));
      await tempJson.set('main', 'test', undefined, 'hi', 5000)
      //console.log(await tempJson.get('main', 'test', 'hi'));
      console.log(tempJson.hasMany("main", ["test", "hi"], ["no"]));
    }, 5000);
    console.log(`End In: ${Date.now() - time}ms`);

    setTimeout(async ()=> {
      await tempJson.clean('main');
      
      console.log('done clear')
      console.log(tempJson.all('main'))
    }, 8000)
    //console.log(await tempJson.find('main', (key) => key.type === 'number'));
  } catch (err) {
    console.log(err);
  }
  
})();
