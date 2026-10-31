import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "@/db/client";
import { createOwner } from "@/server/create-owner";

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = await rl.question("Email du propriétaire : ");
  // Le mot de passe n'est pas affiché pendant la frappe.
  const mutable = rl as unknown as { _writeToOutput: (s: string) => void };
  const write = mutable._writeToOutput.bind(rl);
  const prompt = "Mot de passe (12 caractères minimum) : ";
  mutable._writeToOutput = (s) => write(s.startsWith(prompt) ? s : "");
  const password = await rl.question(prompt);
  mutable._writeToOutput = write;
  rl.close();
  stdout.write("\n");

  const result = await createOwner(db, { email, password });
  if (!result.ok) {
    console.error(result.reason);
    process.exit(1);
  }
  console.log("Propriétaire créé.");
  process.exit(0);
}

void main();
