import assert from "node:assert/strict";
import {
  DEFAULT_PANEL_COPY_VALUE_IDS_RUNTIME,
  copyPendingStatusTextRuntime,
  copyStatusTextRuntime,
  copyTextToClipboardRuntime,
  copyTextToClipboardSyncRuntime,
  setCopyPendingStatusRuntime,
  setCopyStatusRuntime,
  type ClipboardDocumentRuntime
} from "../ui/clipboard_runtime.ts";

function fakeDocument(execResult: boolean): ClipboardDocumentRuntime & {
  appended: unknown[];
  copiedText: string;
} {
  const doc = {
    appended: [] as unknown[],
    copiedText: "",
    body: {
      appendChild(node: unknown) {
        doc.appended.push(node);
      },
      removeChild(node: unknown) {
        doc.appended = doc.appended.filter((entry) => entry !== node);
      }
    },
    createElement(tag: string) {
      assert.equal(tag, "textarea");
      return {
        focus() {},
        select() {},
        setSelectionRange() {},
        style: {},
        value: ""
      };
    },
    execCommand(command: string) {
      assert.equal(command, "copy");
      const textarea = doc.appended[doc.appended.length - 1] as { value?: string } | undefined;
      doc.copiedText = String(textarea?.value || "");
      return execResult;
    },
    querySelectorAll() {
      return [] as unknown as NodeListOf<Element>;
    }
  };
  return doc as unknown as ClipboardDocumentRuntime & { appended: unknown[]; copiedText: string };
}

assert.equal(copyStatusTextRuntime(true), "ok");
assert.equal(copyStatusTextRuntime(false), "failed");
assert.equal(copyStatusTextRuntime(false, "blocked"), "failed (blocked)");
assert.equal(copyPendingStatusTextRuntime(), "copying...");
assert.deepEqual([...DEFAULT_PANEL_COPY_VALUE_IDS_RUNTIME], [
  "statPos",
  "statClock",
  "statDate",
  "statTile",
  "statRenderParity",
  "statSource",
  "statHash",
  "statLoopHealth",
  "statReplay",
  "statCenterTiles",
  "statNetSession"
]);

{
  const target = { textContent: "" } as HTMLElement;
  setCopyStatusRuntime(target, false, "blocked");
  assert.equal(target.textContent, "failed (blocked)");
}

{
  const target = { textContent: "" } as HTMLElement;
  setCopyPendingStatusRuntime(target);
  assert.equal(target.textContent, "copying...");
}

{
  const doc = fakeDocument(true);
  const result = copyTextToClipboardSyncRuntime("hello", { document: doc });
  assert.deepEqual(result, { ok: true, reason: "" });
  assert.equal(doc.copiedText, "hello");
  assert.equal(doc.appended.length, 0);
}

{
  const doc = fakeDocument(false);
  const target = { dataset: {} } as HTMLElement;
  const result = copyTextToClipboardSyncRuntime("hello", { document: doc, errorTarget: target });
  assert.deepEqual(result, { ok: false, reason: "execCommand(copy) returned false" });
  assert.equal(target.dataset.copyError, "execCommand(copy) returned false");
}

{
  const writes: string[] = [];
  const ok = await copyTextToClipboardRuntime("async", {
    document: fakeDocument(false),
    navigator: {
      clipboard: {
        async writeText(text: string) {
          writes.push(text);
        }
      }
    }
  });
  assert.equal(ok, true);
  assert.deepEqual(writes, ["async"]);
}

{
  const doc = fakeDocument(true);
  const ok = await copyTextToClipboardRuntime("fallback", {
    document: doc,
    navigator: {
      clipboard: {
        async writeText() {
          throw new Error("denied");
        }
      }
    }
  });
  assert.equal(ok, true);
  assert.equal(doc.copiedText, "fallback");
}

console.log("ui_clipboard_runtime_test: ok");
