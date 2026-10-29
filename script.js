
const $ = id => document.getElementById(id);
const socket = typeof io === "function" ? io() : null;

const subjectNames = {
  english: "🇬🇧 Ingliz tili",
  russian: "🇷🇺 Rus tili",
  math: "🧮 Matematika"
};

const state = {
  subject: "english",
  questions: [],
  index: 0,
  score: 0,
  correct: 0,
  seconds: 10,
  timer: null,
  locked: false,
  room: null,
  isHost: false,
  playerName: ""
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}

function makeQ(id, grade, text, correct, wrong) {
  const correctText = String(correct);
  const options = [...new Set([correctText, ...wrong.map(String)])]
    .filter(Boolean);

  if (options.length < 4) return null;

  const answers = shuffle(options).slice(0, 4);
  return {
    id,
    grade,
    text,
    answers,
    correct: answers.indexOf(correctText)
  };
}

/* SAVOLLAR GENERATORI */
function generateQuestions(subject) {
  const pool = [];

  function add(id, grade, text, answer, wrong) {
    const q = makeQ(id, grade, text, answer, wrong);
    if (q) pool.push(q);
  }

  if (subject === "math") {
    // Qo‘shish va ayirish
    for (let a = 100; a <= 600; a++) {
      for (let b = 11; b <= 40; b++) {
        add(`add-${a}-${b}`, "4-sinf",
          `${a} + ${b} = ?`, a + b,
          [a + b + 1, a + b - 1, a + b + 10]);

        if (a >= b) {
          add(`sub-${a}-${b}`, "4-sinf",
            `${a} − ${b} = ?`, a - b,
            [a - b + 1, a - b - 1, a - b + 10]);
        }
      }
    }

    // Ko‘paytirish va bo‘lish
    for (let a = 12; a <= 150; a++) {
      for (let b = 2; b <= 12; b++) {
        add(`mul-${a}-${b}`, "5-sinf",
          `${a} × ${b} = ?`, a * b,
          [a * b + b, a * b - b, a + b + 3]);

        add(`div-${a}-${b}`, "5-sinf",
          `${a * b} ÷ ${b} = ?`, a,
          [a + 1, Math.max(1, a - 1), a + b]);
      }
    }

    // Foizlar
    for (let n = 20; n <= 2000; n += 5) {
      for (const p of [5, 10, 15, 20, 25, 30, 40, 50, 75]) {
        const ans = n * p / 100;
        add(`percent-${n}-${p}`, "6-sinf",
          `${n} ning ${p}% i qancha?`, ans,
          [ans + 5, Math.max(0, ans - 5), ans + 10]);
      }
    }

    // Tenglamalar
    for (let x = 2; x <= 700; x++) {
      for (let a = 2; a <= 10; a++) {
        const b = a * x + 7;
        add(`eq-${a}-${x}`, "7-sinf",
          `${a}x + 7 = ${b}. x ni toping.`, x,
          [x + 1, x - 1, x + 2]);
      }
    }

    // Kasrlar: maxraji 2 dan 12 gacha
    for (let den = 2; den <= 12; den++) {
      for (let num = 1; num < den; num++) {
        add(`frac-${num}-${den}`, "5-sinf",
          `${num}/${den} kasrining suratini toping.`, num,
          [num + 1, Math.max(1, num - 1), den]);
      }
    }
  }

  if (subject === "english") {
    const nouns = [
      "book", "apple", "orange", "student", "teacher", "school",
      "friend", "computer", "dog", "car", "house", "flower",
      "bird", "table", "pencil", "window", "garden", "doctor",
      "chair", "banana", "city", "bus", "box", "baby", "class",
      "toy", "watch", "family", "dish", "river", "country"
    ];

    const pluralOf = word => {
      if (/(s|sh|ch|x|z)$/.test(word)) return word + "es";
      if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + "ies";
      if (/fe$/.test(word)) return word.slice(0, -2) + "ves";
      if (/f$/.test(word)) return word.slice(0, -1) + "ves";
      return word + "s";
    };

    for (const noun of nouns) {
      const plural = ({
        child: "children", man: "men", woman: "women",
        foot: "feet", tooth: "teeth", mouse: "mice"
      })[noun] || pluralOf(noun);

      add(`plural-${noun}`, "3-sinf",
        `What is the plural of "${noun}"?`, plural,
        [noun + "s", noun + "es", noun]);

      const article = ["apple", "orange"].includes(noun) ? "An" : "A";
      add(`article-${noun}`, "4-sinf",
        `Choose the correct article: ___ ${noun}.`, article,
        [article === "A" ? "An" : "A", "Am", "Are"]);

      add(`this-${noun}`, "4-sinf",
        `Choose the correct sentence.`, `This is a ${noun}.`,
        [`These is a ${noun}.`, `This are a ${noun}.`, `This be ${noun}.`]);
    }

    const verbs = [
      ["play", "plays", "played", "playing"],
      ["walk", "walks", "walked", "walking"],
      ["watch", "watches", "watched", "watching"],
      ["study", "studies", "studied", "studying"],
      ["cook", "cooks", "cooked", "cooking"],
      ["clean", "cleans", "cleaned", "cleaning"],
      ["visit", "visits", "visited", "visiting"],
      ["help", "helps", "helped", "helping"],
      ["open", "opens", "opened", "opening"],
      ["jump", "jumps", "jumped", "jumping"],
      ["listen", "listens", "listened", "listening"],
      ["paint", "paints", "painted", "painting"]
    ];

    for (const [base, third, past, ing] of verbs) {
      add(`past-${base}`, "5-sinf",
        `Yesterday, I ___ in the park. (${base})`, past,
        [base, third, ing]);

      add(`present-${base}`, "5-sinf",
        `Every day, he ___ after school. (${base})`, third,
        [base, past, ing]);

      add(`continuous-${base}`, "6-sinf",
        `Look! They are ___ now. (${base})`, ing,
        [base, third, past]);

      add(`future-${base}`, "6-sinf",
        `Tomorrow, I will ___ my friend. (${base})`, base,
        [third, past, ing]);
    }

    const vocab = [
      ["hot", "cold", "warm", "dry"],
      ["big", "small", "long", "wide"],
      ["fast", "slow", "late", "weak"],
      ["happy", "sad", "angry", "tired"],
      ["early", "late", "slow", "soon"],
      ["easy", "difficult", "simple", "short"],
      ["strong", "weak", "heavy", "tall"],
      ["clean", "dirty", "clear", "fresh"]
    ];

    vocab.forEach((v, i) => {
      add(`opposite-${i}`, "4-sinf",
        `Choose the opposite of "${v[0]}".`, v[1], [v[2], v[3], v[0]]);
    });

    const grammar = [
      ["I ___ happy.", "am", ["is", "are", "be"]],
      ["She ___ a new bag.", "has", ["have", "having", "are"]],
      ["They ___ playing now.", "are", ["is", "am", "be"]],
      ["We ___ at school yesterday.", "were", ["was", "are", "is"]],
      ["He ___ to school every day.", "goes", ["go", "going", "gone"]],
      ["I have lived here ___ 2022.", "since", ["for", "during", "at"]],
      ["If it rains, we ___ at home.", "will stay", ["stayed", "staying", "stays"]],
      ["This book is ___ than that one.", "better", ["gooder", "best", "more good"]],
      ["She ___ her homework yesterday.", "finished", ["finish", "finishes", "finishing"]],
      ["There ___ some milk in the glass.", "is", ["are", "am", "be"]]
    ];

    grammar.forEach((g, i) =>
      add(`grammar-${i}`, i < 4 ? "3-sinf" : i < 7 ? "5-sinf" : "7-sinf",
        g[0], g[1], g[2]));
  }

  if (subject === "russian") {
    const nouns = [
      ["книга", "книги", "книгу", "книгой"],
      ["школа", "школы", "школу", "школой"],
      ["машина", "машины", "машину", "машиной"],
      ["ручка", "ручки", "ручку", "ручкой"],
      ["собака", "собаки", "собаку", "собакой"],
      ["кошка", "кошки", "кошку", "кошкой"],
      ["комната", "комнаты", "комнату", "комнатой"],
      ["улица", "улицы", "улицу", "улицей"],
      ["газета", "газеты", "газету", "газетой"],
      ["девочка", "девочки", "девочку", "девочкой"],
      ["карта", "карты", "карту", "картой"],
      ["песня", "песни", "песню", "песней"],
      ["семья", "семьи", "семью", "семьёй"],
      ["неделя", "недели", "неделю", "неделей"],
      ["деревня", "деревни", "деревню", "деревней"]
    ];

    nouns.forEach((w, i) => {
      add(`ru-plural-${i}`, "4-sinf",
        `Множественное число слова «${w[0]}»?`, w[1],
        [w[2], w[3], w[0]]);

      add(`ru-acc-${i}`, "6-sinf",
        `Выбери правильную форму: «Я вижу ___». (${w[0]})`, w[2],
        [w[1], w[3], w[0]]);
    });

    const adjectives = [
      ["красивый", "красивая", "красивое", "красивые"],
      ["новый", "новая", "новое", "новые"],
      ["большой", "большая", "большое", "большие"],
      ["маленький", "маленькая", "маленькое", "маленькие"],
      ["интересный", "интересная", "интересное", "интересные"],
      ["добрый", "добрая", "доброе", "добрые"],
      ["высокий", "высокая", "высокое", "высокие"],
      ["умный", "умная", "умное", "умные"]
    ];

    adjectives.forEach((w, i) => {
      add(`ru-adj-m-${i}`, "5-sinf",
        `Выбери форму женского рода слова «${w[0]}».`, w[1],
        [w[0], w[2], w[3]]);
      add(`ru-adj-n-${i}`, "6-sinf",
        `Выбери форму среднего рода слова «${w[0]}».`, w[2],
        [w[0], w[1], w[3]]);
      add(`ru-adj-pl-${i}`, "6-sinf",
        `Выбери форму множественного числа слова «${w[0]}».`, w[3],
        [w[0], w[1], w[2]]);
    });

    const grammar = [
      ["Какой род у слова «молоко»?", "Средний", ["Мужской", "Женский", "Общий"]],
      ["Какое слово является глаголом?", "Читать", ["Красивый", "Книга", "Быстро"]],
      ["Найди наречие.", "Быстро", ["Смелый", "Смелость", "Бежать"]],
      ["Какой падеж отвечает на вопросы «кому? чему?»", "Дательный", ["Именительный", "Родительный", "Творительный"]],
      ["Какой частью речи является слово «который»?", "Местоимение", ["Глагол", "Наречие", "Союз"]],
      ["Выбери антоним к слову «высокий».", "Низкий", ["Большой", "Длинный", "Широкий"]],
      ["Какой род у слова «окно»?", "Средний", ["Мужской", "Женский", "Общий"]],
      ["Выбери существительное.", "Учитель", ["Бежать", "Красивый", "Быстро"]],
      ["Что обозначает глагол?", "Действие", ["Признак предмета", "Предмет", "Количество"]],
      ["Какой знак ставится в конце вопросительного предложения?", "?", [".", "!", ","]]
    ];

    grammar.forEach((g, i) =>
      add(`ru-grammar-${i}`, i < 3 ? "4-sinf" : i < 7 ? "6-sinf" : "7-sinf",
        g[0], g[1], g[2]));
  }

  return pool.filter(Boolean);
}

/* ISM VA XONA */
function getName() {
  const name = ($("playerName").value ||
    localStorage.getItem("quizoraName") || "").trim();

  if (!name) {
    toast("Avval ismingni yoz!");
    $("playerName").focus();
    return "";
  }

  state.playerName = name.slice(0, 20);
  $("playerName").value = state.playerName;
  localStorage.setItem("quizoraName", state.playerName);
  return state.playerName;
}

$("playerName").value = localStorage.getItem("quizoraName") || "";

$("nameBtn").addEventListener("click", () => {
  const name = prompt("Ismingni yoz:", state.playerName || $("playerName").value);
  if (name && name.trim()) {
    $("playerName").value = name.trim().slice(0, 20);
    localStorage.setItem("quizoraName", $("playerName").value);
    toast("Isming saqlandi!");
  }
});

function showRoomLink(code) {
  const url = new URL(location.href);
  url.searchParams.set("room", code);
  $("shareLink").textContent = url.href;
  $("shareArea").classList.remove("hidden");
  $("roomMessage").textContent = `Xona kodi: ${code}. Havolani do‘stlaringga yubor.`;
}

$("createBtn").addEventListener("click", () => {
  if (!getName()) return;
  if (!socket || !socket.connected) {
    toast("Serverga ulanish yo‘q. Terminalda npm start yoz.");
    return;
  }

  socket.emit("createRoom", { name: state.playerName }, res => {
    if (!res?.ok) return toast(res?.error || "Xona yaratilmadi");
    state.room = res.code;
    state.isHost = true;
    showRoomLink(res.code);
    toast("Xona yaratildi!");
  });
});

$("joinBtn").addEventListener("click", () => {
  if (!getName()) return;
  const code = ($("roomCode").value ||
    new URLSearchParams(location.search).get("room") || "").trim().toUpperCase();

  if (!code) return toast("Xona kodini yoz yoki do‘sting yuborgan havolani och.");
  if (!socket || !socket.connected) return toast("Serverga ulanib bo‘lmadi.");

  socket.emit("joinRoom", { code, name: state.playerName }, res => {
    if (!res?.ok) return toast(res?.error || "Xonaga kirilmadi");
    state.room = res.code;
    state.isHost = false;
    $("roomMessage").textContent = `${res.code} xonasiga kirding.`;
    toast("Xonaga kirding!");
  });
});

$("copyLinkBtn").addEventListener("click", async () => {
  const link = $("shareLink").textContent;
  try {
    await navigator.clipboard.writeText(link);
    toast("Havola nusxalandi!");
  } catch {
    prompt("Havolani nusxalash uchun Ctrl+C bosing:", link);
  }
});

if (socket) {
  socket.on("roomUpdate", data => {
    const names = (data.players || []).map(p => p.name);
    $("roomMessage").textContent = `Xona ${data.code}: ${names.join(", ")}`;
  });

  socket.on("quizStarted", data => {
    state.subject = data.subject;
    startQuiz(false);
  });

  socket.on("playerAnswered", data => toast(`${data.name} javob berdi!`));
}

/* TEST BOSHLASH */
function startQuiz(announce = true) {
  if (state.room && state.isHost && announce && socket) {
    socket.emit("startQuiz", { code: state.room, subject: state.subject }, res => {
      if (!res?.ok) toast(res?.error || "Testni boshlashda xato");
    });
  }

  const pool = generateQuestions(state.subject);
  const seenKey = `quizora_seen_${state.subject}`;
  let seen = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]"));

  let unseen = pool.filter(q => !seen.has(q.id));

  // Barcha savollar ko‘rilganda, tarixni yangilashni foydalanuvchi tanlaydi.
  if (unseen.length < 15) {
    toast("Yangi savollar yetarli emas. Tarixni tozalab, savollarni yangidan boshlashing mumkin.");
    const reset = confirm("Savollar tarixi tugayapti. Oldingi savollarni qaytadan ishlatishga ruxsat berasanmi?");
    if (!reset) return;

    seen = new Set();
    localStorage.setItem(seenKey, "[]");
    unseen = pool;
  }

  state.questions = shuffle(unseen).slice(0, 15);
  state.index = 0;
  state.score = 0;
  state.correct = 0;
  state.locked = false;

  $("resultScreen").classList.add("hidden");
  $("quizScreen").classList.remove("hidden");
  $("quizSubject").textContent = subjectNames[state.subject];
  $("quizScreen").scrollIntoView({ behavior: "smooth", block: "start" });
  renderQuestion();
}

document.querySelectorAll(".subject-card").forEach(btn => {
  btn.addEventListener("click", () => {
    if (state.room && !state.isHost) {
      toast("Testni xona egasi boshlaydi.");
      return;
    }
    state.subject = btn.dataset.subject;
    startQuiz(true);
  });
});

/* SAVOL VA 10 SONIYALIK TAYMER */
function renderQuestion() {
  clearInterval(state.timer);
  state.locked = false;
  state.seconds = 10;

  const q = state.questions[state.index];
  if (!q) return finishQuiz();

  // Savol ko‘rilgan zahoti tarixga yoziladi.
  const seenKey = `quizora_seen_${state.subject}`;
  const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]"));
  seen.add(q.id);
  localStorage.setItem(seenKey, JSON.stringify([...seen]));

  $("questionCount").textContent = `Savol ${state.index + 1} / ${state.questions.length}`;
  $("scoreText").textContent = `⭐ ${state.score} ball`;
  $("timerText").textContent = "⏱️ 10";
  $("timerText").style.color = "#ffcf70";
  $("progressBar").style.width = `${state.index / state.questions.length * 100}%`;
  $("gradeLabel").textContent = q.grade;
  $("questionText").textContent = q.text;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("answers").innerHTML = "";

  q.answers.forEach((answer, i) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = `${["🟣", "🩷", "🟦", "🟠"][i]}  ${answer}`;
    btn.addEventListener("click", () => chooseAnswer(i, btn));
    $("answers").appendChild(btn);
  });

  state.timer = setInterval(() => {
    state.seconds--;
    $("timerText").textContent = `⏱️ ${state.seconds}`;
    $("timerText").style.color = state.seconds <= 3 ? "#ff5374" : "#ffcf70";
    if (state.seconds <= 0) chooseAnswer(-1, null);
  }, 1000);
}

function chooseAnswer(choice, clicked) {
  if (state.locked) return;
  state.locked = true;
  clearInterval(state.timer);

  const q = state.questions[state.index];
  const buttons = [...$("answers").querySelectorAll("button")];
  buttons.forEach(btn => btn.disabled = true);

  const correctButton = buttons[q.correct];
  const feedback = $("feedback");

  if (choice === q.correct) {
    state.correct++;
    state.score += Math.max(100, state.seconds * 100);
    clicked?.classList.add("correct");
    feedback.textContent = "🎉 To‘g‘ri javob! Zo‘r!";
    feedback.className = "feedback good";
  } else {
    clicked?.classList.add("wrong");
    correctButton?.classList.add("reveal");
    feedback.textContent = choice === -1
      ? "⏰ Vaqt tugadi! Yashil rangdagi javob to‘g‘ri."
      : "❌ Noto‘g‘ri javob! Yashil rangdagi javob to‘g‘ri.";
    feedback.className = "feedback bad";
  }

  $("scoreText").textContent = `⭐ ${state.score} ball`;

  if (socket && state.room) {
    socket.emit("answer", { code: state.room });
  }

  setTimeout(() => {
    state.index++;
    if (state.index < state.questions.length) renderQuestion();
    else finishQuiz();
  }, 1400);
}

/* NATIJALAR */
function finishQuiz() {
  clearInterval(state.timer);
  $("quizScreen").classList.add("hidden");
  $("resultScreen").classList.remove("hidden");

  const total = state.questions.length;
  const percent = Math.round(state.correct / total * 100);

  $("finalScore").textContent = state.score.toLocaleString("uz-UZ");
  $("correctCount").textContent = `${state.correct}/${total}`;
  $("accuracy").textContent = `${percent}%`;
  $("resultTitle").textContent =
    percent >= 80 ? "🏆 Ajoyib natija!" :
    percent >= 50 ? "👏 Yaxshi harakat!" : "💪 Yana urinib ko‘r!";
  $("resultSummary").textContent =
    `${state.playerName || "O‘yinchi"}, sen ${total} ta savoldan ${state.correct} tasiga to‘g‘ri javob berding.`;

  const history = JSON.parse(localStorage.getItem("quizoraResults") || "[]");
  history.push({
    name: state.playerName,
    subject: state.subject,
    score: state.score,
    correct: state.correct,
    total,
    date: new Date().toISOString()
  });
  localStorage.setItem("quizoraResults", JSON.stringify(history.slice(-50)));
  $("progressBar").style.width = "100%";
  $("resultScreen").scrollIntoView({ behavior: "smooth", block: "center" });
}

/* TO‘LIQ EKRAN VA TUGMALAR */
$("fullscreenBtn").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await $("quizScreen").requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    toast("Brauzering to‘liq ekran rejimini qo‘llamadi.");
  }
});

document.addEventListener("fullscreenchange", () => {
  const active = Boolean(document.fullscreenElement);
  document.body.classList.toggle("fullscreen-mode", active);
  $("fullscreenBtn").textContent = active ? "⛶ Ekrandan chiqish" : "⛶ To‘liq ekran";
});

function goHome() {
  clearInterval(state.timer);
  $("quizScreen").classList.add("hidden");
  $("resultScreen").classList.add("hidden");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  document.body.classList.remove("fullscreen-mode");
  $("subjects").scrollIntoView({ behavior: "smooth" });
}

$("exitBtn").addEventListener("click", goHome);
$("homeBtn").addEventListener("click", goHome);
$("againBtn").addEventListener("click", () => startQuiz(false));

const initialRoom = new URLSearchParams(location.search).get("room");
if (initialRoom) $("roomCode").value = initialRoom.toUpperCase();
