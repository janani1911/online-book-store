
const bcrypt = require("bcryptjs");

const password = "ramjaanu";
const hash = "$2b$12$iOq37m95742RZPSqgxsUNOWL5D9MOtprObtaIxDoNX9Hb1nFr.ZgK";

bcrypt.compare(password, hash).then((result) => {
  console.log("Password Match:", result);
});
