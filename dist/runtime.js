var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// config.ts
import { loadJsonConfigWithLegacyFallback, validateGuidanceFields } from "@juicesharp/rpiv-config";
function loadConfig() {
  return loadJsonConfigWithLegacyFallback("rpiv-todo");
}
function getMaxWidgetLines() {
  const config = loadConfig();
  const lines = config.maxWidgetLines;
  if (typeof lines !== "number" || lines < 3) return DEFAULT_MAX_WIDGET_LINES;
  return lines;
}
function isValidCollapseKeySpec(spec) {
  if (!spec) return false;
  if (spec.startsWith("+") || spec.endsWith("+") || spec.includes("++")) return false;
  const parts = spec.split("+");
  const base = parts[parts.length - 1] ?? "";
  const modifiers = parts.slice(0, -1);
  if (modifiers.length !== new Set(modifiers).size) return false;
  if (!modifiers.every((m) => MODIFIERS.has(m))) return false;
  return base.length === 1 ? /[a-z0-9_\-!@#$%^&*()|~`'":;,./<>?[\]{}=\\]/.test(base) : SPECIAL_KEYS.has(base);
}
function resolveCollapseKey() {
  const config = loadConfig();
  const raw = typeof config.collapseKey === "string" ? config.collapseKey.trim().toLowerCase() : void 0;
  if (raw === void 0 || raw === "") return DEFAULT_COLLAPSE_KEY;
  if (raw === COLLAPSE_KEY_OFF) return COLLAPSE_KEY_OFF;
  return isValidCollapseKeySpec(raw) ? raw : DEFAULT_COLLAPSE_KEY;
}
var DEFAULT_MAX_WIDGET_LINES, DEFAULT_COLLAPSE_KEY, COLLAPSE_KEY_OFF, SPECIAL_KEYS, MODIFIERS;
var init_config = __esm({
  "config.ts"() {
    DEFAULT_MAX_WIDGET_LINES = 12;
    DEFAULT_COLLAPSE_KEY = "ctrl+shift+t";
    COLLAPSE_KEY_OFF = "off";
    SPECIAL_KEYS = /* @__PURE__ */ new Set([
      "escape",
      "esc",
      "enter",
      "return",
      "tab",
      "space",
      "backspace",
      "delete",
      "insert",
      "clear",
      "home",
      "end",
      "pageup",
      "pagedown",
      "up",
      "down",
      "left",
      "right",
      ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`)
    ]);
    MODIFIERS = /* @__PURE__ */ new Set(["ctrl", "shift", "alt", "super"]);
  }
});

// state/i18n-bridge.ts
function formatStatusLabel(status) {
  switch (status) {
    case "pending":
      return t("status.pending", STATUS_LABEL_PENDING);
    case "in_progress":
      return t("status.in_progress", STATUS_LABEL_IN_PROGRESS);
    case "completed":
      return t("status.completed", STATUS_LABEL_COMPLETED);
    case "deleted":
      return t("status.deleted", STATUS_LABEL_DELETED);
  }
}
var I18N_NAMESPACE, scopeImpl, t, STATUS_LABEL_PENDING, STATUS_LABEL_IN_PROGRESS, STATUS_LABEL_COMPLETED, STATUS_LABEL_DELETED;
var init_i18n_bridge = __esm({
  async "state/i18n-bridge.ts"() {
    I18N_NAMESPACE = "@juicesharp/rpiv-todo";
    try {
      const sdk = await import("@juicesharp/rpiv-i18n");
      scopeImpl = sdk.scope(I18N_NAMESPACE);
    } catch {
      scopeImpl = (_key, fallback) => fallback;
    }
    t = scopeImpl;
    STATUS_LABEL_PENDING = "pending";
    STATUS_LABEL_IN_PROGRESS = "in progress";
    STATUS_LABEL_COMPLETED = "completed";
    STATUS_LABEL_DELETED = "deleted";
  }
});

// state/state.ts
var EMPTY_STATE;
var init_state = __esm({
  "state/state.ts"() {
    EMPTY_STATE = { tasks: [], nextId: 1 };
  }
});

// state/store.ts
function sid(ctx) {
  return ctx.sessionManager.getSessionId() ?? "";
}
function freshState() {
  return { tasks: [...EMPTY_STATE.tasks], nextId: EMPTY_STATE.nextId };
}
function slotFor(sessionId) {
  return sessions.get(sessionId) ?? freshState();
}
function getState(sessionId) {
  return slotFor(sessionId);
}
function replaceState(sessionId, next) {
  sessions.set(sessionId, next);
}
function commitState(sessionId, next) {
  sessions.set(sessionId, next);
}
function evictSession(sessionId) {
  sessions.delete(sessionId);
}
function getRenderState() {
  return slotFor(activeRenderSession);
}
function setActiveRenderSession(sessionId) {
  activeRenderSession = sessionId;
}
function getActiveRenderSession() {
  return activeRenderSession;
}
function clearActiveRenderSession() {
  activeRenderSession = "";
}
var sessions, activeRenderSession;
var init_store = __esm({
  "state/store.ts"() {
    init_state();
    sessions = /* @__PURE__ */ new Map();
    activeRenderSession = "";
  }
});

// state/selectors.ts
function selectVisibleTasks(state) {
  return state.tasks.filter((t2) => t2.status !== "deleted");
}
function selectTasksByStatus(state) {
  const visible = selectVisibleTasks(state);
  return {
    pending: visible.filter((t2) => t2.status === "pending"),
    inProgress: visible.filter((t2) => t2.status === "in_progress"),
    completed: visible.filter((t2) => t2.status === "completed")
  };
}
function selectTodoCounts(state) {
  const groups = selectTasksByStatus(state);
  return {
    total: groups.pending.length + groups.inProgress.length + groups.completed.length,
    pending: groups.pending.length,
    inProgress: groups.inProgress.length,
    completed: groups.completed.length
  };
}
function selectShowTaskIds(state) {
  return selectVisibleTasks(state).some((t2) => t2.blockedBy && t2.blockedBy.length > 0);
}
function selectTaskSubjectById(state, id) {
  return state.tasks.find((t2) => t2.id === id)?.subject;
}
function selectOverlayLayout(state, budget) {
  const all = selectVisibleTasks(state);
  if (all.length <= budget) {
    return { visible: all, hiddenCompleted: 0, truncatedTail: 0 };
  }
  const innerBudget = budget - 1;
  const nonCompleted = all.filter((t2) => t2.status !== "completed");
  const totalCompleted = all.length - nonCompleted.length;
  if (nonCompleted.length <= innerBudget) {
    const kept = new Set(nonCompleted);
    for (const t2 of all) {
      if (kept.size >= innerBudget) break;
      if (t2.status === "completed") kept.add(t2);
    }
    const visible2 = all.filter((t2) => kept.has(t2));
    const shownCompleted = visible2.filter((t2) => t2.status === "completed").length;
    return { visible: visible2, hiddenCompleted: totalCompleted - shownCompleted, truncatedTail: 0 };
  }
  const visible = nonCompleted.slice(0, innerBudget);
  const truncatedTail = nonCompleted.length - innerBudget;
  return { visible, hiddenCompleted: totalCompleted, truncatedTail };
}
function selectHasActive(state) {
  return selectVisibleTasks(state).some((t2) => t2.status === "in_progress" || t2.status === "pending");
}
var init_selectors = __esm({
  "state/selectors.ts"() {
  }
});

// tool/sanitize.ts
function sanitizeTerminalText(value) {
  return value.replace(/(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]/g, "").replace(/(?:\u001b\]|\u009d)[^\u0007\u009c\u001b]*(?:\u0007|\u009c|\u001b\\)?/g, "").replace(/\u001b./g, "").replace(/[\u2028\u2029]/g, " ").replace(
    /[\u0000-\u001f\u007f-\u009f]/g,
    (character) => character === "\n" || character === "\r" || character === "	" ? " " : ""
  ).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
}
var init_sanitize = __esm({
  "tool/sanitize.ts"() {
  }
});

// view/format.ts
import { Text } from "@earendil-works/pi-tui";
function overlayStatusGlyph(status, theme) {
  switch (status) {
    case "pending":
      return theme.fg("dim", "\u25CB");
    case "in_progress":
      return theme.fg("warning", "\u25D0");
    case "completed":
      return theme.fg("success", "\u2713");
    case "deleted":
      return theme.fg("error", "\u2717");
  }
}
function formatOverlayTaskLine(t2, theme, showId) {
  const glyph = overlayStatusGlyph(t2.status, theme);
  const subjectColor = t2.status === "in_progress" ? "accent" : t2.status === "completed" || t2.status === "deleted" ? "muted" : "text";
  let subject = theme.fg(subjectColor, sanitizeTerminalText(t2.subject));
  if (t2.status === "completed" || t2.status === "deleted") {
    subject = theme.strikethrough(subject);
  }
  let line = `${glyph}`;
  if (showId) line += ` ${theme.fg("dim", `#${t2.id}`)}`;
  line += ` ${subject}`;
  if (t2.status === "in_progress" && t2.activeForm) {
    line += ` ${theme.fg("muted", `(${sanitizeTerminalText(t2.activeForm)})`)}`;
  }
  if (t2.blockedBy && t2.blockedBy.length > 0) {
    line += ` ${theme.fg("muted", `\u26D3 ${t2.blockedBy.map((id) => `#${id}`).join(",")}`)}`;
  }
  return line;
}
function formatCommandTaskLine(t2, glyph) {
  const form = t2.status === "in_progress" && t2.activeForm ? ` (${sanitizeTerminalText(t2.activeForm)})` : "";
  const block = t2.blockedBy?.length ? `    \u26D3 ${t2.blockedBy.map((id) => `#${id}`).join(",")}` : "";
  return `  ${glyph} #${t2.id} ${sanitizeTerminalText(t2.subject)}${form}${block}`;
}
function renderTodoCall(args, theme, state) {
  const glyph = ACTION_GLYPH[args.action] ?? args.action;
  let text = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", glyph);
  if (args.action === "create" && args.subject) {
    text += ` ${theme.fg("dim", sanitizeTerminalText(args.subject))}`;
  } else if ((args.action === "update" || args.action === "get" || args.action === "delete") && args.id !== void 0) {
    const subject = selectTaskSubjectById(state, args.id);
    text += ` ${theme.fg("accent", subject ? sanitizeTerminalText(subject) : `#${args.id}`)}`;
  } else if (args.action === "list" && args.status) {
    text += ` ${theme.fg("muted", formatStatusLabel(args.status))}`;
  }
  return new Text(text, 0, 0);
}
function renderTodoResult(result, theme) {
  const details = result.details;
  let status;
  if (details) {
    const params = details.params;
    switch (details.action) {
      case "create":
        status = details.tasks[details.tasks.length - 1]?.status;
        break;
      case "update":
        status = params.status ?? details.tasks.find((t2) => t2.id === params.id)?.status;
        break;
      case "delete":
        status = details.tasks.find((t2) => t2.id === params.id)?.status;
        break;
      case "list":
      case "get":
      case "clear":
        break;
    }
  }
  if (status) {
    return new Text(theme.fg(STATUS_COLOR[status], `${STATUS_GLYPH[status]} ${formatStatusLabel(status)}`), 0, 0);
  }
  return new Text(theme.fg("success", "\u2713"), 0, 0);
}
var STATUS_GLYPH, STATUS_COLOR, ACTION_GLYPH;
var init_format = __esm({
  async "view/format.ts"() {
    await init_i18n_bridge();
    init_selectors();
    init_sanitize();
    STATUS_GLYPH = {
      pending: "\u25CB",
      in_progress: "\u25D0",
      completed: "\u25CF",
      deleted: "\u2298"
    };
    STATUS_COLOR = {
      pending: "dim",
      in_progress: "warning",
      completed: "success",
      deleted: "muted"
    };
    ACTION_GLYPH = {
      create: "+",
      update: "\u2192",
      delete: "\xD7",
      get: "\u203A",
      list: "\u2630",
      clear: "\u2205"
    };
  }
});

// todo-overlay.ts
var todo_overlay_exports = {};
__export(todo_overlay_exports, {
  TodoOverlay: () => TodoOverlay
});
import { truncateToWidth } from "@earendil-works/pi-tui";
var WIDGET_KEY, OVERLAY_HEADING, OVERLAY_MORE, OVERLAY_EXPAND_HINT, OVERLAY_COLLAPSED, TodoOverlay;
var init_todo_overlay = __esm({
  async "todo-overlay.ts"() {
    init_config();
    await init_i18n_bridge();
    init_selectors();
    init_store();
    await init_format();
    WIDGET_KEY = "rpiv-todos";
    OVERLAY_HEADING = "Todos";
    OVERLAY_MORE = "more";
    OVERLAY_EXPAND_HINT = "{key} to expand";
    OVERLAY_COLLAPSED = "collapsed";
    TodoOverlay = class {
      uiCtx;
      widgetRegistered = false;
      tui;
      completedTaskIdsPendingHide = /* @__PURE__ */ new Set();
      hiddenCompletedTaskIds = /* @__PURE__ */ new Set();
      lastNextId;
      collapsed = false;
      setUICtx(ctx) {
        if (ctx !== this.uiCtx) {
          this.uiCtx = ctx;
          this.widgetRegistered = false;
          this.tui = void 0;
        }
      }
      update() {
        if (!this.uiCtx) return;
        const snapshot = this.getSnapshot();
        const visible = this.selectOverlayTasks(snapshot);
        if (visible.length === 0) {
          if (this.widgetRegistered) {
            this.uiCtx.setWidget(WIDGET_KEY, void 0);
            this.widgetRegistered = false;
            this.tui = void 0;
          }
          return;
        }
        if (!this.widgetRegistered) {
          this.uiCtx.setWidget(
            WIDGET_KEY,
            (tui, factoryTheme) => {
              this.tui = tui;
              return {
                render: (width) => this.renderWidget(this.uiCtx?.theme ?? factoryTheme, width),
                invalidate: () => {
                }
              };
            },
            { placement: "aboveEditor" }
          );
          this.widgetRegistered = true;
        } else {
          this.tui?.requestRender();
        }
      }
      resetCompletedDisplayState() {
        this.completedTaskIdsPendingHide.clear();
        this.hiddenCompletedTaskIds.clear();
        this.lastNextId = void 0;
      }
      hideCompletedTasksFromPreviousTurn() {
        if (this.completedTaskIdsPendingHide.size === 0) return;
        for (const taskId of this.completedTaskIdsPendingHide) {
          this.hiddenCompletedTaskIds.add(taskId);
        }
        this.completedTaskIdsPendingHide.clear();
        this.tui?.requestRender();
      }
      toggleCollapse() {
        this.collapsed = !this.collapsed;
        this.tui?.requestRender(true);
      }
      isRegistered() {
        return this.widgetRegistered;
      }
      getSnapshot() {
        const state = getRenderState();
        if (this.lastNextId !== void 0 && state.nextId < this.lastNextId) {
          this.resetCompletedDisplayState();
        }
        this.lastNextId = state.nextId;
        const completedTaskIds = new Set(
          state.tasks.filter((task) => task.status === "completed").map((task) => task.id)
        );
        for (const taskId of this.completedTaskIdsPendingHide) {
          if (!completedTaskIds.has(taskId)) this.completedTaskIdsPendingHide.delete(taskId);
        }
        for (const taskId of this.hiddenCompletedTaskIds) {
          if (!completedTaskIds.has(taskId)) this.hiddenCompletedTaskIds.delete(taskId);
        }
        return { tasks: [...state.tasks], nextId: state.nextId };
      }
      selectOverlayTasks(snapshot) {
        return snapshot.tasks.filter((task) => task.status !== "deleted" && !this.shouldHideCompletedTask(task));
      }
      shouldHideCompletedTask(task) {
        return task.status === "completed" && this.hiddenCompletedTaskIds.has(task.id);
      }
      renderWidget(theme, width) {
        const snapshot = this.getSnapshot();
        const overlayTasks = this.selectOverlayTasks(snapshot);
        if (overlayTasks.length === 0) return [];
        const overlayState = { tasks: overlayTasks, nextId: snapshot.nextId };
        const truncate = (line) => truncateToWidth(line, width, "\u2026");
        const counts = selectTodoCounts(overlayState);
        const hasActive = selectHasActive(overlayState);
        const showIds = selectShowTaskIds(overlayState);
        const headingColor = hasActive ? "accent" : "dim";
        const headingIcon = hasActive ? "\u25CF" : "\u25CB";
        const headingText = `${t("overlay.heading", OVERLAY_HEADING)} (${counts.completed}/${counts.total})`;
        const heading = truncate(`${theme.fg(headingColor, headingIcon)} ${theme.fg(headingColor, headingText)}`);
        if (this.collapsed) {
          const key = resolveCollapseKey();
          const hint = key === COLLAPSE_KEY_OFF ? t("overlay.collapsed", OVERLAY_COLLAPSED) : t("overlay.expandHint", OVERLAY_EXPAND_HINT).replace("{key}", key);
          return this.withTrailingSpacer([heading, truncate(`${theme.fg("dim", "\u2514\u2500")} ${theme.fg("dim", hint)}`)]);
        }
        const lines = [heading];
        const bodyBudget = this.uiCtx?.getToolsExpanded?.() === true ? overlayTasks.length : getMaxWidgetLines() - 1;
        const layout = selectOverlayLayout(overlayState, bodyBudget);
        for (const task of layout.visible) {
          lines.push(truncate(`${theme.fg("dim", "\u251C\u2500")} ${formatOverlayTaskLine(task, theme, showIds)}`));
        }
        const newlyDisplayedCompletedTaskIds = overlayTasks.filter(
          (task) => task.status === "completed" && !this.completedTaskIdsPendingHide.has(task.id) && !this.hiddenCompletedTaskIds.has(task.id)
        ).map((task) => task.id);
        for (const taskId of newlyDisplayedCompletedTaskIds) {
          this.completedTaskIdsPendingHide.add(taskId);
        }
        if (layout.hiddenCompleted === 0 && layout.truncatedTail === 0) {
          const last = lines.length - 1;
          lines[last] = lines[last].replace("\u251C\u2500", "\u2514\u2500");
          return this.withTrailingSpacer(lines);
        }
        const totalHidden = layout.hiddenCompleted + layout.truncatedTail;
        const overflowParts = [];
        if (layout.hiddenCompleted > 0) overflowParts.push(`${layout.hiddenCompleted} ${formatStatusLabel("completed")}`);
        if (layout.truncatedTail > 0) overflowParts.push(`${layout.truncatedTail} ${formatStatusLabel("pending")}`);
        const more = t("overlay.more", OVERLAY_MORE);
        const summary = overflowParts.length > 0 ? `+${totalHidden} ${more} (${overflowParts.join(", ")})` : `+${totalHidden} ${more}`;
        lines.push(truncate(`${theme.fg("dim", "\u2514\u2500")} ${theme.fg("dim", summary)}`));
        return this.withTrailingSpacer(lines);
      }
      /**
       * Append a trailing blank line so the overlay isn't flush against the
       * editor box. Pi's host adds a leading spacer above the widget but none
       * below, which leaves the last "└─" row (or the "+N more" summary) glued
       * to the input box. The empty string gives the "Todos" panel a little
       * breathing room.
       */
      withTrailingSpacer(lines) {
        if (lines.length === 0) return lines;
        lines.push("");
        return lines;
      }
      dispose() {
        if (this.uiCtx) this.uiCtx.setWidget(WIDGET_KEY, void 0);
        this.widgetRegistered = false;
        this.tui = void 0;
        this.uiCtx = void 0;
        this.collapsed = false;
        this.resetCompletedDisplayState();
      }
    };
  }
});

// index.ts
init_config();
await init_i18n_bridge();

// state/replay.ts
init_state();
function isTaskDetails(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  return Array.isArray(v.tasks) && typeof v.nextId === "number";
}
function replayFromBranch(ctx) {
  let result = { tasks: [...EMPTY_STATE.tasks], nextId: EMPTY_STATE.nextId };
  for (const entry of ctx.sessionManager.getBranch()) {
    const e = entry;
    if (e.type !== "message") continue;
    const msg = e.message;
    if (msg?.role !== "toolResult" || msg.toolName !== "todo") continue;
    if (!isTaskDetails(msg.details)) continue;
    result = {
      tasks: msg.details.tasks.map((t2) => ({ ...t2 })),
      nextId: msg.details.nextId
    };
  }
  return result;
}

// index.ts
init_store();

// todo.ts
init_config();
await init_i18n_bridge();
init_selectors();

// state/invariants.ts
var VALID_TRANSITIONS = {
  pending: /* @__PURE__ */ new Set(["in_progress", "completed", "deleted"]),
  in_progress: /* @__PURE__ */ new Set(["pending", "completed", "deleted"]),
  completed: /* @__PURE__ */ new Set(["deleted"]),
  deleted: /* @__PURE__ */ new Set()
};
function isTransitionValid(from, to) {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].has(to);
}

// state/task-graph.ts
function detectCycle(taskList, taskId, newBlockedBy) {
  const edges = /* @__PURE__ */ new Map();
  for (const t2 of taskList) {
    if (t2.id === taskId) {
      const merged = /* @__PURE__ */ new Set([...t2.blockedBy ?? [], ...newBlockedBy]);
      edges.set(t2.id, [...merged]);
    } else {
      edges.set(t2.id, t2.blockedBy ? [...t2.blockedBy] : []);
    }
  }
  const visiting = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  const hasCycleFrom = (node) => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const nb of edges.get(node) ?? []) {
      if (hasCycleFrom(nb)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  for (const node of edges.keys()) {
    if (hasCycleFrom(node)) return true;
  }
  return false;
}
function deriveBlocks(taskList) {
  const blocks = /* @__PURE__ */ new Map();
  for (const t2 of taskList) {
    for (const dep of t2.blockedBy ?? []) {
      const arr = blocks.get(dep) ?? [];
      arr.push(t2.id);
      blocks.set(dep, arr);
    }
  }
  return blocks;
}

// state/state-reducer.ts
function errorResult(state, message) {
  return { state, op: { kind: "error", message } };
}
function sameNumberList(a, b) {
  const x = a ?? [];
  const y = b ?? [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
function sameRecord(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
function taskChanged(before, after) {
  return before.subject !== after.subject || before.status !== after.status || before.description !== after.description || before.activeForm !== after.activeForm || before.owner !== after.owner || !sameNumberList(before.blockedBy, after.blockedBy) || !sameRecord(before.metadata, after.metadata);
}
function applyTaskMutation(state, action, params) {
  switch (action) {
    case "create": {
      if (!params.subject?.trim()) {
        return errorResult(state, "subject required for create");
      }
      if (params.blockedBy?.length) {
        for (const dep of params.blockedBy) {
          const depTask = state.tasks.find((t2) => t2.id === dep);
          if (!depTask) return errorResult(state, `blockedBy: #${dep} not found`);
          if (depTask.status === "deleted") return errorResult(state, `blockedBy: #${dep} is deleted`);
        }
      }
      const newTask = {
        id: state.nextId,
        subject: params.subject,
        status: "pending"
      };
      if (params.description) newTask.description = params.description;
      if (params.activeForm) newTask.activeForm = params.activeForm;
      if (params.blockedBy?.length) newTask.blockedBy = [...params.blockedBy];
      if (params.owner) newTask.owner = params.owner;
      if (params.metadata) newTask.metadata = { ...params.metadata };
      const newTasks = [...state.tasks, newTask];
      return {
        state: { tasks: newTasks, nextId: state.nextId + 1 },
        op: { kind: "create", taskId: newTask.id }
      };
    }
    case "update": {
      if (params.id === void 0) return errorResult(state, "id required for update");
      const idx = state.tasks.findIndex((t2) => t2.id === params.id);
      if (idx === -1) return errorResult(state, `#${params.id} not found`);
      const current = state.tasks[idx];
      const hasMutation = params.subject !== void 0 || params.description !== void 0 || params.activeForm !== void 0 || params.status !== void 0 || params.owner !== void 0 || params.metadata !== void 0 || params.addBlockedBy && params.addBlockedBy.length > 0 || params.removeBlockedBy && params.removeBlockedBy.length > 0;
      if (!hasMutation)
        return errorResult(
          state,
          "update requires at least one mutable field: subject, description, activeForm, status, owner, metadata, addBlockedBy, or removeBlockedBy"
        );
      let newStatus = current.status;
      if (params.status !== void 0) {
        if (!isTransitionValid(current.status, params.status)) {
          return errorResult(state, `illegal transition ${current.status} \u2192 ${params.status}`);
        }
        newStatus = params.status;
      }
      let newBlockedBy = current.blockedBy ? [...current.blockedBy] : [];
      if (params.removeBlockedBy?.length) {
        const toRemove = new Set(params.removeBlockedBy);
        newBlockedBy = newBlockedBy.filter((dep) => !toRemove.has(dep));
      }
      if (params.addBlockedBy?.length) {
        for (const dep of params.addBlockedBy) {
          if (dep === current.id) return errorResult(state, `cannot block #${current.id} on itself`);
          const depTask = state.tasks.find((t2) => t2.id === dep);
          if (!depTask) return errorResult(state, `addBlockedBy: #${dep} not found`);
          if (depTask.status === "deleted") return errorResult(state, `addBlockedBy: #${dep} is deleted`);
          if (!newBlockedBy.includes(dep)) newBlockedBy.push(dep);
        }
        if (detectCycle(state.tasks, current.id, newBlockedBy)) {
          return errorResult(state, "addBlockedBy would create a cycle in the blockedBy graph");
        }
      }
      let newMetadata = current.metadata;
      if (params.metadata !== void 0) {
        const merged = { ...current.metadata ?? {} };
        for (const [k, v] of Object.entries(params.metadata)) {
          if (v === null) delete merged[k];
          else merged[k] = v;
        }
        newMetadata = Object.keys(merged).length ? merged : void 0;
      }
      const updated = { ...current, status: newStatus };
      if (params.subject !== void 0) updated.subject = params.subject;
      if (params.description !== void 0) updated.description = params.description;
      if (params.activeForm !== void 0) updated.activeForm = params.activeForm;
      if (params.owner !== void 0) updated.owner = params.owner;
      if (newBlockedBy.length) updated.blockedBy = newBlockedBy;
      else delete updated.blockedBy;
      if (newMetadata === void 0) delete updated.metadata;
      else updated.metadata = newMetadata;
      const newTasks = [...state.tasks];
      newTasks[idx] = updated;
      return {
        state: { tasks: newTasks, nextId: state.nextId },
        op: {
          kind: "update",
          id: updated.id,
          fromStatus: current.status,
          toStatus: newStatus,
          changed: taskChanged(current, updated)
        }
      };
    }
    case "list": {
      return {
        state,
        op: {
          kind: "list",
          includeDeleted: params.includeDeleted === true,
          ...params.status !== void 0 ? { statusFilter: params.status } : {}
        }
      };
    }
    case "get": {
      if (params.id === void 0) return errorResult(state, "id required for get");
      const task = state.tasks.find((t2) => t2.id === params.id);
      if (!task) return errorResult(state, `#${params.id} not found`);
      return { state, op: { kind: "get", task } };
    }
    case "delete": {
      if (params.id === void 0) return errorResult(state, "id required for delete");
      const idx = state.tasks.findIndex((t2) => t2.id === params.id);
      if (idx === -1) return errorResult(state, `#${params.id} not found`);
      const current = state.tasks[idx];
      if (current.status === "deleted") return errorResult(state, `#${current.id} is already deleted`);
      const updated = { ...current, status: "deleted" };
      const newTasks = [...state.tasks];
      newTasks[idx] = updated;
      return {
        state: { tasks: newTasks, nextId: state.nextId },
        op: { kind: "delete", id: updated.id, subject: updated.subject }
      };
    }
    case "clear": {
      const count = state.tasks.length;
      return {
        state: { tasks: [], nextId: 1 },
        op: { kind: "clear", count }
      };
    }
  }
}

// todo.ts
init_store();

// tool/response-envelope.ts
init_sanitize();
function formatListLine(t2) {
  const block = t2.blockedBy?.length ? ` \u26D3 ${t2.blockedBy.map((id) => `#${id}`).join(",")}` : "";
  const form = t2.status === "in_progress" && t2.activeForm ? ` (${sanitizeTerminalText(t2.activeForm)})` : "";
  return `[${t2.status}] #${t2.id} ${sanitizeTerminalText(t2.subject)}${form}${block}`;
}
function formatGetLines(task, state) {
  const blocks = deriveBlocks(state.tasks).get(task.id) ?? [];
  const lines = [`#${task.id} [${task.status}] ${sanitizeTerminalText(task.subject)}`];
  if (task.description) lines.push(`  description: ${sanitizeTerminalText(task.description)}`);
  if (task.activeForm) lines.push(`  activeForm: ${sanitizeTerminalText(task.activeForm)}`);
  if (task.blockedBy?.length) {
    lines.push(`  blockedBy: ${task.blockedBy.map((id) => `#${id}`).join(", ")}`);
  }
  if (blocks.length) {
    lines.push(`  blocks: ${blocks.map((id) => `#${id}`).join(", ")}`);
  }
  if (task.owner) lines.push(`  owner: ${sanitizeTerminalText(task.owner)}`);
  return lines.join("\n");
}
function formatContent(op, state) {
  switch (op.kind) {
    case "create": {
      const t2 = state.tasks.find((x) => x.id === op.taskId);
      if (!t2) return `Created #${op.taskId}`;
      return `Created #${t2.id}: ${sanitizeTerminalText(t2.subject)} (pending)`;
    }
    case "update": {
      if (!op.changed) {
        return `No change: #${op.id} already matches the requested values (status: ${op.toStatus})`;
      }
      const transition = op.fromStatus !== op.toStatus ? ` (${op.fromStatus} \u2192 ${op.toStatus})` : "";
      return `Updated #${op.id}${transition}`;
    }
    case "delete":
      return `Deleted #${op.id}: ${sanitizeTerminalText(op.subject)}`;
    case "clear":
      return `Cleared ${op.count} tasks`;
    case "list": {
      let view = state.tasks;
      if (!op.includeDeleted) view = view.filter((t2) => t2.status !== "deleted");
      if (op.statusFilter) view = view.filter((t2) => t2.status === op.statusFilter);
      return view.length === 0 ? "No tasks" : view.map(formatListLine).join("\n");
    }
    case "get":
      return formatGetLines(op.task, state);
    case "error":
      return `Error: ${op.message}`;
  }
}
function buildToolResult(action, params, state, op) {
  const text = formatContent(op, state);
  const details = {
    action,
    params,
    tasks: state.tasks,
    nextId: state.nextId,
    ...op.kind === "error" ? { error: op.message } : {}
  };
  return { content: [{ type: "text", text }], details };
}

// tool/types.ts
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
var TOOL_NAME = "todo";
var TOOL_LABEL = "Todo";
var COMMAND_NAME = "todos";
var ERR_REQUIRES_INTERACTIVE = "/todos requires interactive mode";
var MSG_NO_TODOS = "No todos yet. Ask the agent to add some!";
var TodoParamsSchema = Type.Object({
  action: StringEnum(["create", "update", "list", "get", "delete", "clear"]),
  subject: Type.Optional(Type.String({ description: "Task subject line (required for create)" })),
  description: Type.Optional(Type.String({ description: "Long-form task description" })),
  activeForm: Type.Optional(
    Type.String({
      description: "Present-continuous spinner label shown while status is in_progress (e.g. 'writing tests')"
    })
  ),
  status: Type.Optional(
    StringEnum(["pending", "in_progress", "completed", "deleted"], {
      description: "Set this task's status (update): one of pending, in_progress, completed, deleted. When action is list, filters returned tasks by this status."
    })
  ),
  blockedBy: Type.Optional(
    Type.Array(Type.Number(), {
      description: "Initial blockedBy ids (create only)"
    })
  ),
  addBlockedBy: Type.Optional(
    Type.Array(Type.Number(), {
      description: "Task ids to add to blockedBy (update only, additive merge)"
    })
  ),
  removeBlockedBy: Type.Optional(
    Type.Array(Type.Number(), {
      description: "Task ids to remove from blockedBy (update only, additive merge)"
    })
  ),
  owner: Type.Optional(Type.String({ description: "Agent/owner assigned to this task" })),
  metadata: Type.Optional(
    Type.Record(Type.String(), Type.Unknown(), {
      description: "Arbitrary metadata; pass null value for a key to delete that key on update"
    })
  ),
  id: Type.Optional(
    Type.Number({
      description: "Task id (required for update, get, delete)"
    })
  ),
  includeDeleted: Type.Optional(
    Type.Boolean({
      description: "If true, list action returns deleted (tombstoned) tasks as well. Default: false."
    })
  )
});

// todo.ts
await init_format();
init_store();
var SECTION_PENDING = "\u2500\u2500 Pending \u2500\u2500";
var SECTION_IN_PROGRESS = "\u2500\u2500 In Progress \u2500\u2500";
var SECTION_COMPLETED = "\u2500\u2500 Completed \u2500\u2500";
var DEFAULT_PROMPT_SNIPPET = "Manage a task list to track multi-step progress";
var DEFAULT_PROMPT_GUIDELINES = [
  "Use `todo` for complex work with 3+ steps, when the user gives you a list of tasks, or immediately after receiving new instructions to capture requirements. Skip it for single trivial tasks and purely conversational requests.",
  "When starting a task from the todo list, mark it in_progress BEFORE beginning work. Mark it completed IMMEDIATELY when done \u2014 never batch completions. Exactly one task in_progress at a time.",
  "Never mark a task completed if tests are failing, the implementation is partial, or you hit unresolved errors \u2014 keep it in_progress and create a new task for the blocker instead.",
  "Task status is a 4-state machine: pending \u2192 in_progress \u2192 completed, plus deleted as a tombstone. Pass activeForm (present-continuous label, e.g. 'researching existing tool') when marking in_progress.",
  `To change a task's status, call update with the task id and the target status, e.g. {"action":"update","id":3,"status":"completed"} or {"action":"update","id":3,"status":"in_progress","activeForm":"writing tests"}. status is the field that changes the task; an update without a mutable field (status or another) is rejected.`,
  "Use blockedBy to express dependencies (A is blocked by B). On create, pass blockedBy as the initial set. On update, use addBlockedBy / removeBlockedBy (additive merge \u2014 do not resend the full array). Cycles are rejected.",
  "list hides tombstoned (deleted) tasks by default; pass includeDeleted:true to see them. Pass status to filter by a single status.",
  "Subject must be short and imperative (e.g. 'Research existing tool'); description is for long-form detail. activeForm is a present-continuous label shown while in_progress."
];
function registerTodoTool(pi) {
  const guidance = validateGuidanceFields(loadConfig().guidance);
  pi.registerTool({
    name: TOOL_NAME,
    label: TOOL_LABEL,
    description: "Manage a task list for tracking multi-step progress. Actions: create (new task), update (change status/fields/dependencies), list (all tasks, optionally filtered by status), get (single task details), delete (tombstone), clear (reset all). Status: pending \u2192 in_progress \u2192 completed, plus deleted tombstone. Use this to plan and track multi-step work like research, design, and implementation.",
    promptSnippet: guidance.promptSnippet ?? DEFAULT_PROMPT_SNIPPET,
    promptGuidelines: guidance.promptGuidelines ?? DEFAULT_PROMPT_GUIDELINES,
    parameters: TodoParamsSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = applyTaskMutation(getState(sid(ctx)), params.action, params);
      commitState(sid(ctx), result.state);
      return buildToolResult(params.action, params, result.state, result.op);
    },
    // renderCall reflects the FOREGROUND slot, not the calling session's. Pi's
    // `ToolRenderContext` carries no session identity (no sessionManager/sessionId),
    // so this ctx-less hook cannot re-key by caller. For the foreground session's
    // own transcript that is exactly right. A detached/child call rendered in the
    // lane-transcript viewer whose task lives only in the child's slot misses the
    // foreground lookup and falls back to `#<id>` (see renderTodoCall). That is the
    // safe outcome: per-session ids restart at 1, so searching sibling slots could
    // surface the WRONG subject — the `#<id>` fallback is intentional, not a gap.
    renderCall(args, theme, _context) {
      return renderTodoCall(args, theme, getRenderState());
    },
    renderResult(result, _opts, theme, _context) {
      return renderTodoResult(result, theme);
    }
  });
}
function registerTodosCommand(pi) {
  pi.registerCommand(COMMAND_NAME, {
    description: "Show all todos on the current branch, grouped by status",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify(t("command.requires_interactive", ERR_REQUIRES_INTERACTIVE), "error");
        return;
      }
      const state = getState(sid(ctx));
      const visible = selectVisibleTasks(state);
      if (visible.length === 0) {
        ctx.ui.notify(t("command.no_todos", MSG_NO_TODOS), "info");
        return;
      }
      const groups = selectTasksByStatus(state);
      const counts = selectTodoCounts(state);
      const header = [];
      if (counts.completed > 0) header.push(`${counts.completed}/${counts.total} ${formatStatusLabel("completed")}`);
      if (counts.inProgress > 0) header.push(`${counts.inProgress} ${formatStatusLabel("in_progress")}`);
      if (counts.pending > 0) header.push(`${counts.pending} ${formatStatusLabel("pending")}`);
      const lines = [header.join(" \xB7 ")];
      if (groups.pending.length > 0) {
        lines.push(t("command.section.pending", SECTION_PENDING));
        for (const task of groups.pending) lines.push(formatCommandTaskLine(task, "\u25CB"));
      }
      if (groups.inProgress.length > 0) {
        lines.push(t("command.section.in_progress", SECTION_IN_PROGRESS));
        for (const task of groups.inProgress) lines.push(formatCommandTaskLine(task, "\u25D0"));
      }
      if (groups.completed.length > 0) {
        lines.push(t("command.section.completed", SECTION_COMPLETED));
        for (const task of groups.completed) lines.push(formatCommandTaskLine(task, "\u2713"));
      }
      ctx.ui.notify(lines.join("\n"), "info");
    }
  });
}

// index.ts
var PREWARM_DELAY_MS = 2e3;
var STALE_OVERLAY_MESSAGE = "Todo overlay module cache is stale; restart Pi";
function isStaleOverlayModuleError(e) {
  return String(e).includes(STALE_OVERLAY_MESSAGE);
}
function makeTodoOverlayLoader(importOverlay = () => init_todo_overlay().then(() => todo_overlay_exports)) {
  let memo;
  return async () => {
    memo ??= importOverlay();
    const current = memo;
    let mod;
    try {
      mod = await current;
    } catch (error) {
      if (memo === current) memo = void 0;
      throw error;
    }
    if (typeof mod.TodoOverlay !== "function") {
      const keys = JSON.stringify(Object.keys(mod));
      throw new Error(`${STALE_OVERLAY_MESSAGE} (resolved namespace keys: ${keys})`);
    }
    return mod;
  };
}
try {
  const sdk = await import("@juicesharp/rpiv-i18n/loader");
  sdk.registerLocalesFromDir(I18N_NAMESPACE, import.meta.url, { label: "rpiv-todo" });
} catch {
}
function isStaleCtxError(e) {
  return /stale after session replacement/.test(String(e));
}
function formatError(e) {
  return e instanceof Error ? e.message : String(e);
}
function index_default(pi, importOverlay = () => init_todo_overlay().then(() => todo_overlay_exports)) {
  let todoOverlay;
  const loadTodoOverlay = makeTodoOverlayLoader(importOverlay);
  let uiCtx;
  let lifecycleGeneration = 0;
  async function updateTodoOverlay(resetCompletedDisplayState = false, generation = lifecycleGeneration) {
    const hasVisibleTasks = getRenderState().tasks.some((task) => task.status !== "deleted");
    if (!uiCtx || !todoOverlay && !hasVisibleTasks) return;
    const { TodoOverlay: TodoOverlay2 } = await loadTodoOverlay();
    if (generation !== lifecycleGeneration || !uiCtx) return;
    todoOverlay ??= new TodoOverlay2();
    todoOverlay.setUICtx(uiCtx);
    if (resetCompletedDisplayState) todoOverlay.resetCompletedDisplayState();
    todoOverlay.update();
  }
  registerTodoTool(pi);
  registerTodosCommand(pi);
  const collapseKey = resolveCollapseKey();
  if (collapseKey !== COLLAPSE_KEY_OFF) {
    pi.registerShortcut(collapseKey, {
      description: "Collapse or expand the todo overlay",
      handler: (ctx) => {
        if (!ctx.hasUI || !todoOverlay?.isRegistered()) return;
        todoOverlay.toggleCollapse();
      }
    });
  }
  const replayAndRefresh = async (ctx) => {
    let isForeground = false;
    try {
      const id = sid(ctx);
      replaceState(id, replayFromBranch(ctx));
      isForeground = id === getActiveRenderSession();
    } catch (e) {
      if (!isStaleCtxError(e)) throw e;
    }
    if (isForeground) await updateTodoOverlay(true);
  };
  pi.on("session_start", async (_event, ctx) => {
    let id;
    try {
      id = sid(ctx);
      replaceState(id, replayFromBranch(ctx));
    } catch (e) {
      if (!isStaleCtxError(e)) throw e;
      return;
    }
    if (!ctx.hasUI) return;
    if (getActiveRenderSession() === "") setActiveRenderSession(id);
    if (id !== getActiveRenderSession()) return;
    const generation = ++lifecycleGeneration;
    uiCtx = ctx.ui;
    await updateTodoOverlay(true, generation);
  });
  pi.on("session_compact", async (_event, ctx) => {
    await replayAndRefresh(ctx);
  });
  pi.on("session_tree", async (_event, ctx) => {
    await replayAndRefresh(ctx);
  });
  pi.on("session_shutdown", async (_event, ctx) => {
    let s;
    try {
      s = sid(ctx);
    } catch (e) {
      if (!isStaleCtxError(e)) throw e;
      s = "";
    }
    evictSession(s);
    if (s === "" || s === getActiveRenderSession()) {
      lifecycleGeneration++;
      uiCtx = void 0;
      try {
        todoOverlay?.dispose();
      } finally {
        todoOverlay = void 0;
        clearActiveRenderSession();
      }
    }
  });
  pi.on("tool_execution_end", async (event) => {
    if (event.toolName !== TOOL_NAME || event.isError) return;
    try {
      await updateTodoOverlay();
    } catch (e) {
      if (isStaleOverlayModuleError(e)) throw e;
      console.warn(`[rpiv-todo] overlay refresh failed (will retry on next update): ${formatError(e)}`);
    }
  });
  const prewarmTimer = setTimeout(() => void loadTodoOverlay().catch(() => void 0), PREWARM_DELAY_MS);
  prewarmTimer.unref?.();
  pi.on("agent_start", async () => {
    todoOverlay?.hideCompletedTasksFromPreviousTurn();
  });
}
export {
  PREWARM_DELAY_MS,
  index_default as default,
  isStaleOverlayModuleError,
  makeTodoOverlayLoader
};
