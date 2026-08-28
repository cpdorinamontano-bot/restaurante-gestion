import { chromium } from "playwright";
import path from "path";

const OUT = "/home/user/restaurante-gestion/scripts/shots";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: [
    "--no-sandbox",
    "--proxy-server=127.0.0.1:38535",
    "--proxy-bypass-list=localhost;127.0.0.1",
  ],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console error]", msg.text());
});
page.on("pageerror", (err) => console.log("[page error]", err.message));

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log("saved", name);
}

// Login
await page.goto("http://localhost:5183/login", { waitUntil: "networkidle" });
await shot("01-login.png");
await page.fill('input[type="email"]', "cpdorina.montano@gmail.com");
await page.fill('input[type="password"]', "Restaurante2026!");
await page.click('button[type="submit"]');
await page.waitForURL(/\/pao/, { timeout: 15000 });
await page.waitForTimeout(1500);
await shot("02-pao-hoy.png");

// Ventas form
await page.goto("http://localhost:5183/pao/ventas", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await shot("03-pao-ventas.png");

// Direccion dashboard
await page.goto("http://localhost:5183/direccion", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("04-direccion.png");

// Finanzas dashboard
await page.goto("http://localhost:5183/finanzas", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("05-finanzas.png");

// Cierre mensual
await page.goto("http://localhost:5183/finanzas/cierre-mensual", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await shot("06-cierre-mensual.png");

// Admin usuarios
await page.goto("http://localhost:5183/admin", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await shot("07-admin-usuarios.png");

await browser.close();
console.log("DONE");
