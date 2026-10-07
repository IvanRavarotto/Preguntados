import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../../../../", import.meta.url);
const html = fs.readFileSync(new URL("frontend/index.html", root), "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Debe existir un script inline");
const source = match[1].replace(/\n\s*init\(\);\s*$/, "");
const gameplayCases = [
  "ordinary-correct",
  "ordinary-failure",
  "crown-preservation",
  "six-crown-victory",
  "second-chance",
  "eliminate-two",
  "shared-joker-budget",
];
assert.ok(gameplayCases.length > 0, "El conjunto de casos de gameplay no puede estar vacío");

function element(children = []) {
  return {
    children,
    classList: { add() {}, remove() {}, toggle() {} },
    dataset: {},
    hidden: false,
    style: { setProperty() {} },
    append() {},
    appendChild() {},
    addEventListener() {},
    querySelector: () => ({ textContent: "" }),
    setAttribute() {},
    textContent: "",
  };
}

const elements = new Map([
  ["q-opts", element()],
  ["q-feedback", element()],
  ["q-next", element()],
  ["tbar", element()],
  ["q-timer", element()],
  ["scoreboard", element()],
  ["turnchip", element()],
  ["w-name", element()],
  ["w-score", element()],
  ["wheel", element()],
  ["spin", element()],
]);
const context = {
  Math,
  Set,
  console,
  performance: { now: () => 0 },
  window: { prompt: () => "1" },
  document: {
    createElement: () => element(),
    getElementById: id => elements.get(id) || element(),
    querySelectorAll: () => [],
  },
  fetch: () => Promise.reject(new Error("fetch no debe ejecutarse en este check")),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};
const probe = `${source}
globalThis.results = (() => {
  const playerTemplate = (crowns = [], streak = 0) => [
    { name: "A", crowns, streak, accent: "#00F0FF", glow: "none" },
    { name: "B", crowns: [], streak: 0, accent: "#BD00FF", glow: "none" },
  ];
  const question = { question: "Q", option_a: "Correcta", option_b: "Incorrecta 1", option_c: "Incorrecta 2", option_d: "Incorrecta 3", answer: "Correcta" };
  players = playerTemplate([], 2);
  turn = 0;
  currentFlow = "ordinary";
  currentCat = { name: "arte", label: "Arte", accent: "#FF2A6D" };
  currentQuestion = question;
  joker = { usedCount: 0, maxUses: 2, available: { eliminateTwo: true, secondChance: true, autoCorrect: true }, usedOnCurrentQuestion: [] };
  answered = false;
  resolveCorrect(question);
  const ordinaryCorrect = { streak: players[0].streak, turn };

  players = playerTemplate(["arte"], 2);
  turn = 0;
  currentFlow = "ordinary";
  currentQuestion = question;
  answered = false;
  resolveFailure(question, "ko");
  const ordinaryFailure = { streak: players[0].streak, turn };

  players = playerTemplate(["arte"], 3);
  turn = 0;
  currentFlow = "crown-challenge";
  pendingChallengeCategory = "ciencia";
  currentQuestion = question;
  answered = false;
  resolveFailure(question, "ko");
  const crownPreservation = { crowns: [...players[0].crowns], streak: players[0].streak, turn };

  players = playerTemplate(["arte", "historia", "deportes", "ciencia", "geografia"], 3);
  turn = 0;
  currentFlow = "crown-challenge";
  pendingChallengeCategory = "entretenimiento";
  currentQuestion = question;
  answered = false;
  resolveCorrect(question);
  const sixCrownVictory = { crowns: players[0].crowns.length, winnerVisible: $("w-name").textContent.length > 0 };

  players = playerTemplate([], 0);
  turn = 0;
  currentFlow = "ordinary";
  currentQuestion = question;
  answered = false;
  joker = { usedCount: 1, maxUses: 2, available: { eliminateTwo: false, secondChance: true, autoCorrect: true }, usedOnCurrentQuestion: ["second-chance"] };
  secondChanceActive = false;
  const wrongButton = { classList: { add() {} }, disabled: false };
  pickAnswer(wrongButton, "Incorrecta 1", question);
  const secondChanceFirst = { active: secondChanceActive, answered, turn };
  const correctButton = { classList: { add() {} }, disabled: false };
  pickAnswer(correctButton, "Correcta", question);
  const secondChanceSuccess = { answered, turn, streak: players[0].streak };

  const optionTexts = ["Correcta", "Incorrecta 1", "Incorrecta 2", "Incorrecta 3"];
  $("q-opts").children = optionTexts.map(text => ({
    disabled: false,
    classList: { add() {} },
    querySelector: () => ({ textContent: text }),
  }));
  players = playerTemplate([], 0);
  turn = 0;
  currentFlow = "ordinary";
  currentQuestion = question;
  answered = false;
  joker = { usedCount: 0, maxUses: 2, available: { eliminateTwo: true, secondChance: true, autoCorrect: true }, usedOnCurrentQuestion: [] };
  activateJoker("eliminate-two");
  const eliminated = $("q-opts").children.filter(button => button.disabled).length;
  activateJoker("auto-correct");
  activateJoker("second-chance");
  const sharedBudget = { usedCount: joker.usedCount, answered, thirdRejected: joker.usedCount === 2 };

  return { ordinaryCorrect, ordinaryFailure, crownPreservation, sixCrownVictory, secondChanceFirst, secondChanceSuccess, eliminated, sharedBudget };
})();`;
vm.runInNewContext(probe, context);
const results = context.results;
assert.equal(JSON.stringify(results.ordinaryCorrect), JSON.stringify({ streak: 3, turn: 0 }));
assert.equal(JSON.stringify(results.ordinaryFailure), JSON.stringify({ streak: 0, turn: 1 }));
assert.equal(JSON.stringify(results.crownPreservation), JSON.stringify({ crowns: ["arte"], streak: 0, turn: 1 }));
assert.equal(JSON.stringify(results.sixCrownVictory), JSON.stringify({ crowns: 6, winnerVisible: true }));
assert.equal(JSON.stringify(results.secondChanceFirst), JSON.stringify({ active: true, answered: false, turn: 0 }));
assert.equal(JSON.stringify(results.secondChanceSuccess), JSON.stringify({ answered: true, turn: 0, streak: 1 }));
assert.equal(results.eliminated, 2);
assert.equal(JSON.stringify(results.sharedBudget), JSON.stringify({ usedCount: 2, answered: true, thirdRejected: true }));
console.log("GAMEPLAY_CHECK_PASS", results);
