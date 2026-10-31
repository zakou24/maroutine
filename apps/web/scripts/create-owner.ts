import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "@/db/client";
import { createOwner } from "@/server/create-owner";

// Lecture du mot de passe sans écho : le terminal passe en mode brut le temps de la saisie.
function askHidden(prompt: string): Promise<string> {
  stdout.write(prompt);
  if (!stdin.isTTY) {
    const rl = createInterface({ input: stdin });
    return rl.question("").finally(() => rl.close());
  }
  return new Promise((resolve) => {
    let value = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          process.exit(130);
        }
        value = char === "\u007f" || char === "\b" ? value.slice(0, -1) : value + char;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = await rl.question("Email du propriétaire : ");
  rl.close();
  const password = await askHidden("Mot de passe (12 caractères minimum) : ");

  const result = await createOwner(db, { email, password });
  if (!result.ok) {
    console.error(result.reason);
    process.exit(1);
  }
  console.log("Propriétaire créé.");
  process.exit(0);
}

void main();
