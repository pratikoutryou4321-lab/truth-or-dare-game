const defaultAvatar = "assets/avatar.png";
const MAX_PLAYERS = 24;

export function createPlayerManager({
  form,
  input,
  list,
  onPlayersChange,
  onFeedback
}) {
  let players = [];

  function emit() {
    onPlayersChange([...players]);
  }

  function sendFeedback(message, type = "info") {
    if (typeof onFeedback === "function") {
      onFeedback(message, type);
    }
  }

  function removePlayer(id) {
    players = players.filter((player) => player.id !== id);
    render();
    emit();
  }

  function addPlayersFromText(rawText) {
    const chunks = rawText
      .split(/[\n,;]+/g)
      .map((name) => name.trim())
      .filter(Boolean);

    if (!chunks.length) {
      sendFeedback("Enter at least one name.", "warn");
      return;
    }

    let added = 0;
    let duplicates = 0;
    let skippedForLimit = 0;
    const used = new Set(players.map((player) => player.name.toLowerCase()));

    chunks.forEach((entry) => {
      if (players.length >= MAX_PLAYERS) {
        skippedForLimit += 1;
        return;
      }

      const clean = entry.slice(0, 20).trim();
      if (!clean) {
        return;
      }

      const key = clean.toLowerCase();
      if (used.has(key)) {
        duplicates += 1;
        return;
      }

      players.push({
        id: crypto.randomUUID(),
        name: clean
      });
      used.add(key);
      added += 1;
    });

    render();
    emit();

    if (!added && duplicates) {
      sendFeedback("Duplicate names skipped.", "warn");
      return;
    }

    if (!added && skippedForLimit) {
      sendFeedback(`Max ${MAX_PLAYERS} players reached.`, "warn");
      return;
    }

    let message = `${added} player${added === 1 ? "" : "s"} added.`;
    if (duplicates) {
      message += ` ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped.`;
    }
    if (skippedForLimit) {
      message += ` Max ${MAX_PLAYERS} reached.`;
    }
    sendFeedback(message, "success");
  }

  function render() {
    list.innerHTML = "";

    if (!players.length) {
      const li = document.createElement("li");
      li.className = "player-item";
      li.innerHTML = "<span>Add at least 2 players to spin.</span>";
      list.appendChild(li);
      return;
    }

    players.forEach((player) => {
      const li = document.createElement("li");
      li.className = "player-item";

      const avatar = document.createElement("img");
      avatar.src = defaultAvatar;
      avatar.alt = `${player.name} avatar`;
      avatar.className = "avatar";
      avatar.loading = "lazy";

      const name = document.createElement("span");
      name.textContent = player.name;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => removePlayer(player.id));

      li.append(avatar, name, removeBtn);
      list.appendChild(li);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addPlayersFromText(input.value);
    input.value = "";
    input.focus();
  });

  render();

  return {
    getPlayers: () => [...players],
    addPlayer: addPlayersFromText
  };
}
