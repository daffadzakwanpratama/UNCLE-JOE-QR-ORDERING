const bcrypt = require("bcryptjs");

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error("Usage: node backend/scripts/hash-password.js <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
