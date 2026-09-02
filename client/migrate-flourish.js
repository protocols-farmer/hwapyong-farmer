const fs = require("fs");
const path = require("path");

// Recursively search the directory
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let updatedCount = 0;

walkDir("./src", (filePath) => {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) {
    let content = fs.readFileSync(filePath, "utf8");

    // This regex looks for: import CornerFlourish from "@/.../CornerFlourish"
    // and captures the path inside the quotes.
    const regex =
      /import\s+CornerFlourish\s+from\s+(["']@\/components\/shared\/(?:flourishes\/)?CornerFlourish["']);?/g;

    if (regex.test(content)) {
      const updatedContent = content.replace(
        regex,
        "import { CornerFlourish } from $1;",
      );
      fs.writeFileSync(filePath, updatedContent, "utf8");
      console.log(`✅ Updated: ${filePath}`);
      updatedCount++;
    }
  }
});

console.log(`\n🎉 Done! Updated ${updatedCount} files.`);
