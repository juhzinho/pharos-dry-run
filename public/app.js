import { setMode } from "./scene.js";

const I = {
  en: {
    kicker: "Pacific · chain 1672 · read only",
    title: "See it before it moves.",
    lead: "The rings simulate a transaction. Gas, balances, and a hard stop if it would fail. Nothing is signed.",
    legPass: "Clear to sign",
    legRevert: "Reverted",
    legGas: "Cannot pay gas",
    kindL: "Action",
    amountL: "Amount",
    fromL: "From",
    toL: "To",
    go: "Simulate",
    send: "Try to send",
    wait: "Reading the chain…",
    hint: {
      pass: "1 USDC from a public wallet that can pay the fee.",
      revert: "Same wallet, far more USDC than it holds.",
      gas: "1 USDC from the pool. The call passes. The pool has no PROS.",
      custom: "Your fields. Transfer, approve, or a plain PROS send.",
    },
  },
  pt: {
    kicker: "Pacific · chain 1672 · só leitura",
    title: "Vê antes de mover.",
    lead: "Os anéis simulam a transação. Gás, saldos, e uma trava se ela fosse falhar. Nada é assinado.",
    legPass: "Pode assinar",
    legRevert: "Reverteu",
    legGas: "Sem gás",
    kindL: "Ação",
    amountL: "Valor",
    fromL: "De",
    toL: "Para",
    go: "Simular",
    send: "Tentar enviar",
    wait: "Lendo a rede…",
    hint: {
      pass: "1 USDC de uma carteira pública que paga a taxa.",
      revert: "A mesma carteira, bem mais USDC do que ela tem.",
      gas: "1 USDC do pool. A chamada passa. O pool não tem PROS.",
      custom: "Os campos abaixo. Transferência, aprovação, ou envio de PROS.",
    },
  },
};
const DRY = {
  pass: { kind: "transfer", token: "USDC", amount: "1", from: "0x15dDce897D76ac39c188AdE4D353711A60395315", to: "0x000000000000000000000000000000000000dEaD" },
  revert: { kind: "transfer", token: "USDC", amount: "999999999999", from: "0x15dDce897D76ac39c188AdE4D353711A60395315", to: "0x000000000000000000000000000000000000dEaD" },
  gas: { kind: "transfer", token: "USDC", amount: "1", from: "0x912c9aDe24D44d8922f0866D8Dcb079f1363f647", to: "0x000000000000000000000000000000000000dEaD" },
};
let lang = localStorage.getItem("pharos-lang") === "pt" ? "pt" : "en";
let sample = "pass";
const $ = (id) => document.getElementById(id);

function apply() {
  const t = I[lang];
  document.documentElement.lang = lang;
  $("kicker").textContent = t.kicker;
  $("title").textContent = t.title;
  $("lead").textContent = t.lead;
  $("legPass").textContent = t.legPass;
  $("legRevert").textContent = t.legRevert;
  $("legGas").textContent = t.legGas;
  $("kindL").textContent = t.kindL;
  $("amountL").textContent = t.amountL;
  $("fromL").textContent = t.fromL;
  $("toL").textContent = t.toL;
  $("go").textContent = t.go;
  $("send").textContent = t.send;
  $("hint").textContent = t.hint[sample];
  document.querySelectorAll("[data-lang]").forEach((button) => button.classList.toggle("on", button.dataset.lang === lang));
  document.querySelectorAll("[data-sample]").forEach((button) => button.classList.toggle("on", button.dataset.sample === sample));
}

function fill(next) {
  const row = DRY[next];
  if (!row) return;
  $("kind").value = row.kind;
  $("token").value = row.token;
  $("amount").value = row.amount;
  $("from").value = row.from;
  $("to").value = row.to;
  $("tokenWrap").hidden = row.kind === "native";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function run(execute) {
  const q = new URLSearchParams({ lang, execute: execute ? "1" : "0" });
  if (DRY[sample]) q.set("sample", sample);
  else {
    q.set("kind", $("kind").value);
    q.set("token", $("token").value);
    q.set("amount", $("amount").value.trim());
    q.set("from", $("from").value.trim());
    q.set("to", $("to").value.trim());
  }
  $("status").className = "status busy";
  $("status").textContent = I[lang].wait;
  $("go").disabled = true;
  $("send").disabled = true;
  setMode("wait");
  try {
    const res = await fetch("/api/dry-run?" + q);
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || res.statusText);
    $("status").className = "status";
    $("status").textContent = "";
    $("out").hidden = false;
    $("head").className = `verdict ${data.verdict}`;
    $("head").textContent = data.headline;
    const lines = [...(data.lines || [])];
    if (data.unsigned) lines.push(JSON.stringify(data.unsigned));
    $("lines").innerHTML = lines.map((line, i) => `<p class="line${line.startsWith("{") ? " mono" : ""}" style="animation-delay:${i * 55}ms">${esc(line)}</p>`).join("");
    setMode(data.verdict || "idle");
    $("out").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    $("status").className = "status err";
    $("status").textContent = error.message;
    setMode("revert");
  } finally {
    $("go").disabled = false;
    $("send").disabled = false;
  }
}

$("samples").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sample]");
  if (!button) return;
  sample = button.dataset.sample;
  fill(sample);
  apply();
  setMode(sample === "custom" ? "idle" : sample === "pass" ? "idle" : sample);
});
["kind", "token", "amount", "from", "to"].forEach((id) => {
  $(id).addEventListener("input", () => { sample = "custom"; apply(); });
  $(id).addEventListener("change", () => { sample = "custom"; $("tokenWrap").hidden = $("kind").value === "native"; apply(); });
});
$("form").addEventListener("submit", (event) => { event.preventDefault(); run(false); });
$("send").addEventListener("click", () => run(true));
document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => { lang = button.dataset.lang; localStorage.setItem("pharos-lang", lang); apply(); });
});
fill("pass");
apply();
setMode("idle");
